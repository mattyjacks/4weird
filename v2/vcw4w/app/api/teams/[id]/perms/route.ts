import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/teams/:id/perms — my effective permission keys in this workspace.
// Drives the "presented simply" UI: show only permitted actions.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid team.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const { data: perms, error } = await supabase.rpc("my_team_perms", { p_team: id });
  if (error) return fail("Unable to load permissions.", 500);
  return ok({ permissions: (perms as string[] | null) ?? [] });
}
