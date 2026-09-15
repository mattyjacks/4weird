/* GraveGain2dB content modes: thin bridge to window.FourweirdContentMode (A8).
 * Modes: kid (\u{1F32B} fog puffs, no gore) / teen (sparks) / all/adults (gore).
 * Physics identical across modes — this file ONLY swaps presentation:
 *   kid  -> gore spawns become fog puffs
 *   teen -> gore spawns become sparks
 *   all  -> gore passes through untouched
 * Mobile REDUCED: on small/touch/save-data devices, kid mode additionally
 * caps decal counts (presentation only).
 * Vanilla IIFE, idempotent, never throws. No new global (bridges only);
 * exposes window.GG2DB_Modes as a read-only view for HUD/debug. */
(function () {
  "use strict";
  if (window.GG2DB_Modes) return;

  var STORE_KEY = "4weird-content-mode:gravegain2dB";
  var VALID = { kid: 1, teen: 1, all: 1 };

  function readMode() {
    try {
      var q = null;
      try { q = new URLSearchParams(window.location.search).get("content"); } catch (e) {}
      if (q && VALID[q]) return q;
    } catch (e) { /* ignore */ }
    try {
      var s = window.localStorage.getItem(STORE_KEY);
      if (s && VALID[s]) return s;
    } catch (e) { /* ignore */ }
    try {
      var g = window.FourweirdContentMode;
      if (g && VALID[g.mode]) return g.mode;
    } catch (e) { /* ignore */ }
    return "teen";
  }

  var state = { mode: readMode() };

  function isKid() { return state.mode === "kid"; }

  function reducedDevice() {
    try {
      if (window.GG2DB_Perf && typeof window.GG2DB_Perf.reduced === "function") {
        var r = window.GG2DB_Perf.reduced();
        return !!(r.small || r.saveData || (r.touch && r.cores <= 4));
      }
      return Math.min(window.innerWidth || 9999, window.innerHeight || 9999) < 500;
    } catch (e) { return false; }
  }

  // Presentation mapping for a gore spawn intent { x, y, kind }.
  // Returns { fx: "fog"|"sparks"|"gore", atlasKey, pool } — sim physics untouched.
  function mapSpawn(intent) {
    try {
      var base = (intent && intent.kind) || "blood";
      if (state.mode === "kid") {
        return { fx: "fog", atlasKey: "fog", pool: "sparks", material: null, base: base,
          capped: reducedDevice() };
      }
      if (state.mode === "teen") {
        return { fx: "sparks", atlasKey: "spark", pool: "sparks", material: null, base: base,
          capped: false };
      }
      return { fx: "gore", atlasKey: "blood", pool: "fx", material: "flesh", base: base,
        capped: false };
    } catch (e) {
      return { fx: "gore", atlasKey: "blood", pool: "fx", material: "flesh", base: "blood", capped: false };
    }
  }

  function setMode(m) {
    try {
      if (!VALID[m]) return false;
      state.mode = m;
      try { window.localStorage.setItem(STORE_KEY, m); } catch (e) { /* ignore */ }
      // Mirror into the shared bridge so gore-gravegain2d.js + shell stay in sync.
      try {
        if (window.FourweirdContentMode && typeof window.FourweirdContentMode === "object") {
          window.FourweirdContentMode.mode = m;
          window.FourweirdContentMode.goreEnabled = (m !== "kid");
          window.FourweirdContentMode.drugsAllowed = (m === "all");
        }
      } catch (e) { /* ignore */ }
      try {
        window.dispatchEvent(new CustomEvent("fourweird-content-mode",
          { detail: { mode: m, slug: "gravegain2dB", goreEnabled: m !== "kid", drugsAllowed: m === "all" } }));
      } catch (e) { /* ignore */ }
      return true;
    } catch (e) { return false; }
  }

  // Live-sync when the shell/bridge switches modes underneath us.
  try {
    window.addEventListener("fourweird-content-mode", function (ev) {
      try {
        var d = (ev && ev.detail) || {};
        if (d.mode && VALID[d.mode] && d.mode !== state.mode) {
          state.mode = d.mode;
          try { window.localStorage.setItem(STORE_KEY, d.mode); } catch (e) {}
        } else {
          var m = readMode();
          if (m !== state.mode) state.mode = m;
        }
      } catch (e) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }

  // Wrap window.FourweirdGore.spawn (if present) so kid/teen remap presentation.
  // Install once; chains any existing wrapper instead of clobbering.
  function installGoreHook() {
    try {
      var fg = window.FourweirdGore;
      if (!fg || typeof fg.spawn !== "function" || fg.spawn.__gg2db) return false;
      var prev = fg.spawn;
      var wrapped = function (x, y, opts) {
        try {
          var mapped = mapSpawn({ kind: (opts && opts.kind) || "blood" });
          if (mapped.fx === "gore") return prev(x, y, opts);
          // Non-gore presentation: route to atlas fx queue, skip gore path.
          try {
            var atlas = window.GG2DB_Atlas;
            if (atlas && atlas.fx) {
              atlas.fx.emit("debris", mapped.atlasKey, x, y, { size: 26, alpha: 0.9 });
            }
          } catch (e) { /* ignore */ }
          if (mapped.fx === "sparks") { try { prev(x, y, { kind: "spark" }); } catch (e) {} }
          return true;
        } catch (e) {
          try { return prev(x, y, opts); } catch (e2) { return false; }
        }
      };
      wrapped.__gg2db = true;
      fg.spawn = wrapped;
      return true;
    } catch (e) { return false; }
  }

  try {
    if (!installGoreHook()) {
      var tries = 0;
      var t = setInterval(function () {
        try { tries += 1; if (installGoreHook() || tries > 60) clearInterval(t); }
        catch (e) { try { clearInterval(t); } catch (e2) {} }
      }, 500);
    }
  } catch (e) { /* ignore */ }

  window.GG2DB_Modes = {
    mode: function () { return state.mode; },
    setMode: setMode, isKid: isKid,
    mapSpawn: mapSpawn, reducedDevice: reducedDevice
  };
})();
