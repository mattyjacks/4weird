import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return fail("Authentication required.", 401);
  // Fixed-logic SECURITY DEFINER function: returns SUM(delta) for the
  // caller only. No arguments, nothing to inject.
  const { data, error } = await supabase.rpc("get_my_coin_balance");
  if (error) return fail("internal error", 500);
  return ok({ balance: Number(data) || 0 });
}
