/* GraveGain 2D->2.5D depth overlay (v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundle:
 *   public/games/html/gravegain-2p5d.js
 * Injected into the generated runtime copy (slug gravegain2d ONLY) by
 * scripts/sync-game-bundles.mjs. NEVER edit gravegain2d/** or gravegain3d/**.
 *
 * What it adds (canvas game untouched):
 *   - Parallax backdrop layers (far ruins / mid arches / near fog) as DOM
 *     overlays, offset from live player x/y when window.GraveGainGame is
 *     available, else slow ambient drift.
 *   - Drop-shadow + height-shadow ellipse under player + enemies, drawn on
 *     an overlay canvas synced to #gameCanvas size (1000x600 game space).
 *   - Dynamic torch lighting: radial-gradient light mask following the
 *     player with flicker on high/ultra only (off on potato/balanced).
 *   - Depth garnish: vignette + horizontal fog bands + floating dust motes
 *     capped by window.FourWeirdGraphics particleMult.
 *   - Same visuals for kid/teen/all (gore excluded by design).
 *
 * Guards: vanilla IIFE, no deps, never throw, idempotent
 * (if (window.GraveGain25D) return), try/catch everywhere,
 * pointer-events:none overlays, no input/pointer-lock listeners,
 * ~30Hz rAF throttle, pause when document.hidden.
 */
