/* GraveGain2dB Campaign - 00 registry.
   Pure fixture registry for the 10-mission MoonRock campaign.
   No DOM/Canvas/Audio/fetch/WebSocket/React/localStorage. Never throws.
   Global surface: window.GraveGain2dBCampaignRegistry only. */
(function () {
    'use strict';

    var REG_KEY = 'GraveGain2dBCampaignRegistry';

    var store = Object.create(null);

    var DIFFICULTIES = {
        Cadet: {
            id: 'Cadet',
            enemyDamageMult: 0.7,
            enemyCountMult: 0.8,
            checkpointRespawn: 'generous',
            note: 'Training tuning. Full checkpoints, slower warden timers.'
        },
        Breach: {
            id: 'Breach',
            enemyDamageMult: 1.0,
            enemyCountMult: 1.0,
            checkpointRespawn: 'standard',
            note: 'Intended tuning. Standard timers and spawns.'
        },
        Nightmare: {
            id: 'Nightmare',
            enemyDamageMult: 1.0,
            enemyCountMult: 1.0,
            enemyHpMult: 1.0,
            checkpointRespawn: 'standard',
            coordination: true,
            note: 'Coordination pressure only: sync switches, split objectives, ' +
                'tighter extraction windows. Enemy HP and damage are NOT scaled.'
        }
    };

    function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

    function validRoute(r) {
        if (!isObj(r)) return false;
        if (typeof r.id !== 'string' || !r.id) return false;
        if (typeof r.summary !== 'string' || !r.summary) return false;
        if (!Array.isArray(r.waypoints) || r.waypoints.length < 2) return false;
        for (var i = 0; i < r.waypoints.length; i++) {
            var w = r.waypoints[i];
            if (!isObj(w) || typeof w.x !== 'number' || typeof w.y !== 'number') return false;
        }
        return true;
    }

    // Every mission fixture must carry all of these fields.
    function validateMission(m) {
        var errors = [];
        if (!isObj(m)) return ['mission must be an object'];
        if (typeof m.id !== 'string' || !m.id) errors.push('id required');
        if (typeof m.title !== 'string' || !m.title) errors.push('title required');
        if (typeof m.briefing !== 'string' || !m.briefing) errors.push('briefing required');
        if (!Array.isArray(m.dialogueBefore) || m.dialogueBefore.length < 1) errors.push('dialogueBefore required');
        if (!Array.isArray(m.dialogueAfter) || m.dialogueAfter.length < 1) errors.push('dialogueAfter required');
        if (!isObj(m.safeOpener) || typeof m.safeOpener.summary !== 'string') errors.push('safeOpener.summary required');
        if (!Array.isArray(m.zones) || m.zones.length < 2 || m.zones.length > 4) {
            errors.push('zones must have 2-4 entries');
        } else {
            m.zones.forEach(function (z, i) {
                if (!isObj(z) || typeof z.id !== 'string' || typeof z.summary !== 'string') {
                    errors.push('zones[' + i + '] needs id + summary');
                }
            });
        }
        if (!isObj(m.teachingMoment) || typeof m.teachingMoment.lesson !== 'string') {
            errors.push('teachingMoment.lesson required');
        }
        if (!isObj(m.optional) || (typeof m.optional.rescue !== 'object' && typeof m.optional.loot !== 'object')) {
            errors.push('optional needs rescue and/or loot');
        }
        if (!isObj(m.checkpoint) || typeof m.checkpoint.id !== 'string') errors.push('pre-climax checkpoint required');
        if (!isObj(m.climax) || (m.climax.type !== 'boss' && m.climax.type !== 'defense' && m.climax.type !== 'extraction')) {
            errors.push('climax.type must be boss|defense|extraction');
        }
        if (typeof m.codexUnlock !== 'string' || !m.codexUnlock) errors.push('codexUnlock required');
        if (!isObj(m.routes) || !validRoute(m.routes.primary) || !validRoute(m.routes.shortcut) || !validRoute(m.routes.fallback)) {
            errors.push('routes.primary + routes.shortcut + routes.fallback required (each id/summary/2+ waypoints)');
        }
        if (!isObj(m.score) || typeof m.score.parSeconds !== 'number') errors.push('score.parSeconds required');
        if (!isObj(m.builds) || !Array.isArray(m.builds.allowed) || m.builds.allowed.length < 1) {
            errors.push('builds.allowed needs at least 1 build');
        }
        if (!Array.isArray(m.enemies) || m.enemies.length < 1) errors.push('enemies required');
        if (!Array.isArray(m.weapons) || m.weapons.length < 1) errors.push('weapons required');
        return errors;
    }

    function register(mission) {
        try {
            var errs = validateMission(mission);
            if (errs.length) {
                return { ok: false, errors: errs };
            }
            store[String(mission.id)] = mission;
            return { ok: true };
        } catch (e) {
            return { ok: false, errors: ['exception: ' + String(e && e.message || e)] };
        }
    }

    function get(id) {
        try { return store[String(id)] || null; } catch (_) { return null; }
    }

    function list() {
        try { return Object.keys(store).sort(); } catch (_) { return []; }
    }

    function validateAll() {
        var out = [];
        try {
            var keys = Object.keys(store);
            for (var i = 0; i < keys.length; i++) {
                var m = store[keys[i]];
                out.push({ id: keys[i], errors: validateMission(m) });
            }
        } catch (_) { /* never throw */ }
        return out;
    }

    var api = {
        register: register,
        get: get,
        list: list,
        validateMission: validateMission,
        validateAll: validateAll,
        difficulties: DIFFICULTIES
    };

    try {
        if (typeof window !== 'undefined') window[REG_KEY] = api;
        else if (typeof globalThis !== 'undefined') globalThis[REG_KEY] = api;
    } catch (_) { /* no global - registry still usable via return */ }

    try {
        if (typeof module !== 'undefined' && module.exports) module.exports = api;
    } catch (_) { /* browser - ignore */ }
})();
