/* GraveGain2dB emoji atlas (A8).
 * Offscreen canvas, baked ONCE at 3x with outline; render path uses
 * drawImage + transforms only (no per-frame fillText/emoji raster).
 * Vanilla IIFE, idempotent, never throws. Export: window.GG2DB_Atlas. */
(function () {
  "use strict";
  if (window.GG2DB_Atlas) return;

  var SCALE = 3;      // bake factor
  var CELL = 48;      // css px per glyph cell
  var BAKED = CELL * SCALE;

  // Glyph registry: key -> emoji char. Keep small; atlas grows on demand.
  var GLYPHS = {
    player: "\u{1F468}\u200D\u{1F692}", miner: "\u26CF\uFE0F",
    zombie: "\u{1F9DF}", brute: "\u{1F479}", spitter: "\u{1F419}",
    boss: "\u{1F480}", survivor: "\u{1F64B}", canary: "\u{1F424}",
    rock: "\u{1FAA8}", dirt: "\u{1F7EB}", ore: "\u{1F48E}",
    wood: "\u{1FAB5}", crystal: "\u{1F52E}", bomb: "\u{1F4A3}",
    heart: "\u2764\uFE0F", shield: "\u{1F6E1}\uFE0F", coin: "\u{1FA99}\uFE0F",
    pickaxe: "\u26CF\uFE0F", lantern: "\u{1F3EE}", diamond: "\u{1F537}",
    warn: "\u26A0\uFE0F", extract: "\u{1F6AA}", skull: "\u2620\uFE0F",
    spark: "\u2728", fog: "\u{1F32B}\uFE0F", blood: "\u{1FA78}"
  };

  var canvas = null;      // offscreen atlas canvas
  var ctx = null;
  var cells = {};         // key -> { x, y } baked cell origin (device px)
  var order = [];         // bake order
  var baked = false;
  var blankCell = { x: 0, y: 0 };

  function ensureCanvas(n) {
    try {
      if (!canvas) {
        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d");
      }
      // One row strip; width sized to fit n cells.
      var w = Math.max(1, n) * BAKED;
      if (canvas.width !== w || canvas.height !== BAKED) {
        canvas.width = w;
        canvas.height = BAKED;
        baked = false; // resize wipes content; rebake below
      }
    } catch (e) { /* ignore: atlas degrades to no-op */ }
  }

  // Bake every registered glyph once: 3x + dark outline for readability.
  function bake() {
    try {
      var keys = Object.keys(GLYPHS);
      ensureCanvas(keys.length);
      if (!ctx) return;
      if (baked) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var fontPx = Math.floor(BAKED * 0.72);
      ctx.font = fontPx + "px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
      order = keys.slice();
      cells = {};
      for (var i = 0; i < keys.length; i += 1) {
        (function (key, idx) {
          try {
            var x = idx * BAKED;
            var cx = x + BAKED / 2;
            var cy = BAKED / 2;
            // Outline pass (stroke) then fill pass.
            ctx.lineWidth = Math.max(2, Math.floor(SCALE * 2));
            ctx.strokeStyle = "rgba(0,0,0,0.85)";
            ctx.strokeText(GLYPHS[key], cx, cy);
            ctx.fillText(GLYPHS[key], cx, cy);
            cells[key] = { x: x, y: 0 };
          } catch (e) { /* keep going */ }
        })(keys[i], i);
      }
      baked = true;
    } catch (e) { /* ignore */ }
  }

  // Draw a baked glyph via drawImage + transform only.
  // opts: { x, y, size (css px), rot (rad), flipX, alpha, scaleY }
  function draw(g, key, opts) {
    try {
      if (!g || !key) return false;
      if (!baked) bake();
      if (!ctx || !cells.hasOwnProperty(key)) return false;
      var o = opts || {};
      var size = (typeof o.size === "number" && o.size > 0) ? o.size : CELL;
      var rot = o.rot || 0;
      var sx = o.flipX ? -1 : 1;
      var sy = (typeof o.scaleY === "number") ? o.scaleY : 1;
      var c = cells[key];
      g.save();
      try {
        g.globalAlpha = (typeof o.alpha === "number") ? o.alpha : 1;
        g.translate(o.x || 0, o.y || 0);
        if (rot) g.rotate(rot);
        g.scale(sx * (size / BAKED), sy * (size / BAKED));
        g.drawImage(canvas, c.x, c.y, BAKED, BAKED, -BAKED / 2, -BAKED / 2, BAKED, BAKED);
      } finally {
        try { g.restore(); } catch (e2) { /* ignore */ }
      }
      return true;
    } catch (e) { return false; }
  }

  function register(key, emoji) {
    try {
      if (typeof key !== "string" || !key || typeof emoji !== "string" || !emoji) return false;
      if (GLYPHS[key] === emoji && cells.hasOwnProperty(key)) return true;
      GLYPHS[key] = emoji;
      baked = false; // rebake lazily on next draw()
      return true;
    } catch (e) { return false; }
  }

  function has(key) {
    try { return !!cells[key] || !!GLYPHS[key]; } catch (e) { return false; }
  }

  // Warm the atlas at load (inside try/catch; safe pre-DOM).
  try {
    if (document && document.readyState !== "loading") bake();
    else if (document) document.addEventListener("DOMContentLoaded", function () { try { bake(); } catch (e) {} }, { once: true });
  } catch (e) { /* ignore */ }

  window.GG2DB_Atlas = {
    CELL: CELL, SCALE: SCALE,
    bake: bake, draw: draw, register: register, has: has,
    keys: function () { try { return Object.keys(GLYPHS); } catch (e) { return []; } },
    ready: function () { return baked; }
  };
})();
