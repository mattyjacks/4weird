import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { cleanBatchSteps, describeFalStep, isRunUuid } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/runs/[id]/actions/batch; append 1-20 observe→reason→act
 * steps to an open run in one call (authenticated, owner only).
 *
 * The agent main loop usually produces a whole observe→reason→act triplet
 * per iteration; recording it step-by-step costs three metered round trips.
 * The batch validates every item exactly like the single-append route
 * (kind, 1-5000 chars, ≤10 KB JSON data), inserts the lot, then meters
 * each step (action-step, 1 coin gross, 25% cut included). A meter failure
 * rolls the whole batch back so steps are never free and partial batches
 * never linger. Per-step fal hints ride along in `fal[]` (null entries
 * carry no tag), so the loop chains media without leaving the trail.
 *
 * Body: { steps: [{ kind: observation|action|finding, text, data? }] }.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await ctx.params;
  if (!isRunUuid(id)) return fail("Invalid run id.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:run:actions:batch:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const cleaned = cleanBatchSteps((body as Record<string, unknown> | null)?.steps);
  if (!cleaned.ok) return fail(cleaned.error, 400);
  const items = cleaned.items;

  const { data: run, error: runError } = await supabase
    .from("vcw_runs")
    .select("id,status")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .single();
  if (runError) return fail("Run not found.", 404);
  if (run.status !== "open") return fail("Run is completed; open a new run to continue.", 409);

  const { data: steps, error } = await supabase
    .from("vcw_run_steps")
    .insert(items.map((item) => ({ run_id: id, user_id: data.user.id, kind: item.kind, text: item.text, data: item.data })))
    .select("id,kind,text,data,created_at");
  if (error || !steps || steps.length !== items.length) {
    return dbFail("vcw/run actions batch", error, "Unable to record the batch.");
  }

  // Meter every step; a single failed debit rolls the whole batch back so
  // batches are all-or-nothing (never partial, never free).
  for (let i = 0; i < steps.length; i++) {
    const { error: meterError } = await supabase.rpc("meter_vcw_usage", {
      p_op: "action-step",
      p_qty: 1,
      p_run: id,
      p_source: "vcw",
    });
    if (meterError) {
      try {
        await supabase.from("vcw_run_steps").delete().eq("run_id", id).eq("user_id", data.user.id).in(
          "id",
          steps.map((s) => s.id),
        );
      } catch {
        /* rollback best-effort; the meter fault below is the answer */
      }
      const message = String(
        (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
      );
      if (/insufficient|balance|funds/i.test(message)) {
        return fail("Insufficient Vibe Coin balance.", 402);
      }
      return dbFail("vcw/run actions batch meter", meterError, "Unable to meter the batch.");
    }
  }

  const fal = steps.map((s) => {
    const hint = describeFalStep(s.kind, s.text, s.data);
    return hint.detected ? hint : null;
  });
  return ok({ steps, metered: steps.length, fal }, 201);
}
