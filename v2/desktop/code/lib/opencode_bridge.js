/**
 * OpenCode.ai Integration Bridge - OPTIONAL module for VibeCodeWorker.
 *
 * When enabled, VibeCodeWorker can:
 *   1. EXPORT a playtest bug report (markdown + machine-readable JSON) for OpenCode.
 *   2. FIX via OpenCode's direct-code-editing agent (`opencode run` CLI or
 *      `opencode serve` HTTP API) - OpenCode edits repo files itself.
 *   3. HEAL in a loop: test -> export -> fix -> re-test, until clean or the
 *      iteration budget is spent. The loop runs in the SAME process, a FRESH
 *      child-process instance, or on ANOTHER VibeCodeWorker (e.g. a cloud
 *      droplet) via its REST API, then testing resumes wherever you choose.
 *
 * Everything here is dependency-free (child_process / fs / global fetch) and
 * safe to require in Electron main, Electron renderer (nodeIntegration),
 * headless `start_api_server.js`, and minimal cloud containers.
 *
 * Disabled by default: every entry point short-circuits with a helpful
 * `{ success: false, hint }` when OpenCode is not installed or not enabled,
 * so existing flows are never affected.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const { assertProviderEligible } = require('./vendor_eligibility');

const DEFAULTS = {
  enabled: false,
  mode: 'cli', // 'cli' | 'server' (server-mode logic below is untouched by CLI Mats)
  // CLI defaults: `binary` is resolved via PATH (`where`/`which`); override
  // with an absolute path directly or via the OPENCODE_BINARY env var.
  binary: 'opencode',
  model: '', // e.g. 'anthropic/claude-sonnet-4-5'; empty = OpenCode default
  agent: 'build', // OpenCode agent to use for fixes
  autoApprove: true, // passthrough: appends `--auto` to `opencode run` so fixes don't stall
  timeoutMs: 600000, // 10 min per fix run; passthrough to spawn timeout + server message timeout
  serverUrl: 'http://127.0.0.1:4096', // `opencode serve` base URL (server mode)
  serverUsername: 'opencode',
  serverPassword: '', // or OPENCODE_SERVER_PASSWORD env
  // Default workspace: the desktop app dir (v2/desktop/code), NOT the repo
  // root and NEVER the home dir or a filesystem root — opencode edits files
  // under this dir itself, so validateWorkspaceRoot() refuses those scopes.
  // Set explicitly via config `opencode.workspaceRoot` or OPENCODE_WORKSPACE.
  workspaceRoot: '', // empty = desktop app dir (see getOpenCodeConfig)
  exportDir: '', // defaults to <vibecodeworker>/data/opencode_exports
};

function repoRoot() {
  return path.resolve(__dirname, '..', '..', '..', '..');
}

function vibecodeworkerDir() {
  return path.resolve(__dirname, '..');
}

/** Load + merge file config (config.json `opencode` block) with env overrides. */
function getOpenCodeConfig(fileConfig) {
  let cfg = { ...DEFAULTS };
  try {
    if (!fileConfig) {
      const cfgPath = path.join(vibecodeworkerDir(), 'config', 'default.json');
      if (fs.existsSync(cfgPath)) {
        const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        if (raw && raw.opencode) fileConfig = raw.opencode;
      }
    }
    if (fileConfig) cfg = { ...cfg, ...fileConfig };
  } catch (e) { /* fall through with defaults */ }

  const env = process.env;
  if (env.OPENCODE_ENABLED !== undefined) cfg.enabled = ['1', 'true', 'yes'].includes(String(env.OPENCODE_ENABLED).toLowerCase());
  if (env.OPENCODE_MODE) cfg.mode = env.OPENCODE_MODE;
  if (env.OPENCODE_BINARY) cfg.binary = env.OPENCODE_BINARY;
  if (env.OPENCODE_MODEL) cfg.model = env.OPENCODE_MODEL;
  if (env.OPENCODE_AGENT) cfg.agent = env.OPENCODE_AGENT;
  if (env.OPENCODE_AUTO_APPROVE !== undefined) cfg.autoApprove = ['1', 'true', 'yes'].includes(String(env.OPENCODE_AUTO_APPROVE).toLowerCase());
  if (env.OPENCODE_TIMEOUT_MS) cfg.timeoutMs = parseInt(env.OPENCODE_TIMEOUT_MS, 10) || cfg.timeoutMs;
  if (env.OPENCODE_SERVER_URL) cfg.serverUrl = env.OPENCODE_SERVER_URL;
  if (env.OPENCODE_SERVER_USERNAME) cfg.serverUsername = env.OPENCODE_SERVER_USERNAME;
  if (env.OPENCODE_SERVER_PASSWORD) cfg.serverPassword = env.OPENCODE_SERVER_PASSWORD;
  if (env.OPENCODE_WORKSPACE) cfg.workspaceRoot = env.OPENCODE_WORKSPACE;
  if (env.OPENCODE_EXPORT_DIR) cfg.exportDir = env.OPENCODE_EXPORT_DIR;
  if (!cfg.workspaceRoot) cfg.workspaceRoot = vibecodeworkerDir();
  if (!cfg.exportDir) cfg.exportDir = path.join(vibecodeworkerDir(), 'data', 'opencode_exports');
  return cfg;
}

