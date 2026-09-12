import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { acctBucketKey, globalBucket, ipBucketKey, throttleHeaders } from "@/lib/abuse-limit";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { clientIp, isEmail, isLoginPassword } from "@/lib/validate";
import { cookies } from "next/headers";
import { FULL_LOGIN_COOKIE, signFullLogin } from "@/lib/bot-auth";

export const dynamic = "force-dynamic";

// Consecutive-failure tracker: BotID only engages after 5 failed password
// inputs in a row for the same account (or IP when the email shape is
// invalid). Success clears the counter. Process-local (fast, exact
// consecutive semantics); the shared Postgres fail bucket below covers
// cross-instance spread.
const loginFailures = new Map<string, { fails: number; resetAt: number }>();
const LOGIN_FAIL_WINDOW_MS = 15 * 60_000;
const LOGIN_FAIL_THRESHOLD = 5;

function failKeyFor(email: string, req: Request): string {
  if (email) return `login-fail:acct:${email}`.toLowerCase().slice(0, 160);
  return `login-fail:ip:${clientIp(req)}`.toLowerCase().slice(0, 160);
}

function recordLoginFailure(key: string): number {
  const now = Date.now();
  // Opportunistic expiry + cap: keys are attacker-influenced (emails), so the
  // map must not grow unboundedly.
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

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  // NOTE: no upfront BotID gate here on purpose. First-attempt logins (human
  // or AI-driven through a real browser) must never see the
  // automated-traffic 403. The gate engages ONLY after 5 consecutive failed
  // password inputs (see failure paths below).
  const throttle = rateLimit(`login:${clientIp(req)}`, 10);
  if (!throttle.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  // Distributed credential-stuffing shield: per-instance memory is bypassed
  // by spreading attempts across instances/IPs. Shared buckets cap one IP at
  // 100 logins/hour regardless of spread.
  const loginDist = await globalBucket(ipBucketKey(req, "login-hour"), 100, 3600);
  if (loginDist && !loginDist.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, throttleHeaders(loginDist.retryAfter));
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const email = isEmail(input.email);
  // Length-shape only: strength is enforced at signup/change, and pre-rule
  // accounts must still be able to present their existing password here.
  const password = isLoginPassword(input.password);
  // Generic message either way: no oracle for which half was wrong.
  // Malformed credentials count as a failed password input toward the
  // 5-in-a-row BotID threshold, but never trigger the BotID 403 themselves
  // until the threshold is reached.
  if (!email || !password) {
    const fails = recordLoginFailure(failKeyFor(email, req));
    const distFails = await globalBucket(
      email ? acctBucketKey("login-fail", email) : ipBucketKey(req, "login-fail"),
      LOGIN_FAIL_THRESHOLD,
      900,
    );
    const sharedFails = distFails ? distFails.hits : fails;
    if (fails >= LOGIN_FAIL_THRESHOLD || (distFails && (!distFails.allowed || sharedFails >= LOGIN_FAIL_THRESHOLD))) {
      const botBlock = await requireHuman(req, "POST /api/auth/login");
      if (botBlock) return botBlock;
    }
    return fail("Invalid login credentials.", 401);
  }
  // Per-account throttle survives IP rotation during credential stuffing.
  const accountThrottle = rateLimit(`login-email:${email}`, 10);
  if (!accountThrottle.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, {
      "Retry-After": String(accountThrottle.retryAfter),
    });
  }
  // ...and the shared per-account bucket survives instance rotation too: one
  // account takes at most 30 password guesses/hour however the botnet spreads.
  const accountDist = await globalBucket(acctBucketKey("login-hour", email), 30, 3600);
  if (accountDist && !accountDist.allowed) {
    return fail("Too many attempts. Wait a minute and retry.", 429, throttleHeaders(accountDist.retryAfter));
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session?.user) {
      // Wrong password: count it. The automated-traffic check engages ONLY
      // here, after 5 consecutive failures (local exact count + shared
      // cross-instance bucket). Success clears the local streak.
      const key = failKeyFor(email, req);
      const fails = recordLoginFailure(key);
      const distFails = await globalBucket(acctBucketKey("login-fail", email), LOGIN_FAIL_THRESHOLD, 900);
      const sharedFails = distFails ? distFails.hits : fails;
      if (fails >= LOGIN_FAIL_THRESHOLD || (distFails && (!distFails.allowed || sharedFails >= LOGIN_FAIL_THRESHOLD))) {
        const botBlock = await requireHuman(req, "POST /api/auth/login");
        if (botBlock) return botBlock;
      }
      return fail("Invalid login credentials.", 401);
    }
    const u = data.session.user;
    clearLoginFailures(failKeyFor(email, req));
    // Full-login proof for privileged routes (profile, rights, bot keys).
    // Tester logins (POST /api/bot/login) never set this, so stripping the
    // tester cookie alone cannot escalate.
    try {
      const proof = signFullLogin(u.id);
      if (proof) {
        const jar = await cookies();
        jar.set(FULL_LOGIN_COOKIE, proof, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 3600,
        });
      }
    } catch {
      // Proof is hardening; the session itself still works for play.
    }
    return ok({ user: { id: u.id, email: u.email } });
  } catch {
    return fail("internal error", 500);
  }
}
