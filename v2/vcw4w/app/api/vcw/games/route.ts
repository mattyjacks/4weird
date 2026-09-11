import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { games } from "@/content/games";
import { getGamePlaybook } from "@/lib/game-playbooks";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/games — playable catalog for agents (authenticated).
 *
 * The v1 worker's `GET /api/games` equivalent: every game the agent may
 * target with a run. Play URLs are first-party only — the same on-site
 * rule the autoplay API enforces.
 */
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`vcw:games:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  return ok({
    count: games.length,
    games: games.map((g) => {
      const playbook = getGamePlaybook(g.slug);
      return {
        slug: g.slug,
        title: g.title,
        genre: g.genre,
        play_url: `/games/${g.slug}/play`,
        runtime_path: g.runtimePath,
        controls: playbook?.controls ?? null,
        goal: playbook?.goal ?? null,
        boot: playbook?.boot ?? [],
        autoplay: playbook?.autoplay ?? [],
      };
    }),
  });
}
