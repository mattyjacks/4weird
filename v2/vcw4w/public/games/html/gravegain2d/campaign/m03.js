(function() {
    'use strict';
    if (!window.GraveGainCampaign) return;
    window.GraveGainCampaign.registerMissionExtra(3, {
        dialogueBefore: [
            { speaker: 'Forgemaster Borin', text: 'Me ancestors’ Golem Hammer lies trapped in the lower forge channels, and sparkite veins thick enough to buy the mountain! Me axe is thirsty and me keg is full — TO THE VAULTS!', portrait: '⛏️' },
            { speaker: 'Valley Net', text: 'Caution: raw sparkite saturates the Deep Mines. Five power crystals required — pry them from the armored and elite remains guarding the channels.', portrait: '🤖' },
            { speaker: 'Private Lisa Park', text: 'Visors dimmed for Dwarven eyes — no flashbangs in the deep, no bright lights on our allies. We take the crystals, drop the Thane, and drink to it after.', portrait: '👩‍🚀' },
            { speaker: 'Forgemaster Borin', text: 'Armored, ye say? GOOD! Me hammer loves a hard shell! Flank the knees where the plate runs thin — then bring the Thane down and every flagon in Deep Forge is YOURS!', portrait: '⛏️' },
            { speaker: 'Arty Fisher', text: 'Dwarven gear outlasts every battery I ever wired — when the grid failed, their axes still swung. Stick with Borin down there; his engineering is six thousand years proven.', portrait: '👨‍🔧' }
        ],
        dialogueAfter: [
            { speaker: 'Forgemaster Borin', text: 'Ha! The mines are ours again! The Hammer sings, the forge roars — have a flagon on me, hero!', portrait: '⛏️' },
            { speaker: 'Private Lisa Park', text: 'Crystals secured, Thane destroyed. Deep Forge burns bright again — to Borin’s ancestors.', portrait: '👩‍🚀' }
        ],
        briefing: 'The Central Highlands Deep Mines — Dwarven domain since Durin Goldnose followed his sparkite vein down 6,247 years ago — are overrun, with the legendary Golem Hammer trapped in the lower forge channels. You breach on warden floor 3, where the Armored High Thane Zed already waits: pry 5 Sparkite Power Crystals from the armored and elite remains, then bring the Thane down.',
        threat: 'An armored Thane hoarding 5 sparkite crystals',
        bossDisplay: { name: 'ARMORED HIGH THANE ZED', banner: 'Warden of the Deep Forge' },
        loreUnlocks: ['dwarf_deep_forge', 'dwarf_mana_potions', 'dwarf_brewer_grave'],
        parSeconds: 480,
        requisition: { bonusHp: 45, dmgMult: 1.15 },
        bossHpMult: 0.95,
        secondaryObjective: { id: 'forge_cache', desc: 'Recover 2 bonus sparkite caches from side veins', count: 2 },
        introTitlecard: { title: 'MISSION 3 — DEEP IN THE DWARVEN VAULTS', subtitle: 'Sparkite & Steel' },
        minimapTheme: '#ffb300',
        enemyDensityMult: 0.95,
        eliteChance: 0.06
    });
})();
