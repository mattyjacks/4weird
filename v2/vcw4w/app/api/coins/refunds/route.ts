import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/coins/refunds; refundable purchased lots (90-day window,
 * unspent remainder only) + past refunds. Free grants are never listed.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("Authentication required.", 401);
  try {
    const [lots, refunds] = await Promise.all([
      supabase.rpc("get_my_refundable_lots"),
      supabase.rpc("get_my_coin_refunds"),
    ]);
    if (lots.error) return dbFail("api/coins/refunds:lots", lots.error);
    if (refunds.error) return dbFail("api/coins/refunds:history", refunds.error);
    return ok({ lots: lots.data ?? [], refunds: refunds.data ?? [] });
  } catch (error) {
    return dbFail("api/coins/refunds", error);
  }
}
