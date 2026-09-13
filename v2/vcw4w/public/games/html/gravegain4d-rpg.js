/* GraveGain4D RPG systems core (agent g4d3-02, envelope DS-G4D3-02).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DRpg. Never throws:
 * every public hook is try/catch guarded. No DOM listeners, no overlays,
 * no canvas, no BoxGeometry, no network, no secrets.
 *
 * THEME: GraveGain is a dark-fantasy action RPG — this file is its
 * progression heart. Golf trials award XP like dungeon clears: a holed
 * putt on the fold counts the same as a cleared crypt room.
 *
 * Progression conventions mirror content/gravegain-bigupgrade.ts
 * (WEAPON_SPOTLIGHT ids, ENEMY_SPOTLIGHT kinds) so PlayGate/docs copy
 * stays consistent. Flavor mirrors content/gravegain4d-lore.ts canon:
 * Dr. Lucifer Hades + the Hades Array, President Angel Good, Queen
 * Aelindra, Warchief Groknak, Lisa Park, Elder Mirathiel; every trial
 * is fought across parallel folds of MoonRock.
 *
 * Integrator: load any time (no dependencies). Combat lane calls
 * awardXP()/rollLoot(); golf lane calls trialClear(holeId, par).
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DRpg) return;

        var VERSION = '1.0.0';

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

        /* ================ classes ================
         * Stat block: hp (max vigor), atk (might), def (ward),
         * will (focus/spirit), pace (fold speed). Growth is per level.
         * Factions in flavor only; numbers stay lane-neutral.
         */
        var CLASSES = {
            'fold-knight': {
                id: 'fold-knight',
                name: 'Fold Knight',
                title: 'Warden of the Fold',
                flavor: 'Sworn to President Angel Good at the LuckyStarShip hub; holds the line where timelines split.',
                base: { hp: 120, atk: 14, def: 12, will: 6, pace: 8 },
                growth: { hp: 14, atk: 2.2, def: 1.8, will: 0.8, pace: 0.4 },
                startingWeapon: 'rusty-shovel'
            },
            'echo-ranger': {
                id: 'echo-ranger',
                name: 'Echo Ranger',
                title: 'Ghost of the Groves',
                flavor: 'Trained by the Echo of Elder Mirathiel under Queen Aelindra; hunts with a parallel self one breath ahead.',
                base: { hp: 90, atk: 16, def: 7, will: 10, pace: 14 },
                growth: { hp: 10, atk: 2.6, def: 1.0, will: 1.4, pace: 1.0 },
                startingWeapon: 'hex-bow'
            },
            'ossuary-cleric': {
                id: 'ossuary-cleric',
                name: 'Ossuary Cleric',
                title: 'Keeper of Quiet Bones',
                flavor: 'Keeps the Folded Ossuary rites with Lisa Park; turns Hades Array echoes back into the grave.',
                base: { hp: 100, atk: 11, def: 10, will: 15, pace: 9 },
                growth: { hp: 12, atk: 1.8, def: 1.4, will: 2.2, pace: 0.5 },
                startingWeapon: 'dreamcap-club'
            }
        };

        function getClass(classId) {
            try {
                var id = str(classId, '');
                if (CLASSES[id]) return CLASSES[id];
                return null;
            } catch (e) { return null; }
        }

        function listClasses() {
            try { return ['fold-knight', 'echo-ranger', 'ossuary-cleric']; }
            catch (e) { return []; }
        }

        function statsFor(classId, level) {
            try {
                var def = getClass(classId);
                if (!def) return { hp: 100, atk: 10, def: 10, will: 10, pace: 10 };
                var lv = clampInt(level, 1, 99, 1);
                var g = (lv - 1);
                return {
                    hp: Math.floor(def.base.hp + def.growth.hp * g),
                    atk: Math.floor((def.base.atk + def.growth.atk * g) * 10) / 10,
                    def: Math.floor((def.base.def + def.growth.def * g) * 10) / 10,
                    will: Math.floor((def.base.will + def.growth.will * g) * 10) / 10,
                    pace: Math.floor((def.base.pace + def.growth.pace * g) * 10) / 10
                };
            } catch (e) { return { hp: 100, atk: 10, def: 10, will: 10, pace: 10 }; }
        }

        /* ================ XP / level curve ================
         * xpForLevel(n): cumulative XP to REACH level n (level 1 = 0).
         * Curve: 80 * (n-1)^1.6, rounded — dungeon clears (~120-300 XP)
         * level a hero roughly every 2-3 clears early, slower late.
         */
        var MAX_LEVEL = 50;

        function xpForLevel(level) {
            try {
                var lv = clampInt(level, 1, MAX_LEVEL, 1);
                if (lv <= 1) return 0;
                return Math.floor(80 * Math.pow(lv - 1, 1.6));
            } catch (e) { return 0; }
        }

        function levelForXP(xp) {
            try {
                var x = Math.floor(num(xp, 0));
                if (x <= 0) return 1;
                var lv = 1;
                for (var n = 2; n <= MAX_LEVEL; n++) {
                    if (x >= xpForLevel(n)) lv = n;
                    else break;
                }
                return lv;
            } catch (e) { return 1; }
        }

        function xpToNext(hero) {
            try {
                if (!hero) return xpForLevel(2);
                var lv = clampInt(hero.level, 1, MAX_LEVEL, 1);
                if (lv >= MAX_LEVEL) return 0;
                return Math.max(0, xpForLevel(lv + 1) - Math.floor(num(hero.xp, 0)));
            } catch (e) { return 0; }
        }

        function newCharacter(classId, name) {
            try {
                var def = getClass(classId) || CLASSES['fold-knight'];
                var hero = {
                    classId: def.id,
                    name: str(name, def.name),
                    level: 1,
                    xp: 0,
                    stats: statsFor(def.id, 1),
                    inventory: [],
                    equipment: { weapon: null, armor: null, charm: null },
                    kills: 0,
                    trialsCleared: 0,
                    dungeonsCleared: 0
                };
                try {
                    var starter = itemById(def.startingWeapon);
                    if (starter) {
                        hero.inventory.push(starter);
                        hero.equipment.weapon = starter.id;
                    }
                } catch (e) { /* starter is a bonus, never fatal */ }
                return hero;
            } catch (e) {
                return { classId: 'fold-knight', name: 'Knight', level: 1, xp: 0, stats: statsFor('fold-knight', 1), inventory: [], equipment: { weapon: null, armor: null, charm: null }, kills: 0, trialsCleared: 0, dungeonsCleared: 0 };
            }
        }

        /* awardXP(hero, amount, opts): dungeon-clear style award.
         * Returns { gained, level, leveledUp, levels }. Never throws;
         * invalid hero/amount yields { gained: 0, ... }. */
        function awardXP(hero, amount, opts) {
            try {
                if (!hero || typeof hero !== 'object') {
                    return { gained: 0, level: 1, leveledUp: false, levels: 0 };
                }
                var gain = Math.floor(num(amount, 0));
                if (!(gain > 0)) {
                    return { gained: 0, level: clampInt(hero.level, 1, MAX_LEVEL, 1), leveledUp: false, levels: 0 };
                }
                if (typeof hero.xp !== 'number' || !isFinite(hero.xp)) hero.xp = 0;
                if (typeof hero.level !== 'number' || !isFinite(hero.level)) hero.level = 1;
                hero.level = clampInt(hero.level, 1, MAX_LEVEL, 1);
                var before = hero.level;
                hero.xp = Math.floor(hero.xp + gain);
                var after = levelForXP(hero.xp);
                if (after > hero.level) {
                    hero.level = after;
                    try { hero.stats = statsFor(hero.classId, hero.level); } catch (e) { /* keep old stats */ }
                    if (opts && typeof opts.onLevel === 'function') {
                        try { opts.onLevel(hero, before, after); } catch (e) { /* listener faults never break XP */ }
                    }
                }
                return { gained: gain, level: hero.level, leveledUp: after > before, levels: after - before };
            } catch (e) { return { gained: 0, level: 1, leveledUp: false, levels: 0 }; }
        }

        /* ================ loot + inventory ================
         * Slots: weapon / armor / charm / consumable. Rarity weights per
         * dungeon tier; item ids reuse WEAPON_SPOTLIGHT ids from the
         * big-upgrade catalog so copy stays 1:1.
         */
        var ITEMS = {
            'rusty-shovel': { id: 'rusty-shovel', name: 'Rusty Shovel', slot: 'weapon', rarity: 'common', power: 6, flavor: 'Digs graves and Array anchors with equal patience.' },
            'golem-hammer': { id: 'golem-hammer', name: 'Golem Hammer', slot: 'weapon', rarity: 'rare', power: 18, flavor: 'Warchief Groknak dented a titan with one of these.' },
            'hex-bow': { id: 'hex-bow', name: 'Hex Bow', slot: 'weapon', rarity: 'uncommon', power: 12, flavor: 'Queen Aelindra strung it with world-root fiber.' },
            'relay-coil': { id: 'relay-coil', name: 'Relay Coil', slot: 'weapon', rarity: 'rare', power: 17, flavor: 'Hums with stolen Array signal; Lisa Park tuned it.' },
            'dreamcap-club': { id: 'dreamcap-club', name: 'Dreamcap Club', slot: 'weapon', rarity: 'uncommon', power: 11, flavor: 'Grown, not forged, in the Ossuary dark.' },
            'titan-slayer': { id: 'titan-slayer', name: 'Titan Slayer', slot: 'weapon', rarity: 'legendary', power: 30, flavor: 'One swing ended the first Necro-Array Titan.' },
            'lz-plate': { id: 'lz-plate', name: 'LZ Crash Plate', slot: 'armor', rarity: 'common', power: 5, flavor: 'Salvaged LuckyStarShip hull; still smells of descent fire.' },
            'grove-mail': { id: 'grove-mail', name: 'Grovewarden Mail', slot: 'armor', rarity: 'uncommon', power: 10, flavor: 'Elven leaves that turn blades like Mirathiel turns timelines.' },
            'wastes-hide': { id: 'wastes-hide', name: 'Wastes Nomad Hide', slot: 'armor', rarity: 'uncommon', power: 11, flavor: 'Orc-stitched; Groknak vouches for the stitching.' },
            'ossuary-shroud': { id: 'ossuary-shroud', name: 'Ossuary Shroud', slot: 'armor', rarity: 'rare', power: 16, flavor: 'Quiet bones lend their stillness to the wearer.' },
            'array-aegis': { id: 'array-aegis', name: 'Array Aegis', slot: 'armor', rarity: 'legendary', power: 26, flavor: 'A plate of the Array itself, folded inside-out by Hades\' bane.' },
            'lantern-charm': { id: 'lantern-charm', name: 'Lantern Charm', slot: 'charm', rarity: 'common', power: 4, flavor: 'President Angel Good\'s botany-deck blessing in miniature.' },
            'echo-charm': { id: 'echo-charm', name: 'Echo Charm', slot: 'charm', rarity: 'uncommon', power: 9, flavor: 'Your parallel self already blessed this one.' },
            'marrow-charm': { id: 'marrow-charm', name: 'Marrow Charm', slot: 'charm', rarity: 'rare', power: 15, flavor: 'The Ossuary Twins, Pell & Marrow, counted every bead.' },
            'hades-eye': { id: 'hades-eye', name: 'Eye of Hades', slot: 'charm', rarity: 'legendary', power: 24, flavor: 'It watches back. Spend it before it spends you.' },
            'moonleaf-tea': { id: 'moonleaf-tea', name: 'Moonleaf Tea', slot: 'consumable', rarity: 'common', power: 8, flavor: 'Restores vigor; teen+ bands only per age-gore rules.' },
            'sparkite-tonic': { id: 'sparkite-tonic', name: 'Sparkite Tonic', slot: 'consumable', rarity: 'uncommon', power: 14, flavor: 'Dwarven vault-brew; tastes like lightning and debts.' },
            'phoenix-ember': { id: 'phoenix-ember', name: 'Phoenix Ember', slot: 'consumable', rarity: 'rare', power: 22, flavor: 'A second life in a jar. Mirathiel sealed it herself.' }
        };

        function itemById(id) {
            try {
                var key = str(id, '');
                var it = ITEMS[key];
                if (!it) return null;
                return { id: it.id, name: it.name, slot: it.slot, rarity: it.rarity, power: num(it.power, 0), flavor: it.flavor };
            } catch (e) { return null; }
        }

        var RARITY_TABLE = [
            { rarity: 'common', w: 55 },
            { rarity: 'uncommon', w: 27 },
            { rarity: 'rare', w: 13 },
            { rarity: 'legendary', w: 5 }
        ];

        /* Loot tables per timeline-world (dungeon tier shifts rarity). */
        var LOOT_TABLES = {
            'moonrock-meadows': { worldId: 'moonrock-meadows', bonus: { legendary: 0, rare: 0 }, pool: ['rusty-shovel', 'lz-plate', 'lantern-charm', 'moonleaf-tea', 'hex-bow', 'grove-mail'] },
            'echo-glade': { worldId: 'echo-glade', bonus: { legendary: 0, rare: 2 }, pool: ['hex-bow', 'grove-mail', 'echo-charm', 'moonleaf-tea', 'dreamcap-club', 'sparkite-tonic'] },
            'wastes-fold': { worldId: 'wastes-fold', bonus: { legendary: 1, rare: 3 }, pool: ['golem-hammer', 'wastes-hide', 'echo-charm', 'sparkite-tonic', 'relay-coil', 'lantern-charm'] },
            'folded-ossuary': { worldId: 'folded-ossuary', bonus: { legendary: 2, rare: 4 }, pool: ['dreamcap-club', 'ossuary-shroud', 'marrow-charm', 'phoenix-ember', 'golem-hammer', 'relay-coil'] },
            'array-core': { worldId: 'array-core', bonus: { legendary: 4, rare: 5 }, pool: ['titan-slayer', 'array-aegis', 'hades-eye', 'phoenix-ember', 'relay-coil', 'marrow-charm'] }
        };

        /* rollLoot(tableId?, rng?): returns a fresh item copy or null.
         * Signature is forgiving: rollLoot() rolls Meadows; a function
         * first arg is treated as rng. */
        function rollLoot(tableId, rng) {
            try {
                if (typeof tableId === 'function' && rng === undefined) {
                    rng = tableId;
                    tableId = 'moonrock-meadows';
                }
                var key = str(tableId, 'moonrock-meadows');
                var table = LOOT_TABLES[key] || LOOT_TABLES['moonrock-meadows'];
                var rand = (typeof rng === 'function') ? rng : rngFrom(key + ':' + Date.now() % 100000);
                var rows = [];
                try {
                    for (var i = 0; i < RARITY_TABLE.length; i++) {
                        var extra = 0;
                        try { extra = num(table.bonus[RARITY_TABLE[i].rarity], 0); } catch (e) { extra = 0; }
                        rows.push({ rarity: RARITY_TABLE[i].rarity, w: RARITY_TABLE[i].w + extra });
                    }
                } catch (e) { rows = RARITY_TABLE.slice(); }
                var picked = null;
                try { picked = pickWeighted(rows, rand()); } catch (e) { picked = rows[0]; }
                var want = picked ? picked.rarity : 'common';
                var cands = [];
                for (var j = 0; j < table.pool.length; j++) {
                    var it = itemById(table.pool[j]);
                    if (it && it.rarity === want) cands.push(it);
                }
                if (!cands.length) {
                    for (var k = 0; k < table.pool.length; k++) {
                        var fb = itemById(table.pool[k]);
                        if (fb) cands.push(fb);
                    }
                }
                if (!cands.length) return null;
                var idx = Math.floor(rand() * cands.length) % cands.length;
                return cands[idx];
            } catch (e) { return null; }
        }

        function addItem(hero, item) {
            try {
                if (!hero || !item) return false;
                if (!hero.inventory || !hero.inventory.length) hero.inventory = [];
                if (hero.inventory.length >= 40) return false;
                hero.inventory.push({ id: item.id, name: item.name, slot: item.slot, rarity: item.rarity, power: num(item.power, 0), flavor: item.flavor });
                return true;
            } catch (e) { return false; }
        }

        /* equip(hero, itemId): equips weapon/armor/charm by id from
         * inventory. Consumables cannot be equipped (use useConsumable).
         * Returns true on success, false otherwise. */
        function equip(hero, itemId) {
            try {
                if (!hero || !itemId) return false;
                var id = str(itemId, '');
                var found = null;
                var inv = hero.inventory || [];
                for (var i = 0; i < inv.length; i++) {
                    if (inv[i] && inv[i].id === id) { found = inv[i]; break; }
                }
                if (!found) {
                    try { found = itemById(id); } catch (e) { found = null; }
                    if (!found) return false;
                    try { addItem(hero, found); } catch (e) { /* ignore */ }
                }
                if (found.slot === 'consumable') return false;
                if (!hero.equipment) hero.equipment = { weapon: null, armor: null, charm: null };
                if (found.slot === 'weapon') hero.equipment.weapon = found.id;
                else if (found.slot === 'armor') hero.equipment.armor = found.id;
                else if (found.slot === 'charm') hero.equipment.charm = found.id;
                else return false;
                return true;
            } catch (e) { return false; }
        }

        function useConsumable(hero, itemId) {
            try {
                if (!hero || !itemId) return null;
                var id = str(itemId, '');
                var inv = hero.inventory || [];
                for (var i = 0; i < inv.length; i++) {
                    if (inv[i] && inv[i].id === id && inv[i].slot === 'consumable') {
                        var used = inv.splice(i, 1)[0];
                        return { used: used.id, power: num(used.power, 0) };
                    }
                }
                return null;
            } catch (e) { return null; }
        }

        /* ================ dungeon progression ================
         * The 5 timeline-worlds, in saga order. clearDungeon(worldId)
         * marks the world cleared and unlocks the next; Array Core is
         * the terminus (Hades himself).
         */
        var WORLDS = [
            { id: 'moonrock-meadows', name: 'MoonRock Meadows', tier: 1, boss: 'Gravegain Shambler', theme: 'LZ crash-site meadows', par: 3, xp: 120, flavor: 'Where Colony Alpha dug its first grave; shamblers rise from the dust.' },
            { id: 'echo-glade', name: 'Echo Glade', tier: 2, boss: 'Elven Necromancer', theme: 'Bioluminescent groves', par: 4, xp: 180, flavor: 'Queen Aelindra holds the world-root; your echo putts beside you.' },
            { id: 'wastes-fold', name: 'Wastes Fold', tier: 3, boss: 'Toxic Chem-Golem', theme: 'Orc wastes + deep mines', par: 5, xp: 250, flavor: 'Warchief Groknak\'s nomads siege the vault mouths; the air bites.' },
            { id: 'folded-ossuary', name: 'Folded Ossuary', tier: 4, boss: 'Crypt Brute', theme: 'Alchemical catacombs', par: 5, xp: 320, flavor: 'Pell & Marrow count the bones; every crypt is a dungeon clear.' },
            { id: 'array-core', name: 'Array Core', tier: 5, boss: 'Necro-Array Titan', theme: 'Citadel darkness', par: 5, xp: 450, flavor: 'Dr. Lucifer Hades waits past the Gate of the NecroGenesis.' }
        ];

        function getWorld(worldId) {
            try {
                var id = str(worldId, '');
                for (var i = 0; i < WORLDS.length; i++) {
                    if (WORLDS[i].id === id) return WORLDS[i];
                }
                return null;
            } catch (e) { return null; }
        }

        function newDungeonRun() {
            try {
                return { worlds: ['moonrock-meadows', 'echo-glade', 'wastes-fold', 'folded-ossuary', 'array-core'], cleared: {}, current: 'moonrock-meadows', clears: 0, complete: false };
            } catch (e) { return { worlds: [], cleared: {}, current: null, clears: 0, complete: false }; }
        }

        /* dungeonState(run?): snapshot { current, cleared[], locked[],
         * complete }. Null/omitted run reports the fresh-run snapshot. */
        function dungeonState(run) {
            try {
                var r = run || newDungeonRun();
                var cleared = [];
                var locked = [];
                var seenOpen = true;
                for (var i = 0; i < WORLDS.length; i++) {
                    var id = WORLDS[i].id;
                    var isCleared = !!(r.cleared && r.cleared[id]);
                    if (isCleared) { cleared.push(id); continue; }
                    if (seenOpen) { seenOpen = false; continue; }
                    locked.push(id);
                }
                var cur = null;
                try { cur = str(r.current, null) || null; } catch (e) { cur = null; }
                if (!cur) {
                    for (var j = 0; j < WORLDS.length; j++) {
                        if (cleared.indexOf(WORLDS[j].id) < 0 && locked.indexOf(WORLDS[j].id) < 0) { cur = WORLDS[j].id; break; }
                    }
                    if (!cur && cleared.length >= WORLDS.length) cur = null;
                }
                return { current: cur, cleared: cleared, locked: locked, clears: num(r.clears, cleared.length), complete: cleared.length >= WORLDS.length };
            } catch (e) { return { current: null, cleared: [], locked: [], clears: 0, complete: false }; }
        }

        /* clearDungeon(run, worldId, hero?): marks cleared when worldId is
         * the current frontier; awards world XP to hero when provided.
         * Returns { ok, xp, loot }. */
        function clearDungeon(run, worldId, hero) {
            try {
                if (!run) return { ok: false, xp: 0, loot: null };
                var def = getWorld(worldId);
                if (!def) return { ok: false, xp: 0, loot: null };
                var snap = dungeonState(run);
                if (snap.current !== def.id) return { ok: false, xp: 0, loot: null };
                run.cleared = run.cleared || {};
                run.cleared[def.id] = true;
                run.clears = num(run.clears, 0) + 1;
                var next = null;
                for (var i = 0; i < WORLDS.length; i++) {
                    if (!run.cleared[WORLDS[i].id]) { next = WORLDS[i].id; break; }
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
         * trialClear(hero, holeId, par): a golf trial counts as a dungeon
         * clear for XP. XP = 40 * par + 12 * holeId (Hades' hole pays
         * best). Returns { ok, xp, loot, ...award }. Also accepts
         * trialClear(holeId, par) without a hero (reports XP, no store).
         */
        function trialClear(heroOrHole, holeIdOrPar, parOrNothing) {
            try {
                var hero = null;
                var holeId = 1;
                var par = 4;
                if (typeof heroOrHole === 'object' && heroOrHole !== null && heroOrHole.classId) {
                    hero = heroOrHole;
                    holeId = clampInt(holeIdOrPar, 1, 10, 1);
                    par = clampInt(parOrNothing, 1, 7, getWorldParForHole(holeId));
                } else {
                    holeId = clampInt(heroOrHole, 1, 10, 1);
                    par = clampInt(holeIdOrPar, 1, 7, getWorldParForHole(holeId));
                }
                var xp = Math.floor(40 * par + 12 * holeId);
                var loot = null;
                try {
                    /* Better holes loot deeper tables: back nine pulls
                     * Ossuary/Array tables on lucky legendary rolls. */
                    var tableKey = holeId <= 2 ? 'moonrock-meadows' : holeId <= 4 ? 'echo-glade' : holeId <= 6 ? 'wastes-fold' : holeId <= 8 ? 'folded-ossuary' : 'array-core';
                    var roll = rngFrom('trial:' + holeId + ':' + par);
                    if (roll() < 0.35) loot = rollLoot(tableKey, roll);
                } catch (e) { loot = null; }
                if (!hero) return { ok: true, xp: xp, loot: loot, hole: holeId, par: par };
                var res = awardXP(hero, xp);
                try {
                    hero.trialsCleared = num(hero.trialsCleared, 0) + 1;
                    if (loot) addItem(hero, loot);
                } catch (e) { /* ignore */ }
                return { ok: true, hole: holeId, par: par, xp: res.gained, level: res.level, leveledUp: res.leveledUp, levels: res.levels, loot: loot };
            } catch (e) { return { ok: false, xp: 0, loot: null }; }
        }

        function getWorldParForHole(holeId) {
            try {
                var h = clampInt(holeId, 1, 10, 1);
                var idx = h <= 2 ? 0 : h <= 4 ? 1 : h <= 6 ? 2 : h <= 8 ? 3 : 4;
                return WORLDS[idx].par;
            } catch (e) { return 4; }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                version: VERSION,
                CLASSES: CLASSES,
                WORLDS: WORLDS,
                ITEMS: ITEMS,
                LOOT_TABLES: LOOT_TABLES,
                MAX_LEVEL: MAX_LEVEL,
                getClass: getClass,
                listClasses: listClasses,
                statsFor: statsFor,
                xpForLevel: xpForLevel,
                levelForXP: levelForXP,
                xpToNext: xpToNext,
                newCharacter: newCharacter,
                awardXP: awardXP,
                itemById: itemById,
                rollLoot: rollLoot,
                addItem: addItem,
                equip: equip,
                useConsumable: useConsumable,
                getWorld: getWorld,
                newDungeonRun: newDungeonRun,
                dungeonState: dungeonState,
                clearDungeon: clearDungeon,
                trialClear: trialClear
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain4DRpg = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: 'gravegain4d-rpg', version: VERSION });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: rpg core stays silent */ }
})();
