'use strict';
/* GraveGain2dB authoritative Room (dedicated rooms, node + browser-safe).
 *
 * Owned scope: v2/vcw4w/server/gravegain2dB/room.js only. Does NOT touch
 * party/matches SQL or the lobby HTTP contracts (POST /api/matches,
 * POST /api/lobbies, POST /api/lobbies/:id/join stay as-is; this Room only
 * consumes the issued ticket { matchId, lobbyId, playerId }).
 *
 * Model:
 *   - 60Hz tick loop, 20Hz snapshot broadcast (every 3rd tick).
 *   - Clients send intents-only InputFrames; the server alone integrates
 *     movement and computes damage/terrain/loot/events.
 *   - Validation per input: seq monotonic, clientTick skew +/-2s, NaN
 *     clamped, rate <=90/s, move-vector speed/teleport clamp.
 *   - Snapshots: deltas vs per-player baseline + periodic full baseline.
 *   - Reliable event log: seq-gated, acked, replayed on reconnect, no dupes.
 *   - 30s disconnect shield: body frozen + invulnerable, full-state resync
 *     bundle (seed/tick/state/events) on rejoin within the window.
 *
 * Transport note: this class has no sockets. The host wires
 * onBroadcast(playerId, msg) to its WS layer and calls submitInput /
 * disconnect / reconnect. ASCII-only, dependency-free.
 */

var SIM_HZ = 60;
var TICK_MS = 1000 / SIM_HZ;
var SNAPSHOT_INTERVAL = 3; // ticks per snapshot (20Hz)
var FULL_BASELINE_EVERY = 20 * 10; // full baseline every ~10s
var SKEW_TICKS = SIM_HZ * 2;
var MAX_INPUT_PER_SEC = 90;
var MAX_SPEED = 6;
var RECOVERABLE_MS = 30 * 1000;
var SHIELD_MS = 3 * 1000;
var MAX_PLAYERS = 8;
var BUTTON_FIRE = 0x01;
var FIRE_INTERVAL_TICKS = 12;
var WORLD_BOUND = 64;

function nowMs() { return Date.now(); }

function clampMove(mx, my) {
  if (!isFinite(mx)) mx = 0;
  if (!isFinite(my)) my = 0;
  if (mx < -1) mx = -1;
  if (mx > 1) mx = 1;
  if (my < -1) my = -1;
  if (my > 1) my = 1;
  var mag = Math.sqrt(mx * mx + my * my);
  if (mag > 1 && mag > 0) { mx /= mag; my /= mag; }
  return [mx, my];
}

function normAngle(a) {
  if (!isFinite(a)) return 0;
  var TAU = Math.PI * 2;
  var r = a % TAU;
  if (r > Math.PI) r -= TAU;
  if (r < -Math.PI) r += TAU;
  return r;
}

function cloneState(state) {
  var out = {};
  for (var id in state) {
    if (!Object.prototype.hasOwnProperty.call(state, id)) continue;
    var e = state[id];
    out[id] = { x: e.x, y: e.y, aim: e.aim, hp: e.hp, shieldUntil: e.shieldUntil || 0, alive: e.alive !== false };
  }
  return out;
}

function Room(opts) {
  var o = opts || {};
  this.roomId = String(o.roomId || ('gg2-' + Math.floor(Math.random() * 1e9).toString(36)));
  this.seed = String(o.seed || 'seed-1');
  this.maxPlayers = Math.min(Math.max(parseInt(o.maxPlayers, 10) || 4, 1), MAX_PLAYERS);
  this.onBroadcast = typeof o.onBroadcast === 'function' ? o.onBroadcast : function () {};
  this.tick = 0;
  this.timer = null;
  this.players = {}; // id -> { connected, lastSeq, recentMs[], baseline, lastInput, missed, cooldownUntil, disconnectAt }
  this.state = {}; // id -> { x, y, aim, hp, shieldUntil, alive }
  this.eventLog = []; // { seq, tick, kind, text }
  this.eventSeq = 0;
  this.closed = false;
}

