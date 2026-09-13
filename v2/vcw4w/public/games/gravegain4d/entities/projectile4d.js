/* GraveGain4D Shot (soul-orb) — DS-GRAV4D-04 (games lane, grav4d-04)
 * 4D ballistic integrate + wall bounce in w + hole capture + trail events.
 * No THREE dependency; graphics/audio subscribe via onTrail/onCapture.
 * Exposes: window.GraveGain4DShot { VERSION, createPool, fire, integrate, captureTest }
 */
(function () {
    'use strict';
    if (window.GraveGain4DShot && window.GraveGain4DShot.VERSION) return;
    var VERSION = '1.0.0';

    function createPool(size) {
        var pool = { orbs: [], trailHandlers: [], captureHandlers: [], bounceHandlers: [] };
        for (var i = 0; i < (size || 32); i++) {
            pool.orbs.push({
                active: false,
                pos4: { x: 0, y: 0, z: 0, w: 0 },
                vel4: { x: 0, y: 0, z: 0, w: 0 },
                life: 0, maxLife: 4.0,
                trail: [], bounces: 0, power: 1.0
            });
        }
        return pool;
    }

    function fire(pool, origin, dir4, power) {
        for (var i = 0; i < pool.orbs.length; i++) {
            var o = pool.orbs[i];
            if (o.active) continue;
            o.active = true;
            o.pos4 = { x: origin.x || 0, y: origin.y || 0, z: origin.z || 0, w: origin.w || 0 };
            var sp = 18 * (power || 1.0);
            var l = Math.sqrt((dir4.x || 0) * (dir4.x || 0) + (dir4.z || 0) * (dir4.z || 0) +
                (dir4.w || 0) * (dir4.w || 0) + (dir4.y || 0) * (dir4.y || 0)) || 1;
            o.vel4 = { x: (dir4.x || 0) / l * sp, y: (dir4.y || 0) / l * sp, z: (dir4.z || 0) / l * sp, w: (dir4.w || 0) / l * sp };
            o.life = 0; o.trail = []; o.bounces = 0; o.power = power || 1.0;
            emit(pool.trailHandlers, { type: 'fire', orb: snapshot(o) });
            return o;
        }
        return null;
    }

    function snapshot(o) {
        return { pos4: { x: o.pos4.x, y: o.pos4.y, z: o.pos4.z, w: o.pos4.w }, power: o.power, bounces: o.bounces };
    }

    function onTrail(pool, fn) { pool.trailHandlers.push(fn); }
    function onCapture(pool, fn) { pool.captureHandlers.push(fn); }
    function onBounce(pool, fn) { pool.bounceHandlers.push(fn); }
    function emit(list, ev) {
        for (var i = 0; i < list.length; i++) { try { list[i](ev); } catch (_) { /* listener fault */ } }
    }

    // bounds: { minX,maxX,minZ,maxZ,minW,maxW, restitution }. hole: { x,z,w,r } optional.
    function integrate(pool, dt, bounds, hole) {
        var friction = 0.6; // soul-orb green friction per second
        for (var i = 0; i < pool.orbs.length; i++) {
            var o = pool.orbs[i];
            if (!o.active) continue;
            o.life += dt;
            if (o.life >= o.maxLife) { o.active = false; continue; }
            // Ballistic: gravity on y only; x/z/w damped by friction.
            o.vel4.y -= 9.8 * dt;
            var damp = Math.max(0, 1 - friction * dt);
            o.vel4.x *= damp; o.vel4.z *= damp; o.vel4.w *= damp;
            o.pos4.x += o.vel4.x * dt; o.pos4.y += o.vel4.y * dt;
            o.pos4.z += o.vel4.z * dt; o.pos4.w += o.vel4.w * dt;
            if (o.pos4.y < 0) { o.pos4.y = 0; o.vel4.y *= -0.4; }
            // Wall bounce in w (and x/z) with restitution.
            if (bounds) {
                var r = (bounds.restitution !== undefined) ? bounds.restitution : 0.7;
                if (bounds.minW !== undefined && (o.pos4.w < bounds.minW || o.pos4.w > bounds.maxW)) {
                    o.pos4.w = Math.max(bounds.minW, Math.min(bounds.maxW, o.pos4.w));
                    o.vel4.w *= -r; o.bounces += 1;
                    emit(pool.bounceHandlers, { type: 'bounce', axis: 'w', orb: snapshot(o) });
                }
                if (bounds.minX !== undefined && (o.pos4.x < bounds.minX || o.pos4.x > bounds.maxX)) {
                    o.pos4.x = Math.max(bounds.minX, Math.min(bounds.maxX, o.pos4.x));
                    o.vel4.x *= -r; o.bounces += 1;
                    emit(pool.bounceHandlers, { type: 'bounce', axis: 'x', orb: snapshot(o) });
                }
                if (bounds.minZ !== undefined && (o.pos4.z < bounds.minZ || o.pos4.z > bounds.maxZ)) {
                    o.pos4.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, o.pos4.z));
                    o.vel4.z *= -r; o.bounces += 1;
                    emit(pool.bounceHandlers, { type: 'bounce', axis: 'z', orb: snapshot(o) });
                }
            }
            o.trail.push({ x: o.pos4.x, y: o.pos4.y, z: o.pos4.z, w: o.pos4.w, t: o.life });
            if (o.trail.length > 24) o.trail.shift();
            emit(pool.trailHandlers, { type: 'trail', orb: snapshot(o) });
            // Hole capture: radial in x/z plus w proximity gate.
            if (hole && captureTest(o, hole)) {
                o.active = false;
                emit(pool.captureHandlers, { type: 'capture', orb: snapshot(o), hole: hole });
            }
        }
        return pool;
    }

    function captureTest(o, hole) {
        var dx = o.pos4.x - (hole.x || 0);
        var dz = o.pos4.z - (hole.z || 0);
        var dw = o.pos4.w - (hole.w || 0);
        var rr = hole.r || 1.2;
        var wGate = (hole.wGate !== undefined) ? hole.wGate : 1.0;
        return (dx * dx + dz * dz) < rr * rr && Math.abs(dw) < wGate;
    }

    window.GraveGain4DShot = {
        VERSION: VERSION,
        createPool: createPool, fire: fire, integrate: integrate, captureTest: captureTest,
        onTrail: onTrail, onCapture: onCapture, onBounce: onBounce
    };
})();
