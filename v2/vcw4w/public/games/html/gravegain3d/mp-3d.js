/* =========================================================================
 * GraveGain3D - Spire Siege multiplayer overlay (window.GraveGainMPAdapter)
 * -------------------------------------------------------------------------
 * Adapter-only siege mode for same-seed parties. Vanilla JS, never throws,
 * ASCII-only, solo-safe (stays hidden without ?match=/party/room/seed/mp
 * or live foe data). Pointer-lock safe: the overlay root is
 * pointer-events:none; only buttons opt back into pointer-events:auto, and
 * the adapter never presses keys, clicks, or touches the bot cursor
 * (window.GraveGainBotInput / window.GraveGainBotCursor are read-only here).
 *
 * Contract:
 *   mode   : 'siege'
 *   emotes : ['GG','POTION','BOSS!']
  *   read() : {x,y,hp,maxhp,gold,kills,deaths,floor,progress,boss,winner,seed}
  *            from real globals (window.GraveGainGame + player.*). Unknown
  *            fields are omitted. Numbers finite, strings <= 32 chars.
  *            boss rides the relay as a capped string ('boss' when a boss is
  *            engaged, '' when not) because the netplay core STATE_ALLOW +
  *            PUT allowlist persist boss as a string (same convention as
  *            mp-1d/mp-2d); a bare boolean would be dropped by the allowlist.
  *            Relay headline: the netplay core persists only {x,y,score,alive}
 *            per side, so the siege headline (floor primary, kills secondary)
 *            is packed into score = floor*10000 + min(kills,9999); decodeScore
  *            unpacks it for the rival panel. bossHp/bossMaxhp/bossName ride
  *            along as extra keys for direct consumers only (the relay
  *            allowlist drops them); the relay-safe boss presence string is
  *            what survives the server round-trip. alive mirrors !player.isDead.
 *   render(foe, events): rival apparition marker (3D projection when
 *            possible, else screen-edge compass + distance, else text panel),
 *            siege scoreboard (floor race + boss DPS race + split times),
 *            floor-first / comeback feed, potion-low hint (display only),
 *            WIN/LOSE banner with rematch (same seed preserved).
 * ========================================================================= */
