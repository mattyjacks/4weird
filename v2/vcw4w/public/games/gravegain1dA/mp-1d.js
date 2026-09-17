/* GraveGain1D netplay adapter: "Ley-Line Race" (v2-native extra, solo-safe).
 *
 * Byte-lock note: gravegain1d game.js / index.html / game.css / game.json are
 * NOT touched by this file. This adapter is an optional extra script loaded
 * at runtime by the netplay core (public/games/html/gravegain-netplay.js)
 * via window.GraveGainMPAdapter. If no ?match= is present the core keeps this
 * adapter dormant; render() is additionally a no-op without a match id or a
 * foe snapshot, so solo play is never disturbed.
 *
 * Observed globals (read-only, never written):
 *   window.GraveGain1D = { VERSION, newRun, tick, score, CLASSES, SECTORS,
 *     CODEX, SAVE_KEY }          // SAVE_KEY = 'gravegain1d_save_v1'
 *   The live run (closure var G.run in game.js) is NOT exported, so read()
 *   best-effort resolves it by (1) known debug hooks, (2) a bounded
 *   duck-type scan of window, (3) DOM HUD fallback. Missing keys are omitted.
 * DOM hooks (read-only except our own overlay nodes):
 *   #gg1dStage (overlay anchor), #gg1dCanvas, #gg1dHud, #gg1dHpText,
 *   #gg1dLvl, #gg1dGold, #gg1dSector ("Sector N/5 - xNNN" or
 *   "Echo Drift +C - xNNN"), #gg1dBossBar(.on)/#gg1dBossName,
 *   #gg1dBanner(.on)/#gg1dBannerTitle ("ARRAY DOWN" on victory).
 *
 * Core assumptions (verified against public/games/html/gravegain-netplay.js):
 *   - Core polls read() for our snapshot and calls render(foe, events) where
 *     events is an ARRAY of { kind, text, at } (S.events.slice()); render
 *     therefore treats a function/object second arg as a feed sink AND
 *     accepts the array form (foe event notes surface on our board).
 *   - sanitizeState() passes all number/boolean/string keys through, so the
 *     race keys (progress, sector, kills, gold, hp, maxhp, boss, winner)
 *     survive transport; read() also carries `seed` (core paints it).
 *   - Core init() only requires read/render functions; `mode` value is not
 *     validated, so mode stays 'race' per the race contract. Optional
 *     summary() feeds the core overlay scoreboard; emotes feed its buttons;
 *     rematch() falls back to a same-seed URL reload when the core lacks it.
 *   - ?match=<id> marks a netplay session; ?seed=<s> marks a same-seed party
 *     (observation only -- this adapter never touches RNG).
 *
 * Vanilla JS, no dependencies, ASCII-only, never throws.
 */
