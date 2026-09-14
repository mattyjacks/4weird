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

// ─── Terminal panel (allow-listed local commands) ─────────────────────
// Small addition so the dashboard terminal panel can drive the same
// opencode flows without ever spawning a shell from the renderer.
// Allow-list: status | heal | export | fix. Everything delegates to the
// desktop_terminal_controller (fetch -> 127.0.0.1:42069 /api/opencode/*)
// or falls back to the in-process bridge. Fail-open: when opencode is
// disabled/unavailable we log a friendly line and return
// { success:false } instead of throwing, so the panel never breaks the UI.

const TERMINAL_ALLOW_LIST = ['status', 'heal', 'export', 'fix'];

let terminalBackend = null;
try {
  if (typeof require === 'function') terminalBackend = require('./desktop_terminal_controller');
} catch (e) { terminalBackend = null; }

/** Shell-escape untrusted terminal input for safe echo/display. */
function shellEscapeUserInput(value) {
  if (terminalBackend && typeof terminalBackend.shellEscapeTerminalInput === 'function') {
    return terminalBackend.shellEscapeTerminalInput(value);
  }
  const s = String(value == null ? '' : value).slice(0, 500).replace(/[\r\n\0]/g, ' ').trim();
  if (!s) return "''";
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function isAllowedTerminalCommand(cmd) {
  if (terminalBackend && typeof terminalBackend.isAllowedTerminalCommand === 'function') {
    return terminalBackend.isAllowedTerminalCommand(cmd);
  }
  return TERMINAL_ALLOW_LIST.indexOf(String(cmd || '').toLowerCase()) !== -1;
}

/** Render terminal output onto the existing dashboard log surface. */
function renderTerminalLine(cmd, data, logSystemMessage) {
  if (terminalBackend && typeof terminalBackend.renderTerminalOutput === 'function') {
    terminalBackend.renderTerminalOutput(cmd, data, logSystemMessage);
    return;
  }
  try {
    if (typeof logSystemMessage !== 'function') return;
    if (!data) { logSystemMessage('[' + cmd + '] no response.', 'error'); return; }
    if (data.disabled) { logSystemMessage('[' + cmd + '] OpenCode is disabled; tick Enable to use it. Nothing ran.', 'warning'); return; }
    const summary = data.error ? data.error
      : data.runId ? ('runId=' + data.runId)
      : data.mdPath ? ((data.bugCount || 0) + ' bug(s) -> ' + data.mdPath)
      : JSON.stringify(data).slice(0, 4000);
    logSystemMessage('[' + cmd + '] ' + String(summary).slice(0, 4000), data.success ? 'system' : 'error');
  } catch (e) { /* log surface must never throw */ }
}

/**
 * Run one allow-listed terminal command. Fail-open when opencode is disabled.
 * Delegates to desktop_terminal_controller (fetch to 127.0.0.1:42069) when
 * available; otherwise uses the in-process bridge/Tauri path directly.
 */
async function runLocalCommand(cmd, options) {
  const opts = options || {};
  const logSystemMessage = opts.logSystemMessage;
  const say = (msg, kind) => { try { if (typeof logSystemMessage === 'function') logSystemMessage(msg, kind || 'system'); } catch (e) {} };
  const name = String(cmd || '').toLowerCase().trim();
  if (!isAllowedTerminalCommand(name)) {
    say("[terminal] refused '" + String(cmd || '').slice(0, 80) + "': allowed: " + TERMINAL_ALLOW_LIST.join(', ') + '.', 'error');
    return { success: false, error: 'Command not allow-listed. Use: ' + TERMINAL_ALLOW_LIST.join(', ') };
  }
  // Prefer the dedicated terminal backend (fetch -> local worker, no shells).
  if (terminalBackend && typeof terminalBackend.runLocalCommand === 'function') {
    try {
      return await terminalBackend.runLocalCommand(name, opts);
    } catch (e) {
      say('[terminal] ' + name + ' failed: ' + e.message, 'error');
      return { success: false, error: e.message };
    }
  }
  // Fallback: same-process bridge path (still no shells from here; the
  // bridge module owns spawning and only runs when enabled).
  try {
    const cfg = bridge ? bridge.getOpenCodeConfig() : { enabled: false };
    if (!cfg.enabled) {
      say('[terminal] OpenCode is disabled; tick Enable to use it. Nothing ran.', 'warning');
      return { success: false, disabled: true, error: 'OpenCode disabled' };
    }
    if (opts.args) say('$ ' + name + ' ' + shellEscapeUserInput(opts.args), 'system');
    else say('$ ' + name, 'system');
    let data = null;
    if (name === 'status') data = await refreshStatus({ el: opts.el || {}, logSystemMessage });
    else if (name === 'export') data = bridge.exportBugReport({ bugs: collectBugs(opts.agentBrain), gameId: deriveGameId(opts.gameId) });
    else if (name === 'fix') data = await bridge.fixBugs({ bugs: collectBugs(opts.agentBrain), gameId: deriveGameId(opts.gameId) });
    else if (name === 'heal') data = bridge.startHealCycle({ bugs: collectBugs(opts.agentBrain), gameId: deriveGameId(opts.gameId), testCommand: 'node test_vibecodeworker.js', maxIterations: 3, instance: 'same' });
    renderTerminalLine(name, data, logSystemMessage);
    return data || { success: false, error: 'Empty response' };
  } catch (e) {
    say('[terminal] ' + name + ' failed: ' + (e && e.message ? e.message : e), 'error');
    return { success: false, error: String((e && e.message) || e) };
  }
}

/** Best-effort wiring for an optional terminal panel (input + run button). */
function setupTerminalPanelWiring(ctx) {
  try {
    if (terminalBackend && typeof terminalBackend.setupTerminalPanel === 'function') {
      return terminalBackend.setupTerminalPanel(ctx);
    }
    const el = (ctx && ctx.el) || {};
    if (!el.terminalInput || !el.terminalRun) return false;
    if (el.terminalRun.dataset && el.terminalRun.dataset.terminalWired === '1') return true;
    el.terminalRun.addEventListener('click', () => {
      const raw = String(el.terminalInput.value || '').trim();
      const sp = raw.search(/\s/);
      const c = sp === -1 ? raw.toLowerCase() : raw.slice(0, sp).toLowerCase();
      const rest = sp === -1 ? '' : raw.slice(sp + 1).trim();
      runLocalCommand(c, { args: rest, el, agentBrain: ctx.agentBrain, gameId: ctx.gameId, logSystemMessage: ctx.logSystemMessage });
    });
    if (el.terminalRun.dataset) el.terminalRun.dataset.terminalWired = '1';
    return true;
  } catch (e) { return false; }
}

module.exports = {
  setupOpenCodeEventListeners,
  refreshStatus,
  applyOpenCodeSettings,
  // Terminal panel additions (allow-listed, fail-open, log-surface render):
  TERMINAL_ALLOW_LIST,
  shellEscapeUserInput,
  isAllowedTerminalCommand,
  renderTerminalLine,
  runLocalCommand,
  setupTerminalPanelWiring,
};
