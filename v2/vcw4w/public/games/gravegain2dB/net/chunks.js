/* GraveGain2dB chunk store + delta application (window.GraveGain2dBNet.Chunks).
 *
 * NEW file for DS-GG2DB-06. Terrain is server-authoritative: the client
 * holds chunks keyed by "cx,cy", each with a revision counter. Deltas apply
 * ONLY when they chain exactly (delta.baseRev === held.rev and
 * delta.rev === held.rev + 1); anything else is dropped and the client waits
 * for the next full-state / snapshot chunk (never extrapolates terrain, never
 * writes cells from client input).
 *
 * Chunk: { cx, cy, rev, cells }. Delta: { cx, cy, baseRev, rev, cells }.
 *
 * Vanilla JS, ASCII-only, never throws. Node-requireable via module.exports.
 */
(function () {
    'use strict';

    function int(v, d) {
        try { var n = Number(v); if (!isFinite(n)) return d; return Math.floor(n); } catch (e) { return d; }
    }
    function key(cx, cy) { return int(cx, 0) + ',' + int(cy, 0); }

    function cleanCells(cells) {
        try {
            if (!cells || typeof cells.length !== 'number') return null;
            var out = [];
            for (var i = 0; i < cells.length; i++) {
                var n = int(cells[i], -1);
                if (n < 0) return null;
                out.push(n);
                if (out.length > 4096) break;
            }
            if (out.length === 0) return null;
            return out;
        } catch (e) { return null; }
    }

    function createStore() { return { chunks: {} }; }

    /* Full-state replace (snapshot / reconnect bundle). Always accepted. */
    function setChunk(store, chunk) {
        try {
            if (!store || !chunk) return false;
            var cells = cleanCells(chunk.cells);
            if (!cells) return false;
            store.chunks[key(chunk.cx, chunk.cy)] = {
                cx: int(chunk.cx, 0),
                cy: int(chunk.cy, 0),
                rev: int(chunk.rev, 0),
                cells: cells
            };
            return true;
        } catch (e) { return false; }
    }

    function setMany(store, chunks) {
        try {
            if (!store || !chunks || typeof chunks.length !== 'number') return 0;
            var n = 0;
            for (var i = 0; i < chunks.length; i++) {
                if (setChunk(store, chunks[i])) n++;
            }
            return n;
        } catch (e) { return 0; }
    }

    /* Delta apply: chained revision only, else reject (wait for full-state). */
    function applyDelta(store, delta) {
        try {
            if (!store || !delta) return { applied: false, reason: 'bad args' };
            var k = key(delta.cx, delta.cy);
            var held = store.chunks[k];
            if (!held) return { applied: false, reason: 'no base chunk' };
            if (int(delta.baseRev, -1) !== held.rev) return { applied: false, reason: 'stale base' };
            if (int(delta.rev, -1) !== held.rev + 1) return { applied: false, reason: 'rev gap' };
            var cells = cleanCells(delta.cells);
            if (!cells) return { applied: false, reason: 'bad cells' };
            store.chunks[k] = { cx: held.cx, cy: held.cy, rev: held.rev + 1, cells: cells };
            return { applied: true, reason: '' };
        } catch (e) { return { applied: false, reason: 'exception' }; }
    }

    function applyMany(store, deltas) {
        try {
            if (!store || !deltas || typeof deltas.length !== 'number') return { applied: 0, dropped: 0 };
            var a = 0, d = 0;
            for (var i = 0; i < deltas.length; i++) {
                var r = applyDelta(store, deltas[i]);
                if (r.applied) a++; else d++;
            }
            return { applied: a, dropped: d };
        } catch (e) { return { applied: 0, dropped: 0 }; }
    }

    function getChunk(store, cx, cy) {
        try {
            if (!store) return null;
            return store.chunks[key(cx, cy)] || null;
        } catch (e) { return null; }
    }

    function chunkKeys(store) {
        try { return store && store.chunks ? Object.keys(store.chunks) : []; } catch (e) { return []; }
    }

    var api = {
        createStore: createStore,
        setChunk: setChunk,
        setMany: setMany,
        applyDelta: applyDelta,
        applyMany: applyMany,
        getChunk: getChunk,
        chunkKeys: chunkKeys
    };

    try {
        var g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
        g.GraveGain2dBNet = g.GraveGain2dBNet || {};
        g.GraveGain2dBNet.Chunks = api;
    } catch (e) { /* ignore */ }
    try { if (typeof module !== 'undefined' && module && module.exports) module.exports = api; } catch (e) { /* browser */ }
})();
