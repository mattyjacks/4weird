/**
 * opencode-cli-bridge.js — desktop worker bridge to the opencode CLI.
 *
 * Vanilla JS (CommonJS) module, same style as the sibling automation files
 * under `v2/desktop/code/src/modules/`. Spawns headless `opencode run`
 * sessions with streaming callbacks, an estimated token budget, and a
 * kill handle. Fail-open: every entry point degrades cleanly when the
 * `opencode` binary is absent. Never logs secrets: env values and
 * key-shaped strings are redacted before anything reaches the console.
 *
 * Usage:
 *   const bridge = require('./opencode-cli-bridge');
 *
 *   const bin = bridge.detectOpencode();
 *   if (!bin) {
 *     console.log('opencode not installed; skipping');
 *     return;
 *   }
 *
 *   const handle = bridge.runSession('explain this repo in 3 bullets', {
 *     cwd: 'C:\\GitHub5\\4weird',
 *     tokenBudget: 4000, // estimated tokens over prompt + stdout + stderr
 *     onStdout: (chunk) => process.stdout.write(chunk),
 *     onStderr: (chunk) => process.stderr.write(chunk),
 *     onExit: (summary) => console.log('exit', summary.code),
 *   });
 *   handle.promise.then((summary) => console.log('done', summary.code));
 *   // ... later: bridge.cancel(handle);
 *
 * Security notes:
 * - The child inherits `process.env` so the user's own credentials keep
 *   working, but env values are NEVER printed, logged, or included in
 *   errors/summaries. Only the binary path, argv shape (without values
 *   that could carry secrets), cwd, and counts are logged.
 * - All console output in this module passes through `redactSecrets()`,
 *   which masks bot keys, sk- keys, and `key/token/secret = value` pairs.
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Rough estimation: ~4 chars per token. Deliberately coarse; the budget
// is a fail-open guard rail, not a billing meter.
const CHARS_PER_TOKEN = 4;

// Secret-shaped values are redacted before any console/log output.
// NOTE: redaction applies to LOGGING only — callback payloads (onStdout /
// onStderr / promise results) carry the raw child output untouched so
// code diffs and file contents are never corrupted.
const SECRET_PATTERNS = [
  /bot4weird_[A-Za-z0-9]+/g,
  /\bsk-[A-Za-z0-9-_]{8,}\b/g,
  /\bsk-ant-[A-Za-z0-9-_]{8,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/g,
  /\bghp_[A-Za-z0-9]{8,}\b/g,
  // key/token/secret/password = value  (value masked, key name kept)
  /((?:api[_-]?key|access[_-]?token|auth[_-]?token|secret|password|bearer)\s*[:=]\s*)([^\s'"]+)/gi,
];

function redactSecrets(value) {
  let text = String(value == null ? '' : value);
  for (const re of SECRET_PATTERNS) {
    re.lastIndex = 0;
    text = text.replace(re, (m, prefix, secret) =>
      secret !== undefined ? `${prefix}[REDACTED]` : '[REDACTED]'
    );
  }
  return text;
}

// Log helpers: redact first, never interpolate env objects or option values
// that could carry secrets (prompt text, tokens, env).
function logInfo(message) {
  try {
    console.log(`[opencode-cli-bridge] ${redactSecrets(message)}`);
  } catch (e) { /* logging is best-effort only */ }
}

function logError(message) {
  try {
    console.error(`[opencode-cli-bridge] ${redactSecrets(message)}`);
  } catch (e) { /* logging is best-effort only */ }
}

function estimateTokensForChars(charCount) {
  const n = Number(charCount) || 0;
  if (n <= 0) return 0;
  return Math.ceil(n / CHARS_PER_TOKEN);
}

function estimateTokensForText(text) {
  return estimateTokensForChars(String(text == null ? '' : text).length);
}

// Cached binary lookup; null means "not found" (fail-open).
let cachedBinary = undefined;

