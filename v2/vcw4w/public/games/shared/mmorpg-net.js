/* GraveGain MMORPG shared netcore (window.GraveGainMMO).
 *
 * SHARED transport used IDENTICALLY by gravegain1d/2d/3d. Bridges (never
 * edits) the existing duel adapters:
 *   public/games/gravegain1d/mp-1d.js  (race: progress/sector/kills/gold)
 *   public/games/gravegain2d/mp-2d.js  (duel: score = kills*1000 + gold)
 *   public/games/gravegain3d/mp-3d.js  (siege: score = floor*10000 + kills)
 * read() prefers window.GraveGainMPAdapter.read() when any one of them is
 * loaded; render() accepts any of their snapshot shapes and keeps an
 * N-player foe-map keyed by playerId (not just 1 foe).
 *
 * Snapshot schema (all keys optional except where noted):
 *   { x, y, hp, maxhp, gold, kills, floor, sector, progress, boss, winner,
 *     seed, ageBand, serverId, playerId }
 *   boss rides as a capped STRING ('boss'/name/''), matching the duel
 *   adapter relay convention (a bare boolean is dropped by the allowlist).
 *
 * Transport: WebSocket URL when supplied and available, else REST heartbeat
 * fallback (fetch POST /api/matches/[id]/events). 500ms tick. Solo-safe:
 * no socket, no timer, no DOM writes until connect() or ?match= or foe data.
 *
 * Vanilla JS, ASCII-only, never throws.
 */
