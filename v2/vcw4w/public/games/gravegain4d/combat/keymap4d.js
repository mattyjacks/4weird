(function () {
    'use strict';

    // GraveGain4D — keymap4d: GG3D-parity canon binding table.
    //
    // CANON (integrator applies this; DO NOT duplicate-bind elsewhere):
    //   attack  Mouse0 (left-click doubles as golf putt when no enemy in range)
    //   block   Mouse2 (hold right-click)
    //   ability KeyF   (race ability / class ult trigger)
    //   potion  KeyQ   (heal juice / nanite flask)
    //   jump    Space
    //   ana     KeyR   <-- CANON (moved off Q)
    //   kata    KeyE
    //   rewind  KeyT
    //   brane   KeyB
    //
    // *** BINDING-CHANGE FLAG (action required by integrator) ***
    // input4d.js CURRENTLY binds Q/E to ana/kata w-shift (see
    // input/input4d.js moveAxes(): w = (KeyE?1:0) - (KeyQ?1:0), and its
    // keydown handler deliberately ignores KeyF). That conflicts with this
    // canon where Q = potion and F = ability.
    // INTEGRATOR MUST: in input4d.js, move ana from KeyQ to KeyR
    //   (w = (KeyE?1:0) - (KeyR?1:0)), free KeyQ for potion, and stop
    //   ignoring KeyF so F reaches the ability path. This file declares the
    //   canon but does NOT rebind input4d.js (read-only here by contract).
    // No fullscreen bindings, no dblclick listeners in this file.

    var CANON = {
        attack: 'Mouse0',
        block: 'Mouse2',
        ability: 'KeyF',
        potion: 'KeyQ',
        jump: 'Space',
        ana: 'KeyR',
        kata: 'KeyE',
        rewind: 'KeyT',
        brane: 'KeyB'
    };

    // Edge state for key-down detection shared by combat poll helpers.
    var _prev = {};

    function _down(input, code) {
        if (!input) return false;
        if (input.keys && Object.prototype.hasOwnProperty.call(input.keys, code)) {
            return !!input.keys[code];
        }
        return false;
    }

    // True only on the rising edge of a canon action's key.
    function pressedEdge(input, action) {
        var code = CANON[action];
        if (!code || code.indexOf('Mouse') === 0) return false;
        var now = _down(input, code);
        var was = !!_prev[code];
        _prev[code] = now;
        return now && !was;
    }

    // Level (held) state for a canon action's key.
    function held(input, action) {
        var code = CANON[action];
        if (!code) return false;
        if (code === 'Mouse0') {
            if (input && input.mouse) return !!input.mouse.click;
            // GG4D Input4D has no mouse.click: left press = putt charge.
            return !!(input && input.puttCharging);
        }
        if (code === 'Mouse2') {
            if (input && input.mouse) return !!(input.mouse.isBlocking || input.mouse.rightClick);
            return !!((input && (input.blockHeld || input.keysWhitelistRight)));
        }
        return _down(input, code);
    }

    // Per-frame bookkeeping: call once per tick so edges stay fresh even
    // when a consumer only polls a subset of actions.
    function poll(input) {
        if (!input || !input.keys) return;
        var actions = ['ability', 'potion', 'jump', 'ana', 'kata', 'rewind', 'brane'];
        for (var i = 0; i < actions.length; i++) {
            var code = CANON[actions[i]];
            if (code && code.indexOf('Key') === 0) _prev[code] = !!input.keys[code];
        }
    }

    // Bot/test path: mirrors GG3D input-manager botPress semantics but
    // through the CANON map (F and Q ARE meaningful here, unlike input4d.js
    // which drops F). Never touches pointer lock / fullscreen.
    function botPress(input, actionOrCode, holdMs) {
        if (!input) return false;
        var code = CANON[actionOrCode] || actionOrCode;
        if (code === 'Mouse0') {
            if (input.mouse) input.mouse.click = true;
            else input.puttCharging = true;
            setTimeout(function () {
                if (input.mouse) input.mouse.click = false;
                else input.puttCharging = false;
            }, holdMs || 120);
            return true;
        }
        if (code === 'Mouse2') {
            if (input.mouse) { input.mouse.isBlocking = true; input.mouse.rightClick = true; }
            else input.blockHeld = true;
            setTimeout(function () {
                if (input.mouse) { input.mouse.isBlocking = false; input.mouse.rightClick = false; }
                else input.blockHeld = false;
            }, holdMs || 220);
            return true;
        }
        if (!input.keys) input.keys = {};
        // F ability / Q potion flow through here even though input4d.js
        // ignores F on its own keydown path.
        input.keys[code] = true;
        setTimeout(function () { input.keys[code] = false; }, holdMs || 220);
        return true;
    }

    window.GG4D_Keymap = {
        CANON: CANON,
        BINDING_CHANGE: 'input4d.js Q-ana must move to R; free Q for potion and un-ignore KeyF for ability.',
        pressedEdge: pressedEdge,
        held: held,
        poll: poll,
        botPress: botPress
    };
})();
