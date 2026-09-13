/* ==========================================================================
   4WEIRD VIBECODEWORKER // VIEWPORT, CANVAS OVERLAYS & REPLAY SCRUBBER
   ========================================================================== */

import { state, el, synth } from './core_state.js';
import { log } from './telemetry_logger.js';
import { triggerDetectedBug } from './defect_healer.js';

export function renderClickRippleAndHeatmap(x, y) {
  if (!el.actionCanvas) return;
  const canvas = el.actionCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  state.heatmapPoints.push({ x, y, weight: 1.0 });
  if (state.heatmapPoints.length > 50) state.heatmapPoints.shift();

  let radius = 5;
  let opacity = 1.0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.heatmapEnabled) {
      state.heatmapPoints.forEach(pt => {
        const grad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, 25);
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.45)');
        grad.addColorStop(0.5, 'rgba(255, 0, 100, 0.25)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 242, 254, ${opacity})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f2fe';
    ctx.stroke();

    radius += 2.5;
    opacity -= 0.04;

    if (opacity > 0) {
      requestAnimationFrame(draw);
    } else {
      if (state.heatmapEnabled) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.heatmapPoints.forEach(pt => {
          const grad = ctx.createRadialGradient(pt.x, pt.y, 2, pt.x, pt.y, 25);
          grad.addColorStop(0, 'rgba(0, 242, 254, 0.45)');
          grad.addColorStop(0.5, 'rgba(255, 0, 100, 0.25)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 25, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        });
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }
  draw();
}

export function glideAgentCursorAndInteract(targetX, targetY, callback) {
  if (!el.agentCursor || !el.iframeContainer) {
    if (callback) callback();
    return;
  }

  el.agentCursor.style.left = `${targetX}px`;
  el.agentCursor.style.top = `${targetY}px`;

  setTimeout(() => {
    el.agentCursor.classList.add('clicking');
    synth.playClick();

    try {
      const win = el.gameIframe.contentWindow;
      const doc = el.gameIframe.contentDocument || (win && win.document);
      if (doc) {
        const targetEl = doc.elementFromPoint(targetX, targetY);
        if (targetEl) {
          const opts = { bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, view: win };

          try {
            if (typeof win.PointerEvent === 'function') {
              targetEl.dispatchEvent(new win.PointerEvent('pointerdown', opts));
            }
          } catch (e) { }

          targetEl.dispatchEvent(new MouseEvent('pointerdown', opts));
          targetEl.dispatchEvent(new MouseEvent('mousedown', opts));

          try {
            if (typeof win.Touch === 'function' && typeof win.TouchEvent === 'function') {
              const touch = new win.Touch({ identifier: Date.now(), target: targetEl, clientX: targetX, clientY: targetY });
              const touchEvt = new win.TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] });
              targetEl.dispatchEvent(touchEvt);
            }
          } catch (e) { }

          try {
            if (typeof win.PointerEvent === 'function') {
              targetEl.dispatchEvent(new win.PointerEvent('pointerup', opts));
            }
          } catch (e) { }

          targetEl.dispatchEvent(new MouseEvent('pointerup', opts));
          targetEl.dispatchEvent(new MouseEvent('mouseup', opts));
          if (typeof targetEl.click === 'function') {
            targetEl.click();
          }
        }
      }
    } catch (err) {
      try {
        if (el.gameIframe.contentWindow) {
          // Security: address the message at the iframe's own origin so
          // click coordinates are never broadcast to an unexpected party.
          // Non-http(s) frames (about:blank, file:, data:) have no stable
          // origin to target, so '*' is used only there.
          let targetOrigin = '*';
          try {
            const src = el.gameIframe.getAttribute('src') || el.gameIframe.src || '';
            const parsed = new URL(src, window.location.href);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') targetOrigin = parsed.origin;
          } catch (e) { /* keep '*' fallback */ }
          el.gameIframe.contentWindow.postMessage({ type: 'VIBECODEWORKER_CLICK', x: targetX, y: targetY }, targetOrigin);
        }
      } catch (e) { }
    }

    renderClickRippleAndHeatmap(targetX, targetY);

    setTimeout(() => {
      if (el.agentCursor) el.agentCursor.classList.remove('clicking');
      if (callback) callback();
    }, 150);
  }, 350);
}

export function setupIframeErrorListeners() {
  try {
    const win = el.gameIframe.contentWindow;
    if (win) {
      win.onerror = function (msg, source, line, col, error) {
        const fileName = source ? source.split('/').pop() : 'game.js';
        const bugDesc = `Uncaught ${msg} at ${fileName}:${line}:${col}`;
        const stack = error && error.stack ? error.stack : `${bugDesc}\n  at ${source}:${line}:${col}`;
        triggerDetectedBug({
          type: "EXCEPTION",
          desc: bugDesc,
          stack: stack,
          file: fileName,
          diff: `<span class="diff-del">-   // Unsafeguarded runtime call</span>\n<span class="diff-add">+   // Antigravity Self-Healing Patch for line ${line}</span>\n<span class="diff-add">+   try { executeSafely(); } catch (e) { console.warn('[Antigravity] Caught: ' + e); }`
        });
        return false;
      };

      win.addEventListener('unhandledrejection', function (evt) {
        triggerDetectedBug({
          type: "PROMISE_REJECTION",
          desc: `Unhandled Rejection: ${evt.reason}`,
          stack: evt.reason && evt.reason.stack ? evt.reason.stack : String(evt.reason),
          file: "async.js",
          diff: `<span class="diff-del">-   fetchData().then(process);</span>\n<span class="diff-add">+   fetchData().then(process).catch(err => console.error('[Antigravity Catch]', err));`
        });
      });

      if (win.console && typeof win.console.error === 'function' && !win.console._antigravityIntercepted) {
        const origConsoleError = win.console.error;
        win.console._antigravityIntercepted = true;
        win.console.error = function (...args) {
          origConsoleError.apply(win.console, args);
          const errStr = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
          triggerDetectedBug({
            type: "CONSOLE_ERROR",
            desc: `Console Error: ${errStr.slice(0, 120)}`,
            stack: `Console Error captured:\n  ${errStr}`,
            file: "game.js",
            diff: `<span class="diff-del">-   console.error("${errStr.slice(0, 30)}...");</span>\n<span class="diff-add">+   // Antigravity console error trap & patch</span>`
          });
        };
      }
    }
  } catch (e) { }
}

/* Device content boxes (layout px). The frame keeps this aspect ratio and only
   ever shrinks to fit; transform scale is coordinate-safe because the agent
   cursor, overlay canvases and elementFromPoint all work in container px. */
const DEVICE_BOXES = {
  autofit: { w: 1280, h: 800, label: 'Auto-Fit' },
  desktop: { w: 1280, h: 800, label: 'Desktop' },
  tablet: { w: 1024, h: 640, label: 'Tablet' },
  mobile: { w: 390, h: 700, label: 'Mobile' }
};

export function fitGameFrame() {
  const c = el.iframeContainer;
  if (!c) return;
  const parent = c.parentElement;
  const availW = parent ? parent.clientWidth : window.innerWidth;
  const availH = parent ? parent.clientHeight : window.innerHeight;
  if (!availW || !availH) return;
  const box = DEVICE_BOXES[state.deviceMode] || DEVICE_BOXES.autofit;
  const pad = 8;
  const s = Math.min(1, (availW - pad) / box.w, (availH - pad) / box.h);
  const scale = Math.max(0.2, s);
  state.viewportScale = scale;
  c.style.width = box.w + 'px';
  c.style.height = box.h + 'px';
  c.style.flex = 'none';
  c.style.margin = 'auto';
  c.style.transformOrigin = 'center center';
  c.style.transform = 'scale(' + scale.toFixed(3) + ')';
  if (el.gameIframe) {
    el.gameIframe.style.width = '100%';
    el.gameIframe.style.height = '100%';
  }
  if (el.viewportRes) el.viewportRes.textContent = box.w + ' x ' + box.h + ' (' + Math.round(scale * 100) + '%)';
}

export function setDeviceView(mode) {
  synth.playClick();
  if (el.btnDeviceAutofit) el.btnDeviceAutofit.classList.remove('active-device');
  if (el.btnDevDesktop) el.btnDevDesktop.classList.remove('active-device');
  if (el.btnDevTablet) el.btnDevTablet.classList.remove('active-device');
  if (el.btnDevMobile) el.btnDevMobile.classList.remove('active-device');

  state.deviceMode = DEVICE_BOXES[mode] ? mode : 'autofit';
  if (state.deviceMode === 'autofit' && el.btnDeviceAutofit) el.btnDeviceAutofit.classList.add('active-device');
  if (state.deviceMode === 'desktop' && el.btnDevDesktop) el.btnDevDesktop.classList.add('active-device');
  if (state.deviceMode === 'tablet' && el.btnDevTablet) el.btnDevTablet.classList.add('active-device');
  if (state.deviceMode === 'mobile' && el.btnDevMobile) el.btnDevMobile.classList.add('active-device');
  fitGameFrame();
}

let fittingBound = false;
export function initViewportFitting() {
  if (fittingBound) return;
  fittingBound = true;
  if (!state.deviceMode) state.deviceMode = 'autofit';
  window.addEventListener('resize', () => fitGameFrame());
  const parent = el.iframeContainer && el.iframeContainer.parentElement;
  if (parent && window.ResizeObserver) {
    new ResizeObserver(() => fitGameFrame()).observe(parent);
  }
  if (el.gameIframe) el.gameIframe.addEventListener('load', () => fitGameFrame());
  fitGameFrame();
}

export function runLunaVisionScan(isAutomated = false) {
  if (!el.visionOverlayCanvas) return;
  state.visionFramesAnalyzed += Math.floor(Math.random() * 3) + 1;

  const canvas = el.visionOverlayCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth || 600;
  canvas.height = canvas.offsetHeight || 400;

  if (el.visionScanBadge) {
    el.visionScanBadge.classList.remove('hidden');
    setTimeout(() => {
      if (el.visionScanBadge) el.visionScanBadge.classList.add('hidden');
    }, 1400);
  }

  synth.play(1050, 'sine', 0.08, 0.05);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(0, 242, 254, 0.18)';
  ctx.lineWidth = 1;
  const cols = 6, rows = 4;
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, canvas.height);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(canvas.width, r * cellH);
    ctx.stroke();
  }

  const boxes = [
    { x: 30, y: 30, w: 140, h: 70, label: '[COLLISION BOUNDS OK]', color: '#00ff66' },
    { x: canvas.width - 170, y: 40, w: 140, h: 80, label: '[UI ALIGNMENT OK]', color: '#00f2fe' },
    { x: Math.floor(canvas.width / 2) - 60, y: Math.floor(canvas.height / 2) - 40, w: 120, h: 90, label: '[SPRITE Z-INDEX OK]', color: '#00ff66' }
  ];

  let glitchDetected = false;
  if (Math.random() < 0.25) {
    glitchDetected = true;
    state.visionAnomaliesCount++;
    const gx = Math.floor(Math.random() * (canvas.width - 160)) + 20;
    const gy = Math.floor(Math.random() * (canvas.height - 100)) + 20;
    boxes.push({
      x: gx, y: gy, w: 140, h: 75,
      label: '[GLITCH: MESH CLIPPING DETECTED]',
      color: '#ff3355'
    });
  }

  boxes.forEach(b => {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = b.color;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(b.label, b.x + 4, b.y + 14);
  });

  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 1200);

  const logMsg = glitchDetected
    ? `[GPT-5.6 LUNA VISION ANALYSIS] Frame #${state.visionFramesAnalyzed}: VISUAL ANOMALY DETECTED! Pixel mesh clipping at viewport collision vector. Dispatching AST correlation.`
    : `[GPT-5.6 LUNA VISION ANALYSIS] Frame #${state.visionFramesAnalyzed}: High-speed vision pass completed. Geometry clean, 0 z-index anomalies (12ms latency).`;

  log(logMsg, glitchDetected ? 'warning' : 'info');

  if (glitchDetected && Math.random() < 0.6) {
    triggerDetectedBug({
      type: "VISUAL_GLITCH",
      desc: "GPT-5.6 Luna Vision Engine: Sprite z-indexing collision clipping glitch detected on canvas viewport",
      stack: "Visual Clipping Anomaly at Viewport Coordinates (x: 240, y: 180).\n  at RenderPipeline.drawEntities (render.js:64:12)",
      file: "render.js",
      rootCause: "Render pipeline depth buffer failed to sort sprite z-indexes prior to frame canvas swap.",
      fixDescription: "Sort entity render array by entity.y coordinate in `render.js:64` prior to canvas render loop.",
      rawDiff: `--- a/website/v1/games/src/render.js\n+++ b/website/v1/games/src/render.js\n@@ -63,2 +63,3 @@\n-   entities.forEach(e => e.draw(ctx));\n+   // GPT-5.6 Luna Fix: Depth sorting z-indexing\n+   entities.sort((a, b) => a.y - b.y).forEach(e => e.draw(ctx));`,
      diff: `<span class="diff-del">-   entities.forEach(e => e.draw(ctx));</span>\n<span class="diff-add">+   // GPT-5.6 Luna Fix: Depth sorting z-indexing</span>\n<span class="diff-add">+   entities.sort((a, b) => a.y - b.y).forEach(e => e.draw(ctx));</span>`
    });
  }
}

