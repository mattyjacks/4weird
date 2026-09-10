import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { featuresForGame, gameRequiresAi, GAME_AI_CUT_NOTE } from "@/lib/game-ai";

export const dynamic = "force-dynamic";

/**
 * GET /api/game-ai/features?game=<slug> — which AI features a game requires
 * or optionally offers (dialogue bot, AI director, TTS, RunPod GPU).
 * Merges the static registry (lib/game-ai.ts) with operator rows in
 * public.game_ai_features so the play shell renders without auth.
 */
export async function GET(req: Request) {
  const game = new URL(req.url).searchParams.get("game")?.toLowerCase() ?? "";
  if (!/^[a-z0-9-]{1,64}$/.test(game)) return fail("Invalid game.", 400);
  const statik = featuresForGame(game);
  if (!hasServerSupabase()) {
    return ok({ game, requiresAi: gameRequiresAi(game), features: statik, note: GAME_AI_CUT_NOTE });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_ai_features")
    .select("game_slug,kind,mode,provider,label,blurb")
    .eq("game_slug", game)
    .eq("enabled", true);
  const rows = (data ?? []) as { game_slug: string; kind: string; mode: string; provider: string; label: string; blurb: string }[];
  const merged = rows.length
    ? rows.map((r) => ({
        gameSlug: r.game_slug,
        kind: r.kind,
        mode: r.mode,
        provider: r.provider,
        label: r.label || r.kind,
        blurb: r.blurb || "",
      }))
    : statik;
  return ok({
    game,
    requiresAi: merged.some((f) => (f as { mode: string }).mode === "required"),
    features: merged,
    note: GAME_AI_CUT_NOTE,
  });
}
