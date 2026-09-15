/* GraveGain2dB MMO client helper (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Shapes what the 2dB UI shows and what
 * inputs it may send; it mints no progress. Only a room-server-signed
 * attestation moves global state (verified server-side in the API route,
 * never here).
 *
 *   window.GraveGain2dBMMO = {
 *     VERSION, EVENT_ID, SOLO_FALLBACK, ATTEST_FIELDS, VALUE_MAX,
 *     isSoloFallback, blankAttestation, sanitizeAttestation,
 *     contributionId, redeemClaim, describe
 *   }
 *
 * Attestation shape (room server -> aggregator):
 *   { event_id, room_id, seed, mission, user_ids,
 *     objective_id, value, nonce, iat, sig }
 *
 * Contribution -> redeem flow (notes, no network here):
 *   1. Squad clears an objective inside an authoritative room sim.
 *   2. Room server mints ONE attestation per (room, objective, nonce)
 *      with its operator-key sig over the canonical payload.
 *   3. Client (or room server) POSTs it to
 *      POST /api/mmo/events/[id]/contribute. Server verifies:
 *      known server key + valid sig + seed match + nonce unused +
 *      value within clamps. Duplicates return the stored row.
 *   4. Verified values roll into the global bar; when every front
 *      holds >= 20% of threshold the boss unlocks.
 *   5. Player redeems via POST /api/mmo/events/[id]/redeem with
 *      { user_id, kind }. Server enforces
 *      UNIQUE(user, event, kind): first redeem settles, repeats
 *      return the original grant (idempotent, no double-spend).
 *   6. Solo-fallback: when the MMO layer is offline/unreachable the
 *      game plays the same missions locally; local clears NEVER
 *      mint attestations and NEVER touch the global bar.
 *
 * Solo-fallback flag: SOLO_FALLBACK = true means the game MUST boot,
 * stage, and score missions with zero network. Every public function
 * is guarded and NEVER throws: on failure it returns a safe fallback.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var EVENT_ID = 'break-the-citadel-chain';
    var SEED = 'citadel-chain-s3-2db';

    /* Solo play stays fully available when the MMO layer is offline. */
    var SOLO_FALLBACK = true;

    /* Canonical attestation fields, in sig order. */
    var ATTEST_FIELDS = ['event_id', 'room_id', 'seed', 'mission', 'user_ids', 'objective_id', 'value', 'nonce', 'iat', 'sig'];

    /* Per-objective value clamps (anti-fraud: server re-clamps). */
    var VALUE_MAX = 100000;
    var ROOM_MAX = 4;
    var NONCE_MAX_LEN = 64;

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGain2dBMMO) return;

    function cleanId(v, maxLen) {
        try {
            var s = String(v == null ? '' : v).trim();
            var cap = maxLen > 0 ? maxLen : 64;
            if (!s || s.length > cap) return '';
            if (!/^[A-Za-z0-9_-]+$/.test(s)) return '';
            return s;
        } catch (e) { /* ignore */ }
        return '';
    }

    function cleanNum(v, fallback) {
        try {
            var n = Number(v);
            if (isFinite(n)) return n;
        } catch (e) { /* ignore */ }
        return fallback;
    }

    function cleanUserIds(v) {
        var out = [];
        try {
            if (!v) return out;
            var list = Array.isArray(v) ? v : [v];
            var seen = {};
            for (var i = 0; i < list.length && out.length < ROOM_MAX; i++) {
                var id = cleanId(list[i], 32);
                if (id && !seen[id]) {
                    seen[id] = true;
                    out.push(id);
                }
            }
        } catch (e) { /* ignore */ }
        return out;
    }

    /* True when the client should run missions locally with no MMO calls. */
    function isSoloFallback(flags) {
        try {
            if (flags && flags.mmoOnline === true && flags.eventLive === true) return false;
            return SOLO_FALLBACK;
        } catch (e) { /* ignore */ }
        return true;
    }

    /* Blank attestation skeleton (client fills inputs only; sig is server-set). */
    function blankAttestation() {
        try {
            return {
                event_id: EVENT_ID,
                room_id: '',
                seed: SEED,
                mission: '',
                user_ids: [],
                objective_id: '',
                value: 0,
                nonce: '',
                iat: 0,
                sig: ''
            };
        } catch (e) { /* ignore */ }
        return null;
    }

    /* Sanitize one attestation into canonical shape; null when unusable.
     * NOTE: this checks shape + clamps only. Signature VALIDITY is checked
     * server-side against the room-server key registry, never here. */
    function sanitizeAttestation(raw) {
        try {
            if (!raw || typeof raw !== 'object') return null;
            var eventId = cleanId(raw.event_id, 64);
            if (eventId !== EVENT_ID) return null;
            var roomId = cleanId(raw.room_id, 64);
            if (!roomId) return null;
            var seed = cleanId(raw.seed, 64);
            if (!seed) return null;
            var mission = cleanId(raw.mission, 64);
            if (!mission) return null;
            var users = cleanUserIds(raw.user_ids);
            if (!users.length) return null;
            var objectiveId = cleanId(raw.objective_id, 64);
            if (!objectiveId) return null;
            var value = Math.floor(cleanNum(raw.value, NaN));
            if (!isFinite(value) || value <= 0) return null;
            if (value > VALUE_MAX) value = VALUE_MAX;
            var nonce = cleanId(raw.nonce, NONCE_MAX_LEN);
            if (!nonce) return null;
            var iat = Math.floor(cleanNum(raw.iat, 0));
            if (!isFinite(iat) || iat < 0) iat = 0;
            var sig = '';
            try {
                sig = String(raw.sig == null ? '' : raw.sig).trim().slice(0, 512);
            } catch (e) { sig = ''; }
            if (!sig) return null;
            return {
                event_id: eventId,
                room_id: roomId,
                seed: seed,
                mission: mission,
                user_ids: users,
                objective_id: objectiveId,
                value: value,
                nonce: nonce,
                iat: iat,
                sig: sig
            };
        } catch (e) { /* ignore */ }
        return null;
    }

    /* Idempotency key for one contribution: room + objective + nonce. */
    function contributionId(att) {
        try {
            var clean = sanitizeAttestation(att);
            if (!clean) return '';
            return clean.room_id + ':' + clean.objective_id + ':' + clean.nonce;
        } catch (e) { /* ignore */ }
        return '';
    }

    /* Shape one idempotent redeem claim (POST body for .../redeem).
     * Server enforces UNIQUE(user, event, kind); repeats return original. */
    function redeemClaim(userId, kind) {
        try {
            var u = cleanId(userId, 32);
            var k = cleanId(kind, 32);
            if (!u || !k) return null;
            return { event_id: EVENT_ID, user_id: u, kind: k };
        } catch (e) { /* ignore */ }
        return null;
    }

    function describe(att) {
        try {
            var clean = sanitizeAttestation(att);
            if (!clean) return 'No valid attestation.';
            return clean.event_id + ' ' + clean.room_id + ' ' + clean.objective_id + ' +' + clean.value;
        } catch (e) { /* ignore */ }
        return 'Attestation unknown.';
    }

    win.GraveGain2dBMMO = {
        VERSION: VERSION,
        EVENT_ID: EVENT_ID,
        SEED: SEED,
        SOLO_FALLBACK: SOLO_FALLBACK,
        ATTEST_FIELDS: ATTEST_FIELDS,
        VALUE_MAX: VALUE_MAX,
        ROOM_MAX: ROOM_MAX,
        isSoloFallback: isSoloFallback,
        blankAttestation: blankAttestation,
        sanitizeAttestation: sanitizeAttestation,
        contributionId: contributionId,
        redeemClaim: redeemClaim,
        describe: describe
    };
})();
