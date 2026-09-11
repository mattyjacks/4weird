import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { describeFalStep, isRunUuid, isVcwRunKind, parseFalToolCall } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/runs/[id]/actions; append one observe->reason->act
 * step to an open run (authenticated, owner only). The v1 worker's
 * `POST /api/game/action` equivalent, recorded instead of executed:
 * the serverless deploy has no live browser to drive, so the agent
 * logs what it observed and did (locally, via the desktop control
 * plane or autoplay remote) and the trail stays queryable.
 *
 * Body: { kind: observation|action|finding, text, data? }.
 *
 * fal.ai meld: a step can carry a fal call; text containing
 * `[tool: fal.generate; op=<op> prompt="..."]` (or data { fal_op, prompt })
 * with source "vcw". The route validates the op against the 30-op catalog
 * and returns the gross quote + next step (POST /api/fal/generate) so the
 * main loop chains observe → reason → act without leaving the trail.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await ctx.params;
  if (!isRunUuid(id)) return fail("Invalid run id.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:run:actions:${data.user.id}`, 120, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (!isVcwRunKind(input.kind)) {
    return fail("Invalid kind. Use observation, action, or finding.", 400);
  }
  const text = String(input.text ?? "").trim().slice(0, 5000);
  if (!text) return fail("Step text is required (1-5000 chars).", 400);
  const extra = input.data !== undefined ? input.data : {};
  if (typeof extra !== "object" || extra === null || Array.isArray(extra)) {
    return fail("data must be a JSON object when provided.", 400);
  }
  if (JSON.stringify(extra).length > 10000) {
    return fail("data must fit in 10 KB.", 400);
  }

  const { data: run, error: runError } = await supabase
    .from("vcw_runs")
    .select("id,status")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .single();
  if (runError) return fail("Run not found.", 404);
  if (run.status !== "open") return fail("Run is completed; open a new run to continue.", 409);

  const { data: step, error } = await supabase
    .from("vcw_run_steps")
    .insert({ run_id: id, user_id: data.user.id, kind: input.kind, text, data: extra })
    .select("id,kind,text,data,created_at")
    .single();
  if (error) return dbFail("vcw/run actions", error, "Unable to record the step.");

  // Meter action-step (1 coin gross, 25% cut included); the step is rolled
  // back when metering fails so steps are never free.
  const { error: meterError } = await supabase.rpc("meter_vcw_usage", {
    p_op: "action-step",
    p_qty: 1,
    p_run: id,
    p_source: "vcw",
  });
  if (meterError) {
    try {
      await supabase.from("vcw_run_steps").delete().eq("id", step.id).eq("user_id", data.user.id);
    } catch {
      /* rollback best-effort; the meter fault below is the answer */
    }
    const message = String(
      (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
    );
    if (/insufficient|balance|funds/i.test(message)) {
      return fail("Insufficient Vibe Coin balance.", 402);
    }
    return dbFail("vcw/run actions meter", meterError, "Unable to meter the step.");
  }

  // fal.ai meld: detect a loop tool call and hand back the validated next hop.
  // parseFalToolCall gates first so steps without a tag skip catalog
  // validation entirely; describeFalStep then validates + quotes the hop.
  const falCall = parseFalToolCall(text, extra);
  const fal = falCall ? describeFalStep(String(input.kind), text, extra) : { detected: false as const };
  if (fal.detected) return ok({ step, fal }, 201);
  return ok({ step }, 201);
}
