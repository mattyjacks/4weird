/**
 * remote-control-ipc.js — desktop remote-control IPC command envelope.
 *
 * Vanilla JS (CommonJS) module, same style as the sibling automation files
 * under `v2/desktop/code/src/modules/`. Sends vanilla command envelopes
 * `{ type, payload, nonce }` over the desktop IPC channel with an explicit
 * command allowlist, per-command timeouts, and fail-open behavior when the
 * host is unreachable. Never logs secrets: payload values and key-shaped
 * strings are redacted before anything reaches the console.
 *
 * Usage:
 *   const remote = require('./remote-control-ipc');
 *
 *   if (!remote.isHostAvailable()) {
 *     console.log('no desktop host; running headless');
 *     return;
 *   }
 *
 *   const reply = await remote.sendCommand('ping', { note: 'hello' }, {
 *     timeoutMs: 5000,
 *   });
 *   console.log('reply ok:', reply.ok);
 *
 *   // Headless / reviewer round-trip (no Electron needed):
 *   const loopback = remote.createLoopbackTransport();
 *   const echoed = await remote.sendCommand('ping', { n: 1 }, {
 *     transport: loopback,
 *     timeoutMs: 1000,
 *   });
 *
 * Security notes:
 * - Only commands in `ALLOWED_COMMANDS` are ever sent. Anything else
 *   resolves fail-open with `reason: 'not-allowed'` and is never transmitted.
 * - All console output passes through `redactSecrets()`; only the command
 *   type, nonce, payload key names, and counts are logged — never values.
 * - The transport is inherited from Electron's `ipcRenderer` when present;
 *   otherwise the module is fail-open (no throw, `delivered: false`).
 */

'use strict';

// Desktop IPC channel carrying remote-control envelopes.
const REMOTE_CONTROL_CHANNEL = 'remote-control';

// Explicit allowlist: the only command types this module will transmit.
// Consumers needing a new command file a QUEUE request; never edit cross-lane.
const ALLOWED_COMMANDS = Object.freeze([
  'ping',
  'get-state',
  'focus',
  'blur',
  'reload',
  'navigate',
  'set-zoom',
  'capture-shot',
]);

// Per-command timeout defaults (ms). `sendCommand` opts.timeoutMs overrides.
const COMMAND_TIMEOUTS = Object.freeze({
  ping: 5000,
  'get-state': 5000,
  focus: 8000,
  blur: 8000,
  reload: 15000,
  navigate: 15000,
  'set-zoom': 8000,
  'capture-shot': 20000,
});

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_TIMEOUT_MS = 60000;

// Secret-shaped values are redacted before any console/log output.
// NOTE: redaction applies to LOGGING only — envelope payloads carry the raw
// caller-supplied object untouched so commands are never corrupted.
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

// Log helpers: redact first, never interpolate payload objects or option
// values that could carry secrets (urls, tokens, env).
function logInfo(message) {
  try {
    console.log(`[remote-control-ipc] ${redactSecrets(message)}`);
  } catch (e) { /* logging is best-effort only */ }
}

function logError(message) {
  try {
    console.error(`[remote-control-ipc] ${redactSecrets(message)}`);
  } catch (e) { /* logging is best-effort only */ }
}

let nonceCounter = 0;

function nextNonce() {
  nonceCounter = (nonceCounter + 1) % 1000000;
  try {
    return `rc-${Date.now().toString(36)}-${nonceCounter.toString(36)}`;
  } catch (e) {
    return `rc-${nonceCounter.toString(36)}`;
  }
}

function isAllowedCommand(type) {
  return typeof type === 'string' && ALLOWED_COMMANDS.indexOf(type) !== -1;
}

function timeoutFor(type, overrideMs) {
  const override = Number(overrideMs);
  if (Number.isFinite(override) && override > 0) {
    return Math.min(Math.floor(override), MAX_TIMEOUT_MS);
  }
  const perCommand = Number(COMMAND_TIMEOUTS[type]);
  if (Number.isFinite(perCommand) && perCommand > 0) {
    return Math.min(Math.floor(perCommand), MAX_TIMEOUT_MS);
  }
  return DEFAULT_TIMEOUT_MS;
}

// Describe a payload for logs without leaking values: key names + counts.
function describePayload(payload) {
  try {
    if (payload == null) return 'none';
    if (typeof payload !== 'object') return typeof payload;
    const keys = Object.keys(payload);
    return `keys(${keys.length})[${keys.slice(0, 8).join(',')}]`;
  } catch (e) {
    return 'unreadable';
  }
}

/**
 * Build a command envelope. Fail-open: non-object payloads become `{}`.
 * Never throws for bad input; returns null only when the type is not allowed.
 */
function buildEnvelope(type, payload) {
  if (!isAllowedCommand(type)) return null;
  let safePayload = payload;
  if (safePayload == null) safePayload = {};
  if (typeof safePayload !== 'object') safePayload = { value: safePayload };
  return { type, payload: safePayload, nonce: nextNonce() };
}

