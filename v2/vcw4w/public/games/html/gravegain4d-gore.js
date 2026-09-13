/* =========================================================================
 * GraveGain4D — v2 content-mode gore overlay (slug: gravegain4d ONLY)
 * -------------------------------------------------------------------------
 * v2-native file. Lives OUTSIDE the parity-locked bundle trees (never edit
 * those). Injected into the *generated* bundle (public/games/gravegain4d/)
 * by scripts/sync-game-bundles.mjs — same pattern as gore-gravegain3d.js,
 * gore-gravegain2d.js, and gore-lastwordszombies.js. Until that injection
 * block lands, load this file with a plain <script> tag (see wiring note
 * at the bottom of this header).
 *
 * Screen-space 2D overlay canvas synced to the kill counter. Never touches
 * the engine, THREE scene, camera, or input — pointer-events:none and zero
 * listeners on click/key/pointer-lock. Safe no-op when THREE/game absent.
 *
 * Mode contract (mirrors gore-gravegain3d.js exactly):
 *   ?content=<kid|teen|all>  >  localStorage "FourweirdContentMode"
 *   >  window.FourweirdContentMode = { mode }  >  "fourweird-content-mode"
 *   CustomEvent (detail = { mode } or plain string). Default: "teen".
 * Kill events are also forwarded to window.FourweirdGore.spawn when present.
 * Exposes window.GraveGain4DGore { getMode, setMode, spawnKill, VERSION }.
 *
 * Kill sources:
 *   - engine kill counter (window.GraveGain4DGame || GraveGainGame || gg)
 *   - golf-strike kills: hole-outs on hazard foes. The golf core
 *     (window.GraveGain4DGolf) emits 'hole-out' / 'hole-complete' events per
 *     round; this overlay wraps newRound (guarded, idempotent) so every new
 *     round gets a listener that routes hole-outs here as kill events.
 *     Rounds created before this file loads can be attached explicitly via
 *     GraveGain4DGore.attachRound(round).
 *
 * ZERO new art: reuses GraveGainGraphics3D / GraveGain3DModels by reference
 * (enemy anchor heights, projector when present). Defines no new enemy
 * geometry — this file is particles + DOM canvas only.
 *
 * WIRING NOTE (for the infra/bundle agent — out of this file's scope):
 *   scripts/sync-game-bundles.mjs needs a gravegain4d block mirroring the
 *   gravegain3d one:
 *     if (slug === "gravegain4d") {
 *       const goreSrc = join(root, "public", "games", "html", "gravegain4d-gore.js");
 *       if (existsSync(goreSrc) && !html.includes("gravegain4d-gore.js")) {
 *         const tag = `<script src="/games/html/gravegain4d-gore.js"></script>`;
 *         if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${tag}</body>`);
 *         else html += tag;
 *       }
 *     }
 * ========================================================================= */
