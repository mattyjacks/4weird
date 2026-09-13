import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isRunUuid } from "@/lib/vcw-runs";


/**
 * GET /api/vcw/runs/[id]; read a run with its observe->reason->act
 * trail and filed bugs (authenticated, owner only). The v1 worker's
 * `GET /api/game/state` + `GET /api/game/logs` equivalent: everything
 * the agent needs to decide the next step.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await ctx.params;
  if (!isRunUuid(id)) return fail("Invalid run id.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:run:get:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  // ?steps_limit=1..200 ?bugs_limit=1..100 (defaults match the old fixed caps).
  const url = new URL(req.url);
  const stepsLimit = Math.min(200, Math.max(1, Number(url.searchParams.get("steps_limit") ?? 200) || 200));
  const bugsLimit = Math.min(100, Math.max(1, Number(url.searchParams.get("bugs_limit") ?? 100) || 100));

  const { data: run, error: runError } = await supabase
    .from("vcw_runs")
    .select("id,game_slug,goal,status,verdict,summary,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .single();
  if (runError) return fail("Run not found.", 404);

  const [{ data: steps, error: stepsError }, { data: bugs, error: bugsError }] = await Promise.all([
    supabase
      .from("vcw_run_steps")
      .select("id,kind,text,data,created_at")
      .eq("run_id", id)
      .order("created_at", { ascending: true })
      .limit(stepsLimit),
    supabase
      .from("vcw_bugs")
      .select("id,title,severity,description,created_at")
      .eq("run_id", id)
      .order("created_at", { ascending: true })
      .limit(bugsLimit),
  ]);
  if (stepsError) return dbFail("vcw/run steps", stepsError, "Unable to load run steps.");
  if (bugsError) return dbFail("vcw/run bugs", bugsError, "Unable to load run bugs.");

  const stepList = steps ?? [];
  const bugList = bugs ?? [];
  const kinds: Record<string, number> = {};
  for (const s of stepList) kinds[s.kind] = (kinds[s.kind] ?? 0) + 1;
  return ok({
    run,
    steps: stepList,
    bugs: bugList,
    counts: { steps: stepList.length, bugs: bugList.length, kinds },
    limits: { steps_limit: stepsLimit, bugs_limit: bugsLimit },
  });
}
