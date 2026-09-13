'use strict';

/**
 * vcwcode-screenshot-guard.js — renderer screenshot call shape + fallback.
 *
 * Runtime helper documenting the guarded screenshot contract used by the
 * desktop renderer:
 *
 *   withRendererTimeout Shape:
 *     captureScreenshot(options?: { timeoutMs?: number, source?: string })
 *       -> Promise<{ ok: true, pngBase64: string }
 *                 | { ok: false, reason: 'timeout' | 'denied' | 'error' }>
 *
 * Capture fallback note: when the guarded capture rejects or times out,
 * callers MUST fall back to the last-known-good frame (cached data URL)
 * and surface a non-fatal `screenshot-stale` status — never throw into the
 * game loop, and never retry more than once per tick.
 *
 * Pure doc/shape module: no Electron imports, no side effects.
 */

const SCREENSHOT_TIMEOUT_MS = 5000;
const SCREENSHOT_STALE_EVENT = 'screenshot-stale';
const MAX_RETRIES_PER_TICK = 1;

/**
 * Build the canonical fallback result for a failed capture.
 * @param {'timeout'|'denied'|'error'} reason
 * @param {string|null} lastGoodFrame — cached data URL or null.
 */
function staleFallback(reason, lastGoodFrame) {
  return {
    ok: false,
    reason,
    stale: true,
    event: SCREENSHOT_STALE_EVENT,
    frame: lastGoodFrame || null,
    retriesLeft: 0,
    maxRetriesPerTick: MAX_RETRIES_PER_TICK,
  };
}

module.exports = {
  SCREENSHOT_TIMEOUT_MS,
  SCREENSHOT_STALE_EVENT,
  MAX_RETRIES_PER_TICK,
  staleFallback,
};
