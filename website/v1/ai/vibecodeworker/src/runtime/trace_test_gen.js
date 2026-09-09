/**
 * Trace-test generator: turns a human takeover session into a regression test
 * the app can run on itself (`npm run test:traces`).
 *
 * Token-smart by design — every trace produces TWO artifacts:
 *   1. `trace-<ts>-<slug>.js` — tiny, model-visible. Embeds only a DIGEST
 *      (counts, top zones/keys, heat totals, hashes, a few exemplars). This is
 *      the entire reviewable surface, typically well under 1k tokens.
 *   2. `trace-<ts>-<slug>.test.json` — RUNTIME-ONLY fixture holding the full
 *      compacted samples + heat grid. It is loaded from disk when the test
 *      runs and must NEVER be pasted into a model context (it says so inside,
 *      via the `_note` field). This is where the bulk tokens live, and they
 *      cost nothing because no model ever reads them.
 *
 * Integrity without bulk: the digest embeds an FNV-1a hash over the canonical
 * sample encoding, so the test detects a corrupted/tampered fixture without
 * inlining a single sample. The canonicalizer, hash, and synthetic-box builder
 * are embedded into the generated file via Function.toString(), so the runtime
 * copy can never drift from the generator.
 *
 * Pure Node — safe to require in tests. stage_view.js must NOT require this
 * module (cycle); instead it exposes the raw trace input and the caller
 * composes artifacts with buildTraceArtifacts().
 */

'use strict';

const sv = require('../components/stage_view');

const TRACE_TEST_VERSION = 1;
const TEST_MARKER = 'VIBECODEWORKER-TRACE-TEST v1';
// Must match TRACE_SAMPLE_CAP in stage_view.js (takeover sample ring).
const TRACE_SAMPLE_CAP = 240;
// Hard token budget for the model-visible test file (the IPC enforces it too).
const MAX_TEST_SOURCE_BYTES = 4096;
const MAX_DATA_BYTES = 262144;

// Rough token estimate for logs (~4 chars/token). Used for reporting only.
function estimateTokens(chars) {
  return Math.max(1, Math.round(Number(chars) / 4));
}

// Self-contained FNV-1a (also embedded into generated tests via toString).
function fnv1a(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
}

// Canonical encoding of one COMPACT sample ([0,x,y] move, [1,x,y] click,
// [2,key] key). Self-contained — also embedded into generated tests.
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

// Deterministic synthetic boxes from trace clicks for the cull smoke test.
// Self-contained — also embedded into generated tests via toString.
function synthTraceBoxes(clickEvents) {
  return (clickEvents || []).slice(0, 10).map((e, i) => ({
    x: e.x, y: e.y,
    w: 60 + ((i * 37) % 180), h: 50 + ((i * 53) % 140),
    label: 'trace-click', kind: 'other'
  }));
}

// Raw drained event -> compact tuple. Drops malformed entries.
function compactRawEvent(e) {
  if (!e || typeof e !== 'object') return null;
  if (e.k === 'move' || e.k === 'click') {
    const x = Math.round(Number(e.x)), y = Math.round(Number(e.y));
    if (!isFinite(x) || !isFinite(y)) return null;
    return [e.k === 'move' ? 0 : 1, Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(1000, y))];
  }
  if (e.k === 'key') {
    const k = String(e.key || '').slice(0, 24);
    return k ? [2, k] : null;
  }
  return null;
}

// Compact tuple -> parseDrainedEvents-shaped object (replay path).
function expandCompact(c) {
  if (!Array.isArray(c)) return null;
  if (c[0] === 0) return { k: 'move', x: c[1], y: c[2] };
  if (c[0] === 1) return { k: 'click', x: c[1], y: c[2] };
  if (c[0] === 2) return { k: 'key', key: c[1] };
  return null;
}

function samplesHash(compacts) {
  return fnv1a(compacts.map(canonicalSample).join(';'));
}

function r4(n) {
  return Math.round(Number(n) * 1e4) / 1e4;
}

