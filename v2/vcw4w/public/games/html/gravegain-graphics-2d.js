(function () {
    'use strict';
    if (window.GraveGainGraphics2D) return;

    var VERSION = '2.0.0';
    var Z = { para: 10, rim: 11, weather: 12, flash: 13, beam: 14 };
    var IDS = {
        far: 'gg25-para-far',
        mid: 'gg25-para-mid',
        near: 'gg25-para-near',
        rim: 'gg25-rim',
        weather: 'gg25-weather',
        flash: 'gg25-flash',
        beam: 'gg25-beam'
    };
    var VALID_Q = { potato: 1, balanced: 1, high: 1, ultra: 1 };
    var state = {
        quality: 'balanced',
        weatherMode: null,
        rafPara: 0,
        rafWeather: 0,
        lastPara: 0,
        lastWeather: 0,
        paraX: [0, 0, 0],
        particles: [],
        bossTimer: 0,
        lastHp: -1,
        lastLevel: -1
    };

    function safe(fn) {
        try { fn(); } catch (e) { /* never throw */ }
    }

    function findContainer() {
        try {
            var c = document.getElementById('canvasContainer');
            if (c) return c;
            var cv = document.querySelector('canvas');
            if (cv && cv.parentElement) return cv.parentElement;
        } catch (e) { /* ignore */ }
        return null;
    }

    function findGame() {
        try {
            if (window.game && typeof window.game === 'object') return window.game;
            if (window.GraveGain2D && typeof window.GraveGain2D === 'object') return window.GraveGain2D;
            if (window.gravegain2d && typeof window.gravegain2d === 'object') return window.gravegain2d;
        } catch (e) { /* ignore */ }
        return null;
    }

    function getQuality() {
        try {
            var gfx = window.FourWeirdGraphics;
            if (gfx && typeof gfx.get === 'function') {
                var q = gfx.get();
                var name = null;
                if (q && typeof q.preset === 'string') name = q.preset;
                else if (typeof q === 'string') name = q;
                if (name) {
                    name = String(name).replace(/^auto:/, '').toLowerCase();
                    if (VALID_Q[name]) { state.quality = name; return name; }
                }
                // get() returned a table without preset name: still healthy, keep current/default
                if (q && typeof q === 'object') return state.quality;
            }
        } catch (e) { /* ignore */ }
        return state.quality || 'balanced';
    }

    function particleMult() {
        try {
            var gfx = window.FourWeirdGraphics;
            if (gfx && typeof gfx.get === 'function') {
                var q = gfx.get();
                if (q && typeof q.particleMult === 'number' && q.particleMult > 0) return q.particleMult;
            }
        } catch (e) { /* ignore */ }
        return 0.6;
    }

    function mkDiv(id, css) {
        var d = document.getElementById(id);
        if (d) return d;
        d = document.createElement('div');
        d.id = id;
        d.setAttribute('aria-hidden', 'true');
        d.style.cssText = css;
        return d;
    }

    function baseOverlayCss(z) {
        return 'position:absolute;inset:0;pointer-events:none;z-index:' + z + ';';
    }

    function ensureHostPosition(container) {
        try {
            var pos = window.getComputedStyle(container).position;
            if (pos === 'static') container.style.position = 'relative';
        } catch (e) { /* ignore */ }
    }

    // ---- 1. DEPTH ----
    function ensureParallax() {
        try {
            if (state.quality === 'potato' || state.quality === 'balanced') return;
            var host = findContainer();
            if (!host) return;
            ensureHostPosition(host);
            var far = mkDiv(IDS.far, baseOverlayCss(Z.para) +
                'opacity:0.16;background:repeating-linear-gradient(180deg,' +
                'rgba(40,60,120,0.55) 0px,rgba(40,60,120,0.55) 2px,transparent 2px,transparent 26px);');
            var mid = mkDiv(IDS.mid, baseOverlayCss(Z.para) +
                'opacity:0.12;background:repeating-linear-gradient(180deg,' +
                'rgba(70,50,140,0.5) 0px,rgba(70,50,140,0.5) 3px,transparent 3px,transparent 44px);');
            var near = mkDiv(IDS.near, baseOverlayCss(Z.para) +
                'opacity:0.10;background:repeating-linear-gradient(180deg,' +
                'rgba(20,30,60,0.6) 0px,rgba(20,30,60,0.6) 4px,transparent 4px,transparent 70px);');
            if (!far.parentNode) host.appendChild(far);
            if (!mid.parentNode) host.appendChild(mid);
            if (!near.parentNode) host.appendChild(near);
            startParaLoop();
        } catch (e) { /* ignore */ }
    }

    function startParaLoop() {
        try {
            if (state.rafPara) return;
            state.lastPara = 0;
            var tick = function (t) {
                state.rafPara = 0;
                try {
                    if (document.hidden) { state.rafPara = requestAnimationFrame(tick); return; }
                    if (t - state.lastPara >= 33) {
                        state.lastPara = t;
                        state.paraX[0] += 0.12; state.paraX[1] += 0.25; state.paraX[2] += 0.45;
                        var f = document.getElementById(IDS.far);
                        var m = document.getElementById(IDS.mid);
                        var n = document.getElementById(IDS.near);
                        if (f) f.style.backgroundPosition = '0px ' + (state.paraX[0] % 26) + 'px';
                        if (m) m.style.backgroundPosition = '0px ' + (state.paraX[1] % 44) + 'px';
                        if (n) n.style.backgroundPosition = '0px ' + (state.paraX[2] % 70) + 'px';
                    }
                    if (document.getElementById(IDS.far) || document.getElementById(IDS.mid) ||
                        document.getElementById(IDS.near)) {
                        state.rafPara = requestAnimationFrame(tick);
                    }
                } catch (e) { /* stop loop on error */ state.rafPara = 0; }
            };
            state.rafPara = requestAnimationFrame(tick);
        } catch (e) { /* ignore */ }
    }

    function stopParaLoop() {
        try {
            if (state.rafPara && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(state.rafPara);
        } catch (e) { /* ignore */ }
        state.rafPara = 0;
    }

    function ensureYSortHint() {
        try {
            var g = findGame();
            if (g) g.__gg25_ySort = true;
        } catch (e) { /* ignore */ }
    }

    // ---- 2. SHADE ----
    function ensureRim() {
        try {
            var host = findContainer();
            if (!host) return;
            ensureHostPosition(host);
            var rim = mkDiv(IDS.rim, baseOverlayCss(Z.rim) +
                'opacity:1;background:' +
                'linear-gradient(180deg,rgba(255,250,230,0.07) 0%,transparent 22%),' +
                'radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.38) 100%);');
            if (!rim.parentNode) host.appendChild(rim);
        } catch (e) { /* ignore */ }
    }

    function shadowFor(x, y, r) {
        try {
            var rr = (typeof r === 'number' && r > 0) ? r : 12;
            var dy = Math.max(2, Math.round(rr * 0.4));
            var blur = Math.max(3, Math.round(rr * 0.8));
            return '0 ' + dy + 'px ' + blur + 'px rgba(0,0,0,0.45)';
        } catch (e) { return '0 4px 8px rgba(0,0,0,0.45)'; }
    }

    function setWeather(mode) {
        try {
            if (mode !== 'embers' && mode !== 'snow' && mode !== null && mode !== undefined) return;
            state.weatherMode = mode || null;
            var cv = document.getElementById(IDS.weather);
            if (!state.weatherMode) {
                stopWeatherLoop();
                if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
                state.particles = [];
                return;
            }
            if (state.quality === 'potato' || state.quality === 'balanced') return; // shade-lite: no weather
            var host = findContainer();
            if (!host) return;
            ensureHostPosition(host);
            if (!cv) {
                cv = document.createElement('canvas');
                cv.id = IDS.weather;
                cv.setAttribute('aria-hidden', 'true');
                cv.style.cssText = baseOverlayCss(Z.weather) + 'width:100%;height:100%;opacity:0.85;';
                host.appendChild(cv);
            }
            seedParticles();
            startWeatherLoop();
        } catch (e) { /* ignore */ }
    }

    function seedParticles() {
        try {
            var cv = document.getElementById(IDS.weather);
            if (!cv) return;
            var w = cv.clientWidth || 640, h = cv.clientHeight || 480;
            cv.width = w; cv.height = h;
            var n = Math.max(8, Math.min(60, Math.round(40 * particleMult())));
            state.particles = [];
            for (var i = 0; i < n; i++) {
                state.particles.push({
                    x: Math.random() * w, y: Math.random() * h,
                    s: 0.6 + Math.random() * 1.8,
                    v: 0.3 + Math.random() * 0.9,
                    ph: Math.random() * 6.28
                });
            }
        } catch (e) { state.particles = []; }
    }

    function startWeatherLoop() {
        try {
            if (state.rafWeather) return;
            state.lastWeather = 0;
            var tick = function (t) {
                state.rafWeather = 0;
                try {
                    if (document.hidden) { state.rafWeather = requestAnimationFrame(tick); return; }
                    if (t - state.lastWeather >= 33) {
                        state.lastWeather = t;
                        drawWeather(t);
                    }
                    if (document.getElementById(IDS.weather) && state.weatherMode) {
                        state.rafWeather = requestAnimationFrame(tick);
                    }
                } catch (e) { state.rafWeather = 0; }
            };
            state.rafWeather = requestAnimationFrame(tick);
        } catch (e) { /* ignore */ }
    }

    function stopWeatherLoop() {
        try {
            if (state.rafWeather && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(state.rafWeather);
        } catch (e) { /* ignore */ }
        state.rafWeather = 0;
    }

    function drawWeather(t) {
        var cv = document.getElementById(IDS.weather);
        if (!cv || !state.weatherMode) return;
        var ctx = cv.getContext('2d');
        if (!ctx) return;
        var w = cv.width, h = cv.height;
        ctx.clearRect(0, 0, w, h);
        var ember = state.weatherMode === 'embers';
        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            if (ember) {
                p.y -= p.v; p.x += Math.sin(t / 700 + p.ph) * 0.3;
                if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
                ctx.fillStyle = 'rgba(255,150,60,0.8)';
            } else {
                p.y += p.v * 0.7; p.x += Math.sin(t / 900 + p.ph) * 0.4;
                if (p.y > h + 4) { p.y = -4; p.x = Math.random() * w; }
                ctx.fillStyle = 'rgba(235,242,255,0.85)';
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.s, 0, 6.29);
            ctx.fill();
        }
    }

    // ---- 3. FX ----
    function hitFlash() {
        try {
            if (state.quality === 'potato') return;
            var host = findContainer();
            if (!host) return;
            ensureHostPosition(host);
            var d = document.getElementById(IDS.flash);
            if (!d) {
                d = document.createElement('div');
                d.id = IDS.flash;
                d.setAttribute('aria-hidden', 'true');
                d.style.cssText = baseOverlayCss(Z.flash) +
                    'background:radial-gradient(ellipse at center,transparent 60%,rgba(255,240,200,0.35) 100%);' +
                    'opacity:0;transition:opacity 120ms linear;';
                host.appendChild(d);
            }
            d.style.opacity = '1';
            window.setTimeout(function () {
                try { var el = document.getElementById(IDS.flash); if (el) el.style.opacity = '0'; }
                catch (e) { /* ignore */ }
            }, 130);
        } catch (e) { /* ignore */ }
    }

    function levelUp() {
        try {
            if (state.quality === 'potato') return;
            var host = findContainer();
            if (!host) return;
            ensureHostPosition(host);
            var old = document.getElementById(IDS.beam);
            if (old && old.parentNode) old.parentNode.removeChild(old);
            var b = document.createElement('div');
            b.id = IDS.beam;
            b.setAttribute('aria-hidden', 'true');
            b.style.cssText = baseOverlayCss(Z.beam) +
                'background:linear-gradient(180deg,transparent 0%,rgba(255,215,120,0.55) 45%,' +
                'rgba(255,255,255,0.7) 50%,rgba(255,215,120,0.55) 55%,transparent 100%);' +
                'background-size:100% 220%;background-position:50% 110%;opacity:1;';
            host.appendChild(b);
            var start = null;
            var sweep = function (t) {
                try {
                    if (!start) start = t;
                    var k = Math.min(1, (t - start) / 900);
                    var el = document.getElementById(IDS.beam);
                    if (!el) return;
                    if (document.hidden) { requestAnimationFrame(sweep); return; }
                    el.style.backgroundPosition = '50% ' + (110 - 220 * k) + '%';
                    el.style.opacity = String(1 - k * 0.9);
                    if (k < 1) requestAnimationFrame(sweep);
                    else if (el.parentNode) el.parentNode.removeChild(el);
                } catch (e) { /* ignore */ }
            };
            requestAnimationFrame(sweep);
        } catch (e) { /* ignore */ }
    }

    function bossAlive(g) {
        try {
            if (!g) return false;
            var b = g.boss;
            if (!b) return false;
            if (b.alive === true) return true;
            if (typeof b.hp === 'number' && b.hp > 0) return true;
            if (typeof b.health === 'number' && b.health > 0) return true;
            return false;
        } catch (e) { return false; }
    }

    function pollBoss() {
        try {
            var host = findContainer();
            var g = findGame();
            if (!host || !g) return;
            if (bossAlive(g)) {
                host.style.boxShadow = '0 0 0 2px rgba(180,40,40,0.8),0 0 26px 6px rgba(200,30,30,0.45)';
            } else if (host.style.boxShadow && host.style.boxShadow.indexOf('rgba(200,30,30') !== -1) {
                host.style.boxShadow = '';
            }
            // Auto FX hooks (guarded, hp/level drops only — never blood here).
            try {
                var hp = (typeof g.hp === 'number') ? g.hp : (g.player && typeof g.player.hp === 'number' ? g.player.hp : -1);
                if (state.lastHp >= 0 && hp >= 0 && hp < state.lastHp) hitFlash();
                if (hp >= 0) state.lastHp = hp;
                var lv = (typeof g.level === 'number') ? g.level : (g.player && typeof g.player.level === 'number' ? g.player.level : -1);
                if (state.lastLevel >= 0 && lv > state.lastLevel) levelUp();
                if (lv >= 0) state.lastLevel = lv;
            } catch (e2) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    function startBossPoll() {
        try {
            if (state.bossTimer) return;
            state.bossTimer = window.setInterval(function () {
                safe(function () { if (!document.hidden) pollBoss(); });
            }, 1000);
        } catch (e) { /* ignore */ }
    }

    // ---- 4. Quality ----
    function removeAllOverlays() {
        try {
            var ids = [IDS.far, IDS.mid, IDS.near, IDS.rim, IDS.weather, IDS.flash, IDS.beam];
            for (var i = 0; i < ids.length; i++) {
                var el = document.getElementById(ids[i]);
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }
            try {
                var host = findContainer();
                if (host && host.style.boxShadow && host.style.boxShadow.indexOf('rgba(200,30,30') !== -1) {
                    host.style.boxShadow = '';
                }
            } catch (e2) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    function removeNonVignette() {
        try {
            var ids = [IDS.far, IDS.mid, IDS.near, IDS.weather, IDS.flash, IDS.beam];
            for (var i = 0; i < ids.length; i++) {
                var el = document.getElementById(ids[i]);
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }
        } catch (e) { /* ignore */ }
    }

    function retune() {
        try {
            var q = getQuality();
            if (q === 'potato') {
                stopParaLoop();
                stopWeatherLoop();
                state.weatherMode = null;
                state.particles = [];
                removeAllOverlays();
                return q;
            }
            if (q === 'balanced') {
                stopParaLoop();
                stopWeatherLoop();
                state.particles = [];
                removeNonVignette();
                ensureRim();
                ensureYSortHint();
                return q;
            }
            // high / ultra: full overlays
            ensureRim();
            ensureParallax();
            ensureYSortHint();
            return q;
        } catch (e) { return state.quality || 'balanced'; }
    }

    function boot() {
        safe(retune);
        safe(startBossPoll);
        safe(ensureYSortHint);
    }

    // ---- 5. Boot ----
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
        window.addEventListener('fourweird-graphics', function () { safe(retune); });
    } catch (e) { /* never throw */ }

    window.GraveGainGraphics2D = {
        VERSION: VERSION,
        retune: retune,
        ensureParallax: ensureParallax,
        setWeather: setWeather,
        // Bonus guarded helpers (2.5D look support; gore module owns all blood).
        shadowFor: shadowFor,
        ensureYSortHint: ensureYSortHint,
        hitFlash: hitFlash,
        levelUp: levelUp,
        getQuality: getQuality
    };

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain-graphics-2d', version: VERSION, init: retune });
    } catch (e) { /* ignore */ }
})();
