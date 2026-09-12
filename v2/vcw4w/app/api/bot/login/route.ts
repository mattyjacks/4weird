import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { acctBucketKey, globalBucket, ipBucketKey, throttleHeaders } from "@/lib/abuse-limit";
import { clientIp, exceedsBodyLimit, isEmail, isLoginPassword } from "@/lib/validate";
import {
  BOT_SCOPES,
  BOT_TESTER_COOKIE,
  FULL_LOGIN_COOKIE,
  botRateLimit,
  extractBotKey,
  hasBotAuth,
  invalidCredentials,
  isValidBotKeyFormat,
  resolveBotKey,
  signBotTester,
} from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";

export const dynamic = "force-dynamic";

const maxRequestBytes = 4096;

// Consecutive-failure tracker for the password half (mirrors
// /api/auth/login): BotID engages only after 5 failed passwords in a row.
const loginFailures = new Map<string, { fails: number; resetAt: number }>();
const LOGIN_FAIL_WINDOW_MS = 15 * 60_000;
const LOGIN_FAIL_THRESHOLD = 5;

function failKeyFor(email: string, req: Request): string {
  if (email) return `bot-login-fail:acct:${email}`.toLowerCase().slice(0, 160);
  return `bot-login-fail:ip:${clientIp(req)}`.toLowerCase().slice(0, 160);
}

function recordLoginFailure(key: string): number {
  const now = Date.now();
  for (const [k, v] of loginFailures) {
    if (v.resetAt <= now) loginFailures.delete(k);
    if (loginFailures.size <= 5000) break;
  }
  while (loginFailures.size > 5000) {
    const oldest = loginFailures.keys().next();
    if (oldest.done) break;
    loginFailures.delete(oldest.value);
  }
  const cur = loginFailures.get(key);
  if (!cur || cur.resetAt <= now) {
    loginFailures.set(key, { fails: 1, resetAt: now + LOGIN_FAIL_WINDOW_MS });
    return 1;
  }
  cur.fails += 1;
  return cur.fails;
}

function clearLoginFailures(key: string): void {
  loginFailures.delete(key);
}

const RESTRICTIONS =
  "Tester session can play and test the site, but cannot change the user profile (PATCH /api/me/profile) or perform destructive actions (POST /api/my/rights, bot key/identity management).";

function pickBodyKey(input: Record<string, unknown>): string {
  for (const k of ["api_key", "apiKey", "bot_key", "botKey", "key"]) {
    const v = String(input[k] ?? "").trim();
    if (v) return v;
  }
  return "";
}

