/* =========================================================================
 * GraveGain3D - Spire Raid MMORPG adapter (window.GraveGainMPAdapterMMORPG3D)
 * -------------------------------------------------------------------------
 * 8-player raid overlay for the 10-floor Spire (M10 LUCIFER HADES).
 * Vanilla JS, ASCII-only, never throws, solo-safe: stays dormant (no DOM
 * visible, no game writes) without ?mmorpg=<serverId> or live peer data.
 * Pointer-lock safe: overlay root is pointer-events:none; only buttons opt
 * back into pointer-events:auto. Reads window.GraveGainGame + player
 * read-only; never presses keys, clicks, or touches bot input/cursor.
 *
 * Contract:
 *   mode   : 'raid3d'
 *   read() : {x,y,hp,maxhp,gold,kills,deaths,floor,progress,boss,winner,seed}
 *            boss is a capped string ('boss' when a boss is engaged, ''
 *            when not) so it survives string-only relays; score/alive ride
 *            along as relay headline extras (floor*10000+kills).
 *   render(peers, events): peers is an array (up to 8) or a single peer
 *            object; events is an array (or single) of feed events.
 *            Rival apparition markers (3D projection when possible, else
 *            compass), raid scoreboard (floor race + boss DPS + splits),
 *            10-floor Spire raid tracker, floor-first bonuses, comeback
 *            feed, WIN/LOSE banner with same-seed rematch.
 * ========================================================================= */
