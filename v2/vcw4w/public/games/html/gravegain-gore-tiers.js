/* GraveGain Gore Tiers — unified physics-tier gore for GraveGain2D + GraveGain3D.
 * Works ALONGSIDE gore-gravegain2d.js / gore-gravegain3d.js (does not reuse
 * their exact globals). Adult voxel-chunk physics, teen droplets, kid sparkles.
 * Vanilla JS IIFE, idempotent, never throws, no input listeners,
 * no pointer lock. Overlay canvas is pointer-events:none, z-index 4999.
 */
(function () {
  'use strict';
  try {
    if (window.GraveGainGoreTiers) { return; }
  } catch (e) { return; }

  var VERSION = '2.0.0';
  var CANVAS_ID = 'ggTiersGore';
  var CANVAS_Z = 4999;
  var MAX_CHUNKS = 220;
  var MAX_DECALS_ADULT = 80;
  var DECAL_LIFE_ADULT = 45000;
  var MAX_DROPS_TEEN = 60;
  var MAX_DECALS_TEEN = 30;
  var DECAL_LIFE_TEEN = 12000;
  var MAX_SPARKLE_KID = 120;
  var MAX_DECALS_KID = 30;
  var DECAL_LIFE_KID = 8000;
  var POLL_MS = 500;
  var GRAVITY = 1400;

  // Kid-safe palette only (never red/blood here).
  var KID_COLORS = ['#FFD54A', '#FF7AC8', '#5AC8FF', '#8CFF9E', '#C49CFF', '#FF9E5A'];
  var KID_PRAISE = ['NICE!', 'SPARKLE DOWN!', 'RAINBOW TAP!'];
  var ADULT_COLORS = ['#C21717', '#8E0E0E', '#E03131', '#6B0A0A', '#FF6B6B'];
  var TEEN_COLORS = ['#C21717', '#E03131', '#8E0E0E'];
  var GIB_COLORS = ['#5E0808', '#7A0D0D', '#3D0606'];

  var modeOverride = null;
  var canvas = null;
  var ctx = null;
  var parts = [];   // live particles / chunks / droplets / sparkles
  var decals = [];  // floor decals
  var floaters = []; // kid praise floaters
  var lastKills = -1;
  var rafId = 0;
  var lastT = 0;
  var goreHooked = false;
  var mesh3d = null; // THREE InstancedMesh pool (adult, when available)
  var dummyObj = null;

  function clampNum(v, lo, hi, fb) {
    try {
      v = Number(v);
      if (!isFinite(v)) { return fb; }
      if (v < lo) { return lo; }
      if (v > hi) { return hi; }
      return v;
    } catch (e) { return fb; }
  }

  function getSlug() {
    try {
      var b = document && document.body;
      if (b && b.getAttribute) {
        var ds = b.getAttribute('data-slug');
        if (ds) { return ds; }
      }
      var el = document ? document.querySelector('[data-slug]') : null;
      if (el && el.getAttribute) {
        var s2 = el.getAttribute('data-slug');
        if (s2) { return s2; }
      }
    } catch (e) { /* ignore */ }
    try {
      var m = String(location && location.pathname || '').match(/\/games\/([^\/\?#]+)/);
      if (m && m[1]) { return m[1]; }
    } catch (e) { /* ignore */ }
    return 'gravegain';
  }

  function normMode(v) {
    try {
      var s = String(v == null ? '' : v).toLowerCase();
      if (s === 'all' || s === 'adult' || s === 'mature') { return 'all'; }
      if (s === 'kid' || s === 'kids' || s === 'child') { return 'kid'; }
      if (s === 'teen' || s === 'bloodless-teen') { return 'teen'; }
      return '';
    } catch (e) { return ''; }
  }

  function getMode() {
    try {
      if (modeOverride) { return modeOverride; }
      var slug = getSlug();
      var q = '';
      try {
        var usp = new URLSearchParams(String(location && location.search || ''));
        q = normMode(usp.get('content'));
      } catch (e) { q = ''; }
      if (q) { return q; }
      try {
        var ls1 = window.localStorage ? window.localStorage.getItem('4weird-content-mode:' + slug) : null;
        var n1 = normMode(ls1);
        if (n1) { return n1; }
      } catch (e) { /* ignore */ }
      try {
        var ls2 = window.localStorage ? window.localStorage.getItem('FourweirdContentMode') : null;
        var n2 = normMode(ls2);
        if (n2) { return n2; }
      } catch (e) { /* ignore */ }
      try {
        var g = window.FourweirdContentMode;
        if (typeof g === 'string') {
          var n3 = normMode(g);
          if (n3) { return n3; }
        } else if (g && typeof g === 'object') {
          var n4 = normMode(g.mode);
          if (n4) { return n4; }
        }
      } catch (e) { /* ignore */ }
      return 'teen';
    } catch (e) { return 'teen'; }
  }

  function setMode(m) {
    try {
      var n = normMode(m);
      if (!n) { return getMode(); }
      modeOverride = n;
      try {
        var slug = getSlug();
        if (window.localStorage) {
          window.localStorage.setItem('4weird-content-mode:' + slug, n);
        }
      } catch (e) { /* ignore */ }
      try {
        var cur = window.FourweirdContentMode;
        if (cur && typeof cur === 'object') {
          cur.mode = n;
          cur.goreEnabled = (n !== 'kid');
          cur.drugsAllowed = (n === 'all');
        }
      } catch (e) { /* ignore */ }
      try {
        if (typeof CustomEvent === 'function' && document && document.dispatchEvent) {
          document.dispatchEvent(new CustomEvent('fourweird-content-mode', { detail: { mode: n } }));
        }
      } catch (e) { /* ignore */ }
      return n;
    } catch (e) { return 'teen'; }
  }

  function particleMult() {
    try {
      var g = window.FourWeirdGraphics;
      var m = g ? Number(g.particleMult != null ? g.particleMult : g.particleMultiplier) : NaN;
      if (!isFinite(m)) { return 1; }
      return clampNum(m, 0.25, 2, 1);
    } catch (e) { return 1; }
  }

  function ensureCanvas() {
    try {
      if (canvas && ctx) { return true; }
      if (!document || !document.createElement || !document.body) { return false; }
      var ex = document.getElementById(CANVAS_ID);
      if (ex) {
        canvas = ex;
      } else {
        canvas = document.createElement('canvas');
        canvas.id = CANVAS_ID;
        canvas.setAttribute('aria-hidden', 'true');
      }
      try {
        canvas.style.position = 'fixed';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = String(CANVAS_Z);
        canvas.style.pointerEvents = 'none';
      } catch (e) { /* ignore */ }
      try {
        if (!ex && document.body && document.body.appendChild) {
          document.body.appendChild(canvas);
        }
      } catch (e) { /* ignore */ }
      sizeCanvas();
      try {
        ctx = canvas.getContext('2d');
      } catch (e) { ctx = null; }
      return !!ctx;
    } catch (e) { return false; }
  }

  function sizeCanvas() {
    try {
      if (!canvas) { return; }
      var w = window.innerWidth || 800;
      var h = window.innerHeight || 600;
      if (canvas.width !== w) { canvas.width = w; }
      if (canvas.height !== h) { canvas.height = h; }
    } catch (e) { /* ignore */ }
  }

  function pick(arr, i) {
    try {
      if (!arr || !arr.length) { return '#FFFFFF'; }
      return arr[Math.abs(i | 0) % arr.length];
    } catch (e) { return '#FFFFFF'; }
  }

  function pushPart(p) {
    try {
      var mode = getMode();
      var cap = mode === 'all' ? MAX_CHUNKS : (mode === 'kid' ? MAX_SPARKLE_KID : MAX_DROPS_TEEN);
      if (parts.length >= cap) {
        parts.splice(0, parts.length - cap + 1);
      }
      parts.push(p);
    } catch (e) { /* ignore */ }
  }

  function addDecal(x, y, color, life) {
    try {
      var mode = getMode();
      var cap = mode === 'all' ? MAX_DECALS_ADULT : (mode === 'kid' ? MAX_DECALS_KID : MAX_DECALS_TEEN);
      var lf = mode === 'all' ? DECAL_LIFE_ADULT : (mode === 'kid' ? DECAL_LIFE_KID : DECAL_LIFE_TEEN);
      if (typeof life === 'number' && isFinite(life) && life > 0) { lf = life; }
      if (decals.length >= cap) {
        decals.splice(0, decals.length - cap + 1);
      }
      var r = 3 + Math.random() * (mode === 'all' ? 14 : 7);
      decals.push({ x: x, y: y, r: r, color: color, born: Date.now(), life: lf });
    } catch (e) { /* ignore */ }
  }

  function floorY() {
    try {
      if (canvas && canvas.height) { return canvas.height - 10; }
    } catch (e) { /* ignore */ }
    return 600;
  }

  // ---- Adult physics: pooled voxel chunks (2D rects; 3D InstancedMesh when available) ----
  function spawnVoxelBurst(x, y, power) {
    try {
      if (getMode() !== 'all') { return 0; }
      if (!ensureCanvas()) { return 0; }
      var pw = clampNum(power, 0.2, 3, 1);
      var n = Math.round(clampNum(14 * pw * particleMult(), 4, 60));
      var gy = floorY();
      var spawned = 0;
      for (var i = 0; i < n; i++) {
        try {
          var ang = Math.random() * Math.PI * 2;
          var sp = (60 + Math.random() * 320) * pw;
          parts.push({
            kind: 'chunk',
            x: x, y: y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 160 * pw,
            size: 2 + Math.random() * 6,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 12,
            bounces: 2,
            color: pick(ADULT_COLORS, (Math.random() * ADULT_COLORS.length) | 0),
            born: Date.now(), life: 2600 + Math.random() * 2200
          });
          spawned++;
        } catch (e) { /* ignore */ }
      }
      // Trim pool to hard cap.
      try {
        if (parts.length > MAX_CHUNKS) {
          parts.splice(0, parts.length - MAX_CHUNKS);
        }
      } catch (e) { /* ignore */ }
      // Gib cluster: a few big slow heavy chunks.
      try {
        var gibs = 2 + ((Math.random() * 3) | 0);
        for (var g = 0; g < gibs; g++) {
          if (parts.length >= MAX_CHUNKS) { parts.shift(); }
          var ga = Math.random() * Math.PI * 2;
          parts.push({
            kind: 'gib',
            x: x, y: y,
            vx: Math.cos(ga) * 90 * pw,
            vy: Math.sin(ga) * 90 * pw - 220 * pw,
            size: 8 + Math.random() * 8,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 8,
            bounces: 2,
            color: pick(GIB_COLORS, g),
            born: Date.now(), life: 3200 + Math.random() * 2000
          });
        }
      } catch (e) { /* ignore */ }
      try {
        addDecal(x, Math.min(y + 24, gy), pick(ADULT_COLORS, (Math.random() * 5) | 0));
      } catch (e) { /* ignore */ }
      syncMesh3d();
      return spawned;
    } catch (e) { return 0; }
  }

  // ---- Teen: small droplet bursts, no gibs/chunks ----
  function spawnTeenBurst(x, y, count) {
    try {
      if (!ensureCanvas()) { return 0; }
      var n = Math.round(clampNum(count == null ? 10 : count, 1, 24) * particleMult());
      var gy = floorY();
      var spawned = 0;
      for (var i = 0; i < n; i++) {
        try {
          if (parts.length >= MAX_DROPS_TEEN) { parts.shift(); }
          var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
          var sp = 60 + Math.random() * 200;
          parts.push({
            kind: 'drop',
            x: x, y: y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            size: 1.5 + Math.random() * 2.5,
            bounces: 0,
            color: pick(TEEN_COLORS, i),
            born: Date.now(), life: 900 + Math.random() * 900
          });
          spawned++;
        } catch (e) { /* ignore */ }
      }
      try {
        if (Math.random() < 0.5) {
          addDecal(x, Math.min(y + 18, gy), pick(TEEN_COLORS, (Math.random() * 3) | 0));
        }
      } catch (e) { /* ignore */ }
      return spawned;
    } catch (e) { return 0; }
  }

  // ---- Kid: rainbow sparkles + praise floaters, NEVER red ----
  function spawnKidBurst(x, y, count) {
    try {
      if (!ensureCanvas()) { return 0; }
      var n = Math.round(clampNum(count == null ? 12 : count, 1, 30) * particleMult());
      var spawned = 0;
      for (var i = 0; i < n; i++) {
        try {
          if (parts.length >= MAX_SPARKLE_KID) { parts.shift(); }
          var ang = Math.random() * Math.PI * 2;
          var sp = 40 + Math.random() * 160;
          parts.push({
            kind: 'sparkle',
            x: x, y: y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 60,
            size: 2 + Math.random() * 3,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 10,
            bounces: 0,
            color: pick(KID_COLORS, (Math.random() * KID_COLORS.length) | 0),
            born: Date.now(), life: 1000 + Math.random() * 1000
          });
          spawned++;
        } catch (e) { /* ignore */ }
      }
      try {
        floaters.push({
          text: pick(KID_PRAISE, (Math.random() * KID_PRAISE.length) | 0),
          x: x + (Math.random() - 0.5) * 40,
          y: y - 18,
          born: Date.now(), life: 1400,
          color: pick(KID_COLORS, (Math.random() * KID_COLORS.length) | 0)
        });
        if (floaters.length > 12) { floaters.splice(0, floaters.length - 12); }
        addDecal(x, y + 10, pick(KID_COLORS, (Math.random() * KID_COLORS.length) | 0), 4000);
      } catch (e) { /* ignore */ }
      return spawned;
    } catch (e) { return 0; }
  }

  function burst(x, y, count) {
    try {
      var mode = getMode();
      var cx = clampNum(x, 0, 10000, 100);
      var cy = clampNum(y, 0, 10000, 100);
      var n = clampNum(count, 1, 60, 12);
      if (mode === 'all') { return spawnVoxelBurst(cx, cy, n / 12); }
      if (mode === 'kid') { return spawnKidBurst(cx, cy, n); }
      return spawnTeenBurst(cx, cy, n);
    } catch (e) { return 0; }
  }

  function damageState(frac) {
    try {
      var mode = getMode();
      if (mode === 'kid') { return 'pristine'; }
      var f = Number(frac);
      if (!isFinite(f)) { return 'pristine'; }
      if (f < 0) { f = 0; }
      if (f > 1) { f = 1; }
      if (mode === 'all') {
        if (f > 0.75) { return 'pristine'; }
        if (f > 0.5) { return 'bloodied'; }
        if (f > 0.25) { return 'mangled'; }
        return 'burst';
      }
      // teen: blood, minimal gore — no mangled/burst states.
      if (f > 0.5) { return 'pristine'; }
      return 'bloodied';
    } catch (e) { return 'pristine'; }
  }

  function flashDiv(colors, ms) {
    try {
      if (!document || !document.createElement || !document.body) { return; }
      var d = document.createElement('div');
      try {
        d.setAttribute('aria-hidden', 'true');
        d.style.position = 'fixed';
        d.style.left = '0';
        d.style.top = '0';
        d.style.width = '100%';
        d.style.height = '100%';
        d.style.pointerEvents = 'none';
        d.style.zIndex = String(CANVAS_Z);
        d.style.background = colors;
        d.style.opacity = '0.55';
        d.style.transition = 'opacity 0.4s linear';
        document.body.appendChild(d);
      } catch (e) { return; }
      try {
        setTimeout(function () {
          try {
            d.style.opacity = '0';
            setTimeout(function () {
              try { if (d.parentNode) { d.parentNode.removeChild(d); } } catch (e) { /* ignore */ }
            }, 450);
          } catch (e) { /* ignore */ }
        }, ms || 120);
      } catch (e) {
        try { if (d.parentNode) { d.parentNode.removeChild(d); } } catch (ee) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }

  function woundFlash() {
    try {
      var mode = getMode();
      if (mode === 'kid') {
        // Rainbow arc flash — never red on kid path.
        flashDiv('linear-gradient(135deg,#FFD54A,#FF7AC8,#5AC8FF,#8CFF9E,#C49CFF)', 160);
        return true;
      }
      if (mode === 'all') {
        flashDiv('radial-gradient(ellipse at center, rgba(194,23,23,0) 40%, rgba(194,23,23,0.85) 100%)', 140);
        return true;
      }
      flashDiv('radial-gradient(ellipse at center, rgba(194,23,23,0) 55%, rgba(194,23,23,0.55) 100%)', 120);
      return true;
    } catch (e) { return false; }
  }

  // Drugs are adults-only: guarded hook, no-op unless BotanySeeds exists + mode 'all'.
  function drugGlow() {
    try {
      if (getMode() !== 'all') { return false; }
      var seeds = null;
      try {
        seeds = window.GraveGainGameData ? window.GraveGainGameData.BotanySeeds : null;
      } catch (e) { seeds = null; }
      if (!seeds) { return false; }
      flashDiv('radial-gradient(ellipse at center, rgba(120,60,220,0) 45%, rgba(120,220,150,0.5) 100%)', 300);
      return true;
    } catch (e) { return false; }
  }

  // ---- 3D path: THREE InstancedMesh pool (adult chunks), guarded, canvas fallback ----
  function findScene3d() {
    try {
      var cands = [
        window.GraveGain3DScene,
        window.GraveGain3D && window.GraveGain3D.scene,
        window.GG3DScene,
        window.__gg3dScene
      ];
      for (var i = 0; i < cands.length; i++) {
        if (cands[i] && typeof cands[i].add === 'function') { return cands[i]; }
      }
      return null;
    } catch (e) { return null; }
  }

  function ensureMesh3d() {
    try {
      if (mesh3d) { return true; }
      if (!window.THREE || !window.THREE.InstancedMesh) { return false; }
      if (getMode() !== 'all') { return false; }
      var scene = findScene3d();
      if (!scene) { return false; } // no scene discovered: stay on canvas fallback
      var geo = new window.THREE.BoxGeometry(0.12, 0.12, 0.12);
      var mat = new window.THREE.MeshBasicMaterial({ color: 0xc21717 });
      var mesh = new window.THREE.InstancedMesh(geo, mat, MAX_CHUNKS);
      try {
        mesh.instanceMatrix.setUsage(window.THREE.DynamicDrawUsage || 35048);
      } catch (e) { /* ignore */ }
      try { mesh.frustumCulled = false; } catch (e) { /* ignore */ }
      try { scene.add(mesh); } catch (e) { return false; }
      try {
        dummyObj = new window.THREE.Object3D();
      } catch (e) { dummyObj = null; }
      mesh3d = mesh;
      return true;
    } catch (e) { mesh3d = null; return false; }
  }

  function syncMesh3d() {
    // Best-effort mirror of adult chunk positions into the InstancedMesh.
    // Canvas rects remain the authoritative visual; mesh is a bonus path.
    try {
      if (getMode() !== 'all') { return; }
      if (!ensureMesh3d()) { return; }
      if (!mesh3d || !dummyObj || !window.THREE) { return; }
      var idx = 0;
      var w = (canvas && canvas.width) || 800;
      var h = (canvas && canvas.height) || 600;
      for (var i = 0; i < parts.length && idx < MAX_CHUNKS; i++) {
        try {
          var p = parts[i];
          if (!p || (p.kind !== 'chunk' && p.kind !== 'gib')) { continue; }
          dummyObj.position.set((p.x / w - 0.5) * 20, (0.5 - p.y / h) * 12, 0);
          dummyObj.rotation.set(0, 0, p.rot || 0);
          var s = (p.kind === 'gib' ? 2 : 1) * (p.size / 5);
          dummyObj.scale.set(s, s, s);
          dummyObj.updateMatrix();
          mesh3d.setMatrixAt(idx, dummyObj.matrix);
          idx++;
        } catch (e) { /* ignore */ }
      }
      try {
        // Park unused instances far away.
        for (var j = idx; j < MAX_CHUNKS; j++) {
          dummyObj.position.set(0, -9999, 0);
          dummyObj.scale.set(0.001, 0.001, 0.001);
          dummyObj.updateMatrix();
          mesh3d.setMatrixAt(j, dummyObj.matrix);
        }
      } catch (e) { /* ignore */ }
      try { mesh3d.instanceMatrix.needsUpdate = true; } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
  }

  function step(dt) {
    try {
      var now = Date.now();
      var gy = floorY();
      // Expire decals.
      try {
        for (var d = decals.length - 1; d >= 0; d--) {
          if (now - decals[d].born > decals[d].life) { decals.splice(d, 1); }
        }
      } catch (e) { /* ignore */ }
      try {
        for (var f = floaters.length - 1; f >= 0; f--) {
          if (now - floaters[f].born > floaters[f].life) { floaters.splice(f, 1); }
        }
      } catch (e) { /* ignore */ }
      // Physics integrate (no per-frame allocation: in-place updates).
      try {
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          try {
            if (!p || now - p.born > p.life) { parts.splice(i, 1); continue; }
            if (p.kind === 'chunk' || p.kind === 'gib') {
              p.vy += GRAVITY * dt;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.rot += (p.vr || 0) * dt;
              if (p.y >= gy && p.vy > 0) {
                if (p.bounces > 0) {
                  p.bounces--;
                  p.y = gy;
                  p.vy = -p.vy * 0.45;
                  p.vx *= 0.6; // friction
                  p.vr *= 0.6;
                } else {
                  p.y = gy;
                  p.vy = 0;
                  p.vx *= (1 - 3 * dt);
                  if (Math.abs(p.vx) < 4) { p.vx = 0; }
                }
              }
            } else if (p.kind === 'drop') {
              p.vy += GRAVITY * 0.7 * dt;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              if (p.y >= gy) { parts.splice(i, 1); continue; }
            } else { // sparkle: floaty drift, no gravity
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.vy -= 30 * dt;
              p.rot += (p.vr || 0) * dt;
            }
          } catch (e) { /* ignore per-particle */ }
        }
      } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
  }

  function draw() {
    try {
      if (!ctx || !canvas) { return; }
      var now = Date.now();
      var w = canvas.width || 800;
      var h = canvas.height || 600;
      ctx.clearRect(0, 0, w, h);
      var i, p, t, a;
      // Decals (fade out over life).
      try {
        for (i = 0; i < decals.length; i++) {
          try {
            var dc = decals[i];
            t = 1 - (now - dc.born) / dc.life;
            if (t <= 0) { continue; }
            a = 0.5 * t;
            ctx.globalAlpha = a < 0 ? 0 : (a > 0.5 ? 0.5 : a);
            ctx.fillStyle = dc.color;
            ctx.beginPath();
            ctx.ellipse(dc.x, dc.y, dc.r, dc.r * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
          } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
      // Particles.
      try {
        for (i = 0; i < parts.length; i++) {
          try {
            p = parts[i];
            t = 1 - (now - p.born) / p.life;
            if (t <= 0) { continue; }
            ctx.globalAlpha = t < 0 ? 0 : (t > 1 ? 1 : t);
            ctx.fillStyle = p.color || '#FFFFFF';
            if (p.kind === 'chunk' || p.kind === 'gib') {
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate(p.rot || 0);
              var s = p.size || 4;
              ctx.fillRect(-s / 2, -s / 2, s, s);
              ctx.restore();
            } else if (p.kind === 'drop') {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
              ctx.fill();
            } else { // sparkle: 4-point star, kid palette only
              ctx.save();
              ctx.translate(p.x, p.y);
              ctx.rotate(p.rot || 0);
              var r = p.size || 3;
              ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.6);
              ctx.fillRect(-r * 0.3, -r, r * 0.6, r * 2);
              ctx.restore();
            }
          } catch (e) { /* ignore per-particle */ }
        }
      } catch (e) { /* ignore */ }
      // Kid praise floaters.
      try {
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px sans-serif';
        for (i = 0; i < floaters.length; i++) {
          try {
            var fl = floaters[i];
            t = 1 - (now - fl.born) / fl.life;
            if (t <= 0) { continue; }
            ctx.globalAlpha = t;
            ctx.fillStyle = fl.color || '#FFD54A';
            var rise = (1 - t) * 40;
            ctx.fillText(fl.text, fl.x, fl.y - rise);
          } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
      try { ctx.globalAlpha = 1; } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
  }

  function loop(ts) {
    try {
      rafId = 0;
      if (document && document.hidden) {
        schedule();
        return;
      }
      var now = ts || 0;
      var dt = 0.016;
      try {
        if (lastT && now > lastT) {
          dt = (now - lastT) / 1000;
          if (dt > 0.05) { dt = 0.05; }
          if (dt < 0.001) { dt = 0.001; }
        }
      } catch (e) { dt = 0.016; }
      lastT = now;
      try { sizeCanvas(); } catch (e) { /* ignore */ }
      step(dt);
      draw();
      syncMesh3d();
    } catch (e) { /* ignore */ }
    schedule();
  }

  function schedule() {
    try {
      if (rafId) { return; }
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = setTimeout(function () {
          rafId = 0;
          loop(0);
        }, 33);
      }
    } catch (e) { /* ignore */ }
  }

  function readKills() {
    try {
      var g = window.GraveGainGame;
      if (g && isFinite(Number(g.kills))) { return Number(g.kills); }
    } catch (e) { /* ignore */ }
    try {
      var g2 = window.GraveGain2DGame;
      if (g2 && isFinite(Number(g2.kills))) { return Number(g2.kills); }
    } catch (e) { /* ignore */ }
    try {
      var g3 = window.GraveGain3DGame;
      if (g3 && isFinite(Number(g3.kills))) { return Number(g3.kills); }
    } catch (e) { /* ignore */ }
    return -1;
  }

  function pollKills() {
    try {
      var k = readKills();
      if (k >= 0 && lastKills >= 0 && k > lastKills) {
        try {
          var w = (canvas && canvas.width) || window.innerWidth || 800;
          var h = (canvas && canvas.height) || window.innerHeight || 600;
          var bx = w * (0.2 + Math.random() * 0.6);
          var by = h * (0.2 + Math.random() * 0.5);
          burst(bx, by, 12);
          var mode = getMode();
          if (mode === 'all' && Math.random() < 0.4) { woundFlash(); }
          if (mode === 'kid' && Math.random() < 0.3) { woundFlash(); }
        } catch (e) { /* ignore */ }
      }
      if (k >= 0) { lastKills = k; }
    } catch (e) { /* ignore */ }
  }

  function hookGore() {
    try {
      if (goreHooked) { return; }
      goreHooked = true;
      var fg = window.FourweirdGore;
      if (fg && typeof fg.spawn === 'function' && !fg.spawn.__tiersWrapped) {
        var orig = fg.spawn;
        var wrapped = function (x, y, n) {
          var out = null;
          try {
            out = orig.apply(this, arguments);
          } catch (e) { out = null; }
          try {
            burst(Number(x) || 100, Number(y) || 100, Number(n) || 12);
          } catch (e) { /* ignore */ }
          return out;
        };
        try { wrapped.__tiersWrapped = true; } catch (e) { /* ignore */ }
        fg.spawn = wrapped;
      } else if (!fg) {
        // Sibling gore modules absent: provide a minimal passthrough spawn.
        try {
          window.FourweirdGore = {
            spawn: function (x, y, n) {
              try {
                return burst(Number(x) || 100, Number(y) || 100, Number(n) || 12);
              } catch (e) { return 0; }
            }
          };
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
  }

  function init() {
    try {
      if (!ensureCanvas()) { return false; }
    } catch (e) { return false; }
    try { hookGore(); } catch (e) { /* ignore */ }
    try { lastKills = readKills(); } catch (e) { /* ignore */ }
    try {
      setInterval(pollKills, POLL_MS);
    } catch (e) { /* ignore */ }
    try { schedule(); } catch (e) { /* ignore */ }
    try {
      window.GraveGainMods = window.GraveGainMods || [];
      window.GraveGainMods.push({ name: 'gravegain-gore-tiers', version: VERSION, init: init });
    } catch (e) { /* ignore */ }
    return true;
  }

  var api = null;
  try {
    api = {
      VERSION: VERSION,
      getMode: getMode,
      setMode: setMode,
      burst: burst,
      damageState: damageState,
      drugGlow: drugGlow,
      spawnVoxelBurst: spawnVoxelBurst,
      woundFlash: woundFlash
    };
    window.GraveGainGoreTiers = api;
  } catch (e) {
    try { window.GraveGainGoreTiers = { VERSION: VERSION }; } catch (ee) { /* ignore */ }
  }

  // Boot when DOM is ready (no input listeners; poll-free one-shot boot).
  try {
    if (document && document.readyState !== 'loading') {
      init();
    } else if (document && document.addEventListener) {
      document.addEventListener('DOMContentLoaded', function () {
        try { init(); } catch (e) { /* ignore */ }
      });
    } else {
      try {
        setTimeout(function () { try { init(); } catch (e) { /* ignore */ } }, 500);
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
})();
