/* GraveGain2dB Campaign - m02 Hollow Grove (roots / living bridges). */
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
        id: 'm02',
        title: 'M02 - Hollow Grove (Root Bridges)',
        location: 'Hollow Grove',
        briefing: 'The grove roots have risen into living bridges over the sinkholes. ' +
            'Roots hold while their anchor-trees stand; fell the wrong tree and the bridge goes with it.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Grove sinkholes are live. Cross by root bridge - check the anchor-trees before you shoot.' },
            { speaker: 'Arty Fisher', text: 'Roots are load-bearing. Tag the anchors FIRST, then decide what drops.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Grove crossing held. Bridges mapped for the convoy.' }
        ],
        safeOpener: { summary: 'Grove edge camp. Zero hostiles; target-range root anchors for practice.', bounds: { x: 0, y: 0, w: 280, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm02-edge', summary: 'Grove edge. Root-anchor drill vs thorn-crawlers.', enemies: ['thorn-crawler', 'risen-mourner'], supportGroup: 'root-bridge-north' },
            { id: 'm02-sinkhole', summary: 'Sinkhole span. Hold the living bridge while spores cross.', enemies: ['spore-bat', 'thorn-crawler'], supportGroup: 'root-bridge-north' },
            { id: 'm02-heart', summary: 'Grove heart. Defense: protect the sapling until the bridge sets.', enemies: ['spore-bat', 'bramble-hulk'], supportGroup: 'root-bridge-south' }
        ],
        teachingMoment: { lesson: 'Living supports: bridges tied to anchor-trees. Killing the tree drops the bridge - use it as a weapon, never by accident.', trigger: 'first anchor-tree warning', hint: 'Watch the support glow: green stable, amber damaged, red collapsing.' },
        optional: {
            rescue: { id: 'm02-scout-rescue', desc: 'Free the scout tangled in the south roots.', reward: 'codex + score bonus' },
            loot: { id: 'm02-heart-sap', desc: 'Collect heart-sap from the grove heart.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm02-heart-checkpoint', desc: 'Pre-climax checkpoint at the grove heart.', heals: true },
        climax: { type: 'defense', objective: 'Defend the sapling 60s while the south bridge sets.', then: 'extraction', extraction: { id: 'm02-grove-exit', desc: 'Exit up the set bridge.' } },
        codexUnlock: 'grove_root_bridges',
        builds: { allowed: ['rifle-runner', 'shotgun-warden'], default: 'rifle-runner' },
        enemies: ['thorn-crawler', 'spore-bat', 'bramble-hulk'],
        weapons: ['mk1-rifle', 'scattergun'],
        routes: {
            primary: { id: 'm02-primary', summary: 'Edge camp -> sinkhole bridge -> grove heart defense.', waypoints: [{ x: 40, y: 100 }, { x: 340, y: 140 }, { x: 640, y: 120 }] },
            shortcut: { id: 'm02-shortcut', summary: 'DESTRUCTIVE: drop the dead north span onto the patrol, tightrope the live root.', destructive: true, waypoints: [{ x: 340, y: 140 }, { x: 500, y: 200 }, { x: 640, y: 120 }] },
            fallback: { id: 'm02-fallback', summary: 'EMERGENCY: Valley Net breach fells a rim tree into a ramp if both bridges fall.', emergency: true, waypoints: [{ x: 340, y: 140 }, { x: 420, y: 320 }, { x: 640, y: 120 }] }
        },
        score: { parSeconds: 420, killPoints: 110, rescueBonus: 500, lootBonus: 250, noDeathBonus: 400, shortcutBonus: 150 },
        nightmare: { coordination: 'Sapling defense splits into two root valves held simultaneously; windows tighten, enemy HP unchanged.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm02-edge', bounds: { x: 0, y: 0, w: 280, h: 180 }, summary: 'Grove edge camp. Zero hostiles; target-range root anchors for practice.' },
        objective: 'Defend the sapling 60s while the south bridge sets.',
        exit: { id: 'm02-grove-exit', desc: 'Exit up the set bridge.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m02_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM02 = mission;
    } catch (_) {}
})();
