/* GraveGain4D - codex4d.js. Codex unlock entries for the 4D campaign.
   Never throws. */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        var ENTRIES = [
            { id: 'luckystarship-hub', mission: 1, title: 'LuckyStarShip Hub', text: 'Orbital home of the compact. KillCredits bank here; Valley Net routes every w-slice feed through its dish.' },
            { id: 'codex_elven_grove', mission: 2, title: 'Elves of the Folded Grove', text: 'The elven race joins the compact. Queen Aelindra pledges root-chanters against the NecroGenesis.' },
            { id: 'codex_dwarven_vault', mission: 3, title: 'Dwarves of the Deep Vein', text: 'The dwarven race joins the compact. Forgemaster Borin’s Sparkite fuels LuckyStarShip kinetics.' },
            { id: 'codex_orc_wastes', mission: 4, title: 'Orcs of the Crimson Gate', text: 'The orc race joins the compact. Warchief Groknak’s blood-oath binds both slices.' },
            { id: 'codex_goblin_relay', mission: 5, title: 'Goblins of Relay 09', text: 'The goblin race joins the compact. Sappers turned signal-wards; all four races now stand as one.' },
            { id: 'codex_botany_core', mission: 6, title: 'President Good’s Garden', text: 'Botanist-president Angel Good’s vats bloom in every slice. MERCENARY dream-guidance mapped the purge.' },
            { id: 'codex_day1_heist', mission: 7, title: 'Day 1 Colony Alpha Heist', text: 'Rift-beacons planted on landing day. Guy Young carries Clint Oldman’s sidearm across timelines.' },
            { id: 'codex_mercenary_doctrine', mission: 8, title: 'The MERCENARY Doctrine', text: 'Dream-guidance as doctrine: paint where echo overlaps flesh. LuckyStarShip strike proved it.' },
            { id: 'codex_necrogenesis_gate', mission: 9, title: 'Gate of the NecroGenesis', text: 'Lucifer Hades tore the W-rift fleeing death and hid the Array inside it. The Titan fell; both branes lie open.' },
            { id: 'codex_ascendant_fall', mission: 10, title: 'Fall of Ascendant Hades', text: 'Final putt sunk across both branes. NecroGenesis cold, MoonRock saved, graves silent. KillCredits eternal.' }
        ];
        function get(id) {
            try {
                for (var i = 0; i < ENTRIES.length; i++) {
                    if (ENTRIES[i].id === id) return ENTRIES[i];
                }
                return null;
            } catch (_) { return null; }
        }
        window.GG4D_CampaignCodex = {
            VERSION: 'gg4d-codex-1.0.0',
            ENTRIES: ENTRIES,
            get: get,
            forMission: function (missionId) {
                try {
                    var out = [];
                    for (var i = 0; i < ENTRIES.length; i++) {
                        if (Number(ENTRIES[i].mission) === Number(missionId)) out.push(ENTRIES[i]);
                    }
                    return out;
                } catch (_) { return []; }
            }
        };
    } catch (_) { /* never throw */ }
})();
