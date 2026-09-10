import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isSlug, isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import {
  GAME_HEARTBEAT_MAX_SECONDS,
  GAME_HEARTBEAT_SECONDS,
  isBundleVersion,
  isNewBytes,
} from "@/lib/game-rent";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/session — signed-in play metering ("renting games").
 * Actions:
 *   - start {game_slug, new_bytes?, bundle_version?} → start_game_session:
 *     charges the load fee (default 1 coin, includes the first hour) unless
 *     the load moved < 1 MiB of new bytes (cached: free) or the same bundle
 *     version was billed in the last 24h (refresh protection).
 *   - heartbeat {session_id, active_seconds?} → heartbeat_game_session:
 *     bills extra hours beyond the included first hour (default 1 coin/hr).
 *     Clients beat every 5 min with visible-tab seconds only.
 *   - end {session_id} → end_game_session.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`game-session:${data.user.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "start");

  if (action === "start") {
    const game = isSlug(input.game_slug ?? input.game);
    if (!game) return fail("Invalid game_slug.", 400);
    const version = isBundleVersion(input.bundle_version ?? input.version ?? "1") || "1";
    const bytes = isNewBytes(input.new_bytes ?? input.bytes ?? 0);
    if (bytes < 0) return fail("Invalid new_bytes.", 400);
    let session: unknown;
    try {
      const { data: row, error } = await supabase.rpc("start_game_session", {
        p_game: game,
        p_version: version,
        p_new_bytes: bytes,
      });
      if (error) return rpcFail("api/games/session:start", error, rpcStatus, "Unable to start play session.");
      session = row;
    } catch (error) {
      return dbFail("api/games/session:start", error, "Play metering is down. Try again shortly.");
    }
    return ok({ session, heartbeat_seconds: GAME_HEARTBEAT_SECONDS });
  }

  if (action === "heartbeat") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    const seconds = Number(input.active_seconds ?? input.seconds ?? GAME_HEARTBEAT_SECONDS);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > GAME_HEARTBEAT_MAX_SECONDS) {
      return fail(`active_seconds must be 1..${GAME_HEARTBEAT_MAX_SECONDS}.`, 400);
    }
    let beat: unknown;
    try {
      const { data: row, error } = await supabase.rpc("heartbeat_game_session", {
        p_session: sid,
        p_seconds: seconds,
      });
      if (error) return rpcFail("api/games/session:heartbeat", error, rpcStatus, "Unable to record play.");
      beat = row;
    } catch (error) {
      return dbFail("api/games/session:heartbeat", error, "Play metering is down. Try again shortly.");
    }
    return ok({ beat });
  }

  if (action === "end") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    try {
      const { data: ended, error } = await supabase.rpc("end_game_session", { p_session: sid });
      if (error) return rpcFail("api/games/session:end", error, rpcStatus, "Unable to end play session.");
      return ok({ session: ended });
    } catch (error) {
      return dbFail("api/games/session:end", error, "Unable to end play session.");
    }
  }

  return fail("Action must be start, heartbeat, or end.", 400);
}
