/* =========================================================================
 * GraveGain4D - MMORPG bridge (net4d <-> MMORPG adapter contract)
 * (window.GraveGainMPBridge4D; fills window.GraveGainMPAdapterMMORPG4D
 *  only when ../mmorpg-4d.js has not already published it)
 * -------------------------------------------------------------------------
 * Maps between the 4D netplay conventions of
 *   public/games/gravegain4d/net/net4d.js  (window.GraveGain4DNet:
 *   BroadcastChannel echo {x,y,z,w,hole,score,alive}, score codec
 *   score = hole * 10000 + min(strokes, 9999), world-boss fronts)
 * plus the dream-golf state (hole, putts/strokes, W-angle, dream-shift
 * count, world id from dreamforge / GG4D_Dream / save-bridge shapes),
 * and the shared MMORPG adapter snapshot:
 *   {x,y,hp,maxhp,gold,kills,floor,progress,boss,winner,seed,
 *    serverId,ageBand}
 * consumed by window.GraveGainMPAdapterMMORPG4D in ../mmorpg-4d.js
 * ({ mode:'dream-raid', read, render }).
 *
 * Canonical field map (mirrors ../mmorpg-4d.js exactly so bridge snapshots
 * and adapter snapshots agree on the raid board):
 *   floor/hole = dream hole (1-based), kills = putts (total strokes, fewer
 *   is better), gold = dream-shift count (purse gold yields when shifts are
 *   unknown), deaths = rewinds when known, score = hole * 10000 + putts.
 * The five dream-golf legs stay round-trippable via the documented extras
 * hole / putts / wAngle / dreamShifts / worldId carried alongside.
 *
 * Fail-open: every side is optional. With no net4d present the snapshot
 * mappers still work off local dream-golf state; with no adapter present
 * this file publishes a fallback adapter slot (canonical ../mmorpg-4d.js
 * wins when it loads first or later -- this bridge stands down and only
 * exposes its helpers). With neither present, read() returns {} and
 * render() returns true. Never throws.
 *
 * Solo-safe: NO timers and NO DOM writes without ?mmorpg=<serverId>.
 * read() and the pure mappers are read-only and always safe. Joining the
 * net4d room (createRoom) and building the overlay happen only behind the
 * ?mmorpg= gate; the 500ms echo tick itself stays owned by net4d.js.
 *
 * Vanilla JS, ASCII-only, never throws. Read-only toward game state, HUD,
 * canvas, and saves: the only outbound writes are net4d echo/front
 * publishes (network, not game state) and this bridge's own overlay nodes.
 * ========================================================================= */
