/**
 * MMO presence registry + relay transport contract (DS-MMO-09, vcw lane).
 *
 * Shape of the system:
 * - REST is the SOURCE OF TRUTH: `POST /api/presence/mmo/servers`
 *   (register), `PATCH` (drain), `GET` (list + opportunistic dead-sweep),
 *   and `POST /api/presence/mmo/heartbeat` (tick intake, monotonic
 *   `tick_seq`, bearer-token authed, bills `presence_minutes` rows).
 * - Supabase Realtime carries EPHEMERAL 10-20 Hz state per room: Presence
 *   tracks who is in the room, Broadcast carries position/state frames.
 *   Realtime is never authoritative — a client that reconnects re-syncs
 *   from REST, then resumes live frames.
 * - Adapters keep POLLING FALLBACK: when Realtime is unavailable the
 *   `MmoPollingAdapter` below polls the REST list on a slow cadence and the
 *   UI keeps working (low Hz, same shapes).
 *
 * Client-safe: dependency-free (no server imports, no cookies, no gateway
 * wiring). Server routes and browser adapters import from here.
 *
 * Economy boundary: this module performs ZERO ledger writes and reads NO
 * balances. Heartbeats mint `presence_minutes` usage rows only (minutes +
 * player count, no coin columns); the economy lane aggregates those into
 * paired `coin_ledger` entries via its own guarded RPC.
 */

/** Lifecycle of a registered game server. */
export type MmoServerStatus = "live" | "draining" | "dead";

/** Canonical server row (REST source of truth). */
export type MmoServerRecord = {
  id: string;
  game: string;
  room: string;
  status: MmoServerStatus;
  cap: number;
  player_count: number;
  tick_seq: number;
  age_band: string;
};

/** Slim server summary served by the list endpoint + polling adapter. */
export type MmoServerSummary = {
  id: string;
  game: string;
  room: string;
  status: MmoServerStatus;
  player_count: number;
  cap: number;
};

/** Host heartbeat body (REST, slow cadence — NOT the 10-20 Hz path). */
export type MmoHeartbeatInput = {
  server_id: unknown;
  tick_seq: unknown;
  player_count?: unknown;
  players?: unknown;
  dt_ms?: unknown;
};

/** One ephemeral player frame (Realtime Broadcast, 10-20 Hz). */
export type MmoPlayerFrame = {
  id: string;
  x: number;
  y: number;
  z?: number;
};

/** Usage row the heartbeat route emits for economy billing (no coins). */
export type MmoPresenceMinutesRow = {
  server_id: string;
  tick_seq: number;
  minutes: number;
  player_count: number;
  recorded_at: string;
};

/** Realtime hints every REST response carries so adapters need no config. */
export type MmoRealtimeHints = {
  channel: string;
  broadcast_event: string;
  /** Fastest ephemeral frame cadence (20 Hz). */
  min_interval_ms: number;
  /** Slowest live cadence before the UI should show "lagging" (10 Hz). */
  max_interval_ms: number;
  /** Polling-fallback cadence for the REST list. */
  poll_interval_ms: number;
};

/** Host heartbeat cadence: one REST tick per 5 s (ephemeral frames go over Broadcast). */
export const MMO_HEARTBEAT_INTERVAL_MS = 5_000;
/** Minutes billed per accepted heartbeat (5 s = 1/12 min). */
export const MMO_MINUTES_PER_HEARTBEAT = MMO_HEARTBEAT_INTERVAL_MS / 60_000;
/** A `live` server with no heartbeat for this long is swept to `dead`. */
export const MMO_DEAD_AFTER_MS = 30_000;
/** Ephemeral Broadcast cadence bounds: 50 ms (20 Hz) .. 100 ms (10 Hz). */
export const MMO_BROADCAST_MIN_INTERVAL_MS = 50;
export const MMO_BROADCAST_MAX_INTERVAL_MS = 100;
/** REST polling-fallback cadence for adapters without Realtime. */
export const MMO_POLL_INTERVAL_MS = 5_000;
/** Server capacity bounds (mirrors the DS-MMO-10 `mmo_servers` check). */
export const MMO_CAP_MIN = 2;
export const MMO_CAP_MAX = 256;
/** World bounds for server-side position sanity checks (world units). */
export const MMO_WORLD_BOUND = 10_000;
/** Max plausible player speed (units/sec); faster implies teleport/exploit. */
export const MMO_MAX_SPEED_UNITS_PER_SEC = 60;
/** Slack added to the speed gate so lag spikes do not false-positive. */
export const MMO_SPEED_SLACK_UNITS = 8;
/** Max players accepted in a single heartbeat payload. */
export const MMO_MAX_PLAYERS_PER_HEARTBEAT = 256;
/** Heartbeat bearer tokens are 32 random bytes (base64url, 43 chars). */
export const MMO_TOKEN_MIN_LEN = 32;
/** Realtime Broadcast event name for ephemeral state frames. */
export const MMO_BROADCAST_EVENT = "mmo-state";

