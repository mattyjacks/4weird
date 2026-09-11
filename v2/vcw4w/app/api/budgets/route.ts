import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Login required.", 401);
  const orgId = new URL(req.url).searchParams.get("orgId");
  if (orgId && !/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  if (orgId) {
    // Membership gate before revealing org budget existence/values.
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return fail("Not a member of this org.", 403);
  }
  const table = orgId ? "org_budgets" : "personal_budgets";
  const key = orgId ? "org_id" : "user_id";
  const value = orgId ?? user.id;
  const { data, error } = await supabase.from(table).select("monthly_cap_coins,alert_at_pct,hard_stop,updated_at").eq(key, value).maybeSingle();
  if (error) return dbFail("GET /api/budgets", error, "Unable to load budget.");
  return ok({ budget: data ?? { monthly_cap_coins: 0, alert_at_pct: 80, hard_stop: false } });
}

export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Login required.", 401);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const cap = Number(body?.monthlyCapCoins); const alert = Number(body?.alertAtPct);
  const hardStop = Boolean(body?.hardStop); const orgId = typeof body?.orgId === "string" ? body.orgId : "";
  if (!Number.isFinite(cap) || cap < 0 || cap > 100000000 || !Number.isInteger(alert) || alert < 1 || alert > 100) return fail("Invalid budget settings.", 400);
  if (orgId) {
    // Validate shape + membership before touching the RPC so strangers get
    // a clean 403 instead of an RPC error (the RPC re-checks billing.manage).
    if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return fail("Not a member of this org.", 403);
  }
  const { data, error } = orgId
    ? await supabase.rpc("set_org_budget", { p_org: orgId, p_cap: cap, p_alert: alert, p_hard_stop: hardStop })
    : await supabase.rpc("set_my_budget", { p_cap: cap, p_alert: alert, p_hard_stop: hardStop });
  if (error) return dbFail("PUT /api/budgets", error, "Unable to save budget.");
  return ok({ budget: data });
}
