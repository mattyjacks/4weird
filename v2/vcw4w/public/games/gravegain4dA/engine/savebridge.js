/**
 * GraveGain4D - v2 platform save bridge (game-side).
 *
 * Mirrors the conventions of gravegain3d/index.html (fullscreen-button +
 * refit sections) and speaks the { version: 1 } postMessage protocol the
 * Next.js play shell (GameRuntimeFrame) expects — see
 * public/games/html/runtime-bridge.js lines 1-120:
 *
 *   game -> host: ready, save, error, score, metering (+ stats via shell)
 *   host -> game: host-ready, load, content-mode, a11y, fullscreen
 *                 (enter / exit / toggle), pause, resume, reset
 *
 * Snapshot contract (JSON-serializable only):
 *   {
 *     schema: 1, slug: "gravegain4d",
 *     player: { hp, maxHp, gold, sands, strokes },
 *     missionId, dungeonSeed, brane, codex: [...]
 *   }
 *
 * Game wiring: the 4D runtime registers live accessors —
 *   window.__gravegain4dSnapshot = {
 *     get: () => ({...}),   // return the snapshot above (or null)
 *     set: (snap) => {...}  // apply a host load snapshot
 *   };
 * or, equivalently, expose state on window.GraveGain4D / window.GraveGainGame
 * (player { hp/maxHp/gold/sands/strokes }, missionId, dungeonSeed, brane,
 * codex[]) and this bridge scrapes it. Setter missing => the snapshot is
 * staged on window.__gravegain4dPendingLoad + localStorage and a
 * "fourweird-cloud-load" event is broadcast for a live-aware game to apply.
 *
 * Fullscreen contract (mirrors gravegain3d): overlay button ONLY, shell
 * helper first (window.__fourweirdToggleFullscreen), native request with
 * webkit fallback otherwise. NO dblclick listeners (rapid putt clicks would
 * fire them mid-swing), NO F-key fullscreen (class/ability input owns F).
 * Refit callbacks run on fullscreenchange / resize / fourweird-fullscreen.
 *
 * Never throws; idempotent (safe to include twice).
 */
