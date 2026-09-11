import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isRunUuid } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/runs/[id]/export; full-fidelity portable run archive
 * (authenticated, owner only, read-only so unmetered).
 *
 * GET /api/vcw/runs/[id] caps the trail (200 steps / 100 bugs) for fast
 * iteration; the handoff caps it further (50 + 50) for pasting into a
 * coding tool. The export removes the caps (up to 2000 steps / 500 bugs)
 * for archival, offline analysis, and migration between tools: one JSON
 * document with the run, every step in order, and every filed bug.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await ctx.params;
  if (!isRunUuid(id)) return fail("Invalid run id.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:run:export:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

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
      .limit(2000),
    supabase
      .from("vcw_bugs")
      .select("id,title,severity,description,created_at")
      .eq("run_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);
  if (stepsError) return dbFail("vcw/run export steps", stepsError, "Unable to load run steps.");
  if (bugsError) return dbFail("vcw/run export bugs", bugsError, "Unable to load run bugs.");

  return ok({
    format: "vcw-run-export/1",
    exported_at: new Date().toISOString(),
    run,
    steps: steps ?? [],
    bugs: bugs ?? [],
  });
}