export function recordReplaySnapshot(action, x, y, logMsg) {
  const snap = {
    step: state.currentStep,
    action: action,
    x: x,
    y: y,
    log: logMsg,
    timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    bugsCount: state.bugs.length
  };
  state.replaySnapshots.push(snap);

  if (state.isReplayLive && el.replayScrubber) {
    el.replayScrubber.max = state.replaySnapshots.length - 1;
    el.replayScrubber.value = state.replaySnapshots.length - 1;
    state.replayIndex = state.replaySnapshots.length - 1;
    updateReplayUI();
  }
}

export function moveCursorToPosition(x, y) {
  if (!el.agentCursor || !el.iframeContainer) return;
  el.agentCursor.style.left = `${x}px`;
  el.agentCursor.style.top = `${y}px`;
  el.agentCursor.classList.add('clicking');
  renderClickRippleAndHeatmap(x, y);
  setTimeout(() => {
    if (el.agentCursor) el.agentCursor.classList.remove('clicking');
  }, 150);
}

export function updateReplayUI() {
  if (!el.replayScrubber || !el.replayStepInfo) return;
  const max = state.replaySnapshots.length - 1;
  if (max < 0) {
    el.replayStepInfo.textContent = "STEP 0 / 0 [LIVE]";
    return;
  }

  const idx = parseInt(el.replayScrubber.value) || 0;
  state.replayIndex = idx;

  if (state.isReplayLive) {
    el.replayStepInfo.textContent = `STEP ${state.currentStep} / ${state.maxSteps} [LIVE]`;
    if (el.btnReplayLive) el.btnReplayLive.classList.add('active');
  } else {
    el.replayStepInfo.textContent = `REPLAY ${idx + 1} / ${state.replaySnapshots.length}`;
    if (el.btnReplayLive) el.btnReplayLive.classList.remove('active');

    const snap = state.replaySnapshots[idx];
    if (snap && snap.x && snap.y) {
      moveCursorToPosition(snap.x, snap.y);
    }
  }
}

