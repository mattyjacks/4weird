/**
 * Dual-pane playtest stage: PURE live game + AI vision + human takeover.
 *
 * The game renders ONCE at true 1920x1080 inside the PURE pane (a fixed-size
 * <webview> backing store, CSS-scaled to fit — ratio locked, headless and
 * headful alike, still fully interactive). The AI pane mirrors the same
 * frame on a 960x540 canvas plus the AI overlay: object detections, bot AND
 * human mouse trail + cursor, click flashes, a persistent click heatmap, key
 * chips and the last-action readout.
 *
 * Human takeover mode: the operator plays in the PURE pane while the AI only
 * watches — a tiny guest recorder streams normalized mouse/keys into a drain
 * loop that feeds vision_state (so the AI pane draws the human live),
 * accumulates a notes session (moves, clicks, keys, zones, screenshots) and
 * logs a plain-English summary when the operator hands the wheel back.
 *
 * Node-safe: Electron/DOM access only happens inside initStageView(). The
 * pure helpers (scaling, coords, heat cells, recorder/drain scripts,
 * takeover summary) are unit-testable in plain node.
 */

const HD_W = 1920;
const HD_H = 1080;
const AI_W = 960;
const AI_H = 540;
const HEAT_COLS = 48;
const HEAT_ROWS = 27;
const MIRROR_TICK_MS = 1200;
const TAKEOVER_DRAIN_MS = 500;
const TAKEOVER_SHOT_MS = 3000;
const MAX_TAKEOVER_SHOTS = 12;

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
    source: '—',
    img: null,
    frames: [],
    lastFlashTs: 0
  };
  const heat = new Array(HEAT_COLS * HEAT_ROWS).fill(0);
  const flashes = []; // [{ x, y, ts, label }] 0-1000 space, fading rings
  let takeover = null; // active session or null

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
    } catch (_) {}
  }

  function heatTotal() {
    let n = 0;
    for (let i = 0; i < heat.length; i++) n += heat[i];
    return n;
  }

  function render() {
    const canvas = $('ai-view-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!state.img) return;
    // Same-ratio frame: the 960x540 capture of the 1920x1080 surface.
    ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);
    const X = (nx) => (nx / 1000) * canvas.width;
    const Y = (ny) => (ny / 1000) * canvas.height;

    // Persistent click heatmap (AI + human clicks accumulate here).
    if (state.showHeat) {
      let max = 0;
      for (let i = 0; i < heat.length; i++) if (heat[i] > max) max = heat[i];
      if (max > 0) {
        const cw = canvas.width / HEAT_COLS, ch = canvas.height / HEAT_ROWS;
        for (let r = 0; r < HEAT_ROWS; r++) {
          for (let c = 0; c < HEAT_COLS; c++) {
            const v = heat[r * HEAT_COLS + c];
            if (!v) continue;
            const a = 0.08 + 0.5 * (v / max);
            ctx.fillStyle = `rgba(255,64,64,${a.toFixed(2)})`;
            ctx.fillRect(c * cw, r * ch, cw, ch);
          }
        }
      }
    }

    // Object recognition boxes.
    if (state.showBoxes) {
      state.objects.forEach((o) => {
        if (!o) return;
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
      });
    }

    // Mouse trail (bot + human share one path) and cursor marker.
    const snap = snapshot();
    if (state.showTrail && snap.path && snap.path.length > 1) {
      ctx.lineWidth = 2;
      for (let i = 1; i < snap.path.length; i++) {
        const a = 0.08 + 0.6 * (i / snap.path.length);
        ctx.strokeStyle = `rgba(34,211,238,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(X(snap.path[i - 1][0]), Y(snap.path[i - 1][1]));
        ctx.lineTo(X(snap.path[i][0]), Y(snap.path[i][1]));
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
    try {
      try {
        const b64 = typeof d.captureAI === 'function' ? await d.captureAI() : null;
        if (b64) {
          const img = new Image();
          img.onload = () => {
            state.img = img;
            const now = Date.now();
            state.frames.push(now);
            while (state.frames.length && now - state.frames[0] > 2000) state.frames.shift();
            render();
          };
          img.onerror = () => { /* skip bad frame */ };
          img.src = 'data:image/jpeg;base64,' + b64;
        }
      } catch (e) { log(`AI view frame failed: ${e.message}`); }

      if (state.tick % 2 === 0 && buildDetectScript && parseDetectResponse) {
        try {
          const raw = await execGuest(buildDetectScript(30));
          const det = parseDetectResponse(raw);
          state.objects = det.objects || [];
          state.source = det.source || 'error';
        } catch (e) { log(`AI view detect failed: ${e.message}`); }
      }

      noticeClicks();
      render();
      renderHud();
      const fps = Math.round(state.frames.length / 2);
      const cur = snapshot().pointer;
      const at = cur && cur.visible ? ` · 👁 ${cur.x},${cur.y}` : '';
      setStats(`${state.objects.length} objects (${state.source}) · ${fps}fps · 🔥${heatTotal()}${at}`);
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

  async function drainTakeover(final) {
    if (!takeover) return;
    let events = [];
    try {
      const raw = await execGuest(buildDrainScript());
      events = parseDrainedEvents(raw);
    } catch (_) { events = []; }
    for (const e of events) {
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
      drainTimer: null, shotTimer: null
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
    setStats('heatmap cleared');
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
    bindToggle('ai-toggle-keys', 'showKeys');
    bindToggle('ai-toggle-mirror', 'paused');
    const tk = $('btn-takeover');
    if (tk) tk.addEventListener('click', () => { toggleTakeover().catch((e) => toast(`Takeover: ${e.message}`)); });
    const ch = $('btn-takeover-clear-heat');
    if (ch) ch.addEventListener('click', () => { clearHeat(); toast('AI click-heatmap cleared.'); });
    fitPure();
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
    log('Playtest stage ready: PURE live game + AI vision. 🙋 Take over anytime.');
  }

  return {
    start, tick, fitPure, render, clearHeat, heatTotal,
    toggleTakeover, startTakeover, endTakeover,
    isTakeover: () => !!takeover,
    getSession: () => (takeover ? { ...takeover, shotsArr: takeover.shotsArr.length } : null),
    handleGuestLoad, state
  };
}

module.exports = {
  HD_W, HD_H, AI_W, AI_H, HEAT_COLS, HEAT_ROWS,
  MIRROR_TICK_MS, TAKEOVER_DRAIN_MS, TAKEOVER_SHOT_MS, MAX_TAKEOVER_SHOTS,
  computePureScale, normToGuest, heatCell, heatZoneName,
  buildRecorderScript, buildDrainScript, buildStopRecorderScript,
  parseDrainedEvents, fmtDuration, summarizeTakeover,
  initStageView
};
