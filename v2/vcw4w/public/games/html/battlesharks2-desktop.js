/* BattleSharks2 DESKTOP + PERFORMANCE + ACCESS layer (v2-native).
 *
 * Source: public/games/html/battlesharks2-desktop.js (sibling of the
 * parity-locked public/games/html/battlesharks2/ tree, so cpSync never
 * carries it). Injected by reference into the GENERATED bundle only by
 * scripts/sync-game-bundles.mjs (existsSync-guarded, only-when-absent).
 * The tracked bundle sources (game.js / index.html / game.css) and old-v1/
 * are never touched.
 *
 * What it does (all defensive, all try/catch, vanilla IIFE, no imports):
 *   1. DESKTOP keyboard-first: hold-to-fire on Space / Control (remappable,
 *      persisted), E/Tab lab focus-trap fix, Esc/P pause parity with the
 *      host (fourweird-pause / fourweird-resume + postMessage pause/resume).
 *      WASD/arrows movement already lives in the bundle and is not
 *      reimplemented here.
 *   2. PERFORMANCE high-DPI: backing store follows devicePixelRatio capped
 *      at 2 via ResizeObserver + window resize + wrapping the bundle's
 *      global resizeCanvas (no bundle edit: the original is saved and
 *      called through).
 *   3. ACCESS reduced-motion: prefers-reduced-motion + fourweird-a11y host
 *      events damp screen shake (CSS kill + shake-screen class strip) and
 *      particle counts (wrapping createExplosion/createBloodSplat when
 *      present as globals).
 *   4. ACCESS colorblind-safe pickups: canvas-adjacent legend with
 *      shape/pattern badges (solid/dashed/dotted + emoji + text). Game art
 *      is never recolored.
 *   5. PERFORMANCE FPS guard: sustained rAF delta > 24ms auto-degrades the
 *      particle multiplier (recovers when fast again).
 */
