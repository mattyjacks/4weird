/**
 * OpenCode.ai Bridge UI Controller (OPTIONAL integration).
 * Sidebar panel: enable toggle, status, export / fix / self-heal actions.
 * Inside the Windows (Tauri) exe: prefers invoke('opencode_status' /
 * 'opencode_run') when window.__TAURI__ is present; otherwise falls back to
 * lib/opencode_bridge directly (renderer has nodeIntegration), so the desktop
 * app uses the exact same code path as headless/cloud. A missing binary never
 * breaks the dashboard (status line shows install hint + Enable toggle).
 */

const INSTALL_HINT_FALLBACK = 'opencode binary not found. Install: `npm i -g opencode-ai` (or `choco install opencode`), then tick Enable.';

// Safe bridge load: the Tauri webview has no require(); browser/dev may lack the file.
let bridge = null;
try {
  if (typeof require === 'function') bridge = require('../../lib/opencode_bridge');
} catch (e) { bridge = null; }

function isTauriRuntime() {
  try {
    return (typeof window !== 'undefined') && (!!window.__TAURI__ || !!window.__TAURI_INTERNALS__);
  } catch (e) { return false; }
}

async function tauriInvoke(cmd, args) {
  if (!isTauriRuntime()) return null;
  try {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return await window.__TAURI__.core.invoke(cmd, args || {});
    }
    if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
      return await window.__TAURI__.invoke(cmd, args || {});
    }
  } catch (e) { return null; } // command missing / backend offline -> caller falls back to bridge
  return null;
}

function withInstallHint(text) {
  const s = String(text || '');
  return /npm i -g opencode-ai/.test(s) ? s : (s ? s + ' ' : '') + 'Install: `npm i -g opencode-ai`, then tick Enable.';
}

