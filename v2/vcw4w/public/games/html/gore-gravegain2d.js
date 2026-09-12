/* GraveGain2D per-game gore engine (v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundle: public/games/html/gore-gravegain2d.js,
 * injected into the generated runtime copy by scripts/sync-game-bundles.mjs.
 * NEVER edit public/games/html/gravegain2d/** (lore.js, game.js, index.html...).
 *
 * Contract (sibling-owned shared infra, may not exist yet — this file assumes it):
 *   - import side: none (vanilla). Reads window.FourweirdContentMode
 *     { mode: "kid"|"teen"|"all", goreEnabled, drugsAllowed }.
 *   - event: "fourweird-content-mode" (detail carries the same shape).
 *   - spawn routing: wraps window.FourweirdGore.spawn if present, else shims it.
 *   - mode sources (priority): URL ?content= > localStorage
 *     "4weird-content-mode:gravegain2d" > window.FourweirdContentMode > event > "all".
 *   - default "all" = bundle parity (in-canvas blood untouched, overlay adds decals).
 *     Kid suppression ONLY activates on an explicit kid signal.
 *
 * Hooks (all best-effort, degrade gracefully when globals are absent):
 *   1. window.GraveGainGame.vfx.spawnBlood / spawnGore (live instance, polled).
 *   2. window.FourweirdGore.spawn(x, y, opts) — wrapped or shimmed.
 *   3. Player-hurt edge splatter via player.hp polling on the live instance.
 */