const INSTALL_HINT = 'OpenCode CLI not found. Install it for your OS: ' +
  'Linux/macOS: `curl -fsSL https://opencode.ai/install | bash`; ' +
  'macOS (brew): `brew install opencode`; ' +
  'Windows: `choco install opencode` or `npm install -g opencode-ai`; ' +
  'then verify with `opencode --version`. ' +
  'Override the binary path with OPENCODE_BINARY=/path/to/opencode. Docs: https://opencode.ai/docs';

const WORKSPACE_GUARD_HINT = 'Set a scoped workspace via config `opencode.workspaceRoot` ' +
  'or the OPENCODE_WORKSPACE env var (e.g. the desktop app dir v2/desktop/code). ' +
  'OpenCode must never run against the repo root, your home directory, or a filesystem root.';

/** Case-insensitive path equality on Windows, exact elsewhere. Never throws. */
function samePath(a, b) {
  try {
    let x = String(a || '');
    let y = String(b || '');
    if (process.platform === 'win32') { x = x.toLowerCase(); y = y.toLowerCase(); }
    return x !== '' && x === y;
  } catch (e) { return false; }
}

/**
 * Workspace-root guard: opencode edits files under `dir` itself, so refuse
 * scopes where a bad prompt could do wide damage. Refuses when `dir`
 * resolves to the repo root, the user's home dir, or a filesystem root
 * (`/` / `C:\`). Never throws — returns `{ ok, resolved, error, hint }`.
 */
function validateWorkspaceRoot(dir, overrides) {
  const o = overrides || {};
  let resolved = null;
  try {
    if (dir === undefined || dir === null || String(dir).trim() === '') {
      return { ok: false, resolved: null, error: 'No workspace configured.', hint: WORKSPACE_GUARD_HINT };
    }
    resolved = path.resolve(String(dir));
  } catch (e) {
    return { ok: false, resolved: null, error: `Invalid workspace path: ${e.message}`, hint: WORKSPACE_GUARD_HINT };
  }
  let forbidden = [];
  try {
    forbidden = [
      { label: 'repo root', value: path.resolve(o.repoRoot || repoRoot()) },
      { label: 'home directory', value: path.resolve(o.homeDir || os.homedir()) },
      { label: 'filesystem root', value: path.resolve(path.parse(resolved).root) },
    ];
  } catch (e) { /* fall through: comparisons below still apply where possible */ }
  for (const f of forbidden) {
    if (f.value && samePath(resolved, f.value)) {
      return { ok: false, resolved, error: `Refusing to run opencode against the ${f.label} (${f.value}).`, hint: WORKSPACE_GUARD_HINT };
    }
  }
  return { ok: true, resolved, error: null, hint: null };
}

/**
 * Check whether the `opencode` binary exists and runs. Never throws.
 *
 * Mats: (1) resolve `binary` via PATH (`where` on win32, `which` elsewhere),
 * or accept an absolute path / OPENCODE_BINARY directly; (2) probe
 * `opencode --version` (10s timeout, best-effort); (3) return a helpful
 * INSTALL_HINT when unavailable so callers can surface it via /api/opencode/status.
 */
function detectOpenCode(binary, overrides) {
  const bin = String(binary || process.env.OPENCODE_BINARY || 'opencode').trim() || 'opencode';
  const spawnSyncImpl = (overrides && overrides.spawnSync) || spawnSync;
  try {
    let resolvedPath = null;
    // Fast path: absolute path (or explicit OPENCODE_BINARY) — no PATH lookup needed.
    const looksAbsolute = path.isAbsolute(bin) || bin.includes('/') || bin.includes('\\');
    if (looksAbsolute && fs.existsSync(bin)) {
      resolvedPath = bin;
    } else {
      const probe = process.platform === 'win32' ? 'where' : 'which';
      const found = spawnSyncImpl(probe, [bin], { encoding: 'utf8', timeout: 10000 });
      if (found && found.status === 0) {
        resolvedPath = String(found.stdout || '').split(/\r?\n/)[0].trim() || null;
      }
    }
    if (!resolvedPath) {
      return { available: false, binary: bin, path: null, version: null, hint: INSTALL_HINT };
    }
    // Probe `opencode --version` (best-effort; timeout-guarded, never throws).
    let version = null;
    try {
      const v = spawnSyncImpl(bin, ['--version'], { encoding: 'utf8', timeout: 10000 });
      if (v && v.status === 0) version = String(v.stdout || v.stderr || '').trim().split(/\r?\n/)[0] || null;
    } catch (e) { /* version best-effort only */ }
    return { available: true, binary: bin, path: resolvedPath, version, hint: null };
  } catch (e) {
    return { available: false, binary: bin, path: null, version: null, hint: INSTALL_HINT };
  }
}

