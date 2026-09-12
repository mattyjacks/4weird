(function () {
    'use strict';

    // GraveGain3D graphics preset manager. Reuses the shared
    // window.FourWeirdGraphics helper when present (SPEC: PRESETS,
    // detectPreset, benchmarkPreset, load, save, apply, auto) but works
    // standalone via a local fallback so the game never breaks without it.
    // Every shared-helper call is guarded with typeof checks.
    //
    // Dual-write persistence: the chosen preset is stored in the shared
    // 'fourweird-graphics-v1' key AND merged into the existing
    // GraveGain3D_Settings_V1 store as `graphicsPreset`. Existing keys are
    // only ever read/merged, never renamed or dropped.

    var SHARED_KEY = 'fourweird-graphics-v1';
    var PRESET_ORDER = ['ultra', 'high', 'balanced', 'potato'];
    var VALID_PRESETS = { auto: true, potato: true, balanced: true, high: true, ultra: true };

    // Local fallback preset table (mirrors the shared SPEC shape).
    var LOCAL_PRESETS = {
        potato:   { pixelRatio: 0.5,  shadows: false, particleScale: 0.35, torches: false, fx: false },
        balanced: { pixelRatio: 0.85, shadows: false, particleScale: 0.65, torches: true,  fx: true },
        high:     { pixelRatio: 1.25, shadows: false, particleScale: 1.0,  torches: true,  fx: true },
        ultra:    { pixelRatio: 1.5,  shadows: true,  particleScale: 1.2,  torches: true,  fx: true }
    };

    var state = {
        current: null,       // resolved concrete preset (never 'auto')
        mode: 'auto',        // raw select value, 'auto' included
        game: null,
        bound: false,
        autoRan: false,
        lastBenchmark: null  // { preset, avgFps, at }
    };

    function hasShared() {
        try { return typeof window.FourWeirdGraphics !== 'undefined' && !!window.FourWeirdGraphics; }
        catch (_) { return false; }
    }

    function sharedFn(name) {
        try {
            var fw = window.FourWeirdGraphics;
            if (fw && typeof fw[name] === 'function') return fw[name].bind(fw);
        } catch (_) { /* fall through */ }
        return null;
    }

    function presetTable() {
        try {
            var fw = window.FourWeirdGraphics;
            if (fw && fw.PRESETS && typeof fw.PRESETS === 'object') return fw.PRESETS;
        } catch (_) { /* fallback below */ }
        return LOCAL_PRESETS;
    }

    function clampPresetName(name) {
        if (name && VALID_PRESETS[name]) return name;
        return null;
    }

    function findGame() {
        try {
            if (state.game) return state.game;
            if (window.GraveGainGame) return window.GraveGainGame;
        } catch (_) { /* ignore */ }
        return null;
    }

    function safeGet(key) {
        try { return window.localStorage.getItem(key); }
        catch (_) { return null; }
    }

    function safeSet(key, value) {
        try { window.localStorage.setItem(key, value); return true; }
        catch (_) { return false; }
    }

    function safeParse(raw) {
        if (raw === undefined || raw === null) return null;
        try { return JSON.parse(raw); }
        catch (_) { return null; }
    }

    // ---- persistence (dual-write, never break existing keys) ----

    function loadSharedStore() {
        // Prefer the shared helper's own loader when available.
        var load = sharedFn('load');
        if (load) {
            try {
                var v = load();
                if (typeof v === 'string' && clampPresetName(v)) return v;
                if (v && typeof v === 'object' && clampPresetName(v.preset)) return v.preset;
            } catch (_) { /* fall through to raw read */ }
        }
        var parsed = safeParse(safeGet(SHARED_KEY));
        if (typeof parsed === 'string' && clampPresetName(parsed)) return parsed;
        if (parsed && typeof parsed === 'object' && clampPresetName(parsed.preset)) return parsed.preset;
        return null;
    }

    function loadGameStore() {
        try {
            if (window.GraveGainSaveSystem && typeof window.GraveGainSaveSystem.loadSettings === 'function') {
                var s = window.GraveGainSaveSystem.loadSettings();
                if (s && clampPresetName(s.graphicsPreset)) return s.graphicsPreset;
                return null;
            }
        } catch (_) { /* fall through */ }
        var parsed = safeParse(safeGet('GraveGain3D_Settings_V1'));
        if (parsed && clampPresetName(parsed.graphicsPreset)) return parsed.graphicsPreset;
        return null;
    }

    function loadSavedPreset() {
        return loadGameStore() || loadSharedStore() || null;
    }

    function persistPreset(mode) {
        var clean = clampPresetName(mode) ? mode : 'auto';
        // 1) Shared key (via helper when available, raw write otherwise).
        var save = sharedFn('save');
        if (save) {
            try { save(clean); } catch (_) { safeSet(SHARED_KEY, JSON.stringify({ preset: clean })); }
        } else {
            safeSet(SHARED_KEY, JSON.stringify({ preset: clean }));
        }
        // 2) Existing GraveGain settings key: merge, never clobber.
        try {
            var prev = null;
            if (window.GraveGainSaveSystem && typeof window.GraveGainSaveSystem.loadSettings === 'function') {
                prev = window.GraveGainSaveSystem.loadSettings() || {};
            } else {
                prev = safeParse(safeGet('GraveGain3D_Settings_V1')) || {};
            }
            if (!prev || typeof prev !== 'object') prev = {};
            prev.graphicsPreset = clean;
            if (window.GraveGainSaveSystem && typeof window.GraveGainSaveSystem.saveSettings === 'function') {
                window.GraveGainSaveSystem.saveSettings(prev);
            } else {
                try { safeSet('GraveGain3D_Settings_V1', JSON.stringify(prev)); } catch (_) { /* ignore */ }
            }
        } catch (_) { /* persistence must never break the game */ }
    }

    // ---- UI helpers ----

    function $(id) {
        try { return document.getElementById(id); }
        catch (_) { return null; }
    }

    function setResultLine(html) {
        var el = $('graphicsBenchmarkResult');
        if (el) el.innerHTML = html;
    }

    function notify(text) {
        try {
            var game = findGame();
            if (game && game.combatText && typeof game.combatText.showBanner === 'function') {
                game.combatText.showBanner(String(text));
                return;
            }
        } catch (_) { /* fallback below */ }
        try {
            var host = $('gameMain') || document.body;
            var toast = document.createElement('div');
            toast.textContent = String(text);
            toast.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
                'background:rgba(0,0,0,0.85);border:1px solid #8b5cf6;color:#f5e6c8;' +
                'padding:10px 18px;border-radius:8px;font-size:0.85rem;z-index:9999;';
            host.appendChild(toast);
            setTimeout(function () { try { toast.remove(); } catch (_) { /* ignore */ } }, 3500);
        } catch (_) { /* ignore */ }
    }

    function emitPresetEvent(name, reason) {
        try {
            window.dispatchEvent(new window.CustomEvent('gravegain-graphics-preset', {
                detail: { preset: name, reason: reason || 'manual' }
            }));
        } catch (_) { /* ignore */ }
    }

    // ---- applying a preset ----

    function resolveConcrete(name) {
        if (name === 'auto' || !clampPresetName(name)) {
            return state.current && clampPresetName(state.current) ? state.current : 'balanced';
        }
        return name;
    }

    function applyToRenderer(game, def, name) {
        if (!game || !game.renderer) return;
        try {
            var dpr = window.devicePixelRatio || 1;
            var ratio = Number(def && def.pixelRatio);
            if (!isFinite(ratio) || ratio <= 0) ratio = 1;
            // Clamp to device pixels so low-end GPUs never upscale.
            ratio = Math.min(ratio, Math.max(dpr, 0.5));
            ratio = Math.max(0.4, ratio);
            game.renderer.setPixelRatio(ratio);
            try {
                var w = game.container ? (game.container.clientWidth || 1000) : 1000;
                var h = game.container ? (game.container.clientHeight || 600) : 600;
                game.renderer.setSize(w, h, false);
            } catch (_) { /* resize is best-effort */ }
            // Keep the PerformanceManager in sync so its next sample() does
            // not snap the ratio back behind our back.
            if (game.performance) {
                try { game.performance.pixelRatio = ratio; } catch (_) { /* ignore */ }
            }
        } catch (_) { /* ignore */ }
        try {
            var wantShadows = !!(def && def.shadows);
            if (game.renderer.shadowMap) game.renderer.shadowMap.enabled = wantShadows;
            if (game.renderer.shadowMap) game.renderer.shadowMap.needsUpdate = true;
        } catch (_) { /* ignore */ }
    }

    function applyToParticles(game, def) {
        if (!game || !game.vfx) return;
        var scale = Number(def && def.particleScale);
        if (!isFinite(scale) || scale <= 0) scale = 1;
        try { game.vfx.budgetScale = scale; } catch (_) { /* ignore */ }
        // Wrap spawn entry points once so counts scale without touching
        // particle-system.js. Guarded: if the API differs, skip silently.
        try {
            var vfx = game.vfx;
            if (!vfx.__gfxBudgetWrapped) {
                vfx.__gfxBudgetWrapped = true;
                ['spawnSparks', 'spawnBlood'].forEach(function (method) {
                    if (typeof vfx[method] !== 'function') return;
                    var orig = vfx[method].bind(vfx);
                    vfx[method] = function (x, z, color, count) {
                        var n = Number(count);
                        if (isFinite(n)) {
                            var s = Number(vfx.budgetScale);
                            if (!isFinite(s) || s <= 0) s = 1;
                            count = Math.max(1, Math.round(n * s));
                        }
                        return orig(x, z, color, count);
                    };
                });
            }
        } catch (_) { /* ignore */ }
    }

    function applyToTorches(def) {
        // The per-frame loop reads the Dynamic Torches checkbox directly,
        // so syncing the checkbox is the durable torch hook. Also emit the
        // event for any listener (HUD/FX layers) that reacts directly.
        try {
            var box = $('settingsDynamicLights');
            if (box && def && typeof def.torches === 'boolean') box.checked = def.torches;
        } catch (_) { /* ignore */ }
    }

    function applyPreset(name, reason) {
        var concrete = resolveConcrete(name);
        if (!clampPresetName(concrete) || concrete === 'auto') concrete = 'balanced';
        var table = presetTable();
        var def = (table && table[concrete]) || LOCAL_PRESETS[concrete] || LOCAL_PRESETS.balanced;
        // Let the shared helper apply first when it can (single source of
        // truth for the shared table), then enforce our renderer binding.
        var apply = sharedFn('apply');
        if (apply) {
            try { apply(concrete); } catch (_) { /* we still apply locally below */ }
        }
        var game = findGame();
        if (game) {
            state.game = game;
            applyToRenderer(game, def, concrete);
            applyToParticles(game, def);
        }
        applyToTorches(def);
        state.current = concrete;
        if (name === 'auto' || !clampPresetName(name)) state.mode = 'auto';
        else state.mode = name;
        try {
            var sel = $('settingsGraphicsPreset');
            if (sel && sel.value !== state.mode) sel.value = state.mode;
        } catch (_) { /* ignore */ }
        emitPresetEvent(concrete, reason || 'manual');
        return concrete;
    }

    // ---- benchmarking / auto-detect ----

    function fpsToPreset(fps) {
        if (fps >= 55) return 'ultra';
        if (fps >= 40) return 'high';
        if (fps >= 25) return 'balanced';
        return 'potato';
    }

    function localBenchmark(done) {
        // ~60-frame rAF sample, non-blocking. Falls back to 'balanced' when
        // rAF is unavailable or yields no frames.
        try {
            var frames = [];
            var last = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            var count = 0;
            var TARGET = 60;
            var now = function () {
                return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            };
            var step = function () {
                var t = now();
                frames.push(t - last);
                last = t;
                count++;
                if (count < TARGET) {
                    try { requestAnimationFrame(step); }
                    catch (_) { finish(); }
                } else {
                    finish();
                }
            };
            var finish = function () {
                var avg = 16.7;
                if (frames.length) {
                    var sum = 0;
                    for (var i = 0; i < frames.length; i++) sum += frames[i];
                    avg = sum / frames.length;
                }
                var fps = avg > 0 ? 1000 / avg : 60;
                done({ preset: fpsToPreset(fps), avgFps: Math.round(fps * 10) / 10 });
            };
            try { requestAnimationFrame(step); }
            catch (_) { done({ preset: 'balanced', avgFps: 0 }); }
            // Safety timeout: never leave the UI hanging.
            setTimeout(function () {
                if (count < TARGET) { count = TARGET; finish(); }
            }, 4000);
        } catch (_) {
            done({ preset: 'balanced', avgFps: 0 });
        }
    }

    function benchmarkAndApply(opts) {
        opts = opts || {};
        setResultLine('<span style="color:#a78bfa;">Benchmarking… measuring frame rate.</span>');
        var finish = function (preset, avgFps, via) {
            var applied = applyPreset(preset, via || 'benchmark');
            state.lastBenchmark = { preset: applied, avgFps: avgFps, at: Date.now() };
            persistPreset($('settingsGraphicsPreset') ? ($('settingsGraphicsPreset').value || applied) : applied);
            setResultLine('Detected: <strong>' + applied + '</strong>' +
                (avgFps ? ' (' + avgFps + ' fps avg)' : '') +
                ' — applied: <strong>' + applied + '</strong>');
            if (!opts.silent) notify('⚙ Graphics: ' + applied + (avgFps ? ' (' + avgFps + ' fps)' : ''));
            return applied;
        };
        // Prefer the shared benchmark when present.
        var bench = sharedFn('benchmarkPreset');
        if (bench) {
            try {
                var out = bench();
                if (out && typeof out.then === 'function') {
                    out.then(function (r) {
                        var p = r && (r.preset || r);
                        finish(clampPresetName(p) ? p : 'balanced', (r && r.avgFps) || 0, 'benchmark');
                    }, function () {
                        localBenchmark(function (r) { finish(r.preset, r.avgFps, 'benchmark'); });
                    });
                    return;
                }
                if (out && clampPresetName(out.preset || out)) {
                    finish(clampPresetName(out.preset || out), out.avgFps || 0, 'benchmark');
                    return;
                }
            } catch (_) { /* fall through to local */ }
        }
        localBenchmark(function (r) { finish(r.preset, r.avgFps, 'benchmark'); });
    }

    function autoDetect(reason) {
        // Shared auto() when present, otherwise benchmark locally.
        var auto = sharedFn('auto');
        if (auto) {
            try {
                var out = auto();
                if (out && typeof out.then === 'function') {
                    return out.then(function (r) {
                        var p = clampPresetName(r && (r.preset || r)) ? (r.preset || r) : 'balanced';
                        var applied = applyPreset(p, reason || 'auto');
                        state.lastBenchmark = { preset: applied, avgFps: (r && r.avgFps) || 0, at: Date.now() };
                        return applied;
                    }, function () {
                        return new Promise(function (resolve) {
                            localBenchmark(function (r) {
                                resolve(applyPreset(r.preset, reason || 'auto'));
                            });
                        });
                    });
                }
                var p = clampPresetName(out && (out.preset || out)) ? (out.preset || out) : 'balanced';
                return Promise.resolve(applyPreset(p, reason || 'auto'));
            } catch (_) { /* fall through */ }
        }
        var detect = sharedFn('detectPreset');
        if (detect) {
            try {
                var d = detect();
                if (clampPresetName(d)) return Promise.resolve(applyPreset(d, reason || 'auto'));
            } catch (_) { /* fall through */ }
        }
        return new Promise(function (resolve) {
            localBenchmark(function (r) {
                state.lastBenchmark = { preset: r.preset, avgFps: r.avgFps, at: Date.now() };
                resolve(applyPreset(r.preset, reason || 'auto'));
            });
        });
    }

    // Auto-degrade: one step down the ladder, never up (avoids oscillation).
    // Called by PerformanceManager after sustained slow windows.
    function autoDegrade(reason) {
        var cur = state.current && clampPresetName(state.current) ? state.current : 'high';
        var idx = PRESET_ORDER.indexOf(cur);
        if (idx < 0) idx = 1;
        if (idx >= PRESET_ORDER.length - 1) return cur; // already potato
        var next = PRESET_ORDER[idx + 1];
        applyPreset(next, reason || 'auto-degrade');
        persistPreset(state.mode === 'auto' ? 'auto' : next);
        try {
            setResultLine('Auto-adjusted for smoothness: <strong>' + next + '</strong> (was ' + cur + ').');
        } catch (_) { /* ignore */ }
        notify('⚙ Graphics auto-adjusted → ' + next + ' for smoothness');
        try {
            window.dispatchEvent(new window.CustomEvent('gravegain-graphics-autodegrade', {
                detail: { from: cur, to: next, reason: reason || 'sustained slow frames' }
            }));
        } catch (_) { /* ignore */ }
        return next;
    }

    // ---- boot / wiring ----

    function syncSelectFromState() {
        try {
            var sel = $('settingsGraphicsPreset');
            if (sel) sel.value = state.mode || 'auto';
        } catch (_) { /* ignore */ }
        if (state.lastBenchmark) {
            setResultLine('Detected: <strong>' + state.lastBenchmark.preset + '</strong>' +
                (state.lastBenchmark.avgFps ? ' (' + state.lastBenchmark.avgFps + ' fps avg)' : '') +
                ' — applied: <strong>' + (state.current || state.lastBenchmark.preset) + '</strong>');
        } else if (state.current) {
            setResultLine('Applied preset: <strong>' + state.current + '</strong>');
        }
    }

    function bindUI() {
        if (state.bound) return;
        state.bound = true;
        try {
            var sel = $('settingsGraphicsPreset');
            if (sel) {
                sel.addEventListener('change', function () {
                    var v = sel.value;
                    if (v === 'auto') {
                        persistPreset('auto');
                        state.mode = 'auto';
                        autoDetect('manual-auto').then(function (applied) {
                            persistPreset('auto');
                            syncSelectFromState();
                            notify('⚙ Graphics auto: ' + applied);
                        });
                    } else if (clampPresetName(v)) {
                        state.mode = v;
                        applyPreset(v, 'manual');
                        persistPreset(v);
                        syncSelectFromState();
                    }
                });
            }
            var benchBtn = $('btnGraphicsBenchmark');
            if (benchBtn) {
                benchBtn.addEventListener('click', function () { benchmarkAndApply({}); });
            }
            // Persist alongside the existing Save Configs flow without
            // touching its handler: capture-phase listener only dual-writes.
            var saveBtn = $('btnSaveSettings');
            if (saveBtn) {
                saveBtn.addEventListener('click', function () {
                    try {
                        var v = $('settingsGraphicsPreset') ? $('settingsGraphicsPreset').value : state.mode;
                        persistPreset(clampPresetName(v) ? v : 'auto');
                    } catch (_) { /* ignore */ }
                }, true);
            }
        } catch (_) { /* UI wiring is best-effort */ }
    }

    function bootFromMenu() {
        bindUI();
        var saved = loadSavedPreset();
        if (saved && clampPresetName(saved)) {
            state.mode = saved;
            // Apply after the game exists; poll briefly for the boot.
            var tries = 0;
            var applySaved = function () {
                var game = findGame();
                if (game) {
                    state.game = game;
                    applyPreset(saved, 'saved');
                    syncSelectFromState();
                    return;
                }
                tries++;
                if (tries < 50) setTimeout(applySaved, 200);
                else syncSelectFromState();
            };
            applySaved();
            return;
        }
        // No saved preset: non-blocking auto-detect on menu show.
        if (state.autoRan) return;
        state.autoRan = true;
        state.mode = 'auto';
        setResultLine('<span style="color:#a78bfa;">Detecting optimal graphics…</span>');
        var run = function () {
            var game = findGame();
            if (game) state.game = game;
            autoDetect('boot-auto').then(function (applied) {
                persistPreset('auto');
                syncSelectFromState();
                notify('⚙ Optimal graphics detected: ' + applied);
            });
        };
        try {
            if (window.requestIdleCallback) window.requestIdleCallback(function () { setTimeout(run, 0); });
            else setTimeout(run, 600);
        } catch (_) { setTimeout(run, 600); }
    }

    function init(gameRef) {
        if (gameRef) {
            try { state.game = gameRef; } catch (_) { /* ignore */ }
        }
        bindUI();
        var game = findGame();
        if (game) state.game = game;
        var saved = loadSavedPreset();
        if (saved && clampPresetName(saved)) {
            state.mode = saved;
            if (game) applyPreset(saved, 'saved');
        }
        syncSelectFromState();
        return api;
    }

    var api = {
        init: init,
        applyPreset: applyPreset,
        benchmarkAndApply: benchmarkAndApply,
        autoDetect: autoDetect,
        autoDegrade: autoDegrade,
        getCurrent: function () { return state.current; },
        getMode: function () { return state.mode; },
        getLastBenchmark: function () { return state.lastBenchmark; },
        ORDER: PRESET_ORDER.slice()
    };

    window.GraveGainGraphicsSettings = api;

    // Defer boot so index.html script order never matters: wait for DOM,
    // then for the game instance (created on GraveGain's own DOMContentLoaded).
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootFromMenu);
        } else {
            bootFromMenu();
        }
    } catch (_) { /* never break boot */ }
})();
