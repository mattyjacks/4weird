(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(10, {
        dialogueBefore: [
            { speaker: 'Dr. Lucifer Hades', text: 'Two hundred years of solitude taught me the truth, little soldier: death is a disease, not a destiny. My Array is the CURE - kneel, and I will return your dead to you, refined, eternal, perfected.', portrait: '👑' },
            { speaker: 'Private Lisa Park', text: 'You call it a cure - I have buried what it made. Your nightmare ends here, Lucifer. For MoonRock! For Earth! FOR THE LIVING!', portrait: '👩‍🚀' },
            { speaker: 'Queen Aelindra', text: 'The Groves bled corruption for your vanity, Lucifer. Elf-kind stands in this chamber - and we do not kneel to grave-robbers.', portrait: '🧝‍♀️' },
            { speaker: 'Forgemaster Borin', text: 'Ye stole our dead and our deep roads both! Dwarf-kind holds the line beside this soldier - bring yer Overlord, we’ve hammers enough!', portrait: '⛏️' },
            { speaker: 'Warchief Groknak', text: 'Orcs do not die sitting down - and we do not kneel standing up! Come down from yer throne of bones, dead-man!', portrait: '👹' },
            { speaker: 'Valley Net', text: 'Tactical final: the Overlord fights in PHASES - the Array shields him between staggers, and each phase wakes deadlier guardians. Break the shield, burn the conduits, and strike when he staggers.', portrait: '👱🏻‍♀️' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Necromantic Array DEACTIVATED. Planetary signal terminated. MoonRock is SAVED!', portrait: '👱🏻‍♀️' },
            { speaker: 'President Angel Good', text: 'You did it! The four races are free - humanity and MoonRock have a real future together!', portrait: '🌿' },
            { speaker: 'Guy Young', text: 'Somewhere, an old soldier finally rests. Thank you - for Clint, for all of them, for the living.', portrait: '👨‍🚀' }
        ],
        briefing: 'Descend into Lucifer Hades’ Sanctum Core, where the Consciousness Overlord has broadcast death-as-disease for two centuries from his Necromatic Array. Starting on floor 10, fight down to the warden floor, defeat Lucifer himself, and deactivate the Array to liberate MoonRock.',
        threat: 'Death itself wears a crown - end Lucifer Hades',
        bossDisplay: { name: 'LUCIFER HADES', banner: '⚠️ FINAL CONFRONTATION: LUCIFER HADES ⚠️' },
        loreUnlocks: ['lucifer_manifesto', 'lucifer_journal_47', 'human_earth_letter', 'gods_necros_speaks'],
        parSeconds: 900,
        requisition: { bonusHp: 150, dmgMult: 1.5 },
        bossHpMult: 1.6,
        bossPhases: [
            { name: 'PHASE I - THE OVERLORD SCOFFS', hpMult: 1.0, adds: 2 },
            { name: 'PHASE II - NECROS INTERVENES', hpMult: 1.0, adds: 4 },
            { name: 'PHASE III - DEATH WEARS A CROWN', hpMult: 1.0, adds: 5 }
        ],
        secondaryObjective: { id: 'conduit_overload', desc: 'Overload 3 array conduits during phase transitions', count: 3 },
        introTitlecard: { title: 'MISSION 10 - LUCIFER’S SHADOW', subtitle: 'The Final Confrontation' },
        minimapTheme: '#c026d3',
        enemyDensityMult: 1.6,
        eliteChance: 0.18
    });
})();
