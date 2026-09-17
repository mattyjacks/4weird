/* GraveGain4D dream-rift: riftzones.js — Light/Gloom brane fields, chrono-eddies, w-storms.
 *
 * Rift zones are volumes the player walks into; each entry re-dreams the
 * dungeon beyond view (via window.GG4D_Dream.redream) and applies a local
 * field effect:
 *   - light brane: warm elven-glow field — small heal tick, w pushed +kata.
 *   - gloom brane: NecroGenesis cold field — corruption ticks up, w pushed -ana.
 *   - chrono-eddy: slow-mo bubble — timeScale < 1 while inside.
 *   - w-storm: unstable weather — periodic random ana/kata nudges with a
 *     visible warning + countdown before each gust.
 *
 * Deterministic placement: zone layout derives from the dream seed so saves
 * round-trip (store zones in state.rifts). Vanilla JS IIFE, idempotent via
 * window.GG4D_Rifts. Never throws. No fullscreen / dblclick code.
 */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        if (window.GG4D_Rifts) return;

        var VERSION = '1.0.0';

        var TYPES = ['light', 'gloom', 'eddy', 'wstorm'];

        var DEFAULTS = {
            light:  { wPush: 0.35, healPerSec: 2.0, radius: 3.0, tint: '#ffd77f', label: 'Light Brane' },
            gloom:  { wPush: -0.35, rotPerSec: 1.0, radius: 3.0, tint: '#7a2bff', label: 'Gloom Brane' },
            eddy:   { timeScale: 0.35, radius: 2.5, tint: '#3af2e8', label: 'Chrono-Eddy' },
            wstorm: { gustPeriod: 3.0, warnTime: 1.2, gustW: 1.5, radius: 4.0, tint: '#ff5f3a', label: 'W-Storm' }
        };

        function num(v, dflt) {
            try {
                if (typeof v === 'number' && isFinite(v)) return v;
                var n = Number(v);
                if (isFinite(n)) return n;
            } catch (_) { /* ignore */ }
            return dflt;
        }

        function dream() {
            try { return window.GG4D_Dream || null; } catch (_) { return null; }
        }

        function ensureState(state) {
            try {
                state = state && typeof state === 'object' ? state : {};
                if (!state.rifts || typeof state.rifts !== 'object') state.rifts = {};
                if (!Array.isArray(state.rifts.zones)) state.rifts.zones = [];
                if (!state.rifts.activeId) state.rifts.activeId = null;
                if (state.rifts.storm == null || typeof state.rifts.storm !== 'object') {
                    state.rifts.storm = { warned: false, tNext: 0, tWarn: 0 };
                }
                return state;
            } catch (_) {
                return { rifts: { zones: [], activeId: null, storm: { warned: false, tNext: 0, tWarn: 0 } } };
            }
        }

        /* Deterministic zone scatter: n zones from seed, kept clear of spawn. */
        function generate(state, seed, opts) {
            try {
                state = ensureState(state);
                opts = opts && typeof opts === 'object' ? opts : {};
                var D = dream();
                var s = D ? D.uint32(seed) : (Number(seed) >>> 0 || 1);
                var count = Math.max(1, Math.min(12, Math.floor(num(opts.count, 5))));
                var span = Math.max(4, num(opts.span, 24));
                var rnd = (function (a) {
                    a = (a ^ 0x9E3779B9) >>> 0;
                    return function () {
                        try {
                            a = (a + 0x6D2B79F5) >>> 0;
                            var t = a;
                            t = Math.imul(t ^ (t >>> 15), t | 1);
                            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                        } catch (_) { return 0.5; }
                    };
                })(s);
                var zones = [];
                for (var i = 0; i < count; i++) {
                    var type = TYPES[Math.floor(rnd() * TYPES.length) % TYPES.length];
                    var def = DEFAULTS[type];
                    var x = (rnd() * 2 - 1) * span;
                    var y = (rnd() * 2 - 1) * span;
                    // Keep spawn clearing: push zones out of a 4-unit disc at origin.
                    if (x * x + y * y < 16) { x += (x >= 0 ? 5 : -5); y += (y >= 0 ? 5 : -5); }
                    zones.push({
                        id: 'rift-' + (s >>> 0).toString(16) + '-' + i,
                        type: type,
                        x: Math.round(x * 10) / 10,
                        y: Math.round(y * 10) / 10,
                        w: type === 'light' ? 1 : type === 'gloom' ? -1 : 0,
                        radius: def.radius,
                        tint: def.tint,
                        label: def.label,
                        entered: false
                    });
                }
                state.rifts.zones = zones;
                state.rifts.activeId = null;
                return zones.slice();
            } catch (_) { return []; }
        }

        function zoneAt(state, x, y) {
            try {
                state = ensureState(state);
                x = num(x, 0); y = num(y, 0);
                for (var i = 0; i < state.rifts.zones.length; i++) {
                    var z = state.rifts.zones[i];
                    var dx = num(z.x, 0) - x, dy = num(z.y, 0) - y;
                    var r = Math.max(0.1, num(z.radius, 3));
                    if (dx * dx + dy * dy <= r * r) return z;
                }
                return null;
            } catch (_) { return null; }
        }

        /* enter(): called when the player steps into a zone. Triggers the
         * dream regen (rooms beyond view) and returns the regen report plus
         * the field effect to apply. Marks zone entered so re-entry is cheap. */
        function enter(state, dungeon, player, zone) {
            var out = { zone: null, regen: null, effect: null };
            try {
                state = ensureState(state);
                if (!zone) zone = zoneAt(state, player && player.x, player && player.y);
                if (!zone) return out;
                out.zone = zone;
                var first = !zone.entered;
                zone.entered = true;
                state.rifts.activeId = zone.id;

                var D = dream();
                if (D && dungeon) {
                    try {
                        out.regen = D.redream(state, dungeon, player, {
                            protectPoints: (dungeon && dungeon.objectives) || []
                        });
                    } catch (_) { out.regen = null; }
                }
                out.effect = effectFor(zone, first);
                return out;
            } catch (_) { return out; }
        }

        function leave(state, zoneId) {
            try {
                state = ensureState(state);
                if (state.rifts.activeId === zoneId || zoneId == null) state.rifts.activeId = null;
                state.rifts.storm.warned = false;
            } catch (_) { /* ignore */ }
        }

        function effectFor(zone, firstEntry) {
            try {
                if (!zone) return null;
                var def = DEFAULTS[zone.type] || {};
                var eff = { type: zone.type, label: zone.label || zone.type, tint: zone.tint, firstEntry: !!firstEntry };
                if (zone.type === 'light') {
                    eff.wPush = def.wPush; eff.healPerSec = def.healPerSec;
                    eff.toast = 'Light brane washes over you — elven glow knits your wounds.';
                } else if (zone.type === 'gloom') {
                    eff.wPush = def.wPush; eff.rotPerSec = def.rotPerSec;
                    eff.toast = 'Gloom brane closes in — NecroGenesis veins pulse in the stone.';
                } else if (zone.type === 'eddy') {
                    eff.timeScale = def.timeScale;
                    eff.toast = 'Chrono-eddy — the world holds its breath. You move between ticks.';
                } else if (zone.type === 'wstorm') {
                    eff.gustPeriod = def.gustPeriod; eff.warnTime = def.warnTime; eff.gustW = def.gustW;
                    eff.toast = 'W-storm front — the air tastes of ana and kata. Watch the sky.';
                }
                return eff;
            } catch (_) { return null; }
        }

        /* tick(state, dt, player): per-frame field application.
         * Returns { timeScale, wDelta, heal, rot, warning } for the host sim.
         * w-storm gust scheduling lives here: warning flips true warnTime
         * seconds before each gust so the HUD can flash. */
        function tick(state, dt, player) {
            var out = { timeScale: 1, wDelta: 0, heal: 0, rot: 0, warning: null };
            try {
                state = ensureState(state);
                dt = Math.max(0, num(dt, 0));
                if (!dt) return out;
                var zone = zoneAt(state, player && player.x, player && player.y);
                if (!zone) { state.rifts.activeId = null; return out; }
                state.rifts.activeId = zone.id;
                if (zone.type === 'light') {
                    out.wDelta = DEFAULTS.light.wPush * dt;
                    out.heal = DEFAULTS.light.healPerSec * dt;
                } else if (zone.type === 'gloom') {
                    out.wDelta = DEFAULTS.gloom.wPush * dt;
                    out.rot = DEFAULTS.gloom.rotPerSec * dt;
                } else if (zone.type === 'eddy') {
                    out.timeScale = DEFAULTS.eddy.timeScale;
                } else if (zone.type === 'wstorm') {
                    var st = state.rifts.storm;
                    st.tNext = num(st.tNext, 0) - dt;
                    if (st.tNext <= DEFAULTS.wstorm.warnTime && !st.warned) {
                        st.warned = true;
                        out.warning = { kind: 'gust-incoming', seconds: DEFAULTS.wstorm.warnTime, tint: DEFAULTS.wstorm.tint };
                    } else if (st.warned && st.tNext > 0) {
                        out.warning = { kind: 'gust-incoming', seconds: Math.max(0, st.tNext), tint: DEFAULTS.wstorm.tint };
                    }
                    if (st.tNext <= 0) {
                        // Gust: deterministic sign flip via clock hash — no RNG state needed.
                        var h = ((Date.now() / 1000) | 0) % 2 === 0 ? 1 : -1;
                        out.wDelta = h * DEFAULTS.wstorm.gustW;
                        out.warning = { kind: 'gust', wDelta: out.wDelta, tint: DEFAULTS.wstorm.tint };
                        st.tNext = DEFAULTS.wstorm.gustPeriod;
                        st.warned = false;
                    }
                }
                return out;
            } catch (_) { return out; }
        }

        function serialize(state) {
            try {
                state = ensureState(state);
                return { zones: state.rifts.zones.slice(), activeId: state.rifts.activeId };
            } catch (_) { return { zones: [], activeId: null }; }
        }

        function restore(state, snap) {
            try {
                state = ensureState(state);
                if (snap && typeof snap === 'object') {
                    if (Array.isArray(snap.zones)) state.rifts.zones = snap.zones.slice();
                    state.rifts.activeId = snap.activeId || null;
                }
                return state;
            } catch (_) { return state; }
        }

        window.GG4D_Rifts = {
            VERSION: VERSION,
            TYPES: TYPES.slice(),
            DEFAULTS: JSON.parse(JSON.stringify(DEFAULTS)),
            ensureState: ensureState,
            generate: generate,
            zoneAt: zoneAt,
            enter: enter,
            leave: leave,
            effectFor: effectFor,
            tick: tick,
            serialize: serialize,
            restore: restore
        };
    } catch (_) { /* never throw */ }
})();
