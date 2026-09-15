/* GraveGain2dB client prediction + reconciliation (window.GraveGain2dBNet.Predict).
 *
 * NEW file for DS-GG2DB-06. Authoritative co-op: the client predicts ONLY its
 * own movement from its own InputFrames (60Hz) and re-simulates (reconciles)
 * against the server's acknowledgedInput from each 20Hz RoomSnapshot.
 * Unreliable fields (transforms/aim/anim of REMOTE players) are never
 * predicted here -- see interp.js. Reliable outcomes (destruction/loot/
 * objective/checkpoint/revive/rescue/boss/extraction/reward) are never
 * predicted -- they arrive as server events only.
 *
 * InputFrame: { sequence, clientTick, moveX, moveY, aimAngle, buttons }.
 * buttons is an 8-bit mask: FIRE=0x01 JUMP=0x02 INTERACT=0x04 REVIVE=0x08
 * RELOAD=0x10 DASH=0x20 CROUCH=0x40 PING=0x80.
 *
 * Vanilla JS, ASCII-only, never throws. Node-requireable via module.exports.
 */
(function () {
    'use strict';

    var BUTTON = { FIRE: 0x01, JUMP: 0x02, INTERACT: 0x04, REVIVE: 0x08, RELOAD: 0x10, DASH: 0x20, CROUCH: 0x40, PING: 0x80 };
    var MAX_SPEED = 6;
    var SIM_DT = 1 / 60;
    var BUFFER_MAX = 256;

    function num(v, d) {
        try { var n = Number(v); return isFinite(n) ? n : d; } catch (e) { return d; }
    }
    function int(v, d) {
        try { var n = Number(v); if (!isFinite(n)) return d; return Math.floor(n); } catch (e) { return d; }
    }

    /* Build one sanitized InputFrame. Move vectors are normalized. */
    function buildFrame(sequence, clientTick, moveX, moveY, aimAngle, buttons) {
        var mx = num(moveX, 0), my = num(moveY, 0);
        try {
            var mag = Math.sqrt(mx * mx + my * my);
            if (mag > 1) { mx = mx / mag; my = my / mag; }
        } catch (e) { mx = 0; my = 0; }
        return {
            sequence: int(sequence, 0),
            clientTick: int(clientTick, 0),
            moveX: mx,
            moveY: my,
            aimAngle: num(aimAngle, 0),
            buttons: int(buttons, 0) & 0xff
        };
    }

    function buttonSet(buttons, bit) {
        try { return (int(buttons, 0) & bit) !== 0; } catch (e) { return false; }
    }

    /* Create a prediction buffer for one local player. */
    function createBuffer(playerId) {
        return {
            playerId: String(playerId || 'you'),
            nextSequence: 1,
            pending: [],
            predicted: { x: 0, y: 0, aimAngle: 0 }
        };
    }

    /* Apply one frame's movement to a position (mirrors server integration). */
    function stepPosition(pos, frame) {
        var out = { x: num(pos && pos.x, 0), y: num(pos && pos.y, 0) };
        try {
            out.x += frame.moveX * MAX_SPEED * SIM_DT;
            out.y += frame.moveY * MAX_SPEED * SIM_DT;
        } catch (e) { /* keep */ }
        return out;
    }

    /* Push a local input: buffers the frame and advances the prediction. */
    function pushInput(buf, frame) {
        try {
            if (!buf || !frame) return null;
            var f = buildFrame(frame.sequence !== undefined ? frame.sequence : buf.nextSequence,
                frame.clientTick, frame.moveX, frame.moveY, frame.aimAngle, frame.buttons);
            if (frame.sequence === undefined) { f.sequence = buf.nextSequence; }
            buf.nextSequence = f.sequence + 1;
            buf.pending.push(f);
            if (buf.pending.length > BUFFER_MAX) buf.pending.splice(0, buf.pending.length - BUFFER_MAX);
            var p = stepPosition(buf.predicted, f);
            buf.predicted = { x: p.x, y: p.y, aimAngle: f.aimAngle };
            return f;
        } catch (e) { return null; }
    }

    /* Reconcile against the server snapshot: drop acked frames, replay rest
     * from the authoritative position. Returns the corrected prediction. */
    function reconcile(buf, snapshot) {
        try {
            if (!buf || !snapshot) return buf ? buf.predicted : { x: 0, y: 0, aimAngle: 0 };
            var ack = 0;
            try {
                var m = snapshot.acknowledgedInput || {};
                ack = int(m[buf.playerId], 0);
            } catch (e) { ack = 0; }
            var keep = [];
            for (var i = 0; i < buf.pending.length; i++) {
                if (buf.pending[i].sequence > ack) keep.push(buf.pending[i]);
            }
            buf.pending = keep;
            var base = { x: buf.predicted.x, y: buf.predicted.y };
            try {
                var players = snapshot.players || [];
                for (var j = 0; j < players.length; j++) {
                    if (players[j] && players[j].id === buf.playerId) {
                        base = { x: num(players[j].x, base.x), y: num(players[j].y, base.y) };
                        break;
                    }
                }
            } catch (e2) { /* keep prediction */ }
            var pos = { x: base.x, y: base.y };
            var aim = buf.predicted.aimAngle;
            for (var k = 0; k < buf.pending.length; k++) {
                pos = stepPosition(pos, buf.pending[k]);
                aim = num(buf.pending[k].aimAngle, aim);
            }
            buf.predicted = { x: pos.x, y: pos.y, aimAngle: aim };
            return buf.predicted;
        } catch (e) { return { x: 0, y: 0, aimAngle: 0 }; }
    }

    function pendingCount(buf) {
        try { return buf && buf.pending ? buf.pending.length : 0; } catch (e) { return 0; }
    }

    var api = {
        BUTTON: BUTTON,
        MAX_SPEED: MAX_SPEED,
        SIM_DT: SIM_DT,
        buildFrame: buildFrame,
        buttonSet: buttonSet,
        createBuffer: createBuffer,
        stepPosition: stepPosition,
        pushInput: pushInput,
        reconcile: reconcile,
        pendingCount: pendingCount
    };

    try {
        var g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
        g.GraveGain2dBNet = g.GraveGain2dBNet || {};
        g.GraveGain2dBNet.Predict = api;
    } catch (e) { /* ignore */ }
    try { if (typeof module !== 'undefined' && module && module.exports) module.exports = api; } catch (e) { /* browser */ }
})();
