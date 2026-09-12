(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(5, {
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Hades is jamming all sub-light frequencies from the array. Relay 09 below must be re-aligned by hand - fifteen flying skulls coil-guard the chamber, twenty-five hostiles total.', portrait: '🤖' },
            { speaker: 'Arty Fisher', text: 'I kept LuckyStarShip breathing for two hundred years and flagged Hades’ reactor drain every decade - nobody listened. Listen now: the skull swarms nest in the energy coils, and they dive the moment the capacitors hum.', portrait: '👨‍🔧' },
            { speaker: 'Private Lisa Park', text: 'Shotgun spread for the skulls, steady aim for the rest. For every letter that never made it home - we take the relay back.', portrait: '👩‍🚀' },
            { speaker: 'Valley Net', text: 'Breach on floor 5; the relay chamber sits on the warden floor one descent down - floor 6 - where the Corrupted Drone Array oversees the jamming. Destroy the skulls, clear the chamber, and I get our sky back.', portrait: '🤖' },
            { speaker: 'Arty Fisher', text: 'And when the uplink lights green, that is my voice you hear first - I will be singing the all-clear across every frequency Hades stole.', portrait: '👨‍🔧' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'UPLINK ONLINE! Relay 09 aligned - planetary sensors tracking Hades’ orbital movements. The sky is ours again.', portrait: '🤖' },
            { speaker: 'Arty Fisher', text: 'Signal is clean, coils are cold, and the skulls are scrap. Best repair shift of my life - you fly, I wire, we win.', portrait: '👨‍🔧' }
        ],
        briefing: 'Sub-surface Comms Relay 09 is the key to breaking Hades’ jamming broadcast: his signal drowns every sub-light frequency while skull swarms nest in the energy coils. Fight down from floor 5 to the warden chamber on floor 6, destroy the 15 flying skulls, and clear all 25 hostiles so Valley Net can re-align the uplink.',
        threat: '15 flying skulls coil-guarding Relay 09',
        bossDisplay: { name: 'CORRUPTED DRONE ARRAY', banner: '📡 WARDEN: CORRUPTED DRONE ARRAY 📡' },
        loreUnlocks: ['necro_broadcast', 'necro_report', 'human_arty_fisher'],
        parSeconds: 600,
        requisition: { bonusHp: 75, dmgMult: 1.25 },
        bossHpMult: 1.05,
        secondaryObjective: { id: 'skull_hunter', desc: 'Down 8 flying skulls before they dive', count: 8 },
        introTitlecard: { title: 'MISSION 5 - SIGNAL IN THE SHALLOWS', subtitle: 'Valley Net Uplink Restoration' },
        minimapTheme: '#22d3ee',
        enemyDensityMult: 1.0,
        eliteChance: 0.08
    });
})();
