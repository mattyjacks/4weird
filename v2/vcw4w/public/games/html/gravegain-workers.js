/* GraveGain worker tasks (v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundles:
 *   public/games/html/gravegain-workers.js
 * Requires fourweird-workers.js (shared pool) but works standalone via its
 * own synchronous fallback. Injected into the generated runtime copies
 * (gravegain2d + gravegain3d) by scripts/sync-game-bundles.mjs.
 *
 * Tasks (pure math, plain-data in/out, never DOM):
 *   dungeon-rng  { seed, n }              -> [0..1) stream (level layout dice)
 *   ai-steer     { enemies:[{x,y}], px, py } -> [{ i, nx, ny, d }] (seek vectors)
 *   particles    { parts:[{x,y,vx,vy,life}], dt } -> integrated parts
 *   timing       { samples:[ms] }          -> { avg, n, preset }
 *
 * Exposes window.GraveGainWorkers = { VERSION, ready(), run(task,payload),
 * dungeonRng(), steerEnemies(), integrateParticles(), aggregateTiming() }.
 * All entry points resolve (never reject to callers that ignore errors);
 * heavy per-tick callers should still throttle (every Nth tick) and keep
 * draw/input/audio on the main thread.
 */
(function () {
    'use strict';
    if (window.GraveGainWorkers) return;

    var VERSION = '1.0.0';

    function pool() {
        try { return window.FourWeirdWorkers || null; } catch (e) { return null; }
    }

    function ready() {
        try {
            var p = pool();
            return !!(p && typeof p.supported === 'function' && p.supported());
        } catch (e) { return false; }
    }

    // run() always resolves: worker result, or null on timeout/unknown-task
    // so game loops never break on a rejected promise.
    function run(task, payload, opts) {
        try {
            var p = pool();
            if (p && typeof p.run === 'function') {
                return p.run(task, payload, opts).then(
                    function (v) { return v; },
                    function () { return null; }
                );
            }
        } catch (e) { /* fall through */ }
        return Promise.resolve(null);
    }

    function dungeonRng(seed, n) {
        return run('rng-stream', { seed: seed | 0, n: Math.min(Math.max(n | 0, 0), 100000) });
    }

    function steerEnemies(enemies, px, py) {
        try {
            var slim = [];
            for (var i = 0; i < enemies.length; i++) {
                slim.push({ x: +enemies[i].x || 0, y: +(enemies[i].y !== undefined ? enemies[i].y : enemies[i].z) || 0 });
            }
            return run('ai-steer', { enemies: slim, px: +px || 0, py: +py || 0 });
        } catch (e) { return Promise.resolve(null); }
    }

    function integrateParticles(parts, dt) {
        try {
            var slim = [];
            for (var i = 0; i < parts.length; i++) {
                var q = parts[i];
                slim.push({ x: +q.x || 0, y: +q.y || 0, vx: +q.vx || 0, vy: +q.vy || 0, life: +q.life || 0 });
            }
            return run('particle-integrate', { parts: slim, dt: +dt || 0.016 });
        } catch (e) { return Promise.resolve(null); }
    }

    function aggregateTiming(samples) {
        return run('timing-aggregate', { samples: samples || [] });
    }

    // Opt-in assist: every 6th call, steer the live game's enemies toward
    // the player off-thread and write back normalized headings as _wx/_wy
    // hints (games keep full authority; hints are advisory only). Polls for
    // the live instance so load order never matters. Zero effect when
    // workers are unsupported.
    function bootAssist() {
        try {
            var ticks = 0;
            setInterval(function () {
                try {
                    if (!ready()) return;
                    var game = window.GraveGainGame;
                    if (!game || !game.enemies || !game.player) return;
                    ticks += 1;
                    if (ticks % 6 !== 0) return;
                    var list = game.enemies;
                    if (!list.length || list.length > 400) return; // cap: huge hordes stay local
                    var px = +game.player.x || 0;
                    var py = +((game.player.y !== undefined) ? game.player.y : game.player.z) || 0;
                    steerEnemies(list.slice(0, 120), px, py).then(function (res) {
                        try {
                            if (!res || !res.length) return;
                            for (var i = 0; i < res.length; i++) {
                                var r = res[i];
                                var e = list[r.i];
                                if (e) { e._wx = r.nx; e._wy = r.ny; e._wd = r.d; }
                            }
                        } catch (e) { /* advisory only */ }
                    });
                } catch (e) { /* never break the loop */ }
            }, 250);
        } catch (e) { /* ignore */ }
    }

    try {
        window.GraveGainWorkers = {
            VERSION: VERSION,
            ready: ready,
            run: run,
            dungeonRng: dungeonRng,
            steerEnemies: steerEnemies,
            integrateParticles: integrateParticles,
            aggregateTiming: aggregateTiming
        };
    } catch (e) { /* window unwritable */ }

    try { bootAssist(); } catch (e) { /* ignore */ }
})();
