/* GraveGain4D M03 - Sparkite & Steel Below. W-slice -2, dwarves. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 3,
            title: 'M03 - Sparkite & Steel Below',
            subtitle: 'Deep in the Dwarven Vaults',
            wSlice: -2, timeFork: 'sparkite-vein-fork',
            location: 'Central Highlands Deep Mines',
            par: 4, parSeconds: 480,
            difficulty: { hpMult: 1.2, dmgMult: 1.1, density: 0.9, eliteChance: 0.06 },
            objectives: [
                { id: 'collect_ore', desc: 'Recover 5 Sparkite Power Crystals (both slices)', count: 5 },
                { id: 'slay_boss', desc: 'Defeat the Armored High Thane Zed', count: 1 },
                { id: 'hold_forge', desc: 'Hold the lower forge channel for the LuckyStarShip uplink', count: 1 }
            ],
            spawns: [
                { id: 'rift_qubit_bat', count: 6, wave: 1 },
                { id: 'tesseract_golem', count: 4, wave: 1 },
                { id: 'tesseract_golem', count: 3, wave: 2 },
                { id: 'rift_qubit_bat', count: 5, wave: 2 }
            ],
            boss: { id: 'thane_slain_king', name: 'DWARVEN ZED HIGH THANE', hpMult: 1.1 },
            bossId: 'thane_slain_king',
            intro: [
                { speaker: 'Forgemaster Borin', text: 'Our lower forge is overrun in every w-slice! My ancestor’s Golem Hammer lies trapped below - and Hades drinks the Sparkite!', portrait: '⛏️' },
                { speaker: 'Valley Net', text: 'Sparkite concentrations spiking across slices. The NecroGenesis Array is feeding on the veins.', portrait: '👱🏻‍♀️' },
                { speaker: 'MERCENARY', text: 'Dream of stone, soldier: the echo vein glows where the Hammer fell. Dig the echo first.', portrait: '🌙' }
            ],
            outro: [
                { speaker: 'Forgemaster Borin', text: 'Ha! The mines are ours again - in ALL slices! Ale for the whole LuckyStarShip crew!', portrait: '⛏️' },
                { speaker: 'Valley Net', text: 'KillCredits banked. Dwarven steel joins the compact.', portrait: '👱🏻‍♀️' }
            ],
            dialogueBefore: [
                { speaker: 'Forgemaster Borin', text: 'Our lower forge is overrun in every w-slice! My ancestor’s Golem Hammer lies trapped below - and Hades drinks the Sparkite!', portrait: '⛏️' }
            ],
            dialogueAfter: [
                { speaker: 'Forgemaster Borin', text: 'Ha! The mines are ours again - in ALL slices! Ale for the whole LuckyStarShip crew!', portrait: '⛏️' }
            ],
            rewards: { killCredits: 500, gold: 500, uusd: 1200, unlock: 'codex_dwarven_vault' }
        });
    } catch (_) { /* never throw */ }
})();
