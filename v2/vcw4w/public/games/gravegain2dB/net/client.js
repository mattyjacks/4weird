/* GraveGain2dB co-op client (window.GraveGain2dBNet.Client).
 *
 * NEW file for DS-GG2DB-06. Wires predict.js / interp.js / chunks.js into one
 * authoritative-co-op client. Transport mirrors the shared mmorpg-net.js
 * pattern (read-only reference, never edited): REST heartbeat fallback with
 * optional WebSocket, solo-safe (no socket, no timer, no DOM writes until
 * connect()). Rates: 60Hz input send, 20Hz snapshot ingest.
 *
 * Disconnect policy (matches lib/gravegain2dB-net.ts):
 *   - input freeze after 2 missed frames (local avatar holds, inputs queue
 *     but are NOT sent as catch-up bursts -- sequence keeps counting so the
 *     server counts the gap as missed frames and freezes the body itself);
 *   - body is shielded (server-side) and recoverable for 30s;
 *   - difficulty/loot scale-to-active (server-side; client just renders the
 *     active count it is given);
 *   - NO host migration: if the room closes, the client surfaces roomClosed
 *     and stops -- it never elects a new host.
 * Reconnect: rejoin with last serverTick + nextEventSeq; the server answers
 *   with a full-state bundle (seed/tick/full-state/chunks/objectives/
 *   event-seq/extraction); events below nextEventSeq are dropped (no dup).
 *
 * Vanilla JS, ASCII-only, never throws. Node-requireable via module.exports.
 */