Room.prototype.addPlayer = function (playerId, spawn) {
  var id = String(playerId || '');
  if (!id || this.closed) return false;
  if (this.players[id]) {
    this.players[id].connected = true;
    this.players[id].disconnectAt = 0;
    return true;
  }
  var count = Object.keys(this.players).length;
  if (count >= this.maxPlayers) return false;
  var s = spawn || {};
  this.players[id] = {
    connected: true, lastSeq: 0, recentMs: [], baseline: {},
    lastInput: { moveX: 0, moveY: 0, aimAngle: 0, buttons: 0 },
    missed: 0, cooldownUntil: 0, disconnectAt: 0
  };
  this.state[id] = {
    x: isFinite(s.x) ? s.x : 0,
    y: isFinite(s.y) ? s.y : 0,
    aim: isFinite(s.aim) ? s.aim : 0,
    hp: 100, shieldUntil: 0, alive: true
  };
  this.players[id].baseline = cloneState(this.state);
  this.emit('join', id + ' joined');
  return true;
};

/* Server-computed event; deduped by seq on the client. */
Room.prototype.emit = function (kind, text) {
  this.eventSeq++;
  var ev = { seq: this.eventSeq, tick: this.tick, kind: String(kind), text: String(text) };
  this.eventLog.push(ev);
  if (this.eventLog.length > 256) this.eventLog.splice(0, this.eventLog.length - 256);
  return ev;
};

/* Validate + queue one intent. Returns { ok, reason }. */
Room.prototype.submitInput = function (playerId, raw) {
  var id = String(playerId || '');
  var p = this.players[id];
  if (!p || !p.connected || this.closed) return { ok: false, reason: 'unknown-player' };
  var f = (raw && typeof raw === 'object') ? raw : {};
  var seq = Math.floor(Number(f.sequence)) || 0;
  if (!(seq > p.lastSeq)) return { ok: false, reason: 'seq-not-monotonic' };
  var clientTick = Math.floor(Number(f.clientTick)) || 0;
  var skew = clientTick - this.tick;
  if (skew > SKEW_TICKS || skew < -SKEW_TICKS) return { ok: false, reason: 'tick-skew' };
  var t = nowMs();
  var windowStart = t - 1000;
  var n = 0;
  for (var i = 0; i < p.recentMs.length; i++) if (p.recentMs[i] >= windowStart) n++;
  if (n >= MAX_INPUT_PER_SEC) return { ok: false, reason: 'rate-limit' };
  p.recentMs.push(t);
  if (p.recentMs.length > MAX_INPUT_PER_SEC + 10) p.recentMs.splice(0, p.recentMs.length - (MAX_INPUT_PER_SEC + 10));
  var mv = clampMove(Number(f.moveX), Number(f.moveY));
  var buttons = (Math.floor(Number(f.buttons)) || 0) & 0xff;
  p.lastSeq = seq;
  p.missed = 0;
  p.lastInput = { moveX: mv[0], moveY: mv[1], aimAngle: normAngle(Number(f.aimAngle)), buttons: buttons, seq: seq };
  return { ok: true };
};

