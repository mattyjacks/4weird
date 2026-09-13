/* GraveGain2D 2.5D look layer (G4 lane, agent A4) v1.0.0.
 *
 * What: fake depth for the 2D canvas — ground shadows + height glow on live
 * particle spawns, torch-flicker lighting modulation, CSS vignette on
 * high/ultra presets, and a y-depth darkening helper.
 * Same graphics for every age band: NO gore/mode logic here
 * (gore-gravegain2d.js owns that). Vanilla, idempotent, no dependencies,
 * no input listeners, no fetch/eval. Overlays are pointer-events:none.
 */
(function () {
'use strict';
if (window.GraveGain25D) return;

var VERSION = '1.0.0';
var POLL_MAX = 20;
var POLL_MS = 1000;
var SHADOW_DY = 14;

var state = { active: false, rafId: 0, pollId: 0, tries: 0, tick: 0 };

/* y-depth darkening: y=0 -> 1.0 (near/full bright), y=600 -> 0.75 (far). */
function shadeByY(y) {
  try {
    var n = Number(y);
    if (!isFinite(n)) return 1.0;
    if (n < 0) n = 0;
    if (n > 600) n = 600;
    return 1.0 - 0.25 * (n / 600);
  } catch (e) { return 1.0; }
}

function readPreset() {
  try {
    var p = document.documentElement.getAttribute('data-fourweird-graphics');
    return p || 'balanced';
  } catch (e) { return 'balanced'; }
}

function vignetteOn() {
  try {
    var p = readPreset();
    return p === 'high' || p === 'ultra';
  } catch (e) { return false; }
}

function removeVignette() {
  try {
    var d = document.getElementById('gg25dVignette');
    if (d && d.parentNode) d.parentNode.removeChild(d);
  } catch (e) { /* ignore */ }
}

function ensureVignette() {
  try {
    if (!vignetteOn()) { removeVignette(); return; }
    if (document.getElementById('gg25dVignette')) return;
    var d = document.createElement('div');
    d.id = 'gg25dVignette';
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30;' +
      'background:radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(0,0,0,0.42) 100%);';
    document.body.appendChild(d);
  } catch (e) { /* ignore */ }
}

/* Append-only into the engine's own pools (renderer/camera/caps reused).
 * Direct array pushes only — never calls spawn fns, so composite VFX
 * (spawnShieldVFX etc., which route through the wrapped base fns) cannot
 * recurse. Shadow = dark ground decal; glow = short rising warm spark. */
function addShadowGlow(vfx, x, y) {
  try {
    var nx = Number(x), ny = Number(y);
    if (!isFinite(nx) || !isFinite(ny)) return;
    try {
      if (vfx.bloodSplats && vfx.bloodSplats.length < (vfx.maxSplats || 200)) {
        vfx.bloodSplats.push({ x: nx, y: ny + SHADOW_DY, radius: 11, color: 'rgba(0,0,0,0.28)', gg25d: true });
      }
    } catch (e) { /* ignore */ }
    try {
      if (vfx.sparks && vfx.sparks.length < 300) {
        vfx.sparks.push({ x: nx, y: ny - 6, vx: (Math.random() * 40 - 20),
          vy: -60 - Math.random() * 50, color: 'rgba(255,238,200,0.85)', life: 0.35 });
      }
    } catch (e) { /* ignore */ }
  } catch (e) { /* ignore */ }
}

function wrapVfx(vfx) {
  try {
    if (!vfx || window.__gg25dWrapped) return;
    var names = ['spawnBlood', 'spawnGore', 'spawnSparks', 'spawnRing'];
    for (var i = 0; i < names.length; i++) {
      (function (name) {
        try {
          var orig = vfx[name];
          if (typeof orig !== 'function' || orig.__gg25d) return;
          var wrapped = function (x, y) {
            try { orig.apply(vfx, arguments); } catch (e) { /* ignore */ }
            try { addShadowGlow(vfx, x, y); } catch (e2) { /* ignore */ }
          };
          wrapped.__gg25d = true;
          vfx[name] = wrapped;
        } catch (e) { /* ignore */ }
      })(names[i]);
    }
    window.__gg25dWrapped = true;
  } catch (e) { /* ignore */ }
}

function stopPoll() {
  try {
    if (state.pollId) { clearInterval(state.pollId); state.pollId = 0; }
  } catch (e) { state.pollId = 0; }
}

function pollGame() {
  try {
    if (state.pollId) return;
    state.tries = 0;
    state.pollId = setInterval(function () {
      try {
        state.tries++;
        var g = window.GraveGainGame;
        if (g && g.vfx) { wrapVfx(g.vfx); stopPoll(); }
        else if (state.tries >= POLL_MAX) { stopPoll(); }
      } catch (e) { /* ignore */ }
    }, POLL_MS);
  } catch (e) { /* ignore */ }
}

function loop(t) {
  if (!state.active) return;
  try {
    if (!document.hidden) {
      state.tick++;
      try {
        var lc = document.getElementById('lightingCanvas');
        if (lc && lc.style) {
          var s = Math.sin(t / 310) * 0.6 + Math.sin(t / 97 + 1.7) * 0.4;
          var o = 0.97 + 0.03 * s;
          if (o < 0.94) o = 0.94;
          if (o > 1.0) o = 1.0;
          lc.style.opacity = o.toFixed(3);
        }
      } catch (e) { /* ignore */ }
      if (state.tick % 120 === 0) { try { ensureVignette(); } catch (e2) { /* ignore */ } }
    }
  } catch (e) { /* ignore */ }
  try { state.rafId = requestAnimationFrame(loop); }
  catch (e) { state.rafId = 0; }
}

function install() {
  try {
    if (state.active) return true;
    state.active = true;
    state.tick = 0;
    try { ensureVignette(); } catch (e) { /* ignore */ }
    try { pollGame(); } catch (e2) { /* ignore */ }
    try {
      if (window.GraveGainGame && window.GraveGainGame.vfx) {
        wrapVfx(window.GraveGainGame.vfx);
        if (window.__gg25dWrapped) stopPoll();
      }
    } catch (e3) { /* ignore */ }
    try { if (!state.rafId) state.rafId = requestAnimationFrame(loop); }
    catch (e4) { /* ignore */ }
    return true;
  } catch (e) { return false; }
}

function uninstall() {
  try { state.active = false; } catch (e) { /* ignore */ }
  try { stopPoll(); } catch (e2) { /* ignore */ }
  try {
    if (state.rafId && window.cancelAnimationFrame) window.cancelAnimationFrame(state.rafId);
  } catch (e3) { /* ignore */ }
  state.rafId = 0;
  try { removeVignette(); } catch (e4) { /* ignore */ }
  try {
    var lc = document.getElementById('lightingCanvas');
    if (lc && lc.style) lc.style.opacity = '';
  } catch (e5) { /* ignore */ }
  /* Wrappers stay installed (no unwrap); window.__gg25dWrapped remains
   * true so a later install() restarts only the loop, never double-wraps. */
  return true;
}

window.GraveGain25D = { VERSION: VERSION, install: install, uninstall: uninstall, shadeByY: shadeByY };

try {
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'gravegain-25d', version: VERSION, init: install });
} catch (e) { /* ignore */ }

})();