const MAX_ID_LEN = 128;
const MAX_LABEL_LEN = 64;

/** Trimmed non-empty string within length bounds, else null (fail-open). */
function cleanId(value: unknown, maxLen = MAX_ID_LEN): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

/** `game` slugs look like the rest of the presence API (`isSlug` shape). */
export function cleanGameSlug(value: unknown): string {
  const v = typeof value === "string" ? value : "";
  return /^[a-z0-9-]{1,64}$/.test(v) ? v : "";
}

/** Room names are short free-form labels namespaced per game. */
export function cleanRoomId(value: unknown): string {
  if (typeof value !== "string") return "lobby";
  const trimmed = value.trim().slice(0, MAX_LABEL_LEN);
  if (!trimmed || !/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) return "lobby";
  return trimmed;
}

/** Age bands mirror the age-gate vocabulary; unknown falls back to `all`. */
export function cleanAgeBand(value: unknown): string {
  const v = typeof value === "string" ? value.trim().slice(0, 16) : "";
  return v === "kids" || v === "teens" || v === "adult" || v === "all" ? v : "all";
}

/** Server capacity clamped to the registry bounds (2..256). */
export function cleanCap(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v)) return MMO_CAP_MIN;
  return Math.max(MMO_CAP_MIN, Math.min(Math.floor(v), MMO_CAP_MAX));
}

/** Tick sequence: non-negative integer only. */
export function cleanTickSeq(value: unknown): number | null {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 0) return null;
  return v;
}

/**
 * Monotonic tick gate. `last` is the stored sequence (`-1` when the server
 * has never beaten). Returns `fresh` when `next` advances, `duplicate`
 * when it repeats (safe to ack without re-billing), `stale` when it
 * regresses (replayed or forked heartbeat — reject).
 */
export function tickGate(last: number, next: number): "fresh" | "duplicate" | "stale" {
  if (next > last) return "fresh";
  if (next === last) return "duplicate";
  return "stale";
}

/** Shape check for a raw heartbeat bearer token (never logged, never echoed). */
export function isTokenShape(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.length >= MMO_TOKEN_MIN_LEN && v.length <= 256 && /^[A-Za-z0-9\-_]+$/.test(v);
}

/** Finite number within world bounds, else null. */
function cleanCoord(value: unknown): number | null {
  const v = Number(value);
  if (!Number.isFinite(v) || Math.abs(v) > MMO_WORLD_BOUND) return null;
  return v;
}

/** Normalize one player frame fail-open (null when out of shape/bounds). */
export function sanitizeFrame(entry: unknown): MmoPlayerFrame | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as Record<string, unknown>;
  const id = cleanId(row.id);
  const x = cleanCoord(row.x);
  const y = cleanCoord(row.y);
  if (!id || x === null || y === null) return null;
  const frame: MmoPlayerFrame = { id, x, y };
  const z = row.z;
  if (z !== undefined) {
    const cz = cleanCoord(z);
    if (cz === null) return null;
    frame.z = cz;
  }
  return frame;
}

/** Normalize a heartbeat `players` list fail-open (drops bad rows, caps length). */
export function sanitizeFrames(players: unknown): MmoPlayerFrame[] {
  if (!Array.isArray(players)) return [];
  const out: MmoPlayerFrame[] = [];
  for (const entry of players.slice(0, MMO_MAX_PLAYERS_PER_HEARTBEAT)) {
    const frame = sanitizeFrame(entry);
    if (frame) out.push(frame);
  }
  return out;
}

