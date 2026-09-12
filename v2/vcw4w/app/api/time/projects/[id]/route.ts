import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

// PUT /api/time/projects/[id] - Update timer project.
// Ownership is enforced by the timer_projects_modify RLS policy (owner or
// org admin); the route adds defense in depth: strict uuid shape, validated
// fields, and no false-success - zero matched rows is a 404, never ok:true.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid project.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { name, color, ghostRate, budgetHours, isBillable, isArchived } =
    (body as Record<string, unknown>) || {};

  const updates: Record<string, unknown> = {};
  if (name !== undefined) {
    const clean = String(name).trim().slice(0, 100);
    if (clean.length < 1) return fail("Invalid project name.", 400);
    updates.name = clean;
  }
  if (color !== undefined) {
    const clean = String(color).slice(0, 7);
    if (!/^#[0-9a-f]{6}$/i.test(clean)) return fail("Invalid color.", 400);
    updates.color = clean;
  }
  if (ghostRate !== undefined) updates.ghost_rate = Math.max(Number(ghostRate) || 0, 0);
  if (budgetHours !== undefined) updates.budget_hours = budgetHours ? Number(budgetHours) : null;
  if (isBillable !== undefined) updates.is_billable = !!isBillable;
  if (isArchived !== undefined) updates.is_archived = !!isArchived;
  if (Object.keys(updates).length === 0) return fail("Nothing to update.", 400);

  // Defense in depth: RLS (timer_projects_modify) is primary, but verify
  // ownership/membership in the route so a policy regression fails closed
  // with 404 instead of cross-tenant write.
  const { data: existing, error: fetchErr } = await supabase
    .from("timer_projects")
    .select("id, user_id, org_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return dbFail("PUT /api/time/projects/[id]", fetchErr, "Failed to update timer project.");
  if (!existing) return fail("Project not found.", 404);
  if ((existing as { user_id?: string }).user_id !== u.id) {
    const orgId = (existing as { org_id?: string | null }).org_id;
    if (!orgId) return fail("Project not found.", 404);
    const { data: mem } = await supabase
      .from("org_members")
      .select("role_key")
      .eq("org_id", orgId)
      .eq("user_id", u.id)
      .maybeSingle();
    const role = String((mem as { role_key?: string } | null)?.role_key ?? "");
    if (!["owner", "admin", "lord", "banker"].includes(role))
      return fail("Project not found.", 404);
  }

  const { data: project, error } = await supabase
    .from("timer_projects")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return dbFail("PUT /api/time/projects/[id]", error, "Failed to update timer project.");
  if (!project) return fail("Project not found.", 404);

  return ok({ project });
}

// DELETE /api/time/projects/[id] - Delete project
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid project.", 400);

  // Same ownership gate as PUT: verify before delete so RLS is not the only
  // barrier.
  const { data: existingDel, error: fetchDelErr } = await supabase
    .from("timer_projects")
    .select("id, user_id, org_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchDelErr) return dbFail("DELETE /api/time/projects/[id]", fetchDelErr, "Failed to delete project.");
  if (!existingDel) return fail("Project not found.", 404);
  if ((existingDel as { user_id?: string }).user_id !== u.id) {
    const orgId = (existingDel as { org_id?: string | null }).org_id;
    if (!orgId) return fail("Project not found.", 404);
    const { data: mem } = await supabase
      .from("org_members")
      .select("role_key")
      .eq("org_id", orgId)
      .eq("user_id", u.id)
      .maybeSingle();
    const role = String((mem as { role_key?: string } | null)?.role_key ?? "");
    if (!["owner", "admin", "lord", "banker"].includes(role))
      return fail("Project not found.", 404);
  }

  const { data: deleted, error } = await supabase
    .from("timer_projects")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return dbFail("DELETE /api/time/projects/[id]", error, "Failed to delete project.");
  if (!deleted || deleted.length === 0) return fail("Project not found.", 404);

  return ok({ success: true });
}
