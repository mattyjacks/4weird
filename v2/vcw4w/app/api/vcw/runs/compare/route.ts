import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isRunUuid } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

type CountMap = Record<string, number>;

function countBy<T>(rows: T[], pick: (row: T) => string): CountMap {
  const out: CountMap = {};
  for (const row of rows) {
    const key = pick(row);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/**
 * GET /api/vcw/runs/compare?a=<uuid>&b=<uuid>; side-by-side digest of two
 * of the caller's runs (authenticated, owner only, read-only so unmetered).
 *
 * Agents iterate: run, fix, re-run. The compare answers "did the fix work"
 * in one call - verdicts, step-kind mix, and bug-severity mix for both
 * runs, plus whether they targeted the same game. Full trails stay on
 * GET /api/vcw/runs/[id] (or the uncapped /export below).
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:runs:compare:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const url = new URL(req.url);
  const a = (url.searchParams.get("a") ?? "").trim();
  const b = (url.searchParams.get("b") ?? "").trim();
  if (!isRunUuid(a) || !isRunUuid(b)) return fail("Two run ids are required (?a=<uuid>&b=<uuid>).", 400);
  if (a.toLowerCase() === b.toLowerCase()) return fail("Pass two different run ids.", 400);

  const { data: runs, error: runsError } = await supabase
    .from("vcw_runs")
    .select("id,game_slug,goal,status,verdict,summary,created_at,updated_at")
    .eq("user_id", data.user.id)
    .in("id", [a, b]);
  if (runsError) return dbFail("vcw/runs compare", runsError, "Unable to load runs.");
  const runA = (runs ?? []).find((r) => String(r.id).toLowerCase() === a.toLowerCase()) ?? null;
  const runB = (runs ?? []).find((r) => String(r.id).toLowerCase() === b.toLowerCase()) ?? null;
  if (!runA || !runB) return fail("Run not found.", 404);

  const { data: steps, error: stepsError } = await supabase
    .from("vcw_run_steps")
    .select("run_id,kind")
    .eq("user_id", data.user.id)
    .in("run_id", [runA.id, runB.id])
    .order("created_at", { ascending: true })
    .limit(4000);
  if (stepsError) return dbFail("vcw/runs compare steps", stepsError, "Unable to load steps.");

  const { data: bugs, error: bugsError } = await supabase
    .from("vcw_bugs")
    .select("run_id,severity")
    .eq("user_id", data.user.id)
    .in("run_id", [runA.id, runB.id])
    .limit(500);
  if (bugsError) return dbFail("vcw/runs compare bugs", bugsError, "Unable to load bugs.");

  const digest = (run: { id: string }) => {
    const runSteps = (steps ?? []).filter((s) => s.run_id === run.id);
    const runBugs = (bugs ?? []).filter((g) => g.run_id === run.id);
    return {
      steps: runSteps.length,
      kinds: countBy(runSteps, (s) => s.kind),
      bugs: runBugs.length,
      severities: countBy(runBugs, (g) => g.severity),
    };
  };
  return ok({
    a: { run: runA, ...digest(runA) },
    b: { run: runB, ...digest(runB) },
    same_game: runA.game_slug === runB.game_slug,
  });
}
