/* =========================================================================
 * GraveGain5D - Multiverse Transcendence MMORPG adapter
 * (window.GraveGainMPAdapterMMORPG5D)
 * -------------------------------------------------------------------------
 * Hop-race overlay for the 6-universe transcendence run (prime / echo /
 * dream / void / bloom / static). Mirrors
 * public/games/html/gravegain3d/mmorpg-3d.js (Spire Raid adapter) in
 * structure and contract, adapted to the 5D rules core in game.js
 * (window.GraveGain5D: universes, hops, combo multipliers, paradox meter,
 * doom clock; 10 holes; no x/y, hp, or kills in run state).
 *
 * Vanilla JS, ASCII-only, never throws, solo-safe: stays dormant (no DOM
 * visible, no game writes) without ?mmorpg=<serverId> or live peer data.
 * Pointer-lock safe: overlay root is pointer-events:none; only buttons opt
 * back into pointer-events:auto. Reads HUD DOM + GraveGain5D constants
 * read-only; never presses keys, clicks, or touches game state.
 *
 * Contract:
 *   mode   : 'multiverse'
 *   read() : {x,y,hp,maxhp,gold,kills,deaths,universe,paradox,combo,
 *            progress,boss,winner,seed}
 *            x = hole index (course-position proxy), y = strokes on the
 *            current hole; hp = 100 - paradox (pressure as vitality),
 *            maxhp = 100; kills = holes cleared; deaths = observed universe
 *            collapses (doom-clock hits zero while standing in a collapsing
 *            universe); universe is the universe id; boss is a capped
 *            string ('doom' while the doom clock runs, '' when not) so it
 *            survives string-only relays; score/hops/alive ride along as
 *            relay headline extras (hops*10000+gold).
 *   render(peers, events): peers is an array (up to 8) or a single peer
 *            object; events is an array (or single) of feed events.
 *            Rival universe markers (one lane per universe), hop-race
 *            scoreboard (hops + combo + gold), paradox/doomclock feed
 *            (max 6), WIN/LOSE banner with same-seed rematch.
 * ========================================================================= */
