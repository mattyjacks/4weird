/* battlesharks2-mobile.js — v2-native touch layer for BattleSharks 2 ONLY.
 *
 * Vanilla IIFE. NEVER touches the parity-locked battlesharks2/ bundle sources;
 * it is injected by reference into the generated runtime bundle by
 * scripts/sync-game-bundles.mjs (existsSync-guarded).
 *
 * Activation: touch/coarse pointers or small viewport only. Tears itself down
 * on desktop resize (fine pointer + no touch + wide viewport).
 *
 * Control map (mobile):
 *   Left thumb  -> virtual joystick: steers the shark by driving the game's
 *                  OWN mouse-target path (real mousemove MouseEvents on
 *                  #gameCanvas, which the bundle's setupInputListeners maps
 *                  into mouse.x/mouse.y). No blind synthetic keys for swim.
 *   FIRE button -> real mousedown/mouseup (button 0) on #gameCanvas, the same
 *                  path as left-click. Hold (or double-tap-hold on canvas)
 *                  repeats the shot on an interval (bundle fires once per
 *                  press; mouse.down is write-only in the bundle).
 *   DASH button -> real Space keydown on window (bundle's own keydown path
 *                  calls triggerDash; requires Jet Engine, enforced in-bundle).
 *   LAB button  -> real DOM clicks on #btnOpenLab / #btnResumeFromLab, so the
 *                  pause + overlay state machine stays consistent. Never calls
 *                  window.buyUpgrade directly (buyUpgrade-safe).
 */
