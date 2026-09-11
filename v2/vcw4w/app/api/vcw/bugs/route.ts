import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { gameSlugs } from "@/content/games";
import { cleanGameSlug, isRunUuid, isVcwSeverity } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/bugs; list the caller's bug reports (authenticated).
 * POST /api/vcw/bugs; file one = v1 `POST /api/bugs` for cloud.
 *
 * Body: { title, description, severity?, game_slug?, run_id? }.
 * game_slug defaults to the run's game when run_id is given.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:bugs:list:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const { data: bugs, error } = await supabase
    .from("vcw_bugs")
    .select("id,run_id,game_slug,title,severity,description,created_at")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return dbFail("vcw/bugs list", error, "Unable to load bugs.");
  return ok({ bugs: bugs ?? [] });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:bugs:create:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const title = String(input.title ?? "").trim().slice(0, 200);
  const description = String(input.description ?? "").trim().slice(0, 10000);
  if (!title) return fail("A title is required (1-200 chars).", 400);
  if (!description) return fail("A description is required.", 400);
  const severity = input.severity === undefined ? "medium" : input.severity;
  if (!isVcwSeverity(severity)) {
    return fail("Invalid severity. Use low, medium, high, or critical.", 400);
  }

  let runId: string | null = null;
  let slug = cleanGameSlug(input.game_slug ?? input.gameSlug);
  if (input.run_id !== undefined && input.run_id !== null && String(input.run_id) !== "") {
    if (!isRunUuid(input.run_id)) return fail("Invalid run_id.", 400);
    const { data: run, error: runError } = await supabase
      .from("vcw_runs")
      .select("id,game_slug")
      .eq("id", String(input.run_id))
      .eq("user_id", data.user.id)
      .single();
    if (runError) return fail("Run not found.", 404);
    runId = run.id;
    if (!slug) slug = run.game_slug;
  }
  if (!/^[a-z0-9-]{1,64}$/.test(slug) || !gameSlugs.includes(slug)) {
    return fail("Unknown game_slug. List targets via GET /api/vcw/games.", 400);
  }

  const { data: bug, error } = await supabase
    .from("vcw_bugs")
    .insert({
      user_id: data.user.id,
      run_id: runId,
      game_slug: slug,
      title,
      description,
      severity,
    })
    .select("id,run_id,game_slug,title,severity,description,created_at")
    .single();
  if (error) return dbFail("vcw/bugs create", error, "Unable to file the bug.");
  return ok({ bug }, 201);
}
