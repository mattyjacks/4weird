/* GraveGain2dB Campaign - m04 Ember Outpost (ramps / fuel). */
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
        id: 'm04',
        title: 'M04 - Ember Outpost (Fuel Ramps)',
        location: 'Ember Outpost',
        briefing: 'Fuel bladders line the outpost ramps. Fire moves fast here - vent the ' +
            'bladders on purpose or the enemy will do it for you.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Outpost ramps are fuel-lined. Controlled burns beat wildfires.' },
            { speaker: 'Pvt. Lisa Park', text: 'We vent what we must, save what we can. Civilians first.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Outpost held. Fuel secured for the convoy push.' }
        ],
        safeOpener: { summary: 'Outpost gate. Sand-table drill: vent one drill bladder, no enemies.', bounds: { x: 0, y: 0, w: 300, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm04-gate', summary: 'Gate ramps. Fuel-vent drill vs ash-runners.', enemies: ['ash-runner', 'risen-trooper'], supportGroup: 'ramp-trestles' },
            { id: 'm04-depot', summary: 'Fuel depot. Chain-vent timing under pressure.', enemies: ['risen-trooper', 'pyre-bat'], supportGroup: 'depot-rack' }
        ],
        teachingMoment: { lesson: 'Fuel as a weapon: vented bladders burn lanes. Supports (trestles) survive fire; racks do not.', trigger: 'first controlled burn', hint: 'Burn downhill, stand uphill.' },
        optional: {
            rescue: { id: 'm04-depot-crew', desc: 'Drag the depot crew out before the racks go.', reward: 'codex + score bonus' },
            loot: { id: 'm04-fuel-cells', desc: 'Salvage sealed fuel cells from the depot.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm04-depot-checkpoint', desc: 'Pre-climax checkpoint outside the depot.', heals: true },
        climax: { type: 'defense', objective: 'Defend the fuel convoy 75s while it fuels on the ramp.', then: 'extraction', extraction: { id: 'm04-convoy-extract', desc: 'Roll out with the convoy.' } },
        codexUnlock: 'outpost_fuel_ramps',
        builds: { allowed: ['rifle-runner', 'flame-warden'], default: 'rifle-runner' },
        enemies: ['ash-runner', 'risen-trooper', 'pyre-bat'],
        weapons: ['mk1-rifle', 'incinerator'],
        routes: {
            primary: { id: 'm04-primary', summary: 'Gate -> ramps -> depot checkpoint -> convoy defense.', waypoints: [{ x: 40, y: 120 }, { x: 340, y: 160 }, { x: 640, y: 140 }] },
            shortcut: { id: 'm04-shortcut', summary: 'DESTRUCTIVE: drop the upper ramp trestle to crush the depot patrol, slide the debris.', destructive: true, waypoints: [{ x: 340, y: 160 }, { x: 500, y: 220 }, { x: 640, y: 140 }] },
            fallback: { id: 'm04-fallback', summary: 'EMERGENCY: Valley Net breach douses a fire lane with retardant if the depot ignites early.', emergency: true, waypoints: [{ x: 340, y: 160 }, { x: 420, y: 320 }, { x: 640, y: 140 }] }
        },
        score: { parSeconds: 450, killPoints: 120, rescueBonus: 550, lootBonus: 300, noDeathBonus: 400, shortcutBonus: 175 },
        nightmare: { coordination: 'Convoy fueling needs driver + hose + lookout at once; one player cannot hold all three, HP unchanged.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm04-gate', bounds: { x: 0, y: 0, w: 300, h: 180 }, summary: 'Outpost gate. Sand-table drill: vent one drill bladder, no enemies.' },
        objective: 'Defend the fuel convoy 75s while it fuels on the ramp.',
        exit: { id: 'm04-convoy-extract', desc: 'Roll out with the convoy.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m04_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM04 = mission;
    } catch (_) {}
})();
