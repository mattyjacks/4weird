/* GraveGain4D worlds: timeline branches + time-travel stack (time-only; alternates are 5D).
 * Vanilla IIFE. ADDITIVE to window.GraveGain4DWorlds created by dungeon-generator.js
 * (loads independently and never overwrites existing keys).
 * Fail-open: every public function guards inputs, never throws, and every
 * store is bounded (max 50 snapshots, 5 ghosts). Original code.
 */
(function () {
  'use strict';

  var MAX_SNAPSHOTS = 50;
  var MAX_GHOSTS = 5;
  var MAX_PATH_POINTS = 200;

  // Snapshot stack: deep-cloned state frames for time-travel rewind.
  var snapshots = [];
  // Ghost trails: recorded ball paths per hole, kept bounded.
  var ghosts = [];
  // Named forks: label -> snapshot index at fork time.
  var forks = {};

  function clone(value) {
    try {
      if (value === undefined) return undefined;
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  function now() {
    try {
      return Date.now();
    } catch (e) {
      return 0;
    }
  }

  // Push a deep-cloned snapshot frame. Returns the new stack depth, or the
  // current depth (fail-open) when state cannot be cloned.
  function pushSnapshot(state) {
    try {
      if (state === undefined) return snapshots.length;
      var frame = clone(state);
      if (frame === null && state !== null) return snapshots.length;
      snapshots.push({ at: now(), state: frame });
      while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
      return snapshots.length;
    } catch (e) {
      return snapshots.length;
    }
  }

  // Pop the newest snapshot and return its state (deep-cloned again so the
  // caller cannot mutate the stored frame). Returns null when empty.
  function rewind() {
    try {
      if (!snapshots.length) return null;
      var frame = snapshots.pop();
      var out = clone(frame.state);
      return (out === null && frame.state !== null) ? frame.state : out;
    } catch (e) {
      return null;
    }
  }

  // Fork a timeline branch: records the current stack depth under a label
  // so the player can name parallel timelines (same world, rewound time —
  // NOT an alternate world; those are GraveGain5D). Fail-open: bad labels
  // are ignored and return null; good ones return { label, depth }.
  function forkTimeline(label) {
    try {
      if (typeof label !== 'string' || !label.trim()) return null;
      var key = label.trim().slice(0, 64);
      forks[key] = snapshots.length;
      return { label: key, depth: snapshots.length };
    } catch (e) {
      return null;
    }
  }

  // List recorded ghost trails (newest first), safe copies only.
  function listGhosts() {
    try {
      return ghosts.slice().reverse().map(function (g) {
        return { hole: g.hole, at: g.at, path: clone(g.path) || [] };
      });
    } catch (e) {
      return [];
    }
  }

  // Record a ball path on a hole as a ghost trail. Path points are capped;
  // the ghost store is capped at MAX_GHOSTS (oldest evicted). Returns the
  // ghost count, fail-open.
  function recordShot(hole, path) {
    try {
      var h = Number(hole);
      if (!isFinite(h)) return ghosts.length;
      var pts = Array.isArray(path) ? path.slice(0, MAX_PATH_POINTS) : [];
      ghosts.push({ hole: Math.floor(h), at: now(), path: clone(pts) || [] });
      while (ghosts.length > MAX_GHOSTS) ghosts.shift();
      return ghosts.length;
    } catch (e) {
      return ghosts.length;
    }
  }

  function listForks() {
    try {
      return Object.keys(forks).map(function (k) { return { label: k, depth: forks[k] }; });
    } catch (e) {
      return [];
    }
  }

  function depth() {
    try {
      return snapshots.length;
    } catch (e) {
      return 0;
    }
  }

  var root = (typeof window !== 'undefined') ? window : this;
  root.GraveGain4DWorlds = root.GraveGain4DWorlds || {};
  if (!root.GraveGain4DWorlds.pushSnapshot) root.GraveGain4DWorlds.pushSnapshot = pushSnapshot;
  if (!root.GraveGain4DWorlds.rewind) root.GraveGain4DWorlds.rewind = rewind;
  if (!root.GraveGain4DWorlds.forkTimeline) root.GraveGain4DWorlds.forkTimeline = forkTimeline;
  if (!root.GraveGain4DWorlds.listGhosts) root.GraveGain4DWorlds.listGhosts = listGhosts;
  if (!root.GraveGain4DWorlds.recordShot) root.GraveGain4DWorlds.recordShot = recordShot;
  if (!root.GraveGain4DWorlds.listForks) root.GraveGain4DWorlds.listForks = listForks;
  if (!root.GraveGain4DWorlds.snapshotDepth) root.GraveGain4DWorlds.snapshotDepth = depth;
  if (!root.GraveGain4DWorlds.timelineLimits) {
    root.GraveGain4DWorlds.timelineLimits = { maxSnapshots: MAX_SNAPSHOTS, maxGhosts: MAX_GHOSTS };
  }
  if (!root.GraveGain4DWorlds.timelinesVersion) root.GraveGain4DWorlds.timelinesVersion = '4d-timelines-1';
})();
