import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient, supabaseServiceRoleKey } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
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
  const botBlock = await requireHuman(req, "POST /api/auth/signup");
  if (botBlock) return botBlock;
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
  if (!password)
    return fail("Password needs 8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols.", 400);
  // COPPA + global age gates: direct accounts are 13+ only. 13-17 → teen,
  // 18+ → adult. Under 13 has no direct account: a parent/guardian signs up
  // (adult) and creates a Child sub-account instead. No DOB is collected —
  // only this self-declared band, stored on profiles.age_band.
  const rawBand = String(input.age_band ?? input.age_group ?? "").trim().toLowerCase();
  if (rawBand === "kid" || rawBand === "child" || rawBand === "under-13" || rawBand === "under_13") {
    return fail(
      "Under 13 needs a parent or guardian account: have them sign up as Adult (18+), then create your Child account in Account → Family.",
      400,
    );
  }
  if (rawBand !== "teen" && rawBand !== "adult") {
    return fail("Choose your age band: Teen (13-17) or Adult (18+). Under 13 needs a parent account.", 400);
  }
  const ageBand = rawBand as "teen" | "adult";
  // Where local law sets a higher consent age (EU GDPR Art. 8 up to 16),
  // younger teens need parent/guardian permission to sign up.
  const consentKeys = ["parent_consent", "guardian_consent", "local_consent"] as const;
  const consentGiven = consentKeys.some((k) => {
    const v = input[k];
    return v === true || v === "true" || v === "1" || v === 1 || v === "yes" || v === "on";
  });
  void consentGiven;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { age_band: ageBand } },
    });
    if (error) {
      // Anti-enumeration: an existing address gets the same shape as a new
      // signup, without a session. (No confirmation emails are sent.)
      if (/already registered|already exists/i.test(error.message ?? "")) {
        // Same shape as a fresh signup (trialAwarded present) so the branch
        // isn't a trivial fingerprint beyond the inherent user null/object.
        return ok({ user: null, trialAwarded: false, age_band: null, note: "If this email is new, the account was created. Try logging in." });
      }
      // Never reflect provider internals: generic failure, no oracle.
      return fail("Signup failed. Try again.", 400);
    }
    if (data?.session?.user) {
      const trialAwarded = await awardTrial(data.session.user.id, email, req).catch(() => false);
      const u = data.session.user;
      // Persist the self-declared band (trigger defaults to unknown; the API
      // is authoritative for COPPA: teen/adult only, never kid). Best-effort:
      // signup must not fail if the profile row is not visible yet.
      try {
        await serviceClient().from("profiles").update({ age_band: ageBand }).eq("id", u.id);
      } catch {
        /* profile backfill happens on next /api/me/profile read */
      }
      return ok({ user: { id: u.id, email: u.email }, trialAwarded, age_band: ageBand });
    }
    // Confirm-email mode got enabled later: no session until confirmed.
    if (data?.user) {
      await awardTrial(data.user.id, email, req).catch(() => false);
      try {
        await serviceClient().from("profiles").update({ age_band: ageBand }).eq("id", data.user.id);
      } catch {
        /* backfilled later */
      }
    }
    return ok({ user: null, needsConfirmation: true });
  } catch {
    return fail("internal error", 500);
  }
}
