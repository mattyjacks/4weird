/* ============================================================================
 * emoji-art.js — B8 emoji-art layer for GraveGain2dB: Breach MoonRock
 * (slug `gravegain2dB`). Vanilla JS, no imports, idempotent.
 *
 * LAYER ORDER (paint back-to-front, never reorder):
 *   parallax -> static -> destructible -> props -> actors ->
 *   projectiles -> debris -> lighting -> HUD
 *
 * COSMETIC-ONLY CONTRACT: this file may change pixels, particles, shake and
 * emoji — never sim state. Physics / geometry / weapons / rewards are
 * identical across content modes; only defeat/debris/language FX vary:
 *   kid  : 🌫️ poofs + ⭐ stars, playful-gentle. ZERO gore/drugs.
 *   teen : sparks + dust, tense-mild. Blood capped, no gibs/decals.
 *   all  : full grim-uncut gore (adults only; NEVER leaks to kid/teen).
 * Mode source mirrors gravegain-agebands.js:
 *   ?content=kid|teen|all > localStorage "4weird-content-mode:gravegain2dB"
 *   > localStorage "FourweirdContentMode" > window.FourweirdContentMode.mode
 *   > default "teen" (fail-closed: unknown behaves as teen, never adult).
 *
 * PERF BUDGETS: pools for projectile/debris/particle/damage/decals/audio;
 * caps: 40 enemies, 80 projectiles, 250 debris, 20 pickups, 6 collapses.
 * Degrade ladder (cosmetic shed first, NEVER gameplay):
 *   particles -> decals -> anim -> lights
 *   (never collision / input / objectives / net).
 * Exposes window.GraveGain2DB_Art + pushes to window.GraveGainMods.
 * ========================================================================== */
