/**
 * GraveGain5D - v2 platform save bridge (game-side).
 *
 * Mirrors public/games/gravegain4d/engine/savebridge.js and speaks the
 * { version: 1 } postMessage protocol the Next.js play shell
 * (GameRuntimeFrame / public/games/html/runtime-bridge.js) expects:
 *
 *   game -> host: ready, save, error, score, stats, metering
 *   host -> game: host-ready, load, save-ack, content-mode, a11y,
 *                 fullscreen (enter / exit / toggle), pause, resume, reset
 *
 * Snapshot contract (JSON-serializable only):
 *   {
 *     schema: 1, slug: "gravegain5d",
 *     profile: { best, wins, settings },
 *     lastScore
 *   }
 *
 * Game wiring: this bridge scrapes window.GraveGain5D (score()) and the
 * profile in localStorage ("gravegain5d_save_v1"). Host loads merge
 * best/wins/settings into that profile key, are staged on
 * window.__gravegain5dPendingLoad, and broadcast as a
 * "fourweird-cloud-load" event for a live-aware game to apply.
 *
 * Explicit hooks for the runtime:
 *   window.GraveGain5DSaveBridge.requestSave("reason");
 *   window.GraveGain5DSaveBridge.reportScore({ gold, hops, kills, level });
 *   window.GraveGain5DSaveBridge.reportStats();
 *   window.GraveGain5DSaveBridge.missionComplete({ gold, hops, kills });
 *   window.dispatchEvent(new CustomEvent("fourweird-request-save",
 *     { detail: { reason: "transcend" } }));
 *
 * Fullscreen contract: overlay button ONLY (gg5dFsBtn), shell helper first
 * (window.__fourweirdToggleFullscreen), native request with webkit fallback
 * otherwise. NO dblclick listeners, NO key fullscreen shortcuts.
 *
 * Never throws; idempotent (safe to include twice).
 */