(function () {
    'use strict';

    var MODE = 'siege';
    var EMOTES = ['GG', 'POTION', 'BOSS!'];
    var FINAL_FLOOR = 10; // 10-mission campaign; M10 LUCIFER HADES is the siege target.
    var HP_POTION_PCT = 0.45; // auto-suggest Q below this (hint only, never press).
    var MAX_FEED = 6;
    var ROOT_ID = 'ggmp-siege-root';
    var TICK_MS = 500;
    // Relay score codec: floor primary, kills secondary (core persists only
    // {x,y,score,alive}, so anything wider would be dropped server-side).
    var SCORE_F = 10000;
    var SCORE_KILLS_CAP = 9999;

    // ------------------------- pure helpers (node-testable) ----------------
    function fin(v) {
        var n = Number(v);
        return isFinite(n) ? n : undefined;
    }

    function shortStr(v) {
        try {
            return String(v).slice(0, 32);
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

    // Parse ?match=/party/room/seed/mp params. Returns { room, seed } ('' if absent).
    function parseMatch(href) {
        var out = { room: '', seed: '' };
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
                if ((k === 'match' || k === 'party' || k === 'room' || k === 'mp') && !out.room) out.room = val.slice(0, 32);
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
            if (!isFinite(s) || s > 1000000) s = 1000000; // core clamps to +-1e6
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
            var a = Math.atan2(-dy, dx) * 180 / Math.PI; // y-up degrees, 0 = east
            if (a < 0) a += 360;
            var oct = Math.round(a / 45) % 8;
            // 0:E 1:NE 2:N 3:NW 4:W 5:SW 6:S 7:SE
            return ['>', '/', '^', '\\', '<', '/', 'v', '\\'][oct];
        } catch (_) {
            return '>';
        }
    }

    // ms duration -> "m:ss".
    function fmtSplit(ms) {
        try {
            var ms = Number(ms);
            if (!isFinite(ms)) ms = 0;
            var s = Math.max(0, Math.floor(ms / 1000));
            var m = Math.floor(s / 60);
            var r = s % 60;
            return m + ':' + (r < 10 ? '0' + r : '' + r);
        } catch (_) {
            return '0:00';
        }
    }

    // ASCII bar for boss HP, e.g. "[####------] 62%".
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

    // ------------------------------ state ----------------------------------
    var S = {
        active: false,
        foe: null,
        feed: [],        // { key, text, t }
        feedKeys: {},    // dedupe ring
        myFloor: 0,
        foeFloor: 0,
        splits: [],      // { f, dt }
        runStart: 0,
        deficitMax: 0,   // worst (foeFloor - myFloor) seen, for comebacks
        banner: '',      // '', 'WIN', 'LOSE', 'DRAW'
        foeEmote: '',
        foeEmoteT: 0,
        lastPaint: 0,
        els: null
    };

    function game() {
        try { return window.GraveGainGame || null; } catch (_) { return null; }
    }

    function matchInfo() {
        try {
            return parseMatch(typeof window !== 'undefined' && window.location ? window.location.href : '');
        } catch (_) {
            return { room: '', seed: '' };
        }
    }

    function activate() {
        if (S.active) return;
        S.active = true;
        try {
            if (S.els && S.els.root) S.els.root.style.display = 'block';
        } catch (_) { /* never throw */ }
    }

    // ------------------------------ read() ---------------------------------
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
            // progress: mission cleared -> 1, else floor race vs FINAL_FLOOR.
            var prog;
            try {
                var cm = g.currentMission || null;
                if (cm && cm.completed) prog = 1;
                else if (floor !== undefined) prog = clamp01(Math.floor(floor) / FINAL_FLOOR * 0.99);
            } catch (_) { prog = undefined; }
            if (prog !== undefined && isFinite(prog)) out.progress = Math.round(prog * 1000) / 1000;
            // boss: presence string is relay-safe (core STATE_ALLOW + PUT
            // allowlist persist boss as a capped string); exact HP rides
            // along as extra keys for direct consumers.
            try {
                var b = g.activeBoss || null;
                var bHp = b ? fin(b.hp) : undefined;
                var bMhp = b ? fin(b.maxHp) : undefined;
                if (b && bHp !== undefined && bMhp !== undefined && bMhp > 0 && bHp > 0) {
                    out.boss = 'boss';
                    out.bossHp = bHp;
                    out.bossMaxhp = bMhp;
                    try { if (b.name) out.bossName = shortStr(b.name); } catch (_) { /* optional */ }
                } else {
                    out.boss = '';
                }
            } catch (_) { /* omit */ }
            out.winner = isLocalWinner(g);
            // Relay headline (core persists {x,y,score,alive}): floor race.
            try {
                var sf = (floor !== undefined) ? Math.floor(floor) : 0;
                var sk = (kills !== undefined) ? kills : 0;
                out.score = encodeScore(sf, sk);
                var dead = false;
                try { dead = !!(p && p.isDead); } catch (_) { dead = false; }
                out.alive = !dead;
            } catch (_) { /* omit */ }
            var mi = matchInfo();
            if (mi.seed) out.seed = mi.seed;
        } catch (_) { /* never throw; return what we have */ }
        return out;
    }

    function isLocalWinner(g) {
        try {
            if (!g) return false;
            var m = g.currentMission || null;
            if (m && m.completed && Number(m.id) === FINAL_FLOOR) return true;
            // Victory screen up with a completed run = cleared the spire.
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

    // --------------------------- foe normalize ------------------------------
    function normFoe(foe) {
        var f = { winner: false };
        try {
            if (!foe || typeof foe !== 'object') return f;
            var x = fin(foe.x); if (x !== undefined) f.x = x;
            var y = fin(foe.y); if (y !== undefined) f.y = y;
            var hp = fin(foe.hp); if (hp !== undefined) f.hp = hp;
            var mhp = fin(foe.maxhp !== undefined ? foe.maxhp : foe.maxHp);
            if (mhp !== undefined) f.maxhp = mhp;
            var gold = fin(foe.gold); if (gold !== undefined) f.gold = gold;
            var kills = fin(foe.kills); if (kills !== undefined) f.kills = kills;
            var fl = fin(foe.floor); if (fl !== undefined) f.floor = Math.floor(fl);
            var pr = fin(foe.progress); if (pr !== undefined) f.progress = clamp01(pr);
            try { if (foe.name) f.name = shortStr(foe.name); } catch (_) { /* optional */ }
            try { if (foe.emote) f.emote = shortStr(foe.emote); } catch (_) { /* optional */ }
            f.winner = foe.winner === true;
            if (foe.alive !== undefined) f.alive = foe.alive !== false && foe.alive !== 0;
            // Relayed foe usually carries only {x,y,score,alive}: decode the
            // siege headline (floor + kills) when explicit keys are absent.
            try {
                var dec = decodeScore(foe.score);
                if (f.floor === undefined && dec.floor > 0) f.floor = dec.floor;
                if (f.kills === undefined && dec.kills > 0) f.kills = dec.kills;
            } catch (_) { /* omit */ }
            // boss may be the relay presence string ('boss'/''), boolean
            // 1/0 (legacy snapshots), or a detail object.
            try {
                var b = foe.boss;
                if (b && typeof b === 'object') {
                    var bh = fin(b.hp); var bm = fin(b.maxhp !== undefined ? b.maxhp : b.maxHp);
                    if (bh !== undefined && bm !== undefined && bm > 0) {
                        f.boss = { hp: bh, maxhp: bm };
                        try { if (b.name) f.boss.name = shortStr(b.name); } catch (_) { /* optional */ }
                    } else { f.boss = true; }
                } else if (b === true || b === 1 || (typeof b === 'string' && b !== '')) { f.boss = true; }
                else if (b === false || b === 0) { f.boss = false; }
                var fbh = fin(foe.bossHp); var fbm = fin(foe.bossMaxhp);
                if (fbh !== undefined && fbm !== undefined && fbm > 0) {
                    f.boss = { hp: fbh, maxhp: fbm };
                    try { if (foe.bossName) f.boss.name = shortStr(foe.bossName); } catch (_) { /* optional */ }
                }
            } catch (_) { /* omit */ }
            try {
                if (Array.isArray(foe.splits)) {
                    f.splits = foe.splits.slice(0, 10).map(function (s) {
                        return { f: Math.floor(fin(s && s.f) || 0), dt: Math.max(0, Math.floor(fin(s && s.dt) || 0)) };
                    }).filter(function (s) { return s.f > 0; });
                }
            } catch (_) { /* omit */ }
        } catch (_) { /* never throw */ }
        return f;
    }

    function foeHasData(f) {
        try {
            return !!(f && (f.x !== undefined || f.floor !== undefined || f.kills !== undefined ||
                f.gold !== undefined || f.winner || f.boss !== undefined || f.emote ||
                f.alive !== undefined));
        } catch (_) { return false; }
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
                    try { by = e.by ? shortStr(e.by) + ': ' : ''; } catch (_) { by = ''; }
                    var txt = '';
                    try { txt = String(e.text || e.msg || e.emote || kind); } catch (_) { txt = kind; }
                    var kl = kind.toLowerCase();
                    if (kl === 'emote' && !by) by = 'RIVAL: ';
                    else if ((kl === 'chat' || kl === 'join' || kl === 'leave') && !by) by = '';
                    var fl = fin(e.floor);
                    if (kl === 'floor' && fl !== undefined) txt = 'Layer ' + Math.floor(fl) + ' reached';
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

    var BASE_CSS = 'background:rgba(8,6,18,0.82);border:1px solid #a855f7;border-radius:8px;' +
        'color:#e9d5ff;font-family:monospace,monospace;font-size:11px;line-height:1.5;' +
        'padding:6px 8px;pointer-events:none;white-space:pre;';
    var BTN_CSS = 'pointer-events:auto;cursor:pointer;background:rgba(88,28,135,0.9);color:#fff;' +
        'border:1px solid #c084fc;border-radius:6px;font-family:monospace,monospace;' +
        'font-size:11px;padding:3px 8px;margin:2px 2px 0 0;';

    function ensureOverlay() {
        try {
            if (S.els || typeof document === 'undefined') return S.els;
            var root = document.getElementById(ROOT_ID);
            if (!root) {
                root = el('div',
                    'position:fixed;inset:0;z-index:10000;pointer-events:none;display:none;overflow:hidden;');
                root.id = ROOT_ID;
                root.setAttribute('aria-hidden', 'true');
                document.body.appendChild(root);
            }
            // Rival apparition marker (repositioned every paint).
            var marker = el('div', BASE_CSS + 'position:absolute;display:none;text-align:center;');
            // Scoreboard (top-right).
            var board = el('div', BASE_CSS + 'position:absolute;top:8px;right:8px;max-width:46vw;');
            var boardPre = el('div', '');
            board.appendChild(boardPre);
            var emoteRow = el('div', 'pointer-events:none;');
            var emoteBtns = [];
            EMOTES.forEach(function (em) {
                var b = el('button', BTN_CSS, em);
                try {
                    b.setAttribute('type', 'button');
                    b.setAttribute('data-emote', em);
                    b.addEventListener('click', function (ev) {
                        try {
                            if (ev && ev.stopPropagation) ev.stopPropagation();
                            sendEmote(em);
                        } catch (_) { /* never throw */ }
                    });
                    b.addEventListener('mousedown', function (ev) {
                        try { if (ev && ev.stopPropagation) ev.stopPropagation(); } catch (_) { /* ignore */ }
                    });
                } catch (_) { /* never throw */ }
                emoteRow.appendChild(b);
                emoteBtns.push(b);
            });
            board.appendChild(emoteRow);
            // Feed (bottom-left).
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
            root.appendChild(marker);
            root.appendChild(board);
            root.appendChild(feed);
            root.appendChild(banner);
            root.appendChild(hint);
            S.els = {
                root: root, marker: marker, board: board, boardPre: boardPre,
                feed: feed, banner: banner, bannerText: bannerText, rematch: rematch, hint: hint
            };
            if (S.active) root.style.display = 'block';
            return S.els;
        } catch (_) {
            return null;
        }
    }

    function sendEmote(em) {
        try {
            post('me:' + em + ':' + Math.floor(Date.now() / 5000), 'YOU: ' + em);
            var sent = false;
            // Relay through the netplay core when it is live; otherwise
            // queue in the local outbox for any external driver.
            try {
                var mp = null;
                try { mp = window.GraveGainMP || null; } catch (_) { mp = null; }
                if (mp && typeof mp.sendEmote === 'function') { mp.sendEmote(em); sent = true; }
            } catch (_) { /* display-only fallback stands */ }
            if (!sent) {
                try {
                    if (Adapter.outbox && Adapter.outbox.push) Adapter.outbox.push({ k: 'emote', emote: em, t: Date.now() });
                } catch (_) { /* ignore */ }
            }
            paint();
        } catch (_) { /* never throw */ }
    }

    function doRematch() {
        try {
            // Prefer core matchmaking (new opponent + same seed preserved by
            // the core); fall back to a same-seed reload when solo/dormant.
            try {
                var mp = null;
                try { mp = window.GraveGainMP || null; } catch (_) { mp = null; }
                if (mp && typeof mp.rematch === 'function' && mp.mode === 'multi') {
                    mp.rematch();
                    return;
                }
            } catch (_) { /* fall through */ }
            try { resetState(); } catch (_) { /* ignore */ }
            var href = '';
            try { href = String(window.location.href); } catch (_) { href = ''; }
            var mi = parseMatch(href);
            // Same-seed parties: preserve room + seed across the reload.
            if (mi.room || mi.seed) {
                try {
                    var base = href.split('?')[0].split('#')[0];
                    var qs = [];
                    if (mi.room) qs.push('match=' + encodeURIComponent(mi.room));
                    if (mi.seed) qs.push('seed=' + encodeURIComponent(mi.seed));
                    window.location.href = base + '?' + qs.join('&');
                    return;
                } catch (_) { /* fall through to plain reload */ }
            }
            try { window.location.reload(); } catch (_) { /* ignore */ }
        } catch (_) { /* never throw */ }
    }

    function resetState() {
        try {
            S.foe = null;
            S.feed = [];
            S.feedKeys = {};
            S.myFloor = 0;
            S.foeFloor = 0;
            S.splits = [];
            S.runStart = 0;
            S.deficitMax = 0;
            S.banner = '';
            S.foeEmote = '';
            try {
                if (Adapter.outbox && Adapter.outbox.length) Adapter.outbox.length = 0;
            } catch (_) { /* ignore */ }
            paint();
        } catch (_) { /* never throw */ }
    }

    // ------------------------- projection (read-only) ------------------------
    // Best-effort: project foe world coords through the live camera without
    // touching the scene (same math as GraveGainBotInput.projectEnemy, which
    // only targets real enemies so it cannot serve a rival apparition).
    function projectFoe(fx, fy) {
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
            var foe = S.foe || {};
            var mi = matchInfo();

            // ---- track my floor + splits ----
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
                if (mf > 0) S.myFloor = Math.max(S.myFloor, mf);
            } catch (_) { /* ignore */ }

            // ---- track foe floor: floor-first + comeback feed ----
            try {
                var ff = foe.floor !== undefined ? foe.floor : 0;
                if (ff > 0) {
                    if (S.foeFloor > 0 && ff > S.foeFloor) {
                        if (ff > S.myFloor) post('ff:' + ff, 'RIVAL takes Layer ' + ff + ' first');
                        else if (ff === S.myFloor) post('tie:' + ff, 'Dead heat on Layer ' + ff);
                    }
                    S.foeFloor = Math.max(S.foeFloor, ff);
                    if (S.myFloor > 0) {
                        var deficit = S.foeFloor - S.myFloor;
                        if (deficit > S.deficitMax) S.deficitMax = deficit;
                        if (S.deficitMax >= 2 && deficit <= 0) {
                            post('cb:' + S.myFloor, 'COMEBACK! You are back level on Layer ' + S.myFloor);
                            S.deficitMax = 0;
                        }
                    }
                }
                if (foe.emote && foe.emote !== S.foeEmote) {
                    S.foeEmote = foe.emote;
                    S.foeEmoteT = now;
                    post('fe:' + foe.emote + ':' + Math.floor(now / 5000), 'RIVAL: ' + foe.emote);
                }
            } catch (_) { /* ignore */ }

            // ---- scoreboard ----
            try {
                var lines = [];
                var title = 'SPIRE SIEGE';
                if (mi.seed) title += ' [seed:' + mi.seed + ']';
                else if (mi.room) title += ' [room:' + mi.room + ']';
                lines.push(title);
                var myHpPct = (me.hp !== undefined && me.maxhp) ? Math.round(me.hp / me.maxhp * 100) : -1;
                var foeHpPct = (foe.hp !== undefined && foe.maxhp) ? Math.round(foe.hp / foe.maxhp * 100) : -1;
                lines.push('YOU   L' + (me.floor !== undefined ? me.floor : '-') +
                    ' K' + (me.kills !== undefined ? me.kills : '-') +
                    ' G' + (me.gold !== undefined ? me.gold : '-') +
                    (myHpPct >= 0 ? ' HP ' + myHpPct + '%' : ''));
                lines.push('RIVAL L' + (foe.floor !== undefined ? foe.floor : '-') +
                    ' K' + (foe.kills !== undefined ? foe.kills : '-') +
                    ' G' + (foe.gold !== undefined ? foe.gold : '-') +
                    (foeHpPct >= 0 ? ' HP ' + foeHpPct + '%' : ''));
                // Split times (mine; foe splits when the core forwards them).
                var sp = [];
                try {
                    S.splits.slice(-4).forEach(function (s) { sp.push('L' + s.f + ' ' + fmtSplit(s.dt)); });
                } catch (_) { /* ignore */ }
                if (sp.length) lines.push('SPLITS ' + sp.join(' | '));
                if (foe.splits && foe.splits.length) {
                    var fsp = [];
                    try {
                        foe.splits.slice(-4).forEach(function (s) { fsp.push('L' + s.f + ' ' + fmtSplit(s.dt)); });
                    } catch (_) { /* ignore */ }
                    if (fsp.length) lines.push('R-SPLIT ' + fsp.join(' | '));
                }
                // Boss-room VS mode (foe detail arrives only from direct
                // consumers; over the relay foe.boss is presence-only).
                var myBoss = null;
                try {
                    if (me.bossHp !== undefined && me.bossMaxhp) {
                        myBoss = { hp: me.bossHp, maxhp: me.bossMaxhp };
                    }
                } catch (_) { myBoss = null; }
                var foeBoss = foe.boss && typeof foe.boss === 'object' ? foe.boss : null;
                // me.boss is the relay presence string ('boss'/''), foe.boss
                // is already normalised to boolean/object by normFoe.
                var meBossOn = (typeof me.boss === 'string' && me.boss !== '') || me.boss === true;
                if (myBoss || foeBoss || foe.boss === true || meBossOn) {
                    lines.push('BOSS VS');
                    if (myBoss) lines.push('  YOU   ' + hpBar(myBoss.hp / myBoss.maxhp));
                    if (foeBoss) lines.push('  RIVAL ' + hpBar(foeBoss.hp / foeBoss.maxhp));
                    else if (foe.boss === true) lines.push('  RIVAL [in boss room]');
                    else if (!myBoss) lines.push('  YOU [no boss yet]');
                    else lines.push('  RIVAL [no boss yet]');
                }
                els.boardPre.textContent = lines.join('\n');
            } catch (_) { /* ignore */ }

            // ---- rival apparition marker ----
            try {
                var shown = false;
                if (foe.x !== undefined && foe.y !== undefined && me.x !== undefined && me.y !== undefined) {
                    var dist = Math.hypot(foe.x - me.x, foe.y - me.y);
                    var distT = Math.round(dist / 48) + 't';
                    var proj = projectFoe(foe.x, foe.y);
                    var label = 'RIVAL ' + distT + ((now - S.foeEmoteT < 3000 && S.foeEmote) ? ' ' + S.foeEmote : '');
                    if (proj.ok && !proj.behind) {
                        var m = 30;
                        if (proj.sx >= proj.rect.left + m && proj.sx <= proj.rect.left + proj.rect.w - m &&
                            proj.sy >= proj.rect.top + m && proj.sy <= proj.rect.top + proj.rect.h - m) {
                            // On-screen apparition.
                            els.marker.style.display = 'block';
                            els.marker.style.left = Math.round(proj.sx - 30) + 'px';
                            els.marker.style.top = Math.round(proj.sy - 44) + 'px';
                            els.marker.textContent = 'R ' + label;
                            shown = true;
                        }
                    }
                    if (!shown && proj.ok) {
                        // Screen-edge compass arrow toward the foe.
                        var dx = proj.nx, dy = proj.ny;
                        if (proj.behind) { dx = -dx; dy = -dy; }
                        if (dx === 0 && dy === 0) { dx = 1; dy = 0; }
                        var len = Math.hypot(dx, dy) || 1;
                        dx /= len; dy /= len;
                        var vw2 = 0, vh2 = 0;
                        try { vw2 = window.innerWidth || 800; vh2 = window.innerHeight || 600; }
                        catch (_) { vw2 = 800; vh2 = 600; }
                        var rad = Math.min(vw2, vh2) / 2 - 60;
                        if (!(rad > 40)) rad = 120;
                        var ex = Math.round(vw2 / 2 + dx * rad);
                        var ey = Math.round(vh2 / 2 - dy * rad);
                        els.marker.style.display = 'block';
                        els.marker.style.left = (ex - 40) + 'px';
                        els.marker.style.top = (ey - 20) + 'px';
                        els.marker.textContent = edgeArrow(dx, -dy) + ' ' + label;
                        shown = true;
                    }
                    if (!shown) {
                        // No camera/THREE: edge portrait fallback with vitals.
                        els.marker.style.display = 'block';
                        els.marker.style.left = '8px';
                        els.marker.style.top = '8px';
                        els.marker.textContent = 'RIVAL L' + (foe.floor !== undefined ? foe.floor : '-') +
                            ' K' + (foe.kills !== undefined ? foe.kills : '-') +
                            ' G' + (foe.gold !== undefined ? foe.gold : '-') + ' ' + distT;
                        shown = true;
                    }
                }
                if (!shown) els.marker.style.display = 'none';
            } catch (_) {
                try { els.marker.style.display = 'none'; } catch (_) { /* ignore */ }
            }

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

            // ---- potion-low ping (hint only, never press keys) ----
            try {
                var showHint = false;
                var hintTxt = '';
                if (me.hp !== undefined && me.maxhp && me.maxhp > 0) {
                    var frac = me.hp / me.maxhp;
                    if (frac < HP_POTION_PCT) {
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

            // ---- WIN/LOSE banner ----
            try {
                var myWin = !!me.winner;
                var foeWin = !!foe.winner;
                var b = '';
                var bt = '';
                if (myWin && !foeWin) { b = 'WIN'; bt = 'YOU CLAIMED THE SPIRE'; }
                else if (foeWin && !myWin) { b = 'LOSE'; bt = 'RIVAL CLAIMED THE SPIRE'; }
                else if (myWin && foeWin) { b = 'DRAW'; bt = 'BOTH CLEARED - PHOTO FINISH'; }
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
    function render(foe, events) {
        try {
            var f = normFoe(foe);
            if (foeHasData(f)) {
                S.foe = f;
                activate();
            } else if (foe !== undefined && foe !== null) {
                // Called with empty foe: still count as match traffic, merge nothing.
                if (S.foe) S.foe = S.foe;
            }
            handleEvents(events);
            // Solo-safe: only latch on with explicit match params or foe data.
            if (!S.active) {
                try {
                    var mi = matchInfo();
                    if (mi.room || mi.seed) activate();
                } catch (_) { /* stay hidden */ }
            }
            ensureOverlay();
            paint();
        } catch (_) { /* never throw */ }
    }

    // ------------------------------- adapter ---------------------------------
    var Adapter = {
        mode: MODE,
        emotes: EMOTES.slice(),
        outbox: [],
        read: function () {
            try { return readSnapshot(); }
            catch (_) { return {}; }
        },
        render: function (foe, events) {
            try { render(foe, events); }
            catch (_) { /* never throw */ }
        },
        // Optional core hook: one-line scoreboard for the netplay chrome.
        summary: function () {
            try {
                var me = readSnapshot();
                var foe = S.foe || {};
                var a = 'L' + (me.floor !== undefined ? me.floor : '-') +
                    ' K' + (me.kills !== undefined ? me.kills : '-');
                var b = 'L' + (foe.floor !== undefined ? foe.floor : '-') +
                    ' K' + (foe.kills !== undefined ? foe.kills : '-');
                return 'YOU ' + a + ' vs RIVAL ' + b;
            } catch (_) {
                return 'YOU vs RIVAL';
            }
        },
        reset: function () {
            try { resetState(); }
            catch (_) { /* never throw */ }
        }
    };

    // Auto-boot: build nothing visible until match traffic arrives (solo-safe).
    // A light interval keeps splits/feed/marker live even if the netplay core
    // calls render() infrequently. Cheap and fully guarded.
    try {
        if (typeof window !== 'undefined') {
            try { window.GraveGainMPAdapter = Adapter; } catch (_) { /* ignore */ }
            try {
                var mi0 = matchInfo();
                if (mi0.room || mi0.seed) { ensureOverlay(); activate(); }
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
            module.exports = { fin: fin, shortStr: shortStr, clamp01: clamp01, parseMatch: parseMatch, edgeArrow: edgeArrow, fmtSplit: fmtSplit, hpBar: hpBar, normFoe: normFoe, encodeScore: encodeScore, decodeScore: decodeScore, FINAL_FLOOR: FINAL_FLOOR };
        }
    } catch (_) { /* never throw */ }
})();
