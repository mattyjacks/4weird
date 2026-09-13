/* =========================================================================
 * GraveGain voxel gore overlay — v2-native, parity-safe (sub-04 lane).
 * -------------------------------------------------------------------------
 * EXTENDS (never replaces) gore-gravegain2d.js + gore-gravegain3d.js with an
 * over-the-top voxel-gore layer for slugs: gravegain2d, gravegain3d,
 * gravegain1d (art hooks). Lives OUTSIDE the parity-locked bundles; injected
 * into generated runtime copies by scripts/sync-game-bundles.mjs (lane 10).
 *
 * Mode contract (identical to the gore engines):
 *   URL ?content=<kid|teen|all>  >  localStorage "4weird-content-mode:<slug>"
 *   >  window.FourweirdContentMode (> goreEnabled bridge flag wins for blood)
 *   >  "fourweird-content-mode" event  >  default "teen".
 *
 * Age bands:
 *   kid  — ZERO blood. Rainbow cube bursts (canvas 2D rects, rainbow
 *           palette) + sparkles + POOF floaters. Never touches spawnBlood
 *           visuals (only sparks/ring/floater shims, guarded).
 *   teen — blood spray + floor decals only (red palette), capped counts.
 *           NO gibs, NO dismemberment, NO persistent chunks.
 *   all  — over-the-top voxel gore: chunky 3D-ish cubes with gravity,
 *           bounce, rotation; gib chunks; persistent floor splat decals;
 *           entity damage states (crack -> limb-loss tint -> collapse);
 *           screen shake (off on prefers-reduced-motion); damage flash.
 *
 * Drugs: untouched — this file only gates gore (other lanes own drugs).
 *
 * Perf: counts scaled by window.FourWeirdGraphics particleMult; caps
 *   (220 cubes admitted per 2D burst context, 300 overlay parts total);
 *   integrate offloaded via window.GraveGainWorkers.integrateParticles with
 *   sync fallback; ~30Hz overlay throttle; paused when document.hidden.
 *
 * Exposes window.GraveGainVoxelGore = { VERSION, getMode(slug), burst(x,y,slug) }.
 * Vanilla IIFE, idempotent, never throws, pointer-events:none, no input
 * listeners (never steals clicks/keys/pointer-lock).
 * ========================================================================= */
