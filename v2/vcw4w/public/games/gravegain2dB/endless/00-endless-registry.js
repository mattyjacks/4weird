/* GraveGain2dB Endless - 00 registry.
   Validates authored room templates: entry/exit sockets, protected floor,
   destructible layer, support declarations, spawns, anchors, nav, palette,
   safe route, breach location.
   Global surface: window.GraveGain2dBEndlessRegistry only. */
(function () {
    'use strict';

    var REG_KEY = 'GraveGain2dBEndlessRegistry';
    var rooms = Object.create(null);

    function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

    function validSocket(s) {
        return isObj(s) && typeof s.edge === 'string' && typeof s.x === 'number' && typeof s.y === 'number';
    }

    function validateRoom(r) {
        var errors = [];
        if (!isObj(r)) return ['room must be an object'];
        if (typeof r.id !== 'string' || !r.id) errors.push('id required');
        if (typeof r.sector !== 'number' || r.sector < 1) errors.push('sector number required');
        if (typeof r.name !== 'string' || !r.name) errors.push('name required');
        if (!validSocket(r.entry)) errors.push('entry socket required (edge/x/y)');
        if (!validSocket(r.exit)) errors.push('exit socket required (edge/x/y)');
        if (!isObj(r.objective) || typeof r.objective.desc !== 'string') errors.push('objective.desc required');
        if (!isObj(r.objectiveAnchor) || typeof r.objectiveAnchor.x !== 'number') errors.push('objectiveAnchor x/y required');
        if (!isObj(r.protectedFloor) || typeof r.protectedFloor.desc !== 'string') errors.push('protectedFloor.desc required');
        if (!Array.isArray(r.destructibleLayer) || r.destructibleLayer.length < 1) errors.push('destructibleLayer needs entries');
        if (!Array.isArray(r.supports) || r.supports.length < 1) errors.push('supports declarations required');
        else r.supports.forEach(function (s, i) {
            if (!isObj(s) || typeof s.id !== 'string' || typeof s.holds !== 'string') {
                errors.push('supports[' + i + '] needs id + holds');
            }
        });
        if (!Array.isArray(r.spawns) || r.spawns.length < 1) errors.push('spawns required');
        if (!isObj(r.anchors) || !isObj(r.anchors.civilian) || !isObj(r.anchors.pickup)) {
            errors.push('anchors.civilian + anchors.pickup required');
        }
        if (!Array.isArray(r.navZones) || r.navZones.length < 1) errors.push('navZones required');
        if (typeof r.palette !== 'string' || !r.palette) errors.push('palette required');
        if (!isObj(r.safeRoute) || !Array.isArray(r.safeRoute.waypoints) || r.safeRoute.waypoints.length < 2) {
            errors.push('safeRoute.waypoints (2+) required');
        }
        if (!isObj(r.breachLocation) || typeof r.breachLocation.x !== 'number') {
            errors.push('breachLocation x/y required');
        }
        return errors;
    }

    function register(room) {
        try {
            var errs = validateRoom(room);
            if (errs.length) return { ok: false, errors: errs };
            rooms[String(room.id)] = room;
            return { ok: true };
        } catch (e) {
            return { ok: false, errors: ['exception: ' + String(e && e.message || e)] };
        }
    }

    function get(id) { try { return rooms[String(id)] || null; } catch (_) { return null; } }
    function list() { try { return Object.keys(rooms).sort(); } catch (_) { return []; } }
    function bySector(n) {
        var out = [];
        try {
            Object.keys(rooms).forEach(function (k) {
                if (rooms[k] && rooms[k].sector === n) out.push(rooms[k]);
            });
        } catch (_) {}
        return out;
    }
    function validateAll() {
        var out = [];
        try {
            Object.keys(rooms).forEach(function (k) {
                out.push({ id: k, errors: validateRoom(rooms[k]) });
            });
        } catch (_) {}
        return out;
    }

    var api = { register: register, get: get, list: list, bySector: bySector, validateRoom: validateRoom, validateAll: validateAll };

    try {
        if (typeof window !== 'undefined') window[REG_KEY] = api;
        else if (typeof globalThis !== 'undefined') globalThis[REG_KEY] = api;
    } catch (_) {}
    try {
        if (typeof module !== 'undefined' && module.exports) module.exports = api;
    } catch (_) {}
})();
