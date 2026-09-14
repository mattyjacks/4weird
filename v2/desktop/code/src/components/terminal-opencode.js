/**
 * Terminal panel controller (opencode).
 * Sidebar/panel component: prompt input, scrolling output view, working-dir
 * picker, and a stop button for one headless `opencode run` session at a time.
 *
 * Execution goes ONLY through the DTOP-01 bridge
 * (`../modules/opencode-cli-bridge`): this file never spawns processes, never
 * builds argv, never reimplements the token budget or redaction. It imports
 * `runSession` / `cancel` / `detectOpencode` and renders their callbacks.
 *
 * Fail-open: a missing bridge, a missing `opencode` binary, or a host without
 * a DOM all degrade to an explanatory status line instead of throwing. Raw
 * child output is shown verbatim in the output view (diffs must not be
 * redacted); only this module's own status/log lines avoid secret values.
 * The component builds its DOM inside the given host, so callers provide
 * nothing but the host element:
 *
 *   const bridge = require('../modules/opencode-cli-bridge'); // same import, read-only
 *   const panel = require('./terminal-opencode').mountTerminalPanel(hostEl);
 *   // ... later: panel.dispose();
 */

// Safe bridge load: the Tauri webview has no require(); browser/dev may lack the file.
let cliBridge = null;
try {
  if (typeof require === 'function') cliBridge = require('../modules/opencode-cli-bridge');
} catch (e) { cliBridge = null; }

const INSTALL_HINT = 'opencode binary not found. Install: `npm i -g opencode-ai` (or `choco install opencode`), then press Run again.';
const MAX_OUTPUT_LINES = 2000;
const SCROLL_STICK_THRESHOLD_PX = 48;

function defaultCwd() {
  try {
    if (typeof process !== 'undefined' && process && typeof process.cwd === 'function') {
      return process.cwd();
    }
  } catch (e) { /* fall through to empty */ }
  return '';
}

function makeEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function pruneOldest(outputView) {
  try {
    while (outputView.childNodes.length > MAX_OUTPUT_LINES) {
      outputView.removeChild(outputView.firstChild);
    }
  } catch (e) { /* pruning is best-effort */ }
}

function isStuckToBottom(outputView) {
  try {
    return (outputView.scrollHeight - outputView.scrollTop - outputView.clientHeight) < SCROLL_STICK_THRESHOLD_PX;
  } catch (e) { return true; }
}

function noopController(reason) {
  const noop = () => false;
  return {
    mounted: false,
    reason: reason || 'unavailable',
    run: noop,
    stop: noop,
    isRunning: () => false,
    dispose: () => {},
  };
}

/**
 * Mount the terminal panel inside `host`. `opts` is optional:
 *   { tokenBudget, model, agent, timeoutMs, onEvent } — extra runSession
 *   options plus an optional `onEvent(name, data)` tap (status changes,
 *   exit summaries). Never reads env vars; never touches shared manifests.
 */
