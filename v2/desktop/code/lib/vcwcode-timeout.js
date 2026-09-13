'use strict';
// vcwcode timeout helper — mirrors the main.js 8s Promise.race timeout pattern.

const DEFAULT_TIMEOUT_MS = 8000;

function withTimeout(promise, ms, label) {
  const timeoutMs = typeof ms === 'number' && ms > 0 ? ms : DEFAULT_TIMEOUT_MS;
  const name = typeof label === 'string' && label.length > 0 ? label : 'operation';
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(name + ' timed out after ' + timeoutMs + 'ms'));
    }, timeoutMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([Promise.resolve(promise), timeout]).then(
    (value) => {
      if (timer) clearTimeout(timer);
      return value;
    },
    (err) => {
      if (timer) clearTimeout(timer);
      throw err;
    }
  );
}

module.exports = { withTimeout, DEFAULT_TIMEOUT_MS };
