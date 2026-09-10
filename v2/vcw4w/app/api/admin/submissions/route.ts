import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const role = (u.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return fail("Admin access required.", 403);
  const { data: rows, error } = await supabase
    .from("code_submissions")
    .select("id,title,status,created_at,owner_id")
    .eq("status", "submitted")
    .limit(100);
  if (error) return fail("internal error", 500);
  return ok({ submissions: rows ?? [] });
}
