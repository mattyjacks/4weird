import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { quoteAvatarMinutes, quoteCameraFrames } from "@/lib/game-ai";

export const dynamic = "force-dynamic";

const FEATURES = ["avatar", "camera"] as const;
type Feature = (typeof FEATURES)[number];

/**
 * POST /api/buddy/presence; meter optional Buddy presence by the minute
 * (3D avatar) or by the frame (camera check-ins).
 * Body: { feature: "avatar"|"camera", qty: minutes|frames, game_slug?, session_id? }.
 *
 * Avatar presence meters kind "buddy-avatar" (8 centicentcoins/min);
 * camera frames meter kind "buddy-camera" (3 centicentcoins/frame).
 * Both kinds land with the DB migration
 * 20260918000000_buddy_presence_kinds.sql. Until it is applied the RPC
 * rejects with "invalid kind"; in exactly that case this route still
 * returns success with the honest quote and pendingMigration: true (never
 * blocks the widget); every other failure surfaces as an error.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`buddy:presence:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429, { "Retry-After": String(rl.retryAfter) });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const feature = String(input.feature ?? "").trim().toLowerCase();
  if (!(FEATURES as readonly string[]).includes(feature)) return fail('Unknown feature. Use "avatar" or "camera".', 400);
  const qty = Number(input.qty ?? 1);
  // Sane per-call caps: avatar heartbeats tick 1 min (a full day = 1440);
  // camera frames ride explicit turns (dozens max). The old 100M ceiling let
  // a buggy loop drain a wallet in one call.
  const maxQty = feature === "avatar" ? 1440 : 60;
  if (!Number.isFinite(qty) || qty <= 0 || qty > maxQty) return fail(`Invalid qty (max ${maxQty} per call).`, 400);
  const game = /^[a-z0-9-]{1,64}$/.test(String(input.game_slug ?? input.game ?? "lobby"))
    ? String(input.game_slug ?? input.game ?? "lobby")
    : "lobby";
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);

  const f = feature as Feature;
  const kind = f === "avatar" ? "buddy-avatar" : "buddy-camera";
  const quote = f === "avatar" ? quoteAvatarMinutes(qty) : quoteCameraFrames(qty);
  try {
    const { data: row, error } = await supabase.rpc("meter_game_ai_usage", {
      p_game: game,
      p_kind: kind,
      p_qty: qty,
      p_session: sessionRaw,
      p_source: f === "avatar" ? "heartbeat" : "manual",
    });
    if (error) {
      const msg = String(error.message ?? "");
      // Migration not applied yet: quote honestly, meter later; don't block.
      if (error.code === "P0001" && msg.includes("invalid kind")) {
        return ok({
          feature: f,
          kind,
          qty,
          metered: null,
          pendingMigration: true,
          quote: {
            grossCoins: quote.grossCoins,
            grossCenticentcoins: quote.grossCenticentcoins,
            cut: quote.cut,
            provider: quote.provider,
            display: quote.display,
          },
          note: "Presence kinds are quoted but not yet metered on this deploy; no coins moved.",
        });
      }
      return rpcFail("api/buddy/presence:meter", error, rpcStatus, "Unable to meter presence.");
    }
    return ok({
      feature: f,
      kind,
      qty,
      metered: row,
      pendingMigration: false,
      quote: {
        grossCoins: quote.grossCoins,
        grossCenticentcoins: quote.grossCenticentcoins,
        cut: quote.cut,
        provider: quote.provider,
        display: quote.display,
      },
    });
  } catch (error) {
    return dbFail("api/buddy/presence:meter", error, "Unable to meter presence.");
  }
}
