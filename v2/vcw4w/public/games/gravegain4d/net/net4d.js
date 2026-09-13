/* =========================================================================
 * GraveGain4D - netplay core + mp-4d co-op echo + mmorpg-4d world-boss
 * fronts (window.GraveGain4DNet)
 * -------------------------------------------------------------------------
 * Same shape as the 3D net: rooms + echo positions shared over
 * BroadcastChannel with a stub socket transport, fail-open offline.
 * Vanilla JS, ASCII-only, never throws, solo-safe (all reads guarded;
 * with no room/peers every render path is a no-op).
 *
 *   mp-4d  : co-op echo. Same-seed parties share {x,y,z,w,hole,score,alive}
 *            echoes; the score codec mirrors the 3D siege relay
 *            (score = hole*10000 + min(strokes,9999)).
 *   mmorpg-4d : world-boss fronts on tesseract cells. Rotation schedule is
 *            JSON-compatible with gravegain-mmo-events/worldboss.rotation.json
 *            (same boss ids, 3 fronts each, kill rule: total >= threshold
 *            AND every front >= 20% of threshold). Cells map 1:1 to fronts
 *            so a 4D party can hold one tesseract cell each.
 *
 * State kept in memory + BroadcastChannel only. No fetch, no backend,
 * no secrets. Socket transport is a stub: connect() records the URL and
 * stays offline unless a real socket is injected via injectSocket().
 * ========================================================================= */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.GraveGain4DNet && window.GraveGain4DNet.VERSION) return;

    var VERSION = '4d-net-1';
    var CHAN_NAME = 'gg4d-net-v1';
    var SCORE_F = 10000;
    var SCORE_CAP = 9999;
    var MAX_ECHOES = 8;
    var ECHO_TTL_MS = 8000;
    var TICK_MS = 500;

    // Default rotation: JSON-compatible with
    // gravegain-mmo-events/worldboss.rotation.json (ids, 3 fronts per boss,
    // 20% front-minimum kill rule). Replaceable at runtime via setRotation().
    var DEFAULT_ROTATION = {
        version: '1.0.0',
        rotationStartUtc: '2026-09-14T00:00:00Z',
        weekMs: 604800000,
        frontMinimumPct: 20,
        games: ['gravegain1d', 'gravegain2d', 'gravegain3d', 'gravegain4d'],
        bosses: [
            { id: 'grave-titan', threshold: 1000000,
              fronts: [{ id: 'ashen-gate' }, { id: 'hollow-nave' }, { id: 'throne-pit' }] },
            { id: 'spire-widow', threshold: 1200000,
              fronts: [{ id: 'web-terrace' }, { id: 'silk-shaft' }, { id: 'brood-loft' }] },
            { id: 'marrow-choir', threshold: 1400000,
              fronts: [{ id: 'verse-aisle' }, { id: 'chorus-crypt' }, { id: 'requiem-roof' }] },
            { id: 'lantern-thief', threshold: 1600000,
              fronts: [{ id: 'wick-ward' }, { id: 'glass-gallery' }, { id: 'thief-trail' }] }
        ]
    };

    var state = {
        room: null,
        seed: null,
        mode: 'echo', // 'echo' (mp-4d) | 'raid4d' (mmorpg-4d)
        selfId: 'p4d-' + String(Math.floor(Math.random() * 1296 * 1296)).padStart(4, '0'),
        echoes: {},   // peerId -> {x,y,z,w,hole,score,alive,at}
        fronts: {},   // frontId -> damage number
        events: [],   // feed strings, newest last, capped
        rotation: DEFAULT_ROTATION,
        socketUrl: null,
        socket: null,
        chan: null,
        timer: null,
        seq: 0
    };

    // ------------------------- pure helpers (node-testable) ----------------
    function fin(v) {
        var n = Number(v);
        return isFinite(n) ? n : undefined;
    }

    function capStr(v, n) {
        try { return String(v).slice(0, n || 32); }
        catch (_) { return ''; }
    }

    function encodeScore(hole, strokes) {
        var h = Math.floor(fin(hole) || 0);
        var s = Math.floor(fin(strokes) || 0);
        if (h < 0) h = 0; if (h > 99) h = 99;
        if (s < 0) s = 0; if (s > SCORE_CAP) s = SCORE_CAP;
        return h * SCORE_F + s;
    }

    function decodeScore(score) {
        var n = Math.floor(fin(score) || 0);
        if (n < 0) n = 0;
        return { hole: Math.floor(n / SCORE_F), strokes: n % SCORE_F };
    }

    function weekIndex(nowMs, rotation) {
        try {
            var rot = rotation || DEFAULT_ROTATION;
            var start = Date.parse(rot.rotationStartUtc);
            var weekMs = fin(rot.weekMs) || 604800000;
            if (!isFinite(start) || weekMs <= 0) return 0;
            var t = (typeof nowMs === 'number' && isFinite(nowMs)) ? nowMs : Date.now();
            var w = Math.floor((t - start) / weekMs);
            return w < 0 ? 0 : w;
        } catch (_) { return 0; }
    }

    function bossForWeek(nowMs, rotation) {
        try {
            var rot = rotation || state.rotation || DEFAULT_ROTATION;
            var list = (rot && rot.bosses) || [];
            if (!list.length) return null;
            return list[weekIndex(nowMs, rot) % list.length] || null;
        } catch (_) { return null; }
    }

    // Kill rule mirrors gravegain-mmo-events: total >= threshold AND every
    // front >= 20% of threshold. Returns {kill, total, per}.
    function assessKill(boss, fronts) {
        try {
            if (!boss || !isFinite(Number(boss.threshold))) return { kill: false, total: 0, per: {} };
            var th = Number(boss.threshold);
            var pct = 20;
            try {
                var r = state.rotation || DEFAULT_ROTATION;
                if (isFinite(Number(r.frontMinimumPct))) pct = Number(r.frontMinimumPct);
            } catch (_) { /* keep 20 */ }
            var minEach = th * (pct / 100);
            var total = 0, per = {}, ok = true;
            var list = boss.fronts || [];
            for (var i = 0; i < list.length; i++) {
                var id = list[i] && list[i].id;
                if (!id) continue;
                var d = fin(fronts && fronts[id]) || 0;
                if (d < 0) d = 0;
                per[id] = d;
                total += d;
                if (d < minEach) ok = false;
            }
            if (!list.length) ok = false;
            return { kill: ok && total >= th, total: total, per: per };
        } catch (_) { return { kill: false, total: 0, per: {} }; }
    }

    // ------------------------- transport (fail-open) -----------------------
    function openChannel() {
        if (state.chan) return state.chan;
        try {
            if (typeof BroadcastChannel === 'undefined') return null;
            var ch = new BroadcastChannel(CHAN_NAME);
            ch.onmessage = function (ev) {
                try { onRemote(ev && ev.data); } catch (_) { /* fail-open */ }
            };
            state.chan = ch;
            return ch;
        } catch (_) { return null; }
    }

    function closeChannel() {
        try { if (state.chan && state.chan.close) state.chan.close(); } catch (_) { /* noop */ }
        state.chan = null;
    }

    function broadcast(msg) {
        try {
            msg = msg || {};
            msg.from = state.selfId;
            msg.room = state.room;
            var ch = state.chan || openChannel();
            if (ch && ch.postMessage) ch.postMessage(msg);
        } catch (_) { /* offline: drop */ }
        try {
            if (state.socket && typeof state.socket.send === 'function') {
                state.socket.send(JSON.stringify(msg));
            }
        } catch (_) { /* stub socket: drop */ }
    }

    function onRemote(msg) {
        try {
            if (!msg || msg.from === state.selfId) return;
            if (state.room && msg.room !== state.room) return;
            if (msg.kind === 'echo' && msg.body) {
                var b = msg.body, id = capStr(msg.from, 32) || 'peer';
                var keys = Object.keys(state.echoes);
                if (!state.echoes[id] && keys.length >= MAX_ECHOES) return;
                state.echoes[id] = {
                    x: fin(b.x) || 0, y: fin(b.y) || 0,
                    z: fin(b.z) || 0, w: fin(b.w) || 0,
                    hole: Math.floor(fin(b.hole) || 0),
                    score: Math.floor(fin(b.score) || 0),
                    alive: b.alive !== false,
                    at: Date.now()
                };
            } else if (msg.kind === 'front' && msg.body) {
                var fid = capStr(msg.body.front, 48);
                var dmg = fin(msg.body.dmg);
                if (fid && isFinite(dmg) && dmg > 0) {
                    state.fronts[fid] = (fin(state.fronts[fid]) || 0) + dmg;
                    pushEvent(capStr(msg.from, 16) + ' +' + Math.floor(dmg) + ' ' + fid);
                }
            } else if (msg.kind === 'emote' && msg.body) {
                pushEvent(capStr(msg.from, 16) + ': ' + capStr(msg.body.text, 24));
            } else if (msg.kind === 'leave') {
                delete state.echoes[capStr(msg.from, 32)];
            }
        } catch (_) { /* fail-open */ }
    }

    function pushEvent(text) {
        try {
            if (!text) return;
            state.events.push({ text: capStr(text, 64), at: Date.now() });
            while (state.events.length > 7) state.events.shift();
        } catch (_) { /* noop */ }
    }

    function pruneEchoes() {
        try {
            var cutoff = Date.now() - ECHO_TTL_MS;
            for (var id in state.echoes) {
                if (state.echoes[id] && state.echoes[id].at < cutoff) delete state.echoes[id];
            }
        } catch (_) { /* noop */ }
    }

    // ------------------------- game read (read-only) -----------------------
    function readLocal() {
        var out = {};
        try {
            var G = window.GraveGain4DGame || null;
            if (!G) return out;
            var st = null;
            try { st = (typeof G.getState === 'function') ? G.getState() : (G.state || null); }
            catch (_) { st = null; }
            if (!st || typeof st !== 'object') return out;
            if (isFinite(Number(st.ballX))) out.x = Number(st.ballX);
            if (isFinite(Number(st.ballY))) out.y = Number(st.ballY);
            if (isFinite(Number(st.ballZ))) out.z = Number(st.ballZ);
            if (isFinite(Number(st.ballW))) out.w = Number(st.ballW);
            if (isFinite(Number(st.hole))) out.hole = Math.floor(Number(st.hole));
            if (isFinite(Number(st.strokes))) out.strokes = Math.floor(Number(st.strokes));
            out.score = encodeScore(out.hole || 0, out.strokes || 0);
            out.alive = st.dead !== true;
            if (st.seed !== undefined) out.seed = capStr(st.seed, 32);
        } catch (_) { /* read-only, fail-open */ }
        return out;
    }

    function tick() {
        try {
            pruneEchoes();
            if (!state.room) return;
            var me = readLocal();
            broadcast({
                kind: 'echo',
                body: {
                    x: fin(me.x) || 0, y: fin(me.y) || 0,
                    z: fin(me.z) || 0, w: fin(me.w) || 0,
                    hole: Math.floor(fin(me.hole) || 0),
                    score: Math.floor(fin(me.score) || 0),
                    alive: me.alive !== false
                }
            });
        } catch (_) { /* fail-open */ }
    }

    function ensureTimer() {
        if (state.timer) return;
        try {
            state.timer = setInterval(tick, TICK_MS);
        } catch (_) { state.timer = null; }
    }

    // ------------------------- public API ----------------------------------
    var api = {
        VERSION: VERSION,
        MODE_MP: 'coop4d',
        MODE_MMO: 'raid4d',

        createRoom: function (room, opts) {
            try {
                state.room = capStr(room || ('tesseract-' + Date.now().toString(36)), 48) || 'tesseract-lobby';
                if (opts && typeof opts === 'object') {
                    if (opts.seed !== undefined) state.seed = capStr(opts.seed, 32);
                    if (opts.mode === 'raid4d' || opts.mode === 'coop4d') state.mode = opts.mode;
                }
                state.echoes = {};
                openChannel();
                ensureTimer();
                pushEvent('joined ' + state.room);
                return state.room;
            } catch (_) { return null; }
        },

        joinRoom: function (room, opts) { return api.createRoom(room, opts); },

        leaveRoom: function () {
            try {
                broadcast({ kind: 'leave', body: {} });
                state.room = null;
                state.echoes = {};
            } catch (_) { /* noop */ }
            return true;
        },

        echoPosition: function (pos) {
            try {
                if (!state.room) return false;
                var p = pos && typeof pos === 'object' ? pos : readLocal();
                broadcast({
                    kind: 'echo',
                    body: {
                        x: fin(p.x) || 0, y: fin(p.y) || 0,
                        z: fin(p.z) || 0, w: fin(p.w) || 0,
                        hole: Math.floor(fin(p.hole) || 0),
                        score: Math.floor(fin(p.score) || 0),
                        alive: p.alive !== false
                    }
                });
                return true;
            } catch (_) { return false; }
        },

        // mp-4d co-op echo: live peers (array, newest-position first-ish).
        getEchoes: function () {
            try {
                pruneEchoes();
                var ids = Object.keys(state.echoes);
                var arr = [];
                for (var i = 0; i < ids.length; i++) {
                    var e = state.echoes[ids[i]];
                    if (!e) continue;
                    arr.push({
                        id: ids[i], x: e.x, y: e.y, z: e.z, w: e.w,
                        hole: e.hole, score: e.score, alive: e.alive,
                        race: decodeScore(e.score)
                    });
                }
                return arr;
            } catch (_) { return []; }
        },

        sendEmote: function (text) {
            try {
                if (!state.room) return false;
                broadcast({ kind: 'emote', body: { text: capStr(text, 24) } });
                return true;
            } catch (_) { return false; }
        },

        // mmorpg-4d: world-boss fronts mapped onto tesseract cells.
        setRotation: function (rotation) {
            try {
                if (rotation && Array.isArray(rotation.bosses) && rotation.bosses.length) {
                    state.rotation = rotation;
                    return true;
                }
                return false;
            } catch (_) { return false; }
        },

        getRotation: function () {
            try { return state.rotation || DEFAULT_ROTATION; }
            catch (_) { return DEFAULT_ROTATION; }
        },

        bossForWeek: function (nowMs) { return bossForWeek(nowMs, state.rotation); },

        // Tesseract cells: front index -> cell label (ANA/KATA/HERE).
        frontCells: function (nowMs) {
            try {
                var boss = bossForWeek(nowMs, state.rotation);
                if (!boss || !boss.fronts) return [];
                var cells = ['ANA', 'KATA', 'HERE'];
                var out = [];
                for (var i = 0; i < boss.fronts.length; i++) {
                    out.push({
                        cell: cells[i % cells.length],
                        front: boss.fronts[i].id,
                        damage: Math.floor(fin(state.fronts[boss.fronts[i].id]) || 0)
                    });
                }
                return out;
            } catch (_) { return []; }
        },

        reportFrontDamage: function (frontId, dmg) {
            try {
                var fid = capStr(frontId, 48);
                var d = fin(dmg);
                if (!fid || !isFinite(d) || d <= 0) return false;
                state.fronts[fid] = (fin(state.fronts[fid]) || 0) + d;
                if (state.room) broadcast({ kind: 'front', body: { front: fid, dmg: d } });
                return true;
            } catch (_) { return false; }
        },

        assessKill: function (nowMs) {
            try {
                var boss = bossForWeek(nowMs, state.rotation);
                return assessKill(boss, state.fronts);
            } catch (_) { return { kill: false, total: 0, per: {} }; }
        },

        getEvents: function () {
            try { return state.events.slice(); }
            catch (_) { return []; }
        },

        read: readLocal,

        // Stub socket: records URL, stays offline unless a socket with
        // {send,onmessage,close} is injected. Never throws, never fetches.
        connect: function (url) {
            try {
                state.socketUrl = capStr(url, 128);
                return false; // stub: no live socket, BroadcastChannel only
            } catch (_) { return false; }
        },

        injectSocket: function (sock) {
            try {
                if (sock && typeof sock.send === 'function') {
                    state.socket = sock;
                    return true;
                }
                return false;
            } catch (_) { return false; }
        },

        online: function () {
            try { return !!(state.chan || state.socket); }
            catch (_) { return false; }
        },

        info: function () {
            try {
                return {
                    version: VERSION, room: state.room, mode: state.mode,
                    seed: state.seed, self: state.selfId,
                    peers: Object.keys(state.echoes).length,
                    offline: !(state.chan || state.socket)
                };
            } catch (_) { return { version: VERSION, offline: true }; }
        },

        // Pure helpers exposed for tests.
        _pure: {
            encodeScore: encodeScore,
            decodeScore: decodeScore,
            weekIndex: weekIndex,
            assessKill: assessKill
        }
    };

    window.GraveGain4DNet = api;
})();
