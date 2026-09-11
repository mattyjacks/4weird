import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { extractBotKey, resolveBotKey } from "@/lib/bot-auth";

/**
 * BotID server gate — one helper for every protected mutation.
 *
 * Usage (top of POST/PUT/PATCH/DELETE, AFTER the hasServerSupabase + sameOrigin
 * checks, BEFORE rate limits and body parsing):
 *
 *   const blocked = await requireHuman(req, "POST /api/coins/daily");
 *   if (blocked) return blocked;
 *
 * Why this shape:
 * - Fail CLOSED on bots: `isBot === true` → 403, no further work (no DB writes,
 *   no coin minting, no AI spend). Generic message so probes learn nothing.
 * - Fail OPEN on verifier outage: if checkBotId() itself throws (BotID API
 *   down, OIDC misconfigured), we log and ALLOW. Turning a BotID outage into
 *   a site-wide 403 on signup/checkout would be a self-inflicted DoS; the
 *   existing backstops (CSRF same-origin, per-IP rate limits, distributed
 *   abuse buckets, coin RPC guards) still hold the line. Search logs for
 *   `[botid] verifier error` to spot it.
 * - Local dev never blocks: checkBotId() returns HUMAN outside production, so
 *   we skip the network call entirely (zero latency, zero log spam).
 * - Legitimate automation is exempt, fake automation is not:
 *   - Vercel Cron (Bearer CRON_SECRET) → exempt (no browser session exists).
 *   - VALID `bot4weird_` keys (resolved against the DB: revocation, expiry,
 *     budgets enforced) → exempt. A present-but-invalid key is NOT enough —
 *     it falls through to the BotID check and fails closed like any bot.
 * - Webhook / pod-token callbacks (meshy/webhook, blender/progress) must
 *     NEVER call this helper at all — they authenticate by HMAC/job-token.
 * - Signed-in play metering (POST /api/games/session) must NEVER call this
 *   helper either — AI/automation playing through a real signed-in session
 *   is welcome and still pays coins; anti-cheat stays via the cheat_mode
 *   save invariant + rate limits. Anonymous free-play abuse stays gated at
 *   POST /api/games/guest-pass.
 *
 * SERVER-ONLY: imports the bot-auth chain (service-role). Never import from a
 * client component. Route handlers only.
 */

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const ah = createHash("sha256").update(a, "utf8").digest();
    const bh = createHash("sha256").update(b, "utf8").digest();
    return ah.length === bh.length && timingSafeEqual(ah, bh);
  } catch {
    return false;
  }
}

function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return safeEqual(bearer, secret);
}

/**
 * True when the caller is trusted machine traffic that must bypass the
 * invisible-CAPTCHA: Vercel Cron, or a VALID bot key. Humans (no bot-key
 * header) never hit the DB here — the resolve only runs when a key is
 * actually presented.
 */
export async function isTrustedMachine(req: Request): Promise<boolean> {
  if (isCron(req)) return true;
  try {
    if (!extractBotKey(req)) return false;
    return (await resolveBotKey(req).catch(() => null)) !== null;
  } catch {
    return false;
  }
}

const noStore = { "Cache-Control": "private, no-store" };

function blocked(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Bot traffic blocked. Please try again from a real browser." },
    { status: 403, headers: noStore },
  );
}

/**
 * BotID gate for mutating routes. Returns a 403 response when the caller is a
 * bot, or null when the request may proceed (human, trusted machine, dev, or
 * verifier outage with backstops still active).
 */
export async function requireHuman(req: Request, route: string): Promise<NextResponse | null> {
  // Local/dev/test: BotID always classifies HUMAN; skip the call entirely.
  if (process.env.NODE_ENV !== "production") return null;
  try {
    if (await isTrustedMachine(req)) return null;
  } catch {
    // Fall through to the BotID check — exemption failures fail closed.
  }
  try {
    const verification = await checkBotId({
      advancedOptions: { checkLevel: "deepAnalysis" },
    });
    if (verification.isBot) {
      console.warn("[botid] blocked bot", {
        route: String(route).slice(0, 120),
        verified: (verification as { isVerifiedBot?: boolean }).isVerifiedBot ?? false,
      });
      return blocked();
    }
    return null;
  } catch (err) {
    console.error("[botid] verifier error — allowing with backstops", {
      route: String(route).slice(0, 120),
      message: String((err as Error)?.message ?? err).slice(0, 200),
    });
    return null;
  }
}
