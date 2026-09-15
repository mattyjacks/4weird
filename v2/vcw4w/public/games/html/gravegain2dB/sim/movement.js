/* GraveGain2dB: Breach MoonRock — B1 Movement Laboratory
 * Path: v2/vcw4w/public/games/html/gravegain2dB/sim/movement.js
 * Vanilla JS, no imports/exports (loaded via script tags).
 * PURE SIM: no DOM/Canvas/Audio/fetch/WebSocket/React/localStorage/time calls.
 * All math is a pure function of (state, input, dt). Rendering hooks via callbacks.
 *
 * CONTROLS (spec):
 * | Key         | Action            |
 * |-------------|-------------------|
 * | A / Left    | run left          |
 * | D / Right   | run right         |
 * | W / Up      | climb up (hold)   |
 * | S / Down    | climb down / slide|
 * | Space       | jump (buffered)   |
 * | Shift       | dash (buffered)   |
 * | E           | interact           |
 * | F           | race ability      |
 * | R           | class ability     |
 * | 1 / 2 / 3   | weapon swap       |
 * | Mouse / RS  | 360-degree aim    |
 *
 * GAMEPAD MAPPING (comment block, informational only):
 * - Left stick / D-pad : run (x) + climb (y, hold-to-climb, never auto)
 * - A (bottom)         : jump (buffered, coyote applies)
 * - RT / LB or L-stick click : dash (buffered, immediate start)
 * - X                  : interact (E)
 * - Y                  : race ability (F)
 * - B                  : class ability (R)
 * - LB/RB or D-pad L/R : weapon swap 1/2/3 cycle
 * - Right stick + RT aim: 360-degree aim vector (aimX/aimY); falls back to 8-dir
 * - Start              : pause (handled by engine, not sim)
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.GraveGain2DB_Movement) return;

  var TUNING = {
    VERSION: "0.1.0-b1",
    RUN_ACCEL: 2400,        // px/s^2 ground accel toward target run speed
    RUN_MAX: 260,           // px/s max run speed
    RUN_FRICTION: 2000,     // px/s^2 ground friction when no input
    AIR_ACCEL: 1400,        // px/s^2 air steering accel
    AIR_MAX: 250,           // px/s air clamp (soft; dash may exceed)
    AIR_DRAG: 120,          // px/s^2 air drag when no input
    GRAVITY: 1800,          // px/s^2 downward
    GRAVITY_CLIMB: 0,       // gravity suspended while climbing
    JUMP_VEL: 620,          // px/s jump impulse
    COYOTE_MS: 120,         // coyote time after leaving ground
    JUMP_BUFFER_MS: 150,    // jump input buffer window
    DOUBLE_JUMP_VEL: 520,   // Dwarf hook point: second jump impulse
    DASH_SPEED: 640,        // px/s dash velocity
    DASH_TIME_MS: 140,      // dash active duration
    DASH_COOLDOWN_MS: 700,  // dash cooldown
    DASH_BUFFER_MS: 150,    // dash input buffer window
    SLIDE_BOOST: 180,       // extra px/s when slide starts grounded w/ speed
    SLIDE_FRICTION: 900,    // slide decel px/s^2
    CLIMB_SPEED: 150,       // px/s ladder/rope climb
    AIM_FALLBACK_DEADZONE: 0.15,
    CAM_LERP: 5.0,          // camera follow lerp rate (1/s)
    CAM_LOOKAHEAD: 48,      // px lookahead along facing/aim
    CAM_LOOKAHEAD_Y: 24,
    MAX_FALL: 900           // terminal velocity px/s
  };

  function createState(opts) {
    opts = opts || {};
    return {
      x: opts.x || 0,
      y: opts.y || 0,
      vx: 0,
      vy: 0,
      facing: 1,            // 1 right, -1 left
      grounded: true,
      climbing: false,
      onLadder: false,      // set by collision/world query before step
      groundMs: 9999,       // ms since last grounded (for coyote)
      jumpBufMs: 9999,      // ms since jump pressed (buffer)
      dashBufMs: 9999,      // ms since dash pressed (buffer)
      dashTms: 9999,        // ms since dash started
      dashCdMs: 9999,       // ms since dash ended (cooldown tracker)
      dashing: false,
      dashDirX: 1,
      dashDirY: 0,
      jumpsUsed: 0,         // resets on ground; double-jump hook at 1
      canDoubleJump: !!opts.canDoubleJump, // Dwarf hook: engine sets true
      sliding: false,
      coyoteOk: false,
      aimX: 1, aimY: 0,     // normalized 360 aim
      aimDir8: "E",         // 8-dir fallback label
      camX: opts.x || 0,
      camY: opts.y || 0,
      tMs: 0,
      events: []            // drained per step: {type, ...}
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function aim8Label(x, y) {
    var ax = Math.abs(x), ay = Math.abs(y);
    if (ax < 0.15 && ay < 0.15) return "E";
    var h = x > 0.15 ? "E" : (x < -0.15 ? "W" : "");
    var v = y < -0.15 ? "N" : (y > 0.15 ? "S" : "");
    // y-up naming: input uses screen coords (down+), map to N-up label
    var s = (v + h) || "E";
    var map = { N: "N", S: "S", E: "E", W: "W", NE: "NE", NW: "NW", SE: "SE", SW: "SW" };
    // v computed with screen-y; flip to compass: screen up (y<0) = N
    var raw = v + h;
    return map[raw] || "E";
  }

  function resolveAim(input, st) {
    var ax = 0, ay = 0, has360 = false;
    if (input && typeof input.aimX === "number" && typeof input.aimY === "number") {
      var m = Math.sqrt(input.aimX * input.aimX + input.aimY * input.aimY);
      if (m > TUNING.AIM_FALLBACK_DEADZONE) {
        ax = input.aimX / m; ay = input.aimY / m; has360 = true;
      }
    }
    if (!has360 && input) {
      // 8-dir keyboard fallback from run/climb axes
      var kx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      var ky = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (kx !== 0 || ky !== 0) {
        var n = Math.sqrt(kx * kx + ky * ky);
        ax = kx / n; ay = ky / n;
      } else { ax = st.facing; ay = 0; }
    }
    st.aimX = ax; st.aimY = ay;
    st.aimDir8 = aim8Label(ax, ay);
    return st;
  }

  // input shape (all optional, defaults false/0):
  // {left,right,up,down,jumpPressed,dashPressed,slideHeld,canDoubleJump,onLadder,
  //  aimX,aimY,firePressed,recoilX,recoilY,worldSolid(x,y)->bool (optional, unused default)}
  // hooks: {onEvent(ev)} — receives recoil / muzzle-flash events (rendering side).
  function step(state, input, dt, hooks) {
    input = input || {};
    dt = (typeof dt === "number" && dt > 0) ? dt : 1 / 60;
    if (dt > 0.05) dt = 0.05; // clamp huge tabs; deterministic given same seq
    var dtMs = dt * 1000;

    var s = state;
    s.tMs += dtMs;
    s.events = [];
    function emit(ev) {
      s.events.push(ev);
      if (hooks && typeof hooks.onEvent === "function") hooks.onEvent(ev);
    }

    var ix = (input.right ? 1 : 0) - (input.left ? 1 : 0); // -1..1
    var iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);    // down positive
    if (ix !== 0) s.facing = ix > 0 ? 1 : -1;
    if (typeof input.canDoubleJump === "boolean") s.canDoubleJump = input.canDoubleJump;
    s.onLadder = !!input.onLadder;

    // timers advance
    s.groundMs += s.grounded ? -s.groundMs : dtMs; // reset below when grounded
    if (s.grounded) s.groundMs = 0; else s.groundMs += dtMs;
    s.jumpBufMs += dtMs; s.dashBufMs += dtMs;
    s.dashTms += dtMs; s.dashCdMs += dtMs;
    if (input.jumpPressed) s.jumpBufMs = 0;
    if (input.dashPressed) s.dashBufMs = 0;

    // --- CLIMB: hold-to-climb, never auto ---
    var wantClimb = s.onLadder && (!!input.up || !!input.down) && !s.dashing;
    s.climbing = wantClimb;
    if (s.climbing) {
      s.vx = 0; s.vy = 0;
      var cy = ((input.up ? -1 : 0) + (input.down ? 1 : 0)) * TUNING.CLIMB_SPEED;
      s.vy = cy;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.jumpsUsed = 0;
      s.grounded = false; s.groundMs = 9999;
      // jump off ladder still allowed via buffer
      if (s.jumpBufMs <= TUNING.JUMP_BUFFER_MS) {
        s.vy = -TUNING.JUMP_VEL;
        s.climbing = false;
        s.jumpBufMs = 9999; s.jumpsUsed = 1;
        emit({ type: "jump", from: "climb", x: s.x, y: s.y });
      }
      resolveAim(input, s);
      cameraFollow(s, dt, input);
      return s;
    }

    // --- DASH / SLIDE: buffered + immediate start (reconcile later) ---
    var dashReady = s.dashCdMs >= TUNING.DASH_COOLDOWN_MS && !s.dashing;
    if (s.dashBufMs <= TUNING.DASH_BUFFER_MS && dashReady) {
      s.dashing = true; s.dashTms = 0; s.dashCdMs = 0;
      s.dashBufMs = 9999;
      // direction: aim if airborne & aiming, else facing (+down for slide)
      var dx = s.facing, dy = 0;
      if (!s.grounded && (Math.abs(s.aimX) > 0.01 || Math.abs(s.aimY) > 0.01)) {
        dx = s.aimX; dy = s.aimY;
      } else if (s.grounded && !!input.down) {
        s.sliding = true;
        emit({ type: "slide", x: s.x, y: s.y, vx: s.vx });
      }
      var dl = Math.sqrt(dx * dx + dy * dy) || 1;
      s.dashDirX = dx / dl; s.dashDirY = dy / dl;
      emit({ type: "dash", dirX: s.dashDirX, dirY: s.dashDirY, x: s.x, y: s.y });
    }
    if (s.dashing) {
      s.vx = s.dashDirX * TUNING.DASH_SPEED;
      s.vy = s.dashDirY * TUNING.DASH_SPEED;
      if (s.grounded && s.sliding) s.vx += s.facing * TUNING.SLIDE_BOOST * 0.25;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.dashTms >= TUNING.DASH_TIME_MS) {
        s.dashing = false; s.sliding = false;
        s.dashCdMs = 0;
        s.vx *= 0.45; s.vy *= 0.45; // reconcile point: momentum carry, tuned later
        emit({ type: "dashEnd", x: s.x, y: s.y });
      }
      resolveAim(input, s);
      weaponHooks(s, input, emit);
      cameraFollow(s, dt, input);
      return s;
    }

    // --- RUN (ground) / AIR STEER ---
    if (s.grounded) {
      if (ix !== 0) {
        var target = ix * TUNING.RUN_MAX;
        var d = target - s.vx;
        var mx = TUNING.RUN_ACCEL * dt;
        s.vx += clamp(d, -mx, mx);
        s.sliding = false;
      } else if (s.sliding && Math.abs(s.vx) > 20) {
        s.vx -= clamp(s.vx, -TUNING.SLIDE_FRICTION * dt, TUNING.SLIDE_FRICTION * dt);
      } else {
        s.sliding = false;
        var f = TUNING.RUN_FRICTION * dt;
        if (Math.abs(s.vx) <= f) s.vx = 0; else s.vx -= (s.vx > 0 ? f : -f);
      }
      // ground slide trigger: down + speed + run key
      if (!!input.down && Math.abs(s.vx) > TUNING.RUN_MAX * 0.6 && ix !== 0) {
        if (!s.sliding) emit({ type: "slide", x: s.x, y: s.y, vx: s.vx });
        s.sliding = true;
      } else if (!input.down) { s.sliding = false; }
    } else {
      if (ix !== 0) {
        s.vx += ix * TUNING.AIR_ACCEL * dt;
        s.vx = clamp(s.vx, -TUNING.AIR_MAX, TUNING.AIR_MAX);
      } else {
        var dr = TUNING.AIR_DRAG * dt;
        if (Math.abs(s.vx) <= dr) s.vx = 0; else s.vx -= (s.vx > 0 ? dr : -dr);
      }
    }

    // --- GRAVITY ---
    s.vy += TUNING.GRAVITY * dt;
    if (s.vy > TUNING.MAX_FALL) s.vy = TUNING.MAX_FALL;

    // --- JUMP: 120ms coyote + 150ms buffer; double-jump hook (Dwarf) ---
    var coyote = (!s.grounded && s.groundMs <= TUNING.COYOTE_MS) || s.grounded;
    if (s.jumpBufMs <= TUNING.JUMP_BUFFER_MS) {
      if (s.grounded || coyote) {
        if (s.grounded || s.jumpsUsed === 0) {
          s.vy = -TUNING.JUMP_VEL;
          s.grounded = false; s.groundMs = 9999;
          s.jumpBufMs = 9999; s.jumpsUsed = 1;
          emit({ type: "jump", from: s.grounded ? "ground" : "coyote", x: s.x, y: s.y });
        }
      } else if (s.jumpsUsed === 1 && s.canDoubleJump) {
        // DOUBLE-JUMP HOOK POINT (Dwarf): engine may gate/animate; solo-safe.
        s.vy = -TUNING.DOUBLE_JUMP_VEL;
        s.jumpBufMs = 9999; s.jumpsUsed = 2;
        emit({ type: "doubleJump", race: "dwarf", x: s.x, y: s.y });
      }
    }

    // --- INTEGRATE (collision resolved by engine/world; sim stays pure) ---
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    // Engine reports landing via input.landed / input.grounded each tick:
    if (typeof input.grounded === "boolean") {
      if (input.grounded && !s.grounded) {
        s.grounded = true; s.groundMs = 0; s.jumpsUsed = 0;
        s.vy = 0;
        emit({ type: "land", x: s.x, y: s.y });
      } else if (!input.grounded && s.grounded && !input.jumpPressed) {
        // walked off a ledge: keep grounded=false, groundMs starts counting
        s.grounded = false;
      } else if (input.grounded) {
        s.grounded = true; s.groundMs = 0;
      }
    }

    resolveAim(input, s);
    weaponHooks(s, input, emit);
    cameraFollow(s, dt, input);
    return s;
  }

  // Recoil + muzzle-flash event hooks (rendering side plays them; sim only emits).
  function weaponHooks(s, input, emit) {
    if (input && input.firePressed) {
      var rx = (typeof input.recoilX === "number") ? input.recoilX : -s.facing * 60;
      var ry = (typeof input.recoilY === "number") ? input.recoilY : -20;
      s.vx += rx * 0.016; // small deterministic nudge scaled per-tick
      s.vy += ry * 0.016;
      emit({ type: "muzzle", aimX: s.aimX, aimY: s.aimY, dir8: s.aimDir8, x: s.x, y: s.y });
      emit({ type: "recoil", dvx: rx * 0.016, dvy: ry * 0.016 });
    }
  }

  // Camera follow stub: exponential lerp + lookahead along facing/aim.
  function cameraFollow(s, dt, input) {
    var tx = s.x + s.facing * TUNING.CAM_LOOKAHEAD * 0.5 + s.aimX * TUNING.CAM_LOOKAHEAD * 0.5;
    var ty = s.y + s.aimY * TUNING.CAM_LOOKAHEAD + TUNING.CAM_LOOKAHEAD_Y * 0.25;
    var k = 1 - Math.exp(-TUNING.CAM_LERP * dt);
    s.camX += (tx - s.camX) * k;
    s.camY += (ty - s.camY) * k;
    return s;
  }

  var api = { TUNING: TUNING, createState: createState, step: step, version: TUNING.VERSION };
  window.GraveGain2DB_Movement = api;
  window.GraveGainMods = window.GraveGainMods || [];
  window.GraveGainMods.push({ name: "b1-movement", version: TUNING.VERSION, init: function () { return api; } });
})();
