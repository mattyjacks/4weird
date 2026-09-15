/* GraveGain2dB: Breach MoonRock — B1 Player (health/races/abilities)
 * Path: v2/vcw4w/public/games/html/gravegain2dB/sim/player.js
 * Vanilla JS, no imports/exports (loaded via script tags AFTER sim/movement.js).
 * PURE SIM: no DOM/Canvas/Audio/fetch/WebSocket/React/localStorage/time calls.
 * Ability effects never destroy protected cells (enforced flag checked by engine).
 *
 * RACES (movement hooks; solo-clearable, no mandatory-route ability):
 * - Human: jetpack-correction (small upward correction while holding jump in air)
 * - Elf:   hover (reduced gravity + fall clamp while holding jump in air)
 * - Dwarf: weight (higher gravity, sets movement canDoubleJump hook point)
 * - Orc:   ground control (higher accel/friction; slightly lower top speed)
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.GraveGain2DB_Player) return;

  var TUNING = {
    VERSION: "0.1.0-b1",
    HP_MAX: 100,
    ARMOR_MAX: 50,       // flat damage soak pool, absorbs 60% while it lasts
    ARMOR_SOAK: 0.6,
    SHIELD_MAX: 25,      // regenerating energy pool (delay + rate)
    SHIELD_DELAY_MS: 2500,
    SHIELD_RATE: 12,     // per second
    IFRAME_MS: 500,      // brief invulnerability after hit
    RESPAWN_HP: 100,
    HUMAN_JETPACK: 900,  // upward correction accel while holding jump airborne
    HUMAN_JETPACK_MAX_RISE: -260, // clamp upward speed from correction
    ELF_GRAVITY_SCALE: 0.45,
    ELF_FALL_MAX: 140,
    DWARF_GRAVITY_SCALE: 1.18,
    ORC_ACCEL_SCALE: 1.25,
    ORC_FRICTION_SCALE: 1.3,
    ORC_TOPSPEED_SCALE: 0.94,
    RACE_CD_MS: 6000,    // F slot cooldown
    CLASS_CD_MS: 9000,   // R slot cooldown
    PROTECTED_CELLS: true // engine must refuse cell-destroy when true
  };

  var RACES = ["human", "elf", "dwarf", "orc"];

  function createPlayer(opts) {
    opts = opts || {};
    var race = (opts.race || "human").toLowerCase();
    if (RACES.indexOf(race) < 0) race = "human";
    var mv = (window.GraveGain2DB_Movement)
      ? window.GraveGain2DB_Movement.createState(opts)
      : { x: opts.x || 0, y: opts.y || 0, vx: 0, vy: 0 };
    return {
      race: race,
      cls: opts.cls || "breacher",
      hp: TUNING.HP_MAX,
      armor: opts.armor || 0,
      shield: TUNING.SHIELD_MAX,
      alive: true,
      iframesMs: 0,
      sinceHitMs: 9999,
      raceCdMs: 9999,    // F slot
      classCdMs: 9999,   // R slot
      checkpoint: { x: opts.x || 0, y: opts.y || 0 },
      move: mv,
      events: []
    };
  }

  function emit(p, ev) {
    p.events.push(ev);
    return ev;
  }

  // Pure damage model: shield -> armor soak -> hp. Returns damage applied.
  function damage(p, amount, hooks) {
    if (!p.alive) return 0;
    if (p.iframesMs > 0) { emit(p, { type: "blocked", reason: "iframe" }); return 0; }
    var amt = Math.max(0, amount);
    var rem = amt;
    if (p.shield > 0) {
      var s = Math.min(p.shield, rem);
      p.shield -= s; rem -= s;
    }
    if (rem > 0 && p.armor > 0) {
      var soak = Math.min(p.armor, rem * TUNING.ARMOR_SOAK);
      p.armor -= soak; rem -= soak;
    }
    p.hp -= rem;
    p.sinceHitMs = 0;
    p.iframesMs = TUNING.IFRAME_MS;
    emit(p, { type: "hit", amount: amt, hp: p.hp, armor: p.armor, shield: p.shield });
    if (hooks && typeof hooks.onEvent === "function") hooks.onEvent({ type: "hit", amount: amt });
    if (p.hp <= 0) { p.hp = 0; kill(p, hooks); }
    return amt;
  }

  function heal(p, amount) {
    if (!p.alive) return 0;
    var h = Math.max(0, amount);
    var before = p.hp;
    p.hp = Math.min(TUNING.HP_MAX, p.hp + h);
    emit(p, { type: "heal", amount: p.hp - before });
    return p.hp - before;
  }

  function kill(p, hooks) {
    p.alive = false;
    emit(p, { type: "death", race: p.race, x: p.move.x, y: p.move.y });
    if (hooks && typeof hooks.onEvent === "function") hooks.onEvent({ type: "death" });
    return p;
  }

  function restart(p, spawn) {
    spawn = spawn || p.checkpoint;
    p.hp = TUNING.RESPAWN_HP;
    p.armor = 0; p.shield = TUNING.SHIELD_MAX;
    p.alive = true; p.iframesMs = 0; p.sinceHitMs = 9999;
    p.raceCdMs = 9999; p.classCdMs = 9999;
    p.move.x = spawn.x; p.move.y = spawn.y;
    p.move.vx = 0; p.move.vy = 0;
    p.events = [];
    emit(p, { type: "restart", x: spawn.x, y: spawn.y });
    return p;
  }

  function setCheckpoint(p, x, y) {
    p.checkpoint = { x: x, y: y };
    emit(p, { type: "checkpoint", x: x, y: y });
    return p;
  }

  // Checkpoint respawn stub: engine calls on death-confirm; pure reposition.
  function respawnAtCheckpoint(p) { return restart(p, p.checkpoint); }

  // Race-movement hooks applied around the movement step (pure, dt-driven).
  function applyRacePre(p, dt) {
    var M = window.GraveGain2DB_Movement;
    if (!M) return;
    var T = M.TUNING;
    if (p.race === "dwarf") T.GRAVITY = 1800 * TUNING.DWARF_GRAVITY_SCALE;
    else if (p.race === "elf") T.GRAVITY = 1800 * TUNING.ELF_GRAVITY_SCALE;
    else T.GRAVITY = 1800;
    if (p.race === "orc") {
      T.RUN_ACCEL = 2400 * TUNING.ORC_ACCEL_SCALE;
      T.RUN_FRICTION = 2000 * TUNING.ORC_FRICTION_SCALE;
      T.RUN_MAX = 260 * TUNING.ORC_TOPSPEED_SCALE;
    } else {
      T.RUN_ACCEL = 2400; T.RUN_FRICTION = 2000; T.RUN_MAX = 260;
    }
  }

  function applyRacePost(p, input, dt) {
    var m = p.move;
    if (p.race === "elf" && input && input.jumpHeld && !m.grounded && !m.climbing) {
      if (m.vy > TUNING.ELF_FALL_MAX) {
        m.vy = TUNING.ELF_FALL_MAX; // hover: clamp fall while holding jump
        emit(p, { type: "hover", race: "elf" });
      }
    }
    if (p.race === "human" && input && input.jumpHeld && !m.grounded && !m.climbing) {
      m.vy -= TUNING.HUMAN_JETPACK * dt; // jetpack-correction: gentle rise
      if (m.vy < TUNING.HUMAN_JETPACK_MAX_RISE) m.vy = TUNING.HUMAN_JETPACK_MAX_RISE;
    }
  }

  // Ability slots: F = race, R = class. Cooldown-gated, solo-optional buffs only.
  // No ability destroys protected cells: every cast carries protectedCells:true
  // and the engine MUST refuse terrain destruction when the flag is set.
  function castRace(p) {
    if (!p.alive) return null;
    if (p.raceCdMs < TUNING.RACE_CD_MS) return null;
    p.raceCdMs = 0;
    var fx = { human: "jetburst", elf: "glide", dwarf: "stoneskin", orc: "warstomp" }[p.race];
    return emit(p, { type: "ability", slot: "F", race: p.race, fx: fx, protectedCells: true });
  }

  function castClass(p) {
    if (!p.alive) return null;
    if (p.classCdMs < TUNING.CLASS_CD_MS) return null;
    p.classCdMs = 0;
    return emit(p, { type: "ability", slot: "R", cls: p.cls, fx: "breach-pulse", protectedCells: true });
  }

  // Per-tick player step: cooldowns + shield regen + delegated movement step.
  // input: movement input plus {jumpHeld, racePressed(F), classPressed(R)}.
  function step(p, input, dt, hooks) {
    input = input || {};
    dt = (typeof dt === "number" && dt > 0) ? dt : 1 / 60;
    if (dt > 0.05) dt = 0.05;
    var dtMs = dt * 1000;
    p.events = [];
    p.raceCdMs += dtMs; p.classCdMs += dtMs;
    p.sinceHitMs += dtMs;
    if (p.iframesMs > 0) p.iframesMs = Math.max(0, p.iframesMs - dtMs);
    if (p.sinceHitMs >= TUNING.SHIELD_DELAY_MS && p.shield < TUNING.SHIELD_MAX) {
      p.shield = Math.min(TUNING.SHIELD_MAX, p.shield + TUNING.SHIELD_RATE * dt);
    }
    if (input.racePressed) castRace(p);
    if (input.classPressed) castClass(p);
    var M = window.GraveGain2DB_Movement;
    if (M && p.alive) {
      var pin = {
        left: input.left, right: input.right, up: input.up, down: input.down,
        jumpPressed: input.jumpPressed, dashPressed: input.dashPressed,
        slideHeld: input.slideHeld, grounded: input.grounded, landed: input.landed,
        onLadder: input.onLadder, aimX: input.aimX, aimY: input.aimY,
        firePressed: input.firePressed, recoilX: input.recoilX, recoilY: input.recoilY,
        canDoubleJump: (p.race === "dwarf") // Dwarf weight <-> double-jump hook
      };
      applyRacePre(p, dt);
      M.step(p.move, pin, dt, hooks);
      applyRacePost(p, input, dt);
      for (var i = 0; i < p.move.events.length; i++) p.events.push(p.move.events[i]);
    }
    return p;
  }

  var api = {
    TUNING: TUNING, RACES: RACES,
    createPlayer: createPlayer, damage: damage, heal: heal,
    kill: kill, restart: restart, setCheckpoint: setCheckpoint,
    respawnAtCheckpoint: respawnAtCheckpoint,
    castRace: castRace, castClass: castClass, step: step,
    version: TUNING.VERSION
  };
  window.GraveGain2DB_Player = api;
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: "b1-player", version: TUNING.VERSION, init: function () { return api; } });
})();
