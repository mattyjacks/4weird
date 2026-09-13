/* GraveGain4D M06 - President Good's Legacy. W-slice -5, catacombs. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 6,
            title: 'M06 - President Good’s Legacy',
            subtitle: 'The Alchemical Catacombs',
            wSlice: -5, timeFork: 'botany-poison-fork',
            location: 'Botany Core Sub-levels',
            par: 3, parSeconds: 660,
            difficulty: { hpMult: 1.5, dmgMult: 1.25, density: 1.15, eliteChance: 0.12 },
            objectives: [
                { id: 'slay_boss', desc: 'Destroy the Toxic Chem-Golem', count: 1 },
                { id: 'slay_elites', desc: 'Slay 8 Elite Armored Zeds', count: 8 },
                { id: 'purge_vats', desc: 'Purge 4 poisoned incubation vats (MERCENARY dream-map)', count: 4 }
            ],
            spawns: [
                { id: 'hyper_slime', count: 7, wave: 1 },
                { id: 'pentachoron_wraith', count: 4, wave: 1 },
                { id: 'marrow_skull_4d', count: 4, wave: 2 },
                { id: 'tesseract_golem', count: 2, wave: 3 }
            ],
            boss: { id: 'chem_titan_putt', name: 'TOXIC CHEM-GOLEM', hpMult: 1.35 },
            bossId: 'chem_titan_putt',
            intro: [
                { speaker: 'President Angel Good', text: 'Hades corrupted my botanical vats into toxic cloud weapons - in both slices. Neutralize the Chem-Golem!', portrait: '🌿' },
                { speaker: 'Private Lisa Park', text: 'Hazmat seals locked. Moving into the mist - dream-map active.', portrait: '👩‍🚀' },
                { speaker: 'MERCENARY', text: 'Dream of clean gardens, soldier: her unpoisoned vats overlay the toxic ones. Purge what differs.', portrait: '🌙' }
            ],
            outro: [
                { speaker: 'President Angel Good', text: 'The air clears in every slice. MoonRock breathes - the compact holds, KillCredits for the fallen gardeners.', portrait: '🌿' },
                { speaker: 'MERCENARY', text: 'One garden, one debt, paid. Now we steal time itself.', portrait: '🌙' }
            ],
            dialogueBefore: [
                { speaker: 'President Angel Good', text: 'Hades corrupted my botanical vats into toxic cloud weapons - in both slices. Neutralize the Chem-Golem!', portrait: '🌿' }
            ],
            dialogueAfter: [
                { speaker: 'President Angel Good', text: 'The air clears in every slice. MoonRock breathes - the compact holds, KillCredits for the fallen gardeners.', portrait: '🌿' }
            ],
            rewards: { killCredits: 1200, gold: 1200, uusd: 2500, unlock: 'codex_botany_core' }
        });
    } catch (_) { /* never throw */ }
})();
