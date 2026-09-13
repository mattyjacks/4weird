/* GraveGain4D combat core (agent g4d3-01, envelope DS-G4D3-01).
 *
 * Dark-fantasy action-RPG combat for the 4D fold: melee swings and ranged
 * shots land through W-aware hitboxes (foes phase across W-slices, so a
 * blade only bites when attacker and victim share the fold), enemy AI runs
 * chase/strike/flee through the folds, kills pay XP and route gore into the
 * shared gore path, and golf is just the trial-sport inside the RPG — a
 * powered putt counts as a heavy attack via golfStrike().
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DCombat. Never throws:
 * every public hook is try/catch guarded. No DOM listeners, no overlays,
 * no geometry construction (zero mesh builders here; 3D enemy models are
 * reused by reference only, lazily, via attachModels()).
 *
 * GG3D conventions mirrored (public/games/html/gravegain3d*):
 *   - entities/enemy.js: AI states idle/chase, attackTimer/attackInterval
 *     cooldowns, player.takeDamage(dmg), mage ranged via spawnProjectile,
 *     melee range check (dist < radius sum + 12), knockback kx/ky decay.
 *   - gravegain3d-arsenal.js: weapon rows carry damage/attackSpeed/range/
 *     critChance/critMult; crits multiply damage.
 *   - gravegain3d-endless.js: kill FX route into window.FourweirdGore.spawn
 *     when present (guarded, best-effort).
 *
 * Integrator: load AFTER gravegain4d-math.js (preferred, optional) and
 * gravegain4d-graphics.js (preferred, optional). This module owns combat
 * state + hit resolution only; rendering stays with the graphics lane.
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DCombat) return;

        var VERSION = '1.0.0';

        /* ================ tiny guards ================ */
        function num(n, fallback) {
            try {
                if (typeof n === 'number' && isFinite(n)) return n;
                var v = parseFloat(n);
                return (isFinite(v)) ? v : fallback;
            } catch (e) { return fallback; }
        }

        function clamp(n, lo, hi) {
            try {
                n = num(n, lo); lo = num(lo, 0); hi = num(hi, 1);
                if (n < lo) return lo;
                if (n > hi) return hi;
                return n;
            } catch (e) { return 0; }
        }

        function v4(x, y, z, w) {
            try {
                return { x: num(x, 0), y: num(y, 0), z: num(z, 0), w: num(w, 0) };
            } catch (e) { return { x: 0, y: 0, z: 0, w: 0 }; }
        }

        function v4copy(a) {
            try {
                a = a || {};
                return v4(a.x, a.y, a.z, a.w);
            } catch (e) { return v4(0, 0, 0, 0); }
        }

        function math4() {
            try { return window.GraveGain4DMath || null; }
            catch (e) { return null; }
        }

        /* Full 4D distance (ana/kata counts as real distance). */
        function v4dist(a, b) {
            try {
                var m = math4();
                if (m && m.vec4sub && m.vec4length) {
                    try { return m.vec4length(m.vec4sub(a || {}, b || {})); }
                    catch (e) { /* fall through */ }
                }
                a = a || {}; b = b || {};
                var dx = num(a.x, 0) - num(b.x, 0);
                var dy = num(a.y, 0) - num(b.y, 0);
                var dz = num(a.z, 0) - num(b.z, 0);
                var dw = num(a.w, 0) - num(b.w, 0);
                return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
            } catch (e) { return 0; }
        }

        function sliceDist(a, b) {
            try {
                a = a || {}; b = b || {};
                var dx = num(a.x, 0) - num(b.x, 0);
                var dy = num(a.y, 0) - num(b.y, 0);
                var dz = num(a.z, 0) - num(b.z, 0);
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            } catch (e) { return 0; }
        }

        /* ================ W-aware hitboxes ================
         * A foe phasing across W-slices is only hittable when attacker and
         * victim share the fold: |aw - bw| <= wRadius. Slice distance still
         * gates range; W gates phase. Both must pass.
         */
        var TUNE = {
            wRadius: 1.6,        /* default fold-share tolerance (world units) */
            meleeArc: 1.05,      /* default swing cone half-angle (radians) */
            shotRadius: 0.7,     /* bolt capture radius in 4D */
            shotWRadius: 1.6,    /* bolt fold-share tolerance */
            shotLife: 2.2,       /* bolt time-to-live (seconds) */
            heavyPutt: 0.75,     /* putt power >= this counts as a heavy attack */
            heavyMult: 1.6,      /* heavy-putt damage multiplier */
            fleeHpFrac: 0.25,    /* hp fraction below which cowards flee */
            aggroRange: 26,      /* idle -> chase trigger (4D units) */
            strikeGap: 12        /* GG3D melee fudge: radii sum + this */
        };

        function wOverlap(a, b, wRadius) {
            try {
                var tol = num(wRadius, TUNE.wRadius);
                if (!(tol >= 0)) tol = TUNE.wRadius;
                return Math.abs(num(a && a.w, 0) - num(b && b.w, 0)) <= tol;
            } catch (e) { return false; }
        }

        /* Facing cone on the slice: is target within arc of yaw direction? */
        function inArc(from, yaw, target, arc) {
            try {
                var half = num(arc, TUNE.meleeArc);
                if (!(half >= 0)) half = TUNE.meleeArc;
                if (half >= Math.PI) return true;
                var dx = num(target.x, 0) - num(from.x, 0);
                var dz = num(target.z, 0) - num(from.z, 0);
                if (dx === 0 && dz === 0) return true;
                var want = Math.atan2(dz, dx);
                var yawN = num(yaw, 0);
                var d = want - yawN;
                while (d > Math.PI) d -= Math.PI * 2;
                while (d < -Math.PI) d += Math.PI * 2;
                return Math.abs(d) <= half;
            } catch (e) { return false; }
        }

        function rollCrit(critChance, critMult, rng) {
            try {
                var ch = clamp(critChance, 0, 1);
                var r = (typeof rng === 'function') ? rng() : Math.random();
                if (r < ch) return { crit: true, mult: Math.max(1, num(critMult, 2)) };
                return { crit: false, mult: 1 };
            } catch (e) { return { crit: false, mult: 1 }; }
        }

        /* ================ events ================ */
        var listeners = [];
        var eventLog = [];

        function emit(ev) {
            try {
                if (!ev) return;
                ev = ev || {};
                eventLog.push(ev);
                if (eventLog.length > 256) eventLog.splice(0, eventLog.length - 256);
                var ls = listeners.slice();
                for (var i = 0; i < ls.length; i++) {
                    try { ls[i](ev); } catch (e) { /* listener faults never break combat */ }
                }
            } catch (e) { /* never throw */ }
        }

        function onEvent(fn) {
            try {
                if (typeof fn !== 'function') return false;
                listeners.push(fn);
                return true;
            } catch (e) { return false; }
        }

        function drainEvents() {
            try {
                var out = eventLog.slice();
                eventLog.length = 0;
                return out;
            } catch (e) { return []; }
        }

        /* ================ damage numbers ================ */
        var numbers = [];
        var numberSeq = 0;

        function spawnDamageNumber(pos, amount, isCrit) {
            try {
                numberSeq += 1;
                var n = {
                    id: numberSeq,
                    pos: v4copy(pos || {}),
                    amount: Math.max(0, Math.round(num(amount, 0))),
                    crit: !!isCrit,
                    ttl: isCrit ? 1.4 : 0.9,
                    age: 0
                };
                numbers.push(n);
                if (numbers.length > 64) numbers.splice(0, numbers.length - 64);
                emit({ type: 'damage-number', id: n.id, amount: n.amount, crit: n.crit, pos: v4copy(n.pos) });
                return n;
            } catch (e) { return null; }
        }

        function stepNumbers(dt) {
            try {
                dt = num(dt, 0.016);
                if (!(dt > 0)) dt = 0.016;
                for (var i = numbers.length - 1; i >= 0; i--) {
                    numbers[i].age += dt;
                    if (numbers[i].age >= numbers[i].ttl) numbers.splice(i, 1);
                }
                return numbers.length;
            } catch (e) { return 0; }
        }

        function getNumbers() {
            try {
                var out = [];
                for (var i = 0; i < numbers.length; i++) {
                    out.push({
                        id: numbers[i].id, pos: v4copy(numbers[i].pos),
                        amount: numbers[i].amount, crit: numbers[i].crit,
                        age: numbers[i].age, ttl: numbers[i].ttl
                    });
                }
                return out;
            } catch (e) { return []; }
        }

        /* ================ enemy roster ================
         * Model keys reuse the 3D builders by reference (see attachModels);
         * stats mirror the GG3D enemy.js table shape (hp/dmg/speed/scale,
         * type skeleton|mage, attackInterval). Radius derives from scale.
         */
        var ENEMIES = {
            'fold-husk':   { hp: 40,  dmg: 8,  speed: 6.5, scale: 1.0, kind: 'skeleton', attackInterval: 1.2, xp: 8 },
            'grave-ghoul': { hp: 70,  dmg: 12, speed: 5.5, scale: 1.3, kind: 'skeleton', attackInterval: 1.1, xp: 14 },
            'w-phase':     { hp: 55,  dmg: 10, speed: 8.0, scale: 1.0, kind: 'skeleton', attackInterval: 1.0, xp: 16 },
            'crypt-mage':  { hp: 90,  dmg: 14, speed: 4.0, scale: 1.2, kind: 'mage',     attackInterval: 1.8, xp: 22 },
            'fold-titan':  { hp: 320, dmg: 26, speed: 3.2, scale: 2.2, kind: 'skeleton', attackInterval: 1.4, xp: 60, boss: true }
        };

        var foes = [];
        var foeSeq = 0;

        function spawnEnemy(key, pos, opts) {
            try {
                var def = ENEMIES[key] || ENEMIES['fold-husk'];
                opts = opts || {};
                foeSeq += 1;
                var p = v4copy(pos || {});
                var f = {
                    id: foeSeq,
                    key: key,
                    modelKey: String((opts && opts.modelKey) || key),
                    pos: p,
                    vel: v4(0, 0, 0, 0),
                    kx: 0, ky: 0, kz: 0, kw: 0, /* knockback velocity, GG3D-style decay */
                    hp: Math.max(1, Math.round(num(opts.hp, def.hp))),
                    maxHp: Math.max(1, Math.round(num(opts.hp, def.hp))),
                    dmg: num(opts.dmg, def.dmg),
                    speed: num(opts.speed, def.speed),
                    scale: num(opts.scale, def.scale),
                    radius: num(opts.scale, def.scale) * 1.1,
                    kind: String(opts.kind || def.kind || 'skeleton'),
                    attackInterval: num(opts.attackInterval, def.attackInterval),
                    attackTimer: 0,
                    xp: Math.max(0, Math.round(num(opts.xp, def.xp))),
                    boss: !!(opts.boss || def.boss),
                    coward: !!(opts.coward),
                    state: 'idle', /* idle -> chase -> strike -> (flee) */
                    wDrift: num(opts.wDrift, 0.35),
                    alive: true
                };
                foes.push(f);
                emit({ type: 'spawn', id: f.id, key: f.key, pos: v4copy(f.pos) });
                return f;
            } catch (e) { return null; }
        }

        function getFoes(aliveOnly) {
            try {
                if (!aliveOnly) return foes.slice();
                var out = [];
                for (var i = 0; i < foes.length; i++) {
                    if (foes[i] && foes[i].alive) out.push(foes[i]);
                }
                return out;
            } catch (e) { return []; }
        }

        function findFoe(id) {
            try {
                for (var i = 0; i < foes.length; i++) {
                    if (foes[i] && foes[i].id === id) return foes[i];
                }
                return null;
            } catch (e) { return null; }
        }

        function clearFoes() {
            try { foes.length = 0; return true; }
            catch (e) { return false; }
        }

        /* ================ shared gore path ================
         * Kill FX route into window.FourweirdGore.spawn when present
         * (guarded, best-effort — mirrors gravegain3d-endless.js). The 2D
         * gore path takes (x, y, kind), so the slice projection is passed.
         */
        function goreKill(pos, foe) {
            try {
                var kind = (foe && foe.boss) ? 'boss' : 'kill';
                var G = null;
                try { G = window.FourweirdGore || null; } catch (e) { G = null; }
                if (G && typeof G.spawn === 'function') {
                    try {
                        var m = math4();
                        var sx = num(pos && pos.x, 0), sy = num(pos && pos.y, 0);
                        if (m && m.project4Dto3D) {
                            try {
                                var p3 = m.project4Dto3D(pos || {}, 4);
                                sx = num(p3.x, sx); sy = num(p3.y, sy);
                            } catch (e) { /* keep slice xyz */ }
                        }
                        G.spawn(sx, sy, kind);
                        return kind;
                    } catch (e) { /* fall through to event-only */ }
                }
                return 'event-only';
            } catch (e) { return 'event-only'; }
        }

        /* ================ kill rewards ================
         * XP routes into window.GraveGain4DRpg when present (optional):
         * tries addXP / grantXP / awardXP in order, guarded. Always emits
         * a kill event so a host game can reward through its own path.
         */
        function grantXP(amount, foe) {
            try {
                amount = Math.max(0, Math.round(num(amount, 0)));
                if (!(amount > 0)) return 0;
                var R = null;
                try { R = window.GraveGain4DRpg || null; } catch (e) { R = null; }
                if (R) {
                    var names = ['addXP', 'grantXP', 'awardXP'];
                    for (var i = 0; i < names.length; i++) {
                        try {
                            if (typeof R[names[i]] === 'function') {
                                R[names[i]](amount, foe ? { foeId: foe.id, key: foe.key } : null);
                                return amount;
                            }
                        } catch (e) { /* try next */ }
                    }
                }
                return 0;
            } catch (e) { return 0; }
        }

        function killFoe(foe, opts) {
            try {
                if (!foe || !foe.alive) return false;
                opts = opts || {};
                foe.alive = false;
                foe.hp = 0;
                foe.state = 'dead';
                var credited = grantXP(foe.xp, foe);
                var gore = goreKill(foe.pos, foe);
                emit({
                    type: 'kill', id: foe.id, key: foe.key, boss: !!foe.boss,
                    xp: num(foe.xp, 0), xpCredited: credited, gore: gore,
                    pos: v4copy(foe.pos), by: String(opts.by || 'combat')
                });
                return true;
            } catch (e) { return false; }
        }

        function applyDamage(foe, amount, opts) {
            try {
                if (!foe || !foe.alive) return null;
                opts = opts || {};
                var raw = Math.max(0, num(amount, 0));
                var roll = rollCrit(opts.critChance, opts.critMult, opts.rng);
                var total = raw * roll.mult;
                foe.hp -= total;
                if (opts.knockback && foe) {
                    try {
                        var kb = num(opts.knockback, 0);
                        var dx = num(foe.pos.x, 0) - num(opts.from && opts.from.x, 0);
                        var dz = num(foe.pos.z, 0) - num(opts.from && opts.from.z, 0);
                        var dw = num(foe.pos.w, 0) - num(opts.from && opts.from.w, 0);
                        var len = Math.sqrt(dx * dx + dz * dz + dw * dw) || 1;
                        foe.kx += (dx / len) * kb;
                        foe.kz += (dz / len) * kb;
                        foe.kw += (dw / len) * kb;
                    } catch (e) { /* knockback is cosmetic */ }
                }
                var dn = spawnDamageNumber(foe.pos, total, roll.crit);
                var killed = foe.hp <= 0;
                emit({
                    type: 'hit', id: foe.id, key: foe.key, damage: total,
                    crit: roll.crit, hp: Math.max(0, foe.hp), killed: killed,
                    by: String(opts.by || 'combat')
                });
                if (killed) killFoe(foe, { by: String(opts.by || 'combat') });
                else if (foe.state === 'idle') foe.state = 'chase'; /* pain wakes the fold */
                return { foe: foe, damage: total, crit: roll.crit, killed: killed, number: dn };
            } catch (e) { return null; }
        }

        /* ================ melee ================ */
        function meleeSwing(attack, foeList) {
            try {
                attack = attack || {};
                var from = v4copy(attack.from || {});
                var range = Math.max(0.5, num(attack.range, 3));
                var arc = num(attack.arc, TUNE.meleeArc);
                var wRadius = num(attack.wRadius, TUNE.wRadius);
                var damage = Math.max(0, num(attack.damage, 10));
                var yaw = num(attack.yaw, 0);
                var list = (foeList && foeList.length !== undefined) ? foeList : getFoes(true);
                var hits = [];
                for (var i = 0; i < list.length; i++) {
                    try {
                        var f = list[i];
                        if (!f || !f.alive) continue;
                        if (!wOverlap(from, f.pos, wRadius)) continue; /* phased out of the fold */
                        if (sliceDist(from, f.pos) > range + num(f.radius, 1)) continue;
                        if (!inArc(from, yaw, f.pos, arc)) continue;
                        var res = applyDamage(f, damage, {
                            critChance: attack.critChance, critMult: attack.critMult,
                            knockback: attack.knockback, from: from, rng: attack.rng, by: attack.by || 'melee'
                        });
                        if (res) hits.push(res);
                    } catch (e) { /* keep swinging */ }
                }
                emit({ type: 'swing', hits: hits.length, heavy: !!attack.heavy, by: String(attack.by || 'melee') });
                return hits;
            } catch (e) { return []; }
        }

        /* ================ ranged ================ */
        var shots = [];
        var shotSeq = 0;

        function fireShot(shot) {
            try {
                shot = shot || {};
                var from = v4copy(shot.from || {});
                var dir = shot.dir || { x: 1, y: 0, z: 0, w: 0 };
                var speed = Math.max(1, num(shot.speed, 18));
                var dx = num(dir.x, 0), dy = num(dir.y, 0), dz = num(dir.z, 0), dw = num(dir.w, 0);
                var len = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
                if (!(len > 1e-9)) { dx = 1; dy = 0; dz = 0; dw = 0; len = 1; }
                shotSeq += 1;
                var s = {
                    id: shotSeq,
                    pos: from,
                    vel: v4(dx / len * speed, dy / len * speed, dz / len * speed, dw / len * speed),
                    damage: Math.max(0, num(shot.damage, 8)),
                    wRadius: num(shot.wRadius, TUNE.shotWRadius),
                    radius: Math.max(0.2, num(shot.radius, TUNE.shotRadius)),
                    critChance: num(shot.critChance, 0.05),
                    critMult: num(shot.critMult, 2),
                    knockback: num(shot.knockback, 0),
                    age: 0,
                    life: Math.max(0.2, num(shot.life, TUNE.shotLife)),
                    from: v4copy(shot.from || {}),
                    by: String(shot.by || 'ranged'),
                    foe: !!shot.foe /* enemy bolts hurt the player path instead */
                };
                shots.push(s);
                if (shots.length > 64) shots.splice(0, shots.length - 64);
                emit({ type: 'shot', id: s.id, by: s.by });
                return s;
            } catch (e) { return null; }
        }

        function stepShots(dt, foeList, onPlayerHit) {
            try {
                dt = num(dt, 0.016);
                if (!(dt > 0)) dt = 0.016;
                var list = (foeList && foeList.length !== undefined) ? foeList : getFoes(true);
                var hits = [];
                for (var i = shots.length - 1; i >= 0; i--) {
                    try {
                        var s = shots[i];
                        s.age += dt;
                        if (s.age >= s.life) { shots.splice(i, 1); continue; }
                        s.pos.x += s.vel.x * dt; s.pos.y += s.vel.y * dt;
                        s.pos.z += s.vel.z * dt; s.pos.w += s.vel.w * dt;
                        var consumed = false;
                        for (var j = 0; j < list.length; j++) {
                            try {
                                var f = list[j];
                                if (!f || !f.alive) continue;
                                if (!wOverlap(s.pos, f.pos, s.wRadius)) continue;
                                if (v4dist(s.pos, f.pos) > s.radius + num(f.radius, 1)) continue;
                                var res = applyDamage(f, s.damage, {
                                    critChance: s.critChance, critMult: s.critMult,
                                    knockback: s.knockback, from: s.from, by: s.by
                                });
                                if (res) hits.push(res);
                                consumed = true;
                                break;
                            } catch (e) { /* keep checking */ }
                        }
                        if (consumed) shots.splice(i, 1);
                    } catch (e) { /* keep stepping */ }
                }
                if (typeof onPlayerHit === 'function') {
                    /* enemy bolts call back instead of touching player state:
                     * the host routes into player.takeDamage(dmg) itself. */
                    try { onPlayerHit(hits); } catch (e) { /* ignore */ }
                }
                return hits;
            } catch (e) { return []; }
        }

        function getShots() {
            try {
                var out = [];
                for (var i = 0; i < shots.length; i++) {
                    out.push({ id: shots[i].id, pos: v4copy(shots[i].pos), age: shots[i].age });
                }
                return out;
            } catch (e) { return []; }
        }

        function clearShots() {
            try { shots.length = 0; return true; }
            catch (e) { return false; }
        }

        /* ================ enemy AI: chase / strike / flee ================
         * Mirrors gravegain3d/entities/enemy.js: idle until the player
         * closes (aggro), chase by heading, melee range check against the
         * radii sum + fudge, attackTimer/attackInterval cooldown, mage
         * ranged via bolt spawn, knockback decay. 4D twist: foes drift in W
         * (phase across slices) and fleeing cowards escape kata-ward.
         */
        function steerToward(f, tx, ty, tz, tw, dt) {
            try {
                var dx = num(tx, 0) - num(f.pos.x, 0);
                var dy = num(ty, 0) - num(f.pos.y, 0);
                var dz = num(tz, 0) - num(f.pos.z, 0);
                var dw = num(tw, 0) - num(f.pos.w, 0);
                var len = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
                if (!(len > 1e-6)) return;
                var step = num(f.speed, 5) * num(dt, 0.016);
                f.pos.x += (dx / len) * step;
                f.pos.z += (dz / len) * step;
                f.pos.y += (dy / len) * step * 0.25; /* the fold floor holds */
                f.pos.w += (dw / len) * step;
            } catch (e) { /* ignore */ }
        }

        function updateFoes(dt, player, hooks) {
            try {
                dt = num(dt, 0.016);
                if (!(dt > 0)) dt = 0.016;
                if (dt > 0.05) dt = 0.05;
                player = player || {};
                hooks = hooks || {};
                var px = num(player.x !== undefined ? player.x : (player.pos && player.pos.x), 0);
                var py = num(player.y !== undefined ? player.y : (player.pos && player.pos.y), 0);
                var pz = num(player.z !== undefined ? player.z : (player.pos && player.pos.z), 0);
                var pw = num(player.w !== undefined ? player.w : (player.pos && player.pos.w), 0);
                var pr = Math.max(0.5, num(player.radius, 1));
                var ppos = v4(px, py, pz, pw);
                var struck = [];
                for (var i = 0; i < foes.length; i++) {
                    try {
                        var f = foes[i];
                        if (!f || !f.alive) continue;
                        /* knockback decay, GG3D-style */
                        f.pos.x += num(f.kx, 0) * dt;
                        f.pos.z += num(f.kz, 0) * dt;
                        f.pos.w += num(f.kw, 0) * dt;
                        f.kx -= f.kx * 8 * dt; f.kz -= f.kz * 8 * dt; f.kw -= f.kw * 8 * dt;
                        if (f.attackTimer > 0) f.attackTimer -= dt;
                        /* W-phase drift: the fold breathes the foe ana/kata */
                        try {
                            f.pos.w += Math.sin(num(f.id, 1) * 1.7 + Date.now() * 0.0004) * num(f.wDrift, 0.35) * dt;
                        } catch (e) { /* timeless fold */ }
                        var d = v4dist(f.pos, ppos);
                        var frac = (num(f.maxHp, 1) > 0) ? num(f.hp, 0) / num(f.maxHp, 1) : 1;
                        var coward = !!(f.coward || (!f.boss && frac <= TUNE.fleeHpFrac && f.hp < f.maxHp));
                        if (f.state === 'idle' && d < num(hooks.aggroRange, TUNE.aggroRange)) {
                            f.state = 'chase';
                            emit({ type: 'aggro', id: f.id, key: f.key });
                        }
                        if (coward && f.state !== 'dead') {
                            if (f.state !== 'flee') {
                                f.state = 'flee';
                                emit({ type: 'flee', id: f.id, key: f.key });
                            }
                            /* flee kata-ward through the fold + away on the slice */
                            try {
                                var ax = num(f.pos.x, 0) - px, az = num(f.pos.z, 0) - pz;
                                var al = Math.sqrt(ax * ax + az * az) || 1;
                                var fstep = num(f.speed, 5) * dt;
                                f.pos.x += (ax / al) * fstep;
                                f.pos.z += (az / al) * fstep;
                                f.pos.w -= fstep * 0.8;
                            } catch (e) { /* cornered */ }
                            continue;
                        }
                        if (f.state === 'chase' || f.state === 'strike') {
                            if (f.kind === 'mage' && d < 14 && d > 5) {
                                /* ranged caster holds the fold and hurls a bolt */
                                if (f.attackTimer <= 0) {
                                    f.attackTimer = num(f.attackInterval, 1.8);
                                    var mdx = px - num(f.pos.x, 0), mdz = pz - num(f.pos.z, 0);
                                    var mdw = pw - num(f.pos.w, 0), mdy = 0;
                                    fireShot({
                                        from: v4copy(f.pos), dir: { x: mdx, y: mdy, z: mdz, w: mdw },
                                        speed: 14, damage: f.dmg, by: 'foe-mage', foe: true
                                    });
                                    f.state = 'strike';
                                    emit({ type: 'foe-cast', id: f.id, key: f.key });
                                }
                            } else {
                                steerToward(f, px, py, pz, pw, dt);
                                /* melee range check: radii sum + fold fudge (GG3D) + W share */
                                var reach = num(f.radius, 1) + pr + TUNE.strikeGap;
                                if (sliceDist(f.pos, ppos) < reach && wOverlap(f.pos, ppos, TUNE.wRadius)) {
                                    f.state = 'strike';
                                    if (f.attackTimer <= 0) {
                                        f.attackTimer = num(f.attackInterval, 1.2);
                                        var dealt = num(f.dmg, 5);
                                        var hurt = false;
                                        try {
                                            if (typeof player.takeDamage === 'function') {
                                                player.takeDamage(dealt);
                                                hurt = true;
                                            } else if (typeof hooks.onPlayerDamage === 'function') {
                                                hooks.onPlayerDamage(dealt, f);
                                                hurt = true;
                                            }
                                        } catch (e) { hurt = false; }
                                        struck.push({ id: f.id, damage: dealt, hurt: hurt });
                                        emit({ type: 'foe-strike', id: f.id, key: f.key, damage: dealt, hurt: hurt });
                                    }
                                } else if (f.state === 'strike') {
                                    f.state = 'chase';
                                }
                            }
                        }
                    } catch (e) { /* one bad foe never stalls the horde */ }
                }
                stepNumbers(dt);
                return struck;
            } catch (e) { return []; }
        }

        /* ================ golf-strike crossover ================
         * Golf is the trial-sport inside the RPG: a powered putt IS a heavy
         * attack. golfStrike(power, aim) builds the melee descriptor the
         * host resolves with meleeSwing(); hookGolfRound(round) listens to
         * a GraveGain4DGolf round's stroke events and emits crossover
         * events (the host calls meleeSwing with the returned descriptor).
         */
        function golfStrike(power, aim) {
            try {
                power = clamp(power, 0, 1);
                aim = aim || {};
                var heavy = power >= TUNE.heavyPutt;
                var atk = {
                    from: v4copy(aim.from || {}),
                    yaw: num(aim.yaw, 0),
                    range: num(aim.range, heavy ? 5.5 : 3.5),
                    arc: num(aim.arc, TUNE.meleeArc),
                    wRadius: num(aim.wRadius, TUNE.wRadius + (heavy ? 0.8 : 0)),
                    damage: Math.max(1, num(aim.damage, 10)) * (heavy ? TUNE.heavyMult : (0.5 + power * 0.5)),
                    critChance: num(aim.critChance, heavy ? 0.2 : 0.05),
                    critMult: num(aim.critMult, 2),
                    knockback: num(aim.knockback, heavy ? 9 : 3),
                    heavy: heavy,
                    power: power,
                    by: 'golf-putt'
                };
                emit({ type: 'golf-strike', heavy: heavy, power: power, damage: atk.damage });
                return atk;
            } catch (e) { return null; }
        }

        function hookGolfRound(round) {
            try {
                if (!round) return false;
                var G = null;
                try { G = window.GraveGain4DGolf || null; } catch (e) { G = null; }
                var attach = function (r) {
                    try {
                        if (G && typeof G.onEvent === 'function') {
                            return G.onEvent(r, function (ev) {
                                try {
                                    if (!ev || ev.type !== 'stroke') return;
                                    var atk = golfStrike(ev.power, { from: r.ball ? r.ball.pos : {} });
                                    emit({ type: 'golf-crossover', stroke: ev.stroke, heavy: !!(atk && atk.heavy) });
                                } catch (e) { /* ignore */ }
                            });
                        }
                        if (r && typeof r.onStroke === 'function') {
                            r.onStroke(function (ev) {
                                try { golfStrike(num(ev && ev.power, 0), { from: (r.ball && r.ball.pos) || {} }); }
                                catch (e) { /* ignore */ }
                            });
                            return true;
                        }
                    } catch (e) { return false; }
                    return false;
                };
                return !!attach(round);
            } catch (e) { return false; }
        }

        /* ================ 3D-model reuse (by reference only) ================
         * The graphics lane owns every mesh. This accessor only reads the
         * shared registries so a renderer can bind foe markers; it creates
         * nothing and defines no geometry of any kind. */
        function attachModels() {
            try {
                var gfx = null, models = null, gfx4d = null;
                try { gfx = window.GraveGainGraphics3D || null; } catch (e) { gfx = null; }
                try { models = window.GraveGain3DModels || null; } catch (e) { models = null; }
                try { gfx4d = window.GraveGain4DGraphics || null; } catch (e) { gfx4d = null; }
                return { graphics3D: gfx, models3D: models, graphics4D: gfx4d };
            } catch (e) { return { graphics3D: null, models3D: null, graphics4D: null }; }
        }

        /* Resolve a foe's marker through the shared 4D graphics lane
         * (which itself delegates to the 3D builders). Never builds here. */
        function foeMarker(foe) {
            try {
                if (!foe) return null;
                var g4 = null;
                try { g4 = window.GraveGain4DGraphics || null; } catch (e) { g4 = null; }
                if (g4 && typeof g4.buildEnemy === 'function') {
                    try { return g4.buildEnemy(foe.modelKey || foe.key, { foe: foe }); }
                    catch (e) { return null; }
                }
                var m3 = null;
                try { m3 = window.GraveGain3DModels || null; } catch (e) { m3 = null; }
                if (m3 && typeof m3.buildEnemy === 'function') {
                    try { return m3.buildEnemy(foe.modelKey || foe.key, {}); }
                    catch (e) { return null; }
                }
                return null;
            } catch (e) { return null; }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                TUNE: TUNE,
                ENEMIES: ENEMIES,
                v4dist: v4dist,
                sliceDist: sliceDist,
                wOverlap: wOverlap,
                inArc: inArc,
                meleeSwing: meleeSwing,
                fireShot: fireShot,
                stepShots: stepShots,
                getShots: getShots,
                clearShots: clearShots,
                spawnEnemy: spawnEnemy,
                getFoes: getFoes,
                findFoe: findFoe,
                clearFoes: clearFoes,
                updateFoes: updateFoes,
                applyDamage: applyDamage,
                killFoe: killFoe,
                grantXP: grantXP,
                goreKill: goreKill,
                spawnDamageNumber: spawnDamageNumber,
                stepNumbers: stepNumbers,
                getNumbers: getNumbers,
                golfStrike: golfStrike,
                hookGolfRound: hookGolfRound,
                attachModels: attachModels,
                foeMarker: foeMarker,
                onEvent: onEvent,
                drainEvents: drainEvents
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain4DCombat = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: 'gravegain4d-combat', version: VERSION });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: combat core stays silent */ }
})();
