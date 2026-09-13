'use strict';

/**
 * vcwcode-eval-guard.js — timeout wrapper for renderer JS evaluation.
 *
 * Runtime helper: every `webContents.executeJavaScript` call must go
 * through `withEvalTimeout()` so a hung page can never wedge the desktop
 * automation loop. Rejections carry a short `code` for the caller to log.
 *
 * Pure: no Electron imports (the evaluate fn is injected) — safe to
 * unit-test with node.
 */

const EVAL_TIMEOUT_MS = 8000;

/**
 * Race an evaluate-style function against a timeout.
 * @param {() => Promise<any>} evaluate — injected js-evaluation thunk.
 * @param {number} [timeoutMs=EVAL_TIMEOUT_MS]
 * @returns {Promise<{ ok: true, value: any } | { ok: false, code: 'eval-timeout' | 'eval-error', message: string }>}
 */
function withEvalTimeout(evaluate, timeoutMs) {
  const ms = Number(timeoutMs) > 0 ? Number(timeoutMs) : EVAL_TIMEOUT_MS;
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, code: 'eval-timeout', message: `eval exceeded ${ms}ms` });
    }, ms);
    Promise.resolve()
      .then(evaluate)
      .then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ ok: true, value });
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({
            ok: false,
            code: 'eval-error',
            message: err && err.message ? String(err.message) : String(err),
          });
        },
      );
  });
}

module.exports = { EVAL_TIMEOUT_MS, withEvalTimeout };
