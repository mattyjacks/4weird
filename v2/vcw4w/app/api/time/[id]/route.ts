import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

// Ownership is enforced by the user_id predicate on every query; the route
// adds defense in depth: strict uuid shape, and no false-success - zero
// matched rows is a 404, never ok:true.

// PUT /api/time/[id] - Update a time entry
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid entry.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { description, projectId, isBillable, duration, ghostRate } =
    (body as Record<string, unknown>) || {};

  const updates: Record<string, unknown> = {};
  if (description !== undefined) updates.description = String(description).slice(0, 2000);
  if (projectId !== undefined) updates.project_id = projectId || null;
  if (isBillable !== undefined) updates.is_billable = !!isBillable;
  if (duration !== undefined) updates.duration = Math.max(Number(duration) || 0, 0);
  if (ghostRate !== undefined) updates.ghost_rate = Math.max(Number(ghostRate) || 0, 0);
  if (Object.keys(updates).length === 0) return fail("Nothing to update.", 400);

  if (updates.duration !== undefined || updates.ghost_rate !== undefined || updates.is_billable !== undefined) {
    const dur = updates.duration;
    const rate = updates.ghost_rate;
    const bill = updates.is_billable;
    if (dur !== undefined && rate !== undefined && bill !== undefined) {
      const durNum = Number(dur);
      const rateNum = Number(rate);
      updates.ghost_cash_owed =
        bill && rateNum > 0 ? Number(((durNum / 3600) * rateNum).toFixed(4)) : 0;
    }
  }

  const { data: entry, error } = await supabase
    .from("timer_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", u.id)
    .select()
    .maybeSingle();

  if (error) return dbFail("PUT /api/time/[id]", error, "Failed to update time entry.");
  if (!entry) return fail("Entry not found.", 404);

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
  if (!isUuid(id)) return fail("Invalid entry.", 400);

  const { data: deleted, error } = await supabase
    .from("timer_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", u.id)
    .select("id");

  if (error) return dbFail("DELETE /api/time/[id]", error, "Failed to delete time entry.");
  if (!deleted || deleted.length === 0) return fail("Entry not found.", 404);

  return ok({ success: true });
}
