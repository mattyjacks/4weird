import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isSlug, isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { getGameRating, requiredAgeFor } from "@/lib/age-gate";
import {
  canUseContentMode,
  effectiveMinAge,
  hasContentModes,
  parseContentMode,
} from "@/lib/content-modes";
import { getKidSession, hashKidToken } from "@/lib/kid-session";
import {
  GAME_HEARTBEAT_MAX_SECONDS,
  GAME_HEARTBEAT_SECONDS,
  isBundleVersion,
  isNewBytes,
} from "@/lib/game-rent";

export const dynamic = "force-dynamic";

/**
 * Map play-session RPC failures to HTTP status so the play gate can split
 * UX without message-sniffing every shape: 402 short funds → top-up UI,
 * 403 age/band/parental → denied UI (never "metering is down"), anything
 * else → the client treats only 5xx/network/timeout as unmetered fallback.
 */
function playRpcStatus(message: string): number {
  const m = message.toLowerCase();
  if (m.includes("insufficient")) return 402;
  if (
    m.includes("rating blocked") ||
    m.includes("daily time") ||
    m.includes("allowed play hours") ||
    m.includes("monthly budget") ||
    m.includes("suspended") ||
    m.includes("session expired") ||
    m.includes("age band") ||
    m.includes("content mode") ||
    m.includes("content-mode") ||
    m.includes("adults (18+)") ||
    m.includes("teens (13+)") ||
    m.includes("not authorized") ||
    m.includes("child session")
  ) {
    return 403;
  }
  return rpcStatus(message);
}

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
  // NOTE: no BotID gate here on purpose. Signed-in bot/automation traffic
  // (AI playing through a real browser session) is welcome: it meters and
  // pays coins exactly like human play. Anti-cheat stays enforced elsewhere
  // (cheat_mode save invariant, server rate limits, leaderboard aggregates).
  // Anonymous free-play abuse is still gated at /api/games/guest-pass.
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
    // outright - a DOB entry cannot bypass the band. Teens (13+) pass teens
    // titles; kids titles pass for all 13+ bands. Under-13s have no full
    // account and play only via Child sessions (kidSessionPlay below).
    // Backwards compatible default: an omitted content_mode means "all"
    // (today's full adult behavior); the play gate always sends it.
    const contentMode = parseContentMode(input.content_mode ?? input.contentMode ?? input.content) ?? "all";
    try {
      const svc = serviceClient();
      const { data: profile } = await svc.from("profiles").select("age_band").eq("id", data.user.id).maybeSingle();
      const band = String((profile as { age_band?: unknown } | null)?.age_band ?? "unknown");
      if (hasContentModes(game)) {
        // Band-vs-mode gate first: kid bands may only use kid, teen bands
        // kid+teen, guests/unknown kid+teen ("all" needs adult sign-in).
        const viewerBand = band === "kid" || band === "teen" || band === "adult" ? band : "unknown";
        if (!canUseContentMode(viewerBand, null, contentMode)) {
          return fail(
            `Content mode "${contentMode}" is locked for your age band. Kid bands may only use kid mode, Teen bands kid or teen — Uncut needs an Adult (18+) age band.`,
            403,
          );
        }
        // The Adults-games-need-Adult check becomes the EFFECTIVE-age check:
        // kid mode (0+) and teen mode (13+) lower the bar; "all" keeps 18+.
        const minAge = effectiveMinAge(game, contentMode);
        if (minAge >= 18 && band !== "adult") {
          return fail("Adults (18+) games need an Adult (18+) age band. Teens stay on Teen/Kids games.", 403);
        }
        if (minAge >= 13 && band !== "adult" && band !== "teen") {
          return fail("Teens (13+) games need a Teen (13-17) or Adult (18+) age band.", 403);
        }
      } else {
        const minAge = requiredAgeFor(getGameRating(game));
        if (minAge >= 18 && band !== "adult") {
          return fail("Adults (18+) games need an Adult (18+) age band. Teens stay on Teen/Kids games.", 403);
        }
        if (minAge >= 13 && band !== "adult" && band !== "teen") {
          return fail("Teens (13+) games need a Teen (13-17) or Adult (18+) age band.", 403);
        }
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
      if (error) return rpcFail("api/games/session:start", error, playRpcStatus, "Unable to start play session.");
      session = row;
    } catch (error) {
      return dbFail("api/games/session:start", error, "Play metering is down. Try again shortly.");
    }
    if (hasContentModes(game)) {
      return ok({ session, heartbeat_seconds: GAME_HEARTBEAT_SECONDS, content_mode: contentMode });
    }
    return ok({ session, heartbeat_seconds: GAME_HEARTBEAT_SECONDS });
  }

  // Per-beat elapsed ceiling: clients beat every 60s; anything above 5 min
  // is client attestation, not wall-clock. Clamp the ledger to what one beat
  // can honestly cover (prevents 3600s under/over-billing in a single call).
  const HEARTBEAT_BEAT_CAP = Math.min(GAME_HEARTBEAT_MAX_SECONDS, 300);
  // Adult RPCs must never touch kid-attributed rows (kid sessions store
  // user_id = parent): a parent session driving a kid session_id would bill
  // the parent ledger and skip kid guards. Reject with a redirect to Child
  // login instead. Runs on the service client (owner check, no RLS bypass
  // for writes - the RPC below still enforces auth.uid()).
  async function isKidRow(sessionId: string): Promise<boolean> {
    try {
      const svc = serviceClient();
      const { data } = await svc.from("game_sessions").select("kid_id").eq("id", sessionId).maybeSingle();
      return Boolean((data as { kid_id?: string | null } | null)?.kid_id);
    } catch {
      return false;
    }
  }

  if (action === "heartbeat") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    const seconds = Number(input.active_seconds ?? input.seconds ?? GAME_HEARTBEAT_SECONDS);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > HEARTBEAT_BEAT_CAP) {
      return fail(`active_seconds must be 1..${HEARTBEAT_BEAT_CAP}.`, 400);
    }
    if (await isKidRow(String(sid))) return fail("Child sessions heartbeat through Child login.", 403);
    let beat: unknown;
    try {
      const { data: row, error } = await supabase.rpc("heartbeat_game_session", {
        p_session: sid,
        p_seconds: seconds,
      });
      if (error) return rpcFail("api/games/session:heartbeat", error, playRpcStatus, "Unable to record play.");
      beat = row;
    } catch (error) {
      return dbFail("api/games/session:heartbeat", error, "Play metering is down. Try again shortly.");
    }
    return ok({ beat });
  }

  if (action === "end") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    if (await isKidRow(String(sid))) return fail("Child sessions end through Child login.", 403);
    try {
      const { data: ended, error } = await supabase.rpc("end_game_session", { p_session: sid });
      if (error) return rpcFail("api/games/session:end", error, playRpcStatus, "Unable to end play session.");
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
    // Required age comes from the SERVER catalog, never the client. For
    // content-mode games it is the EFFECTIVE age of the requested mode, and
    // the child band-vs-mode gate runs first (kid-band children: kid mode
    // only; teen-band: kid+teen). Omitted content_mode defaults to "all".
    const kidBand: string = session.kid.age_band;
    const kidContentMode = parseContentMode(input.content_mode ?? input.contentMode ?? input.content) ?? "all";
    if (hasContentModes(game) && !canUseContentMode(null, kidBand, kidContentMode)) {
      return fail(
        `Content mode "${kidContentMode}" is locked for this child band. Kid bands may only use kid mode; teen bands kid or teen.`,
        403,
      );
    }
    const minAge = hasContentModes(game) ? effectiveMinAge(game, kidContentMode) : requiredAgeFor(getGameRating(game));
    try {
      const { data: row, error } = await supabase.rpc("start_kid_session", {
        p_kid: session.kid.id,
        p_token_hash: tokenHash,
        p_game: game,
        p_version: version,
        p_new_bytes: bytes,
        p_min_age: minAge,
      });
      if (error) return rpcFail("api/games/session:kid-start", error, playRpcStatus, "Unable to start play session.");
      if (hasContentModes(game)) {
        return ok({ session: row, heartbeat_seconds: GAME_HEARTBEAT_SECONDS, content_mode: kidContentMode });
      }
      return ok({ session: row, heartbeat_seconds: GAME_HEARTBEAT_SECONDS });
    } catch (error) {
      return dbFail("api/games/session:kid-start", error, "Play metering is down. Try again shortly.");
    }
  }

  if (action === "heartbeat") {
    const sid = input.session_id ?? input.sessionId;
    if (!isUuid(sid)) return fail("Invalid session_id.", 400);
    const seconds = Number(input.active_seconds ?? input.seconds ?? GAME_HEARTBEAT_SECONDS);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > Math.min(GAME_HEARTBEAT_MAX_SECONDS, 300)) {
      return fail("active_seconds must be 1..300.", 400);
    }
    try {
      const { data: row, error } = await supabase.rpc("heartbeat_kid_session", {
        p_kid: session.kid.id,
        p_token_hash: tokenHash,
        p_session: sid,
        p_seconds: seconds,
      });
      if (error) return rpcFail("api/games/session:kid-heartbeat", error, playRpcStatus, "Unable to record play.");
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
      if (error) return rpcFail("api/games/session:kid-end", error, playRpcStatus, "Unable to end play session.");
      return ok({ session: ended });
    } catch (error) {
      return dbFail("api/games/session:kid-end", error, "Unable to end play session.");
    }
  }

  return fail("Action must be start, heartbeat, or end.", 400);
}
