import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

/**
 * GET /api/orgs/roles; the assignable role catalog: classic ranks
 * (owner/admin/billing/…) plus warlord ranks - Lord (org leader), Captain
 * (team leader), Infantry (regular player), Banker (finance, full write),
 * Banker read-only. Labels + scopes for role pickers; permission details
 * stay server-side (effective power is checked per action, never trusted
 * from the client).
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const { data: roles, error } = await supabase
    .from("role_templates")
    .select("key,scope,label")
    .order("scope", { ascending: true })
    .order("key", { ascending: true });
  if (error) return dbFail("GET /api/orgs/roles", error, "Unable to load roles.");
  return ok({ roles: roles ?? [] });
}
