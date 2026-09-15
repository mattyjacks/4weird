/* GraveGain2dB Campaign - m05 Flooded Shallows (shafts / bells). */
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
        id: 'm05',
        title: 'M05 - Flooded Shallows (Bell Shafts)',
        location: 'Flooded Shallows',
        briefing: 'Bell-shafts ring the shallows and mark safe water. Ring the bells to ' +
            'raise the causeway, mind the shafts - deep water is death.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Shallows are flooded. Bells raise the causeway. Shafts are marked - stay on the bells line.' },
            { speaker: 'Arty Fisher', text: 'Water eats boots and bullets. Keep moving, keep ringing.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Causeway raised. Shallows crossing is open.' }
        ],
        safeOpener: { summary: 'Dry jetty. Bell-rope drill with zero hostiles.', bounds: { x: 0, y: 0, w: 280, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm05-jetty', summary: 'Jetty line. First bell + drowner drill.', enemies: ['drowner', 'mire-crab'], supportGroup: 'bell-frame-west' },
            { id: 'm05-causeway', summary: 'Sunken causeway. Ring bells in order while covered.', enemies: ['mire-crab', 'fog-lurker'], supportGroup: 'bell-frame-east' },
            { id: 'm05-shaft', summary: 'Deep shaft overlook. Pre-climax checkpoint at the last bell.', enemies: ['fog-lurker', 'drowner'], supportGroup: 'shaft-grate' }
        ],
        teachingMoment: { lesson: 'Sequenced supports: bells must ring in order; wrong order drops the causeway a level.', trigger: 'first wrong-order bell', hint: 'Follow the lit buoys: west, middle, east.' },
        optional: {
            rescue: { id: 'm05-stranded-pair', desc: 'Pole the stranded pair off the sandbar before the tide turns.', reward: 'codex + score bonus' },
            loot: { id: 'm05-ship-bell', desc: 'Dive the wreck for the brass ship bell.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm05-last-bell-checkpoint', desc: 'Pre-climax checkpoint at the east bell.', heals: true },
        climax: { type: 'extraction', objective: 'Timed causeway run: reach the far jetty before the tide drops it.', extraction: { id: 'm05-far-jetty', desc: 'Extract at the far jetty horn.' } },
        codexUnlock: 'shallows_bell_shafts',
        builds: { allowed: ['rifle-runner', 'arc-runner'], default: 'rifle-runner' },
        enemies: ['drowner', 'mire-crab', 'fog-lurker'],
        weapons: ['mk1-rifle', 'arc-caster'],
        routes: {
            primary: { id: 'm05-primary', summary: 'Jetty -> bells in order -> causeway -> far jetty.', waypoints: [{ x: 40, y: 140 }, { x: 320, y: 160 }, { x: 560, y: 150 }, { x: 760, y: 140 }] },
            shortcut: { id: 'm05-shortcut', summary: 'PRECISION: collapse the west bell-frame onto the sandbar to make a dry ramp (skips one bell).', destructive: true, waypoints: [{ x: 320, y: 160 }, { x: 480, y: 200 }, { x: 760, y: 140 }] },
            fallback: { id: 'm05-fallback', summary: 'EMERGENCY: Valley Net breach floats a pontoon if the causeway drops mid-run.', emergency: true, waypoints: [{ x: 320, y: 160 }, { x: 440, y: 300 }, { x: 760, y: 140 }] }
        },
        score: { parSeconds: 480, killPoints: 125, rescueBonus: 550, lootBonus: 300, noDeathBonus: 425, shortcutBonus: 200 },
        nightmare: { coordination: 'Bells need two ringers in rhythm; solo timing cannot hold all three - bring a partner, same enemy HP.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm05-jetty', bounds: { x: 0, y: 0, w: 280, h: 180 }, summary: 'Dry jetty. Bell-rope drill with zero hostiles.' },
        objective: 'Timed causeway run: reach the far jetty before the tide drops it.',
        exit: { id: 'm05-far-jetty', desc: 'Extract at the far jetty horn.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m05_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM05 = mission;
    } catch (_) {}
})();
