import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { clientIp, isGameSlug } from "@/lib/validate";
import { getGameRating, requiredAgeFor } from "@/lib/age-gate";


export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const throttle = rateLimit(`match:${clientIp(req)}`, 30);
  if (!throttle.allowed) {
    return fail("Please wait before matchmaking again.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  // Per-account throttle survives IP rotation; the pre-auth IP throttle above stays.
  const userThrottle = rateLimit(`match-user:${u.id}`, 10);
  if (!userThrottle.allowed) {
    return fail("Please wait before matchmaking again.", 429, {
      "Retry-After": String(userThrottle.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const requestedGame = typeof input.game_slug === "string" ? input.game_slug : "";
  // Canonical GraveGain slugs carry a capitalized dimension suffix
  // (gravegain1dA/2dA/2dB/3dA) — validate with the game-slug check.
  const game = isGameSlug(requestedGame);
  const platform = String(input.platform ?? "");
  if (!game || !["phone", "desktop"].includes(platform)) return fail("Invalid match request.", 400);
  const GRAVEGAIN = new Set(["gravegain1dA", "gravegain2dA", "gravegain2dB", "gravegain3dA"]);
  const rpcName = GRAVEGAIN.has(game)
    ? "gravegain_quick_match"
    : game === "platform-wars"
      ? "quick_match"
      : null;
  if (!rpcName) return fail("Invalid match request.", 400);
  // Server-side age enforcement. Matchmaking has no content-mode picker, so
  // the strict catalog rating always applies: Adults (18+) titles
  // (gravegain2d/3d) need an Adult band; Teens (13+) need Teen or Adult.
  // Child sessions never reach here (no Supabase user -> 401 above), and
  // under-13s have no full account. Without this, a teen-band account could
  // quick-match straight into an 18+ title, bypassing the session-route gate.
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
  } catch (error) {
    // Structured 500 (never bare): age-band read failed. Logged server-side
    // with the cause so Vercel logs name it. (DS-PAGEFIX-07)
    console.error("[api] api/matches age-band read failed", {
      message: String((error as { message?: unknown } | null)?.message ?? error ?? "unknown").slice(0, 200),
    });
    return fail("Server misconfigured.", 500);
  }
  const { data: rpcData, error } = await supabase.rpc(rpcName, {
    p_game: game,
    p_platform: platform,
  });
  if (error) return dbFail("api/matches", error, "Unable to find a match.");
  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<string, unknown> | null;
  return ok({ ...(row ?? {}) });
}
