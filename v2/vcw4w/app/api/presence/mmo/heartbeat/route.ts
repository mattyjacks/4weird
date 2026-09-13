import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { clientIp, isUuid } from "@/lib/validate";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  MMO_DEAD_AFTER_MS,
  MMO_HEARTBEAT_INTERVAL_MS,
  MMO_MAX_PLAYERS_PER_HEARTBEAT,
  MmoPlayerFrame,
  buildPresenceMinutesRow,
  checkPositions,
  cleanTickSeq,
  isTokenShape,
  realtimeHintsFor,
  sanitizeFrames,
  tickGate,
} from "@/lib/mmo-presence";

/**
 * MMO heartbeat intake (DS-MMO-09). Slow-cadence REST ticks (~1 per 5 s per
 * server); the 10-20 Hz ephemeral frames travel over Supabase Realtime
 * Broadcast per room (see `lib/mmo-presence.ts`) and never hit this route.
 *
 * Auth: heartbeat bearer token (`Authorization: Bearer <token>`, issued
 * once by the register route, stored as sha256). No cookies, no
 * same-origin check — dedicated hosts call server-to-server.
 *
 * Guarantees:
 * - Monotonic `tick_seq` per server (regressed ticks -> 409, repeats acked
 *   as duplicates WITHOUT re-billing).
 * - Server-side position sanity (bounds + speed/teleport gate -> 422).
 * - Every accepted fresh tick emits one `presence_minutes` usage row for
 *   economy billing (minutes + player count, NO coin columns — the
 *   economy lane aggregates these into paired ledger entries). Billing
 *   inserts are best-effort: a missing table degrades to `billed: false`,
 *   the heartbeat itself still succeeds.
 * - Rate limits per server + per IP (process-local layer 1; a shared
 *   Postgres backstop is a QUEUED promotion, not this slice).
 *
 * Expected `presence_minutes` contract (infra/economy to land or confirm
 * against `mmo_meter`): server_id uuid, tick_seq bigint, minutes numeric,
 * player_count int, recorded_at timestamptz.
 */

const PER_SERVER_LIMIT = 40;
const PER_IP_LIMIT = 240;

/**
 * Layer-1 prior-frame memory for the teleport gate (process-local,
 * best-effort on serverless — same pattern as `lib/rate-limit.ts`:
 * fast reject here, authoritative monotonic truth in Postgres).
 */
const priorFrames = new Map<string, Map<string, MmoPlayerFrame>>();
const MAX_PRIOR_SERVERS = 500;

function priorsFor(serverId: string): Map<string, MmoPlayerFrame> {
  let priors = priorFrames.get(serverId);
  if (!priors) {
    priors = new Map<string, MmoPlayerFrame>();
    priorFrames.set(serverId, priors);
    while (priorFrames.size > MAX_PRIOR_SERVERS) {
      const oldest = priorFrames.keys().next();
      if (oldest.done) break;
      priorFrames.delete(oldest.value);
    }
  }
  return priors;
}

/** Timing-safe bearer check: hash the presented token, compare to stored hash. */
function tokenMatches(presented: string, storedHash: unknown): boolean {
  if (!isTokenShape(presented) || typeof storedHash !== "string" || !storedHash) return false;
  try {
    const candidate = createHash("sha256").update(presented.trim(), "utf8").digest();
    const expected = Buffer.from(storedHash.trim(), "hex");
    if (expected.length !== candidate.length || expected.length === 0) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1] ? match[1].trim() : "";
}

