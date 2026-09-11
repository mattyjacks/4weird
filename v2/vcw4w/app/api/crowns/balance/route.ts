import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/crowns/balance
 *
 * Returns the caller's Crown balances from the `get_my_crown_balances()`
 * SECURITY DEFINER RPC (locked 30-day lots + eligible unlocked lots).
 * Shape: { locked, eligible, total, lifetime_earned } where `total`
 * includes locked crowns (locked + eligible).
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return fail("Authentication required.", 401);
  const { data, error } = await supabase.rpc("get_my_crown_balances");
  if (error) return dbFail("api/crowns/balance", error, "Unable to load crown balance.");
  const row = (data ?? {}) as {
    locked_crowns?: unknown;
    eligible_crowns?: unknown;
    lifetime_earned?: unknown;
  };
  const locked = Number(row.locked_crowns) || 0;
  const eligible = Number(row.eligible_crowns) || 0;
  const lifetimeEarned = Number(row.lifetime_earned) || 0;
  const total = Math.round((locked + eligible) * 100) / 100;
  return ok({
    locked,
    eligible,
    total,
    lifetime_earned: lifetimeEarned,
  });
}
