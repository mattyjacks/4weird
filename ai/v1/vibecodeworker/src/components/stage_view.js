/**
 * Dual-pane playtest stage: PURE live game + AI vision + human takeover.
 *
 * The game renders ONCE at true 1920x1080 inside the PURE pane (a fixed-size
 * <webview> backing store, CSS-scaled to fit — ratio locked, headless and
 * headful alike, still fully interactive). The AI pane mirrors the same
 * frame on a compact 480x270 canvas (quarter of 960x540: 4x fewer pixels to
 * move/decode/draw) plus the AI overlay: object detections, bot AND
 * human mouse trail + cursor, click flashes, a persistent click heatmap, key
 * chips and the last-action readout.
 *
 * Fast path: the 480px JPEG frame decodes via createImageBitmap (GPU image
 * decode, off the main-thread parser) with an <img> fallback; a Web Worker
 * owns the CPU-heavy bits (drain JSON parse, box culling, heat-cell scaling)
 * across CPU cores while the main thread only composites rects. Capture and
 * detection run concurrently, detection is throttled to every 4th tick, and
 * the heat grid is a compact 32x18 (576 cells vs 1296).
 *
 * Human takeover mode: the operator plays in the PURE pane while the AI only
 * watches — a tiny guest recorder streams normalized mouse/keys into a drain
 * loop that feeds vision_state (so the AI pane draws the human live),
 * accumulates a notes session (moves, clicks, keys, zones, screenshots) and
 * logs a plain-English summary when the operator hands the wheel back.
 *
 * Node-safe: Electron/DOM access only happens inside initStageView(). The
 * pure helpers (scaling, coords, heat cells, box culling, worker script,
 * recorder/drain scripts, takeover summary) are unit-testable in plain node.
 */

const HD_W = 1920;
const HD_H = 1080;
// Compact AI projection: 480x270 keeps 16:9, quarters the 960x540 pixel
// traffic (encode + base64 + decode + drawImage) for a much faster mirror.
const AI_W = 480;
const AI_H = 270;
const HEAT_COLS = 32;
const HEAT_ROWS = 18;
// Fast mirror: ~3fps frame loop; detection runs every 4th tick (~1.4s).
const MIRROR_TICK_MS = 350;
const DETECT_EVERY_TICKS = 4;
const MAX_BOXES = 24;
const MAX_TRAIL_DRAW = 20;
// Stale-hotspot fade: every HEAT_DECAY_MS the whole grid is multiplied by
// HEAT_DECAY_FACTOR and whispers below HEAT_DECAY_EPSILON go to zero, so old
// clicks visibly cool off instead of accumulating forever.
const HEAT_DECAY_MS = 10000;
const HEAT_DECAY_FACTOR = 0.5;
const HEAT_DECAY_EPSILON = 0.5;
const TAKEOVER_DRAIN_MS = 500;
const TAKEOVER_SHOT_MS = 3000;
const MAX_TAKEOVER_SHOTS = 12;
// Trace-test ring: raw takeover samples kept per session so the app can
// generate a regression test from its own trace (see trace_test_gen.js).
// Bounded — never grows past this many compact events.
const TRACE_SAMPLE_CAP = 240;

let KIND_COLORS = null;
try {
  KIND_COLORS = require('./vision_mirror').KIND_COLORS;
} catch (_) {
  KIND_COLORS = null;
}
KIND_COLORS = KIND_COLORS || {
  enemy: '#ff4d6d', button: '#22d3ee', link: '#4ade80', input: '#facc15',
  heading: '#c084fc', media: '#fb923c', other: '#94a3b8'
};

// ---------------------------------------------------------------------------
// Pure helpers (no DOM, no Electron — covered by unit tests).
// ---------------------------------------------------------------------------

function clamp1000(n) {
  n = Math.round(Number(n));
  if (!isFinite(n)) return 500;
  return Math.max(0, Math.min(1000, n));
}

// Same-ratio shrink factor for the PURE pane: pane width -> 1920 surface.
function computePureScale(paneWidth, surfaceWidth) {
  const w = Number(paneWidth);
  const s = Number(surfaceWidth) || HD_W;
  if (!isFinite(w) || w <= 0 || s <= 0) return 1;
  return w / s;
}

// Normalized 0-1000 action space -> guest pixels on the 1920x1080 surface.
function normToGuest(nx, ny, W, H) {
  const w = Number(W) || HD_W;
  const h = Number(H) || HD_H;
  return {
    x: Math.round((clamp1000(nx) / 1000) * w),
    y: Math.round((clamp1000(ny) / 1000) * h)
  };
}

// Heatmap cell for a normalized point (48x27 grid over the 16:9 frame).
function heatCell(nx, ny) {
  const col = Math.max(0, Math.min(HEAT_COLS - 1, Math.floor((clamp1000(nx) / 1000) * HEAT_COLS)));
  const row = Math.max(0, Math.min(HEAT_ROWS - 1, Math.floor((clamp1000(ny) / 1000) * HEAT_ROWS)));
  return { col, row, index: row * HEAT_COLS + col };
}

function heatZoneName(nx, ny) {
  const cx = clamp1000(nx), cy = clamp1000(ny);
  const zx = Math.floor(cx / 100) * 100, zy = Math.floor(cy / 100) * 100;
  return `(${zx}-${zx + 99}, ${zy}-${zy + 99})`;
}