export function GET() {
  return fail("Method not allowed. POST heartbeats here.", 405);
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);

  const ipThrottle = rateLimit(`mmo-hb-ip:${clientIp(req)}`, PER_IP_LIMIT);
  if (!ipThrottle.allowed) return fail("Too many heartbeats. Try again shortly.", 429, rateLimitHeaders(ipThrottle));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const row = (body ?? {}) as Record<string, unknown>;
  const serverId = typeof row.server_id === "string" && isUuid(row.server_id) ? row.server_id : "";
  if (!serverId) return fail("Invalid server.", 400);
  const tick = cleanTickSeq(row.tick_seq);
  if (tick === null) return fail("Invalid tick_seq.", 400);

  const serverThrottle = rateLimit(`mmo-hb-server:${serverId}`, PER_SERVER_LIMIT);
  if (!serverThrottle.allowed) {
    return fail("Too many heartbeats. Try again shortly.", 429, rateLimitHeaders(serverThrottle));
  }

  const token = bearerToken(req);
  if (!isTokenShape(token)) return fail("Heartbeat token required.", 401);

  const supabase = await createClient();
  const { data: server, error: readError } = await supabase
    .from("mmo_servers")
    .select("id,game,room,status,cap,tick_seq,heartbeat_token_hash")
    .eq("id", serverId)
    .single();
  if (readError || !server) return dbFail("mmo-heartbeat", readError);
  const srow = server as Record<string, unknown>;

  if (!tokenMatches(token, srow.heartbeat_token_hash)) return fail("Invalid heartbeat token.", 401);

  const status = srow.status === "live" || srow.status === "draining" || srow.status === "dead" ? srow.status : "dead";
  if (status === "dead") {
    const idle = await isIdleDead(supabase, serverId);
    if (idle) return fail("Server is dead. Re-register to host again.", 410);
  }

  const storedTickRaw = Number(srow.tick_seq);
  const storedTick = Number.isInteger(storedTickRaw) && storedTickRaw >= 0 ? storedTickRaw : -1;
  const gate = tickGate(storedTick, tick);
  if (gate === "stale") return fail("Stale tick_seq. Heartbeats must advance.", 409);
  const game = typeof srow.game === "string" && srow.game ? srow.game : "4weird";
  const room = typeof srow.room === "string" && srow.room ? srow.room : "lobby";
  const hints = realtimeHintsFor(game, room);
  if (gate === "duplicate") {
    // Ack without writes and without re-billing: the host already banked it.
    return ok({ tick_seq: tick, duplicate: true, billed: false, realtime: hints });
  }

  const capRaw = Number(srow.cap);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? Math.floor(capRaw) : MMO_MAX_PLAYERS_PER_HEARTBEAT;
  const frames = sanitizeFrames(row.players);
  if (Array.isArray(row.players) && frames.length !== (row.players as unknown[]).length) {
    return fail("Invalid player frame.", 422);
  }
  if (frames.length > Math.min(cap, MMO_MAX_PLAYERS_PER_HEARTBEAT)) {
    return fail("Server is full.", 422);
  }
  let playerCount = frames.length;
  if (!Array.isArray(row.players) && row.player_count !== undefined) {
    const count = Number(row.player_count);
    if (!Number.isInteger(count) || count < 0 || count > Math.min(cap, MMO_MAX_PLAYERS_PER_HEARTBEAT)) {
      return fail("Invalid player_count.", 422);
    }
    playerCount = count;
  }

  const dtRaw = Number(row.dt_ms);
  const dtMs = Number.isFinite(dtRaw) && dtRaw > 0 ? dtRaw : MMO_HEARTBEAT_INTERVAL_MS;
  const verdict = checkPositions(frames, priorsFor(serverId), dtMs);
  if (!verdict.ok) {
    return fail(verdict.reason === "teleport" ? "Impossible movement rejected." : "Position out of bounds.", 422);
  }

  const nowIso = new Date().toISOString();
  const revived = status === "dead";
  const updatePayload: Record<string, unknown> = {
    tick_seq: tick,
    player_count: playerCount,
    last_heartbeat_at: nowIso,
  };
  if (revived) updatePayload.status = "live";
  const { error: writeError } = await supabase.from("mmo_servers").update(updatePayload).eq("id", serverId);
  if (writeError) return dbFail("mmo-heartbeat", writeError);

  // Prior frames advance only on accepted ticks (rejected teleports never move truth).
  const priors = priorsFor(serverId);
  for (const frame of frames) priors.set(frame.id, frame);

  // Billing usage row: best-effort, never fails the heartbeat. Missing table
  // (migration not landed yet) degrades to billed:false + server log.
  let billed = false;
  try {
    const usage = buildPresenceMinutesRow(serverId, tick, playerCount, nowIso);
    const { error: billError } = await supabase.from("presence_minutes").insert(usage);
    if (!billError) {
      billed = true;
    } else {
      const billRow = billError as unknown as Record<string, unknown>;
      console.error("[api] mmo-heartbeat billing insert failed", {
        code: String(billRow.code ?? "").slice(0, 16),
        message: String(billRow.message ?? billError ?? "unknown").slice(0, 200),
      });
    }
  } catch (err) {
    console.error("[api] mmo-heartbeat billing insert threw", {
      message: String((err as Error)?.message ?? err ?? "unknown").slice(0, 200),
    });
  }

  return ok({
    tick_seq: tick,
    billed,
    ...(revived ? { revived: true } : {}),
    realtime: hints,
  });
}

/**
 * A `dead` row stays gone unless it was swept recently: revive only when the
 * last heartbeat is within the dead window (late packet), otherwise the
 * host must re-register for a fresh token + tick baseline.
 */
async function isIdleDead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serverId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("mmo_servers").select("last_heartbeat_at").eq("id", serverId).single();
    if (error || !data) return true;
    const last = Date.parse(String((data as Record<string, unknown>).last_heartbeat_at ?? ""));
    if (!Number.isFinite(last)) return true;
    return Date.now() - last > MMO_DEAD_AFTER_MS;
  } catch {
    return true;
  }
}
