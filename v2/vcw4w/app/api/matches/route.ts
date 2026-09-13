import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { clientIp, isSlug } from "@/lib/validate";

export const dynamic = "force-dynamic";

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
  const game = isSlug(input.game_slug);
  const platform = String(input.platform ?? "");
  if (!game || !["phone", "desktop"].includes(platform)) return fail("Invalid match request.", 400);
  const GRAVEGAIN = new Set(["gravegain1d", "gravegain2d", "gravegain3d"]);
  const rpcName = GRAVEGAIN.has(game)
    ? "gravegain_quick_match"
    : game === "platform-wars"
      ? "quick_match"
      : null;
  if (!rpcName) return fail("Invalid match request.", 400);
  const { data: rpcData, error } = await supabase.rpc(rpcName, {
    p_game: game,
    p_platform: platform,
  });
  if (error) return fail("Unable to find a match.", 500);
  const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<string, unknown> | null;
  return ok({ ...(row ?? {}) });
}
