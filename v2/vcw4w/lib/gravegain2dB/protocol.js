'use strict';
/* GraveGain2dB dedicated-room protocol (v2/vcw4w only).
 *
 * NOT a copy of public/games/html/gravegain-netplay.js: that core is a
 * 2s-relay overlay (PUT full RPG state allowlist, chat/emote/rematch) for
 * gravegain1d/2d/3d parties. This module is the authoritative-room wire
 * contract for gravegain2dB: 60Hz sim, 20Hz snapshots, intents-only inputs.
 * The server alone computes damage/terrain/loot/objectives; client-sent
 * outcome claims are never decoded here and are rejected by Room.
 *
 * Lobby ticket contracts are unchanged (owned by sibling agents + SQL):
 *   POST /api/matches { game_slug, platform } -> { match_id | id }
 *   POST /api/lobbies  { game_slug, platform, visibility, title }
 *   POST /api/lobbies/:id/join { join_code }
 * This module only consumes the resulting ticket { matchId, lobbyId,
 * playerId, token } when opening the room WebSocket. It never touches
 * party/matches SQL.
 *
 * ASCII-only, dependency-free. CommonJS + browser global compatible.
 */

var SIM_HZ = 60;
var SNAPSHOT_HZ = 20;
var SIM_DT = 1 / SIM_HZ;
var SNAPSHOT_INTERVAL_TICKS = SIM_HZ / SNAPSHOT_HZ; // 3
var MAX_INPUT_PER_SEC = 90;
var SKEW_TICKS = SIM_HZ * 2; // +/-2s skew window
var MAX_SPEED = 6; // world units/sec, server-enforced
var MAX_MOVE_MAG = 1; // input vector magnitude cap
var TELEPORT_DIST = MAX_SPEED * 0.25; // max legit per-tick displacement
var BUTTON_MASK = 0xff;
var TAU = Math.PI * 2;

function isFiniteNumber(n) {
  return typeof n === 'number' && isFinite(n);
}