(function () {
  'use strict';
  if (window.GraveGain25D) return;

  var VERSION = '1.0.0';
  var SLUG = 'gravegain2d';
  var GW = 1000;
  var GH = 600;
  var TICK_MS = 33;

  function isOurslug() {
    try {
      var q = new URLSearchParams(window.location.search).get('slug');
      if (q) return q === SLUG;
      var slug = document.body && document.body.getAttribute('data-slug');
      if (slug) return slug === SLUG;
      var c = document.querySelector('[data-slug]');
      if (c && c.getAttribute('data-slug')) return c.getAttribute('data-slug') === SLUG;
      // Default: page hosts #gameCanvas (2D runtime) and not the 3D canvas.
      if (document.getElementById('gameCanvas')) return true;
    } catch (e) { /* fall through */ }
    return true; // overlay is harmless if mis-injected; canvas lookups still guard
  }

  function presetName() {
    try {
      var el = document.documentElement && document.documentElement.getAttribute('data-fourweird-graphics');
      if (el) return String(el).replace(/^auto:/, '');
      var g = window.FourWeirdGraphics;
      if (g && typeof g.load === 'function') {
        var s = g.load();
        if (s && s.preset) return String(s.preset).replace(/^auto:/, '');
      }
    } catch (e) { /* ignore */ }
    return 'balanced';
  }

  function gfxSettings() {
    try {
      var g = window.FourWeirdGraphics;
      if (g && typeof g.get === 'function') return g.get(presetName());
    } catch (e) { /* ignore */ }
    return { pixelRatioMax: 1.0, particleMult: 0.6, lightCount: 2, shadows: false, postFX: false, textureScale: 0.75 };
  }

  function isHigh() {
    var p = presetName();
    return p === 'high' || p === 'ultra';
  }

  function isPotato() {
    return presetName() === 'potato';
  }

  function container() {
    return document.getElementById('canvasContainer') || document.body;
  }

  function ensurePositioned(host) {
    try {
      var cs = window.getComputedStyle(host);
      if (cs.position === 'static') host.style.position = 'relative';
    } catch (e) { /* ignore */ }
  }

  function ensureDiv(id, css, z) {
    try {
      var host = container();
      if (!host) return null;
      var el = document.getElementById(id);
      if (el && el.parentNode === host) return el;
      if (el && el.parentNode) el.parentNode.removeChild(el);
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = css + ';pointer-events:none;position:absolute;inset:0;z-index:' + z + ';';
      ensurePositioned(host);
      host.appendChild(el);
      return el;
    } catch (e) { return null; }
  }

  // ---------- parallax backdrop layers ----------
  function buildParallax() {
    try {
      // Far ruins: repeating arch silhouettes via layered gradients.
      var far = ensureDiv('gg25d-far',
        'opacity:0.55;background:' +
        'radial-gradient(ellipse 90px 150px at 12% 78%, rgba(76,55,110,0.55), transparent 70%),' +
        'radial-gradient(ellipse 70px 190px at 32% 72%, rgba(62,44,96,0.6), transparent 70%),' +
        'radial-gradient(ellipse 110px 170px at 55% 76%, rgba(76,55,110,0.5), transparent 70%),' +
        'radial-gradient(ellipse 80px 200px at 78% 70%, rgba(62,44,96,0.6), transparent 70%),' +
        'radial-gradient(ellipse 100px 150px at 94% 78%, rgba(76,55,110,0.5), transparent 70%),' +
        'linear-gradient(to bottom, rgba(24,12,44,0.0) 40%, rgba(24,12,44,0.65) 100%);' +
        'background-size:200% 100%', '20');
      // Mid arches: darker broken colonnade band.
      var mid = ensureDiv('gg25d-mid',
        'opacity:0.6;background:' +
        'repeating-linear-gradient(90deg, rgba(10,6,22,0.0) 0 46px, rgba(10,6,22,0.55) 46px 62px),' +
        'linear-gradient(to bottom, transparent 55%, rgba(8,5,18,0.7) 100%);' +
        'background-size:220px 100%, 200% 100%', '21');
      // Near fog: soft drifting horizontal wash.
      var fog = ensureDiv('gg25d-fog',
        'opacity:0.5;background:' +
        'radial-gradient(ellipse 60% 22% at 30% 88%, rgba(180,170,220,0.16), transparent 70%),' +
        'radial-gradient(ellipse 55% 20% at 70% 92%, rgba(180,170,220,0.14), transparent 70%),' +
        'linear-gradient(to bottom, transparent 70%, rgba(150,140,200,0.10) 100%);' +
        'background-size:200% 100%', '22');
      return { far: far, mid: mid, fog: fog };
    } catch (e) { return { far: null, mid: null, fog: null }; }
  }

  // ---------- shadow overlay canvas (player + enemies) ----------
  var shadowCanvas = null;
  var shadowCtx = null;

  function ensureShadowCanvas() {
    try {
      var host = container();
      if (!host) return null;
      var canvas = document.getElementById('gameCanvas');
      var el = document.getElementById('gg25d-shadows');
      if (!el) {
        el = document.createElement('canvas');
        el.id = 'gg25d-shadows';
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = 'pointer-events:none;position:absolute;inset:0;z-index:25;';
        ensurePositioned(host);
        host.appendChild(el);
      }
      // Sync overlay canvas to displayed #gameCanvas size (backing store * dpr capped at 1.5).
      if (canvas) {
        var r = canvas.getBoundingClientRect();
        var dpr = 1;
        try { dpr = Math.min(window.devicePixelRatio || 1, 1.5); } catch (e) { dpr = 1; }
        var w = Math.max(1, Math.round(r.width * dpr));
        var h = Math.max(1, Math.round(r.height * dpr));
        if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
        el.style.width = r.width + 'px';
        el.style.height = r.height + 'px';
      } else if (!el.width) { el.width = GW; el.height = GH; }
      shadowCanvas = el;
      shadowCtx = el.getContext('2d');
      return el;
    } catch (e) { return null; }
  }

  function gameToShadow(x, y) {
    // Map 1000x600 game coords onto the shadow canvas backing store,
    // aligned with the displayed #gameCanvas rect inside the container.
    try {
      var canvas = document.getElementById('gameCanvas');
      var host = container();
      if (!canvas || !shadowCanvas) return { x: x, y: y };
      var cr = canvas.getBoundingClientRect();
      var hr = host.getBoundingClientRect();
      var ox = cr.left - hr.left;
      var oy = cr.top - hr.top;
      var scaleX = (shadowCanvas.width || cr.width) / GW;
      var scaleY = (shadowCanvas.height || cr.height) / GH;
      // Overlay canvas CSS box matches host inset:0, but canvas rect may be
      // letterboxed inside; offset in CSS px scaled to backing store.
      var cssToBack = (shadowCanvas.width || 1) / (host.getBoundingClientRect().width || 1);
      return {
        x: (ox + (x / GW) * cr.width) * cssToBack,
        y: (oy + (y / GH) * cr.height) * cssToBack,
        sx: scaleX, sy: scaleY, cssToBack: cssToBack,
      };
    } catch (e) { return { x: x, y: y }; }
  }

  function liveActors() {
    var out = [];
    try {
      var game = window.GraveGainGame;
      if (!game) return out;
      if (game.player && typeof game.player.x === 'number' && typeof game.player.y === 'number') {
        out.push({ x: game.player.x, y: game.player.y, r: 16, alpha: 0.42, player: true });
      }
      var list = game.enemies;
      if (!Array.isArray(list) && game.world && Array.isArray(game.world.enemies)) list = game.world.enemies;
      if (Array.isArray(list)) {
        for (var i = 0; i < list.length && i < 60; i++) {
          var e = list[i];
          if (!e || typeof e.x !== 'number' || typeof e.y !== 'number') continue;
          if (e.dead === true || e.hp <= 0) continue;
          out.push({ x: e.x, y: e.y, r: 12, alpha: 0.34, player: false });
        }
      }
    } catch (e) { /* best effort */ }
    return out;
  }

  function drawShadows() {
    try {
      if (!shadowCtx || !shadowCanvas) return;
      if (isPotato()) { // potato: clear and skip (no per-frame shadow cost)
        try { shadowCtx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height); } catch (e) { /* ignore */ }
        return;
      }
      shadowCtx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height);
      var actors = liveActors();
      if (!actors.length) return;
      var s = gfxSettings();
      for (var i = 0; i < actors.length; i++) {
        var a = actors[i];
        var p = gameToShadow(a.x, a.y);
        var rx = (a.r * 1.1) * (p.cssToBack || 1);
        var ry = rx * 0.38;
        try {
          shadowCtx.save();
          shadowCtx.globalAlpha = s.shadows === false && !a.player ? a.alpha * 0.7 : a.alpha;
          shadowCtx.fillStyle = '#000';
          shadowCtx.beginPath();
          // Contact shadow (tight ellipse at feet).
          shadowCtx.ellipse(p.x, p.y + ry * 1.6, rx, ry, 0, 0, Math.PI * 2);
          shadowCtx.fill();
          // Height-shadow: fainter, wider wash suggesting elevation.
          shadowCtx.globalAlpha *= 0.35;
          shadowCtx.beginPath();
          shadowCtx.ellipse(p.x, p.y + ry * 2.6, rx * 1.7, ry * 1.1, 0, 0, Math.PI * 2);
          shadowCtx.fill();
          shadowCtx.restore();
        } catch (e) { try { shadowCtx.restore(); } catch (ignored) { /* ignore */ } }
      }
    } catch (e) { /* garnish only */ }
  }

  // ---------- torch lighting mask (high/ultra only, off on potato) ----------
  var lightEl = null;

  function ensureLight() {
    try {
      if (!isHigh()) {
        var old = document.getElementById('gg25d-light');
        if (old) old.style.display = 'none';
        return null;
      }
      lightEl = ensureDiv('gg25d-light', 'opacity:0.9', '28');
      if (lightEl) lightEl.style.display = '';
      return lightEl;
    } catch (e) { return null; }
  }

  function paintLight(t) {
    try {
      var el = ensureLight();
      if (!el) return;
      // Player position in overlay fractions; default center w/ ambient drift.
      var fx = 0.5 + 0.02 * Math.sin(t * 0.11);
      var fy = 0.55 + 0.015 * Math.cos(t * 0.09);
      try {
        var game = window.GraveGainGame;
        if (game && game.player && typeof game.player.x === 'number') {
          fx = Math.min(1, Math.max(0, game.player.x / GW));
          fy = Math.min(1, Math.max(0, game.player.y / GH));
        }
      } catch (e) { /* ambient */ }
      // Torch flicker: layered sines, subtle radius + alpha breathing.
      var flick = 0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1.3);
      var r = 34 + flick * 5; // light pool radius (%)
      var a = 0.82 + flick * 0.10;
      var px = (fx * 100).toFixed(2);
      var py = (fy * 100).toFixed(2);
      el.style.background =
        'radial-gradient(circle at ' + px + '% ' + py + '%, ' +
        'rgba(255,214,140,' + a.toFixed(3) + ') 0%, ' +
        'rgba(255,180,100,0.35) ' + (r * 0.55).toFixed(1) + '%, ' +
        'rgba(20,8,30,0.25) ' + r.toFixed(1) + '%, ' +
        'rgba(6,3,14,0.72) 78%, rgba(4,2,10,0.88) 100%)';
      el.style.mixBlendMode = 'multiply';
    } catch (e) { /* ignore */ }
  }

  // ---------- vignette + fog bands + dust motes ----------
  var motes = [];
  var moteCanvas = null;
  var moteCtx = null;

  function ensureDepthGarnish() {
    try {
      ensureDiv('gg25d-vignette',
        'background:radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.5) 100%);opacity:0.9', '29');
      ensureDiv('gg25d-fogbands',
        'opacity:0.5;background:' +
        'linear-gradient(to bottom, transparent 62%, rgba(170,160,215,0.10) 74%, transparent 82%),' +
        'linear-gradient(to bottom, transparent 80%, rgba(170,160,215,0.12) 90%, transparent 97%)', '27');
      var host = container();
      var el = document.getElementById('gg25d-motes');
      if (!el) {
        el = document.createElement('canvas');
        el.id = 'gg25d-motes';
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = 'pointer-events:none;position:absolute;inset:0;z-index:26;opacity:0.8;';
        ensurePositioned(host);
        host.appendChild(el);
      }
      moteCanvas = el;
      try { moteCtx = el.getContext('2d'); } catch (e) { moteCtx = null; }
      syncMoteSize();
    } catch (e) { /* ignore */ }
  }

  function syncMoteSize() {
    try {
      if (!moteCanvas) return;
      var host = container();
      var r = host.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width / 2));
      var h = Math.max(1, Math.round(r.height / 2));
      if (moteCanvas.width !== w || moteCanvas.height !== h) { moteCanvas.width = w; moteCanvas.height = h; }
      moteCanvas.style.width = r.width + 'px';
      moteCanvas.style.height = r.height + 'px';
    } catch (e) { /* ignore */ }
  }

  function moteBudget() {
    try {
      var s = gfxSettings();
      var m = typeof s.particleMult === 'number' ? s.particleMult : 0.6;
      if (isPotato()) return 0;
      return Math.max(0, Math.min(70, Math.round(46 * m)));
    } catch (e) { return 24; }
  }

  function seedMotes() {
    try {
      motes = [];
      var n = moteBudget();
      for (var i = 0; i < n; i++) {
        motes.push({
          x: Math.random(), y: Math.random(),
          r: 0.8 + Math.random() * 1.8,
          vx: (Math.random() - 0.5) * 0.008,
          vy: -0.004 - Math.random() * 0.010,
          ph: Math.random() * Math.PI * 2,
        });
      }
    } catch (e) { motes = []; }
  }

  function drawMotes(t) {
    try {
      if (!moteCtx || !moteCanvas) return;
      moteCtx.clearRect(0, 0, moteCanvas.width, moteCanvas.height);
      if (!motes.length) return;
      moteCtx.save();
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx * 0.5;
        m.y += m.vy * 0.5;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02) m.x = 1.02;
        if (m.x > 1.02) m.x = -0.02;
        var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 + m.ph));
        moteCtx.globalAlpha = 0.5 * tw;
        moteCtx.fillStyle = '#e8e2ff';
        moteCtx.beginPath();
        moteCtx.arc(m.x * moteCanvas.width, m.y * moteCanvas.height, m.r, 0, Math.PI * 2);
        moteCtx.fill();
      }
      moteCtx.restore();
    } catch (e) { /* ignore */ }
  }

  // ---------- main loop (~30Hz, pauses when hidden) ----------
  var layers = null;
  var lastTick = 0;
  var driftT = 0;

  function slaveAvailable() {
    try { return !!(window.GraveGainGame && window.GraveGainGame.player); } catch (e) { return false; }
  }

  function tick(nowMs) {
    try {
      if (document.hidden) { schedule(); return; }
      var now = typeof nowMs === 'number' ? nowMs : Date.now();
      if (now - lastTick < TICK_MS) { schedule(); return; }
      lastTick = now;
      var t = now / 1000;

      // Parallax: player-driven when live, ambient drift otherwise.
      try {
        if (layers) {
          var px = 0.5;
          var py = 0.5;
          var live = false;
          try {
            var game = window.GraveGainGame;
            if (game && game.player && typeof game.player.x === 'number') {
              px = game.player.x / GW; py = game.player.y / GH; live = true;
            }
          } catch (e) { /* ambient */ }
          driftT = t;
          var ax = live ? (px - 0.5) : 0.03 * Math.sin(driftT * 0.07);
          var ay = live ? (py - 0.5) : 0.02 * Math.cos(driftT * 0.05);
          if (layers.far) layers.far.style.backgroundPosition = (-ax * 60) + 'px ' + (-ay * 18) + 'px';
          if (layers.mid) layers.mid.style.backgroundPosition = (-ax * 130) + 'px ' + (-ay * 34) + 'px, 0 0';
          if (layers.fog) {
            var drift = live ? -ax * 220 : (driftT * 4) % 400;
            layers.fog.style.backgroundPosition = drift + 'px 0';
            layers.fog.style.transform = 'translateY(' + (-ay * 12).toFixed(1) + 'px)';
          }
        }
      } catch (e) { /* ignore */ }

      try { ensureShadowCanvas(); drawShadows(); } catch (e) { /* ignore */ }
      try { paintLight(t); } catch (e) { /* ignore */ }
      try {
        // Re-budget motes if preset changed (cheap length check each ~2s).
        if (!tick.__n) tick.__n = 0;
        tick.__n += 1;
        if (tick.__n % 60 === 0) {
          var want = moteBudget();
          if (want === 0 && motes.length) motes = [];
          else if (want !== motes.length) seedMotes();
          syncMoteSize();
        }
        drawMotes(t);
      } catch (e) { /* ignore */ }
    } catch (e) { /* never break the game */ }
    schedule();
  }

  function schedule() {
    try {
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(tick);
      else setTimeout(function () { tick(Date.now()); }, TICK_MS * 2);
    } catch (e) {
      try { setTimeout(function () { tick(Date.now()); }, 250); } catch (ignored) { /* ignore */ }
    }
  }

  function onPresetChange() {
    try {
      seedMotes();
      ensureDepthGarnish();
      ensureLight();
      // Potato hides light + clears shadows on next tick.
      if (!isHigh()) {
        var old = document.getElementById('gg25d-light');
        if (old) old.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }

  function boot() {
    try {
      if (!isOurslug()) return;
      layers = buildParallax();
      ensureShadowCanvas();
      ensureDepthGarnish();
      seedMotes();
      ensureLight();
      try { window.addEventListener('fourweird-graphics', onPresetChange); } catch (e) { /* ignore */ }
      try {
        if (slaveAvailable()) { /* synced to live instance from first tick */ }
      } catch (e) { /* ignore */ }
      schedule();
    } catch (e) { /* never break the game */ }
  }

  try {
    window.GraveGain25D = { VERSION: VERSION };
  } catch (e) { /* window unwritable */ }

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } catch (e) { try { boot(); } catch (ignored) { /* ignore */ } }
})();
