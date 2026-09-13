/* GraveGain2D 2.5D presentation layer — G4 lane (v2-native, parity-safe).
 *
 * File: public/games/html/gravegain2d-25d.js
 * Layer for the existing 2D canvas (#gameCanvas, 1000x600 game space). NEVER
 * edits gravegain2d/** (lore.js, game.js, index.html...); runtime overlay only.
 *
 * What it adds (base canvas untouched):
 *   1. Dynamic light-map overlay — flickering warm torch glow tracking the
 *      player + dungeon-theme tint wash keyed by floorIndex.
 *   2. Drop shadows + height-sort — soft contact shadows under player, enemies
 *      and loot, drawn back-to-front by world y; the live `enemies` array is
 *      also sorted in place by y so the engine's own sprite pass height-sorts.
 *   3. Parallax background layers — cavern-ceiling stalactite bands scrolling
 *      at 0.25x / 0.4x camera + foreground dust motes drifting at ~1.3x.
 *   4. Height-graded projectile glow — additive glow sprites on vfx.sparks
 *      (size/alpha graded by spark life fraction) + attack-sweep tip glow.
 *   5. Screen-space vignette — cached radial darkening, drawn every frame.
 *
 * Age bands: IDENTICAL art for kid/teen/all. This file draws NO gore, NO blood
 * decals, NO drugs — blood work belongs to G7 / gore-gravegain2d.js.
 *
 * Perf contract: offscreen-cached gradient sprites (zero per-frame allocation
 * on the hot path), own ~30Hz rAF loop, pause when document.hidden, and a
 * governor that sheds layers (motes -> parallax -> glow -> shadows -> off)
 * when the frame-time EMA stays slow, then steps back up on recovery.
 *
 * Coexistence: gravegain-2p5d.js (overlay sibling) already draws shadows,
 * torch mask, vignette and motes. When window.GraveGain25D is present this
 * file stands those overlapping layers down and keeps only height-sort,
 * projectile glow and theme tint, so nothing double-draws.
 *
 * Guards: vanilla IIFE, no imports, never throws, idempotent
 * (if (window.GraveGain2D_25D) return), pointer-events:none overlay canvas,
 * no input listeners. Polls for window.GraveGainGame, degrades gracefully.
 */
