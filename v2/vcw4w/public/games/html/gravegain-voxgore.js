/* GraveGain voxel gore (ADULT over-the-top, mode 'all' only) — agent A1 (G1).
 * Vanilla JS IIFE. Three.js r128 API only, fully guarded. Never throws.
 * Adult gate: window.FourweirdContentMode.mode must be 'all'; kid/teen get no-ops.
 */
(function () {
'use strict';

try { if (window.GraveGainVoxGore) { return; } } catch (e) { return; }

var VERSION = '1.0.0';
var DEFAULT_BUDGET = 240;
var MAX_BUDGET = 600;
var MIN_AUTODEGRADE = 60;
var MAX_POOL_MESHES = 240;
var GRAVITY = -30;
var BOUNCE_DAMPING = 0.4;
var MAX_BOUNCES = 2;

var BLOOD = [0xc1121f, 0x7a0c10, 0xe5383b, 0x5c090d];
var BONE = 0xe8e0d0;

/* ---------- state ---------- */
var budget = DEFAULT_BUDGET;
var enabled = false;
var chunks = []; /* active chunk records, oldest first */
var lastX = 0, lastY = 1, lastZ = 0;
var mesh = null;      /* THREE.InstancedMesh, capacity MAX_BUDGET */
var meshScene = null;
var dummy = null;
var fallbackPool = []; /* { mesh, inUse } individual boxes, max MAX_POOL_MESHES */
var fallbackGeo = null;
var fallbackMats = []; /* { color, mat } shared by palette color */
var tmpColor = null;

function readMode() {
  try {
    var m = window.FourweirdContentMode;
    if (m && typeof m.mode === 'string') { return m.mode; }
  } catch (e) {}
  return 'unknown';
}

try { enabled = (readMode() === 'all'); } catch (e) { enabled = false; }

function isAdult() {
  try { return enabled && readMode() === 'all'; } catch (e) { return false; }
}

function hasThree() {
  try { return !!window.THREE; } catch (e) { return false; }
}

function canInstance() {
  try {
    var T = window.THREE;
    return !!(T && T.InstancedMesh && T.BoxGeometry && T.MeshLambertMaterial && T.Object3D);
  } catch (e) { return false; }
}

function num(v, d) {
  try {
    var n = Number(v);
    if (typeof n === 'number' && isFinite(n)) { return n; }
  } catch (e) {}
  return d;
}

function clampInt(v, d, lo, hi) {
  var n = Math.floor(num(v, d));
  if (n < lo) { return lo; }
  if (n > hi) { return hi; }
  return n;
}

function clamp01(v) {
  var n = num(v, 0.5);
  if (n < 0) { return 0; }
  if (n > 1) { return 1; }
  return n;
}

function getScene() {
  try {
    var g = window.GraveGainGame;
    if (!g || typeof g !== 'object') { return null; }
    if (g.scene && typeof g.scene === 'object') { return g.scene; }
    if (g.game && typeof g.game === 'object' &&
        g.game.scene && typeof g.game.scene === 'object') { return g.game.scene; }
  } catch (e) {}
  return null;
}

/* ---------- rendering backends ---------- */
function ensureMesh(scene) {
  try {
    if (!canInstance() || !scene || typeof scene.add !== 'function') { return null; }
    if (mesh && meshScene === scene) { return mesh; }
    if (mesh && meshScene && meshScene !== scene) {
      try { if (typeof meshScene.remove === 'function') { meshScene.remove(mesh); } } catch (e2) {}
      mesh = null; meshScene = null; dummy = null;
    }
    if (!mesh) {
      var T = window.THREE;
      var geo = new T.BoxGeometry(1, 1, 1);
      var mat = new T.MeshLambertMaterial({ vertexColors: false, color: 0xffffff });
      mesh = new T.InstancedMesh(geo, mat, MAX_BUDGET);
      mesh.count = 0;
      mesh.frustumCulled = false;
      try { if (tmpColor === null) { tmpColor = new T.Color(); } } catch (e3) {}
      dummy = new T.Object3D();
      scene.add(mesh);
      meshScene = scene;
      var i;
      for (i = 0; i < chunks.length; i++) { chunks[i].colorDirty = true; }
    }
    return mesh;
  } catch (e) { return null; }
}

function getFallbackMaterial(hex) {
  try {
    var i;
    for (i = 0; i < fallbackMats.length; i++) {
      if (fallbackMats[i].color === hex) { return fallbackMats[i].mat; }
    }
    var mat = new window.THREE.MeshLambertMaterial({ vertexColors: false, color: hex });
    if (fallbackMats.length < 8) { fallbackMats.push({ color: hex, mat: mat }); }
    return mat;
  } catch (e) { return null; }
}

function acquireFallbackMesh(scene, hex) {
  try {
    if (!window.THREE || !scene || typeof scene.add !== 'function') { return null; }
    var i, entry;
    for (i = 0; i < fallbackPool.length; i++) {
      entry = fallbackPool[i];
      if (!entry.inUse && entry.mesh) {
        entry.inUse = true;
        try {
          var want = getFallbackMaterial(hex);
          if (want) { entry.mesh.material = want; }
          entry.mesh.visible = true;
          if (!entry.mesh.parent) { scene.add(entry.mesh); }
        } catch (e2) {}
        return entry;
      }
    }
    if (fallbackPool.length >= MAX_POOL_MESHES) { return null; }
    if (!fallbackGeo) {
      try { fallbackGeo = new window.THREE.BoxGeometry(1, 1, 1); }
      catch (e3) { return null; }
    }
    var mat0 = getFallbackMaterial(hex);
    if (!mat0) { return null; }
    var m = new window.THREE.Mesh(fallbackGeo, mat0);
    try { scene.add(m); } catch (e4) { return null; }
    entry = { mesh: m, inUse: true };
    fallbackPool.push(entry);
    return entry;
  } catch (e) { return null; }
}

function releaseChunkVisual(c) {
  try {
    if (c && c.poolEntry) {
      try {
        c.poolEntry.inUse = false;
        if (c.poolEntry.mesh) { c.poolEntry.mesh.visible = false; }
      } catch (e2) {}
      c.poolEntry = null;
    }
  } catch (e) {}
}

function evictOldest() {
  try {
    var c = chunks.shift();
    if (c) { releaseChunkVisual(c); }
  } catch (e) {}
}

function pickColor() {
  try {
    if (Math.random() < 0.10) { return BONE; }
    return BLOOD[(Math.random() * BLOOD.length) | 0];
  } catch (e) { return BLOOD[0]; }
}

/* ---------- public API ---------- */
function spawnBurst(x, y, z, opts) {
  try {
    if (!hasThree()) { return null; }
    if (!isAdult()) { return null; }
    x = num(x, lastX); y = num(y, lastY); z = num(z, lastZ);
    lastX = x; lastY = y; lastZ = z;
    var o = (opts && typeof opts === 'object') ? opts : {};
    var count = clampInt(o.count, 14, 1, 64);
    var spread = num(o.spread, 0.6);
    if (spread < 0) { spread = 0; } if (spread > 8) { spread = 8; }
    var power = num(o.power, 9);
    if (power < 0) { power = 0; } if (power > 40) { power = 40; }
    var up = num(o.up, 7);
    if (up < -10) { up = -10; } if (up > 30) { up = 30; }

    var scene = getScene();
    var useInst = canInstance();
    if (scene && useInst) { ensureMesh(scene); }

    var spawned = 0;
    var i, c, theta, zz, rr, speed;
    for (i = 0; i < count; i++) {
      try {
        while (chunks.length >= budget && chunks.length > 0) { evictOldest(); }
        if (chunks.length >= budget) { break; }
        theta = Math.random() * Math.PI * 2;
        zz = Math.random() * 2 - 1;
        rr = Math.sqrt(Math.max(0, 1 - zz * zz));
        speed = power * (0.4 + 0.6 * Math.random());
        c = {
          x: x + (Math.random() - 0.5) * 2 * spread,
          y: y + (Math.random() - 0.5) * 2 * spread,
          z: z + (Math.random() - 0.5) * 2 * spread,
          vx: rr * Math.cos(theta) * speed,
          vy: zz * speed + up * (0.5 + Math.random()),
          vz: rr * Math.sin(theta) * speed,
          life: 1.2 + Math.random() * 1.3,
          scale: 0.8 + Math.random() * 1.4,
          bounces: 0,
          color: pickColor(),
          colorDirty: true,
          poolEntry: null
        };
        if (scene && !useInst) {
          c.poolEntry = acquireFallbackMesh(scene, c.color);
          if (!c.poolEntry) { continue; }
        }
        chunks.push(c);
        spawned++;
      } catch (eInner) {}
    }
    return spawned;
  } catch (e) { return null; }
}

function update(dt) {
  try {
    if (!hasThree()) { return 0; }
    dt = num(dt, 0);
    if (dt < 0) { dt = 0; }
    if (dt > 0.05) { dt = 0.05; }

    var i, c, half;
    for (i = chunks.length - 1; i >= 0; i--) {
      try {
        c = chunks[i];
        c.life -= dt;
        if (c.life <= 0) {
          releaseChunkVisual(c);
          chunks.splice(i, 1);
          continue;
        }
        c.vy += GRAVITY * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        half = c.scale * 0.5;
        if (c.y <= half) {
          c.y = half;
          if (c.bounces < MAX_BOUNCES) {
            c.vy = -c.vy * BOUNCE_DAMPING;
            c.vx *= 0.7;
            c.vz *= 0.7;
            c.bounces++;
            if (c.vy < 1 && c.vy > -1) { c.vy = 0; }
          } else {
            c.vy = 0; c.vx = 0; c.vz = 0;
          }
        }
      } catch (eInner) {}
    }

    /* render sync (skipped silently when no scene: virtual pool) */
    try {
      var scene = getScene();
      if (scene) {
        if (canInstance()) {
          var m = ensureMesh(scene);
          if (m && dummy) {
            var T = window.THREE;
            for (i = 0; i < chunks.length; i++) {
              c = chunks[i];
              dummy.position.set(c.x, c.y, c.z);
              dummy.scale.set(c.scale, c.scale, c.scale);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              m.setMatrixAt(i, dummy.matrix);
              if (c.colorDirty && typeof m.setColorAt === 'function') {
                try {
                  tmpColor.setHex(c.color);
                  m.setColorAt(i, tmpColor);
                } catch (eC) {}
                c.colorDirty = false;
              }
            }
            m.count = chunks.length;
            try { m.instanceMatrix.needsUpdate = true; } catch (eM) {}
            try { if (m.instanceColor) { m.instanceColor.needsUpdate = true; } } catch (eC2) {}
          }
        } else {
          for (i = 0; i < chunks.length; i++) {
            c = chunks[i];
            if (!c.poolEntry) { c.poolEntry = acquireFallbackMesh(scene, c.color); }
            if (c.poolEntry && c.poolEntry.mesh) {
              try {
                c.poolEntry.mesh.position.set(c.x, c.y, c.z);
                c.poolEntry.mesh.scale.set(c.scale, c.scale, c.scale);
                c.poolEntry.mesh.visible = true;
              } catch (eF) {}
            }
          }
        }
      }
    } catch (eR) {}

    return chunks.length;
  } catch (e) { return 0; }
}

function setBudget(n) {
  try {
    if (!hasThree()) { return 0; }
    budget = clampInt(n, budget, 0, MAX_BUDGET);
    while (chunks.length > budget && chunks.length > 0) { evictOldest(); }
    try {
      var scene = getScene();
      if (scene && canInstance()) { ensureMesh(scene); }
    } catch (e2) {}
    return budget;
  } catch (e) { return 0; }
}

function count() {
  try { return chunks.length; } catch (e) { return 0; }
}

function onEntityHit(kind, hp01, x, y, z) {
  try {
    if (!hasThree()) { return null; }
    if (!isAdult()) { return null; }
    var hp = clamp01(hp01);
    var size = Math.round(6 + 30 * (1 - hp));
    if (hp <= 0 && size < 30) { size = 30; }
    if (size < 1) { size = 1; } if (size > 64) { size = 64; }
    x = num(x, lastX); y = num(y, lastY); z = num(z, lastZ);
    return spawnBurst(x, y, z, { count: size, kind: kind });
  } catch (e) { return null; }
}

/* ---------- window events (only these two; no DOM, no input) ---------- */
try {
  if (window.addEventListener) {
    window.addEventListener('fourweird-content-mode', function (e) {
      try {
        var m = null;
        if (e && e.detail && typeof e.detail.mode === 'string') { m = e.detail.mode; }
        else { m = readMode(); }
        enabled = (m === 'all');
      } catch (e2) {}
    });
    window.addEventListener('gravegain-graphics-autodegrade', function () {
      try {
        budget = Math.floor(budget / 2);
        if (budget < MIN_AUTODEGRADE) { budget = MIN_AUTODEGRADE; }
        while (chunks.length > budget && chunks.length > 0) { evictOldest(); }
      } catch (e3) {}
    });
  }
} catch (e) {}

/* ---------- expose ---------- */
try {
  window.GraveGainVoxGore = {
    VERSION: VERSION,
    spawnBurst: spawnBurst,
    update: update,
    setBudget: setBudget,
    count: count,
    onEntityHit: onEntityHit
  };
} catch (e) {}

try {
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: 'gravegain-voxgore', version: VERSION });
} catch (e) {}

})();

// Usage: GraveGainVoxGore.spawnBurst(x, y, z, { count: 18 });
// Call GraveGainVoxGore.update(dt) each frame; damage hook: GraveGainVoxGore.onEntityHit('zombie', hp01, x, y, z).
