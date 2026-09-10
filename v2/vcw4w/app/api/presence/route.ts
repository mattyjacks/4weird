import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isSlug } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const game = isSlug((body as Record<string, unknown> | null)?.game_slug);
  if (!game) return fail("Invalid game.", 400);
  const role = (u.app_metadata as Record<string, unknown> | null)?.role;
  const kind = role === "vibecodeworker" ? "vibecodeworker" : "human";
  const { error } = await supabase.from("game_presence").upsert(
    { user_id: u.id, game_slug: game, actor_kind: kind, last_seen_at: new Date().toISOString() },
    { onConflict: "user_id,game_slug" },
  );
  if (error) return fail("Unable to record presence.", 500);
  return ok({ actor_kind: kind });
}
