/**
 * 4weird Games - shared graphics-settings logic (fourweird-graphics.js).
 *
 * Game-agnostic quality presets for ALL 4weird HTML games (2D canvas + Three.js).
 * Vanilla JS, no dependencies, never throws. Safe to load before any game code:
 *   <script src="../fourweird-graphics.js"></script>
 *
 * Usage - 2D canvas (particleMult + shadows off):
 *   var gfx = window.FourWeirdGraphics;
 *   gfx.auto(function (preset) {
 *     var q = gfx.get(preset);               // { pixelRatioMax, particleMult, ... }
 *     var particleCount = Math.floor(baseCount * q.particleMult);
 *     var useShadows = q.shadows;            // false on potato/balanced: skip shadowBlur
 *   });
 *   window.addEventListener('fourweird-graphics', function (e) {
 *     var q = e.detail.settings;             // re-apply particleCount / shadowBlur live
 *   });
 *
 * Usage - Three.js (pixelRatio + lights + shadows):
 *   var gfx = window.FourWeirdGraphics;
 *   gfx.auto(function (preset) {
 *     var q = gfx.get(preset);
 *     renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatioMax));
 *     renderer.shadowMap.enabled = q.shadows;
 *     scene.traverse(function (o) { if (o.material) o.material.needsUpdate = true; });
 *     // keep at most q.lightCount dynamic lights; gate composer pass on q.postFX
 *   });
 *
 * Stored under localStorage key `fourweird-graphics-v1`. Manual choices win:
 * `auto()` reuses a saved preset and only benchmarks on first run.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'fourweird-graphics-v1';
    var EVENT_NAME = 'fourweird-graphics';
    var ATTR_NAME = 'data-fourweird-graphics';
    var BENCH_FRAMES = 60;
    var BENCH_TIMEOUT_MS = 3000;

    var ORDER = ['potato', 'balanced', 'high', 'ultra'];

    var PRESETS = {
        potato:   { pixelRatioMax: 0.5, particleMult: 0.25, lightCount: 1, shadows: false, postFX: false, textureScale: 0.5 },
        balanced: { pixelRatioMax: 1.0, particleMult: 0.6,  lightCount: 2, shadows: false, postFX: false, textureScale: 0.75 },
        high:     { pixelRatioMax: 1.5, particleMult: 1.0,  lightCount: 3, shadows: true,  postFX: false, textureScale: 1.0 },
        ultra:    { pixelRatioMax: 2.0, particleMult: 1.5,  lightCount: 4, shadows: true,  postFX: true,  textureScale: 1.0 }
    };

    function isValidPreset(name) {
        return typeof name === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, name);
    }

    // Strip the `auto:` prefix auto() saves, so `auto:balanced` resolves to `balanced`.
    function normalize(name) {
        try {
            if (typeof name !== 'string') return null;
            var n = name.slice(0, 5) === 'auto:' ? name.slice(5) : name;
            return isValidPreset(n) ? n : null;
        } catch (e) {
            return null;
        }
    }

    // Copy so games cannot mutate the shared table.
    function get(name) {
        try {
            var n = normalize(name) || 'balanced';
            var p = PRESETS[n];
            return {
                pixelRatioMax: p.pixelRatioMax,
                particleMult: p.particleMult,
                lightCount: p.lightCount,
                shadows: p.shadows,
                postFX: p.postFX,
                textureScale: p.textureScale
            };
        } catch (e) {
            return {
                pixelRatioMax: 1.0, particleMult: 0.6, lightCount: 2,
                shadows: false, postFX: false, textureScale: 0.75
            };
        }
    }

    function getWebGLRendererString() {
        try {
            var canvas = document.createElement('canvas');
            var gl = null;
            try {
                gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            } catch (e) {
                gl = null;
            }
            if (!gl) return '';
            try {
                var ext = gl.getExtension('WEBGL_debug_renderer_info');
                if (ext) {
                    var s = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                    if (s) return String(s).toLowerCase();
                }
            } catch (e) { /* masked renderer; fall through */ }
            try {
                var v = gl.getParameter(gl.VERSION);
                if (v) return String(v).toLowerCase();
            } catch (e) { /* version unreadable */ }
        } catch (e) { /* canvas/webgl unavailable */ }
        return '';
    }

    // Heuristic first guess: deviceMemory, hardwareConcurrency, devicePixelRatio,
    // mobile UA, WebGL renderer string. Always returns a valid preset name.
    function detectPreset() {
        try {
            var score = 2; // start at 'high'
            var nav = window.navigator || {};
            var mem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : NaN;
            var cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : NaN;
            var dpr = typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1;
            var ua = '';
            try {
                ua = String(nav.userAgent || '').toLowerCase();
            } catch (e) {
                ua = '';
            }
            var mobile = /mobi|android|iphone|ipad|ipod|mobile|tablet|phone/.test(ua);

            if (!isNaN(mem)) {
                if (mem <= 2) score -= 2;
                else if (mem <= 4) score -= 1;
                else if (mem >= 8) score += 1;
            }
            if (!isNaN(cores)) {
                if (cores <= 2) score -= 2;
                else if (cores <= 4) score -= 1;
                else if (cores >= 8) score += 1;
            }
            if (mobile) score -= 1;
            if (dpr > 2.5) score -= 1; // hi-dpi fill-rate cost on weak GPUs

            var renderer = getWebGLRendererString();
            if (!renderer) {
                score -= 1; // no WebGL: assume weak / software rendering
            } else if (/swiftshader|llvmpipe|software|basic render|virtualbox|vmware|parallels/.test(renderer)) {
                score -= 2;
            } else if (/mali-|adreno [23]|adreno 4|powervr|videocore|intel hd graphics/.test(renderer)) {
                score -= 1;
            } else if (/rtx|radeon rx|m[123]( |$)|apple m/i.test(renderer)) {
                score += 1;
            }

            if (score < 0) score = 0;
            if (score > 3) score = 3;
            return ORDER[score];
        } catch (e) {
            return 'balanced';
        }
    }

    // ~60-frame rAF timing loop. Calls cb once with 'potato' (>28ms),
    // 'balanced' (>20ms), 'high' (>13ms), else 'ultra'. Times out safely.
    function benchmarkPreset(cb) {
        var done = false;
        function finish(preset) {
            if (done) return;
            done = true;
            try {
                if (typeof cb === 'function') cb(preset);
            } catch (e) { /* caller callback must never break the game */ }
        }
        try {
            var now = (typeof performance !== 'undefined' && performance.now)
                ? function () { return performance.now(); }
                : function () { return Date.now(); };
            var frames = 0;
            var first = -1;
            var last = -1;
            var raf = (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function')
                ? function (fn) { window.requestAnimationFrame(fn); }
                : function (fn) { setTimeout(fn, 16); };
            var timer = null;
            try {
                timer = setTimeout(function () {
                    try {
                        if (timer) clearTimeout(timer);
                    } catch (e) { /* noop */ }
                    finish('balanced'); // inconclusive: safe middle ground
                }, BENCH_TIMEOUT_MS);
            } catch (e) {
                timer = null;
            }
            function tick() {
                if (done) return;
                var t = -1;
                try {
                    t = now();
                } catch (e) {
                    t = -1;
                }
                if (first < 0) first = t;
                last = t;
                frames += 1;
                if (frames >= BENCH_FRAMES) {
                    var avg = -1;
                    try {
                        if (first >= 0 && last >= 0 && frames > 1) avg = (last - first) / (frames - 1);
                    } catch (e) {
                        avg = -1;
                    }
                    try {
                        if (timer) clearTimeout(timer);
                    } catch (e) { /* noop */ }
                    if (avg < 0) {
                        finish('balanced');
                    } else if (avg > 28) {
                        finish('potato');
                    } else if (avg > 20) {
                        finish('balanced');
                    } else if (avg > 13) {
                        finish('high');
                    } else {
                        finish('ultra');
                    }
                    return;
                }
                try {
                    raf(tick);
                } catch (e) {
                    try {
                        if (timer) clearTimeout(timer);
                    } catch (ignored) { /* noop */ }
                    finish('balanced');
                }
            }
            try {
                raf(tick);
            } catch (e) {
                try {
                    if (timer) clearTimeout(timer);
                } catch (ignored) { /* noop */ }
                finish('balanced');
            }
        } catch (e) {
            finish('balanced');
        }
        return undefined;
    }

    // Load saved settings ({ preset, custom } | null). Safe JSON parse.
    function load() {
        try {
            var store = null;
            try {
                store = window.localStorage;
                if (!store) return null;
            } catch (e) {
                return null;
            }
            var raw = null;
            try {
                raw = store.getItem(STORAGE_KEY);
            } catch (e) {
                return null;
            }
            if (typeof raw !== 'string' || !raw) return null;
            var parsed = null;
            try {
                parsed = JSON.parse(raw);
            } catch (e) {
                return null;
            }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
            if (!normalize(parsed.preset)) return null;
            var out = { preset: String(parsed.preset) };
            if (parsed.custom && typeof parsed.custom === 'object' && !Array.isArray(parsed.custom)) {
                out.custom = parsed.custom;
            }
            return out;
        } catch (e) {
            return null;
        }
    }

    // Persist a preset choice. `preset` may carry the `auto:` prefix. Quota-guarded.
    function save(preset, custom) {
        try {
            if (!normalize(preset)) return false;
            var store = null;
            try {
                store = window.localStorage;
                if (!store) return false;
            } catch (e) {
                return false;
            }
            var payload = { preset: String(preset), v: 1 };
            try {
                if (custom && typeof custom === 'object' && !Array.isArray(custom)) {
                    payload.custom = custom;
                }
                store.setItem(STORAGE_KEY, JSON.stringify(payload));
                return true;
            } catch (e) {
                return false; // quota / access denied
            }
        } catch (e) {
            return false;
        }
    }

    // Broadcast a preset: document data attribute + CustomEvent. No THREE dependency.
    function apply(preset) {
        var name = 'balanced';
        try {
            name = normalize(preset) || 'balanced';
            var settings = get(name);
            try {
                if (typeof document !== 'undefined' && document.documentElement) {
                    document.documentElement.setAttribute(ATTR_NAME, name);
                }
            } catch (e) { /* DOM unavailable */ }
            try {
                var detail = { preset: name, settings: settings };
                var evt = null;
                try {
                    evt = new CustomEvent(EVENT_NAME, { detail: detail });
                } catch (e) {
                    evt = null;
                    try {
                        if (typeof document !== 'undefined' && document.createEvent) {
                            evt = document.createEvent('CustomEvent');
                            evt.initCustomEvent(EVENT_NAME, false, false, detail);
                        }
                    } catch (ignored) {
                        evt = null;
                    }
                }
                if (evt) {
                    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                        window.dispatchEvent(evt);
                    } else if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
                        document.dispatchEvent(evt);
                    }
                }
            } catch (e) { /* event dispatch is best-effort */ }
            return settings;
        } catch (e) {
            return get('balanced');
        }
    }

    // First run: detect -> benchmark (downgrade only) -> save `auto:<preset>`.
    // Repeat runs: reuse the saved preset. Always calls onDone(preset) once.
    function auto(onDone) {
        var settled = false;
        function finish(preset) {
            if (settled) return;
            settled = true;
            var name = normalize(preset) || 'balanced';
            try {
                apply(name);
            } catch (e) { /* apply is best-effort here; onDone still fires */ }
            try {
                if (typeof onDone === 'function') onDone(name);
            } catch (e) { /* caller callback must never break the game */ }
        }
        try {
            var saved = load();
            if (saved && normalize(saved.preset)) {
                finish(normalize(saved.preset));
                return undefined;
            }
            var detected = detectPreset();
            if (!isValidPreset(detected)) detected = 'balanced';
            try {
                benchmarkPreset(function (measured) {
                    try {
                        var m = normalize(measured) || detected;
                        // Confirm-or-downgrade: never upgrade past the heuristic guess.
                        var di = ORDER.indexOf(detected);
                        var mi = ORDER.indexOf(m);
                        if (di < 0) di = 1;
                        if (mi < 0) mi = di;
                        var final = ORDER[Math.min(di, mi)];
                        try {
                            save('auto:' + final);
                        } catch (e) { /* storage best-effort */ }
                        finish(final);
                    } catch (e) {
                        finish(detected);
                    }
                });
            } catch (e) {
                finish(detected);
            }
        } catch (e) {
            finish('balanced');
        }
        return undefined;
    }

    var api = {
        PRESETS: PRESETS,
        ORDER: ORDER,
        STORAGE_KEY: STORAGE_KEY,
        EVENT_NAME: EVENT_NAME,
        get: get,
        detectPreset: detectPreset,
        benchmarkPreset: benchmarkPreset,
        load: load,
        save: save,
        apply: apply,
        auto: auto
    };

    try {
        window.FourWeirdGraphics = api;
    } catch (e) { /* window unwritable; module still parses */ }
})();