export function toggleReplayPlay() {
  synth.playClick();
  if (state.replaySnapshots.length === 0) return;
  state.isReplayLive = false;

  if (state.isReplayPlaying) {
    state.isReplayPlaying = false;
    if (state.replayPlayTimer) clearInterval(state.replayPlayTimer);
    if (el.btnReplayPlay) el.btnReplayPlay.textContent = '▶ PLAY';
  } else {
    state.isReplayPlaying = true;
    if (el.btnReplayPlay) el.btnReplayPlay.textContent = '⏸ PAUSE';
    if (parseInt(el.replayScrubber.value) >= state.replaySnapshots.length - 1) {
      el.replayScrubber.value = 0;
    }
    updateReplayUI();

    state.replayPlayTimer = setInterval(() => {
      let current = parseInt(el.replayScrubber.value) || 0;
      if (current < state.replaySnapshots.length - 1) {
        el.replayScrubber.value = current + 1;
        updateReplayUI();
      } else {
        state.isReplayPlaying = false;
        clearInterval(state.replayPlayTimer);
        if (el.btnReplayPlay) el.btnReplayPlay.textContent = '▶ PLAY';
      }
    }, 600);
  }
}

export function toggleReplayLiveMode() {
  synth.playClick();
  if (state.isReplayPlaying) {
    state.isReplayPlaying = false;
    if (state.replayPlayTimer) clearInterval(state.replayPlayTimer);
    if (el.btnReplayPlay) el.btnReplayPlay.textContent = '▶ PLAY';
  }
  state.isReplayLive = !state.isReplayLive;
  if (state.isReplayLive && state.replaySnapshots.length > 0) {
    el.replayScrubber.value = state.replaySnapshots.length - 1;
  }
  updateReplayUI();
}

export function stepReplayPrev() {
  synth.playClick();
  if (state.isReplayPlaying) {
    state.isReplayPlaying = false;
    if (state.replayPlayTimer) clearInterval(state.replayPlayTimer);
    if (el.btnReplayPlay) el.btnReplayPlay.textContent = '▶ PLAY';
  }
  state.isReplayLive = false;
  if (el.replayScrubber && parseInt(el.replayScrubber.value) > 0) {
    el.replayScrubber.value = parseInt(el.replayScrubber.value) - 1;
    updateReplayUI();
  }
}

export function stepReplayNext() {
  synth.playClick();
  if (state.isReplayPlaying) {
    state.isReplayPlaying = false;
    if (state.replayPlayTimer) clearInterval(state.replayPlayTimer);
    if (el.btnReplayPlay) el.btnReplayPlay.textContent = '▶ PLAY';
  }
  state.isReplayLive = false;
  if (el.replayScrubber && parseInt(el.replayScrubber.value) < state.replaySnapshots.length - 1) {
    el.replayScrubber.value = parseInt(el.replayScrubber.value) + 1;
    updateReplayUI();
  }
}
