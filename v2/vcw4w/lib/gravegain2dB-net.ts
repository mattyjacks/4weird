/**
 * GraveGain2dB authoritative co-op netcode — shared server/client contract.
 *
 * NEW file for DS-GG2DB-06. Authoritative model: the server simulates at
 * 60Hz and is the ONLY writer of destruction, loot, objectives, checkpoints,
 * revives, rescues, boss state, extraction, and rewards. Clients send ONLY
 * InputFrames (60Hz) and render RoomSnapshots (20Hz). Client-sent outcome
 * claims (damage numbers, terrain edits, reward grants) are rejected, ever.
 *
 * Channel split:
 *   RELIABLE   — destruction / loot / objective / checkpoint / revive /
 *                rescue / boss / extraction / reward (acked, replayed,
 *                de-duplicated by event seq).
 *   UNRELIABLE — transforms / aim / anim (last-write-wins, drop-safe).
 *
 * Disconnect policy (client + server agree):
 *   - input freeze after 2 missed frames, shield the body, 30s recoverable
 *     window, difficulty/loot scale-to-active, NO host migration.
 * Reconnect bundle: seed / tick / full-state / chunks / objectives /
 *   event-seq / extraction, applied with no duplication (seq-gated).
 *
 * ASCII-only, dependency-free, strict-safe. Pure helpers have no I/O so
 * both the route handler and node harnesses can import them.
 */

/* ---------------- rates ---------------- */

export const GG2DB_SIM_HZ = 60;
export const GG2DB_INPUT_HZ = 60;
export const GG2DB_SNAPSHOT_HZ = 20;
/** Server ticks per snapshot broadcast (60/20). */
export const GG2DB_SNAPSHOT_INTERVAL_TICKS = GG2DB_SIM_HZ / GG2DB_SNAPSHOT_HZ;
/** Seconds per simulation tick. */
export const GG2DB_SIM_DT = 1 / GG2DB_SIM_HZ;

/* ---------------- room limits ---------------- */

export const GG2DB_MAX_PLAYERS = 4;
export const GG2DB_MAX_ENTITIES = 256;
export const GG2DB_MAX_EVENTS_PER_SNAPSHOT = 32;
export const GG2DB_CHUNK_SIZE = 16;

/* ---------------- disconnect / reconnect policy ---------------- */

/** Missed input frames before the server freezes (not drops) the body. */
export const GG2DB_MISSED_FREEZE_FRAMES = 2;
/** Ms a disconnected body stays shielded + recoverable. */
export const GG2DB_RECOVERABLE_MS = 30_000;
/** Ms of invulnerable shield granted on freeze AND on rejoin. */
export const GG2DB_SHIELD_MS = 3_000;

/* ---------------- simulation caps (server enforcement) ---------------- */

/** Max player speed, world units per second. Movement beyond this is forged. */
export const GG2DB_MAX_SPEED = 6;
/** Max aim slew the server accepts per tick, radians. */
export const GG2DB_MAX_AIM_SLEW_PER_TICK = Math.PI / 10;
/** Min ticks between two FIRE edges per weapon id (fire-rate cap). */
export const GG2DB_FIRE_INTERVAL_TICKS: Record<string, number> = {
  pistol: 12,
  scatter: 30,
  beam: 6,
};
/** Min ticks between INTERACT edges (cooldown cap). */
export const GG2DB_INTERACT_INTERVAL_TICKS = 18;
/** Max world-units distance for interact / revive / rescue claims. */
export const GG2DB_INTERACT_RANGE = 2.5;
/** Max damage any single server tick may apply to one target. */
export const GG2DB_MAX_DAMAGE_PER_TICK = 25;

/* ---------------- 8-bit button mask ---------------- */

export const GG2DB_BUTTON_FIRE = 0x01;
export const GG2DB_BUTTON_JUMP = 0x02;
export const GG2DB_BUTTON_INTERACT = 0x04;
export const GG2DB_BUTTON_REVIVE = 0x08;
export const GG2DB_BUTTON_RELOAD = 0x10;
export const GG2DB_BUTTON_DASH = 0x20;
export const GG2DB_BUTTON_CROUCH = 0x40;
export const GG2DB_BUTTON_PING = 0x80;
export const GG2DB_BUTTON_MASK = 0xff;

