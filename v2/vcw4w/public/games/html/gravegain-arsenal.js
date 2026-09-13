/* GraveGain arsenal — loot pool + race/class starting kits (v2.0.0).
 *
 * Pure data module shared by GraveGain 1D/2D/3D. Vanilla JS IIFE, no imports,
 * no DOM, no storage, no network. Idempotent: if (window.GraveGainArsenal)
 * return. Never throws: every helper guards input and falls back safely.
 * Same arsenal for every age band; all blurbs teen-clean, no profanity.
 *
 * Exposes window.GraveGainArsenal = {
 *   VERSION, WEAPONS, STARTING_KITS,
 *   getStartingWeapon, byId, byRarity, rollLoot
 * }.
 */
(function () {
    'use strict';
    if (window.GraveGainArsenal) return;

    var VERSION = '2.0.0';

    /* 24-weapon loot pool. dmg = base damage, speed = attacks/sec,
     * crit = crit chance 0..1, range = tiles, effect = damage-type tag. */
    var WEAPONS = [
        { id: 'rusty-shortsword', name: 'Rusty Shortsword', emoji: '🗡️', kind: 'melee', dmg: 6, speed: 1.6, crit: 0.05, range: 1.5, rarity: 'common', blurb: 'Still sharp enough to ruin a skeleton’s day.', effect: 'slash' },
        { id: 'pointy-stick', name: 'Pointy Stick', emoji: '📌', kind: 'melee', dmg: 4, speed: 2.0, crit: 0.04, range: 1.2, rarity: 'common', blurb: 'Every legend starts with a really good stick.', effect: 'pierce' },
        { id: 'apprentice-staff', name: 'Apprentice Staff', emoji: '🪄', kind: 'magic', dmg: 7, speed: 1.1, crit: 0.06, range: 9, rarity: 'common', blurb: 'Graduated top of its class at wizard school.', effect: 'arcane' },
        { id: 'yew-shortbow', name: 'Yew Shortbow', emoji: '🏹', kind: 'ranged', dmg: 8, speed: 1.0, crit: 0.08, range: 14, rarity: 'common', blurb: 'Quiet, quick, and great at long goodbyes.', effect: 'pierce' },
        { id: 'pebble-sling', name: 'Pebble Sling', emoji: '🪨', kind: 'ranged', dmg: 5, speed: 1.8, crit: 0.05, range: 10, rarity: 'common', blurb: 'David-approved giant management tool.', effect: 'blunt' },
        { id: 'butcher-cleaver', name: 'Butcher Cleaver', emoji: '🔪', kind: 'melee', dmg: 9, speed: 1.2, crit: 0.07, range: 1.4, rarity: 'common', blurb: 'Chops veggies, chops villains, chops everything.', effect: 'slash' },
        { id: 'gnawed-club', name: 'Gnawed Club', emoji: '🦴', kind: 'melee', dmg: 10, speed: 0.9, crit: 0.05, range: 1.4, rarity: 'common', blurb: 'Previously a femur. Now a problem solver.', effect: 'blunt' },
        { id: 'acid-squirt-gun', name: 'Acid Squirt Gun', emoji: '💦', kind: 'chem', dmg: 6, speed: 1.7, crit: 0.05, range: 7, rarity: 'common', blurb: 'Super soaker, forbidden chemistry edition.', effect: 'acid' },
        { id: 'knights-longsword', name: "Knight's Longsword", emoji: '⚔️', kind: 'melee', dmg: 14, speed: 1.4, crit: 0.12, range: 1.7, rarity: 'rare', blurb: 'Oathbound steel that hums before a worthy fight.', effect: 'slash' },
        { id: 'rune-hammer', name: 'Rune Hammer', emoji: '🔨', kind: 'melee', dmg: 18, speed: 0.8, crit: 0.10, range: 1.6, rarity: 'rare', blurb: 'Forge-blessed head; every swing signs its work.', effect: 'blunt' },
        { id: 'bone-dagger', name: 'Bone Dagger', emoji: '🦷', kind: 'melee', dmg: 12, speed: 1.9, crit: 0.14, range: 1.3, rarity: 'rare', blurb: 'Carved from a dragon tooth. Allegedly.', effect: 'pierce' },
        { id: 'elven-longbow', name: 'Elven Longbow', emoji: '🌙', kind: 'ranged', dmg: 15, speed: 1.2, crit: 0.14, range: 18, rarity: 'rare', blurb: 'Moon-silvered limbs that never creak, only sing.', effect: 'pierce' },
        { id: 'repeating-crossbow', name: 'Repeating Crossbow', emoji: '🎯', kind: 'ranged', dmg: 13, speed: 1.5, crit: 0.10, range: 15, rarity: 'rare', blurb: 'Five bolts ready because one is never enough.', effect: 'pierce' },
        { id: 'ember-wand', name: 'Ember Wand', emoji: '✨', kind: 'magic', dmg: 14, speed: 1.3, crit: 0.12, range: 11, rarity: 'rare', blurb: 'Smells faintly of campfire and victory.', effect: 'fire' },
        { id: 'venom-lobber', name: 'Venom Lobber', emoji: '⚗️', kind: 'chem', dmg: 12, speed: 1.0, crit: 0.10, range: 9, rarity: 'rare', blurb: 'Lobs fizzy flasks that hiss at skeletons.', effect: 'poison' },
        { id: 'reapers-scythe', name: "Reaper's Scythe", emoji: '💀', kind: 'melee', dmg: 24, speed: 1.0, crit: 0.18, range: 2.2, rarity: 'epic', blurb: 'Retired from harvest duty; now harvests bosses.', effect: 'necrotic' },
        { id: 'stormcaller-staff', name: 'Stormcaller Staff', emoji: '🌩️', kind: 'magic', dmg: 22, speed: 1.1, crit: 0.16, range: 13, rarity: 'epic', blurb: 'Crackles with weather that holds a grudge.', effect: 'lightning' },
        { id: 'bulwark-shield', name: 'Bulwark Shield', emoji: '🛡️', kind: 'melee', dmg: 16, speed: 1.3, crit: 0.08, range: 1.5, rarity: 'epic', blurb: 'A wall with opinions, swung like a door.', effect: 'blunt' },
        { id: 'dirge-bell', name: 'Dirge Bell', emoji: '🔔', kind: 'magic', dmg: 20, speed: 0.9, crit: 0.15, range: 10, rarity: 'epic', blurb: 'One toll and the whole graveyard stands at attention.', effect: 'sonic' },
        { id: 'wisp-lantern', name: 'Wisp Lantern', emoji: '🏮', kind: 'magic', dmg: 18, speed: 1.2, crit: 0.14, range: 8, rarity: 'epic', blurb: 'Houses a helpful ghost who loves dramatic lighting.', effect: 'radiant' },
        { id: 'plague-sprayer', name: 'Plague Sprayer', emoji: '☠️', kind: 'chem', dmg: 21, speed: 1.1, crit: 0.13, range: 8, rarity: 'epic', blurb: 'Certified pest control for the recently deceased.', effect: 'poison' },
        { id: 'dawnblade', name: 'Dawnblade', emoji: '☀️', kind: 'melee', dmg: 32, speed: 1.5, crit: 0.25, range: 2.0, rarity: 'legendary', blurb: 'Sunrise given an edge and a slight attitude.', effect: 'radiant' },
        { id: 'worldroot-bow', name: 'Worldroot Bow', emoji: '🌳', kind: 'ranged', dmg: 30, speed: 1.2, crit: 0.22, range: 22, rarity: 'legendary', blurb: 'Strung with a root of the world tree itself.', effect: 'pierce' },
        { id: 'kingsfall-maul', name: 'Kingsfall Maul', emoji: '👑', kind: 'melee', dmg: 36, speed: 0.7, crit: 0.20, range: 1.8, rarity: 'legendary', blurb: 'Toppled one king; accepting new challengers.', effect: 'blunt' }
    ];

    /* 16 race x class starting kits. weaponId always exists in WEAPONS. */
    var STARTING_KITS = {
        'human:warrior': { weaponId: 'knights-longsword', weaponName: "Knight's Longsword", emoji: '⚔️', bonus: '+3 slash damage' },
        'human:mage': { weaponId: 'apprentice-staff', weaponName: 'Apprentice Staff', emoji: '🪄', bonus: '+2 arcane damage' },
        'human:tank': { weaponId: 'rune-hammer', weaponName: 'Rune Hammer', emoji: '🔨', bonus: '+4 max health' },
        'human:support': { weaponId: 'acid-squirt-gun', weaponName: 'Acid Squirt Gun', emoji: '💦', bonus: '+2 mend spray' },
        'elf:warrior': { weaponId: 'bone-dagger', weaponName: 'Bone Dagger', emoji: '🦷', bonus: '+10% attack speed' },
        'elf:mage': { weaponId: 'ember-wand', weaponName: 'Ember Wand', emoji: '✨', bonus: '+3 fire damage' },
        'elf:tank': { weaponId: 'bulwark-shield', weaponName: 'Bulwark Shield', emoji: '🛡️', bonus: '+6 block' },
        'elf:support': { weaponId: 'venom-lobber', weaponName: 'Venom Lobber', emoji: '⚗️', bonus: '+2 cleanse spray' },
        'dwarf:warrior': { weaponId: 'rune-hammer', weaponName: 'Rune Hammer', emoji: '🔨', bonus: '+3 forge damage' },
        'dwarf:mage': { weaponId: 'stormcaller-staff', weaponName: 'Stormcaller Staff', emoji: '🌩️', bonus: '+3 storm damage' },
        'dwarf:tank': { weaponId: 'kingsfall-maul', weaponName: 'Kingsfall Maul', emoji: '👑', bonus: '+8 block' },
        'dwarf:support': { weaponId: 'plague-sprayer', weaponName: 'Plague Sprayer', emoji: '☠️', bonus: '+2 forge-fume mend' },
        'orc:warrior': { weaponId: 'butcher-cleaver', weaponName: 'Butcher Cleaver', emoji: '🔪', bonus: '+4 brutal damage' },
        'orc:mage': { weaponId: 'apprentice-staff', weaponName: 'Apprentice Staff', emoji: '🪄', bonus: '+3 spirit damage' },
        'orc:tank': { weaponId: 'kingsfall-maul', weaponName: 'Kingsfall Maul', emoji: '👑', bonus: '+6 max health' },
        'orc:support': { weaponId: 'acid-squirt-gun', weaponName: 'Acid Squirt Gun', emoji: '💦', bonus: '+4 war spray' }
    };

    var DEFAULT_KIT_KEY = 'human:warrior';

    /* Bridge for the 1D class scheme (rifleman/sapper/runner) + goblin race
     * (see content/gravegain-arsenal.ts mirror): maps them onto the closest
     * 3D-scheme kit so one canonical pool serves all three games. */
    var CLASS_BRIDGE = {
        rifleman: 'mage', // ranged line fighter -> mage kit (ranged staff/bow)
        sapper: 'tank', // sturdy forge hand -> tank kit
        runner: 'warrior' // fast skirmisher -> warrior kit
    };
    var RACE_BRIDGE = { goblin: 'orc' }; // goblin scavengers kit like orcs

    function weaponFor(classId, raceId) {
        try {
            var cls = norm(classId, 'warrior');
            if (CLASS_BRIDGE[cls]) cls = CLASS_BRIDGE[cls];
            var race = norm(raceId, 'human');
            if (RACE_BRIDGE[race]) race = RACE_BRIDGE[race];
            return getStartingWeapon(race, cls);
        } catch (e) { return STARTING_KITS[DEFAULT_KIT_KEY]; }
    }

    function norm(s, fallback) {
        try {
            s = String(s == null ? '' : s).trim().toLowerCase();
            return s || fallback;
        } catch (e) { return fallback; }
    }

    function byId(id) {
        try {
            id = norm(id, '');
            if (!id) return null;
            for (var i = 0; i < WEAPONS.length; i++) {
                if (WEAPONS[i] && WEAPONS[i].id === id) return WEAPONS[i];
            }
            return null;
        } catch (e) { return null; }
    }

    function getStartingWeapon(race, cls) {
        try {
            var key = norm(race, 'human') + ':' + norm(cls, 'warrior');
            var kit = STARTING_KITS[key] || STARTING_KITS[DEFAULT_KIT_KEY];
            if (!kit || !byId(kit.weaponId)) kit = STARTING_KITS[DEFAULT_KIT_KEY];
            return kit;
        } catch (e) { return STARTING_KITS[DEFAULT_KIT_KEY]; }
    }

    function byRarity(rarity) {
        try {
            rarity = norm(rarity, '');
            var out = [];
            for (var i = 0; i < WEAPONS.length; i++) {
                if (WEAPONS[i] && WEAPONS[i].rarity === rarity) out.push(WEAPONS[i]);
            }
            return out;
        } catch (e) { return []; }
    }

    /* Weighted loot roll. luck 0..10 nudges odds toward epic/legendary. */
    function rollLoot(randFn, luck) {
        try {
            if (typeof randFn !== 'function') randFn = Math.random;
            luck = Number(luck);
            if (!isFinite(luck)) luck = 0;
            if (luck < 0) luck = 0;
            if (luck > 10) luck = 10;
            var weights = [
                { rarity: 'common', w: 60 - luck * 2 },
                { rarity: 'rare', w: 28 },
                { rarity: 'epic', w: 10 + luck * 1.2 },
                { rarity: 'legendary', w: 3 + luck * 0.8 }
            ];
            var total = 0, i;
            for (i = 0; i < weights.length; i++) {
                if (weights[i].w < 0.5) weights[i].w = 0.5;
                total += weights[i].w;
            }
            var r = randFn() * total;
            var picked = 'common';
            for (i = 0; i < weights.length; i++) {
                r -= weights[i].w;
                if (r <= 0) { picked = weights[i].rarity; break; }
            }
            var pool = byRarity(picked);
            if (!pool.length) return WEAPONS[0] || null;
            var idx = Math.floor(randFn() * pool.length);
            if (idx < 0) idx = 0;
            if (idx >= pool.length) idx = pool.length - 1;
            return pool[idx];
        } catch (e) {
            try { return WEAPONS[0] || null; } catch (e2) { return null; }
        }
    }

    try {
        window.GraveGainArsenal = {
            VERSION: VERSION,
            WEAPONS: WEAPONS,
            STARTING_KITS: STARTING_KITS,
            getStartingWeapon: getStartingWeapon,
            weaponFor: weaponFor, // cross-scheme bridge (1D classes + goblin)
            byId: byId,
            byRarity: byRarity,
            rollLoot: rollLoot
        };
    } catch (e) { /* never throws */ }
})();
