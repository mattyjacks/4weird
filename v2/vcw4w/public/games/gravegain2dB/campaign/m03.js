/* GraveGain2dB Campaign - m03 Deep Vault (ore-chutes / lifts). */
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
        id: 'm03',
        title: 'M03 - Deep Vault (Ore Chutes)',
        location: 'Deep Vault mine',
        briefing: 'Ore-chutes feed the vault lifts. Ride the chutes down, keep the lift ' +
            'chains intact, and clear the sump before the foreman-warden wakes.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Vault lifts run on chain-tension. Chutes are fast, lifts are safe. Your call.' },
            { speaker: 'Arty Fisher', text: 'Chains sing before they snap. Listen, then stop shooting the ceiling.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Vault sump clear. Lifts are ours again.' }
        ],
        safeOpener: { summary: 'Vault headframe. Unarmed ore-sorter drill; no hostiles on the deck.', bounds: { x: 0, y: 0, w: 300, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm03-headframe', summary: 'Headframe deck. Chute-drop drill vs dust-mites.', enemies: ['dust-mite', 'risen-miner'], supportGroup: 'chute-gantry' },
            { id: 'm03-chutes', summary: 'Ore-chute descent. Vertical shafts with bell-cables; avoid cutting lift chains.', enemies: ['risen-miner', 'chain-wraith'], supportGroup: 'lift-chains' },
            { id: 'm03-sump', summary: 'Sump floor. Pre-climax checkpoint beside the lift cage.', enemies: ['chain-wraith', 'sump-tick'], supportGroup: 'lift-chains' },
            { id: 'm03-foreman', summary: 'Foreman gallery. Warden arena with two chute drops for ammo.', enemies: ['sump-tick', 'risen-miner'], supportGroup: 'gallery-roof' }
        ],
        teachingMoment: { lesson: 'Vertical supports: lift chains carry the cage. Dropping chains strands the shortcut - and you.', trigger: 'first chain-damage warning', hint: 'Chutes are destructible cover; chains are protected - learn the color.' },
        optional: {
            rescue: { id: 'm03-trapped-crew', desc: 'Free the crew pinned under the gantry spill.', reward: 'codex + score bonus' },
            loot: { id: 'm03-ore-cache', desc: 'Haul the high-grade ore cache from the sump.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm03-sump-checkpoint', desc: 'Pre-climax checkpoint at the lift cage.', heals: true },
        climax: { type: 'boss', boss: { id: 'foreman-warden', name: 'Foreman Warden', role: 'Vault foreman fused to the lift cage.' }, then: 'extraction', extraction: { id: 'm03-lift-extract', desc: 'Ride the lift cage out.' } },
        codexUnlock: 'vault_ore_chutes',
        builds: { allowed: ['rifle-runner', 'shotgun-warden', 'arc-runner'], default: 'rifle-runner' },
        enemies: ['dust-mite', 'risen-miner', 'chain-wraith', 'sump-tick'],
        weapons: ['mk1-rifle', 'scattergun', 'arc-caster'],
        routes: {
            primary: { id: 'm03-primary', summary: 'Deck -> chutes -> sump checkpoint -> foreman gallery -> lift out.', waypoints: [{ x: 40, y: 80 }, { x: 300, y: 220 }, { x: 520, y: 300 }, { x: 720, y: 160 }] },
            shortcut: { id: 'm03-shortcut', summary: 'DESTRUCTIVE: blast the ore-plug and ride the full chute straight to the sump.', destructive: true, waypoints: [{ x: 300, y: 220 }, { x: 520, y: 300 }, { x: 720, y: 160 }] },
            fallback: { id: 'm03-fallback', summary: 'EMERGENCY: Valley Net breach opens the service ladder if the chutes jam.', emergency: true, waypoints: [{ x: 300, y: 220 }, { x: 380, y: 120 }, { x: 720, y: 160 }] }
        },
        score: { parSeconds: 480, killPoints: 120, rescueBonus: 500, lootBonus: 300, noDeathBonus: 400, shortcutBonus: 175 },
        nightmare: { coordination: 'Lift extraction needs cage crank + chute gate held together; desync drops the cage one level (no damage change).' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm03-headframe', bounds: { x: 0, y: 0, w: 300, h: 180 }, summary: 'Vault headframe. Unarmed ore-sorter drill; no hostiles on the deck.' },
        objective: 'Defeat the Foreman Warden, then ride the lift cage out.',
        exit: { id: 'm03-lift-extract', desc: 'Ride the lift cage out.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m03_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM03 = mission;
    } catch (_) {}
})();
