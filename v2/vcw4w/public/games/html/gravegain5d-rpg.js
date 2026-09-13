/* GraveGain5D RPG systems core (agent g5d-02, envelope DS-G5D-02).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain5DRpg. Never throws:
 * every public hook is try/catch guarded. No DOM listeners, no overlays,
 * no canvas, no network, no secrets. ASCII only.
 *
 * THEME: GraveGain5D is multiverse-transcendence golf-plus-dungeon
 * (game.js): every hop rewrites gravity, chain hops build combo, the
 * paradox meter punishes hop spam, collapsing universes run a doom clock.
 * This file is its progression heart. Golf trials award XP like dungeon
 * clears: a sunk putt in the Void counts the same as a cleared haunt room.
 *
 * Canon mirrors public/games/gravegain5d/game.js (CLASSES putter/warden/
 * drifter, xpNext, paradox/chain/combo/doom) by REFERENCE when present
 * (window.GraveGain5D is read-only here, never written). Flavor mirrors
 * content/gravegain5d-modes.ts NPC speakers (canon guides only, named in
 * GUIDES). Quest-instance shape mirrors public/games/html/
 * gravegain-sidequests.js ({ uid, kind, target, progress, done }).
 *
 * Integrator: load any time (no dependencies). Combat lane calls
 * awardXP()/awardKillLoot(); golf lane calls trialClear(holeIdx, universe).
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain5DRpg) return;

        var VERSION = '1.0.0';
        var MAX_LEVEL = 20;
        var MAX_INV = 24;

        /* ================ tiny guards ================ */
        function num(n, fallback) {
            try {
                if (typeof n === 'number' && isFinite(n)) return n;
                var v = parseFloat(n);
                return (isFinite(v)) ? v : fallback;
            } catch (e) { return fallback; }
        }

        function str(s, fallback) {
            try {
                if (typeof s === 'string' && s.length) return s;
                return fallback;
            } catch (e) { return fallback; }
        }

        function clampInt(n, lo, hi, fallback) {
            try {
                n = Math.floor(num(n, fallback));
                if (n < lo) return lo;
                if (n > hi) return hi;
                return n;
            } catch (e) { return fallback; }
        }

        /* Seeded PRNG (mulberry32) so loot rolls are deterministic in tests. */
        function rngFrom(seed) {
            try {
                var a = 0;
                if (typeof seed === 'number' && isFinite(seed)) { a = seed >>> 0; }
                else if (typeof seed === 'string') {
                    var h = 2166136261 >>> 0;
                    for (var i = 0; i < seed.length; i++) {
                        h ^= seed.charCodeAt(i);
                        h = Math.imul(h, 16777619) >>> 0;
                    }
                    a = h >>> 0;
                } else { a = (Date.now() % 4294967296) >>> 0; }
                if (!a) a = 0x9E3779B9;
                return function () {
                    try {
                        a = (a + 0x6D2B79F5) >>> 0;
                        var t = a;
                        t = Math.imul(t ^ (t >>> 15), t | 1);
                        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                    } catch (e) { return 0.5; }
                };
            } catch (e) { return Math.random; }
        }

        function pickWeighted(rows, roll) {
            try {
                var total = 0;
                for (var i = 0; i < rows.length; i++) total += num(rows[i].w, 0);
                if (!(total > 0)) return rows.length ? rows[0] : null;
                var r = num(roll, 0) * total;
                for (var j = 0; j < rows.length; j++) {
                    r -= num(rows[j].w, 0);
                    if (r < 0) return rows[j];
                }
                return rows[rows.length - 1];
            } catch (e) { return null; }
        }

        /* Read-only bridge to the 5D rules core. Never writes. */
        function canon() {
            try { return window.GraveGain5D || null; } catch (e) { return null; }
        }

        /* ================ classes ================
         * Mirror of game.js CLASSES (keys putter/warden/drifter kept so
         * combat code can pass game.js cls keys straight through).
         * Stat block: hp (max vigor), atk (might), def (ward), spd (pace).
         */
        var CLASSES = {
            'putter': {
                id: 'putter',
                name: 'Void Putter',
                title: 'Chain Striker of the Compact',
                flavor: 'Sworn to President Angel Good; strikes every foe in reach and blooms the combo.',
                base: { hp: 24, atk: 6, def: 1, spd: 3 },
                growth: { hp: 4, atk: 1.0, def: 0.4, spd: 0.3 },
                ability: { name: 'Chain Leap', cd: 5 },
                startingWeapon: 'grave-putter'
            },
            'warden': {
                id: 'warden',
                name: 'Paradox Warden',
                title: 'Anchor of the Collapse Line',
                flavor: 'Trained by Warchief Groknak and Ember Cartographer Sable; vents paradox and holds the line.',
                base: { hp: 32, atk: 4, def: 3, spd: 1 },
                growth: { hp: 6, atk: 0.8, def: 0.8, spd: 0.2 },
                ability: { name: 'Anchor Reality', cd: 6 },
                startingWeapon: 'anchor-wedge'
            },
            'drifter': {
                id: 'drifter',
                name: 'Universe Drifter',
                title: 'Reader of the Lattice',
                flavor: 'Guided by Transcendence Cartographer Null and Fold Cartographer Vex; hops free and strikes fast.',
                base: { hp: 20, atk: 7, def: 0, spd: 4 },
                growth: { hp: 3, atk: 1.2, def: 0.2, spd: 0.5 },
                ability: { name: 'Free Hop', cd: 4 },
                startingWeapon: 'drift-iron'
            }
        };

        function getClass(id) {
            try {
                if (CLASSES[id]) return CLASSES[id];
                /* Canon-name aliases (case-insensitive, spaces/dashes free). */
                var k = str(id, '').toLowerCase().replace(/[^a-z]/g, '');
                if (k === 'voidputter' || k === 'putterofthegraves') return CLASSES.putter;
                if (k === 'paradoxwarden') return CLASSES.warden;
                if (k === 'universedrifter') return CLASSES.drifter;
                return null;
            } catch (e) { return null; }
        }

        function listClasses() {
            try { return [CLASSES.putter, CLASSES.warden, CLASSES.drifter]; }
            catch (e) { return []; }
        }

        /* Canon NPC guides (speakers only, ASCII; portraits live in content). */
        var GUIDES = [
            { id: 'hub-keeper', speaker: 'President Angel Good' },
            { id: 'dungeon-ghost', speaker: 'Echo of Elder Mirathiel' },
            { id: 'orc-ally', speaker: 'Warchief Groknak' },
            { id: 'ember-cartographer', speaker: 'Ember Cartographer Sable' },
            { id: 'ossuary-twins', speaker: 'Ossuary Twins, Pell and Marrow' },
            { id: 'fold-guide', speaker: 'Fold Cartographer Vex' },
            { id: 'transcendence-guide', speaker: 'Transcendence Cartographer Null' }
        ];

        /* ================ universes (dungeon order) ================ */
        var UNIVERSES = [
            { id: 'prime', name: 'Prime Array', par: 3, xp: 60, blurb: 'Home water. No mods, no mercy.' },
            { id: 'echo', name: 'Echo Expanse', par: 3, xp: 70, blurb: 'Ghost replays linger. Putts echo twice.' },
            { id: 'dream', name: 'Dream Shallows', par: 4, xp: 80, blurb: 'Soft physics, generous par, sleepy hazards.' },
            { id: 'void', name: 'Void Maw', par: 3, xp: 110, blurb: 'Heavy ball, hungry drift. Collapses fast when paradox is hot.' },
            { id: 'bloom', name: 'Bloom Lattice', par: 4, xp: 90, blurb: 'Floaty, forgiving, chain-hop combos bloom here.' },
            { id: 'static', name: 'Static Storm', par: 4, xp: 100, blurb: 'Noise scrambles aim. Hop out before it collapses.' }
        ];

        function getUniverse(id) {
            try {
                for (var i = 0; i < UNIVERSES.length; i++) {
                    if (UNIVERSES[i].id === id) return UNIVERSES[i];
                }
                return null;
            } catch (e) { return null; }
        }

        /* ================ XP / levels ================
         * Curve mirrors game.js xpNext(level) = 8 + level * 6.
         */
        function xpForLevel(level) {
            try {
                var c = canon();
                if (c && typeof c.xpNext === 'function') {
                    var v = Math.floor(num(c.xpNext(level), NaN));
                    if (v > 0) return v;
                }
                return 8 + (clampInt(level, 1, MAX_LEVEL, 1)) * 6;
            } catch (e) { return 14; }
        }

        function statsFor(classId, level) {
            try {
                var def = getClass(classId);
                if (!def) return null;
                var lv = clampInt(level, 1, MAX_LEVEL, 1);
                var g = (lv - 1);
                return {
                    hp: Math.round(def.base.hp + g * def.growth.hp),
                    atk: Math.round((def.base.atk + g * def.growth.atk) * 10) / 10,
                    def: Math.round((def.base.def + g * def.growth.def) * 10) / 10,
                    spd: Math.round((def.base.spd + g * def.growth.spd) * 10) / 10
                };
            } catch (e) { return null; }
        }

        var heroSeq = 0;

        function newCharacter(classId, name) {
            try {
                var def = getClass(classId) || CLASSES.putter;
                var st = statsFor(def.id, 1);
                heroSeq += 1;
                var hero = {
                    uid: 'gg5d-hero-' + Date.now().toString(36) + '-' + heroSeq,
                    classId: def.id,
                    name: str(name, def.name),
                    level: 1,
                    xp: 0,
                    xpNext: xpForLevel(1),
                    hp: st.hp, maxHp: st.hp,
                    atk: st.atk, def: st.def, spd: st.spd,
                    gold: 0,
                    kills: 0,
                    trialsCleared: 0,
                    dungeonsCleared: 0,
                    inv: [],
                    equipped: null
                };
                var w = itemById(def.startingWeapon);
                if (w) { addItem(hero, w); equip(hero, w.id); }
                return hero;
            } catch (e) { return null; }
        }

        /* awardXP(hero, n): adds XP, loops levels (cap MAX_LEVEL), grows
         * stats per class growth. Returns { gained, level, leveledUp, levels }. */
        function awardXP(hero, n) {
            try {
                if (!hero || typeof hero !== 'object' || !getClass(hero.classId)) {
                    return { gained: 0, level: 1, leveledUp: false, levels: 0 };
                }
                var gain = Math.max(0, Math.floor(num(n, 0)));
                if (!(gain > 0)) {
                    return { gained: 0, level: hero.level, leveledUp: false, levels: 0 };
                }
                hero.xp = num(hero.xp, 0) + gain;
                var ups = 0;
                while (hero.level < MAX_LEVEL && hero.xp >= xpForLevel(hero.level)) {
                    hero.xp -= xpForLevel(hero.level);
                    hero.level += 1;
                    ups += 1;
                    var st = statsFor(hero.classId, hero.level);
                    if (st) {
                        hero.maxHp = st.hp; hero.atk = st.atk;
                        hero.def = st.def; hero.spd = st.spd;
                        hero.hp = Math.min(hero.maxHp, num(hero.hp, 0) + Math.ceil(hero.maxHp / 4));
                    }
                }
                if (hero.level >= MAX_LEVEL) hero.xp = Math.min(hero.xp, xpForLevel(MAX_LEVEL));
                hero.xpNext = xpForLevel(hero.level);
                return { gained: gain, level: hero.level, leveledUp: ups > 0, levels: ups };
            } catch (e) { return { gained: 0, level: 1, leveledUp: false, levels: 0 }; }
        }

        /* ================ items / loot / inventory ================ */
        var ITEMS = [
            { id: 'grave-putter', name: 'Grave Putter', slot: 'weapon', atk: 2, price: 40, blurb: 'Standard Compact issue. Putt clean.' },
            { id: 'anchor-wedge', name: 'Anchor Wedge', slot: 'weapon', atk: 1, def: 2, price: 45, blurb: 'Wardens vent paradox with every chip.' },
            { id: 'drift-iron', name: 'Drift Iron', slot: 'weapon', atk: 3, price: 45, blurb: 'Light head, fast hands, free hops.' },
            { id: 'echo-ball', name: 'Echo Ball', slot: 'charm', atk: 1, price: 60, blurb: 'Replays your best line twice.' },
            { id: 'dream-caddy', name: 'Dream Caddy Biscuit', slot: 'consumable', heal: 8, price: 15, blurb: 'Soft snack. Restores 8 HP.' },
            { id: 'void-tether', name: 'Void Tether', slot: 'charm', def: 2, price: 90, blurb: 'Holds you out of the Maw one beat longer.' },
            { id: 'bloom-tee', name: 'Bloom Tee', slot: 'charm', atk: 2, price: 80, blurb: 'Combos bloom around it.' },
            { id: 'static-ward', name: 'Static Ward', slot: 'charm', def: 3, price: 110, blurb: 'Scrambles the noise back.' },
            { id: 'paradox-vent', name: 'Paradox Vent', slot: 'consumable', vent: 25, price: 50, blurb: 'Vents 25 paradox. Wardens approve.' },
            { id: 'transcendence-flag', name: 'Transcendence Flag', slot: 'relic', atk: 4, def: 2, price: 300, blurb: 'Null marked this lattice. Legendary.' }
        ];

        function itemById(id) {
            try {
                for (var i = 0; i < ITEMS.length; i++) {
                    if (ITEMS[i].id === id) return ITEMS[i];
                }
                return null;
            } catch (e) { return null; }
        }

        /* One loot table per universe; weights mirror foe danger. */
        var LOOT_TABLES = {
            prime: [{ id: 'grave-putter', w: 3 }, { id: 'dream-caddy', w: 5 }, { id: 'echo-ball', w: 2 }],
            echo: [{ id: 'echo-ball', w: 5 }, { id: 'dream-caddy', w: 3 }, { id: 'bloom-tee', w: 1 }],
            dream: [{ id: 'dream-caddy', w: 6 }, { id: 'echo-ball', w: 2 }, { id: 'paradox-vent', w: 2 }],
            void: [{ id: 'void-tether', w: 4 }, { id: 'paradox-vent', w: 3 }, { id: 'transcendence-flag', w: 1 }],
            bloom: [{ id: 'bloom-tee', w: 4 }, { id: 'dream-caddy', w: 4 }, { id: 'echo-ball', w: 2 }],
            static: [{ id: 'static-ward', w: 4 }, { id: 'paradox-vent', w: 3 }, { id: 'void-tether', w: 2 }]
        };

        function rollLoot(tableId, rand) {
            try {
                var rows = LOOT_TABLES[tableId] || LOOT_TABLES.prime;
                var r = (typeof rand === 'function') ? rand : rngFrom('gg5d:' + str(tableId, 'prime'));
                var row = pickWeighted(rows, r());
                if (!row) return null;
                return itemById(row.id);
            } catch (e) { return null; }
        }

        function addItem(hero, item) {
            try {
                if (!hero || !item) return false;
                hero.inv = hero.inv || [];
                if (hero.inv.length >= MAX_INV) return false;
                hero.inv.push(item.id || item);
                return true;
            } catch (e) { return false; }
        }

        function equip(hero, itemId) {
            try {
                if (!hero || !itemId) return false;
                var it = (typeof itemId === 'object') ? itemId : itemById(itemId);
                if (!it || it.slot === 'consumable') return false;
                hero.equipped = it.id;
                return true;
            } catch (e) { return false; }
        }

        function useConsumable(hero, itemId) {
            try {
                if (!hero || !itemId) return { ok: false };
                var id = (typeof itemId === 'object') ? itemId.id : itemId;
                var it = itemById(id);
                if (!it || it.slot !== 'consumable') return { ok: false };
                hero.inv = hero.inv || [];
                var ix = hero.inv.indexOf(id);
                if (ix < 0) return { ok: false };
                hero.inv.splice(ix, 1);
                if (it.heal) hero.hp = Math.min(num(hero.maxHp, 1), num(hero.hp, 0) + it.heal);
                return { ok: true, id: id, hp: hero.hp, vent: it.vent || 0 };
            } catch (e) { return { ok: false }; }
        }

        /* ================ kill-loot API (combat hooks) ================
         * awardKillLoot(hero, foeKind): reads foe xp/gold from canon
         * ENEMIES when present (read-only), else local fallback; awards
         * XP, adds gold, rolls a universe loot drop on elite kills.
         * Returns { ok, xp, gold, loot, ...award }.
         */
        var FOE_FALLBACK = {
            shambler: { xp: 3, gold: 2 }, swarm: { xp: 2, gold: 1 },
            brute: { xp: 5, gold: 4 }, necro: { xp: 7, gold: 5 },
            echoHusk: { xp: 4, gold: 2 }, dreamMaw: { xp: 4, gold: 3 },
            voidReaver: { xp: 8, gold: 6 }, bloomWisp: { xp: 3, gold: 2 },
            staticJitter: { xp: 6, gold: 4 }
        };

        function foeReward(kind) {
            try {
                var c = canon();
                if (c && c.ENEMIES && c.ENEMIES[kind]) {
                    return {
                        xp: Math.max(0, Math.floor(num(c.ENEMIES[kind].xp, 0))),
                        gold: Math.max(0, Math.floor(num(c.ENEMIES[kind].gold, 0)))
                    };
                }
                if (FOE_FALLBACK[kind]) return FOE_FALLBACK[kind];
                return { xp: 2, gold: 1 };
            } catch (e) { return { xp: 2, gold: 1 }; }
        }

        function awardKillLoot(hero, foeKind, universeId) {
            try {
                if (!hero || typeof hero !== 'object' || !getClass(hero.classId)) {
                    return { ok: false, xp: 0, gold: 0, loot: null };
                }
                var kind = str(foeKind, 'shambler');
                var uni = getUniverse(universeId) ? universeId : 'prime';
                var rw = foeReward(kind);
                var res = awardXP(hero, rw.xp);
                hero.gold = num(hero.gold, 0) + rw.gold;
                hero.kills = num(hero.kills, 0) + 1;
                var loot = null;
                try {
                    /* Elite haunts (5+ xp) may drop their universe table. */
                    if (rw.xp >= 5 && rngFrom('kill:' + kind + ':' + hero.kills)() < 0.35) {
                        loot = rollLoot(uni);
                        if (loot) addItem(hero, loot);
                    }
                } catch (e) { loot = null; }
                return { ok: true, kind: kind, universe: uni, xp: res.gained, gold: rw.gold, loot: loot, level: res.level, leveledUp: res.leveledUp, levels: res.levels };
            } catch (e) { return { ok: false, xp: 0, gold: 0, loot: null }; }
        }

        /* ================ dungeon progression ================
         * newDungeonRun(): frontier over the 6 universes in lattice order.
         * clearDungeon(run, universeId, hero?): marks cleared when universeId
         * is the current frontier; awards universe XP to hero when provided.
         * Returns { ok, xp, loot }.
         */
        function newDungeonRun() {
            try {
                return { order: ['prime', 'echo', 'dream', 'void', 'bloom', 'static'], cleared: {}, current: 'prime', clears: 0, complete: false };
            } catch (e) { return { order: [], cleared: {}, current: null, clears: 0, complete: false }; }
        }

        function dungeonState(run) {
            try {
                if (!run) return { current: null, cleared: [], locked: [], clears: 0, complete: false };
                var cleared = [];
                try {
                    for (var k in run.cleared) {
                        if (run.cleared[k]) cleared.push(k);
                    }
                } catch (e) { /* ignore */ }
                var cur = run.current || null;
                if (!cur) {
                    for (var j = 0; j < UNIVERSES.length; j++) {
                        if (cleared.indexOf(UNIVERSES[j].id) < 0) { cur = UNIVERSES[j].id; break; }
                    }
                    if (!cur && cleared.length >= UNIVERSES.length) cur = null;
                }
                return { current: cur, cleared: cleared, locked: [], clears: num(run.clears, cleared.length), complete: cleared.length >= UNIVERSES.length };
            } catch (e) { return { current: null, cleared: [], locked: [], clears: 0, complete: false }; }
        }

        function clearDungeon(run, universeId, hero) {
            try {
                if (!run) return { ok: false, xp: 0, loot: null };
                var def = getUniverse(universeId);
                if (!def) return { ok: false, xp: 0, loot: null };
                var snap = dungeonState(run);
                if (snap.current !== def.id) return { ok: false, xp: 0, loot: null };
                run.cleared = run.cleared || {};
                run.cleared[def.id] = true;
                run.clears = num(run.clears, 0) + 1;
                var next = null;
                for (var i = 0; i < UNIVERSES.length; i++) {
                    if (!run.cleared[UNIVERSES[i].id]) { next = UNIVERSES[i].id; break; }
                }
                run.current = next;
                if (!next) run.complete = true;
                var loot = null;
                try { loot = rollLoot(def.id); } catch (e) { loot = null; }
                var xpRes = { gained: 0, level: 1, leveledUp: false, levels: 0 };
                if (hero) {
                    try {
                        xpRes = awardXP(hero, def.xp);
                        hero.dungeonsCleared = num(hero.dungeonsCleared, 0) + 1;
                        if (loot) addItem(hero, loot);
                    } catch (e) { /* rewards are a bonus, never fatal */ }
                }
                return { ok: true, xp: xpRes.gained || def.xp, loot: loot, leveledUp: !!xpRes.leveledUp };
            } catch (e) { return { ok: false, xp: 0, loot: null }; }
        }

        /* ================ golf-trial hook ================
         * trialClear(hero, holeIdx, universeId): a golf trial counts as a
         * dungeon clear for XP. XP = 10 * hole par + 6 * holeIdx, scaled by
         * universe (Void pays best, Bloom softest). Also accepts
         * trialClear(holeIdx, universeId) without a hero (reports XP/loot,
         * stores nothing). Returns { ok, xp, loot, ...award }.
         */
        var UNIVERSE_TRIAL_SCALE = { prime: 1.0, echo: 1.0, dream: 0.9, void: 1.4, bloom: 0.8, static: 1.2 };

        function holeParFor(holeIdx, universeId) {
            try {
                var c = canon();
                var idx = clampInt(holeIdx, 0, 9, 0);
                if (c && c.HOLES && c.HOLES[idx] && typeof c.HOLES[idx].par === 'number') {
                    var delta = 0;
                    if (c.UNIVERSES) {
                        for (var i = 0; i < c.UNIVERSES.length; i++) {
                            if (c.UNIVERSES[i].id === universeId) { delta = num(c.UNIVERSES[i].parDelta, 0); break; }
                        }
                    }
                    return Math.max(1, Math.round(c.HOLES[idx].par + delta));
                }
                var def = getUniverse(universeId);
                return def ? def.par : 3;
            } catch (e) { return 3; }
        }

        function trialClear(heroOrHole, holeOrUniverse, universeOrNothing) {
            try {
                var hero = null;
                var holeIdx = 0;
                var universeId = 'prime';
                if (typeof heroOrHole === 'object' && heroOrHole !== null && heroOrHole.classId) {
                    hero = heroOrHole;
                    holeIdx = clampInt(holeOrUniverse, 0, 9, 0);
                    universeId = str(universeOrNothing, 'prime');
                } else {
                    holeIdx = clampInt(heroOrHole, 0, 9, 0);
                    universeId = str(holeOrUniverse, 'prime');
                }
                if (!getUniverse(universeId)) universeId = 'prime';
                var par = holeParFor(holeIdx, universeId);
                var scale = num(UNIVERSE_TRIAL_SCALE[universeId], 1);
                var xp = Math.max(1, Math.round((10 * par + 6 * holeIdx) * scale));
                var loot = null;
                try {
                    var roll = rngFrom('trial:' + holeIdx + ':' + universeId + ':' + par);
                    if (roll() < 0.35) loot = rollLoot(universeId, roll);
                } catch (e) { loot = null; }
                if (!hero) return { ok: true, xp: xp, loot: loot, hole: holeIdx, par: par, universe: universeId };
                var res = awardXP(hero, xp);
                try {
                    hero.trialsCleared = num(hero.trialsCleared, 0) + 1;
                    if (loot) addItem(hero, loot);
                } catch (e) { /* ignore */ }
                return { ok: true, hole: holeIdx, par: par, universe: universeId, xp: res.gained, level: res.level, leveledUp: res.leveledUp, levels: res.levels, loot: loot };
            } catch (e) { return { ok: false, xp: 0, loot: null }; }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                version: VERSION,
                CLASSES: CLASSES,
                UNIVERSES: UNIVERSES,
                GUIDES: GUIDES,
                ITEMS: ITEMS,
                LOOT_TABLES: LOOT_TABLES,
                MAX_LEVEL: MAX_LEVEL,
                getClass: getClass,
                listClasses: listClasses,
                getUniverse: getUniverse,
                statsFor: statsFor,
                xpForLevel: xpForLevel,
                newCharacter: newCharacter,
                awardXP: awardXP,
                awardKillLoot: awardKillLoot,
                foeReward: foeReward,
                itemById: itemById,
                rollLoot: rollLoot,
                addItem: addItem,
                equip: equip,
                useConsumable: useConsumable,
                newDungeonRun: newDungeonRun,
                dungeonState: dungeonState,
                clearDungeon: clearDungeon,
                holeParFor: holeParFor,
                trialClear: trialClear
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain5DRpg = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: 'gravegain5d-rpg', version: VERSION });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: rpg core stays silent */ }
})();
