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
 *   - Signed-in coin-spend callers → exempt ONLY when the route opts in
 *     with `{ allowAuthenticated: true }`. A valid Supabase session proves
 *     the caller is a real account whose coin ledger can be debited, so a
 *     BotID false-positive (or headless automation through a real login)
 *     must not 403 paid work like NewGamePlus builds, fal renders, or buddy
 *     turns. Free-money routes (signup/login/daily/claim/checkout/refund/
 *     referrals/guest-pass) must NEVER opt in — they stay gated even for
 *     logged-in callers so farmed accounts cannot mint free coins.
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
 * True when the request carries a valid signed-in Supabase session. Used only
 * by routes that opt in with `{ allowAuthenticated: true }`: paid work may
 * proceed for a real account even when BotID flags the browser as a bot.
 * Returns false when Supabase is unconfigured or the session is absent.
 */
async function isAuthenticatedUser(): Promise<boolean> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return Boolean(data?.user);
  } catch {
    return false;
  }
}

/**
 * BotID gate for mutating routes. Returns a 403 response when the caller is a
 * bot, or null when the request may proceed (human, trusted machine,
 * opted-in authenticated spender, dev, or verifier outage with backstops
 * still active).
 *
 * Pass `{ allowAuthenticated: true }` ONLY on coin-spending routes that
 * already require login (NewGamePlus, fal/meshy/generate, buddy/chat,
 * game-ai/meter, swarm/chat, code/zip, desktop/provision): a valid session
 * proves a debitable account, so BotID false-positives must not block paid
 * work or legitimate automation. Never use it on free-money or identity
 * routes (signup/login/daily/claim/checkout/refund/referrals/guest-pass).
 */
export async function requireHuman(
  req: Request,
  route: string,
  opts?: { allowAuthenticated?: boolean },
): Promise<NextResponse | null> {
  // Local/dev/test: BotID always classifies HUMAN; skip the call entirely.
  if (process.env.NODE_ENV !== "production") return null;
  try {
    if (await isTrustedMachine(req)) return null;
  } catch {
    // Fall through to the BotID check — exemption failures fail closed.
  }
  if (opts?.allowAuthenticated) {
    try {
      if (await isAuthenticatedUser()) return null;
    } catch {
      // Fall through to the BotID check — auth-check failures fail closed
      // for anonymous callers, so free-play abuse stays gated.
    }
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
