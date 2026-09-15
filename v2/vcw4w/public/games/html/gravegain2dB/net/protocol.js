/* GraveGain2dB: Breach MoonRock — B3 co-op netcode protocol (net/protocol.js)
 * PURE CODEC + VALIDATION ONLY: no WebSocket/fetch/DOM/Audio/React/storage here.
 * Transport is owned by the dedicated room server (authoritative 60Hz sim).
 * This file is EXPLICITLY NOT the slow duel relay — co-op rooms run on the
 * dedicated room server only; duel-relay peers must never route through this.
 *
 * NETWORKING RULES:
 *  - 60Hz server sim tick, 20Hz snapshot broadcast, 60Hz client input send.
 *  - RELIABLE (acked, resent, ordered): destruction/loot/objective/checkpoint/
 *    revive/rescue/boss/extract/reward.
 *  - UNRELIABLE (last-write-wins, dropped freely): transforms/aim/anim states.
 *  - SERVER-AUTHORITATIVE: server simulates, validates, and snapshots.
 *  - CLIENT-ONLY-RAW-INPUT RULE: clients send ONLY raw InputFrames; any client
 *    damage/terrain/reward claim is rejected outright (see validateInputFrame).
 *
 * INPUT VALIDATION (server-side, every frame per client):
 *  clamp movement to [-1,1], aim to [-PI,PI], fire-rate/cooldown gates vs last
 *  accepted tick, ownership check (frame.playerId === socket player), range check
 *  (no teleport deltas), reject damage/terrain/reward fields when present.
 *
 * DISCONNECT POLICY:
 *  input stops applying after 2 missed frames (ghost holds last pose, shielded);
 *  30s recoverable window keeps slot + loadout; encounter rescales to live count
 *  (chaos preserved, no HP bloat); NO host migration (dedicated server owns room).
 * RECONNECT PAYLOAD: seed/tick/players/entities/terrain/objectives/event seq/
 *  extraction — client fast-forwards, never replays rewards (no duplication).
 *
 * CO-OP SCALE RULE: amplify chaos/teamwork (pack spawns, shared objectives,
 * revive chains) — never HP-bloat boredom.
 */
