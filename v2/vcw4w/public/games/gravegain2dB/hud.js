/* GraveGain2dB HUD DOM overlay (A8).
 * Layout: TL = 4-player chips, TC = objective/boss/extract bar,
 * TR = rescue/direction readout. Near-player warnings capped at 4.
 * Canvas-space markers are diamonds (see art/fx.js drawDiamond).
 * Vanilla IIFE, idempotent, never throws, pointer-events:none.
 * Export: window.GG2DB_HUD. */
(function () {
  "use strict";
  if (window.GG2DB_HUD) return;

  var ROOT_ID = "gg2db-hud";
  var WARN_ID = "gg2db-warn";
  var MAX_WARNS = 4;
  var MAX_PLAYERS = 4;

  var root = null;
  var els = {}; // { tl, tc, tr, obj, boss, extract, rescue, dir }
  var warnLayer = null;
  var warns = []; // { el, until }

  function css() {
    return "#" + ROOT_ID + "{position:absolute;inset:0;pointer-events:none;z-index:50;" +
      "font:12px/1.4 system-ui,sans-serif;color:#fff;text-shadow:0 1px 2px #000;}" +
      "#" + ROOT_ID + " .tl{position:absolute;top:8px;left:8px;display:flex;gap:6px;}" +
      "#" + ROOT_ID + " .chip{background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);" +
      "border-radius:6px;padding:3px 7px;white-space:nowrap;}" +
      "#" + ROOT_ID + " .chip.low{border-color:#ff5252;color:#ffb3b3;}" +
      "#" + ROOT_ID + " .tc{position:absolute;top:8px;left:50%;transform:translateX(-50%);" +
      "text-align:center;max-width:60%;}" +
      "#" + ROOT_ID + " .obj{background:rgba(0,0,0,.55);border-radius:6px;padding:3px 10px;margin-bottom:4px;}" +
      "#" + ROOT_ID + " .bossbar{height:8px;background:rgba(0,0,0,.6);border:1px solid #a00;border-radius:4px;overflow:hidden;}" +
      "#" + ROOT_ID + " .bossbar>i{display:block;height:100%;background:linear-gradient(90deg,#f00,#f80);width:100%;}" +
      "#" + ROOT_ID + " .extract{margin-top:4px;background:rgba(0,80,0,.6);border-radius:6px;padding:2px 10px;display:none;}" +
      "#" + ROOT_ID + " .tr{position:absolute;top:8px;right:8px;text-align:right;}" +
      "#" + ROOT_ID + " .pill{background:rgba(0,0,0,.55);border-radius:6px;padding:3px 8px;margin-bottom:4px;}" +
      "#" + WARN_ID + "{position:absolute;inset:0;pointer-events:none;z-index:49;overflow:hidden;}" +
      "#" + WARN_ID + " .w{position:absolute;transform:translate(-50%,-100%);background:rgba(120,0,0,.75);" +
      "border:1px solid #ff8a80;border-radius:6px;padding:2px 8px;white-space:nowrap;}";
  }

  function host() {
    try {
      return document.getElementById("canvasContainer") || document.body;
    } catch (e) { return null; }
  }

  function ensure() {
    try {
      if (root && root.isConnected) return root;
      var h = host();
      if (!h) return null;
      try {
        var cs = window.getComputedStyle(h);
        if (cs && cs.position === "static") h.style.position = "relative";
      } catch (e) { /* ignore */ }
      var old = document.getElementById(ROOT_ID);
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var style = document.getElementById(ROOT_ID + "-css");
      if (!style) {
        style = document.createElement("style");
        style.id = ROOT_ID + "-css";
        style.textContent = css();
        document.head.appendChild(style);
      }
      root = document.createElement("div");
      root.id = ROOT_ID;
      root.setAttribute("aria-hidden", "true");
      root.innerHTML =
        '<div class="tl"></div>' +
        '<div class="tc"><div class="obj"></div>' +
        '<div class="bossbar" style="display:none"><i></i></div>' +
        '<div class="extract"></div></div>' +
        '<div class="tr"><div class="pill rescue"></div><div class="pill dir"></div></div>';
      h.appendChild(root);
      els.tl = root.querySelector(".tl");
      els.obj = root.querySelector(".obj");
      els.boss = root.querySelector(".bossbar");
      els.bossFill = root.querySelector(".bossbar>i");
      els.extract = root.querySelector(".extract");
      els.rescue = root.querySelector(".rescue");
      els.dir = root.querySelector(".dir");
      els.tc = root.querySelector(".tc");
      var wl = document.getElementById(WARN_ID);
      if (wl && wl.parentNode !== h) { wl.parentNode.removeChild(wl); wl = null; }
      if (!wl) {
        wl = document.createElement("div");
        wl.id = WARN_ID;
        wl.setAttribute("aria-hidden", "true");
        h.appendChild(wl);
      }
      warnLayer = wl;
      return root;
    } catch (e) { return null; }
  }

  function setText(el, s) {
    try { if (el) el.textContent = (s == null ? "" : String(s)); } catch (e) { /* ignore */ }
  }

  // players: [{ name, hp, maxHp, alive }] up to 4 chips (TL).
  function players(list) {
    try {
      if (!ensure()) return;
      var arr = (list && list.slice ? list.slice(0, MAX_PLAYERS) : []);
      // Rebuild chips (cheap: <=4 nodes, update path only).
      while (els.tl.firstChild) els.tl.removeChild(els.tl.firstChild);
      for (var i = 0; i < arr.length; i += 1) {
        (function (p) {
          try {
            var d = document.createElement("div");
            var low = p && p.maxHp && (p.hp / p.maxHp) < 0.3;
            d.className = "chip" + (low ? " low" : "");
            var nm = (p && p.name) || ("P" + (i + 1));
            var hp = (p && typeof p.hp === "number") ? Math.max(0, Math.ceil(p.hp)) : "?";
            d.textContent = (p && p.alive === false ? "\u2620\uFE0F " : "") + nm + " " + hp;
            els.tl.appendChild(d);
          } catch (e) { /* ignore */ }
        })(arr[i]);
      }
    } catch (e) { /* ignore */ }
  }

  // TC: objective text, boss bar fraction (0..1, null hides), extract text ("" hides).
  function objective(text) { try { if (ensure()) setText(els.obj, text); } catch (e) {} }
  function boss(frac, name) {
    try {
      if (!ensure()) return;
      if (typeof frac !== "number" || frac < 0) { els.boss.style.display = "none"; return; }
      els.boss.style.display = "block";
      els.bossFill.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%";
      els.boss.title = name || "";
    } catch (e) { /* ignore */ }
  }
  function extract(text) {
    try {
      if (!ensure()) return;
      if (!text) { els.extract.style.display = "none"; return; }
      els.extract.style.display = "block";
      setText(els.extract, text);
    } catch (e) { /* ignore */ }
  }

  // TR: rescue status + compass/direction readout.
  function rescue(text) { try { if (ensure()) setText(els.rescue, text); } catch (e) {} }
  function direction(text) { try { if (ensure()) setText(els.dir, text); } catch (e) {} }

  // Near-player warnings, capped at 4. pos {x,y} in canvas px via toPx mapper.
  function warn(text, x, y, ttlMs, toPx) {
    try {
      if (!ensure() || !warnLayer) return false;
      prune();
      if (warns.length >= MAX_WARNS) {
        // Evict oldest.
        var old = warns.shift();
        try { if (old && old.el.parentNode) old.el.parentNode.removeChild(old.el); } catch (e) {}
      }
      var px = { x: x, y: y };
      try { if (typeof toPx === "function") px = toPx(x, y) || px; } catch (e) { /* ignore */ }
      var d = document.createElement("div");
      d.className = "w";
      d.textContent = "\u26A0\uFE0F " + text;
      d.style.left = px.x + "px";
      d.style.top = px.y + "px";
      warnLayer.appendChild(d);
      warns.push({ el: d, until: Date.now() + (ttlMs || 2500) });
      return true;
    } catch (e) { return false; }
  }

  function prune() {
    try {
      var now = Date.now();
      for (var i = warns.length - 1; i >= 0; i -= 1) {
        if (warns[i].until <= now) {
          try { if (warns[i].el.parentNode) warns[i].el.parentNode.removeChild(warns[i].el); } catch (e) {}
          warns.splice(i, 1);
        }
      }
    } catch (e) { /* ignore */ }
  }

  // Call each frame (or on interval) to expire warnings.
  function tick() { try { prune(); } catch (e) { /* ignore */ } }

  function clear() {
    try {
      for (var i = 0; i < warns.length; i += 1) {
        try { if (warns[i].el.parentNode) warns[i].el.parentNode.removeChild(warns[i].el); } catch (e) {}
      }
      warns = [];
    } catch (e) { /* ignore */ }
  }

  window.GG2DB_HUD = {
    ensure: ensure, players: players, objective: objective,
    boss: boss, extract: extract, rescue: rescue, direction: direction,
    warn: warn, tick: tick, clear: clear, MAX_WARNS: MAX_WARNS
  };
})();
