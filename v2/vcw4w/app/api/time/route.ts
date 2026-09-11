import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/time - List time entries with optional filters
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const orgId = url.searchParams.get("orgId");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 200);

  let query = supabase
    .from("timer_entries")
    .select(`
      id,
      user_id,
      project_id,
      debtor_id,
      org_id,
      description,
      start_time,
      end_time,
      duration,
      is_billable,
      is_running,
      ghost_rate,
      ghost_cash_owed,
      activity_score,
      upwork_sync_mode,
      upwork_contract_id,
      upwork_memo,
      tags,
      created_at,
      project:timer_projects(id, name, color, ghost_rate, org_id),
      debtor:profiles!timer_entries_debtor_id_fkey(id, username, display_name)
    `)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (projectId) query = query.eq("project_id", projectId);
  if (orgId) query = query.eq("org_id", orgId);

  const { data: entries, error } = await query;
  if (error) return dbFail("GET /api/time", error, "Unable to load time entries.");

  return ok({
    entries: (entries ?? []).map((e: any) => ({
      id: e.id,
      description: e.description,
      startTime: e.start_time,
      endTime: e.end_time,
      duration: e.duration,
      isBillable: e.is_billable,
      isRunning: e.is_running,
      ghostRate: Number(e.ghost_rate || 0),
      ghostCashOwed: Number(e.ghost_cash_owed || 0),
      activityScore: e.activity_score ?? 100,
      upworkSyncMode: !!e.upwork_sync_mode,
      upworkContractId: e.upwork_contract_id,
      upworkMemo: e.upwork_memo,
      tags: e.tags,
      projectId: e.project_id,
      project: e.project ? {
        id: e.project.id,
        name: e.project.name,
        color: e.project.color,
        ghostRate: Number(e.project.ghost_rate || 0),
        orgId: e.project.org_id,
      } : null,
      debtorId: e.debtor_id,
      debtor: e.debtor ? {
        id: e.debtor.id,
        username: e.debtor.username,
        displayName: e.debtor.display_name,
      } : null,
      orgId: e.org_id,
      createdAt: e.created_at,
    })),
  });
}

// POST /api/time - Create a manual time entry
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const throttle = rateLimit(`timer-manual:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const {
    projectId,
    debtorId,
    description,
    startTime,
    endTime,
    duration: rawDuration,
    isBillable = true,
  } = body || {};

  if (!startTime) return fail("startTime is required.", 400);

  let duration = rawDuration;
  if (!duration && endTime) {
    const diff = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
    duration = Math.max(diff, 0);
  }

  if (typeof duration !== "number" || duration < 0) {
    return fail("Valid duration in seconds is required.", 400);
  }

  // Look up project rate and org
  let ghostRate = 0;
  let orgId = null;
  if (projectId) {
    const { data: proj } = await supabase
      .from("timer_projects")
      .select("ghost_rate, org_id")
      .eq("id", projectId)
      .single();
    if (proj) {
      ghostRate = Number(proj.ghost_rate || 0);
      orgId = proj.org_id;
    }
  }

  const ghostCashOwed = isBillable && ghostRate > 0
    ? Number(((duration / 3600) * ghostRate).toFixed(4))
    : 0;

  const { data: entry, error } = await supabase
    .from("timer_entries")
    .insert({
      user_id: u.id,
      project_id: projectId || null,
      debtor_id: debtorId || null,
      org_id: orgId || null,
      description: description ? String(description).slice(0, 2000) : null,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : new Date().toISOString(),
      duration,
      is_billable: !!isBillable,
      is_running: false,
      ghost_rate: ghostRate,
      ghost_cash_owed: ghostCashOwed,
      activity_score: 100,
    })
    .select()
    .single();

  if (error) return dbFail("POST /api/time", error, "Failed to create time entry.");

  // Record pending debt if applicable
  if (ghostCashOwed > 0 && (debtorId || orgId)) {
    await supabase.from("timer_debts").insert({
      org_id: orgId || null,
      project_id: projectId || null,
      creditor_id: u.id,
      debtor_id: debtorId || u.id,
      amount_ghost_cash: ghostCashOwed,
      status: "pending",
      memo: `Manual entry: ${description || "Work logged"}`,
    });
  }

  return ok({ entry }, 201);
}
