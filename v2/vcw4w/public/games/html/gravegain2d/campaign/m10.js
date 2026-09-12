(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(10, {
        dialogueBefore: [
            { speaker: 'Dr. Lucifer Hades', text: 'Two hundred years of solitude taught me the truth, little soldier: death is a disease, not a destiny. My Array is the CURE — every corpse you call risen is a soul SAVED from oblivion.', portrait: '👑' },
            { speaker: 'Dr. Lucifer Hades', text: 'Kneel, and when your loved ones fall I will return them to you, refined, eternal, perfected. Stand against me, and you choose extinction for every race on this moon.', portrait: '👑' },
            { speaker: 'Private Lisa Park', text: 'You call it a cure — I have read your manifesto and buried what it made. Your nightmare ends here, Lucifer. For MoonRock! For Earth! FOR THE LIVING!', portrait: '👩‍🚀' },
            { speaker: 'President Angel Good', text: 'Every race stands in this chamber with you, soldier — elf, dwarf, orc, and human, by the Compact of Shared Blood. He took our dead. He does not take our living.', portrait: '🌿' },
            { speaker: 'Valley Net', text: 'Tactical final: the Overlord fights in PHASES — the Array shields him between staggers, and each phase wakes deadlier guardians. Break the shield, burn the conduits, and strike when he staggers.', portrait: '🤖' },
            { speaker: 'Guy Young', text: 'My grandfather sleeps because of you. Tonight every grave on MoonRock sleeps — or none of us do. End it.', portrait: '👨‍🚀' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Necromantic Array DEACTIVATED. Planetary signal terminated. MoonRock is SAVED!', portrait: '🤖' },
            { speaker: 'President Angel Good', text: 'You did it! The four races are free — humanity and MoonRock have a real future together!', portrait: '🌿' },
            { speaker: 'Guy Young', text: 'Somewhere, an old soldier finally rests. Thank you — for Clint, for all of them, for the living.', portrait: '👨‍🚀' }
        ],
        briefing: 'Descend into Lucifer Hades’ Sanctum Core, where the Consciousness Overlord has broadcast death-as-disease for two centuries from his Necromatic Array. Starting on floor 10, fight down to the warden floor, defeat Lucifer himself, and deactivate the Array to liberate MoonRock.',
        threat: 'Death itself wears a crown — end Lucifer Hades',
        bossDisplay: { name: 'LUCIFER HADES', banner: '⚠️ FINAL CONFRONTATION: LUCIFER HADES ⚠️' },
        loreUnlocks: ['lucifer_manifesto', 'lucifer_journal_47', 'human_earth_letter', 'gods_necros_speaks'],
        parSeconds: 900,
        requisition: { bonusHp: 150, dmgMult: 1.5 },
        bossHpMult: 1.6,
        secondaryObjective: { id: 'conduit_overload', desc: 'Overload 3 array conduits during phase transitions', count: 3 },
        introTitlecard: { title: 'MISSION 10 — LUCIFER’S SHADOW', subtitle: 'The Final Confrontation' },
        minimapTheme: '#c026d3',
        enemyDensityMult: 1.6,
        eliteChance: 0.18
    });
})();
