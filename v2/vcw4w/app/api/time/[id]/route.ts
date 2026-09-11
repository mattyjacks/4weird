import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

// PUT /api/time/[id] - Update a time entry
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { id } = await params;
  if (!id) return fail("Entry ID required.", 400);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { description, projectId, isBillable, duration, ghostRate } = body || {};

  const updates: any = {};
  if (description !== undefined) updates.description = String(description).slice(0, 2000);
  if (projectId !== undefined) updates.project_id = projectId || null;
  if (isBillable !== undefined) updates.is_billable = !!isBillable;
  if (duration !== undefined) updates.duration = Math.max(Number(duration) || 0, 0);
  if (ghostRate !== undefined) updates.ghost_rate = Math.max(Number(ghostRate) || 0, 0);

  if (updates.duration !== undefined || updates.ghost_rate !== undefined || updates.is_billable !== undefined) {
    const dur = updates.duration;
    const rate = updates.ghost_rate;
    const bill = updates.is_billable;
    if (dur !== undefined && rate !== undefined && bill !== undefined) {
      updates.ghost_cash_owed = bill && rate > 0 ? Number(((dur / 3600) * rate).toFixed(4)) : 0;
    }
  }

  const { data: entry, error } = await supabase
    .from("timer_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", u.id)
    .select()
    .single();

  if (error) return dbFail("PUT /api/time/[id]", error, "Failed to update time entry.");

  return ok({ entry });
}

// DELETE /api/time/[id] - Delete a time entry
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { id } = await params;
  if (!id) return fail("Entry ID required.", 400);

  const { error } = await supabase
    .from("timer_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", u.id);

  if (error) return dbFail("DELETE /api/time/[id]", error, "Failed to delete time entry.");

  return ok({ success: true });
}
