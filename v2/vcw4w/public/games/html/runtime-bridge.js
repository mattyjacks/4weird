/**
 * 4weird Games - v2 runtime bridge.
 *
 * Loaded by the canonical bundles at /games/<slug>/index.html (injected by
 * scripts/sync-game-bundles.mjs). Speaks the { version: 1 } postMessage
 * protocol the Next.js play shell (GameRuntimeFrame) expects:
 *
 *   game -> host: ready, error, metering, stats, save
 *   host -> game: host-ready, load, save-ack, pause, resume, reset,
 *     a11y (colorblind filter, reduced motion, dyslexia spacing, focus
 *     rings - applied inside the frame where shell CSS cannot reach),
 *     input (click / rightclick / key synthesis for face, head-pointer,
 *     dwell, and switch control - normalized 0..1 coords or iframe px).
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
  // the play-metering API bills the proportional exact-bytes load fee).
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

  var hostAcked = false;
  var readyTries = 0;
  function announceUntilAck() {
    if (hostAcked || readyTries >= 15) return;
    readyTries += 1;
    announceReady();
    setTimeout(announceUntilAck, 2000);
  }
  window.addEventListener("load", function () {
    announceReady();
    setTimeout(announceReady, 1500);
    setTimeout(announceUntilAck, 2500);
    // Late assets (audio, levels) land after load; report once settled.
    setTimeout(reportBytes, 3000);
    // Final metering: late level/audio fetches land after the 3s interim
    // report, so re-report the max on pagehide (shell keeps the max).
    try { window.addEventListener("pagehide", reportBytes); } catch (e) {}
  });
  if (document.readyState === "complete") announceReady();
  // MADI hub worlds link to legacy preview URLs (/games/html/madi/<slug>/)
  // which would escape the game-only canonical iframe into full-chrome pages.
  // Reroute them to the canonical play shell instead (v2 layer, no bundle edit).
  try {
    document.addEventListener("click", function (event) {
      var a = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var m = href.match(/\/games\/html\/madi\/([a-z0-9-]+)\/?/);
      if (!m) return;
      event.preventDefault();
      try { window.top.location.href = "/games/" + m[1] + "/play"; }
      catch (e) { window.location.href = "/games/" + m[1] + "/play"; }
    }, true);
  } catch (e) {}

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
        hostAcked = true;
        break;
      case "a11y":
        try {
          applyA11y(data.settings || {});
        } catch (e) {
          /* a11y styling is best-effort; the game stays playable */
        }
        break;
      case "input":
        try {
          applyInput(data);
        } catch (e) {
          /* synthetic input is best-effort */
        }
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
        // Stash the cloud save where future game code can pick it up, and
        // fill in keys MISSING locally (never clobber same-browser state).
        // Legacy games read localStorage at init, before this message can
        // arrive, so restored keys take effect on the NEXT visit - which is
        // exactly the cross-device case cloud saves exist for.
        try {
          window.__fourweirdCloudSave = data;
          window.localStorage.setItem(
            "fourweird-v2-cloud-save:" + SLUG,
            JSON.stringify(data)
          );
          restoreMissingKeys(data && data.data);
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

  // ---- Accessibility: shell settings applied INSIDE the game document. ----
  // Parent-page CSS cannot cross the iframe boundary, so the play shell
  // forwards its a11y object here. Filters are same-document SVG
  // feColorMatrix projections (GPU-cheap, one node on <html>).
  var CB_MATRICES = {
    protanopia: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
    protanomaly: "0.817 0.183 0 0 0  0.333 0.667 0 0 0  0 0.125 0.875 0 0  0 0 0 1 0",
    deuteranopia: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
    deuteranomaly: "0.8 0.2 0 0 0  0.258 0.742 0 0 0  0 0.142 0.858 0 0  0 0 0 1 0",
    tritanopia: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
    tritanomaly: "0.967 0.033 0 0 0  0 0.733 0.267 0 0  0 0.183 0.817 0 0  0 0 0 1 0",
    achromatopsia: "0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0"
  };

  function ensureA11yDefs() {
    try {
      if (document.getElementById("fourweird-a11y-defs")) return;
      var svgNS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("id", "fourweird-a11y-defs");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.setAttribute("aria-hidden", "true");
      svg.style.position = "absolute";
      var defs = document.createElementNS(svgNS, "defs");
      for (var mode in CB_MATRICES) {
        if (!Object.prototype.hasOwnProperty.call(CB_MATRICES, mode)) continue;
        var f = document.createElementNS(svgNS, "filter");
        f.setAttribute("id", "fourweird-cb-" + mode);
        var m = document.createElementNS(svgNS, "feColorMatrix");
        m.setAttribute("type", "matrix");
        m.setAttribute("values", CB_MATRICES[mode]);
        f.appendChild(m);
        defs.appendChild(f);
      }
      svg.appendChild(defs);
      (document.documentElement || document.body).appendChild(svg);
    } catch (e) {
      /* SVG defs unavailable; CSS fallback below still helps */
    }
  }

  function applyA11y(settings) {
    ensureA11yDefs();
    var style = document.getElementById("fourweird-a11y-style");
    if (!style) {
      style = document.createElement("style");
      style.setAttribute("id", "fourweird-a11y-style");
      (document.head || document.documentElement).appendChild(style);
    }
    var css = "";
    if (settings.motion) {
      css += "*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}";
    }
    if (settings.dyslexia || settings.spacing || settings.large) {
      var ls = settings.spacing ? "0.12em" : settings.dyslexia ? "0.06em" : "0";
      var lh = settings.spacing ? "1.9" : settings.dyslexia ? "1.7" : "1.5";
      var fs = settings.large ? "112.5%" : "100%";
      css += "html{font-size:" + fs + "}p,li,span,div,button,a{letter-spacing:" + ls + ";line-height:" + lh + "}";
    }
    // Unmissable focus ring for keyboard / switch / dwell users.
    css += ":focus-visible{outline:3px solid #22d3ee!important;outline-offset:2px!important}";
    style.textContent = css;
    try {
      var root = document.documentElement;
      var mode = settings.colorblind || "none";
      if (mode && mode !== "none" && CB_MATRICES[mode]) {
        root.style.filter = "url(#fourweird-cb-" + mode + ")";
      } else if (settings.contrast) {
        root.style.filter = "contrast(1.2)";
      } else {
        root.style.filter = "";
      }
    } catch (e) {
      /* filter unsupported */
    }
  }

  // ---- Assistive input: face winks, head-pointer dwell, switch presses. ----
  // Coords arrive normalized (nx/ny 0..1 across the game viewport) so the
  // shell never needs iframe geometry; raw x/y pixels are also accepted.
  function inputPoint(data) {
    var w = window.innerWidth || 800;
    var h = window.innerHeight || 600;
    var x, y;
    if (typeof data.nx === "number" && typeof data.ny === "number") {
      x = Math.min(1, Math.max(0, data.nx)) * w;
      y = Math.min(1, Math.max(0, data.ny)) * h;
    } else if (typeof data.x === "number" && typeof data.y === "number") {
      x = Math.min(w - 1, Math.max(0, data.x > 1 ? (data.x % w) : data.x * w));
      y = Math.min(h - 1, Math.max(0, data.y > 1 ? (data.y % h) : data.y * h));
    } else {
      x = w / 2;
      y = h / 2;
    }
    return { x: x, y: y };
  }

  function dispatchAt(type, pt, button) {
    var el = null;
    try {
      el = document.elementFromPoint(pt.x, pt.y);
    } catch (e) {
      el = null;
    }
    var init = { bubbles: true, cancelable: true, clientX: pt.x, clientY: pt.y, button: button || 0 };
    var down, up;
    try {
      if (type === "rightclick") {
        if (el) el.dispatchEvent(new MouseEvent("contextmenu", init));
        return;
      }
      down = new MouseEvent("mousedown", init);
      up = new MouseEvent("mouseup", init);
      var click = new MouseEvent("click", init);
      var target = el || document.body;
      target.dispatchEvent(down);
      target.dispatchEvent(up);
      target.dispatchEvent(click);
      // Canvas games listen on window/document, not the pixel element.
      window.dispatchEvent(new MouseEvent("mousedown", init));
      window.dispatchEvent(new MouseEvent("mouseup", init));
    } catch (e) {
      /* synthetic mouse unsupported */
    }
  }

  var NAMED_KEYS = {
    " ": "Space",
    spacebar: "Space",
    arrowup: "ArrowUp",
    arrowdown: "ArrowDown",
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    esc: "Escape",
    escape: "Escape",
    enter: "Enter",
    shift: "Shift",
    p: "KeyP",
    r: "KeyR",
    n: "KeyN",
    m: "KeyM",
    q: "KeyQ",
    e: "KeyE",
    f: "KeyF",
  };
  function dispatchKey(key, pressed) {
    var raw = String(key == null ? " " : key);
    var lower = raw.toLowerCase();
    var k = NAMED_KEYS[lower] ? (lower === " " || lower === "spacebar" ? " " : NAMED_KEYS[lower]) : raw.slice(0, 1) || " ";
    // Named keys (arrows/Escape/space) keep their full key name; single chars stay literal.
    if (!NAMED_KEYS[lower] && k !== " ") k = raw.slice(0, 1);
    if (NAMED_KEYS[lower] && NAMED_KEYS[lower].indexOf("Arrow") === 0) k = NAMED_KEYS[lower];
    if (NAMED_KEYS[lower] === "Escape") k = "Escape";
    if (NAMED_KEYS[lower] === "Enter") k = "Enter";
    if (NAMED_KEYS[lower] === "Shift") k = "Shift";
    var code = k === " " ? "Space" : k.indexOf("Arrow") === 0 ? k : k === "Escape" ? "Escape" : k === "Enter" ? "Enter" : k === "Shift" ? "ShiftLeft" : "Key" + k.toUpperCase();
    function emit(type) {
      var opts = { key: k, code: code, bubbles: true, cancelable: true };
      try { window.dispatchEvent(new KeyboardEvent(type, opts)); } catch (e) {}
      try { document.dispatchEvent(new KeyboardEvent(type, opts)); } catch (e) {}
      try {
        var active = document.activeElement || document.body;
        if (active) active.dispatchEvent(new KeyboardEvent(type, opts));
      } catch (e) {}
    }
    try {
      // Shell sends pressed:true/false for holds (touch pad, face/switch);
      // legacy callers with no flag get the classic tap (down+up).
      if (pressed === true) emit("keydown");
      else if (pressed === false) emit("keyup");
      else { emit("keydown"); emit("keyup"); }
    } catch (e) {
      /* synthetic keys unsupported */
    }
  }

  function applyInput(data) {
    var action = data.action || data.kind || "click";
    if (action === "key") {
      dispatchKey(data.key, data.pressed);
    } else if (action === "rightclick" || action === "right-click") {
      dispatchAt("rightclick", inputPoint(data), 2);
    } else {
      dispatchAt("click", inputPoint(data), 0);
    }
  }

  // ---- Engagement telemetry + cloud saves for legacy games. ----
  // Legacy bundles never learned the save/stats protocol, so the bridge
  // reports only what it can OBSERVE (never invent):
  //  - stats: visible seconds + real user inputs (keydown/pointerdown seen
  //    in this document), flushed every 60 s and once on pagehide. The
  //    shell POSTs them to /api/stats, so every game's Actions + Play-time
  //    boards populate. kills/deaths stay 0 - the bridge cannot know them.
  //  - save: a localStorage snapshot on pagehide/hidden, posted as the
  //    slot-1 cloud save. Keys already present locally are left alone on
  //    restore, so same-browser state is never clobbered.
  var STATS_FLUSH_MS = 60000;
  var SAVE_BYTES_MAX = 200 * 1024;
  var statActiveSec = 0;
  var statActions = 0;

  function noteAction() {
    statActions += 1;
  }

  try {
    window.addEventListener("keydown", noteAction, true);
    window.addEventListener("pointerdown", noteAction, true);
  } catch (e) {
    /* input observation unavailable; seconds still count */
  }

  try {
    setInterval(function () {
      try {
        if (document.visibilityState !== "hidden") statActiveSec += 1;
      } catch (e) {
        statActiveSec += 1;
      }
    }, 1000);
  } catch (e) {
    /* timers unavailable; flush reports zeros and is skipped */
  }

  function flushStats() {
    var sec = Math.max(0, Math.min(3600, Math.floor(statActiveSec)));
    var acts = Math.max(0, Math.min(100000, Math.floor(statActions)));
    statActiveSec = 0;
    statActions = 0;
    if (sec <= 0 && acts <= 0) return;
    post({ type: "stats", active_seconds: sec, actions: acts, kills: 0, deaths: 0 });
  }

  function snapshotStorage() {
    var keys = {};
    var bytes = 0;
    var store = null;
    try {
      store = window.localStorage;
      if (!store) return null;
    } catch (e) {
      return null;
    }
    try {
      for (var i = 0; i < store.length; i += 1) {
        var k = store.key(i);
        if (!k || k.indexOf("fourweird-v2-cloud-save:") === 0) continue;
        var v = store.getItem(k);
        if (typeof v !== "string") continue;
        if (bytes + k.length + v.length > SAVE_BYTES_MAX) continue;
        keys[k] = v;
        bytes += k.length + v.length;
      }
    } catch (e) {
      return null;
    }
    var names = Object.keys(keys);
    if (names.length === 0) return null;
    return keys;
  }

  function saveNow() {
    var keys = snapshotStorage();
    if (!keys) return;
    post({ type: "save", slot: 1, schema_version: 1, data: { namespace: SLUG, keys: keys } });
  }

  // Fill keys ABSENT from localStorage from a cloud snapshot. Same-browser
  // keys are already current, so touching them would only clobber progress.
  function restoreMissingKeys(cloudData) {
    if (!cloudData || typeof cloudData !== "object") return;
    var keys = cloudData.keys;
    if (!keys || typeof keys !== "object" || Array.isArray(keys)) return;
    var store = null;
    try {
      store = window.localStorage;
      if (!store) return;
    } catch (e) {
      return;
    }
    var bytes = 0;
    for (var k in keys) {
      if (!Object.prototype.hasOwnProperty.call(keys, k)) continue;
      var v = keys[k];
      if (typeof k !== "string" || typeof v !== "string") continue;
      if (bytes + k.length + v.length > SAVE_BYTES_MAX) continue;
      try {
        if (store.getItem(k) === null) {
          store.setItem(k, v);
          bytes += k.length + v.length;
        }
      } catch (e) {
        return; /* quota or access denied; keep what landed */
      }
    }
  }

  function flushAll() {
    flushStats();
    saveNow();
  }

  try {
    setInterval(flushStats, STATS_FLUSH_MS);
  } catch (e) {
    /* timers unavailable */
  }
  try {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushAll();
    });
    window.addEventListener("pagehide", flushAll);
  } catch (e) {
    /* lifecycle events unavailable */
  }

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
