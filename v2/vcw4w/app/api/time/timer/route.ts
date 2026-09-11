import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/time/timer - Get currently running timer
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { data: runningTimer, error } = await supabase
    .from("timer_entries")
    .select(`
      id,
      user_id,
      project_id,
      debtor_id,
      org_id,
      description,
      start_time,
      is_billable,
      is_running,
      ghost_rate,
      ghost_cash_owed,
      activity_score,
      upwork_sync_mode,
      upwork_contract_id,
      upwork_memo,
      project:timer_projects(id, name, color, ghost_rate, org_id)
    `)
    .eq("user_id", u.id)
    .eq("is_running", true)
    .order("start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return dbFail("GET /api/time/timer", error, "Failed to load running timer.");

  if (!runningTimer) {
    return ok({ timer: null });
  }

  type TimerProjectJoin = {
    id: string;
    name: string;
    color: string | null;
    ghost_rate: number | string | null;
    org_id: string | null;
  } | null;

  const proj = runningTimer.project as TimerProjectJoin;

  return ok({
    timer: {
      id: runningTimer.id,
      description: runningTimer.description,
      startTime: runningTimer.start_time,
      isBillable: runningTimer.is_billable,
      isRunning: runningTimer.is_running,
      ghostRate: Number(runningTimer.ghost_rate || 0),
      ghostCashOwed: Number(runningTimer.ghost_cash_owed || 0),
      activityScore: runningTimer.activity_score ?? 100,
      upworkSyncMode: !!runningTimer.upwork_sync_mode,
      upworkContractId: runningTimer.upwork_contract_id,
      upworkMemo: runningTimer.upwork_memo,
      projectId: runningTimer.project_id,
      project: proj ? {
        id: proj.id,
        name: proj.name,
        color: proj.color,
        ghostRate: Number(proj.ghost_rate || 0),
        orgId: proj.org_id,
      } : null,
      debtorId: runningTimer.debtor_id,
      orgId: runningTimer.org_id,
    },
  });
}

// POST /api/time/timer - Start running timer
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const throttle = rateLimit(`timer-start:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // empty body ok
  }

  const {
    projectId,
    debtorId,
    description,
    isBillable = true,
    upworkSyncMode = false,
    upworkContractId,
    upworkMemo,
  } = body;

  const { data: timer, error } = await supabase.rpc("start_timer", {
    p_project_id: projectId ? String(projectId) : null,
    p_debtor_id: debtorId ? String(debtorId) : null,
    p_description: description ? String(description).slice(0, 2000) : null,
    p_is_billable: !!isBillable,
    p_upwork_sync_mode: !!upworkSyncMode,
    p_upwork_contract_id: upworkContractId ? String(upworkContractId).slice(0, 100) : null,
    p_upwork_memo: upworkMemo ? String(upworkMemo).slice(0, 200) : null,
  });

  if (error) {
    if (/already running/i.test(error.message)) {
      return fail("A timer is already running. Stop it first.", 400);
    }
    return dbFail("POST /api/time/timer", error, "Failed to start timer.");
  }

  return ok({ timer }, 201);
}

// PUT /api/time/timer - Stop running timer
export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  // Check running timer
  const { data: runningTimer } = await supabase
    .from("timer_entries")
    .select("id")
    .eq("user_id", u.id)
    .eq("is_running", true)
    .maybeSingle();

  if (!runningTimer) return fail("No running timer found.", 404);

  let stopBody: Record<string, unknown> = {};
  try {
    stopBody = (await req.json()) as Record<string, unknown>;
  } catch {
    // empty body ok
  }

  const { description, projectId, isBillable, activityScore } = stopBody;

  const { data: timer, error } = await supabase.rpc("stop_timer", {
    p_entry_id: runningTimer.id,
    p_description: description !== undefined ? String(description).slice(0, 2000) : null,
    p_project_id: projectId ? String(projectId) : null,
    p_is_billable: isBillable !== undefined ? !!isBillable : null,
    p_activity_score: typeof activityScore === "number" ? activityScore : null,
  });

  if (error) return dbFail("PUT /api/time/timer", error, "Failed to stop timer.");

  return ok({ timer });
}

// DELETE /api/time/timer - Discard running timer
export async function DELETE() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { data: runningTimer } = await supabase
    .from("timer_entries")
    .select("id")
    .eq("user_id", u.id)
    .eq("is_running", true)
    .maybeSingle();

  if (!runningTimer) return fail("No running timer found.", 404);

  const { error } = await supabase
    .from("timer_entries")
    .delete()
    .eq("id", runningTimer.id);

  if (error) return dbFail("DELETE /api/time/timer", error, "Failed to discard timer.");

  return ok({ success: true });
}