// Keep the overlay cheap: cap boxes, drop off-screen/degenerate entries,
// biggest first so the 24 that matter survive. Pure — also runs in the worker.
function cullObjects(objects, max) {
  const n = Math.max(1, Math.min(MAX_BOXES, Number(max) || MAX_BOXES));
  if (!Array.isArray(objects)) return [];
  const kept = [];
  for (const o of objects) {
    if (!o || typeof o !== 'object') continue;
    const x = Number(o.x), y = Number(o.y);
    if (!isFinite(x) || !isFinite(y) || x < 0 || x > 1000 || y < 0 || y > 1000) continue;
    const w = Math.max(0, Number(o.w) || 0), h = Math.max(0, Number(o.h) || 0);
    kept.push({ x, y, w, h, label: String(o.label || o.kind || '').slice(0, 26), kind: String(o.kind || 'other') });
    if (kept.length >= 200) break; // bound input before sort
  }
  kept.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  return kept.slice(0, n);
}

// Pre-scale heat cells to alpha values once (worker or main), so repaint()
// only fills ~dozens of active rects instead of scanning the whole grid.
function heatActiveCells(heat, cols, rows) {
  const c = Number(cols) || HEAT_COLS, r = Number(rows) || HEAT_ROWS;
  let max = 0;
  for (let i = 0; i < heat.length; i++) if (heat[i] > max) max = heat[i];
  if (!max) return { max: 0, cells: [] };
  const cells = [];
  for (let i = 0; i < heat.length; i++) {
    const v = heat[i];
    if (!v) continue;
    cells.push({ i, col: i % c, row: Math.floor(i / c), a: 0.08 + 0.5 * (v / max) });
  }
  return { max, cells };
}

// Batch active heat cells by quantized alpha (1 decimal): one canvas
// fillStyle per bucket instead of one per cell when repainting the layer.
function bucketHeatCellsByAlpha(cells) {
  const buckets = new Map();
  for (const cell of cells || []) {
    if (!cell || typeof cell !== 'object') continue;
    const key = Math.round(Number(cell.a) * 10) / 10;
    if (!isFinite(key)) continue;
    let arr = buckets.get(key);
    if (!arr) { arr = []; buckets.set(key, arr); }
    arr.push(cell);
  }
  return buckets;
}

// Exponential fade for stale hotspots. Mutates the grid in place, returns
// { decayed, cleared, active }. Invalid factors are a no-op (never explode
// or invert the heat). Pure — unit-tested in plain node.
function decayHeatValues(heatArr, factor, epsilon) {
  const f = Number(factor), eps = Number(epsilon);
  if (!Array.isArray(heatArr) || !isFinite(f) || f <= 0 || f >= 1 || !isFinite(eps) || eps < 0) {
    return { decayed: false, cleared: 0, active: 0 };
  }
  let cleared = 0, active = 0;
  for (let i = 0; i < heatArr.length; i++) {
    const v = Number(heatArr[i]) || 0;
    if (v <= 0) continue;
    const nv = v * f;
    if (nv < eps) { heatArr[i] = 0; cleared++; }
    else { heatArr[i] = nv; active++; }
  }
  return { decayed: true, cleared, active };
}

// Web Worker source: CPU-heavy overlay prep on another thread — drain JSON
// parse/filter, box culling, heat-cell scaling. Main thread keeps only
// decode (GPU) + rect compositing.
function buildOverlayWorkerScript() {
  return `
'use strict';
const MAX_BOXES = ${MAX_BOXES};
function clamp1000(n) { n = Math.round(Number(n)); if (!isFinite(n)) return 500; return Math.max(0, Math.min(1000, n)); }
function parseDrained(raw) {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => {
      if (!e || typeof e !== 'object') return false;
      if (e.k === 'move' || e.k === 'click') return isFinite(Number(e.x)) && isFinite(Number(e.y));
      if (e.k === 'key') return typeof e.key === 'string' && e.key.length > 0;
      return false;
    });
  } catch (_) { return []; }
}
function cull(objects, max) {
  const n = Math.max(1, Math.min(MAX_BOXES, Number(max) || MAX_BOXES));
  if (!Array.isArray(objects)) return [];
  const kept = [];
  for (const o of objects) {
    if (!o || typeof o !== 'object') continue;
    const x = Number(o.x), y = Number(o.y);
    if (!isFinite(x) || !isFinite(y) || x < 0 || x > 1000 || y < 0 || y > 1000) continue;
    kept.push({ x, y, w: Math.max(0, Number(o.w) || 0), h: Math.max(0, Number(o.h) || 0),
      label: String(o.label || o.kind || '').slice(0, 26), kind: String(o.kind || 'other') });
    if (kept.length >= 200) break;
  }
  kept.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  return kept.slice(0, n);
}
function heatCells(heat, cols, rows) {
  let max = 0;
  for (let i = 0; i < heat.length; i++) if (heat[i] > max) max = heat[i];
  if (!max) return { max: 0, cells: [] };
  const cells = [];
  for (let i = 0; i < heat.length; i++) {
    const v = heat[i];
    if (!v) continue;
    cells.push({ i, col: i % cols, row: Math.floor(i / cols), a: 0.08 + 0.5 * (v / max) });
  }
  return { max, cells };
}
self.onmessage = (ev) => {
  const m = ev.data || {};
  try {
    if (m.kind === 'drain') self.postMessage({ id: m.id, ok: true, events: parseDrained(m.raw) });
    else if (m.kind === 'boxes') self.postMessage({ id: m.id, ok: true, boxes: cull(m.objects, m.max) });
    else if (m.kind === 'heat') self.postMessage({ id: m.id, ok: true, view: heatCells(m.heat, m.cols, m.rows) });
    else self.postMessage({ id: m.id, ok: false, error: 'unknown-kind' });
  } catch (e) { self.postMessage({ id: m.id, ok: false, error: String((e && e.message) || e) }); }
};`;
}

