/**
 * AI Vision Mirror state.
 *
 * Single-process recorder for everything the mirror overlay needs:
 * where the bot mouse is (0-1000 normalized coords + action label),
 * what keys the bot pressed recently, and a short trail of bot actions.
 *
 * Lives in the dashboard renderer (required by action_dispatcher and the
 * vision mirror panel - same process, shared instance). Snapshots are
 * pushed to the main process for the /api/vision/state HTTP endpoint.
 * Pure Node - safe to require in tests.
 */

const MAX_KEYS = 10;
const MAX_TRAIL = 8;
const MAX_PATH = 40;
const KEY_TTL_MS = 6000;

let pointer = { x: 500, y: 500, label: 'idle', visible: false, ts: 0 };
let keys = [];  // [{ key, kind, ts }]
let trail = []; // [{ summary, ts }]
let path = [];  // [[x, y], ...] recent pointer positions for the trail line

function clamp(n) {
  n = Math.round(Number(n));
  if (!isFinite(n)) return 500;
  return Math.max(0, Math.min(1000, n));
}

function recordPointer(nx, ny, label, visible) {
  pointer = {
    x: clamp(nx),
    y: clamp(ny),
    label: String(label || 'move'),
    visible: visible === undefined ? pointer.visible : !!visible,
    ts: Date.now()
  };
  path.push([pointer.x, pointer.y]);
  if (path.length > MAX_PATH) path.splice(0, path.length - MAX_PATH);
  return pointer;
}

function setPointerVisible(visible) {
  pointer.visible = !!visible;
  pointer.ts = Date.now();
  return pointer;
}

function recordKeys(key, kind) {
  keys.unshift({ key: String(key), kind: kind || 'press', ts: Date.now() });
  if (keys.length > MAX_KEYS) keys.length = MAX_KEYS;
  return keys;
}

function recordAction(summary) {
  trail.unshift({ summary: String(summary).slice(0, 120), ts: Date.now() });
  if (trail.length > MAX_TRAIL) trail.length = MAX_TRAIL;
  return trail;
}

function getSnapshot() {
  const now = Date.now();
  return {
    pointer: { ...pointer },
    keys: keys.filter((k) => now - k.ts < KEY_TTL_MS).map((k) => ({ ...k })),
    trail: trail.map((t) => ({ ...t })),
    path: path.slice(),
    ts: now
  };
}

function reset() {
  pointer = { x: 500, y: 500, label: 'idle', visible: false, ts: 0 };
  keys = [];
  trail = [];
  path = [];
}

module.exports = {
  MAX_KEYS,
  MAX_TRAIL,
  MAX_PATH,
  KEY_TTL_MS,
  recordPointer,
  setPointerVisible,
  recordKeys,
  recordAction,
  getSnapshot,
  reset
};
