'use strict';
// Remote-terminal routes for the VCW desktop control plane (DS-OCT-03).
//
// Token-authed, allow-listed command execution WITHOUT a shell:
// argv arrays go straight to child_process.execFile (shell:false), so no
// chaining, substitution, redirection, or glob expansion is possible.
// Every exec attempt (allowed or denied) is appended to an in-memory ring
// buffer. NEVER logs key material: tokens/headers are never echoed.
//
// Mounting is intentionally NOT done here: lib/api/routes.js and
// lib/api_server.js are owned by another lane. The integrator mounts this
// module (see the QUEUE wiring line in the DS-OCT-03 report) via:
//   const { handleTerminalRequest } = require('./terminal_routes');
//   ... inside handleApiRequest, BEFORE the 404 handler:
//   if (pathname.startsWith('/api/terminal/')) {
//     const handled = await handleTerminalRequest(pathname, req, readBody, sendJSON, sendText, rootDir);
//     if (handled !== null) return handled;
//   }
// Auth mirrors lib/api_server.js: X-Vibe-Auth (or Bearer) compared with
// crypto.timingSafeEqual. Unlike the general server (which lets loopback
// clients without an Origin header bypass the token), this module ALWAYS
// requires the token: terminal exec is deny-by-default, so a missing
// VIBE_API_TOKEN disables the endpoint (503) instead of opening it.
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

// ─── Allow-list (deny-by-default: bare names only, no paths) ───
const ALLOW_LIST = {
  node: 'Run a Node.js script or flag (e.g. --check, --version, tests).',
  npm: 'Run npm (test, run, ls, --version). Network installs stay the caller\'s risk; args are still metachar-checked.',
  npx: 'Run an npx-resolved binary with test/lint-shaped args.',
  git: 'Read-mostly git (status, log, diff, branch, rev-parse). Mutating subcommands are rejected below.',
  python: 'Run a Python script or flag (e.g. --version).'
};
// git subcommands that mutate history/remotes are never executed.
const GIT_DENIED_SUBCOMMANDS = new Set([
  'push', 'pull', 'fetch', 'clone', 'reset', 'clean', 'checkout',
  'rebase', 'merge', 'cherry-pick', 'revert', 'stash', 'remote',
  'filter-branch', 'update-ref', 'gc', 'prune'
]);