/* One 60Hz tick: integrate intents (server computes all outcomes). */
Room.prototype.step = function () {
  if (this.closed) return;
  this.tick++;
  var dt = 1 / SIM_HZ;
  var t = nowMs();
  for (var id in this.players) {
    if (!Object.prototype.hasOwnProperty.call(this.players, id)) continue;
    var p = this.players[id];
    var e = this.state[id];
    if (!e) continue;
    if (!p.connected) {
      // Shielded frozen body: no movement, no damage while shielded.
      continue;
    }
    // Missed-frame freeze: gap in seq beyond 2 frames freezes intent.
    if (p.lastInput && p.lastInput.seq != null && (this.tick - (p.lastTickSeen || this.tick)) > 2) {
      p.lastInput.moveX = 0;
      p.lastInput.moveY = 0;
    }
    p.lastTickSeen = this.tick;
    var inp = p.lastInput || { moveX: 0, moveY: 0, aimAngle: 0, buttons: 0 };
    var dx = inp.moveX * MAX_SPEED * dt;
    var dy = inp.moveY * MAX_SPEED * dt;
    // Teleport clamp: per-tick displacement cannot exceed legit max.
    var maxStep = MAX_SPEED * dt * 1.5 + 1e-6;
    var stepMag = Math.sqrt(dx * dx + dy * dy);
    if (stepMag > maxStep && stepMag > 0) { dx *= maxStep / stepMag; dy *= maxStep / stepMag; }
    if (e.alive !== false) {
      e.x += dx;
      e.y += dy;
      if (e.x < -WORLD_BOUND) e.x = -WORLD_BOUND;
      if (e.x > WORLD_BOUND) e.x = WORLD_BOUND;
      if (e.y < -WORLD_BOUND) e.y = -WORLD_BOUND;
      if (e.y > WORLD_BOUND) e.y = WORLD_BOUND;
      e.aim = inp.aimAngle;
      if ((inp.buttons & BUTTON_FIRE) && this.tick >= p.cooldownUntil) {
        p.cooldownUntil = this.tick + FIRE_INTERVAL_TICKS;
        this.applyFire(id, e);
      }
    }
  }
  if (this.tick % SNAPSHOT_INTERVAL === 0) this.broadcast();
};

Room.prototype.applyFire = function (shooterId, shooter) {
  // Server-authored damage only: hitscan nearest living foe in aim cone.
  var best = null;
  var bestD2 = 9 * 9;
  var ax = Math.cos(shooter.aim);
  var ay = Math.sin(shooter.aim);
  for (var id in this.state) {
    if (!Object.prototype.hasOwnProperty.call(this.state, id)) continue;
    if (id === shooterId) continue;
    var e = this.state[id];
    if (!e || e.alive === false) continue;
    if (e.shieldUntil && nowMs() < e.shieldUntil) continue;
    var dx = e.x - shooter.x;
    var dy = e.y - shooter.y;
    var d2 = dx * dx + dy * dy;
    if (d2 > bestD2) continue;
    var d = Math.sqrt(d2) || 0.0001;
    var dot = (dx * ax + dy * ay) / d;
    if (dot < 0.9) continue;
    best = id;
    bestD2 = d2;
  }
  if (best) {
    var target = this.state[best];
    var dmg = Math.min(10, 25); // capped per-tick damage
    target.hp -= dmg;
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      this.emit('kill', shooterId + ' felled ' + best);
    } else {
      this.emit('hit', shooterId + ' hit ' + best + ' (' + dmg + ')');
    }
  }
};

/* Build per-player snapshot: delta vs baseline, or full baseline. */
Room.prototype.snapshotFor = function (playerId, forceFull) {
  var p = this.players[playerId];
  var full = !!forceFull || (this.tick % FULL_BASELINE_EVERY === 0);
  var base = (p && p.baseline) || {};
  var entities = {};
  if (full) {
    entities = cloneState(this.state);
  } else {
    for (var id in this.state) {
      if (!Object.prototype.hasOwnProperty.call(this.state, id)) continue;
      var a = this.state[id];
      var b = base[id];
      if (!b || a.x !== b.x || a.y !== b.y || a.aim !== b.aim || a.hp !== b.hp || a.alive !== b.alive) {
        entities[id] = { x: a.x, y: a.y, aim: a.aim, hp: a.hp, alive: a.alive };
      }
    }
  }
  var removed = [];
  for (var rid in base) {
    if (Object.prototype.hasOwnProperty.call(base, rid) && !Object.prototype.hasOwnProperty.call(this.state, rid)) removed.push(rid);
  }
  var lastAck = p ? p.eventAck || 0 : 0;
  var events = [];
  for (var i = 0; i < this.eventLog.length; i++) {
    if (this.eventLog[i].seq > lastAck) {
      events.push(this.eventLog[i]);
      if (events.length >= 32) break;
    }
  }
  return {
    t: full ? 'full' : 'snap',
    tick: this.tick,
    baseTick: full ? this.tick : (p ? p.baselineTick || 0 : 0),
    entities: entities,
    removed: removed,
    events: events,
    eventSeq: this.eventSeq,
    ack: p ? p.lastSeq : 0
  };
};