(function () {
  "use strict";

  try {
    if (typeof window === "undefined") return;
    if (window.GraveGain4DSaveBridge) return;

    var SLUG = "gravegain4d";
    var SCHEMA = 1;
    var SAVE_SLOT = 0;
    var TRUSTED_ORIGINS = ["https://4weird.com", "https://www.4weird.com"];
    var LS_SNAPSHOT_KEY = "gravegain4d:savebridge:snapshot";
    var LS_PENDING_KEY = "gravegain4d:savebridge:pending-load";

    function isHostOrigin(origin) {
      try {
        if (origin === window.location.origin) return true;
      } catch (e) { /* location restricted */ }
      return TRUSTED_ORIGINS.indexOf(origin) !== -1;
    }

    function hostTarget() {
      try {
        if (document.referrer) {
          var origin = new URL(document.referrer).origin;
          if (isHostOrigin(origin)) return origin;
        }
      } catch (e) { /* malformed referrer; fall through */ }
      return "*";
    }

    function post(message) {
      try {
        var payload = { version: 1, slug: SLUG };
        for (var key in message) {
          if (Object.prototype.hasOwnProperty.call(message, key)) payload[key] = message[key];
        }
        window.parent.postMessage(payload, hostTarget());
      } catch (e) { /* postMessage unavailable */ }
    }

    function num(v, dflt) {
      try {
        if (typeof v === "number" && isFinite(v)) return v;
        var n = Number(v);
        if (isFinite(n)) return n;
      } catch (e) { /* ignore */ }
      return dflt;
    }

    function str(v, dflt) {
      try {
        if (typeof v === "string") return v;
        if (v == null) return dflt;
        return String(v);
      } catch (e) { return dflt; }
    }

    function cleanCodex(v) {
      var out = [];
      try {
        if (Array.isArray(v)) {
          for (var i = 0; i < v.length && out.length < 256; i += 1) {
            var s = str(v[i], "");
            if (s) out.push(s.slice(0, 128));
          }
        }
      } catch (e) { /* ignore */ }
      return out;
    }

    function scrapeGameState() {
      try {
        var g = null;
        try {
          g = window.GraveGain4D || window.GraveGainGame || window.GG4D || null;
        } catch (e) { g = null; }
        if (!g || typeof g !== "object") return null;
        var p = (g.player && typeof g.player === "object") ? g.player : g;
        var player = {
          hp: num(p.hp != null ? p.hp : p.HP, 0),
          maxHp: num(p.maxHp != null ? p.maxHp : p.maxHP, 0),
          gold: num(p.gold, 0),
          sands: num(p.sands != null ? p.sands : p.sand, 0),
          strokes: Math.max(0, Math.floor(num(p.strokes, 0)))
        };
        var missionId = g.missionId != null ? g.missionId : (g.mission != null ? g.mission : null);
        if (missionId != null && typeof missionId === "object" && missionId.id != null) missionId = missionId.id;
        return {
          schema: SCHEMA,
          slug: SLUG,
          player: player,
          missionId: missionId == null ? null : (typeof missionId === "number" ? missionId : str(missionId, "")),
          dungeonSeed: g.dungeonSeed != null ? g.dungeonSeed : (g.seed != null ? g.seed : null),
          brane: g.brane != null ? g.brane : (g.fold != null ? g.fold : null),
          codex: cleanCodex(g.codex != null ? g.codex : g.codexUnlocks)
        };
      } catch (e) { return null; }
    }

    function normalizeSnapshot(raw) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      var player = (raw.player && typeof raw.player === "object") ? raw.player : {};
      var snap = {
        schema: SCHEMA,
        slug: SLUG,
        player: {
          hp: num(player.hp, 0),
          maxHp: num(player.maxHp, 0),
          gold: num(player.gold, 0),
          sands: num(player.sands, 0),
          strokes: Math.max(0, Math.floor(num(player.strokes, 0)))
        },
        missionId: raw.missionId == null ? null : raw.missionId,
        dungeonSeed: raw.dungeonSeed == null ? null : raw.dungeonSeed,
        brane: raw.brane == null ? null : raw.brane,
        codex: cleanCodex(raw.codex)
      };
      try {
        JSON.stringify(snap); // must be JSON-serializable
      } catch (e) { return null; }
      return snap;
    }

    function getSnapshot() {
      try {
        var hooks = null;
        try { hooks = window.__gravegain4dSnapshot || null; } catch (e) { hooks = null; }
        if (hooks && typeof hooks.get === "function") {
          try {
            var fromHook = normalizeSnapshot(hooks.get());
            if (fromHook) return fromHook;
          } catch (e) { /* hook threw; fall through to scrape */ }
        }
        var scraped = scrapeGameState();
        if (scraped) {
          var clean = normalizeSnapshot(scraped);
          if (clean) return clean;
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    function setSnapshot(snap) {
      var clean = normalizeSnapshot(snap);
      if (!clean) return false;
      var applied = false;
      try {
        var hooks = null;
        try { hooks = window.__gravegain4dSnapshot || null; } catch (e) { hooks = null; }
        if (hooks && typeof hooks.set === "function") {
          try {
            var r = hooks.set(clean);
            applied = r !== false;
          } catch (e) { applied = false; }
        }
      } catch (e) { applied = false; }
      // Stage for late-booting runtimes regardless: init reads pending first.
      try { window.__gravegain4dPendingLoad = clean; } catch (e) {}
      try {
        if (window.localStorage) window.localStorage.setItem(LS_PENDING_KEY, JSON.stringify(clean));
      } catch (e) { /* storage unavailable */ }
      try {
        window.dispatchEvent(new CustomEvent("fourweird-cloud-load", {
          detail: { slug: SLUG, slot: SAVE_SLOT, data: clean, applied: applied, reason: "host-load" }
        }));
      } catch (e) {}
      return applied;
    }

    function announceReady() { post({ type: "ready" }); }

    function reportBytes() {
      var total = 0;
      try {
        var nav = performance.getEntriesByType("navigation")[0];
        if (nav && nav.transferSize) total += nav.transferSize;
        var res = performance.getEntriesByType("resource");
        for (var i = 0; i < res.length; i += 1) total += res[i].transferSize || 0;
      } catch (e) { /* performance API unavailable */ }
      post({ type: "metering", bytes: total });
    }

    function requestSave(reason) {
      try {
        var snap = getSnapshot();
        if (!snap) return false;
        try {
          if (window.localStorage) window.localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(snap));
        } catch (e) { /* storage unavailable; still post */ }
        var msg = { type: "save", slot: SAVE_SLOT, schema_version: SCHEMA, data: snap };
        try { if (typeof reason === "string" && reason) msg.reason = reason; } catch (e) {}
        post(msg);
        return true;
      } catch (e) { return false; }
    }

    function reportScore(detail) {
      try {
        var snap = getSnapshot();
        var msg = { type: "score", slot: SAVE_SLOT, schema_version: SCHEMA };
        try {
          if (detail && typeof detail === "object" && !Array.isArray(detail)) {
            for (var k in detail) {
              if (Object.prototype.hasOwnProperty.call(detail, k)) msg[k] = detail[k];
            }
          }
        } catch (e) {}
        if (msg.missionId == null && snap) msg.missionId = snap.missionId;
        if (msg.strokes == null && snap) msg.strokes = snap.player.strokes;
        if (msg.gold == null && snap) msg.gold = snap.player.gold;
        post(msg);
      } catch (e) { /* best-effort */ }
    }

    function reportError(message) {
      try { post({ type: "error", message: "GraveGain4D: " + str(message, "failed to load") }); } catch (e) {}
    }

    // ---- Host handshake: announce until the shell acks (host-ready). ----
    var hostAcked = false;
    var readyTries = 0;
    function announceUntilAck() {
      try {
        if (hostAcked || readyTries >= 15) return;
        readyTries += 1;
        announceReady();
        setTimeout(announceUntilAck, 2000);
      } catch (e) {}
    }

    function applyHostLoad(data) {
      try {
        var snap = (data && data.data) || data || null;
        // Accept both bridge-shaped { data: snapshot } and raw snapshots.
        if (snap && snap.data && typeof snap.data === "object") snap = snap.data;
        setSnapshot(snap);
      } catch (e) { /* storage unavailable; ignore */ }
    }

    // ---- Fullscreen (mirrors gravegain3d): button-only, shell first. ----
    // F is gameplay input (fold/ability) and must never toggle fullscreen;
    // double-click is disabled (rapid putt clicks fired it mid-swing).
    var refitCallbacks = [];

    function gg4dRefit() {
      try {
        for (var i = 0; i < refitCallbacks.length; i += 1) {
          try { refitCallbacks[i](); } catch (e) { /* one bad callback must not break the rest */ }
        }
      } catch (e) {}
      try {
        var g = window.GraveGain4D || window.GraveGainGame || null;
        var box = document.getElementById("gravegain4d-canvas-wrap")
          || document.getElementById("canvasContainer") || null;
        var w = Math.max(320, (box && box.clientWidth) || window.innerWidth || 1000);
        var h = Math.max(240, (box && box.clientHeight) || window.innerHeight || 600);
        if (g && g.camera3d) {
          g.camera3d.aspect = w / h;
          if (typeof g.camera3d.updateProjectionMatrix === "function") g.camera3d.updateProjectionMatrix();
        }
        if (g && g.camera4d && typeof g.camera4d.refit === "function") {
          try { g.camera4d.refit(w, h); } catch (e) {}
        }
        if (g && g.renderer && typeof g.renderer.setSize === "function") g.renderer.setSize(w, h);
      } catch (e) {}
    }

    function gg4dToggleFullscreen() {
      try {
        if (typeof window.__fourweirdToggleFullscreen === "function") {
          window.__fourweirdToggleFullscreen();
          return;
        }
        var target = document.getElementById("gravegain4d-canvas-wrap")
          || document.getElementById("canvasContainer")
          || document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          var p = target.requestFullscreen ? target.requestFullscreen()
            : (target.webkitRequestFullscreen ? target.webkitRequestFullscreen() : null);
          if (p && p.catch) p.catch(function () {});
        } else if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }

    function gg4dFullscreenMode(mode) {
      try {
        var m = mode === "enter" || mode === "exit" || mode === "toggle" ? mode : "toggle";
        var fs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        if (m === "enter") { if (!fs) gg4dToggleFullscreen(); }
        else if (m === "exit") { if (fs) gg4dToggleFullscreen(); }
        else gg4dToggleFullscreen();
        try { setTimeout(gg4dRefit, 0); } catch (e) {}
      } catch (e) {}
    }

    function wireOverlayButton() {
      try {
        var btn = document.getElementById("gravegain4d-fullscreen-btn");
        if (!btn) return;
        if (btn.getAttribute("data-gg4d-wired") === "1") return;
        btn.setAttribute("data-gg4d-wired", "1");
        btn.addEventListener("click", gg4dToggleFullscreen);
      } catch (e) {}
    }

    // ---- Host -> game messages. ----
    window.addEventListener("message", function (event) {
      try {
        var data = event.data;
        if (!data || data.version !== 1 || !isHostOrigin(event.origin)) return;
        if (data.slug && data.slug !== SLUG) return;
        switch (data.type) {
          case "host-ready":
            hostAcked = true;
            break;
          case "load":
            applyHostLoad(data);
            break;
          case "save-ack":
            break; // shell confirmed receipt; nothing to do game-side
          case "content-mode":
            try {
              var mode = data && data.mode;
              if (mode === "kid" || mode === "teen" || mode === "all") {
                try {
                  if (window.localStorage) window.localStorage.setItem("4weird-content-mode:" + SLUG, mode);
                } catch (e) {}
                try {
                  window.dispatchEvent(new CustomEvent("fourweird-content-mode-host", {
                    detail: { slug: SLUG, mode: mode }
                  }));
                } catch (e) {}
              }
            } catch (e) {}
            break;
          case "a11y":
            try {
              window.dispatchEvent(new CustomEvent("fourweird-a11y-host", {
                detail: { slug: SLUG, settings: (data && data.settings) || {} }
              }));
            } catch (e) {}
            break;
          case "fullscreen":
            try { gg4dFullscreenMode(data && data.mode); } catch (e) {}
            break;
          case "pause":
          case "resume":
            try { window.dispatchEvent(new CustomEvent("fourweird-" + data.type)); } catch (e) {}
            break;
          case "reset":
            try { window.location.reload(); } catch (e) {}
            break;
          default:
            break;
        }
      } catch (e) { /* host messages are best-effort */ }
    });

    window.addEventListener("error", function (event) {
      try {
        var detail = (event && (event.message || (event.error && event.error.message))) || "failed to load";
        reportError(detail);
      } catch (e) {}
    });
    window.addEventListener("unhandledrejection", function (event) {
      try {
        var reason = (event && event.reason && (event.reason.message || String(event.reason))) || "failed to load";
        reportError(reason);
      } catch (e) {}
    });

    // Explicit save hooks for the runtime (e.g. after mission complete):
    //   window.GraveGain4DSaveBridge.requestSave("mission-complete");
    //   window.dispatchEvent(new CustomEvent("fourweird-request-save",
    //     { detail: { reason: "mission-complete" } }));
    // Mission complete also posts score + save in one call:
    //   window.GraveGain4DSaveBridge.missionComplete({ missionId, strokes, gold });
    try {
      window.addEventListener("fourweird-request-save", function (event) {
        try {
          var r = (event && event.detail && event.detail.reason) || undefined;
          requestSave(r);
        } catch (e) {}
      });
    } catch (e) {}
    try {
      window.__fourweirdRequestSave = function (reason) { requestSave(reason); };
    } catch (e) {}
    try {
      document.addEventListener("visibilitychange", function () {
        try { if (document.visibilityState === "hidden") requestSave("hide"); } catch (e) {}
      });
      window.addEventListener("pagehide", function () {
        try { requestSave("hide"); } catch (e) {}
        try { reportBytes(); } catch (e) {}
      });
    } catch (e) {}

    try { document.addEventListener("fullscreenchange", gg4dRefit); } catch (e) {}
    try { document.addEventListener("webkitfullscreenchange", gg4dRefit); } catch (e) {}
    try {
      window.addEventListener("fourweird-fullscreen", function () {
        try { gg4dRefit(); } catch (e) {}
      });
    } catch (e) {}
    try { window.addEventListener("resize", gg4dRefit); } catch (e) {}
    try {
      wireOverlayButton();
      document.addEventListener("DOMContentLoaded", wireOverlayButton);
      window.addEventListener("load", wireOverlayButton);
    } catch (e) {}

    function missionComplete(detail) {
      try {
        reportScore(detail);
        var reason = "mission-complete";
        try {
          if (detail && detail.missionId != null) reason = "mission-complete:" + String(detail.missionId);
        } catch (e) {}
        requestSave(reason);
      } catch (e) {}
    }

    var api = {
      slug: SLUG,
      schema: SCHEMA,
      getSnapshot: getSnapshot,
      setSnapshot: setSnapshot,
      requestSave: requestSave,
      reportScore: reportScore,
      reportError: reportError,
      missionComplete: missionComplete,
      toggleFullscreen: gg4dToggleFullscreen,
      refit: gg4dRefit,
      onRefit: function (fn) {
        try {
          if (typeof fn === "function") refitCallbacks.push(fn);
        } catch (e) {}
      }
    };
    try { window.GraveGain4DSaveBridge = api; } catch (e) {}

    try {
      window.addEventListener("load", function () {
        announceReady();
        setTimeout(announceReady, 1500);
        setTimeout(announceUntilAck, 2500);
        setTimeout(reportBytes, 3000);
        try { wireOverlayButton(); } catch (e) {}
        try { gg4dRefit(); } catch (e) {}
      });
    } catch (e) {}
    try {
      if (document.readyState === "complete") announceReady();
    } catch (e) {}
  } catch (e) { /* bridge is best-effort; the game stays playable */ }
})();