(function () {
    'use strict';
    if (window.GraveGain4DGore) return;

    var VERSION = '1.0.0';
    var MODES = ['kid', 'teen', 'all'];
    var SLUG = 'gravegain4d';
    var LS_KEY = 'FourweirdContentMode'; // legacy flat key (plain or {mode} JSON)
    var LS_SLUG_KEY = '4weird-content-mode:' + SLUG; // sibling bridge per-slug key
    var EVENT_NAME = 'fourweird-content-mode';
    var GORE_EVENT = 'fourweird-gore';

    var KID_PRAISE = ['NICE!', 'POOF!', '+100 BRAVE!', 'SPARKLE DOWN!', 'GENTLE TAP!', 'NAP TIME!'];
    var BLOOD_MAIN = ['#c1121f', '#a30f1b', '#e5383b'];
    var BLOOD_DARK = ['#7a0c10', '#5c090d', '#a30f1b'];
    var SPARK_COLORS = ['#ffd54a', '#ffe9a3', '#ffb703', '#fff3c4'];
    var MAX_SPLATS = 60; // decal cap: oldest floor splats are dropped first

    function normMode(v) {
        if (v === undefined || v === null) return null;
        var s = String(v).toLowerCase().trim();
        if (s.charAt(0) === '{') {
            try {
                var o = JSON.parse(s);
                if (o && o.mode) return normMode(o.mode);
            } catch (_) { return null; }
        }
        return MODES.indexOf(s) !== -1 ? s : null;
    }

    function readMode() {
        try {
            var q = new URLSearchParams(window.location.search).get('content');
            var m = normMode(q);
            if (m) return m;
        } catch (_) {}
        try {
            if (window.localStorage) {
                var m2 = normMode(window.localStorage.getItem(LS_SLUG_KEY)) ||
                    normMode(window.localStorage.getItem(LS_KEY));
                if (m2) return m2;
            }
        } catch (_) {}
        try {
            if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                var m3 = normMode(window.FourweirdContentMode.mode);
                if (m3) return m3;
            }
        } catch (_) {}
        return 'teen';
    }

    var state = {
        mode: readMode(),
        canvas: null,
        ctx: null,
        host: null,
        parts: [],
        splats: [],
        texts: [],
        flash: 0,
        flashColor: '178,20,30',
        lastKills: null,
        lastHp: null,
        lastEnemyScreen: null,
        raf: 0
    };

    // -- 3D art refs (reuse by reference only — never define geometry) --------
    function gfx3d() {
        try { return window.GraveGainGraphics3D || null; } catch (_) { return null; }
    }

    function models3d() {
        try { return window.GraveGain3DModels || null; } catch (_) { return null; }
    }

    // Enemy anchor height: prefer the shared model table when it exposes a
    // height helper, otherwise the GG3D overlay fallback (18 world units).
    function enemyAnchorY(e) {
        try {
            var m = models3d();
            if (m && typeof m.enemyHeight === 'function') {
                var h = m.enemyHeight(e && e.kind);
                if (typeof h === 'number' && isFinite(h)) return h;
            }
            if (m && typeof m.heightFor === 'function') {
                var h2 = m.heightFor(e && e.kind);
                if (typeof h2 === 'number' && isFinite(h2)) return h2;
            }
        } catch (_) {}
        return 18;
    }

    // -- engine accessors (read-only, fully guarded) -------------------------
    function game() {
        try {
            return window.GraveGain4DGame || window.GraveGainGame || window.gg || null;
        } catch (_) { return null; }
    }

    function golf() {
        try { return window.GraveGain4DGolf || null; } catch (_) { return null; }
    }

    // Mirror of ui/bot-cursor.js BotInput.projectEnemy math (viewport 0-1000),
    // re-implemented locally so gore never depends on the bot harness.
    // Prefers the live BotInput projector, then the shared 3D graphics layer
    // when it exposes one, then local THREE projection.
    function projectKillScreen() {
        try {
            if (window.GraveGainBotInput &&
                typeof window.GraveGainBotInput.projectEnemy === 'function') {
                var hit = window.GraveGainBotInput.projectEnemy();
                if (hit && typeof hit.x === 'number') return { x: hit.x, y: hit.y };
            }
        } catch (_) {}
        try {
            var g3 = gfx3d();
            if (g3 && typeof g3.projectEnemy === 'function') {
                var hit3 = g3.projectEnemy();
                if (hit3 && typeof hit3.x === 'number') return { x: hit3.x, y: hit3.y };
            }
        } catch (_) {}
        try {
            var g = game();
            if (!g || !g.camera3d || !window.THREE) return null;
            var canvas = document.getElementById('gameCanvas');
            var rect = canvas ? canvas.getBoundingClientRect() : null;
            var v = new window.THREE.Vector3();
            var best = null;
            (g.enemies || []).forEach(function (e) {
                if (!e || e.hp <= 0) return;
                v.set(e.x, enemyAnchorY(e), e.y).project(g.camera3d);
                if (v.z > 1) return;
                var px = rect ? rect.left + (v.x * 0.5 + 0.5) * rect.width
                             : (v.x * 0.5 + 0.5) * window.innerWidth;
                var py = rect ? rect.top + (-v.y * 0.5 + 0.5) * rect.height
                             : (-v.y * 0.5 + 0.5) * window.innerHeight;
                var sx = Math.round(px / window.innerWidth * 1000);
                var sy = Math.round(py / window.innerHeight * 1000);
                var dist = Math.hypot(e.x - g.player.x, e.y - g.player.y);
                if (!best || dist < best.dist) best = { x: sx, y: sy, dist: dist };
            });
            return best;
        } catch (_) { return null; }
    }

    function viewportToOverlay(nx, ny) {
        var c = state.canvas;
        if (!c) return { x: 0, y: 0 };
        var r = c.getBoundingClientRect();
        var px = (nx / 1000) * window.innerWidth;
        var py = (ny / 1000) * window.innerHeight;
        return { x: px - r.left, y: py - r.top };
    }

    // -- overlay canvas -------------------------------------------------------
    function ensureCanvas() {
        if (state.canvas && document.body.contains(state.canvas)) return true;
        try {
            var host = document.getElementById('canvasContainer') || document.body;
            var c = document.createElement('canvas');
            c.id = 'gg4d-gore-overlay';
            c.setAttribute('aria-hidden', 'true');
            c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;' +
                'pointer-events:none;z-index:5000;';
            var cs = window.getComputedStyle ? window.getComputedStyle(host) : null;
            if (host !== document.body && cs && cs.position === 'static') {
                host.style.position = 'relative';
            }
            if (host === document.body) {
                c.style.position = 'fixed';
            }
            host.appendChild(c);
            state.canvas = c;
            state.host = host;
            state.ctx = c.getContext('2d');
            sizeCanvas();
            return true;
        } catch (_) { return false; }
    }

    function sizeCanvas() {
        if (!state.canvas) return;
        try {
            var r = state.canvas.getBoundingClientRect();
            var w = Math.max(1, Math.round(r.width));
            var h = Math.max(1, Math.round(r.height));
            if (state.canvas.width !== w || state.canvas.height !== h) {
                state.canvas.width = w;
                state.canvas.height = h;
            }
        } catch (_) {}
    }

    // -- particle spawners ----------------------------------------------------
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

    function bloodSpray(x, y, heavy) {
        var n = heavy ? 70 : 34;
        var palette = heavy ? BLOOD_DARK.concat(BLOOD_MAIN) : BLOOD_MAIN;
        for (var i = 0; i < n; i++) {
            var ang = rnd(-Math.PI, 0); // upward cone, screen space
            var sp = rnd(40, heavy ? 420 : 260);
            state.parts.push({
                kind: 'drop',
                x: x + rnd(-6, 6), y: y + rnd(-6, 6),
                vx: Math.cos(ang) * sp + rnd(-60, 60), vy: Math.sin(ang) * sp,
                life: rnd(0.4, heavy ? 1.4 : 0.9), age: 0,
                size: rnd(1.5, heavy ? 5 : 3.5), color: pick(palette)
            });
        }
        if (heavy) {
            for (var j = 0; j < 10; j++) { // gib chunks (all-mode only)
                state.parts.push({
                    kind: 'gib',
                    x: x, y: y,
                    vx: rnd(-260, 260), vy: rnd(-340, -60),
                    life: rnd(0.7, 1.6), age: 0, rot: rnd(0, 6.28), vr: rnd(-9, 9),
                    size: rnd(4, 9), color: pick(BLOOD_DARK)
                });
            }
        }
    }

    function floorSplat(x, y, heavy) {
        state.splats.push({
            x: x + rnd(-14, 14), y: y + rnd(8, 40),
            rx: rnd(8, heavy ? 34 : 20), ry: rnd(4, heavy ? 14 : 9),
            life: heavy ? 30 : 12, age: 0,
            color: heavy ? '122,12,16' : '178,20,30'
        });
        // Decal cap: oldest splats fade out first (removed oldest-first).
        if (state.splats.length > MAX_SPLATS) state.splats.splice(0, state.splats.length - MAX_SPLATS);
    }

    function sparkleBurst(x, y) {
        for (var i = 0; i < 36; i++) {
            var ang = rnd(0, Math.PI * 2);
            var sp = rnd(30, 200);
            state.parts.push({
                kind: 'spark',
                x: x, y: y,
                vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60,
                life: rnd(0.5, 1.2), age: 0,
                size: rnd(1.5, 4), color: pick(SPARK_COLORS)
            });
        }
        state.texts.push({
            x: x, y: y - 24, text: pick(KID_PRAISE),
            life: 1.4, age: 0, color: '#ffe9a3'
        });
    }

    function damageFlash(color, strength) {
        state.flash = Math.min(1, state.flash + strength);
        state.flashColor = color;
    }

    // -- kill / hurt intake ---------------------------------------------------
    function spawnKillAt(nx, ny, count, extra) {
        if (!ensureCanvas()) return;
        sizeCanvas();
        count = Math.max(1, count | 0 || 1);
        var p = (typeof nx === 'number') ? { x: viewportToOverlay(nx, ny).x, y: viewportToOverlay(nx, ny).y }
            : { x: state.canvas.width / 2, y: state.canvas.height * 0.42 };
        var i;
        if (state.mode === 'kid') {
            // Kid path: golden sparkles + praise ONLY — zero blood, zero splats.
            for (i = 0; i < count; i++) sparkleBurst(p.x + rnd(-30, 30), p.y + rnd(-20, 20));
        } else {
            var heavy = state.mode === 'all';
            for (i = 0; i < count; i++) {
                bloodSpray(p.x + rnd(-24, 24), p.y + rnd(-16, 16), heavy);
                floorSplat(p.x, p.y, heavy);
            }
        }
        // Forward to shared gore bus when the sibling bridge provides it.
        // Bridge signature: spawn(x, y, opts) in viewport px; older readers
        // accept a single descriptor object — try positional first, fall
        // back silently (never double-fire: fallback runs only on throw).
        try {
            if (window.FourweirdGore && typeof window.FourweirdGore.spawn === 'function') {
                var vpx = (typeof nx === 'number') ? (nx / 1000) * window.innerWidth : window.innerWidth / 2;
                var vpy = (typeof ny === 'number') ? (ny / 1000) * window.innerHeight : window.innerHeight * 0.42;
                var detail = { game: SLUG, mode: state.mode, kills: count, blood: state.mode !== 'kid' };
                try {
                    if (extra && typeof extra === 'object') {
                        for (var k in extra) {
                            if (Object.prototype.hasOwnProperty.call(extra, k)) detail[k] = extra[k];
                        }
                    }
                } catch (_) {}
                try {
                    window.FourweirdGore.spawn(vpx, vpy, detail);
                } catch (_) {
                    window.FourweirdGore.spawn(detail);
                }
            }
        } catch (_) {}
        try {
            window.dispatchEvent(new CustomEvent(GORE_EVENT, {
                detail: { game: 'gravegain4d', mode: state.mode, kills: count }
            }));
        } catch (_) {}
    }

    // Golf-strike kills: a hole-out on a hazard foe counts as a kill event.
    // Kid mode celebrates (sparkles); teen/all spill blood like any kill.
    function onGolfHoleOut(ev) {
        try {
            var s = state.lastEnemyScreen || { x: 500, y: 420 };
            var extra = { via: 'golf-hole-out' };
            try {
                if (ev && typeof ev.hole !== 'undefined') extra.hole = ev.hole;
                if (ev && typeof ev.strokes !== 'undefined') extra.strokes = ev.strokes;
            } catch (_) {}
            spawnKillAt(s.x, s.y, 1, extra);
        } catch (_) {}
    }

    var trackedRounds = [];

    function attachGolfRound(round) {
        try {
            var g = golf();
            if (!g || typeof g.onEvent !== 'function' || !round) return false;
            if (round.__gg4dGoreAttached) return true;
            round.__gg4dGoreAttached = true;
            trackedRounds.push(round);
            g.onEvent(round, function (ev) {
                try {
                    if (!ev) return;
                    if (ev.type === 'hole-out' || ev.type === 'hole-complete') onGolfHoleOut(ev);
                } catch (_) {}
            });
            return true;
        } catch (_) { return false; }
    }

    // Wrap newRound (guarded, idempotent) so every future golf round routes
    // hole-outs here. Listener faults never break physics (golf core guards
    // its own emit loop); this wrapper never throws either.
    function hookGolf() {
        try {
            var g = golf();
            if (!g || typeof g.newRound !== 'function' || typeof g.onEvent !== 'function') return false;
            if (g.__gg4dGoreWrapped) return true;
            var origNew = g.newRound;
            g.newRound = function () {
                var round = null;
                try { round = origNew.apply(this, arguments); } catch (_) { round = null; }
                try { if (round) attachGolfRound(round); } catch (_) {}
                return round;
            };
            g.__gg4dGoreWrapped = true;
            return true;
        } catch (_) { return false; }
    }

    function retryGolfHook() {
        var tries = 0;
        try {
            var timer = window.setInterval(function () {
                tries += 1;
                var done = false;
                try { done = hookGolf(); } catch (_) { done = false; }
                if (done || tries >= 20) { try { window.clearInterval(timer); } catch (_) {} }
            }, 500);
        } catch (_) {}
    }

    function pollEngine() {
        var g = null;
        try { g = game(); } catch (_) {}
        if (!g) return;
        try {
            var proj = projectKillScreen();
            if (proj) state.lastEnemyScreen = proj;
        } catch (_) {}
        try {
            if (typeof g.kills === 'number') {
                if (state.lastKills === null) { state.lastKills = g.kills; }
                else if (g.kills > state.lastKills) {
                    var delta = g.kills - state.lastKills;
                    state.lastKills = g.kills;
                    var s = state.lastEnemyScreen || { x: 500, y: 420 };
                    spawnKillAt(s.x, s.y, Math.min(delta, 5));
                } else { state.lastKills = g.kills; }
            }
        } catch (_) {}
        try {
            var hp = g.player ? g.player.hp : null;
            if (typeof hp === 'number') {
                if (state.lastHp !== null && hp < state.lastHp) {
                    if (state.mode === 'kid') damageFlash('255,213,74', 0.25); // gold shimmer
                    else if (state.mode === 'all') damageFlash('122,12,16', 0.65);
                    else damageFlash('178,20,30', 0.45);
                }
                state.lastHp = hp;
            }
        } catch (_) {}
    }

    // -- render loop ----------------------------------------------------------
    var lastT = 0;
    function frame(t) {
        state.raf = requestAnimationFrame(frame);
        var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
        lastT = t;
        if (!state.ctx || !state.canvas) return;
        if ((t | 0) % 3 === 0) sizeCanvas();
        var ctx = state.ctx;
        var W = state.canvas.width, H = state.canvas.height;
        ctx.clearRect(0, 0, W, H);

        var i, p, k;
        for (i = state.splats.length - 1; i >= 0; i--) {
            p = state.splats[i];
            p.age += dt;
            if (p.age >= p.life) { state.splats.splice(i, 1); continue; }
            var fade = 1 - p.age / p.life;
            ctx.save();
            ctx.globalAlpha = Math.min(0.75, 0.35 + fade * 0.4);
            ctx.fillStyle = 'rgba(' + p.color + ',1)';
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.2832);
            ctx.fill();
            ctx.restore();
        }
        for (i = state.parts.length - 1; i >= 0; i--) {
            p = state.parts[i];
            p.age += dt;
            if (p.age >= p.life) { state.parts.splice(i, 1); continue; }
            var f = 1 - p.age / p.life;
            if (p.kind !== 'spark') p.vy += 900 * dt; // gravity for blood/gibs
            else p.vy += 160 * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, f * 1.2));
            ctx.fillStyle = p.color;
            if (p.kind === 'gib') {
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rot || 0) + p.age * (p.vr || 0));
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
            } else if (p.kind === 'spark') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.4, p.size * f), 0, 6.2832);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.4, p.size * (0.5 + f * 0.5)), 0, 6.2832);
                ctx.fill();
            }
            ctx.restore();
        }
        for (i = state.texts.length - 1; i >= 0; i--) {
            var tx = state.texts[i];
            tx.age += dt;
            if (tx.age >= tx.life) { state.texts.splice(i, 1); continue; }
            k = 1 - tx.age / tx.life;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.5));
            ctx.font = 'bold 22px Orbitron, Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = tx.color;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 6;
            ctx.fillText(tx.text, tx.x, tx.y - tx.age * 46);
            ctx.restore();
        }
        if (state.flash > 0.01) {
            state.flash = Math.max(0, state.flash - dt * 1.6);
            var grd = ctx.createRadialGradient(
                W / 2, H / 2, Math.min(W, H) * 0.32,
                W / 2, H / 2, Math.max(W, H) * 0.72);
            grd.addColorStop(0, 'rgba(' + state.flashColor + ',0)');
            grd.addColorStop(1, 'rgba(' + state.flashColor + ',' + (state.flash * 0.55).toFixed(3) + ')');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, W, H);
        }
    }

    function setMode(m) {
        var n = normMode(m);
        if (!n) return false;
        state.mode = n;
        try {
            if (window.FourweirdContentMode && typeof window.FourweirdContentMode === 'object') {
                window.FourweirdContentMode.mode = n;
            }
        } catch (_) {}
        return true;
    }

    // -- boot (no input listeners: never steal pointer-lock or clicks) --------
    window.addEventListener(EVENT_NAME, function (e) {
        var d = e && e.detail;
        setMode(d && typeof d === 'object' ? d.mode : d);
    });

    try {
        window.GraveGain4DGore = {
            VERSION: VERSION,
            SLUG: SLUG,
            getMode: function () { return state.mode; },
            setMode: setMode,
            spawnKill: function (nx, ny, count) { spawnKillAt(nx, ny, count); },
            onKill: function (count) {
                var s = state.lastEnemyScreen || { x: 500, y: 420 };
                spawnKillAt(s.x, s.y, count || 1);
            },
            onGolfHoleOut: onGolfHoleOut,
            attachRound: attachGolfRound,
            getDecals: function () { return state.splats.length; }
        };
    } catch (_) {}

    var api = null;
    try { api = window.GraveGain4DGore || null; } catch (_) {}

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain4d-gore', version: VERSION, init: function () { return api; } });
    } catch (_) {}

    function boot() {
        try { if (ensureCanvas()) { lastT = performance.now(); state.raf = requestAnimationFrame(frame); } } catch (_) {}
        try { hookGolf(); } catch (_) {}
        try { retryGolfHook(); } catch (_) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            boot();
            setInterval(pollEngine, 400);
        });
    } else {
        boot();
        setInterval(pollEngine, 400);
    }
})();
