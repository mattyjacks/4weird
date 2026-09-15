/* GraveGain2dB Campaign - m08 Star Observatory (pylons / bombardment). */
(function () {
    'use strict';
    function registry() {
        try {
            if (typeof window !== 'undefined' && window.GraveGain2dBCampaignRegistry) return window.GraveGain2dBCampaignRegistry;
            if (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBCampaignRegistry) return globalThis.GraveGain2dBCampaignRegistry;
        } catch (_) {}
        return null;
    }
    var mission = {
        id: 'm08',
        title: 'M08 - Star Observatory (Pylons)',
        location: 'Star Observatory',
        briefing: 'Pylons focus the orbital mirror - and the enemy bombardment knows it. ' +
            'Align the pylons between volleys, use the dome shadow, and silence the spotter.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Observatory bombardment is on a timer. Pylons align in the shadow windows.' },
            { speaker: 'Pvt. Lisa Park', text: 'We move on the whistle, we freeze on the flare. The dome keeps us alive.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Mirror aligned. Bombardment spotter is down.' }
        ],
        safeOpener: { summary: 'Dome shadow staging. Bombardment-timing drill; no hostiles under the dome.', bounds: { x: 0, y: 0, w: 300, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm08-dome', summary: 'Dome shadow. Timing drill vs star-ticks.', enemies: ['star-tick', 'risen-astrologer'], supportGroup: 'pylon-west' },
            { id: 'm08-pylons', summary: 'Pylon field. Align three pylons between volleys.', enemies: ['risen-astrologer', 'bombardier'], supportGroup: 'pylon-east' },
            { id: 'm08-mirror', summary: 'Mirror dais. Pre-climax checkpoint before the spotter fight.', enemies: ['bombardier', 'star-tick'], supportGroup: 'mirror-dais' }
        ],
        teachingMoment: { lesson: 'Timed cover: bombardment is telegraphed - pylons are supports that survive volleys, troops do not.', trigger: 'first bombardment warning survived', hint: 'Move on whistle, cover on flare.' },
        optional: {
            rescue: { id: 'm08-pinned-observer', desc: 'Pull the pinned observer from the pylon field between volleys.', reward: 'codex + score bonus' },
            loot: { id: 'm08-star-charts', desc: 'Recover the star charts from the dome desk.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm08-dais-checkpoint', desc: 'Pre-climax checkpoint on the mirror dais.', heals: true },
        climax: { type: 'boss', boss: { id: 'spotter-warden', name: 'Spotter Warden', role: 'Bombardment spotter calling volleys from the dais.' }, then: 'extraction', extraction: { id: 'm08-funicular', desc: 'Ride the funicular down in the last shadow window.' } },
        codexUnlock: 'observatory_pylons',
        builds: { allowed: ['rifle-runner', 'arc-runner', 'flame-warden'], default: 'arc-runner' },
        enemies: ['star-tick', 'risen-astrologer', 'bombardier'],
        weapons: ['mk1-rifle', 'arc-caster', 'incinerator'],
        routes: {
            primary: { id: 'm08-primary', summary: 'Dome -> pylon field aligns -> dais checkpoint -> spotter -> funicular.', waypoints: [{ x: 40, y: 120 }, { x: 330, y: 150 }, { x: 580, y: 140 }, { x: 740, y: 130 }] },
            shortcut: { id: 'm08-shortcut', summary: 'DESTRUCTIVE: topple the dead relay mast onto the bombardier nest, cross in the dust.', destructive: true, waypoints: [{ x: 330, y: 150 }, { x: 500, y: 190 }, { x: 740, y: 130 }] },
            fallback: { id: 'm08-fallback', summary: 'EMERGENCY: Valley Net breach holds one extra shadow window if a volley lands early.', emergency: true, waypoints: [{ x: 330, y: 150 }, { x: 420, y: 300 }, { x: 740, y: 130 }] }
        },
        score: { parSeconds: 540, killPoints: 140, rescueBonus: 600, lootBonus: 325, noDeathBonus: 450, shortcutBonus: 225 },
        nightmare: { coordination: 'Pylon align needs three hands at once; volley windows shrink, enemy HP unchanged.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm08-dome', bounds: { x: 0, y: 0, w: 300, h: 180 }, summary: 'Dome shadow staging. Bombardment-timing drill; no hostiles under the dome.' },
        objective: 'Defeat the Spotter Warden, then ride the funicular down in the last shadow window.',
        exit: { id: 'm08-funicular', desc: 'Ride the funicular down in the last shadow window.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m08_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM08 = mission;
    } catch (_) {}
})();