function isExecutableFile(filePath) {
  try {
    if (!filePath) return false;
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}

function lookupViaWhich() {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const probe = spawnSync(cmd, ['opencode'], {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
    });
    if (!probe || probe.status !== 0 || !probe.stdout) return null;
    const firstLine = String(probe.stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
    if (firstLine && isExecutableFile(firstLine)) return firstLine;
    // `where` can list a path that needs no further check on some setups;
    // still require the file check above, otherwise treat as absent.
    return null;
  } catch (e) {
    return null;
  }
}

function lookupViaCommonPaths() {
  try {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const candidates = [];
    if (process.platform === 'win32') {
      const pf = process.env.ProgramFiles || 'C:\\Program Files';
      const localApp = process.env.LOCALAPPDATA || '';
      candidates.push(
        path.join(pf, 'opencode', 'opencode.exe'),
        localApp ? path.join(localApp, 'Programs', 'opencode', 'opencode.exe') : null,
        home ? path.join(home, 'AppData', 'Local', 'Programs', 'opencode', 'opencode.exe') : null
      );
    } else {
      candidates.push(
        '/usr/local/bin/opencode',
        '/opt/homebrew/bin/opencode',
        home ? path.join(home, '.local', 'bin', 'opencode') : null,
        home ? path.join(home, 'go', 'bin', 'opencode') : null
      );
    }
    for (const candidate of candidates) {
      if (candidate && isExecutableFile(candidate)) return candidate;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Locate the `opencode` binary. Returns the absolute path or null when
 * absent. Fail-open: never throws. Honors OPENCODE_BIN when it points at
 * a real file (the value itself is never logged).
 */
function detectOpencode() {
  if (cachedBinary !== undefined) return cachedBinary;
  let found = null;
  try {
    const override = process.env.OPENCODE_BIN ? String(process.env.OPENCODE_BIN).trim() : '';
    if (override && isExecutableFile(override)) {
      found = override;
    } else {
      found = lookupViaWhich() || lookupViaCommonPaths();
    }
  } catch (e) {
    found = null;
  }
  cachedBinary = found || null;
  return cachedBinary;
}

function clearBinaryCache() {
  cachedBinary = undefined;
}

function safeCall(fn, ...args) {
  if (typeof fn !== 'function') return;
  try {
    fn(...args);
  } catch (e) {
    logError(`callback threw: ${e && e.message ? e.message : e}`);
  }
}

function resolveCwd(cwd) {
  try {
    if (cwd && typeof cwd === 'string' && fs.existsSync(cwd)) return cwd;
  } catch (e) { /* fall through to process.cwd() */ }
  try {
    return process.cwd();
  } catch (e) {
    return undefined;
  }
}

/**
 * Run one headless `opencode run` session.
 *
 * @param {string} prompt - task prompt passed as the run message.
 * @param {object} [opts]
 * @param {string} [opts.cwd] - working dir for the child (defaults to process.cwd()).
 * @param {number} [opts.tokenBudget] - stop the session when estimated
 *   tokens (prompt + stdout + stderr chars / 4) exceed this. Omit/<=0 = unlimited.
 * @param {string} [opts.model] - forwarded as `--model <value>`.
 * @param {string} [opts.agent] - forwarded as `--agent <value>`.
 * @param {string[]} [opts.args] - extra argv appended after the prompt (flag-only recommended).
 * @param {number} [opts.timeoutMs] - wall-clock kill after N ms. Omit/<=0 = none.
 * @param {function} [opts.onStdout] - streaming stdout callback (raw text).
 * @param {function} [opts.onStderr] - streaming stderr callback (raw text).
 * @param {function} [opts.onExit] - called once with the exit summary.
 * @returns handle { child, pid, tokenBudget, cancelled, killedByBudget,
 *   estimatedTokens(), promise } — promise resolves with
 *   { code, signal, stdout, stderr, estimatedTokens, killedByBudget,
 *   cancelled, timedOut } and rejects fail-open (binary missing, bad
 *   prompt, spawn error). The prompt is required; everything else degrades.
 */
function runSession(prompt, opts) {
  const options = opts && typeof opts === 'object' ? opts : {};
  const tokenBudget = Number(options.tokenBudget) > 0 ? Math.floor(Number(options.tokenBudget)) : 0;
  const cwd = resolveCwd(options.cwd);

  const handle = {
    child: null,
    pid: null,
    tokenBudget,
    cancelled: false,
    killedByBudget: false,
    timedOut: false,
    estimatedTokens: () => estimateTokensForText(prompt)
      + estimateTokensForChars((handle._stdoutChars || 0) + (handle._stderrChars || 0)),
    promise: null,
  };
  // Track raw char counts (not text) so the budget check stays cheap.
  handle._stdoutChars = 0;
  handle._stderrChars = 0;

  handle.promise = new Promise((resolve, reject) => {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      reject(new Error('opencode-cli-bridge: prompt must be a non-empty string'));
      return;
    }

    let binary = null;
    try {
      binary = detectOpencode();
    } catch (e) {
      binary = null;
    }
    if (!binary) {
      const err = new Error('opencode-cli-bridge: opencode binary not found');
      err.code = 'OPENCODE_NOT_FOUND';
      reject(err);
      return;
    }

    // Build argv without ever logging the prompt or option values.
    const argv = ['run'];
    if (options.model) argv.push('--model', String(options.model));
    if (options.agent) argv.push('--agent', String(options.agent));
    if (Array.isArray(options.args)) {
      for (const extra of options.args) {
        if (typeof extra === 'string' && extra) argv.push(extra);
      }
    }
    argv.push(prompt);

    let child = null;
    try {
      child = spawn(binary, argv, {
        cwd,
        env: process.env, // inherited; values never logged (see header)
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      const err = new Error(`opencode-cli-bridge: spawn failed: ${e && e.message ? e.message : e}`);
      err.cause = e;
      reject(err);
      return;
    }

    handle.child = child;
    handle.pid = child.pid || null;
    logInfo(`session started (argc=${argv.length}, cwd set=${Boolean(cwd)}, budget=${tokenBudget || 'none'})`);

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timeoutId = null;

    const promptTokens = estimateTokensForText(prompt);
    const currentEstimate = () => promptTokens
      + estimateTokensForChars(handle._stdoutChars + handle._stderrChars);

    function killChild(signal) {
      try {
        if (child && child.exitCode === null && !child.killed) child.kill(signal || 'SIGTERM');
      } catch (e) { /* kill is best-effort */ }
    }

    function checkBudget() {
      if (settled || tokenBudget <= 0) return;
      if (currentEstimate() > tokenBudget) {
        handle.killedByBudget = true;
        logInfo(`token budget exceeded (${currentEstimate()} > ${tokenBudget}); stopping session`);
        killChild('SIGTERM');
        // Escalate on Windows/POSIX alike when SIGTERM is ignored.
        setTimeout(() => {
          try {
            if (child && child.exitCode === null && !child.killed) child.kill('SIGKILL');
          } catch (e) { /* best-effort */ }
        }, 3000).unref?.();
      }
    }

    if (Number(options.timeoutMs) > 0) {
      timeoutId = setTimeout(() => {
        if (settled) return;
        handle.timedOut = true;
        logInfo(`session timeout after ${Math.floor(Number(options.timeoutMs))}ms; stopping session`);
        killChild('SIGTERM');
      }, Math.floor(Number(options.timeoutMs)));
      if (timeoutId && typeof timeoutId.unref === 'function') timeoutId.unref();
    }

    function finish(summary) {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        try { clearTimeout(timeoutId); } catch (e) { /* ignore */ }
        timeoutId = null;
      }
      // Recompute so estimatedTokens is exact at exit.
      summary.estimatedTokens = currentEstimate(); // eslint-disable-line no-param-reassign
      safeCall(options.onExit, summary);
      resolve(summary);
    }

    function fail(err) {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        try { clearTimeout(timeoutId); } catch (e) { /* ignore */ }
        timeoutId = null;
      }
      const summary = {
        code: null,
        signal: null,
        stdout,
        stderr,
        estimatedTokens: currentEstimate(),
        killedByBudget: handle.killedByBudget,
        cancelled: handle.cancelled,
        timedOut: handle.timedOut,
      };
      safeCall(options.onExit, summary);
      try {
        if (err && !err.code) err.code = 'OPENCODE_SPAWN_ERROR';
      } catch (e) { /* ignore */ }
      reject(err instanceof Error ? err : new Error(`opencode-cli-bridge: ${err}`));
    }

    try {
      if (child.stdout) {
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
          const text = String(chunk);
          stdout += text;
          handle._stdoutChars += text.length;
          safeCall(options.onStdout, text);
          checkBudget();
        });
      }
      if (child.stderr) {
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
          const text = String(chunk);
          stderr += text;
          handle._stderrChars += text.length;
          safeCall(options.onStderr, text);
          checkBudget();
        });
      }
      child.on('error', (err) => {
        logError(`session spawn error: ${err && err.message ? err.message : err}`);
        fail(err);
      });
      child.on('close', (code, signal) => {
        finish({
          code,
          signal: signal || null,
          stdout,
          stderr,
          estimatedTokens: currentEstimate(),
          killedByBudget: handle.killedByBudget,
          cancelled: handle.cancelled,
          timedOut: handle.timedOut,
        });
      });
    } catch (e) {
      fail(e);
    }
  });

  // Silence unhandled-rejection noise for callers using only callbacks.
  handle.promise.catch(() => {});
  // Re-throw for awaiters: attach a second branch-free path is unnecessary;
  // the original promise still rejects for `await`/`.then(_, _)`.
  const userPromise = handle.promise;
  handle.promise = userPromise.then(
    (summary) => summary,
    (err) => { throw err; }
  );

  return handle;
}

/**
 * Cancel a running session. Fail-open: null/garbage/dead handles return
 * false instead of throwing.
 *
 * @param {object} handle - value returned by runSession().
 * @param {string} [signal] - kill signal (default SIGTERM).
 * @returns {boolean} true when a kill was delivered, false otherwise.
 */
function cancel(handle, signal) {
  try {
    if (!handle || typeof handle !== 'object') return false;
    const child = handle.child;
    if (!child || child.exitCode !== null || child.killed) return false;
    handle.cancelled = true;
    logInfo('session cancel requested');
    child.kill(signal || 'SIGTERM');
    return true;
  } catch (e) {
    logError(`cancel failed: ${e && e.message ? e.message : e}`);
    return false;
  }
}

module.exports = {
  detectOpencode,
  runSession,
  cancel,
  // Test/diagnostic helpers (not part of the required surface).
  estimateTokensForText,
  estimateTokensForChars,
  redactSecrets,
  clearBinaryCache,
};