/** Lightweight status object for dashboards / /api/opencode/status. Never throws. */
async function getStatus(fileConfig) {
  const config = getOpenCodeConfig(fileConfig);
  const detection = detectOpenCode(config.binary);
  let serverReachable = false;
  let serverHealth = null;
  if (config.mode === 'server') {
    try {
      const health = await openCodeServerFetch(config, '/global/health', { method: 'GET', timeoutMs: 5000 });
      serverReachable = !!health;
      serverHealth = health;
    } catch (e) {
      serverReachable = false;
    }
  }
  return {
    enabled: !!config.enabled,
    mode: config.mode,
    available: detection.available,
    version: detection.version,
    binary: detection.binary,
    serverReachable,
    serverHealth,
    workspaceRoot: config.workspaceRoot,
    hint: detection.available ? null : detection.hint,
  };
}

// ─── Bug report export ──────────────────────────────────────────────

function slugify(s) {
  return String(s || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'game';
}

function summarizeBug(b, i) {
  const id = b.id || `BUG-${i + 1}`;
  const sev = (b.severity || 'medium').toUpperCase();
  const title = b.title || b.description || 'Untitled issue';
  const lines = [`### ${i + 1}. [${sev}] ${title} (\`${id}\`)`];
  if (b.description && b.description !== title) lines.push(`- **Details:** ${b.description}`);
  if (b.gameId) lines.push(`- **Game:** ${b.gameId}`);
  if (b.status) lines.push(`- **Status:** ${b.status}`);
  if (b.steps || b.repro) lines.push(`- **Repro:** ${b.steps || b.repro}`);
  if (b.expected || b.actual) lines.push(`- **Expected:** ${b.expected || 'n/a'} / **Actual:** ${b.actual || 'n/a'}`);
  if (b.filePath || b.file) lines.push(`- **Suspect file:** \`${b.filePath || b.file}\``);
  if (Array.isArray(b.consoleLogs) && b.consoleLogs.length > 0) {
    lines.push(`- **Console logs (last ${Math.min(5, b.consoleLogs.length)}):**`);
    lines.push('  ```');
    b.consoleLogs.slice(-5).forEach(l => lines.push('  ' + String(typeof l === 'string' ? l : (l.message || JSON.stringify(l)))));
    lines.push('  ```');
  }
  if (b.screenshot) lines.push(`- **Screenshot:** attached (${String(b.screenshot).length} base64 chars)`);
  return lines.join('\n');
}

/**
 * Build the fix prompt sent to OpenCode (CLI arg / server message / file).
 * Keeps repo contracts explicit so the agent doesn't break the test harness.
 */
function buildBugFixPrompt({ bugs, gameId, instructions, testCommand, extraContext }) {
  const list = Array.isArray(bugs) ? bugs : [bugs].filter(Boolean);
  const head = [
    '# VibeCodeWorker autonomous bug-fix task',
    '',
    `You are working inside a game repository. Fix the ${list.length} bug(s) below with minimal, surgical edits.`,
    '',
    '## Hard rules',
    '- Preserve every public contract the test harness relies on (e.g. `window.game`, `gameState`, debug hooks, DOM ids referenced by autoplay scripts).',
    '- Do not rename files, move files, or add new runtime dependencies.',
    '- Keep changes scoped to the reported bugs; no refactors, no feature work.',
    `- After editing, the verification command MUST pass: \`${testCommand || 'node tests/test_vibecodeworker.js (from website/v1/ai/vibecodeworker)'}\`.`,
    '- If a bug cannot be fixed safely, leave the code untouched for that item and explain why at the end.',
    '',
    `## Game: ${gameId || 'unknown'}`,
    '',
  ];
  if (instructions) head.push('## Extra instructions from the operator', '', instructions, '');
  if (extraContext) head.push('## Additional context', '', extraContext, '');
  head.push('## Bugs to fix', '');
  list.forEach((b, i) => head.push(summarizeBug(b, i), ''));
  head.push(
    '## Done criteria',
    '- Reply with a short per-bug summary: what you changed (file + lines) and how you verified it.',
    '- List anything you intentionally left unfixed and why.'
  );
  return head.join('\n');
}

/**
 * Export bugs to `data/opencode_exports/BUGFIX-<game>-<timestamp>.{md,json}`.
 * The .md is human/CLI-paste friendly; the .json carries file contents +
 * metadata for programmatic `opencode run -f` / server-mode sends.
 */
function exportBugReport({ bugs, gameId, instructions, testCommand, fileContents, config: fileConfig } = {}) {
  const config = getOpenCodeConfig(fileConfig);
  const list = Array.isArray(bugs) ? bugs : [bugs].filter(Boolean);
  if (list.length === 0) {
    return { success: false, error: 'No bugs provided to export.' };
  }
  if (!fs.existsSync(config.exportDir)) fs.mkdirSync(config.exportDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `BUGFIX-${slugify(gameId || list[0].gameId)}-${stamp}`;
  const prompt = buildBugFixPrompt({ bugs: list, gameId: gameId || list[0].gameId, instructions, testCommand });

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: 'vibecodeworker/opencode_bridge',
    gameId: gameId || list[0].gameId || 'unknown',
    testCommand: testCommand || null,
    instructions: instructions || null,
    bugCount: list.length,
    bugs: list.map(b => {
      const copy = { ...b };
      if (typeof copy.screenshot === 'string' && copy.screenshot.length > 2000) {
        copy.screenshot = copy.screenshot.slice(0, 2000) + '…[truncated]';
      }
      return copy;
    }),
    files: Array.isArray(fileContents) ? fileContents : [],
    prompt,
  };

  const mdPath = path.join(config.exportDir, base + '.md');
  const jsonPath = path.join(config.exportDir, base + '.json');
  fs.writeFileSync(mdPath, prompt, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  return { success: true, bugCount: list.length, mdPath, jsonPath, prompt };
}

// ─── CLI mode: `opencode run` ───────────────────────────────────────
// autoApprove passthrough: `autoApprove=true` appends `--auto` so fix runs
// never stall on permission prompts. timeoutMs passthrough: forwarded as the
// spawn `timeout` in runOpenCodeFix (default 600000ms from config/OPENCODE_TIMEOUT_MS).
function buildRunArgs({ prompt, promptFile, model, agent, autoApprove, attach, format }) {
  const args = ['run'];
  if (prompt) args.push(prompt);
  if (promptFile) { args.push('-f', promptFile); }
  if (model) { args.push('--model', model); }
  if (agent) { args.push('--agent', agent); }
  if (autoApprove) args.push('--auto');
  if (attach) { args.push('--attach', attach); }
  args.push('--format', format || 'json');
  return args;
}

/** Positive finite ms, else `fallback`. Never throws. */
function normalizeTimeoutMs(value, fallback) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return fallback;
}

/**
 * Run one OpenCode fix job via the CLI (direct-code-editing: OpenCode edits
 * files under `dir` itself). Resolves with transcript + resulting git diff.
 * Never throws/rejects: every failure mode resolves `{ success: false, ... }`
 * with a helpful `hint` (missing binary) or refusal `error` (bad workspace).
 *
 * Per-run overrides `model` / `agent` / `autoApprove` / `timeoutMs` fall back
 * to the resolved config. `deps` is a test seam: `{ spawn, detect }`.
 */
async function runOpenCodeFix({ prompt, promptFile, dir, model, agent, autoApprove, timeoutMs, config: fileConfig, deps } = {}) {
  try {
    await assertProviderEligible('opencode');
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'OpenCode is not eligible for this account.' };
  }
  const config = getOpenCodeConfig(fileConfig);
  const spawnImpl = (deps && deps.spawn) || spawn;
  const detectImpl = (deps && deps.detect) || detectOpenCode;
  return new Promise((resolve) => {
    if (!prompt && !promptFile) {
      return resolve({ success: false, error: 'Provide prompt or promptFile.' });
    }
    const guard = validateWorkspaceRoot(dir || config.workspaceRoot);
    if (!guard.ok) {
      return resolve({ success: false, error: guard.error, hint: guard.hint });
    }
    const cwd = guard.resolved;
    let detection;
    try {
      detection = detectImpl(config.binary);
    } catch (e) {
      detection = { available: false, binary: config.binary, path: null, version: null, hint: INSTALL_HINT };
    }
    if (!detection.available) {
      return resolve({ success: false, error: 'OpenCode binary not found.', hint: detection.hint || INSTALL_HINT });
    }
    const args = buildRunArgs({
      prompt,
      promptFile,
      model: model !== undefined ? model : config.model,
      agent: agent || config.agent,
      autoApprove: autoApprove !== undefined ? autoApprove : config.autoApprove,
    });
    const effectiveTimeout = normalizeTimeoutMs(
      timeoutMs, normalizeTimeoutMs(config.timeoutMs, DEFAULTS.timeoutMs));

    let child;
    try {
      child = spawnImpl(config.binary, args, { cwd });
    } catch (e) {
      return resolve({ success: false, error: `Failed to spawn opencode: ${e.message}`, hint: INSTALL_HINT });
    }
    if (!child || !child.stdout || !child.stderr || typeof child.on !== 'function') {
      return resolve({ success: false, error: 'Failed to spawn opencode: spawn returned an unusable child process.', hint: INSTALL_HINT });
    }

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (grace) clearTimeout(grace);
      resolve(res);
    };
    const timeoutResult = () => {
      const transcript = parseRunTranscript(stdout);
      finish({
        success: false,
        timedOut: true,
        exitCode: null,
        transcript,
        stdoutTail: stdout.slice(-4000),
        stderrTail: stderr.slice(-2000),
        diff: getGitDiff(cwd),
        error: `opencode run timed out after ${effectiveTimeout}ms`,
        hint: 'Raise `opencode.timeoutMs` (or OPENCODE_TIMEOUT_MS) or simplify the fix prompt.',
      });
    };
    // Manual watchdog (instead of spawn `timeout`) so a timeout resolves with
    // `timedOut: true` and partial output instead of an ambiguous close code.
    const timer = setTimeout(() => {
      timedOut = true;
      grace = setTimeout(timeoutResult, 2000);
      try { if (typeof child.kill === 'function') child.kill('SIGTERM'); } catch (e) { /* fall through to grace resolve */ }
    }, effectiveTimeout);
    // NOTE: timers are intentionally NOT unref'd — an unref'd watchdog would
    // let the process exit before the timeout path ever resolves.
    let grace = null;

    child.stdout.on('data', d => { stdout += String(d); if (stdout.length > 512 * 1024) stdout = stdout.slice(-512 * 1024); });
    child.stderr.on('data', d => { stderr += String(d); if (stderr.length > 128 * 1024) stderr = stderr.slice(-128 * 1024); });
    child.on('error', (err) => finish({ success: false, timedOut, error: `opencode run failed: ${err.message}`, hint: INSTALL_HINT }));
    child.on('close', (code) => {
      if (timedOut) return timeoutResult();
      const transcript = parseRunTranscript(stdout);
      const diff = getGitDiff(cwd);
      finish({
        success: code === 0,
        timedOut: false,
        exitCode: code,
        transcript,
        stdoutTail: stdout.slice(-4000),
        stderrTail: stderr.slice(-2000),
        diff,
        error: code === 0 ? null : (`opencode exited with code ${code}` + (stderr ? `: ${stderr.slice(-500)}` : '')),
      });
    });
  });
}