function mountTerminalPanel(host, opts) {
  const options = (opts && typeof opts === 'object') ? opts : {};
  if (!host || typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return noopController(!host ? 'no-host' : 'no-dom');
  }

  let active = null; // bridge handle for the running session, else null
  let disposed = false;

  function emit(name, data) {
    if (typeof options.onEvent === 'function') {
      try { options.onEvent(name, data); } catch (e) { /* observer must never break the panel */ }
    }
  }

  // ---- DOM (built inside the host; no outside selectors) ----
  const root = makeEl('div', 'term-opencode');
  root.setAttribute('data-component', 'terminal-opencode');
  try {
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '6px';
  } catch (e) { /* inline styles are best-effort */ }

  const outputView = makeEl('div', 'term-opencode-output');
  outputView.setAttribute('role', 'log');
  outputView.setAttribute('aria-live', 'polite');
  outputView.setAttribute('aria-label', 'opencode session output');
  try {
    outputView.style.overflowY = 'auto';
    outputView.style.maxHeight = '320px';
    outputView.style.minHeight = '120px';
    outputView.style.whiteSpace = 'pre-wrap';
    outputView.style.wordBreak = 'break-word';
    outputView.style.fontFamily = 'monospace';
  } catch (e) { /* best-effort */ }

  const dirRow = makeEl('div', 'term-opencode-dirrow');
  const cwdInput = makeEl('input', 'term-opencode-cwd');
  try {
    cwdInput.setAttribute('type', 'text');
    cwdInput.setAttribute('aria-label', 'Working directory');
    cwdInput.setAttribute('placeholder', 'Working directory');
    cwdInput.value = defaultCwd();
    cwdInput.spellcheck = false;
  } catch (e) { /* best-effort */ }
  const pickBtn = makeEl('button', 'term-opencode-pick', 'Pick…');
  try { pickBtn.setAttribute('type', 'button'); pickBtn.setAttribute('title', 'Choose working directory'); } catch (e) { /* best-effort */ }
  dirRow.appendChild(cwdInput);
  dirRow.appendChild(pickBtn);

  const promptRow = makeEl('div', 'term-opencode-promptrow');
  const promptInput = makeEl('input', 'term-opencode-prompt');
  try {
    promptInput.setAttribute('type', 'text');
    promptInput.setAttribute('aria-label', 'opencode prompt');
    promptInput.setAttribute('placeholder', 'Ask opencode… (Enter to run)');
    promptInput.spellcheck = false;
  } catch (e) { /* best-effort */ }
  const runBtn = makeEl('button', 'term-opencode-run', 'Run');
  try { runBtn.setAttribute('type', 'button'); } catch (e) { /* best-effort */ }
  const stopBtn = makeEl('button', 'term-opencode-stop', 'Stop');
  try { stopBtn.setAttribute('type', 'button'); stopBtn.disabled = true; } catch (e) { /* best-effort */ }
  promptRow.appendChild(promptInput);
  promptRow.appendChild(runBtn);
  promptRow.appendChild(stopBtn);

  const statusLine = makeEl('div', 'term-opencode-status', bridgeAvailable() ? 'Idle.' : INSTALL_HINT);
  try { statusLine.setAttribute('data-kind', bridgeAvailable() ? 'idle' : 'warn'); } catch (e) { /* best-effort */ }

  root.appendChild(outputView);
  root.appendChild(dirRow);
  root.appendChild(promptRow);
  root.appendChild(statusLine);
  try { host.appendChild(root); } catch (e) { return noopController('host-rejected'); }

  // ---- rendering helpers ----
  function setStatus(text, kind) {
    try {
      statusLine.textContent = String(text == null ? '' : text);
      statusLine.setAttribute('data-kind', kind || 'idle');
    } catch (e) { /* status is best-effort */ }
    emit('status', { text: String(text == null ? '' : text), kind: kind || 'idle' });
  }

  function setBusy(busy) {
    try {
      runBtn.disabled = !!busy;
      stopBtn.disabled = !busy;
      promptInput.disabled = !!busy;
    } catch (e) { /* best-effort */ }
  }

  function appendOutput(text, kind) {
    if (text === undefined || text === null || text === '') return;
    let stick = true;
    try { stick = isStuckToBottom(outputView); } catch (e) { stick = true; }
    // textContent only: child output may contain HTML-looking diffs; never parse it.
    const line = makeEl('div', kind === 'stderr' ? 'term-opencode-stderr' : 'term-opencode-line', text);
    try {
      outputView.appendChild(line);
      pruneOldest(outputView);
      if (stick) outputView.scrollTop = outputView.scrollHeight;
    } catch (e) { /* output is best-effort */ }
  }

  function bridgeAvailable() {
    try {
      return !!(cliBridge && typeof cliBridge.runSession === 'function' && typeof cliBridge.cancel === 'function');
    } catch (e) { return false; }
  }

  // ---- actions (thin wrappers over the bridge) ----
  function run() {
    if (disposed || active) return false;
    const prompt = String((promptInput && promptInput.value) || '').trim();
    if (!prompt) {
      setStatus('Type a prompt first.', 'warn');
      return false;
    }
    if (!bridgeAvailable()) {
      appendOutput(INSTALL_HINT, 'stderr');
      setStatus(INSTALL_HINT, 'warn');
      return false;
    }
    let binary = null;
    try {
      binary = typeof cliBridge.detectOpencode === 'function' ? cliBridge.detectOpencode() : 'unknown';
    } catch (e) { binary = null; }
    if (!binary) {
      appendOutput(INSTALL_HINT, 'stderr');
      setStatus(INSTALL_HINT, 'warn');
      return false;
    }
    const cwd = String((cwdInput && cwdInput.value) || '').trim() || defaultCwd();
    setBusy(true);
    setStatus(`Running in ${cwd || '(default dir)'}…`, 'active');
    appendOutput(`$ opencode run ${prompt}`, 'cmd');
    emit('start', { cwd });
    try {
      active = cliBridge.runSession(prompt, {
        cwd,
        tokenBudget: options.tokenBudget,
        model: options.model,
        agent: options.agent,
        timeoutMs: options.timeoutMs,
        onStdout: (chunk) => appendOutput(chunk, 'stdout'),
        onStderr: (chunk) => appendOutput(chunk, 'stderr'),
        onExit: (summary) => {
          // onExit fires before promise settle; render from the promise path only
          // to avoid double-reporting — keep this callback side-effect free.
          emit('exit-callback', { code: summary && summary.code });
        },
      });
    } catch (e) {
      active = null;
      setBusy(false);
      const message = (e && e.message) || String(e);
      appendOutput(`Failed to start: ${message}`, 'stderr');
      setStatus(`Failed to start: ${message}`, 'err');
      return false;
    }
    const handle = active;
    try {
      promptInput.value = '';
    } catch (e) { /* best-effort */ }
    handle.promise.then(
      (summary) => {
        if (disposed || active !== handle) return;
        active = null;
        setBusy(false);
        const code = summary && summary.code;
        const tokens = summary && summary.estimatedTokens;
        const extra = [];
        if (summary && summary.killedByBudget) extra.push('token budget');
        if (summary && summary.timedOut) extra.push('timeout');
        if (summary && summary.cancelled) extra.push('cancelled');
        setStatus(
          `Done (exit ${code == null ? '?' : code}${extra.length ? '; ' + extra.join(', ') : ''}${typeof tokens === 'number' ? `; ~${tokens} tokens` : ''}).`,
          code === 0 ? 'ok' : 'warn'
        );
        emit('exit', { code, summary: { killedByBudget: !!(summary && summary.killedByBudget), timedOut: !!(summary && summary.timedOut), cancelled: !!(summary && summary.cancelled) } });
      },
      (err) => {
        if (disposed || active !== handle) return;
        active = null;
        setBusy(false);
        const message = (err && err.message) || String(err);
        appendOutput(`Session failed: ${message}`, 'stderr');
        setStatus(`Session failed: ${message}`, 'err');
        emit('error', { message });
      }
    );
    return true;
  }

  function stop() {
    if (disposed || !active) return false;
    let stopped = false;
    try {
      stopped = cliBridge.cancel(active);
    } catch (e) { stopped = false; }
    if (stopped) setStatus('Stop requested…', 'active');
    return stopped;
  }

  function pickDirectory() {
    // Prefer the File System Access picker when the host offers it; the cwd
    // text field is always the fallback, so this never throws.
    try {
      if (typeof window !== 'undefined' && window && typeof window.showDirectoryPicker === 'function') {
        window.showDirectoryPicker().then(
          (dirHandle) => {
            try {
              if (dirHandle && dirHandle.name && cwdInput) {
                cwdInput.value = dirHandle.name;
                setStatus(`Working directory set to "${dirHandle.name}" (name only; paste the full path if runs resolve elsewhere).`, 'idle');
              }
            } catch (e) { /* best-effort */ }
          },
          () => { /* picker dismissed — keep the current value */ }
        );
        return;
      }
    } catch (e) { /* fall through to hint */ }
    setStatus('Directory picker unavailable here — paste the path into the working-directory field.', 'warn');
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    try { stop(); } catch (e) { /* best-effort */ }
    try { runBtn.removeEventListener('click', run); } catch (e) { /* best-effort */ }
    try { stopBtn.removeEventListener('click', stop); } catch (e) { /* best-effort */ }
    try { pickBtn.removeEventListener('click', pickDirectory); } catch (e) { /* best-effort */ }
    try { promptInput.removeEventListener('keydown', onPromptKey); } catch (e) { /* best-effort */ }
    try { if (root.parentNode) root.parentNode.removeChild(root); } catch (e) { /* best-effort */ }
    active = null;
  }

  function onPromptKey(ev) {
    try {
      if (ev && ev.key === 'Enter') run();
    } catch (e) { /* best-effort */ }
  }

  try { runBtn.addEventListener('click', run); } catch (e) { /* best-effort */ }
  try { stopBtn.addEventListener('click', stop); } catch (e) { /* best-effort */ }
  try { pickBtn.addEventListener('click', pickDirectory); } catch (e) { /* best-effort */ }
  try { promptInput.addEventListener('keydown', onPromptKey); } catch (e) { /* best-effort */ }

  return {
    mounted: true,
    run,
    stop,
    dispose,
    isRunning: () => !!active,
    // Exposed for tests/hosts that prefill the panel.
    setPrompt: (text) => { try { promptInput.value = String(text == null ? '' : text); } catch (e) { /* best-effort */ } },
    setCwd: (text) => { try { cwdInput.value = String(text == null ? '' : text); } catch (e) { /* best-effort */ } },
  };
}

module.exports = {
  mountTerminalPanel,
};