(function () {
  "use strict";

  if (window.__bs2Desktop && window.__bs2Desktop.installed) return;
  try {
    window.__bs2Desktop = window.__bs2Desktop || {};
    window.__bs2Desktop.installed = true;
  } catch (e) { /* marker best-effort */ }

  function each(fn) {
    try { fn(); } catch (e) { /* every feature is best-effort */ }
  }

  function $(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  function isFormTarget(t) {
    try {
      if (!t || !t.tagName) return false;
      var tag = String(t.tagName).toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (t.isContentEditable) return true;
    } catch (e) { /* fall through */ }
    return false;
  }

  var canvas = null;
  var container = null;
  each(function () {
    canvas = $("gameCanvas");
    container = $("viewportContainer") || (canvas && canvas.parentElement);
    if (!canvas || !container) throw new Error("no-canvas");
  });
  if (!canvas || !container) return;

  /* ---------- shared mutable flags ---------- */
  var reducedMotion = false;
  var fpsScale = 1; // 1 -> 0.5 -> 0.25 under sustained load
  try {
    window.__bs2Perf = window.__bs2Perf || {};
    window.__bs2Perf.particleScale = fpsScale;
  } catch (e) {}

  function effectiveCount(count) {
    try {
      var n = Number(count);
      if (!isFinite(n) || n < 0) n = 0;
      var scale = fpsScale * (reducedMotion ? 0.25 : 1);
      return Math.max(n === 0 ? 0 : 1, Math.ceil(n * scale));
    } catch (e) { return count; }
  }

  /* ---------- 2. high-DPI canvas scaling (DPR capped at 2) ---------- */
  var DPR_CAP = 2;
  function applyDpr() {
    try {
      var dpr = 1;
      try { dpr = window.devicePixelRatio || 1; } catch (e) { dpr = 1; }
      dpr = Math.min(Math.max(dpr || 1, 1), DPR_CAP);
      var w = container.clientWidth || 0;
      var h = container.clientHeight || 0;
      if (!w || !h) return;
      // Game logic reads canvas.width/height as world units and maps the
      // mouse via canvas.width/rect.width, so a larger backing store only
      // sharpens rendering without changing gameplay coordinates.
      var bw = Math.max(1, Math.round(w * dpr));
      var bh = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      try {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      } catch (e) {}
    } catch (e) { /* DPI scaling is best-effort */ }
  }

  each(function wrapBundleResize() {
    try {
      if (typeof window.resizeCanvas === "function" && !window.resizeCanvas.__bs2Wrapped) {
        var orig = window.resizeCanvas;
        var wrapped = function () {
          try { orig.apply(this, arguments); } catch (e) {}
          applyDpr();
        };
        try { wrapped.__bs2Wrapped = true; } catch (e) {}
        window.resizeCanvas = wrapped;
      }
    } catch (e) {}
    try { window.addEventListener("resize", function () { applyDpr(); }); } catch (e) {}
    try {
      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function () { applyDpr(); });
        ro.observe(container);
      }
    } catch (e) {}
    applyDpr();
  });

  /* ---------- 3. ACCESS: reduced-motion ---------- */
  function ensureMotionStyle() {
    try {
      var style = $("bs2ReducedMotionStyle");
      if (!style) {
        style = document.createElement("style");
        style.setAttribute("id", "bs2ReducedMotionStyle");
        (document.head || document.documentElement).appendChild(style);
      }
      // Kill the bundle's infinite shake/pulse/alert animations only. Game
      // art and layout are untouched.
      style.textContent = reducedMotion
        ? ".shake-screen{animation:none!important}" +
          "#bs2DesktopRoot .pulse-ring,.lab-trigger-btn .pulse-ring{animation:none!important;opacity:0!important}" +
          ".boss-warning-alert{animation:none!important}"
        : "";
    } catch (e) {}
  }

  function setReducedMotion(on) {
    try {
      reducedMotion = !!on;
      try { window.__bs2Perf.reducedMotion = reducedMotion; } catch (e) {}
      try {
        if (document.documentElement) {
          if (reducedMotion) document.documentElement.setAttribute("data-bs2-reduced-motion", "on");
          else document.documentElement.removeAttribute("data-bs2-reduced-motion");
        }
      } catch (e) {}
      ensureMotionStyle();
      if (reducedMotion) stripShakeClass();
    } catch (e) {}
  }

  function stripShakeClass() {
    try {
      if (container.classList) container.classList.remove("shake-screen");
    } catch (e) {}
  }

  each(function initReducedMotion() {
    // (a) OS-level preference.
    try {
      if (window.matchMedia) {
        var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReducedMotion(mq && mq.matches);
        try {
          if (mq && typeof mq.addEventListener === "function") {
            mq.addEventListener("change", function (ev) { setReducedMotion(ev && ev.matches); });
          } else if (mq && typeof mq.addListener === "function") {
            mq.addListener(function (ev) { setReducedMotion(ev && ev.matches); });
          }
        } catch (e) {}
      }
    } catch (e) {}
    // (b) Host a11y events: the fourweird-a11y CustomEvent channel plus the
    // host->game postMessage protocol ({version:1,type:"a11y"|...}).
    function fromSettings(s) {
      try {
        if (!s || typeof s !== "object") return;
        if (typeof s.motion !== "undefined") setReducedMotion(!!s.motion);
        else if (typeof s.reducedMotion !== "undefined") setReducedMotion(!!s.reducedMotion);
        else if (typeof s.reduceMotion !== "undefined") setReducedMotion(!!s.reduceMotion);
      } catch (e) {}
    }
    try {
      window.addEventListener("fourweird-a11y", function (ev) {
        try { fromSettings(ev && ev.detail && (ev.detail.settings || ev.detail)); } catch (e) {}
      });
    } catch (e) {}
    try {
      document.addEventListener("fourweird-a11y", function (ev) {
        try { fromSettings(ev && ev.detail && (ev.detail.settings || ev.detail)); } catch (e) {}
      });
    } catch (e) {}
    try {
      window.addEventListener("message", function (ev) {
        try {
          var d = ev && ev.data;
          if (!d || d.version !== 1 || d.type !== "a11y") return;
          fromSettings(d.settings);
        } catch (e) {}
      });
    } catch (e) {}
    // (c) Never leave a stuck shake class on while reduced.
    try {
      if (typeof MutationObserver !== "undefined") {
        var mo = new MutationObserver(function () {
          if (reducedMotion) stripShakeClass();
        });
        mo.observe(container, { attributes: true, attributeFilter: ["class"] });
      }
    } catch (e) {}
    ensureMotionStyle();
  });

  // Damp particle counts by wrapping the bundle globals when present.
  // Retried (game.js may load after this layer in slow parses).
  function wrapParticleFns() {
    try {
      if (typeof window.createExplosion === "function" && !window.createExplosion.__bs2Wrapped) {
        var origExplosion = window.createExplosion;
        var wrappedExplosion = function (x, y, color, count) {
          try { return origExplosion.call(this, x, y, color, effectiveCount(count === undefined ? 20 : count)); }
          catch (e) { return undefined; }
        };
        try { wrappedExplosion.__bs2Wrapped = true; } catch (e) {}
        window.createExplosion = wrappedExplosion;
      }
    } catch (e) {}
    try {
      if (typeof window.createBloodSplat === "function" && !window.createBloodSplat.__bs2Wrapped) {
        var origSplat = window.createBloodSplat;
        var wrappedSplat = function (x, y, count) {
          try { return origSplat.call(this, x, y, effectiveCount(count === undefined ? 8 : count)); }
          catch (e) { return undefined; }
        };
        try { wrappedSplat.__bs2Wrapped = true; } catch (e) {}
        window.createBloodSplat = wrappedSplat;
      }
    } catch (e) {}
  }
  each(function initParticleWrap() {
    wrapParticleFns();
    try {
      var tries = 0;
      var timer = setInterval(function () {
        try {
          tries += 1;
          wrapParticleFns();
          if (tries >= 10) clearInterval(timer);
        } catch (e) { try { clearInterval(timer); } catch (e2) {} }
      }, 1000);
    } catch (e) {}
    try { window.addEventListener("load", wrapParticleFns); } catch (e) {}
  });

  /* ---------- 5. PERFORMANCE: FPS guard ---------- */
  each(function initFpsGuard() {
    var last = 0;
    var slowStreak = 0;
    var fastStreak = 0;
    var scales = [1, 0.5, 0.25];
    var level = 0;
    function setLevel(n) {
      try {
        level = Math.max(0, Math.min(scales.length - 1, n));
        fpsScale = scales[level];
        try { window.__bs2Perf.particleScale = fpsScale; } catch (e) {}
        try { window.__bs2Perf.fpsLevel = level; } catch (e) {}
      } catch (e) {}
    }
    function tick(t) {
      try {
        if (last) {
          var delta = t - last;
          // Sustained frame time above 24ms degrades particles one step;
          // sustained fast frames recover one step.
          if (delta > 24) {
            slowStreak += 1;
            fastStreak = 0;
            if (slowStreak >= 45 && level < scales.length - 1) {
              setLevel(level + 1);
              slowStreak = 0;
            }
          } else if (delta < 14) {
            fastStreak += 1;
            slowStreak = 0;
            if (fastStreak >= 240 && level > 0) {
              setLevel(level - 1);
              fastStreak = 0;
            }
          } else {
            slowStreak = 0;
            fastStreak = 0;
          }
        }
        last = t;
      } catch (e) {}
      try { requestAnimationFrame(tick); } catch (e) {}
    }
    try { requestAnimationFrame(function (t) { last = t || 0; requestAnimationFrame(tick); }); }
    catch (e) {}
  });

  /* ---------- 1a. DESKTOP: remappable hold-to-fire (Space / Ctrl) ---------- */
  var FIRE_STORE = "battlesharks2-desktop:fireKeys";
  var fireKeys = ["Space", "Control"];
  each(function loadFireKeys() {
    try {
      var raw = window.localStorage.getItem(FIRE_STORE);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        fireKeys = parsed.filter(function (k) {
          return k === "Space" || k === "Control";
        });
        if (!fireKeys.length) fireKeys = ["Space", "Control"];
      }
    } catch (e) {}
  });
  function saveFireKeys() {
    try { window.localStorage.setItem(FIRE_STORE, JSON.stringify(fireKeys)); } catch (e) {}
  }
  var heldFire = {};
  var fireTimer = null;
  function doFire() {
    try {
      // Prefer the bundle's own shooter (aim + upgrade gates stay intact);
      // fall back to a synthetic click pair on the canvas.
      if (typeof window.fireWeapon === "function") {
        window.fireWeapon();
        return;
      }
      var rect = null;
      try { rect = canvas.getBoundingClientRect(); } catch (e) { return; }
      if (!rect) return;
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      function synth(type) {
        try {
          var ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0 });
          (canvas || document.body).dispatchEvent(ev);
        } catch (e) {}
      }
      synth("mousedown");
      synth("mouseup");
      synth("click");
    } catch (e) {}
  }
  function pumpFire() {
    try {
      var any = false;
      for (var k in heldFire) { if (heldFire[k]) { any = true; break; } }
      if (!any) {
        if (fireTimer) { clearInterval(fireTimer); fireTimer = null; }
        return;
      }
      if (!fireTimer) {
        doFire();
        fireTimer = setInterval(doFire, 120);
      }
    } catch (e) {}
  }
  function keyName(ev) {
    try {
      if (ev.code === "Space" || ev.key === " ") return "Space";
      if (ev.code === "ControlLeft" || ev.code === "ControlRight" || ev.key === "Control") return "Control";
    } catch (e) {}
    return null;
  }
  each(function initFireKeys() {
    try {
      window.addEventListener("keydown", function (ev) {
        try {
          if (isFormTarget(ev.target)) return;
          var name = keyName(ev);
          if (!name || fireKeys.indexOf(name) === -1) return;
          // Space scrolls the page; claim it for the game while playing.
          if (name === "Space") { try { ev.preventDefault(); } catch (e) {} }
          if (!ev.repeat) {
            heldFire[name] = true;
            pumpFire();
          }
        } catch (e) {}
      });
      window.addEventListener("keyup", function (ev) {
        try {
          var name = keyName(ev);
          if (!name) return;
          heldFire[name] = false;
          pumpFire();
        } catch (e) {}
      });
      window.addEventListener("blur", function () {
        try {
          heldFire = {};
          pumpFire();
        } catch (e) {}
      });
    } catch (e) {}
  });

  /* ---------- 1b. DESKTOP: lab focus-trap fix + pause parity ---------- */
  function labOpen() {
    try {
      var lab = $("rdLabOverlay");
      return !!(lab && !lab.classList.contains("hidden"));
    } catch (e) { return false; }
  }
  function focusablesIn(root) {
    try {
      var list = root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      var out = [];
      for (var i = 0; i < list.length; i += 1) {
        try {
          var el = list[i];
          if (el && el.offsetParent !== null) out.push(el);
        } catch (e) {}
      }
      return out;
    } catch (e) { return []; }
  }
  var lastFocus = null;
  each(function initLabTrap() {
    // Capture phase: run before the bundle's own window keydown toggle so a
    // trapped Tab never reaches it (the bundle toggles the lab on every Tab,
    // which otherwise yanks keyboard users out of the modal mid-upgrade).
    try {
      window.addEventListener("keydown", function (ev) {
        try {
          if (!labOpen()) return;
          var lab = $("rdLabOverlay");
          if (!lab) return;
          if (ev.key === "Tab") {
            var items = focusablesIn(lab);
            if (!items.length) { try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {} return; }
            var first = items[0];
            var lastEl = items[items.length - 1];
            var active = document.activeElement;
            if (ev.shiftKey && (active === first || !lab.contains(active))) {
              try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
              try { lastEl.focus(); } catch (e) {}
            } else if (!ev.shiftKey && active === lastEl) {
              try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
              try { first.focus(); } catch (e) {}
            } else {
              // Keep Tab inside the modal even when the cycle is mid-list.
              try { ev.stopPropagation(); } catch (e) {}
            }
          } else if (ev.key === "Escape") {
            // Close the lab instead of toggling pause underneath it.
            try { ev.preventDefault(); ev.stopPropagation(); } catch (e) {}
            try {
              if (typeof window.toggleLab === "function") window.toggleLab();
              else {
                var btn = $("btnResumeFromLab") || $("btnCloseLab");
                if (btn) btn.click();
              }
            } catch (e) {}
          }
        } catch (e) {}
      }, true);
    } catch (e) {}
    // Focus handoff: into the modal on open, back to the trigger on close.
    try {
      var lab = $("rdLabOverlay");
      if (lab && typeof MutationObserver !== "undefined") {
        var mo = new MutationObserver(function () {
          try {
            if (labOpen()) {
              try { lastFocus = document.activeElement; } catch (e) {}
              var items = focusablesIn(lab);
              try { (items[0] || lab).focus && (items[0] || lab).focus(); } catch (e) {}
              try {
                var modal = lab.querySelector(".lab-modal");
                if (modal && !modal.hasAttribute("tabindex")) modal.setAttribute("tabindex", "-1");
              } catch (e) {}
            } else if (lastFocus && lastFocus.focus) {
              try { lastFocus.focus(); } catch (e) {}
              lastFocus = null;
            }
          } catch (e) {}
        });
        mo.observe(lab, { attributes: true, attributeFilter: ["class"] });
      }
    } catch (e) {}
  });

  each(function initPauseParity() {
    // Host pause/resume protocol: runtime-bridge.js dispatches
    // fourweird-pause / fourweird-resume CustomEvents for
    // {version:1,type:"pause"|"resume"} host messages. Drive the bundle's
    // own togglePause (Esc/P parity) instead of inventing a second pause.
    function toggleOnce() {
      try {
        if (typeof window.togglePause === "function") { window.togglePause(); return; }
        var btn = $("btnPauseGame");
        if (btn) btn.click();
      } catch (e) {}
    }
    function isPaused() {
      try {
        var ps = $("pauseScreen");
        if (ps && !ps.classList.contains("hidden")) return true;
      } catch (e) {}
      return false;
    }
    try {
      window.addEventListener("fourweird-pause", function () {
        try { if (!isPaused() && !labOpen()) toggleOnce(); } catch (e) {}
      });
    } catch (e) {}
    try {
      window.addEventListener("fourweird-resume", function () {
        try { if (isPaused() && !labOpen()) toggleOnce(); } catch (e) {}
      });
    } catch (e) {}
    try {
      window.addEventListener("message", function (ev) {
        try {
          var d = ev && ev.data;
          if (!d || d.version !== 1) return;
          if (d.type === "pause") {
            if (!isPaused() && !labOpen()) toggleOnce();
          } else if (d.type === "resume") {
            if (isPaused() && !labOpen()) toggleOnce();
          }
        } catch (e) {}
      });
    } catch (e) {}
  });

  /* ---------- 4. ACCESS: colorblind-safe pickup legend ---------- */
  each(function initLegend() {
    try {
      if ($("bs2PickupLegend")) return;
      var legend = document.createElement("div");
      legend.setAttribute("id", "bs2PickupLegend");
      legend.setAttribute("role", "note");
      legend.setAttribute("aria-label", "Pickup legend: shapes and labels, not color alone. Biomass from prey size. Cyber debris is a gear with a dashed outline. Mutagen is a flask with a dotted outline.");
      legend.setAttribute("title", "Pickup legend (shape + pattern, never color alone)");
      try {
        legend.style.cssText = [
          "position:absolute", "top:12px", "left:12px", "z-index:6",
          "background:rgba(2,2,8,0.82)", "border:1px solid rgba(0,242,254,0.35)",
          "border-radius:10px", "padding:8px 10px", "font-size:11px",
          "line-height:1.5", "color:#e2e8f0", "font-family:inherit",
          "pointer-events:auto", "max-width:230px"
        ].join(";");
      } catch (e) {}
      var rows = [
        { badge: "solid", icon: "\u25CE", label: "Biomass \u2014 prey SIZE/shape (eat to grow)" },
        { badge: "dashed", icon: "\u2699\uFE0F", label: "Cyber Debris \u2014 GEAR, dashed outline" },
        { badge: "dotted", icon: "\u{1F9EA}", label: "Mutagen \u2014 FLASK, dotted outline" }
      ];
      try {
        var head = document.createElement("div");
        head.textContent = "PICKUPS (shape + pattern)";
        try {
          head.style.cssText = "font-weight:700;letter-spacing:1px;font-size:10px;color:#00f2fe;margin-bottom:4px";
        } catch (e) {}
        legend.appendChild(head);
      } catch (e) {}
      rows.forEach(function (row) {
        try {
          var line = document.createElement("div");
          try { line.style.cssText = "display:flex;align-items:center;gap:6px;margin:2px 0"; } catch (e) {}
          var badge = document.createElement("span");
          badge.setAttribute("aria-hidden", "true");
          badge.textContent = row.icon;
          var borderStyle = row.badge === "dashed" ? "dashed" : row.badge === "dotted" ? "dotted" : "solid";
          try {
            badge.style.cssText = "display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border:2px " + borderStyle + " #e2e8f0;border-radius:6px;padding:0 3px";
          } catch (e) {}
          var text = document.createElement("span");
          text.textContent = row.label;
          line.appendChild(badge);
          line.appendChild(text);
          legend.appendChild(line);
        } catch (e) {}
      });
      try {
        var note = document.createElement("div");
        note.textContent = "Keyboard: hold Space / Ctrl to fire \u00B7 Tab stays inside the Lab";
        try { note.style.cssText = "margin-top:4px;color:#94a3b8;font-size:10px"; } catch (e) {}
        legend.appendChild(note);
      } catch (e) {}
      try {
        var hide = document.createElement("button");
        hide.setAttribute("type", "button");
        hide.setAttribute("aria-label", "Hide pickup legend");
        hide.textContent = "\u00D7";
        try {
          hide.style.cssText = "position:absolute;top:2px;right:6px;background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;line-height:1";
        } catch (e) {}
        hide.addEventListener("click", function () {
          try {
            legend.style.display = "none";
            window.localStorage.setItem("battlesharks2-desktop:legend", "hidden");
          } catch (e) {}
        });
        legend.appendChild(hide);
      } catch (e) {}
      try {
        if (window.localStorage.getItem("battlesharks2-desktop:legend") === "hidden") {
          legend.style.display = "none";
        }
      } catch (e) {}
      // Canvas-adjacent: inside the viewport container, next to the canvas.
      // Never drawn onto the canvas, never a recolor of game art.
      try {
        var cs = null;
        try { cs = window.getComputedStyle(container); } catch (e) {}
        if (cs && cs.position === "static") {
          try { container.style.position = "relative"; } catch (e) {}
        }
      } catch (e) {}
      container.appendChild(legend);
    } catch (e) {}
  });

  /* ---------- desktop fire-remap panel (V2 chrome, beside the game) ---------- */
  each(function initRemapPanel() {
    try {
      if ($("bs2FireRemap")) return;
      var row = document.querySelector(".action-row");
      var wrap = document.createElement("div");
      wrap.setAttribute("id", "bs2FireRemap");
      try {
        wrap.style.cssText = "display:flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8";
      } catch (e) {}
      var label = document.createElement("span");
      label.textContent = "Fire keys:";
      wrap.appendChild(label);
      ["Space", "Control"].forEach(function (name) {
        try {
          var lab = document.createElement("label");
          try { lab.style.cssText = "display:inline-flex;align-items:center;gap:4px;cursor:pointer"; } catch (e) {}
          var box = document.createElement("input");
          box.setAttribute("type", "checkbox");
          box.setAttribute("aria-label", "Fire with " + name);
          try { box.checked = fireKeys.indexOf(name) !== -1; } catch (e) {}
          box.addEventListener("change", function () {
            try {
              if (box.checked && fireKeys.indexOf(name) === -1) fireKeys.push(name);
              if (!box.checked) fireKeys = fireKeys.filter(function (k) { return k !== name; });
              if (!fireKeys.length) { fireKeys = [name]; box.checked = true; }
              saveFireKeys();
            } catch (e) {}
          });
          lab.appendChild(box);
          var span = document.createElement("span");
          span.textContent = name === "Space" ? "Space (hold)" : "Ctrl (hold)";
          lab.appendChild(span);
          wrap.appendChild(lab);
        } catch (e) {}
      });
      if (row) row.appendChild(wrap);
      else document.body.appendChild(wrap);
    } catch (e) {}
  });

  each(function markReady() {
    try {
      window.__bs2Desktop.ready = true;
      window.__bs2Desktop.version = "1.0.0";
    } catch (e) {}
  });
})();