/** `runCli` is the CLI-runner alias used by envelopes/docs; same as runOpenCodeFix. */
const runCli = runOpenCodeFix;

/** Parse `opencode run --format json` event stream; fall back to raw text. */
function parseRunTranscript(stdout) {
  const events = [];
  let text = '';
  for (const line of String(stdout || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      events.push(JSON.parse(t));
    } catch (e) {
      text += line + '\n';
    }
  }
  // Pull assistant text parts out of JSON events for a readable summary.
  const summaries = [];
  for (const ev of events) {
    try {
      const parts = ev.parts || ev.message?.parts || ev.data?.parts || [];
      for (const p of parts) {
        if (typeof p?.text === 'string' && p.text.trim()) summaries.push(p.text.trim().slice(0, 2000));
      }
      if (typeof ev.text === 'string' && ev.text.trim()) summaries.push(ev.text.trim().slice(0, 2000));
    } catch (e) { /* ignore malformed events */ }
  }
  return { eventCount: events.length, summary: summaries.slice(-5).join('\n\n---\n\n').slice(0, 8000), rawTail: text.slice(-4000) };
}

/** Best-effort `git diff --stat` + file list so callers can show what changed. */
function getGitDiff(dir) {
  try {
    const stat = spawnSync('git', ['diff', '--stat'], { cwd: dir, encoding: 'utf8', timeout: 15000 });
    const names = spawnSync('git', ['diff', '--name-only'], { cwd: dir, encoding: 'utf8', timeout: 15000 });
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8', timeout: 15000 });
    return {
      stat: stat.status === 0 ? String(stat.stdout || '').slice(0, 4000) : null,
      files: names.status === 0 ? String(names.stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 50) : [],
      untracked: status.status === 0
        ? String(status.stdout || '').split(/\r?\n/).filter(l => l.startsWith('??')).map(s => s.slice(3).trim()).slice(0, 20)
        : [],
    };
  } catch (e) {
    return { stat: null, files: [], untracked: [] };
  }
}

