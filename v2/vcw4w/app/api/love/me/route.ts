import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/love/me; own 💌 wallet (private balance + public counters).
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Authentication required.", 401);
  const { data: rows, error } = await supabase.rpc("love_me");
  if (error) return dbFail("api/love/me", error);
  const row = (rows as { balance: number; earned: number; received: number; given: number; is_public: boolean }[] | null)?.[0]
    ?? { balance: 0, earned: 0, received: 0, given: 0, is_public: true };
  return ok({
    balance: row.balance,
    earned: row.earned,
    received: row.received,
    given: row.given,
    is_public: row.is_public,
  });
}
