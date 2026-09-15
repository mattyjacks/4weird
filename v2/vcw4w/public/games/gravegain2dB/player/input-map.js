'use strict';
/* GraveGain2dB movement lab — keyboard/mouse + gamepad input map.
 * Mirrors the Controls table in v2/vcw4w/docs/gravegain2dB-game-spec.md.
 * No DOM access at import time; attach*() wires listeners on demand.
 * Global: window.GraveGain2dBPlayerInput
 */
(function (root) {
  // Exact transcription of the spec Controls table. Verification gate
  // (node self-test in final report) asserts this row-for-row.
  var SPEC_TABLE = [
    { action: 'move',    keyboard: 'A/D or Left/Right', gamepad: 'Left stick / D-pad' },
    { action: 'climb',   keyboard: 'W/S on ladders',    gamepad: 'Left stick / D-pad' },
    { action: 'jump',    keyboard: 'Space',             gamepad: 'South button' },
    { action: 'aim',     keyboard: 'Mouse',             gamepad: 'Right stick' },
    { action: 'fire',    keyboard: 'Left mouse',        gamepad: 'Right trigger' },
    { action: 'altfire', keyboard: 'Right mouse or Q',  gamepad: 'Left trigger / shoulder' },
    { action: 'dash',    keyboard: 'Shift',             gamepad: 'East button' },
    { action: 'interact',keyboard: 'E',                 gamepad: 'West button' },
    { action: 'swap',    keyboard: '1-3 / mouse wheel', gamepad: 'D-pad' },
    { action: 'pause',   keyboard: 'Esc',               gamepad: 'Menu' }
  ];

  // Timing expectations the movement layer must honour (authoritative
  // values live in GraveGain2dBPlayerMovement.TUNING; the gate
  // cross-checks them against this table).
  var EXPECTED_TIMING = {
    coyoteMs: 120,
    jumpBufferMs: 150,
    dashBufferMs: 150
  };

  var KEY_TO_ACTION = {
    KeyA: 'moveLeft', ArrowLeft: 'moveLeft',
    KeyD: 'moveRight', ArrowRight: 'moveRight',
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    Space: 'jump',
    ShiftLeft: 'dash', ShiftRight: 'dash',
    KeyE: 'interact',
    KeyQ: 'altfire',
    Digit1: 'swap1', Digit2: 'swap2', Digit3: 'swap3',
    Escape: 'pause'
  };

  // Standard gamepad mapping (W3C standard layout indices).
  var PAD = {
    axes: { moveX: 0, moveY: 1, aimX: 2, aimY: 3 },
    buttons: {
      jump: 0,     // South
      dash: 1,     // East
      interact: 2, // West
      altfire: 4,  // Left shoulder/trigger lane (also 6 analogue)
      fire: 7,     // Right trigger (analogue)
      swapUp: 12, swapDown: 13, swapLeft: 14, swapRight: 15, // D-pad
      pause: 9     // Menu / start
    },
    stickDeadzone: 0.22,
    triggerThreshold: 0.35
  };

  function createSlot(kind) {
    return {
      kind: kind || 'kbd', // 'kbd' (keyboard+mouse, player slot 0) or 'pad'
      down: {},            // action -> true while held
      pressed: {},         // action -> true only on the frame it went down
      released: {},        // action -> true only on the frame it went up
      moveAxis: 0,         // -1..1 analogue strafe (pad left stick / D-pad)
      aimScreen: { x: 0, y: 0, active: false }, // mouse aim, CSS px in canvas
      stickAim: { x: 0, y: 0, active: false },  // right-stick unit vector
      wheel: 0,            // accumulated wheel delta for weapon swap
      jumpBufferedAt: -1e9,
      dashBufferedAt: -1e9,
      lastDevice: kind || 'kbd',
      _detach: []
    };
  }

  function setDown(slot, action, isDown, nowMs) {
    var was = !!slot.down[action];
    if (isDown && !was) {
      slot.down[action] = true;
      slot.pressed[action] = true;
      if (action === 'jump') slot.jumpBufferedAt = nowMs;
      if (action === 'dash') slot.dashBufferedAt = nowMs;
    } else if (!isDown && was) {
      slot.down[action] = false;
      slot.released[action] = true;
    }
  }

  function beginFrame(slot) {
    slot.pressed = {};
    slot.released = {};
    slot.wheel = 0;
  }

  function attachKeyboard(slot, target) {
    target = target || (typeof window !== 'undefined' ? window : null);
    if (!target || !target.addEventListener) return function () {};
    function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
    function onKey(e, isDown) {
      var action = KEY_TO_ACTION[e.code];
      if (!action) return;
      if (action === 'jump' || action === 'pause' || action.indexOf('swap') === 0) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
      }
      if (action.indexOf('swap') === 0 && isDown) {
        slot.pressed[action] = true; // momentary, no hold state
        slot.lastDevice = 'kbd';
        return;
      }
      setDown(slot, action, isDown, now());
      if (isDown) slot.lastDevice = 'kbd';
    }
    function kd(e) { onKey(e, true); }
    function ku(e) { onKey(e, false); }
    function blur() { slot.down = {}; }
    target.addEventListener('keydown', kd);
    target.addEventListener('keyup', ku);
    target.addEventListener('blur', blur);
    var detach = function () {
      target.removeEventListener('keydown', kd);
      target.removeEventListener('keyup', ku);
      target.removeEventListener('blur', blur);
    };
    slot._detach.push(detach);
    return detach;
  }

  function attachMouse(slot, canvas) {
    if (!canvas || !canvas.addEventListener) return function () {};
    function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }
    function pos(e) {
      var r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
      slot.aimScreen.x = e.clientX - r.left;
      slot.aimScreen.y = e.clientY - r.top;
      slot.aimScreen.active = true;
      slot.lastDevice = 'kbd';
    }
    function md(e) {
      pos(e);
      if (e.button === 0) setDown(slot, 'fire', true, now());
      if (e.button === 2) setDown(slot, 'altfire', true, now());
    }
    function mu(e) {
      if (e.button === 0) setDown(slot, 'fire', false, now());
      if (e.button === 2) setDown(slot, 'altfire', false, now());
    }
    function mm(e) { pos(e); }
    function mw(e) {
      slot.wheel += (e.deltaY || 0) > 0 ? 1 : -1;
      slot.lastDevice = 'kbd';
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    function ctx(e) { if (typeof e.preventDefault === 'function') e.preventDefault(); }
    canvas.addEventListener('mousemove', mm);
    canvas.addEventListener('mousedown', md);
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('mouseup', mu);
    canvas.addEventListener('wheel', mw, { passive: false });
    canvas.addEventListener('contextmenu', ctx);
    var detach = function () {
      canvas.removeEventListener('mousemove', mm);
      canvas.removeEventListener('mousedown', md);
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('mouseup', mu);
      canvas.removeEventListener('wheel', mw);
      canvas.removeEventListener('contextmenu', ctx);
    };
    slot._detach.push(detach);
    return detach;
  }

  // Poll a W3C gamepad object (or a test stub with {axes,buttons[]}).
  // D-pad doubles as strafe when the left stick is near centre.
  function pollGamepad(slot, pad, nowMs) {
    if (!pad) return;
    var t = (typeof nowMs === 'number') ? nowMs : Date.now();
    function dz(v) { return Math.abs(v) < PAD.stickDeadzone ? 0 : v; }
    function btn(i) {
      var b = pad.buttons && pad.buttons[i];
      if (!b) return false;
      if (typeof b === 'object') return !!b.pressed || (b.value || 0) > PAD.triggerThreshold;
      return !!b;
    }
    var ax = pad.axes || [];
    var mx = dz(ax[PAD.axes.moveX] || 0);
    var my = dz(ax[PAD.axes.moveY] || 0);
    if (btn(PAD.buttons.swapLeft)) mx = -1;
    if (btn(PAD.buttons.swapRight)) mx = 1;
    slot.moveAxis = mx;
    setDown(slot, 'moveLeft', mx < -0.25, t);
    setDown(slot, 'moveRight', mx > 0.25, t);
    setDown(slot, 'up', my < -0.4 || btn(PAD.buttons.swapUp), t);
    setDown(slot, 'down', my > 0.4 || btn(PAD.buttons.swapDown), t);
    setDown(slot, 'jump', btn(PAD.buttons.jump), t);
    setDown(slot, 'dash', btn(PAD.buttons.dash), t);
    setDown(slot, 'interact', btn(PAD.buttons.interact), t);
    var lt = btn(PAD.buttons.altfire) || btn(6);
    var rt = btn(PAD.buttons.fire);
    setDown(slot, 'altfire', lt, t);
    setDown(slot, 'fire', rt, t);
    if (btn(PAD.buttons.pause)) slot.pressed.pause = true;
    var sx = dz(ax[PAD.axes.aimX] || 0);
    var sy = dz(ax[PAD.axes.aimY] || 0);
    if (sx !== 0 || sy !== 0) {
      var len = Math.sqrt(sx * sx + sy * sy) || 1;
      slot.stickAim.x = sx / len;
      slot.stickAim.y = sy / len;
      slot.stickAim.active = true;
      slot.lastDevice = 'pad';
    } else {
      slot.stickAim.active = false;
    }
    if (mx !== 0 || btn(PAD.buttons.jump) || rt) slot.lastDevice = 'pad';
  }

  // Keyboard-only 8-direction aim fallback (arrow cluster / WASD intent).
  // Returns one of 8 unit vectors, biased to the body's facing when idle.
  function aim8Dir(slot, facing) {
    var dx = (slot.down.moveRight ? 1 : 0) - (slot.down.moveLeft ? 1 : 0);
    var dy = (slot.down.down ? 1 : 0) - (slot.down.up ? 1 : 0);
    if (dx === 0 && dy === 0) return { x: facing >= 0 ? 1 : -1, y: 0 };
    var len = Math.sqrt(dx * dx + dy * dy);
    return { x: dx / len, y: dy / len };
  }

  function detachAll(slot) {
    for (var i = 0; i < slot._detach.length; i++) {
      try { slot._detach[i](); } catch (e) {}
    }
    slot._detach = [];
  }

  root.GraveGain2dBPlayerInput = {
    SPEC_TABLE: SPEC_TABLE,
    EXPECTED_TIMING: EXPECTED_TIMING,
    KEY_TO_ACTION: KEY_TO_ACTION,
    PAD: PAD,
    createSlot: createSlot,
    beginFrame: beginFrame,
    setDown: setDown,
    attachKeyboard: attachKeyboard,
    attachMouse: attachMouse,
    pollGamepad: pollGamepad,
    aim8Dir: aim8Dir,
    detachAll: detachAll
  };
})(typeof window !== 'undefined' ? window : globalThis);
