'use strict';
/* GraveGain2dB movement lab — run / jump / double-jump / dash / ladders.
 * Fixed-timestep friendly pure logic: step(body, input, world, nowMs, dt).
 * world = { moveX(body, dx)->hitWall, moveY(body, dy)->{hitFloor,hitCeiling},
 *           ladderAt(x, y)->bool, gravityScale }
 * Ladders are hold-to-grab and NEVER auto-climb: entry requires a held
 * up/down input on a ladder cell; releasing sticks (cling), jump leaps off.
 * Global: window.GraveGain2dBPlayerMovement
 */
(function (root) {
  var TUNING = {
    runSpeed: 260,        // px/s top ground speed
    airControl: 0.65,     // fraction of ground accel while airborne
    groundAccel: 2600,    // px/s^2
    gravity: 1800,        // px/s^2
    fastFall: 2600,       // px/s^2 while holding down in air
    jumpVel: 560,         // px/s
    doubleJumpVel: 500,   // px/s
    maxFall: 900,         // px/s terminal velocity
    coyoteMs: 120,        // grace after leaving a ledge
    jumpBufferMs: 150,    // pre-landing jump memory
    dashBufferMs: 150,    // dash press memory
    dashSpeed: 720,       // px/s during dash
    dashTimeMs: 150,      // dash duration
    dashIframeMs: 200,    // invulnerability from dash start
    dashCooldownMs: 450,  // between dashes
    climbSpeed: 170,      // px/s on ladders
    ladderLeapVel: 420    // jump vel when leaping off a ladder
  };

  function createBody(x, y, w, h) {
    return {
      x: x || 0, y: y || 0, w: w || 22, h: h || 34,
      vx: 0, vy: 0, facing: 1,
      onGround: false,
      coyoteUntil: -1e9,
      jumpBufferUntil: -1e9,
      dashBufferUntil: -1e9,
      jumpsUsed: 0,       // reset on landing; 1 = ground jump spent
      dashUntil: -1e9,
      dashCDUntil: -1e9,
      iframeUntil: -1e9,
      climbing: false,
      dashDirX: 1, dashDirY: 0,
      jumpQueued: false, dashedThisStep: false, jumpedThisStep: false,
      landEvent: false
    };
  }

  function queueJump(body, nowMs) { body.jumpBufferUntil = nowMs + TUNING.jumpBufferMs; }
  function queueDash(body, nowMs) { body.dashBufferUntil = nowMs + TUNING.dashBufferMs; }

  function invulnerable(body, nowMs) { return nowMs < body.iframeUntil; }
  function dashReady(body, nowMs) { return nowMs >= body.dashCDUntil; }

  function step(body, input, world, nowMs, dt) {
    body.jumpedThisStep = false;
    body.dashedThisStep = false;
    body.landEvent = false;

    var left = !!input.down.moveLeft;
    var right = !!input.down.moveRight;
    var up = !!input.down.up;
    var down = !!input.down.down;
    var moveDir = (right ? 1 : 0) - (left ? 1 : 0);
    if (moveDir !== 0) body.facing = moveDir;

    if (input.pressed && input.pressed.jump) queueJump(body, nowMs);
    if (input.pressed && input.pressed.dash) queueDash(body, nowMs);

    var wasGround = body.onGround;
    var cx = body.x + body.w / 2;
    var cy = body.y + body.h / 2;
    var onLadderCell = world.ladderAt ? !!world.ladderAt(cx, cy) : false;

    // --- ladders: hold-to-grab, never automatic -------------------------
    if (!onLadderCell) {
      body.climbing = false;
    } else if (!body.climbing && (up || down)) {
      body.climbing = true; // entry ONLY while holding up/down
      body.vx = 0; body.vy = 0;
    }
    if (body.climbing) {
      if (!onLadderCell) {
        body.climbing = false;
      } else if (input.pressed && input.pressed.jump) {
        // leap off: keep facing, small hop, clear buffer
        body.climbing = false;
        body.vy = -TUNING.ladderLeapVel;
        body.vx = body.facing * TUNING.runSpeed * 0.6;
        body.jumpBufferUntil = -1e9;
        body.jumpsUsed = 1;
        body.jumpedThisStep = true;
      } else if (up || down) {
        body.vy = ((down ? 1 : 0) - (up ? 1 : 0)) * TUNING.climbSpeed;
        body.vx = moveDir * TUNING.runSpeed * 0.4;
      } else {
        body.vx = 0; body.vy = 0; // cling in place while holding the ladder
      }
      if (body.climbing) {
        if (world.moveX) world.moveX(body, body.vx * dt);
        var res = world.moveY ? world.moveY(body, body.vy * dt) : null;
        body.onGround = !!(res && res.hitFloor);
        if (body.onGround && down) body.climbing = false; // stepped off bottom
        return body;
      }
      // fell through from leap: continue to air physics below
    }

    var dashing = nowMs < body.dashUntil;

    // --- dash trigger ----------------------------------------------------
    if (!dashing && nowMs <= body.dashBufferUntil && dashReady(body, nowMs)) {
      body.dashBufferUntil = -1e9;
      body.dashUntil = nowMs + TUNING.dashTimeMs;
      body.dashCDUntil = nowMs + TUNING.dashCooldownMs;
      body.iframeUntil = nowMs + TUNING.dashIframeMs;
      var ddx = moveDir !== 0 ? moveDir : body.facing;
      body.dashDirX = ddx; body.dashDirY = 0;
      body.vx = ddx * TUNING.dashSpeed;
      body.vy = 0;
      body.dashedThisStep = true;
      dashing = true;
    }

    if (dashing) {
      if (world.moveX) world.moveX(body, body.vx * dt);
      var dres = world.moveY ? world.moveY(body, 0) : null;
      if (dres && (dres.hitFloor || dres.hitCeiling)) { /* keep sliding */ }
      if (nowMs >= body.dashUntil) {
        body.vx = body.dashDirX * TUNING.runSpeed * 0.6;
      }
      body.onGround = !!(dres && dres.hitFloor);
      if (!wasGround && body.onGround) { body.landEvent = true; body.jumpsUsed = 0; }
      return body;
    }

    // --- horizontal: air steering ---------------------------------------
    var target = moveDir * TUNING.runSpeed;
    var ctl = body.onGround ? 1 : TUNING.airControl;
    var accel = TUNING.groundAccel * ctl;
    if (body.vx < target) body.vx = Math.min(target, body.vx + accel * dt);
    else if (body.vx > target) body.vx = Math.max(target, body.vx - accel * dt);

    // --- gravity ---------------------------------------------------------
    var g = TUNING.gravity * (world.gravityScale || 1);
    if (down && !body.onGround) g = TUNING.fastFall; // slam down
    body.vy = Math.min(TUNING.maxFall, body.vy + g * dt);

    // --- jumping: coyote + buffer + double -------------------------------
    var buffered = nowMs <= body.jumpBufferUntil;
    var coyote = nowMs <= body.coyoteUntil;
    if (buffered) {
      if (body.onGround || coyote) {
        body.vy = -TUNING.jumpVel;
        body.onGround = false;
        body.coyoteUntil = -1e9;
        body.jumpBufferUntil = -1e9;
        body.jumpsUsed = 1;
        body.jumpedThisStep = true;
      } else if (body.jumpsUsed < 2) {
        body.vy = -TUNING.doubleJumpVel;
        body.jumpBufferUntil = -1e9;
        body.jumpsUsed = 2;
        body.jumpedThisStep = true;
      }
    }

    if (world.moveX) {
      var hitWall = world.moveX(body, body.vx * dt);
      if (hitWall) body.vx = 0;
    }
    var mres = world.moveY ? world.moveY(body, body.vy * dt) : null;
    var grounded = !!(mres && mres.hitFloor);
    if (mres && mres.hitCeiling && body.vy < 0) body.vy = 0;
    if (!wasGround && grounded) {
      body.landEvent = true;
      body.jumpsUsed = 0;
      body.vy = 0;
    }
    if (!grounded && wasGround && body.vy >= 0) {
      body.coyoteUntil = nowMs + TUNING.coyoteMs; // walked off a ledge
    }
    if (grounded) {
      body.coyoteUntil = nowMs + TUNING.coyoteMs;
      if (body.jumpsUsed !== 0 && !body.jumpedThisStep) body.jumpsUsed = 0;
    }
    body.onGround = grounded;
    return body;
  }

  root.GraveGain2dBPlayerMovement = {
    TUNING: TUNING,
    createBody: createBody,
    queueJump: queueJump,
    queueDash: queueDash,
    invulnerable: invulnerable,
    dashReady: dashReady,
    step: step
  };
})(typeof window !== 'undefined' ? window : globalThis);
