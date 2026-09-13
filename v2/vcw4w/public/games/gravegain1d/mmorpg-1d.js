/* GraveGain1D MMORPG adapter: "Ley-Line Horde" (v2-native extra, solo-safe).
 *
 * Byte-lock note: gravegain1d game.js / index.html / game.css / game.json /
 * mp-1d.js are NOT touched by this file. This adapter is an optional extra
 * script. It stays dormant unless ?mmorpg=<serverId> is present, so solo
 * play is never disturbed. Overlay-only: render() only adds its own nodes
 * under #gg1dStage (or #gg1dWrap / body fallback) and never writes game
 * state, HUD, canvas, or save data.
 *
 * Observed globals (read-only, never written):
 *   window.GraveGain1D = { VERSION, newRun, tick, CLASSES, SECTORS, ... }
 *   The live run (closure var G.run in game.js) is NOT exported, so read()
 *   best-effort resolves it by (1) known debug hooks, (2) a bounded
 *   duck-type scan of window, (3) DOM HUD fallback. Missing keys omitted.
 * DOM hooks (read-only except our own overlay nodes):
 *   #gg1dStage (overlay anchor), #gg1dWrap, #gg1dCanvas, #gg1dHud,
 *   #gg1dHpText, #gg1dLvl, #gg1dGold, #gg1dSector ("Sector N/5 - xNNN" or
 *   "Echo Drift +C - xNNN"), #gg1dBossBar(.on)/#gg1dBossName,
 *   #gg1dBanner(.on)/#gg1dBannerTitle ("ARRAY DOWN" on victory).
 *
 * Contract:
 *   window.GraveGainMPAdapterMMORPG1D = { mode: 'horde', read, render }
 *   read() -> { progress, sector, kills, gold, hp, maxhp, boss, winner,
 *     seed } (keys omitted when unknown; never throws; read-only).
 *   render(peers, events) -> overlay-only; peers is an ARRAY of up to 32
 *     snapshots shaped like read(); events is an ARRAY of
 *     { kind, text, at } (or { t/type, text/name }). Dormant (no DOM
 *     writes) without ?mmorpg=<serverId>. Never throws.
 * Shared net core (if any) is optional: this file never requires it and
 * degrades gracefully when absent (peers/events args alone drive paint).
 *
 * Sick factor: Echo Drift endless scaling (sectors 5+ shown as ECHO+C),
 * horde waves every 60s (wave index + countdown tick), ley-line charge
 * share (pooled gold across self + peers, per-courier share).
 *
 * Vanilla JS, no imports, ASCII-only, never throws.
 */
