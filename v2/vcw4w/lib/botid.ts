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
 *   const blocked = await requireHuman(req, "POST /api/coins/daily", { allowTrustedMachine: false });
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
 *   - Owner self-test (`x-selftest-token: SELFTEST_BYPASS_TOKEN`) → exempt:
 *     the AI testing its own website with unlimited actions. Daily bonus
 *     opts out of this (allowTrustedMachine:false) and stays human-only.
 *   - VALID `bot4weird_` keys (resolved against the DB: revocation, expiry,
 *     budgets enforced) → exempt everywhere EXCEPT daily. A
 *     present-but-invalid key is NOT enough — it falls through to the
 *     BotID check and fails closed like any bot.
 *   - Signed-in coin-spend/social callers → exempt ONLY when the route opts
 *     in with `{ allowAuthenticated: true }`. A valid Supabase session proves
 *     the caller is a real account whose coin ledger can be debited, so a
 *     BotID false-positive (or headless automation through a real login)
 *     must not 403 paid work like NewGamePlus builds, fal renders, or buddy
  *     turns. Free-money routes (signup/daily/claim/checkout/refund/
  *     alpha/referrals/guest-pass) plus kid-login, bot key issuance, and
  *     account deletion must NEVER opt in — they stay gated even for
  *     logged-in callers so farmed accounts cannot mint free coins.
  *     Login itself is deferred-gate (BotID only after 5 failed passwords)
  *     so external bots CAN log in with a username + password.
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
 * Owner's AI self-test bypass: the site testing its own website. When
 * SELFTEST_BYPASS_TOKEN is set, requests carrying it in `x-selftest-token`
 * (or as a Bearer token alongside a logged-in session) skip the BotID
 * check AND the bot rate limits (see botRateLimit). This is how our own
 * automation hammers the site with unlimited actions during testing.
 * Never set this header from browsers; never log the token. When unset,
 * this check is a no-op (fail closed, zero behavior change).
 */
export function isSelfTest(req: Request): boolean {
  const secret = process.env.SELFTEST_BYPASS_TOKEN ?? "";
  if (!secret) return false;
  const header = (req.headers.get("x-selftest-token") ?? "").trim();
  if (header && safeEqual(header, secret)) return true;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  // Bearer form only counts when it is NOT a bot4weird_ key (keys resolve
  // via the bot-key path instead, so a leaked key cannot pose as self-test
  // and vice versa).
  if (bearer && !bearer.startsWith("bot4weird_") && safeEqual(bearer, secret)) return true;
  return false;
}

/**
 * True when the caller is trusted machine traffic that must bypass the
 * invisible-CAPTCHA: Vercel Cron, a VALID bot key, or the owner's AI
 * self-test token (SELFTEST_BYPASS_TOKEN). Humans (no bot-key header)
 * never hit the DB here — the resolve only runs when a key is
 * actually presented.
 *
 * Own bots (valid `bot4weird_` keys) bypass here on every route EXCEPT the
 * daily bonus, which passes `{ allowTrustedMachine: false }` so it stays
 * real-human-only. External password bots (username + password login,
 * cookie session) bypass via `{ allowAuthenticated: true }` on all
 * non-free-mint routes instead — they carry no bot-key header.
 */
export async function isTrustedMachine(req: Request): Promise<boolean> {
  if (isCron(req)) return true;
  if (isSelfTest(req)) return true;
  try {
    if (!extractBotKey(req)) return false;
    return (await resolveBotKey(req).catch(() => null)) !== null;
  } catch {
    return false;
  }
}

const noStore = { "Cache-Control": "private, no-store" };

function blocked(): NextResponse {
  // Anonymous callers fail closed here (indistinguishable from farm bots), but
  // the message must route real GUI users to the fix: signing in bypasses this
  // check on paid routes (allowAuthenticated), and a transient flag often
  // clears on retry. Never expose the BotID verdict details (probes learn).
  return NextResponse.json(
    {
      success: false,
      error:
        "Automated-traffic check flagged this request. If you are a person: sign in and try again (signed-in builders bypass this check), or wait a moment and retry.",
      code: "bot_check",
      retryable: true,
    },
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
    // Shared resolvers (legacy SUPABASE_URL / SUPABASE_ANON_KEY fallbacks
    // included): the bypass must work under either env naming, or flagged
    // signed-in users 403 on paid work they should reach.
    const { supabaseUrl } = await import("@/lib/supabase/service");
    if (!supabaseUrl()) return false;
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
 * Pass `{ allowAuthenticated: true }` on every route a logged-in bot may
 * use: coin-spending compute/AI (NewGamePlus, fal/meshy/generate,
 * buddy/chat, game-ai/meter, swarm/chat, code/zip, desktop/provision) AND
 * social/economy writes (clan posts/comments/votes, support, fundraisers,
 * verification, openrouter-plays, rights). A valid session proves a
 * debitable account, so BotID false-positives must not block paid work or
 * legitimate automation — including external bots that logged in with a
 * username + password and the owner's AI self-testing its own site.
 * Never use it on free-money or identity-mint routes
 * (signup/daily/claim/checkout/refund/alpha/referrals/guest-pass,
 * kid-login, bot key issuance): those stay gated even for logged-in callers
 * so farmed accounts cannot mint free coins.
 *
 * Pass `{ allowTrustedMachine: false }` ONLY on the daily bonus: it is the
 * one route that must be a real human, so even a VALID bot key or the
 * self-test token must still face the BotID check there.
 */
export async function requireHuman(
  req: Request,
  route: string,
  opts?: { allowAuthenticated?: boolean; allowTrustedMachine?: boolean },
): Promise<NextResponse | null> {
  // Local/dev/test: BotID always classifies HUMAN; skip the call entirely.
  if (process.env.NODE_ENV !== "production") return null;
  if (opts?.allowTrustedMachine !== false) {
    try {
      if (await isTrustedMachine(req)) return null;
    } catch {
      // Fall through to the BotID check — exemption failures fail closed.
    }
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
