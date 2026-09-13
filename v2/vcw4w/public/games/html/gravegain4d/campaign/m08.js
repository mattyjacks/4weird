/* GraveGain4D M08 - The MERCENARY Doctrine. W-slice -7, orbital strike. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 8,
            title: 'M08 - The MERCENARY Doctrine',
            subtitle: 'Orbital Strike Calibration',
            wSlice: -7, timeFork: 'kinetic-strike-fork',
            location: 'Highland Peak Observatory',
            par: 780, parSeconds: 780,
            difficulty: { hpMult: 1.75, dmgMult: 1.35, density: 1.25, eliteChance: 0.16 },
            objectives: [
                { id: 'slay_boss', desc: 'Slay the Bone Goliath Warlord', count: 1 },
                { id: 'slay_minions', desc: 'Defeat 35 undead horde assault units', count: 35 },
                { id: 'paint_target', desc: 'Paint the orbital target across both slices for LuckyStarShip', count: 2 }
            ],
            spawns: [
                { id: 'fog-lurker', count: 7, wave: 1 },
                { id: 'ash-reaper', count: 5, wave: 1 },
                { id: 'hex-crow', count: 6, wave: 2 },
                { id: 'furnace-hulk', count: 3, wave: 3 }
            ],
            boss: { id: 'boss-bone-goliath-4d', name: 'BONE GOLIATH WARLORD', hpMult: 1.55 },
            bossId: 'boss-bone-goliath-4d',
            intro: [
                { speaker: 'Valley Net', text: 'LuckyStarShip kinetic strike needs manual laser paint from the peak - in BOTH slices or the rift eats the round.', portrait: '👱🏻‍♀️' },
                { speaker: 'Warchief Groknak', text: 'Bring down sky-fire! Burn the horde in every world at once!', portrait: '👹' },
                { speaker: 'MERCENARY', text: 'Doctrine of dreams: the laser only locks where the echo overlaps the flesh. Paint the overlap.', portrait: '🌙' }
            ],
            outro: [
                { speaker: 'Valley Net', text: 'Kinetic strike confirmed! 80% of Hades’ perimeter forces obliterated across slices!', portrait: '👱🏻‍♀️' },
                { speaker: 'Private Lisa Park', text: 'Fire fell through the fourth direction. One flash - every timeline burned clean.', portrait: '👩‍🚀' }
            ],
            dialogueBefore: [
                { speaker: 'Valley Net', text: 'LuckyStarShip kinetic strike needs manual laser paint from the peak - in BOTH slices or the rift eats the round.', portrait: '👱🏻‍♀️' }
            ],
            dialogueAfter: [
                { speaker: 'Valley Net', text: 'Kinetic strike confirmed! 80% of Hades’ perimeter forces obliterated across slices!', portrait: '👱🏻‍♀️' }
            ],
            rewards: { killCredits: 2200, gold: 2200, uusd: 4000, unlock: 'codex_mercenary_doctrine' }
        });
    } catch (_) { /* never throw */ }
})();
