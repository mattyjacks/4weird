/**
 * Shared replay harness for self-generated trace tests (committed once).
 *
 * Every `tests/generated/trace-*.js` file is a ~1KB digest + fixture path;
 * THIS module does the actual replay work, so per-trace token cost stays flat
 * no matter how long the recorded session was. Read this file once; never
 * paste a `*.test.json` fixture into model context.
 *
 * Versioned: generated tests assert VERSION === DIGEST.harness, so an
 * incompatible harness change fails loudly instead of silently.
 */
'use strict';

const assert = require('assert');
const path = require('path');

const VERSION = 1;

const ROOT = process.env.VIBECODEWORKER_ROOT || path.join(__dirname, '..');
const sv = require(path.join(ROOT, 'src', 'components', 'stage_view'));

function fnv1a(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
}

// Canonical encoding of one compact sample ([0,x,y] move, [1,x,y] click,
// [2,key] key). Must match trace_test_gen.canonicalSample exactly.
function canonicalSample(c) {
  if (!Array.isArray(c)) return null;
  if (c[0] === 0 || c[0] === 1) {
    const x = Math.round(Number(c[1])), y = Math.round(Number(c[2]));
    if (!isFinite(x) || !isFinite(y)) return null;
    return (c[0] === 0 ? 'm' : 'c') + ',' + x + ',' + y;
  }
  if (c[0] === 2) {
    const k = String(c[1] || '').slice(0, 24);
    return k ? 'k,' + k : null;
  }
  return null;
}

function expand(c) {
  return c[0] === 0 ? { k: 'move', x: c[1], y: c[2] }
    : c[0] === 1 ? { k: 'click', x: c[1], y: c[2] }
    : { k: 'key', key: c[1] };
}

function synthTraceBoxes(clickEvents) {
  return (clickEvents || []).slice(0, 10).map((e, i) => ({
    x: e.x, y: e.y,
    w: 60 + ((i * 37) % 180), h: 50 + ((i * 53) % 140),
    label: 'trace-click', kind: 'other'
  }));
}

const r4 = (n) => Math.round(Number(n) * 1e4) / 1e4;

// Replay a trace fixture against its digest. Throws on any mismatch.
function replayTrace(data, digest) {
  assert(data && data.v === 1, 'fixture version');
  assert.strictEqual(typeof data._note, 'string', 'fixture carries the runtime-only note');
  assert.ok(Array.isArray(data.samples) && data.samples.length > 0, 'fixture has samples');
  // 1. Integrity: hash catches corruption/tampering without inlining samples.
  assert.strictEqual(fnv1a(data.samples.map(canonicalSample).join(';')), digest.samplesHash, 'trace integrity hash');
  // 2. Drain replay: every recorded sample still parses.
  const events = sv.parseDrainedEvents(data.samples.map(expand));
  assert.strictEqual(events.length, digest.validSamples, 'drain replays all samples');
  // 3. Click zones: same hottest zone, same spread.
  const zones = {};
  for (const e of events) {
    if (e.k !== 'click') continue;
    const z = sv.heatZoneName(e.x, e.y);
    zones[z] = (zones[z] || 0) + 1;
  }
  const top = Object.entries(zones).sort((a, b) => b[1] - a[1]);
  assert.strictEqual(Object.keys(zones).length, digest.zonesDistinct, 'distinct click zones');
  assert.deepStrictEqual(top.length ? top[0] : null, digest.topZone, 'hottest zone unchanged');
  // 4. Heat grid: same total, same active cells, same alpha buckets.
  const grid = new Array(576).fill(0);
  for (const pair of data.heat) grid[pair[0]] = pair[1];
  assert.strictEqual(r4(grid.reduce((n, v) => n + v, 0)), digest.heatTotal, 'heat total');
  const view = sv.heatActiveCells(grid, 32, 18);
  assert.strictEqual(view.cells.length, digest.heatCells, 'active heat cells');
  assert.strictEqual(view.max, digest.heatMax, 'heat max');
  assert.strictEqual(sv.bucketHeatCellsByAlpha(view.cells).size, digest.heatBuckets, 'heat alpha buckets');
  // 5. Decay: same fade curve on the recorded grid.
  const faded = grid.slice();
  const dr = sv.decayHeatValues(faded, 0.5, 0.5);
  assert.strictEqual(dr.cleared, digest.decay.cleared, 'decay cleared');
  assert.strictEqual(dr.active, digest.decay.active, 'decay active');
  assert.strictEqual(r4(faded.reduce((n, v) => n + v, 0)), digest.decay.total, 'decayed total');
  // 6. Takeover notes round-trip.
  const s = data.session;
  const sum = sv.summarizeTakeover({
    startedAt: 0, endedAt: s.durationS * 1000, moves: s.moves, clicks: s.clicks,
    keys: s.keys, zones: s.zones, distance: s.distance, shots: s.shots
  });
  assert.strictEqual(sv.fmtDuration(s.durationS), digest.durStr, 'duration format');
  assert.deepStrictEqual(
    { durationS: sum.durationS, moves: sum.moves, clicks: sum.clicks, keyCount: sum.keyCount },
    digest.sum, 'takeover notes');
  // 7. Box cull smoke from the trace's own clicks.
  const culled = sv.cullObjects(synthTraceBoxes(events.filter((e) => e.k === 'click')), sv.MAX_BOXES);
  assert.strictEqual(culled.length, digest.cullN, 'culled box count');
  for (let i = 1; i < culled.length; i++) {
    assert.ok(culled[i - 1].w * culled[i - 1].h >= culled[i].w * culled[i].h, 'culled sorted by area desc');
  }
  assert.ok(culled.every((b) => b.label === 'trace-click'), 'culled labels');
  return { moves: digest.moves, clicks: digest.clicks, heatTotal: digest.heatTotal };
}

module.exports = { VERSION, replayTrace, fnv1a, canonicalSample };
