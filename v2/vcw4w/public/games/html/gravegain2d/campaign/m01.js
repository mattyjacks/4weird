(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(1, {
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Dropship 420 is down in Sector Alpha. Fifteen freshly-risen hostiles converging on the crash site - crater-crawlers plus the memorial detail. Helmet seals LOCKED: MoonRock air kills in ninety seconds.', portrait: '🤖' },
            { speaker: 'Private Lisa Park', text: 'I carried James Wright’s coffin three days ago - the first grave we ever dug here. Now his visor glows red. We put our people back to rest. All fifteen of them.', portrait: '👩‍🚀' },
            { speaker: 'Arty Fisher', text: 'Rifles OFF stun - stun does not work on the dead, I watched the guard tapes. Aim for the structural joints and the skeletons come apart like cheap scaffolding.', portrait: '👨‍🔧' },
            { speaker: 'Valley Net', text: 'Tutorial protocol: move, aim, fire - the crater field is deliberately thin. Fifteen hostiles, no elites, no warden. Learn the rhythm here, soldier, because MoonRock only gets harder.', portrait: '🤖' },
            { speaker: 'Private Lisa Park', text: 'For James. For every letter that will never make it home. Sweep and clear - starting now.', portrait: '👩‍🚀' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'LZ secured. Fifteen hostiles neutralized, zero array signatures in the sector. Survivors falling back to the perimeter - excellent shooting, soldier.', portrait: '🤖' },
            { speaker: 'Private Lisa Park', text: 'Rest now, James. We carried you here, and we will carry you home.', portrait: '👩‍🚀' }
        ],
        briefing: 'Colony LZ Sector Alpha is overrun in the first hours after the NecroGenesis: the memorial-garden dead - including James Wright, the first colonist ever buried on MoonRock - have risen with red eyes alongside skeletons crawling from the impact craters. Sweep the crash site and put all 15 hostiles back to rest; rifles off stun, aim for the joints, and keep your helmet sealed.',
        threat: '15 freshly-risen at the crash site',
        bossDisplay: { name: 'GOBLIN ZED LEADER', banner: '⚔️ WARDEN: GOBLIN ZED LEADER ⚔️' },
        loreUnlocks: ['world_first_grave', 'necro_survivor', 'human_orientation'],
        parSeconds: 360,
        requisition: { bonusHp: 15, dmgMult: 1.05 },
        bossHpMult: 0.8,
        secondaryObjective: { id: 'tutorial_flawless', desc: 'Clear the LZ without dying', count: 1 },
        introTitlecard: { title: 'MISSION 1 - LZ CRASH SITE DEFENSE', subtitle: 'The Descent on MoonRock' },
        minimapTheme: '#4dd0e1',
        enemyDensityMult: 0.7,
        eliteChance: 0.02
    });
})();
