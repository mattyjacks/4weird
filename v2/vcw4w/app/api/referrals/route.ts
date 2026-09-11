import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { REFERRAL_INVITEE_COINS, REFERRAL_INVITER_COINS, isReferralCode } from "@/lib/economy";

export const dynamic = "force-dynamic";

/**
 * Referrals: GET returns your code plus invite counts; POST { code } applies
 * someone else's code once (25 coins each side). Money moves only inside the
 * apply_referral() RPC, guarded by the UNIQUE(invitee_id) constraint.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const { data: code, error } = await supabase.rpc("get_or_create_referral_code");
  if (error) return dbFail("api/referrals", error);
  const { count } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("inviter_id", data.user.id);
  return ok({ code: String(code ?? ""), invited: count ?? 0, inviterCoins: REFERRAL_INVITER_COINS, inviteeCoins: REFERRAL_INVITEE_COINS });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/referrals");
  if (botBlock) return botBlock;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`referral:${data.user.id}`, 5, 60_000);
  if (!throttle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const code = isReferralCode((body as Record<string, unknown> | null)?.code);
  if (!code) return fail("Enter the 8-character invite code.", 400);
  const { data: rows, error } = await supabase.rpc("apply_referral", { p_code: code });
  if (error) {
    const msg = error.message ?? "";
    if (/already used/i.test(msg)) return fail("You already used a referral code.", 409);
    if (/yourself/i.test(msg)) return fail("You cannot use your own code.", 400);
    if (/unknown|invalid/i.test(msg)) return fail("That code was not found.", 404);
    return dbFail("api/referrals", error, "Unable to apply referral.");
  }
  const row = (rows as { inviter_coins: number; invitee_coins: number }[] | null)?.[0] ?? { inviter_coins: 0, invitee_coins: 0 };
  return ok({ inviterCoins: row.inviter_coins, inviteeCoins: row.invitee_coins });
}
