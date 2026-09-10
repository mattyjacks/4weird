import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { gameSlugs, games } from "@/content/games";

export const dynamic = "force-dynamic";

const METRICS = ["kills", "actions", "active_seconds"] as const;

/**
 * Public per-game leaderboard. All aggregation and privacy filtering happen
 * inside the leaderboard_top() RPC: only handles plus summed totals leave
 * the database — no user IDs, no emails, no per-session rows.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const params = new URL(req.url).searchParams;
  const game = (params.get("game") ?? "").toLowerCase();
  const metric = (params.get("metric") ?? "kills").toLowerCase();
  if (!gameSlugs.includes(game)) return fail("Unknown game.", 404);
  if (!(METRICS as readonly string[]).includes(metric)) return fail("Unknown metric.", 400);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("leaderboard_top", { p_game: game, p_metric: metric });
  if (error) return fail("internal error", 500);
  const rows = ((data as { player: string; value: number }[] | null) ?? []).map((r, i) => ({
    rank: i + 1,
    player: r.player || "Player",
    value: Number(r.value) || 0,
  }));
  const meta = games.find((g) => g.slug === game);
  return ok({ game, title: meta?.title ?? game, metric, rows });
}