(function () {
  "use strict";
  if (window.GraveGainVoxelGore) return; // idempotent under double-injection

  var VERSION = "1.0.0";
  var MODES = ["kid", "teen", "all"];
  var SLUGS = ["gravegain2d", "gravegain3d", "gravegain1d"];
  var LS_PREFIX = "4weird-content-mode:";
  var LS_LEGACY = "FourweirdContentMode";
  var EVENT_NAME = "fourweird-content-mode";
  var GORE_EVENT = "fourweird-gore";

  var MAX_PARTS = 300;      // overlay-wide cube/particle cap
  var MAX_PARTS_2D = 220;   // admission cap for gravegain2d burst context
  var MAX_SPLATS = 80;
  var MAX_TEXTS = 12;
  var SPLAT_PERSIST_MS = 60000; // "all" floor decals persist
  var SPLAT_TEEN_MS = 12000;
  var FRAME_MIN_MS = 33;    // ~30Hz overlay throttle

  var RAINBOW = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#a78bfa", "#f472b6"];
  var SPARKS = ["#fef08a", "#fef9c3", "#ffffff", "#fbcfe8", "#bae6fd"];
  var BLOOD = ["#c1121f", "#a30f1b", "#e5383b", "#7a0c10"];
  var GIB_TINT = ["#7a0c10", "#5c090d", "#991b1b"]; // limb-loss / gib tints
  var CRACK_TINT = ["#e5383b", "#f87171"];          // crack-stage tint
  var KID_PRAISE = ["POOF!", "NICE!", "+100 BRAVE!", "SPARKLE DOWN!", "NAP TIME!"];

  // -- mode resolution (per slug) ------------------------------------------
  function normMode(v) {
    try {
      if (v === undefined || v === null) return null;
      var s = String(v).trim();
      if (s.charAt(0) === "{") {
        try {
          var o = JSON.parse(s);
          if (o && o.mode) return normMode(o.mode);
        } catch (_) { return null; }
      }
      s = s.toLowerCase();
      return MODES.indexOf(s) !== -1 ? s : null;
    } catch (_) { return null; }
  }

  function readUrlMode() {
    try {
      return normMode(new URLSearchParams(window.location.search).get("content"));
    } catch (_) { return null; }
  }

  function readStoreMode(slug) {
    try {
      if (!window.localStorage) return null;
      return normMode(window.localStorage.getItem(LS_PREFIX + slug)) ||
        normMode(window.localStorage.getItem(LS_LEGACY));
    } catch (_) { return null; }
  }

  function readGlobalMode() {
    try {
      var g = window.FourweirdContentMode;
      if (g && g.mode) return normMode(g.mode);
    } catch (_) { /* ignore */ }
    return null;
  }

  var modeCache = {};
  function getMode(slug) {
    try {
      slug = SLUGS.indexOf(slug) !== -1 ? slug : "gravegain2d";
      if (modeCache[slug]) return modeCache[slug];
      var m = readUrlMode() || readStoreMode(slug) || readGlobalMode() || "teen";
      modeCache[slug] = m;
      return m;
    } catch (_) { return "teen"; }
  }

  function setModeForSlug(slug, mode) {
    try {
      var n = normMode(mode);
      if (!n) return false;
      if (SLUGS.indexOf(slug) === -1) {
        // Broadcast mode across all slugs we own.
        for (var i = 0; i < SLUGS.length; i++) {
          modeCache[SLUGS[i]] = n;
          try { window.localStorage.setItem(LS_PREFIX + SLUGS[i], n); } catch (_) {}
        }
      } else {
        modeCache[slug] = n;
        try { window.localStorage.setItem(LS_PREFIX + slug, n); } catch (_) {}
      }
      return true;
    } catch (_) { return false; }
  }

  function bloodOn(slug) {
    // Explicit shared-bridge flag wins; otherwise teen|all bleed, kid never.
    try {
      var g = window.FourweirdContentMode;
      if (g && typeof g.goreEnabled === "boolean") return g.goreEnabled;
    } catch (_) { /* ignore */ }
    var m = getMode(slug);
    return m === "teen" || m === "all";
  }

  try {
    window.addEventListener(EVENT_NAME, function (ev) {
      try {
        var d = ev && ev.detail;
        var m = (d && typeof d === "object") ? (d.mode || readGlobalMode()) : normMode(d);
        m = normMode(m) || readGlobalMode();
        if (!m) return;
        var slug = (d && d.slug) || (d && d.game) || null;
        if (slug && SLUGS.indexOf(slug) !== -1) setModeForSlug(slug, m);
        else setModeForSlug(null, m);
      } catch (_) { /* ignore */ }
    });
  } catch (_) { /* ignore */ }

  // -- perf helpers ----------------------------------------------------------
  function particleMult() {
    try {
      var g = window.FourWeirdGraphics;
      if (!g) return 0.6;
      if (typeof g.get === "function") {
        var q = g.get();
        if (q && isFinite(+q.particleMult) && +q.particleMult > 0) return +q.particleMult;
      }
      if (g.preset && isFinite(+g.preset.particleMult) && +g.preset.particleMult > 0) {
        return +g.preset.particleMult;
      }
      if (isFinite(+g.particleMult) && +g.particleMult > 0) return +g.particleMult;
    } catch (_) { /* ignore */ }
    return 0.6;
  }

  function scaled(n) {
    try {
      return Math.max(1, Math.round(n * particleMult()));
    } catch (_) { return n; }
  }

  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (_) { return false; }
  }

  // -- overlay canvas ----------------------------------------------------------
  var state = {
    canvas: null, ctx: null, host: null,
    parts: [], splats: [], texts: [],
    flash: 0, flashColor: "178,20,30",
    lastKills: null, lastGold: null, lastHp: null, lastScore1d: null,
    killIndex: 0, // drives entity damage states: crack -> limb-loss -> collapse
    lastDraw: 0, workerTick: 0,
  };

  function ensureCanvas() {
    try {
      if (state.canvas && document.body.contains(state.canvas)) return true;
      var host = document.getElementById("canvasContainer") || document.body;
      var c = document.createElement("canvas");
      c.id = "gg-voxel-gore-overlay";
      c.setAttribute("aria-hidden", "true");
      c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;" +
        "pointer-events:none;z-index:60;";
      try {
        var cs = window.getComputedStyle ? window.getComputedStyle(host) : null;
        if (host !== document.body && cs && cs.position === "static") host.style.position = "relative";
      } catch (_) { /* ignore */ }
      if (host === document.body) c.style.position = "fixed";
      host.appendChild(c);
      state.canvas = c;
      state.host = host;
      try { state.ctx = c.getContext("2d"); } catch (_) { state.ctx = null; }
      sizeCanvas();
      return !!state.ctx;
    } catch (_) { return false; }
  }

  function sizeCanvas() {
    try {
      if (!state.canvas) return;
      var r = state.canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      if (state.canvas.width !== w || state.canvas.height !== h) {
        state.canvas.width = w;
        state.canvas.height = h;
      }
    } catch (_) { /* ignore */ }
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { try { return arr[(Math.random() * arr.length) | 0]; } catch (_) { return "#fff"; } }

  function admit(slug, n) {
    // Global + per-context caps. Never grows past MAX_PARTS.
    try {
      var room = MAX_PARTS - state.parts.length;
      if (room <= 0) return 0;
      if (slug === "gravegain2d") room = Math.min(room, Math.max(0, MAX_PARTS_2D - state.parts.length));
      return Math.max(0, Math.min(n, room));
    } catch (_) { return 0; }
  }

  // -- spawners ------------------------------------------------------------------
  // Kid: rainbow cubes + sparkles. ZERO blood; never touches spawnBlood visuals.
  function kidBurst(x, y) {
    try {
      var n = admit("kid", scaled(26));
      for (var i = 0; i < n; i++) {
        var ang = rnd(0, Math.PI * 2);
        var sp = rnd(40, 240);
        state.parts.push({
          kind: i % 3 === 0 ? "spark" : "cube",
          rainbow: true,
          x: x + rnd(-6, 6), y: y + rnd(-6, 6),
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 90,
          life: rnd(0.5, 1.2), age: 0, rot: rnd(0, 6.28), vr: rnd(-9, 9),
          size: rnd(3, 8), color: pick(i % 3 === 0 ? SPARKS : RAINBOW),
        });
      }
      state.texts.push({ x: x, y: y - 26, text: pick(KID_PRAISE) + " \u2728", life: 1.3, age: 0, color: "#fef9c3" });
      if (state.texts.length > MAX_TEXTS) state.texts.splice(0, state.texts.length - MAX_TEXTS);
      // In-canvas echo: sparks/ring/floater ONLY — never spawnBlood/spawnGore.
      try {
        var vfx = window.GraveGainGame && window.GraveGainGame.vfx;
        if (vfx) {
          if (typeof vfx.spawnSparks === "function") vfx.spawnSparks(x, y, "rainbow", 10);
          if (typeof vfx.spawnRing === "function") vfx.spawnRing(x, y, "#fef9c3", 60, 0.4);
          if (typeof vfx.spawnFloater === "function") vfx.spawnFloater(x, y - 30, "POOF!", "#fef9c3");
        }
      } catch (_) { /* ignore */ }
    } catch (_) { /* cosmetic; never throw */ }
  }

  // Teen: blood spray + floor decals only. NO gibs, NO dismemberment, NO chunks.
  function teenBurst(x, y, slug) {
    try {
      var n = admit(slug, scaled(22));
      for (var i = 0; i < n; i++) {
        var ang = rnd(-Math.PI, 0);
        var sp = rnd(40, 260);
        state.parts.push({
          kind: "drop",
          x: x + rnd(-6, 6), y: y + rnd(-6, 6),
          vx: Math.cos(ang) * sp + rnd(-50, 50), vy: Math.sin(ang) * sp,
          life: rnd(0.4, 0.9), age: 0, size: rnd(1.5, 3.5), color: pick(BLOOD),
        });
      }
      for (var j = 0; j < scaled(3); j++) {
        addSplat(x + rnd(-14, 14), y + rnd(8, 40), false);
      }
    } catch (_) { /* ignore */ }
  }

  // All (adults): chunky cubes + gibs + persistent splats + damage states.
  function adultBurst(x, y, slug) {
    try {
      var stage = state.killIndex % 3; // 0 crack -> 1 limb-loss tint -> 2 collapse
      state.killIndex += 1;
      var palette = stage === 0 ? CRACK_TINT.concat(BLOOD) : stage === 1 ? GIB_TINT.concat(BLOOD) : BLOOD;
      var n = admit(slug, scaled(stage === 2 ? 60 : 44));
      for (var i = 0; i < n; i++) {
        var ang = rnd(-Math.PI, 0);
        var sp = rnd(60, stage === 2 ? 460 : 340);
        state.parts.push({
          kind: "cube",
          x: x + rnd(-8, 8), y: y + rnd(-8, 8),
          vx: Math.cos(ang) * sp + rnd(-80, 80), vy: Math.sin(ang) * sp,
          life: rnd(0.7, 1.6), age: 0, rot: rnd(0, 6.28), vr: rnd(-11, 11),
          size: rnd(3, stage === 2 ? 10 : 8), color: pick(palette),
          bounce: 0.45,
        });
      }
      // Gib chunks: tumbling slabs, all-mode only.
      var g = admit(slug, scaled(stage === 2 ? 12 : 8));
      for (var k = 0; k < g; k++) {
        state.parts.push({
          kind: "gib",
          x: x, y: y,
          vx: rnd(-280, 280), vy: rnd(-360, -60),
          life: rnd(0.8, 1.8), age: 0, rot: rnd(0, 6.28), vr: rnd(-12, 12),
          size: rnd(5, 11), color: pick(GIB_TINT), bounce: 0.5,
        });
      }
      for (var j = 0; j < scaled(stage === 2 ? 4 : 2); j++) addSplat(x, y, true);
      if (stage === 2) {
        damageFlash("122,12,16", 0.35);
        shake(7); // collapse hits shake the container
      }
    } catch (_) { /* ignore */ }
  }

  function addSplat(x, y, persist) {
    try {
      state.splats.push({
        x: x + rnd(-14, 14), y: y + rnd(8, 40),
        rx: rnd(8, persist ? 34 : 20), ry: rnd(4, persist ? 14 : 9),
        life: (persist ? SPLAT_PERSIST_MS : SPLAT_TEEN_MS) / 1000,
        age: 0, color: persist ? "122,12,16" : "178,20,30",
      });
      if (state.splats.length > MAX_SPLATS) state.splats.splice(0, state.splats.length - MAX_SPLATS);
    } catch (_) { /* ignore */ }
  }

  function damageFlash(color, strength) {
    try {
      state.flash = Math.min(1, state.flash + strength);
      state.flashColor = color;
    } catch (_) { /* ignore */ }
  }

  // Screen shake: CSS transform on canvasContainer, off on reduced-motion.
  var shaking = false;
  function shake(mag) {
    try {
      if (reducedMotion() || shaking) return;
      var host = document.getElementById("canvasContainer") || (state.host !== document.body ? state.host : null);
      if (!host) return;
      shaking = true;
      var t0 = null;
      var prev = "";
      try { prev = host.style.transform || ""; } catch (_) {}
      function step(t) {
        try {
          if (!t0) t0 = t;
          var k = 1 - (t - t0) / 300;
          if (k <= 0 || document.hidden) {
            host.style.transform = prev;
            shaking = false;
            return;
          }
          host.style.transform = prev + " translate(" +
            Math.round(rnd(-mag, mag) * k) + "px," + Math.round(rnd(-mag, mag) * k) + "px)";
          window.requestAnimationFrame(step);
        } catch (_) {
          try { host.style.transform = prev; } catch (_) {}
          shaking = false;
        }
      }
      window.requestAnimationFrame(step);
    } catch (_) { shaking = false; }
  }

  /** Public burst: x/y are overlay CSS px (numbers); routes by mode. Never throws. */
  function burst(x, y, slug) {
    try {
      if (!ensureCanvas()) return;
      sizeCanvas();
      slug = SLUGS.indexOf(slug) !== -1 ? slug : detectSlug();
      var px = isFinite(+x) ? +x : state.canvas.width / 2;
      var py = isFinite(+y) ? +y : state.canvas.height * 0.42;
      var mode = getMode(slug);
      if (mode === "kid" || !bloodOn(slug)) { kidBurst(px, py); return; }
      if (mode === "teen") { teenBurst(px, py, slug); return; }
      adultBurst(px, py, slug);
    } catch (_) { /* never break the game */ }
  }

  function detectSlug() {
    // Best-effort slug sniff: 1D exposes GraveGain1D runs, 3D exposes camera3d.
    try {
      var g = window.GraveGainGame;
      if (g && g.camera3d) return "gravegain3d";
      if (g && g.vfx && typeof g.vfx.spawnBlood === "function") return "gravegain2d";
      if (window.GraveGain1D) return "gravegain1d";
    } catch (_) { /* ignore */ }
    return "gravegain2d";
  }

  function centerOf(slug) {
    try {
      if (!state.canvas) return { x: 0, y: 0 };
      if (slug === "gravegain2d") {
        var c = document.getElementById("gameCanvas");
        if (c) {
          var r = c.getBoundingClientRect();
          var lr = state.canvas.getBoundingClientRect();
          return {
            x: (r.left - lr.left) + r.width * rnd(0.3, 0.7),
            y: (r.top - lr.top) + r.height * rnd(0.3, 0.6),
          };
        }
      }
      return { x: state.canvas.width * rnd(0.35, 0.65), y: state.canvas.height * 0.42 };
    } catch (_) { return { x: 0, y: 0 }; }
  }

  // -- kill intake: polling GraveGainGame (kills/gold) + 1D score ------------------
  function pollEngine() {
    try {
      if (document.hidden) return;
      var slug = detectSlug();
      var g = null;
      try { g = window.GraveGainGame || null; } catch (_) {}
      if (g) {
        try {
          if (typeof g.kills === "number") {
            if (state.lastKills === null) state.lastKills = g.kills;
            else if (g.kills > state.lastKills) {
              var delta = Math.min(5, g.kills - state.lastKills);
              state.lastKills = g.kills;
              for (var i = 0; i < delta; i++) {
                var p = centerOf(slug);
                burst(p.x, p.y, slug);
              }
              emitGore(slug, delta);
            } else state.lastKills = g.kills;
          }
        } catch (_) {}
        try {
          // Gold pickups read as minor splatter/confetti ticks (mode-routed).
          if (typeof g.gold === "number") {
            if (state.lastGold === null) state.lastGold = g.gold;
            else if (g.gold > state.lastGold) {
              state.lastGold = g.gold;
              var q = centerOf(slug);
              burst(q.x, q.y, slug);
            } else state.lastGold = g.gold;
          }
        } catch (_) {}
        try {
          var hp = g.player ? g.player.hp : null;
          if (typeof hp === "number") {
            if (state.lastHp !== null && hp < state.lastHp) {
              var m = getMode(slug);
              if (m === "kid") damageFlash("255,213,74", 0.22);
              else if (m === "all") { damageFlash("122,12,16", 0.6); shake(5); }
              else damageFlash("178,20,30", 0.4);
            }
            state.lastHp = hp;
          }
        } catch (_) {}
      }
      // gravegain1d-art hook: score ticks on window.GraveGain1D.
      try {
        var one = window.GraveGain1D;
        if (one && isFinite(+one.score)) {
          if (state.lastScore1d === null) state.lastScore1d = +one.score;
          else if (+one.score > state.lastScore1d) {
            state.lastScore1d = +one.score;
            var c1 = centerOf("gravegain1d");
            burst(c1.x, c1.y, "gravegain1d");
          } else state.lastScore1d = +one.score;
        }
      } catch (_) {}
    } catch (_) { /* never break the game loop */ }
  }

  function emitGore(slug, count) {
    try {
      window.dispatchEvent(new CustomEvent(GORE_EVENT, {
        detail: { game: slug, mode: getMode(slug), kills: count, voxel: true },
      }));
    } catch (_) { /* ignore */ }
  }

  // Wrap FourweirdGore.spawn so engine-routed kills also emit voxel cubes.
  // Coexists with the gore-* engine wrappers (wraps whatever is installed now).
  try {
    if (window.FourweirdGore && typeof window.FourweirdGore.spawn === "function") {
      if (!window.FourweirdGore.spawn.__voxelWrapped) {
        var origSpawn = window.FourweirdGore.spawn;
        var wrapped = function (x, y, opts) {
          var r;
          try { r = origSpawn.call(this, x, y, opts); } catch (_) { r = undefined; }
          try {
            var slug = (opts && (opts.game || opts.slug)) || detectSlug();
            var px = isFinite(+x) ? +x : undefined;
            var py = isFinite(+y) ? +y : undefined;
            if (px === undefined || py === undefined) {
              var c = centerOf(slug);
              px = c.x; py = c.y;
            } else if (state.canvas) {
              // Viewport-px callers (3D engine): map into overlay space.
              try {
                var lr = state.canvas.getBoundingClientRect();
                px = +x - lr.left; py = +y - lr.top;
              } catch (_) { /* use raw */ }
            }
            burst(px, py, slug);
          } catch (_) { /* ignore */ }
          return r;
        };
        wrapped.__voxelWrapped = true;
        window.FourweirdGore.spawn = wrapped;
      }
    } else {
      window.FourweirdGore = window.FourweirdGore || {};
      if (typeof window.FourweirdGore.spawn !== "function") {
        var fallback = function (x, y, opts) {
          try {
            var slug = (opts && (opts.game || opts.slug)) || detectSlug();
            burst(x, y, slug);
          } catch (_) { /* ignore */ }
        };
        fallback.__voxelWrapped = true;
        window.FourweirdGore.spawn = fallback;
      }
    }
  } catch (_) { /* ignore */ }

  // -- physics: worker offload attempt + sync fallback --------------------------------
  function syncIntegrate(dt) {
    try {
      var W = state.canvas ? state.canvas.width : 0;
      var H = state.canvas ? state.canvas.height : 0;
      for (var i = state.parts.length - 1; i >= 0; i--) {
        var p = state.parts[i];
        if (p._wSkip > 0) { p._wSkip -= 1; continue; } // worker already stepped it
        p.age += dt;
        if (p.age >= p.life) { state.parts.splice(i, 1); continue; }
        if (p.kind === "spark") p.vy += 160 * dt;
        else p.vy += 900 * dt; // gravity for blood/cubes/gibs
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if ((p.kind === "cube" || p.kind === "gib") && H > 0 && p.y > H - p.size) {
          p.y = H - p.size; // bounce off the floor edge
          p.vy = -p.vy * (p.bounce || 0.45);
          p.vx *= 0.7;
          p.vr *= 0.7;
        }
        if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
        if (W > 0 && (p.x < -40 || p.x > W + 40)) { state.parts.splice(i, 1); continue; }
      }
    } catch (_) { /* ignore */ }
  }

  function workerIntegrate(dt) {
    try {
      state.workerTick += 1;
      if (state.workerTick % 3 !== 0) return; // offload every 3rd tick only
      var W = window.GraveGainWorkers;
      if (!W || typeof W.ready !== "function" || !W.ready()) return;
      if (typeof W.integrateParticles !== "function") return;
      if (!state.parts.length || state.parts.length > 120) return; // caps per perf contract
      var slim = [];
      var idx = [];
      for (var i = 0; i < state.parts.length; i++) {
        var p = state.parts[i];
        slim.push({ x: +p.x || 0, y: +p.y || 0, vx: +p.vx || 0, vy: +p.vy || 0, life: +p.life || 0 });
        idx.push(i);
      }
      var res = W.integrateParticles(slim, dt);
      if (res && typeof res.then === "function") {
        res.then(function (out) {
          try {
            if (!out || !out.length) return;
            for (var j = 0; j < out.length && j < idx.length; j++) {
              var t = state.parts[idx[j]];
              var o = out[j];
              if (!t || !o) continue;
              if (isFinite(+o.x)) t.x = +o.x;
              if (isFinite(+o.y)) t.y = +o.y;
              if (isFinite(+o.vx)) t.vx = +o.vx;
              if (isFinite(+o.vy)) t.vy = +o.vy;
              t._wSkip = 1; // skip one sync step: worker owned this tick
            }
          } catch (_) { /* advisory only */ }
        }, function () { /* sync fallback already ran */ });
      }
    } catch (_) { /* sync fallback covers */ }
  }

  // -- render loop (~30Hz, paused when hidden) ------------------------------------------
  var lastT = 0;
  function frame(t) {
    try { state.raf = window.requestAnimationFrame(frame); } catch (_) { return; }
    try {
      if (document.hidden) { lastT = t; return; }
      if (t - lastT < FRAME_MIN_MS && lastT !== 0) return; // throttle overlays
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0.033);
      lastT = t;
      if (!state.ctx || !state.canvas) return;
      if ((t | 0) % 30 === 0) sizeCanvas();
      workerIntegrate(dt); // advisory offload; sync below is authoritative
      syncIntegrate(dt);
      var ctx = state.ctx;
      var W = state.canvas.width, H = state.canvas.height;
      ctx.clearRect(0, 0, W, H);
      var i, p, f;
      for (i = state.splats.length - 1; i >= 0; i--) {
        p = state.splats[i];
        p.age += dt;
        if (p.age >= p.life) { state.splats.splice(i, 1); continue; }
        f = 1 - p.age / p.life;
        ctx.save();
        ctx.globalAlpha = Math.min(0.8, 0.4 + f * 0.4);
        ctx.fillStyle = "rgba(" + p.color + ",1)";
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      }
      for (i = state.parts.length - 1; i >= 0; i--) {
        p = state.parts[i];
        f = 1 - p.age / p.life;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, f * 1.2));
        ctx.fillStyle = p.color;
        if (p.kind === "cube" || p.kind === "gib") {
          // Chunky 3D-ish cube: rotated rect + top highlight facet.
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot || 0);
          var s = p.size;
          var squash = p.kind === "gib" ? 0.7 : 1;
          ctx.fillRect(-s / 2, -s / 2, s, s * squash);
          ctx.globalAlpha *= 0.35;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-s / 2, -s / 2, s, Math.max(1, s * 0.22));
        } else if (p.kind === "spark") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.4, p.size * f), 0, 6.2832);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.4, p.size * (0.5 + f * 0.5)), 0, 6.2832);
          ctx.fill();
        }
        ctx.restore();
      }
      for (i = state.texts.length - 1; i >= 0; i--) {
        var tx = state.texts[i];
        tx.age += dt;
        if (tx.age >= tx.life) { state.texts.splice(i, 1); continue; }
        f = 1 - tx.age / tx.life;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, f * 1.5));
        ctx.font = "bold 22px Orbitron, Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = tx.color;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 6;
        ctx.fillText(tx.text, tx.x, tx.y - tx.age * 46);
        ctx.restore();
      }
      if (state.flash > 0.01) {
        state.flash = Math.max(0, state.flash - dt * 1.6);
        var grd = ctx.createRadialGradient(
          W / 2, H / 2, Math.min(W, H) * 0.32,
          W / 2, H / 2, Math.max(W, H) * 0.72);
        grd.addColorStop(0, "rgba(" + state.flashColor + ",0)");
        grd.addColorStop(1, "rgba(" + state.flashColor + "," + (state.flash * 0.55).toFixed(3) + ")");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }
    } catch (_) { /* never break the host page */ }
  }

  // -- boot ------------------------------------------------------------------------
  try {
    for (var s = 0; s < SLUGS.length; s++) getMode(SLUGS[s]); // prime caches
    window.GraveGainVoxelGore = {
      VERSION: VERSION,
      getMode: getMode,
      burst: burst,
    };
  } catch (_) {
    try { window.GraveGainVoxelGore = { VERSION: VERSION, getMode: getMode, burst: burst }; } catch (_) {}
  }

  function boot() {
    try {
      if (ensureCanvas()) {
        try {
          lastT = window.performance ? window.performance.now() : 0;
          window.requestAnimationFrame(frame);
        } catch (_) { /* no rAF (very old webview): polling still emits state */ }
      }
      window.setInterval(pollEngine, 500);
    } catch (_) { /* ignore */ }
  }

  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else boot();
  } catch (_) {
    try { boot(); } catch (_) { /* ignore */ }
  }
})();
