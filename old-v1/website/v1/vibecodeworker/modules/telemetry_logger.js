/* ==========================================================================
   4WEIRD VIBECODEWORKER // TERMINAL, LOGGING, PERFORMANCE CHARTS & AUTH
   ========================================================================== */

import { state, el, synth } from './core_state.js';

export function streamLogToPhone(message, type = 'info') {
  if (!el.phoneStreamLogFeed) return;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  const div = document.createElement('div');
  let color = 'var(--text-secondary)';
  if (type === 'error') color = 'var(--system-error)';
  else if (type === 'warning') color = 'var(--system-warning)';
  else if (type === 'success') color = 'var(--neon-green)';
  else if (type === 'info') color = 'var(--neon-cyan)';

  div.style.color = color;
  div.textContent = `[${time}] ${message}`;
  el.phoneStreamLogFeed.appendChild(div);
  el.phoneStreamLogFeed.scrollTop = el.phoneStreamLogFeed.scrollHeight;
}

export function log(message, type = 'system') {
  const time = new Date().toLocaleTimeString([], { hour12: false });
  const div = document.createElement('div');
  div.className = `term-line ${type}`;
  // Security: never interpret log content as HTML. Game console output and
  // bug text are attacker-influenced, and this dashboard runs with Node
  // integration, so an innerHTML sink here would be a direct RCE primitive.
  const timeSpan = document.createElement('span');
  timeSpan.style.opacity = '0.4';
  timeSpan.textContent = `[${time}]`;
  const typeSpan = document.createElement('span');
  typeSpan.textContent = ` [${type.toUpperCase()}] `;
  const msgSpan = document.createElement('span');
  msgSpan.textContent = String(message);
  div.append(timeSpan, typeSpan, msgSpan);

  if (el.terminalLog) {
    el.terminalLog.appendChild(div);
    el.terminalLog.scrollTop = el.terminalLog.scrollHeight;
  }

  state.logs.push({ time, type, message });
  if (type !== 'system') synth.playLog();

  if ((type === 'info' || type === 'system') && el.brainThoughtStream) {
    const p = document.createElement('p');
    p.className = `thought-line ${type}`;
    p.textContent = `[${time}] ${message}`;
    el.brainThoughtStream.appendChild(p);
    el.brainThoughtStream.scrollTop = el.brainThoughtStream.scrollHeight;
  }

  streamLogToPhone(message, type);
}