export type PositionVerdict =
  | { ok: true }
  | { ok: false; reason: "out-of-bounds" | "teleport"; player: string };

/**
 * Server-side position sanity check for one heartbeat batch.
 *
 * - Every frame must already be in-bounds (see `sanitizeFrame`).
 * - Against `prev` (id -> frame from the last accepted heartbeat) each
 *   player must not have moved faster than max-speed * dt + slack.
 * - No history for a player (join/respawn) always passes.
 * - `dtMs` <= 0 or absurdly large clamps to one heartbeat interval so a
 *   withheld heartbeat cannot bank infinite movement budget.
 */
export function checkPositions(
  frames: MmoPlayerFrame[],
  prev: Map<string, MmoPlayerFrame>,
  dtMs: number,
): PositionVerdict {
  const dt = !Number.isFinite(dtMs) || dtMs <= 0 ? MMO_HEARTBEAT_INTERVAL_MS : Math.min(dtMs, MMO_DEAD_AFTER_MS);
  const budget = (MMO_MAX_SPEED_UNITS_PER_SEC * dt) / 1000 + MMO_SPEED_SLACK_UNITS;
  const budgetSq = budget * budget;
  for (const frame of frames) {
    if (Math.abs(frame.x) > MMO_WORLD_BOUND || Math.abs(frame.y) > MMO_WORLD_BOUND) {
      return { ok: false, reason: "out-of-bounds", player: frame.id };
    }
    const before = prev.get(frame.id);
    if (!before) continue;
    const dx = frame.x - before.x;
    const dy = frame.y - before.y;
    const dz = (frame.z ?? 0) - (before.z ?? 0);
    if (dx * dx + dy * dy + dz * dz > budgetSq) {
      return { ok: false, reason: "teleport", player: frame.id };
    }
  }
  return { ok: true };
}

/** Realtime channel for one room: `mmo:<game>:<room>` (Presence + Broadcast share it). */
export function mmoRoomChannel(game: string, room: string): string {
  return `mmo:${cleanGameSlug(game) || "4weird"}:${cleanRoomId(room)}`;
}

/** Hints payload every REST response in this slice carries. */
export function realtimeHintsFor(game: string, room: string): MmoRealtimeHints {
  return {
    channel: mmoRoomChannel(game, room),
    broadcast_event: MMO_BROADCAST_EVENT,
    min_interval_ms: MMO_BROADCAST_MIN_INTERVAL_MS,
    max_interval_ms: MMO_BROADCAST_MAX_INTERVAL_MS,
    poll_interval_ms: MMO_POLL_INTERVAL_MS,
  };
}

/**
 * Broadcast throttle: send an ephemeral frame only when at least
 * `minIntervalMs` (default 50 ms = 20 Hz cap) elapsed since the last send.
 */
export function shouldSendFrame(lastSentAt: number, now: number, minIntervalMs = MMO_BROADCAST_MIN_INTERVAL_MS): boolean {
  return now - lastSentAt >= minIntervalMs;
}

/** Build one Broadcast payload (ephemeral — never persisted). */
export function buildFramePayload(serverId: string, tickSeq: number, frames: MmoPlayerFrame[]): Record<string, unknown> {
  return { server_id: serverId, tick_seq: tickSeq, frames, sent_at: Date.now() };
}

/** Build the usage row a heartbeat emits (pure — the route performs the insert). */
export function buildPresenceMinutesRow(
  serverId: string,
  tickSeq: number,
  playerCount: number,
  nowIso?: string,
): MmoPresenceMinutesRow {
  return {
    server_id: serverId,
    tick_seq: tickSeq,
    minutes: MMO_MINUTES_PER_HEARTBEAT,
    player_count: Math.max(0, Math.floor(Number(playerCount) || 0)),
    recorded_at: nowIso ?? new Date().toISOString(),
  };
}

