import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "");
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

/**
 * POST /api/ghost/debts — Ghost Cash IOUs (hypothetical, never money).
 *   {action:"mark", org_id, debtor_id, creditor_id, amount_ghost, reason}
 *   {action:"settle", debt_id, status: settled|void}
 * Anyone in the org may record; only the two parties (or finance power:
 * org.wallet.spend — Banker/Lord/owner) may settle or void.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`ghost-debt:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "mark");

  if (action === "mark") {
    const org = isUuid(input.org_id);
    const debtor = isUuid(input.debtor_id);
    const creditor = isUuid(input.creditor_id);
    const amount = Number(input.amount_ghost);
    const reason = String(input.reason ?? "").trim().slice(0, 240);
    if (!org || !debtor || !creditor) return fail("org_id, debtor_id, and creditor_id are required.", 400);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return fail("Invalid Ghost amount.", 400);
    if (reason.length < 2) return fail("Say what the debt is for (2+ characters).", 400);
    const { data: debt, error } = await supabase.rpc("ghost_mark_debt", {
      p_org: org,
      p_debtor: debtor,
      p_creditor: creditor,
      p_amount: Math.round(amount * 100) / 100,
      p_reason: reason,
    });
    if (error) return rpcFail("api/ghost/debts:mark", error, rpcStatus, "Unable to record debt.");
    return ok({ debt }, 201);
  }

  if (action === "settle") {
    const debt = isUuid(input.debt_id);
    const status = String(input.status ?? "");
    if (!debt) return fail("debt_id is required.", 400);
    if (status !== "settled" && status !== "void") return fail("status must be settled or void.", 400);
    const { data: row, error } = await supabase.rpc("ghost_settle_debt", { p_debt: debt, p_status: status });
    if (error) return rpcFail("api/ghost/debts:settle", error, rpcStatus, "Unable to update debt.");
    return ok({ debt: row });
  }

  return fail("Action must be mark or settle.", 400);
}