const MAX_ARGS = 32;
const MAX_ARG_CHARS = 2000;
const MAX_TIMEOUT_MS = 300000;
const DEFAULT_TIMEOUT_MS = 120000;
const MAX_OUTPUT_BYTES = 256 * 1024;
// Shell metacharacters (same guardrail as /api/opencode/heal-test in
// lib/api/routes.js): chaining, substitution, redirects, backgrounding.
const METACHAR_RE = /[;&|$`><(){}!\n\r]/;
// Termux/Windows-safe: forward slashes work on every platform, so callers
// must not send backslashes (avoids escape-sequence smuggling).

const _execLog = [];
function logExec(entry) {
  _execLog.push({ timestamp: new Date().toISOString(), ...entry });
  if (_execLog.length > 100) _execLog.shift();
  try {
    const smartlog = require('../smart_log').getSharedLog();
    smartlog.log(entry.success ? 'info' : 'warn', 'terminal',
      `${entry.command || '?'} -> ${entry.status || entry.error || 'ok'}`);
  } catch (e) { /* logging must never break serving */ }
}
function getTerminalLog() { return _execLog.slice(); }
function _clearTerminalLog() { _execLog.length = 0; }

// ─── Auth (mirrors lib/api_server.js constant-time compare) ───
function isTerminalAuthorized(req) {
  const apiToken = process.env.VIBE_API_TOKEN || '';
  if (!apiToken) return false; // deny-by-default: no token configured, no exec
  const headers = (req && req.headers) || {};
  const presented = headers['x-vibe-auth'] ||
    String(headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    const a = Buffer.from(String(presented), 'utf8');
    const b = Buffer.from(apiToken, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}

// ─── Validation ───
function validateTerminalExec(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Missing JSON body' };
  const command = body.command;
  if (typeof command !== 'string' || !/^[A-Za-z0-9._-]+$/.test(command)) {
    return { ok: false, error: 'command must be a bare binary name (no paths, spaces, or metacharacters)' };
  }
  if (!Object.prototype.hasOwnProperty.call(ALLOW_LIST, command)) {
    return { ok: false, status: 403, error: `command '${command}' is not in the exec allow-list` };
  }
  const args = body.args === undefined ? [] : body.args;
  if (!Array.isArray(args) || args.length > MAX_ARGS) {
    return { ok: false, error: `args must be an array of at most ${MAX_ARGS} strings` };
  }
  for (const arg of args) {
    if (typeof arg !== 'string' || arg.length > MAX_ARG_CHARS) {
      return { ok: false, error: 'every arg must be a string under 2000 chars' };
    }
    if (METACHAR_RE.test(arg) || /\|\|/.test(arg) || /&&/.test(arg) || /\\/.test(arg)) {
      return { ok: false, error: `arg rejected (shell metacharacter): '${arg.slice(0, 80)}'` };
    }
  }
  if (command === 'git' && args.length > 0 &&
      GIT_DENIED_SUBCOMMANDS.has(String(args[0]).toLowerCase())) {
    return { ok: false, status: 403, error: `git subcommand '${args[0]}' is not allow-listed` };
  }
  let timeoutMs = body.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : Number(body.timeoutMs);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return { ok: false, error: 'timeoutMs must be a positive number' };
  }
  timeoutMs = Math.min(Math.floor(timeoutMs), MAX_TIMEOUT_MS);
  return { ok: true, command, args, timeoutMs };
}

// cwd stays inside the workspace: resolve against rootDir and verify with
// path.relative (a startsWith prefix test is bypassable via siblings).
function resolveJailedCwd(rootDir, requested) {
  const workspace = path.resolve(rootDir || path.join(__dirname, '..', '..'));
  if (requested == null || requested === '') return { ok: true, cwd: workspace };
  const abs = path.resolve(workspace, String(requested));
  const rel = path.relative(workspace, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { ok: false, error: 'cwd must stay inside the workspace' };
  }
  return { ok: true, cwd: abs };
}

// ─── Exec (no shell: execFile with shell:false default) ───
function runTerminalExec(command, args, options = {}) {
  const cwd = options.cwd || process.cwd();
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  return new Promise((resolve) => {
    execFile(command, args, {
      cwd, timeout: timeoutMs, shell: false, windowsHide: true,
      maxBuffer: MAX_OUTPUT_BYTES
    }, (error, stdout, stderr) => {
      const cap = (s) => {
        const str = String(s || '');
        return str.length > MAX_OUTPUT_BYTES
          ? { text: str.slice(0, MAX_OUTPUT_BYTES), truncated: true }
          : { text: str, truncated: false };
      };
      const out = cap(stdout);
      const err = cap(stderr);
      if (error) {
        resolve({
          success: false, exitCode: typeof error.code === 'number' ? error.code : 1,
          stdout: out.text, stdoutTruncated: out.truncated,
          stderr: err.text, stderrTruncated: err.truncated,
          error: error.killed ? `timed out after ${timeoutMs}ms` : String(error.message).slice(0, 500)
        });
      } else {
        resolve({
          success: true, exitCode: 0,
          stdout: out.text, stdoutTruncated: out.truncated,
          stderr: err.text, stderrTruncated: err.truncated
        });
      }
    });
  });
}

// ─── Dispatcher (same handler signature as lib/api/*_routes.js) ───
async function handleTerminalRequest(pathname, req, readBody, sendJSON, sendText, rootDir) {
  if (!pathname.startsWith('/api/terminal/')) return null;
  if (!isTerminalAuthorized(req)) {
    logExec({ command: null, success: false, status: 401, error: 'unauthorized' });
    return sendJSON(401, { success: false, error: 'Unauthorized: valid X-Vibe-Auth token required' });
  }
  if (pathname === '/api/terminal/allowlist' && req.method === 'GET') {
    return sendJSON(200, { success: true, allowList: ALLOW_LIST });
  }
  if (pathname === '/api/terminal/log' && req.method === 'GET') {
    return sendJSON(200, { success: true, count: _execLog.length, entries: getTerminalLog() });
  }
  if (pathname === '/api/terminal/exec') {
    if (req.method !== 'POST') return sendText(405, 'Method Not Allowed');
    const body = await readBody();
    if (body && body._error) return sendJSON(400, { success: false, error: body._error });
    const checked = validateTerminalExec(body);
    if (!checked.ok) {
      logExec({ command: body && body.command, success: false, status: checked.status || 400, error: checked.error });
      return sendJSON(checked.status || 400, { success: false, error: checked.error });
    }
    const jailed = resolveJailedCwd(rootDir, body.cwd);
    if (!jailed.ok) {
      logExec({ command: checked.command, success: false, status: 403, error: jailed.error });
      return sendJSON(403, { success: false, error: jailed.error });
    }
    const result = await runTerminalExec(checked.command, checked.args, { cwd: jailed.cwd, timeoutMs: checked.timeoutMs });
    logExec({ command: checked.command, args: checked.args.length, cwd: path.relative(path.resolve(rootDir || process.cwd()), jailed.cwd) || '.', success: result.success, status: result.exitCode });
    return sendJSON(200, { success: result.success, ...result });
  }
  return sendJSON(404, { success: false, error: `Terminal endpoint '${pathname}' not found. Available: /api/terminal/exec, /api/terminal/allowlist, /api/terminal/log` });
}

module.exports = {
  handleTerminalRequest,
  isTerminalAuthorized,
  validateTerminalExec,
  resolveJailedCwd,
  runTerminalExec,
  getTerminalLog,
  _clearTerminalLog,
  TERMINAL_ALLOW_LIST: Object.keys(ALLOW_LIST)
};
