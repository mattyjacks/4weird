// vcwcode-timeout-note.js — 30s request timeout + AbortController snippet.
// Policy: every API request times out after 30_000 ms server-side.
// Client rule: mirror it with AbortController so hung calls fail fast.
'use strict';

const REQUEST_TIMEOUT_MS = 30000;

function fetchWithTimeout(url, options, timeoutMs) {
  const ms = Number(timeoutMs) > 0 ? Number(timeoutMs) : REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const impl = (typeof fetch === 'function') ? fetch : null;
  if (!impl) {
    clearTimeout(timer);
    return Promise.reject(new Error('fetchWithTimeout: global fetch unavailable'));
  }
  const merged = Object.assign({}, options, { signal: controller.signal });
  return impl(url, merged).finally(() => clearTimeout(timer));
}

// Example:
// const res = await fetchWithTimeout('http://127.0.0.1:42069/api/status', {}, 30000)
//   .catch((e) => { if (e && e.name === 'AbortError') throw new Error('request timed out (30s)'); throw e; });

module.exports = { REQUEST_TIMEOUT_MS, fetchWithTimeout };
