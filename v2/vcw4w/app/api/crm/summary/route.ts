import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

// GET /api/crm/summary?org_id=<uuid>
// Pipeline + follow-up + unpaid-invoice rollup for the CRM dashboard.
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = isUuid(new URL(req.url).searchParams.get("org_id"));

  let dealsQ = supabase.from("crm_deals").select("value_coins,stage").limit(500);
  if (orgId) dealsQ = dealsQ.eq("org_id", orgId);
  const { data: deals, error: dealsError } = await dealsQ;
  if (dealsError) return dbFail("GET /api/crm/summary deals", dealsError, "Unable to load summary.");

  let actQ = supabase.from("crm_activities").select("id,done,due_at").limit(500);
  if (orgId) actQ = actQ.eq("org_id", orgId);
  const { data: activities, error: actError } = await actQ;
  if (actError) return dbFail("GET /api/crm/summary activities", actError, "Unable to load summary.");

  let invQ = supabase.from("crm_invoices").select("total_coins,status").limit(500);
  if (orgId) invQ = invQ.eq("org_id", orgId);
  const { data: invoices, error: invError } = await invQ;
  if (invError) return dbFail("GET /api/crm/summary invoices", invError, "Unable to load summary.");

  const dealRows = (deals ?? []) as { value_coins: number; stage: string }[];
  const open = dealRows.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const now = Date.now();
  const overdue = ((activities ?? []) as { done: boolean; due_at: string | null }[]).filter(
    (a) => !a.done && a.due_at && new Date(a.due_at).getTime() < now,
  );
  const unpaid = ((invoices ?? []) as { total_coins: number; status: string }[]).filter(
    (i) => i.status === "sent",
  );

  return ok({
    total_pipeline_coins: open.reduce((n, d) => n + Number(d.value_coins ?? 0), 0),
    won_coins: dealRows
      .filter((d) => d.stage === "won")
      .reduce((n, d) => n + Number(d.value_coins ?? 0), 0),
    open_deals: open.length,
    overdue_activities: overdue.length,
    unpaid_invoices: unpaid.length,
    unpaid_coins: unpaid.reduce((n, i) => n + Number(i.total_coins ?? 0), 0),
  });
}