// ─── Server mode: `opencode serve` HTTP API ─────────────────────────

function serverHeaders(config) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.serverPassword) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${config.serverUsername || 'opencode'}:${config.serverPassword}`).toString('base64');
  }
  return headers;
}

async function openCodeServerFetch(config, apiPath, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(config.serverUrl.replace(/\/$/, '') + apiPath, {
      method,
      headers: serverHeaders(config),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenCode server ${res.status} ${res.statusText} on ${apiPath}`);
    const text = await res.text();
    try { return text ? JSON.parse(text) : null; } catch (e) { return text; }
  } finally {
    clearTimeout(timer);
  }
}

async function serverCreateSession(config, title) {
  return openCodeServerFetch(config, '/session', { method: 'POST', body: { title: title || 'VibeCodeWorker bug fix' } });
}

async function serverSendMessage(config, sessionId, prompt) {
  return openCodeServerFetch(config, `/session/${sessionId}/message`, {
    method: 'POST',
    timeoutMs: config.timeoutMs,
    body: {
      agent: config.agent || 'build',
      ...(config.model ? { model: config.model } : {}),
      parts: [{ type: 'text', text: prompt }],
    },
  });
}

async function serverGetDiff(config, sessionId) {
  try {
    return await openCodeServerFetch(config, `/session/${sessionId}/diff`);
  } catch (e) {
    return { error: e.message };
  }
}

