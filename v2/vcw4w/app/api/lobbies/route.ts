import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isSlug } from "@/lib/validate";
import { getGameRating, requiredAgeFor } from "@/lib/age-gate";


export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const q = new URL(req.url).searchParams;
  const raw = q.get("game");
  const game = raw ? isSlug(raw) : "";
  if (raw && !game) return fail("Invalid game.", 400);
  const { data: rows, error } =
    q.get("all") === "1"
      ? await supabase.rpc("list_all_open_lobbies", { p_game: game || null })
      : await supabase.rpc("list_joinable_lobbies", { p_game: game });
  if (error) return fail("Unable to load lobbies.", 500);
  return ok({ lobbies: rows ?? [] });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`lobby-create:${u.id}`, 10);
  if (!throttle.allowed) {
    return fail("Too many lobbies. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const game = isSlug(input.game_slug);
  const platform = String(input.platform ?? "");
  const visibility = String(input.visibility ?? "");
  const title = String(input.title ?? "").trim();
  if (
    !game ||
    !["phone", "desktop"].includes(platform) ||
    !["public", "friends", "private"].includes(visibility) ||
    title.length > 48
  ) {
    return fail("Invalid lobby.", 400);
  }
  // Server-side age enforcement (mirrors POST /api/matches): lobby rooms
  // inherit the strict catalog rating of their game — Adults (18+) titles
  // need an Adult band, Teens (13+) need Teen or Adult. Lobby create/join
  // has no content-mode picker, so the strict rating always applies. Fail
  // closed: an unreadable band denies 13+/18+ rooms (never the kids default).
  try {
    const svc = serviceClient();
    const { data: profile } = await svc.from("profiles").select("age_band").eq("id", u.id).maybeSingle();
    const band = String((profile as { age_band?: unknown } | null)?.age_band ?? "unknown");
    const minAge = requiredAgeFor(getGameRating(game));
    if (minAge >= 18 && band !== "adult") {
      return fail("Adults (18+) games need an Adult (18+) age band. Teens stay on Teen/Kids games.", 403);
    }
    if (minAge >= 13 && band !== "adult" && band !== "teen") {
      return fail("Teens (13+) games need a Teen (13-17) or Adult (18+) age band.", 403);
    }
  } catch {
    return fail("Server misconfigured.", 500);
  }
  const { data: rpcData, error } = await supabase.rpc("create_lobby", {
    p_game: game,
    p_platform: platform,
    p_visibility: visibility,
    p_title: title || `${game} lobby`,
  });
  if (error) return fail("Unable to create lobby.", 500);
  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<string, unknown> | null;
  return ok({ ...(row ?? {}) });
}