/* ---------------- reliable channel ---------------- */

export const GG2DB_RELIABLE_KINDS = [
  "destruction",
  "loot",
  "objective",
  "checkpoint",
  "revive",
  "rescue",
  "boss",
  "extraction",
  "reward",
] as const;

export type GG2DBReliableKind = (typeof GG2DB_RELIABLE_KINDS)[number];

/** Unreliable (drop-safe, last-write-wins) field families. */
export const GG2DB_UNRELIABLE_FIELDS = [
  "transform",
  "aim",
  "anim",
] as const;

export type GG2DBUnreliableField = (typeof GG2DB_UNRELIABLE_FIELDS)[number];

export function gg2dbIsReliableKind(kind: string): kind is GG2DBReliableKind {
  return (GG2DB_RELIABLE_KINDS as readonly string[]).indexOf(kind) !== -1;
}

/* ---------------- wire types ---------------- */

/** Sole client->server payload. Clients never send outcomes. */
export interface GG2DBInputFrame {
  sequence: number;
  clientTick: number;
  moveX: number;
  moveY: number;
  aimAngle: number;
  /** 8-bit mask of GG2DB_BUTTON_* bits. */
  buttons: number;
}

export interface GG2DBPlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aimAngle: number;
  anim: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  shieldedUntilTick: number;
  frozen: boolean;
  weaponId: string;
  lastAckedInput: number;
}

