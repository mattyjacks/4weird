/* GraveGain2dB Campaign - m07 Sealed Tomb (breach, no crush). */
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
        id: 'm07',
        title: 'M07 - Sealed Tomb (The Breach)',
        location: 'Sealed Tomb',
        briefing: 'The tomb door must be breached - but the lintel is the only thing ' +
            'holding the roof. Breach LOW and SLOW: no-crush rules. Nobody under stone.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Tomb lintel is load-bearing. Breach charges go LOW. No-crush rules are in effect.' },
            { speaker: 'Arty Fisher', text: 'Small charges, cold cuts. Any heroics with the big hammer and we all wear the ceiling.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'Tomb breached, roof held. Textbook no-crush entry.' }
        ],
        safeOpener: { summary: 'Tomb approach. Charge-placement drill on a practice slab; zero hostiles.', bounds: { x: 0, y: 0, w: 280, h: 180 }, enemies: 0 },
        zones: [
            { id: 'm07-approach', summary: 'Approach cut. Precision cuts vs sarcophagus-sentinels.', enemies: ['tomb-scarab', 'risen-keeper'], supportGroup: 'lintel-arch' },
            { id: 'm07-vestibule', summary: 'Vestibule. No-crush lane under the lintel arch.', enemies: ['risen-keeper', 'ash-wraith'], supportGroup: 'lintel-arch' },
            { id: 'm07-sanctuary', summary: 'Sanctuary door. Pre-climax checkpoint before the seal breaks.', enemies: ['ash-wraith', 'tomb-scarab'], supportGroup: 'sanctuary-roof' }
        ],
        teachingMoment: { lesson: 'No-crush breaching: the lintel arch is protected - collapse is mission failure. Cut beside it, never through it.', trigger: 'first lintel-proximity warning', hint: 'Charges on the door seam only; the arch glows protected-blue.' },
        optional: {
            rescue: { id: 'm07-sealed-scribe', desc: 'Cut the scribe out of the side niche without touching the arch.', reward: 'codex + score bonus' },
            loot: { id: 'm07-canopic-cache', desc: 'Recover the canopic cache from the vestibule.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm07-sanctuary-checkpoint', desc: 'Pre-climax checkpoint at the sanctuary door.', heals: true },
        climax: { type: 'defense', objective: 'Hold the breached door 60s against the tomb surge without collapsing the lintel.', then: 'extraction', extraction: { id: 'm07-tomb-exit', desc: 'Withdraw through the held breach.' } },
        codexUnlock: 'tomb_no_crush_breach',
        builds: { allowed: ['rifle-runner', 'shotgun-warden'], default: 'shotgun-warden' },
        enemies: ['tomb-scarab', 'risen-keeper', 'ash-wraith'],
        weapons: ['mk1-rifle', 'scattergun'],
        routes: {
            primary: { id: 'm07-primary', summary: 'Approach -> vestibule no-crush lane -> sanctuary checkpoint -> door hold.', waypoints: [{ x: 40, y: 120 }, { x: 330, y: 150 }, { x: 560, y: 140 }, { x: 720, y: 130 }] },
            shortcut: { id: 'm07-shortcut', summary: 'PRECISION: cold-cut a mouse-hole beside the lintel - skips the vestibule patrol, zero blast.', destructive: true, waypoints: [{ x: 330, y: 150 }, { x: 500, y: 170 }, { x: 720, y: 130 }] },
            fallback: { id: 'm07-fallback', summary: 'EMERGENCY: Valley Net 5s breach opens a vent shaft if the door reseals.', emergency: true, waypoints: [{ x: 330, y: 150 }, { x: 420, y: 300 }, { x: 720, y: 130 }] }
        },
        score: { parSeconds: 520, killPoints: 135, rescueBonus: 600, lootBonus: 325, noDeathBonus: 450, shortcutBonus: 225, noCollapseBonus: 300 },
        nightmare: { coordination: 'Door hold needs seal-team + bell-team calling cuts together; lintel stress is shared, HP unchanged.' },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm07-approach', bounds: { x: 0, y: 0, w: 280, h: 180 }, summary: 'Tomb approach. Charge-placement drill on a practice slab; zero hostiles.' },
        objective: 'Hold the breached door 60s against the tomb surge without collapsing the lintel.',
        exit: { id: 'm07-tomb-exit', desc: 'Withdraw through the held breach.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m07_'
    };
    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') window.GraveGain2dBCampaignM07 = mission;
    } catch (_) {}
})();