(function () {
    'use strict';

    var VERSION = '4d-mmorpg-bridge-1';
    if (typeof window === 'undefined') return;
    if (window.GraveGainMPBridge4D && window.GraveGainMPBridge4D.VERSION) return;

    var MODE = 'dream-raid';
    var SCORE_F = 10000;
    var SCORE_CAP = 9999;
    var MAX_PEERS = 32;
    var HOLES_PER_RUN = 10;

    /* ------------------------- tiny guards ------------------------- */
    function W() {
        try { if (typeof window !== 'undefined' && window) return window; } catch (_) { /* ignore */ }
        try { if (typeof globalThis !== 'undefined' && globalThis) return globalThis; } catch (_) { /* ignore */ }
        return {};
    }
    function D() {
        try { if (typeof document !== 'undefined' && document) return document; } catch (_) { /* ignore */ }
        try { var w = W(); if (w && w.document) return w.document; } catch (_) { /* ignore */ }
        return null;
    }
    function fin(v) {
        var n = Number(v);
        return isFinite(n) ? n : undefined;
    }
    function int(v, dflt) {
        var n = Math.floor(Number(v));
        return isFinite(n) ? n : dflt;
    }
    function clampNum(v, a, b) {
        try {
            v = Number(v);
            if (!isFinite(v)) return a;
            if (v < a) return a;
            if (v > b) return b;
            return v;
        } catch (_) { return a; }
    }
    function capStr(v, n) {
        try { return String(v).slice(0, n || 32); }
        catch (_) { return ''; }
    }
    function cleanStr(s, max) {
        try {
            if (s === null || s === undefined) return '';
            var out = String(s).replace(/[\x00-\x1F\x7F]/g, '').trim();
            if (max === undefined) max = 32;
            if (out.length > max) out = out.slice(0, max);
            return out;
        } catch (_) { return ''; }
    }

    /* Score codec mirrors net4d.js and ../mmorpg-4d.js:
     * score = hole * 10000 + min(putts,9999). decode returns both the
     * net4d name (strokes) and the adapter name (putts). */
    function encodeScore(hole, putts) {
        try {
            var h = int(hole, 0); if (h < 0) h = 0; if (h > 99) h = 99;
            var s = int(putts, 0); if (s < 0) s = 0; if (s > SCORE_CAP) s = SCORE_CAP;
            return h * SCORE_F + s;
        } catch (_) { return 0; }
    }
    function decodeScore(score) {
        try {
            var n = int(score, 0); if (n < 0) n = 0;
            var hole = Math.floor(n / SCORE_F), putts = n % SCORE_F;
            return { hole: hole, strokes: putts, putts: putts };
        } catch (_) { return { hole: 0, strokes: 0, putts: 0 }; }
    }

    /* ------------------------- ?mmorpg= gate ------------------------- */
    function queryParam(name) {
        try {
            var w = W();
            var search = '';
            if (w && w.location && typeof w.location.search === 'string') search = w.location.search;
            var m = new RegExp('[?&]' + name + '=([^&]*)').exec(search);
            if (m && m[1] !== undefined) {
                try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (_) { return m[1]; }
            }
            return '';
        } catch (_) { return ''; }
    }
    // Solo-safe marker (?mmorpg dormant): empty unless ?mmorpg=<serverId>.
    function serverId() {
        try { return cleanStr(queryParam('mmorpg'), 64); }
        catch (_) { return ''; }
    }
    function hasServer() {
        try { return !!serverId(); } catch (_) { return false; }
    }
    function ageBand() {
        try {
            var q = cleanStr(queryParam('ageband') || queryParam('age_band'), 16).toLowerCase();
            if (q === 'kid' || q === 'teen' || q === 'all') return q;
            var w = W();
            if (w) {
                if (w.GraveGainAgeBand) {
                    var b = cleanStr(w.GraveGainAgeBand, 16).toLowerCase();
                    if (b === 'kid' || b === 'teen' || b === 'all') return b;
                }
                if (w.GraveGainAgeBands && typeof w.GraveGainAgeBands.band === 'function') {
                    var b2 = cleanStr(w.GraveGainAgeBands.band(), 16).toLowerCase();
                    if (b2 === 'kid' || b2 === 'teen' || b2 === 'all') return b2;
                }
            }
            return '';
        } catch (_) { return ''; }
    }

    /* ------------------------- side lookups (fail-open) ------------------------- */
    function net() {
        try {
            var w = W();
            var n = w && w.GraveGain4DNet;
            if (n && typeof n === 'object') return n;
            return null;
        } catch (_) { return null; }
    }
    function canonicalAdapter() {
        try {
            var w = W();
            var a = w && w.GraveGainMPAdapterMMORPG4D;
            if (a && typeof a === 'object' && typeof a.read === 'function') return a;
            return null;
        } catch (_) { return null; }
    }
    function dreamApi() {
        // v2 dreamforge (net/dreamforge.js) prefers step(); html dream-rift
        // (world/dreamgen.js) keeps state in GG4D_Dream.
        try {
            var w = W();
            if (w && w.GraveGain4DDream && typeof w.GraveGain4DDream === 'object') {
                return { kind: 'dreamforge', api: w.GraveGain4DDream };
            }
            if (w && w.GG4D_Dream && typeof w.GG4D_Dream === 'object') {
                return { kind: 'dreamgen', api: w.GG4D_Dream };
            }
            return null;
        } catch (_) { return null; }
    }
    function gameRoot() {
        try {
            var w = W();
            if (!w) return null;
            var keys = ['GraveGain4DGame', 'GraveGain4D', 'GraveGainGame', 'GG4D'];
            for (var i = 0; i < keys.length; i++) {
                try {
                    var g = w[keys[i]];
                    if (g && typeof g === 'object') return g;
                } catch (_) { /* next */ }
            }
            return null;
        } catch (_) { return null; }
    }
    /* Canonical adapter sources (../mmorpg-4d.js, read-only mirrors):
     * window.GraveGain4D dream-play boot (state(), ball, player,
     * dreamShift/dreamShiftCount, rewinds), window.GG4D_Game live model,
     * the save-bridge snapshot (__gravegain4dSnapshot / GraveGain4DSaveBridge),
     * and DOM fallbacks (hudHpText/hudGoldText/hudRiftText/gg4dHoleText). */
    function dreamBoot() {
        try {
            var w = W();
            var d = w && w.GraveGain4D;
            if (d && typeof d === 'object') return d;
            return null;
        } catch (_) { return null; }
    }
    function liveGame() {
        try {
            var w = W();
            var g = w && w.GG4D_Game;
            if (g && typeof g === 'object') return g;
            return null;
        } catch (_) { return null; }
    }
    function bridgeSnap() {
        try {
            var w = W();
            if (!w) return null;
            try {
                if (w.__gravegain4dSnapshot && typeof w.__gravegain4dSnapshot.get === 'function') {
                    var s = w.__gravegain4dSnapshot.get();
                    if (s && typeof s === 'object') return s;
                }
            } catch (_) { /* ignore */ }
            try {
                if (w.GraveGain4DSaveBridge && typeof w.GraveGain4DSaveBridge.snapshot === 'function') {
                    var s2 = w.GraveGain4DSaveBridge.snapshot();
                    if (s2 && typeof s2 === 'object') return s2;
                }
            } catch (_) { /* ignore */ }
            return null;
        } catch (_) { return null; }
    }
    function elText(id) {
        try {
            var d = D();
            if (!d || typeof d.getElementById !== 'function') return '';
            var n = d.getElementById(id);
            if (!n) return '';
            var t = n.textContent;
            if (t === null || t === undefined) t = n.innerText;
            return String(t || '');
        } catch (_) { return ''; }
    }
    function gameState() {
        // Read-only scrape across the html + v2 runtime shapes. Never writes.
        try {
            var G = gameRoot();
            if (!G) return {};
            var st = null;
            try {
                if (typeof G.getState === 'function') st = G.getState();
                else if (G.state && typeof G.state === 'object') st = G.state;
                else st = G;
            } catch (_) { st = null; }
            if (!st || typeof st !== 'object') return {};
            return st;
        } catch (_) { return {}; }
    }

    /* ------------------------- dream-golf scrape ------------------------- */
    // Canonical dream-golf observation:
    //   { hole, putts, wAngle, dreamShifts, worldId,
    //     x, y, z, w, hp, maxhp, gold, kills, boss, winner, seed,
    //     missionId, depth, brane, par }
    // Keys are omitted when unknown; never throws; read-only.
    function readDreamGolf() {
        var out = {};
        try {
            var w = W();
            var st = gameState();
            var G = gameRoot() || {};

            // Ball / caddie position (net4d reads ballX..ballW; html putt
            // keeps ball {x,y,z,w} on the putt instance or main state).
            // Snapshot y rides the z plane like ../mmorpg-4d.js (x + z).
            try {
                var ball = null;
                try {
                    var db = dreamBoot();
                    if (db && db.ball && typeof db.ball === 'object') ball = db.ball;
                    else if (db && typeof db.state === 'function') {
                        var dst = db.state();
                        if (dst && dst.ball && typeof dst.ball === 'object') ball = dst.ball;
                    }
                } catch (_) { /* ignore */ }
                if (!ball) {
                    if (G.putt && G.putt.ball) ball = G.putt.ball;
                    else if (st.ball && typeof st.ball === 'object') ball = st.ball;
                }
                if (ball) {
                    if (isFinite(Number(ball.x))) out.x = Number(ball.x);
                    if (isFinite(Number(ball.z))) out.y = Number(ball.z);
                    else if (out.y === undefined && isFinite(Number(ball.y))) out.y = Number(ball.y);
                    if (isFinite(Number(ball.z))) out.z = Number(ball.z);
                    if (isFinite(Number(ball.w))) out.w = Number(ball.w);
                }
                if (out.x === undefined && isFinite(Number(st.ballX))) out.x = Number(st.ballX);
                if (out.y === undefined && isFinite(Number(st.ballY))) out.y = Number(st.ballY);
                if (out.z === undefined && isFinite(Number(st.ballZ))) out.z = Number(st.ballZ);
                if (out.w === undefined && isFinite(Number(st.ballW))) out.w = Number(st.ballW);
                if (out.w === undefined && isFinite(Number(st.w))) out.w = Number(st.w);
            } catch (_) { /* omit position */ }

            // Hole (1-based mission / rift hole). Portals depth is 0-based.
            try {
                var hole = undefined;
                if (isFinite(Number(st.hole))) hole = Math.floor(Number(st.hole));
                else if (isFinite(Number(st.missionId))) hole = Math.floor(Number(st.missionId));
                else if (isFinite(Number(G.missionId))) hole = Math.floor(Number(G.missionId));
                else {
                    var depth = undefined;
                    try {
                        if (w && w.GG4D_Portals && typeof w.GG4D_Portals.snapshot === 'function') {
                            var ps = w.GG4D_Portals.snapshot();
                            if (ps && isFinite(Number(ps.depth))) depth = Math.floor(Number(ps.depth));
                        }
                    } catch (_) { /* ignore */ }
                    if (depth === undefined && st.portals && isFinite(Number(st.portals.depth))) {
                        depth = Math.floor(Number(st.portals.depth));
                    }
                    if (depth !== undefined) hole = depth + 1;
                }
                if (hole !== undefined) {
                    if (hole < 1) hole = 1;
                    if (hole > 99) hole = 99;
                    out.hole = hole;
                    out.floor = hole;
                    out.missionId = hole;
                }
            } catch (_) { /* omit hole */ }

            // Putts / strokes (html putt instance counts strokes; save-bridge
            // snapshots player.strokes; dream-play boot state carries
            // strokes; v2 runtime may carry either).
            try {
                var putts = undefined;
                try {
                    var db2 = dreamBoot();
                    if (db2 && typeof db2.state === 'function') {
                        var dst2 = db2.state();
                        if (dst2 && isFinite(Number(dst2.strokes))) putts = Math.floor(Number(dst2.strokes));
                    }
                } catch (_) { /* ignore */ }
                if (putts === undefined && G.putt && isFinite(Number(G.putt.strokes))) putts = Math.floor(Number(G.putt.strokes));
                if (putts === undefined && isFinite(Number(st.strokes))) putts = Math.floor(Number(st.strokes));
                if (putts === undefined && st.player && isFinite(Number(st.player.strokes))) {
                    putts = Math.floor(Number(st.player.strokes));
                }
                if (putts === undefined) {
                    try {
                        var bs = bridgeSnap();
                        if (bs && bs.player && isFinite(Number(bs.player.strokes))) {
                            putts = Math.floor(Number(bs.player.strokes));
                        }
                    } catch (_) { /* ignore */ }
                }
                if (putts !== undefined && putts >= 0) out.putts = putts;
            } catch (_) { /* omit putts */ }
            try {
                var par = undefined;
                if (G.putt && isFinite(Number(G.putt.par))) par = Math.floor(Number(G.putt.par));
                if (par === undefined && isFinite(Number(st.par))) par = Math.floor(Number(st.par));
                if (par !== undefined && par > 0) out.par = par;
            } catch (_) { /* omit par */ }

            // W-angle: the ana/kata aim component (putt aim.w), falling back
            // to the live slice position w so echoes still steer 4D.
            try {
                var ang = undefined;
                if (G.putt && G.putt.aim && isFinite(Number(G.putt.aim.w))) {
                    ang = Number(G.putt.aim.w);
                } else if (st.aim && isFinite(Number(st.aim.w))) {
                    ang = Number(st.aim.w);
                } else if (out.w !== undefined) {
                    ang = clampNum(Number(out.w), -1, 1);
                }
                if (ang !== undefined && isFinite(ang)) out.wAngle = clampNum(ang, -1, 1);
            } catch (_) { /* omit wAngle */ }

            // Dream-shift count: dreamforge step() (v2) or GG4D_Dream regens
            // (html dream-rift) -- both count how many times the world
            // re-dreamed itself around the player. Canonical extras:
            // dream-play boot dreamShift/dreamShiftCount, live-model
            // g.state.shifts, and the hudRiftText "W+N" DOM fallback.
            try {
                var shifts = undefined;
                try {
                    var db3 = dreamBoot();
                    if (db3) {
                        if (isFinite(Number(db3.dreamShift))) shifts = Math.floor(Number(db3.dreamShift));
                        else if (isFinite(Number(db3.dreamShiftCount))) shifts = Math.floor(Number(db3.dreamShiftCount));
                        else if (typeof db3.state === 'function') {
                            var dst3 = db3.state();
                            if (dst3 && isFinite(Number(dst3.dreamShift))) shifts = Math.floor(Number(dst3.dreamShift));
                        }
                    }
                } catch (_) { /* ignore */ }
                if (shifts === undefined) {
                    var d = dreamApi();
                    if (d && d.kind === 'dreamforge' && typeof d.api.step === 'function') {
                        var s1 = Math.floor(Number(d.api.step()));
                        if (isFinite(s1)) shifts = s1;
                    }
                }
                if (shifts === undefined) {
                    try {
                        var lg = liveGame();
                        if (lg && lg.state && isFinite(Number(lg.state.shifts))) {
                            shifts = Math.floor(Number(lg.state.shifts));
                        }
                    } catch (_) { /* ignore */ }
                }
                if (shifts === undefined && d && d.kind === 'dreamgen') {
                    try {
                        if (typeof d.api.snapshot === 'function') {
                            var ds = d.api.snapshot();
                            if (ds && isFinite(Number(ds.regens))) shifts = Math.floor(Number(ds.regens));
                        }
                    } catch (_) { /* ignore */ }
                    if (shifts === undefined && d.api.state && d.api.state.dream &&
                        isFinite(Number(d.api.state.dream.regens))) {
                        shifts = Math.floor(Number(d.api.state.dream.regens));
                    }
                }
                if (shifts === undefined && st.dream && isFinite(Number(st.dream.regens))) {
                    shifts = Math.floor(Number(st.dream.regens));
                }
                if (shifts === undefined) {
                    try {
                        var rt = elText('hudRiftText'); // "W+0"
                        var rm = /W\s*\+\s*(\d+)/i.exec(rt);
                        if (rm) shifts = Math.floor(Number(rm[1]));
                    } catch (_) { /* omit */ }
                }
                if (shifts !== undefined && shifts >= 0) out.dreamShifts = shifts;
            } catch (_) { /* omit dreamShifts */ }

            // Rewinds (deaths when known): dream-play boot rewinds counter.
            try {
                var rewinds = undefined;
                try {
                    var db4 = dreamBoot();
                    if (db4) {
                        if (isFinite(Number(db4.rewinds))) rewinds = Math.floor(Number(db4.rewinds));
                        else if (typeof db4.state === 'function') {
                            var dst4 = db4.state();
                            if (dst4 && isFinite(Number(dst4.rewinds))) rewinds = Math.floor(Number(dst4.rewinds));
                        }
                    }
                } catch (_) { /* ignore */ }
                if (rewinds === undefined && isFinite(Number(st.rewinds))) {
                    rewinds = Math.floor(Number(st.rewinds));
                }
                if (rewinds !== undefined && rewinds >= 0) out.rewinds = rewinds;
            } catch (_) { /* omit rewinds */ }

            // Vitals / purse / tally (main4d state + save-bridge player).
            try {
                var p = (st.player && typeof st.player === 'object') ? st.player : st;
                var hp = Number(p.hp !== undefined ? p.hp : st.hp);
                var mx = Number(p.maxHp !== undefined ? p.maxHp : (p.maxHP !== undefined ? p.maxHP : st.maxHp));
                if (isFinite(hp) && isFinite(mx) && mx > 0) {
                    out.hp = Math.max(0, Math.ceil(hp));
                    out.maxhp = Math.round(mx);
                }
            } catch (_) { /* omit hp */ }
            try {
                var gold = Number(st.gold);
                if (!isFinite(gold) && st.player) gold = Number(st.player.gold);
                if (isFinite(gold)) out.gold = Math.max(0, Math.floor(gold));
            } catch (_) { /* omit gold */ }
            try {
                var kills = Number(st.killCredits);
                if (!isFinite(kills)) kills = Number(st.kills);
                if (!isFinite(kills) && st.player) kills = Number(st.player.kills);
                if (isFinite(kills)) out.kills = Math.max(0, Math.floor(kills));
            } catch (_) { /* omit kills */ }

            // Boss: live boss name when engaged, else the weekly world-boss
            // id from net4d so raid fronts stay labelled the same as net4d.
            try {
                var boss = '';
                if (st.boss) {
                    boss = cleanStr(typeof st.boss === 'object' ? (st.boss.name || st.boss.key || st.boss.id) : st.boss, 32);
                }
                if (!boss) {
                    var n0 = net();
                    if (n0 && typeof n0.bossForWeek === 'function') {
                        var wb = n0.bossForWeek(Date.now());
                        if (wb && wb.id) boss = cleanStr(wb.id, 32);
                    }
                }
                if (boss) out.boss = boss;
            } catch (_) { /* omit boss */ }

            // Winner: run-complete flags across shapes; never inferred.
            try {
                if (st.won === true || st.victory === true || st.runComplete === true ||
                    G.won === true || (isFinite(Number(out.hole)) && Number(out.hole) > HOLES_PER_RUN)) {
                    out.winner = true;
                }
            } catch (_) { /* omit winner */ }

            // Seed: dungeon seed first (party share key), then dream seed.
            try {
                var seed = '';
                if (st.dungeonSeed !== undefined && String(st.dungeonSeed) !== '') {
                    seed = cleanStr(st.dungeonSeed, 32);
                } else if (st.seed !== undefined && String(st.seed) !== '') {
                    seed = cleanStr(st.seed, 32);
                } else {
                    var d2 = dreamApi();
                    if (d2 && d2.kind === 'dreamgen') {
                        try {
                            if (typeof d2.api.snapshot === 'function') {
                                var s2 = d2.api.snapshot();
                                if (s2 && s2.seed !== undefined) seed = cleanStr(s2.seed, 32);
                            }
                        } catch (_) { /* ignore */ }
                    } else if (d2 && d2.kind === 'dreamforge' && typeof d2.api.dreamCode === 'function') {
                        seed = cleanStr(d2.api.dreamCode(), 32);
                    }
                }
                if (!seed) {
                    var qs = cleanStr(queryParam('seed'), 32);
                    if (qs) seed = qs;
                }
                if (seed) out.seed = seed;
            } catch (_) { /* omit seed */ }

            // Brane / depth complete the world identity.
            try {
                var brane = '';
                if (st.brane === 'light' || st.brane === 'gloom') brane = st.brane;
                else if (st.portals && (st.portals.brane === 'light' || st.portals.brane === 'gloom')) {
                    brane = st.portals.brane;
                }
                if (brane) out.brane = brane;
            } catch (_) { /* omit brane */ }

            // World id: stable party key "m<mission>:<seed>:<brane>:d<depth>".
            try {
                var parts = [];
                parts.push('m' + (out.missionId !== undefined ? out.missionId : (out.hole !== undefined ? out.hole : 1)));
                parts.push(String(out.seed !== undefined ? out.seed : 'noseed'));
                parts.push(out.brane || 'light');
                out.worldId = capStr(parts.join(':').toLowerCase(), 64);
            } catch (_) { /* omit worldId */ }
        } catch (_) { /* never throw; return best effort */ }
        return out;
    }

    /* ------------------------- forward: dream -> snapshot ------------------------- */
    // Shared MMORPG snapshot (canonical ../mmorpg-4d.js field map):
    //   {x,y,hp,maxhp,gold,kills,floor,progress,boss,winner,seed,
    //    serverId,ageBand}
    // with kills = putts (total strokes, fewer is better), gold =
    // dream-shift count (purse gold yields when shifts are unknown),
    // deaths = rewinds when known. Relay headline extras score
    // (hole * 10000 + putts) + alive ride along, plus the round-trip legs
    // hole / putts / wAngle / dreamShifts / worldId.
    function dreamToSnapshot(d) {
        var out = {};
        try {
            if (!d || typeof d !== 'object') d = {};
            if (isFinite(Number(d.x))) out.x = Number(d.x);
            if (isFinite(Number(d.y))) out.y = Number(d.y);
            if (isFinite(Number(d.hp)) && isFinite(Number(d.maxhp)) && Number(d.maxhp) > 0) {
                out.hp = Math.max(0, Math.ceil(Number(d.hp)));
                out.maxhp = Math.round(Number(d.maxhp));
            }
            var putts = isFinite(Number(d.putts)) ? Math.max(0, Math.floor(Number(d.putts))) : undefined;
            var shifts = isFinite(Number(d.dreamShifts)) ? Math.max(0, Math.floor(Number(d.dreamShifts))) : undefined;
            // kills = putts (golf order: fewer is better on the raid board).
            if (putts !== undefined) { out.kills = putts; out.putts = putts; }
            // gold = dream-shift count; purse gold yields when shifts unknown.
            if (shifts !== undefined) { out.gold = shifts; out.dreamShifts = shifts; }
            else if (isFinite(Number(d.gold))) out.gold = Math.max(0, Math.floor(Number(d.gold)));
            // deaths = rewinds when known, else omitted.
            if (isFinite(Number(d.rewinds))) out.deaths = Math.max(0, Math.floor(Number(d.rewinds)));
            var floor = isFinite(Number(d.floor)) ? Math.floor(Number(d.floor))
                : (isFinite(Number(d.hole)) ? Math.floor(Number(d.hole)) : undefined);
            if (floor !== undefined) { out.floor = clampNum(floor, 1, 99); out.hole = out.floor; }
            // Progress: completed holes are worth 10 points each on a 10-hole
            // run; the live hole contributes up to 10 by strokes-vs-par so a
            // birdie pace visibly leads the raid board. Winner pins 100.
            try {
                var h = isFinite(Number(d.hole)) ? Math.floor(Number(d.hole)) : (floor || 1);
                var base = clampNum((h - 1) * (100 / HOLES_PER_RUN), 0, 100);
                var pp = (putts !== undefined) ? putts : 0;
                var par = isFinite(Number(d.par)) && Number(d.par) > 0 ? Math.floor(Number(d.par)) : 3;
                var live = clampNum((par - Math.max(0, pp) + par) / (2 * par), 0, 1);
                out.progress = Math.round(clampNum(base + live * (100 / HOLES_PER_RUN), 0, 100) * 10) / 10;
            } catch (_) { out.progress = 0; }
            if (d.boss) out.boss = cleanStr(d.boss, 32);
            else out.boss = '';
            if (d.winner === true) { out.winner = true; out.progress = 100; }
            if (d.wAngle !== undefined && isFinite(Number(d.wAngle))) {
                out.wAngle = clampNum(Number(d.wAngle), -1, 1);
            }
            if (d.worldId !== undefined && String(d.worldId) !== '') {
                out.worldId = capStr(d.worldId, 64);
            }
            // Relay headline extras (hole*10000+putts) + alive, like the
            // canonical adapter, so string-only relays keep the race.
            try {
                out.score = encodeScore(out.hole || out.floor || 1, (putts !== undefined) ? putts : 0);
                out.alive = !(out.hp === 0);
            } catch (_) { /* extras optional */ }
            if (d.seed !== undefined && String(d.seed) !== '') out.seed = cleanStr(d.seed, 32);
            var sid = serverId();
            if (sid) out.serverId = sid;
            var band = ageBand();
            if (band) out.ageBand = band;
        } catch (_) { /* best effort */ }
        return out;
    }

    /* ------------------------- back: snapshot -> dream ------------------------- */
    // Inverse of the canonical map above: kills -> putts, gold ->
    // dreamShifts, deaths -> rewinds, floor/hole -> hole. Lossy by design
    // (snapshots carry no aim vector); wAngle defaults to 0 and worldId
    // rebuilds from floor + seed, never as guesses written into game state.
    function snapshotToDream(snap) {
        var out = {};
        try {
            if (!snap || typeof snap !== 'object') return out;
            if (isFinite(Number(snap.x))) out.x = Number(snap.x);
            if (isFinite(Number(snap.y))) out.y = Number(snap.y);
            var floor = isFinite(Number(snap.floor)) ? Math.floor(Number(snap.floor))
                : (isFinite(Number(snap.hole)) ? Math.floor(Number(snap.hole)) : 1);
            out.floor = clampNum(floor, 1, 99);
            out.hole = out.floor;
            out.missionId = out.floor;
            if (isFinite(Number(snap.putts))) out.putts = Math.max(0, Math.floor(Number(snap.putts)));
            else if (isFinite(Number(snap.kills))) out.putts = Math.max(0, Math.floor(Number(snap.kills)));
            else {
                // Progress unmaps to an indicative putt count against par 3
                // so a peer dot can sit ahead/behind on the raid board.
            try {
                var prog = clampNum(Number(snap.progress), 0, 100);
                var frac = (prog - (out.floor - 1) * (100 / HOLES_PER_RUN)) / (100 / HOLES_PER_RUN);
                frac = clampNum(frac, 0, 1);
                out.putts = Math.max(0, Math.round((1 - frac) * 2 * 3));
            } catch (_) { if (out.putts === undefined) { out.putts = 0; } }
            }
            if (out.putts === undefined) out.putts = 0;
            out.par = 3;
            if (isFinite(Number(snap.wAngle))) out.wAngle = clampNum(Number(snap.wAngle), -1, 1);
            else out.wAngle = 0;
            if (isFinite(Number(snap.dreamShifts))) out.dreamShifts = Math.max(0, Math.floor(Number(snap.dreamShifts)));
            else if (isFinite(Number(snap.gold))) out.dreamShifts = Math.max(0, Math.floor(Number(snap.gold)));
            else out.dreamShifts = 0;
            if (isFinite(Number(snap.deaths))) out.rewinds = Math.max(0, Math.floor(Number(snap.deaths)));
            if (snap.seed !== undefined && String(snap.seed) !== '') {
                out.seed = cleanStr(snap.seed, 32);
            }
            out.worldId = capStr('m' + out.floor + ':' +
                (out.seed !== undefined ? out.seed : 'nosnap') + ':light', 64);
            if (snap.boss) out.boss = cleanStr(snap.boss, 32);
            if (snap.winner === true) out.winner = true;
            if (isFinite(Number(snap.hp))) out.hp = Math.max(0, Math.ceil(Number(snap.hp)));
            if (isFinite(Number(snap.maxhp))) out.maxhp = Math.round(Number(snap.maxhp));
            if (isFinite(Number(snap.gold))) out.gold = Math.max(0, Math.floor(Number(snap.gold)));
            if (isFinite(Number(snap.kills))) out.kills = Math.max(0, Math.floor(Number(snap.kills)));
        } catch (_) { /* best effort */ }
        return out;
    }

    /* ------------------------- net4d codec both ways ------------------------- */
    // net4d echo {x,y,z,w,hole,score,alive} <-> shared snapshot, using the
    // canonical race semantics (score = hole * 10000 + putts, kills = putts).
    function echoToSnapshot(echo) {
        var out = {};
        try {
            if (!echo || typeof echo !== 'object') return out;
            if (isFinite(Number(echo.x))) out.x = Number(echo.x);
            if (isFinite(Number(echo.y))) out.y = Number(echo.y);
            var race = decodeScore(echo.score);
            var hole = race.hole || Math.floor(Number(echo.hole)) || 1;
            var putts = (race.putts !== undefined) ? race.putts : Math.floor(Number(echo.putts)) || 0;
            out.floor = clampNum(hole, 1, 99);
            out.hole = out.floor;
            out.kills = Math.max(0, putts);
            out.putts = out.kills;
            var base = clampNum((out.floor - 1) * (100 / HOLES_PER_RUN), 0, 100);
            var live = clampNum((3 - Math.max(0, putts) + 3) / 6, 0, 1);
            out.progress = Math.round(clampNum(base + live * (100 / HOLES_PER_RUN), 0, 100) * 10) / 10;
            if (echo.id !== undefined) out.name = cleanStr(echo.id, 16);
            if (echo.alive === false) {
                out.hp = 0;
                out.alive = false;
            } else {
                out.alive = true;
            }
            var sid = serverId();
            if (sid) out.serverId = sid;
        } catch (_) { /* best effort */ }
        return out;
    }
    function snapshotToEcho(snap) {
        var echo = { x: 0, y: 0, z: 0, w: 0, hole: 1, score: 0, alive: true };
        try {
            if (!snap || typeof snap !== 'object') snap = dreamToSnapshot(readDreamGolf());
            var d = snapshotToDream(snap);
            echo.x = isFinite(Number(snap.x)) ? Number(snap.x) : 0;
            echo.y = isFinite(Number(snap.y)) ? Number(snap.y) : 0;
            // z/w ride along when the live dream scrape has them; snapshots
            // alone cannot carry the 4th axis, so default 0 (never guessed).
            try {
                var live = readDreamGolf();
                if (isFinite(Number(live.z))) echo.z = Number(live.z);
                if (isFinite(Number(live.w))) echo.w = Number(live.w);
            } catch (_) { /* defaults stand */ }
            echo.hole = d.hole || 1;
            echo.score = encodeScore(d.hole || 1, d.putts || 0);
            echo.alive = !(snap.hp === 0);
        } catch (_) { /* defaults stand */ }
        return echo;
    }

    /* ------------------------- live wiring (gated) ------------------------- */
    var live = { room: null, joined: false };
    // Join the net4d room for this world. Dormant (returns false, no DOM,
    // no timers, no room) without ?mmorpg=. Never throws.
    function ensureLive() {
        try {
            if (!hasServer()) return false;
            var n = net();
            if (!n || typeof n.createRoom !== 'function') return false;
            if (live.joined && live.room) return true;
            var d = readDreamGolf();
            var roomSeed = d.worldId || d.seed || 'tesseract-lobby';
            var room = 'tesseract-' + capStr(String(roomSeed), 32);
            try {
                n.createRoom(room, { seed: d.seed || roomSeed, mode: MODE });
            } catch (_) { return false; }
            live.room = room;
            live.joined = true;
            // One immediate echo publish; the recurring 500ms tick stays
            // owned by net4d.js (this bridge creates no timers).
            try {
                if (typeof n.echoPosition === 'function') {
                    n.echoPosition(snapshotToEcho(dreamToSnapshot(d)));
                }
            } catch (_) { /* publish is best-effort */ }
            return true;
        } catch (_) { return false; }
    }
    // Peer snapshots for the adapter render(): net4d echoes translated into
    // the shared shape, capped at 32. [] when dormant or net absent.
    function peers() {
        try {
            if (!hasServer()) return [];
            var n = net();
            if (!n || typeof n.getEchoes !== 'function') return [];
            var echoes = n.getEchoes();
            if (!echoes || !echoes.length) return [];
            var out = [];
            var count = Math.min(echoes.length, MAX_PEERS);
            for (var i = 0; i < count; i++) {
                try { out.push(echoToSnapshot(echoes[i])); }
                catch (_) { /* skip one bad echo */ }
            }
            return out;
        } catch (_) { return []; }
    }

    /* ------------------------- adapter contract ------------------------- */
    // read() -> shared snapshot for the live dream-golf run. When the
    // canonical ../mmorpg-4d.js adapter is present, ITS read owns the slot
    // and this bridge only feeds it via peers()/ensureLive().
    function read() {
        try {
            var canon = canonicalAdapter();
            if (canon && canon !== adapter) {
                try { return canon.read() || {}; }
                catch (_) { /* fall through to local */ }
            }
            return dreamToSnapshot(readDreamGolf());
        } catch (_) { return {}; }
    }
    function render(peerList, events) {
        try {
            // Solo-safe: dormant without ?mmorpg=<serverId>. No DOM writes.
            if (!hasServer()) return true;
            var canon = canonicalAdapter();
            if (canon && canon !== adapter && typeof canon.render === 'function') {
                // Canonical adapter owns paint: hand it our net-derived
                // peers merged under its own list (ours first, capped).
                try {
                    var merged = peers();
                    var extra = null;
                    try {
                        if (peerList && Object.prototype.toString.call(peerList) === '[object Array]') {
                            extra = peerList;
                        }
                    } catch (_) { /* ignore */ }
                    if (extra) {
                        for (var i = 0; i < extra.length && merged.length < MAX_PEERS; i++) {
                            merged.push(extra[i]);
                        }
                    }
                    return canon.render(merged, events) !== false;
                } catch (_) { return true; }
            }
            // Fallback paint (only when ../mmorpg-4d.js is absent): minimal
            // raid board under the canvas container. Overlay-only.
            if (!ensureDom()) return true;
            paint(peerList, events);
            return true;
        } catch (_) { return true; }
    }

    /* ------------------------- fallback overlay (gated) ------------------------- */
    var S = { built: false, box: null, board: null, feed: null, feedItems: [] };
    function setText(node, t) {
        try { if (node) node.textContent = String(t); } catch (_) { /* ignore */ }
    }
    function mk(tag, css, text) {
        try {
            var d = D();
            if (!d || typeof d.createElement !== 'function') return null;
            var el = d.createElement(tag);
            if (css) { try { el.style.cssText = css; } catch (_) { /* ignore */ } }
            if (text !== undefined && text !== null) setText(el, text);
            return el;
        } catch (_) { return null; }
    }
    function ensureDom() {
        try {
            if (S.built) return true;
            if (!hasServer()) return false;
            var d = D();
            if (!d || typeof d.createElement !== 'function') return false;
            var anchor = null;
            try {
                anchor = d.getElementById('canvasContainer') || d.getElementById('gameMain') || d.body;
            } catch (_) { anchor = null; }
            if (!anchor || typeof anchor.appendChild !== 'function') return false;
            var box = mk('div', 'pointer-events:none;font-family:sans-serif;');
            if (!box) return false;
            try { box.id = 'ggmmorpg4d-bridge'; } catch (_) { /* ignore */ }
            var board = mk('div', 'margin:4px 8px;padding:4px 8px;background:rgba(5,3,13,0.82);border:1px solid #22d3ee;border-radius:8px;color:#cffafe;font-size:12px;line-height:1.5;white-space:pre-wrap;');
            if (board) box.appendChild(board);
            var feed = mk('div', 'margin:2px 8px;padding:3px 8px;background:rgba(5,3,13,0.70);border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:11px;line-height:1.5;white-space:pre-wrap;');
            if (feed) box.appendChild(feed);
            try { anchor.appendChild(box); } catch (_) { return false; }
            S.box = box; S.board = board; S.feed = feed;
            S.built = true;
            return true;
        } catch (_) { return false; }
    }
    function normPeer(p, idx) {
        var out = { i: idx, progress: 0, floor: 1, kills: 0, gold: 0, boss: '', winner: false, name: '' };
        try {
            if (!p || typeof p !== 'object') return out;
            out.progress = clampNum(Number(p.progress), 0, 100);
            var f = Math.floor(Number(p.floor));
            out.floor = isFinite(f) ? clampNum(f, 1, 99) : 1;
            var k = Math.floor(Number(p.kills));
            out.kills = isFinite(k) ? Math.max(0, k) : 0;
            var g = Math.floor(Number(p.gold));
            out.gold = isFinite(g) ? Math.max(0, g) : 0;
            out.boss = cleanStr(p.boss, 24);
            out.winner = !!p.winner;
            var nm = p.name !== undefined ? p.name : p.id;
            out.name = cleanStr(nm, 16);
            if (!out.name) out.name = 'P' + (idx + 1);
        } catch (_) { /* best effort */ }
        return out;
    }
    function paint(peerList, events) {
        try {
            ensureLive();
            var me = read();
            var mine = normPeer(me, -1);
            mine.name = 'YOU';
            var list = peers();
            try {
                if (peerList && Object.prototype.toString.call(peerList) === '[object Array]') {
                    for (var a = 0; a < peerList.length && list.length < MAX_PEERS; a++) {
                        list.push(peerList[a]);
                    }
                }
            } catch (_) { /* ignore */ }
            var normed = [];
            try {
                var n = Math.min(list.length, MAX_PEERS);
                for (var i = 0; i < n; i++) normed.push(normPeer(list[i], i));
                normed.sort(function (x, y) {
                    try {
                        if (y.floor !== x.floor) return y.floor - x.floor;
                        return y.progress - x.progress;
                    } catch (_) { return 0; }
                });
            } catch (_) { normed = []; }
            var bossName = mine.boss;
            try {
                for (var q = 0; q < normed.length; q++) {
                    if (!bossName && normed[q].boss) bossName = normed[q].boss;
                }
                if (!bossName) {
                    var nt = net();
                    if (nt && typeof nt.bossForWeek === 'function') {
                        var wb = nt.bossForWeek(Date.now());
                        if (wb && wb.id) bossName = cleanStr(wb.id, 24);
                    }
                }
            } catch (_) { /* ignore */ }
            if (S.board) {
                var line = 'RAID4D R' + mine.floor + ' ' + mine.progress.toFixed(1) + '%';
                if (isFinite(Number(me.kills))) line += ' K' + Math.max(0, Math.floor(Number(me.kills)));
                if (isFinite(Number(me.gold))) line += ' G' + Math.max(0, Math.floor(Number(me.gold)));
                if (bossName) line += ' | BOSS ' + bossName;
                var heads = normed.slice(0, 5);
                var headTxt = '';
                try {
                    for (var h = 0; h < heads.length; h++) {
                        if (h > 0) headTxt += ' | ';
                        headTxt += heads[h].name + ' R' + heads[h].floor + ' ' + heads[h].progress.toFixed(0) + '%';
                    }
                } catch (_) { /* ignore */ }
                if (headTxt) line += ' | ' + headTxt;
                else line += ' | raid of 1 (no rivals yet)';
                setText(S.board, line);
            }
            try {
                var incoming = null;
                if (events && Object.prototype.toString.call(events) === '[object Array]') incoming = events;
                if (incoming) {
                    for (var f = 0; f < incoming.length; f++) {
                        var ev = incoming[f];
                        if (!ev || typeof ev !== 'object') continue;
                        var tx = cleanStr(ev.text || ev.name || '', 100);
                        if (!tx) continue;
                        S.feedItems.push(tx);
                    }
                }
                var nn = net();
                if (nn && typeof nn.getEvents === 'function') {
                    var evs = nn.getEvents();
                    for (var e2 = 0; e2 < evs.length; e2++) {
                        var t2 = evs[e2] && evs[e2].text ? cleanStr(evs[e2].text, 100) : '';
                        if (t2 && S.feedItems.indexOf(t2) === -1) S.feedItems.push(t2);
                    }
                }
                while (S.feedItems.length > 6) S.feedItems.shift();
                if (S.feed) setText(S.feed, S.feedItems.join('\n'));
            } catch (_) { /* feed is garnish */ }
        } catch (_) { /* overlay never breaks the game */ }
    }

    /* ------------------------- public surface ------------------------- */
    var bridge = {
        VERSION: VERSION,
        MODE: MODE,
        hasServer: hasServer,
        serverId: serverId,
        readDreamGolf: readDreamGolf,
        dreamToSnapshot: dreamToSnapshot,
        snapshotToDream: snapshotToDream,
        echoToSnapshot: echoToSnapshot,
        snapshotToEcho: snapshotToEcho,
        ensureLive: ensureLive,
        peers: peers,
        read: read,
        render: render,
        info: function () {
            try {
                return {
                    version: VERSION, mode: MODE,
                    server: serverId() || null,
                    live: !!(live.joined && live.room),
                    room: live.room,
                    net: !!net(),
                    canonicalAdapter: !!canonicalAdapter()
                };
            } catch (_) { return { version: VERSION, mode: MODE }; }
        }
    };
    bridge._pure = {
        encodeScore: encodeScore,
        decodeScore: decodeScore,
        clampNum: clampNum,
        cleanStr: cleanStr,
        dreamToSnapshot: dreamToSnapshot,
        snapshotToDream: snapshotToDream,
        echoToSnapshot: echoToSnapshot,
        snapshotToEcho: snapshotToEcho
    };

    // Fallback adapter slot: the canonical ../mmorpg-4d.js owns
    // window.GraveGainMPAdapterMMORPG4D when present; publish only when
    // absent so load order either way never clobbers and never throws.
    var adapter = { mode: MODE, read: read, render: render };
    adapter._pure = bridge._pure;
    adapter._bridge = bridge;

    try {
        var w0 = W();
        if (w0) {
            try { w0.GraveGainMPBridge4D = bridge; } catch (_) { /* unwritable */ }
            try {
                if (!w0.GraveGainMPAdapterMMORPG4D) {
                    w0.GraveGainMPAdapterMMORPG4D = adapter;
                }
            } catch (_) { /* slot owned elsewhere */ }
        }
    } catch (_) { /* window unwritable */ }
    try {
        if (typeof module !== 'undefined' && module && module.exports) {
            module.exports = bridge;
        }
    } catch (_) { /* browser: module undefined */ }
})();
