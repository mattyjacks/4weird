import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// PUT /api/time/projects/[id] - Update timer project
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { id } = await params;
  if (!id) return fail("Project ID required.", 400);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { name, color, ghostRate, budgetHours, isBillable, isArchived } = body || {};

  const updates: any = {};
  if (name !== undefined) updates.name = String(name).trim().slice(0, 100);
  if (color !== undefined) updates.color = String(color).slice(0, 7);
  if (ghostRate !== undefined) updates.ghost_rate = Math.max(Number(ghostRate) || 0, 0);
  if (budgetHours !== undefined) updates.budget_hours = budgetHours ? Number(budgetHours) : null;
  if (isBillable !== undefined) updates.is_billable = !!isBillable;
  if (isArchived !== undefined) updates.is_archived = !!isArchived;

  const { data: project, error } = await supabase
    .from("timer_projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return dbFail("PUT /api/time/projects/[id]", error, "Failed to update timer project.");

  return ok({ project });
}

// DELETE /api/time/projects/[id] - Delete project
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { id } = await params;
  if (!id) return fail("Project ID required.", 400);

  const { error } = await supabase
    .from("timer_projects")
    .delete()
    .eq("id", id);

  if (error) return dbFail("DELETE /api/time/projects/[id]", error, "Failed to delete project.");

  return ok({ success: true });
}
