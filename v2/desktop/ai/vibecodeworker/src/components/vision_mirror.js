/**
 * AI Vision Mirror (dashboard panel).
 *
 * Mirrors the separate test window (game OR website) EXACTLY - every frame
 * is a real capturePage screenshot of that window, aspect-preserved - and
 * paints AI overlays on top:
 *   - object recognition boxes (dungeon enemies in games, buttons/links/
 *     inputs/headings/media on websites) with labels,
 *   - the bot mouse: live position, action label, fading motion trail,
 *   - key press HUD chips + last-action readout.
 *
 * Data sources: screenshots + detection evals via IPC (main process owns
 * the test window), pointer/keys/trail from vision_state (same renderer
 * process - zero extra IPC). Everything is defensive: any failure just
 * skips a frame, never breaks the agent.
 */

const KIND_COLORS = {
  enemy: '#ff4d6d',
  button: '#22d3ee',
  link: '#4ade80',
  input: '#facc15',
  heading: '#c084fc',
  media: '#fb923c',
  other: '#94a3b8'
};

// Keep the visual relay responsive without starving the agent loop.
const MIRROR_TICK_MS = 450;

function initVisionMirror(deps) {
  const ipc = deps.ipcRenderer;
  const visionState = deps.visionState;
  const buildDetectScript = deps.buildDetectScript;
  const parseDetectResponse = deps.parseDetectResponse;
  const captureFrame = typeof deps.captureFrame === 'function' ? deps.captureFrame : null;
  const log = deps.log || (() => {});

  const state = {
    running: false,
    timer: null,
    busy: false,
    paused: false,
    showBoxes: true,
    showTrail: true,
    showKeys: true,
    tick: 0,
    objects: [],
    source: '-',
    pageCursor: null,
    img: null,
    imgW: 0,
    imgH: 0,
    frames: [],
    lastDraw: 0
  };

  function $(id) {
    try { return document.getElementById(id); } catch (_) { return null; }
  }

  function placeholderActive() {
    const ph = $('gamewindow-active-placeholder');
    return !!(ph && !ph.classList.contains('hidden'));
  }

  function setStats(text) {
    const s = $('vision-mirror-stats');
    if (s) s.textContent = text;
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

  // Map 0-1000 normalized viewport coords into the letterboxed draw rect.
  function drawRect() {
    const canvas = $('vision-mirror-canvas');
    if (!canvas || !state.imgW || !state.imgH) return null;
    const cw = canvas.width, ch = canvas.height;
    const scale = Math.min(cw / state.imgW, ch / state.imgH);
    const dw = state.imgW * scale, dh = state.imgH * scale;
    return { dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
  }

  function mapX(nx, r) { return r.dx + (nx / 1000) * r.dw; }
  function mapY(ny, r) { return r.dy + (ny / 1000) * r.dh; }

  function render() {
    const canvas = $('vision-mirror-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const r = drawRect();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!state.img || !r) return;
    ctx.drawImage(state.img, r.dx, r.dy, r.dw, r.dh);

    const snap = visionState.getSnapshot();

    // Object recognition boxes.
    if (state.showBoxes) {
      state.objects.forEach((o) => {
        if (!o) return;
        const color = KIND_COLORS[o.kind] || KIND_COLORS.other;
        const x = mapX(o.x || 0, r), y = mapY(o.y || 0, r);
        const w = Math.max(3, ((o.w || 30) / 1000) * r.dw);
        const h = Math.max(3, ((o.h || 30) / 1000) * r.dh);
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

    // Bot mouse trail (fading polyline of recent pointer positions).
    if (state.showTrail && snap.path && snap.path.length > 1) {
      ctx.lineWidth = 2;
      for (let i = 1; i < snap.path.length; i++) {
        const a = 0.08 + 0.6 * (i / snap.path.length);
        ctx.strokeStyle = 'rgba(34, 211, 238,' + a.toFixed(2) + ')';
        ctx.beginPath();
        ctx.moveTo(mapX(snap.path[i - 1][0], r), mapY(snap.path[i - 1][1], r));
        ctx.lineTo(mapX(snap.path[i][0], r), mapY(snap.path[i][1], r));
        ctx.stroke();
      }
    }

    // Bot cursor marker: exact page overlay position wins, recorder fallback.
    const pc = state.pageCursor && state.pageCursor.visible ? state.pageCursor : null;
    const cur = pc || (snap.pointer && snap.pointer.visible ? snap.pointer : null);
    if (cur) {
      const cx = mapX(cur.x, r), cy = mapY(cur.y, r);
      ctx.font = '17px serif';
      ctx.fillText('🤖', cx - 8, cy + 6);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      const cl = String(cur.label || '').slice(0, 24);
      if (cl) {
        ctx.font = '10px monospace';
        const tw = ctx.measureText(cl).width;
        ctx.fillStyle = 'rgba(5, 6, 15, 0.85)';
        ctx.fillRect(cx + 12, cy - 18, tw + 8, 14);
        ctx.fillStyle = '#22d3ee';
        ctx.fillText(cl, cx + 16, cy - 7);
      }
    }
  }

  function renderHud() {
    const snap = visionState.getSnapshot();
    if (state.showKeys) {
      const keysEl = $('vision-keys');
      if (keysEl) {
        const now = Date.now();
        keysEl.innerHTML = '';
        snap.keys.slice(0, 6).forEach((k) => {
          const chip = document.createElement('span');
          chip.className = 'vision-key-chip';
          chip.textContent = '⌨ ' + k.key;
          chip.title = k.kind + ' · ' + new Date(k.ts).toLocaleTimeString();
          chip.style.opacity = String(Math.max(0.35, 1 - (now - k.ts) / 6000));
          keysEl.appendChild(chip);
        });
      }
    }
    const actionEl = $('vision-action');
    if (actionEl) {
      actionEl.textContent = snap.trail.length ? '▸ ' + snap.trail[0].summary : 'agent idle';
    }
  }

  async function tick() {
    if (state.busy || state.paused) return;
    if (!placeholderActive()) {
      setStats('mirror idle; open the test window');
      return;
    }
    state.busy = true;
    state.tick++;
    try {
      // Frame: exact screenshot of the test window (game or website).
      try {
        const b64 = captureFrame ? await captureFrame() : await ipc.invoke('capture-game-screenshot');
        if (b64) {
          const img = new Image();
          img.onload = () => {
            state.img = img;
            state.imgW = img.naturalWidth || 512;
            state.imgH = img.naturalHeight || 288;
            const now = Date.now();
            state.frames.push(now);
            while (state.frames.length && now - state.frames[0] > 2000) state.frames.shift();
            render();
          };
          img.onerror = () => { /* skip bad frame */ };
          img.src = 'data:image/jpeg;base64,' + b64;
        }
      } catch (e) { log('vision mirror frame failed: ' + e.message); }

      // AI pass (every other tick): object recognition + exact cursor.
      if (state.tick % 2 === 0) {
        try {
          const raw = await ipc.invoke('eval-in-game-window', buildDetectScript(40));
          const det = parseDetectResponse(raw);
          state.objects = det.objects || [];
          state.source = det.source || 'error';
          state.pageCursor = det.cursor || null;
        } catch (e) { log('vision detect failed: ' + e.message); }
      }

      render();
      renderHud();
      // Heartbeat to the main process (every ~5s): proves the mirror loop
      // is alive and lets /api/vision/state report mirror health.
      if (state.tick % 7 === 0) {
        try {
          if (ipc && typeof ipc.send === 'function') {
            ipc.send('vision-mirror-tick', {
              tick: state.tick,
              objects: state.objects.length,
              source: state.source,
              fps: Math.round(state.frames.length / 2),
              ts: Date.now()
            });
          }
        } catch (_) {}
      }
      const fps = Math.round(state.frames.length / 2);
      const cur = state.pageCursor || visionState.getSnapshot().pointer;
      const at = cur && cur.visible ? ' · 👁 ' + cur.x + ',' + cur.y + ' ' + (cur.label || '') : '';
      setStats(state.objects.length + ' objects (' + state.source + ') · ' + fps + 'fps' + at);
    } finally {
      state.busy = false;
    }
  }

  function start() {
    if (state.running) return;
    state.running = true;
    bindToggle('vision-toggle-boxes', 'showBoxes');
    bindToggle('vision-toggle-trail', 'showTrail');
    bindToggle('vision-toggle-keys', 'showKeys');
    bindToggle('vision-toggle-mirror', 'paused');
    state.timer = setInterval(tick, MIRROR_TICK_MS);
    log('AI Vision Mirror started');
  }

  function idle() {
    state.objects = [];
    state.pageCursor = null;
    setStats('mirror idle; open the test window');
    const canvas = $('vision-mirror-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    }
  }

  return { start, idle, tick, state };
}

module.exports = { initVisionMirror, KIND_COLORS, MIRROR_TICK_MS };
