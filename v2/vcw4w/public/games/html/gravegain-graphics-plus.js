/* GraveGain graphics-plus post-FX layer (v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundles:
 *   public/games/html/gravegain-graphics-plus.js
 * Injected into the generated runtime copies (gravegain2d + gravegain3d) by
 * scripts/sync-game-bundles.mjs. NEVER edit gravegain2d/** or gravegain3d/**.
 *
 * What it adds (without touching game loops):
 *   2D (canvas, no THREE): CSS vignette + animated film grain overlays,
 *     lighting-canvas flicker boost on high/ultra, particle-count scaling
 *     via window.FourweirdGore.spawn / GraveGainGame.vfx wrappers honoring
 *     the shared particleMult preset (kid = gold sparkles, teen/all = blood).
 *   3D (THREE r128): renderer pixel-ratio honoring shared pixelRatioMax,
 *     scene fog-density breathing per preset, torch-flicker amplitude per
 *     preset (0 on potato), ember/particle budget via vfx hooks, CSS vignette.
 *
 * Guards: potato/balanced skip DOM postFX + shadowBlur; high/ultra only for
 * flicker/grain; overlays throttle to ~30Hz and pause when hidden; every
 * hook try/catch; no input/pointer-lock listeners; pointer-events:none.
 */
(function () {
    'use strict';
    if (window.GraveGainGraphicsPlus) return;

    var VERSION = '1.0.0';
    var OVERLAY_FPS_MS = 33;

    function gfxSettings() {
        try {
            var g = window.FourWeirdGraphics;
            if (g && typeof g.get === 'function') {
                var preset = 'balanced';
                try {
                    var saved = g.load ? g.load() : null;
                    if (saved && saved.preset) preset = saved.preset.replace(/^auto:/, '');
                } catch (e) { /* ignore */ }
                return g.get(preset);
            }
        } catch (e) { /* ignore */ }
        return { pixelRatioMax: 1.0, particleMult: 0.6, lightCount: 2, shadows: false, postFX: false, textureScale: 0.75 };
    }

    function presetName() {
        try {
            var el = document.documentElement && document.documentElement.getAttribute('data-fourweird-graphics');
            if (el) return el;
            var g = window.FourWeirdGraphics;
            if (g && typeof g.load === 'function') {
                var s = g.load();
                if (s && s.preset) return String(s.preset).replace(/^auto:/, '');
            }
        } catch (e) { /* ignore */ }
        return 'balanced';
    }

    function isHigh() {
        var p = presetName();
        return p === 'high' || p === 'ultra';
    }

    function ensureOverlayDiv(id, css) {
        try {
            var container = document.getElementById('canvasContainer');
            if (!container) return null;
            var el = document.getElementById(id);
            if (el) return el;
            el = document.createElement('div');
            el.id = id;
            el.setAttribute('aria-hidden', 'true');
            el.style.cssText = css + ';pointer-events:none;position:absolute;inset:0;';
            container.appendChild(el);
            return el;
        } catch (e) { return null; }
    }

    function applyVignetteGrain() {
        try {
            if (!isHigh()) return; // potato/balanced: skip postFX entirely
            ensureOverlayDiv('ggPlusVignette',
                'z-index:30;background:radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)');
            var grain = ensureOverlayDiv('ggPlusGrain', 'z-index:31;opacity:0.06');
            if (grain && !grain.__ggAnimated) {
                grain.__ggAnimated = true;
                grain.style.backgroundImage = 'repeating-conic-gradient(rgba(255,255,255,0.5) 0% 0.0001%, transparent 0.0002% 0.0004%)';
                grain.style.backgroundSize = '120px 120px';
                var last = 0;
                (function tick(t) {
                    try {
                        if (document.hidden) { setTimeout(function () { requestAnimationFrame(tick); }, 500); return; }
                        var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                        if (now - last >= OVERLAY_FPS_MS * 4) {
                            last = now;
                            var x = Math.floor(Math.random() * 120);
                            var y = Math.floor(Math.random() * 120);
                            grain.style.backgroundPosition = x + 'px ' + y + 'px';
                        }
                    } catch (e) { /* ignore */ }
                    try { requestAnimationFrame(tick); } catch (ignored) {
                        try { setTimeout(function () { tick(); }, 250); } catch (nope) { /* ignore */ }
                    }
                })();
            }
        } catch (e) { /* garnish only */ }
    }

    // 2D: lighting flicker boost. Modulates the lightingCanvas opacity with a
    // slow torch sine on high/ultra; no game-loop edits.
    function boost2DLighting() {
        try {
            if (!isHigh()) return;
            if (window.__ggPlusLightHook) return;
            window.__ggPlusLightHook = true;
            var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            (function tick() {
                try {
                    if (!document.hidden) {
                        var lc = document.getElementById('lightingCanvas');
                        if (lc) {
                            var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                            var t = (now - t0) / 1000;
                            // Subtle breathing: 0.94..1.0 opacity, torch-like.
                            var o = 0.97 + 0.03 * Math.sin(t * 2.1) * Math.sin(t * 0.63 + 1.7);
                            lc.style.opacity = o.toFixed(3);
                        }
                    }
                } catch (e) { /* ignore */ }
                try { requestAnimationFrame(function () { setTimeout(tick, OVERLAY_FPS_MS); }); }
                catch (ignored) { try { setTimeout(tick, 100); } catch (nope) { /* ignore */ } }
            })();
        } catch (e) { /* ignore */ }
    }

    // Scale particle spawns by the shared particleMult preset, both through
    // the v2 gore funnel (FourweirdGore.spawn) and the live 2D vfx object.
    // kid mode callers already pick sparkles; we only scale counts here.
    function scaleParticles() {
        try {
            var g = window.FourWeirdGore;
            if (g && typeof g.spawn === 'function' && !g.__ggPlusScaled) {
                g.__ggPlusScaled = true;
                var origSpawn = g.spawn.bind(g);
                g.spawn = function (x, y, opts) {
                    try {
                        var s = gfxSettings();
                        var o = opts ? Object.assign({}, opts) : {};
                        if (typeof o.count === 'number') {
                            o.count = Math.max(1, Math.round(o.count * s.particleMult));
                        }
                        return origSpawn(x, y, o);
                    } catch (e) {
                        try { return origSpawn(x, y, opts); } catch (ignored) { return undefined; }
                    }
                };
            }
        } catch (e) { /* ignore */ }
        try {
            var game = window.GraveGainGame;
            var vfx = game && game.vfx;
            if (vfx && !vfx.__ggPlusScaled) {
                vfx.__ggPlusScaled = true;
                ['spawnBlood', 'spawnGore', 'spawnParticles', 'burst'].forEach(function (m) {
                    try {
                        if (typeof vfx[m] !== 'function' || vfx['__ggPlus_' + m]) return;
                        vfx['__ggPlus_' + m] = true;
                        var orig = vfx[m].bind(vfx);
                        vfx[m] = function () {
                            var s = gfxSettings();
                            var args = Array.prototype.slice.call(arguments);
                            // Heuristic: scale the first numeric count-ish arg
                            // after position when the preset is potato/balanced.
                            try {
                                if (s.particleMult < 1 && args.length >= 3 && typeof args[2] === 'number') {
                                    args[2] = Math.max(1, Math.round(args[2] * s.particleMult));
                                }
                            } catch (e) { /* keep original args */ }
                            return orig.apply(null, args);
                        };
                    } catch (e) { /* one bad method must not break others */ }
                });
                // Honor shadows:false on potato/balanced for canvas shadowBlur.
                try {
                    var s2 = gfxSettings();
                    if (!s2.shadows && typeof vfx.useShadows === 'boolean') vfx.useShadows = false;
                } catch (e) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }
    }

    // 3D: pixel ratio + fog + torch flicker, applied to the live THREE
    // instance when present. All guarded; re-applied on preset changes.
    function tune3D() {
        try {
            if (!window.THREE) return;
            var game = window.GraveGainGame;
            if (!game) return;
            var s = gfxSettings();
            try {
                if (game.renderer && typeof game.renderer.setPixelRatio === 'function') {
                    var dpr = (typeof window.devicePixelRatio === 'number') ? window.devicePixelRatio : 1;
                    game.renderer.setPixelRatio(Math.min(dpr, s.pixelRatioMax));
                }
            } catch (e) { /* ignore */ }
            try {
                if (game.scene && game.scene.fog && typeof game.scene.fog.density === 'number') {
                    var p = presetName();
                    var mult = p === 'potato' ? 1.15 : (p === 'ultra' ? 0.9 : 1.0);
                    if (!game.__ggPlusFogBase) game.__ggPlusFogBase = game.scene.fog.density;
                    game.scene.fog.density = game.__ggPlusFogBase * mult;
                }
            } catch (e) { /* ignore */ }
            try {
                var flicker = presetName() === 'potato' ? 0 : (isHigh() ? 0.7 : 0.4);
                game.__ggPlusFlicker = flicker; // read by future torch loops; harmless today
                if (game.vfx && typeof game.vfx.setParticleMult === 'function') {
                    game.vfx.setParticleMult(s.particleMult);
                } else if (game.vfx && typeof game.vfx.setBudget === 'function') {
                    game.vfx.setBudget(Math.round(400 * s.particleMult));
                }
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    function boot() {
        try {
            applyVignetteGrain();
            boost2DLighting();
            scaleParticles();
            tune3D();
            var tries = 0;
            (function poll() {
                try {
                    tries += 1;
                    scaleParticles();
                    tune3D();
                    if (tries < 20) setTimeout(poll, 1000);
                } catch (e) { /* ignore */ }
            })();
            try {
                window.addEventListener('fourweird-graphics', function () {
                    try {
                        // Preset changed: re-tune 3D + drop overlays on potato.
                        tune3D();
                        scaleParticles();
                        if (!isHigh()) {
                            ['ggPlusVignette', 'ggPlusGrain'].forEach(function (id) {
                                try { var el = document.getElementById(id); if (el) el.style.display = 'none'; } catch (e) { /* ignore */ }
                            });
                        } else {
                            ['ggPlusVignette', 'ggPlusGrain'].forEach(function (id) {
                                try { var el = document.getElementById(id); if (el) el.style.display = ''; } catch (e) { /* ignore */ }
                            });
                            applyVignetteGrain();
                            boost2DLighting();
                        }
                    } catch (e) { /* ignore */ }
                });
            } catch (e) { /* ignore */ }
        } catch (e) { /* never break the game */ }
    }

    try {
        window.GraveGainGraphicsPlus = { VERSION: VERSION, retune: tune3D };
    } catch (e) { /* window unwritable */ }

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (e) { try { boot(); } catch (ignored) { /* ignore */ } }
})();
