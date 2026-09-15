/* GraveGain2dB Campaign - m09 Ashen Gate (towers / platforms). */
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
        id: 'm09',
        title: 'M09 - Ashen Gate (Towers)',
        location: 'Ashen Gate',
        briefing: 'Twin gate towers carry the platform span. One tower is already ' +
            'burning - climb the live one, drop the span on the gate host, and hold.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Ashen Gate: east tower burns, west tower holds. Platforms are the only way over.' },
            { speaker: 'Arty Fisher', text: 'Spans drop where the pins go. Pull the right pins and the gate host eats a bridge.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Gate span dropped, host crushed. Way to the Sanctum is open.' }
        ],
        safeOpener: { summary: 'Gate staging trench. Platform-climb drill; zero hostiles below the wall.', bounds: { x: 0, y: 0, w: 300, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm09-trench', summary: 'Staging trench. Climb drill vs cinder-imps.', enemies: ['cinder-imp', 'risen-guard'], supportGroup: 'west-tower' },
            { id: 'm09-towers', summary: 'Twin towers. Platform run while the east tower burns.', enemies: ['risen-guard', 'gate-host'], supportGroup: 'gate-span' },
            { id: 'm09-span', summary: 'Gate span. Drop decision + pre-climax checkpoint.', enemies: ['gate-host', 'cinder-imp'], supportGroup: 'gate-span' },
            { id: 'm09-far', summary: 'Far parapet. Hold until the dust settles.', enemies: ['gate-host', 'ash-wraith'], supportGroup: 'parapet' }
        ],
        teachingMoment: { lesson: 'Planned collapse: the span is a weapon with a checklist - pins, call, clear. Supports warn the full lifecycle first.', trigger: 'first span-warning cycle', hint: 'Amber means move; red means it is already falling.' },
        optional: {
            rescue: { id: 'm09-tower-sentry', desc: 'Cut the sentry down from the burning east tower platform.', reward: 'codex + score bonus' },
            loot: { id: 'm09-gate-seal', desc: 'Recover the gate seal from the far parapet.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm09-span-checkpoint', desc: 'Pre-climax checkpoint on the west tower top.', heals: true },
        climax: { type: 'defense', objective: 'Hold the far parapet 60s after the span drop.', then: 'extraction', extraction: { id: 'm09-parapet-lift', desc: 'Descend the parapet lift.' } },
        codexUnlock: 'gate_towers_platforms',
        builds: { allowed: ['rifle-runner', 'shotgun-warden', 'arc-runner'], default: 'rifle-runner' },
        enemies: ['cinder-imp', 'risen-guard', 'gate-host', 'ash-wraith'],
        weapons: ['mk1-rifle', 'scattergun', 'arc-caster'],
        routes: {
            primary: { id: 'm09-primary', summary: 'Trench -> west tower climb -> span -> parapet hold.', waypoints: [{ x: 40, y: 140 }, { x: 300, y: 120 }, { x: 540, y: 110 }, { x: 740, y: 130 }] },
            shortcut: { id: 'm09-shortcut', summary: 'DESTRUCTIVE: early span drop onto the gate host - faster but forfeits the loot lane.', destructive: true, waypoints: [{ x: 300, y: 120 }, { x: 540, y: 160 }, { x: 740, y: 130 }] },
            fallback: { id: 'm09-fallback', summary: 'EMERGENCY: Valley Net breach ropes a ladder if the west tower stairs burn.', emergency: true, waypoints: [{ x: 300, y: 120 }, { x: 400, y: 300 }, { x: 740, y: 130 }] }
        },
        score: { parSeconds: 560, killPoints: 145, rescueBonus: 600, lootBonus: 350, noDeathBonus: 475, shortcutBonus: 225 },
        nightmare: { coordination: 'Span drop needs pin-team + call-team + clear-team synced; mistimed calls strand loot, HP unchanged.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm09-trench', bounds: { x: 0, y: 0, w: 300, h: 180 }, summary: 'Gate staging trench. Platform-climb drill; zero hostiles below the wall.' },
        objective: 'Hold the far parapet 60s after the span drop.',
        exit: { id: 'm09-parapet-lift', desc: 'Descend the parapet lift.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m09_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM09 = mission;
    } catch (_) {}
})();
