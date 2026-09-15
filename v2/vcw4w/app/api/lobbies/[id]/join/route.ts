import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { getGameRating, requiredAgeFor } from "@/lib/age-gate";


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`lobby-join:${u.id}`, 20);
  if (!throttle.allowed) {
    return fail("Too many join attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid lobby.", 400);
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const code = String(body.join_code ?? "").trim().toUpperCase();
  // Server-side age enforcement (mirrors POST /api/matches + POST
  // /api/lobbies): the room inherits the strict catalog rating of its game.
  // The slug lookup runs on the service client (read-only game_slug) so RLS
  // row-hiding for non-participants cannot break public joins or leak the
  // gate; the join_lobby RPC below still enforces visibility + invite code.
  // Fail closed: unknown rooms 404, unreadable bands deny 13+/18+ rooms.
  try {
    const svc = serviceClient();
    const { data: lobby } = await svc
      .from("game_lobbies")
      .select("game_slug")
      .eq("id", id)
      .maybeSingle();
    const lobbyGame = String((lobby as { game_slug?: unknown } | null)?.game_slug ?? "");
    if (!lobbyGame) return fail("Lobby not found.", 404);
    const { data: profile } = await svc.from("profiles").select("age_band").eq("id", u.id).maybeSingle();
    const band = String((profile as { age_band?: unknown } | null)?.age_band ?? "unknown");
    const minAge = requiredAgeFor(getGameRating(lobbyGame));
    if (minAge >= 18 && band !== "adult") {
      return fail("Adults (18+) games need an Adult (18+) age band. Teens stay on Teen/Kids games.", 403);
    }
    if (minAge >= 13 && band !== "adult" && band !== "teen") {
      return fail("Teens (13+) games need a Teen (13-17) or Adult (18+) age band.", 403);
    }
  } catch {
    // fail() returns (never throws), so reaching here means the service
    // client or the band read itself failed: fail closed.
    return fail("Server misconfigured.", 500);
  }
  const { data: rpcData, error } = await supabase.rpc("join_lobby", {
    p_lobby: id,
    p_code: code || null,
  });
  if (error) return fail("Lobby unavailable or invite code is invalid.", 403);
  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<string, unknown> | null;
  return ok({ ...(row ?? {}) });
}
