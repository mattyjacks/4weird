import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid lobby.", 400);
  const { data: lobby, error } = await supabase
    .from("game_lobbies")
    .select("id,game_slug,host_id,guest_id,status,visibility,join_code")
    .eq("id", id)
    .maybeSingle();
  if (error || !lobby) return fail("Lobby not found.", 404);
  // Defense in depth over the lobbies_participant_read RLS policy.
  const viewer = lobby as { host_id?: string; guest_id?: string | null };
  if (viewer.host_id !== u.id && viewer.guest_id !== u.id) return fail("Lobby not found.", 404);
  const typed = lobby as {
    status?: string;
    game_slug?: string;
    host_id?: string;
    join_code?: string;
  } & Record<string, unknown>;
  let match_id: string | null = null;
  if (typed.status === "active") {
    const { data: matches } = await supabase
      .from("game_matches")
      .select("id")
      .eq("game_slug", typed.game_slug)
      .or(`phone_id.eq.${u.id},desktop_id.eq.${u.id}`)
      .order("created_at", { ascending: false })
      .limit(1);
    match_id = ((matches as { id?: string }[] | null)?.[0]?.id as string) ?? null;
  }
  return ok({
    lobby: { ...typed, join_code: typed.host_id === u.id ? typed.join_code : undefined },
    match_id,
  });
}