(function () {
'use strict';
if (window.GraveGain2DB_Art) return; // idempotent

var VERSION = '1.0.0-b8';

/* ---- content mode (FX-only; sim must never read this) ---- */
function getMode() {
  try {
    var q = null;
    if (typeof location !== 'undefined' && location.search) {
      var m = /(?:\?|&)content=(kid|teen|all)/i.exec(location.search);
      if (m) q = m[1].toLowerCase();
    }
    if (q) return q;
    var scoped = null;
    try { scoped = localStorage.getItem('4weird-content-mode:gravegain2dB'); } catch (_) {}
    if (scoped && /^(kid|teen|all)$/i.test(scoped)) return scoped.toLowerCase();
    var legacy = null;
    try { legacy = localStorage.getItem('FourweirdContentMode'); } catch (_) {}
    if (legacy) {
      try {
        var o = JSON.parse(legacy);
        if (o && o.mode && /^(kid|teen|all)$/i.test(o.mode)) return o.mode.toLowerCase();
      } catch (_) {
        if (/^(kid|teen|all)$/i.test(String(legacy).trim())) return String(legacy).trim().toLowerCase();
      }
    }
    if (window.FourweirdContentMode && /^(kid|teen|all)$/i.test(String(window.FourweirdContentMode.mode || ''))) {
      return String(window.FourweirdContentMode.mode).toLowerCase();
    }
  } catch (_) {}
  return 'teen'; // fail-closed
}

/* ---- pre-rendered atlas hook + native-emoji fallback ---- */
var atlas = {}; // key -> HTMLCanvasElement (pre-rendered offscreen)
var ATLAS_SIZE = 64;
function atlasKey(emoji, outline) { return emoji + '|' + (outline || ''); }
function getAtlasTile(emoji, outlineColor) {
  var key = atlasKey(emoji, outlineColor);
  if (atlas[key]) return atlas[key];
  try {
    var c = document.createElement('canvas');
    c.width = ATLAS_SIZE; c.height = ATLAS_SIZE;
    var g = c.getContext('2d');
    g.font = '48px "Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (outlineColor) { g.lineWidth = 5; g.strokeStyle = outlineColor; g.strokeText(emoji, 32, 34); }
    g.fillText(emoji, 32, 34);
    atlas[key] = c;
    return c;
  } catch (_) { return null; } // caller falls back to native emoji fillText
}
function drawEmoji(g, emoji, x, y, size, opts) {
  opts = opts || {};
  var tile = getAtlasTile(emoji, opts.outline || null);
  g.save();
  if (opts.alpha !== undefined) g.globalAlpha = opts.alpha;
  if (opts.rotation) { g.translate(x, y); g.rotate(opts.rotation); x = 0; y = 0; }
  // squash & stretch (juice only: sx/sy default 1, never touch hitboxes)
  var sx = opts.sx || 1, sy = opts.sy || 1;
  if (tile) {
    var s = size || ATLAS_SIZE;
    if (opts.rotation) { g.scale(sx, sy); g.drawImage(tile, -s / 2, -s / 2, s, s); }
    else g.drawImage(tile, x - (s * sx) / 2, y - (s * sy) / 2, s * sx, s * sy);
  } else {
    // native-emoji fallback (no atlas available)
    if (opts.rotation) g.scale(sx, sy);
    g.font = (size || 32) + 'px "Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (opts.outline) { g.lineWidth = 4; g.strokeStyle = opts.outline; g.strokeText(emoji, x, y); }
    g.fillText(emoji, x, y);
  }
  g.restore();
}

/* ---- material debris emoji (geometry-identical, skin varies by mode) ---- */
var DEBRIS = {
  root:  { all: ['🪵', '🌿', '🍂'], teen: ['🪵', '🌿'], kid: ['🌿', '🍃', '✨'] },
  stone: { all: ['🪨', '🧱', '⬜'], teen: ['🪨', '⬜'], kid: ['☁️', '🤍', '⭐'] },
  metal: { all: ['⚙️', '🔩', '⛓️'], teen: ['⚙️', '🔩'], kid: ['🫧', '⭐', '🤍'] },
  crystal: { all: ['💎', '🔮', '✨'], teen: ['💎', '✨'], kid: ['💎', '⭐', '🌟'] },
  necro: { all: ['💀', '🟣', '🌫️'], teen: ['🟣', '🌫️'], kid: ['🌫️', '✨', '⭐'] },
  barrier: { all: ['🛡️', '🔷', '✨'], teen: ['🛡️', '✨'], kid: ['🛡️', '⭐', '🤍'] }
};
function debrisFor(material) {
  var mode = getMode();
  var fam = DEBRIS[material] || DEBRIS.stone;
  var list = fam[mode] || fam.teen;
  return list[(Math.random() * list.length) | 0];
}
/* Defeat FX by band: kid poofs/stars, teen sparks/dust, adult full gore. */
var DEFEAT_FX = {
  kid:  ['🌫️', '⭐', '✨', '💫', '☁️'],
  teen: ['💥', '✨', '💨', '🪨', '⚡'],
  all:  ['🩸', '💀', '🦴', '🩸', '💥']
};
function defeatFor() {
  var list = DEFEAT_FX[getMode()] || DEFEAT_FX.teen;
  return list[(Math.random() * list.length) | 0];
}

/* ---- enemy silhouettes + boss large-emoji layered pieces ---- */
var ENEMIES = {
  husk:   { body: '🧟', outline: '#1c2b1c', scale: 1.0 },
  skitter:{ body: '🦂', outline: '#2b1c1c', scale: 0.8 },
  brute:  { body: '👹', outline: '#2b1c2b', scale: 1.4 },
  wisp:   { body: '👻', outline: '#1c1c2b', scale: 0.9 },
  driller:{ body: '🪲', outline: '#2b251c', scale: 1.1 }
};
var BOSS_PIECES = [ // layered large-emoji boss, drawn back-to-front
  { emoji: '🌑', size: 220, dx: 0, dy: 0 },     // shadow disc
  { emoji: '🪨', size: 150, dx: -40, dy: 30 },  // rock shoulder L
  { emoji: '🪨', size: 150, dx: 40, dy: 30 },   // rock shoulder R
  { emoji: '💀', size: 150, dx: 0, dy: -10 },   // skull core
  { emoji: '👑', size: 90, dx: 0, dy: -95 }     // crown cap
];
function drawEnemy(g, type, x, y, frame) {
  var e = ENEMIES[type] || ENEMIES.husk;
  var bob = Math.sin((frame || 0) / 12) * 3;
  // soft shadow ellipse (lighting layer hint, cheap)
  g.save(); g.globalAlpha = 0.3; g.fillStyle = '#000';
  g.beginPath(); g.ellipse(x, y + 22 * e.scale, 18 * e.scale, 6, 0, 0, 6.3); g.fill(); g.restore();
  drawEmoji(g, e.body, x, y + bob, 44 * e.scale, { outline: e.outline });
}
function drawBoss(g, x, y, frame, flash) {
  var i, p;
  g.save(); g.globalAlpha = 0.35; g.fillStyle = '#000';
  g.beginPath(); g.ellipse(x, y + 110, 110, 22, 0, 0, 6.3); g.fill(); g.restore();
  for (i = 0; i < BOSS_PIECES.length; i++) {
    p = BOSS_PIECES[i];
    var sway = Math.sin((frame || 0) / 20 + i) * 4;
    drawEmoji(g, p.emoji, x + p.dx + sway, y + p.dy, p.size,
      flash && i === 3 ? { outline: '#ff2222' } : { outline: '#101018' });
  }
}

/* ---- juice: recoil / rotation / dust / sparks / shake ---- */
var shake = { mag: 0, t: 0 };
function addShake(mag, ms) {
  shake.mag = Math.min(24, Math.max(shake.mag, mag));
  shake.t = Math.max(shake.t, ms || 180);
}
function applyShake(g, dt) {
  if (shake.t <= 0 || degradeLevel() >= 3) { shake.mag = 0; shake.t = 0; return; }
  shake.t -= dt;
  var a = Math.random() * 6.283;
  g.translate(Math.cos(a) * shake.mag * (shake.t / 200), Math.sin(a) * shake.mag * (shake.t / 200));
  if (shake.t <= 0) shake.mag = 0;
}
function recoilOffset(kick, t) { return -kick * Math.max(0, 1 - t / 120); } // px along barrel, 120ms decay

/* ---- pools + caps ---- */
var CAPS = { enemies: 40, projectiles: 80, debris: 250, pickups: 20, collapses: 6 };
function makePool(n, factory) {
  var free = [], live = [];
  for (var i = 0; i < n; i++) free.push(factory());
  return {
    spawn: function (cap) {
      if (live.length >= (cap || n)) return null; // cap: shed spawn, never gameplay
      var o = free.pop() || factory();
      live.push(o); return o;
    },
    release: function (o) {
      var i = live.indexOf(o);
      if (i >= 0) { live.splice(i, 1); free.push(o); }
    },
    live: live, free: free
  };
}
var pools = {
  projectile: makePool(CAPS.projectiles, function () { return { x: 0, y: 0, vx: 0, vy: 0, emoji: '✨', life: 0 }; }),
  debris:     makePool(CAPS.debris, function () { return { x: 0, y: 0, vx: 0, vy: 0, emoji: '🪨', rot: 0, vr: 0, life: 0 }; }),
  particle:   makePool(CAPS.debris, function () { return { x: 0, y: 0, vx: 0, vy: 0, emoji: '✨', life: 0, size: 12 }; }),
  damage:     makePool(60, function () { return { x: 0, y: 0, text: '', life: 0 }; }),
  decals:     makePool(120, function () { return { x: 0, y: 0, emoji: '🩸', rot: 0, alpha: 0.7 }; }),
  audio:      makePool(16, function () { return { key: '', t: 0 }; })
};

/* ---- degrade ladder: particles -> decals -> anim -> lights ---- */
var _degrade = 0; // 0 full … 4 minimal (set by host perf governor)
function degradeLevel() { return _degrade; }
function setDegrade(n) { _degrade = Math.max(0, Math.min(4, n | 0)); }
function fxAllowed(kind) {
  if (_degrade <= 0) return true;
  if (kind === 'particles' && _degrade >= 1) return false;
  if (kind === 'decals' && _degrade >= 2) return false;
  if (kind === 'anim' && _degrade >= 3) return false;
  if (kind === 'lights' && _degrade >= 4) return false;
  return true;
}

var Art = {
  VERSION: VERSION,
  CAPS: CAPS, pools: pools,
  getMode: getMode, getAtlasTile: getAtlasTile, drawEmoji: drawEmoji,
  debrisFor: debrisFor, defeatFor: defeatFor,
  drawEnemy: drawEnemy, drawBoss: drawBoss, ENEMIES: ENEMIES, BOSS_PIECES: BOSS_PIECES,
  addShake: addShake, applyShake: applyShake, recoilOffset: recoilOffset,
  makePool: makePool, degradeLevel: degradeLevel, setDegrade: setDegrade, fxAllowed: fxAllowed,
  /* Sim-parity helper: hash of sim-visible config must not depend on mode. */
  simHash: function (simSnapshot) {
    var s = String(simSnapshot || '');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
};
window.GraveGain2DB_Art = Art;
window.GraveGainMods = window.GraveGainMods || [];
window.GraveGainMods.push({ name: 'gravegain2dB-emoji-art', version: VERSION });
})();
