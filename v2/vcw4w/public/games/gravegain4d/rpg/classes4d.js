(function () {
    'use strict';

    // GraveGain4D classes — mirrors GraveGain3D ClassData combat numbers
    // exactly (baseDmg / attackSpeed / critChance / critMult / range),
    // with putter-weapon names for the 4D golf-combat flavor.
    // Source of truth for GG3D shapes:
    // v2/vcw4w/public/games/html/gravegain3d/engine/game-data.js

    const ClassType = {
        WARRIOR: 'warrior',
        TANK: 'tank',
        SUPPORT: 'support',
        MAGE: 'mage'
    };

    const ClassData = {
        [ClassType.WARRIOR]: {
            title: 'Warrior',
            desc: 'Master of putter play. 3-hit slicing combo, crisp shield parry (Right Click), and Whirlwind drive.',
            weaponName: 'Moonsteel Long-Putter & Shield',
            baseDmg: 20,
            attackSpeed: 0.28,
            critChance: 0.15,
            critMult: 2.0,
            range: 68
        },
        [ClassType.MAGE]: {
            title: 'Mage',
            desc: 'Wielder of astral energy. Fires homing Arcane Bolts (Left Click), Frost Nova freeze (Right Click), and Meteor Storm.',
            weaponName: 'Celestial Arcane Putter-Staff',
            baseDmg: 26,
            attackSpeed: 0.38,
            critChance: 0.20,
            critMult: 2.2,
            range: 450
        },
        [ClassType.TANK]: {
            title: 'Tank',
            desc: 'Heavy fortress. Warhammer crush with massive knockback, Bulwark Stance (Right Click 90% block), and Ground Stomp.',
            weaponName: 'Spiked Putter-Maul & Tower Shield',
            baseDmg: 32,
            attackSpeed: 0.45,
            critChance: 0.10,
            critMult: 1.8,
            range: 75
        },
        [ClassType.SUPPORT]: {
            title: 'Support',
            desc: 'Combat chemist. Rapid bio-darts (Left Click), Healing/Toxic Mist Flask (Right Click), and Nanite Swarm.',
            weaponName: 'Magitech Chem-Putter',
            baseDmg: 14,
            attackSpeed: 0.18,
            critChance: 0.12,
            critMult: 1.7,
            range: 400
        }
    };

    function getClass(id) {
        return ClassData[id] || null;
    }

    window.GG4D_Classes = { ClassType, ClassData, getClass };
})();
