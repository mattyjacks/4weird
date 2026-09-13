/* GraveGain4D mod registry/loader (agent g4d2-08).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DMods. Never throws:
 * every hook is try/catch guarded. No DOM listeners, no DOM overlays, no
 * canvas, no BoxGeometry, no network, no secrets.
 *
 * What it is: a pack-level registry that feature-detects the 8 GG4D lane
 * modules by their window flags in dependency order (math -> graphics ->
 * worlds -> missions -> golf -> geometry -> time -> trippy), with retry
 * ticks so late-loading sibling <script> tags are picked up when they
 * land concurrently. Missing siblings are REPORTED (present:false), never
 * fatal: status() always resolves, this file never throws.
 *
 * Canon: same lore as GraveGain2D/3D (LZ crash site -> elven groves ->
 * dwarven vaults). This file carries no lore text and no 4D math of its
 * own; it only observes the eight module flags and reports readiness.
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DMods) return;

        var VERSION = '1.0.0';

        /* Ordered load table: dependencies first. `flag` is the window
         * key each lane module assigns; `mod` is its GraveGainMods name.
         * Golf + geometry siblings may land concurrently, so absence here
         * is an expected state, not an error. */
        var MODULES = [
            { mod: 'gravegain4d-math', flag: 'GraveGain4DMath' },
            { mod: 'gravegain4d-graphics', flag: 'GraveGain4DGraphics' },
            { mod: 'gravegain4d-worlds', flag: 'GraveGain4DWorlds' },
            { mod: 'gravegain4d-missions', flag: 'GraveGain4DMissions' },
            { mod: 'gravegain4d-golf', flag: 'GraveGain4DGolf' },
            { mod: 'gravegain4d-geometry', flag: 'GraveGain4DGeometry' },
            { mod: 'gravegain4d-time', flag: 'GraveGain4DTime' },
            { mod: 'gravegain4d-trippy', flag: 'GraveGain4DTrippy' }
        ];

        /* Retry ticks for late scripts: rescan on a short timer until all
         * eight flags are present or the budget runs out. Timer handles
         * are kept only to stop early; expiry simply stops polling. */
        var TICK_MS = 250;
        var MAX_TICKS = 40;
        var tickCount = 0;
        var timerId = null;

        function getFlag(flag) {
            try {
                var w = null;
                try { w = window; } catch (e) { return null; }
                if (!w) return null;
                var v = w[flag];
                return (v === undefined || v === null) ? null : v;
            } catch (e) { return null; }
        }

        /* Version probe: lane modules expose VERSION or version (string).
         * Anything else (object without a version string) still counts as
         * present with version:null — presence is truthiness, not shape. */
        function flagVersion(value) {
            try {
                if (value === null || value === undefined) return null;
                if (typeof value === 'string') return value;
                try {
                    if (typeof value.VERSION === 'string') return value.VERSION;
                } catch (e) { /* ignore */ }
                try {
                    if (typeof value.version === 'string') return value.version;
                } catch (e) { /* ignore */ }
                return null;
            } catch (e) { return null; }
        }

        function describe(entry) {
            try {
                var value = getFlag(entry.flag);
                var present = (value !== null);
                return {
                    mod: entry.mod,
                    flag: entry.flag,
                    present: present,
                    version: present ? flagVersion(value) : null
                };
            } catch (e) {
                return { mod: entry.mod, flag: entry.flag, present: false, version: null };
            }
        }

        /* status(): per-module present/missing + versions if exposed.
         * Always returns a fresh snapshot object; never throws, never
         * returns null/undefined even if a sibling throws on property
         * access (each probe is individually guarded). */
        function status() {
            try {
                var rows = [];
                var missing = [];
                var presentCount = 0;
                for (var i = 0; i < MODULES.length; i++) {
                    var row = null;
                    try { row = describe(MODULES[i]); }
                    catch (e) {
                        row = { mod: MODULES[i].mod, flag: MODULES[i].flag, present: false, version: null };
                    }
                    rows.push(row);
                    if (row.present) { presentCount++; }
                    else { missing.push(row.flag); }
                }
                return {
                    name: 'gravegain4d-pack',
                    version: VERSION,
                    total: MODULES.length,
                    present: presentCount,
                    ready: (presentCount === MODULES.length),
                    missing: missing,
                    modules: rows
                };
            } catch (e) {
                try {
                    return { name: 'gravegain4d-pack', version: VERSION, total: 8, present: 0, ready: false, missing: [], modules: [] };
                } catch (ignored) { return {}; }
            }
        }

        /* rescan(): one synchronous re-probe (same snapshot as status).
         * Kept as a named hook for the integrator console; status()
         * already re-probes on every call, so this is an alias. */
        function rescan() {
            try { return status(); }
            catch (e) { return status(); }
        }

        /* ready(): boolean convenience over status().ready. */
        function ready() {
            try { return !!status().ready; }
            catch (e) { return false; }
        }

        function stopTicks() {
            try {
                if (timerId !== null) {
                    try {
                        if (typeof clearTimeout === 'function') clearTimeout(timerId);
                    } catch (e) { /* ignore */ }
                    timerId = null;
                }
            } catch (e) { /* ignore */ }
        }

        function tick() {
            try {
                timerId = null;
                tickCount++;
                var snap = null;
                try { snap = status(); } catch (e) { snap = null; }
                if (snap && snap.ready) { stopTicks(); return; }
                if (tickCount >= MAX_TICKS) { stopTicks(); return; }
                scheduleTick();
            } catch (e) { try { stopTicks(); } catch (ignored) { /* ignore */ } }
        }

        function scheduleTick() {
            try {
                if (typeof setTimeout !== 'function') return;
                stopTicks();
                try {
                    timerId = setTimeout(tick, TICK_MS);
                } catch (e) { timerId = null; }
            } catch (e) { /* ignore */ }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                version: VERSION,
                ORDER: ['GraveGain4DMath', 'GraveGain4DGraphics', 'GraveGain4DWorlds', 'GraveGain4DMissions', 'GraveGain4DGolf', 'GraveGain4DGeometry', 'GraveGain4DTime', 'GraveGain4DTrippy'],
                status: status,
                rescan: rescan,
                ready: ready
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain4DMods = api; } catch (e) { /* ignore */ }

        /* Single pack manifest: exactly ONE push for this file. Siblings
         * landing concurrently each push their own lane entry; this entry
         * only describes the pack and delegates live state to status(). */
        try {
            if (!window.GraveGainMods || !window.GraveGainMods.push) {
                try { window.GraveGainMods = []; } catch (e) { /* ignore */ }
            }
            if (window.GraveGainMods && typeof window.GraveGainMods.push === 'function') {
                window.GraveGainMods.push({ name: 'gravegain4d-pack', version: VERSION, status: status, ready: ready });
            }
        } catch (e) { /* ignore */ }

        /* Start retry ticks AFTER registration so the pack entry exists
         * even if every sibling is still in flight. */
        try { scheduleTick(); } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: registry stays silent */ }
})();