(function () {
  "use strict";
  if (window.GraveGain2DGore) return; // idempotent under double-injection

  var STORE_KEY = "4weird-content-mode:gravegain2d";
  var MAX_DECALS = 150;
  var DECAL_FADE_MS = 30000;

  var state = { mode: "all", decals: 0 };

  function readModeFromUrl() {
    try {
      var m = new URLSearchParams(window.location.search).get("content");
      if (m === "kid" || m === "teen" || m === "all") return m;
    } catch (e) { /* ignore */ }
    return null;
  }

  function readModeFromStore() {
    try {
      var m = window.localStorage.getItem(STORE_KEY);
      if (m === "kid" || m === "teen" || m === "all") return m;
    } catch (e) { /* ignore */ }
    return null;
  }

  function readModeFromGlobal() {
    try {
      var g = window.FourweirdContentMode;
      if (g && (g.mode === "kid" || g.mode === "teen" || g.mode === "all")) return g.mode;
    } catch (e) { /* ignore */ }
    return null;
  }

  function resolveMode() {
    return readModeFromUrl() || readModeFromStore() || readModeFromGlobal() || "all";
  }

  function bloodEnabled() {
    // Explicit bridge flag wins; otherwise teen|all bleed, kid never does.
    try {
      var g = window.FourweirdContentMode;
      if (g && typeof g.goreEnabled === "boolean") return g.goreEnabled;
    } catch (e) { /* ignore */ }
    return state.mode === "teen" || state.mode === "all";
  }

  function setMode(mode) {
    if (mode !== "kid" && mode !== "teen" && mode !== "all") return;
    state.mode = mode;
    try { window.localStorage.setItem(STORE_KEY, mode); } catch (e) { /* ignore */ }
  }

  window.addEventListener("fourweird-content-mode", function (ev) {
    try {
      var detail = (ev && ev.detail) || {};
      if (detail.mode) setMode(detail.mode);
      else {
        var m = readModeFromGlobal();
        if (m) setMode(m);
      }
    } catch (e) { /* ignore */ }
  });

  // ---------- DOM overlay layer ----------
  function container() {
    return document.getElementById("canvasContainer") || document.body;
  }

  function ensureLayer() {
    var host = container();
    var layer = document.getElementById("gg2d-gore-layer");
    if (layer && layer.parentNode === host) return layer;
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = document.createElement("div");
    layer.id = "gg2d-gore-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:40;";
    try {
      var cs = window.getComputedStyle(host);
      if (cs.position === "static") host.style.position = "relative";
    } catch (e) { /* ignore */ }
    host.appendChild(layer);
    return layer;
  }

  // Map internal 1000x600 game coords to overlay px.
  function toOverlay(x, y) {
    try {
      var canvas = document.getElementById("gameCanvas");
      var layer = ensureLayer();
      if (!canvas) return { x: x, y: y, layer: layer };
      var cr = canvas.getBoundingClientRect();
      var lr = layer.getBoundingClientRect();
      var sx = cr.width / 1000;
      var sy = cr.height / 600;
      return { x: cr.left - lr.left + x * sx, y: cr.top - lr.top + y * sy, layer: layer };
    } catch (e) {
      return { x: x, y: y, layer: ensureLayer() };
    }
  }

  function pruneDecals(layer) {
    while (layer.querySelectorAll("[data-gg2d-decal]").length > MAX_DECALS) {
      var first = layer.querySelector("[data-gg2d-decal]");
      if (!first) break;
      first.remove();
    }
  }

  function addDecal(p, opts) {
    try {
      var layer = ensureLayer();
      var d = document.createElement("div");
      d.setAttribute("data-gg2d-decal", "1");
      var size = opts.size || (6 + Math.random() * 10);
      d.style.cssText =
        "position:absolute;left:" + p.x + "px;top:" + p.y + "px;width:" + size + "px;height:" +
        size * (opts.flat ? 0.45 : 1) + "px;border-radius:" + (opts.round ? "50%" : "40%") +
        ";background:" + opts.color + ";opacity:" + (opts.opacity || 0.85) +
        ";transform:translate(-50%,-50%) rotate(" + Math.floor(Math.random() * 360) + "deg);" +
        "transition:opacity 30s linear;";
      layer.appendChild(d);
      pruneDecals(layer);
      // Floor decals fade over ~30s.
      window.setTimeout(function () { d.style.opacity = "0"; }, 100);
      window.setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, DECAL_FADE_MS + 500);
    } catch (e) { /* overlay is cosmetic; never throw */ }
  }

  function addDroplet(p, color) {
    try {
      var layer = ensureLayer();
      var s = document.createElement("div");
      var size = 3 + Math.random() * 5;
      var dx = (Math.random() * 2 - 1) * 46;
      var dy = -12 - Math.random() * 38;
      s.style.cssText =
        "position:absolute;left:" + p.x + "px;top:" + p.y + "px;width:" + size + "px;height:" + size +
        "px;border-radius:50%;background:" + color + ";opacity:0.95;pointer-events:none;" +
        "transition:left 0.45s ease-out,top 0.45s ease-in,opacity 0.6s;";
      layer.appendChild(s);
      window.requestAnimationFrame(function () {
        s.style.left = p.x + dx + "px";
        s.style.top = p.y + dy + 52 + "px";
        s.style.opacity = "0";
      });
      window.setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 700);
    } catch (e) { /* ignore */ }
  }

  function addFloater(p, text, color) {
    try {
      var layer = ensureLayer();
      var f = document.createElement("div");
      f.textContent = text;
      f.style.cssText =
        "position:absolute;left:" + p.x + "px;top:" + p.y + "px;transform:translate(-50%,-100%);" +
        "font-weight:800;font-size:18px;color:" + color +
        ";text-shadow:0 2px 6px rgba(0,0,0,0.8);pointer-events:none;" +
        "transition:top 0.9s ease-out,opacity 0.9s;";
      layer.appendChild(f);
      window.requestAnimationFrame(function () {
        f.style.top = p.y - 46 + "px";
        f.style.opacity = "0";
      });
      window.setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
    } catch (e) { /* ignore */ }
  }

  var PETALS = ["#f9a8d4", "#fda4af", "#fde68a", "#c4b5fd", "#86efac"];
  var SPARKS = ["#fef08a", "#fde68a", "#ffffff", "#fbcfe8"];

  function bloodBurst(x, y) {
    var p = toOverlay(x, y);
    for (var i = 0; i < 10; i++) addDroplet(p, i % 3 === 0 ? "#7f1d1d" : "#dc2626");
    for (var j = 0; j < 4; j++) {
      addDecal(toOverlay(x + (Math.random() * 40 - 20), y + (Math.random() * 24 - 12)), {
        color: j % 2 ? "#991b1b" : "#dc2626", flat: true, opacity: 0.8,
      });
    }
  }

  function poofBurst(x, y) {
    var p = toOverlay(x, y);
    for (var i = 0; i < 8; i++) addDroplet(p, i % 2 ? "#e5e7eb" : "#d1d5db");
    for (var j = 0; j < 5; j++) {
      addDroplet(toOverlay(x + (Math.random() * 30 - 15), y + (Math.random() * 20 - 10)),
        SPARKS[Math.floor(Math.random() * SPARKS.length)]);
    }
    for (var k = 0; k < 4; k++) {
      addDecal(toOverlay(x + (Math.random() * 44 - 22), y + (Math.random() * 26 - 13)), {
        color: PETALS[Math.floor(Math.random() * PETALS.length)], round: false, opacity: 0.9,
      });
    }
    addFloater(p, "POOF! ✨", "#fef9c3");
    // In-canvas poof so canvas-only observers see the kid effect too.
    try {
      var vfx = window.GraveGainGame && window.GraveGainGame.vfx;
      if (vfx) {
        if (typeof vfx.spawnSparks === "function") vfx.spawnSparks(x, y, "white", 12);
        if (typeof vfx.spawnRing === "function") vfx.spawnRing(x, y, "#fef9c3", 60, 0.4);
        if (typeof vfx.spawnFloater === "function") vfx.spawnFloater(x, y - 30, "POOF!", "#fef9c3");
      }
    } catch (e) { /* ignore */ }
  }

  /** Public burst: routes to blood or poof based on current mode. */
  function burst(x, y) {
    if (bloodEnabled()) bloodBurst(x, y);
    else poofBurst(x, y);
  }

  function edgeSplatter() {
    if (!bloodEnabled()) return;
    try {
      var layer = ensureLayer();
      var s = document.createElement("div");
      s.setAttribute("data-gg2d-edge", "1");
      s.style.cssText =
        "position:absolute;inset:0;pointer-events:none;opacity:0.55;" +
        "background:radial-gradient(ellipse at center, transparent 55%, rgba(220,38,38,0.55) 100%);" +
        "transition:opacity 1.2s;";
      layer.appendChild(s);
      window.setTimeout(function () { s.style.opacity = "0"; }, 60);
      window.setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1400);
    } catch (e) { /* ignore */ }
  }

  // ---------- live-instance hooks (polled, best-effort) ----------
  var hookedVfx = null;
  var lastPlayerHp = null;

  function hookVfx(vfx) {
    if (!vfx || hookedVfx === vfx) return;
    hookedVfx = vfx;
    ["spawnBlood", "spawnGore"].forEach(function (name) {
      try {
        var orig = vfx[name];
        if (typeof orig !== "function" || orig.__gg2dWrapped) return;
        var wrapped = function (x, y, color) {
          if (bloodEnabled()) {
            var r = orig.call(this, x, y, color); // parity: bundle effect stays
            try { bloodBurst(x, y); } catch (e) { /* ignore */ }
            return r;
          }
          // Kid mode: suppress in-canvas blood, emit poof instead.
          try { poofBurst(x, y); } catch (e) { /* ignore */ }
          return undefined;
        };
        wrapped.__gg2dWrapped = true;
        vfx[name] = wrapped;
      } catch (e) { /* ignore */ }
    });
  }

  function poll() {
    try {
      var game = window.GraveGainGame;
      if (game && game.vfx) hookVfx(game.vfx);
      // Player-hurt edge splatter: hp drops on the live instance.
      if (game && game.player && typeof game.player.hp === "number") {
        if (lastPlayerHp !== null && game.player.hp < lastPlayerHp) edgeSplatter();
        lastPlayerHp = game.player.hp;
      }
    } catch (e) { /* never break the game loop */ }
    window.setTimeout(poll, 500);
  }

  // ---------- FourweirdGore.spawn routing ----------
  try {
    if (window.FourweirdGore && typeof window.FourweirdGore.spawn === "function") {
      var origSpawn = window.FourweirdGore.spawn;
      window.FourweirdGore.spawn = function (x, y, opts) {
        try { burst(x, y); } catch (e) { /* ignore */ }
        return origSpawn.call(this, x, y, opts);
      };
    } else {
      window.FourweirdGore = window.FourweirdGore || {};
      if (typeof window.FourweirdGore.spawn !== "function") {
        window.FourweirdGore.spawn = function (x, y) { burst(x, y); };
      }
    }
  } catch (e) { /* ignore */ }

  state.mode = resolveMode();
  window.GraveGain2DGore = {
    burst: burst,
    setMode: setMode,
    get mode() { return state.mode; },
    get enabled() { return bloodEnabled(); },
  };

  poll();
})();
