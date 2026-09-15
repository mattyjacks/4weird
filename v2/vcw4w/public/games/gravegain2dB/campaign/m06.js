/* GraveGain2dB Campaign - m06 Sunken Catacombs (tanks / vents). */
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
        id: 'm06',
        title: 'M06 - Sunken Catacombs (Tanks & Vents)',
        location: 'Sunken Catacombs',
        briefing: 'Burial tanks vent bad air through the catacombs. Cycle the vents to ' +
            'clear a lane; sealed tanks are tombs - open the wrong one and it opens you.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Catacomb air is foul. Cycle vents green-to-green; sealed tanks stay sealed.' },
            { speaker: 'Pvt. Lisa Park', text: 'These are graves, not loot boxes. We open only what the mission needs.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Catacombs vented. Air is breathable for the push.' }
        ],
        safeOpener: { summary: 'Catacomb stair. Vent-wheel drill with no hostiles.', bounds: { x: 0, y: 0, w: 280, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm06-stair', summary: 'Entry stair. First vent cycle vs tomb-moths.', enemies: ['tomb-moth', 'risen-acolyte'], supportGroup: 'vent-trunk-a' },
            { id: 'm06-gallery', summary: 'Tank gallery. Moving vent-lanes between sealed tanks.', enemies: ['risen-acolyte', 'tank-abomination'], supportGroup: 'tank-row' }
        ],
        teachingMoment: { lesson: 'Gas + supports: vents clear lanes but trunk-A carries the gallery ceiling. Break the trunk and the lane buries itself.', trigger: 'first trunk-damage warning', hint: 'Vent wheels are safe; trunk walls are not targets.' },
        optional: {
            rescue: { id: 'm06-lost-novitiate', desc: 'Lead the lost novitiate out of the tank gallery.', reward: 'codex + score bonus' },
            loot: { id: 'm06-saint-reliquary', desc: 'Seal the saint reliquary for the convoy chaplain.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm06-gallery-checkpoint', desc: 'Pre-climax checkpoint past the tank row.', heals: true },
        climax: { type: 'boss', boss: { id: 'tank-warden', name: 'Tank Warden', role: 'Fused caretaker of the breached row.' }, then: 'extraction', extraction: { id: 'm06-crypt-door', desc: 'Seal the crypt door behind you.' } },
        codexUnlock: 'catacombs_tanks_vents',
        builds: { allowed: ['rifle-runner', 'flame-warden', 'arc-runner'], default: 'rifle-runner' },
        enemies: ['tomb-moth', 'risen-acolyte', 'tank-abomination'],
        weapons: ['mk1-rifle', 'incinerator', 'arc-caster'],
        routes: {
            primary: { id: 'm06-primary', summary: 'Stair -> gallery vents -> checkpoint -> warden -> crypt door.', waypoints: [{ x: 40, y: 120 }, { x: 330, y: 160 }, { x: 600, y: 150 }] },
            shortcut: { id: 'm06-shortcut', summary: 'DESTRUCTIVE: vent a tank into the patrol lane (gas kill), then cross before it settles.', destructive: true, waypoints: [{ x: 330, y: 160 }, { x: 470, y: 210 }, { x: 600, y: 150 }] },
            fallback: { id: 'm06-fallback', summary: 'EMERGENCY: Valley Net breach cracks the service vent if the gallery seals.', emergency: true, waypoints: [{ x: 330, y: 160 }, { x: 400, y: 300 }, { x: 600, y: 150 }] }
        },
        score: { parSeconds: 500, killPoints: 130, rescueBonus: 550, lootBonus: 300, noDeathBonus: 425, shortcutBonus: 200 },
        nightmare: { coordination: 'Vent cycle needs wheel-holder + runner in sync; warden adds a two-casket seal done together, HP unchanged.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm06-stair', bounds: { x: 0, y: 0, w: 280, h: 180 }, summary: 'Catacomb stair. Vent-wheel drill with no hostiles.' },
        objective: 'Defeat the Tank Warden, then seal the crypt door behind you.',
        exit: { id: 'm06-crypt-door', desc: 'Seal the crypt door behind you.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m06_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM06 = mission;
    } catch (_) {}
})();
