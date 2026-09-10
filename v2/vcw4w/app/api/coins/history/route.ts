import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { clampLimit } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return fail("Authentication required.", 401);
  const limit = clampLimit(new URL(req.url).searchParams.get("limit"), 25, 100);
  const { data, error } = await supabase
    .from("coin_ledger")
    .select("delta,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return fail("Unable to load coin history.", 500);
  return ok({ rows: data ?? [] });
}
