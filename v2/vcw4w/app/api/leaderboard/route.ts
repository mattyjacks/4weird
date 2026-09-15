import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, isMissingSchemaError, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import { gameSlugs, games } from "@/content/games";


const METRICS = ["kills", "actions", "active_seconds"] as const;

/**
 * Public per-game leaderboard. All aggregation and privacy filtering happen
 * inside the leaderboard_top() RPC: only handles plus summed totals leave
 * the database; no user IDs, no emails, no per-session rows.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const params = new URL(req.url).searchParams;
  const game = (params.get("game") ?? "").toLowerCase();
  const metric = (params.get("metric") ?? "kills").toLowerCase();
  if (!gameSlugs.includes(game)) return fail("Unknown game.", 404);
  if (!(METRICS as readonly string[]).includes(metric)) return fail("Unknown metric.", 400);
  const supabase = await createClient();
  const rl = rateLimit(`leaderboard:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { data, error } = await supabase.rpc("leaderboard_top", { p_game: game, p_metric: metric });
  if (error) {
    // Fail-open on missing RPC/table (migration not yet applied): empty rows,
    // not a 500 that blanks the leaderboard page. Real faults still 500.
    // (DS-PAGEFIX-07, FIX500 precedent)
    const msg = String((error as { message?: unknown }).message ?? "");
    if (isMissingSchemaError(error) || /could not find the function/i.test(msg)) {
      console.error("[api] api/leaderboard leaderboard_top missing, returning empty rows", {
        code: String((error as { code?: unknown }).code ?? "").slice(0, 16),
      });
      const meta = games.find((g) => g.slug === game);
      return ok({ game, title: meta?.title ?? game, metric, rows: [], unavailable: true });
    }
    return dbFail("api/leaderboard", error, "Unable to load leaderboard.");
  }
  const rows = ((data as { player: string; value: number }[] | null) ?? []).map((r, i) => ({
    rank: i + 1,
    player: r.player || "Player",
    value: Number(r.value) || 0,
  }));
  const meta = games.find((g) => g.slug === game);
  return ok({ game, title: meta?.title ?? game, metric, rows });
}