/** Normalize a server row from the list endpoint fail-open. */
export function normalizeServerSummary(entry: unknown): MmoServerSummary | null {
  if (!entry || typeof entry !== "object") return null;
  const row = entry as Record<string, unknown>;
  const id = cleanId(row.id);
  const game = cleanGameSlug(row.game);
  if (!id || !game) return null;
  const status = row.status;
  const playerCount = Number(row.player_count);
  const cap = Number(row.cap);
  return {
    id,
    game,
    room: cleanRoomId(row.room),
    status: status === "live" || status === "draining" || status === "dead" ? status : "dead",
    player_count: Number.isFinite(playerCount) && playerCount >= 0 ? Math.floor(playerCount) : 0,
    cap: Number.isFinite(cap) && cap > 0 ? Math.floor(cap) : MMO_CAP_MIN,
  };
}

export type MmoServersSnapshot = {
  servers: MmoServerSummary[];
  fetchedAt: number;
};

export type MmoPollingOptions = {
  game?: unknown;
  intervalMs?: unknown;
  fetchImpl?: typeof fetch;
  onUpdate?: (snap: MmoServersSnapshot) => void;
};

/**
 * Polling-fallback adapter: polls `GET /api/presence/mmo/servers?game=`
 * on a slow cadence and delivers normalized snapshots. Used when
 * Supabase Realtime is unreachable; the UI renders the same shapes at
 * low Hz. Fail-open: fetch/parse errors deliver an empty snapshot, never
 * throw, so render loops keep running.
 */
export class MmoPollingAdapter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly game: string;
  private readonly intervalMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onUpdate: (snap: MmoServersSnapshot) => void;

  constructor(opts: MmoPollingOptions = {}) {
    this.game = cleanGameSlug(opts.game) || "4weird";
    const raw = Number(opts.intervalMs);
    this.intervalMs = Number.isFinite(raw) && raw >= 1000 ? Math.floor(raw) : MMO_POLL_INTERVAL_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.onUpdate = opts.onUpdate ?? (() => undefined);
  }

  get running(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    void this.poll();
    this.timer = setInterval(() => {
      void this.poll();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async poll(): Promise<MmoServersSnapshot> {
    const snap = await fetchMmoServers(this.game, this.fetchImpl);
    try {
      this.onUpdate(snap);
    } catch {
      // Listener bugs must never break the poll loop.
    }
    return snap;
  }
}

/** Fetch the REST server list fail-open (polling fallback + re-sync after reconnect). */
export async function fetchMmoServers(game: string, fetchImpl: typeof fetch = fetch): Promise<MmoServersSnapshot> {
  const empty: MmoServersSnapshot = { servers: [], fetchedAt: Date.now() };
  try {
    const res = await fetchImpl(`/api/presence/mmo/servers?game=${encodeURIComponent(cleanGameSlug(game) || "4weird")}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return empty;
    const data: unknown = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return empty;
    const list = (data as Record<string, unknown>).servers;
    if (!Array.isArray(list)) return empty;
    const servers: MmoServerSummary[] = [];
    for (const entry of list.slice(0, 50)) {
      const row = normalizeServerSummary(entry);
      if (row) servers.push(row);
    }
    return { servers, fetchedAt: Date.now() };
  } catch {
    return empty;
  }
}

export type MmoHeartbeatResult = {
  tick_seq: number;
  duplicate?: boolean;
  billed: boolean;
};

/**
 * POST one host heartbeat fail-open (host adapters use this; returns null
 * on any failure so heartbeat loops never crash the game thread).
 */
export async function postMmoHeartbeat(
  body: { server_id: string; tick_seq: number; player_count?: number; players?: MmoPlayerFrame[] },
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MmoHeartbeatResult | null> {
  if (!isTokenShape(token)) return null;
  try {
    const res = await fetchImpl("/api/presence/mmo/heartbeat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json().catch(() => null);
    if (!data || typeof data !== "object") return null;
    const row = data as Record<string, unknown>;
    const tick = Number(row.tick_seq);
    if (!Number.isInteger(tick) || tick < 0) return null;
    const result: MmoHeartbeatResult = { tick_seq: tick, billed: row.billed === true };
    if (row.duplicate === true) result.duplicate = true;
    return result;
  } catch {
    return null;
  }
}
