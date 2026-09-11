import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { buildRunHandoff, isRunUuid } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * POST /api/vcw/handoff; portable AI handoff brief for a run
 * (authenticated, owner only). The v1 worker's
 * `POST /api/opencode/handoff` equivalent without local files: the
 * markdown is returned in the response so any vibecoding tool can
 * consume it directly.
 *
 * Body: { run_id?, reason? }. Without run_id, the latest run is used.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:handoff:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const reason = String(input.reason ?? "api handoff request").trim().slice(0, 200) || "api handoff request";

  let runId = String(input.run_id ?? input.runId ?? "");
  if (runId) {
    if (!isRunUuid(runId)) return fail("Invalid run_id.", 400);
  } else {
    const { data: latest, error: latestError } = await supabase
      .from("vcw_runs")
      .select("id")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (latestError) return fail("No runs yet. Open one via POST /api/vcw/runs.", 404);
    runId = latest.id;
  }

  const { data: run, error: runError } = await supabase
    .from("vcw_runs")
    .select("id,game_slug,goal,status,verdict,summary")
    .eq("id", runId)
    .eq("user_id", data.user.id)
    .single();
  if (runError) return fail("Run not found.", 404);

  const [{ data: steps, error: stepsError }, { data: bugs, error: bugsError }] = await Promise.all([
    supabase
      .from("vcw_run_steps")
      .select("kind,text,created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("vcw_bugs")
      .select("title,severity,game_slug,description")
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);
  if (stepsError) return dbFail("vcw/handoff steps", stepsError, "Unable to build the handoff.");
  if (bugsError) return dbFail("vcw/handoff bugs", bugsError, "Unable to build the handoff.");

  // Meter handoff (5 coins gross, 25% cut included) before building the
  // brief; the markdown is only assembled for a paid handoff.
  const { error: meterError } = await supabase.rpc("meter_vcw_usage", {
    p_op: "handoff",
    p_qty: 1,
    p_run: runId,
    p_source: "vcw",
  });
  if (meterError) {
    const message = String(
      (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
    );
    if (/insufficient|balance|funds/i.test(message)) {
      return fail("Insufficient Vibe Coin balance.", 402);
    }
    return dbFail("vcw/handoff meter", meterError, "Unable to meter the handoff.");
  }

  const markdown = buildRunHandoff({
    gameSlug: run.game_slug,
    goal: run.goal,
    status: run.status,
    verdict: run.verdict,
    summary: run.summary,
    steps: (steps ?? []).map((s) => ({ kind: s.kind, text: s.text, created_at: s.created_at })),
    bugs: (bugs ?? []).map((b) => ({
      title: b.title,
      severity: b.severity,
      game_slug: b.game_slug,
      description: b.description,
    })),
    reason,
  });
  return ok({ run_id: runId, markdown });
}