(function () {
  'use strict';
  if (window.GraveGain2D_25D) return; // idempotent under double-injection
  window.GraveGain2D_25D = { version: '1.0.0', level: 0, active: false };

  var VERSION = '1.0.0';
  var GW = 1000;
  var GH = 600;
  var TICK_MS = 33; // ~30Hz overlay loop
  var FX_ID = 'gg2d25d-fx';
  var MAX_SHADOW_REFS = 96;
  var MAX_MOTES = 24;

  // Quality levels: 0 full, 1 no-motes, 2 glow+tint only, 3 shadows off, 4 paused
  var S = {
    level: 0,
    emaMs: 16,
    slowTicks: 0,
    fastTicks: 0,
    lastTick: 0,
    flickerT: 0,
    consecErrors: 0,
    complementLogged: false,
    game: null,
    canvas: null,
    ctx: null,
    refs: [], // preallocated entity refs for y-sorted shadow pass
    motes: [], // preallocated dust mote pool
    sibling: false
  };
  var i;
  for (i = 0; i < MAX_SHADOW_REFS; i++) S.refs.push(null);
  for (i = 0; i < MAX_MOTES; i++) {
    S.motes.push({ x: Math.random() * GW, y: Math.random() * GH, vx: 0, vy: 0, r: 1, a: 0.2 });
  }
  for (i = 0; i < MAX_MOTES; i++) {
    var m0 = S.motes[i];
    m0.vx = 6 + Math.random() * 14;
    m0.vy = -4 - Math.random() * 8;
    m0.r = 1 + Math.random() * 2;
    m0.a = 0.08 + Math.random() * 0.14;
  }

  // ---------- offscreen-cached sprites (built once) ----------
  var SPR = { shadow: null, glow: {}, vignette: null, cragFar: null, cragNear: null };

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function buildShadowSprite() {
    var c = makeCanvas(64, 32);
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 16, 2, 32, 16, 30);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.save();
    g.translate(32, 16);
    g.scale(1, 0.5);
    g.translate(-32, -32);
    g.fillRect(0, 0, 64, 64);
    g.restore();
    SPR.shadow = c;
  }

  function buildGlowSprite(key, inner, mid) {
    var c = makeCanvas(64, 64);
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 1, 32, 32, 31);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.35, mid);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    SPR.glow[key] = c;
  }

  function buildGlowSprites() {
    buildGlowSprite('white', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.28)');
    buildGlowSprite('warm', 'rgba(255,190,90,0.9)', 'rgba(251,146,60,0.30)');
    buildGlowSprite('purple', 'rgba(216,180,254,0.9)', 'rgba(192,132,252,0.30)');
    buildGlowSprite('green', 'rgba(167,243,208,0.9)', 'rgba(74,222,128,0.30)');
    buildGlowSprite('cyan', 'rgba(165,243,252,0.9)', 'rgba(34,211,238,0.30)');
    buildGlowSprite('gold', 'rgba(253,224,71,0.9)', 'rgba(250,204,21,0.30)');
    buildGlowSprite('red', 'rgba(252,165,165,0.9)', 'rgba(239,68,68,0.30)');
  }

  function glowKeyFor(color) {
    if (!color) return 'white';
    var c = String(color).toLowerCase();
    if (c.indexOf('purple') >= 0 || c.indexOf('192,132') >= 0 || c.indexOf('#c084fc') >= 0 || c.indexOf('134') >= 0) return 'purple';
    if (c.indexOf('green') >= 0 || c.indexOf('74,222') >= 0 || c.indexOf('#4ade80') >= 0) return 'green';
    if (c.indexOf('cyan') >= 0 || c.indexOf('deepskyblue') >= 0 || c.indexOf('34,211') >= 0 || c.indexOf('#22d3ee') >= 0) return 'cyan';
    if (c.indexOf('gold') >= 0 || c.indexOf('250,204') >= 0 || c.indexOf('#facc15') >= 0 || c.indexOf('yellow') >= 0) return 'gold';
    if (c.indexOf('orange') >= 0 || c.indexOf('251,146') >= 0 || c.indexOf('#fb923c') >= 0 || c.indexOf('red') >= 0 || c.indexOf('239,68') >= 0 || c.indexOf('#ef4444') >= 0) return c.indexOf('red') >= 0 || c.indexOf('239,68') >= 0 || c.indexOf('#ef4444') >= 0 ? 'red' : 'warm';
    return 'white';
  }

  function buildVignette() {
    var c = makeCanvas(250, 150);
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(125, 75, 40, 125, 75, 150);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(2,2,10,0.52)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 250, 150);
    SPR.vignette = c;
  }

  // Deterministic crag band: seeded LCG so every client paints the same ridge.
  function buildCragBand(w, h, seed, baseAlpha) {
    var c = makeCanvas(w, h);
    var g = c.getContext('2d');
    var s = seed >>> 0;
    function rnd() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    }
    g.fillStyle = 'rgba(8,6,20,' + baseAlpha + ')';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    var x = w;
    while (x > 0) {
      var seg = 40 + rnd() * 90;
      var drop = h * (0.25 + rnd() * 0.75);
      g.lineTo(x - seg * 0.5, drop);
      g.lineTo(x - seg, h * rnd() * 0.3);
      x -= seg;
    }
    g.lineTo(0, 0);
    g.closePath();
    g.fill();
    // faint rim light on the ridge teeth
    g.strokeStyle = 'rgba(120,90,220,0.10)';
    g.lineWidth = 1;
    g.stroke();
    return c;
  }

  function buildSprites() {
    buildShadowSprite();
    buildGlowSprites();
    buildVignette();
    SPR.cragFar = buildCragBand(1200, 110, 1337, '0.55');
    SPR.cragNear = buildCragBand(1200, 150, 7217, '0.8');
  }

  // Dungeon-theme tint wash per floor (subtle full-screen color identity).
  var THEMES = [
    [26, 16, 46],   // violet deep
    [46, 16, 20],   // ember crypt
    [10, 30, 34],   // drowned teal
    [30, 26, 10],   // golden catacombs
    [16, 20, 44]    // storm sanctum
  ];

  // ---------- boot / DOM ----------
  function findHost() {
    return document.getElementById('canvasContainer') || document.body;
  }

  function ensureFxCanvas() {
    var host = findHost();
    var base = document.getElementById('gameCanvas');
    var el = document.getElementById(FX_ID);
    if (!el) {
      el = document.createElement('canvas');
      el.id = FX_ID;
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.pointerEvents = 'none';
      // Stack between gameCanvas and lightingCanvas via DOM order.
      var light = document.getElementById('lightingCanvas');
      if (light && light.parentNode === host) host.insertBefore(el, light);
      else if (base && base.parentNode === host) host.insertBefore(el, base.nextSibling);
      else host.appendChild(el);
    }
    var w = (base && base.width) || GW;
    var h = (base && base.height) || GH;
    if (el.width !== w) el.width = w;
    if (el.height !== h) el.height = h;
    return el;
  }

  function readGame() {
    try {
      var g = window.GraveGainGame;
      if (!g || !g.camera || typeof g.camera.getOffsets !== 'function') return null;
      if (!g.ctx || !g.canvas) return null;
      return g;
    } catch (e) { return null; }
  }

  // ---------- layer passes (no allocation on hot path) ----------
  function drawParallax(ctx, offX) {
    if (S.level >= 2 || S.sibling) return; // sibling owns parallax in complement mode
    var w = ctx.canvas.width;
    try {
      var farX = -(((offX * 0.25) % 1200) + 1200) % 1200;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(SPR.cragFar, farX, -8);
      ctx.drawImage(SPR.cragFar, farX + 1200, -8);
      var nearX = -(((offX * 0.4) % 1200) + 1200) % 1200;
      ctx.globalAlpha = 0.75;
      ctx.drawImage(SPR.cragNear, nearX, -12);
      ctx.drawImage(SPR.cragNear, nearX + 1200, -12);
      ctx.globalAlpha = 1;
    } catch (e) { ctx.globalAlpha = 1; }
  }

  function drawMotes(ctx, dt) {
    if (S.level >= 1 || S.sibling) return; // full quality only; sibling owns motes
    var w = ctx.canvas.width, h = ctx.canvas.height;
    var k;
    try {
      ctx.save();
      for (k = 0; k < MAX_MOTES; k++) {
        var mo = S.motes[k];
        mo.x += mo.vx * dt;
        mo.y += mo.vy * dt;
        if (mo.y < -6) { mo.y = h + 6; mo.x = Math.random() * w; }
        if (mo.x > w + 6) mo.x = -6;
        ctx.globalAlpha = mo.a;
        ctx.fillStyle = '#cdd6ff';
        ctx.fillRect(mo.x, mo.y, mo.r, mo.r);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    } catch (e) { try { ctx.restore(); } catch (ignored) {} ctx.globalAlpha = 1; }
  }

  // In-place y-sort of the live enemies array: order-independent for gameplay
  // (damage/loot loops are commutative), but makes the engine sprite pass draw
  // back-to-front. Zero allocation.
  function heightSortEnemies(game) {
    try {
      var list = game.enemies;
      if (!list || list.length < 2) return;
      list.sort(function (a, b) { return a.y - b.y; });
    } catch (e) { /* ignore */ }
  }

  function shadowSizeFor(ent, isPlayer) {
    // returns packed [rx, ry, alpha, liftY] via scratch object (no alloc: writes into S._sh)
    var rx = isPlayer ? 15 : 13;
    var airborne = false;
    try {
      if (isPlayer) {
        if (Math.abs(ent.platVy || 0) > 40) airborne = true;
      } else if (ent.type === 'exploding' || ent.summoner) {
        airborne = true; // Flying Elf Skull / Necromancer hover
      }
    } catch (e) {}
    var sh = S._sh || (S._sh = { rx: 14, ry: 6, a: 0.8, lift: 12 });
    if (airborne) { sh.rx = rx * 0.8; sh.ry = 4; sh.a = 0.45; sh.lift = 20; }
    else { sh.rx = rx; sh.ry = 6; sh.a = 0.8; sh.lift = 12; }
    return sh;
  }

  function drawShadows(ctx, game, offX, offY) {
    if (S.level >= 4 || S.sibling) return; // sibling owns shadows in complement mode
    var count = 0;
    var n = 0;
    try {
      if (game.player && !game.player.isDead && n < MAX_SHADOW_REFS) {
        S.refs[n++] = game.player;
      }
      var list = game.enemies;
      var li;
      if (list) for (li = 0; li < list.length && n < MAX_SHADOW_REFS; li++) S.refs[n++] = list[li];
      var loot = game.loot;
      if (loot) for (li = 0; li < loot.length && n < MAX_SHADOW_REFS; li++) S.refs[n++] = loot[li];
      count = n;
      // Back-to-front by world y (insertion order from engine is arbitrary).
      if (count > 1) {
        S.refs.length = count;
        S.refs.sort(function (a, b) { return a.y - b.y; });
      }
      var w = ctx.canvas.width, h = ctx.canvas.height;
      var k;
      for (k = 0; k < count; k++) {
        var e = S.refs[k];
        S.refs[k] = null; // release ref immediately, keep pool clean
        if (!e) continue;
        var sx = e.x - offX, sy = e.y - offY;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
        var isLoot = (typeof e.getEmoji === 'function');
        var isPlayer = (game.player && e === game.player);
        var sh = isLoot ? null : shadowSizeFor(e, isPlayer);
        var rx = isLoot ? 9 : sh.rx;
        var ry = isLoot ? 4 : sh.ry;
        var lift = isLoot ? 10 : sh.lift;
        ctx.globalAlpha = isLoot ? 0.6 : sh.a;
        ctx.drawImage(SPR.shadow, sx - rx, sy + lift - ry, rx * 2, ry * 2);
      }
      S.refs.length = MAX_SHADOW_REFS;
      ctx.globalAlpha = 1;
    } catch (e) {
      ctx.globalAlpha = 1;
      try { S.refs.length = MAX_SHADOW_REFS; } catch (ignored) {}
    }
  }

  function drawProjectileGlow(ctx, game, offX, offY) {
    if (S.level >= 3) return;
    var w = ctx.canvas.width, h = ctx.canvas.height;
    try {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var sparks = game.vfx && game.vfx.sparks;
      var s;
      if (sparks) {
        for (s = 0; s < sparks.length; s++) {
          var p = sparks[s];
          var sx = p.x - offX, sy = p.y - offY;
          if (sx < -32 || sx > w + 32 || sy < -32 || sy > h + 32) continue;
          // Height grade: young/fast sparks burn brighter and wider.
          var lifeFrac = Math.max(0, Math.min(1, (p.life || 0.4) / 0.7));
          var r = 7 + lifeFrac * 13;
          ctx.globalAlpha = 0.25 + lifeFrac * 0.5;
          var key = glowKeyFor(p.color);
          ctx.drawImage(SPR.glow[key] || SPR.glow.white, sx - r, sy - r, r * 2, r * 2);
        }
      }
      // Attack-sweep tip glow (melee arc reads as a projectile arc in 2.5D).
      var sweep = game.attackSweep;
      if (sweep) {
        var ang = sweep.angle || 0;
        var tx = (sweep.x - offX) + Math.cos(ang) * (sweep.radius || 40);
        var ty = (sweep.y - offY) + Math.sin(ang) * (sweep.radius || 40);
        ctx.globalAlpha = 0.55;
        ctx.drawImage(SPR.glow.warm, tx - 22, ty - 22, 44, 44);
      }
      // Exit-beacon pulse glow (navigation landmark, not gore).
      if (game.dungeon && game.dungeon.rooms) {
        var rooms = game.dungeon.rooms;
        var ri;
        for (ri = 0; ri < rooms.length; ri++) {
          if (rooms[ri].type === 'safespace') {
            var bx = rooms[ri].cx * 48 + 24 - offX;
            var by = rooms[ri].cy * 48 + 24 - offY;
            if (bx > -60 && bx < w + 60 && by > -60 && by < h + 60) {
              var pulse = 26 + Math.sin(S.flickerT * 3.1) * 6;
              ctx.globalAlpha = 0.35;
              ctx.drawImage(SPR.glow.gold, bx - pulse, by - pulse, pulse * 2, pulse * 2);
            }
            break;
          }
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    } catch (e) { try { ctx.restore(); } catch (ignored) {} ctx.globalAlpha = 1; }
  }

  function drawLightMap(ctx, game, offX, offY) {
    if (S.level >= 3 && S.sibling) return;
    var w = ctx.canvas.width, h = ctx.canvas.height;
    try {
      // Dungeon-theme tint wash (same art for all age bands; mood only).
      var floor = 0;
      try { floor = ((game.floorIndex || 1) - 1); } catch (e) {}
      var theme = THEMES[((floor % THEMES.length) + THEMES.length) % THEMES.length];
      ctx.globalAlpha = S.level >= 2 ? 0.10 : 0.07;
      ctx.fillStyle = 'rgb(' + theme[0] + ',' + theme[1] + ',' + theme[2] + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      // Flickering torch glow tracking the player (layered sines, no noise alloc).
      if (game.player && !game.player.isDead && S.level < 3) {
        var px = game.player.x - offX, py = game.player.y - offY;
        var t = S.flickerT;
        var flick = 0.82 + 0.10 * Math.sin(t * 9.3) + 0.06 * Math.sin(t * 23.7 + 1.7) + 0.04 * Math.sin(t * 4.1 + 0.5);
        var r = 150 * flick;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.16 * flick;
        ctx.drawImage(SPR.glow.warm, px - r, py - r, r * 2, r * 2);
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    } catch (e) { ctx.globalAlpha = 1; }
  }

  function drawVignette(ctx) {
    if (S.level >= 4 || S.sibling || !SPR.vignette) return;
    try {
      ctx.drawImage(SPR.vignette, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } catch (e) { /* ignore */ }
  }

  // ---------- perf governor ----------
  function govern(dtMs) {
    S.emaMs = S.emaMs * 0.95 + dtMs * 0.05;
    if (S.emaMs > 42) {
      S.slowTicks++;
      S.fastTicks = 0;
    } else if (S.emaMs < 21) {
      S.fastTicks++;
      S.slowTicks = 0;
    } else {
      S.slowTicks = 0;
      S.fastTicks = 0;
    }
    if (S.slowTicks >= 45 && S.level < 4) {
      S.level++;
      S.slowTicks = 0;
      S.fastTicks = 0;
    } else if (S.fastTicks >= 240 && S.level > 0) {
      S.level--;
      S.fastTicks = 0;
      S.slowTicks = 0;
    }
    if (S.level >= 4) {
      try { S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height); } catch (e) {}
    }
    window.GraveGain2D_25D.level = S.level;
  }

  // ---------- main loop ----------
  function tick(now) {
    if (S.dead) return;
    var dtMs = 0;
    try {
      if (S.lastTick) dtMs = now - S.lastTick;
      S.lastTick = now;
      if (!dtMs || dtMs < 0) dtMs = TICK_MS;
      if (dtMs > 250) dtMs = 250;
      var dt = Math.min(dtMs / 1000, 0.25);

      if (document.hidden) return; // skip work while tab hidden (rAF resumes us)

      S.sibling = !!window.GraveGain25D;
      if (S.sibling && !S.complementLogged) {
        S.complementLogged = true;
        try { console.info('[GraveGain2D_25D] sibling 2p5d overlay active: complement mode (sort+glow+tint).'); } catch (e) {}
      }

      var game = S.game || (S.game = readGame());
      if (!game) return;
      if (!S.canvas) {
        S.canvas = ensureFxCanvas();
        S.ctx = S.canvas.getContext('2d');
      }
      var off = game.camera.getOffsets();
      var offX = off.x || 0, offY = off.y || 0;

      S.flickerT += dt;

      heightSortEnemies(game); // engine sprite pass then draws back-to-front

      var ctx = S.ctx;
      ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);
      if (S.level < 4) {
        drawParallax(ctx, offX);
        drawShadows(ctx, game, offX, offY);
        drawProjectileGlow(ctx, game, offX, offY);
        drawLightMap(ctx, game, offX, offY);
        drawMotes(ctx, dt);
        drawVignette(ctx);
      }
      govern(dtMs);
      S.consecErrors = 0;
      if (!window.GraveGain2D_25D.active) {
        window.GraveGain2D_25D.active = true;
      }
    } catch (err) {
      S.consecErrors++;
      if (S.consecErrors < 5) {
        try { console.error('[GraveGain2D_25D] frame error (overlay survives):', err); } catch (e) {}
      }
      if (S.consecErrors > 10) {
        S.dead = true; // park the overlay rather than spam errors
        try { console.error('[GraveGain2D_25D] parked after repeated errors.'); } catch (e) {}
        return;
      }
    } finally {
      if (!S.dead) {
        try {
          if (S.level >= 4) setTimeout(function () { requestAnimationFrame(tick); }, 250); // watchdog cadence while shed
          else setTimeout(function () { requestAnimationFrame(tick); }, 0);
        } catch (e) {}
      }
    }
  }

  // Throttle: overlay runs at ~30Hz via timestamp gate inside rAF chain.
  var _rawTick = tick;
  tick = function (now) {
    if (S.dead) return;
    var elapsed = S._lastRun || 0;
    if (now - elapsed < TICK_MS && elapsed !== 0) {
      requestAnimationFrame(tick);
      return;
    }
    S._lastRun = now;
    _rawTick(now);
  };

  // ---------- init (polled; game boots after our script tag) ----------
  var bootTries = 0;
  function boot() {
    bootTries++;
    try {
      if (!document.getElementById('gameCanvas')) {
        if (bootTries < 120) setTimeout(boot, 500);
        return;
      }
      buildSprites();
      ensureFxCanvas();
      S.game = readGame(); // may still be null; tick() keeps polling
      requestAnimationFrame(tick);
    } catch (err) {
      if (bootTries < 120) setTimeout(boot, 1000);
    }
  }

  function init() {
    if (init._done) return;
    init._done = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
      setTimeout(boot, 1500); // belt and suspenders if the event already fired
    } else {
      setTimeout(boot, 0);
    }
  }

  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'gravegain2d-25d', version: VERSION, init: init });
  init();
})();
