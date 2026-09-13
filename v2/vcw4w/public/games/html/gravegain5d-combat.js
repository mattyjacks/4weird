/* GraveGain5D combat core (agent g5d-01, envelope DS-G5D-01).
 *
 * Franchise combat core as a vanilla-JS mod for GraveGain5D: GraveGain-style
 * melee/ranged attacks with universe-aware hitboxes (gravity/drift per
 * universe id prime/echo/dream/void/bloom/static), enemy AI (chase/strike/
 * flee, pursuing across universe hops), damage + kill rewards, a gore-kill
 * routing hook, and a golf-strike crossover hook (a powered putt IS a heavy
 * attack, mirroring the 4D combat lane).
 *
 * Canon refs (read-only, never written):
 *   - public/games/gravegain5d/game.js exposes window.GraveGain5D with
 *     UNIVERSES (gravity/drift/parDelta/collapseTicks per id), CLASSES
 *     (putter/warden/drifter with hp/atk/def/spd/range), ENEMIES (base
 *     kinds shambler/swarm/brute/necro + universe variants echoHusk/
 *     dreamMaw/voidReaver/bloomWisp/staticJitter with hp/atk/def/xp/gold),
 *     HOLES, newRun/tick/hop/score, nearestFoe/playerAttack/damage/gainXp.
 *   - public/games/html/gravegain-enemies.js canon enemy shape: VARIANTS
 *     carry id/name/emoji/color3D/hpMul/atkMul/behavior
 *     (charger/spitter/brute/summoner/lurker)/threat + taunt bands.
 *   - public/games/html/gravegain-arsenal.js canon weapon shape: WEAPONS
 *     carry id/name/emoji/kind (melee/ranged/magic/chem)/dmg/speed/
 *     crit/range/rarity/blurb/effect + byId/byRarity/rollLoot/weaponFor.
 *
 * Ownership contract: this module owns its OWN foe/shot/number lists only.
 * It reads window.GraveGain5D state read-only (universe/class/enemy tables
 * by reference, copied field-by-field) and NEVER writes game state - kill
 * rewards and player damage are delivered to the host via hooks + events
 * for the host to apply. Fail-open when GraveGain5D is absent (baked
 * fallback tables keep every helper usable).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain5DCombat. Never throws:
 * every public hook is try/catch guarded. No DOM listeners, no overlays,
 * no geometry construction, no vendored three.js (models reused by
 * reference only, lazily, via attachModels()).
 *
 * Sibling pattern mirrored: public/games/html/gravegain4d-combat.js
 * (W-aware hitboxes, foe AI states, gore path, golf crossover, events).
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain5DCombat) return;

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

        function str(v, fallback) {
            try {
                if (typeof v === 'string' && v) return v;
                if (v == null) return fallback;
                return String(v) || fallback;
            } catch (e) { return fallback; }
        }

        function pos4(x, y, z, w) {
            try {
                return { x: num(x, 0), y: num(y, 0), z: num(z, 0), w: num(w, 0) };
            } catch (e) { return { x: 0, y: 0, z: 0, w: 0 }; }
        }

        function posCopy(a) {
            try {
                a = a || {};
                return pos4(a.x, a.y, a.z, a.w);
            } catch (e) { return pos4(0, 0, 0, 0); }
        }

        /* ================ read-only canon access ================
         * Every accessor copies fields out of window.GraveGain5D (never
         * holds a writable reference to run state). Absent engine =
         * baked fallbacks, so the module stays fail-open standalone. */
        function gg5d() {
            try { return window.GraveGain5D || null; }
            catch (e) { return null; }
        }

        /* Baked fallback mirrors game.js UNIVERSES (gravity = putt-distance
         * multiplier, drift = W-slice pull per tick). Live table wins. */
        var FALLBACK_UNIVERSES = [
            { id: 'prime', gravity: 1.0, drift: 0.0 },
            { id: 'echo', gravity: 0.9, drift: 0.1 },
            { id: 'dream', gravity: 1.1, drift: -0.1 },
            { id: 'void', gravity: 1.4, drift: 0.3 },
            { id: 'bloom', gravity: 0.7, drift: -0.2 },
            { id: 'static', gravity: 1.2, drift: 0.0 }
        ];

        function universeTable() {
            try {
                var G = gg5d();
                if (G && G.UNIVERSES && G.UNIVERSES.length) {
                    var out = [];
                    for (var i = 0; i < G.UNIVERSES.length; i++) {
                        var u = G.UNIVERSES[i] || {};
                        out.push({
                            id: str(u.id, 'prime'),
                            gravity: num(u.gravity, 1),
                            drift: num(u.drift, 0)
                        });
                    }
                    if (out.length) return out;
                }
            } catch (e) { /* fall through to baked */ }
            return FALLBACK_UNIVERSES.slice();
        }

        function universeById(id) {
            try {
                var table = universeTable();
                id = str(id, 'prime');
                for (var i = 0; i < table.length; i++) {
                    if (table[i].id === id) return table[i];
                }
                return table[0];
            } catch (e) { return { id: 'prime', gravity: 1, drift: 0 }; }
        }

        function gravityOf(universeId) {
            try {
                var g = num(universeById(universeId).gravity, 1);
                return (g > 0) ? g : 1;
            } catch (e) { return 1; }
        }

        function driftOf(universeId) {
            try { return num(universeById(universeId).drift, 0); }
            catch (e) { return 0; }
        }

        function classDef(cls) {
            try {
                var G = gg5d();
                if (G && G.CLASSES && G.CLASSES[cls]) {
                    var c = G.CLASSES[cls];
                    return {
                        hp: num(c.hp, 20), atk: num(c.atk, 5),
                        def: num(c.def, 0), spd: num(c.spd, 2),
                        range: num(c.range, 3)
                    };
                }
            } catch (e) { /* fallback */ }
            return { hp: 20, atk: 5, def: 0, spd: 2, range: 3 };
        }

        function canonFoeDef(kind) {
            try {
                var G = gg5d();
                if (G && G.ENEMIES && G.ENEMIES[kind]) {
                    var b = G.ENEMIES[kind];
                    return {
                        hp: num(b.hp, 10), atk: num(b.atk, 2),
                        def: num(b.def, 0), xp: num(b.xp, 2),
                        gold: num(b.gold, 1)
                    };
                }
            } catch (e) { /* fallback */ }
            return { hp: 10, atk: 2, def: 0, xp: 2, gold: 1 };
        }

        function arsenal() {
            try { return window.GraveGainArsenal || null; }
            catch (e) { return null; }
        }

        /* Resolve a canon weapon row by id (read-only). Falls back to a
         * plain blade descriptor when the arsenal lane is absent. */
        function resolveWeapon(id) {
            try {
                var A = arsenal();
                if (A && typeof A.byId === 'function') {
                    var w = A.byId(id);
                    if (w) {
                        return {
                            id: str(w.id, 'resolve-fallback'),
                            kind: str(w.kind, 'melee'),
                            dmg: num(w.dmg, 6), speed: num(w.speed, 1),
                            crit: clamp(w.crit, 0, 1), range: num(w.range, 2),
                            effect: str(w.effect, 'slash')
                        };
                    }
                }
            } catch (e) { /* fallback */ }
            return { id: 'resolve-fallback', kind: 'melee', dmg: 6, speed: 1, crit: 0.05, range: 2, effect: 'slash' };
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
                    try { ls[i](ev); } catch (e) { /* listeners never break combat */ }
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

        function spawnDamageNumber(p, amount, isCrit) {
            try {
                numberSeq += 1;
                var n = {
                    id: numberSeq,
                    pos: posCopy(p || {}),
                    u: str((p && p.u) || 'prime', 'prime'),
                    amount: Math.max(0, Math.round(num(amount, 0))),
                    crit: !!isCrit,
                    ttl: isCrit ? 1.4 : 0.9,
                    age: 0
                };
                numbers.push(n);
                if (numbers.length > 64) numbers.splice(0, numbers.length - 64);
                emit({ type: 'damage-number', id: n.id, amount: n.amount, crit: n.crit, u: n.u });
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
                        id: numbers[i].id, pos: posCopy(numbers[i].pos),
                        u: numbers[i].u, amount: numbers[i].amount,
                        crit: numbers[i].crit, age: numbers[i].age, ttl: numbers[i].ttl
                    });
                }
                return out;
            } catch (e) { return []; }
        }

        /* ================ universe-aware hitboxes ================
         * Hit resolution is gated twice: slice distance (x/y/z) must fit
         * the gravity-scaled reach, AND attacker and victim must share the
         * universe (multiverse phase rule - a blade in Prime cannot bite a
         * haunt standing in Void). Heavy universes (high gravity) shorten
         * reach: effectiveRange = baseRange / gravity. Drift never blocks a
         * hit; it pulls shots and wandering foes along W each step. */
        var TUNE = {
            meleeArc: 1.05,      /* swing cone half-angle (radians) */
            shotRadius: 0.7,     /* bolt capture radius on the slice */
            shotLife: 2.2,       /* bolt time-to-live (seconds) */
            shotSpeed: 16,       /* default bolt speed */
            heavyPutt: 0.75,     /* putt power >= this counts as heavy */
            heavyMult: 1.6,      /* heavy-putt damage multiplier */
            fleeHpFrac: 0.25,    /* hp fraction below which cowards flee */
            aggroRange: 26,      /* idle -> chase trigger (slice units) */
            strikeGap: 12,       /* GG3D melee fudge: radii sum + this */
            wRadius: 1.6,        /* W-share tolerance for shots/strikes */
            hopFollow: 0.5       /* per-tick chance a chasing foe hops after */
        };

        function effectiveRange(baseRange, universeId) {
            try {
                var base = num(baseRange, 3);
                if (!(base > 0)) base = 3;
                return base / gravityOf(universeId);
            } catch (e) { return 3; }
        }

        function sameUniverse(a, b) {
            try {
                var au = str(a, 'prime'), bu = str(b, 'prime');
                return au === bu;
            } catch (e) { return false; }
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
                var d = want - num(yaw, 0);
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

        /* ================ enemy roster ================
         * Rows mirror game.js ENEMIES kinds (hp/atk/def/xp/gold, read live
         * per spawn) plus combat locomotion: speed/scale/kind/attackInterval
         * and a home universe for hop-chase flavor. Model keys reuse the
         * shared builders by reference only (see attachModels). */
        var ENEMIES = {
            'shambler':      { speed: 4.5, scale: 1.0, kind: 'skeleton', attackInterval: 1.2, home: 'prime' },
            'swarm':         { speed: 7.0, scale: 0.7, kind: 'skeleton', attackInterval: 0.9, home: 'prime', coward: true },
            'brute':         { speed: 3.8, scale: 1.5, kind: 'skeleton', attackInterval: 1.4, home: 'prime' },
            'necro':         { speed: 3.2, scale: 1.1, kind: 'mage',     attackInterval: 1.8, home: 'prime' },
            'echoHusk':      { speed: 5.0, scale: 1.0, kind: 'skeleton', attackInterval: 1.1, home: 'echo' },
            'dreamMaw':      { speed: 4.0, scale: 1.2, kind: 'skeleton', attackInterval: 1.3, home: 'dream' },
            'voidReaver':    { speed: 6.0, scale: 1.4, kind: 'skeleton', attackInterval: 1.0, home: 'void' },
            'bloomWisp':     { speed: 6.5, scale: 0.8, kind: 'mage',     attackInterval: 1.6, home: 'bloom', coward: true },
            'staticJitter':  { speed: 7.5, scale: 1.0, kind: 'mage',     attackInterval: 1.2, home: 'static' }
        };

        var foes = [];
        var foeSeq = 0;

        function spawnEnemy(key, p, opts) {
            try {
                var row = ENEMIES[key] || ENEMIES.shambler;
                var base = canonFoeDef(ENEMIES[key] ? key : 'shambler');
                opts = opts || {};
                foeSeq += 1;
                var hp = Math.max(1, Math.round(num(opts.hp, base.hp)));
                var f = {
                    id: foeSeq,
                    key: key,
                    modelKey: str((opts && opts.modelKey) || key, key),
                    pos: posCopy(p || {}),
                    u: str((p && p.u) || opts.u || row.home || 'prime', 'prime'),
                    vel: pos4(0, 0, 0, 0),
                    kx: 0, ky: 0, kz: 0, kw: 0, /* knockback velocity, GG3D-style decay */
                    hp: hp,
                    maxHp: Math.max(1, Math.round(num(opts.maxHp, hp))),
                    atk: num(opts.atk, base.atk),
                    def: num(opts.def, base.def),
                    xp: Math.max(0, Math.round(num(opts.xp, base.xp))),
                    gold: Math.max(0, Math.round(num(opts.gold, base.gold))),
                    dmg: num(opts.dmg, base.atk),
                    speed: num(opts.speed, row.speed),
                    scale: num(opts.scale, row.scale),
                    radius: num(opts.scale, row.scale) * 1.1,
                    kind: str(opts.kind || row.kind, 'skeleton'),
                    attackInterval: num(opts.attackInterval, row.attackInterval),
                    attackTimer: 0,
                    coward: !!((opts && opts.coward) || row.coward),
                    boss: !!((opts && opts.boss)),
                    state: 'idle', /* idle -> chase -> strike -> (flee) */
                    alive: true
                };
                foes.push(f);
                emit({ type: 'spawn', id: f.id, key: f.key, u: f.u, pos: posCopy(f.pos) });
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
         * (guarded, best-effort - mirrors gravegain3d-endless.js). The 2D
         * gore path takes (x, y, kind), so the slice projection is passed. */
        function goreKill(p, foe) {
            try {
                var kind = (foe && foe.boss) ? 'boss' : 'kill';
                var G = null;
                try { G = window.FourweirdGore || null; } catch (e) { G = null; }
                if (G && typeof G.spawn === 'function') {
                    try {
                        G.spawn(num(p && p.x, 0), num(p && p.y, 0), kind);
                        return kind;
                    } catch (e) { return null; }
                }
                return null;
            } catch (e) { return null; }
        }

        /* ================ damage + kill rewards ================
         * applyDamage hurts OUR foe instances (owned combat state, never
         * window.GraveGain5D run state). On death killFoe routes gore,
         * emits the reward packet, and calls hooks.onKillReward so the HOST
         * applies xp/gold to its own run (we never write game state). */
        function applyDamage(foe, amount, opts) {
            try {
                if (!foe || !foe.alive) return 0;
                opts = opts || {};
                var raw = Math.max(1, Math.round(num(amount, 1)));
                var dealt = Math.max(1, raw - num(foe.def, 0));
                foe.hp -= dealt;
                spawnDamageNumber({ x: foe.pos.x, y: foe.pos.y, u: foe.u }, dealt, !!opts.crit);
                /* knockback kick, GG3D-style decay in updateFoes */
                if (opts.from) {
                    try {
                        var dx = num(foe.pos.x, 0) - num(opts.from.x, 0);
                        var dz = num(foe.pos.z, 0) - num(opts.from.z, 0);
                        var l = Math.sqrt(dx * dx + dz * dz) || 1;
                        var kb = num(opts.knockback, 4);
                        foe.kx += (dx / l) * kb;
                        foe.kz += (dz / l) * kb;
                    } catch (e) { /* cosmetic */ }
                }
                emit({ type: 'hit', id: foe.id, key: foe.key, damage: dealt, hp: Math.max(0, foe.hp), crit: !!opts.crit, u: foe.u });
                if (foe.hp <= 0) {
                    killFoe(foe, opts.hooks || null);
                }
                return dealt;
            } catch (e) { return 0; }
        }

        function killFoe(foe, hooks) {
            try {
                if (!foe || !foe.alive) return null;
                foe.alive = false;
                foe.hp = 0;
                foe.state = 'dead';
                var reward = { xp: Math.max(0, foe.xp | 0), gold: Math.max(0, foe.gold | 0) };
                var routed = null;
                try { routed = goreKill(foe.pos, foe); } catch (e) { routed = null; }
                emit({ type: 'kill', id: foe.id, key: foe.key, xp: reward.xp, gold: reward.gold, gore: routed, u: foe.u });
                try {
                    if (hooks && typeof hooks.onKillReward === 'function') {
                        hooks.onKillReward(reward, foe);
                    }
                } catch (e) { /* host hook faults never break combat */ }
                return reward;
            } catch (e) { return null; }
        }

        function grantXP(amount, hooks) {
            try {
                var n = Math.max(0, Math.round(num(amount, 0)));
                emit({ type: 'xp', amount: n });
                try {
                    if (hooks && typeof hooks.onXP === 'function') hooks.onXP(n);
                } catch (e) { /* ignore */ }
                return n;
            } catch (e) { return 0; }
        }

        /* ================ melee attacks ================
         * meleeSwing resolves one swing against OUR foe list: slice
         * distance within gravity-scaled reach + shared universe + W
         * share + facing arc. Damage comes from the canon arsenal row
         * (or explicit opts) plus attacker atk. Returns the hit list; the
         * host applies anything owed to ITS run via hooks/events. */
        function meleeSwing(opts) {
            try {
                opts = opts || {};
                var from = posCopy(opts.from || {});
                var atkU = str(opts.u || (opts.from && opts.from.u) || 'prime', 'prime');
                var weapon = opts.weaponId ? resolveWeapon(opts.weaponId) : resolveWeapon('rusty-shortsword');
                var baseRange = num(opts.range, weapon.range);
                var reach = effectiveRange(baseRange, atkU) + num(opts.fudge, TUNE.strikeGap / 12);
                var hits = [];
                var rng = (typeof opts.rng === 'function') ? opts.rng : null;
                for (var i = 0; i < foes.length; i++) {
                    var f = foes[i];
                    if (!f || !f.alive) continue;
                    try {
                        if (!sameUniverse(f.u, atkU)) continue; /* phase rule */
                        if (!wOverlap(f.pos, from, num(opts.wRadius, TUNE.wRadius))) continue;
                        if (sliceDist(f.pos, from) > reach + num(f.radius, 1)) continue;
                        if (!inArc(from, num(opts.yaw, 0), f.pos, num(opts.arc, TUNE.meleeArc))) continue;
                        var roll = rollCrit(num(opts.critChance, weapon.crit), num(opts.critMult, 2), rng);
                        var dmg = Math.max(1, num(opts.atk, num(opts.damage, weapon.dmg)));
                        dmg = Math.max(1, Math.round(dmg * roll.mult));
                        var dealt = applyDamage(f, dmg, {
                            crit: roll.crit, from: from,
                            knockback: num(opts.knockback, 4),
                            hooks: opts.hooks || null
                        });
                        hits.push({ id: f.id, key: f.key, damage: dealt, crit: roll.crit, killed: !f.alive });
                    } catch (e) { /* one bad foe never stalls the swing */ }
                }
                emit({ type: 'swing', weapon: weapon.id, universe: atkU, reach: reach, hits: hits.length });
                return { weapon: weapon.id, universe: atkU, reach: reach, hits: hits };
            } catch (e) { return { weapon: 'resolve-fallback', universe: 'prime', reach: 0, hits: [] }; }
        }

        /* ================ ranged attacks ================
         * Shots carry their origin universe; gravity bends them (heavy
         * universes drag bolts down along -y) and drift pushes them along
         * W. A bolt can only strike foes sharing its universe. */
        var shots = [];
        var shotSeq = 0;

        function fireShot(opts) {
            try {
                opts = opts || {};
                var from = posCopy(opts.from || {});
                var u = str(opts.u || (opts.from && opts.from.u) || 'prime', 'prime');
                var dir = opts.dir || {};
                var dx = num(dir.x, 0), dy = num(dir.y, 0), dz = num(dir.z, 0), dw = num(dir.w, 0);
                var l = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
                if (!(l > 0)) { dx = 1; dy = 0; dz = 0; dw = 0; l = 1; }
                var speed = num(opts.speed, TUNE.shotSpeed);
                if (!(speed > 0)) speed = TUNE.shotSpeed;
                shotSeq += 1;
                var weapon = opts.weaponId ? resolveWeapon(opts.weaponId) : null;
                var s = {
                    id: shotSeq,
                    pos: from,
                    u: u,
                    vx: (dx / l) * speed, vy: (dy / l) * speed,
                    vz: (dz / l) * speed, vw: (dw / l) * speed,
                    speed: speed,
                    damage: Math.max(1, Math.round(num(opts.damage, weapon ? weapon.dmg : 8))),
                    critChance: num(opts.critChance, weapon ? weapon.crit : 0.08),
                    critMult: num(opts.critMult, 2),
                    knockback: num(opts.knockback, 3),
                    by: str(opts.by, 'player'),
                    foe: !!opts.foe,
                    ttl: num(opts.ttl, TUNE.shotLife),
                    age: 0,
                    alive: true,
                    hooks: opts.hooks || null,
                    rng: (typeof opts.rng === 'function') ? opts.rng : null
                };
                shots.push(s);
                if (shots.length > 64) shots.splice(0, shots.length - 64);
                emit({ type: 'shot', id: s.id, u: s.u, by: s.by });
                return s;
            } catch (e) { return null; }
        }

        function getShots() {
            try { return shots.slice(); }
            catch (e) { return []; }
        }

        function clearShots() {
            try { shots.length = 0; return true; }
            catch (e) { return false; }
        }

        function stepShots(dt) {
            try {
                dt = num(dt, 0.016);
                if (!(dt > 0)) dt = 0.016;
                var landed = [];
                for (var i = shots.length - 1; i >= 0; i--) {
                    var s = shots[i];
                    try {
                        if (!s || !s.alive) { shots.splice(i, 1); continue; }
                        s.age += dt;
                        if (s.age >= s.ttl) { s.alive = false; shots.splice(i, 1); continue; }
                        /* universe gravity drags the bolt down; drift pushes W */
                        var g = gravityOf(s.u);
                        s.vy -= (g - 1) * 9.5 * dt;
                        s.vw += driftOf(s.u) * 6 * dt;
                        s.pos.x += s.vx * dt;
                        s.pos.y += s.vy * dt;
                        s.pos.z += s.vz * dt;
                        s.pos.w += s.vw * dt;
                        if (!s.foe) {
                            for (var j = 0; j < foes.length; j++) {
                                var f = foes[j];
                                if (!f || !f.alive) continue;
                                if (!sameUniverse(f.u, s.u)) continue;
                                if (!wOverlap(f.pos, s.pos, TUNE.wRadius)) continue;
                                if (sliceDist(f.pos, s.pos) > TUNE.shotRadius + num(f.radius, 1)) continue;
                                var roll = rollCrit(s.critChance, s.critMult, s.rng);
                                var dealt = applyDamage(f, Math.max(1, Math.round(s.damage * roll.mult)), {
                                    crit: roll.crit, from: s.pos,
                                    knockback: s.knockback, hooks: s.hooks
                                });
                                landed.push({ shot: s.id, foe: f.id, damage: dealt, crit: roll.crit, killed: !f.alive });
                                emit({ type: 'shot-hit', shot: s.id, foe: f.id, u: s.u });
                                s.alive = false;
                                shots.splice(i, 1);
                                break;
                            }
                        }
                    } catch (e) { /* one bad bolt never stalls the volley */ }
                }
                stepNumbers(dt);
                return landed;
            } catch (e) { return []; }
        }

        /* ================ enemy AI: chase / strike / flee ================
         * updateFoes steers OUR foes toward the given player marker
         * { x, y, z, w, u }. Foes sharing the player's universe chase on
         * the slice and strike in reach (universe-scaled). Foes stranded
         * in another universe drift W-ward and may hop after their prey
         * (chase across hops, capped per tick). Cowards - or any foe below
         * fleeHpFrac hp - break off and flee. Player damage is delivered
         * via hooks.onPlayerDamage / player.takeDamage; we never touch
         * window.GraveGain5D run state ourselves. */
        function steerToward(f, px, pz, dt) {
            try {
                var dx = px - num(f.pos.x, 0), dz = pz - num(f.pos.z, 0);
                var l = Math.sqrt(dx * dx + dz * dz) || 1;
                var step = num(f.speed, 5) * num(dt, 0.016);
                f.pos.x += (dx / l) * step;
                f.pos.z += (dz / l) * step;
            } catch (e) { /* cornered */ }
        }

        function updateFoes(player, hooks, dt) {
            try {
                player = player || {};
                hooks = hooks || {};
                dt = num(dt, 0.016);
                if (!(dt > 0)) dt = 0.016;
                var px = num(player.x, 0), py = num(player.y, 0),
                    pz = num(player.z, 0), pw = num(player.w, 0);
                var pu = str(player.u, 'prime');
                var pr = num(player.radius, 1);
                var struck = [];
                for (var i = 0; i < foes.length; i++) {
                    var f = foes[i];
                    if (!f || !f.alive) continue;
                    try {
                        if (f.attackTimer > 0) f.attackTimer -= dt;
                        /* knockback decay, GG3D-style */
                        f.pos.x += num(f.kx, 0) * dt;
                        f.pos.y += num(f.ky, 0) * dt;
                        f.pos.z += num(f.kz, 0) * dt;
                        f.pos.w += num(f.kw, 0) * dt;
                        f.kx *= (1 - Math.min(1, 8 * dt));
                        f.ky *= (1 - Math.min(1, 8 * dt));
                        f.kz *= (1 - Math.min(1, 8 * dt));
                        f.kw *= (1 - Math.min(1, 8 * dt));
                        /* universe drift tugs every foe along W */
                        f.pos.w += driftOf(f.u) * dt;

                        if (!sameUniverse(f.u, pu)) {
                            /* stranded across a hop: drift toward the prey's
                             * fold, then follow through the hop itself */
                            f.state = 'chase';
                            var pull = pw - num(f.pos.w, 0);
                            f.pos.w += clamp(pull, -1, 1) * num(f.speed, 5) * dt;
                            var rngHop = null;
                            try { rngHop = (hooks && typeof hooks.rng === 'function') ? hooks.rng() : Math.random(); }
                            catch (e) { rngHop = 0.99; }
                            if (rngHop < TUNE.hopFollow * dt * 10 && f.state === 'chase') {
                                f.u = pu;
                                f.pos.w = pw;
                                emit({ type: 'foe-hop', id: f.id, key: f.key, to: pu });
                            }
                            continue;
                        }

                        var d = sliceDist(f.pos, { x: px, y: py, z: pz });
                        if (f.state === 'idle' && d < TUNE.aggroRange) {
                            f.state = 'chase';
                            emit({ type: 'aggro', id: f.id, key: f.key });
                        }
                        var hpFrac = (num(f.maxHp, 1) > 0) ? num(f.hp, 0) / num(f.maxHp, 1) : 1;
                        if ((f.coward || hpFrac < TUNE.fleeHpFrac) && hpFrac < TUNE.fleeHpFrac && f.state !== 'dead') {
                            f.state = 'flee';
                        }
                        if (f.state === 'flee') {
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
                                /* ranged caster holds position and hurls a bolt */
                                if (f.attackTimer <= 0) {
                                    f.attackTimer = num(f.attackInterval, 1.8);
                                    fireShot({
                                        from: { x: f.pos.x, y: f.pos.y, z: f.pos.z, w: f.pos.w, u: f.u },
                                        u: f.u,
                                        dir: { x: px - num(f.pos.x, 0), y: 0, z: pz - num(f.pos.z, 0), w: pw - num(f.pos.w, 0) },
                                        speed: 14, damage: num(f.dmg, f.atk), by: 'foe-' + f.id, foe: true,
                                        hooks: null
                                    });
                                    f.state = 'strike';
                                    emit({ type: 'foe-cast', id: f.id, key: f.key });
                                }
                            } else {
                                steerToward(f, px, pz, dt);
                                /* melee reach: radii sum + fudge, scaled by universe gravity */
                                var reach = (num(f.radius, 1) + pr + TUNE.strikeGap / 12) / gravityOf(f.u);
                                var ppos = { x: px, y: py, z: pz };
                                if (sliceDist(f.pos, ppos) < reach && wOverlap(f.pos, { x: px, y: py, z: pz, w: pw }, TUNE.wRadius)) {
                                    f.state = 'strike';
                                    if (f.attackTimer <= 0) {
                                        f.attackTimer = num(f.attackInterval, 1.2);
                                        var dealt = Math.max(1, Math.round(num(f.dmg, f.atk)));
                                        var hurt = false;
                                        try {
                                            if (player && typeof player.takeDamage === 'function') {
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
         * a GraveGain5D round's stroke events and emits crossover events
         * (the host calls meleeSwing with the returned descriptor). */
        function golfStrike(power, aim) {
            try {
                power = clamp(power, 0, 1);
                aim = aim || {};
                var heavy = power >= TUNE.heavyPutt;
                var u = str(aim.u || (aim.from && aim.from.u) || 'prime', 'prime');
                var weapon = aim.weaponId ? resolveWeapon(aim.weaponId) : resolveWeapon('rusty-shortsword');
                var atk = {
                    from: posCopy(aim.from || {}),
                    u: u,
                    yaw: num(aim.yaw, 0),
                    range: num(aim.range, heavy ? 5.5 : 3.5),
                    arc: num(aim.arc, TUNE.meleeArc),
                    wRadius: num(aim.wRadius, TUNE.wRadius + (heavy ? 0.8 : 0)),
                    damage: Math.max(1, num(aim.damage, num(aim.atk, weapon.dmg))) * (heavy ? TUNE.heavyMult : (0.5 + power * 0.5)),
                    atk: Math.max(1, num(aim.atk, weapon.dmg)) * (heavy ? TUNE.heavyMult : (0.5 + power * 0.5)),
                    critChance: num(aim.critChance, heavy ? 0.2 : weapon.crit),
                    critMult: num(aim.critMult, 2),
                    knockback: num(aim.knockback, heavy ? 9 : 3),
                    weaponId: weapon.id,
                    heavy: heavy,
                    power: power,
                    by: 'golf-putt'
                };
                emit({ type: 'golf-strike', heavy: heavy, power: power, damage: atk.damage, universe: u });
                return atk;
            } catch (e) { return null; }
        }

        function hookGolfRound(round) {
            try {
                if (!round) return false;
                var G = null;
                try { G = gg5d(); } catch (e) { G = null; }
                var attach = function (r) {
                    try {
                        if (G && typeof G.onEvent === 'function') {
                            return G.onEvent(r, function (ev) {
                                try {
                                    if (!ev || ev.type !== 'stroke') return;
                                    var atk = golfStrike(ev.power, { from: r.ball ? r.ball.pos : {}, u: r.universe || (r.run && r.run.universe) });
                                    emit({ type: 'golf-crossover', stroke: ev.stroke, heavy: !!(atk && atk.heavy) });
                                } catch (e) { /* ignore */ }
                            });
                        }
                        if (r && typeof r.onStroke === 'function') {
                            r.onStroke(function (ev) {
                                try { golfStrike(num(ev && ev.power, 0), { from: (r.ball && r.ball.pos) || {}, u: r.universe }); }
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

        /* ================ model reuse (by reference only) ================
         * The graphics lanes own every mesh. This accessor only reads the
         * shared registries so a renderer can bind foe markers; it creates
         * nothing and defines no geometry of any kind. */
        function attachModels() {
            try {
                var gfx = null, models = null, g5 = null;
                try { gfx = window.GraveGainGraphics3D || null; } catch (e) { gfx = null; }
                try { models = window.GraveGain3DModels || null; } catch (e) { models = null; }
                try { g5 = gg5d(); } catch (e) { g5 = null; }
                return { graphics3D: gfx, models3D: models, game5D: g5 };
            } catch (e) { return { graphics3D: null, models3D: null, game5D: null }; }
        }

        /* Resolve a foe's marker through the shared 3D builders (which the
         * graphics lane owns). Never builds here. */
        function foeMarker(foe) {
            try {
                if (!foe) return null;
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
                universeTable: universeTable,
                universeById: universeById,
                gravityOf: gravityOf,
                driftOf: driftOf,
                classDef: classDef,
                resolveWeapon: resolveWeapon,
                effectiveRange: effectiveRange,
                sameUniverse: sameUniverse,
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

        try { window.GraveGain5DCombat = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: 'gravegain5d-combat', version: VERSION });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: combat core stays silent */ }
})();
