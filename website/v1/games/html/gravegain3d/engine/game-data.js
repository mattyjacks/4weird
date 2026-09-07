(function() {
    'use strict';

    const Race = {
        HUMAN: 'human',
        ELF: 'elf',
        DWARF: 'dwarf',
        ORC: 'orc'
    };

    const ClassType = {
        WARRIOR: 'warrior',
        TANK: 'tank',
        SUPPORT: 'support',
        MAGE: 'mage'
    };

    const DifficultyData = window.GraveGainConfig?.difficulty || {
        normal: { hpMultiplier: 1, damageMultiplier: 1, xpMultiplier: 1, lootMultiplier: 1 }
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
            desc: 'Balanced infiltrator. Shield Wall ability (absorbs 25 dmg) & Jetpack thrusters (hold Space in air).'
        },
        [Race.ELF]: {
            name: 'Elf',
            emoji: '🧝‍♀️',
            color: 0x4cff7f,
            maxHp: 85,
            hpRegen: 3.5,
            stamina: 100,
            speed: 265,
            desc: 'Agile spellweaver. Nature Burst AoE spell, 100 Mana (+3/s regen), and Graceful Glide mechanics.'
        },
        [Race.DWARF]: {
            name: 'Dwarf',
            emoji: '⛏️',
            color: 0xffcc4c,
            maxHp: 160,
            hpRegen: 2.2,
            stamina: 120,
            speed: 200,
            desc: 'Stout juggernaut. Stone Form temporary invulnerability, Double Jump, and Poison immunity.'
        },
        [Race.ORC]: {
            name: 'Orc',
            emoji: '👹',
            color: 0xff4c4c,
            maxHp: 210,
            hpRegen: 3.0,
            stamina: 110,
            speed: 220,
            desc: 'Fierce berserker. Generates Rage when taking/dealing damage, unleashing explosive Rage Burst AoE.'
        }
    };

    const ClassData = {
        [ClassType.WARRIOR]: {
            title: 'Warrior',
            desc: 'Master of swordplay. 3-hit slicing combo, crisp shield parry (Right Click), and Whirlwind attack.',
            weaponName: 'Steel Longsword & Shield',
            baseDmg: 20,
            attackSpeed: 0.28,
            critChance: 0.15,
            critMult: 2.0,
            range: 68
        },
        [ClassType.MAGE]: {
            title: 'Mage',
            desc: 'Wielder of astral energy. Fires homing Arcane Bolts (Left Click), Frost Nova freeze (Right Click), and Meteor Storm.',
            weaponName: 'Celestial Arcane Staff',
            baseDmg: 26,
            attackSpeed: 0.38,
            critChance: 0.20,
            critMult: 2.2,
            range: 450
        },
        [ClassType.TANK]: {
            title: 'Tank',
            desc: 'Heavy fortress. Warhammer crush with massive knockback, Bulwark Stance (Right Click 90% block), and Ground Stomp.',
            weaponName: 'Spiked Warhammer & Tower Shield',
            baseDmg: 32,
            attackSpeed: 0.45,
            critChance: 0.10,
            critMult: 1.8,
            range: 75
        },
        [ClassType.SUPPORT]: {
            title: 'Support',
            desc: 'Combat chemist. Rapid bio-darts (Left Click), Healing/Toxic Mist Flask (Right Click), and Nanite Swarm.',
            weaponName: 'Magitech Chem-Gun',
            baseDmg: 14,
            attackSpeed: 0.18,
            critChance: 0.12,
            critMult: 1.7,
            range: 400
        }
    };

    const QuartersUpgrades = [
        { level: 1, size: '400x300 px', capacity: 100, cost: 250 },
        { level: 2, size: '600x400 px', capacity: 150, cost: 500 },
        { level: 3, size: '800x500 px', capacity: 200, cost: 900 },
        { level: 4, size: '1000x600 px', capacity: 250, cost: 1400 },
        { level: 5, size: '1200x700 px', capacity: 300, cost: 2000 },
        { level: 6, size: '1400x800 px', capacity: 350, cost: 2500 }
    ];

    const BotanySeeds = [
        { id: 'cannabis', name: 'Cannabis Sativa', space: 15, time: 60, yield: 3, value: 60, emoji: '🌿' },
        { id: 'mushroom', name: 'Magic Mushroom', space: 8, time: 45, yield: 2, value: 85, emoji: '🍄' },
        { id: 'bloodrose', name: 'Blood Rose', space: 10, time: 30, yield: 1, value: 140, emoji: '🌹' },
        { id: 'sparkite', name: 'Sparkite Spore', space: 12, time: 90, yield: 4, value: 110, emoji: '⚡' }
    ];

    const ArmoryUpgrades = [
        { id: 'health', name: 'Genetic Hull Infusion', icon: '🧬', desc: '+25 Starting Max HP per rank.', baseCost: 150, mult: 1.8, maxRank: 5 },
        { id: 'damage', name: 'Plasma Weapon Tuning', icon: '⚡', desc: '+15% Weapon & Spell Damage per rank.', baseCost: 200, mult: 2.0, maxRank: 5 },
        { id: 'speed', name: 'Kinetic Leg Servos', icon: '🏃', desc: '+10% Movement & Sprint speed per rank.', baseCost: 150, mult: 1.8, maxRank: 5 },
        { id: 'potions', name: 'Nanite Flask Satchel', icon: '🧪', desc: 'Start runs with +1 Healing Potion per rank.', baseCost: 250, mult: 2.2, maxRank: 3 },
        { id: 'greed', name: 'Matter Synthesizer', icon: '🪙', desc: '+25% Dungeon Gold and $UUSD yields.', baseCost: 180, mult: 1.9, maxRank: 5 }
    ];

    const RoguelikePerks = [
        { id: 'vampiric', name: 'Vampiric Leech', rarity: 'rare', icon: '🩸', desc: 'Heal 15% of all damage dealt to enemies.' },
        { id: 'lightning', name: 'Chain Lightning', rarity: 'rare', icon: '⚡', desc: 'Attacks discharge lightning arcing to 2 nearby enemies for 18 damage.' },
        { id: 'pyromancy', name: 'Infernal Brand', rarity: 'common', icon: '🔥', desc: 'Attacks ignite foes for 8 burn damage per second for 3 seconds.' },
        { id: 'frostbite', name: 'Frostbite Shards', rarity: 'common', icon: '❄️', desc: 'Hits chill enemies, slowing their movement and attack speed by 35%.' },
        { id: 'titan', name: 'Titan Vitality', rarity: 'epic', icon: '❤️', desc: '+50 Max HP and instantly restore all health to maximum.' },
        { id: 'swift', name: 'Warp Strides', rarity: 'common', icon: '👟', desc: '+25% Movement Speed and 40% reduced stamina consumption.' },
        { id: 'critfury', name: 'Critical Carnage', rarity: 'rare', icon: '🎯', desc: '+20% Critical Hit Chance and +50% Critical Damage.' },
        { id: 'ironclad', name: 'Carbide Plating', rarity: 'common', icon: '🛡️', desc: 'Take 20% reduced damage from all enemies and traps.' },
        { id: 'magnet', name: 'Soul Harvester', rarity: 'common', icon: '🧲', desc: '+100% Auto-pickup range and +40% Gold & XP drops.' },
        { id: 'executioner', name: 'Grim Reaper', rarity: 'legendary', icon: '💀', desc: 'Instantly execute any non-boss enemy that drops below 25% HP.' },
        { id: 'orb_havoc', name: 'Orbiting Glaive', rarity: 'epic', icon: '🔮', desc: 'Summon a mystical orb that orbits you, dealing 25 damage to enemies it touches.' },
        { id: 'cleave', name: 'Shockwave Cleave', rarity: 'rare', icon: '💥', desc: 'Attacks unleash a forward shockwave damaging enemies in a wider arc.' },
        { id: 'goldrush', name: 'Midas Fury', rarity: 'epic', icon: '🪙', desc: 'Gain +1% damage for every 20 Gold currently in your inventory.' },
        { id: 'alchemical', name: 'Toxic Catalyst', rarity: 'rare', icon: '🧪', desc: 'Enemies slain burst into a cloud of toxic fumes, poisoning nearby foes.' },
        { id: 'overclock', name: 'Adrenaline Rush', rarity: 'legendary', icon: '⏳', desc: 'Killing an enemy grants +40% Attack Speed and +30% Movement Speed for 4s.' }
    ];

    window.GraveGainGameData = {
        Race,
        ClassType,
        DifficultyData,
        RaceData,
        ClassData,
        QuartersUpgrades,
        BotanySeeds,
        ArmoryUpgrades,
        RoguelikePerks
    };
})();