function clamp(v, lo, hi) {
  if (!isFiniteNumber(v)) return 0;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function normAngle(a) {
  if (!isFiniteNumber(a)) return 0;
  var r = a % TAU;
  if (r > Math.PI) r -= TAU;
  if (r < -Math.PI) r += TAU;
  return r;
}

/* Clamp a raw intent to the legal range. Pure, never throws. */
function clampIntent(frame) {
  var f = (frame && typeof frame === 'object') ? frame : {};
  var mx = clamp(Number(f.moveX), -1, 1);
  var my = clamp(Number(f.moveY), -1, 1);
  var mag = Math.sqrt(mx * mx + my * my);
  if (mag > MAX_MOVE_MAG && mag > 0) {
    mx /= mag;
    my /= mag;
  }
  var buttons = Number(f.buttons);
  if (!isFiniteNumber(buttons)) buttons = 0;
  buttons = Math.floor(buttons) & BUTTON_MASK;
  return {
    sequence: Math.floor(Number(f.sequence)) || 0,
    clientTick: Math.floor(Number(f.clientTick)) || 0,
    moveX: mx,
    moveY: my,
    aimAngle: normAngle(Number(f.aimAngle)),
    buttons: buttons
  };
}

/* JSON-safe encode of one InputFrame. Returns a fresh plain object. */
function encodeInput(frame) {
  var c = clampIntent(frame);
  return {
    t: 'in',
    sequence: c.sequence,
    clientTick: c.clientTick,
    moveX: Math.round(c.moveX * 1000) / 1000,
    moveY: Math.round(c.moveY * 1000) / 1000,
    aimAngle: Math.round(c.aimAngle * 1000) / 1000,
    buttons: c.buttons
  };
}

/* Normalize an inbound snapshot (delta or full baseline). Never throws. */
function decodeSnapshot(msg) {
  if (!msg || typeof msg !== 'object') return { ok: false, reason: 'bad-shape' };
  var type = String(msg.t || msg.type || '');
  var isFull = type === 'full' || type === 'baseline';
  var isDelta = type === 'snap' || type === 'delta';
  if (!isFull && !isDelta) return { ok: false, reason: 'bad-type' };
  var tick = Math.floor(Number(msg.tick)) || 0;
  var baseTick = Math.floor(Number(msg.baseTick != null ? msg.baseTick : tick)) || 0;
  var entities = msg.entities && typeof msg.entities === 'object' ? msg.entities : {};
  var events = Array.isArray(msg.events) ? msg.events : [];
  var removed = Array.isArray(msg.removed) ? msg.removed : [];
  return {
    ok: true,
    type: isFull ? 'full' : 'delta',
    tick: tick,
    baseTick: baseTick,
    entities: entities,
    removed: removed,
    events: events,
    eventSeq: Math.floor(Number(msg.eventSeq)) || 0
  };
}

/*
 * Validate one inbound input. ctx: { lastSeq, serverTick, nowMs,
 * recentMs: number[] (arrival timestamps for rate check) }.
 * Returns { ok, reason?, frame (clamped), drop? }.
 * Checks: seq monotonic, skew +/-2s, NaN clamped, rate <=90/s,
 * speed/teleport clamp on the move vector.
 */
function validateInput(raw, ctx) {
  var c = (ctx && typeof ctx === 'object') ? ctx : {};
  var frame = clampIntent(raw);
  var lastSeq = Math.floor(Number(c.lastSeq)) || 0;
  if (!(frame.sequence > lastSeq)) {
    return { ok: false, reason: 'seq-not-monotonic', frame: frame };
  }
  var serverTick = Math.floor(Number(c.serverTick)) || 0;
  var skew = frame.clientTick - serverTick;
  if (skew > SKEW_TICKS || skew < -SKEW_TICKS) {
    return { ok: false, reason: 'tick-skew', frame: frame };
  }
  var nowMs = Number(c.nowMs);
  if (!isFiniteNumber(nowMs)) nowMs = Date.now();
  var recent = Array.isArray(c.recentMs) ? c.recentMs : [];
  var windowStart = nowMs - 1000;
  var count = 0;
  for (var i = 0; i < recent.length; i++) {
    if (recent[i] >= windowStart) count++;
  }
  if (count >= MAX_INPUT_PER_SEC) {
    return { ok: false, reason: 'rate-limit', frame: frame };
  }
  // Speed/teleport clamp: intents carry no positions, so enforce the
  // vector cap here (already done in clampIntent) and flag absurd slew.
  var mag = Math.sqrt(frame.moveX * frame.moveX + frame.moveY * frame.moveY);
  if (!(mag <= MAX_MOVE_MAG + 1e-6)) {
    return { ok: false, reason: 'speed-clamp', frame: frame };
  }
  return { ok: true, frame: frame };
}

/* Build a delta snapshot vs prev entity map. Pure helper for Room. */
function diffEntities(prev, curr) {
  var out = {};
  var c = curr || {};
  var p = prev || {};
  for (var id in c) {
    if (!Object.prototype.hasOwnProperty.call(c, id)) continue;
    var a = c[id];
    var b = p[id];
    if (!b || JSON.stringify(a) !== JSON.stringify(b)) out[id] = a;
  }
  return out;
}

function collectRemoved(prev, curr) {
  var out = [];
  var p = prev || {};
  var c = curr || {};
  for (var id in p) {
    if (Object.prototype.hasOwnProperty.call(p, id) && !Object.prototype.hasOwnProperty.call(c, id)) out.push(id);
  }
  return out;
}

var api = {
  SIM_HZ: SIM_HZ,
  SNAPSHOT_HZ: SNAPSHOT_HZ,
  SIM_DT: SIM_DT,
  SNAPSHOT_INTERVAL_TICKS: SNAPSHOT_INTERVAL_TICKS,
  MAX_INPUT_PER_SEC: MAX_INPUT_PER_SEC,
  SKEW_TICKS: SKEW_TICKS,
  MAX_SPEED: MAX_SPEED,
  TELEPORT_DIST: TELEPORT_DIST,
  BUTTON_MASK: BUTTON_MASK,
  encodeInput: encodeInput,
  decodeSnapshot: decodeSnapshot,
  validateInput: validateInput,
  clampIntent: clampIntent,
  diffEntities: diffEntities,
  collectRemoved: collectRemoved,
  normAngle: normAngle
};

if (typeof module !== 'undefined' && module.exports) module.exports = api;