(function () {
    'use strict';

    var MODE = 'multiverse';
    var ROOT_ID = 'ggmp-multi5d-root';
    var MAX_RACE = 8;
    var MAX_FEED = 6;
    var TICK_MS = 500;
    var FINAL_HOLE = 10;
    var SCORE_H = 10000;
    var GOLD_CAP = 9999;
    var PARADOX_HOT = 80;

    var UNIVERSES = [
        { id: 'prime', tag: 'PRIME', name: 'Prime Array' },
        { id: 'echo', tag: 'ECHO', name: 'Echo Expanse' },
        { id: 'dream', tag: 'DREAM', name: 'Dream Shallows' },
        { id: 'void', tag: 'VOID', name: 'Void Maw' },
        { id: 'bloom', tag: 'BLOOM', name: 'Bloom Lattice' },
        { id: 'static', tag: 'STATIC', name: 'Static Storm' }
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

    function universeKnown(id) {
        try {
            for (var i = 0; i < UNIVERSES.length; i++) {
                if (UNIVERSES[i].id === id) return true;
            }
        } catch (_) { /* never throw */ }
        return false;
    }

    // Parse ?mmorpg=<serverId> (+ optional ?seed=). Returns { server, seed }.
    // Gated on location.search with URLSearchParams first, manual fallback.
    function parseMulti(href) {
        var out = { server: '', seed: '' };
        try {
            var qs = '';
            try {
                if (typeof location !== 'undefined' && location && location.search) {
                    qs = location.search;
                }
            } catch (_) { qs = ''; }
            if (!qs) qs = String(href || '');
            var params = null;
            try {
                if (typeof URLSearchParams !== 'undefined') {
                    var qOnly = qs.indexOf('?') >= 0 ? qs.split('?')[1].split('#')[0] : qs.replace(/^[?]/, '');
                    params = new URLSearchParams(qOnly);
                }
            } catch (_) { params = null; }
            if (params) {
                try {
                    var sv = params.get('mmorpg') || params.get('server') || params.get('raid') || '';
                    if (sv) out.server = String(sv).slice(0, 32);
                    var sd = params.get('seed') || '';
                    if (sd) out.seed = String(sd).slice(0, 32);
                } catch (_) { /* fall through to manual */ }
                if (out.server || out.seed) return out;
            }
            var q = String(qs || '').split('?')[1] || String(qs || '');
            q = q.split('#')[0];
            if (q.charAt(0) === '?') q = q.slice(1);
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

    function encodeScore(hops, gold) {
        try {
            var h = (isFinite(hops) && hops > 0) ? Math.floor(hops) : 0;
            var g = (isFinite(gold) && gold > 0) ? Math.floor(gold) : 0;
            if (g > GOLD_CAP) g = GOLD_CAP;
            var s = h * SCORE_H + g;
            if (!isFinite(s) || s > 100000000) s = 100000000;
            return s;
        } catch (_) {
            return 0;
        }
    }

    function decodeScore(score) {
        try {
            var s = (isFinite(score) && score > 0) ? Math.floor(score) : 0;
            return { hops: Math.floor(s / SCORE_H), gold: s % SCORE_H };
        } catch (_) {
            return { hops: 0, gold: 0 };
        }
    }

    function paradoxBar(frac) {
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
        peers: [],        // normalized, max MAX_RACE
        feed: [],         // { key, text, t }
        feedKeys: {},
        myHole: 0,
        myHops: 0,
        bestFoeHops: 0,
        deathsObserved: 0, // universe collapses seen via doom->prime resets
        prev: null,       // { doom, universe, paradox } last paint
        banner: '',
        lastPaint: 0,
        els: null
    };

    function game5d() {
        try { return window.GraveGain5D || null; } catch (_) { return null; }
    }

    function textOf(id) {
        try {
            var n = document.getElementById(id);
            return (n && n.textContent) ? n.textContent : '';
        } catch (_) { return ''; }
    }

    function multiInfo() {
        try {
            var qs = '';
            try { if (typeof location !== 'undefined' && location && location.search) qs = location.search; } catch (_) { /* ignore */ }
            if (!qs) {
                try { if (typeof window !== 'undefined' && window && window.location && window.location.href) qs = window.location.href; } catch (_) { /* ignore */ }
            }
            return parseMulti(qs);
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

    function universeFromText(t) {
        try {
            var s = String(t || '').toLowerCase();
            for (var i = 0; i < UNIVERSES.length; i++) {
                var u = UNIVERSES[i];
                if (s.indexOf(u.id) >= 0 || s.indexOf(u.name.toLowerCase()) >= 0 || s.indexOf(u.tag.toLowerCase()) >= 0) {
                    return u.id;
                }
            }
        } catch (_) { /* fall through */ }
        return 'prime';
    }

    // ------------------------------ read() ------------------------------
    function readSnapshot() {
        var out = {};
        try {
            var hole = 0, hTotal = FINAL_HOLE;
            try {
                var hm = textOf('gg5dHole').match(/(\d+)\s*\/\s*(\d+)/);
                if (hm) {
                    hole = Math.max(0, (fin(hm[1]) || 1) - 1);
                    hTotal = fin(hm[2]) || FINAL_HOLE;
                }
            } catch (_) { /* omit */ }
            out.x = hole;
            var strokes = 0, par = 3;
            try {
                var sm = textOf('gg5dStrokes').match(/(\d+)\s*\/\s*(\d+)/);
                if (sm) {
                    strokes = fin(sm[1]) || 0;
                    par = fin(sm[2]) || 3;
                }
            } catch (_) { /* omit */ }
            out.y = strokes;
            var universe = universeFromText(textOf('gg5dUniverse') + ' ' + textOf('gg5dUniverseBadge'));
            if (!universeKnown(universe)) universe = 'prime';
            out.universe = universe;
            var paradox = 0, doom = 0;
            try {
                var pm = textOf('gg5dParadox').match(/(\d+)/g);
                if (pm && pm.length) {
                    paradox = Math.max(0, Math.min(100, fin(pm[0]) || 0));
                    if (pm.length > 1) doom = Math.max(0, fin(pm[1]) || 0);
                }
            } catch (_) { /* omit */ }
            out.paradox = paradox;
            var combo = 1;
            try {
                var cm = textOf('gg5dChain').match(/x\s*(\d+)/i);
                if (cm) combo = Math.max(1, Math.min(8, fin(cm[1]) || 1));
            } catch (_) { /* omit */ }
            out.combo = combo;
            var gold = fin(textOf('gg5dGold').replace(/[^0-9.\-]/g, ''));
            if (gold === undefined) gold = 0;
            out.gold = gold;
            out.kills = hole; // holes cleared (5D has no foe kills)
            out.deaths = S.deathsObserved;
            out.hp = Math.max(0, 100 - paradox);
            out.maxhp = 100;
            var prog = clamp01((hole + (strokes / Math.max(1, par))) / (hTotal || FINAL_HOLE));
            out.progress = Math.round(prog * 1000) / 1000;
            out.boss = doom > 0 ? capStr('doom', 32) : '';
            try { out.doom = doom; } catch (_) { /* optional extra */ }
            out.winner = isLocalWinner(hole, hTotal);
            try {
                out.score = encodeScore(0, gold);
                out.alive = !(doom > 0 && paradox >= 100);
            } catch (_) { /* omit */ }
            var ri = multiInfo();
            if (ri.seed) out.seed = ri.seed;
        } catch (_) { /* never throw; return what we have */ }
        return out;
    }

    function isLocalWinner(hole, hTotal) {
        try {
            if (isFinite(hole) && isFinite(hTotal) && hole >= hTotal) return true;
            var t = textOf('gg5dBannerTitle') + ' ' + textOf('gg5dBannerText');
            if (/PRIME ARRAY REACHED/i.test(t)) return true;
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
            var pr = fin(raw.progress); if (pr !== undefined) f.progress = clamp01(pr);
            var px = fin(raw.paradox); if (px !== undefined) f.paradox = Math.max(0, Math.min(100, px));
            var cb = fin(raw.combo); if (cb !== undefined) f.combo = Math.max(1, Math.min(8, cb));
            var hp2 = fin(raw.hops); if (hp2 !== undefined) f.hops = Math.max(0, Math.floor(hp2));
            try {
                var u = capStr(raw.universe, 16).toLowerCase();
                f.universe = universeKnown(u) ? u : 'prime';
            } catch (_) { f.universe = 'prime'; }
            try { if (raw.name) f.name = capStr(raw.name, 24); } catch (_) { /* optional */ }
            try { if (raw.id !== undefined) f.id = capStr(raw.id, 24); } catch (_) { /* optional */ }
            try { if (raw.emote) f.emote = capStr(raw.emote, 32); } catch (_) { /* optional */ }
            f.winner = raw.winner === true;
            if (raw.alive !== undefined) f.alive = raw.alive !== false && raw.alive !== 0;
            try {
                var dec = decodeScore(raw.score);
                if (f.hops === undefined && dec.hops > 0) f.hops = dec.hops;
                if (f.gold === undefined && dec.gold > 0) f.gold = dec.gold;
            } catch (_) { /* omit */ }
            try {
                var b = raw.boss;
                if (typeof b === 'string' && b !== '') f.boss = capStr(b, 32);
                else if (b === true || b === 1) f.boss = 'doom';
                else f.boss = '';
            } catch (_) { f.boss = ''; }
            try {
                var dm = fin(raw.doom);
                if (dm !== undefined) f.doom = Math.max(0, Math.floor(dm));
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
            for (var i = 0; i < list.length && out.length < MAX_RACE; i++) {
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
            if (f && (f.x !== undefined || f.hops !== undefined || f.kills !== undefined ||
                f.gold !== undefined || f.winner || f.paradox !== undefined ||
                f.universe !== undefined || f.emote || f.alive !== undefined || f.name)) return true;
            // Relay-minimal foe ({ score }: hops+gold headline) still counts.
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

    function uniTag(id) {
        try {
            for (var i = 0; i < UNIVERSES.length; i++) {
                if (UNIVERSES[i].id === id) return UNIVERSES[i].tag;
            }
        } catch (_) { /* ignore */ }
        return 'PRIME';
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
                    post('ev:' + kind + ':' + by + txt.slice(0, 40), (by + txt).slice(0, 120));
                }
            }
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

    var BASE_CSS = 'background:rgba(8,4,20,0.84);border:1px solid #22d3ee;border-radius:8px;' +
        'color:#e0f2fe;font-family:monospace,monospace;font-size:11px;line-height:1.5;' +
        'padding:6px 8px;pointer-events:none;white-space:pre;';
    var BTN_CSS = 'pointer-events:auto;cursor:pointer;background:rgba(8,47,73,0.92);color:#fff;' +
        'border:1px solid #22d3ee;border-radius:6px;font-family:monospace,monospace;' +
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
            // Rival universe markers (top-left): one lane per universe.
            var lanes = el('div', BASE_CSS + 'position:absolute;top:8px;left:8px;max-width:44vw;');
            // Hop-race scoreboard (top-right).
            var board = el('div', BASE_CSS + 'position:absolute;top:8px;right:8px;max-width:48vw;');
            var boardPre = el('div', '');
            board.appendChild(boardPre);
            // Paradox/doomclock feed (bottom-left, max 6).
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
            // Paradox hint (bottom-center).
            var hint = el('div', BASE_CSS + 'position:absolute;left:50%;bottom:12px;transform:translate(-50%,0);' +
                'display:none;border-color:#ef4444;color:#fecaca;');
            root.appendChild(lanes);
            root.appendChild(board);
            root.appendChild(feed);
            root.appendChild(banner);
            root.appendChild(hint);
            S.els = {
                root: root, lanes: lanes, board: board,
                boardPre: boardPre, feed: feed, banner: banner,
                bannerText: bannerText, rematch: rematch, hint: hint
            };
            if (S.active) root.style.display = 'block';
            return S.els;
        } catch (_) {
            return null;
        }
    }

    function doRematch() {
        try {
            try { resetState(); } catch (_) { /* ignore */ }
            var href = '';
            try { href = String(window.location.href); } catch (_) { href = ''; }
            var ri = parseMulti(href);
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
            S.myHops = 0;
            S.bestFoeHops = 0;
            S.deathsObserved = 0;
            S.prev = null;
            S.banner = '';
            paint();
        } catch (_) { /* never throw */ }
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
            var ri = multiInfo();

            // ---- collapse watch: doom ran out and we bounced to Prime ----
            try {
                var cur = {
                    doom: (me.doom !== undefined) ? me.doom : 0,
                    universe: me.universe || 'prime',
                    paradox: (me.paradox !== undefined) ? me.paradox : 0
                };
                if (S.prev && S.prev.doom > 0 && cur.doom <= 0 &&
                    cur.universe === 'prime' && cur.paradox === 40) {
                    S.deathsObserved += 1;
                    me.deaths = S.deathsObserved;
                    post('collapse:' + S.deathsObserved + ':' + now,
                        'UNIVERSE COLLAPSED - bounced to Prime (' + S.deathsObserved + ')');
                }
                S.prev = cur;
            } catch (_) { /* ignore */ }

            // ---- my progress + paradox/doom feed lines ----
            try {
                var mh = (me.x !== undefined) ? me.x : 0;
                if (mh > S.myHole) S.myHole = mh;
                if (me.paradox !== undefined && me.paradox >= PARADOX_HOT) {
                    post('phot:' + Math.floor(me.paradox / 5),
                        'PARADOX HOT ' + me.paradox + ' ' + paradoxBar(me.paradox / 100) + ' - putt to vent');
                }
                if (me.doom !== undefined && me.doom > 0) {
                    post('doom:' + me.doom + ':' + (me.universe || ''),
                        'DOOMCLOCK ' + me.doom + ' in ' + uniTag(me.universe || 'prime') + ' - hop out!');
                }
            } catch (_) { /* ignore */ }

            // ---- peer paradox/doom feed + best foe hops ----
            var best = 0;
            try {
                for (var pi = 0; pi < peers.length; pi++) {
                    var pp0 = peers[pi];
                    var ph = (pp0.hops !== undefined) ? pp0.hops : 0;
                    if (ph > best) best = ph;
                    if (pp0.paradox !== undefined && pp0.paradox >= PARADOX_HOT) {
                        post('fphot:' + peerKey(pp0, pi) + ':' + Math.floor(pp0.paradox / 10),
                            labelOf(pp0, pi) + ' PARADOX HOT ' + pp0.paradox);
                    }
                    if (pp0.doom !== undefined && pp0.doom > 0) {
                        post('fdoom:' + peerKey(pp0, pi) + ':' + pp0.doom,
                            labelOf(pp0, pi) + ' DOOMCLOCK ' + pp0.doom + ' in ' + uniTag(pp0.universe || 'prime'));
                    }
                    if (pp0.emote) {
                        post('pem:' + peerKey(pp0, pi) + ':' + String(pp0.emote).slice(0, 24),
                            labelOf(pp0, pi) + ': ' + String(pp0.emote).slice(0, 60));
                    }
                }
                S.bestFoeHops = Math.max(S.bestFoeHops, best);
            } catch (_) { /* ignore */ }

            // ---- rival universe markers: one lane per universe ----
            try {
                var ll = ['MULTIVERSE LANES'];
                for (var li = 0; li < UNIVERSES.length; li++) {
                    var uid = UNIVERSES[li].id;
                    var names = [];
                    if ((me.universe || 'prime') === uid) names.push('YOU');
                    for (var lj = 0; lj < peers.length; lj++) {
                        if ((peers[lj].universe || 'prime') === uid) names.push(labelOf(peers[lj], lj));
                    }
                    var mark = names.length ? '[*]' : '[ ]';
                    var line = mark + ' ' + UNIVERSES[li].tag + ' ' + names.length + 'P';
                    if (names.length) line += ' ' + names.slice(0, 4).join(',');
                    ll.push(line.slice(0, 64));
                }
                els.lanes.style.display = 'block';
                els.lanes.textContent = ll.join('\n');
            } catch (_) { /* ignore */ }

            // ---- hop-race scoreboard: hops, combo, gold ----
            try {
                var lines = [];
                var title = 'HOP RACE (8P)';
                if (ri.server) title += ' [' + ri.server.slice(0, 16) + ']';
                if (ri.seed) title += ' [seed:' + ri.seed + ']';
                lines.push(title);
                var rows = [];
                rows.push({
                    tag: 'YOU',
                    hops: 0,
                    combo: (me.combo !== undefined) ? me.combo : 1,
                    gold: (me.gold !== undefined) ? me.gold : 0,
                    paradox: (me.paradox !== undefined) ? me.paradox : 0,
                    universe: me.universe || 'prime',
                    doom: (me.doom !== undefined) ? me.doom : 0
                });
                for (var rj = 0; rj < peers.length; rj++) {
                    var pp = peers[rj];
                    rows.push({
                        tag: labelOf(pp, rj),
                        hops: (pp.hops !== undefined) ? pp.hops : 0,
                        combo: (pp.combo !== undefined) ? pp.combo : 1,
                        gold: (pp.gold !== undefined) ? pp.gold : 0,
                        paradox: (pp.paradox !== undefined) ? pp.paradox : 0,
                        universe: pp.universe || 'prime',
                        doom: (pp.doom !== undefined) ? pp.doom : 0
                    });
                }
                rows.sort(function (a, b) {
                    if (b.hops !== a.hops) return b.hops - a.hops;
                    if (b.combo !== a.combo) return b.combo - a.combo;
                    return b.gold - a.gold;
                });
                for (var rk = 0; rk < rows.length; rk++) {
                    var r = rows[rk];
                    var ln = (rk + 1) + '. ' + r.tag + ' H' + r.hops + ' x' + r.combo + ' G' + r.gold +
                        ' ' + uniTag(r.universe) + ' P' + r.paradox;
                    if (r.doom > 0) ln += ' DOOM' + r.doom;
                    lines.push(ln.slice(0, 64));
                }
                try {
                    if (me.paradox !== undefined) {
                        lines.push('YOU-PARADOX ' + paradoxBar(me.paradox / 100));
                    }
                } catch (_) { /* ignore */ }
                els.boardPre.textContent = lines.join('\n');
            } catch (_) { /* ignore */ }

            // ---- paradox/doomclock feed (max 6) ----
            try {
                if (S.feed.length) {
                    var fl = [];
                    S.feed.slice(-MAX_FEED).forEach(function (p) { fl.push(p.text); });
                    els.feed.style.display = 'block';
                    els.feed.textContent = fl.join('\n');
                } else {
                    els.feed.style.display = 'none';
                }
            } catch (_) { /* ignore */ }

            // ---- paradox-hot hint (display only, never press keys) ----
            try {
                var showHint = false;
                var hintTxt = '';
                if (me.paradox !== undefined && me.paradox >= PARADOX_HOT && !(me.doom > 0)) {
                    showHint = true;
                    hintTxt = 'PARADOX HOT - putt (Space) to vent, hopping feeds it';
                } else if (me.doom !== undefined && me.doom > 0) {
                    showHint = true;
                    hintTxt = 'DOOMCLOCK - hop (U) to a stable universe NOW';
                }
                if (showHint) {
                    els.hint.style.display = 'block';
                    els.hint.textContent = hintTxt;
                } else {
                    els.hint.style.display = 'none';
                }
            } catch (_) {
                try { els.hint.style.display = 'none'; } catch (_) { /* ignore */ }
            }

            // ---- WIN/LOSE banner (first to clear hole 10) ----
            try {
                var myWin = !!me.winner;
                var foeWin = false;
                var foeName = '';
                for (var wi = 0; wi < peers.length; wi++) {
                    if (peers[wi].winner) { foeWin = true; foeName = labelOf(peers[wi], wi); break; }
                }
                var b = '';
                var bt = '';
                if (myWin && !foeWin) { b = 'WIN'; bt = 'YOU TRANSCENDED THE PRIME ARRAY'; }
                else if (foeWin && !myWin) { b = 'LOSE'; bt = foeName + ' TRANSCENDED FIRST'; }
                else if (myWin && foeWin) { b = 'DRAW'; bt = 'SHARED TRANSCENDENCE - PHOTO FINISH'; }
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
            // Solo-safe: only latch on with explicit multiverse param or peer data.
            if (!S.active) {
                try {
                    var ri = multiInfo();
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
        maxRace: MAX_RACE,
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
                var a = 'H' + (me.x !== undefined ? me.x : '-') +
                    ' x' + (me.combo !== undefined ? me.combo : '-');
                var n = (S.peers || []).length;
                return 'MULTIVERSE YOU ' + a + ' vs ' + n + 'P best H' + S.bestFoeHops;
            } catch (_) {
                return 'MULTIVERSE YOU vs PARTY';
            }
        },
        reset: function () {
            try { resetState(); }
            catch (_) { /* never throw */ }
        }
    };

    // Auto-boot: build nothing visible until multiverse traffic arrives
    // (solo-safe dormant). A light interval keeps lanes/feed live even if the
    // race core calls render() infrequently. Cheap and fully guarded.
    try {
        if (typeof window !== 'undefined') {
            try { window.GraveGainMPAdapterMMORPG5D = Adapter; } catch (_) { /* ignore */ }
            try {
                var ri0 = multiInfo();
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
                fin: fin, capStr: capStr, clamp01: clamp01, parseMulti: parseMulti,
                paradoxBar: paradoxBar, normPeer: normPeer, normPeers: normPeers,
                encodeScore: encodeScore, decodeScore: decodeScore,
                universeKnown: universeKnown,
                FINAL_HOLE: FINAL_HOLE, MAX_RACE: MAX_RACE, MAX_FEED: MAX_FEED,
                UNIVERSES: UNIVERSES
            };
        }
    } catch (_) { /* never throw */ }
})();
