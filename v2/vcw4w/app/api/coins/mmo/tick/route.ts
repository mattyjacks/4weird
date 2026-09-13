import { createHash, timingSafeEqual } from "node:crypto";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import {
  MMO_MAX_PLAYERS_PER_TICK,
  cleanMmoMatchId,
  cleanMmoMinute,
  cleanMmoShare,
} from "@/lib/economy-mmo";

export const maxDuration = 60;

// POST /api/coins/mmo/tick — per-minute MMO settlement job (economy lane).
//
// Fired once per (match, minute) by the scheduler with Bearer CRON_SECRET
// (same discipline as /api/cron/*: never ?secret=, fail-closed 401 without
// it). The settle_mmo_minute() RPC is service_role-only, so players can
// never reach the money path directly.
//
// Body: { matchId, minuteIdx, hostId?, players? }
// - players[] (explicit minute batch): [{ playerId, shareCoins }]. Each
//   share is the player's per-minute gross with the 25% cut INCLUDED.
// - players omitted: the job CONSUMES the `presence_minutes` intake owned
//   by DS-MMO-09/DS-MMO-10 (rows for this match+minute). Table not landed
//   yet -> 503 "metering tables not ready" (fail-closed, retry later).
//
// Per player the RPC enforces the idempotency key (match+minute+player):
// retries converge, short balances yield `due` rows (never negatives), and
// debits flow through the existing FIFO/expiry trigger (refund-safe paid
// lots only). No parallel balance column is read or invented anywhere here.
//
// Economy hard rule: never log balances, keys, or PII — only counts and
// error codes reach the server log.

type TickPlayerInput = { playerId: string; shareCoins: number };

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return false;
  const ah = createHash("sha256").update(bearer).digest();
  const bh = createHash("sha256").update(secret).digest();
  try {
    return timingSafeEqual(ah, bh);
  } catch {
    return false;
  }
}

function cleanPlayers(value: unknown): TickPlayerInput[] {
  if (!Array.isArray(value)) return [];
  const out: TickPlayerInput[] = [];
  for (const row of value.slice(0, MMO_MAX_PLAYERS_PER_TICK)) {
    const r = (row ?? {}) as Record<string, unknown>;
    const playerId = String(r.playerId ?? "").trim();
    const shareCoins = cleanMmoShare(r.shareCoins);
    if (!isUuid(playerId) || shareCoins <= 0) continue;
    out.push({ playerId, shareCoins });
  }
  return out;
}

type PresenceMinuteRow = {
  player_id?: unknown;
  playerId?: unknown;
  user_id?: unknown;
  share_coins?: unknown;
  shareCoins?: unknown;
  share?: unknown;
};

async function readPresenceMinute(
  db: ReturnType<typeof serviceClient>,
  matchId: string,
  minuteIdx: number,
): Promise<TickPlayerInput[] | null> {
  const { data, error } = await db
    .from("presence_minutes")
    .select("player_id, share_coins")
    .eq("match_id", matchId)
    .eq("minute_idx", minuteIdx)
    .limit(MMO_MAX_PLAYERS_PER_TICK);
  if (error) {
    const code = String(
      (error as { code?: unknown }).code ?? (error as { message?: unknown }).message ?? "",
    );
    // Metering tables not landed yet (DS-MMO-10 unlanded): fail closed.
    if (code === "42P01" || code.includes("PGRST205") || /not find|does not exist/i.test(code)) {
      return null;
    }
    throw error;
  }
  const players: TickPlayerInput[] = [];
  for (const row of ((data ?? []) as PresenceMinuteRow[])) {
    const playerId = String(row.player_id ?? row.playerId ?? row.user_id ?? "").trim();
    const shareCoins = cleanMmoShare(row.share_coins ?? row.shareCoins ?? row.share);
    if (!isUuid(playerId) || shareCoins <= 0) continue;
    players.push({ playerId, shareCoins });
    if (players.length >= MMO_MAX_PLAYERS_PER_TICK) break;
  }
  return players;
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const matchId = cleanMmoMatchId(input.matchId);
  const minuteIdx = cleanMmoMinute(input.minuteIdx);
  if (matchId === "") return fail("matchId is required.", 400);
  if (!Number.isInteger(minuteIdx) || minuteIdx < 0) return fail("minuteIdx is required.", 400);
  const hostId = String(input.hostId ?? "").trim();
  if (hostId !== "" && !isUuid(hostId)) return fail("Invalid host.", 400);

  // Retry-storm shield per settled minute (the RPC idempotency key is the
  // real guard; this stops the storm from ever reaching the money path).
  const rl = rateLimit(`mmo-tick:${matchId}:${minuteIdx}`, 5, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  const db = serviceClient();
  let players = cleanPlayers(input.players);
  let viaPresence = false;
  if (players.length === 0 && input.players === undefined) {
    let rows: TickPlayerInput[] | null;
    try {
      rows = await readPresenceMinute(db, matchId, minuteIdx);
    } catch (error) {
      return dbFail("POST /api/coins/mmo/tick", error, "Unable to read presence minutes.");
    }
    if (rows === null) return fail("Metering tables not ready.", 503);
    players = rows;
    viaPresence = true;
  }
  if (players.length === 0) {
    return ok({ matchId, minuteIdx, settled: 0, due: 0, failed: 0, empty: true, viaPresence });
  }
  if (hostId === "") return fail("hostId is required to settle.", 400);

  let settled = 0;
  let due = 0;
  let failed = 0;
  for (const p of players) {
    const { data, error } = await db.rpc("settle_mmo_minute", {
      p_match: matchId,
      p_minute: minuteIdx,
      p_player: p.playerId,
      p_share: p.shareCoins,
      p_host: hostId,
    });
    if (error) {
      failed += 1;
      continue;
    }
    const res = (data ?? {}) as { settled?: unknown; status?: unknown };
    if (res.settled === true) settled += 1;
    else if (res.status === "due") due += 1;
    else failed += 1;
  }

  return ok({ matchId, minuteIdx, settled, due, failed, viaPresence });
}
