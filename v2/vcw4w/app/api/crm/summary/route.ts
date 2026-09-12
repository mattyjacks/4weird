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
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const orgRaw = String(new URL(req.url).searchParams.get("org_id") ?? "").trim();
  if (!orgRaw) return fail("org_id is required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  // Membership gate before revealing org totals (RLS re-checks below).
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);

  const { data: deals, error: dealsError } = await supabase
    .from("crm_deals")
    .select("value_coins,stage")
    .eq("org_id", orgId)
    .limit(500);
  if (dealsError) return dbFail("GET /api/crm/summary deals", dealsError, "Unable to load summary.");

  const { data: activities, error: actError } = await supabase
    .from("crm_activities")
    .select("id,done,due_at")
    .eq("org_id", orgId)
    .limit(500);
  if (actError) return dbFail("GET /api/crm/summary activities", actError, "Unable to load summary.");

  const { data: invoices, error: invError } = await supabase
    .from("crm_invoices")
    .select("total_coins,status")
    .eq("org_id", orgId)
    .limit(500);
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
