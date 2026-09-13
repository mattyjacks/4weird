/* GraveGain4D M10 - Final putt vs Ascendant Hades across both branes. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 10,
            title: 'M10 - The Final Putt',
            subtitle: 'Ascendant Hades Across Both Branes',
            wSlice: -9, timeFork: 'hades-final-fork',
            location: 'Sanctum Core (Both Branes)',
            par: 900, parSeconds: 900,
            difficulty: { hpMult: 2.1, dmgMult: 1.5, density: 1.4, eliteChance: 0.22 },
            objectives: [
                { id: 'slay_boss', desc: 'Defeat Ascendant Hades & Deactivate the NecroGenesis Array', count: 1 },
                { id: 'conduit_overload', desc: 'Overload 3 array conduits during phase transitions', count: 3 },
                { id: 'final_putt', desc: 'Sink the final putt: drive the MoonRock core through the rift into Hades', count: 1 }
            ],
            spawns: [
                { id: 'array-acolyte', count: 8, wave: 1 },
                { id: 'wail-choir', count: 5, wave: 1 },
                { id: 'ash-reaper', count: 5, wave: 2 },
                { id: 'furnace-hulk', count: 4, wave: 2 },
                { id: 'pulse-skull', count: 6, wave: 3 }
            ],
            boss: {
                id: 'boss-ascendant-hades-4d', name: 'ASCENDANT HADES (BOTH BRANES)',
                hpMult: 1.7,
                phases: [
                    { name: 'PHASE I - THE OVERLORD SCOFFS', adds: 2 },
                    { name: 'PHASE II - NECROS INTERVENES', adds: 4 },
                    { name: 'PHASE III - DEATH WEARS A CROWN', adds: 5 }
                ]
            },
            bossId: 'boss-ascendant-hades-4d',
            intro: [
                { speaker: 'Dr. Lucifer Hades', text: 'Two hundred years showed me truth: I tore the W-rift fleeing death, and now I AM the rift. Consciousness bound to undeath is ETERNAL!', portrait: '👑' },
                { speaker: 'Private Lisa Park', text: 'Your nightmare ends here, Lucifer. For MoonRock! For Earth! FOR THE LIVING!', portrait: '👩‍🚀' },
                { speaker: 'MERCENARY', text: 'Last dream, soldier: one putt, both branes. Swing the core straight through him.', portrait: '🌙' }
            ],
            outro: [
                { speaker: 'Valley Net', text: 'NecroGenesis Array DEACTIVATED on both branes. MoonRock is SAVED!', portrait: '👱🏻‍♀️' },
                { speaker: 'President Angel Good', text: 'To every race that bled: the compact holds. The graves are silent - now we build.', portrait: '🌿' },
                { speaker: 'Guy Young', text: 'Clint rests. We all rest. The living remember.', portrait: '👨‍🚀' }
            ],
            dialogueBefore: [
                { speaker: 'Dr. Lucifer Hades', text: 'Two hundred years showed me truth: I tore the W-rift fleeing death, and now I AM the rift. Consciousness bound to undeath is ETERNAL!', portrait: '👑' }
            ],
            dialogueAfter: [
                { speaker: 'Valley Net', text: 'NecroGenesis Array DEACTIVATED on both branes. MoonRock is SAVED!', portrait: '👱🏻‍♀️' }
            ],
            rewards: { killCredits: 5000, gold: 5000, uusd: 10000, unlock: 'codex_ascendant_fall' }
        });
    } catch (_) { /* never throw */ }
})();
