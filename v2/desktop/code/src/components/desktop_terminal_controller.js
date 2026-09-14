/**
 * Desktop Terminal Controller (renderer-safe).
 *
 * Small allow-listed terminal panel backend for the desktop app:
 *  - Local commands ONLY: status | heal | export | fix
 *  - Delegates ALL opencode work to lib/opencode_bridge via the local
 *    REST worker at http://127.0.0.1:42069 /api/opencode/* (fetch only).
 *  - NEVER spawns shells from the renderer: no child_process, no spawn,
 *    no exec, no `sh -c`. User input is shell-escaped before it is echoed
 *    or placed into request payloads, and payloads go through fetch/JSON.
 *  - Fail-open when opencode is disabled/unreachable: every entry point
 *    returns { success:false, ... } and logs a friendly line instead of
 *    throwing, so the dashboard never breaks.
 */

'use strict';

var TERMINAL_ALLOW_LIST = ['status', 'heal', 'export', 'fix'];
var DEFAULT_API_BASE = 'http://127.0.0.1:42069';
var MAX_INPUT_LEN = 500;
var MAX_LOG_LEN = 4000;

/** Shell-escape untrusted input for safe echo/display + payload use. */
function shellEscapeTerminalInput(value) {
  var s = String(value == null ? '' : value);
  if (s.length > MAX_INPUT_LEN) s = s.slice(0, MAX_INPUT_LEN);
  // Strip control chars / newlines first (single-command guardrail).
  s = s.replace(/[\r\n\0]/g, ' ').trim();
  if (!s) return "''";
  // Escape every shell metacharacter; safe even though we never exec.
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/** Split raw terminal input into { cmd, rest }. */
function parseTerminalInput(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return { cmd: '', rest: '' };
  var sp = s.search(/\s/);
  if (sp === -1) return { cmd: s.toLowerCase(), rest: '' };
  return { cmd: s.slice(0, sp).toLowerCase(), rest: s.slice(sp + 1).trim() };
}

function isAllowedTerminalCommand(cmd) {
  return TERMINAL_ALLOW_LIST.indexOf(String(cmd || '').toLowerCase()) !== -1;
}

function resolveFetch(fetchFn) {
  if (typeof fetchFn === 'function') return fetchFn;
  if (typeof fetch === 'function') return fetch;
  return null;
}

function safeLog(logSystemMessage, msg, kind) {
  try {
    if (typeof logSystemMessage === 'function') logSystemMessage(msg, kind || 'system');
  } catch (e) { /* log surface must never throw */ }
}

/** Render a terminal result onto the existing dashboard log surface. */
function renderTerminalOutput(cmd, data, logSystemMessage) {
  var name = String(cmd || 'terminal');
  try {
    if (!data) {
      safeLog(logSystemMessage, '[' + name + '] no response.', 'error');
      return;
    }
    if (data.disabled) {
      safeLog(logSystemMessage, '[' + name + '] OpenCode is disabled; tick Enable to use it. Nothing ran.', 'warning');
      return;
    }
    if (name === 'status') {
      var oc = data.opencode || data;
      var line = '[status] enabled=' + !!oc.enabled + ' mode=' + (oc.mode || '?') +
        ' available=' + !!oc.available +
        (oc.version ? ' version=' + oc.version : '') +
        (oc.mode === 'server' ? ' serverReachable=' + !!oc.serverReachable : '');
      safeLog(logSystemMessage, line, oc.enabled && oc.available ? 'system' : 'warning');
      if (oc.hint) safeLog(logSystemMessage, '[status] ' + String(oc.hint).slice(0, MAX_LOG_LEN), 'warning');
      return;
    }
    var summary = '';
    if (typeof data === 'string') summary = data;
    else if (data.runId) summary = 'runId=' + data.runId + ' status=' + (data.status || 'started');
    else if (data.run && data.run.runId) summary = 'runId=' + data.run.runId + ' status=' + (data.run.status || '?');
    else if (data.mdPath) summary = (data.bugCount || 0) + ' bug(s) -> ' + data.mdPath;
    else if (data.diff && Array.isArray(data.diff.files)) summary = 'changed: ' + (data.diff.files.join(', ') || 'no git diff');
    else if (data.gitDiff && Array.isArray(data.gitDiff.files)) summary = 'changed: ' + (data.gitDiff.files.join(', ') || 'no git diff');
    else if (data.error) summary = data.error;
    else summary = JSON.stringify(data).slice(0, MAX_LOG_LEN);
    var ok = !!data.success;
    safeLog(logSystemMessage, '[' + name + '] ' + String(summary).slice(0, MAX_LOG_LEN), ok ? 'system' : 'error');
    if (!ok && data.hint) safeLog(logSystemMessage, '[' + name + '] ' + String(data.hint).slice(0, MAX_LOG_LEN), 'warning');
  } catch (e) {
    safeLog(logSystemMessage, '[' + name + '] render failed: ' + e.message, 'error');
  }
}

async function fetchJson(fetchFn, url, options, timeoutMs) {
  var controller = null;
  var timer = null;
  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timer = setTimeout(function () { try { controller.abort(); } catch (e) {} }, timeoutMs || 30000);
    }
    var res = await fetchFn(url, Object.assign({}, options || {}, controller ? { signal: controller.signal } : {}));
    var text = await res.text();
    var body = null;
    try { body = text ? JSON.parse(text) : null; } catch (e) { body = { success: res.ok, raw: text.slice(0, MAX_LOG_LEN) }; }
    return body;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Run one allow-listed local command via the 127.0.0.1:42069 worker.
 * Fail-open: disabled/unreachable opencode -> friendly log + { success:false }.
 * Never spawns a shell; user input travels only inside JSON fetch bodies.
 */
async function runLocalCommand(cmd, options) {
  var opts = options || {};
  var logSystemMessage = opts.logSystemMessage;
  var apiBase = String(opts.apiBase || DEFAULT_API_BASE).replace(/\/$/, '');
  var name = String(cmd || '').toLowerCase().trim();

  if (!isAllowedTerminalCommand(name)) {
    safeLog(logSystemMessage, "[terminal] refused '" + String(cmd || '').slice(0, 80) +
      "': allowed commands are " + TERMINAL_ALLOW_LIST.join(', ') + '.', 'error');
    return { success: false, error: 'Command not allow-listed. Use: ' + TERMINAL_ALLOW_LIST.join(', ') };
  }

  var fetchFn = resolveFetch(opts.fetchFn);
  if (!fetchFn) {
    safeLog(logSystemMessage, '[terminal] fetch unavailable in this view; cannot reach the local worker.', 'error');
    return { success: false, error: 'fetch unavailable' };
  }

  // Echo the sanitized command (escaped, truncated) to the log surface.
  var echoedArgs = opts.args != null ? String(opts.args) : (opts.rawRest != null ? String(opts.rawRest) : '');
  if (echoedArgs) safeLog(logSystemMessage, '$ ' + name + ' ' + shellEscapeTerminalInput(echoedArgs), 'system');
  else safeLog(logSystemMessage, '$ ' + name, 'system');

  try {
    // Fail-open gate: ask the worker for opencode status first.
    var status = await fetchJson(fetchFn, apiBase + '/api/opencode/status', { method: 'GET' }, 8000);
    var oc = (status && status.opencode) ? status.opencode : status;
    if (!oc || oc.enabled === false) {
      var msg = '[terminal] OpenCode is disabled; tick Enable to use it. Nothing ran.';
      safeLog(logSystemMessage, msg, 'warning');
      return { success: false, disabled: true, error: 'OpenCode disabled' };
    }

    var data = null;
    if (name === 'status') {
      data = status;
    } else if (name === 'export') {
      data = await fetchJson(fetchFn, apiBase + '/api/opencode/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: opts.gameId,
          instructions: opts.instructions,
          testCommand: opts.testCommand,
          bugIds: opts.bugIds,
          includeFileContents: !!opts.includeFileContents
        })
      }, 30000);
    } else if (name === 'fix') {
      data = await fetchJson(fetchFn, apiBase + '/api/opencode/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: opts.gameId,
          instructions: opts.instructions,
          testCommand: opts.testCommand,
          bugIds: opts.bugIds,
          sessionId: opts.sessionId
        })
      }, 600000);
    } else if (name === 'heal') {
      data = await fetchJson(fetchFn, apiBase + '/api/opencode/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: opts.gameId,
          instructions: opts.instructions,
          testCommand: opts.testCommand,
          bugIds: opts.bugIds,
          maxIterations: Math.min(parseInt(opts.maxIterations, 10) || 3, 10),
          instance: opts.instance || 'same'
        })
      }, 30000);
    }

    renderTerminalOutput(name, data, logSystemMessage);
    return data || { success: false, error: 'Empty worker response' };
  } catch (e) {
    // Fail-open: worker down / opencode missing must never break the panel.
    safeLog(logSystemMessage, '[terminal] ' + name + ' unreachable: ' + (e && e.message ? e.message : e) +
      ' Is the local worker running on 127.0.0.1:42069?', 'error');
    return { success: false, error: String((e && e.message) || e) };
  }
}

