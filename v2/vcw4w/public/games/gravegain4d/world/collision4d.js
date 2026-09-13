/* GraveGain4D 4D collision: hyper-walls, anchors, ana/kata gates, cup capture.
 * Vanilla IIFE. Exposes window.GraveGain4DCollision (created here) and also
 * wires itself onto window.GraveGain4DWorld.Collision when that exists.
 * Original code. All helpers are fail-open: bad inputs yield safe defaults.
 */
(function () {
  'use strict';

  var ROOT = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  if (ROOT.GraveGain4DCollision && ROOT.GraveGain4DCollision.collisionVersion === '4d-collision-1') return;

  var GATE_HALF = 6;      // ana/kata gate corridor half-width in x/z
  var CAPTURE_R = 2.2;    // default putt-into-hole capture radius
  var BALL_R = 0.6;       // default ball radius

  function toFinite(v, fb) {
    var f = (typeof fb === 'number' && isFinite(fb)) ? fb : 0;
    var n = (typeof v === 'number') ? v : parseFloat(v);
    return isFinite(n) ? n : f;
  }

  function num(v, fb) { return toFinite(v, fb); }

  function asVec(p) {
    if (!p || typeof p !== 'object') return { x: 0, y: 0, z: 0, w: 0 };
    return { x: num(p.x, 0), y: num(p.y, 0), z: num(p.z, 0), w: num(p.w, 0) };
  }

  function dist4(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z, dw = a.w - b.w;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  }

  function insideBounds(p, b) {
    if (!b || !b.min || !b.max) return true;
    return p.x >= b.min.x && p.x <= b.max.x &&
           p.z >= b.min.z && p.z <= b.max.z &&
           p.w >= b.min.w && p.w <= b.max.w;
  }

  function clampW(p, wSpan) {
    var v = asVec(p);
    var span = Math.abs(num(wSpan, 24));
    if (span <= 0) span = 24;
    if (v.w < -span) v.w = -span;
    if (v.w > span) v.w = span;
    return v;
  }

  function findCell(floor, p) {
    if (!floor || !floor.cells) return null;
    for (var i = 0; i < floor.cells.length; i++) {
      var c = floor.cells[i];
      if (c && c.bounds4 && insideBounds(p, c.bounds4)) return c;
    }
    return null;
  }

  // Circle (ball) vs hyper-walls + grave-hole anchors. Returns
  // { hit, nx, nz, nw, cell, anchor } — resolution normal in x/z/w.
  function collideCircle4D(pos, radius, floor) {
    var p = asVec(pos);
    var r = Math.abs(num(radius, BALL_R));
    if (!(r > 0)) r = BALL_R;
    var out = { hit: false, nx: 0, nz: 0, nw: 0, cell: null, anchor: null };
    if (!floor || !floor.cells) return out;
    var cell = findCell(floor, p);
    if (!cell) {
      // Outside every cell: push back toward the tee cell centre.
      var home = (floor.cells[0] && floor.cells[0].centre) ? asVec(floor.cells[0].centre) : { x: 0, y: 0, z: 0, w: 0 };
      var dx = p.x - home.x, dz = p.z - home.z, dw = p.w - home.w;
      var len = Math.sqrt(dx * dx + dz * dz + dw * dw) || 1;
      out.hit = true;
      out.nx = -dx / len; out.nz = -dz / len; out.nw = -dw / len;
      return out;
    }
    out.cell = cell.id;
    var b = cell.bounds4;
    if (!b || !b.min || !b.max) return out;
    // Anchors are solid except for the cup capture (handled by puttIntoHole).
    if (cell.anchor && cell.anchor.pos) {
      var ap = asVec(cell.anchor.pos);
      var d = dist4(p, ap);
      var cap = num(cell.anchor.captureRadius, CAPTURE_R);
      if (d < r + 1.2 && d >= cap) {
        var ax = p.x - ap.x, az = p.z - ap.z, aw = p.w - ap.w;
        var al = Math.sqrt(ax * ax + az * az + aw * aw) || 1;
        out.hit = true;
        out.anchor = cell.id;
        out.nx = ax / al; out.nz = az / al; out.nw = aw / al;
        return out;
      }
    }
    // Hyper-wall pushback per axis (x/z/w). y is cosmetic (ball height).
    var push = { x: 0, z: 0, w: 0 };
    if (p.x - r < b.min.x) push.x = 1;
    else if (p.x + r > b.max.x) push.x = -1;
    if (p.z - r < b.min.z) push.z = 1;
    else if (p.z + r > b.max.z) push.z = -1;
    if (p.w - r < b.min.w) push.w = 1;
    else if (p.w + r > b.max.w) push.w = -1;
    if (push.x || push.z || push.w) {
      out.hit = true;
      out.nx = push.x; out.nz = push.z; out.nw = push.w;
    }
    return out;
  }

  // Ana/kata gate check: crossing the w=0 plane between slabs is only
  // legal inside the gate corridor (|x|,|z| <= GATE_HALF). Returns
  // { ok, reason } and never throws.
  function gateCheck(fromPos, toPos) {
    var a = asVec(fromPos), b = asVec(toPos);
    var crossed = (a.w < 0 && b.w >= 0) || (a.w >= 0 && b.w < 0);
    if (!crossed) return { ok: true, reason: 'same-slab' };
    var mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    if (Math.abs(mx) <= GATE_HALF && Math.abs(mz) <= GATE_HALF) {
      return { ok: true, reason: 'gate' };
    }
    return { ok: false, reason: 'wall-between-slabs' };
  }

  // Putt-into-hole capture: true when the ball centre is within the
  // anchor capture radius (defaults to the anchor's own radius).
  function puttIntoHole(ballPos, anchor, radiusOverride) {
    var p = asVec(ballPos);
    if (!anchor || !anchor.pos) return false;
    var ap = asVec(anchor.pos);
    var cap = num(radiusOverride, num(anchor.captureRadius, CAPTURE_R));
    if (!(cap > 0)) cap = CAPTURE_R;
    return dist4(p, ap) <= cap;
  }

  var api = {
    GATE_HALF: GATE_HALF,
    CAPTURE_R: CAPTURE_R,
    BALL_R: BALL_R,
    collideCircle4D: collideCircle4D,
    gateCheck: gateCheck,
    puttIntoHole: puttIntoHole,
    clampW: clampW,
    findCell: findCell,
    collisionVersion: '4d-collision-1'
  };

  ROOT.GraveGain4DCollision = api;
  try {
    if (ROOT.GraveGain4DWorld && !ROOT.GraveGain4DWorld.Collision) {
      ROOT.GraveGain4DWorld.Collision = api;
    }
  } catch (e) { /* fail-open */ }
  return api;
})();
