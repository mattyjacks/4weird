/* GraveGain2dB Campaign - m10 MoonRock Sanctum (armor supports / core collapse). */
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
        id: 'm10',
        title: 'M10 - MoonRock Sanctum (Core Collapse)',
        location: 'MoonRock Sanctum',
        briefing: 'The Sanctum core feeds the NecroGenesis. Armor supports ring the ' +
            'core - crack them in order and the core collapses clean. Wrong order ' +
            'buries the squad. End this.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Sanctum core is live. Armor supports ring it - crack them in order, then run.' },
            { speaker: 'Pvt. Lisa Park', text: 'For James. For every name on that wall. We finish this together.' },
            { speaker: 'Arty Fisher', text: 'Supports sing, then crack, then go. When the third one sings, you are already running.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Core collapsed. NecroGenesis signal is fading. MoonRock holds - because of you.' },
            { speaker: 'Pvt. Lisa Park', text: 'Rest now. All of you. We will carry the names home.' }
        ],
        safeOpener: { summary: 'Sanctum antechamber. Final loadout bench; zero hostiles before the seal.', bounds: { x: 0, y: 0, w: 300, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm10-antechamber', summary: 'Antechamber. Last calm: loadout + first armor-support sighting.', enemies: ['risen-keeper', 'ash-wraith'], supportGroup: 'armor-ring' },
            { id: 'm10-ring', summary: 'Armor ring. Crack supports in order under guard pressure.', enemies: ['ash-wraith', 'sanctum-guard'], supportGroup: 'armor-ring' },
            { id: 'm10-core', summary: 'Core floor. Collapse sequence + run.', enemies: ['sanctum-guard', 'necro-herald'], supportGroup: 'core-vault' }
        ],
        teachingMoment: { lesson: 'Ordered collapse finale: every campaign skill at once - protected vs cracked, sequence, warnings, extraction.', trigger: 'first armor-support crack', hint: 'Crack order is etched on the floor: sun, bell, tower.' },
        optional: {
            rescue: { id: 'm10-last-survivor', desc: 'Carry the last survivor from the ring to the extraction lift.', reward: 'codex + score bonus' },
            loot: { id: 'm10-genesis-shard', desc: 'Seize the genesis shard before the vault seals.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm10-core-checkpoint', desc: 'Pre-climax checkpoint at the core door. Point of no return.', heals: true },
        climax: { type: 'boss', boss: { id: 'necro-herald', name: 'Necro Herald', role: 'Voice of the NecroGenesis, armored by the core itself.' }, then: 'extraction', extraction: { id: 'm10-collapse-run', desc: 'Outrun the core collapse to the lift. 45s window.' } },
        codexUnlock: 'sanctum_core_collapse',
        builds: { allowed: ['rifle-runner', 'shotgun-warden', 'arc-runner', 'flame-warden'], default: 'rifle-runner' },
        enemies: ['risen-keeper', 'ash-wraith', 'sanctum-guard', 'necro-herald'],
        weapons: ['mk1-rifle', 'scattergun', 'arc-caster', 'incinerator'],
        routes: {
            primary: { id: 'm10-primary', summary: 'Antechamber -> ring in order -> core door -> herald -> collapse run.', waypoints: [{ x: 40, y: 130 }, { x: 300, y: 140 }, { x: 540, y: 140 }, { x: 740, y: 120 }] },
            shortcut: { id: 'm10-shortcut', summary: 'PRECISION: skip the third guard wave by dropping a side arch on schedule - frame-perfect call.', destructive: true, precision: true, waypoints: [{ x: 300, y: 140 }, { x: 480, y: 180 }, { x: 740, y: 120 }] },
            fallback: { id: 'm10-fallback', summary: 'EMERGENCY: Valley Net breach holds the lift 10s extra if the collapse outruns the squad.', emergency: true, waypoints: [{ x: 300, y: 140 }, { x: 420, y: 300 }, { x: 740, y: 120 }] }
        },
        score: { parSeconds: 600, killPoints: 150, rescueBonus: 750, lootBonus: 400, noDeathBonus: 500, shortcutBonus: 250, collapseBonus: 500 },
        nightmare: { coordination: 'Herald fight splits ring valves across the squad with a shared collapse clock; mistimed cracks cost time, never HP.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm10-antechamber', bounds: { x: 0, y: 0, w: 300, h: 180 }, summary: 'Sanctum antechamber. Final loadout bench; zero hostiles before the seal.' },
        objective: 'Defeat the Necro Herald, then outrun the core collapse to the lift (45s window).',
        exit: { id: 'm10-collapse-run', desc: 'Outrun the core collapse to the lift. 45s window.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m10_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM10 = mission;
    } catch (_) {}
})();
