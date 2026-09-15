/* GraveGain2dB interpolation of remote state (window.GraveGain2dBNet.Interp).
 *
 * NEW file for DS-GG2DB-06. Renders REMOTE players/entities from 20Hz
 * RoomSnapshots with render-time interpolation. Handles ONLY the unreliable
 * families: transform (x/y), aim (aimAngle), anim. Reliable outcomes
 * (destruction/loot/objective/checkpoint/revive/rescue/boss/extraction/
 * reward) bypass interpolation and apply on arrival (see client.js event
 * seq-gating). Local predicted player is excluded -- see predict.js.
 *
 * Vanilla JS, ASCII-only, never throws. Node-requireable via module.exports.
 */
(function () {
    'use strict';

    var SNAPSHOT_HZ = 20;
    var SNAPSHOT_MS = 1000 / SNAPSHOT_HZ;
    var BUFFER_MAX = 8;

    function num(v, d) {
        try { var n = Number(v); return isFinite(n) ? n : d; } catch (e) { return d; }
    }
    function str(v) {
        try { if (v === null || v === undefined) return ''; return String(v).slice(0, 64); } catch (e) { return ''; }
    }

    /* Per-actor ring of unreliable samples: [{ t, x, y, aimAngle, anim }]. */
    function createStore() {
        return { actors: {} };
    }

    function sampleOf(p) {
        try {
            return {
                t: Date.now(),
                x: num(p && p.x, 0),
                y: num(p && p.y, 0),
                aimAngle: num(p && p.aimAngle, 0),
                anim: str(p && p.anim)
            };
        } catch (e) { return { t: Date.now(), x: 0, y: 0, aimAngle: 0, anim: '' }; }
    }

    /* Ingest one snapshot's remote actors. localId is skipped (predicted). */
    function ingest(store, snapshot, localId) {
        try {
            if (!store || !snapshot) return 0;
            var list = snapshot.players || [];
            var n = 0;
            for (var i = 0; i < list.length; i++) {
                try {
                    var p = list[i];
                    if (!p) continue;
                    var id = str(p.id);
                    if (!id || id === localId) continue;
                    if (p.frozen) continue;
                    if (!store.actors[id]) store.actors[id] = [];
                    store.actors[id].push(sampleOf(p));
                    if (store.actors[id].length > BUFFER_MAX) {
                        store.actors[id].splice(0, store.actors[id].length - BUFFER_MAX);
                    }
                    n++;
                } catch (e) { /* skip bad actor */ }
            }
            return n;
        } catch (e) { return 0; }
    }

    /* Shortest-arc angle lerp. */
    function lerpAngle(a, b, t) {
        try {
            var d = (b - a) % (Math.PI * 2);
            if (d > Math.PI) d -= Math.PI * 2;
            if (d < -Math.PI) d += Math.PI * 2;
            return a + d * t;
        } catch (e) { return a; }
    }

    /* Render-time sample for one actor, `delayMs` behind newest (default one
     * snapshot period). Returns null when fewer than 2 samples exist. */
    function renderSample(store, actorId, nowMs, delayMs) {
        try {
            if (!store || !actorId || !store.actors[actorId]) return null;
            var buf = store.actors[actorId];
            if (!buf || buf.length < 2) return null;
            var now = nowMs !== undefined ? num(nowMs, Date.now()) : Date.now();
            var delay = delayMs !== undefined ? num(delayMs, SNAPSHOT_MS) : SNAPSHOT_MS;
            var rt = now - delay;
            var a = buf[0], b = buf[buf.length - 1], i;
            for (i = 0; i < buf.length - 1; i++) {
                if (buf[i].t <= rt && buf[i + 1].t >= rt) { a = buf[i]; b = buf[i + 1]; break; }
            }
            if (b.t <= a.t) return { x: b.x, y: b.y, aimAngle: b.aimAngle, anim: b.anim };
            var t = (rt - a.t) / (b.t - a.t);
            if (t < 0) t = 0;
            if (t > 1) t = 1;
            return {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                aimAngle: lerpAngle(a.aimAngle, b.aimAngle, t),
                anim: t < 0.5 ? a.anim : b.anim
            };
        } catch (e) { return null; }
    }

    function removeActor(store, actorId) {
        try { if (store && store.actors) delete store.actors[actorId]; return true; } catch (e) { return false; }
    }

    function actorIds(store) {
        try { return store && store.actors ? Object.keys(store.actors) : []; } catch (e) { return []; }
    }

    var api = {
        SNAPSHOT_HZ: SNAPSHOT_HZ,
        SNAPSHOT_MS: SNAPSHOT_MS,
        createStore: createStore,
        ingest: ingest,
        renderSample: renderSample,
        removeActor: removeActor,
        actorIds: actorIds
    };

    try {
        var g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
        g.GraveGain2dBNet = g.GraveGain2dBNet || {};
        g.GraveGain2dBNet.Interp = api;
    } catch (e) { /* ignore */ }
    try { if (typeof module !== 'undefined' && module && module.exports) module.exports = api; } catch (e) { /* browser */ }
})();