(function () {
    'use strict';

    var INPUT_HZ = 60;
    var INPUT_MS = 1000 / INPUT_HZ;
    var SNAPSHOT_HZ = 20;
    var MISSED_FREEZE_FRAMES = 2;
    var RECOVERABLE_MS = 30 * 1000;
    var RELIABLE_KINDS = ['destruction', 'loot', 'objective', 'checkpoint', 'revive', 'rescue', 'boss', 'extraction', 'reward'];

    function G() {
        try { if (typeof window !== 'undefined' && window) return window; } catch (e) { /* ignore */ }
        try { if (typeof globalThis !== 'undefined' && globalThis) return globalThis; } catch (e2) { /* ignore */ }
        return {};
    }
    function NS() {
        try { var g = G(); return (g && g.GraveGain2dBNet) || {}; } catch (e) { return {}; }
    }
    function num(v, d) {
        try { var n = Number(v); return isFinite(n) ? n : d; } catch (e) { return d; }
    }
    function int(v, d) {
        try { var n = Number(v); if (!isFinite(n)) return d; return Math.floor(n); } catch (e) { return d; }
    }
    function str(v, max) {
        try {
            if (v === null || v === undefined) return '';
            var s = String(v).replace(/[\x00-\x1F\x7F]/g, '').trim();
            if (max === undefined) max = 64;
            return s.slice(0, max);
        } catch (e) { return ''; }
    }

    function isReliable(kind) {
        try { return RELIABLE_KINDS.indexOf(String(kind)) !== -1; } catch (e) { return false; }
    }

    function createClient(opts) {
        var o = (opts && typeof opts === 'object') ? opts : {};
        return {
            roomId: str(o.roomId, 64),
            playerId: str(o.playerId, 64) || 'you',
            seed: '',
            serverTick: 0,
            nextEventSeq: 0,
            connected: false,
            roomClosed: false,
            frozen: false,
            missedFrames: 0,
            disconnectAt: 0,
            timer: 0,
            ws: null,
            input: null,
            interp: null,
            chunks: null,
            events: [],
            objectives: [],
            extraction: '',
            activeCount: 0,
            onSnapshot: (typeof o.onSnapshot === 'function') ? o.onSnapshot : null,
            onEvent: (typeof o.onEvent === 'function') ? o.onEvent : null,
            onStatus: (typeof o.onStatus === 'function') ? o.onStatus : null
        };
    }

    function status(c, s) {
        try { if (c && typeof c.onStatus === 'function') c.onStatus(s); } catch (e) { /* ignore */ }
    }

    /* Lazily bind sibling modules (or minimal fallbacks when run standalone). */
    function ensureModules(c) {
        try {
            var ns = NS();
            if (!c.input && ns.Predict) c.input = ns.Predict.createBuffer(c.playerId);
            if (!c.interp && ns.Interp) c.interp = ns.Interp.createStore();
            if (!c.chunks && ns.Chunks) c.chunks = ns.Chunks.createStore();
        } catch (e) { /* standalone: stay null-safe */ }
    }

    /* Queue one local input at 60Hz. After 2 missed sends the avatar is
     * locally frozen (mirrors the server freeze); queued frames are dropped,
     * never burst (no catch-up teleport, no forged movement). */
    function sendInput(c, moveX, moveY, aimAngle, buttons) {
        try {
            if (!c || !c.connected || c.roomClosed) return null;
            ensureModules(c);
            var ns = NS();
            if (!ns.Predict || !c.input) return null;
            if (c.frozen) return null;
            var frame = ns.Predict.pushInput(c.input, {
                clientTick: c.serverTick,
                moveX: moveX, moveY: moveY, aimAngle: aimAngle, buttons: buttons
            });
            if (!frame) { noteMissed(c); return null; }
            c.missedFrames = 0;
            postFrame(c, frame);
            return frame;
        } catch (e) { return null; }
    }

    function noteMissed(c) {
        try {
            c.missedFrames = int(c.missedFrames, 0) + 1;
            if (c.missedFrames >= MISSED_FREEZE_FRAMES && !c.frozen) {
                c.frozen = true;
                c.disconnectAt = Date.now();
                status(c, 'frozen');
            }
        } catch (e) { /* ignore */ }
    }

    function postFrame(c, frame) {
        try {
            var g = G();
            if (c.ws) {
                try { if (c.ws.readyState === 1) { c.ws.send(JSON.stringify({ input: frame })); return; } } catch (e) { /* REST below */ }
            }
            var f = (g && typeof g.fetch === 'function') ? g.fetch : (typeof fetch === 'function' ? fetch : null);
            if (!f || !c.roomId) return;
            var url = '/api/games/gravegain2dB/room';
            try {
                var r = f(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'input', roomId: c.roomId, playerId: c.playerId, frame: frame })
                });
                if (r && typeof r.catch === 'function') {
                    r.catch(function () { noteMissed(c); });
                    if (typeof r.then === 'function') {
                        r.then(function (res) {
                            if (res && (res.status === 410)) { c.roomClosed = true; status(c, 'roomClosed'); }
                        }, function () { /* offline: miss counted at send */ });
                    }
                }
            } catch (e) { noteMissed(c); }
        } catch (e) { /* never throw */ }
    }

    /* Ingest one 20Hz RoomSnapshot: reconcile prediction, interp remotes,
     * full-replace chunks, seq-gate reliable events (no duplication). */
    function ingestSnapshot(c, snap) {
        try {
            if (!c || !snap || typeof snap !== 'object') return false;
            ensureModules(c);
            var ns = NS();
            c.serverTick = int(snap.serverTick, c.serverTick);
            if (snap.seed) c.seed = str(snap.seed, 64);
            if (snap.extraction !== undefined) c.extraction = str(snap.extraction, 64);
            if (snap.players && typeof snap.players.length === 'number') c.activeCount = snap.players.length;
            if (ns.Predict && c.input) { try { ns.Predict.reconcile(c.input, snap); } catch (e) { /* keep */ } }
            if (ns.Interp && c.interp) { try { ns.Interp.ingest(c.interp, snap, c.playerId); } catch (e2) { /* keep */ } }
            if (ns.Chunks && c.chunks) { try { ns.Chunks.setMany(c.chunks, snap.chunks || []); } catch (e3) { /* keep */ } }
            if (snap.objectives && typeof snap.objectives.length === 'number') {
                try { c.objectives = snap.objectives.slice(); } catch (e4) { /* keep */ }
            }
            ingestEvents(c, snap.events || []);
            if (c.frozen) { c.frozen = false; c.missedFrames = 0; status(c, 'live'); }
            try { if (typeof c.onSnapshot === 'function') c.onSnapshot(snap); } catch (e5) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    }

    /* Seq-gated reliable event ingest: below nextEventSeq = dup, dropped. */
    function ingestEvents(c, events) {
        try {
            if (!c || !events || typeof events.length !== 'number') return 0;
            var n = 0;
            for (var i = 0; i < events.length; i++) {
                try {
                    var ev = events[i];
                    if (!ev || !isReliable(ev.kind)) continue;
                    var seq = int(ev.seq, -1);
                    if (seq < 0 || seq < c.nextEventSeq) continue;
                    c.nextEventSeq = seq + 1;
                    c.events.push(ev);
                    if (c.events.length > 256) c.events.splice(0, c.events.length - 256);
                    n++;
                    if (typeof c.onEvent === 'function') { try { c.onEvent(ev); } catch (e) { /* ignore */ } }
                } catch (e2) { /* skip bad event */ }
            }
            return n;
        } catch (e) { return 0; }
    }

    /* Apply a reconnect bundle: full-state replace + nextEventSeq jump.
     * Recoverable only within 30s of freeze; otherwise returns false (must
     * rejoin as a fresh body, never resurrect a stale one). */
    function applyReconnect(c, bundle) {
        try {
            if (!c || !bundle || typeof bundle !== 'object') return false;
            if (c.disconnectAt > 0 && (Date.now() - c.disconnectAt) > RECOVERABLE_MS) return false;
            c.roomId = str(bundle.roomId || c.roomId, 64);
            c.seed = str(bundle.seed || c.seed, 64);
            c.serverTick = int(bundle.serverTick, c.serverTick);
            c.extraction = str(bundle.extraction, 64);
            if (bundle.nextEventSeq !== undefined) c.nextEventSeq = int(bundle.nextEventSeq, c.nextEventSeq);
            var ns = NS();
            if (bundle.snapshot) ingestSnapshot(c, bundle.snapshot);
            if (ns.Chunks && c.chunks && bundle.chunks) { try { ns.Chunks.setMany(c.chunks, bundle.chunks); } catch (e) { /* keep */ } }
            if (bundle.objectives && typeof bundle.objectives.length === 'number') {
                try { c.objectives = bundle.objectives.slice(); } catch (e2) { /* keep */ }
            }
            c.frozen = false;
            c.missedFrames = 0;
            c.disconnectAt = 0;
            c.roomClosed = false;
            status(c, 'reconnected');
            return true;
        } catch (e) { return false; }
    }

    function connect(c, opts) {
        try {
            if (!c) return false;
            var o = (opts && typeof opts === 'object') ? opts : {};
            if (o.roomId) c.roomId = str(o.roomId, 64);
            if (o.playerId) c.playerId = str(o.playerId, 64);
            ensureModules(c);
            c.connected = true;
            c.roomClosed = false;
            try {
                var g = G();
                var url = str(o.wsUrl || '', 256);
                var WS = (g && typeof g.WebSocket === 'function') ? g.WebSocket : (typeof WebSocket === 'function' ? WebSocket : null);
                if (url && WS) {
                    var ws = new WS(url);
                    c.ws = ws;
                    ws.onmessage = function (ev) {
                        try {
                            var msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
                            if (msg && msg.snapshot) ingestSnapshot(c, msg.snapshot);
                            else if (msg && msg.serverTick !== undefined) ingestSnapshot(c, msg);
                        } catch (e) { /* ignore bad frame */ }
                    };
                    ws.onclose = function () { try { c.ws = null; } catch (e) { /* ignore */ } };
                    ws.onerror = function () { /* REST fallback keeps ticking */ };
                }
            } catch (e2) { /* WS unavailable: REST */ }
            startInputLoop(c);
            status(c, 'live');
            return true;
        } catch (e) { return false; }
    }

    function startInputLoop(c) {
        try {
            stopInputLoop(c);
            var g = G();
            var si = (g && typeof g.setInterval === 'function') ? g.setInterval : setInterval;
            c.timer = si(function () {
                try {
                    if (!c.connected || c.roomClosed || c.frozen) return;
                    sendInput(c, 0, 0, 0, 0);
                } catch (e) { /* ignore */ }
            }, INPUT_MS);
        } catch (e) { /* timers unavailable */ }
    }

    function stopInputLoop(c) {
        try {
            if (c && c.timer) {
                var g = G();
                var ci = (g && typeof g.clearInterval === 'function') ? g.clearInterval : clearInterval;
                try { ci(c.timer); } catch (e) { /* ignore */ }
                c.timer = 0;
            }
        } catch (e) { /* ignore */ }
    }

    function disconnect(c) {
        try {
            if (!c) return false;
            c.connected = false;
            stopInputLoop(c);
            try { if (c.ws && typeof c.ws.close === 'function') c.ws.close(); } catch (e) { /* ignore */ }
            c.ws = null;
            status(c, 'offline');
            return true;
        } catch (e) { return false; }
    }

    var api = {
        INPUT_HZ: INPUT_HZ,
        SNAPSHOT_HZ: SNAPSHOT_HZ,
        MISSED_FREEZE_FRAMES: MISSED_FREEZE_FRAMES,
        RECOVERABLE_MS: RECOVERABLE_MS,
        createClient: createClient,
        connect: connect,
        disconnect: disconnect,
        sendInput: sendInput,
        ingestSnapshot: ingestSnapshot,
        ingestEvents: ingestEvents,
        applyReconnect: applyReconnect,
        isReliable: isReliable
    };

    try {
        var g2 = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
        g2.GraveGain2dBNet = g2.GraveGain2dBNet || {};
        g2.GraveGain2dBNet.Client = api;
    } catch (e) { /* ignore */ }
    try { if (typeof module !== 'undefined' && module && module.exports) module.exports = api; } catch (e) { /* browser */ }
})();