async function serverRevert(config, sessionId, messageId) {
  return openCodeServerFetch(config, `/session/${sessionId}/revert`, { method: 'POST', body: messageId ? { messageID: messageId } : {} });
}

/**
 * Fix via a long-lived `opencode serve` instance (no per-run MCP cold boot).
 * OpenCode edits files directly; we return its session diff for review.
 */
async function runServerFix({ prompt, sessionId, title, config: fileConfig } = {}) {
  try {
    await assertProviderEligible('opencode');
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'OpenCode is not eligible for this account.' };
  }
  const config = getOpenCodeConfig(fileConfig);
  try {
    let session = null;
    if (sessionId) {
      session = await openCodeServerFetch(config, `/session/${sessionId}`);
    } else {
      session = await serverCreateSession(config, title);
    }
    const sid = session?.id || session?.sessionID || sessionId;
    if (!sid) return { success: false, error: 'Could not create OpenCode session.', hint: 'Is `opencode serve` running? Start it with: opencode serve --port 4096' };
    const reply = await serverSendMessage(config, sid, prompt);
    const diff = await serverGetDiff(config, sid);
    const gitDiff = getGitDiff(config.workspaceRoot);
    return { success: true, mode: 'server', sessionId: sid, reply, diff, gitDiff };
  } catch (e) {
    return { success: false, error: `OpenCode server fix failed: ${e.message}`, hint: 'Start the server with `opencode serve --port 4096` (add OPENCODE_SERVER_PASSWORD for auth).' };
  }
}

// ─── High-level: fix N bugs ─────────────────────────────────────────

async function fixBugs({ bugs, bugIds, gameId, instructions, testCommand, fileContents, dir, sessionId, model, agent, autoApprove, timeoutMs, config: fileConfig } = {}) {
  const config = getOpenCodeConfig(fileConfig);
  let list = Array.isArray(bugs) ? bugs : [];
  if (bugIds && bugIds.length > 0) {
    list = list.filter(b => bugIds.includes(b.id));
  }
  if (list.length === 0) return { success: false, error: 'No matching bugs to fix.' };

  const exported = exportBugReport({ bugs: list, gameId, instructions, testCommand, fileContents, config });
  if (!exported.success) return exported;
  const guard = validateWorkspaceRoot(dir || config.workspaceRoot);
  if (!guard.ok) {
    return { success: false, exported, bugCount: list.length, targetDir: dir || config.workspaceRoot, error: guard.error, hint: guard.hint };
  }
  const targetDir = guard.resolved;
  // Per-run CLI overrides (model/agent/autoApprove/timeoutMs) ride along on a
  // merged config copy so both `cli` and `server` modes honor them.
  const runConfig = { ...config };
  if (model !== undefined) runConfig.model = model;
  if (agent !== undefined) runConfig.agent = agent;
  if (autoApprove !== undefined) runConfig.autoApprove = autoApprove;
  if (timeoutMs !== undefined) runConfig.timeoutMs = timeoutMs;

  // AUTO-FEED: attach the latest smart-log handoff so OpenCode sees live
  // runtime context (error clusters, recent actions) without manual pasting.
  const handoff = getLatestHandoffMarkdown();
  if (handoff) exported.prompt += `\n\n## Live runtime context (auto-attached smart-log handoff)\n\n${handoff}`;

  if (config.mode === 'server') {
    const res = await runServerFix({ prompt: exported.prompt, sessionId, title: `Fix ${list.length} bug(s) - ${gameId || 'game'}`, config: runConfig });
    return { ...res, exported, bugCount: list.length, targetDir };
  }
  const res = await runOpenCodeFix({ promptFile: exported.mdPath, dir: targetDir, model, agent, autoApprove, timeoutMs, config: runConfig });
  return { ...res, exported, bugCount: list.length, targetDir };
}

// ─── Self-healing loop ──────────────────────────────────────────────

