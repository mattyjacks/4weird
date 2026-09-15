/* GraveGain2dB perf: pools + 4-step degrade (A8).
 * Pools: fx 40 / sparks 80 / debris 250 / decals 20 / lights 6.
 * Degrade ladder ultra -> high -> balanced -> potato: sheds particles,
 * lighting, shake, then atlas size — NEVER sim correctness (spawn intents
 * are dropped at render, sim state untouched).
 * Vanilla IIFE, idempotent, never throws. Export: window.GG2DB_Perf. */
(function () {
  "use strict";
  if (window.GG2DB_Perf) return;

  var TIERS = ["ultra", "high", "balanced", "potato"];
  var POOL_CAP = { fx: 40, sparks: 80, debris: 250, decals: 20, lights: 6 };

  // Per-tier render budgets (fraction of pool allowed + toggles).
  var TIER_CFG = {
    ultra:    { mult: 1.0, lighting: true,  shake: true,  glow: true },
    high:     { mult: 0.7, lighting: true,  shake: true,  glow: true },
    balanced: { mult: 0.4, lighting: true,  shake: false, glow: false },
    potato:   { mult: 0.15, lighting: false, shake: false, glow: false }
  };

  var state = {
    tier: "high",
    auto: true,
    fps: 60,
    ema: 16.7,
    lastT: 0,
    lowSince: 0,
    counts: { fx: 0, sparks: 0, debris: 0, decals: 0, lights: 0 }
  };

  function tier() { return state.tier; }
  function cfg() { try { return TIER_CFG[state.tier] || TIER_CFG.high; } catch (e) { return TIER_CFG.high; } }

  function setTier(t) {
    try {
      if (TIERS.indexOf(t) < 0) return false;
      state.tier = t;
      state.lowSince = 0;
      return true;
    } catch (e) { return false; }
  }

  function degrade() {
    try {
      var i = TIERS.indexOf(state.tier);
      if (i < TIERS.length - 1) { state.tier = TIERS[i + 1]; state.lowSince = 0; return state.tier; }
      return null; // already potato
    } catch (e) { return null; }
  }

  function upgrade() {
    try {
      var i = TIERS.indexOf(state.tier);
      if (i > 0) { state.tier = TIERS[i - 1]; state.lowSince = 0; return state.tier; }
      return null;
    } catch (e) { return null; }
  }

  // Pool gate: render-side only. Returns true if one more `kind` item may draw.
  function allow(kind) {
    try {
      if (!kind || POOL_CAP[kind] == null) return true;
      if (kind === "lights" && !cfg().lighting) return false;
      var cap = Math.max(1, Math.floor(POOL_CAP[kind] * cfg().mult));
      if (state.counts[kind] >= cap) return false;
      state.counts[kind] += 1;
      return true;
    } catch (e) { return true; } // fail open: never break rendering
  }

  function shakeAllowed() { try { return !!cfg().shake; } catch (e) { return false; } }
  function glowAllowed() { try { return !!cfg().glow; } catch (e) { return false; } }

  // Call at frame start: resets per-frame counters, samples fps, auto-degrades.
  function frame(nowMs) {
    try {
      state.counts = { fx: 0, sparks: 0, debris: 0, decals: 0, lights: 0 };
      var now = (typeof nowMs === "number") ? nowMs : (window.performance ? performance.now() : Date.now());
      if (state.lastT) {
        var dt = now - state.lastT;
        if (dt > 0 && dt < 1000) {
          state.ema = state.ema * 0.95 + dt * 0.05;
          state.fps = 1000 / state.ema;
          if (state.auto) {
            if (state.fps < 42) {
              if (!state.lowSince) state.lowSince = now;
              if (now - state.lowSince > 2000) degrade(); // sustained low fps
            } else {
              state.lowSince = 0;
              if (state.fps > 58) {
                // Consider upgrading only after long healthy stretch; track via lowSince sign.
                state.healthySince = state.healthySince || now;
                if (now - state.healthySince > 15000) {
                  state.healthySince = 0;
                  // Never auto-upgrade past user's manual pick? We track auto only; safe to step up.
                  upgrade();
                }
              } else {
                state.healthySince = 0;
              }
            }
          }
        }
      }
      state.lastT = now;
      return state.fps;
    } catch (e) { return state.fps; }
  }

  function setAuto(on) { try { state.auto = !!on; return state.auto; } catch (e) { return true; } }

  // Mobile REDUCED flags: small screens / touch / save-data start at balanced.
  function reduced() {
    try {
      var small = false;
      try { small = Math.min(window.innerWidth || 9999, window.innerHeight || 9999) < 500; } catch (e) {}
      var touch = false;
      try { touch = ("ontouchstart" in window) || (navigator && navigator.maxTouchPoints > 0); } catch (e) {}
      var saveData = false;
      try { saveData = !!(navigator && navigator.connection && navigator.connection.saveData); } catch (e) {}
      var cores = 8;
      try { cores = navigator.hardwareConcurrency || 8; } catch (e) {}
      return { small: small, touch: touch, saveData: saveData, cores: cores };
    } catch (e) { return { small: false, touch: false, saveData: false, cores: 8 }; }
  }

  function applyMobileDefaults() {
    try {
      var r = reduced();
      if (r.small || (r.touch && r.cores <= 4) || r.saveData) {
        if (TIERS.indexOf(state.tier) < TIERS.indexOf("balanced")) setTier("balanced");
      }
      return r;
    } catch (e) { return reduced(); }
  }

  try { applyMobileDefaults(); } catch (e) { /* ignore */ }

  window.GG2DB_Perf = {
    TIERS: TIERS.slice(), POOL_CAP: (function () { var o = {}; for (var k in POOL_CAP) o[k] = POOL_CAP[k]; return o; })(),
    tier: tier, setTier: setTier, degrade: degrade, upgrade: upgrade,
    allow: allow, shakeAllowed: shakeAllowed, glowAllowed: glowAllowed,
    frame: frame, fps: function () { return state.fps; },
    setAuto: setAuto, reduced: reduced, applyMobileDefaults: applyMobileDefaults
  };
})();