// Guest-side recorder: streams normalized human input into
// window.__takeover.events. Re-installable after guest navigations.
function buildRecorderScript() {
  return `(() => {
    if (window.__takeover && window.__takeover.active) return 'already-watching';
    const T = window.__takeover = { active: true, events: [], lastMove: 0 };
    const W = () => window.innerWidth || 1, H = () => window.innerHeight || 1;
    const nx = (px) => Math.max(0, Math.min(1000, Math.round(px / W() * 1000)));
    const ny = (py) => Math.max(0, Math.min(1000, Math.round(py / H() * 1000)));
    const labelOf = (t) => { try {
      if (!t || t === document) return '';
      return String(t.innerText || t.value || t.id || t.getAttribute('aria-label') || t.tagName || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
    } catch (e) { return ''; } };
    const push = (e) => { T.events.push(e); if (T.events.length > 2000) T.events.splice(0, T.events.length - 2000); };
    T.onMove = (e) => { if (!T.active) return T.stop();
      const now = Date.now(); if (now - T.lastMove < 80) return; T.lastMove = now;
      push({ t: now, k: 'move', x: nx(e.clientX), y: ny(e.clientY) }); };
    T.onDown = (e) => { if (!T.active) return T.stop();
      push({ t: Date.now(), k: 'click', x: nx(e.clientX), y: ny(e.clientY), btn: e.button || 0, label: labelOf(e.target) }); };
    T.onKey = (e) => { if (!T.active) return T.stop();
      push({ t: Date.now(), k: 'key', key: String(e.key || '?').slice(0, 24), code: String(e.code || '').slice(0, 24), down: e.type === 'keydown' }); };
    T.stop = () => { T.active = false;
      try { window.removeEventListener('mousemove', T.onMove); window.removeEventListener('mousedown', T.onDown);
        window.removeEventListener('keydown', T.onKey); window.removeEventListener('keyup', T.onKey); } catch (e) {}
      return 'takeover-stopped'; };
    window.addEventListener('mousemove', T.onMove);
    window.addEventListener('mousedown', T.onDown);
    window.addEventListener('keydown', T.onKey);
    window.addEventListener('keyup', T.onKey);
    return 'takeover-recorder-installed';
  })()`;
}

function buildDrainScript() {
  return `(() => { try {
    const T = window.__takeover; if (!T || !T.events || !T.events.length) return '[]';
    const ev = T.events.splice(0, T.events.length);
    return JSON.stringify(ev.slice(-400));
  } catch (e) { return '[]'; } })()`;
}

function buildStopRecorderScript() {
  return `(() => { try {
    const T = window.__takeover;
    if (T && typeof T.stop === 'function') return T.stop();
    if (T) T.active = false;
    return 'takeover-stopped';
  } catch (e) { return 'takeover-stop-failed'; } })()`;
}

// Normalize one drained batch: drops malformed entries, keeps move/click/key.
function parseDrainedEvents(raw) {
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => {
      if (!e || typeof e !== 'object') return false;
      if (e.k === 'move' || e.k === 'click') return isFinite(Number(e.x)) && isFinite(Number(e.y));
      if (e.k === 'key') return typeof e.key === 'string' && e.key.length > 0;
      return false;
    });
  } catch (_) {
    return [];
  }
}

