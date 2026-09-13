/* GraveGain4D M02 - Echoes of the Green Chronicle. W-slice -1, elves. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 2,
            title: 'M02 - Echoes of the Green Chronicle',
            subtitle: 'The Elven Groves Fold',
            wSlice: -1, timeFork: 'green-chronicle-echo',
            location: 'Bioluminescent Forest Vaults',
            par: 420, parSeconds: 420,
            difficulty: { hpMult: 1.1, dmgMult: 1.05, density: 0.8, eliteChance: 0.04 },
            objectives: [
                { id: 'slay_boss', desc: 'Defeat the Corrupted Elven Necromancer across both slices', count: 1 },
                { id: 'slay_minions', desc: 'Slay 20 undead grove corruptors', count: 20 },
                { id: 'free_seers', desc: 'Free 3 fallen elven seers (MERCENARY dream-guidance)', count: 3 }
            ],
            spawns: [
                { id: 'thorn-revenant', count: 8, wave: 1 },
                { id: 'root-chanter', count: 5, wave: 1 },
                { id: 'moonmoth-swarm', count: 4, wave: 2 },
                { id: 'gallow-bloom', count: 3, wave: 2 }
            ],
            boss: { id: 'boss-elven-necromancer-4d', name: 'CORRUPTED ELVEN NECROMANCER', hpMult: 1.0 },
            bossId: 'boss-elven-necromancer-4d',
            intro: [
                { speaker: 'Queen Aelindra', text: 'The Mother Tree bleeds in two slices at once. Our fallen seers walk again, bound to the NecroGenesis Array.', portrait: '🧝‍♀️' },
                { speaker: 'MERCENARY', text: 'Dream with me, child of the groves: the anchors exist in w-minus-one. Cut them where the roots remember.', portrait: '🌙' },
                { speaker: 'Private Lisa Park', text: 'We will destroy the anchors and free your ancestors - in every slice.', portrait: '👩‍🚀' }
            ],
            outro: [
                { speaker: 'Queen Aelindra', text: 'The forest whispers gratitude. The elves stand with the LuckyStarShip compact - KillCredits shared.', portrait: '🧝‍♀️' },
                { speaker: 'MERCENARY', text: 'The dream holds. Deeper, soldier - the dwarves call from below.', portrait: '🌙' }
            ],
            dialogueBefore: [
                { speaker: 'Queen Aelindra', text: 'The Mother Tree bleeds in two slices at once. Our fallen seers walk again, bound to the NecroGenesis Array.', portrait: '🧝‍♀️' }
            ],
            dialogueAfter: [
                { speaker: 'Queen Aelindra', text: 'The forest whispers gratitude. The elves stand with the LuckyStarShip compact - KillCredits shared.', portrait: '🧝‍♀️' }
            ],
            rewards: { killCredits: 350, gold: 350, uusd: 800, unlock: 'codex_elven_grove' }
        });
    } catch (_) { /* never throw */ }
})();
