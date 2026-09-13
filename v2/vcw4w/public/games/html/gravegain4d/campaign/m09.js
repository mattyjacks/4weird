/* GraveGain4D M09 - Gate of the NecroGenesis. W-slice -8, citadel breach. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 9,
            title: 'M09 - Gate of the NecroGenesis',
            subtitle: 'The Breach of the Array',
            wSlice: -8, timeFork: 'titan-breach-fork',
            location: 'The Citadel Perimeter (Rift Floor)',
            par: 840, parSeconds: 840,
            difficulty: { hpMult: 1.9, dmgMult: 1.45, density: 1.35, eliteChance: 0.2 },
            objectives: [
                { id: 'slay_boss', desc: 'Destroy the Necro-Array Titan', count: 1 },
                { id: 'slay_all', desc: 'Eliminate 40 elite citadel guardians', count: 40 },
                { id: 'gauntlet_waves', desc: 'Survive 3 citadel gauntlet waves before the Titan', count: 3 }
            ],
            spawns: [
                { id: 'array-acolyte', count: 8, wave: 1 },
                { id: 'rust-knight', count: 6, wave: 1 },
                { id: 'wail-choir', count: 5, wave: 2 },
                { id: 'suture-horror', count: 5, wave: 2 },
                { id: 'furnace-hulk', count: 3, wave: 3 }
            ],
            boss: {
                id: 'boss-necro-titan-4d', name: 'NECRO-ARRAY TITAN (RIFTBOUND)',
                hpMult: 1.6,
                phases: [
                    { name: 'PHASE I - ARRAY AWAKENS', adds: 2 },
                    { name: 'PHASE II - SHIELD OF THE DEAD', adds: 3 },
                    { name: 'PHASE III - TITAN’S WRATH', adds: 4 }
                ]
            },
            bossId: 'boss-necro-titan-4d',
            intro: [
                { speaker: 'Queen Aelindra', text: 'The threshold of Hades’ sanctum. All four races - elves, dwarves, orcs, goblins - stand behind you!', portrait: '🧝‍♀️' },
                { speaker: 'Forgemaster Borin', text: 'Smashed through their gates! Leave none of these monsters standing!', portrait: '⛏️' },
                { speaker: 'Dr. Lucifer Hades', text: 'Come, little putter. My Titan guards the door between branes. Flesh is weak - undeath is ETERNAL!', portrait: '👑' }
            ],
            outro: [
                { speaker: 'Valley Net', text: 'Perimeter breached. The doors to Ascendant Hades’ chamber stand open - across BOTH branes.', portrait: '👱🏻‍♀️' },
                { speaker: 'MERCENARY', text: 'One door, two branes. Dream steady - the final putt is next.', portrait: '🌙' }
            ],
            dialogueBefore: [
                { speaker: 'Queen Aelindra', text: 'The threshold of Hades’ sanctum. All four races - elves, dwarves, orcs, goblins - stand behind you!', portrait: '🧝‍♀️' }
            ],
            dialogueAfter: [
                { speaker: 'Valley Net', text: 'Perimeter breached. The doors to Ascendant Hades’ chamber stand open - across BOTH branes.', portrait: '👱🏻‍♀️' }
            ],
            rewards: { killCredits: 3000, gold: 3000, uusd: 5500, unlock: 'codex_necrogenesis_gate' }
        });
    } catch (_) { /* never throw */ }
})();
