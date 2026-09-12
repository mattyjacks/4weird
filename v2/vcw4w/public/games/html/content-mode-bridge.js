/**
 * 4weird Games - v2 content-mode bridge (v2-native extra, NOT a v1 bundle).
 *
 * Served at /games/html/content-mode-bridge.js and injected into the
 * canonical bundles by scripts/sync-game-bundles.mjs (after runtime-bridge.js)
 * for content-mode games only (gravegain2d, gravegain3d, lastwordszombies).
 *
 * Vanilla IIFE, no imports. Reads the mode from ?content=, then localStorage
 * `4weird-content-mode:<slug>`, defaults to "teen". Exposes:
 *   window.FourweirdContentMode = { mode, slug, goreEnabled, drugsAllowed,
 *     sanitize(text), filterNpcLine(text) }
 *   window.FourweirdGore = { spawn(x, y, opts), enabled }
 * and dispatches a window "fourweird-content-mode" event on every switch.
 * The host shell switches modes live via postMessage
 * { version: 1, type: "content-mode", mode } (persist + re-dispatch +
 * re-apply gore flag). Gore overlay: red particles when enabled, sparkle
 * puffs in kid mode. A MutationObserver masks hard swears in text nodes when
 * mode !== "all". Everything is try/catch; the game stays playable if this
 * bridge fails.
 */
