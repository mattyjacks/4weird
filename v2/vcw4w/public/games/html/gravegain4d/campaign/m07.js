/* GraveGain4D M07 - Time-heist into Day 1 Colony Alpha. W-slice -6 + time. */
(function () {
    'use strict';
    try {
        if (!window.GG4D_Campaign) return;
        window.GG4D_Campaign.register({
            id: 7,
            title: 'M07 - Day One Heist',
            subtitle: 'Time-Heist into Day 1 Colony Alpha',
            wSlice: -6, timeFork: 'day1-colony-alpha-heist',
            location: 'Colony Alpha - Landing Day (PAST)',
            par: 720, parSeconds: 720,
            difficulty: { hpMult: 1.6, dmgMult: 1.3, density: 1.2, eliteChance: 0.14 },
            objectives: [
                { id: 'plant_beacon', desc: 'Plant 3 rift-beacons on Day 1 without breaking cover', count: 3 },
                { id: 'slay_all', desc: 'Clear all 30 proto-NecroGenesis guardians (past + present)', count: 30 },
                { id: 'slay_boss', desc: 'Defeat Reanimated Patriarch Clint Prime', count: 1 }
            ],
            spawns: [
                { id: 'lantern-husk', count: 6, wave: 1 },
                { id: 'tithe-collector', count: 5, wave: 1 },
                { id: 'ballot-box-mimic', count: 4, wave: 2 },
                { id: 'memorial-warden', count: 4, wave: 2 },
                { id: 'array-acolyte', count: 4, wave: 3 }
            ],
            boss: { id: 'boss-clint-prime-4d', name: 'REANIMATED PATRIARCH CLINT PRIME', hpMult: 1.45 },
            bossId: 'boss-clint-prime-4d',
            intro: [
                { speaker: 'MERCENARY', text: 'Deep dream now: we ride the rift BACK to Day 1 Colony Alpha. Plant the beacons before Hades’ array ever wakes.', portrait: '🌙' },
                { speaker: 'Guy Young', text: 'That’s my grandfather’s landing day... Clint Oldman, first to die naturally on MoonRock. We walk beside ghosts.', portrait: '👨‍🚀' },
                { speaker: 'Valley Net', text: 'WARNING: paradox field active. What you plant in the past detonates in the present. Move quiet, strike loud.', portrait: '👱🏻‍♀️' }
            ],
            outro: [
                { speaker: 'Guy Young', text: 'Beacons set. Take his ancient service sidearm - it fires in every timeline now. He’s at rest... twice.', portrait: '👨‍🚀' },
                { speaker: 'MERCENARY', text: 'The heist holds. The past is wired - now we burn the future’s gate.', portrait: '🌙' }
            ],
            dialogueBefore: [
                { speaker: 'MERCENARY', text: 'Deep dream now: we ride the rift BACK to Day 1 Colony Alpha. Plant the beacons before Hades’ array ever wakes.', portrait: '🌙' }
            ],
            dialogueAfter: [
                { speaker: 'Guy Young', text: 'Beacons set. Take his ancient service sidearm - it fires in every timeline now. He’s at rest... twice.', portrait: '👨‍🚀' }
            ],
            rewards: { killCredits: 1600, gold: 1600, uusd: 3200, unlock: 'codex_day1_heist' }
        });
    } catch (_) { /* never throw */ }
})();
