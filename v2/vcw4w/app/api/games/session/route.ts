import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { isSlug, isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { getGameRating, requiredAgeFor } from "@/lib/age-gate";
import { getKidSession, hashKidToken } from "@/lib/kid-session";
import {
  GAME_HEARTBEAT_MAX_SECONDS,
  GAME_HEARTBEAT_SECONDS,
  isBundleVersion,
  isNewBytes,
} from "@/lib/game-rent";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/session; signed-in play metering ("renting games").
 * Per-second ledger, quoted in "per hour" terms. Actions:
 *   - start {game_slug, new_bytes?, bundle_version?} → start_game_session:
 *     charges the proportional load fee (load rate for 1 MiB of fresh
 *     bytes, exact to the centicentcoin, min 1 centicentcoin on a priced
 *     game) unless the load moved 0 bytes or the same bundle version was
 *     billed in the last 24h (refresh protection).
 *   - heartbeat {session_id, active_seconds?} → heartbeat_game_session:
 *     bills running play per second from the first second
 *     (owed = hourly_rate * total_seconds / 3600, 1 coin/hr = 100
 *     centicentcoins / 3600 s). Clients beat regularly with visible-tab
 *     seconds only; only the delta since the last beat is debited.
 *   - end {session_id} → end_game_session.
 */
export async function POST(req: NextRequest) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/games/session");
  if (botBlock) return botBlock;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    // Child session branch: no Supabase user, but a live `kid_session`
    // cookie. Spend comes from the child's parent-funded wallet; rating
    // band, hours window, daily minutes, and monthly cap are enforced
    // inside the RPCs (single round trip, server-authoritative).
    return kidSessionPlay(req, supabase);
  }
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
    // Server-side age enforcement for full accounts (client PlayGate also
    // gates, but the server is authoritative): Adults (18+) titles require a
    // self-declared adult band. Teen/unknown/legacy-kid bands are blocked
    // outright — a DOB entry cannot bypass the band. Teens (13+) pass teens
    // titles; kids titles pass for all 13+ bands. Under-13s have no full
    // account and play only via Child sessions (kidSessionPlay below).
    try {
      const svc = serviceClient();
      const { data: profile } = await svc.from("profiles").select("age_band").eq("id", data.user.id).maybeSingle();
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

async function kidSessionPlay(req: NextRequest, supabase: Awaited<ReturnType<typeof createClient>>) {
  const rawToken = req.cookies.get("kid_session")?.value ?? "";
  if (!/^[0-9a-f]{64}$/.test(rawToken)) return fail("Authentication required.", 401);
  let service;
  try {
    service = serviceClient();
  } catch {
    return fail("Server misconfigured.", 500);
  }
  const session = await getKidSession(service, rawToken);
  if (!session) return fail("Child session expired. Log in again.", 401);
  const rl = rateLimit(`game-session:kid:${session.kid.id}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const action = String(input.action ?? "start");
  const tokenHash = hashKidToken(rawToken);

  if (action === "start") {
    const game = isSlug(input.game_slug ?? input.game);
    if (!game) return fail("Invalid game_slug.", 400);
    const version = isBundleVersion(input.bundle_version ?? input.version ?? "1") || "1";
    const bytes = isNewBytes(input.new_bytes ?? input.bytes ?? 0);
    if (bytes < 0) return fail("Invalid new_bytes.", 400);
    // Required age comes from the SERVER catalog, never the client.
    const minAge = requiredAgeFor(getGameRating(game));
    try {
      const { data: row, error } = await supabase.rpc("start_kid_session", {
        p_kid: session.kid.id,
        p_token_hash: tokenHash,
        p_game: game,
        p_version: version,
        p_new_bytes: bytes,
        p_min_age: minAge,
      });
      if (error) return rpcFail("api/games/session:kid-start", error, rpcStatus, "Unable to start play session.");
      return ok({ session: row, heartbeat_seconds: GAME_HEARTBEAT_SECONDS });
    } catch (error) {
      return dbFail("api/games/session:kid-start", error, "Play metering is down. Try again shortly.");
    }
  }

  if (action === "heartbeat") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    const seconds = Number(input.active_seconds ?? input.seconds ?? GAME_HEARTBEAT_SECONDS);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > GAME_HEARTBEAT_MAX_SECONDS) {
      return fail(`active_seconds must be 1..${GAME_HEARTBEAT_MAX_SECONDS}.`, 400);
    }
    try {
      const { data: row, error } = await supabase.rpc("heartbeat_kid_session", {
        p_kid: session.kid.id,
        p_token_hash: tokenHash,
        p_session: sid,
        p_seconds: seconds,
      });
      if (error) return rpcFail("api/games/session:kid-heartbeat", error, rpcStatus, "Unable to record play.");
      return ok({ beat: row });
    } catch (error) {
      return dbFail("api/games/session:kid-heartbeat", error, "Play metering is down. Try again shortly.");
    }
  }

  if (action === "end") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    try {
      const { data: ended, error } = await supabase.rpc("end_kid_session", {
        p_kid: session.kid.id,
        p_token_hash: tokenHash,
        p_session: sid,
      });
      if (error) return rpcFail("api/games/session:kid-end", error, rpcStatus, "Unable to end play session.");
      return ok({ session: ended });
    } catch (error) {
      return dbFail("api/games/session:kid-end", error, "Unable to end play session.");
    }
  }

  return fail("Action must be start, heartbeat, or end.", 400);
}