(function () {
    'use strict';

    var SAVE_KEY = 'gravegain1d_save_v1';
    var WORLD_LEN = 500;
    var SECTOR_LEN = 100;
    var LAST_X = WORLD_LEN - 1; // 499
    var MAX_PEERS = 32;
    var MAX_FEED = 6;
    var WAVE_MS = 60000;

    /* ---------- live-global lookup (dynamic so node harnesses can stub) ---------- */
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

    /* ---------- pure helpers (node-testable, ASCII only) ---------- */
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
    function intOrOmit(out, key, v) {
        try {
            v = Number(v);
            if (isFinite(v)) out[key] = Math.floor(v);
        } catch (e) { /* omit */ }
    }
    function progressFromX(x, endless, chunkBase) {
        try {
            x = Number(x);
            if (!isFinite(x)) return 0;
            if (endless) {
                var base = isFinite(Number(chunkBase)) ? Number(chunkBase) : 0;
                return clampNum((x - base) / SECTOR_LEN * 100, 0, 100);
            }
            return clampNum(x / LAST_X * 100, 0, 100);
        } catch (e) { return 0; }
    }
    /* Parse "Sector 3/5 ... x214" -> { sector: 2, x: 214 }. 0-based sector.
     * "Echo Drift +C ... xNNN" -> { sector: 5 + C, x: NNN }. */
    function parseSectorText(t) {
        try {
            if (t === null || t === undefined) return null;
            var s = String(t);
            var mEcho = /Echo\s*Drift\s*\+?\s*(\d+)/i.exec(s);
            var mX = /x\s*(\d+)/i.exec(s);
            var x = mX ? parseInt(mX[1], 10) : NaN;
            if (mEcho) {
                var cyc = parseInt(mEcho[1], 10);
                return { sector: 5 + (isFinite(cyc) ? cyc : 0), x: x };
            }
            var mS = /Sector\s*(\d+)\s*\/\s*5/i.exec(s);
            if (mS) {
                var n = parseInt(mS[1], 10);
                return { sector: clampNum((isFinite(n) ? n : 1) - 1, 0, 4), x: x };
            }
            return null;
        } catch (e) { return null; }
    }
    /* Parse "17/20" (+ optional shield suffix) -> { hp, maxhp }. */
    function parseHpText(t) {
        try {
            if (t === null || t === undefined) return null;
            var m = /(\d+)\s*\/\s*(\d+)/.exec(String(t));
            if (!m) return null;
            var hp = parseInt(m[1], 10), mx = parseInt(m[2], 10);
            if (!isFinite(hp) || !isFinite(mx) || mx <= 0) return null;
            return { hp: hp, maxhp: mx };
        } catch (e) { return null; }
    }
    /* sector 0-4 -> "S1".."S5"; 5+ -> "ECHO+C". */
    function sectorLabel(sector) {
        try {
            var s = Math.floor(Number(sector));
            if (!isFinite(s) || s < 0) s = 0;
            if (s < 5) return 'S' + (s + 1);
            return 'ECHO+' + (s - 5);
        } catch (e) { return 'S1'; }
    }
    /* Horde wave clock: one wave every 60s. -> { wave, secsLeft }. */
    function waveClock(nowMs) {
        try {
            var t = Number(nowMs);
            if (!isFinite(t) || t < 0) t = 0;
            var wave = Math.floor(t / WAVE_MS) + 1;
            var secsLeft = 60 - (Math.floor(t / 1000) % 60);
            if (!isFinite(wave) || wave < 1) wave = 1;
            if (!isFinite(secsLeft) || secsLeft < 0) secsLeft = 0;
            if (secsLeft > 60) secsLeft = 60;
            return { wave: wave, secsLeft: Math.floor(secsLeft) };
        } catch (e) { return { wave: 1, secsLeft: 60 }; }
    }
    /* Normalize one peer snapshot to numbers we can sort/paint. */
    function normPeer(p, idx) {
        var out = { i: idx, progress: 0, sector: 0, kills: 0, gold: 0, boss: '', winner: false, name: '' };
        try {
            if (!p || typeof p !== 'object') return out;
            out.progress = clampNum(Number(p.progress), 0, 100);
            var s = Math.floor(Number(p.sector));
            out.sector = isFinite(s) ? clampNum(s, 0, 99) : 0;
            var k = Math.floor(Number(p.kills));
            out.kills = isFinite(k) ? Math.max(0, k) : 0;
            var g = Math.floor(Number(p.gold));
            out.gold = isFinite(g) ? Math.max(0, g) : 0;
            out.boss = cleanStr(p.boss, 24);
            out.winner = !!p.winner;
            var nm = p.name !== undefined ? p.name : p.id;
            out.name = cleanStr(nm, 16);
            if (!out.name) out.name = 'P' + (idx + 1);
        } catch (e) { /* best effort */ }
        return out;
    }
    /* Map a run-like object to a read() snapshot. Shared shape with peers. */
    function mapRunToSnapshot(run, seedStr) {
        var out = {};
        try {
            if (!run || typeof run !== 'object') return out;
            var endless = !!run.endless;
            var sector = Number(run.sector);
            if (!isFinite(sector)) sector = 0;
            sector = clampNum(Math.floor(sector), 0, 99);
            if (endless && sector < 5) sector = 5 + clampNum(Math.floor(Number(run.cycle) || 0), 0, 90);
            out.sector = sector;
            var x = Number(run.x);
            var prog = progressFromX(x, endless, run.chunkBase);
            out.progress = Math.round(prog * 10) / 10;
            intOrOmit(out, 'kills', run.kills);
            intOrOmit(out, 'gold', run.gold);
            try {
                var hp = Number(run.hp), mx = Number(run.maxHp);
                if (isFinite(hp) && isFinite(mx) && mx > 0) {
                    out.hp = Math.max(0, Math.ceil(hp));
                    out.maxhp = Math.round(mx);
                }
            } catch (e2) { /* omit hp */ }
            try {
                if (run.boss && typeof run.boss === 'object' && Number(run.boss.hp) > 0) {
                    out.boss = cleanStr(run.boss.name, 32);
                } else {
                    out.boss = '';
                }
            } catch (e3) { out.boss = ''; }
            var won = !!run.won || endless;
            if (won) { out.winner = true; out.progress = 100; }
            if (seedStr !== undefined && seedStr !== null && String(seedStr) !== '') {
                out.seed = cleanStr(seedStr, 32);
            } else if (isFinite(Number(run.seed))) {
                out.seed = cleanStr(run.seed, 32);
            }
        } catch (e) { /* best effort */ }
        return out;
    }

    /* ---------- read() plumbing (impure, guarded, read-only) ---------- */
    function queryParam(name) {
        try {
            var w = W();
            var search = '';
            if (w && w.location && typeof w.location.search === 'string') search = w.location.search;
            var m = new RegExp('[?&]' + name + '=([^&]*)').exec(search);
            if (m && m[1] !== undefined) {
                try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return m[1]; }
            }
            return '';
        } catch (e) { return ''; }
    }
    function hasServer() {
        try {
            var v = queryParam('mmorpg');
            return !!cleanStr(v, 64);
        } catch (e) { return false; }
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
        } catch (e) { return ''; }
    }
    function elOn(id, cls) {
        try {
            var d = D();
            if (!d || typeof d.getElementById !== 'function') return false;
            var n = d.getElementById(id);
            if (!n) return false;
            var c = ' ' + String(n.className || '') + ' ';
            return c.indexOf(' ' + cls + ' ') !== -1;
        } catch (e) { return false; }
    }
    function isRunLike(o) {
        try {
            if (!o || typeof o !== 'object') return false;
            if (o.tagName || o.nodeType) return false;
            if (!isFinite(Number(o.x))) return false;
            if (!isFinite(Number(o.hp))) return false;
            if (!isFinite(Number(o.maxHp))) return false;
            if (!isFinite(Number(o.kills)) && !isFinite(Number(o.gold))) return false;
            if (typeof o.sector !== 'number' && typeof o.gateX !== 'number') return false;
            return true;
        } catch (e) { return false; }
    }
    function findRun() {
        try {
            var w = W();
            var api = null;
            try { api = w.GraveGain1D; } catch (e) { api = null; }
            if (api && typeof api === 'object') {
                var hooks = ['_run', 'run', 'G', 'state', 'current', 'game'];
                for (var i = 0; i < hooks.length; i++) {
                    try {
                        var h = api[hooks[i]];
                        if (h && typeof h === 'object') {
                            if (isRunLike(h)) return h;
                            if (h.run && isRunLike(h.run)) return h.run;
                        }
                    } catch (e2) { /* next */ }
                }
            }
            var keys = [];
            try { keys = Object.keys(w); } catch (e3) { keys = []; }
            var budget = Math.min(keys.length, 200);
            for (var k = 0; k < budget; k++) {
                var o = null;
                try { o = w[keys[k]]; } catch (e4) { continue; }
                try { if (isRunLike(o)) return o; } catch (e5) { /* next */ }
            }
        } catch (e) { /* fall through */ }
        return null;
    }
    function touchSaveKey() {
        try {
            var w = W();
            var ls = w ? w.localStorage : null;
            if (ls && typeof ls.getItem === 'function') ls.getItem(SAVE_KEY);
        } catch (e) { /* storage may be blocked */ }
    }

    function read() {
        var out = {};
        try {
            touchSaveKey();
            var seed = queryParam('seed');
            var run = findRun();
            if (run) {
                out = mapRunToSnapshot(run, seed);
                try {
                    if (elOn('gg1dBanner', 'on') && /ARRAY DOWN/i.test(elText('gg1dBannerTitle'))) {
                        out.winner = true;
                        out.progress = 100;
                    }
                } catch (e) { /* ignore */ }
                return out;
            }
            var prog = null, sector = null;
            try {
                var st = parseSectorText(elText('gg1dSector'));
                if (st) {
                    sector = st.sector;
                    if (isFinite(Number(st.x))) prog = progressFromX(Number(st.x), sector >= 5, 0);
                }
            } catch (e2) { /* ignore */ }
            if (sector !== null && isFinite(sector)) out.sector = sector;
            if (prog !== null && isFinite(prog)) out.progress = Math.round(prog * 10) / 10;
            try {
                var g = parseInt(elText('gg1dGold'), 10);
                if (isFinite(g)) out.gold = Math.max(0, Math.floor(g));
            } catch (e3) { /* omit */ }
            try {
                var hp = parseHpText(elText('gg1dHpText'));
                if (hp) { out.hp = hp.hp; out.maxhp = hp.maxhp; }
            } catch (e4) { /* omit */ }
            try {
                if (elOn('gg1dBossBar', 'on')) out.boss = cleanStr(elText('gg1dBossName'), 32);
                else out.boss = '';
            } catch (e5) { /* omit */ }
            try {
                var title = elText('gg1dBannerTitle');
                var won = elOn('gg1dBanner', 'on') && /ARRAY DOWN/i.test(title);
                if (won) { out.winner = true; out.progress = 100; }
                else if (/ECHO DRIFT/i.test(elText('gg1dSector'))) { out.winner = true; }
            } catch (e6) { /* ignore */ }
            if (seed) out.seed = cleanStr(seed, 32);
        } catch (e) { /* never throw; return best effort */ }
        return out;
    }

    /* ---------- render() plumbing (overlay-only) ---------- */
    var S = {
        built: false,
        box: null, board: null, line: null, dots: null, dotEls: [],
        bossWrap: null, bossName: null, bossFill: null,
        feed: null, feedItems: [],
        banner: null,
        finished: '' // '', 'you', 'horde'
    };
    function style(el, css) {
        try { if (el && el.style) el.style.cssText = css; } catch (e) { /* ignore */ }
    }
    function setText(node, t) {
        try { if (node) node.textContent = String(t); } catch (e) { /* ignore */ }
    }
    function mk(tag, css, text) {
        try {
            var d = D();
            if (!d || typeof d.createElement !== 'function') return null;
            var el = d.createElement(tag);
            if (css) style(el, css);
            if (text !== undefined && text !== null) setText(el, text);
            return el;
        } catch (e) { return null; }
    }
    function ensureDom() {
        try {
            if (S.built) return true;
            var d = D();
            if (!d || typeof d.createElement !== 'function') return false;
            var anchor = null;
            try { anchor = d.getElementById('gg1dStage') || d.getElementById('gg1dWrap'); } catch (e) { anchor = null; }
            if (!anchor) { try { anchor = d.body; } catch (e2) { anchor = null; } }
            if (!anchor || typeof anchor.appendChild !== 'function') return false;
            try {
                var pos = anchor.style ? anchor.style.position : '';
                if (!pos || pos === 'static') anchor.style.position = 'relative';
            } catch (e3) { /* ignore */ }
            var box = mk('div', 'position:absolute;left:0;right:0;top:0;pointer-events:none;z-index:30;font-family:sans-serif;');
            if (!box) return false;
            box.id = 'ggmmorpg1d';
            var board = mk('div', 'margin:4px 8px;padding:4px 8px;background:rgba(5,3,13,0.82);border:1px solid #22d3ee;border-radius:8px;color:#cffafe;font-size:12px;line-height:1.5;white-space:pre-wrap;');
            if (board) { board.id = 'ggmmorpg1dBoard'; box.appendChild(board); }
            // Ley-line rail with rival position dots (up to 32 peers + YOU).
            var line = mk('div', 'position:relative;margin:2px 8px;height:14px;background:#0b1220;border:1px solid #164e63;border-radius:7px;overflow:hidden;');
            var dots = null;
            if (line) {
                dots = line;
                box.appendChild(line);
            }
            S.dotEls = [];
            try {
                for (var i = 0; i < MAX_PEERS + 1; i++) {
                    var dot = mk('div', 'position:absolute;top:2px;width:10px;height:10px;border-radius:50%;background:' + (i === 0 ? '#22c55e' : '#f472b6') + ';border:1px solid #000;');
                    if (dot && dots) { dots.appendChild(dot); S.dotEls.push(dot); }
                }
            } catch (e4) { /* garnish */ }
            // World-boss HP bar (presence/status: engaged count drives fill).
            var bossWrap = mk('div', 'margin:2px 8px;padding:3px 8px;background:rgba(5,3,13,0.82);border:1px solid #ef4444;border-radius:8px;color:#fecaca;font-size:12px;');
            var bossName = mk('div', 'font-weight:700;white-space:nowrap;overflow:hidden;', 'WORLD BOSS: --');
            var bossTrack = mk('div', 'height:6px;background:#1e1b2e;border-radius:3px;overflow:hidden;margin-top:3px;');
            var bossFill = mk('div', 'height:100%;width:0%;background:#ef4444;');
            try {
                if (bossTrack && bossFill) bossTrack.appendChild(bossFill);
                if (bossWrap) {
                    if (bossName) bossWrap.appendChild(bossName);
                    if (bossTrack) bossWrap.appendChild(bossTrack);
                    box.appendChild(bossWrap);
                }
            } catch (e5) { /* ignore */ }
            var feed = mk('div', 'margin:2px 8px;padding:3px 8px;background:rgba(5,3,13,0.70);border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:11px;line-height:1.5;white-space:pre-wrap;');
            if (feed) { feed.id = 'ggmmorpg1dFeed'; box.appendChild(feed); }
            var banner = mk('div', 'display:none;margin:8px auto;padding:10px 14px;max-width:440px;text-align:center;background:rgba(5,3,13,0.92);border:2px solid #fbbf24;border-radius:10px;color:#fff;font-size:15px;font-weight:800;pointer-events:none;');
            if (banner) { banner.id = 'ggmmorpg1dBanner'; box.appendChild(banner); }
            try { anchor.appendChild(box); } catch (e6) { return false; }
            S.box = box; S.board = board; S.line = line; S.dots = dots;
            S.bossWrap = bossWrap; S.bossName = bossName; S.bossFill = bossFill;
            S.feed = feed; S.banner = banner;
            S.built = true;
            return true;
        } catch (e) { return false; }
    }
    function nowMs() {
        try {
            if (typeof Date !== 'undefined' && typeof Date.now === 'function') return Date.now();
        } catch (e) { /* ignore */ }
        return 0;
    }
    function pushFeed(text) {
        try {
            text = cleanStr(text, 120);
            if (!text) return;
            S.feedItems.push(text);
            while (S.feedItems.length > MAX_FEED) S.feedItems.shift();
            if (S.feed) setText(S.feed, S.feedItems.join('\n'));
        } catch (e) { /* ignore */ }
    }
    function showBanner(text) {
        try {
            if (!S.banner) return;
            S.banner.style.display = 'block';
            setText(S.banner, text);
        } catch (e) { /* ignore */ }
    }

    function render(peers, events) {
        try {
            // Solo-safe: dormant without ?mmorpg=<serverId>. No DOM writes.
            if (!hasServer()) return true;
            var list = null;
            try {
                if (peers && Object.prototype.toString.call(peers) === '[object Array]') list = peers;
                else if (peers && typeof peers === 'object' && peers.peers &&
                    Object.prototype.toString.call(peers.peers) === '[object Array]') list = peers.peers;
                else list = [];
            } catch (e) { list = []; }
            var incoming = null;
            try {
                if (events && Object.prototype.toString.call(events) === '[object Array]') incoming = events;
                else if (peers && typeof peers === 'object' && peers.events &&
                    Object.prototype.toString.call(peers.events) === '[object Array]') incoming = peers.events;
            } catch (e2) { /* ignore */ }
            if (!ensureDom()) return true;
            var me = read();
            var myProg = clampNum(Number(me.progress), 0, 100);
            var mySector = Math.floor(Number(me.sector));
            if (!isFinite(mySector)) mySector = 0;
            // Normalize + cap peers at 32, sort by sector then progress.
            var normed = [];
            try {
                var n = Math.min(list.length, MAX_PEERS);
                for (var i = 0; i < n; i++) normed.push(normPeer(list[i], i));
                normed.sort(function (a, b) {
                    try {
                        if (b.sector !== a.sector) return b.sector - a.sector;
                        return b.progress - a.progress;
                    } catch (e3) { return 0; }
                });
            } catch (e4) { normed = []; }
            // Rival dots: YOU green at index 0, peers pink after.
            try {
                var total = Math.min(normed.length + 1, S.dotEls.length);
                for (var d = 0; d < S.dotEls.length; d++) {
                    var el = S.dotEls[d];
                    if (!el) continue;
                    if (d >= total) { el.style.display = 'none'; continue; }
                    el.style.display = 'block';
                    var pv = (d === 0) ? myProg : normed[d - 1].progress;
                    pv = clampNum(pv, 0, 100);
                    el.style.left = 'calc(' + pv.toFixed(1) + '% - 5px)';
                    try { el.title = (d === 0) ? ('YOU ' + sectorLabel(mySector) + ' ' + myProg.toFixed(0) + '%') : (normed[d - 1].name + ' ' + sectorLabel(normed[d - 1].sector) + ' ' + normed[d - 1].progress.toFixed(0) + '%'); } catch (e5) { /* ignore */ }
                }
            } catch (e6) { /* garnish */ }
            // Horde scoreboard: sector race + wave clock + charge share.
            try {
                var wc = waveClock(nowMs());
                var myGold = isFinite(Number(me.gold)) ? Math.max(0, Math.floor(Number(me.gold))) : 0;
                var pool = myGold;
                var engaged = 0;
                var bossName = (me.boss && cleanStr(me.boss, 24)) ? cleanStr(me.boss, 24) : '';
                var topLine = '';
                try {
                    for (var q = 0; q < normed.length; q++) {
                        pool += normed[q].gold;
                        if (normed[q].boss) engaged++;
                        if (!bossName && normed[q].boss) bossName = normed[q].boss;
                    }
                    if (me.boss) engaged++;
                } catch (e7) { /* ignore */ }
                var heads = normed.slice(0, 5);
                var headTxt = '';
                try {
                    for (var h = 0; h < heads.length; h++) {
                        if (h > 0) headTxt += ' | ';
                        headTxt += heads[h].name + ' ' + sectorLabel(heads[h].sector) + ' ' + heads[h].progress.toFixed(0) + '%';
                    }
                } catch (e8) { /* ignore */ }
                var share = pool;
                try {
                    var mouths = normed.length + 1;
                    if (mouths > 0) share = Math.floor(pool / mouths);
                } catch (e9) { /* ignore */ }
                var line = 'HORDE ' + sectorLabel(mySector) + ' ' + myProg.toFixed(1) + '%';
                if (isFinite(Number(me.kills))) line += ' K' + Math.max(0, Math.floor(Number(me.kills)));
                line += ' G' + myGold;
                line += ' | WAVE ' + wc.wave + ' next horde ' + wc.secsLeft + 's';
                line += ' | CHARGE pool ' + pool + ' share ' + share;
                if (mySector >= 5) line += ' | ECHO DRIFT endless x' + (mySector - 4);
                if (headTxt) line += ' | ' + headTxt;
                else line += ' | horde of 1 (no rivals yet)';
                if (S.board) setText(S.board, line);
                // World-boss bar: engaged share of the horde.
                try {
                    var denom = normed.length + 1;
                    var frac = denom > 0 ? clampNum(engaged / denom, 0, 1) : 0;
                    if (!bossName) bossName = '--';
                    if (S.bossName) setText(S.bossName, 'WORLD BOSS: ' + bossName + ' (' + engaged + '/' + denom + ' engaged)');
                    if (S.bossFill) S.bossFill.style.width = (frac * 100).toFixed(1) + '%';
                } catch (e10) { /* ignore */ }
            } catch (e11) { /* ignore */ }
            // Feed: incoming events first, then notable horde notes. Max 6.
            try {
                if (incoming) {
                    for (var f = 0; f < incoming.length; f++) {
                        var ev = incoming[f];
                        if (!ev || typeof ev !== 'object') continue;
                        var t = cleanStr(ev.kind || ev.t || ev.type || '', 16).toLowerCase();
                        var tx = cleanStr(ev.text || ev.name || '', 100);
                        if (!tx) continue;
                        if (t === 'boss' || t === 'winner' || t === 'victory' || t === 'loot' || t === 'wave' || t === 'emote' || t === 'chat' || t === '') pushFeed(tx);
                    }
                }
                try {
                    for (var b = 0; b < normed.length; b++) {
                        if (normed[b].winner) { pushFeed(normed[b].name + ' cleared the ley-line (WIN)'); break; }
                    }
                } catch (e12) { /* ignore */ }
            } catch (e13) { /* ignore */ }
            // WIN banner: local win or any peer win.
            try {
                var iWon = !!me.winner;
                var hordeWon = false;
                try {
                    for (var wI = 0; wI < normed.length; wI++) {
                        if (normed[wI].winner) { hordeWon = true; break; }
                    }
                } catch (e14) { /* ignore */ }
                if ((iWon || hordeWon) && !S.finished) {
                    if (iWon) {
                        S.finished = 'you';
                        showBanner('WIN - YOU carried the charge through the Gate Titan. Horde honors you.');
                    } else {
                        S.finished = 'horde';
                        showBanner('WIN - A rival courier felled the Gate Titan. The horde marches on.');
                    }
                }
            } catch (e15) { /* ignore */ }
            return true;
        } catch (e) { return true; }
    }

    var adapter = {
        mode: 'horde',
        read: read,
        render: render
    };
    // Pure helpers exposed for unit smoke tests (harmless in the browser).
    adapter._pure = {
        clampNum: clampNum,
        cleanStr: cleanStr,
        progressFromX: progressFromX,
        parseSectorText: parseSectorText,
        parseHpText: parseHpText,
        sectorLabel: sectorLabel,
        waveClock: waveClock,
        normPeer: normPeer,
        mapRunToSnapshot: mapRunToSnapshot
    };
    try {
        var w = W();
        if (w) w.GraveGainMPAdapterMMORPG1D = adapter;
    } catch (e) { /* window unwritable */ }
    try {
        if (typeof module !== 'undefined' && module && module.exports) {
            module.exports = adapter;
        }
    } catch (e) { /* browser: module undefined */ }
})();
