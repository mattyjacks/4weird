/* GraveGain1D signature art — gradient ley-line world + HEAVY emoji style.
 *
 * Lane G6. Vanilla IIFE, no imports, idempotent. Loads via script tag AFTER
 * game.js and runtime-patches the canvas overlay (never rewrites the engine).
 *
 * What it does:
 *  - Gradient ley-line world: per-sector line gradient + glow + tint wash,
 *    drawn as a low-alpha 'lighter' overlay on #gg1dCanvas so draw order
 *    vs game.js render() never matters.
 *  - Sector palettes: 5 campaign sectors + Echo Drift (index 5).
 *  - HEAVY emoji rendering: hero auras, boss crowns, pickup/effect glyphs,
 *    animated emoji particles drifting on the line, emoji weather per sector.
 *  - Canvas glow/pulse on hits: auto-detected by polling the HUD
 *    (gg1dHpText / gg1dBossFill) + public pulse(x, color) for wiring.
 *  - CSS-class hooks for game.css theming: .gg1d-art-on, .gg1d-art-hit,
 *    .gg1d-art-sector-0..5 on <html>, CSS vars --gg1d-line-a/b + --gg1d-glow.
 *
 * AGE BANDS: identical art for kid/teen/all. Gore + drugs FX gating belongs
 * to lane G7 (gravegain-agebands.js) — this file exposes hooks only and
 * renders zero gore/drugs content itself.
 *
 * Camera mirror of game.js: VIEW_TILES=40, cam=clamp(x-12,0,cap-40),
 * scale=960/40, trackY=0.66*540. Run x/sector are read from the HUD
 * (#gg1dSector: "Sector N/5 · xNNN" or "Echo Drift +C · xNNN").
 *
 * Exposes window.GraveGain1DArt = { VERSION, setSector, pulse, ... } and
 * pushes { name, version, init } to window.GraveGainMods.
 */
