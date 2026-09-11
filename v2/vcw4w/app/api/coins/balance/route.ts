import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return fail("Authentication required.", 401);
  // Fixed-logic SECURITY DEFINER function: returns SUM(delta) for the
  // caller only. No arguments, nothing to inject.
  const { data, error } = await supabase.rpc("get_my_coin_balance");
  if (error) return dbFail("api/coins/balance", error);
  const coins = Math.round((Number(data) || 0) * 100) / 100;
  const centicentcoins = Math.round(coins * 100);
  return ok({ balance: coins, centicentcoins });
}
