(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(9, {
        dialogueBefore: [
            { speaker: 'Queen Aelindra', text: 'This is it - the threshold of Hades’ inner sanctum. Elf, dwarf, orc, and human: all four races stand behind you at the Citadel Perimeter.', portrait: '🧝‍♀️' },
            { speaker: 'Forgemaster Borin', text: 'We smashed through their outer gates at grievous cost! Forty elite guardians and a Necro-Array Titan hold the breach - leave NONE standing!', portrait: '⛏️' },
            { speaker: 'Warchief Groknak', text: 'My tribe has eaten, sung, and sharpened steel! Orcs do not die sitting down - TODAY WE MARCH THROUGH THE GATE!', portrait: '👹' },
            { speaker: 'Valley Net', text: 'Floor 9 is a warden floor - the Titan waits where you land. Break its elite guard in waves, bring the Titan down, and the doors to Lucifer Hades’ chamber unlock.', portrait: '🤖' },
            { speaker: 'Private Lisa Park', text: 'For the Compact of Shared Blood - every race, every grave, every letter home. Through the gate. Tonight we end the perimeter.', portrait: '👩‍🚀' },
            { speaker: 'Dr. Lucifer Hades', text: 'Come, little soldier. My Titan has unmade armies. Your four races will make such BEAUTIFUL additions to my Array.', portrait: '👑' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Perimeter breach successful. The Array’s outer shell is down - the doors to Lucifer Hades’ chamber stand open. MoonRock’s liberation is one strike away.', portrait: '🤖' },
            { speaker: 'President Angel Good', text: 'You carried all four races through that gate, soldier. Rest, rearm - and finish what the Compact of Shared Blood began.', portrait: '🌿' },
            { speaker: 'Guy Young', text: 'My grandfather’s tomb taught me what peace costs. You just paid it for all of us. End it - for Clint, for every grave.', portrait: '👨‍🚀' }
        ],
        briefing: 'Storm the Citadel Perimeter, the threshold of Hades’ inner sanctum sealed by the Compact of Shared Blood. Landing directly on warden floor 9, destroy the Necro-Array Titan and eliminate 40 elite citadel guardians to breach the sanctum doors.',
        threat: 'All four races at the gate - shatter the Necro-Array Titan',
        bossDisplay: { name: 'NECRO-ARRAY TITAN', banner: '⚔️ WARDEN: NECRO-ARRAY TITAN ⚔️' },
        loreUnlocks: ['human_treaty', 'necro_understanding', 'undead_field_guide'],
        parSeconds: 840,
        requisition: { bonusHp: 135, dmgMult: 1.45 },
        bossHpMult: 1.45,
        bossPhases: [
            { name: 'PHASE I - ARRAY AWAKENS', hpMult: 1.0, adds: 2 },
            { name: 'PHASE II - SHIELD OF THE DEAD', hpMult: 1.0, adds: 3 },
            { name: 'PHASE III - TITAN’S WRATH', hpMult: 1.0, adds: 4 }
        ],
        secondaryObjective: { id: 'gauntlet_waves', desc: 'Survive 3 citadel gauntlet waves before the Titan', count: 3 },
        introTitlecard: { title: 'MISSION 9 - GATE OF THE NECROGENESIS', subtitle: 'The Breach of the Array' },
        minimapTheme: '#f43f5e',
        enemyDensityMult: 1.5,
        eliteChance: 0.16
    });
})();
