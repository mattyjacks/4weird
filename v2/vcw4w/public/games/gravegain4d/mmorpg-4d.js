/* =========================================================================
 * GraveGain4D - Dream Raid MMORPG adapter (window.GraveGainMPAdapterMMORPG4D)
 * -------------------------------------------------------------------------
 * 8-player dream-raid overlay for 4D golf (10 dream holes, putt-to-goal).
 * Vanilla JS, ASCII-only, never throws, solo-safe: stays dormant (no DOM
 * visible, no game writes) without ?mmorpg=<serverId> or live peer data.
 * Pointer-lock safe: overlay root is pointer-events:none; only buttons opt
 * back into pointer-events:auto. Reads window.GraveGain4D (dream-play boot:
 * putt-to-goal, W-angle, dream-shift T, time-rewind R) plus the html bundle
 * live model (window.GG4D_Game / snapshot bridge) read-only; never presses
 * keys, clicks, or touches putt/rewind/shift input. DOM fallbacks cover the
 * HUD nodes (gg4dHoleText / hudGoldText / hudRiftText / win screens).
 *
 * Contract:
 *   mode   : 'dream-raid'
 *   read() : {x,y,hp,maxhp,gold,kills,deaths,floor,hole,progress,boss,
 *            winner,seed} with unknowns omitted; boss is a capped string
 *            ('boss' when a boss is engaged, '' when not) so it survives
 *            string-only relays; score/alive ride along as relay headline
 *            extras (hole*10000+putts). Field map: floor/hole = dream hole
 *            (1-based), kills = putts (total strokes, fewer is better),
 *            gold = dream-shift count, deaths = rewinds when known.
 *   render(peers, events): peers is an array (up to 8) or a single peer
 *            object; events is an array (or single) of feed events.
 *            Rival apparition markers (canvas projection when possible,
 *            else compass, else text), raid scoreboard (holes/putts race
 *            + dream-shift count), 10-hole dream tracker, hole-first
 *            bonuses, comeback feed, WIN/LOSE banner with same-seed
 *            rematch (preserves ?mmorpg= and ?seed=).
 * ========================================================================= */