(function () {
    'use strict';
    /* Merge mode (ORCH ruling 2026-09-13, coordinated via aiorch-01.md):
     * wave-1 gravegain-1dart.js exposes the same window.GraveGain1DArt global
     * with complementary {install, uninstall}. Hard first-wins would drop one
     * layer depending on script order, so attach-first: if a GraveGain1DArt
     * already exists WITH install, keep it and fill any of OUR keys that are
     * missing, then run our init below against the merged object. */
    var _priorArt = null;
    try { _priorArt = window.GraveGain1DArt || null; } catch (_) { _priorArt = null; }

    var VERSION = '1.0.0';
    var W = 960, H = 540, TRACK_Y = H * 0.66, VIEW_TILES = 40;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    /* ---------------- Sector palettes (5 + Echo Drift) ---------------- */
    // line: [west, east] gradient stops. weather/ambient: emoji pools.
    var SECTOR_ART = [
        { name: 'Crash Flats',    line: ['#38bdf8', '#a855f7'], glow: 'rgba(56,189,248,0.55)',  tint: 'rgba(56,189,248,0.06)',
          weather: ['💨', '🌫️', '✨'], ambient: ['✨', '💫', '🛸'], boss: '🪦', crown: '👑' },
        { name: 'Whisper Groves', line: ['#34d399', '#a3e635'], glow: 'rgba(52,211,153,0.55)',  tint: 'rgba(52,211,153,0.07)',
          weather: ['🍃', '🌿', '🦋'], ambient: ['🦋', '✨', '🌸'], boss: '👻', crown: '🌙' },
        { name: 'Sparkite Cut',   line: ['#fb923c', '#facc15'], glow: 'rgba(251,146,60,0.6)',   tint: 'rgba(251,146,60,0.07)',
          weather: ['🔥', '⚡', '💎'], ambient: ['✨', '💎', '⚙️'], boss: '🗿', crown: '🔥' },
        { name: 'Ash Gate',       line: ['#ef4444', '#f97316'], glow: 'rgba(239,68,68,0.6)',    tint: 'rgba(239,68,68,0.08)',
          weather: ['🌋', '💀', '🔥'], ambient: ['🔥', '💀', '⚔️'], boss: '😈', crown: '😈' },
        { name: 'Relay Approach', line: ['#a855f7', '#ec4899'], glow: 'rgba(168,85,247,0.6)',   tint: 'rgba(168,85,247,0.08)',
          weather: ['⚡', '🌀', '💜'], ambient: ['💜', '✨', '🛸'], boss: '👹', crown: '⚡' },
        { name: 'Echo Drift',     line: ['#22d3ee', '#e879f9'], glow: 'rgba(34,211,238,0.65)',  tint: 'rgba(34,211,238,0.09)',
          weather: ['🌀', '👻', '💫'], ambient: ['🌀', '✨', '👁️'], boss: '👹', crown: '🌀' }
    ];

    /* ---------------- Emoji style maps ---------------- */
    var EMOJI = {
        hero: { rifleman: '🔫', sapper: '🛠️', runner: '🌿' },
        heroAura: { rifleman: '🎯', sapper: '🛡️', runner: '💨' },
        boss: ['🪦', '👻', '🗿', '😈', '👹'],
        driftBoss: '🌀',
        pickup: { gold: '🪙', potion: '🧪', xp: '⭐', gate: '🌀', level: '🎉' },
        fx: { hit: '💥', crit: '💫', kill: '☠️', level: '🎉', dodge: '💨',
              shield: '🛡️', step: '👣', summon: '🧟', clear: '🌟', boss: '💀' }
    };

    /* ---------------- State ---------------- */
    var S = {
        sector: 0, manual: false, time: 0, last: 0, particleMult: 1,
        pulseT: 0, pulseColor: '#fbbf24', vignette: 0, vignetteColor: '239,68,68',
        prevHp: null, prevBoss: null, running: false
    };

    /* Pooled particles — fixed caps, objects reused, zero per-frame alloc. */
    var MAX_AMBIENT = 90, MAX_WEATHER = 36, MAX_BURST = 60;
    var ambient = [], weather = [], bursts = [];
    var ai = 0, wi = 0, bi = 0, seed = 1234567;

    function rnd() {
        seed = (seed * 1664525 + 1013904223) | 0;
        return ((seed >>> 0) % 10000) / 10000;
    }

    function initPools() {
        var k;
        for (k = 0; k < MAX_AMBIENT; k++) {
            ambient.push({ on: false, u: 0, y: 0, vy: 0, ph: 0, sp: 0, g: '' });
        }
        for (k = 0; k < MAX_WEATHER; k++) {
            weather.push({ on: false, x: 0, y: 0, vy: 0, vx: 0, g: '', size: 18 });
        }
        for (k = 0; k < MAX_BURST; k++) {
            bursts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, g: '', size: 20 });
        }
    }

    /* ---------------- DOM helpers (all guarded) ---------------- */
    function el(id) {
        try { return document.getElementById(id); } catch (e) { return null; }
    }
    function txt(id) {
        try {
            var n = el(id);
            return n ? (n.textContent || '') : '';
        } catch (e) { return ''; }
    }

    /* Parse HUD sector line -> { sector, x }. Sector 5 == Echo Drift. */
    function readHud() {
        var line = txt('gg1dSector');
        var sector = S.sector, x = 0, m;
        try {
            if (line.indexOf('Echo Drift') !== -1) {
                sector = 5;
            } else if ((m = /Sector\s+(\d)/.exec(line))) {
                sector = clamp(parseInt(m[1], 10) - 1, 0, 4);
            }
            if ((m = /x(\d+)/.exec(line))) x = parseInt(m[1], 10) || 0;
        } catch (e) { /* keep previous */ }
        if (!S.manual) S.sector = sector;
        return { x: x, drift: sector === 5 };
    }

    function sxOf(x, cam) { return (x - cam) * (W / VIEW_TILES); }

    /* ---------------- CSS hooks for game.css ---------------- */
    function injectStyle() {
        try {
            if (el('gg1dArtStyle')) return;
            var st = document.createElement('style');
            st.id = 'gg1dArtStyle';
            st.textContent =
                '.gg1d-art-on #gg1dCanvas{filter:saturate(1.12) contrast(1.04);}' +
                '.gg1d-art-hit #gg1dCanvas{animation:gg1d-art-shake .22s linear;}' +
                '@keyframes gg1d-art-shake{' +
                '0%{transform:translate(0,0)}25%{transform:translate(-3px,1px)}' +
                '50%{transform:translate(3px,-1px)}75%{transform:translate(-2px,0)}' +
                '100%{transform:translate(0,0)}}' +
                '#gg1dCanvas.gg1d-art-flash{box-shadow:0 0 42px 6px var(--gg1d-glow,rgba(168,85,247,.6));}';
            (document.head || document.documentElement).appendChild(st);
        } catch (e) { /* css is best-effort */ }
    }

    function paintTheme() {
        try {
            var a = SECTOR_ART[clamp(S.sector, 0, 5)];
            var root = document.documentElement;
            for (var k = 0; k <= 5; k++) {
                try { root.classList.remove('gg1d-art-sector-' + k); } catch (e) { /* ignore */ }
            }
            try {
                root.classList.add('gg1d-art-on');
                root.classList.add('gg1d-art-sector-' + clamp(S.sector, 0, 5));
                root.style.setProperty('--gg1d-line-a', a.line[0]);
                root.style.setProperty('--gg1d-line-b', a.line[1]);
                root.style.setProperty('--gg1d-glow', a.glow);
            } catch (e) { /* ignore */ }
            try { document.body.setAttribute('data-gg1d-sector', a.name); } catch (e2) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    /* ---------------- Hit pulse API + auto-detect ---------------- */
    function pulse(x, color) {
        try {
            S.pulseT = 1;
            if (color) S.pulseColor = color;
            S.vignette = 1;
            S.vignetteColor = (color === '#ef4444') ? '239,68,68' : '251,191,36';
            if (typeof x === 'number') spawnBurst(x, color || '#fbbf24', Math.round(8 * S.particleMult));
            var cv = el('gg1dCanvas');
            if (cv) {
                var root = document.documentElement;
                try {
                    root.classList.remove('gg1d-art-hit');
                    void cv.offsetWidth; // restart keyframe
                    root.classList.add('gg1d-art-hit');
                    cv.classList.add('gg1d-art-flash');
                    setTimeout(function () {
                        try {
                            root.classList.remove('gg1d-art-hit');
                            cv.classList.remove('gg1d-art-flash');
                        } catch (e) { /* ignore */ }
                    }, 260);
                } catch (e) { /* ignore */ }
            }
        } catch (e) { /* never throw */ }
    }

    // Poll HUD numbers: hp drop => player hit (red), boss-hp drop => boss hit (gold).
    function detectHits(hud) {
        try {
            var hpLine = txt('gg1dHpText');
            var m = /(\d+)\s*\//.exec(hpLine);
            var hp = m ? parseInt(m[1], 10) : null;
            if (hp !== null && S.prevHp !== null && hp < S.prevHp) pulse(hud.x, '#ef4444');
            if (hp !== null) S.prevHp = hp;
            var bf = el('gg1dBossFill');
            var bw = bf ? parseFloat(bf.style.width) || 0 : 0;
            if (S.prevBoss !== null && bw < S.prevBoss && bw > 0) pulse(hud.x + 6, '#fbbf24');
            if (bw > 0 || S.prevBoss === null) S.prevBoss = bw;
            if (bw <= 0) S.prevBoss = 0;
        } catch (e) { /* ignore */ }
    }

    /* ---------------- Spawners (ring buffers) ---------------- */
    function spawnAmbient(u, art) {
        var p = ambient[ai]; ai = (ai + 1) % MAX_AMBIENT;
        p.on = true; p.u = u; p.y = rnd() * 26 - 13;
        p.vy = -(4 + rnd() * 10); p.ph = rnd() * 6.28; p.sp = 0.6 + rnd() * 1.4;
        var pool = art.ambient;
        p.g = pool[(rnd() * pool.length) | 0];
    }

    function spawnWeather(art) {
        var p = weather[wi]; wi = (wi + 1) % MAX_WEATHER;
        p.on = true; p.x = rnd() * W; p.y = -24;
        p.vy = 30 + rnd() * 70; p.vx = (rnd() - 0.5) * 40;
        p.g = art.weather[(rnd() * art.weather.length) | 0];
        p.size = 14 + ((rnd() * 14) | 0);
    }

    function spawnBurst(x, color, n) {
        var glyphs = ['💥', '✨', '💫', '⭐'];
        for (var k = 0; k < n; k++) {
            var p = bursts[bi]; bi = (bi + 1) % MAX_BURST;
            p.on = true; p.x = x; p.y = TRACK_Y - 24;
            p.vx = (rnd() - 0.5) * 160; p.vy = -(40 + rnd() * 140);
            p.life = 1; p.size = 14 + ((rnd() * 12) | 0);
            p.g = glyphs[(rnd() * glyphs.length) | 0];
            p.color = color;
        }
    }

    /* ---------------- Overlay frame ---------------- */
    function frame(t) {
        try {
            if (!S.running) return;
            var dt = 0.016;
            try {
                if (S.last) dt = clamp((t - S.last) / 1000, 0, 0.1);
                S.last = t;
            } catch (e) { /* ignore */ }
            S.time += dt;

            var cv = el('gg1dCanvas');
            var hud = readHud();
            detectHits(hud);
            if (!cv) { requestAnimationFrame(frame); return; }
            var ctx = null;
            try { ctx = cv.getContext('2d'); } catch (e) { ctx = null; }
            if (!ctx) { requestAnimationFrame(frame); return; }

            var art = SECTOR_ART[clamp(S.sector, 0, 5)];
            var cam = clamp(hud.x - 12, 0, Math.max(0, hud.x));
            var dpr = 1;
            try { dpr = cv.width / W || 1; } catch (e) { /* ignore */ }

            ctx.save();
            try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); } catch (e) { /* ignore */ }
            ctx.globalCompositeOperation = 'lighter';

            // Sector tint wash.
            var wash = ctx.createLinearGradient(0, 0, 0, H);
            wash.addColorStop(0, 'rgba(0,0,0,0)');
            wash.addColorStop(0.66, art.tint);
            wash.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, W, H);

            // Gradient ley-line with glow.
            var lg = ctx.createLinearGradient(0, 0, W, 0);
            lg.addColorStop(0, art.line[0]);
            lg.addColorStop(0.5, art.line[1]);
            lg.addColorStop(1, art.line[0]);
            ctx.strokeStyle = lg;
            ctx.lineWidth = 5;
            try {
                ctx.shadowColor = art.glow;
                ctx.shadowBlur = 18 + Math.sin(S.time * 3) * 6 + (S.pulseT > 0 ? 26 * S.pulseT : 0);
            } catch (e) { /* ignore */ }
            ctx.beginPath(); ctx.moveTo(0, TRACK_Y); ctx.lineTo(W, TRACK_Y); ctx.stroke();
            try { ctx.shadowBlur = 0; } catch (e) { /* ignore */ }
            // Inner bright core.
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, TRACK_Y); ctx.lineTo(W, TRACK_Y); ctx.stroke();

            // Emoji tick sparkles every 5 tiles.
            ctx.textAlign = 'center';
            ctx.font = '13px sans-serif';
            var start = Math.floor(cam);
            for (var tx = start; tx < cam + VIEW_TILES + 1; tx++) {
                if (((tx % 5) + 5) % 5 !== 0) continue;
                var ex = sxOf(tx, cam);
                if (ex < -20 || ex > W + 20) continue;
                var tw = 0.5 + 0.5 * Math.sin(S.time * 2.4 + tx);
                ctx.globalAlpha = 0.35 + 0.45 * tw;
                ctx.fillText('✨', ex, TRACK_Y + 16);
            }
            ctx.globalAlpha = 1;

            // Ambient emoji particles riding the line.
            if (rnd() < 0.5 * S.particleMult) spawnAmbient(rnd(), art);
            ctx.font = '15px sans-serif';
            for (var a2 = 0; a2 < MAX_AMBIENT; a2++) {
                var p = ambient[a2];
                if (!p.on) continue;
                p.ph += dt * p.sp * 3;
                p.u += dt * 0.03 * p.sp;
                if (p.u > 1.2) { p.on = false; continue; }
                p.y += p.vy * dt * 0.4;
                var px = p.u * W;
                var py = TRACK_Y - 30 + p.y + Math.sin(p.ph) * 5;
                ctx.globalAlpha = clamp(1.2 - p.u, 0, 0.9);
                ctx.fillText(p.g, px, py);
            }
            ctx.globalAlpha = 1;

            // Emoji weather per sector.
            if (rnd() < 0.12 * S.particleMult) spawnWeather(art);
            for (var w2 = 0; w2 < MAX_WEATHER; w2++) {
                var q = weather[w2];
                if (!q.on) continue;
                q.y += q.vy * dt; q.x += q.vx * dt + Math.sin(S.time * 2 + q.y * 0.05) * 0.4;
                if (q.y > H + 30) { q.on = false; continue; }
                ctx.globalAlpha = 0.75;
                ctx.font = q.size + 'px sans-serif';
                ctx.fillText(q.g, q.x, q.y);
            }
            ctx.globalAlpha = 1;

            // Hit bursts (emoji shrapnel at world x).
            ctx.font = '18px sans-serif';
            for (var b2 = 0; b2 < MAX_BURST; b2++) {
                var b = bursts[b2];
                if (!b.on) continue;
                b.life -= dt * 1.6;
                if (b.life <= 0) { b.on = false; continue; }
                b.x += b.vx * dt / (W / VIEW_TILES);
                b.y += b.vy * dt;
                b.vy += 160 * dt;
                ctx.globalAlpha = clamp(b.life, 0, 1);
                ctx.font = b.size + 'px sans-serif';
                ctx.fillText(b.g, sxOf(b.x, cam), b.y);
            }
            ctx.globalAlpha = 1;

            // Hit pulse ring at player position.
            if (S.pulseT > 0) {
                S.pulseT = Math.max(0, S.pulseT - dt * 2.2);
                var pr = 20 + (1 - S.pulseT) * 70;
                ctx.strokeStyle = S.pulseColor;
                ctx.globalAlpha = clamp(S.pulseT, 0, 0.9);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(sxOf(hud.x, cam), TRACK_Y - 24, pr, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Edge vignette flash on hits.
            if (S.vignette > 0) {
                S.vignette = Math.max(0, S.vignette - dt * 2.5);
                var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
                vg.addColorStop(0, 'rgba(' + S.vignetteColor + ',0)');
                vg.addColorStop(1, 'rgba(' + S.vignetteColor + ',' + (0.35 * S.vignette).toFixed(3) + ')');
                ctx.fillStyle = vg;
                ctx.fillRect(0, 0, W, H);
            }

            ctx.restore();
            try { ctx.globalCompositeOperation = 'source-over'; } catch (e) { /* ignore */ }
        } catch (e) { /* overlay must never break the game */ }
        try { requestAnimationFrame(frame); } catch (e) { /* ignore */ }
    }

    /* ---------------- Public API ---------------- */
    function setSector(i) {
        try {
            i = clamp(i | 0, 0, 5);
            S.sector = i;
            S.manual = true;
            paintTheme();
            return S.sector;
        } catch (e) { return S.sector; }
    }

    function autoSector() {
        try { S.manual = false; readHud(); paintTheme(); } catch (e) { /* ignore */ }
    }

    // G10 graphics-settings hook: hookEmojiParticles() calls this when present.
    // Also follows the 'fourweird-graphics' broadcast (detail.settings.particleMult).
    function setParticleScale(s) {
        try {
            s = Number(s);
            if (!isFinite(s) || s < 0) s = 1;
            S.particleMult = clamp(s, 0, 3);
            return S.particleMult;
        } catch (e) { return S.particleMult; }
    }

    function bindGraphicsBus() {
        try {
            window.addEventListener('fourweird-graphics', function (ev) {
                try {
                    var d = ev && ev.detail ? (ev.detail.settings || ev.detail.preset) : null;
                    var m = d ? d.particleMult : null;
                    if (m !== null && m !== undefined) setParticleScale(m);
                } catch (e) { /* ignore */ }
            });
        } catch (e) { /* bus is best-effort */ }
    }

    function init() {
        try {
            if (S.running) return true;
            injectStyle();
            initPools();
            bindGraphicsBus();
            paintTheme();
            S.running = true;
            try { requestAnimationFrame(frame); } catch (e) {
                try { setInterval(function () { frame(performance.now()); }, 50); } catch (ignored) { /* ignore */ }
            }
            // Keep theme in sync when the run advances sectors on its own.
            try {
                setInterval(function () {
                    try { if (!S.manual) paintTheme(); } catch (e) { /* ignore */ }
                }, 2000);
            } catch (e) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    }

    try {
        var _merged = {
            VERSION: VERSION,
            SECTORS: SECTOR_ART,
            EMOJI: EMOJI,
            setSector: setSector,
            autoSector: autoSector,
            setParticleScale: setParticleScale,
            pulse: pulse,
            init: init
        };
        try {
            if (_priorArt && typeof _priorArt === 'object') {
                for (var _mk in _priorArt) {
                    if (_merged[_mk] === undefined && _priorArt[_mk] !== undefined) _merged[_mk] = _priorArt[_mk];
                }
            }
        } catch (_) {}
        window.GraveGain1DArt = _merged;
    } catch (e) { /* window unwritable */ }

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain1d-art', version: VERSION, init: init });
    } catch (e) { /* registry best-effort */ }

    try { init(); } catch (e) { /* boot best-effort */ }
})();
