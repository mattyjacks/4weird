/* GraveGain4D M04 - Rage of the Southern Wastes. W-slice -3, orcs. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 4,
            title: 'M04 - Rage of the Southern Wastes',
            subtitle: 'Orc Nomad Outpost Siege',
            wSlice: -3, timeFork: 'groknak-blood-fork',
            location: 'Crimson Sand Redoubts',
            par: 5, parSeconds: 540,
            difficulty: { hpMult: 1.3, dmgMult: 1.15, density: 1.0, eliteChance: 0.08 },
            objectives: [
                { id: 'survive_waves', desc: 'Defeat 30 Orc and Goblin Zeds across the gate siege', count: 30 },
                { id: 'slay_boss', desc: 'Slay the Huge Orc Zed Berserker', count: 1 },
                { id: 'stand_groknak', desc: 'Stand with Warchief Groknak in both slices', count: 1 }
            ],
            spawns: [
                { id: 'hex_cultist_4d', count: 4, wave: 1 },
                { id: 'pentachoron_wraith', count: 4, wave: 1 },
                { id: 'grave_husk_4d', count: 6, wave: 2 },
                { id: 'hex_cultist_4d', count: 3, wave: 3 }
            ],
            boss: { id: 'wastes_warlord_groknak', name: 'HUGE ORC ZED BERSERKER', hpMult: 1.2 },
            bossId: 'wastes_warlord_groknak',
            intro: [
                { speaker: 'Warchief Groknak', text: 'Weak dead-things swarm our gates in TWO worlds! Orcs do not die sitting down! TO WAR!', portrait: '👹' },
                { speaker: 'MERCENARY', text: 'Dream-rage, soldier: Groknak’s risen blood answers his living rage across the rift. Stand with both Groknaks.', portrait: '🌙' },
                { speaker: 'Private Lisa Park', text: 'Hold the line until the LuckyStarShip artillery locks - both slices, one line!', portrait: '👩‍🚀' }
            ],
            outro: [
                { speaker: 'Warchief Groknak', text: 'GRAAAH! Good fighting! You hit like an Orc - the horde pays KillCredits in skulls!', portrait: '👹' },
                { speaker: 'Valley Net', text: 'Gates merged into one timeline. Orcs sign the compact.', portrait: '👱🏻‍♀️' }
            ],
            dialogueBefore: [
                { speaker: 'Warchief Groknak', text: 'Weak dead-things swarm our gates in TWO worlds! Orcs do not die sitting down! TO WAR!', portrait: '👹' }
            ],
            dialogueAfter: [
                { speaker: 'Warchief Groknak', text: 'GRAAAH! Good fighting! You hit like an Orc - the horde pays KillCredits in skulls!', portrait: '👹' }
            ],
            rewards: { killCredits: 700, gold: 700, uusd: 1600, unlock: 'codex_orc_wastes' }
        });
    } catch (_) { /* never throw */ }
})();
