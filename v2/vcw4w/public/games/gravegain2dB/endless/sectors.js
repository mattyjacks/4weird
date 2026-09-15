/* GraveGain2dB Endless - sectors (progression 1-8+, boss schedule, elite director).
   Global surface: window.GraveGain2dBEndlessSectors only. */
(function () {
    'use strict';

    var KEY = 'GraveGain2dBEndlessSectors';

    var SECTORS = [
        { sector: 1, name: 'Crater Fields', palette: 'dust-amber', enemyHpMult: 1.0, enemyCountMult: 1.0, boss: null, eliteDirector: false, note: 'Onboarding rooms. Generous checkpoints.' },
        { sector: 2, name: 'Hollow Grove', palette: 'grove-green', enemyHpMult: 1.0, enemyCountMult: 1.05, boss: null, eliteDirector: false, note: 'Living bridges introduced.' },
        { sector: 3, name: 'Deep Vault', palette: 'shaft-ochre', enemyHpMult: 1.0, enemyCountMult: 1.1, boss: 'pit-foreman', eliteDirector: false, note: 'BOSS sector: Pit Foreman at room 3 end.' },
        { sector: 4, name: 'Ember Outpost', palette: 'ember-rust', enemyHpMult: 1.0, enemyCountMult: 1.15, boss: null, eliteDirector: false, note: 'Fire lanes. Controlled burns required.' },
        { sector: 5, name: 'Flooded Shallows', palette: 'flood-teal', enemyHpMult: 1.0, enemyCountMult: 1.2, boss: null, eliteDirector: false, note: 'Sequenced bells under pressure.' },
        { sector: 6, name: 'Sunken Catacombs', palette: 'crypt-violet', enemyHpMult: 1.0, enemyCountMult: 1.2, boss: null, eliteDirector: true, note: 'ELITE DIRECTOR online: rotating affix per room (fast, shielded, splitting - never raw HP).' },
        { sector: 7, name: 'Star Observatory', palette: 'star-indigo', enemyHpMult: 1.0, enemyCountMult: 1.25, boss: 'mirror-spotter', eliteDirector: true, note: 'BOSS sector: Mirror Spotter. Director stays on.' },
        { sector: 8, name: 'MoonRock Sanctum', palette: 'core-crimson', enemyHpMult: 1.0, enemyCountMult: 1.3, boss: null, eliteDirector: true, note: 'Collapse-run rooms. Loop seed past sector 8.' }
    ];

    var LOOP = {
        rule: 'Past sector 8, rooms loop from the sector-8 pool with +0.05 count scaling per loop and a fresh elite affix. Enemy HP is NEVER scaled - pressure comes from density, affixes, and collapse timers.',
        bossEvery: 4,
        bossPool: ['pit-foreman', 'mirror-spotter', 'necro-herald-echo']
    };

    var ELITE_DIRECTOR = {
        startsAtSector: 6,
        affixes: ['fast', 'shielded', 'splitting', 'volley-caller'],
        rule: 'One affix per room, announced at entry. Affixes change behavior/timing, never HP pools.'
    };

    var api = {
        sectors: SECTORS,
        loop: LOOP,
        eliteDirector: ELITE_DIRECTOR,
        getSector: function (n) {
            for (var i = 0; i < SECTORS.length; i++) {
                if (SECTORS[i].sector === n) return SECTORS[i];
            }
            return null;
        },
        bossSectors: function () {
            return [3, 7];
        }
    };

    try {
        if (typeof window !== 'undefined') window[KEY] = api;
        else if (typeof globalThis !== 'undefined') globalThis[KEY] = api;
    } catch (_) {}
    try {
        if (typeof module !== 'undefined' && module.exports) module.exports = api;
    } catch (_) {}
})();
