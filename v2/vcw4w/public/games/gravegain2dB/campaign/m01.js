/* GraveGain2dB Campaign - m01 LZ Crash (memorial-wall collapse).
   FULL VERTICAL SLICE: intro, 1 build, 3 enemies, 2 weapons, rescue,
   destructive shortcut, checkpoint, warden (boss), extraction, score.
   Global surface: window.GraveGain2dBCampaignRegistry only. */
(function () {
    'use strict';

    function registry() {
        try {
            if (typeof window !== 'undefined' && window.GraveGain2dBCampaignRegistry) {
                return window.GraveGain2dBCampaignRegistry;
            }
            if (typeof globalThis !== 'undefined' && globalThis.GraveGain2dBCampaignRegistry) {
                return globalThis.GraveGain2dBCampaignRegistry;
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    var mission = {
        id: 'm01',
        title: 'M01 - LZ Crash (Memorial Wall)',
        location: 'LZ Crash memorial garden',
        briefing: 'Dropship down at the LZ. The memorial wall honoring the first ' +
            'graves has collapsed across the approach road - unstable masonry ' +
            'above, open crater field below. Sweep the crash site, learn breach ' +
            'basics, and reach the extraction beacon.',
        dialogueBefore: [
            { speaker: 'Valley Net', text: 'Dropship 420 is down. Memorial wall has collapsed over the road. Crater field is thin - learn the rhythm here.' },
            { speaker: 'Pvt. Lisa Park', text: 'That wall carried every name we buried. We go through the craters, not over the rubble.' }
        ],
        dialogueAfter: [
            { speaker: 'Valley Net', text: 'LZ secured. Extraction beacon is hot. Fine work, soldier.' }
        ],
        safeOpener: {
            summary: 'Sheltered muster behind the dropship ramp. No enemies for 20m; rifle drill targets only.',
            bounds: { x: 0, y: 0, w: 320, h: 200 },
            enemies: 0
        },
        zones: [
            { id: 'm01-crater-field', summary: 'Open crater field. Teaches move/aim/fire vs crawlers.', enemies: ['crawler', 'risen-mourner'], supportGroup: 'memorial-wall-rubble' },
            { id: 'm01-wall-gap', summary: 'Collapsed memorial-wall gap. Teaches precision shots on cracked masonry anchors.', enemies: ['risen-mourner', 'spitter'], supportGroup: 'memorial-wall-rubble' },
            { id: 'm01-beacon-ridge', summary: 'Ridge road to the extraction beacon. Rescue + pre-climax checkpoint.', enemies: ['crawler', 'spitter'], supportGroup: 'beacon-arch' }
        ],
        teachingMoment: {
            lesson: 'Destructible cover: cracked memorial masonry can be dropped on enemies, but the wall rubble is load-bearing - check supports first.',
            trigger: 'first cracked-masonry kill or first support warning',
            hint: 'Shoot the glowing crack anchors, never the keystone.'
        },
        optional: {
            rescue: { id: 'm01-medic-rescue', desc: 'Carry the trapped medic from the wall gap to the ridge checkpoint.', reward: 'codex + score bonus' },
            loot: { id: 'm01-flight-recorder', desc: 'Recover the dropship flight recorder in the crater field.', reward: 'score bonus' }
        },
        checkpoint: { id: 'm01-ridge-checkpoint', desc: 'Pre-climax checkpoint on beacon ridge. Respawns here for the warden + extraction.', heals: true },
        climax: {
            type: 'boss',
            boss: { id: 'crash-warden', name: 'Crash Warden', role: 'Memorial guardian risen from the first grave.' },
            then: 'extraction',
            extraction: { id: 'm01-beacon', desc: 'Hold the beacon pad 20s, then extract.' }
        },
        codexUnlock: 'lz_memorial_wall',
        builds: { allowed: ['rifle-runner'], default: 'rifle-runner' },
        enemies: ['crawler', 'risen-mourner', 'spitter'],
        weapons: ['mk1-rifle', 'scrap-pistol'],
        routes: {
            primary: {
                id: 'm01-primary',
                summary: 'Ramp -> crater field -> wall gap -> ridge checkpoint -> beacon.',
                waypoints: [{ x: 40, y: 100 }, { x: 320, y: 120 }, { x: 560, y: 140 }, { x: 760, y: 120 }]
            },
            shortcut: {
                id: 'm01-shortcut',
                summary: 'DESTRUCTIVE: drop the cracked wall span onto the gap patrol, then cross the rubble bridge.',
                destructive: true,
                waypoints: [{ x: 320, y: 120 }, { x: 520, y: 160 }, { x: 760, y: 120 }]
            },
            fallback: {
                id: 'm01-fallback',
                summary: 'EMERGENCY: Valley Net breach fallback - blast the crater rim if the gap seals, long way around the wall.',
                emergency: true,
                waypoints: [{ x: 320, y: 120 }, { x: 400, y: 300 }, { x: 760, y: 120 }]
            }
        },
        score: {
            parSeconds: 360,
            killPoints: 100,
            rescueBonus: 500,
            lootBonus: 250,
            noDeathBonus: 400,
            shortcutBonus: 150
        },
        nightmare: {
            coordination: 'Beacon hold needs two switches flipped within 5s; warden enrage is a split-objective (power cells at both ridge ends), never extra HP.'
        },
        // DS-GG2DB-11 DoD alias surface (ADDITIVE, read-only): entry/exit/objective
        // derived from safeOpener/zones/routes/climax above. Zero gameplay change.
        entry: { zone: 'm01-crater-field', bounds: { x: 0, y: 0, w: 320, h: 200 }, summary: 'Sheltered muster behind the dropship ramp. No enemies for 20m; rifle drill targets only.' },
        objective: 'Defeat the Crash Warden, then hold the beacon pad 20s and extract.',
        exit: { id: 'm01-beacon', desc: 'Hold the beacon pad 20s, then extract.' },
        // Canonical save-prefix alias: gg2db_ is the canonical localStorage prefix;
        // gravegain2dB.* keys are the same namespace and remain accepted (no renames).
        savePrefix: 'gg2db_m01_'
    };

    try {
        var reg = registry();
        if (reg) reg.register(mission);
        else if (typeof window !== 'undefined') {
            window.GraveGain2dBCampaignM01 = mission;
        }
    } catch (_) { /* never throw */ }
})();
