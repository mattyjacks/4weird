import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

/**
 * Daily login bonus: 5 coins + 1 per consecutive UTC day, capped at 12.
 * The claim_daily_bonus() RPC owns the date math and the ledger insert, so
 * concurrent claims settle to a single award. Second claim same day pays 0.
 */
export async function POST() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const throttle = rateLimit(`daily:${data.user.id}`, 5, 60_000);
  if (!throttle.allowed) {
    return fail("Too many attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { data: rows, error } = await supabase.rpc("claim_daily_bonus");
  if (error) return fail("internal error", 500);
  const row = (rows as { coins: number; streak: number }[] | null)?.[0] ?? { coins: 0, streak: 0 };
  return ok({ coins: row.coins, streak: row.streak, claimed: row.coins > 0 });
}