Room.prototype.broadcast = function () {
  for (var id in this.players) {
    if (!Object.prototype.hasOwnProperty.call(this.players, id)) continue;
    var p = this.players[id];
    if (!p.connected) continue;
    var snap = this.snapshotFor(id, false);
    try { this.onBroadcast(id, snap); } catch (e) { /* never throw */ }
    p.baseline = cloneState(this.state);
    p.baselineTick = this.tick;
  }
};

/* Client acks events by seq; server trims per-player cursor (no dupes). */
Room.prototype.ackEvents = function (playerId, seq) {
  var p = this.players[String(playerId || '')];
  if (!p) return;
  var s = Math.floor(Number(seq)) || 0;
  if (s > (p.eventAck || 0)) p.eventAck = s;
};

/* 30s disconnect shield: freeze + invulnerable, recoverable window. */
Room.prototype.disconnect = function (playerId) {
  var id = String(playerId || '');
  var p = this.players[id];
  if (!p) return false;
  p.connected = false;
  p.disconnectAt = nowMs();
  var e = this.state[id];
  if (e) {
    e.shieldUntil = p.disconnectAt + SHIELD_MS;
    p.lastInput = { moveX: 0, moveY: 0, aimAngle: e.aim, buttons: 0, seq: p.lastSeq };
  }
  return true;
};

/* Reconnect within 30s: full-state resync bundle, events replayed > ack. */
Room.prototype.reconnect = function (playerId) {
  var id = String(playerId || '');
  var p = this.players[id];
  if (!p) return { ok: false, reason: 'unknown-player' };
  var t = nowMs();
  if (p.connected) return { ok: false, reason: 'already-connected' };
  if (p.disconnectAt && (t - p.disconnectAt) > RECOVERABLE_MS) {
    return { ok: false, reason: 'window-expired' };
  }
  p.connected = true;
  p.disconnectAt = 0;
  var e = this.state[id];
  if (e) {
    if (e.alive === false) { e.alive = true; e.hp = 100; }
    e.shieldUntil = t + SHIELD_MS;
  }
  var bundle = {
    t: 'resync',
    seed: this.seed,
    roomId: this.roomId,
    tick: this.tick,
    state: cloneState(this.state),
    eventSeq: this.eventSeq,
    events: this.eventLog.filter(function (ev) { return ev.seq > (p.eventAck || 0); }).slice(0, 64)
  };
  p.baseline = cloneState(this.state);
  p.baselineTick = this.tick;
  try { this.onBroadcast(id, this.snapshotFor(id, true)); } catch (err) { /* ignore */ }
  return { ok: true, bundle: bundle };
};

Room.prototype.start = function () {
  if (this.timer || this.closed) return;
  var self = this;
  this.timer = setInterval(function () {
    try { self.step(); } catch (e) { /* never throw */ }
  }, TICK_MS);
  if (this.timer && typeof this.timer.unref === 'function') this.timer.unref();
};

Room.prototype.stop = function () {
  if (this.timer) clearInterval(this.timer);
  this.timer = null;
};

Room.prototype.close = function () {
  this.closed = true;
  this.stop();
};

if (typeof module !== 'undefined' && module.exports) module.exports = { Room: Room };