// POST /api/bot/login; dual-mode bot login: EITHER a `bot4weird_` API key
// OR an email + password. API-key callers are verified statelessly (no
// session, no profile/destructive power). Email+password callers get a
// normal Supabase session PLUS an httpOnly `bot_tester=1` marker cookie:
// the tester session can play/test but profile writes and destructive
// routes refuse it with 403. Hand bots this login, never a full
// /api/auth/login session.
export async function POST(req: Request) {
  // No sameOrigin gate here on purpose (mirrors /api/auth/login's
  // bot-friendly stance): curl-style bots send no Origin/Referer, and this
  // route only presents credentials. Rate limits + the deferred BotID gate
  // below are the shields.
  const throttle = rateLimit(`bot-login:${clientIp(req)}`, 10);
  if (!throttle.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (exceedsBodyLimit(body, maxRequestBytes)) return fail("Request is too large.", 413);
  const input = (body ?? {}) as Record<string, unknown>;
  const bodyKey = pickBodyKey(input);
  const headerKey = extractBotKey(req);
  const apiKey = bodyKey || headerKey || "";
  const email = isEmail(input.email);
  const password = isLoginPassword(input.password);
  const wantsKey = Boolean(apiKey);
  const wantsPassword = Boolean(email || password || input.email !== undefined || input.password !== undefined);

  if (wantsKey && wantsPassword) {
    return fail("Send either an API key or an email + password, not both.", 400);
  }
  if (!wantsKey && !wantsPassword) {
    return fail("Send either an API key or an email + password.", 400);
  }

  // ---- API-key half: stateless verify, no session cookie. ----
  if (wantsKey) {
    if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
    const rl = botRateLimit(req, "read");
    if (!rl.allowed) {
      return fail("Rate limited. Try again shortly.", 429, {
        "Retry-After": String(rl.retryAfter),
      });
    }
    if (!isValidBotKeyFormat(apiKey)) return fail(invalidCredentials(), 401);
    // Resolve through the shared chain: body key is wrapped as a header so
    // revocation/expiry/budgets/IP policy all enforce identically.
    const shim = { headers: new Headers({ "x-bot-key": apiKey }) } as Request;
    const bot = await resolveBotKey(bodyKey ? shim : req);
    if (!bot) return fail(invalidCredentials(), 401);
    void logBotKeyRequest({
      keyId: bot.keyId,
      userId: bot.userId,
      method: "POST",
      path: "/api/bot/login",
      status: 200,
      ip: clientIp(req),
      loggingMode: bot.loggingMode,
    });
    return ok({
      mode: "api-key",
      username: bot.username,
      human_id: bot.humanId,
      key_id: bot.keyId,
      key_prefix: bot.prefix,
      scopes: [...BOT_SCOPES],
      restrictions:
        "API-key callers hold scoped bot powers only (clans, UnitUnite, code, vault, meshy, AI, VCW, identity:read) and never touch the user profile or destructive account actions.",
    });
  }

  // ---- Email+password half: restricted tester session. ----
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!email || !password) {
    const fails = recordLoginFailure(failKeyFor(email, req));
    const distFails = await globalBucket(
      email ? acctBucketKey("bot-login-fail", email) : ipBucketKey(req, "bot-login-fail"),
      LOGIN_FAIL_THRESHOLD,
      900,
    );
    const sharedFails = distFails ? distFails.hits : fails;
    if (fails >= LOGIN_FAIL_THRESHOLD || (distFails && (!distFails.allowed || sharedFails >= LOGIN_FAIL_THRESHOLD))) {
      const botBlock = await requireHuman(req, "POST /api/bot/login");
      if (botBlock) return botBlock;
    }
    return fail("Invalid login credentials.", 401);
  }
  const accountThrottle = rateLimit(`bot-login-email:${email}`, 10);
  if (!accountThrottle.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, {
      "Retry-After": String(accountThrottle.retryAfter),
    });
  }
  const accountDist = await globalBucket(acctBucketKey("bot-login-hour", email), 30, 3600);
  if (accountDist && !accountDist.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, throttleHeaders(accountDist.retryAfter));
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session?.user) {
      const key = failKeyFor(email, req);
      const fails = recordLoginFailure(key);
      const distFails = await globalBucket(acctBucketKey("bot-login-fail", email), LOGIN_FAIL_THRESHOLD, 900);
      const sharedFails = distFails ? distFails.hits : fails;
      if (fails >= LOGIN_FAIL_THRESHOLD || (distFails && (!distFails.allowed || sharedFails >= LOGIN_FAIL_THRESHOLD))) {
        const botBlock = await requireHuman(req, "POST /api/bot/login");
        if (botBlock) return botBlock;
      }
      return fail("Invalid login credentials.", 401);
    }
    const u = data.session.user;
    clearLoginFailures(failKeyFor(email, req));
    try {
      const jar = await cookies();
      jar.set(BOT_TESTER_COOKIE, signBotTester(u.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 3600,
      });
      // Tester sessions must never carry full-login proof: dropping the
      // tester cookie alone must not escalate to privileged routes.
      jar.delete(FULL_LOGIN_COOKIE);
    } catch {
      // Marker is defense-in-depth; the session itself still works for play.
    }
    return ok({
      mode: "password",
      user: { id: u.id, email: u.email },
      bot_tester: true,
      restrictions: RESTRICTIONS,
    });
  } catch {
    return fail("internal error", 500);
  }
}

// DELETE /api/bot/login; sign out a tester session and clear the marker.
export async function DELETE() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  try {
    const supabase = await createClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Clearing cookies logs out regardless.
    }
    try {
      const jar = await cookies();
      jar.delete(BOT_TESTER_COOKIE);
    } catch {
      // best-effort
    }
  } catch {
    return fail("internal error", 500);
  }
  return ok({ logged_out: true });
}