/** Best-effort wiring for an optional terminal panel (input + run + output). */
function setupTerminalPanel(ctx) {
  try {
    var el = (ctx && ctx.el) || {};
    if (!el.terminalInput || !el.terminalRun) return false;
    if (el.terminalRun.dataset && el.terminalRun.dataset.terminalWired === '1') return true;
    el.terminalRun.addEventListener('click', function () {
      var parsed = parseTerminalInput(el.terminalInput.value);
      runLocalCommand(parsed.cmd, {
        rawRest: parsed.rest,
        args: parsed.rest,
        gameId: ctx.gameId,
        logSystemMessage: ctx.logSystemMessage,
        apiBase: ctx.apiBase
      });
    });
    el.terminalInput.addEventListener('keydown', function (ev) {
      if (ev && ev.key === 'Enter') {
        ev.preventDefault();
        el.terminalRun.click();
      }
    });
    if (el.terminalRun.dataset) el.terminalRun.dataset.terminalWired = '1';
    return true;
  } catch (e) { return false; }
}

module.exports = {
  TERMINAL_ALLOW_LIST: TERMINAL_ALLOW_LIST,
  DEFAULT_API_BASE: DEFAULT_API_BASE,
  shellEscapeTerminalInput: shellEscapeTerminalInput,
  parseTerminalInput: parseTerminalInput,
  isAllowedTerminalCommand: isAllowedTerminalCommand,
  renderTerminalOutput: renderTerminalOutput,
  runLocalCommand: runLocalCommand,
  setupTerminalPanel: setupTerminalPanel
};