(function () {
  "use strict";
  try {
    if (window.__bs2Mobile) return; // idempotent: never double-inject

    var MOBILE_MAX_WIDTH = 820;
    var FIRE_REPEAT_MS = 170;
    var STICK_REPEAT_MS = 60;
    var DOUBLE_TAP_MS = 300;
    var MIN_TARGET_PX = 48;

    function isMobileContext() {
      try {
        if (navigator && navigator.maxTouchPoints > 0) return true;
        if ("ontouchstart" in window) return true;
        if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
        if (window.innerWidth <= MOBILE_MAX_WIDTH) return true;
      } catch (e) { /* conservative: stay off */ }
      return false;
    }

    var canvas = null;
    var root = null;
    var styleEl = null;
    var coarseMq = null;
    var onCoarseChange = null;
    var onResize = null;
    var canvasTouchMoveBlock = null;
    var canvasGestureBlock = null;
    var canvasTapStart = null;
    var canvasTapEnd = null;
    var labObserver = null;
    var stickTimer = null;
    var fireTimer = null;
    var lastTapAt = 0;
    var sustainedFire = false;
    var destroyed = false;

    function fireOnce() {
      try {
        if (!canvas) return;
        var opts = { bubbles: true, cancelable: true, button: 0, buttons: 1 };
        canvas.dispatchEvent(new MouseEvent("mousedown", opts));
        canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 }));
      } catch (e) { /* game absent; ignore */ }
    }

    function startFireRepeat() {
      try {
        if (fireTimer) return;
        fireOnce();
        fireTimer = setInterval(fireOnce, FIRE_REPEAT_MS);
      } catch (e) { /* ignore */ }
    }

    function stopFireRepeat() {
      try {
        if (fireTimer) { clearInterval(fireTimer); fireTimer = null; }
      } catch (e) { /* ignore */ }
    }

    function dashOnce() {
      try {
        // The bundle's own keydown path: ' ' + thruster owned -> triggerDash().
        window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true }));
        window.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true, cancelable: true }));
      } catch (e) { /* ignore */ }
    }

    function labToggle() {
      try {
        var overlay = document.getElementById("rdLabOverlay");
        var open = overlay && !overlay.classList.contains("hidden");
        if (open) {
          var resume = document.getElementById("btnResumeFromLab");
          if (resume) { resume.click(); return; }
          var close = document.getElementById("btnCloseLab");
          if (close) { close.click(); return; }
        }
        var trigger = document.getElementById("btnOpenLab");
        if (trigger) trigger.click();
      } catch (e) { /* ignore */ }
    }

    // Drive the bundle's own mousemove handler: canvas-relative client coords
    // are scaled into mouse.x/mouse.y by game.js setupInputListeners.
    function aimAt(clientX, clientY) {
      try {
        if (!canvas) return;
        canvas.dispatchEvent(new MouseEvent("mousemove", {
          bubbles: true, cancelable: true, clientX: clientX, clientY: clientY
        }));
      } catch (e) { /* ignore */ }
    }

    function aimFromStick(dx, dy) {
      try {
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return;
        var mag = Math.sqrt(dx * dx + dy * dy);
        if (mag < 0.12) return; // dead zone: hold current target
        var cx = rect.left + rect.width / 2 + dx * rect.width * 0.45;
        var cy = rect.top + rect.height / 2 + dy * rect.height * 0.45;
        aimAt(cx, cy);
      } catch (e) { /* ignore */ }
    }

    function injectCss() {
      try {
        if (document.getElementById("bs2-mobile-css")) return;
        styleEl = document.createElement("style");
        styleEl.id = "bs2-mobile-css";
        styleEl.textContent = [
          "#gameCanvas{touch-action:none!important}",
          "body.bs2-touch .hud{flex-wrap:wrap!important;gap:10px!important;padding:10px 14px!important}",
          "body.bs2-touch .hud-left,body.bs2-touch .hud-right{flex-wrap:wrap!important;gap:10px!important}",
          "body.bs2-touch .action-row{flex-wrap:wrap!important;gap:10px!important}",
          "body.bs2-touch .quick-tips{left:8px!important;right:8px!important;bottom:8px!important;",
          " padding:4px 12px!important;font-size:.65rem!important;gap:8px!important;",
          " white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}",
          "body.bs2-touch .quick-tips .separator{display:none!important}",
          "body.bs2-touch #rdLabOverlay{justify-content:flex-end!important;padding:0!important}",
          "body.bs2-touch #rdLabOverlay .lab-modal{width:100%!important;max-width:100%!important;",
          " max-height:88dvh!important;border-radius:20px 20px 0 0!important;",
          " border-left:none!important;border-right:none!important;border-bottom:none!important}",
          "body.bs2-touch #rdLabOverlay .lab-content{overscroll-behavior:contain!important;",
          " -webkit-overflow-scrolling:touch!important}",
          "#bs2-mobile-root{position:fixed!important;inset:auto 0 0 0!important;z-index:30!important;",
          " display:flex!important;justify-content:space-between!important;align-items:flex-end!important;",
          " padding:0 14px calc(10px + env(safe-area-inset-bottom,0px))!important;",
          " pointer-events:none!important}",
          "#bs2-mobile-root .bs2-cluster{pointer-events:none!important;display:flex!important;",
          " align-items:flex-end!important;gap:12px!important}",
          "#bs2-mobile-root .bs2-btn,#bs2-mobile-root .bs2-stick{pointer-events:auto!important;",
          " touch-action:none!important;-webkit-tap-highlight-color:transparent!important;",
          " -webkit-user-select:none!important;user-select:none!important}",
          "#bs2-mobile-root .bs2-btn{min-width:" + MIN_TARGET_PX + "px!important;",
          " min-height:" + MIN_TARGET_PX + "px!important;width:64px!important;height:64px!important;",
          " border-radius:50%!important;border:1px solid rgba(0,242,254,.5)!important;",
          " background:rgba(3,3,13,.78)!important;color:#e2e8f0!important;",
          " font-size:1.5rem!important;backdrop-filter:blur(6px)!important}",
          "#bs2-mobile-root .bs2-btn:active{background:rgba(0,242,254,.35)!important}",
          "#bs2-mobile-root .bs2-btn.bs2-fire{width:76px!important;height:76px!important;",
          " border-color:rgba(255,59,48,.6)!important}",
          "#bs2-mobile-root .bs2-stick{position:relative!important;width:128px!important;",
          " height:128px!important;border-radius:50%!important;",
          " border:1px solid rgba(0,242,254,.4)!important;background:rgba(3,3,13,.55)!important}",
          "#bs2-mobile-root .bs2-knob{position:absolute!important;left:50%!important;top:50%!important;",
          " width:56px!important;height:56px!important;border-radius:50%!important;",
          " background:rgba(0,242,254,.35)!important;border:1px solid rgba(0,242,254,.7)!important;",
          " transform:translate(-50%,-50%)!important}"
        ].join("\n");
        document.head.appendChild(styleEl);
        document.body.classList.add("bs2-touch");
      } catch (e) { /* ignore */ }
    }

    function buildControls() {
      try {
        if (document.getElementById("bs2-mobile-root")) return;
        root = document.createElement("div");
        root.id = "bs2-mobile-root";
        root.setAttribute("aria-label", "BattleSharks 2 touch controls");

        var left = document.createElement("div");
        left.className = "bs2-cluster";
        var stick = document.createElement("div");
        stick.className = "bs2-stick";
        stick.setAttribute("role", "application");
        stick.setAttribute("aria-label", "Swim joystick");
        var knob = document.createElement("div");
        knob.className = "bs2-knob";
        stick.appendChild(knob);
        left.appendChild(stick);

        var right = document.createElement("div");
        right.className = "bs2-cluster";
        var labBtn = document.createElement("button");
        labBtn.type = "button"; labBtn.className = "bs2-btn"; labBtn.textContent = "🧬";
        labBtn.setAttribute("aria-label", "Open R&D lab");
        var dashBtn = document.createElement("button");
        dashBtn.type = "button"; dashBtn.className = "bs2-btn"; dashBtn.textContent = "💨";
        dashBtn.setAttribute("aria-label", "Dash (needs Jet Engine)");
        var fireBtn = document.createElement("button");
        fireBtn.type = "button"; fireBtn.className = "bs2-btn bs2-fire"; fireBtn.textContent = "🔥";
        fireBtn.setAttribute("aria-label", "Fire weapons (hold for sustained fire)");
        right.appendChild(labBtn);
        right.appendChild(dashBtn);
        right.appendChild(fireBtn);

        root.appendChild(left);
        root.appendChild(right);
        document.body.appendChild(root);

        // --- joystick: left thumb -> game's own mouse-target path ---
        var stickId = null, sx = 0, sy = 0, svx = 0, svy = 0;
        function stickVec(ev) {
          try {
            var r = stick.getBoundingClientRect();
            var R = r.width / 2;
            var t = null;
            for (var i = 0; i < ev.changedTouches.length; i++) {
              if (ev.changedTouches[i].identifier === stickId) { t = ev.changedTouches[i]; break; }
            }
            if (!t) return null;
            var dx = (t.clientX - (r.left + R)) / R;
            var dy = (t.clientY - (r.top + R)) / R;
            var m = Math.sqrt(dx * dx + dy * dy);
            if (m > 1) { dx /= m; dy /= m; }
            return { dx: dx, dy: dy };
          } catch (e) { return null; }
        }
        function renderKnob(dx, dy) {
          try {
            var R = stick.getBoundingClientRect().width / 2 - 28;
            knob.style.transform = "translate(calc(-50% + " + (dx * R) + "px),calc(-50% + " + (dy * R) + "px))";
          } catch (e) { /* ignore */ }
        }
        stick.addEventListener("touchstart", function (ev) {
          try {
            ev.preventDefault();
            if (stickId !== null) return;
            var t = ev.changedTouches[0];
            stickId = t.identifier; sx = t.clientX; sy = t.clientY;
            var v = stickVec(ev);
            if (v) { svx = v.dx; svy = v.dy; renderKnob(svx, svy); aimFromStick(svx, svy); }
            if (!stickTimer) stickTimer = setInterval(function () {
              try { if (stickId !== null) aimFromStick(svx, svy); } catch (e) { /* ignore */ }
            }, STICK_REPEAT_MS);
          } catch (e) { /* ignore */ }
        }, { passive: false });
        stick.addEventListener("touchmove", function (ev) {
          try {
            ev.preventDefault();
            var v = stickVec(ev);
            if (v) { svx = v.dx; svy = v.dy; renderKnob(svx, svy); aimFromStick(svx, svy); }
          } catch (e) { /* ignore */ }
        }, { passive: false });
        function stickEnd(ev) {
          try {
            for (var i = 0; i < ev.changedTouches.length; i++) {
              if (ev.changedTouches[i].identifier === stickId) {
                stickId = null; svx = 0; svy = 0;
                knob.style.transform = "translate(-50%,-50%)";
                if (stickTimer) { clearInterval(stickTimer); stickTimer = null; }
              }
            }
          } catch (e) { /* ignore */ }
        }
        stick.addEventListener("touchend", stickEnd);
        stick.addEventListener("touchcancel", stickEnd);
        // Mouse fallback (desktop narrow-window testing): drag steers too.
        stick.addEventListener("mousedown", function (ev) {
          try {
            var r = stick.getBoundingClientRect();
            var R = r.width / 2;
            var dx = (ev.clientX - (r.left + R)) / R;
            var dy = (ev.clientY - (r.top + R)) / R;
            var m = Math.sqrt(dx * dx + dy * dy);
            if (m > 1) { dx /= m; dy /= m; }
            renderKnob(dx, dy); aimFromStick(dx, dy);
          } catch (e) { /* ignore */ }
        });

        // --- FIRE: hold = sustained fire via the canvas mousedown path ---
        fireBtn.addEventListener("touchstart", function (ev) {
          try { ev.preventDefault(); startFireRepeat(); } catch (e) { /* ignore */ }
        }, { passive: false });
        fireBtn.addEventListener("touchend", function () { try { stopFireRepeat(); } catch (e) { /* ignore */ } });
        fireBtn.addEventListener("touchcancel", function () { try { stopFireRepeat(); } catch (e) { /* ignore */ } });
        fireBtn.addEventListener("click", function (ev) {
          try { ev.preventDefault(); fireOnce(); } catch (e) { /* ignore */ }
        });

        // --- DASH: window Space keydown path (bundle gates on Jet Engine) ---
        dashBtn.addEventListener("touchstart", function (ev) {
          try { ev.preventDefault(); dashOnce(); } catch (e) { /* ignore */ }
        }, { passive: false });
        dashBtn.addEventListener("click", function (ev) {
          try { ev.preventDefault(); dashOnce(); } catch (e) { /* ignore */ }
        });

        // --- LAB: real DOM button clicks (buyUpgrade-safe: never called directly) ---
        labBtn.addEventListener("touchstart", function (ev) {
          try { ev.preventDefault(); labToggle(); } catch (e) { /* ignore */ }
        }, { passive: false });
        labBtn.addEventListener("click", function (ev) {
          try { ev.preventDefault(); labToggle(); } catch (e) { /* ignore */ }
        });

        // Hide touch controls whenever a full-screen overlay (start / pause /
        // game-over / lab) is up; show them again when gameplay resumes.
        try {
          var overlayIds = ["startScreen", "pauseScreen", "gameOverScreen", "rdLabOverlay"];
          var syncVisibility = function () {
            try {
              if (!root) return;
              for (var i = 0; i < overlayIds.length; i++) {
                var el = document.getElementById(overlayIds[i]);
                if (el && !el.classList.contains("hidden")) { root.style.display = "none"; return; }
              }
              root.style.display = "";
            } catch (e) { /* ignore */ }
          };
          if (window.MutationObserver) {
            labObserver = new MutationObserver(syncVisibility);
            for (var k = 0; k < overlayIds.length; k++) {
              var node = document.getElementById(overlayIds[k]);
              if (node) labObserver.observe(node, { attributes: true, attributeFilter: ["class"] });
            }
          }
          syncVisibility();
        } catch (e) { /* overlay watch is best-effort */ }

        // Condense quick-tips for touch players.
        try {
          var tips = document.querySelector(".quick-tips");
          if (tips) tips.textContent = "🕹️ Left stick: swim · 🔥 FIRE · 💨 DASH · 🧬 LAB";
        } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    }

    function bindCanvasGestures() {
      try {
        if (!canvas || canvasTouchMoveBlock) return;
        // Scroll/zoom lock scoped to the canvas ONLY: never touches document
        // or body, so page scroll outside the game keeps working.
        canvasTouchMoveBlock = function (ev) { try { ev.preventDefault(); } catch (e) { /* ignore */ } };
        canvas.addEventListener("touchmove", canvasTouchMoveBlock, { passive: false });
        canvasGestureBlock = function (ev) { try { ev.preventDefault(); } catch (e) { /* ignore */ } };
        canvas.addEventListener("gesturestart", canvasGestureBlock);
        // Double-tap-hold on canvas = sustained fire via the mousedown path.
        canvasTapStart = function () {
          try {
            var now = Date.now();
            if (now - lastTapAt <= DOUBLE_TAP_MS) {
              sustainedFire = true;
              startFireRepeat();
            }
            lastTapAt = now;
          } catch (e) { /* ignore */ }
        };
        canvasTapEnd = function () {
          try {
            if (sustainedFire) { sustainedFire = false; stopFireRepeat(); }
          } catch (e) { /* ignore */ }
        };
        canvas.addEventListener("touchstart", canvasTapStart, { passive: true });
        canvas.addEventListener("touchend", canvasTapEnd);
        canvas.addEventListener("touchcancel", canvasTapEnd);
      } catch (e) { /* ignore */ }
    }

    function destroy() {
      try {
        if (destroyed) return;
        destroyed = true;
        stopFireRepeat();
        try { if (stickTimer) { clearInterval(stickTimer); stickTimer = null; } } catch (e) { /* ignore */ }
        try {
          if (canvas) {
            if (canvasTouchMoveBlock) canvas.removeEventListener("touchmove", canvasTouchMoveBlock);
            if (canvasGestureBlock) canvas.removeEventListener("gesturestart", canvasGestureBlock);
            if (canvasTapStart) canvas.removeEventListener("touchstart", canvasTapStart);
            if (canvasTapEnd) { canvas.removeEventListener("touchend", canvasTapEnd); canvas.removeEventListener("touchcancel", canvasTapEnd); }
          }
        } catch (e) { /* ignore */ }
        try { if (labObserver) { labObserver.disconnect(); labObserver = null; } } catch (e) { /* ignore */ }
        try { if (onResize) window.removeEventListener("resize", onResize); } catch (e) { /* ignore */ }
        try {
          if (coarseMq && onCoarseChange) {
            if (coarseMq.removeEventListener) coarseMq.removeEventListener("change", onCoarseChange);
            else if (coarseMq.removeListener) coarseMq.removeListener(onCoarseChange);
          }
        } catch (e) { /* ignore */ }
        try { if (root && root.parentNode) root.parentNode.removeChild(root); } catch (e) { /* ignore */ }
        try { if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl); } catch (e) { /* ignore */ }
        try {
          var css = document.getElementById("bs2-mobile-css");
          if (css && css.parentNode) css.parentNode.removeChild(css);
        } catch (e) { /* ignore */ }
        try { document.body.classList.remove("bs2-touch"); } catch (e) { /* ignore */ }
        try { delete window.__bs2Mobile; } catch (e) { window.__bs2Mobile = undefined; }
      } catch (e) { /* teardown never throws */ }
    }

    function boot() {
      try {
        if (!isMobileContext()) return; // desktop: stay completely out
        canvas = document.getElementById("gameCanvas");
        if (!canvas) return;
        destroyed = false;
        injectCss();
        buildControls();
        bindCanvasGestures();
        window.__bs2Mobile = { version: 1, destroy: destroy };
        // Clean removal when the context flips back to desktop (resize /
        // pointer change): fine pointer + no touch + wide viewport.
        onResize = function () {
          try {
            var touchy = false;
            try {
              touchy = (navigator && navigator.maxTouchPoints > 0) || ("ontouchstart" in window);
              if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) touchy = true;
            } catch (e) { /* ignore */ }
            if (!touchy && window.innerWidth > MOBILE_MAX_WIDTH) destroy();
          } catch (e) { /* ignore */ }
        };
        window.addEventListener("resize", onResize);
        try {
          if (window.matchMedia) {
            coarseMq = window.matchMedia("(pointer: coarse)");
            onCoarseChange = function () {
              try {
                var touchy = coarseMq.matches || (navigator && navigator.maxTouchPoints > 0) || window.innerWidth <= MOBILE_MAX_WIDTH;
                if (!touchy && window.innerWidth > MOBILE_MAX_WIDTH) destroy();
              } catch (e) { /* ignore */ }
            };
            if (coarseMq.addEventListener) coarseMq.addEventListener("change", onCoarseChange);
            else if (coarseMq.addListener) coarseMq.addListener(onCoarseChange);
          }
        } catch (e) { /* matchMedia watch is best-effort */ }
      } catch (e) { /* boot never throws */ }
    }

    try {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
      } else {
        boot();
      }
    } catch (e) { /* ignore */ }
  } catch (e) { /* module never throws */ }
})();
