(function () {
    'use strict';
    // =========================================================================
    // GRAVEGAIN4D BOSSES — one per mission (10). Same canon as
    // gravegain4d-missions.js bossType values; each entry carries a 4D
    // fold-title plus the canon missionBoss it echoes. Phase changes at
    // 66% / 33% HP: phase 2 enrages (speed/dmg up, new pattern), phase 3
    // desecrates (summons minis / widens slam / shortens blink).
    // Emoji-billboard visuals. JSON-serializable via toJSON()/fromJSON().
    // No fullscreen/dblclick code.
    // =========================================================================
    try {
        if (typeof window === 'undefined') return;
        if (window.GraveGainBosses4D) return;

        var Enemy4D = null;
        try { Enemy4D = window.GraveGainEnemies4D || null; } catch (e) {}

        function num(n, fb) {
            var v = parseFloat(n);
            return (isFinite(v)) ? v : fb;
        }

        // ---- 10-boss roster: missionId -> boss ----
        // HP / attack / speed stat blocks scale per mission tier.
        var BOSS_ROSTER = [
            {
                missionId: 1, key: 'puttalot_fallen_caddie',
                name: 'Sir Puttalot the Fallen Caddie', missionBoss: 'Goblin Zed Leader',
                emoji: '🧟', hp: 420, dmg: 24, speed: 120, scale: 1.4, radius: 22,
                type: 'melee', gold: 220, killCredits: 10, bloodColor: 0x84cc16,
                attackInterval: 1.1,
                phases: {
                    2: { at: 0.66, note: 'Caddie Rage: shanks fly in W', dmgMul: 1.25, speedMul: 1.2, pattern: 'w_shank_fan' },
                    3: { at: 0.33, note: 'Lost the Masters: summons Fold Husks', dmgMul: 1.5, speedMul: 1.4, pattern: 'summon_husks' }
                },
                lore: 'Buried with his putter. Risen by NecroGenesis on the LZ fold.'
            },
            {
                missionId: 2, key: 'grove_seer_defiled',
                name: 'The Defiled Green-Seer', missionBoss: 'Elven Necromancer',
                emoji: '🧝', hp: 640, dmg: 30, speed: 80, scale: 1.3, radius: 20,
                type: 'ranged', gold: 380, killCredits: 14, bloodColor: 0x2dd4bf,
                attackInterval: 1.8,
                phases: {
                    2: { at: 0.66, note: 'Root Rot: double wraith-bolt volley', dmgMul: 1.25, speedMul: 1.1, pattern: 'double_volley' },
                    3: { at: 0.33, note: 'Mother Tree Weeps: ana/kata blink + volley', dmgMul: 1.5, speedMul: 1.25, pattern: 'blink_volley' }
                },
                lore: 'A fallen elven seer, puppeteered through the YW root-memory fold.'
            },
            {
                missionId: 3, key: 'thane_slain_king',
                name: 'Thane of the Slain Vault-King', missionBoss: 'Dwarven Zed High Thane',
                emoji: '👑', hp: 950, dmg: 38, speed: 70, scale: 1.7, radius: 26,
                type: 'melee', gold: 520, killCredits: 18, bloodColor: 0xf59e0b,
                attackInterval: 1.4, armored: true,
                phases: {
                    2: { at: 0.66, note: 'Vault Oath: XW slam shockwaves', dmgMul: 1.3, speedMul: 1.15, pattern: 'xw_slam' },
                    3: { at: 0.33, note: 'Crown of Ruin: enraged cleave + husks', dmgMul: 1.55, speedMul: 1.3, pattern: 'cleave_summon' }
                },
                lore: 'The vault-king kept his crown. It kept him.'
            },
            {
                missionId: 4, key: 'wastes_warlord_groknak',
                name: 'Groknak the Twice-Slain', missionBoss: 'Huge Orc Zed Berserker',
                emoji: '👺', hp: 1100, dmg: 45, speed: 120, scale: 1.9, radius: 26,
                type: 'melee', gold: 640, killCredits: 22, bloodColor: 0xef4444,
                attackInterval: 1.0,
                phases: {
                    2: { at: 0.66, note: 'Blood Howl: charges across the slice', dmgMul: 1.3, speedMul: 1.45, pattern: 'charge' },
                    3: { at: 0.33, note: 'WAAAGH Fold: charges + slime fission hosts', dmgMul: 1.6, speedMul: 1.6, pattern: 'charge_split' }
                },
                lore: 'Died twice, remembers both. Mad about it in four dimensions.'
            },
            {
                missionId: 5, key: 'necro_caddie',
                name: 'The NecroCaddie', missionBoss: 'Corrupted Drone Array',
                emoji: '🤖', hp: 760, dmg: 32, speed: 150, scale: 1.5, radius: 20,
                type: 'ranged', gold: 600, killCredits: 20, bloodColor: 0x22d3ee,
                attackInterval: 1.2,
                phases: {
                    2: { at: 0.66, note: 'Bag of Tricks: spiral qubit-bat release', dmgMul: 1.25, speedMul: 1.2, pattern: 'bat_spiral' },
                    3: { at: 0.33, note: 'Caddie Protocol Omega: bats + aimed bolts', dmgMul: 1.5, speedMul: 1.35, pattern: 'bat_bolt' }
                },
                lore: 'Sir Puttalot’s bag, possessed. Carries clubs and grudges.'
            },
            {
                missionId: 6, key: 'chem_titan_putt',
                name: 'Mulligan the Chem-Titan', missionBoss: 'Toxic Chem-Golem',
                emoji: '☣️', hp: 1300, dmg: 42, speed: 60, scale: 2.1, radius: 30,
                type: 'melee', gold: 720, killCredits: 26, bloodColor: 0x4ade80,
                attackInterval: 1.6,
                phases: {
                    2: { at: 0.66, note: 'Spill: leaves toxic w-puddles on slam', dmgMul: 1.3, speedMul: 1.1, pattern: 'toxic_slam' },
                    3: { at: 0.33, note: 'Do Over: splits a Hyper-Slime on slam', dmgMul: 1.5, speedMul: 1.2, pattern: 'slime_slam' }
                },
                lore: 'A mulligan that never ended. The bunker water remembers.'
            },
            {
                missionId: 7, key: 'patriarch_clint_undying',
                name: 'Patriarch Clint Undying', missionBoss: 'Reanimated Patriarch Clint',
                emoji: '🤠', hp: 1050, dmg: 40, speed: 95, scale: 1.6, radius: 24,
                type: 'melee', gold: 700, killCredits: 24, bloodColor: 0xffd700,
                attackInterval: 1.3,
                phases: {
                    2: { at: 0.66, note: 'Last Roundup: summons Marrow Skulls', dmgMul: 1.25, speedMul: 1.2, pattern: 'skull_call' },
                    3: { at: 0.33, note: 'High Noon at Kata: duels across w', dmgMul: 1.55, speedMul: 1.35, pattern: 'w_duel' }
                },
                lore: 'The ranch patriarch. Death could not foreclose on him.'
            },
            {
                missionId: 8, key: 'goliath_fairway_reaper',
                name: 'The Fairway Reaper', missionBoss: 'Bone Goliath Warlord',
                emoji: '💀', hp: 1450, dmg: 48, speed: 75, scale: 2.6, radius: 32,
                type: 'melee', gold: 900, killCredits: 30, bloodColor: 0xef4444,
                attackInterval: 1.4,
                phases: {
                    2: { at: 0.66, note: 'Rough Justice: triple XW slam', dmgMul: 1.3, speedMul: 1.15, pattern: 'triple_slam' },
                    3: { at: 0.33, note: 'Out of Bounds: slam + wraith escort', dmgMul: 1.55, speedMul: 1.3, pattern: 'slam_escort' }
                },
                lore: 'Mows the fairway of the living. Par is extinction.'
            },
            {
                missionId: 9, key: 'necro_array_titan_4d',
                name: 'Necro-Array Titan 4D', missionBoss: 'Necro-Array Titan',
                emoji: '👹', hp: 1750, dmg: 55, speed: 70, scale: 2.9, radius: 34,
                type: 'ranged', gold: 1100, killCredits: 36, bloodColor: 0x8b5cf6,
                attackInterval: 1.6,
                phases: {
                    2: { at: 0.66, note: 'Array Sync: rotating 4D bolt ring', dmgMul: 1.3, speedMul: 1.1, pattern: 'bolt_ring' },
                    3: { at: 0.33, note: 'Overclock: ring + blink + bats', dmgMul: 1.55, speedMul: 1.25, pattern: 'overclock' }
                },
                lore: 'Hades’ antenna in four dimensions. It broadcasts hunger.'
            },
            {
                missionId: 10, key: 'lucifer_hades_ascendant',
                name: 'Lucifer Hades 4D Ascendant', missionBoss: 'Dr. Lucifer Hades (Consciousness Overlord)',
                emoji: '🐉', hp: 2400, dmg: 60, speed: 90, scale: 3.1, radius: 36,
                type: 'ranged', gold: 1500, killCredits: 50, bloodColor: 0xc4b5fd,
                attackInterval: 1.2,
                phases: {
                    2: { at: 0.66, note: 'Ascension I: pentachoron blink + volleys', dmgMul: 1.3, speedMul: 1.25, pattern: 'ascension_volley' },
                    3: { at: 0.33, note: 'NecroGenesis Omega: everything at once', dmgMul: 1.6, speedMul: 1.4, pattern: 'omega' }
                },
                lore: 'NecroGenesis perfected. Death is now a tee time, and all are booked.'
            }
        ];

        function findSpec(missionIdOrKey) {
            for (var i = 0; i < BOSS_ROSTER.length; i++) {
                if (BOSS_ROSTER[i].missionId === missionIdOrKey || BOSS_ROSTER[i].key === missionIdOrKey) {
                    return BOSS_ROSTER[i];
                }
            }
            return null;
        }

        function phaseFor(hpFrac) {
            if (hpFrac <= 0.33) return 3;
            if (hpFrac <= 0.66) return 2;
            return 1;
        }

        // Boss entity: a heavyweight Enemy4D-shaped object with phase logic.
        // Uses the shared Enemy4D base when loaded (visuals/state identical),
        // otherwise falls back to a standalone record with the same fields.
        function spawnBoss(missionIdOrKey, x, y, z, w, diffScale) {
            var spec = findSpec(missionIdOrKey);
            if (!spec) spec = findSpec(8); // Bone Goliath Warlord fold (legacy fallback)
            var diff = num(diffScale, 1) || 1;

            var boss;
            if (Enemy4D) {
                boss = Enemy4D.spawn('grave_husk_4d', x, y, z, w, 1, {
                    key: spec.key, name: spec.name, emoji: spec.emoji,
                    hp: spec.hp, dmg: spec.dmg, speed: spec.speed,
                    scale: spec.scale, radius: spec.radius, type: spec.type,
                    gold: spec.gold, killCredits: spec.killCredits,
                    bloodColor: spec.bloodColor, attackInterval: spec.attackInterval
                });
                // Re-apply difficulty on top of the explicit spec stats.
                boss.maxHp = Math.round(spec.hp * diff);
                boss.hp = boss.maxHp;
                boss.dmg = spec.dmg * diff;
            } else {
                boss = {
                    key: spec.key, name: spec.name, emoji: spec.emoji,
                    x: num(x, 0), y: num(y, 0), z: num(z, 0), w: num(w, 0),
                    radius: spec.radius, angle: 0, xwAngle: 0,
                    maxHp: Math.round(spec.hp * diff), dmg: spec.dmg * diff,
                    speed: spec.speed, elite: false, state: 'chase',
                    attackTimer: 0, attackInterval: spec.attackInterval,
                    kx: 0, ky: 0, kz: 0, kw: 0,
                    goldValue: spec.gold, killCredits: spec.killCredits,
                    bloodColor: spec.bloodColor, scale: spec.scale, type: spec.type,
                    group3d: null, billboard: null,
                    takeDamage: function (a) { this.hp -= num(a, 0); return this.hp <= 0; },
                    syncSlice: function () {},
                    destroy: function () {}
                };
                boss.hp = boss.maxHp;
            }

            boss.isBoss = true;
            boss.missionId = spec.missionId;
            boss.missionBoss = spec.missionBoss;
            boss.specKey = spec.key;
            boss.lore = spec.lore;
            boss.phase = 1;
            boss.phasePattern = 'base';
            boss.phaseNote = '';
            return boss;
        }

        // Call each tick (or after damage): advances phase at 66/33% HP,
        // applies enrage multipliers, returns the new phase (1/2/3).
        // Emits game.onBossPhase(boss, phase) when present.
        function updatePhase(boss, game) {
            if (!boss) return 1;
            var frac = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
            var next = phaseFor(frac);
            if (next !== boss.phase) {
                boss.phase = next;
                var spec = findSpec(boss.specKey || boss.missionId);
                var cfg = spec && spec.phases && spec.phases[next];
                if (cfg) {
                    var base = spec;
                    // Multipliers apply once relative to base spec stats.
                    boss.dmg = base.dmg * cfg.dmgMul;
                    boss.speed = base.speed * cfg.speedMul;
                    boss.phasePattern = cfg.pattern;
                    boss.phaseNote = cfg.note;
                    // Phase-3 desecration: immediately demand attention.
                    boss.attackTimer = 0;
                }
                try {
                    if (game && game.onBossPhase) game.onBossPhase(boss, next);
                    if (game && game.audio) game.audio.playSfx('bossPhase', 0.9);
                } catch (e) { /* never throws */ }
            }
            return boss.phase;
        }

        function toJSON(boss) {
            if (!boss) return null;
            if (boss.toJSON) {
                var j = boss.toJSON();
                j.isBoss = true;
                j.missionId = boss.missionId;
                j.missionBoss = boss.missionBoss;
                j.specKey = boss.specKey;
                j.phase = boss.phase;
                j.phasePattern = boss.phasePattern;
                return j;
            }
            return {
                key: boss.key, name: boss.name, emoji: boss.emoji,
                x: boss.x, y: boss.y, z: boss.z, w: boss.w,
                hp: boss.hp, maxHp: boss.maxHp, dmg: boss.dmg, speed: boss.speed,
                isBoss: true, missionId: boss.missionId, missionBoss: boss.missionBoss,
                specKey: boss.specKey, phase: boss.phase, phasePattern: boss.phasePattern,
                goldValue: boss.goldValue, killCredits: boss.killCredits
            };
        }

        window.GraveGainBosses4D = {
            ROSTER: BOSS_ROSTER,
            spawnBoss: spawnBoss,
            updatePhase: updatePhase,
            phaseFor: phaseFor,
            specFor: findSpec,
            toJSON: toJSON
        };
    } catch (e) { /* never throws */ }
})();
