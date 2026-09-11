import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { gameSlugs } from "@/content/games";
import { cleanGameSlug } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/runs; list the caller's playtest runs (authenticated).
 * POST /api/vcw/runs; open a run = v1 `POST /api/game/launch` for cloud.
 *
 * Body: { game_slug, goal }. The slug must be a catalog game (same
 * on-site rule as autoplay); the goal is the experience under test
 * (1-500 chars). Returns the open run row.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:runs:list:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const { data: runs, error } = await supabase
    .from("vcw_runs")
    .select("id,game_slug,goal,status,verdict,summary,created_at,updated_at")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return dbFail("vcw/runs list", error, "Unable to load runs.");
  return ok({ runs: runs ?? [] });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:runs:create:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const slug = cleanGameSlug(input.game_slug ?? input.gameSlug);
  const goal = String(input.goal ?? "").trim().slice(0, 500);
  if (!/^[a-z0-9-]{1,64}$/.test(slug) || !gameSlugs.includes(slug)) {
    return fail("Unknown game_slug. List targets via GET /api/vcw/games.", 400);
  }
  if (!goal) return fail("A goal is required (1-500 chars).", 400);

  const { data: run, error } = await supabase
    .from("vcw_runs")
    .insert({ user_id: data.user.id, game_slug: slug, goal })
    .select("id,game_slug,goal,status,verdict,summary,created_at,updated_at")
    .single();
  if (error) return dbFail("vcw/runs create", error, "Unable to open a run.");
  return ok({ run }, 201);
}