function slugify(game) {
  return String(game || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'game';
}

function stampFromMs(ms) {
  const d = new Date(Number(ms) || Date.now());
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

function topEntries(obj, n) {
  return Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n);
}

// Validate + freeze a takeover session into a serializable snapshot.
// session: {startedAt, endedAt, moves, clicks, keys, zones, distance, shots, samples[]}
// heatGrid: full 576-length grid (Array or typed array). Throws on empty/bad input.
function buildTraceSnapshot({ session, heatGrid, game } = {}) {
  if (!session || typeof session !== 'object') throw new Error('trace snapshot needs a session');
  const compacts = (session.samples || []).map(compactRawEvent).filter(Boolean);
  if (!compacts.length) throw new Error('empty trace: no usable input samples recorded');
  const cols = sv.HEAT_COLS, rows = sv.HEAT_ROWS;
  if (!heatGrid || heatGrid.length !== cols * rows) throw new Error('trace snapshot needs the full heat grid');
  const sparse = [];
  let heatTotal = 0;
  for (let i = 0; i < heatGrid.length; i++) {
    const v = Number(heatGrid[i]) || 0;
    if (v !== 0) { sparse.push([i, v]); heatTotal += v; }
  }
  const keys = { ...(session.keys || {}) };
  const zones = { ...(session.zones || {}) };
  const keyCount = Object.values(keys).reduce((n, c) => n + (Number(c) || 0), 0);
  const durationS = sv.summarizeTakeover({
    startedAt: session.startedAt || 0, endedAt: session.endedAt || Date.now(),
    moves: session.moves || 0, clicks: session.clicks || 0,
    keys, zones, distance: session.distance || 0, shots: session.shots || 0
  }).durationS;
  return {
    v: TRACE_TEST_VERSION,
    game: String(game || 'takeover').slice(0, 80),
    recordedAt: new Date(session.endedAt || Date.now()).toISOString(),
    endedAt: session.endedAt || Date.now(),
    durationS,
    moves: session.moves || 0, clicks: session.clicks || 0,
    keyCount, distance: r4(session.distance || 0), shots: session.shots || 0,
    keys, zones,
    samples: compacts,
    heat: sparse,
    heatTotal: r4(heatTotal)
  };
}

// Shrink a snapshot to the digest: the only trace data a model ever sees.
function buildTraceDigest(snapshot) {
  if (!snapshot || snapshot.v !== TRACE_TEST_VERSION) throw new Error('bad trace snapshot');
  if (!Array.isArray(snapshot.samples) || !snapshot.samples.length) throw new Error('empty trace snapshot');
  const events = sv.parseDrainedEvents(snapshot.samples.map(expandCompact));
  const zoneCounts = {};
  for (const e of events) {
    if (e.k !== 'click') continue;
    const z = sv.heatZoneName(e.x, e.y);
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  }
  const zoneTop = topEntries(zoneCounts, 1);
  const grid = new Array(sv.HEAT_COLS * sv.HEAT_ROWS).fill(0);
  for (const [i, v] of snapshot.heat || []) {
    if (Number.isInteger(i) && i >= 0 && i < grid.length) grid[i] = v;
  }
  const view = sv.heatActiveCells(grid, sv.HEAT_COLS, sv.HEAT_ROWS);
  const faded = grid.slice();
  const dr = sv.decayHeatValues(faded, sv.HEAT_DECAY_FACTOR, sv.HEAT_DECAY_EPSILON);
  const sessionLike = {
    startedAt: 0, endedAt: snapshot.durationS * 1000,
    moves: snapshot.moves, clicks: snapshot.clicks,
    keys: snapshot.keys, zones: snapshot.zones,
    distance: snapshot.distance, shots: snapshot.shots
  };
  const sum = sv.summarizeTakeover(sessionLike);
  const culled = sv.cullObjects(synthTraceBoxes(events.filter((e) => e.k === 'click')), sv.MAX_BOXES);
  return {
    harness: 1, // must match tests/trace_replay.js VERSION (checked at runtime)
    game: snapshot.game, recordedAt: snapshot.recordedAt,
    durationS: snapshot.durationS, durStr: sv.fmtDuration(snapshot.durationS),
    moves: snapshot.moves, clicks: snapshot.clicks,
    keyCount: snapshot.keyCount, shots: snapshot.shots,
    topKeys: topEntries(snapshot.keys, 5),
    topZone: zoneTop.length ? zoneTop[0] : null,
    zonesDistinct: Object.keys(zoneCounts).length,
    heatTotal: snapshot.heatTotal,
    heatCells: view.cells.length, heatMax: view.max,
    heatBuckets: sv.bucketHeatCellsByAlpha(view.cells).size,
    decay: { total: r4(faded.reduce((n, v) => n + v, 0)), cleared: dr.cleared, active: dr.active },
    validSamples: events.length,
    samplesHash: samplesHash(snapshot.samples),
    exemplars: [...snapshot.samples.slice(0, 2), ...snapshot.samples.slice(-2)],
    cullN: culled.length,
    sum: { durationS: sum.durationS, moves: sum.moves, clicks: sum.clicks, keyCount: sum.keyCount }
  };
}

function buildTestSource(id, digest) {
  const digestJson = JSON.stringify(digest);
  return `'use strict';
// ${TEST_MARKER} — auto-generated from a human takeover trace. DO NOT HAND-EDIT.
// Game: ${digest.game} · recorded ${digest.recordedAt} · ${digest.moves} moves, ${digest.clicks} clicks, ${digest.keyCount} keys in ${digest.durStr}.
// Reviewable surface: the DIGEST below (~${estimateTokens(digestJson)} tokens). The bulky trace lives in
// ./${id}.test.json — a RUNTIME-ONLY fixture, never paste it into model context.
// Replay harness: tests/trace_replay.js (committed once, shared by all traces).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = process.env.VIBECODEWORKER_ROOT || path.join(__dirname, '..', '..');
const replay = require(path.join(ROOT, 'tests', 'trace_replay'));
const DIGEST = ${digestJson};
assert.strictEqual(replay.VERSION, DIGEST.harness, 'trace harness version');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '${id}.test.json'), 'utf8'));
const r = replay.replayTrace(data, DIGEST);
console.log('PASS trace ${id}: replay green (' + r.moves + ' moves, ' + r.clicks + ' clicks, heat ' + r.heatTotal + ').');
`;
}

function buildDataSource(id, snapshot) {
  return JSON.stringify({
    _note: 'RUNTIME-ONLY fixture for the sibling trace test. Loaded from disk at test time — NEVER paste this file into a model context; the test file digest is the whole reviewable surface.',
    v: TRACE_TEST_VERSION,
    id,
    samples: snapshot.samples,
    heat: snapshot.heat,
    session: {
      durationS: snapshot.durationS, moves: snapshot.moves, clicks: snapshot.clicks,
      keys: snapshot.keys, zones: snapshot.zones,
      distance: snapshot.distance, shots: snapshot.shots
    }
  });
}

// Full pipeline: raw session + heat grid -> save-ready artifacts.
function buildTraceArtifacts({ session, heatGrid, game } = {}) {
  const snapshot = buildTraceSnapshot({ session, heatGrid, game });
  const digest = buildTraceDigest(snapshot);
  const id = 'trace-' + stampFromMs(snapshot.endedAt) + '-' + slugify(snapshot.game);
  const testSource = buildTestSource(id, digest);
  const dataSource = buildDataSource(id, snapshot);
  if (Buffer.byteLength(testSource, 'utf8') > MAX_TEST_SOURCE_BYTES) {
    throw new Error('generated test exceeds the token budget (' + MAX_TEST_SOURCE_BYTES + ' bytes)');
  }
  if (Buffer.byteLength(dataSource, 'utf8') > MAX_DATA_BYTES) {
    throw new Error('trace fixture exceeds the size cap (' + MAX_DATA_BYTES + ' bytes)');
  }
  return {
    id,
    testFilename: id + '.js',
    dataFilename: id + '.test.json',
    testSource, dataSource, digest,
    testBytes: Buffer.byteLength(testSource, 'utf8'),
    dataBytes: Buffer.byteLength(dataSource, 'utf8'),
    testTokens: estimateTokens(testSource.length),
    dataTokens: estimateTokens(dataSource.length)
  };
}

module.exports = {
  TRACE_TEST_VERSION, TEST_MARKER, TRACE_SAMPLE_CAP,
  MAX_TEST_SOURCE_BYTES, MAX_DATA_BYTES,
  fnv1a, canonicalSample, synthTraceBoxes,
  compactRawEvent, expandCompact, samplesHash, estimateTokens,
  buildTraceSnapshot, buildTraceDigest,
  buildTestSource, buildDataSource, buildTraceArtifacts
};
