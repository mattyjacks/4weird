(function () {
    'use strict';

    // GraveGain4D armory upgrades — 8 ranked upgrades in the GG3D ArmoryUpgrades
    // shape ({ id, name, icon, desc, baseCost, mult, maxRank }), adapted with
    // 4D flavor (W-Bank Shots, Chrono Padding, ...).
    // GG3D reference: Plasma Weapon Tuning +15%/rank (baseCost 200, mult 2.0,
    // maxRank 5), Genetic Hull Infusion, Kinetic Leg Servos, Nanite Flask
    // Satchel, Matter Synthesizer.

    const Upgrades = [
        { id: 'damage', name: 'Plasma Putter Tuning', icon: '⚡', desc: '+15% Putter & Spell Damage per rank.', baseCost: 200, mult: 2.0, maxRank: 5 },
        { id: 'health', name: 'Genetic Hull Infusion', icon: '🧬', desc: '+25 Starting Max HP per rank.', baseCost: 150, mult: 1.8, maxRank: 5 },
        { id: 'speed', name: 'Kinetic Leg Servos', icon: '🏃', desc: '+10% Movement & Sprint speed per rank.', baseCost: 150, mult: 1.8, maxRank: 5 },
        { id: 'potions', name: 'Nanite Flask Satchel', icon: '🧪', desc: 'Start runs with +1 Healing Potion per rank.', baseCost: 250, mult: 2.2, maxRank: 3 },
        { id: 'greed', name: 'Matter Synthesizer', icon: '🪙', desc: '+25% Dungeon Gold and $UUSD yields.', baseCost: 180, mult: 1.9, maxRank: 5 },
        { id: 'wbank', name: 'W-Bank Shots', icon: '🎯', desc: 'Putter shots ricochet across +1 w-slice per rank.', baseCost: 220, mult: 2.0, maxRank: 5 },
        { id: 'chrono', name: 'Chrono Padding', icon: '⏳', desc: '+1s Rewind buffer per rank, +10% rewind refund.', baseCost: 240, mult: 2.1, maxRank: 3 },
        { id: 'stormward', name: 'Stormward Plating', icon: '🛡️', desc: '-15% W-Storm damage per rank, steadier aim inside storms.', baseCost: 190, mult: 1.9, maxRank: 5 }
    ];

    function getUpgrade(id) {
        return Upgrades.find((u) => u.id === id) || null;
    }

    function costForRank(upgrade, rank) {
        // rank = rank being purchased (1-based).
        const u = typeof upgrade === 'string' ? getUpgrade(upgrade) : upgrade;
        if (!u) return 0;
        return Math.floor(u.baseCost * Math.pow(u.mult, rank - 1));
    }

    window.GG4D_Upgrades = { Upgrades, getUpgrade, costForRank };
})();
