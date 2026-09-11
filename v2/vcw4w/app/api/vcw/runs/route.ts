import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { gameSlugs } from "@/content/games";
import { cleanGameSlug, isVcwVerdict } from "@/lib/vcw-runs";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/runs; list the caller's playtest runs (authenticated).
 * POST /api/vcw/runs; open a run = v1 `POST /api/game/launch` for cloud.
 *
 * Body: { game_slug, goal }. The slug must be a catalog game (same
 * on-site rule as autoplay); the goal is the experience under test
 * (1-500 chars). Returns the open run row.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:runs:list:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  // Pagination + filters (all optional, backward compatible):
  // ?game_slug=<catalog slug> ?status=open|completed ?verdict=pass|fail|inconclusive ?limit=1..100 ?before=<ISO timestamp cursor>
  const url = new URL(req.url);
  const rawSlug = cleanGameSlug(url.searchParams.get("game_slug") ?? url.searchParams.get("gameSlug"));
  const gameFilter = rawSlug && /^[a-z0-9-]{1,64}$/.test(rawSlug) && gameSlugs.includes(rawSlug) ? rawSlug : null;
  if (rawSlug && !gameFilter) return fail("Unknown game_slug. List targets via GET /api/vcw/games.", 400);
  const rawStatus = (url.searchParams.get("status") ?? "").trim().toLowerCase();
  if (rawStatus && rawStatus !== "open" && rawStatus !== "completed") {
    return fail("Invalid status. Use open or completed.", 400);
  }
  const rawVerdict = (url.searchParams.get("verdict") ?? "").trim().toLowerCase();
  if (rawVerdict && !isVcwVerdict(rawVerdict)) {
    return fail("Invalid verdict. Use pass, fail, or inconclusive.", 400);
  }
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
  const beforeRaw = (url.searchParams.get("before") ?? "").trim();
  let before: string | null = null;
  if (beforeRaw) {
    const t = new Date(beforeRaw);
    if (Number.isNaN(t.getTime())) return fail("Invalid before cursor. Use an ISO timestamp.", 400);
    before = t.toISOString();
  }

  let query = supabase
    .from("vcw_runs")
    .select("id,game_slug,goal,status,verdict,summary,created_at,updated_at")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (gameFilter) query = query.eq("game_slug", gameFilter);
  if (rawStatus) query = query.eq("status", rawStatus);
  if (rawVerdict) query = query.eq("verdict", rawVerdict);
  if (before) query = query.lt("created_at", before);
  const { data: runs, error } = await query;
  if (error) return dbFail("vcw/runs list", error, "Unable to load runs.");
  const list = runs ?? [];
  return ok({
    runs: list,
    next_before: list.length === limit ? list[list.length - 1].created_at : null,
  });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
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

  // Meter run-open (10 coins gross, 25% cut included) against the fresh run.
  // The row is rolled back when metering fails so a run is never free and a
  // failed open never keeps coins.
  const { data: charge, error: meterError } = await supabase.rpc("meter_vcw_usage", {
    p_op: "run-open",
    p_qty: 1,
    p_run: run.id,
    p_source: "vcw",
  });
  if (meterError) {
    try {
      await supabase.from("vcw_runs").delete().eq("id", run.id).eq("user_id", data.user.id);
    } catch {
      /* rollback best-effort; the meter fault below is the answer */
    }
    const message = String(
      (meterError as { message?: unknown } | null)?.message ?? meterError ?? "",
    );
    if (/insufficient|balance|funds/i.test(message)) {
      return fail("Insufficient Vibe Coin balance.", 402);
    }
    return dbFail("vcw/runs meter", meterError, "Unable to meter the run.");
  }
  return ok({ run, charge }, 201);
}
