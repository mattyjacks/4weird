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
 * POST /api/ghost/timer — the work clock.
 *   {action:"in", contract_id, note?} → ghost_clock_in (one open timer/org)
 *   {action:"beat", timer_id, active_seconds} → ghost_beat (0..300, one UPDATE)
 *   {action:"out", timer_id} → ghost_clock_out (freezes + earned summary)
 *   {action:"invoice", timer_id} → ghost_invoice_timer (payer owes worker)
 * Clients beat ~60s with visible-tab seconds only; activity % = beats/total.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`ghost-timer:${u.id}`, 120, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "");

  if (action === "in") {
    const contract = isUuid(input.contract_id);
    if (!contract) return fail("contract_id is required.", 400);
    const note = String(input.note ?? "").trim().slice(0, 500);
    const { data: timer, error } = await supabase.rpc("ghost_clock_in", { p_contract: contract, p_note: note });
    if (error) return rpcFail("api/ghost/timer:in", error, rpcStatus, "Unable to clock in.");
    return ok({ timer }, 201);
  }

  if (action === "beat") {
    const timer = isUuid(input.timer_id);
    const seconds = Number(input.active_seconds);
    if (!timer) return fail("timer_id is required.", 400);
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 300) return fail("active_seconds must be 0..300.", 400);
    const { data: beat, error } = await supabase.rpc("ghost_beat", { p_timer: timer, p_active_seconds: seconds });
    if (error) return rpcFail("api/ghost/timer:beat", error, rpcStatus, "Unable to record time.");
    return ok({ beat });
  }

  if (action === "out") {
    const timer = isUuid(input.timer_id);
    if (!timer) return fail("timer_id is required.", 400);
    const { data: summary, error } = await supabase.rpc("ghost_clock_out", { p_timer: timer });
    if (error) return rpcFail("api/ghost/timer:out", error, rpcStatus, "Unable to clock out.");
    return ok({ summary });
  }

  if (action === "invoice") {
    const timer = isUuid(input.timer_id);
    if (!timer) return fail("timer_id is required.", 400);
    const { data: debt, error } = await supabase.rpc("ghost_invoice_timer", { p_timer: timer });
    if (error) return rpcFail("api/ghost/timer:invoice", error, rpcStatus, "Unable to invoice.");
    return ok({ debt }, 201);
  }

  return fail("Action must be in, beat, out, or invoice.", 400);
}