// Resolve the default transport: Electron ipcRenderer when present,
// else an injected global (tests), else null (fail-open headless).
function defaultTransport() {
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    const electron = require('electron');
    if (electron && electron.ipcRenderer && typeof electron.ipcRenderer.invoke === 'function') {
      return electron.ipcRenderer;
    }
  } catch (e) { /* not running under Electron */ }
  try {
    const injected = typeof globalThis !== 'undefined' ? globalThis.__desktopIpc : null;
    if (injected && typeof injected.invoke === 'function') return injected;
  } catch (e) { /* ignore */ }
  return null;
}

/**
 * True when a desktop IPC host is reachable (Electron or injected).
 * Fail-open: never throws.
 */
function isHostAvailable(transport) {
  try {
    const t = transport || defaultTransport();
    return !!(t && typeof t.invoke === 'function');
  } catch (e) {
    return false;
  }
}

/**
 * In-memory loopback transport for headless reviewer round-trips.
 * Echoes `{ ok: true, echo: envelope }` after a tick. Never touches IPC.
 */
function createLoopbackTransport() {
  return {
    invoke(channel, envelope) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ok: true, channel, echo: envelope || null });
        }, 0);
        if (typeof setTimeout === 'function' && resolve) {
          // keep node alive only for the echo tick
        }
      });
    },
  };
}

/**
 * Send one whitelisted remote-control command.
 *
 * @param {string} type - must be in ALLOWED_COMMANDS.
 * @param {object} [payload] - JSON-able command arguments (never logged).
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs] - per-call timeout (caps at 60s).
 * @param {object} [opts.transport] - `{ invoke(channel, envelope) }`; defaults
 *   to Electron's ipcRenderer. Tests pass `createLoopbackTransport()`.
 * @returns {Promise<object>} resolves fail-open:
 *   `{ ok, delivered, type, nonce, reply|reason, ... }` — never rejects for
 *   host-absent / timeout / not-allowed; rejects only for programmer misuse
 *   that cannot be represented (never: type is validated into a result).
 */
function sendCommand(type, payload, opts) {
  const options = opts && typeof opts === 'object' ? opts : {};
  const timeoutMs = timeoutFor(type, options.timeoutMs);

  if (!isAllowedCommand(type)) {
    logError(`blocked non-allowlisted command (payload ${describePayload(payload)})`);
    return Promise.resolve({
      ok: false,
      delivered: false,
      type: typeof type === 'string' ? type : 'unknown',
      nonce: null,
      reason: 'not-allowed',
    });
  }

  const envelope = buildEnvelope(type, payload);
  const transport = options.transport || defaultTransport();

  if (!transport || typeof transport.invoke !== 'function') {
    logInfo(`host unreachable; fail-open for command type=${type} nonce=${envelope.nonce}`);
    return Promise.resolve({
      ok: false,
      delivered: false,
      type: envelope.type,
      nonce: envelope.nonce,
      reason: 'host-unreachable',
      timeoutMs,
    });
  }

  logInfo(`send type=${type} nonce=${envelope.nonce} payload=${describePayload(envelope.payload)} timeout=${timeoutMs}ms`);

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      logError(`timeout type=${type} nonce=${envelope.nonce} after ${timeoutMs}ms`);
      resolve({
        ok: false,
        delivered: true,
        type: envelope.type,
        nonce: envelope.nonce,
        reason: 'timeout',
        timeoutMs,
      });
    }, timeoutMs);
    if (timer && typeof timer.unref === 'function') {
      try { timer.unref(); } catch (e) { /* ignore */ }
    }

    let invoked = null;
    try {
      invoked = transport.invoke(REMOTE_CONTROL_CHANNEL, envelope);
    } catch (e) {
      if (!settled) {
        settled = true;
        try { clearTimeout(timer); } catch (err) { /* ignore */ }
        logError(`invoke threw type=${type} nonce=${envelope.nonce}: ${e && e.message ? e.message : e}`);
        resolve({
          ok: false,
          delivered: false,
          type: envelope.type,
          nonce: envelope.nonce,
          reason: 'invoke-error',
          timeoutMs,
        });
      }
      return;
    }

    Promise.resolve(invoked).then(
      (reply) => {
        if (settled) return;
        settled = true;
        try { clearTimeout(timer); } catch (e) { /* ignore */ }
        resolve({
          ok: true,
          delivered: true,
          type: envelope.type,
          nonce: envelope.nonce,
          reply: reply == null ? null : reply,
          timeoutMs,
        });
      },
      (err) => {
        if (settled) return;
        settled = true;
        try { clearTimeout(timer); } catch (e) { /* ignore */ }
        logError(`reply error type=${type} nonce=${envelope.nonce}: ${err && err.message ? err.message : err}`);
        resolve({
          ok: false,
          delivered: true,
          type: envelope.type,
          nonce: envelope.nonce,
          reason: 'reply-error',
          timeoutMs,
        });
      }
    );
  });
}

module.exports = {
  REMOTE_CONTROL_CHANNEL,
  ALLOWED_COMMANDS,
  COMMAND_TIMEOUTS,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  buildEnvelope,
  isAllowedCommand,
  timeoutFor,
  isHostAvailable,
  createLoopbackTransport,
  sendCommand,
  // Test/diagnostic helpers (not part of the required surface).
  redactSecrets,
  describePayload,
};
