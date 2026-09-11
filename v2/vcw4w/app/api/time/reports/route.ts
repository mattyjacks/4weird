import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/time/reports - Generate reports on hours and Ghost Cash 👻
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const projectId = url.searchParams.get("projectId");

  let query = supabase
    .from("timer_entries")
    .select(`
      id,
      duration,
      is_billable,
      ghost_rate,
      ghost_cash_owed,
      activity_score,
      project_id,
      debtor_id,
      project:timer_projects(id, name, color),
      debtor:profiles!timer_entries_debtor_id_fkey(id, username, display_name)
    `)
    .eq("is_running", false);

  if (orgId) query = query.eq("org_id", orgId);
  if (projectId) query = query.eq("project_id", projectId);

  const { data: entries, error } = await query;
  if (error) return dbFail("GET /api/time/reports", error, "Failed to generate report.");

  let totalSeconds = 0;
  let billableSeconds = 0;
  let nonBillableSeconds = 0;
  let totalGhostCashOwed = 0;
  let totalActivityScore = 0;

  const projectMap: Record<string, { projectName: string; projectColor: string; totalSeconds: number; totalGhostCash: number }> = {};
  const debtorMap: Record<string, { debtorName: string; totalSeconds: number; totalGhostCash: number }> = {};

  type ReportRow = {
    duration: number | null;
    ghost_cash_owed: number | string | null;
    activity_score: number | null;
    is_billable: boolean;
    project_id: string | null;
    project: { name: string; color: string | null } | null;
    debtor_id: string | null;
    debtor: { display_name: string | null; username: string | null } | null;
  };

  ((entries ?? []) as unknown as ReportRow[]).forEach((e) => {
    const dur = e.duration || 0;
    const owed = Number(e.ghost_cash_owed || 0);
    const act = e.activity_score ?? 100;

    totalSeconds += dur;
    if (e.is_billable) {
      billableSeconds += dur;
      totalGhostCashOwed += owed;
    } else {
      nonBillableSeconds += dur;
    }
    totalActivityScore += act;

    if (e.project_id && e.project) {
      if (!projectMap[e.project_id]) {
        projectMap[e.project_id] = {
          projectName: e.project.name,
          projectColor: e.project.color ?? "#3b82f6",
          totalSeconds: 0,
          totalGhostCash: 0,
        };
      }
      projectMap[e.project_id].totalSeconds += dur;
      projectMap[e.project_id].totalGhostCash += owed;
    }

    if (e.debtor_id && e.debtor) {
      if (!debtorMap[e.debtor_id]) {
        debtorMap[e.debtor_id] = {
          debtorName: e.debtor.display_name || e.debtor.username || "Unknown",
          totalSeconds: 0,
          totalGhostCash: 0,
        };
      }
      debtorMap[e.debtor_id].totalSeconds += dur;
      debtorMap[e.debtor_id].totalGhostCash += owed;
    }
  });

  const entryCount = entries?.length || 0;
  const avgActivity = entryCount > 0 ? Math.round(totalActivityScore / entryCount) : 100;

  return ok({
    report: {
      summary: {
        totalSeconds,
        billableSeconds,
        nonBillableSeconds,
        totalGhostCashOwed: Number(totalGhostCashOwed.toFixed(2)),
        entryCount,
        totalHours: Number((totalSeconds / 3600).toFixed(2)),
        billableHours: Number((billableSeconds / 3600).toFixed(2)),
        averageActivityScore: avgActivity,
      },
      byProject: Object.entries(projectMap).map(([projectId, d]) => ({
        projectId,
        ...d,
        totalGhostCash: Number(d.totalGhostCash.toFixed(2)),
      })),
      byDebtor: Object.entries(debtorMap).map(([debtorId, d]) => ({
        debtorId,
        ...d,
        totalGhostCash: Number(d.totalGhostCash.toFixed(2)),
      })),
    },
  });
}