function runShellCommand(command, cwd, timeoutMs) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = spawn(isWin ? 'cmd.exe' : 'sh', [isWin ? '/c' : '-c', command], { cwd, timeout: timeoutMs || 300000 });
    let out = '';
    child.stdout.on('data', d => { out += String(d); if (out.length > 256 * 1024) out = out.slice(-256 * 1024); });
    child.stderr.on('data', d => { out += String(d); if (out.length > 256 * 1024) out = out.slice(-256 * 1024); });
    child.on('error', (e) => resolve({ exitCode: -1, output: out + '\nSPAWN ERROR: ' + e.message }));
    child.on('close', (code) => resolve({ exitCode: code === null ? -1 : code, output: out.slice(-12000) }));
  });
}

function extractFailuresFromOutput(output) {
  const failures = [];
  const text = String(output || '');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/fail|error|✗|not ok|assertionerror/i.test(t) && !/0 fail/i.test(t)) {
      failures.push(t.slice(0, 500));
      if (failures.length >= 20) break;
    }
  }
  return failures;
}

const healRuns = new Map();

function getHealRun(runId) {
  return healRuns.get(runId) || null;
}

/**
 * Start a self-healing run in the background. Returns { runId } immediately;
 * poll with getHealRun(runId) or GET /api/opencode/heal/:id.
 *
 * instance: 'same' (in-process) | 'fresh' (spawn heal_worker.js child -
 *   literally another VibeCodeWorker instance) | { remoteUrl, token }
 *   (hand testing off to a different machine, e.g. a droplet).
 */
function startHealCycle({ bugs, gameId, instructions, testCommand, dir, maxIterations = 3, instance = 'same', config: fileConfig, testRunner } = {}) {
  const config = getOpenCodeConfig(fileConfig);
  const runId = 'heal_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  const run = {
    runId, status: 'running', gameId: gameId || 'unknown',
    iteration: 0, maxIterations, instance: typeof instance === 'object' ? 'remote' : instance,
    testCommand: testCommand || 'node tests/test_vibecodeworker.js',
    targetDir: dir || config.workspaceRoot,
    history: [], startedAt: new Date().toISOString(), finishedAt: null,
  };
  healRuns.set(runId, run);

  const step = async () => {
    try {
      while (run.iteration < run.maxIterations) {
        run.iteration++;
        const iter = { iteration: run.iteration, startedAt: new Date().toISOString() };

        // 1. TEST (same process runner, fresh child instance, or remote worker)
        iter.testPhase = await runHealTestStep({ run, instance, testRunner, config });
        run.history.push(iter);
        if (iter.testPhase.exitCode === 0) {
          run.status = 'healed';
          break;
        }

        // 2. EXPORT the failures as a fresh bug report for OpenCode
        const failures = extractFailuresFromOutput(iter.testPhase.output);
        const fixBugsList = failures.map((f, i) => ({
          id: `HEAL-${run.iteration}-${i + 1}`,
          gameId: run.gameId,
          title: f.slice(0, 160),
          description: `Healing iteration ${run.iteration}: test command \`${run.testCommand}\` failed.\n\nFailure output:\n${f}\n\nFull tail:\n${String(iter.testPhase.output || '').slice(-3000)}`,
          severity: 'high',
          status: 'open',
        }));
        const toFix = (bugs && bugs.length > 0 && run.iteration === 1) ? bugs : fixBugsList;
        iter.exported = exportBugReport({ bugs: toFix, gameId: run.gameId, instructions, testCommand: run.testCommand, config });

        // 3. FIX via OpenCode direct-code-editing
        if (config.mode === 'server') {
          iter.fixPhase = await runServerFix({ prompt: iter.exported.prompt, title: `Heal ${run.gameId} (iter ${run.iteration})`, config });
        } else {
          iter.fixPhase = await runOpenCodeFix({ promptFile: iter.exported.mdPath, dir: run.targetDir, config });
        }
        iter.finishedAt = new Date().toISOString();
        if (!iter.fixPhase.success) {
          run.status = 'fix_failed';
          run.error = iter.fixPhase.error;
          break;
        }
      }
      if (run.status === 'running') run.status = 'iterations_exhausted';
    } catch (e) {
      run.status = 'error';
      run.error = e.message;
    }
    run.finishedAt = new Date().toISOString();
    persistHealRun(run);
    return run;
  };

  // Fire and forget (same-process async loop); 'fresh' delegates per-step.
  setImmediate(() => { step().catch(e => { run.status = 'error'; run.error = e.message; run.finishedAt = new Date().toISOString(); }); });
  return { runId, status: run.status };
}