export interface GG2DBEntityState {
  id: string;
  kind: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface GG2DBTerrainChunk {
  cx: number;
  cy: number;
  /** Revision counter: deltas apply only when rev === baseRev + 1 chain. */
  rev: number;
  cells: number[];
}

export interface GG2DBObjectiveState {
  id: string;
  kind: string;
  done: boolean;
  progress: number;
}

/** Reliable event. Server-stamped; clients de-dupe on seq. */
export interface GG2DBNetEvent {
  seq: number;
  kind: GG2DBReliableKind;
  atTick: number;
  playerId: string;
  text: string;
}

/** Server->client snapshot, 20Hz. */
export interface GG2DBRoomSnapshot {
  roomId: string;
  seed: string;
  serverTick: number;
  /** Highest input sequence the server has applied, per player. */
  acknowledgedInput: Record<string, number>;
  players: GG2DBPlayerState[];
  entities: GG2DBEntityState[];
  chunks: GG2DBTerrainChunk[];
  objectives: GG2DBObjectiveState[];
  events: GG2DBNetEvent[];
  extraction: string;
}

/** Incremental terrain update between snapshots. */
export interface GG2DBChunkDelta {
  cx: number;
  cy: number;
  baseRev: number;
  rev: number;
  cells: number[];
}

/** Full-state payload handed to a rejoining client. */
export interface GG2DBReconnectBundle {
  roomId: string;
  seed: string;
  serverTick: number;
  snapshot: GG2DBRoomSnapshot;
  chunks: GG2DBTerrainChunk[];
  objectives: GG2DBObjectiveState[];
  /** Next event seq the client should accept (anything below is a dup). */
  nextEventSeq: number;
  extraction: string;
}

/* ---------------- validation ---------------- */

export interface GG2DBValidation {
  ok: boolean;
  reason: string;
}

function gg2dbFail(reason: string): GG2DBValidation {
  return { ok: false, reason };
}

function gg2dbOk(): GG2DBValidation {
  return { ok: true, reason: "" };
}

function gg2dbFin(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function gg2dbInt(v: unknown): number | null {
  const n = gg2dbFin(v);
  if (n === null) return null;
  return Math.floor(n);
}

/**
 * Sanitize one raw client frame. Returns null when the frame is malformed
 * (caller drops it and counts a missed frame toward the freeze threshold).
 */
export function gg2dbSanitizeInput(raw: unknown): GG2DBInputFrame | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sequence = gg2dbInt(r.sequence);
  const clientTick = gg2dbInt(r.clientTick);
  const moveX = gg2dbFin(r.moveX);
  const moveY = gg2dbFin(r.moveY);
  const aimAngle = gg2dbFin(r.aimAngle);
  const buttons = gg2dbInt(r.buttons);
  if (sequence === null || sequence < 0) return null;
  if (clientTick === null || clientTick < 0) return null;
  if (moveX === null || moveY === null || aimAngle === null) return null;
  if (buttons === null) return null;
  const mag = Math.hypot(moveX, moveY);
  const nx = mag > 1 ? moveX / mag : moveX;
  const ny = mag > 1 ? moveY / mag : moveY;
  return {
    sequence,
    clientTick,
    moveX: nx,
    moveY: ny,
    aimAngle,
    buttons: buttons & GG2DB_BUTTON_MASK,
  };
}

/** Reject forged movement: speed beyond GG2DB_MAX_SPEED for the tick span. */
export function gg2dbValidateMovement(
  prevX: number,
  prevY: number,
  nextX: number,
  nextY: number,
  ticksElapsed: number,
): GG2DBValidation {
  if (
    !Number.isFinite(prevX) ||
    !Number.isFinite(prevY) ||
    !Number.isFinite(nextX) ||
    !Number.isFinite(nextY)
  ) {
    return gg2dbFail("non-finite position");
  }
  const ticks = Math.max(1, Math.floor(ticksElapsed) || 1);
  const dist = Math.hypot(nextX - prevX, nextY - prevY);
  const allowed = GG2DB_MAX_SPEED * GG2DB_SIM_DT * ticks + 1e-6;
  if (dist > allowed) return gg2dbFail("forged movement: speed cap exceeded");
  return gg2dbOk();
}

/** Reject forged aim snaps beyond the per-tick slew cap. */
export function gg2dbValidateAim(
  prevAngle: number,
  nextAngle: number,
  ticksElapsed: number,
): GG2DBValidation {
  if (!Number.isFinite(prevAngle) || !Number.isFinite(nextAngle)) {
    return gg2dbFail("non-finite aim");
  }
  const ticks = Math.max(1, Math.floor(ticksElapsed) || 1);
  let d = Math.abs(nextAngle - prevAngle) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  if (d > GG2DB_MAX_AIM_SLEW_PER_TICK * ticks + 1e-6) {
    return gg2dbFail("forged aim: slew cap exceeded");
  }
  return gg2dbOk();
}

/** Reject forged fire-rate: FIRE edges closer than the weapon interval. */
export function gg2dbValidateFireRate(
  weaponId: string,
  lastFireTick: number,
  nowTick: number,
): GG2DBValidation {
  const interval = GG2DB_FIRE_INTERVAL_TICKS[weaponId] ?? 12;
  if (nowTick - lastFireTick < interval) {
    return gg2dbFail("forged fire-rate: cooldown not elapsed");
  }
  return gg2dbOk();
}

/** Reject forged cooldowns: INTERACT edges inside the interact interval. */
export function gg2dbValidateInteractCooldown(
  lastInteractTick: number,
  nowTick: number,
): GG2DBValidation {
  if (nowTick - lastInteractTick < GG2DB_INTERACT_INTERVAL_TICKS) {
    return gg2dbFail("forged cooldown: interact too soon");
  }
  return gg2dbOk();
}

/** Reject forged weapon use: the weapon must be owned by the player. */
export function gg2dbValidateWeaponOwnership(
  weaponId: string,
  ownedWeaponIds: readonly string[],
): GG2DBValidation {
  if (ownedWeaponIds.indexOf(weaponId) === -1) {
    return gg2dbFail("forged weapon: not owned");
  }
  return gg2dbOk();
}

/** Reject forged interact/revive/rescue: target must be in range. */
export function gg2dbValidateInteractRange(
  actorX: number,
  actorY: number,
  targetX: number,
  targetY: number,
): GG2DBValidation {
  if (
    !Number.isFinite(actorX) ||
    !Number.isFinite(actorY) ||
    !Number.isFinite(targetX) ||
    !Number.isFinite(targetY)
  ) {
    return gg2dbFail("non-finite interact positions");
  }
  if (Math.hypot(targetX - actorX, targetY - actorY) > GG2DB_INTERACT_RANGE) {
    return gg2dbFail("forged interact: target out of range");
  }
  return gg2dbOk();
}

/**
 * Damage is server-computed, never client-claimed. Any client message that
 * carries a damage number (or kills/hp writes) is rejected outright.
 */
export function gg2dbValidateDamageClaim(raw: unknown): GG2DBValidation {
  if (!raw || typeof raw !== "object") return gg2dbOk();
  const r = raw as Record<string, unknown>;
  if (
    r.damage !== undefined ||
    r.dps !== undefined ||
    r.killConfirmed !== undefined ||
    r.setHp !== undefined
  ) {
    return gg2dbFail("forged damage: clients never claim damage");
  }
  return gg2dbOk();
}

/**
 * Terrain is server-simulated. Any client message carrying chunk/cell
 * writes is rejected outright.
 */
export function gg2dbValidateTerrainClaim(raw: unknown): GG2DBValidation {
  if (!raw || typeof raw !== "object") return gg2dbOk();
  const r = raw as Record<string, unknown>;
  if (
    r.chunk !== undefined ||
    r.cells !== undefined ||
    r.destroyTerrain !== undefined ||
    r.terrainRev !== undefined
  ) {
    return gg2dbFail("forged terrain: clients never claim terrain");
  }
  return gg2dbOk();
}

/**
 * Rewards/objectives/checkpoints are server-issued. Any client message
 * carrying them is rejected outright — no client claims, ever.
 */
export function gg2dbValidateRewardClaim(raw: unknown): GG2DBValidation {
  if (!raw || typeof raw !== "object") return gg2dbOk();
  const r = raw as Record<string, unknown>;
  if (
    r.reward !== undefined ||
    r.loot !== undefined ||
    r.objective !== undefined ||
    r.checkpoint !== undefined ||
    r.extraction !== undefined ||
    r.grantXp !== undefined ||
    r.grantCoins !== undefined
  ) {
    return gg2dbFail("forged reward: clients never claim rewards");
  }
  return gg2dbOk();
}

/**
 * Full gate for one inbound client message: frame shape + no damage,
 * terrain, or reward claims. The server applies movement/fire AFTER these
 * pass, using its own authoritative state.
 */
export function gg2dbValidateClientMessage(raw: unknown): GG2DBValidation {
  const frame = gg2dbSanitizeInput(raw);
  if (!frame) return gg2dbFail("malformed input frame");
  const d = gg2dbValidateDamageClaim(raw);
  if (!d.ok) return d;
  const t = gg2dbValidateTerrainClaim(raw);
  if (!t.ok) return t;
  const w = gg2dbValidateRewardClaim(raw);
  if (!w.ok) return w;
  return gg2dbOk();
}

/* ---------------- snapshot helpers ---------------- */

/** De-dupe reliable events by seq: drop anything below nextEventSeq. */
export function gg2dbDedupeEvents(
  events: readonly GG2DBNetEvent[],
  nextEventSeq: number,
): GG2DBNetEvent[] {
  const seen = new Set<number>();
  const out: GG2DBNetEvent[] = [];
  for (const ev of events) {
    if (!ev || typeof ev.seq !== "number") continue;
    if (ev.seq < nextEventSeq) continue;
    if (seen.has(ev.seq)) continue;
    seen.add(ev.seq);
    out.push(ev);
  }
  out.sort((a, b) => a.seq - b.seq);
  return out;
}

/** Apply a chunk delta only when it chains exactly on the held revision. */
export function gg2dbApplyChunkDelta(
  held: GG2DBTerrainChunk,
  delta: GG2DBChunkDelta,
): GG2DBTerrainChunk | null {
  if (held.cx !== delta.cx || held.cy !== delta.cy) return null;
  if (delta.baseRev !== held.rev) return null;
  if (delta.rev !== held.rev + 1) return null;
  if (!Array.isArray(delta.cells) || delta.cells.length === 0) return null;
  return { cx: held.cx, cy: held.cy, rev: delta.rev, cells: delta.cells.slice() };
}

/** Scale-to-active: effective difficulty/loot factor from active player count. */
export function gg2dbScaleToActive(activePlayers: number): number {
  const n = Math.max(0, Math.floor(activePlayers) || 0);
  if (n <= 0) return 0;
  return Math.min(1, n / GG2DB_MAX_PLAYERS);
}

/** Two-client shared-collapse fixture descriptor (reviewer harness). */
export function gg2dbSharedCollapseFixture(): {
  clients: number;
  sharedTarget: string;
  expectSingleReward: boolean;
} {
  return {
    clients: 2,
    sharedTarget: "collapse-core",
    expectSingleReward: true,
  };
}
