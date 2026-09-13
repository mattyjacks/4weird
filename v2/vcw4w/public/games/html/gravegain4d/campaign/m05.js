/* GraveGain4D M05 - Signal in the Shallows. W-slice -4, goblins + relay. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 5,
            title: 'M05 - Signal in the Shallows',
            subtitle: 'Valley Net Uplink Restoration',
            wSlice: -4, timeFork: 'relay-jam-fork',
            location: 'Sub-surface Comms Relay 09',
            par: 600, parSeconds: 600,
            difficulty: { hpMult: 1.4, dmgMult: 1.2, density: 1.1, eliteChance: 0.1 },
            objectives: [
                { id: 'slay_skulls', desc: 'Destroy 15 Flying Skulls guarding the relay', count: 15 },
                { id: 'slay_all', desc: 'Clear all 25 hostiles in the relay chamber', count: 25 },
                { id: 'align_dish', desc: 'Align the echo dish to blind Lucifer Hades’ jamming', count: 1 }
            ],
            spawns: [
                { id: 'pulse-skull', count: 8, wave: 1 },
                { id: 'howl-anchor', count: 4, wave: 1 },
                { id: 'hex-crow', count: 6, wave: 2 },
                { id: 'array-acolyte', count: 4, wave: 2 }
            ],
            boss: { id: 'boss-drone-array-4d', name: 'CORRUPTED DRONE ARRAY', hpMult: 1.25 },
            bossId: 'boss-drone-array-4d',
            intro: [
                { speaker: 'Valley Net', text: 'Lucifer Hades is jamming all sub-light frequencies from inside the rift. Re-align Relay 09 by hand - both slices.', portrait: '👱🏻‍♀️' },
                { speaker: 'Arty Fisher', text: 'Skull swarms nesting in the coils - and goblin sappers chewing the cables in the echo slice!', portrait: '👨‍🔧' },
                { speaker: 'MERCENARY', text: 'Dream-signal: the clean relay shines one fold over. Tune the echo dish and the jamming dies.', portrait: '🌙' }
            ],
            outro: [
                { speaker: 'Valley Net', text: 'Uplink online across slices! LuckyStarShip sensors track Hades’ orbital drift through the rift.', portrait: '👱🏻‍♀️' },
                { speaker: 'Arty Fisher', text: 'Goblin sappers fried. The goblins swear the compact - KillCredits for every coil!', portrait: '👨‍🔧' }
            ],
            dialogueBefore: [
                { speaker: 'Valley Net', text: 'Lucifer Hades is jamming all sub-light frequencies from inside the rift. Re-align Relay 09 by hand - both slices.', portrait: '👱🏻‍♀️' }
            ],
            dialogueAfter: [
                { speaker: 'Valley Net', text: 'Uplink online across slices! LuckyStarShip sensors track Hades’ orbital drift through the rift.', portrait: '👱🏻‍♀️' }
            ],
            rewards: { killCredits: 900, gold: 900, uusd: 2000, unlock: 'codex_goblin_relay' }
        });
    } catch (_) { /* never throw */ }
})();
