import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/time/debts - List Ghost Cash 👻💵 debts
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const status = url.searchParams.get("status");

  let query = supabase
    .from("timer_debts")
    .select(`
      id,
      org_id,
      project_id,
      creditor_id,
      debtor_id,
      amount_ghost_cash,
      status,
      memo,
      settled_at,
      created_at,
      creditor:profiles!timer_debts_creditor_id_fkey(id, username, display_name),
      debtor:profiles!timer_debts_debtor_id_fkey(id, username, display_name)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (orgId) query = query.eq("org_id", orgId);
  if (status) query = query.eq("status", status);

  const { data: debts, error } = await query;
  if (error) return dbFail("GET /api/time/debts", error, "Failed to load Ghost Cash debts.");

  return ok({
    debts: (debts ?? []).map((d: any) => ({
      id: d.id,
      orgId: d.org_id,
      projectId: d.project_id,
      creditorId: d.creditor_id,
      debtorId: d.debtor_id,
      creditor: d.creditor ? {
        id: d.creditor.id,
        username: d.creditor.username,
        displayName: d.creditor.display_name,
      } : null,
      debtor: d.debtor ? {
        id: d.debtor.id,
        username: d.debtor.username,
        displayName: d.debtor.display_name,
      } : null,
      amountGhostCash: Number(d.amount_ghost_cash || 0),
      status: d.status,
      memo: d.memo,
      settledAt: d.settled_at,
      createdAt: d.created_at,
    })),
  });
}

// POST /api/time/debts - Create or settle Ghost Cash debt
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const throttle = rateLimit(`timer-debts-post:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { action = "create", debtId, debtorId, amountGhostCash, memo, orgId } = body || {};

  if (action === "settle" || action === "forgive") {
    if (!debtId) return fail("debtId is required.", 400);
    const newStatus = action === "settle" ? "settled" : "forgiven";

    const { data: debt, error } = await supabase
      .from("timer_debts")
      .update({
        status: newStatus,
        settled_at: new Date().toISOString(),
        settled_by: u.id,
      })
      .eq("id", debtId)
      .select()
      .single();

    if (error) return dbFail("POST /api/time/debts", error, "Failed to update debt.");
    return ok({ debt });
  }

  // Create manual debt entry
  if (!debtorId || !amountGhostCash || Number(amountGhostCash) <= 0) {
    return fail("debtorId and positive amountGhostCash are required.", 400);
  }

  const { data: debt, error } = await supabase
    .from("timer_debts")
    .insert({
      org_id: orgId || null,
      creditor_id: u.id,
      debtor_id: debtorId,
      amount_ghost_cash: Number(amountGhostCash),
      status: "pending",
      memo: String(memo || "Freelance / marketing services").slice(0, 300),
    })
    .select()
    .single();

  if (error) return dbFail("POST /api/time/debts", error, "Failed to record Ghost Cash debt.");

  return ok({ debt }, 201);
}
