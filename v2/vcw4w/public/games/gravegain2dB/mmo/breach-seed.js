/* GraveGain2dB MMO: shared breach-event seed (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Derives every public breach room from ONE
 * shared event seed ("Break the Citadel Chain"): roomIndex -> roomSeed, so
 * N 4-player authoritative rooms share layouts/relay order without sharing
 * one giant destructible instance. Mirrors gravegain-mmo-events/ rotation
 * determinism (read-only source, never edited).
 *
 *   window.GraveGain2DBreachSeed = {
 *     VERSION, EVENT_ID, deriveRoomSeed, roomIndexFor, describe
 *   }
 *
 * Every public function is guarded and NEVER throws.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var EVENT_ID = 'break-the-citadel-chain';
    var MAX_ROOMS = 4096;

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGain2DBreachSeed) return;

    function cleanStr(v, maxLen) {
        try {
            var s = String(v == null ? '' : v).trim();
            if (!s) return '';
            if (s.length > maxLen) s = s.slice(0, maxLen);
            if (!/^[A-Za-z0-9_-]+$/.test(s)) return '';
            return s;
        } catch (e) { /* ignore */ }
        return '';
    }

    function normRoomCount(v) {
        try {
            var n = Math.floor(Number(v));
            if (!isFinite(n) || n < 1) return 1;
            if (n > MAX_ROOMS) return MAX_ROOMS;
            return n;
        } catch (e) { /* ignore */ }
        return 1;
    }

    /* FNV-1a 32-bit, ASCII only, deterministic across browsers. */
    function fnv1a(str) {
        try {
            var h = 0x811c9dc5;
            var s = String(str);
            for (var i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i) & 0xff;
                h = (h * 0x01000193) >>> 0;
            }
            return h >>> 0;
        } catch (e) { /* ignore */ }
        return 0;
    }

    function toSeed36(n) {
        try {
            var v = Number(n) >>> 0;
            var out = v.toString(36);
            while (out.length < 7) out = '0' + out;
            return out.slice(0, 7);
        } catch (e) { /* ignore */ }
        return '0000000';
    }

    /* Derive one room's seed from the shared event seed + room index. */
    function deriveRoomSeed(eventSeed, roomIndex) {
        try {
            var seed = cleanStr(eventSeed, 64) || EVENT_ID;
            var idx = normRoomCount(roomIndex) - 1;
            try {
                var raw = Math.floor(Number(roomIndex));
                if (isFinite(raw) && raw >= 0 && raw < MAX_ROOMS) idx = raw;
            } catch (e) { /* keep normalized */ }
            return EVENT_ID + '-' + toSeed36(fnv1a(seed + ':' + idx));
        } catch (e) { /* ignore */ }
        return EVENT_ID + '-0000000';
    }

    /* Stable room assignment for a player id (display hint only —
     * the room server admits; this never grants entry by itself). */
    function roomIndexFor(playerId, roomCount) {
        try {
            var id = cleanStr(playerId, 32) || 'solo';
            var count = normRoomCount(roomCount);
            return fnv1a(id) % count;
        } catch (e) { /* ignore */ }
        return 0;
    }

    function describe(input) {
        try {
            if (input && typeof input === 'object' && input.roomSeed) {
                return 'Citadel breach room ' + String(input.roomSeed) + ' (shared seed of ' + EVENT_ID + ').';
            }
            return 'Break the Citadel Chain: many 4-player rooms, one shared seed.';
        } catch (e) { /* ignore */ }
        return 'Citadel breach event.';
    }

    win.GraveGain2DBreachSeed = {
        VERSION: VERSION,
        EVENT_ID: EVENT_ID,
        deriveRoomSeed: deriveRoomSeed,
        roomIndexFor: roomIndexFor,
        describe: describe
    };
})();
