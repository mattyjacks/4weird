import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isRunUuid } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/runs/[id]; read a run with its observe->reason->act
 * trail and filed bugs (authenticated, owner only). The v1 worker's
 * `GET /api/game/state` + `GET /api/game/logs` equivalent: everything
 * the agent needs to decide the next step.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await ctx.params;
  if (!isRunUuid(id)) return fail("Invalid run id.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:run:get:${data.user.id}`, 60, 60_000);
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
      .limit(200),
    supabase
      .from("vcw_bugs")
      .select("id,title,severity,description,created_at")
      .eq("run_id", id)
      .order("created_at", { ascending: true })
      .limit(100),
  ]);
  if (stepsError) return dbFail("vcw/run steps", stepsError, "Unable to load run steps.");
  if (bugsError) return dbFail("vcw/run bugs", bugsError, "Unable to load run bugs.");

  return ok({ run, steps: steps ?? [], bugs: bugs ?? [] });
}
