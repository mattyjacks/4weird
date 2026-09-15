/* GraveGain2dB MMO: public breach rooms (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Models MANY 4-player authoritative rooms on
 * the shared event seed (see breach-seed.js): relay objectives run in strict
 * order outer-ward -> chain-span -> gatehouse -> citadel-core, then the room
 * feeds the world boss. Browser state here is DISPLAY ONLY — objective
 * transitions require a room-server attestation ({ serverId, tickSeq });
 * client calls without one are ignored (see IRON RULE in lib file).
 *
 *   window.GraveGain2DBreachRooms = {
 *     VERSION, MAX_PLAYERS, RELAY_LEGS, createRoom, advanceObjective,
 *     progress, describe
 *   }
 *
 * Every public function is guarded and NEVER throws.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var MAX_PLAYERS = 4;
    var RELAY_LEGS = ['outer-ward', 'chain-span', 'gatehouse', 'citadel-core'];

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGain2DBreachRooms) return;

    function cleanId(v) {
        try {
            var s = String(v == null ? '' : v).trim();
            if (!s || s.length > 64) return '';
            if (!/^[A-Za-z0-9_-]+$/.test(s)) return '';
            return s;
        } catch (e) { /* ignore */ }
        return '';
    }

    function legIndex(id) {
        try {
            for (var i = 0; i < RELAY_LEGS.length; i++) {
                if (RELAY_LEGS[i] === id) return i;
            }
        } catch (e) { /* ignore */ }
        return -1;
    }

    function roomSeedFor() {
        try {
            if (win.GraveGain2DBreachSeed && typeof win.GraveGain2DBreachSeed.deriveRoomSeed === 'function') {
                return win.GraveGain2DBreachSeed;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    /* Create display state for one room. Players beyond 4 are dropped. */
    function createRoom(eventSeed, roomIndex, playerIds) {
        var safe = { roomId: 'room-0', eventSeed: 'break-the-citadel-chain', roomSeed: '', players: [], cleared: [], bossDamage: 0, tickSeq: 0 };
        try {
            var seed = cleanId(eventSeed) || 'break-the-citadel-chain';
            var idx = 0;
            try {
                var raw = Math.floor(Number(roomIndex));
                if (isFinite(raw) && raw >= 0 && raw < 4096) idx = raw;
            } catch (e) { /* keep 0 */ }
            safe.roomId = 'room-' + idx;
            safe.eventSeed = seed;
            try {
                var helper = roomSeedFor();
                safe.roomSeed = helper ? String(helper.deriveRoomSeed(seed, idx)) : seed + '-' + idx;
            } catch (e) { safe.roomSeed = seed + '-' + idx; }
            var seen = {};
            if (playerIds instanceof Array) {
                for (var i = 0; i < playerIds.length && safe.players.length < MAX_PLAYERS; i++) {
                    var id = cleanId(playerIds[i]);
                    if (!id || seen[id]) continue;
                    seen[id] = true;
                    safe.players.push(id);
                }
            }
            return safe;
        } catch (e) { /* ignore */ }
        return safe;
    }

    /* Advance one relay objective. Requires server attestation
     * ({ serverId, tickSeq }); returns the room unchanged otherwise. */
    function advanceObjective(room, legId, attest) {
        try {
            if (!room || typeof room !== 'object') return room;
            var leg = cleanId(legId);
            var at = legIndex(leg);
            if (at < 0) return room;
            if (!(attest && typeof attest === 'object')) return room;
            var serverId = cleanId(attest.serverId);
            var tick = Math.floor(Number(attest.tickSeq));
            if (!serverId || !isFinite(tick) || tick < 0) return room;
            var lastTick = 0;
            try {
                lastTick = Math.floor(Number(room.tickSeq)) || 0;
            } catch (e) { lastTick = 0; }
            if (tick <= lastTick) return room;
            if (!room.cleared) room.cleared = [];
            if (room.cleared.length !== at) return room;
            room.cleared.push(leg);
            room.tickSeq = tick;
            return room;
        } catch (e) { /* ignore */ }
        return room;
    }

    /* Relay progress summary for one room (display only). */
    function progress(room) {
        var safe = { cleared: 0, total: RELAY_LEGS.length, pct: 0, next: RELAY_LEGS[0], done: false };
        try {
            if (!room || typeof room !== 'object') return safe;
            var cleared = room.cleared instanceof Array ? room.cleared.length : 0;
            if (cleared < 0) cleared = 0;
            if (cleared > RELAY_LEGS.length) cleared = RELAY_LEGS.length;
            safe.cleared = cleared;
            safe.pct = Math.floor((cleared / RELAY_LEGS.length) * 100);
            safe.next = cleared < RELAY_LEGS.length ? RELAY_LEGS[cleared] : '';
            safe.done = cleared >= RELAY_LEGS.length;
            return safe;
        } catch (e) { /* ignore */ }
        return safe;
    }

    function describe(room) {
        try {
            var p = progress(room);
            if (p.done) return 'Room citadel-core breached — feeding the world boss.';
            return 'Relay ' + p.cleared + '/' + p.total + ' — next: ' + p.next + '.';
        } catch (e) { /* ignore */ }
        return 'Breach room.';
    }

    win.GraveGain2DBreachRooms = {
        VERSION: VERSION,
        MAX_PLAYERS: MAX_PLAYERS,
        RELAY_LEGS: RELAY_LEGS,
        createRoom: createRoom,
        advanceObjective: advanceObjective,
        progress: progress,
        describe: describe
    };
})();