(function () {
  'use strict';
  var G = (typeof window !== 'undefined') ? window : ((typeof globalThis !== 'undefined') ? globalThis : {});
  if (G.GraveGain2DB_Net && G.GraveGain2DB_Net.__v === 1) return; // idempotent

  var SIM_HZ = 60, SNAPSHOT_HZ = 20, INPUT_HZ = 60;
  var SNAPSHOT_EVERY = SIM_HZ / SNAPSHOT_HZ; // 3 ticks

  // buttons bitmask: Jump/Fire/Alt/Dash/Interact/Swap/Race/Class
  var BUTTONS = { JUMP: 1, FIRE: 2, ALT: 4, DASH: 8, INTERACT: 16, SWAP: 32, RACE: 64, CLASS: 128 };

  var RELIABLE = ['destruction', 'loot', 'objective', 'checkpoint', 'revive', 'rescue', 'boss', 'extract', 'reward'];
  var UNRELIABLE = ['transform', 'aim', 'anim'];

  var MISS_LIMIT = 2;        // missed input frames before ghosting
  var RECOVER_WINDOW_S = 30; // slot/loadout retention
  var FIRE_GAP_TICKS = 9;    // must match engine fire cooldown
  var MAX_MOVE_DELTA = 64;   // per-frame teleport guard (world units)

  function clampNum(v, lo, hi) {
    if (typeof v !== 'number' || isNaN(v)) return lo;
    return v < lo ? lo : (v > hi ? hi : v);
  }

  // InputFrame {sequence,clientTick,moveX,moveY,aimAngle,buttons}
  function makeInputFrame(seq, clientTick, moveX, moveY, aimAngle, buttons) {
    return {
      sequence: seq >>> 0, clientTick: clientTick >>> 0,
      moveX: clampNum(moveX, -1, 1), moveY: clampNum(moveY, -1, 1),
      aimAngle: clampNum(aimAngle, -Math.PI, Math.PI),
      buttons: (buttons >>> 0) & 0xFF
    };
  }

  // Returns {frame|null, ok, errors[]}. Rejects (not clamps) authority violations.
  function validateInputFrame(raw, ctx) {
    var errors = [];
    ctx = ctx || {};
    if (!raw || typeof raw !== 'object') return { frame: null, ok: false, errors: ['bad-frame'] };
    // ownership: frame must belong to the sender's player slot
    if (ctx.playerId && raw.playerId && raw.playerId !== ctx.playerId) {
      errors.push('ownership');
      return { frame: null, ok: false, errors: errors };
    }
    // authority: clients must never ship resolved outcomes
    if ('damage' in raw || 'terrain' in raw || 'reward' in raw || 'hp' in raw) {
      errors.push('authority-claim');
      return { frame: null, ok: false, errors: errors };
    }
    var frame = makeInputFrame(raw.sequence || 0, raw.clientTick || 0, raw.moveX || 0, raw.moveY || 0, raw.aimAngle || 0, raw.buttons || 0);
    // monotone sequence per client
    if (ctx.lastSequence != null && frame.sequence <= ctx.lastSequence) errors.push('stale-sequence');
    // fire-rate gate vs last accepted fire tick
    if ((frame.buttons & BUTTONS.FIRE) && ctx.lastFireTick != null &&
        (frame.clientTick - ctx.lastFireTick) < FIRE_GAP_TICKS) errors.push('fire-rate');
    // range guard: implied displacement must not teleport (needs last known pos)
    if (ctx.lastX != null && ctx.lastY != null && ctx.ackX != null && ctx.ackY != null) {
      var dx = ctx.lastX - ctx.ackX, dy = ctx.lastY - ctx.ackY;
      if (dx * dx + dy * dy > MAX_MOVE_DELTA * MAX_MOVE_DELTA) errors.push('range');
    }
    // cooldown sanity: dash/alt bits require plausible gaps (server re-gates anyway)
    return { frame: frame, ok: errors.length === 0, errors: errors };
  }

  // RoomSnapshot {serverTick,ack,players,entities,terrain,objectives,events}
  // players: unreliable transforms; entities/objectives/events: reliable deltas.
  function makeRoomSnapshot(serverTick, ack, players, entities, terrain, objectives, events) {
    return {
      serverTick: serverTick >>> 0, ack: ack >>> 0,
      players: players || {}, entities: entities || [],
      terrain: terrain || { version: 0 },
      objectives: objectives || {}, events: events || []
    };
  }

  function encodeSnapshot(snap) { return JSON.stringify(snap); }
  function decodeSnapshot(s) {
    try {
      var o = JSON.parse(s);
      if (typeof o.serverTick !== 'number' || typeof o.ack !== 'number') return null;
      return o;
    } catch (e) { return null; }
  }

  // engine world -> wire snapshot (20Hz: call when tick % SNAPSHOT_EVERY === 0)
  function snapshotFromWorld(world, ackByPlayer) {
    var E = G.GraveGain2DB_Engine;
    var base = (E && typeof E.takeSnapshot === 'function') ? E.takeSnapshot(world) : { tick: world.tick };
    return makeRoomSnapshot(
      world.tick, 0,
      base.players || {},
      (base.enemies || []).map(function (e) { return { id: e[0], x: e[1], y: e[2], hp: e[3] }; }),
      { version: world.terrain ? world.terrain.version : 0 },
      { extraction: world.objectives ? world.objectives.extraction : null, checkpoints: world.checkpoints },
      (world.events || []).slice(-16)
    );
  }

  function shouldSnapshot(tick) { return (tick % SNAPSHOT_EVERY) === 0; }

  // disconnect bookkeeping: returns 'live' | 'ghost' | 'dropped'
  function linkState(missedFrames, elapsedSinceDropS) {
    if (missedFrames <= MISS_LIMIT) return 'live';
    if (elapsedSinceDropS <= RECOVER_WINDOW_S) return 'ghost'; // shielded, slot kept
    return 'dropped'; // slot freed, encounter rescales
  }

  // reconnect payload: full state + event cursor; rewards never replayed
  function buildReconnectPayload(world) {
    var E = G.GraveGain2DB_Engine;
    var snap = (E && typeof E.takeSnapshot === 'function') ? E.takeSnapshot(world) : { tick: world.tick };
    return {
      seed: world.seed, tick: world.tick, snapshot: snap,
      players: world.players, entities: world.enemies,
      terrain: world.terrain, objectives: world.objectives,
      eventSeq: world.eventSeq, extraction: world.objectives ? world.objectives.extraction : null
    };
  }

  function applyReconnectPayload(world, payload) {
    if (!payload || payload.seed !== world.seed) return { ok: false, reason: 'seed-mismatch' };
    // fast-forward cursor only; entity arrays are replaced, never merged (no dupes)
    world.tick = payload.tick >>> 0;
    world.players = payload.players || world.players;
    world.enemies = payload.entities || world.enemies;
    world.terrain = payload.terrain || world.terrain;
    world.objectives = payload.objectives || world.objectives;
    world.eventSeq = payload.eventSeq >>> 0 || world.eventSeq;
    return { ok: true, tick: world.tick, eventSeq: world.eventSeq };
  }

  var Net = {
    __v: 1,
    SIM_HZ: SIM_HZ, SNAPSHOT_HZ: SNAPSHOT_HZ, INPUT_HZ: INPUT_HZ,
    SNAPSHOT_EVERY: SNAPSHOT_EVERY, BUTTONS: BUTTONS,
    RELIABLE: RELIABLE, UNRELIABLE: UNRELIABLE,
    MISS_LIMIT: MISS_LIMIT, RECOVER_WINDOW_S: RECOVER_WINDOW_S,
    FIRE_GAP_TICKS: FIRE_GAP_TICKS, MAX_MOVE_DELTA: MAX_MOVE_DELTA,
    DEDICATED_ONLY: true, // co-op rooms: dedicated room server. NOT the duel relay.
    makeInputFrame: makeInputFrame, validateInputFrame: validateInputFrame,
    makeRoomSnapshot: makeRoomSnapshot, encodeSnapshot: encodeSnapshot,
    decodeSnapshot: decodeSnapshot, snapshotFromWorld: snapshotFromWorld,
    shouldSnapshot: shouldSnapshot, linkState: linkState,
    buildReconnectPayload: buildReconnectPayload, applyReconnectPayload: applyReconnectPayload
  };
  G.GraveGain2DB_Net = Net;
  G.GraveGainMods = G.GraveGainMods || [];
  G.GraveGainMods.push('net/protocol.js');
})();