async function runHealTestStep({ run, instance, testRunner, config }) {
  // Remote instance: ask ANOTHER VibeCodeWorker (same LAN, droplet, etc.)
  // to run the tests and report back; testing resumes there.
  if (instance && typeof instance === 'object' && instance.remoteUrl) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (instance.token) headers['X-Vibe-Auth'] = instance.token;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 300000);
      const res = await fetch(instance.remoteUrl.replace(/\/$/, '') + '/api/opencode/heal-test', {
        method: 'POST', headers, signal: controller.signal,
        body: JSON.stringify({ testCommand: run.testCommand }),
      }).finally(() => clearTimeout(timer));
      const data = await res.json();
      return { exitCode: data.exitCode ?? -1, output: data.output || JSON.stringify(data).slice(0, 12000), remote: instance.remoteUrl };
    } catch (e) {
      return { exitCode: -1, output: 'REMOTE TEST ERROR: ' + e.message };
    }
  }
  // Fresh instance: spawn heal_worker.js; a separate VibeCodeWorker process
  // with its own memory, so a wedged tester can't poison the healer.
  if (instance === 'fresh') {
    return runFreshInstanceTest({ run, config });
  }
  // Same instance: run the test command in-process (child shell, shared dir).
  if (typeof testRunner === 'function') {
    return testRunner(run.testCommand, run.targetDir);
  }
  return runShellCommand(run.testCommand, run.targetDir, 300000);
}

function runFreshInstanceTest({ run, config }) {
  return new Promise((resolve) => {
    const workerPath = path.join(vibecodeworkerDir(), 'workers', 'heal_worker.js');
    const args = [workerPath, '--test-command', run.testCommand, '--dir', run.targetDir];
    const child = spawn(process.execPath, args, { cwd: run.targetDir, timeout: 300000 });
    let out = '';
    child.stdout.on('data', d => { out += String(d); if (out.length > 256 * 1024) out = out.slice(-256 * 1024); });
    child.stderr.on('data', d => { out += String(d); if (out.length > 256 * 1024) out = out.slice(-256 * 1024); });
    child.on('error', (e) => resolve({ exitCode: -1, output: out + '\nWORKER SPAWN ERROR: ' + e.message, instance: 'fresh' }));
    child.on('close', (code) => {
      let exitCode = code === null ? -1 : code;
      let output = out;
      // heal_worker prints a JSON envelope as its last line; prefer it.
      try {
        const lines = out.trim().split(/\r?\n/);
        const last = JSON.parse(lines[lines.length - 1]);
        if (last && last.healWorker === true) {
          exitCode = last.exitCode;
          output = last.output || out;
        }
      } catch (e) { /* keep raw output */ }
      void config;
      resolve({ exitCode, output: String(output).slice(-12000), instance: 'fresh' });
    });
  });
}

/** Persist a finished heal run next to the smart logs for later AI review. */
function persistHealRun(run) {
  try {
    const sl = require('./smart_log');
    const log = sl.getSharedLog('opencode-heal');
    const slim = {
      ...run,
      history: run.history.map(h => ({
        iteration: h.iteration,
        startedAt: h.startedAt,
        finishedAt: h.finishedAt,
        testExitCode: h.testPhase ? h.testPhase.exitCode : null,
        testTail: h.testPhase ? String(h.testPhase.output || '').slice(-2000) : null,
        fixSuccess: h.fixPhase ? !!h.fixPhase.success : null,
        fixError: h.fixPhase && h.fixPhase.error ? String(h.fixPhase.error).slice(0, 500) : null,
        changedFiles: h.fixPhase && h.fixPhase.diff ? h.fixPhase.diff.files : [],
        exportedMd: h.exported && h.exported.mdPath ? h.exported.mdPath : null,
      })),
    };
    fs.writeFileSync(path.join(log.dir, `${run.runId}.heal.json`), JSON.stringify(slim, null, 2), 'utf8');
    log.info(`Heal run ${run.runId} finished: ${run.status} after ${run.iteration} iteration(s)`, { category: 'heal' });
  } catch (e) { /* never break the loop over persistence */ }
}

/** Latest smart-log handoff markdown (or null); auto-attached to fix prompts. */
function getLatestHandoffMarkdown() {
  try {
    const sl = require('./smart_log');
    const res = sl.getSharedLog('opencode-bridge').readLatestHandoff();
    if (res.success && res.markdown) return res.markdown.slice(0, 6000);
  } catch (e) {}
  return null;
}

module.exports = {
  DEFAULTS,
  INSTALL_HINT,
  WORKSPACE_GUARD_HINT,
  repoRoot,
  vibecodeworkerDir,
  getOpenCodeConfig,
  validateWorkspaceRoot,
  detectOpenCode,
  getStatus,
  buildBugFixPrompt,
  exportBugReport,
  buildRunArgs,
  runOpenCodeFix,
  runCli,
  parseRunTranscript,
  getGitDiff,
  runServerFix,
  serverCreateSession,
  serverSendMessage,
  serverGetDiff,
  serverRevert,
  fixBugs,
  startHealCycle,
  getHealRun,
  persistHealRun,
  getLatestHandoffMarkdown,
  extractFailuresFromOutput,
  runShellCommand,
};
