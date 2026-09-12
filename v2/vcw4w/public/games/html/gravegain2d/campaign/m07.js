(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(7, {
        dialogueBefore: [
            { speaker: 'Guy Young', text: 'My grandfather Clint was the first to die naturally on MoonRock - five days on an alien world, and then peace. He earned his rest.', portrait: '👨‍🚀' },
            { speaker: 'Private Lisa Park', text: 'And the array stole it. Thirty tomb guardians pace the Crypt of Honor beside him, all red eyes where honor should be.', portrait: '👩‍🚀' },
            { speaker: 'Valley Net', text: 'Mission starts on floor 7 - the warden crypt lies deeper, on the floor divisible by 3. Fight down through the guardians and silence the reanimated patriarch.', portrait: '🤖' },
            { speaker: 'President Angel Good', text: 'I signed his burial honors myself. No leader should have to order a hero’s grave reopened - but no hero should have to walk as a weapon. Bring him peace.', portrait: '🌿' },
            { speaker: 'Guy Young', text: 'When he sleeps again - really sleeps - take his ancient service sidearm. It guarded a colony once. Let it guard you now.', portrait: '👨‍🚀' }
        ],
        dialogueAfter: [
            { speaker: 'Guy Young', text: 'He is at rest once more. Take his ancient service sidearm - and thank you for letting an old soldier sleep.', portrait: '👨‍🚀' },
            { speaker: 'Valley Net', text: 'Crypt silent. Zero array signatures in the Honor halls. Clint Oldman sleeps - the living remember, soldier.', portrait: '🤖' }
        ],
        briefing: 'Enter the Colonial Crypt of Honor, where Clint Oldman - the last natural death on MoonRock - was raised with thirty tomb guardians by the array. You start on floor 7, so fight down to the warden floor and defeat the Reanimated Patriarch Clint to lay him to rest.',
        threat: 'The honored dead walk - grant Clint Oldman his rest',
        bossDisplay: { name: 'REANIMATED PATRIARCH CLINT', banner: '🪦 WARDEN: PATRIARCH CLINT 🪦' },
        loreUnlocks: ['human_clint_oldman', 'human_guy_young', 'necro_gravestone'],
        parSeconds: 720,
        requisition: { bonusHp: 105, dmgMult: 1.35 },
        bossHpMult: 1.25,
        secondaryObjective: { id: 'memorial_lights', desc: 'Light 6 memorial beacons for the honored dead', count: 6 },
        introTitlecard: { title: 'MISSION 7 - THE TOMB OF CLINT OLDMAN', subtitle: 'Guy Young’s Paradox' },
        minimapTheme: '#a78bfa',
        enemyDensityMult: 1.2,
        eliteChance: 0.12
    });
})();