(function () {
  "use strict";

  var MODES = ["kid", "teen", "all"];
  var STORAGE_PREFIX = "4weird-content-mode:";
  var DEFAULT_MODE = "teen";

  function currentSlug() {
    try {
      var tagged = document.currentScript && document.currentScript.getAttribute("data-slug");
      if (tagged) return tagged;
    } catch (e) {}
    try {
      var match = window.location.pathname.match(/\/games\/([^/]+)\//);
      if (match) return match[1];
    } catch (e) {}
    return "unknown";
  }

  var SLUG = currentSlug();

  function parseMode(value) {
    try {
      var v = String(value == null ? "" : value).trim().toLowerCase();
      if (v === "kid" || v === "teen" || v === "all") return v;
    } catch (e) {}
    return null;
  }

  function readMode() {
    try {
      var qs = parseMode(new URL(window.location.href).searchParams.get("content"));
      if (qs) return qs;
    } catch (e) {}
    try {
      var stored = parseMode(window.localStorage.getItem(STORAGE_PREFIX + SLUG));
      if (stored) return stored;
    } catch (e) {}
    return DEFAULT_MODE;
  }

  var state = { mode: readMode() };

  function goreEnabled() {
    return state.mode !== "kid";
  }

  function drugsAllowed() {
    return state.mode === "all";
  }

  var HARD = ["fuck", "fucking", "fucker", "fucked", "shit", "bitch", "bastard", "asshole"];
  var MILD = { damn: "drats", hell: "heck", crap: "crud", piss: "pees", sucks: "stinks", suck: "stink" };
  var DRUGS = ["weed", "marijuana", "cannabis", "cocaine", "heroin", "meth", "lsd", "shrooms", "opium", "hash"];

  function replaceWords(text, words, replacement) {
    var out = String(text);
    for (var i = 0; i < words.length; i += 1) {
      try {
        out = out.replace(new RegExp("\\b" + words[i] + "s?\\b", "gi"), replacement);
      } catch (e) {}
    }
    return out;
  }

  function sanitize(text) {
    try {
      var input = String(text == null ? "" : text);
      if (state.mode === "all") return input;
      if (state.mode === "teen") return replaceWords(input, HARD, "#@$%!");
      var out = replaceWords(input, HARD, "oh no!");
      out = out.replace(/\bfuck\w*\b/gi, "golly");
      for (var key in MILD) {
        if (Object.prototype.hasOwnProperty.call(MILD, key)) {
          out = out.replace(new RegExp("\\b" + key + "s?\\b", "gi"), MILD[key]);
        }
      }
      out = replaceWords(out, DRUGS, "sparkleaf");
      return out;
    } catch (e) {
      return String(text == null ? "" : text);
    }
  }

  // ---- Gore overlay: full-viewport canvas, pointer-events none. ----
  var overlay = null;
  var particles = [];
  var rafId = 0;

  function ensureOverlay() {
    try {
      if (overlay && overlay.isConnected) return overlay;
      var canvas = document.createElement("canvas");
      canvas.setAttribute("id", "fourweird-gore-overlay");
      canvas.style.position = "fixed";
      canvas.style.inset = "0";
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "2147483000";
      var resize = function () {
        try {
          canvas.width = window.innerWidth || 800;
          canvas.height = window.innerHeight || 600;
        } catch (e) {}
      };
      resize();
      try {
        window.addEventListener("resize", resize);
      } catch (e) {}
      (document.body || document.documentElement).appendChild(canvas);
      overlay = canvas;
      return canvas;
    } catch (e) {
      return null;
    }
  }

  function tick() {
    try {
      var canvas = ensureOverlay();
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var next = [];
      for (var i = 0; i < particles.length; i += 1) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.life -= 1;
        if (p.life <= 0) continue;
        next.push(p);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      particles = next.slice(-320);
      ctx.globalAlpha = 1;
      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
        try {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } catch (e) {}
      }
    } catch (e) {}
  }

  function kick() {
    try {
      if (!rafId && particles.length > 0) rafId = window.requestAnimationFrame(tick);
    } catch (e) {}
  }

  function spawn(x, y, opts) {
    try {
      var count = Math.max(1, Math.min(60, (opts && opts.count) || 14));
      var kid = state.mode === "kid";
      // Kid mode: blood is never drawn — sparkle puffs instead.
      var colors = kid
        ? ["#fde68a", "#fbcfe8", "#bae6fd", "#fef3c7"]
        : (opts && opts.color) || (state.mode === "all" ? "#7f1d1d" : "#c1121f");
      var palette = Array.isArray(colors) ? colors : [colors];
      var w = window.innerWidth || 800;
      var h = window.innerHeight || 600;
      var px = typeof x === "number" ? x : w / 2;
      var py = typeof y === "number" ? y : h / 2;
      if (px <= 1 && py <= 1) {
        px = px * w;
        py = py * h;
      }
      ensureOverlay();
      for (var i = 0; i < count; i += 1) {
        // Gore OFF (kid mode draws sparkles; a direct spawn call with
        // blood:false is a no-op so injected gore modules stay silent).
        if (!goreEnabled() && !(opts && opts.sparkle) && !kid) continue;
        var ang = Math.random() * Math.PI * 2;
        var spd = 1 + Math.random() * 3;
        particles.push({
          x: px,
          y: py,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.5,
          size: kid ? 2 + Math.random() * 3 : 1.5 + Math.random() * 3.5,
          color: palette[i % palette.length],
          life: 25 + Math.random() * 25,
        });
      }
      kick();
    } catch (e) {}
  }

  // ---- Profanity MutationObserver: mask hard swears in text nodes. ----
  var observing = false;
  function maskNodeText(node) {
    try {
      if (!node || node.nodeType !== 3) return;
      var original = node.nodeValue;
      if (!original || original.length > 2000) return;
      var masked = sanitize(original);
      if (masked !== original) node.nodeValue = masked;
    } catch (e) {}
  }

  function sweep(root) {
    try {
      var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
      var node = walker.nextNode();
      var budget = 0;
      while (node && budget < 500) {
        budget += 1;
        maskNodeText(node);
        node = walker.nextNode();
      }
    } catch (e) {}
  }

  function startObserver() {
    try {
      if (observing || !window.MutationObserver || !document.body) return;
      observing = true;
      var observer = new MutationObserver(function (mutations) {
        try {
          if (state.mode === "all") return;
          for (var i = 0; i < mutations.length; i += 1) {
            var m = mutations[i];
            if (m.type === "characterData") maskNodeText(m.target);
            else if (m.type === "childList") {
              for (var j = 0; j < m.addedNodes.length; j += 1) {
                var n = m.addedNodes[j];
                if (n.nodeType === 3) maskNodeText(n);
                else if (n.nodeType === 1) sweep(n);
              }
            }
          }
        } catch (e) {}
      });
      observer.observe(document.body, { characterData: true, childList: true, subtree: true });
    } catch (e) {}
  }

  function dispatch() {
    try {
      window.dispatchEvent(
        new CustomEvent("fourweird-content-mode", {
          detail: { slug: SLUG, mode: state.mode, goreEnabled: goreEnabled(), drugsAllowed: drugsAllowed() },
        })
      );
    } catch (e) {}
  }

  function applyMode(next, persist) {
    try {
      var parsed = parseMode(next);
      if (!parsed || parsed === state.mode) return;
      state.mode = parsed;
      if (persist !== false) {
        try {
          window.localStorage.setItem(STORAGE_PREFIX + SLUG, parsed);
        } catch (e) {}
      }
      if (window.FourweirdGore) {
        try {
          window.FourweirdGore.enabled = goreEnabled();
        } catch (e) {}
      }
      if (window.FourweirdContentMode) {
        try {
          window.FourweirdContentMode.mode = parsed;
          window.FourweirdContentMode.goreEnabled = goreEnabled();
          window.FourweirdContentMode.drugsAllowed = drugsAllowed();
        } catch (e) {}
      }
      if (state.mode !== "all") sweep(document.body);
      dispatch();
    } catch (e) {}
  }

  try {
    window.FourweirdContentMode = {
      mode: state.mode,
      slug: SLUG,
      goreEnabled: goreEnabled(),
      drugsAllowed: drugsAllowed(),
      sanitize: sanitize,
      filterNpcLine: sanitize,
    };
  } catch (e) {}

  try {
    window.FourweirdGore = window.FourweirdGore || { spawn: spawn, enabled: goreEnabled() };
    if (!window.FourweirdGore.spawn) window.FourweirdGore.spawn = spawn;
    try {
      window.FourweirdGore.enabled = goreEnabled();
    } catch (e) {}
  } catch (e) {}

  // Live switch from the host shell (and from runtime-bridge.js forwarding).
  try {
    window.addEventListener("message", function (event) {
      try {
        var data = event.data;
        if (!data || data.version !== 1 || data.type !== "content-mode") return;
        applyMode(data.mode, true);
      } catch (e) {}
    });
  } catch (e) {}

  try {
    window.addEventListener("fourweird-content-mode-host", function (event) {
      try {
        var detail = (event && event.detail) || {};
        applyMode(detail.mode, true);
      } catch (e) {}
    });
  } catch (e) {}

  try {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      sweep(document.body);
      startObserver();
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        sweep(document.body);
        startObserver();
      });
    }
    window.addEventListener("load", function () {
      sweep(document.body);
      startObserver();
    });
  } catch (e) {}

  dispatch();
})();
