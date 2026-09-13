/* GraveGain4D Enemy — DS-GRAV4D-04 (games lane, grav4d-04)
 * Bridge over GraveGain3DModels theme palettes + buildEnemy. No model bytes copied.
 * Exposes: window.GraveGain4DEnemy { VERSION, VARIANTS, ELITES, BOSSES, create, spawnPack }
 */
(function () {
    'use strict';
    if (window.GraveGain4DEnemy && window.GraveGain4DEnemy.VERSION) return;
    var VERSION = '1.0.0';

    // 12 base variants: bridged theme key + emoji fallback + base stats.
    var VARIANTS = [
        { key: 'crypt_skeleton',  theme: 'stone_crypt',      emoji: '\uD83D\uDC80', hp: 40,  dmg: 8,  speed: 120 },
        { key: 'ship_drone',      theme: 'metallic_ship',    emoji: '\uD83D\uDEF8', hp: 45,  dmg: 9,  speed: 150 },
        { key: 'grove_wisp',      theme: 'elven_grove',      emoji: '\u2728',       hp: 35,  dmg: 10, speed: 170 },
        { key: 'vault_golem',     theme: 'dwarven_vault',    emoji: '\uD83D\uDDFF', hp: 90,  dmg: 12, speed: 80 },
        { key: 'waste_raider',    theme: 'orc_wastes',       emoji: '\uD83D\uDC79', hp: 60,  dmg: 11, speed: 140 },
        { key: 'toxic_crawler',   theme: 'toxic_catacombs',  emoji: '\u2623\uFE0F', hp: 55,  dmg: 10, speed: 130 },
        { key: 'citadel_shade',   theme: 'citadel_darkness', emoji: '\uD83C\uDF11', hp: 70,  dmg: 13, speed: 125 },
        { key: 'crypt_archer',    theme: 'stone_crypt',      emoji: '\uD83C\uDFF9', hp: 38,  dmg: 12, speed: 135 },
        { key: 'ship_warden',     theme: 'metallic_ship',    emoji: '\uD83E\uDD16', hp: 85,  dmg: 11, speed: 95 },
        { key: 'grove_thorn',     theme: 'elven_grove',      emoji: '\uD83C\uDF3F', hp: 50,  dmg: 9,  speed: 145 },
        { key: 'vault_sapper',    theme: 'dwarven_vault',    emoji: '\u26CF\uFE0F', hp: 48,  dmg: 14, speed: 120 },
        { key: 'waste_shaman',    theme: 'orc_wastes',       emoji: '\uD83E\uDDBF', hp: 52,  dmg: 15, speed: 110 }
    ];

    // 4D elites (fold-native): bigger scale, w-phase ability.
    var ELITES = [
        { key: 'tesseract_husk', label: 'Tesseract Husk', emoji: '\uD83D\uDD33', hp: 220, dmg: 20, speed: 100, ability: 'w_fold' },
        { key: 'ana_stalker',    label: 'Ana Stalker',    emoji: '\uD83D\uDC41\uFE0F', hp: 180, dmg: 24, speed: 170, ability: 'ana_lunge' },
        { key: 'kata_lurker',    label: 'Kata Lurker',    emoji: '\uD83C\uDF1A', hp: 200, dmg: 22, speed: 120, ability: 'kata_dive' },
        { key: 'fold_revenant',  label: 'Fold Revenant',  emoji: '\uD83D\uDC7B', hp: 260, dmg: 26, speed: 110, ability: 'fold_echo' },
        { key: 'echo_of_clint',  label: 'Echo of Clint',  emoji: '\uD83E\uDE9E', hp: 300, dmg: 28, speed: 130, ability: 'echo_putt' }
    ];

    // 10 mission bosses with phase tables (hp fraction -> phase effects).
    var BOSSES = [
        { key: 'boss_m1_cryptkeeper', label: 'Cryptkeeper of Hole 1',  theme: 'stone_crypt',      hp: 600,  dmg: 22, speed: 90,  phases: [{ at: 0.66, note: 'adds crypt archers' }, { at: 0.33, note: 'w-wall slam' }] },
        { key: 'boss_m2_ferryman',   label: 'Ferryman of the Fold',    theme: 'metallic_ship',    hp: 750,  dmg: 24, speed: 95,  phases: [{ at: 0.66, note: 'drone escort' }, { at: 0.33, note: 'ana tide' }] },
        { key: 'boss_m3_thornmother',label: 'Thornmother of Aelindra', theme: 'elven_grove',      hp: 900,  dmg: 26, speed: 85,  phases: [{ at: 0.66, note: 'thorn snare' }, { at: 0.33, note: 'w-roots' }] },
        { key: 'boss_m4_vaultlord',  label: 'Vaultlord Brassbeard',    theme: 'dwarven_vault',    hp: 1100, dmg: 28, speed: 75,  phases: [{ at: 0.66, note: 'sapper charge' }, { at: 0.33, note: 'gold quake' }] },
        { key: 'boss_m5_warchief',   label: 'Warchief of the Wastes',  theme: 'orc_wastes',       hp: 1250, dmg: 30, speed: 105, phases: [{ at: 0.66, note: 'raider rally' }, { at: 0.33, note: 'kata roar' }] },
        { key: 'boss_m6_plaguechoir',label: 'Plague Choir',            theme: 'toxic_catacombs',  hp: 1400, dmg: 30, speed: 95,  phases: [{ at: 0.66, note: 'toxic pool' }, { at: 0.33, note: 'w-miasma' }] },
        { key: 'boss_m7_nightcaddy', label: 'Night Caddy',             theme: 'citadel_darkness', hp: 1600, dmg: 32, speed: 110, phases: [{ at: 0.66, note: 'shade caddy pack' }, { at: 0.33, note: 'darkness putt' }] },
        { key: 'boss_m8_foldtyrant', label: 'Fold Tyrant',             theme: 'citadel_darkness', hp: 1900, dmg: 34, speed: 100, phases: [{ at: 0.66, note: 'tesseract husks' }, { at: 0.33, note: 'fold collapse' }] },
        { key: 'boss_m9_echoclint',  label: 'Clint, Echo Ascendant',   theme: 'stone_crypt',      hp: 2200, dmg: 36, speed: 120, phases: [{ at: 0.66, note: 'echo putts' }, { at: 0.33, note: 'soul-orb storm' }] },
        { key: 'boss_m10_gravemind', label: 'The GraveMind (4D)',      theme: 'toxic_catacombs',  hp: 2600, dmg: 40, speed: 90,  phases: [{ at: 0.75, note: 'elite rotation' }, { at: 0.5, note: 'w inversion' }, { at: 0.25, note: 'final putt duel' }] }
    ];

    function paletteFor(theme) {
        try {
            if (typeof window.GraveGain3DModels !== 'undefined' && window.GraveGain3DModels) {
                var M = window.GraveGain3DModels;
                if (M.THEMES && M.THEMES[theme]) return M.THEMES[theme];
                if (typeof M.themeOf === 'function') return M.themeOf(theme);
            }
        } catch (_) { /* fallback below */ }
        return { label: theme, body: 0xddddcc, trim: 0x475569, emissive: 0xff2222 };
    }

    function meshFor(def) {
        // Bridge: GraveGain3DModels.buildEnemy(theme/variant) when present.
        try {
            if (typeof window.GraveGain3DModels !== 'undefined' &&
                window.GraveGain3DModels && typeof window.GraveGain3DModels.buildEnemy === 'function') {
                return window.GraveGain3DModels.buildEnemy(def.key, def.theme);
            }
        } catch (_) { /* fall through */ }
        try {
            if (typeof window.GraveGainModels3D !== 'undefined' &&
                window.GraveGainModels3D && typeof window.GraveGainModels3D.buildEnemy === 'function') {
                return window.GraveGainModels3D.buildEnemy(def.key);
            }
        } catch (_) { /* fall through */ }
        return { descriptor: true, emoji: def.emoji || '\uD83D\uDC80' };
    }

    function create(defKey, x, z, w, difficultyScale) {
        var all = VARIANTS.concat(ELITES).concat(BOSSES);
        var def = null;
        for (var i = 0; i < all.length; i++) { if (all[i].key === defKey) { def = all[i]; break; } }
        if (!def) def = VARIANTS[0];
        var ds = difficultyScale || 1.0;
        var isBoss = def.key.indexOf('boss_') === 0;
        var isElite = !isBoss && ELITES.some(function (e) { return e.key === def.key; });
        return {
            key: def.key, label: def.label || def.key,
            theme: def.theme || 'stone_crypt',
            palette: paletteFor(def.theme || 'stone_crypt'),
            mesh: meshFor(def),
            meshKind: (typeof window.GraveGain3DModels !== 'undefined' && window.GraveGain3DModels && typeof window.GraveGain3DModels.buildEnemy === 'function') ? 'GraveGain3DModels' : 'emoji',
            pos4: { x: x || 0, y: 0, z: z || 0, w: w || 0 },
            maxHp: Math.round(def.hp * ds * (isElite ? 1.5 : 1) * (isBoss ? 1.0 : 1)),
            dmg: Math.round(def.dmg * ds),
            speed: def.speed,
            isBoss: isBoss, isElite: isElite,
            ability: def.ability || null,
            phases: def.phases || null, phaseIndex: 0,
            hp: Math.round(def.hp * ds), state: 'idle'
        };
    }

    function spawnPack(theme, count, worldId) {
        var pack = [];
        var pool = VARIANTS.filter(function (v) { return v.theme === theme; });
        if (!pool.length) pool = VARIANTS.slice();
        var ds = 1.0 + ((worldId || 0) * 0.15);
        for (var i = 0; i < (count || 4); i++) {
            var def = pool[i % pool.length];
            var a = (i / Math.max(1, count)) * Math.PI * 2;
            var e = create(def.key, Math.cos(a) * (6 + i), Math.sin(a) * (6 + i), (i % 3) - 1, ds);
            pack.push(e);
        }
        // Every 3rd pack adds a 4D elite from the matching index.
        if ((count || 0) >= 3) {
            var elite = ELITES[(worldId || 0) % ELITES.length];
            pack.push(create(elite.key, 0, -8, 1, ds));
        }
        return pack;
    }

    window.GraveGain4DEnemy = {
        VERSION: VERSION, VARIANTS: VARIANTS, ELITES: ELITES, BOSSES: BOSSES,
        create: create, spawnPack: spawnPack, paletteFor: paletteFor, meshFor: meshFor
    };
})();