function fmtDuration(totalS) {
  const m = Math.floor(totalS / 60), s = totalS % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

// Plain-English notes from a finished takeover session.
function summarizeTakeover(s) {
  const endedAt = s.endedAt || Date.now();
  const durS = Math.max(1, Math.round((endedAt - (s.startedAt || endedAt)) / 1000));
  const keys = Object.entries(s.keys || {}).sort((a, b) => b[1] - a[1]);
  const zones = Object.entries(s.zones || {}).sort((a, b) => b[1] - a[1]);
  const keyCount = keys.reduce((n, kv) => n + kv[1], 0);
  const lines = [
    `📝 Takeover notes — you played ${fmtDuration(durS)}, the AI watched everything:`,
    `   · mouse: ${s.moves || 0} sampled moves, ~${Math.round(s.distance || 0)} units travelled, ${s.clicks || 0} clicks`,
    `   · keys: ${keys.length ? keys.slice(0, 8).map(([k, c]) => `${k}×${c}`).join(', ') : 'none pressed'}`,
    `   · hottest zone: ${zones.length ? `${zones[0][0]} (${zones[0][1]} clicks)` : 'n/a'}`,
    `   · screenshots: ${s.shots || 0} captured during your run`
  ];
  return { durationS: durS, moves: s.moves || 0, clicks: s.clicks || 0, keyCount, topKeys: keys.slice(0, 8), topZones: zones.slice(0, 5), lines };
}

// ---------------------------------------------------------------------------
// Live stage (DOM + Electron, constructed by the dashboard).
// ---------------------------------------------------------------------------

function initStageView(deps) {
  const d = deps || {};
  const visionState = d.visionState || null;
  const buildDetectScript = typeof d.buildDetectScript === 'function' ? d.buildDetectScript : null;
  const parseDetectResponse = typeof d.parseDetectResponse === 'function' ? d.parseDetectResponse : null;
  const log = typeof d.log === 'function' ? d.log : (() => {});
  const toast = typeof d.toast === 'function' ? d.toast : (() => {});

  const state = {
    running: false,
    mirrorTimer: null,
    busy: false,
    paused: false,
    showBoxes: true,
    showTrail: true,
    showHeat: true,
    showKeys: true,
    tick: 0,
    objects: [],
    boxesView: [],
    source: '—',
    img: null,      // <img> fallback frame
    bitmap: null,   // GPU-decoded ImageBitmap frame (preferred)
    frames: [],
    lastFlashTs: 0,
    heatView: { max: 0, cells: [] },
    heatDirty: true,
    decayHeat: true,
    lastDecayTs: 0,
    workerOk: false,
    lastFps: 0
  };
  const heat = new Array(HEAT_COLS * HEAT_ROWS).fill(0);
  const flashes = []; // [{ x, y, ts, label }] 0-1000 space, fading rings
  let takeover = null; // active session or null
  let lastTraceInput = null; // frozen input for trace-test generation (see getLastTraceInput)
  let overlayWorker = null;
  let workerSeq = 0;
  const workerPending = new Map();
  let cachedCtx = null;
  let cachedCanvas = null;
  // Cached heat layer: a tiny HEAT_COLS x HEAT_ROWS offscreen canvas.
  // Repainted ONLY when heat data changes (clicks/clear); each frame blits
  // it scaled up in a single GPU drawImage instead of N fillRects +
  // N fillStyle string allocs. Smoothing on the upscale gives soft heat
  // blobs for free.
  let heatLayer = null;
  let heatLayerCtx = null;

  function $(id) {
    try { return document.getElementById(id); } catch (_) { return null; }
  }
  function webview() {
    try { return typeof d.getWebview === 'function' ? d.getWebview() : null; } catch (_) { return null; }
  }
  async function execGuest(code) {
    if (typeof d.executeJS === 'function') return d.executeJS(code);
    const wv = webview();
    if (wv && typeof wv.executeJavaScript === 'function') return wv.executeJavaScript(code);
    throw new Error('no guest bridge');
  }

  // -- Overlay worker (CPU thread) -------------------------------------------
  // Draining, box culling and heat scaling move off the main thread. Falls
  // back to inline pure helpers when Workers/blob URLs are unavailable
  // (CSP, file://, node tests) so the mirror never breaks.
  function ensureWorker() {
    if (overlayWorker || typeof Worker === 'undefined') return overlayWorker;
    try {
      const src = buildOverlayWorkerScript();
      const blob = new Blob([src], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const w = new Worker(url);
      w.onmessage = (ev) => {
        const m = ev.data || {};
        const pend = workerPending.get(m.id);
        if (!pend) return;
        workerPending.delete(m.id);
        if (m.ok) pend.resolve(m);
        else pend.reject(new Error(m.error || 'worker-failed'));
      };
      w.onerror = () => { state.workerOk = false; };
      overlayWorker = w;
      state.workerOk = true;
    } catch (_) {
      overlayWorker = null;
      state.workerOk = false;
    }
    return overlayWorker;
  }

  function workerCall(kind, payload, timeoutMs) {
    const w = ensureWorker();
    if (!w) return Promise.reject(new Error('no-worker'));
    const id = ++workerSeq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        workerPending.delete(id);
        reject(new Error('worker-timeout'));
      }, timeoutMs || 800);
      workerPending.set(id, {
        resolve: (m) => { clearTimeout(timer); resolve(m); },
        reject: (e) => { clearTimeout(timer); reject(e); }
      });
      try { w.postMessage({ id, kind, ...payload }); }
      catch (e) { workerPending.delete(id); clearTimeout(timer); reject(e); }
    });
  }

  async function cullBoxesAsync(objects) {
    try {
      const m = await workerCall('boxes', { objects, max: MAX_BOXES }, 800);
      if (m && Array.isArray(m.boxes)) return m.boxes;
    } catch (_) {}
    return cullObjects(objects, MAX_BOXES);
  }

  async function refreshHeatViewAsync() {
    if (!state.heatDirty) return;
    state.heatDirty = false;
    try {
      const m = await workerCall('heat', { heat, cols: HEAT_COLS, rows: HEAT_ROWS }, 800);
      if (m && m.view) { state.heatView = m.view; repaintHeatLayer(); return; }
    } catch (_) {}
    state.heatView = heatActiveCells(heat, HEAT_COLS, HEAT_ROWS);
    repaintHeatLayer();
  }

  async function parseDrainAsync(raw) {
    try {
      const m = await workerCall('drain', { raw }, 800);
      if (m && Array.isArray(m.events)) return m.events;
    } catch (_) {}
    return parseDrainedEvents(raw);
  }

  // -- Cached heat layer -------------------------------------------------------
  function ensureHeatLayer() {
    try {
      if (typeof document === 'undefined') return null;
      if (!heatLayer) {
        heatLayer = document.createElement('canvas');
        heatLayer.width = HEAT_COLS;
        heatLayer.height = HEAT_ROWS;
        try { heatLayerCtx = heatLayer.getContext('2d'); } catch (_) { heatLayerCtx = null; }
      } else if (heatLayer.width !== HEAT_COLS || heatLayer.height !== HEAT_ROWS) {
        heatLayer.width = HEAT_COLS;
        heatLayer.height = HEAT_ROWS;
        try { heatLayerCtx = heatLayer.getContext('2d'); } catch (_) { heatLayerCtx = null; }
      }
    } catch (_) { heatLayer = null; heatLayerCtx = null; }
    return heatLayerCtx ? heatLayer : null;
  }

  // Repaint the tiny layer (1px per active cell, batched by alpha bucket).
  // Runs only on heat change — never per frame.
  function repaintHeatLayer() {
    const layer = ensureHeatLayer();
    if (!layer || !heatLayerCtx) return;
    try {
      const g = heatLayerCtx;
      g.clearRect(0, 0, HEAT_COLS, HEAT_ROWS);
      const cells = state.heatView.cells;
      if (!cells || !cells.length) return;
      const buckets = bucketHeatCellsByAlpha(cells);
      for (const [alpha, arr] of buckets) {
        g.fillStyle = `rgba(255,64,64,${Number(alpha).toFixed(2)})`;
        for (let i = 0; i < arr.length; i++) g.fillRect(arr[i].col, arr[i].row, 1, 1);
      }
    } catch (_) {}
  }

  // GPU-fast frame decode: JPEG bytes -> ImageBitmap (GPU image decode,
  // zero main-thread image parse). Falls back to <img> where unavailable.
  function b64ToBytes(b64) {
    try {
      if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64');
      const bin = atob(b64);
      const len = bin.length;
      const out = new Uint8Array(len);
      for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch (_) { return null; }
  }

  async function decodeFrame(b64) {
    const bytes = b64ToBytes(b64);
    if (bytes && typeof createImageBitmap !== 'undefined') {
      try {
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const bmp = await createImageBitmap(blob);
        return { bitmap: bmp, img: null };
      } catch (_) { /* fall through to <img> */ }
    }
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => resolve({ bitmap: null, img });
        img.onerror = () => resolve({ bitmap: null, img: null });
        img.src = 'data:image/jpeg;base64,' + b64;
      } catch (_) { resolve({ bitmap: null, img: null }); }
    });
  }

  function getCtx(canvas) {
    if (cachedCanvas === canvas && cachedCtx) return cachedCtx;
    try {
      cachedCanvas = canvas;
      cachedCtx = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
    } catch (_) {
      try { cachedCtx = canvas.getContext('2d'); } catch (__) { cachedCtx = null; }
    }
    if (cachedCtx) {
      try { cachedCtx.imageSmoothingEnabled = true; } catch (_) {}
      try { cachedCtx.imageSmoothingQuality = 'low'; } catch (_) {}
    }
    return cachedCtx;
  }

  // -- PURE pane scaler ------------------------------------------------------
  function fitPure() {
    try {
      const wrap = $('pure-scale-wrap'), wv = $('game-webview');
      if (!wrap || !wv) return 1;
      const w = wrap.clientWidth || 0;
      if (!w) return 1;
      const s = computePureScale(w);
      wv.style.transform = `scale(${s})`;
      const res = $('pure-res');
      if (res) res.textContent = `1920×1080 · ${(s * 100).toFixed(0)}% scale · interactive`;
      return s;
    } catch (_) { return 1; }
  }

  // -- AI pane mirror ----------------------------------------------------------
  function separateActive() {
    const ph = $('gamewindow-active-placeholder');
    return !!(ph && !ph.classList.contains('hidden'));
  }
  function editorVisible() {
    const ed = $('editor-workspace');
    return !!(ed && !ed.classList.contains('hidden'));
  }
  function guestLoaded() {
    const wv = webview();
    if (!wv || (wv.classList && wv.classList.contains('hidden'))) return false;
    try {
      const src = wv.src || (typeof wv.getURL === 'function' ? wv.getURL() : '');
      return !!src && !/about:blank/.test(src);
    } catch (_) { return false; }
  }

  function setStats(text) {
    const s = $('ai-view-stats');
    if (s) s.textContent = text;
  }

  function snapshot() {
    try { return visionState ? visionState.getSnapshot() : { pointer: null, keys: [], trail: [], path: [] }; }
    catch (_) { return { pointer: null, keys: [], trail: [], path: [] }; }
  }

  function recordHeat(nx, ny) {
    try {
      const c = heatCell(nx, ny);
      heat[c.index] = (heat[c.index] || 0) + 1;
      state.heatDirty = true;
    } catch (_) {}
  }

  function heatTotal() {
    let n = 0;
    for (let i = 0; i < heat.length; i++) n += heat[i];
    return Math.round(n); // decay leaves fractional values — keep stats integral
  }

  function render() {
    const canvas = $('ai-view-canvas');
    if (!canvas) return;
    const ctx = getCtx(canvas);
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const frame = state.bitmap || state.img;
    if (!frame) return;
    // Same-ratio frame: the 480x270 capture of the 1920x1080 surface.
    // drawImage upscales to the CSS box; source is already 16:9 so no stretch.
    try { ctx.drawImage(frame, 0, 0, canvas.width, canvas.height); }
    catch (_) { return; }
    const X = (nx) => (nx / 1000) * canvas.width;
    const Y = (ny) => (ny / 1000) * canvas.height;

    // Persistent click heatmap (AI + human clicks accumulate here).
    // Single GPU blit of the cached 32x18 layer — O(1) per frame. The layer
    // itself repaints only when heat data changes (see repaintHeatLayer).
    if (state.showHeat && state.heatView.max > 0) {
      const layer = ensureHeatLayer();
      if (layer) {
        try { ctx.drawImage(layer, 0, 0, canvas.width, canvas.height); }
        catch (_) {}
      }
    }

    // Object recognition boxes (pre-culled to MAX_BOXES, biggest first).
    if (state.showBoxes) {
      const boxes = state.boxesView.length ? state.boxesView : state.objects;
      const n = Math.min(boxes.length, MAX_BOXES);
      for (let bi = 0; bi < n; bi++) {
        const o = boxes[bi];
        if (!o) continue;
        const color = KIND_COLORS[o.kind] || KIND_COLORS.other;
        const x = X(o.x || 0), y = Y(o.y || 0);
        const w = Math.max(3, ((o.w || 30) / 1000) * canvas.width);
        const h = Math.max(3, ((o.h || 30) / 1000) * canvas.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - w / 2, y - h / 2, w, h);
        const label = String(o.label || o.kind || '').slice(0, 26);
        if (label) {
          ctx.font = '10px monospace';
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = color;
          ctx.fillRect(x - w / 2, y - h / 2 - 13, tw + 8, 13);
          ctx.fillStyle = '#05060f';
          ctx.fillText(label, x - w / 2 + 4, y - h / 2 - 3);
        }
      }
    }

    // Mouse trail (bot + human share one path) and cursor marker.
    // Capped to the last MAX_TRAIL_DRAW points: O(20) segments, not O(40).
    const snap = snapshot();
    if (state.showTrail && snap.path && snap.path.length > 1) {
      const path = snap.path.length > MAX_TRAIL_DRAW ? snap.path.slice(-MAX_TRAIL_DRAW) : snap.path;
      ctx.lineWidth = 2;
      for (let i = 1; i < path.length; i++) {
        const a = 0.08 + 0.6 * (i / path.length);
        ctx.strokeStyle = `rgba(34,211,238,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(X(path[i - 1][0]), Y(path[i - 1][1]));
        ctx.lineTo(X(path[i][0]), Y(path[i][1]));
        ctx.stroke();
      }
    }
    const cur = snap.pointer && snap.pointer.visible ? snap.pointer : null;
    if (state.showTrail && cur) {
      const cx = X(cur.x), cy = Y(cur.y);
      const human = /human/i.test(cur.label || '');
      ctx.font = '17px serif';
      ctx.fillText(human ? '🙋' : '🤖', cx - 8, cy + 6);
      ctx.strokeStyle = human ? '#f87171' : '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      const cl = String(cur.label || '').slice(0, 24);
      if (cl) {
        ctx.font = '10px monospace';
        const tw = ctx.measureText(cl).width;
        ctx.fillStyle = 'rgba(5,6,15,0.85)';
        ctx.fillRect(cx + 12, cy - 18, tw + 8, 14);
        ctx.fillStyle = human ? '#f87171' : '#22d3ee';
        ctx.fillText(cl, cx + 16, cy - 7);
      }
    }

    // Click flashes: expanding rings that fade over ~2.5s.
    const now = Date.now();
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const age = (now - f.ts) / 2500;
      if (age >= 1) { flashes.splice(i, 1); continue; }
      const fx = X(f.x), fy = Y(f.y);
      ctx.strokeStyle = `rgba(251,146,60,${(1 - age).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy, 6 + age * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function renderHud() {
    const snap = snapshot();
    if (state.showKeys) {
      const keysEl = $('ai-view-keys');
      if (keysEl) {
        const now = Date.now();
        keysEl.innerHTML = '';
        snap.keys.slice(0, 6).forEach((k) => {
          const chip = document.createElement('span');
          chip.className = 'vision-key-chip';
          chip.textContent = '⌨ ' + k.key;
          chip.title = `${k.kind} · ${new Date(k.ts).toLocaleTimeString()}`;
          chip.style.opacity = String(Math.max(0.35, 1 - (now - k.ts) / 6000));
          keysEl.appendChild(chip);
        });
      }
    }
    const actionEl = $('ai-view-action');
    if (actionEl) {
      if (takeover) actionEl.textContent = '👀 watching you play…';
      else actionEl.textContent = snap.trail.length ? `▸ ${snap.trail[0].summary}` : 'agent idle';
    }
  }

  // Notice clicks (bot or human — both flow through vision_state) so the AI
  // pane flashes them and grows the heatmap. Called once per mirror tick.
  function noticeClicks() {
    try {
      const p = snapshot().pointer;
      if (!p || !p.visible || !p.ts || p.ts === state.lastFlashTs) return;
      if (!/click/i.test(p.label || '')) return;
      state.lastFlashTs = p.ts;
      flashes.push({ x: p.x, y: p.y, ts: Date.now(), label: p.label });
      recordHeat(p.x, p.y);
    } catch (_) {}
  }

  async function tick() {
    if (state.busy || state.paused) return;
    if (separateActive() || !editorVisible()) {
      setStats(separateActive() ? 'game runs in the separate window' : 'load a game to wake the AI view');
      return;
    }
    if (!guestLoaded()) {
      setStats('waiting for game…');
      return;
    }
    state.busy = true;
    state.tick++;
    const tickNo = state.tick;
    try {
      // Capture + detection run CONCURRENTLY (not sequentially): the 480px
      // JPEG fetch and the guest DOM scan overlap instead of adding up.
      const wantDetect = (tickNo % DETECT_EVERY_TICKS === 0) && buildDetectScript && parseDetectResponse;
      const frameP = (async () => {
        try {
          if (typeof d.captureAI !== 'function') return null;
          return await d.captureAI();
        } catch (e) { log(`AI view frame failed: ${e.message}`); return null; }
      })();
      const detectP = wantDetect ? (async () => {
        try {
          const raw = await execGuest(buildDetectScript(MAX_BOXES));
          return parseDetectResponse(raw);
        } catch (e) { log(`AI view detect failed: ${e.message}`); return null; }
      })() : Promise.resolve(null);

      const [b64, det] = await Promise.all([frameP, detectP]);

      if (b64) {
        try {
          const { bitmap, img } = await decodeFrame(b64);
          if (bitmap) {
            try { if (state.bitmap && typeof state.bitmap.close === 'function') state.bitmap.close(); } catch (_) {}
            state.bitmap = bitmap;
            state.img = null;
          } else if (img) {
            state.img = img;
          }
          const now = Date.now();
          state.frames.push(now);
          while (state.frames.length && now - state.frames[0] > 2000) state.frames.shift();
        } catch (_) { /* skip bad frame */ }
      }
      if (det) {
        state.objects = det.objects || [];
        state.source = det.source || 'error';
        state.boxesView = await cullBoxesAsync(state.objects);
      }

      noticeClicks();
      // Stale-hotspot fade: halve the grid every HEAT_DECAY_MS. A uniform
      // fade preserves every cell's v/max ratio, so the layer only needs a
      // repaint when cells actually hit zero and drop out.
      const nowMs = Date.now();
      if (state.decayHeat && nowMs - state.lastDecayTs >= HEAT_DECAY_MS && heatTotal() > 0) {
        state.lastDecayTs = nowMs;
        const faded = decayHeatValues(heat, HEAT_DECAY_FACTOR, HEAT_DECAY_EPSILON);
        if (faded.decayed && faded.cleared > 0) state.heatDirty = true;
      }
      if (state.heatDirty) await refreshHeatViewAsync();
      render();
      // HUD DOM writes are the slowest part after capture: throttle to every
      // 2nd tick (~700ms) so the frame loop stays fluid.
      if (tickNo % 2 === 0) renderHud();
      const fps = Math.round(state.frames.length / 2);
      state.lastFps = fps;
      const cur = snapshot().pointer;
      const at = cur && cur.visible ? ` · 👁 ${cur.x},${cur.y}` : '';
      const wTag = state.workerOk ? ' · ⚡worker' : '';
      setStats(`${state.boxesView.length || state.objects.length} objects (${state.source}) · ${fps}fps · 🔥${heatTotal()}${at}${wTag}`);
    } finally {
      state.busy = false;
    }
  }

  // -- Human takeover ----------------------------------------------------------
  function setTakeoverUI(live, statusText) {
    const btn = $('btn-takeover'), st = $('takeover-status');
    if (btn) {
      btn.classList.toggle('live', !!live);
      btn.innerHTML = live ? '⏹ End takeover — AI takes notes' : '🙋 Take over — I play, AI watches';
    }
    if (st) {
      st.classList.toggle('live', !!live);
      if (typeof statusText === 'string') st.textContent = statusText;
    }
  }

  function fmtClock(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // Keep one compact sample per drained event (capped ring) so a finished
  // session can be replayed by a generated trace test. Keyup echoes skipped.
  function pushTraceSample(e) {
    if (!takeover || !e || typeof e !== 'object') return;
    let s = null;
    if (e.k === 'move' || e.k === 'click') s = { k: e.k, x: clamp1000(e.x), y: clamp1000(e.y) };
    else if (e.k === 'key' && e.down !== false && (e.down === true || e.down === undefined)) {
      s = { k: 'key', key: String(e.key || '?').slice(0, 24) };
    }
    if (!s) return;
    takeover.samples.push(s);
    if (takeover.samples.length > TRACE_SAMPLE_CAP) {
      takeover.samples.splice(0, takeover.samples.length - TRACE_SAMPLE_CAP);
    }
  }

  async function drainTakeover(final) {
    if (!takeover) return;
    let events = [];
    try {
      const raw = await execGuest(buildDrainScript());
      events = await parseDrainAsync(raw);
    } catch (_) { events = []; }
    for (const e of events) {
      pushTraceSample(e);
      if (e.k === 'move') {
        const x = clamp1000(e.x), y = clamp1000(e.y);
        takeover.moves++;
        if (takeover.lastX !== null) {
          takeover.distance += Math.hypot(x - takeover.lastX, y - takeover.lastY);
        }
        takeover.lastX = x; takeover.lastY = y;
        try { if (visionState) visionState.recordPointer(x, y, 'human 👀', true); } catch (_) {}
      } else if (e.k === 'click') {
        const x = clamp1000(e.x), y = clamp1000(e.y);
        takeover.clicks++;
        takeover.lastX = x; takeover.lastY = y;
        const zone = heatZoneName(x, y);
        takeover.zones[zone] = (takeover.zones[zone] || 0) + 1;
        recordHeat(x, y);
        flashes.push({ x, y, ts: Date.now(), label: 'human click' });
        try {
          if (visionState) {
            visionState.recordPointer(x, y, `human click${e.label ? ` ${e.label}` : ''}`, true);
            visionState.recordAction(`human click @ ${x},${y}${e.label ? ` on '${e.label}'` : ''}`);
          }
        } catch (_) {}
      } else if (e.k === 'key' && e.down !== false) {
        // keydown only (keyup echoes the same press).
        if (e.down === true || e.down === undefined) {
          const k = String(e.key || '?');
          takeover.keys[k] = (takeover.keys[k] || 0) + 1;
          try { if (visionState) visionState.recordKeys(k, 'human'); } catch (_) {}
        }
      }
    }
    if (!final) updateTakeoverStatus();
  }

  function updateTakeoverStatus() {
    if (!takeover) return;
    setTakeoverUI(true,
      `🔴 WATCHING YOU · ${fmtClock(Date.now() - takeover.startedAt)} · ` +
      `${takeover.clicks} clicks · ${Object.keys(takeover.keys).length} keys · ${takeover.shots} shots`);
  }

  async function takeoverShot() {
    if (!takeover) return;
    try {
      const b64 = typeof d.captureAI === 'function' ? await d.captureAI() : null;
      if (b64) {
        takeover.shotsArr.push(b64);
        if (takeover.shotsArr.length > MAX_TAKEOVER_SHOTS) takeover.shotsArr.shift();
        takeover.shots++;
        updateTakeoverStatus();
      }
    } catch (_) {}
  }

  async function startTakeover() {
    if (takeover) return true;
    if (separateActive()) {
      toast('Close the separate game window first — takeover plays in the PURE pane.');
      return false;
    }
    if (!guestLoaded()) {
      toast('Load a game first, then take over.');
      return false;
    }
    try {
      if (typeof d.isAgentRunning === 'function' && d.isAgentRunning()) {
        if (typeof d.pauseAgent === 'function') d.pauseAgent();
        log('AI Agent paused — you have the wheel. It watches and takes notes.');
      }
      if (typeof d.setBotControl === 'function') {
        try { d.setBotControl(false); } catch (_) {}
      }
      const res = await execGuest(buildRecorderScript());
      log(`🙋 Takeover LIVE (${res}) — play in the PURE pane; the AI records mouse, clicks, keys + screenshots.`);
    } catch (e) {
      toast(`Takeover failed: ${e.message}`);
      return false;
    }
    takeover = {
      startedAt: Date.now(), moves: 0, clicks: 0, keys: {}, zones: {},
      distance: 0, lastX: null, lastY: null, shots: 0, shotsArr: [],
      samples: [], drainTimer: null, shotTimer: null
    };
    setTakeoverUI(true, '🔴 WATCHING YOU · 0:00 · 0 clicks · 0 keys · 0 shots');
    takeover.drainTimer = setInterval(() => { drainTakeover(false).catch(() => {}); }, TAKEOVER_DRAIN_MS);
    takeover.shotTimer = setInterval(() => { takeoverShot().catch(() => {}); }, TAKEOVER_SHOT_MS);
    takeoverShot().catch(() => {});
    return true;
  }

  async function endTakeover() {
    if (!takeover) return null;
    const session = takeover;
    takeover = null;
    try { if (session.drainTimer) clearInterval(session.drainTimer); } catch (_) {}
    try { if (session.shotTimer) clearInterval(session.shotTimer); } catch (_) {}
    await drainTakeover(true).catch(() => {});
    try { await execGuest(buildStopRecorderScript()); } catch (_) {}
    session.endedAt = Date.now();
    try {
      lastTraceInput = {
        session: {
          startedAt: session.startedAt, endedAt: session.endedAt,
          moves: session.moves, clicks: session.clicks,
          keys: { ...(session.keys || {}) }, zones: { ...(session.zones || {}) },
          distance: session.distance, shots: session.shots,
          samples: (session.samples || []).slice()
        },
        heatGrid: heat.slice()
      };
    } catch (_) { lastTraceInput = null; }
    const summary = summarizeTakeover(session);
    summary.lines.forEach((line) => log(line));
    try {
      if (typeof window !== 'undefined') window.__lastTakeoverSummary = summary;
    } catch (_) {}
    setTakeoverUI(false,
      `Takeover done — ${summary.clicks} clicks, ${summary.keyCount} key presses, ${summary.durationS}s noted. Take over again anytime.`);
    return summary;
  }

  async function toggleTakeover() {
    if (takeover) return endTakeover();
    return startTakeover();
  }

  function handleGuestLoad() {
    fitPure();
    if (takeover) {
      execGuest(buildRecorderScript())
        .then(() => log('Takeover recorder re-attached after game navigation.'))
        .catch(() => {});
    }
  }

  function clearHeat() {
    heat.fill(0);
    state.heatView = { max: 0, cells: [] };
    state.heatDirty = false;
    state.lastDecayTs = Date.now();
    repaintHeatLayer();
    setStats('heatmap cleared');
  }

  function setHeatDecay(on) {
    state.decayHeat = !!on;
    const b = $('ai-toggle-decay');
    if (b) b.classList.toggle('active', state.decayHeat);
    if (state.decayHeat) state.lastDecayTs = Date.now();
    return state.decayHeat;
  }

  function bindToggle(id, key) {
    const b = $(id);
    if (!b) return;
    b.addEventListener('click', () => {
      if (key === 'paused') state.paused = !state.paused;
      else state[key] = !state[key];
      const on = key === 'paused' ? !state.paused : state[key];
      b.classList.toggle('active', on);
      if (key === 'paused') b.textContent = state.paused ? '▶️' : '⏸️';
    });
  }

  function start() {
    if (state.running) return { fitPure };
    state.running = true;
    bindToggle('ai-toggle-boxes', 'showBoxes');
    bindToggle('ai-toggle-trail', 'showTrail');
    bindToggle('ai-toggle-heat', 'showHeat');
    bindToggle('ai-toggle-decay', 'decayHeat');
    bindToggle('ai-toggle-keys', 'showKeys');
    bindToggle('ai-toggle-mirror', 'paused');
    const tk = $('btn-takeover');
    if (tk) tk.addEventListener('click', () => { toggleTakeover().catch((e) => toast(`Takeover: ${e.message}`)); });
    const ch = $('btn-takeover-clear-heat');
    if (ch) ch.addEventListener('click', () => { clearHeat(); toast('AI click-heatmap cleared.'); });
    fitPure();
    ensureWorker();
    state.lastDecayTs = Date.now();
    try {
      if (typeof ResizeObserver !== 'undefined') {
        const wrap = $('pure-scale-wrap');
        if (wrap) new ResizeObserver(() => fitPure()).observe(wrap);
      }
    } catch (_) {}
    try {
      if (typeof window !== 'undefined') window.addEventListener('resize', () => fitPure());
    } catch (_) {}
    state.mirrorTimer = setInterval(() => { tick().catch(() => {}); }, MIRROR_TICK_MS);
    log(`Playtest stage ready: PURE live game + AI vision (480p mirror, ${MIRROR_TICK_MS}ms). 🙋 Take over anytime.`);
  }

  return {
    start, tick, fitPure, render, clearHeat, heatTotal, setHeatDecay,
    toggleTakeover, startTakeover, endTakeover,
    isTakeover: () => !!takeover,
    getSession: () => (takeover ? { ...takeover, shotsArr: takeover.shotsArr.length } : null),
    getLastTraceInput: () => lastTraceInput,
    handleGuestLoad, state
  };
}

module.exports = {
  HD_W, HD_H, AI_W, AI_H, HEAT_COLS, HEAT_ROWS,
  MIRROR_TICK_MS, DETECT_EVERY_TICKS, MAX_BOXES, MAX_TRAIL_DRAW,
  HEAT_DECAY_MS, HEAT_DECAY_FACTOR, HEAT_DECAY_EPSILON,
  TAKEOVER_DRAIN_MS, TAKEOVER_SHOT_MS, MAX_TAKEOVER_SHOTS, TRACE_SAMPLE_CAP,
  computePureScale, normToGuest, heatCell, heatZoneName,
  cullObjects, heatActiveCells, bucketHeatCellsByAlpha, decayHeatValues, buildOverlayWorkerScript,
  buildRecorderScript, buildDrainScript, buildStopRecorderScript,
  parseDrainedEvents, fmtDuration, summarizeTakeover,
  initStageView
};
