(function () {
    'use strict';

    // GraveGain4D races — mirrors GraveGain3D RaceData numbers exactly,
    // each entry gains one 4D (w-axis) perk on top.
    // Source of truth for GG3D shapes:
    // v2/vcw4w/public/games/html/gravegain3d/engine/game-data.js

    const Race = {
        HUMAN: 'human',
        ELF: 'elf',
        DWARF: 'dwarf',
        ORC: 'orc'
    };

    const RaceData = {
        [Race.HUMAN]: {
            name: 'Human',
            emoji: '👩‍🚀',
            color: 0x4c7fff,
            maxHp: 110,
            hpRegen: 1.2,
            stamina: 110,
            speed: 245,
            desc: 'Balanced infiltrator. Shield Wall ability (absorbs 25 dmg) & Jetpack thrusters (hold Space in air).',
            perk4d: {
                id: 'slice_luck',
                name: 'Slice-Luck',
                desc: '+10% crit chance on strikes against targets in an adjacent w-slice.'
            }
        },
        [Race.ELF]: {
            name: 'Elf',
            emoji: '🧝‍♀️',
            color: 0x4cff7f,
            maxHp: 85,
            hpRegen: 3.5,
            stamina: 100,
            speed: 265,
            desc: 'Agile spellweaver. Nature Burst AoE spell, 100 Mana (+3/s regen), and Graceful Glide mechanics.',
            perk4d: {
                id: 'mana_shift',
                name: 'Mana Shift',
                desc: 'Mana also fuels w-shift: spend 15 mana to slip one w-slice instead of stamina.'
            }
        },
        [Race.DWARF]: {
            name: 'Dwarf',
            emoji: '⛏️',
            color: 0xffcc4c,
            maxHp: 160,
            hpRegen: 2.2,
            stamina: 120,
            speed: 200,
            desc: 'Stout juggernaut. Stone Form temporary invulnerability, Double Jump, and Poison immunity.',
            perk4d: {
                id: 'anchor_stance',
                name: 'Anchor Stance',
                desc: 'Immune to w-storm push and forced w-displacement.'
            }
        },
        [Race.ORC]: {
            name: 'Orc',
            emoji: '👹',
            color: 0xff4c4c,
            maxHp: 210,
            hpRegen: 3.0,
            stamina: 110,
            speed: 220,
            desc: 'Fierce berserker. Generates Rage when taking/dealing damage, unleashing explosive Rage Burst AoE.',
            perk4d: {
                id: 'rewind_rage',
                name: 'Rewind Rage',
                desc: 'Rewinds charge Rage: each rewound second grants +8 Rage on return.'
            }
        }
    };

    function getRace(id) {
        return RaceData[id] || null;
    }

    window.GG4D_Races = { Race, RaceData, getRace };
})();
