(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(6, {
        dialogueBefore: [
            { speaker: 'President Angel Good', text: 'Hades seeded my Botany Core vats with necrotic algae - my life’s work turned into toxic cloud weaponry. The air down there burns the lungs. Keep your helmet sealed and do not breathe it.', portrait: '🌿' },
            { speaker: 'Private Lisa Park', text: 'Visor on hazmat mode. The Chem-Golem anchors the contamination on floor 6 with eight elite armored zeds around it. I will cut through all of them.', portrait: '👩‍🚀' },
            { speaker: 'Valley Net', text: 'Warning: toxic cloud density rising - the vents cannot be purged while the warden lives. Destroy the Chem-Golem first, then the purge sequence can run.', portrait: '👱🏻‍♀️' },
            { speaker: 'Arty Fisher', text: 'Purge rig is primed and waiting on your mark - but the seals only hold if the Golem stops smashing them. Keep the fight tight, keep the vents intact, and I will flush that poison into the dark.', portrait: '👨‍🔧' },
            { speaker: 'President Angel Good', text: 'I was a botanist before they made me President. What grows in the dark without light is not life - it is rot. Burn the rot out, soldier.', portrait: '🌿' }
        ],
        dialogueAfter: [
            { speaker: 'President Angel Good', text: 'The air is clearing. You walked into poison and brought back clean wind - the colony owes you a great debt.', portrait: '🌿' },
            { speaker: 'Valley Net', text: 'Toxicity falling across the sub-levels. Vents purged, vats sterilized. Botany Core breathes again.', portrait: '👱🏻‍♀️' }
        ],
        briefing: 'Descend into the Botany Core Sub-levels, where Hades corrupted President Good’s botanical incubation vats into toxic cloud weaponry. Starting on floor 6, the Toxic Chem-Golem waits with 8 elite armored zeds - destroy the warden and purge the vents.',
        threat: 'Toxic clouds choke the vats - slay the Chem-Golem and its armored guard',
        bossDisplay: { name: 'TOXIC CHEM-GOLEM', banner: '☠️ WARDEN: TOXIC CHEM-GOLEM ☠️' },
        loreUnlocks: ['necro_report', 'human_angel_good', 'undead_weakness'],
        parSeconds: 660,
        requisition: { bonusHp: 90, dmgMult: 1.3 },
        bossHpMult: 1.15,
        secondaryObjective: { id: 'vent_sealer', desc: 'Seal 4 ruptured toxic vents during the assault', count: 4 },
        introTitlecard: { title: 'MISSION 6 - THE ALCHEMICAL CATACOMBS', subtitle: 'President Good’s Legacy' },
        minimapTheme: '#a3e635',
        enemyDensityMult: 1.15,
        eliteChance: 0.10
    });
})();
