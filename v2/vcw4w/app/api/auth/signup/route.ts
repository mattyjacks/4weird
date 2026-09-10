import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient, supabaseServiceRoleKey } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { TRIAL_COINS_DEFAULT, TRIAL_COINS_MAX } from "@/lib/economy";
import { clientIp, isEmail, isPassword } from "@/lib/validate";

export const dynamic = "force-dynamic";

async function awardTrial(userId: string, email: string, req: Request): Promise<boolean> {
  const salt = process.env.SIGNUP_IP_HASH_SALT ?? "";
  // Fail closed: credits are never issued with an unsalted, reusable IP hash.
  if (!salt || !supabaseServiceRoleKey()) return false;
  const hash = createHash("sha256").update(`${salt}|${clientIp(req)}`).digest("hex");
  const coins = Math.max(1, Math.min(TRIAL_COINS_MAX, Number(process.env.FREE_TRIAL_VCOINS ?? TRIAL_COINS_DEFAULT)));
  const { data } = await serviceClient().rpc("award_signup_credit", {
    p_user: userId,
    p_email: email,
    p_ip_hash: hash,
    p_coins: coins,
  });
  return !!data;
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const throttle = rateLimit(`signup:${clientIp(req)}`, 10);
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
  const input = (body ?? {}) as Record<string, unknown>;
  const email = isEmail(input.email);
  const password = isPassword(input.password);
  if (!email) return fail("Enter a valid email address.", 400);
  if (!password) return fail("Password must be 8-128 characters.", 400);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      // Anti-enumeration: an existing address gets the same shape as a new
      // signup, without a session. (No confirmation emails are sent.)
      if (/already registered|already exists/i.test(error.message ?? "")) {
        return ok({ user: null, note: "If this email is new, the account was created. Try logging in." });
      }
      // Never reflect provider internals: generic failure, no oracle.
      return fail("Signup failed. Try again.", 400);
    }
    if (data?.session?.user) {
      const trialAwarded = await awardTrial(data.session.user.id, email, req).catch(() => false);
      const u = data.session.user;
      return ok({ user: { id: u.id, email: u.email }, trialAwarded });
    }
    // Confirm-email mode got enabled later: no session until confirmed.
    if (data?.user) await awardTrial(data.user.id, email, req).catch(() => false);
    return ok({ user: null, needsConfirmation: true });
  } catch {
    return fail("internal error", 500);
  }
}