export function drawSparkline(canvas, data, isRed = false) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const margin = 2;
  const w = canvas.width;
  const h = canvas.height;
  const count = data.length;
  const step = (w - margin * 2) / (count - 1);

  ctx.strokeStyle = isRed ? '#ff3355' : '#00f2fe';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  const minVal = Math.min(...data) - 5;
  const maxVal = Math.max(...data) + 5;
  const valRange = (maxVal - minVal) || 1;

  data.forEach((val, i) => {
    const x = margin + i * step;
    const y = h - margin - ((val - minVal) / valRange) * (h - margin * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export function updatePerformanceMetrics() {
  let currentFps = 58 + Math.floor(Math.random() * 5);
  if (state.isRunning && !state.isPaused) {
    if (Math.random() < 0.08) currentFps -= 24;
  }

  let currentHeap = 38.2 + (state.currentStep * 0.35) + (Math.random() * 1.5);
  if (state.currentStep > 40 && Math.random() < 0.08) {
    log("Antigravity Garbage Collector invoked. Recycled heaps.", "info");
    currentHeap = 38.8;
  }

  if (el.valFps) el.valFps.textContent = currentFps;
  if (el.valHeap) el.valHeap.textContent = currentHeap.toFixed(1) + ' MB';

  if (el.phoneStreamFps) el.phoneStreamFps.textContent = `FPS: ${currentFps}`;
  if (el.phoneStreamHeap) el.phoneStreamHeap.textContent = `HEAP: ${currentHeap.toFixed(1)} MB`;
  if (el.phoneStreamStep) el.phoneStreamStep.textContent = `STEP: ${state.currentStep}/${state.maxSteps}`;

  state.fpsHistory.shift();
  state.fpsHistory.push(currentFps);
  state.heapHistory.shift();
  state.heapHistory.push(currentHeap);

  drawSparkline(el.chartFps, state.fpsHistory, currentFps < 40);
  drawSparkline(el.chartHeap, state.heapHistory, false);

  if (state.isRunning && !state.isPaused) {
    state.elapsedSeconds++;
    state.tokenCount += Math.floor(Math.random() * 45) + 10;
    if (el.brainTokenCount) el.brainTokenCount.textContent = `${state.tokenCount.toLocaleString()} / 1,000,000`;

    const min = state.elapsedSeconds / 60 || 1;
    state.apm = Math.round(state.actionCount / min);

    const mm = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(state.elapsedSeconds % 60).padStart(2, '0');
    if (el.statElapsed) el.statElapsed.textContent = `${mm}:${ss}`;
    if (el.statApm) el.statApm.textContent = state.apm;
  }
}

export function initAuthCheck() {
  let requiredPassword = null;
  if (typeof process !== 'undefined' && process.env && (process.env.VIBECODEWORKER_AUTH_PASSWORD || process.env.VibeCodeWorker_AUTH_PASSWORD)) {
    requiredPassword = process.env.VIBECODEWORKER_AUTH_PASSWORD || process.env.VibeCodeWorker_AUTH_PASSWORD;
  } else if (window.VIBECODEWORKER_AUTH_PASSWORD || window.VibeCodeWorker_AUTH_PASSWORD) {
    requiredPassword = window.VIBECODEWORKER_AUTH_PASSWORD || window.VibeCodeWorker_AUTH_PASSWORD;
  } else if (localStorage.getItem('VIBECODEWORKER_AUTH_PASSWORD') || localStorage.getItem('VibeCodeWorker_AUTH_PASSWORD')) {
    // Security: passwords are only honored from an explicit operator action
    // (env var, injected constant, or the lock dialog). They are never read
    // from URL query params (which leak into history, logs, and Referer
    // headers) and there is no hardcoded default password.
    requiredPassword = localStorage.getItem('VIBECODEWORKER_AUTH_PASSWORD') || localStorage.getItem('VibeCodeWorker_AUTH_PASSWORD');
  }

  if (requiredPassword) {
    state.authPassword = requiredPassword;
    const isAuth = sessionStorage.getItem('vibecodeworker_authenticated') === 'true' || sessionStorage.getItem('VibeCodeWorker_authenticated') === 'true';
    if (!isAuth) {
      if (el.authOverlay) el.authOverlay.classList.remove('hidden');
      if (el.btnAuthLock) {
        el.btnAuthLock.textContent = '🔒 AUTH: LOCKED';
        el.btnAuthLock.classList.add('term-yellow');
      }
    } else {
      if (el.authOverlay) el.authOverlay.classList.add('hidden');
      if (el.btnAuthLock) {
        el.btnAuthLock.textContent = '🔓 AUTH: UNLOCKED';
        el.btnAuthLock.classList.remove('term-yellow');
      }
    }
  } else {
    if (el.authOverlay) el.authOverlay.classList.add('hidden');
    if (el.btnAuthLock) el.btnAuthLock.textContent = '🔓 AUTH: OPEN';
  }
}

export function handleAuthSubmit(e) {
  if (e) e.preventDefault();
  const inputVal = el.authPasswordInput ? el.authPasswordInput.value.trim() : '';
  // Security: no fallback default password. Auth only engages when the
  // operator has configured one; otherwise there is nothing to guess.
  const targetPassword = state.authPassword || localStorage.getItem('VIBECODEWORKER_AUTH_PASSWORD') || localStorage.getItem('VibeCodeWorker_AUTH_PASSWORD') || '';

  if (inputVal === targetPassword || !targetPassword) {
    sessionStorage.setItem('vibecodeworker_authenticated', 'true');
    sessionStorage.setItem('VibeCodeWorker_authenticated', 'true');
    if (el.authOverlay) el.authOverlay.classList.add('hidden');
    if (el.authErrorMsg) el.authErrorMsg.style.display = 'none';
    if (el.btnAuthLock) {
      el.btnAuthLock.textContent = '🔓 AUTH: UNLOCKED';
      el.btnAuthLock.classList.remove('term-yellow');
    }
    synth.playSuccess();
    log('[SECURITY] Password authentication successful. VibeCodeWorker Sandbox unlocked.', 'success');
  } else {
    if (el.authErrorMsg) {
      el.authErrorMsg.style.display = 'block';
      el.authErrorMsg.textContent = '⚠️ Invalid password key. Access denied.';
    }
    synth.playFail();
    log('[SECURITY] Authentication failed: Incorrect password attempt.', 'error');
  }
}

export function setupAuthEventListeners() {
  if (el.authForm) el.authForm.addEventListener('submit', handleAuthSubmit);
  if (el.btnAuthLock) {
    el.btnAuthLock.addEventListener('click', () => {
      const isAuth = sessionStorage.getItem('vibecodeworker_authenticated') === 'true' || sessionStorage.getItem('VibeCodeWorker_authenticated') === 'true';
      if (isAuth && state.authPassword) {
        if (confirm('Lock VibeCodeWorker session with environment password?')) {
          sessionStorage.removeItem('vibecodeworker_authenticated');
          sessionStorage.removeItem('VibeCodeWorker_authenticated');
          initAuthCheck();
        }
      } else if (!state.authPassword) {
        const p = prompt('Set a session password for VibeCodeWorker (stored only in this browser profile):', '');
        if (p) {
          localStorage.setItem('VIBECODEWORKER_AUTH_PASSWORD', p);
          sessionStorage.removeItem('vibecodeworker_authenticated');
          sessionStorage.removeItem('VibeCodeWorker_authenticated');
          initAuthCheck();
        }
      } else {
        initAuthCheck();
      }
    });
  }
}