function deriveGameId(gameUrl) {
  const m = String(gameUrl || '').match(/games\/html\/([^/?#]+)/i);
  return m ? m[1] : 'unknown';
}

function setStatus(el, text, kind) {
  if (!el.opencodeStatusText) return;
  el.opencodeStatusText.textContent = text;
  el.opencodeStatusText.dataset.kind = kind || 'idle';
  if (el.opencodeStatusDot) {
    el.opencodeStatusDot.textContent = kind === 'ok' ? '🟢' : kind === 'warn' ? '🟡' : kind === 'err' ? '🔴' : '⚪';
  }
}

function setBusy(el, busy, label) {
  [el.btnOpencodeExport, el.btnOpencodeFix, el.btnOpencodeHeal].forEach(b => { if (b) b.disabled = !!busy; });
  if (busy && el.opencodeStatusText) el.opencodeStatusText.textContent = label || 'Working…';
}

async function refreshStatus({ el, logSystemMessage }) {
  try {
    // (1) Inside the exe: prefer the Rust command when the Tauri runtime exists.
    const tauriStatus = await tauriInvoke('opencode_status', {});
    const s = tauriStatus || (bridge ? await bridge.getStatus() : null);
    if (!s) {
      setStatus(el, withInstallHint('OpenCode bridge unavailable in this view.'), 'warn');
      return { enabled: false, available: false, source: isTauriRuntime() ? 'tauri' : 'bridge' };
    }
    if (!s.enabled) {
      setStatus(el, 'Disabled; tick Enable to use OpenCode.', 'idle');
    } else if (!s.available) {
      setStatus(el, withInstallHint('Enabled but `opencode` not found. ' + (s.hint || '')), 'warn');
    } else {
      const extra = s.mode === 'server'
        ? (s.serverReachable ? `server reachable (${s.serverUrl || ''})` : 'server UNREACHABLE; is `opencode serve` running?')
        : `CLI ready (${s.version || 'opencode'})`;
      setStatus(el, `Ready - ${s.mode} mode. ${extra}`, s.mode === 'server' && !s.serverReachable ? 'warn' : 'ok');
    }
    return s;
  } catch (e) {
    setStatus(el, 'Status check failed: ' + e.message, 'err');
    if (logSystemMessage) logSystemMessage('OpenCode status failed: ' + e.message, 'error');
    return null;
  }
}

function collectBugs(agentBrain) {
  const bugs = (agentBrain && Array.isArray(agentBrain.bugs) ? agentBrain.bugs : []).filter(b => !b || b.status !== 'fixed');
  return bugs;
}

async function handleExport({ el, agentBrain, audio, logSystemMessage }) {
  const bugs = collectBugs(agentBrain);
  if (bugs.length === 0) {
    if (logSystemMessage) logSystemMessage('OpenCode export: no open bugs to export. Run the playtest agent first.', 'error');
    return;
  }
  const gameId = deriveGameId(el.gameUrlInput && el.gameUrlInput.value);
  if (!bridge) {
    if (logSystemMessage) logSystemMessage('OpenCode export unavailable here: ' + INSTALL_HINT_FALLBACK, 'error');
    setStatus(el, withInstallHint('Export unavailable.'), 'warn');
    return;
  }
  const res = bridge.exportBugReport({ bugs, gameId });
  if (res.success) {
    if (audio) audio.playClickSound();
    if (logSystemMessage) logSystemMessage(`OpenCode export: ${res.bugCount} bug(s) → ${res.mdPath}`, 'system');
    setStatus(el, `Exported ${res.bugCount} bug(s). Attach the .md via \`opencode run -f file\` or press Fix.`, 'ok');
  } else if (logSystemMessage) {
    logSystemMessage('OpenCode export failed: ' + res.error, 'error');
  }
}

async function handleFix({ el, agentBrain, audio, logSystemMessage }) {
  const bugs = collectBugs(agentBrain);
  if (bugs.length === 0) {
    if (logSystemMessage) logSystemMessage('OpenCode fix: no open bugs. Run the playtest agent first.', 'error');
    return;
  }
  const gameId = deriveGameId(el.gameUrlInput && el.gameUrlInput.value);
  setBusy(el, true, `Asking OpenCode to fix ${bugs.length} bug(s)… (up to 10 min)`);
  try {
    // Inside the exe: prefer the Rust command; fall back to the same bridge API.
    const tauriRes = await tauriInvoke('opencode_run', { bugs, gameId });
    const res = tauriRes || (bridge ? await bridge.fixBugs({ bugs, gameId }) : null);
    if (!res) {
      setBusy(el, false);
      if (logSystemMessage) logSystemMessage('OpenCode fix unavailable here: ' + INSTALL_HINT_FALLBACK, 'error');
      setStatus(el, withInstallHint('Fix unavailable.'), 'warn');
      return;
    }
    setBusy(el, false);
    if (res.success) {
      if (audio) audio.playClickSound();
      const files = (res.diff && res.diff.files && res.diff.files.length > 0) ? res.diff.files.join(', ') : 'no git diff detected';
      if (logSystemMessage) logSystemMessage(`OpenCode fix done (${res.mode || 'cli'}${res.sessionId ? ' session ' + res.sessionId : ''}). Changed: ${files}`, 'system');
      setStatus(el, `Fix complete. Changed: ${files}. Re-run the playtest to verify.`, 'ok');
    } else {
      if (logSystemMessage) logSystemMessage('OpenCode fix failed: ' + (res.error || 'unknown') + (res.hint ? ' - ' + res.hint : ''), 'error');
      setStatus(el, 'Fix failed: ' + (res.error || 'unknown'), 'err');
    }
  } catch (e) {
    setBusy(el, false);
    if (logSystemMessage) logSystemMessage('OpenCode fix crashed: ' + e.message, 'error');
    setStatus(el, 'Fix crashed: ' + e.message, 'err');
  }
}

function pollHealRun({ el, logSystemMessage }, runId) {
  const timer = setInterval(() => {
    if (!bridge) { clearInterval(timer); return; }
    const run = bridge.getHealRun(runId);
    if (!run) { clearInterval(timer); return; }
    const last = run.history[run.history.length - 1];
    const phase = last
      ? `iter ${last.iteration}: test=${last.testPhase ? (last.testPhase.exitCode === 0 ? 'PASS' : 'FAIL') : '…'} fix=${last.fixPhase ? (last.fixPhase.success ? 'OK' : 'FAIL') : '…'}`
      : 'starting…';
    setStatus(el, `Heal ${runId}: ${run.status} - ${phase}`, run.status === 'healed' ? 'ok' : (run.status === 'running' ? 'warn' : 'err'));
    if (run.status !== 'running') {
      clearInterval(timer);
      if (logSystemMessage) logSystemMessage(`OpenCode heal ${runId} finished: ${run.status} after ${run.iteration} iteration(s).`, run.status === 'healed' ? 'system' : 'error');
    }
  }, 2500);
  return timer;
}

async function handleHeal({ el, agentBrain, audio, logSystemMessage }) {
  const bugs = collectBugs(agentBrain);
  const gameId = deriveGameId(el.gameUrlInput && el.gameUrlInput.value);
  const testCommand = (el.opencodeHealCmd && el.opencodeHealCmd.value.trim()) || 'node test_vibecodeworker.js';
  const targetDir = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : '.';
  setBusy(el, true, 'Self-heal loop started in background…');
  try {
    if (!bridge) {
      setBusy(el, false);
      if (logSystemMessage) logSystemMessage('OpenCode heal unavailable here: ' + INSTALL_HINT_FALLBACK, 'error');
      setStatus(el, withInstallHint('Heal unavailable.'), 'warn');
      return;
    }
    const { runId } = bridge.startHealCycle({
      bugs, gameId, testCommand, dir: targetDir, maxIterations: 3, instance: 'same',
    });
    setBusy(el, false);
    if (audio) audio.playClickSound();
    if (logSystemMessage) logSystemMessage(`OpenCode self-heal started: ${runId} (test → fix → re-test, same instance). Polling…`, 'system');
    setStatus(el, `Heal ${runId} running…`, 'warn');
    pollHealRun({ el, logSystemMessage }, runId);
  } catch (e) {
    setBusy(el, false);
    if (logSystemMessage) logSystemMessage('OpenCode heal failed to start: ' + e.message, 'error');
  }
}

function handleHandoff({ el, agentBrain, audio, logSystemMessage }) {
  try {
    const { getSharedLog } = require('../../lib/smart_log');
    const bugs = (agentBrain && Array.isArray(agentBrain.bugs) ? agentBrain.bugs : []);
    const res = getSharedLog('electron-dashboard').writeHandoff({ reason: 'dashboard 📋 button', bugs });
    if (res.success) {
      if (el.smartHandoffPath) el.smartHandoffPath.textContent = res.path;
      if (logSystemMessage) logSystemMessage(`Smart-log handoff written: ${res.path}; paste it into any vibecoding tool, or let the heal loop auto-feed it.`, 'system');
      if (audio) audio.playClickSound();
      try {
        const { clipboard } = require('electron');
        clipboard.writeText(res.path);
      } catch (e) { /* clipboard best-effort */ }
    } else if (logSystemMessage) {
      logSystemMessage('Handoff failed: ' + res.error, 'error');
    }
  } catch (e) {
    if (logSystemMessage) logSystemMessage('Handoff crashed: ' + e.message, 'error');
  }
}

function setupOpenCodeEventListeners({ el, agentBrain, audio, toastNotifier, logSystemMessage, saveConfigData }) {
  if (el.btnSmartHandoff) el.btnSmartHandoff.addEventListener('click', () => handleHandoff({ el, agentBrain, audio, logSystemMessage }));
  if (el.opencodeEnable) {
    el.opencodeEnable.addEventListener('change', () => {
      persistOpenCodeSettings(el);
      if (saveConfigData) saveConfigData();
      refreshStatus({ el, logSystemMessage });
    });
  }
  if (el.opencodeMode) {
    el.opencodeMode.addEventListener('change', () => {
      persistOpenCodeSettings(el);
      if (saveConfigData) saveConfigData();
      refreshStatus({ el, logSystemMessage });
    });
  }
  if (el.btnOpencodeStatus) el.btnOpencodeStatus.addEventListener('click', () => refreshStatus({ el, logSystemMessage }));
  if (el.btnOpencodeExport) el.btnOpencodeExport.addEventListener('click', () => handleExport({ el, agentBrain, audio, logSystemMessage }));
  if (el.btnOpencodeFix) el.btnOpencodeFix.addEventListener('click', () => handleFix({ el, agentBrain, audio, logSystemMessage }));
  if (el.btnOpencodeHeal) el.btnOpencodeHeal.addEventListener('click', () => handleHeal({ el, agentBrain, audio, logSystemMessage }));
  // Initial status (non-blocking; opencode missing must never break the dashboard).
  setTimeout(() => refreshStatus({ el, logSystemMessage }), 1500);
}

/** Persist the two dashboard controls into config.json's `opencode` block. */
function persistOpenCodeSettings(el) {
  try {
    const fs = require('fs');
    const path = require('path');
    const cfgPath = path.join(__dirname, '..', '..', 'config', 'default.json');
    let raw = {};
    if (fs.existsSync(cfgPath)) raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    raw.opencode = raw.opencode || {};
    if (el.opencodeEnable) raw.opencode.enabled = !!el.opencodeEnable.checked;
    if (el.opencodeMode) raw.opencode.mode = el.opencodeMode.value;
    fs.writeFileSync(cfgPath, JSON.stringify(raw, null, 2), 'utf8');
  } catch (e) { /* never break the dashboard over settings */ }
}

/** Apply persisted opencode settings to the dashboard controls (called by config load). */
function applyOpenCodeSettings(el, settings) {
  try {
    const oc = (settings && settings.opencode) || (bridge ? bridge.getOpenCodeConfig() : { enabled: false, mode: 'cli' });
    if (el.opencodeEnable) el.opencodeEnable.checked = !!oc.enabled;
    if (el.opencodeMode) el.opencodeMode.value = oc.mode === 'server' ? 'server' : 'cli';
  } catch (e) { /* defaults stand */ }
}

module.exports = {
  setupOpenCodeEventListeners,
  refreshStatus,
  applyOpenCodeSettings,
};