(function () {
    'use strict';

    var MODE = 'raid3d';
    var ROOT_ID = 'ggmp-raid3d-root';
    var MAX_RAID = 8;
    var MAX_FEED = 7;
    var TICK_MS = 500;
    var FINAL_FLOOR = 10;
    var SCORE_F = 10000;
    var SCORE_KILLS_CAP = 9999;
    var POTION_PCT = 0.45;

    var FLOORS = [
        'F1 CRYPT GATE',
        'F2 ASHEN CRYPT',
        'F3 HOLLOW CHOIR',
        'F4 GORE GARDEN',
        'F5 IRON REQUIEM',
        'F6 PALE THRONE',
        'F7 VOID BELFRY',
        'F8 SERAPH RUIN',
        'F9 HADES ANTECHAMBER',
        'M10 LUCIFER HADES'
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
    function parseRaid(href) {
        var out = { server: '', seed: '' };
        try {
            var q = String(href || '').split('?')[1] || '';
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

    function encodeScore(floor, kills) {
        try {
            var f = (isFinite(floor) && floor > 0) ? Math.floor(floor) : 0;
            var k = (isFinite(kills) && kills > 0) ? Math.floor(kills) : 0;
            if (k > SCORE_KILLS_CAP) k = SCORE_KILLS_CAP;
            var s = f * SCORE_F + k;
            if (!isFinite(s) || s > 1000000) s = 1000000;
            return s;
        } catch (_) {
            return 0;
        }
    }

    function decodeScore(score) {
        try {
            var s = (isFinite(score) && score > 0) ? Math.floor(score) : 0;
            return { floor: Math.floor(s / SCORE_F), kills: s % SCORE_F };
        } catch (_) {
            return { floor: 0, kills: 0 };
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
        myFloor: 0,
        bestFoeFloor: 0,
        first: {},        // floor -> claimant label (floor-first bonuses)
        splits: [],       // my splits { f, dt }
        runStart: 0,
        deficitMax: 0,
        dps: {},          // peerKey -> { hp, t, rate }
        banner: '',
        lastPaint: 0,
        els: null
    };

    function game() {
        try { return window.GraveGainGame || null; } catch (_) { return null; }
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

    // ------------------------------ read() ------------------------------
    function readSnapshot() {
        var out = {};
        try {
            var g = game();
            if (!g) return out;
            var p = g.player || null;
            if (p) {
                var x = fin(p.x); if (x !== undefined) out.x = x;
                var y = fin(p.y); if (y !== undefined) out.y = y;
                var hp = fin(p.hp); if (hp !== undefined) out.hp = hp;
                var mhp = fin(p.maxHp); if (mhp !== undefined) out.maxhp = mhp;
            }
            var gold = fin(g.gold); if (gold !== undefined) out.gold = gold;
            var kills = fin(g.kills); if (kills !== undefined) out.kills = kills;
            var deaths = fin(g._missionDeaths); if (deaths !== undefined) out.deaths = deaths;
            var floor = fin(g.floorIndex);
            if (floor === undefined) {
                try {
                    var ft = document.getElementById('hudFloorText');
                    var m = ft && ft.textContent ? ft.textContent.match(/(\d+)/) : null;
                    if (m) floor = fin(m[1]);
                } catch (_) { /* omit */ }
            }
            if (floor !== undefined) out.floor = Math.floor(floor);
            var prog;
            try {
                var cm = g.currentMission || null;
                if (cm && cm.completed) prog = 1;
                else if (floor !== undefined) prog = clamp01(Math.floor(floor) / FINAL_FLOOR * 0.99);
            } catch (_) { prog = undefined; }
            if (prog !== undefined && isFinite(prog)) out.progress = Math.round(prog * 1000) / 1000;
            try {
                var b = g.activeBoss || null;
                var bHp = b ? fin(b.hp) : undefined;
                var bMhp = b ? fin(b.maxHp) : undefined;
                if (b && bHp !== undefined && bMhp !== undefined && bMhp > 0 && bHp > 0) {
                    out.boss = capStr('boss', 32);
                    out.bossHp = bHp;
                    out.bossMaxhp = bMhp;
                    try { if (b.name) out.bossName = capStr(b.name, 32); } catch (_) { /* optional */ }
                } else {
                    out.boss = '';
                }
            } catch (_) { /* omit */ }
            out.winner = isLocalWinner(g);
            try {
                var sf = (floor !== undefined) ? Math.floor(floor) : 0;
                var sk = (kills !== undefined) ? kills : 0;
                out.score = encodeScore(sf, sk);
                var dead = false;
                try { dead = !!(p && p.isDead); } catch (_) { dead = false; }
                out.alive = !dead;
            } catch (_) { /* omit */ }
            var ri = raidInfo();
            if (ri.seed) out.seed = ri.seed;
        } catch (_) { /* never throw; return what we have */ }
        return out;
    }

    function isLocalWinner(g) {
        try {
            if (!g) return false;
            var m = g.currentMission || null;
            if (m && m.completed && Number(m.id) === FINAL_FLOOR) return true;
            var go = null;
            try { go = document.getElementById('gameOverScreen'); } catch (_) { go = null; }
            if (go && !go.classList.contains('hidden')) {
                try {
                    var t = document.getElementById('gameOverTitle');
                    if (t && /COMPLETED/i.test(t.textContent || '')) return true;
                } catch (_) { /* ignore */ }
            }
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
            var fl = fin(raw.floor); if (fl !== undefined) f.floor = Math.floor(fl);
            var pr = fin(raw.progress); if (pr !== undefined) f.progress = clamp01(pr);
            try { if (raw.name) f.name = capStr(raw.name, 24); } catch (_) { /* optional */ }
            try { if (raw.id !== undefined) f.id = capStr(raw.id, 24); } catch (_) { /* optional */ }
            try { if (raw.emote) f.emote = capStr(raw.emote, 32); } catch (_) { /* optional */ }
            f.winner = raw.winner === true;
            if (raw.alive !== undefined) f.alive = raw.alive !== false && raw.alive !== 0;
            try {
                var dec = decodeScore(raw.score);
                if (f.floor === undefined && dec.floor > 0) f.floor = dec.floor;
                if (f.kills === undefined && dec.kills > 0) f.kills = dec.kills;
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
                        return { f: Math.floor(fin(s && s.f) || 0), dt: Math.max(0, Math.floor(fin(s && s.dt) || 0)) };
                    }).filter(function (s) { return s.f > 0; });
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
            if (f && (f.x !== undefined || f.floor !== undefined || f.kills !== undefined ||
                f.gold !== undefined || f.winner || f.boss !== undefined || f.emote ||
                f.alive !== undefined || f.name)) return true;
            // Relay-minimal foe ({ score }: floor+kills headline) still counts.
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
                    var fl = fin(e.floor);
                    if (kl === 'floor' && fl !== undefined) txt = 'Layer ' + Math.floor(fl) + ' reached';
                    if ((kl === 'bonus' || kl === 'floor-first') && !by) by = 'RAID: ';
                    post('ev:' + kind + ':' + by + txt.slice(0, 40), (by + txt).slice(0, 120));
                }
            }
        } catch (_) { /* never throw */ }
    }

    function claimFirst(floor, who) {
        try {
            var f = Math.floor(Number(floor) || 0);
            if (!(f >= 1 && f <= FINAL_FLOOR)) return;
            if (S.first[f]) return;
            S.first[f] = who;
            var fname = FLOORS[f - 1] || ('F' + f);
            post('first:' + f, 'FLOOR-FIRST BONUS: ' + who + ' takes ' + fname + ' (+250g)');
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

    var BASE_CSS = 'background:rgba(10,4,20,0.84);border:1px solid #f59e0b;border-radius:8px;' +
        'color:#fef3c7;font-family:monospace,monospace;font-size:11px;line-height:1.5;' +
        'padding:6px 8px;pointer-events:none;white-space:pre;';
    var BTN_CSS = 'pointer-events:auto;cursor:pointer;background:rgba(120,53,15,0.92);color:#fff;' +
        'border:1px solid #fbbf24;border-radius:6px;font-family:monospace,monospace;' +
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
            // Raid scoreboard (top-right).
            var board = el('div', BASE_CSS + 'position:absolute;top:8px;right:8px;max-width:48vw;');
            var boardPre = el('div', '');
            board.appendChild(boardPre);
            // Spire tracker (top-left): 10 floors, M10 LUCIFER HADES.
            var tracker = el('div', BASE_CSS + 'position:absolute;top:8px;left:8px;max-width:44vw;');
            // Feed (bottom-left): floor-first bonuses + comeback feed.
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
            // Potion hint (bottom-center).
            var hint = el('div', BASE_CSS + 'position:absolute;left:50%;bottom:12px;transform:translate(-50%,0);' +
                'display:none;border-color:#f59e0b;color:#fde68a;');
            root.appendChild(markers);
            root.appendChild(tracker);
            root.appendChild(board);
            root.appendChild(feed);
            root.appendChild(banner);
            root.appendChild(hint);
            S.els = {
                root: root, markers: markers, tracker: tracker, board: board,
                boardPre: boardPre, feed: feed, banner: banner,
                bannerText: bannerText, rematch: rematch, hint: hint,
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
                'border-color:#c084fc;color:#f5d0fe;');
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
            S.myFloor = 0;
            S.bestFoeFloor = 0;
            S.first = {};
            S.splits = [];
            S.runStart = 0;
            S.deficitMax = 0;
            S.dps = {};
            S.banner = '';
            paint();
        } catch (_) { /* never throw */ }
    }

    // ------------------------- projection (read-only) ------------------------
    function projectPeer(fx, fy) {
        var r = { ok: false };
        try {
            var g = game();
            if (!g || !g.camera3d) return r;
            var THREE = null;
            try { THREE = window.THREE || null; } catch (_) { THREE = null; }
            if (!THREE || !THREE.Vector3) return r;
            var canvas = null;
            try { canvas = document.getElementById('gameCanvas'); } catch (_) { canvas = null; }
            var rect = null;
            try { rect = canvas ? canvas.getBoundingClientRect() : null; } catch (_) { rect = null; }
            var vw = 0, vh = 0, left = 0, top = 0;
            try {
                vw = window.innerWidth || 800; vh = window.innerHeight || 600;
            } catch (_) { vw = 800; vh = 600; }
            if (rect && rect.width > 0 && rect.height > 0) {
                left = rect.left; top = rect.top; vw = rect.width; vh = rect.height;
            }
            var v = new THREE.Vector3(fx, 18, fy).project(g.camera3d);
            var behind = v.z > 1;
            var sx = left + (v.x * 0.5 + 0.5) * vw;
            var sy = top + (-v.y * 0.5 + 0.5) * vh;
            r.ok = true;
            r.behind = behind;
            r.sx = sx; r.sy = sy;
            r.nx = v.x; r.ny = v.y;
            r.rect = { left: left, top: top, w: vw, h: vh };
        } catch (_) {
            r.ok = false;
        }
        return r;
    }

    // ------------------------------ dps track ------------------------------
    function trackDps(key, bossObj, now) {
        var rate = 0;
        try {
            if (!bossObj || typeof bossObj !== 'object') {
                try { delete S.dps[key]; } catch (_) { /* ignore */ }
                return 0;
            }
            var hp = Number(bossObj.hp);
            var maxhp = Number(bossObj.maxhp);
            if (!isFinite(hp) || !isFinite(maxhp) || maxhp <= 0) return 0;
            var prev = S.dps[key] || null;
            if (prev && isFinite(prev.hp) && isFinite(prev.t) && now > prev.t) {
                var dt = (now - prev.t) / 1000;
                if (dt > 0.2 && dt < 60) {
                    var drop = prev.hp - hp;
                    if (drop > 0) rate = drop / dt;
                    else if (prev.rate) rate = prev.rate * 0.9;
                } else if (prev.rate) {
                    rate = prev.rate;
                }
            }
            S.dps[key] = { hp: hp, t: now, rate: rate };
        } catch (_) { /* never throw */ }
        return rate;
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

            // ---- my floor + splits + floor-first claims ----
            try {
                var mf = me.floor !== undefined ? me.floor : 0;
                if (!S.runStart) {
                    try {
                        var g0 = game();
                        S.runStart = (g0 && fin(g0._missionStartTime)) || now;
                    } catch (_) { S.runStart = now; }
                }
                if (mf > 0 && S.myFloor > 0 && mf > S.myFloor) {
                    S.splits.push({ f: mf, dt: now - S.runStart });
                    if (S.splits.length > 10) S.splits = S.splits.slice(-10);
                }
                if (mf > 0) {
                    for (var cf = S.myFloor + 1; cf <= mf; cf++) claimFirst(cf, 'YOU');
                    S.myFloor = Math.max(S.myFloor, mf);
                }
            } catch (_) { /* ignore */ }

            // ---- peer floors: best, floor-first, comebacks ----
            var best = 0;
            try {
                for (var pi = 0; pi < peers.length; pi++) {
                    var pf = peers[pi].floor !== undefined ? peers[pi].floor : 0;
                    if (pf > 0) {
                        if (pf > best) best = pf;
                        // Claim every floor this peer has reached (snapshot-safe).
                        for (var q = 1; q <= pf; q++) {
                            if (!S.first[q]) claimFirst(q, labelOf(peers[pi], pi));
                        }
                    }
                    if (peers[pi].emote) {
                        post('pem:' + peerKey(peers[pi], pi) + ':' + String(peers[pi].emote).slice(0, 24),
                            labelOf(peers[pi], pi) + ': ' + String(peers[pi].emote).slice(0, 60));
                    }
                }
                S.bestFoeFloor = Math.max(S.bestFoeFloor, best);
                if (S.myFloor > 0 && S.bestFoeFloor > 0) {
                    var deficit = S.bestFoeFloor - S.myFloor;
                    if (deficit > S.deficitMax) S.deficitMax = deficit;
                    if (S.deficitMax >= 2 && deficit <= 0) {
                        post('comeback:' + S.myFloor, 'COMEBACK! You are back level at Layer ' + S.myFloor);
                        S.deficitMax = 0;
                    } else if (deficit >= 3) {
                        post('trail:' + S.bestFoeFloor + ':' + S.myFloor,
                            'Raid leader +' + deficit + ' layers ahead - push for split bonus');
                    }
                }
            } catch (_) { /* ignore */ }

            // ---- raid scoreboard: floor race + boss DPS + split times ----
            try {
                var lines = [];
                var title = 'SPIRE RAID (8P)';
                if (ri.server) title += ' [' + ri.server.slice(0, 16) + ']';
                if (ri.seed) title += ' [seed:' + ri.seed + ']';
                lines.push(title);
                var rows = [];
                var myDps = 0;
                try {
                    if (me.bossHp !== undefined && me.bossMaxhp) {
                        myDps = trackDps('me', { hp: me.bossHp, maxhp: me.bossMaxhp }, now);
                    } else {
                        try { delete S.dps.me; } catch (_) { /* ignore */ }
                    }
                } catch (_) { myDps = 0; }
                rows.push({
                    tag: 'YOU',
                    floor: me.floor !== undefined ? me.floor : 0,
                    kills: me.kills !== undefined ? me.kills : 0,
                    gold: me.gold !== undefined ? me.gold : 0,
                    hpPct: (me.hp !== undefined && me.maxhp) ? Math.round(me.hp / me.maxhp * 100) : -1,
                    dps: myDps,
                    boss: (typeof me.boss === 'string' && me.boss !== '') || me.boss === true
                });
                for (var rj = 0; rj < peers.length; rj++) {
                    var pp = peers[rj];
                    var pdps = 0;
                    try {
                        if (pp.boss && typeof pp.boss === 'object') {
                            pdps = trackDps(peerKey(pp, rj), pp.boss, now);
                        } else {
                            try { delete S.dps[peerKey(pp, rj)]; } catch (_) { /* ignore */ }
                        }
                    } catch (_) { pdps = 0; }
                    rows.push({
                        tag: labelOf(pp, rj),
                        floor: pp.floor !== undefined ? pp.floor : 0,
                        kills: pp.kills !== undefined ? pp.kills : 0,
                        gold: pp.gold !== undefined ? pp.gold : 0,
                        hpPct: (pp.hp !== undefined && pp.maxhp) ? Math.round(pp.hp / pp.maxhp * 100) : -1,
                        dps: pdps,
                        boss: !!(pp.boss === true || (pp.boss && typeof pp.boss === 'object'))
                    });
                }
                rows.sort(function (a, b) {
                    if (b.floor !== a.floor) return b.floor - a.floor;
                    return b.kills - a.kills;
                });
                for (var rk = 0; rk < rows.length; rk++) {
                    var r = rows[rk];
                    var ln = (rk + 1) + '. ' + r.tag + ' L' + r.floor + ' K' + r.kills + ' G' + r.gold;
                    if (r.hpPct >= 0) ln += ' HP' + r.hpPct + '%';
                    if (r.boss) ln += ' BOSS' + (r.dps > 0 ? ' ' + Math.round(r.dps) + '/s' : '');
                    lines.push(ln.slice(0, 64));
                }
                var sp = [];
                try {
                    S.splits.slice(-3).forEach(function (s) { sp.push('L' + s.f + ' ' + fmtSplit(s.dt)); });
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

            // ---- 10-floor Spire raid tracker ----
            try {
                var tl = ['SPIRE TRACKER'];
                for (var tf = 1; tf <= FINAL_FLOOR; tf++) {
                    var mark = '[ ]';
                    try {
                        if (S.myFloor >= tf) mark = '[X]';
                        else if (S.bestFoeFloor >= tf) mark = '[R]';
                    } catch (_) { mark = '[ ]'; }
                    var nm = FLOORS[tf - 1] || ('F' + tf);
                    var holder = '';
                    try { holder = S.first[tf] ? ' <' + String(S.first[tf]).slice(0, 12) : ''; } catch (_) { holder = ''; }
                    tl.push(mark + ' ' + nm + holder);
                }
                els.tracker.style.display = 'block';
                els.tracker.textContent = tl.join('\n');
            } catch (_) { /* ignore */ }

            // ---- rival apparition markers (3D projection else compass) ----
            try {
                var vw2 = 800, vh2 = 600;
                try { vw2 = window.innerWidth || 800; vh2 = window.innerHeight || 600; }
                catch (_) { vw2 = 800; vh2 = 600; }
                for (var mk = 0; mk < MAX_RAID; mk++) {
                    var mEl = markerEl(mk);
                    if (!mEl) continue;
                    var peer = peers[mk];
                    if (!peer || peer.x === undefined || peer.y === undefined ||
                        me.x === undefined || me.y === undefined) {
                        mEl.style.display = 'none';
                        continue;
                    }
                    var dist = Math.hypot(peer.x - me.x, peer.y - me.y);
                    var distT = Math.round(dist / 48) + 't';
                    var tag = labelOf(peer, mk);
                    var proj = projectPeer(peer.x, peer.y);
                    var placed = false;
                    if (proj.ok && !proj.behind) {
                        var mgn = 30;
                        if (proj.sx >= proj.rect.left + mgn && proj.sx <= proj.rect.left + proj.rect.w - mgn &&
                            proj.sy >= proj.rect.top + mgn && proj.sy <= proj.rect.top + proj.rect.h - mgn) {
                            mEl.style.display = 'block';
                            mEl.style.left = Math.round(proj.sx - 30) + 'px';
                            mEl.style.top = Math.round(proj.sy - 48) + 'px';
                            mEl.textContent = tag + ' ' + distT + ' L' +
                                (peer.floor !== undefined ? peer.floor : '-');
                            placed = true;
                        }
                    }
                    if (!placed && proj.ok) {
                        var dx = proj.nx, dy = proj.ny;
                        if (proj.behind) { dx = -dx; dy = -dy; }
                        if (dx === 0 && dy === 0) { dx = 1; dy = 0; }
                        var len = Math.hypot(dx, dy) || 1;
                        dx /= len; dy /= len;
                        var rad = Math.min(vw2, vh2) / 2 - 60;
                        if (!(rad > 40)) rad = 120;
                        var ex = Math.round(vw2 / 2 + dx * rad);
                        var ey = Math.round(vh2 / 2 - dy * rad);
                        mEl.style.display = 'block';
                        mEl.style.left = (ex - 40) + 'px';
                        mEl.style.top = (ey - 20) + 'px';
                        mEl.textContent = edgeArrow(dx, -dy) + ' ' + tag + ' ' + distT;
                        placed = true;
                    }
                    if (!placed) {
                        mEl.style.display = 'block';
                        mEl.style.left = '8px';
                        mEl.style.top = (40 + mk * 22) + 'px';
                        mEl.textContent = tag + ' L' + (peer.floor !== undefined ? peer.floor : '-') +
                            ' K' + (peer.kills !== undefined ? peer.kills : '-') + ' ' + distT;
                        placed = true;
                    }
                }
            } catch (_) { /* ignore */ }

            // ---- feed ----
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

            // ---- potion-low hint (display only, never press keys) ----
            try {
                var showHint = false;
                var hintTxt = '';
                if (me.hp !== undefined && me.maxhp && me.maxhp > 0) {
                    var frac = me.hp / me.maxhp;
                    if (frac < POTION_PCT) {
                        var pots = -1;
                        try {
                            var g1 = game();
                            if (g1 && g1.player && isFinite(Number(g1.player.potions))) pots = Number(g1.player.potions);
                        } catch (_) { pots = -1; }
                        var dead = false;
                        try { var g2 = game(); dead = !!(g2 && g2.player && g2.player.isDead); } catch (_) { dead = false; }
                        if (!dead) {
                            showHint = true;
                            hintTxt = pots > 0
                                ? 'LOW HP - press Q for potion (' + pots + ' left)'
                                : 'LOW HP - no potions! retreat';
                        }
                    }
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

            // ---- WIN/LOSE banner (first to clear M10) ----
            try {
                var myWin = !!me.winner;
                var foeWin = false;
                var foeName = '';
                for (var wi = 0; wi < peers.length; wi++) {
                    if (peers[wi].winner) { foeWin = true; foeName = labelOf(peers[wi], wi); break; }
                }
                var b = '';
                var bt = '';
                if (myWin && !foeWin) { b = 'WIN'; bt = 'YOU CLAIMED THE SPIRE (M10)'; }
                else if (foeWin && !myWin) { b = 'LOSE'; bt = foeName + ' CLAIMED THE SPIRE (M10)'; }
                else if (myWin && foeWin) { b = 'DRAW'; bt = 'SHARED SPIRE CLEAR - PHOTO FINISH'; }
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
                var a = 'L' + (me.floor !== undefined ? me.floor : '-') +
                    ' K' + (me.kills !== undefined ? me.kills : '-');
                var n = (S.peers || []).length;
                var lead = 'L' + S.bestFoeFloor;
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
            try { window.GraveGainMPAdapterMMORPG3D = Adapter; } catch (_) { /* ignore */ }
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
                FINAL_FLOOR: FINAL_FLOOR, MAX_RAID: MAX_RAID, FLOORS: FLOORS
            };
        }
    } catch (_) { /* never throw */ }
})();