(function () {
    'use strict';

    var MODE = 'mmorpg';
    var VERSION = '1.0.0';
    var TICK_MS = 500;
    var MAX_FOES = 64;
    var BOARD_ID = 'ggmmo-board';

    /* Score codecs reused from the duel adapters (same constants). */
    var DUEL_K = 1000;
    var DUEL_GOLD_CAP = 999;
    var SIEGE_F = 10000;
    var SIEGE_KILLS_CAP = 9999;

    var SERVERS = [
        { id: 'us-east-1', name: 'US East', region: 'NORTH_AMERICA', max: 100 },
        { id: 'eu-1', name: 'EU West', region: 'EUROPE', max: 100 },
        { id: 'asia-1', name: 'Asia Pacific', region: 'ASIA', max: 100 }
    ];

    var S = {
        ws: null,
        timer: 0,
        connected: false,
        serverId: '',
        playerId: '',
        matchId: '',
        foes: {},
        onUpdate: null,
        board: null
    };

    /* ---------- globals (dynamic so node harnesses can stub) ---------- */
    function W() {
        try { if (typeof window !== 'undefined' && window) return window; } catch (e) { /* ignore */ }
        try { if (typeof globalThis !== 'undefined' && globalThis) return globalThis; } catch (e2) { /* ignore */ }
        return {};
    }
    function D() {
        try { if (typeof document !== 'undefined' && document) return document; } catch (e) { /* ignore */ }
        try { var w = W(); if (w && w.document) return w.document; } catch (e2) { /* ignore */ }
        return null;
    }

    /* ---------- pure helpers (node-testable via _pure) ---------- */
    function clampNum(v, a, b) {
        try {
            v = Number(v);
            if (!isFinite(v)) return a;
            if (v < a) return a;
            if (v > b) return b;
            return v;
        } catch (e) { return a; }
    }
    function cleanStr(s, max) {
        try {
            if (s === null || s === undefined) return '';
            var out = String(s).replace(/[\x00-\x1F\x7F]/g, '').trim();
            if (max === undefined) max = 32;
            if (out.length > max) out = out.slice(0, max);
            return out;
        } catch (e) { return ''; }
    }
    function fin(v) {
        try { var n = Number(v); return isFinite(n) ? n : undefined; } catch (e) { return undefined; }
    }
    function intOr(out, key, v) {
        try {
            var n = Number(v);
            if (isFinite(n)) out[key] = Math.floor(n);
        } catch (e) { /* omit */ }
    }

    /* Duel codec (mp-2d): score = kills * 1000 + min(gold, 999). */
    function encodeScoreDuel(kills, gold) {
        try {
            var k = (isFinite(kills) && kills > 0) ? Math.floor(kills) : 0;
            var g = (isFinite(gold) && gold > 0) ? Math.floor(gold) : 0;
            if (g > DUEL_GOLD_CAP) g = DUEL_GOLD_CAP;
            var s = k * DUEL_K + g;
            if (!isFinite(s) || s > 1000000) s = 1000000;
            return s;
        } catch (e) { return 0; }
    }
    function decodeScoreDuel(score) {
        try {
            var s = (isFinite(score) && score > 0) ? Math.floor(score) : 0;
            return { kills: Math.floor(s / DUEL_K), gold: s % DUEL_K };
        } catch (e) { return { kills: 0, gold: 0 }; }
    }
    /* Siege codec (mp-3d): score = floor * 10000 + min(kills, 9999). */
    function encodeScoreSiege(floor, kills) {
        try {
            var f = (isFinite(floor) && floor > 0) ? Math.floor(floor) : 0;
            var k = (isFinite(kills) && kills > 0) ? Math.floor(kills) : 0;
            if (k > SIEGE_KILLS_CAP) k = SIEGE_KILLS_CAP;
            var s = f * SIEGE_F + k;
            if (!isFinite(s) || s > 1000000) s = 1000000;
            return s;
        } catch (e) { return 0; }
    }
    function decodeScoreSiege(score) {
        try {
            var s = (isFinite(score) && score > 0) ? Math.floor(score) : 0;
            return { floor: Math.floor(s / SIEGE_F), kills: s % SIEGE_F };
        } catch (e) { return { floor: 0, kills: 0 }; }
    }

    /* Normalize any duel-adapter snapshot into the MMO schema. Never throws. */
    function sanitizeSnapshot(raw) {
        var out = {};
        try {
            if (!raw || typeof raw !== 'object') return out;
            var v;
            v = fin(raw.x); if (v !== undefined) out.x = v;
            v = fin(raw.y); if (v !== undefined) out.y = v;
            v = fin(raw.hp); if (v !== undefined) out.hp = v;
            v = fin(raw.maxhp !== undefined ? raw.maxhp : raw.maxHp);
            if (v !== undefined) out.maxhp = v;
            intOr(out, 'gold', raw.gold);
            intOr(out, 'kills', raw.kills);
            intOr(out, 'floor', raw.floor);
            intOr(out, 'sector', raw.sector);
            v = fin(raw.progress); if (v !== undefined) out.progress = clampNum(v, 0, 100);
            /* boss: relay-safe string convention (see header). */
            try {
                var b = raw.boss;
                if (b && typeof b === 'object') {
                    var bh = fin(b.hp), bm = fin(b.maxhp !== undefined ? b.maxhp : b.maxHp);
                    out.boss = (bh !== undefined && bm !== undefined && bm > 0 && bh > 0) ? 'boss' : '';
                } else if (b === true || b === 1 || (typeof b === 'string' && b !== '')) {
                    out.boss = cleanStr(typeof b === 'string' && b !== 'boss' ? b : 'boss', 32);
                } else {
                    out.boss = '';
                }
            } catch (e2) { out.boss = ''; }
            out.winner = raw.winner === true;
            /* score fallbacks: fill missing duel/siege keys from score codec. */
            try {
                if (raw.score !== undefined && isFinite(Number(raw.score))) {
                    var sc = Math.floor(Number(raw.score));
                    out.score = sc;
                    var dd = decodeScoreDuel(sc);
                    var ds = decodeScoreSiege(sc);
                    if (out.kills === undefined && dd.kills > 0) out.kills = dd.kills;
                    if (out.gold === undefined && dd.gold > 0) out.gold = dd.gold;
                    if (out.floor === undefined && ds.floor > 0) out.floor = ds.floor;
                    if (out.kills === undefined && ds.kills > 0) out.kills = ds.kills;
                }
            } catch (e3) { /* omit */ }
            if (raw.alive !== undefined) out.alive = !(raw.alive === false || raw.alive === 0);
            var sd = cleanStr(raw.seed, 32); if (sd) out.seed = sd;
            var ab = cleanStr(raw.ageBand || raw.age_band, 16); if (ab) out.ageBand = ab;
            var sv = cleanStr(raw.serverId || raw.server, 32); if (sv) out.serverId = sv;
            var pid = cleanStr(raw.playerId || raw.player || raw.id, 64); if (pid) out.playerId = pid;
            var nm = cleanStr(raw.name, 32); if (nm) out.name = nm;
            var em = cleanStr(raw.emote, 32); if (em) out.emote = em;
        } catch (e) { /* best effort */ }
        return out;
    }

    /* Merge incoming foe data into a foe-map keyed by playerId. Accepts a
     * map object, an array of snapshots, or a single snapshot. Bounded. */
    function mergeFoeMap(map, incoming) {
        var out = {};
        try {
            if (map && typeof map === 'object') {
                var keys = Object.keys(map);
                for (var i = 0; i < keys.length && i < MAX_FOES; i++) {
                    try { out[keys[i]] = sanitizeSnapshot(map[keys[i]]); } catch (e) { /* skip */ }
                }
            }
            var list = [];
            try {
                if (!incoming) list = [];
                else if (Object.prototype.toString.call(incoming) === '[object Array]') list = incoming;
                else if (typeof incoming === 'object') {
                    var vals = null;
                    try { vals = Object.keys(incoming); } catch (e2) { vals = null; }
                    var looksMap = false;
                    try {
                        looksMap = !!vals && vals.length > 0 &&
                            incoming[vals[0]] && typeof incoming[vals[0]] === 'object';
                    } catch (e3) { looksMap = false; }
                    list = looksMap ? vals.map(function (k) { return incoming[k]; }) : [incoming];
                }
            } catch (e4) { list = []; }
            for (var j = 0; j < list.length; j++) {
                try {
                    var snap = sanitizeSnapshot(list[j]);
                    var pid = snap.playerId || cleanStr(list[j] && (list[j].playerId || list[j].id), 64);
                    if (!pid) pid = 'foe-' + (Object.keys(out).length + 1);
                    pid = cleanStr(pid, 64) || ('foe-' + (Object.keys(out).length + 1));
                    snap.playerId = pid;
                    out[pid] = snap;
                    var n = 0;
                    try { n = Object.keys(out).length; } catch (e5) { n = 0; }
                    if (n >= MAX_FOES) break;
                } catch (e6) { /* skip bad entry */ }
            }
        } catch (e) { /* never throw */ }
        return out;
    }

    function foeCount(map) {
        try { return map && typeof map === 'object' ? Object.keys(map).length : 0; }
        catch (e) { return 0; }
    }

    function leaderOf(map, me) {
        try {
            var best = null, bestK = -1, bestG = -1;
            var ids = map && typeof map === 'object' ? Object.keys(map) : [];
            for (var i = 0; i < ids.length; i++) {
                var f = map[ids[i]] || {};
                var k = isFinite(f.kills) ? f.kills : 0;
                var g = isFinite(f.gold) ? f.gold : 0;
                if (k > bestK || (k === bestK && g > bestG)) { best = ids[i]; bestK = k; bestG = g; }
            }
            var mk = me && isFinite(me.kills) ? me.kills : 0;
            var mg = me && isFinite(me.gold) ? me.gold : 0;
            if (mk > bestK || (mk === bestK && mg > bestG)) return 'you';
            return best || 'you';
        } catch (e) { return 'you'; }
    }

    /* Economy-safe display quote only. No ledger writes; the economy lane
     * owns all coin movement (QUEUE request, not applied here). */
    function coinQuotePure(gold, kills) {
        try {
            var g = (isFinite(gold) && gold > 0) ? Math.floor(gold) : 0;
            var k = (isFinite(kills) && kills > 0) ? Math.floor(kills) : 0;
            var coins = g + k * 10;
            if (!isFinite(coins) || coins < 0) coins = 0;
            if (coins > 1000000) coins = 1000000;
            return { gold: g, kills: k, coins: coins, currency: 'VCW' };
        } catch (e) { return { gold: 0, kills: 0, coins: 0, currency: 'VCW' }; }
    }

    function queryParam(name) {
        try {
            var w = W();
            var search = (w && w.location && typeof w.location.search === 'string') ? w.location.search : '';
            var m = new RegExp('[?&]' + name + '=([^&]*)').exec(search);
            if (m && m[1] !== undefined) {
                try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
            }
            return '';
        } catch (e) { return ''; }
    }

    function hasMatch() {
        try {
            var w = W();
            var search = (w && w.location && typeof w.location.search === 'string') ? w.location.search : '';
            return /[?&]match=/.test(search);
        } catch (e) { return false; }
    }

    /* ---------- identity / servers ---------- */
    function serverList() {
        try {
            return SERVERS.map(function (s) { return { id: s.id, name: s.name, region: s.region, max: s.max }; });
        } catch (e) { return []; }
    }
    function joinServer(id) {
        try {
            var want = cleanStr(id, 32).toLowerCase();
            for (var i = 0; i < SERVERS.length; i++) {
                if (SERVERS[i].id.toLowerCase() === want) {
                    S.serverId = SERVERS[i].id;
                    return { id: SERVERS[i].id, name: SERVERS[i].name, region: SERVERS[i].region, max: SERVERS[i].max };
                }
            }
            return null;
        } catch (e) { return null; }
    }

    /* ---------- local snapshot ---------- */
    function read() {
        var out = {};
        try {
            try {
                var w = W();
                var ad = w ? w.GraveGainMPAdapter : null;
                if (ad && typeof ad.read === 'function') out = sanitizeSnapshot(ad.read());
            } catch (e) { out = {}; }
            if (!out || typeof out !== 'object') out = {};
            if (S.playerId && !out.playerId) out.playerId = cleanStr(S.playerId, 64);
            if (S.serverId && !out.serverId) out.serverId = cleanStr(S.serverId, 32);
            var seed = queryParam('seed');
            if (seed && !out.seed) out.seed = cleanStr(seed, 32);
        } catch (e) { /* never throw */ }
        return out;
    }

    /* ---------- transport ---------- */
    function heartbeatBody() {
        try {
            return { playerId: cleanStr(S.playerId, 64), serverId: cleanStr(S.serverId, 32), snapshot: read() };
        } catch (e) { return { playerId: '', serverId: '', snapshot: {} }; }
    }
    function postHeartbeat() {
        try {
            if (!S.connected || !S.matchId) return;
            var body = null;
            try { body = JSON.stringify({ events: [{ kind: 'snapshot', text: 'tick', at: Date.now(), snapshot: heartbeatBody().snapshot }] }); }
            catch (e) { return; }
            /* WebSocket first. */
            try {
                if (S.ws && S.ws.readyState === 1) { S.ws.send(body); return; }
            } catch (e2) { /* fall through to REST */ }
            /* REST fallback: POST /api/matches/[id]/events */
            try {
                var w = W();
                var f = (w && typeof w.fetch === 'function') ? w.fetch : (typeof fetch === 'function' ? fetch : null);
                if (!f) return;
                var url = '/api/matches/' + encodeURIComponent(S.matchId) + '/events';
                try {
                    var r = f(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body });
                    if (r && typeof r.catch === 'function') r.catch(function () { /* offline: keep ticking */ });
                } catch (e3) { /* offline */ }
            } catch (e4) { /* no fetch */ }
        } catch (e) { /* never throw */ }
    }
    function startTick() {
        try {
            stopTick();
            var w = W();
            var si = (w && typeof w.setInterval === 'function') ? w.setInterval : setInterval;
            S.timer = si(function () { try { postHeartbeat(); } catch (e) { /* ignore */ } }, TICK_MS);
        } catch (e) { /* timers unavailable: connect still reports */ }
    }
    function stopTick() {
        try {
            if (S.timer) {
                var w = W();
                var ci = (w && typeof w.clearInterval === 'function') ? w.clearInterval : clearInterval;
                try { ci(S.timer); } catch (e) { /* ignore */ }
                S.timer = 0;
            }
        } catch (e) { /* ignore */ }
    }

    function connect(opts) {
        try {
            opts = (opts && typeof opts === 'object') ? opts : {};
            var sid = cleanStr(opts.serverId || opts.server, 32);
            if (sid) S.serverId = sid;
            var pid = cleanStr(opts.playerId || opts.player, 64);
            if (pid) S.playerId = pid;
            else if (!S.playerId) {
                try {
                    var w0 = W();
                    var q = queryParam('player');
                    S.playerId = cleanStr(q, 64) || 'you';
                } catch (e) { S.playerId = 'you'; }
            }
            var mid = cleanStr(opts.matchId || opts.match || queryParam('match'), 64);
            if (mid) S.matchId = mid;
            if (typeof opts.onUpdate === 'function') S.onUpdate = opts.onUpdate;
            /* WebSocket when a URL is supplied and the ctor exists. */
            try {
                var url = cleanStr(opts.wsUrl || opts.url, 256);
                var w = W();
                var WS = (w && typeof w.WebSocket === 'function') ? w.WebSocket : (typeof WebSocket === 'function' ? WebSocket : null);
                if (url && WS) {
                    try {
                        if (S.ws && typeof S.ws.close === 'function') { try { S.ws.close(); } catch (e2) { /* ignore */ } }
                    } catch (e3) { /* ignore */ }
                    var ws = new WS(url);
                    S.ws = ws;
                    try {
                        ws.onmessage = function (ev) {
                            try {
                                var data = ev && ev.data !== undefined ? ev.data : '';
                                var msg = null;
                                try { msg = typeof data === 'string' ? JSON.parse(data) : data; }
                                catch (e4) { msg = null; }
                                if (msg) {
                                    var inc = msg.foes || msg.players || msg.snapshot || msg.foe || null;
                                    if (inc) {
                                        S.foes = mergeFoeMap(S.foes, inc);
                                        paint();
                                        if (typeof S.onUpdate === 'function') {
                                            try { S.onUpdate(S.foes); } catch (e5) { /* ignore */ }
                                        }
                                    }
                                }
                            } catch (e6) { /* ignore */ }
                        };
                    } catch (e7) { /* ignore */ }
                    try {
                        ws.onclose = function () { try { S.ws = null; } catch (e8) { /* ignore */ } };
                        ws.onerror = function () { /* REST fallback keeps ticking */ };
                    } catch (e9) { /* ignore */ }
                }
            } catch (e10) { /* WS unavailable: REST fallback */ }
            S.connected = true;
            startTick();
            try { postHeartbeat(); } catch (e11) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    }

    function disconnect() {
        try {
            S.connected = false;
            stopTick();
            try {
                if (S.ws && typeof S.ws.close === 'function') S.ws.close();
            } catch (e) { /* ignore */ }
            S.ws = null;
            return true;
        } catch (e) { return false; }
    }

    /* ---------- render (N-player board, solo-safe) ---------- */
    function ensureBoard() {
        try {
            if (S.board) return S.board;
            var d = D();
            if (!d || typeof d.createElement !== 'function') return null;
            var host = null;
            try { host = d.body; } catch (e) { host = null; }
            if (!host || typeof host.appendChild !== 'function') return null;
            var old = null;
            try { old = d.getElementById(BOARD_ID); } catch (e2) { old = null; }
            if (old) return old;
            var box = d.createElement('div');
            box.id = BOARD_ID;
            try {
                box.style.cssText = 'position:fixed;top:8px;left:8px;z-index:9999;max-width:44vw;' +
                    'background:rgba(5,3,13,0.85);border:1px solid #a855f7;border-radius:8px;' +
                    'color:#e9d5ff;font-family:monospace,monospace;font-size:11px;line-height:1.5;' +
                    'padding:6px 8px;white-space:pre-wrap;pointer-events:none;';
            } catch (e3) { /* ignore */ }
            try { host.appendChild(box); } catch (e4) { return null; }
            S.board = box;
            return box;
        } catch (e) { return null; }
    }
    function paint() {
        try {
            var board = ensureBoard();
            if (!board) return;
            var me = read();
            var ids = Object.keys(S.foes);
            var lines = [];
            lines.push('GRAVEGAIN MMO v' + VERSION + ' [' + (S.serverId || 'lobby') + ']');
            var myLine = 'YOU';
            if (me.kills !== undefined) myLine += ' K' + Math.floor(Number(me.kills) || 0);
            if (me.gold !== undefined) myLine += ' G' + Math.floor(Number(me.gold) || 0);
            if (me.floor !== undefined) myLine += ' L' + Math.floor(Number(me.floor) || 0);
            else if (me.sector !== undefined) myLine += ' S' + (Math.floor(Number(me.sector) || 0) + 1);
            lines.push(myLine);
            var shown = 0;
            for (var i = 0; i < ids.length && shown < 8; i++) {
                var f = S.foes[ids[i]] || {};
                var ln = String(ids[i]).slice(0, 16);
                if (f.kills !== undefined) ln += ' K' + Math.floor(Number(f.kills) || 0);
                if (f.gold !== undefined) ln += ' G' + Math.floor(Number(f.gold) || 0);
                if (f.floor !== undefined) ln += ' L' + Math.floor(Number(f.floor) || 0);
                else if (f.sector !== undefined) ln += ' S' + (Math.floor(Number(f.sector) || 0) + 1);
                if (f.boss) ln += ' BOSS';
                if (f.winner) ln += ' WIN';
                lines.push(ln);
                shown++;
            }
            if (ids.length > shown) lines.push('... +' + (ids.length - shown) + ' more');
            lines.push('leader: ' + leaderOf(S.foes, me));
            try { board.textContent = lines.join('\n'); } catch (e2) { /* ignore */ }
        } catch (e) { /* never throw */ }
    }

    function render(foes, events) {
        try {
            var had = foeCount(S.foes) > 0;
            if (foes !== undefined && foes !== null) S.foes = mergeFoeMap(S.foes, foes);
            /* Solo-safe: no board until match traffic, ?match=, or connect(). */
            if (foeCount(S.foes) === 0 && !had && !hasMatch() && !S.connected) return true;
            try {
                if (events) {
                    var list = Object.prototype.toString.call(events) === '[object Array]' ? events : [events];
                    for (var i = 0; i < list.length; i++) {
                        var ev = list[i];
                        if (ev && typeof ev === 'object' && (ev.snapshot || ev.playerId)) {
                            S.foes = mergeFoeMap(S.foes, ev.snapshot || ev);
                        }
                    }
                }
            } catch (e2) { /* ignore */ }
            paint();
            if (typeof S.onUpdate === 'function') {
                try { S.onUpdate(S.foes); } catch (e3) { /* ignore */ }
            }
            return true;
        } catch (e) { return true; }
    }

    function summary() {
        try {
            var me = read();
            var n = foeCount(S.foes);
            var mk = (me && isFinite(me.kills)) ? Math.floor(me.kills) : 0;
            var mg = (me && isFinite(me.gold)) ? Math.floor(me.gold) : 0;
            var lead = leaderOf(S.foes, me);
            return 'you K' + mk + ' G' + mg + ' vs ' + n + ' rival' + (n === 1 ? '' : 's') + ' (leader: ' + lead + ')';
        } catch (e) { return 'you vs rivals'; }
    }

    function coinQuote(gold, kills) {
        try { return coinQuotePure(gold, kills); } catch (e) { return { gold: 0, kills: 0, coins: 0, currency: 'VCW' }; }
    }

    var api = {
        MODE: MODE,
        VERSION: VERSION,
        TICK_MS: TICK_MS,
        connect: connect,
        disconnect: disconnect,
        read: function () { try { return read(); } catch (e) { return {}; } },
        render: render,
        summary: summary,
        serverList: serverList,
        joinServer: joinServer,
        coinQuote: coinQuote
    };
    api._pure = {
        clampNum: clampNum,
        cleanStr: cleanStr,
        encodeScoreDuel: encodeScoreDuel,
        decodeScoreDuel: decodeScoreDuel,
        encodeScoreSiege: encodeScoreSiege,
        decodeScoreSiege: decodeScoreSiege,
        sanitizeSnapshot: sanitizeSnapshot,
        mergeFoeMap: mergeFoeMap,
        foeCount: foeCount,
        leaderOf: leaderOf,
        coinQuotePure: coinQuotePure,
        heartbeatBody: heartbeatBody,
        TICK_MS: TICK_MS,
        MAX_FOES: MAX_FOES,
        VERSION: VERSION
    };
    try {
        var w = W();
        if (w) w.GraveGainMMO = api;
    } catch (e) { /* window unwritable */ }
    try {
        if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
    } catch (e) { /* browser: module undefined */ }
})();