(function () {
  "use strict";

  try {
    if (typeof window === "undefined") return;
    if (window.GraveGain5DSaveBridge) return;

    var SLUG = "gravegain5d";
    var SCHEMA = 1;
    var SAVE_SLOT = 0;
    var TRUSTED_ORIGINS = ["https://4weird.com", "https://www.4weird.com"];
    var GAME_SAVE_KEY = "gravegain5d_save_v1";
    var LS_SNAPSHOT_KEY = "gravegain5d:savebridge:snapshot";
    var LS_PENDING_KEY = "gravegain5d:savebridge:pending-load";

    var lastScore = null;

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

    function readProfile() {
      try {
        var raw = window.localStorage ? window.localStorage.getItem(GAME_SAVE_KEY) : null;
        if (!raw) return { best: 0, wins: 0, settings: null };
        var p = JSON.parse(raw);
        if (!p || typeof p !== "object") return { best: 0, wins: 0, settings: null };
        return {
          best: (typeof p.best === "number" && isFinite(p.best)) ? p.best : 0,
          wins: (typeof p.wins === "number" && isFinite(p.wins)) ? p.wins : 0,
          settings: (p.settings && typeof p.settings === "object") ? p.settings : null
        };
      } catch (e) { return { best: 0, wins: 0, settings: null }; }
    }

    function getSnapshot() {
      try {
        return { schema: SCHEMA, slug: SLUG, profile: readProfile(), lastScore: lastScore };
      } catch (e) { return null; }
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
        var msg = { type: "score", slot: SAVE_SLOT, schema_version: SCHEMA };
        try {
          if (detail && typeof detail === "object" && !Array.isArray(detail)) {
            for (var k in detail) {
              if (Object.prototype.hasOwnProperty.call(detail, k)) msg[k] = detail[k];
            }
          }
        } catch (e) {}
        if (msg.value == null) {
          var total = 0;
          try {
            total += (+msg.gold || 0) + (+msg.hops || 0) * 2 + (+msg.kills || 0) * 2 + (+msg.level || 1) * 10;
            if (msg.win) total += 100;
          } catch (e) {}
          msg.value = total;
        }
        try { lastScore = msg.value; } catch (e) {}
        post(msg);
      } catch (e) { /* best-effort */ }
    }

    function reportStats() {
      try {
        var profile = readProfile();
        post({
          type: "stats",
          slot: SAVE_SLOT,
          schema_version: SCHEMA,
          best: profile.best,
          wins: profile.wins,
          lastScore: lastScore
        });
      } catch (e) { /* best-effort */ }
    }

    function reportError(message) {
      try { post({ type: "error", message: "GraveGain5D: " + String(message == null ? "failed to load" : message) }); } catch (e) {}
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
        var incoming = (snap && snap.profile) || snap || null;
        var applied = false;
        if (incoming && typeof incoming === "object") {
          try {
            var current = readProfile();
            var merged = {
              v: SAVE_VERSION_GUARD(),
              best: Math.max(current.best, +incoming.best || 0),
              wins: Math.max(current.wins, +incoming.wins || 0),
              settings: incoming.settings && typeof incoming.settings === "object"
                ? incoming.settings
                : current.settings
            };
            if (window.localStorage) window.localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(merged));
            applied = true;
          } catch (e) { /* storage unavailable; still stage below */ }
          try {
            window.__gravegain5dPendingLoad = incoming;
            if (window.localStorage) window.localStorage.setItem(LS_PENDING_KEY, JSON.stringify(incoming));
          } catch (e) {}
        }
        try {
          window.dispatchEvent(new CustomEvent("fourweird-cloud-load", {
            detail: { slug: SLUG, slot: SAVE_SLOT, data: incoming, applied: applied, reason: "host-load" }
          }));
        } catch (e) {}
        return applied;
      } catch (e) { return false; }
    }

    function SAVE_VERSION_GUARD() { return 1; }

    // ---- Fullscreen (mirrors gravegain4d): button-only, shell first. ----
    function gg5dToggleFullscreen() {
      try {
        if (typeof window.__fourweirdToggleFullscreen === "function") {
          window.__fourweirdToggleFullscreen();
          return;
        }
        var target = document.getElementById("gg5dStage") || document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          var p = target.requestFullscreen ? target.requestFullscreen()
            : (target.webkitRequestFullscreen ? target.webkitRequestFullscreen() : null);
          if (p && p.catch) p.catch(function () {});
        } else if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }

    function gg5dFullscreenMode(mode) {
      try {
        var m = mode === "enter" || mode === "exit" || mode === "toggle" ? mode : "toggle";
        var fs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        if (m === "enter") { if (!fs) gg5dToggleFullscreen(); }
        else if (m === "exit") { if (fs) gg5dToggleFullscreen(); }
        else gg5dToggleFullscreen();
      } catch (e) {}
    }

    function wireOverlayButton() {
      try {
        var btn = document.getElementById("gg5dFsBtn");
        if (!btn) return;
        // The bundle's own inline script already wires this button; only add
        // the shell-first toggle when it is still unwired.
        if (btn.getAttribute("data-gg5d-bridge-wired") === "1") return;
        btn.setAttribute("data-gg5d-bridge-wired", "1");
        btn.addEventListener("click", function () {
          try {
            if (typeof window.__fourweirdToggleFullscreen === "function") {
              window.__fourweirdToggleFullscreen();
            }
          } catch (e) {}
        });
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
            try { gg5dFullscreenMode(data && data.mode); } catch (e) {}
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

    // Explicit save hooks for the runtime (e.g. after reaching Prime Array):
    //   window.GraveGain5DSaveBridge.requestSave("transcend");
    //   window.dispatchEvent(new CustomEvent("fourweird-request-save",
    //     { detail: { reason: "transcend" } }));
    // Run end posts score + stats + save in one call:
    //   window.GraveGain5DSaveBridge.missionComplete({ gold, hops, kills });
    try {
      window.addEventListener("fourweird-request-save", function (event) {
        try {
          var r = (event && event.detail && event.detail.reason) || undefined;
          requestSave(r);
        } catch (e) {}
      });
    } catch (e) {}
    try {
      window.__fourweirdRequestSave = window.__fourweirdRequestSave || function (reason) { requestSave(reason); };
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

    try {
      wireOverlayButton();
      document.addEventListener("DOMContentLoaded", wireOverlayButton);
      window.addEventListener("load", wireOverlayButton);
    } catch (e) {}

    function missionComplete(detail) {
      try {
        reportScore(detail);
        reportStats();
        var reason = "transcend";
        try {
          if (detail && detail.universe != null) reason = "transcend:" + String(detail.universe);
        } catch (e) {}
        requestSave(reason);
      } catch (e) {}
    }

    var api = {
      slug: SLUG,
      schema: SCHEMA,
      getSnapshot: getSnapshot,
      requestSave: requestSave,
      reportScore: reportScore,
      reportStats: reportStats,
      reportError: reportError,
      missionComplete: missionComplete,
      toggleFullscreen: gg5dToggleFullscreen
    };
    try { window.GraveGain5DSaveBridge = api; } catch (e) {}

    try {
      window.addEventListener("load", function () {
        announceReady();
        setTimeout(announceReady, 1500);
        setTimeout(announceUntilAck, 2500);
        setTimeout(reportBytes, 3000);
        try { wireOverlayButton(); } catch (e) {}
      });
    } catch (e) {}
    try {
      if (document.readyState === "complete") announceReady();
    } catch (e) {}
  } catch (e) { /* bridge is best-effort; the game stays playable */ }
})();
