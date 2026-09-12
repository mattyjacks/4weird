(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(8, {
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'LuckyStarShip stands by for a kinetic orbital strike, but targeting must be painted by hand from the Highland Peak Observatory. No laser, no fire from the sky.', portrait: '🤖' },
            { speaker: 'Warchief Groknak', text: 'Thirty-five of the horde swarm the peak, and a Bone Goliath Warlord leads them! Bring down the sky-fire, human - burn them to ASHES!', portrait: '👹' },
            { speaker: 'Private Lisa Park', text: 'Then we hold the observatory together. I will carve through the horde, slay the Warlord, and light the beacon myself.', portrait: '👩‍🚀' },
            { speaker: 'Forgemaster Borin', text: 'Me kin cut these vaults six millennia back - every arch and anchor stone I know by heart! Hold the high gallery, keep the laser steady, and let the sky do the hammering!', portrait: '⛏️' },
            { speaker: 'Valley Net', text: 'You enter on floor 8 - fight down to the warden floor where the Warlord nests, then hold the designator on target until the strike confirms.', portrait: '🤖' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Kinetic strike confirmed! Eighty percent of Hades’ perimeter forces obliterated - the sky-fire has broken the horde.', portrait: '🤖' },
            { speaker: 'Warchief Groknak', text: 'THE SKY BURNED WHERE YOU POINTED! Groknak saw it! The peak remembers - and so do the horde’s ashes!', portrait: '👹' }
        ],
        briefing: 'Climb to the Highland Peak Observatory deep in the dwarven vaults, where MERCENARY doctrine calls for orbital fire to break the siege. Starting on floor 8, fight down to the warden floor, slay the Bone Goliath Warlord and 35 horde assault units, and paint the target for LuckyStarShip.',
        threat: 'Paint the peak for orbital fire - slay the Bone Goliath Warlord',
        bossDisplay: { name: 'BONE GOLIATH WARLORD', banner: '🛰️ WARDEN: BONE GOLIATH WARLORD 🛰️' },
        loreUnlocks: ['human_mercenary_doctrine', 'gods_mercenary', 'dwarf_paladin_oath'],
        parSeconds: 780,
        requisition: { bonusHp: 120, dmgMult: 1.4 },
        bossHpMult: 1.35,
        secondaryObjective: { id: 'laser_designation', desc: 'Complete 3 laser designations on priority targets', count: 3 },
        introTitlecard: { title: 'MISSION 8 - ORBITAL STRIKE CALIBRATION', subtitle: 'The MERCENARY Doctrine' },
        minimapTheme: '#fb923c',
        enemyDensityMult: 1.35,
        eliteChance: 0.14
    });
})();