(function () {
    'use strict';

    var MODE = 'dream-raid';
    var ROOT_ID = 'ggmp-raid4d-root';
    var MAX_RAID = 8;
    var MAX_FEED = 6;
    var TICK_MS = 500;
    var FINAL_HOLE = 10;
    var SCORE_F = 10000;
    var SCORE_PUTTS_CAP = 9999;

    var HOLES = [
        'H1 ALPHA FAIRWAY',
        'H2 BETA FOLD',
        'H3 GAMMA DRIFT',
        'H4 DELTA RIFT',
        'H5 EPSILON DREAM',
        'H6 ZETA ABYSS',
        'H7 ETA HOLLOW',
        'H8 THETA REQUIEM',
        'H9 IOTA VEIL',
        'H10 OMEGA DREAM'
    ];

    // ------------------------- pure helpers -------------------------
    function fin(v) {
        var n = Number(v);
        return isFinite(n) ? n : undefined;
    }

    function capStr(v, n) {
        try {
            return String(v).slice(0, n || 32);
        } catch (_) {
            return '';
        }
    }

    function clamp01(v) {
        if (!isFinite(v)) return 0;
        if (v < 0) return 0;
        if (v > 1) return 1;
        return v;
    }

    // Parse ?mmorpg=<serverId> (+ optional ?seed=). Returns { server, seed }.
    // Gated on location.search (URLSearchParams when available, manual split
    // fallback, href fallback); solo play without ?mmorpg= stays dormant.
    function parseRaid(href) {
        var out = { server: '', seed: '' };
        try {
            var q = String(href || '');
            // Prefer the URLSearchParams view of location.search when present.
            try {
                var hasUSP = (typeof URLSearchParams !== 'undefined');
                if (hasUSP && q.indexOf('?') === -1 && q.charAt(0) !== '?') {
                    q = '?' + q;
                }
                if (hasUSP) {
                    var qs = q.split('?')[1] || '';
                    qs = qs.split('#')[0];
                    var usp = new URLSearchParams(qs);
                    var srv = usp.get('mmorpg') || usp.get('server') || usp.get('raid') || '';
                    var sd = usp.get('seed') || '';
                    if (srv) out.server = String(srv).slice(0, 32);
                    if (sd) out.seed = String(sd).slice(0, 32);
                    if (out.server || out.seed) return out;
                }
            } catch (_) { /* fall through to manual parse */ }
            q = String(href || '').split('?')[1] || '';
            q = q.split('#')[0];
            var parts = q.split('&');
            for (var i = 0; i < parts.length; i++) {
                var kv = parts[i].split('=');
                var k = '';
                var val = '';
                try { k = decodeURIComponent(kv[0] || ''); } catch (_) { k = kv[0] || ''; }
                try { val = decodeURIComponent(kv[1] || ''); } catch (_) { val = kv[1] || ''; }
                if ((k === 'mmorpg' || k === 'server' || k === 'raid') && !out.server) {
                    out.server = val.slice(0, 32);
                }
                if (k === 'seed' && !out.seed) out.seed = val.slice(0, 32);
            }
        } catch (_) { /* never throw */ }
        return out;
    }

    function encodeScore(hole, putts) {
        try {
            var h = (isFinite(hole) && hole > 0) ? Math.floor(hole) : 0;
            var p = (isFinite(putts) && putts > 0) ? Math.floor(putts) : 0;
            if (p > SCORE_PUTTS_CAP) p = SCORE_PUTTS_CAP;
            var s = h * SCORE_F + p;
            if (!isFinite(s) || s > 10000000) s = 10000000;
            return s;
        } catch (_) {
            return 0;
        }
    }

    function decodeScore(score) {
        try {
            var s = (isFinite(score) && score > 0) ? Math.floor(score) : 0;
            return { hole: Math.floor(s / SCORE_F), putts: s % SCORE_F };
        } catch (_) {
            return { hole: 0, putts: 0 };
        }
    }

    // 8-way ASCII edge arrow from a screen-space direction (x right, y down).
    function edgeArrow(dx, dy) {
        try {
            if (!isFinite(dx) || !isFinite(dy) || (dx === 0 && dy === 0)) return '>';
            var a = Math.atan2(-dy, dx) * 180 / Math.PI;
            if (a < 0) a += 360;
            var oct = Math.round(a / 45) % 8;
            return ['>', '/', '^', '\\', '<', '/', 'v', '\\'][oct];
        } catch (_) {
            return '>';
        }
    }

    function fmtSplit(ms) {
        try {
            var n = Number(ms);
            if (!isFinite(n)) n = 0;
            var s = Math.max(0, Math.floor(n / 1000));
            var m = Math.floor(s / 60);
            var r = s % 60;
            return m + ':' + (r < 10 ? '0' + r : '' + r);
        } catch (_) {
            return '0:00';
        }
    }

    function hpBar(frac) {
        try {
            var f = clamp01(Number(frac));
            var n = Math.round(f * 10);
            var s = '[';
            for (var i = 0; i < 10; i++) s += (i < n ? '#' : '-');
            return s + '] ' + Math.round(f * 100) + '%';
        } catch (_) {
            return '[----------] 0%';
        }
    }

    function peerKey(p, i) {
        try {
            if (p && p.name) return 'n:' + capStr(p.name, 24);
            if (p && p.id !== undefined) return 'id:' + capStr(p.id, 24);
        } catch (_) { /* fall through */ }
        return 'slot:' + i;
    }

    // ------------------------------ state ------------------------------
    var S = {
        active: false,
        peers: [],        // normalized, max MAX_RAID
        feed: [],         // { key, text, t }
        feedKeys: {},
        myHole: 0,
        myShifts: 0,
        bestFoeHole: 0,
        first: {},        // hole -> claimant label (hole-first bonuses)
        splits: [],       // my splits { h, dt }
        runStart: 0,
        deficitMax: 0,
        banner: '',
        lastPaint: 0,
        els: null
    };

    // Dream-play boot api (public/games/gravegain4d/game.js): state(),
    // putt/rewind/dreamShift verbs (never called here), VERSION/SLUG.
    function dream() {
        try { return window.GraveGain4D || null; } catch (_) { return null; }
    }

    // Html-bundle live model (engine/main4d.js): .state/.putt, read-only.
    function live() {
        try { return window.GG4D_Game || null; } catch (_) { return null; }
    }

    // Save-bridge snapshot getter (engine/savebridge.js): { player: { hp,
    // maxHp, gold, sands, strokes }, missionId, dungeonSeed, brane }.
    function bridgeSnap() {
        try {
            var b = null;
            try { b = window.__gravegain4dSnapshot || null; } catch (_) { b = null; }
            if (b && typeof b.get === 'function') {
                var s = b.get();
                if (s && typeof s === 'object') return s;
            }
        } catch (_) { /* omit */ }
        return null;
    }

    function textOf(id) {
        try {
            if (typeof document === 'undefined') return '';
            var n = document.getElementById(id);
            return (n && n.textContent) ? String(n.textContent) : '';
        } catch (_) { return ''; }
    }

    function raidInfo() {
        try {
            var qs = '';
            try { if (typeof location !== 'undefined' && location && location.search) qs = location.search; } catch (_) { /* ignore */ }
            if (!qs) {
                try { if (typeof window !== 'undefined' && window && window.location && window.location.href) qs = window.location.href; } catch (_) { /* ignore */ }
            }
            return parseRaid(qs);
        } catch (_) {
            return { server: '', seed: '' };
        }
    }

    function activate() {
        if (S.active) return;
        S.active = true;
        try {
            if (S.els && S.els.root) S.els.root.style.display = 'block';
        } catch (_) { /* never throw */ }
    }

    // Total dream holes: mission count when known, else FINAL_HOLE.
    function totalHoles() {
        try {
            var d = dream();
            if (d && d.missions && isFinite(d.missions.length) && d.missions.length > 0) {
                return Math.max(1, Math.floor(d.missions.length));
            }
        } catch (_) { /* ignore */ }
        try {
            var M = null;
            try { M = window.GraveGain4DMissions || null; } catch (_) { M = null; }
            if (M && typeof M.getAllMissions === 'function') {
                var all = M.getAllMissions();
                if (all && all.length) return Math.max(1, Math.floor(all.length));
            }
        } catch (_) { /* ignore */ }
        try {
            var order = null;
            try { order = window.GG4D_CampaignMissions || null; } catch (_) { order = null; }
            if (order && order.length) return Math.max(1, Math.floor(order.length));
        } catch (_) { /* ignore */ }
        return FINAL_HOLE;
    }

    // ------------------------------ read() ------------------------------
    // Read-only: GraveGain4D globals + live model + snapshot bridge + DOM
    // fallback. Unknowns are omitted (never guessed, never written).
    function readSnapshot() {
        var out = {};
        try {
            var d = dream();
            var g = live();
            var snap = bridgeSnap();
            var st = null;
            try {
                if (d && typeof d.state === 'function') st = d.state();
            } catch (_) { st = null; }

            // ---- ball position: x + z plane (z rides as y) ----
            var bx, bz;
            try {
                if (st && st.ball && typeof st.ball === 'object') {
                    bx = fin(st.ball.x); bz = fin(st.ball.z !== undefined ? st.ball.z : st.ball.y);
                }
            } catch (_) { /* ignore */ }
            try {
                if ((bx === undefined || bz === undefined) && d && d.ball && typeof d.ball === 'object') {
                    if (bx === undefined) bx = fin(d.ball.x);
                    if (bz === undefined) bz = fin(d.ball.z !== undefined ? d.ball.z : d.ball.y);
                }
            } catch (_) { /* ignore */ }
            try {
                if ((bx === undefined || bz === undefined) && g && g.putt && g.putt.ball) {
                    var pb = g.putt.ball;
                    if (bx === undefined) bx = fin(pb.x);
                    if (bz === undefined) {
                        bz = fin(pb.z !== undefined ? pb.z : pb.y);
                        if (bz === undefined && pb.pos && pb.pos.length >= 3) bz = fin(pb.pos[2]);
                        if (bx === undefined && pb.pos && pb.pos.length >= 1) bx = fin(pb.pos[0]);
                    }
                }
            } catch (_) { /* ignore */ }
            try {
                if ((bx === undefined || bz === undefined) && d && d.player && typeof d.player === 'object') {
                    if (bx === undefined) bx = fin(d.player.x);
                    if (bz === undefined) bz = fin(d.player.y);
                }
            } catch (_) { /* ignore */ }
            if (bx !== undefined) out.x = bx;
            if (bz !== undefined) out.y = bz;

            // ---- hp/maxhp (html bundle snapshot; dream-play golf has none) ----
            var hp, mhp;
            try {
                if (snap && snap.player && typeof snap.player === 'object') {
                    hp = fin(snap.player.hp); mhp = fin(snap.player.maxHp !== undefined ? snap.player.maxHp : snap.player.maxhp);
                }
            } catch (_) { /* ignore */ }
            try {
                if ((hp === undefined || mhp === undefined) && d) {
                    var dp = null;
                    try { dp = d.player || null; } catch (_) { dp = null; }
                    if (dp && typeof dp === 'object') {
                        if (hp === undefined) hp = fin(dp.hp);
                        if (mhp === undefined) mhp = fin(dp.maxHp !== undefined ? dp.maxHp : dp.maxhp);
                    }
                    if (hp === undefined && fin(d.hp) !== undefined) hp = fin(d.hp);
                    if (mhp === undefined && fin(d.maxHp) !== undefined) mhp = fin(d.maxHp);
                }
            } catch (_) { /* ignore */ }
            if (hp === undefined || mhp === undefined) {
                try {
                    var ht = textOf('hudHpText'); // "100/100"
                    var hm = ht.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
                    if (hm) { if (hp === undefined) hp = fin(hm[1]); if (mhp === undefined) mhp = fin(hm[2]); }
                } catch (_) { /* omit */ }
            }
            if (hp !== undefined) out.hp = hp;
            if (mhp !== undefined) out.maxhp = mhp;

            // ---- gold (html gold / dream-play n/a -> omit) ----
            var gold;
            try {
                if (snap && snap.player) gold = fin(snap.player.gold);
            } catch (_) { /* ignore */ }
            try {
                if (gold === undefined && d) {
                    gold = fin(d.gold);
                    if (gold === undefined && d.player) gold = fin(d.player.gold);
                }
            } catch (_) { /* ignore */ }
            if (gold === undefined) {
                try {
                    var gt = textOf('hudGoldText');
                    var gm = gt.match(/(\d+(?:\.\d+)?)/);
                    if (gm) gold = fin(gm[1]);
                } catch (_) { /* omit */ }
            }
            // Dream-shift count rides on gold (raid scoreboard column).
            var shifts;
            try {
                if (st && st.dreamShift !== undefined) shifts = fin(st.dreamShift);
            } catch (_) { /* ignore */ }
            try {
                if (shifts === undefined && d) {
                    shifts = fin(d.dreamShift);
                    if (shifts === undefined && typeof d.dreamShiftCount === 'number') shifts = fin(d.dreamShiftCount);
                }
            } catch (_) { /* ignore */ }
            try {
                if (shifts === undefined && g && g.state) shifts = fin(g.state.shifts);
            } catch (_) { /* ignore */ }
            if (shifts === undefined) {
                try {
                    var rt = textOf('hudRiftText'); // "W+0"
                    var rm = rt.match(/W\s*\+\s*(\d+)/i);
                    if (rm) shifts = fin(rm[1]);
                } catch (_) { /* omit */ }
            }
            if (shifts !== undefined) {
                out.gold = shifts;
                try { S.myShifts = Math.max(S.myShifts, Math.floor(shifts)); } catch (_) { /* ignore */ }
            } else if (gold !== undefined) {
                out.gold = gold;
            }

            // ---- putts ride on kills (fewer is better; sorted in paint) ----
            var putts, totalPutts;
            try {
                if (st) {
                    if (st.strokes !== undefined) putts = fin(st.strokes);
                    if (st.totalStrokes !== undefined) totalPutts = fin(st.totalStrokes);
                }
            } catch (_) { /* ignore */ }
            try {
                if (putts === undefined && snap && snap.player) putts = fin(snap.player.strokes);
            } catch (_) { /* ignore */ }
            try {
                if (putts === undefined && g) {
                    if (g.state && g.state.strokes !== undefined) putts = fin(g.state.strokes);
                    else if (g.putt && g.putt.strokes !== undefined) putts = fin(g.putt.strokes);
                }
            } catch (_) { /* ignore */ }
            if (putts === undefined) {
                try {
                    var sct = textOf('gg4dStrokesText');
                    var scm = sct.match(/(\d+)/);
                    if (scm) putts = fin(scm[1]);
                } catch (_) { /* omit */ }
            }
            var kills;
            try {
                if (d) {
                    kills = fin(d.kills);
                    if (kills === undefined && d.player) kills = fin(d.player.kills);
                }
            } catch (_) { /* ignore */ }
            try {
                if (kills === undefined && g && g.state) kills = fin(g.state.kills);
            } catch (_) { /* ignore */ }
            if (kills === undefined && totalPutts !== undefined) kills = totalPutts;
            else if (kills === undefined && putts !== undefined) kills = putts;
            if (kills !== undefined) out.kills = kills;

            // ---- deaths = rewinds when known, else omit ----
            var deaths;
            try {
                if (d) {
                    deaths = fin(d.deaths);
                    if (deaths === undefined && d.player) deaths = fin(d.player.deaths);
                    if (deaths === undefined && typeof d.rewinds === 'number') deaths = fin(d.rewinds);
                }
            } catch (_) { /* ignore */ }
            try {
                if (deaths === undefined && g && g.state) deaths = fin(g.state.deaths);
            } catch (_) { /* ignore */ }
            try {
                if (deaths === undefined && snap && snap.player) deaths = fin(snap.player.deaths);
            } catch (_) { /* ignore */ }
            if (deaths !== undefined) out.deaths = deaths;

            // ---- hole (1-based) + floor alias ----
            var hole;
            try {
                if (st && st.hole !== undefined) hole = fin(st.hole);
                if (hole !== undefined) hole = Math.floor(hole) + 1;
            } catch (_) { /* ignore */ }
            try {
                if (hole === undefined && d) {
                    var dh = fin(d.holeIndex);
                    if (dh === undefined) dh = fin(d.hole);
                    if (dh !== undefined) hole = Math.floor(dh) + 1;
                }
            } catch (_) { /* ignore */ }
            if (hole === undefined) {
                try {
                    var hlt = textOf('gg4dHoleText');
                    var hlm = hlt.match(/(\d+)/);
                    if (hlm) hole = Math.floor(fin(hlm[1]));
                } catch (_) { /* omit */ }
            }
            if (hole === undefined) {
                try {
                    var mid = '';
                    if (snap && snap.missionId) mid = String(snap.missionId);
                    else if (d && d.missionId) mid = String(d.missionId);
                    var mm = mid.match(/(\d+)/);
                    if (mm) hole = Math.floor(fin(mm[1]));
                } catch (_) { /* omit */ }
            }
            if (hole === undefined) {
                try {
                    var rt2 = textOf('hudRiftText'); // "W+0" -> rift 1
                    var rm2 = rt2.match(/W\s*\+\s*(\d+)/i);
                    if (rm2) hole = Math.floor(fin(rm2[1])) + 1;
                } catch (_) { /* omit */ }
            }
            if (hole !== undefined) {
                hole = Math.max(1, Math.floor(hole));
                out.hole = hole;
                out.floor = hole;
            }

            // ---- progress: holes folded so far ----
            var total = totalHoles();
            var holedNow = false;
            try {
                if (st && st.holed !== undefined) holedNow = !!st.holed;
                else if (d && d.holed !== undefined) holedNow = !!d.holed;
            } catch (_) { holedNow = false; }
            var prog;
            try {
                if (hole !== undefined && total > 0) {
                    prog = ((hole - 1) + (holedNow ? 1 : 0)) / total;
                } else if (isLocalWinner()) {
                    prog = 1;
                }
            } catch (_) { prog = undefined; }
            if (prog !== undefined && isFinite(prog)) out.progress = Math.round(clamp01(prog) * 1000) / 1000;

            // ---- boss: capped string, '' when none ----
            var bossOn = false;
            try {
                var B = null;
                try { B = window.GraveGainBosses4D || null; } catch (_) { B = null; }
                if (B && typeof B === 'object') {
                    var cand = [B.active, B.current, B.boss, B.target];
                    for (var bi = 0; bi < cand.length; bi++) {
                        var cb = cand[bi];
                        if (cb && typeof cb === 'object') {
                            var bhp = fin(cb.hp);
                            var bmh = fin(cb.maxHp !== undefined ? cb.maxHp : cb.maxhp);
                            if (bmh !== undefined && bmh > 0 && bhp !== undefined && bhp > 0) {
                                bossOn = true;
                                out.bossHp = bhp;
                                out.bossMaxhp = bmh;
                                try { if (cb.name) out.bossName = capStr(cb.name, 32); } catch (_) { /* optional */ }
                                break;
                            }
                        }
                    }
                }
            } catch (_) { /* omit */ }
            try {
                if (!bossOn && d) {
                    var ab = null;
                    try { ab = d.activeBoss || null; } catch (_) { ab = null; }
                    if (ab && typeof ab === 'object') {
                        var ahp = fin(ab.hp);
                        var amh = fin(ab.maxHp !== undefined ? ab.maxHp : ab.maxhp);
                        if (amh !== undefined && amh > 0 && ahp !== undefined && ahp > 0) {
                            bossOn = true;
                            out.bossHp = ahp;
                            out.bossMaxhp = amh;
                            try { if (ab.name) out.bossName = capStr(ab.name, 32); } catch (_) { /* optional */ }
                        }
                    }
                }
            } catch (_) { /* omit */ }
            out.boss = bossOn ? capStr('boss', 32) : '';

            out.winner = isLocalWinner();

            // ---- relay headline extras (hole*10000+putts) + alive ----
            try {
                var sh = (hole !== undefined) ? hole : 0;
                var sk = (kills !== undefined) ? kills : ((putts !== undefined) ? putts : 0);
                out.score = encodeScore(sh, sk);
                out.alive = true;
            } catch (_) { /* omit */ }
            var ri = raidInfo();
            try {
                if (ri.seed) { out.seed = ri.seed; }
                else {
                    var ds = '';
                    try {
                        if (snap && snap.dungeonSeed) ds = String(snap.dungeonSeed);
                        else if (d && d.dungeonSeed) ds = String(d.dungeonSeed);
                        else if (d && d.seed) ds = String(d.seed);
                    } catch (_) { ds = ''; }
                    if (ds) out.seed = ds.slice(0, 32);
                }
            } catch (_) { /* omit */ }
        } catch (_) { /* never throw; return what we have */ }
        return out;
    }

    function isLocalWinner() {
        try {
            // Dream-play bundle: last hole holed ("DREAM COMPLETE").
            var wt = textOf('gg4dWinTitle');
            if (wt && /DREAM COMPLETE/i.test(wt)) {
                try {
                    if (typeof document !== 'undefined') {
                        var scr = document.getElementById('gg4dWinScreen');
                        if (scr && scr.classList && !scr.classList.contains('hidden')) return true;
                    } else {
                        return true;
                    }
                } catch (_) { return true; }
            }
            try {
                if (typeof document !== 'undefined') {
                    var nx = document.getElementById('gg4dBtnNext');
                    var sc2 = document.getElementById('gg4dWinScreen');
                    if (nx && sc2 && sc2.classList && !sc2.classList.contains('hidden') &&
                        /Dream Again/i.test(nx.textContent || '')) return true;
                }
            } catch (_) { /* ignore */ }
            var d = dream();
            try {
                if (d && typeof d.state === 'function') {
                    var st = d.state();
                    if (st && st.holed) {
                        var h0 = (st.hole !== undefined) ? Math.floor(Number(st.hole)) : -1;
                        if (h0 >= 0 && (h0 + 1) >= totalHoles()) return true;
                    }
                }
            } catch (_) { /* ignore */ }
            // Html bundle: campaign victory screens (probed, never assumed).
            try {
                if (typeof document !== 'undefined') {
                    var ids = ['victoryScreen', 'gameVictoryScreen', 'gg4dVictoryScreen',
                        'campaignCompleteScreen', 'gameOverScreen'];
                    for (var i = 0; i < ids.length; i++) {
                        var n = document.getElementById(ids[i]);
                        if (n && n.classList && !n.classList.contains('hidden')) {
                            var t = '';
                            try { t = n.textContent || ''; } catch (_) { t = ''; }
                            if (/COMPLETE|VICTORY|DREAM/i.test(t)) return true;
                        }
                    }
                }
            } catch (_) { /* ignore */ }
            try {
                var cd = null;
                try { cd = window.GG4D_CampaignDirector || null; } catch (_) { cd = null; }
                if (cd && (cd.completed === true || cd.victory === true)) return true;
            } catch (_) { /* ignore */ }
        } catch (_) { /* never throw */ }
        return false;
    }

    // --------------------------- peer normalize ------------------------------
    function normPeer(raw, idx) {
        var f = { winner: false };
        try {
            if (!raw || typeof raw !== 'object') return f;
            var x = fin(raw.x); if (x !== undefined) f.x = x;
            var y = fin(raw.y); if (y !== undefined) f.y = y;
            var hp = fin(raw.hp); if (hp !== undefined) f.hp = hp;
            var mhp = fin(raw.maxhp !== undefined ? raw.maxhp : raw.maxHp);
            if (mhp !== undefined) f.maxhp = mhp;
            var gold = fin(raw.gold); if (gold !== undefined) f.gold = gold;
            var kills = fin(raw.kills); if (kills !== undefined) f.kills = kills;
            var deaths = fin(raw.deaths); if (deaths !== undefined) f.deaths = deaths;
            var fl = fin(raw.floor !== undefined ? raw.floor : raw.hole);
            if (fl !== undefined) { f.floor = Math.floor(fl); f.hole = Math.floor(fl); }
            var pr = fin(raw.progress); if (pr !== undefined) f.progress = clamp01(pr);
            try { if (raw.name) f.name = capStr(raw.name, 24); } catch (_) { /* optional */ }
            try { if (raw.id !== undefined) f.id = capStr(raw.id, 24); } catch (_) { /* optional */ }
            try { if (raw.emote) f.emote = capStr(raw.emote, 32); } catch (_) { /* optional */ }
            f.winner = raw.winner === true;
            if (raw.alive !== undefined) f.alive = raw.alive !== false && raw.alive !== 0;
            try {
                var dec = decodeScore(raw.score);
                if (f.floor === undefined && dec.hole > 0) { f.floor = dec.hole; f.hole = dec.hole; }
                if (f.kills === undefined && dec.putts > 0) f.kills = dec.putts;
            } catch (_) { /* omit */ }
            try {
                var b = raw.boss;
                if (b && typeof b === 'object') {
                    var bh = fin(b.hp);
                    var bm = fin(b.maxhp !== undefined ? b.maxhp : b.maxHp);
                    if (bh !== undefined && bm !== undefined && bm > 0) {
                        f.boss = { hp: bh, maxhp: bm };
                        try { if (b.name) f.boss.name = capStr(b.name, 32); } catch (_) { /* optional */ }
                    } else { f.boss = true; }
                } else if (b === true || b === 1 || (typeof b === 'string' && b !== '')) { f.boss = true; }
                else if (b === false || b === 0) { f.boss = false; }
                var pbh = fin(raw.bossHp);
                var pbm = fin(raw.bossMaxhp);
                if (pbh !== undefined && pbm !== undefined && pbm > 0) {
                    f.boss = { hp: pbh, maxhp: pbm };
                    try { if (raw.bossName) f.boss.name = capStr(raw.bossName, 32); } catch (_) { /* optional */ }
                }
            } catch (_) { /* omit */ }
            try {
                if (Array.isArray(raw.splits)) {
                    f.splits = raw.splits.slice(0, 10).map(function (s) {
                        return { h: Math.floor(fin(s && (s.h !== undefined ? s.h : s.f)) || 0), dt: Math.max(0, Math.floor(fin(s && s.dt) || 0)) };
                    }).filter(function (s) { return s.h > 0; });
                }
            } catch (_) { /* omit */ }
            try { f._slot = idx; } catch (_) { /* ignore */ }
        } catch (_) { /* never throw */ }
        return f;
    }

    function normPeers(peers) {
        var out = [];
        try {
            var list = peers;
            if (list === undefined || list === null) return out;
            if (!Array.isArray(list)) list = [list];
            for (var i = 0; i < list.length && out.length < MAX_RAID; i++) {
                try {
                    var np = normPeer(list[i], i);
                    if (peerHasData(np, list[i])) out.push(np);
                } catch (_) { /* skip bad entry */ }
            }
        } catch (_) { /* never throw */ }
        return out;
    }

    function peerHasData(f, raw) {
        try {
            if (f && (f.x !== undefined || f.floor !== undefined || f.hole !== undefined ||
                f.kills !== undefined || f.gold !== undefined || f.winner ||
                f.boss !== undefined || f.emote || f.alive !== undefined || f.name)) return true;
            // Relay-minimal foe ({ score }: hole+putts headline) still counts.
            try { if (raw && typeof raw === 'object' && raw.score !== undefined && fin(raw.score) !== undefined) return true; } catch (_) { /* ignore */ }
            return false;
        } catch (_) { return false; }
    }

    function labelOf(p, i) {
        try {
            if (p && p.name) return capStr(p.name, 16);
        } catch (_) { /* ignore */ }
        return 'R' + (i + 1);
    }

    // -------------------------------- feed ----------------------------------
    function post(key, text) {
        try {
            if (!key || !text) return;
            if (S.feedKeys[key]) return;
            S.feedKeys[key] = true;
            S.feed.push({ key: key, text: String(text).slice(0, 120), t: Date.now() });
            while (S.feed.length > MAX_FEED) {
                var old = S.feed.shift();
                try { delete S.feedKeys[old.key]; } catch (_) { /* ignore */ }
            }
        } catch (_) { /* never throw */ }
    }

    function handleEvents(events) {
        try {
            if (!events) return;
            var list = Array.isArray(events) ? events : [events];
            for (var i = 0; i < list.length; i++) {
                var e = list[i];
                if (typeof e === 'string') {
                    post('ev' + i + ':' + e.slice(0, 40), e.slice(0, 120));
                } else if (e && typeof e === 'object') {
                    var kind = '';
                    try { kind = String(e.kind || e.t || e.type || 'info'); } catch (_) { kind = 'info'; }
                    var by = '';
                    try { by = e.by ? capStr(e.by, 16) + ': ' : ''; } catch (_) { by = ''; }
                    var txt = '';
                    try { txt = String(e.text || e.msg || e.emote || kind); } catch (_) { txt = kind; }
                    var kl = kind.toLowerCase();
                    var hl = fin(e.hole !== undefined ? e.hole : e.floor);
                    if ((kl === 'hole' || kl === 'floor') && hl !== undefined) txt = 'Hole ' + Math.floor(hl) + ' reached';
                    if (kl === 'shift' || kl === 'dream-shift') {
                        var sc = fin(e.count !== undefined ? e.count : e.shifts);
                        txt = 'Dream-shift' + (sc !== undefined ? ' x' + Math.floor(sc) : '!');
                    }
                    if (kl === 'putt' || kl === 'holed') txt = 'Holed! ' + txt;
                    if ((kl === 'bonus' || kl === 'hole-first') && !by) by = 'RAID: ';
                    post('ev:' + kind + ':' + by + txt.slice(0, 40), (by + txt).slice(0, 120));
                }
            }
        } catch (_) { /* never throw */ }
    }

    function claimFirst(hole, who) {
        try {
            var h = Math.floor(Number(hole) || 0);
            if (!(h >= 1 && h <= totalHoles())) return;
            if (S.first[h]) return;
            S.first[h] = who;
            var hname = HOLES[h - 1] || ('HOLE ' + h);
            post('first:' + h, 'HOLE-FIRST BONUS: ' + who + ' takes ' + hname + ' (+50g)');
        } catch (_) { /* never throw */ }
    }

    // ------------------------------ overlay DOM ------------------------------
    function el(tag, css, text) {
        var d = document.createElement(tag);
        try {
            d.setAttribute('style', css || '');
            if (text !== undefined && text !== null) d.textContent = String(text);
        } catch (_) { /* never throw */ }
        return d;
    }

    var BASE_CSS = 'background:rgba(8,6,24,0.84);border:1px solid #a78bfa;border-radius:8px;' +
        'color:#ede9fe;font-family:monospace,monospace;font-size:11px;line-height:1.5;' +
        'padding:6px 8px;pointer-events:none;white-space:pre;';
    var BTN_CSS = 'pointer-events:auto;cursor:pointer;background:rgba(76,29,149,0.92);color:#fff;' +
        'border:1px solid #c4b5fd;border-radius:6px;font-family:monospace,monospace;' +
        'font-size:11px;padding:3px 8px;margin:2px 2px 0 0;';

    function ensureOverlay() {
        try {
            if (S.els || typeof document === 'undefined') return S.els;
            var root = document.getElementById(ROOT_ID);
            if (!root) {
                root = el('div',
                    'position:fixed;inset:0;z-index:10001;pointer-events:none;display:none;overflow:hidden;');
                root.id = ROOT_ID;
                root.setAttribute('aria-hidden', 'true');
                document.body.appendChild(root);
            }
            var markers = el('div', 'position:absolute;inset:0;pointer-events:none;overflow:hidden;');
            // Raid scoreboard (top-right): holes/putts race + dream-shifts.
            var board = el('div', BASE_CSS + 'position:absolute;top:8px;right:8px;max-width:48vw;');
            var boardPre = el('div', '');
            board.appendChild(boardPre);
            // Dream tracker (top-left): 10 dream holes.
            var tracker = el('div', BASE_CSS + 'position:absolute;top:8px;left:8px;max-width:44vw;');
            // Feed (bottom-left): hole-first bonuses + comeback feed.
            var feed = el('div', BASE_CSS + 'position:absolute;left:8px;bottom:8px;max-width:52vw;');
            // Banner (center) + rematch button.
            var banner = el('div', BASE_CSS + 'position:absolute;left:50%;top:22%;transform:translate(-50%,0);' +
                'display:none;text-align:center;font-size:14px;padding:10px 16px;');
            var bannerText = el('div', '');
            var rematch = el('button', BTN_CSS + 'font-size:13px;padding:6px 14px;', 'REMATCH (same seed)');
            try {
                rematch.setAttribute('type', 'button');
                rematch.addEventListener('click', function (ev) {
                    try {
                        if (ev && ev.stopPropagation) ev.stopPropagation();
                        doRematch();
                    } catch (_) { /* never throw */ }
                });
            } catch (_) { /* never throw */ }
            banner.appendChild(bannerText);
            banner.appendChild(rematch);
            root.appendChild(markers);
            root.appendChild(tracker);
            root.appendChild(board);
            root.appendChild(feed);
            root.appendChild(banner);
            S.els = {
                root: root, markers: markers, tracker: tracker, board: board,
                boardPre: boardPre, feed: feed, banner: banner,
                bannerText: bannerText, rematch: rematch,
                markerEls: []
            };
            if (S.active) root.style.display = 'block';
            return S.els;
        } catch (_) {
            return null;
        }
    }

    function markerEl(i) {
        try {
            var els = S.els;
            if (!els) return null;
            if (els.markerEls[i]) return els.markerEls[i];
            var m = el('div', BASE_CSS + 'position:absolute;display:none;text-align:center;' +
                'border-color:#c4b5fd;color:#ede9fe;');
            els.markers.appendChild(m);
            els.markerEls[i] = m;
            return m;
        } catch (_) {
            return null;
        }
    }

    function doRematch() {
        try {
            try { resetState(); } catch (_) { /* ignore */ }
            var href = '';
            try { href = String(window.location.href); } catch (_) { href = ''; }
            var ri = parseRaid(href);
            if (ri.server || ri.seed) {
                try {
                    var base = href.split('?')[0].split('#')[0];
                    var qs = [];
                    if (ri.server) qs.push('mmorpg=' + encodeURIComponent(ri.server));
                    if (ri.seed) qs.push('seed=' + encodeURIComponent(ri.seed));
                    window.location.href = base + '?' + qs.join('&');
                    return;
                } catch (_) { /* fall through to plain reload */ }
            }
            try { window.location.reload(); } catch (_) { /* ignore */ }
        } catch (_) { /* never throw */ }
    }

    function resetState() {
        try {
            S.peers = [];
            S.feed = [];
            S.feedKeys = {};
            S.myHole = 0;
            S.myShifts = 0;
            S.bestFoeHole = 0;
            S.first = {};
            S.splits = [];
            S.runStart = 0;
            S.deficitMax = 0;
            S.banner = '';
            paint();
        } catch (_) { /* never throw */ }
    }

    // ------------------------- projection (read-only) ------------------------
    // Tier 1 projection: canvas mapping (same 52px/unit putt-plane scale as
    // the 2D renderer), peer offset relative to me, clamped to the canvas
    // rect. Tiers 2-3 (compass, text) are handled by the caller in paint().
    function projectPeer(fx, fy, mx, my) {
        var r = { ok: false };
        try {
            var canvas = null;
            try { canvas = document.getElementById('gameCanvas'); } catch (_) { canvas = null; }
            if (!canvas) return r;
            var rect = null;
            try { rect = canvas.getBoundingClientRect(); } catch (_) { rect = null; }
            if (!rect || rect.width <= 0 || rect.height <= 0) return r;
            var scale = 52;
            try {
                var cw = canvas.width || 1000;
                if (cw && rect.width) scale = 52 * (rect.width / cw);
            } catch (_) { scale = 52; }
            var sx = rect.left + rect.width / 2 + (fx - mx) * scale;
            var sy = rect.top + rect.height / 2 + (fy - my) * scale;
            r.ok = true;
            r.sx = sx; r.sy = sy;
            r.behind = false;
            r.nx = (fx - mx); r.ny = (fy - my);
            r.rect = { left: rect.left, top: rect.top, w: rect.width, h: rect.height };
        } catch (_) {
            r.ok = false;
        }
        return r;
    }

    // -------------------------------- paint ----------------------------------
    function paint() {
        try {
            if (!S.active) return;
            var els = ensureOverlay();
            if (!els) return;
            var now = Date.now();
            if (now - S.lastPaint < 200) return; // throttle: overlay is garnish
            S.lastPaint = now;

            var me = readSnapshot();
            var peers = S.peers || [];
            var ri = raidInfo();
            var total = totalHoles();

            // ---- my hole + splits + hole-first claims ----
            try {
                var mh = me.hole !== undefined ? me.hole : 0;
                if (!S.runStart) S.runStart = now;
                if (mh > 0 && S.myHole > 0 && mh > S.myHole) {
                    S.splits.push({ h: mh, dt: now - S.runStart });
                    if (S.splits.length > 10) S.splits = S.splits.slice(-10);
                }
                if (mh > 0) {
                    for (var cf = S.myHole + 1; cf <= mh; cf++) claimFirst(cf, 'YOU');
                    S.myHole = Math.max(S.myHole, mh);
                }
                if (me.gold !== undefined) {
                    try { S.myShifts = Math.max(S.myShifts, Math.floor(me.gold)); } catch (_) { /* ignore */ }
                }
            } catch (_) { /* ignore */ }

            // ---- peer holes: best, hole-first, comebacks ----
            var best = 0;
            try {
                for (var pi = 0; pi < peers.length; pi++) {
                    var pf = peers[pi].hole !== undefined ? peers[pi].hole
                        : (peers[pi].floor !== undefined ? peers[pi].floor : 0);
                    if (pf > 0) {
                        if (pf > best) best = pf;
                        // Claim every hole this peer has reached (snapshot-safe).
                        for (var q = 1; q <= pf; q++) {
                            if (!S.first[q]) claimFirst(q, labelOf(peers[pi], pi));
                        }
                    }
                    if (peers[pi].emote) {
                        post('pem:' + peerKey(peers[pi], pi) + ':' + String(peers[pi].emote).slice(0, 24),
                            labelOf(peers[pi], pi) + ': ' + String(peers[pi].emote).slice(0, 60));
                    }
                }
                S.bestFoeHole = Math.max(S.bestFoeHole, best);
                if (S.myHole > 0 && S.bestFoeHole > 0) {
                    var deficit = S.bestFoeHole - S.myHole;
                    if (deficit > S.deficitMax) S.deficitMax = deficit;
                    if (S.deficitMax >= 2 && deficit <= 0) {
                        post('comeback:' + S.myHole, 'COMEBACK! You are back level at Hole ' + S.myHole);
                        S.deficitMax = 0;
                    } else if (deficit >= 3) {
                        post('trail:' + S.bestFoeHole + ':' + S.myHole,
                            'Raid leader +' + deficit + ' holes ahead - fold faster');
                    }
                }
            } catch (_) { /* ignore */ }

            // ---- raid scoreboard: holes/putts race + dream-shift count ----
            try {
                var lines = [];
                var title = 'DREAM RAID (8P)';
                if (ri.server) title += ' [' + ri.server.slice(0, 16) + ']';
                if (ri.seed) title += ' [seed:' + ri.seed + ']';
                lines.push(title);
                var rows = [];
                rows.push({
                    tag: 'YOU',
                    hole: me.hole !== undefined ? me.hole : 0,
                    putts: me.kills !== undefined ? me.kills : 0,
                    shifts: me.gold !== undefined ? me.gold : S.myShifts,
                    boss: (typeof me.boss === 'string' && me.boss !== '') || me.boss === true
                });
                for (var rj = 0; rj < peers.length; rj++) {
                    var pp = peers[rj];
                    rows.push({
                        tag: labelOf(pp, rj),
                        hole: pp.hole !== undefined ? pp.hole : (pp.floor !== undefined ? pp.floor : 0),
                        putts: pp.kills !== undefined ? pp.kills : 0,
                        shifts: pp.gold !== undefined ? pp.gold : 0,
                        boss: !!(pp.boss === true || (pp.boss && typeof pp.boss === 'object'))
                    });
                }
                // Golf order: most holes first, then FEWER putts first.
                rows.sort(function (a, b) {
                    if (b.hole !== a.hole) return b.hole - a.hole;
                    return a.putts - b.putts;
                });
                for (var rk = 0; rk < rows.length; rk++) {
                    var r = rows[rk];
                    var ln = (rk + 1) + '. ' + r.tag + ' H' + r.hole + ' P' + r.putts + ' S' + r.shifts;
                    if (r.boss) ln += ' BOSS';
                    lines.push(ln.slice(0, 64));
                }
                var sp = [];
                try {
                    S.splits.slice(-3).forEach(function (s) { sp.push('H' + s.h + ' ' + fmtSplit(s.dt)); });
                } catch (_) { /* ignore */ }
                if (sp.length) lines.push('SPLITS ' + sp.join(' | '));
                // My boss bar + top rival boss bar.
                try {
                    if (me.bossHp !== undefined && me.bossMaxhp) {
                        lines.push('YOU-BOSS ' + hpBar(me.bossHp / me.bossMaxhp));
                    }
                    for (var rb = 0; rb < peers.length; rb++) {
                        var bb = peers[rb].boss;
                        if (bb && typeof bb === 'object' && bb.maxhp > 0) {
                            lines.push(labelOf(peers[rb], rb) + '-BOSS ' + hpBar(bb.hp / bb.maxhp));
                            break;
                        }
                    }
                } catch (_) { /* ignore */ }
                els.boardPre.textContent = lines.join('\n');
            } catch (_) { /* ignore */ }

            // ---- 10-hole dream tracker ----
            try {
                var tl = ['DREAM TRACKER'];
                for (var tf = 1; tf <= total; tf++) {
                    var mark = '[ ]';
                    try {
                        if (S.myHole >= tf) mark = '[X]';
                        else if (S.bestFoeHole >= tf) mark = '[R]';
                    } catch (_) { mark = '[ ]'; }
                    var nm = HOLES[tf - 1] || ('HOLE ' + tf);
                    var holder = '';
                    try { holder = S.first[tf] ? ' <' + String(S.first[tf]).slice(0, 12) : ''; } catch (_) { holder = ''; }
                    tl.push(mark + ' ' + nm + holder);
                }
                els.tracker.style.display = 'block';
                els.tracker.textContent = tl.join('\n');
            } catch (_) { /* ignore */ }

            // ---- rival apparition markers: projection else compass else text ----
            try {
                var vw2 = 800, vh2 = 600;
                try { vw2 = window.innerWidth || 800; vh2 = window.innerHeight || 600; }
                catch (_) { vw2 = 800; vh2 = 600; }
                for (var mk = 0; mk < MAX_RAID; mk++) {
                    var mEl = markerEl(mk);
                    if (!mEl) continue;
                    var peer = peers[mk];
                    if (!peer) {
                        mEl.style.display = 'none';
                        continue;
                    }
                    var tag = labelOf(peer, mk);
                    var distT = '?t';
                    var placed = false;
                    // Tier 1: canvas projection (peer offset relative to me).
                    try {
                        if (peer.x !== undefined && peer.y !== undefined &&
                            me.x !== undefined && me.y !== undefined) {
                            var dist = Math.hypot(peer.x - me.x, peer.y - me.y);
                            distT = Math.round(dist / 4) + 't';
                            var proj = projectPeer(peer.x, peer.y, me.x, me.y);
                            if (proj.ok) {
                                var mgn = 30;
                                if (proj.sx >= proj.rect.left + mgn && proj.sx <= proj.rect.left + proj.rect.w - mgn &&
                                    proj.sy >= proj.rect.top + mgn && proj.sy <= proj.rect.top + proj.rect.h - mgn) {
                                    mEl.style.display = 'block';
                                    mEl.style.left = Math.round(proj.sx - 30) + 'px';
                                    mEl.style.top = Math.round(proj.sy - 48) + 'px';
                                    mEl.textContent = tag + ' ' + distT + ' H' +
                                        (peer.hole !== undefined ? peer.hole : '-');
                                    placed = true;
                                } else {
                                    // Tier 2: compass edge arrow from projection direction.
                                    var dx = proj.nx, dy = proj.ny;
                                    if (dx === 0 && dy === 0) { dx = 1; dy = 0; }
                                    var len = Math.hypot(dx, dy) || 1;
                                    dx /= len; dy /= len;
                                    var rad = Math.min(vw2, vh2) / 2 - 60;
                                    if (!(rad > 40)) rad = 120;
                                    var ex = Math.round(vw2 / 2 + dx * rad);
                                    var ey = Math.round(vh2 / 2 + dy * rad);
                                    mEl.style.display = 'block';
                                    mEl.style.left = (ex - 40) + 'px';
                                    mEl.style.top = (ey - 20) + 'px';
                                    mEl.textContent = edgeArrow(dx, dy) + ' ' + tag + ' ' + distT;
                                    placed = true;
                                }
                            }
                        }
                    } catch (_) { placed = false; }
                    if (!placed) {
                        // Tier 3: text fallback (hole/putts/shifts, no position).
                        mEl.style.display = 'block';
                        mEl.style.left = '8px';
                        mEl.style.top = (40 + mk * 22) + 'px';
                        mEl.textContent = tag + ' H' + (peer.hole !== undefined ? peer.hole : '-') +
                            ' P' + (peer.kills !== undefined ? peer.kills : '-') +
                            ' S' + (peer.gold !== undefined ? peer.gold : '-');
                        placed = true;
                    }
                }
            } catch (_) { /* ignore */ }

            // ---- feed (max 6) ----
            try {
                if (S.feed.length) {
                    var fl2 = [];
                    S.feed.slice(-MAX_FEED).forEach(function (p) { fl2.push(p.text); });
                    els.feed.style.display = 'block';
                    els.feed.textContent = fl2.join('\n');
                } else {
                    els.feed.style.display = 'none';
                }
            } catch (_) { /* ignore */ }

            // ---- WIN/LOSE banner (first to fold all holes) ----
            try {
                var myWin = !!me.winner;
                var foeWin = false;
                var foeName = '';
                for (var wi = 0; wi < peers.length; wi++) {
                    if (peers[wi].winner) { foeWin = true; foeName = labelOf(peers[wi], wi); break; }
                }
                var b = '';
                var bt = '';
                if (myWin && !foeWin) { b = 'WIN'; bt = 'YOU FOLDED THE DREAM (H' + total + ')'; }
                else if (foeWin && !myWin) { b = 'LOSE'; bt = foeName + ' FOLDED THE DREAM (H' + total + ')'; }
                else if (myWin && foeWin) { b = 'DRAW'; bt = 'SHARED DREAM CLEAR - PHOTO FINISH'; }
                S.banner = b;
                if (b) {
                    els.banner.style.display = 'block';
                    els.bannerText.textContent = bt;
                } else {
                    els.banner.style.display = 'none';
                }
            } catch (_) { /* ignore */ }
        } catch (_) { /* never throw */ }
    }

    // ------------------------------- render ----------------------------------
    function render(peers, events) {
        try {
            var list = normPeers(peers);
            if (list.length) {
                S.peers = list;
                activate();
            }
            handleEvents(events);
            // Solo-safe: only latch on with explicit raid param or peer data.
            if (!S.active) {
                try {
                    var ri = raidInfo();
                    if (ri.server) activate();
                } catch (_) { /* stay hidden */ }
            }
            ensureOverlay();
            paint();
        } catch (_) { /* never throw */ }
    }

    // ------------------------------- adapter ---------------------------------
    var Adapter = {
        mode: MODE,
        maxRaid: MAX_RAID,
        outbox: [],
        read: function () {
            try { return readSnapshot(); }
            catch (_) { return {}; }
        },
        render: function (peers, events) {
            try { render(peers, events); }
            catch (_) { /* never throw */ }
        },
        summary: function () {
            try {
                var me = readSnapshot();
                var a = 'H' + (me.hole !== undefined ? me.hole : '-') +
                    ' P' + (me.kills !== undefined ? me.kills : '-');
                var n = (S.peers || []).length;
                var lead = 'H' + S.bestFoeHole;
                return 'RAID YOU ' + a + ' vs ' + n + 'P best ' + lead;
            } catch (_) {
                return 'RAID YOU vs PARTY';
            }
        },
        reset: function () {
            try { resetState(); }
            catch (_) { /* never throw */ }
        }
    };

    // Auto-boot: build nothing visible until raid traffic arrives (solo-safe).
    // A light interval keeps splits/feed/markers live even if the raid core
    // calls render() infrequently. Cheap and fully guarded.
    try {
        if (typeof window !== 'undefined') {
            try { window.GraveGainMPAdapterMMORPG4D = Adapter; } catch (_) { /* ignore */ }
            try {
                var ri0 = raidInfo();
                if (ri0.server) { ensureOverlay(); activate(); }
            } catch (_) { /* stay dormant */ }
            try {
                setInterval(function () {
                    try {
                        if (!S.active) return;
                        paint();
                    } catch (_) { /* never throw */ }
                }, TICK_MS);
            } catch (_) { /* timers unavailable: render() still works */ }
        }
    } catch (_) { /* never throw */ }

    // Node smoke-test surface (harmless in browsers).
    try {
        if (typeof module !== 'undefined' && module && module.exports) {
            module.exports = {
                fin: fin, capStr: capStr, clamp01: clamp01, parseRaid: parseRaid,
                edgeArrow: edgeArrow, fmtSplit: fmtSplit, hpBar: hpBar,
                normPeer: normPeer, normPeers: normPeers,
                encodeScore: encodeScore, decodeScore: decodeScore,
                FINAL_HOLE: FINAL_HOLE, MAX_RAID: MAX_RAID, HOLES: HOLES
            };
        }
    } catch (_) { /* never throw */ }
})();
