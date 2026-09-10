/**
 * 4weird Games - v2 runtime bridge.
 *
 * Loaded by the canonical bundles at /games/<slug>/index.html (injected by
 * scripts/sync-game-bundles.mjs). Speaks the { version: 1 } postMessage
 * protocol the Next.js play shell (GameRuntimeFrame) expects:
 *
 *   game -> host: ready, error, score, metering
 *   host -> game: host-ready, load, save-ack, pause, resume, reset
 *
 * Why this exists: the preserved v1 game bundles predate the play shell, so
 * none of them post "ready". Without it the shell sits on "Loading original
 * HTML runtime..." forever and cloud saves never hydrate. This bridge gives
 * every game the handshake (plus error forwarding and the copyGameLink
 * helper the legacy templates call but never defined) without touching the
 * byte-identical sources under public/games/html/ or their old-v1 parity.
 */
(function () {
  "use strict";

  var TRUSTED_ORIGINS = [
    "https://4weird.com",
    "https://www.4weird.com",
    "https://4weird.games",
    "https://www.4weird.games",
  ];

  function currentSlug() {
    try {
      var tagged =
        document.currentScript && document.currentScript.getAttribute("data-slug");
      if (tagged) return tagged;
    } catch (e) {
      /* document.currentScript may be unavailable; fall through */
    }
    try {
      var match = window.location.pathname.match(/\/games\/([^/]+)\//);
      if (match) return match[1];
    } catch (e) {
      /* location may be restricted; fall through */
    }
    return "unknown";
  }

  var SLUG = currentSlug();

  function isHostOrigin(origin) {
    if (origin === window.location.origin) return true;
    return TRUSTED_ORIGINS.indexOf(origin) !== -1;
  }

  // The shell may live on the apex while the bundle was redirected to www
  // (or vice versa). document.referrer carries the framing page, so prefer
  // its origin and only fall back to "*" for the no-payload ready ping.
  function hostTarget() {
    try {
      if (document.referrer) {
        var origin = new URL(document.referrer).origin;
        if (isHostOrigin(origin)) return origin;
      }
    } catch (e) {
      /* malformed referrer; fall through */
    }
    return "*";
  }

  function post(message) {
    try {
      var payload = { version: 1, slug: SLUG };
      for (var key in message) {
        if (Object.prototype.hasOwnProperty.call(message, key)) {
          payload[key] = message[key];
        }
      }
      window.parent.postMessage(payload, hostTarget());
    } catch (e) {
      /* postMessage unavailable (e.g. sandboxed without allow-same-origin) */
    }
  }

  function announceReady() {
    post({ type: "ready" });
  }

  // The shell attaches its message listener after first paint; announce on
  // load and once more shortly after so a late listener still handshakes.
  // (The shell dedupes: extra ready pings only re-trigger a save fetch.)
  //
  // Metering: report this document's fresh network bytes (transferSize is 0
  // for cache hits, so a service-worker / HTTP-cached load reports ~0 and
  // the play-metering API waives the load fee for < 1 MiB of new data).
  function reportBytes() {
    var total = 0;
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      if (nav && nav.transferSize) total += nav.transferSize;
      var res = performance.getEntriesByType("resource");
      for (var i = 0; i < res.length; i += 1) {
        total += res[i].transferSize || 0;
      }
    } catch (e) {
      /* performance API unavailable; shell bills the load normally */
    }
    post({ type: "metering", bytes: total });
  }

  window.addEventListener("load", function () {
    announceReady();
    setTimeout(announceReady, 1500);
    // Late assets (audio, levels) land after load; report once settled.
    setTimeout(reportBytes, 3000);
  });
  if (document.readyState === "complete") announceReady();

  // Forward fatal runtime errors so the shell shows the real failure instead
  // of "Loading original HTML runtime..." forever. Resource 404s do not reach
  // a bubble-phase window listener, so this only fires for JS exceptions.
  window.addEventListener("error", function (event) {
    var detail =
      (event && (event.message || (event.error && event.error.message))) ||
      "failed to load";
    post({ type: "error", message: "Runtime error: " + detail });
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason =
      (event && event.reason && (event.reason.message || String(event.reason))) ||
      "failed to load";
    post({ type: "error", message: "Runtime error: " + reason });
  });

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.version !== 1 || !isHostOrigin(event.origin)) return;
    switch (data.type) {
      case "host-ready":
        break;
      case "reset":
        try {
          window.location.reload();
        } catch (e) {
          /* navigation blocked; shell already confirmed the reset */
        }
        break;
      case "pause":
      case "resume":
        // Games that learn the protocol listen for these; legacy games
        // ignore them (pause/resume stays a shell-side no-op, as today).
        try {
          window.dispatchEvent(new CustomEvent("fourweird-" + data.type));
        } catch (e) {
          /* CustomEvent unsupported; ignore */
        }
        break;
      case "load":
        // Stash the cloud save where future game code can pick it up.
        try {
          window.__fourweirdCloudSave = data;
          window.localStorage.setItem(
            "fourweird-v2-cloud-save:" + SLUG,
            JSON.stringify(data)
          );
        } catch (e) {
          /* storage unavailable; ignore */
        }
        break;
      case "fullscreen":
        // Fullscreen is applied by the shell to its own iframe; nothing to do
        // inside the runtime.
        break;
      default:
        break;
    }
  });

  // Legacy templates call copyGameLink() from an inline share button, but no
  // bundle defines it (only semester-survival does). Define it once so the
  // button copies instead of throwing a ReferenceError.
  if (typeof window.copyGameLink !== "function") {
    window.copyGameLink = function copyGameLink() {
      var url = window.location.href;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).catch(function () {});
          return;
        }
      } catch (e) {
        /* clipboard API unavailable; fall through to execCommand */
      }
      try {
        var area = document.createElement("textarea");
        area.value = url;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      } catch (e) {
        /* copy unavailable; ignore */
      }
    };
  }
})();