(function () {
    'use strict';

    var SAVE_KEY = 'gravegain1d_save_v1';
    var WORLD_LEN = 500;      // campaign world length (xCap = WORLD_LEN - 1)
    var SECTOR_LEN = 100;
    var LAST_X = WORLD_LEN - 1; // 499

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

    /* ---------- pure helpers (node-testable) ---------- */
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
    /* Parse "Sector 3/5 ... x214" -> { sector: 2, x: 214 }. 0-based sector. */
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
    /* Map a run-like object {x,hp,maxHp,gold,kills,sector,cycle,endless,
     * boss{name},won,over,seed,chunkBase,gateX} to a netplay snapshot. */
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
                    var bn = cleanStr(run.boss.name, 32);
                    out.boss = bn;
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

    /* ---------- read() plumbing (impure, guarded) ---------- */
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
            if (o.tagName || o.nodeType) return false; // DOM node, not a run
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
                            if (h.run && isRunLike(h.run)) return h.run; // controller { run }
                        }
                    } catch (e2) { /* next */ }
                }
            }
            // Bounded duck-type scan for a future-exposed live run object.
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
        // Read-only poll of the save key (profile has no live values; this only
        // proves the key is reachable without ever writing). Result unused.
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
                // Victory banner can precede/survive run flags; merge it in.
                try {
                    if (elOn('gg1dBanner', 'on') && /ARRAY DOWN/i.test(elText('gg1dBannerTitle'))) {
                        out.winner = true;
                        out.progress = 100;
                    }
                } catch (e) { /* ignore */ }
                return out;
            }
            // DOM HUD fallback (kills are not shown in the HUD -> omitted).
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

    /* ---------- render() plumbing ---------- */
    var S = {
        built: false,
        box: null, rivalMark: null, rivalFill: null, rivalName: null,
        board: null, youFill: null, foeFill: null, banner: null, bannerBtn: null,
        prevLocalSector: -1, prevFoeSector: -1, prevFoeBoss: '', prevLocalBoss: '',
        finished: '', // '', 'you', 'foe', 'draw'
        lastFoe: null, foeNote: '' // last foe snapshot + latest foe event text
    };
    function hasMatch() {
        try {
            var w = W();
            var search = (w && w.location && typeof w.location.search === 'string') ? w.location.search : '';
            return /[?&]match=/.test(search);
        } catch (e) { return false; }
    }
    function style(el, css) {
        try { if (el && el.style) el.style.cssText = css; } catch (e) { /* ignore */ }
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
            var box = d.createElement('div');
            box.id = 'ggmp1d';
            style(box, 'position:absolute;left:0;right:0;top:0;pointer-events:none;z-index:30;font-family:sans-serif;');
            var board = d.createElement('div');
            board.id = 'ggmp1dBoard';
            style(board, 'margin:4px 8px;padding:4px 8px;background:rgba(5,3,13,0.82);border:1px solid #a855f7;border-radius:8px;color:#e9d5ff;font-size:12px;line-height:1.5;white-space:pre-wrap;');
            var bars = d.createElement('div');
            style(bars, 'margin:0 8px;padding:0 0 2px 0;');
            var youBar = d.createElement('div');
            style(youBar, 'height:6px;background:#1e1b2e;border-radius:3px;overflow:hidden;margin-bottom:3px;');
            var youFill = d.createElement('div');
            style(youFill, 'height:100%;width:0%;background:#22c55e;');
            var foeBar = d.createElement('div');
            style(foeBar, 'height:6px;background:#1e1b2e;border-radius:3px;overflow:hidden;');
            var foeFill = d.createElement('div');
            style(foeFill, 'height:100%;width:0%;background:#ef4444;');
            var mark = d.createElement('div');
            mark.id = 'ggmp1dRival';
            style(mark, 'position:absolute;top:58%;transform:translateX(-50%);text-align:center;pointer-events:none;');
            var nm = d.createElement('div');
            style(nm, 'font-size:11px;font-weight:700;color:#fca5a5;text-shadow:0 1px 2px #000;white-space:nowrap;');
            try { nm.textContent = 'RIVAL'; } catch (e4) { /* ignore */ }
            var ghost = d.createElement('div');
            style(ghost, 'font-size:26px;line-height:1;opacity:0.85;');
            try { ghost.textContent = '?'; } catch (e5) { /* ignore */ }
            var rbar = d.createElement('div');
            style(rbar, 'width:52px;height:5px;background:#111;border-radius:3px;overflow:hidden;margin:2px auto 0 auto;');
            var rfill = d.createElement('div');
            style(rfill, 'height:100%;width:100%;background:#ef4444;');
            var banner = d.createElement('div');
            banner.id = 'ggmp1dBanner';
            style(banner, 'display:none;margin:8px auto;padding:10px 14px;max-width:420px;text-align:center;background:rgba(5,3,13,0.9);border:2px solid #fbbf24;border-radius:10px;color:#fff;font-size:15px;font-weight:800;pointer-events:auto;');
            var btn = d.createElement('button');
            try { btn.textContent = 'REMATCH (same seed)'; } catch (e6) { /* ignore */ }
            style(btn, 'display:block;margin:8px auto 0 auto;padding:8px 16px;border-radius:8px;border:1px solid #a855f7;background:#2a1650;color:#fff;font-weight:700;cursor:pointer;pointer-events:auto;');
            try {
                btn.onclick = function () { try { doRematch(); } catch (e7) { /* ignore */ } };
            } catch (e8) { /* ignore */ }
            try {
                youBar.appendChild(youFill);
                foeBar.appendChild(foeFill);
                bars.appendChild(youBar);
                bars.appendChild(foeBar);
                rbar.appendChild(rfill);
                mark.appendChild(nm);
                mark.appendChild(ghost);
                mark.appendChild(rbar);
                banner.appendChild(btn);
                box.appendChild(board);
                box.appendChild(bars);
                box.appendChild(mark);
                box.appendChild(banner);
                anchor.appendChild(box);
            } catch (e9) { return false; }
            S.box = box; S.board = board; S.youFill = youFill; S.foeFill = foeFill;
            S.rivalMark = mark; S.rivalFill = rfill; S.rivalName = nm;
            S.banner = banner; S.bannerBtn = btn;
            S.built = true;
            return true;
        } catch (e) { return false; }
    }
    function setText(node, t) {
        try { if (node) node.textContent = String(t); } catch (e) { /* ignore */ }
    }
    /* Fan-out a feed message through whatever sink shape the core provided. */
    function emit(coreApi, kind, text) {
        try {
            text = cleanStr(text, 120);
            if (!text) return;
            var payload = { t: kind, text: text };
            var sinks = [];
            try {
                if (typeof coreApi === 'function') sinks.push(['fn', coreApi]);
                else if (coreApi && typeof coreApi === 'object') {
                    sinks.push(['post', coreApi.post]);
                    sinks.push(['announce', coreApi.announce]);
                    sinks.push(['feed', coreApi.feed]);
                    sinks.push(['say', coreApi.say]);
                    sinks.push(['emit', coreApi.emit]);
                }
            } catch (e) { /* ignore */ }
            try {
                var w = W();
                var np = w ? w.GraveGainNetplay : null;
                if (np && typeof np === 'object') {
                    sinks.push(['post', np.post]);
                    sinks.push(['announce', np.announce]);
                    sinks.push(['feed', np.feed]);
                }
            } catch (e2) { /* ignore */ }
            for (var i = 0; i < sinks.length; i++) {
                var name = sinks[i][0], fn = sinks[i][1];
                try {
                    if (typeof fn !== 'function') continue;
                    if (name === 'fn' || name === 'post') fn(payload);
                    else if (name === 'emit') { try { fn('feed', payload); } catch (e3) { fn(text); } }
                    else fn(text);
                    return;
                } catch (e4) { /* try next sink */ }
            }
        } catch (e) { /* never throw */ }
    }
    function doRematch() {
        try {
            var w = W();
            var np = null;
            try { np = w ? w.GraveGainNetplay : null; } catch (e) { np = null; }
            try {
                if (np && typeof np.rematch === 'function') { np.rematch(); return; }
            } catch (e2) { /* fall through to URL rematch */ }
            var search = '';
            try { search = (w && w.location && typeof w.location.search === 'string') ? w.location.search : ''; } catch (e3) { search = ''; }
            var match = '', seed = '';
            try {
                var mm = /[?&]match=([^&]*)/.exec(search);
                if (mm && mm[1]) match = decodeURIComponent(mm[1]);
                var sm = /[?&]seed=([^&]*)/.exec(search);
                if (sm && sm[1]) seed = decodeURIComponent(sm[1]);
            } catch (e4) { /* ignore */ }
            try {
                if (w && w.location && match) {
                    var path = '';
                    try { path = w.location.pathname || ''; } catch (e5) { path = ''; }
                    w.location.href = path + '?match=' + encodeURIComponent(match) +
                        (seed ? '&seed=' + encodeURIComponent(seed) : '') + '&fresh=1';
                    return;
                }
                if (w && w.location && typeof w.location.reload === 'function') w.location.reload();
            } catch (e6) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }
    function foePresent(foe) {
        try {
            if (!foe || typeof foe !== 'object') return false;
            var keys = ['progress', 'sector', 'kills', 'gold', 'hp', 'boss', 'winner'];
            for (var i = 0; i < keys.length; i++) {
                if (foe[keys[i]] !== undefined && foe[keys[i]] !== null && foe[keys[i]] !== '') return true;
            }
            return false;
        } catch (e) { return false; }
    }
    function num(foe, key, fb) {
        try {
            var v = Number(foe ? foe[key] : NaN);
            return isFinite(v) ? v : fb;
        } catch (e) { return fb; }
    }
    function showBanner(text) {
        try {
            if (!S.banner) return;
            S.banner.style.display = 'block';
            try {
                if (S.banner.firstChild && S.banner.firstChild.nodeType === 3) {
                    S.banner.firstChild.nodeValue = String(text);
                } else if (S.bannerBtn && S.bannerBtn.parentNode === S.banner) {
                    S.banner.insertBefore(D().createTextNode(String(text)), S.bannerBtn);
                } else {
                    setText(S.banner, text);
                }
            } catch (e) { setText(S.banner, text); }
        } catch (e) { /* ignore */ }
    }

    function render(foe, coreApi) {
        try {
            // coreApi may double as an incoming event list; normalize both.
            var sink = coreApi;
            var incoming = null;
            try {
                if (coreApi && Object.prototype.toString.call(coreApi) === '[object Array]') {
                    incoming = coreApi;
                    sink = null;
                } else if (coreApi && typeof coreApi === 'object' && coreApi.events &&
                    Object.prototype.toString.call(coreApi.events) === '[object Array]') {
                    incoming = coreApi.events;
                }
            } catch (e) { /* ignore */ }
            var hasFoe = foePresent(foe);
            if (!hasFoe && !hasMatch()) return true; // dormant: never touch solo play
            if (!foe || typeof foe !== 'object') foe = {};
            try { S.lastFoe = foe; } catch (e0) { /* ignore */ }
            if (!ensureDom()) return true;
            var me = read();
            var myProg = num(me, 'progress', 0);
            var mySector = num(me, 'sector', 0);
            var feProg = num(foe, 'progress', 0);
            var feSector = num(foe, 'sector', 0);
            myProg = clampNum(myProg, 0, 100);
            feProg = clampNum(feProg, 0, 100);

            // Rival ghost marker: rival progress % mapped eastward.
            try {
                S.rivalMark.style.left = feProg.toFixed(1) + '%';
                var feHp = num(foe, 'hp', NaN), feMx = num(foe, 'maxhp', NaN);
                var frac = (isFinite(feHp) && isFinite(feMx) && feMx > 0) ? clampNum(feHp / feMx, 0, 1) : 1;
                S.rivalFill.style.width = (frac * 100).toFixed(1) + '%';
                var nm = 'RIVAL S' + (Math.floor(feSector) + 1);
                if (foe.boss) nm += ' VS ' + cleanStr(foe.boss, 18);
                setText(S.rivalName, nm);
                S.rivalMark.style.display = 'block';
            } catch (e2) { /* garnish */ }

            // Scoreboard: live % bars for both couriers + sector/kills/gold race.
            try {
                S.youFill.style.width = myProg.toFixed(1) + '%';
                S.foeFill.style.width = feProg.toFixed(1) + '%';
                var line = 'LEY-LINE RACE | YOU S' + (Math.floor(mySector) + 1) + ' ' + myProg.toFixed(1) + '%';
                if (me.kills !== undefined) line += ' K' + Math.floor(num(me, 'kills', 0));
                if (me.gold !== undefined) line += ' G' + Math.floor(num(me, 'gold', 0));
                line += '  vs  RIVAL S' + (Math.floor(feSector) + 1) + ' ' + feProg.toFixed(1) + '%';
                if (foe.kills !== undefined && foe.kills !== null && foe.kills !== '') line += ' K' + Math.floor(num(foe, 'kills', 0));
                if (foe.gold !== undefined && foe.gold !== null && foe.gold !== '') line += ' G' + Math.floor(num(foe, 'gold', 0));
                if (foe.boss) line += ' | RIVAL VS ' + cleanStr(foe.boss, 24);
                else if (me.boss) line += ' | YOU VS ' + cleanStr(me.boss, 24);
                else if (S.foeNote) line += ' | ' + cleanStr(S.foeNote, 40);
                var seed = queryParam('seed') || me.seed || foe.seed || '';
                seed = cleanStr(seed, 32);
                if (seed) line += ' | SEED ' + seed + ' SAME-SEED';
                var lead = myProg - feProg;
                if (!me.winner && !foe.winner) {
                    line += lead > 0.05 ? ' | YOU LEAD' : (lead < -0.05 ? ' | RIVAL LEADS' : ' | DEAD HEAT');
                }
                setText(S.board, line);
            } catch (e3) { /* ignore */ }

            // Sector checkpoints ping the feed (sector-up posts a loot event).
            try {
                if (S.prevLocalSector < 0) S.prevLocalSector = Math.floor(mySector);
                else if (Math.floor(mySector) > S.prevLocalSector) {
                    S.prevLocalSector = Math.floor(mySector);
                    emit(sink, 'loot', 'YOU reached Sector ' + (S.prevLocalSector + 1) + ' at ' + myProg.toFixed(1) + '% -- courier checkpoint');
                }
                if (S.prevFoeSector < 0) S.prevFoeSector = Math.floor(feSector);
                else if (Math.floor(feSector) > S.prevFoeSector) {
                    S.prevFoeSector = Math.floor(feSector);
                    emit(sink, 'loot', 'RIVAL reached Sector ' + (S.prevFoeSector + 1) + ' at ' + feProg.toFixed(1) + '% -- courier checkpoint');
                }
            } catch (e4) { /* ignore */ }

            // Boss VS status.
            try {
                var fb = foe.boss ? cleanStr(foe.boss, 32) : '';
                if (fb && fb !== S.prevFoeBoss) emit(sink, 'boss', 'RIVAL VS ' + fb + ' -- gate duel on the ley-line');
                S.prevFoeBoss = fb;
                var lb = me.boss ? cleanStr(me.boss, 32) : '';
                if (lb && lb !== S.prevLocalBoss) emit(sink, 'boss', 'YOU VS ' + lb + ' -- gate duel on the ley-line');
                S.prevLocalBoss = lb;
            } catch (e5) { /* ignore */ }

            // Incoming foe event list (core passes S.events.slice(): entries are
            // { kind, text, at }). Remember the latest notable foe note so the
            // board can show it; snapshot fields stay authoritative for wins.
            try {
                if (incoming) {
                    for (var i = 0; i < incoming.length; i++) {
                        var ev = incoming[i];
                        if (!ev || typeof ev !== 'object') continue;
                        var t = cleanStr(ev.t || ev.type || ev.kind || '', 16).toLowerCase();
                        var tx = cleanStr(ev.text || ev.name || '', 64);
                        if (!tx) continue;
                        if (t === 'boss' || t === 'winner' || t === 'victory' || t === 'loot' || t === 'emote' || t === 'chat') {
                            S.foeNote = tx;
                            emit(sink, t, tx);
                        }
                    }
                }
            } catch (e6) { /* ignore */ }

            // Photo-finish win detection + rematch. First to finish Echo Drift
            // sector 5 boss wins; simultaneous observation is a draw.
            try {
                var iWon = !!me.winner;
                var foeWon = !!foe.winner;
                if (iWon && foeWon && !S.finished) {
                    S.finished = 'draw';
                    showBanner('PHOTO FINISH -- DRAW! Both couriers felled the Gate Titan. Rematch?');
                } else if (iWon && !S.finished) {
                    S.finished = 'you';
                    showBanner('YOU WIN THE LEY-LINE RACE! First courier through the Gate Titan. Rematch?');
                    emit(sink, 'winner', 'YOU won the Ley-Line Race -- first through the Gate Titan');
                } else if (foeWon && !S.finished) {
                    S.finished = 'foe';
                    showBanner('RIVAL WINS THE LEY-LINE RACE. The other courier walks faster -- rematch?');
                    emit(sink, 'winner', 'RIVAL won the Ley-Line Race');
                }
            } catch (e7) { /* ignore */ }
            return true;
        } catch (e) { return true; }
    }

    /* Optional core hook: compact scoreboard line for the core overlay
     * (paintScore accepts a string or { me, foe }). Never throws. */
    function summary() {
        try {
            var me = read();
            var foe = (S.lastFoe && typeof S.lastFoe === 'object') ? S.lastFoe : {};
            var myP = clampNum(num(me, 'progress', 0), 0, 100).toFixed(0);
            var feP = clampNum(num(foe, 'progress', 0), 0, 100).toFixed(0);
            var myS = Math.floor(num(me, 'sector', 0)) + 1;
            var feS = Math.floor(num(foe, 'sector', 0)) + 1;
            return 'you S' + myS + ' ' + myP + '% vs foe S' + feS + ' ' + feP + '%';
        } catch (e) { return 'you vs foe'; }
    }

    var adapter = {
        mode: 'race',
        emotes: ['GG', 'ZOOM', 'BOSS!'],
        read: read,
        render: render,
        summary: summary
    };
    // Pure helpers exposed for unit smoke tests (harmless in the browser).
    adapter._pure = {
        clampNum: clampNum,
        cleanStr: cleanStr,
        progressFromX: progressFromX,
        parseSectorText: parseSectorText,
        parseHpText: parseHpText,
        mapRunToSnapshot: mapRunToSnapshot
    };
    try {
        var w = W();
        if (w) w.GraveGainMPAdapter = adapter;
    } catch (e) { /* window unwritable */ }
    try {
        if (typeof module !== 'undefined' && module && module.exports) {
            module.exports = adapter;
        }
    } catch (e) { /* browser: module undefined */ }
})();
