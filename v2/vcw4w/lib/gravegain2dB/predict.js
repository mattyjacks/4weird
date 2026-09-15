'use strict';
/* GraveGain2dB client prediction + reconcile + interp (authoritative rooms).
 *
 * Local client simulates its own intent at 60Hz for responsiveness, then
 * reconciles against 20Hz authoritative snapshots: drops acked inputs,
 * re-applies unacked ones (reconcile), and interpolates remote entities
 * between snapshots (interp, 100ms buffer). Server state always wins.
 *
 * ASCII-only, dependency-free. CommonJS + browser compatible.
 */

var SIM_DT = 1 / 60;
var SPEED = 6;
var INTERP_DELAY_MS = 100;

function cloneEntity(e) {
  if (!e || typeof e !== 'object') return { x: 0, y: 0, aim: 0 };
  return {
    x: typeof e.x === 'number' && isFinite(e.x) ? e.x : 0,
    y: typeof e.y === 'number' && isFinite(e.y) ? e.y : 0,
    aim: typeof e.aim === 'number' && isFinite(e.aim) ? e.aim : 0,
    hp: typeof e.hp === 'number' ? e.hp : 100
  };
}

function stepEntity(ent, input, dt) {
  var step = dt == null ? SIM_DT : dt;
  var mx = input && typeof input.moveX === 'number' ? input.moveX : 0;
  var my = input && typeof input.moveY === 'number' ? input.moveY : 0;
  if (!isFinite(mx)) mx = 0;
  if (!isFinite(my)) my = 0;
  var mag = Math.sqrt(mx * mx + my * my);
  if (mag > 1 && mag > 0) { mx /= mag; my /= mag; }
  ent.x += mx * SPEED * step;
  ent.y += my * SPEED * step;
  if (input && typeof input.aimAngle === 'number' && isFinite(input.aimAngle)) ent.aim = input.aimAngle;
  return ent;
}

function createPredictor(opts) {
  var o = opts || {};
  var selfId = String(o.selfId || 'me');
  var local = cloneEntity(o.initial);
  var serverState = {}; // id -> entity (authoritative, interpolated for remotes)
  var pending = []; // unacked local inputs { sequence, input }
  var lastAck = 0;
  var lastServerTick = 0;
  var remoteBuf = {}; // id -> [{ tick, x, y, aim, atMs }]
  var nowFn = typeof o.now === 'function' ? o.now : function () { return Date.now(); };

  function pushInput(input) {
    var seq = Math.floor(Number(input && input.sequence)) || (lastAck + pending.length + 1);
    var frame = {
      sequence: seq,
      clientTick: Math.floor(Number(input && input.clientTick)) || 0,
      moveX: Number(input && input.moveX) || 0,
      moveY: Number(input && input.moveY) || 0,
      aimAngle: Number(input && input.aimAngle) || 0,
      buttons: (Math.floor(Number(input && input.buttons)) || 0) & 0xff
    };
    pending.push({ sequence: seq, input: frame });
    if (pending.length > 240) pending.splice(0, pending.length - 240);
    stepEntity(local, frame, SIM_DT);
    return frame;
  }

  /* Reconcile: apply full/delta snapshot, drop acked, replay unacked. */
  function reconcile(snap) {
    if (!snap || typeof snap !== 'object') return local;
    if (typeof snap.tick === 'number') lastServerTick = snap.tick;
    var ents = snap.entities || {};
    for (var id in ents) {
      if (!Object.prototype.hasOwnProperty.call(ents, id)) continue;
      var e = cloneEntity(ents[id]);
      serverState[id] = e;
      if (id === selfId) {
        local = cloneEntity(e);
      } else {
        var buf = remoteBuf[id] || (remoteBuf[id] = []);
        buf.push({ tick: lastServerTick, x: e.x, y: e.y, aim: e.aim, atMs: nowFn() });
        if (buf.length > 12) buf.splice(0, buf.length - 12);
      }
    }
    var removed = snap.removed || [];
    for (var r = 0; r < removed.length; r++) {
      delete serverState[removed[r]];
      delete remoteBuf[removed[r]];
    }
    var ack = Math.floor(Number(snap.ack)) || lastAck;
    if (ack > lastAck) lastAck = ack;
    var kept = [];
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].sequence > lastAck) kept.push(pending[i]);
    }
    pending = kept;
    for (var k = 0; k < pending.length; k++) stepEntity(local, pending[k].input, SIM_DT);
    return local;
  }

  /* Interpolated render state: predicted self + delayed remotes. */
  function getRenderState() {
    var atMs = nowFn();
    var renderAt = atMs - INTERP_DELAY_MS;
    var out = {};
    for (var id in serverState) {
      if (!Object.prototype.hasOwnProperty.call(serverState, id)) continue;
      if (id === selfId) {
        out[id] = cloneEntity(local);
        continue;
      }
      out[id] = interpRemote(id, renderAt);
    }
    if (!out[selfId]) out[selfId] = cloneEntity(local);
    return out;
  }

  function interpRemote(id, renderAt) {
    var buf = remoteBuf[id];
    var cur = serverState[id];
    if (!buf || buf.length === 0 || !cur) return cloneEntity(cur);
    var a = buf[0];
    var b = null;
    for (var i = 0; i < buf.length; i++) {
      if (buf[i].atMs <= renderAt) a = buf[i];
      else { b = buf[i]; break; }
    }
    if (!b) return cloneEntity(a);
    var span = b.atMs - a.atMs;
    var t = span > 0 ? (renderAt - a.atMs) / span : 1;
    if (!(t >= 0 && t <= 1)) t = t < 0 ? 0 : 1;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      aim: a.aim + (b.aim - a.aim) * t,
      hp: typeof b.hp === 'number' ? b.hp : (typeof a.hp === 'number' ? a.hp : 100)
    };
  }

  return {
    selfId: selfId,
    pushInput: pushInput,
    reconcile: reconcile,
    getRenderState: getRenderState,
    getLocal: function () { return cloneEntity(local); },
    getPendingCount: function () { return pending.length; },
    getLastAck: function () { return lastAck; },
    getLastServerTick: function () { return lastServerTick; }
  };
}

var api = { createPredictor: createPredictor, stepEntity: stepEntity, INTERP_DELAY_MS: INTERP_DELAY_MS };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
