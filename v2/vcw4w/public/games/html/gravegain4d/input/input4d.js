(function () {
    'use strict';

    // GraveGain4D — input4d: WASD move, pointer-lock mouse-look, Q/E ana/kata
    // w-shift, Space jump, T rewind, B brane-flip, click putt.
    // NOTE: KeyF is deliberately ability-free here — it is never bound.
    // No fullscreen bindings, no dblclick listeners.

    function requestPointerLockSafely(element) {
        if (!element || !element.requestPointerLock) return;
        if (document.body && document.body.classList.contains('touch-enabled')) return;
        try {
            var request = element.requestPointerLock();
            if (request && typeof request.catch === 'function') request.catch(function () {});
        } catch (_) { /* Embedded players may deny pointer lock. */ }
    }

    function Input4D(opts) {
        opts = opts || {};
        this.keys = {};
        this.lookSensitivity = opts.lookSensitivity || 0.0022;
        this.invertY = !!opts.invertY;
        this.lastLookDelta = 0;
        this.yaw = opts.yaw || 0;
        this.pitch = opts.pitch || 0;
        // W-look: Q/E also nudge w-aim; Space jump edge flag.
        this.wShift = 0;
        this.jumpPressed = false;
        this.rewindHeld = false;
        this.puttCharging = false;
        // Bridges to engine modules when present (set by game bootstrap).
        this.putt = opts.putt || null;       // GG4D_Putt instance
        this.timefold = opts.timefold || null;
        this.branes = opts.branes || null;
        this.playerPos = opts.playerPos || null; // fn() -> {x,y,z,w} for brane flip
        this.container = null;
        this._bound = false;
        if (opts.container) this.attach(opts.container);
        else if (typeof document !== 'undefined') {
            var el = document.getElementById('canvasContainer');
            if (el) this.attach(el);
        }
    }

    Input4D.prototype.attach = function (container) {
        if (this._bound || !container) return;
        this._bound = true;
        this.container = container;
        var self = this;

        window.addEventListener('keydown', function (e) {
            // F stays ability-free: never bind KeyF to anything.
            if (e.code === 'KeyF') return;
            self.keys[e.code] = true;
            if (e.code === 'Space') self.jumpPressed = true;
            if (e.code === 'KeyT' && !self.rewindHeld) {
                self.rewindHeld = true;
                if (self.timefold && typeof self.timefold.beginRewind === 'function') {
                    self.timefold.beginRewind();
                }
            }
            if (e.code === 'KeyB') self.tryBraneFlip();
        });

        window.addEventListener('keyup', function (e) {
            if (e.code === 'KeyF') return;
            self.keys[e.code] = false;
            if (e.code === 'Space') self.jumpPressed = false;
            if (e.code === 'KeyT' && self.rewindHeld) {
                self.rewindHeld = false;
                if (self.timefold && typeof self.timefold.endRewind === 'function') {
                    self.timefold.endRewind();
                }
            }
        });

        container.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        // Pointer-lock-safe click (same pattern as GG3D input-manager):
        // first click locks; only putt when locked. Synthetic/bot presses
        // bypass the lock gate like GG3D does.
        container.addEventListener('mousedown', function (e) {
            var botDriven = e.isTrusted === false ||
                (window.GraveGainBotInput && window.GraveGainBotInput.isBotControl &&
                    window.GraveGainBotInput.isBotControl());
            if (document.pointerLockElement !== container && !botDriven) {
                requestPointerLockSafely(container);
            } else if (e.button === 0) {
                self.startPuttCharge();
            }
        });

        window.addEventListener('mouseup', function (e) {
            if (e.button === 0 && self.puttCharging) self.releasePutt();
        });

        document.addEventListener('mousemove', function (e) {
            if (document.pointerLockElement !== container) return;
            var dx = e.movementX || 0;
            var dy = e.movementY || 0;
            self.yaw -= dx * self.lookSensitivity;
            var moveY = self.invertY ? -dy : dy;
            self.pitch -= moveY * self.lookSensitivity;
            var lim = Math.PI / 2.3;
            self.pitch = Math.max(-lim, Math.min(lim, self.pitch));
            self.lastLookDelta += Math.abs(dx) + Math.abs(dy);
            // Mirror onto a GG3D-style player object when the game provides one.
            var p = window.GG4D_Game && window.GG4D_Game.player;
            if (p) { p.yaw = self.yaw; p.pitch = self.pitch; }
        });
    };

    Input4D.prototype.moveAxes = function () {
        var k = this.keys;
        return {
            forward: (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0),
            strafe: (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0),
            // Q = ana (-w), E = kata (+w).
            w: (k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0),
            jump: !!k.Space || this.jumpPressed,
            rewind: this.rewindHeld || !!k.KeyT
        };
    };

    Input4D.prototype.consumeJump = function () {
        var j = this.jumpPressed || !!this.keys.Space;
        this.jumpPressed = false;
        return j;
    };

    Input4D.prototype.startPuttCharge = function () {
        this.puttCharging = true;
        if (this.putt && typeof this.putt.startCharge === 'function') {
            return this.putt.startCharge();
        }
        return true;
    };

    Input4D.prototype.releasePutt = function () {
        this.puttCharging = false;
        if (this.putt && typeof this.putt.releasePutt === 'function') {
            return this.putt.releasePutt();
        }
        return null;
    };

    Input4D.prototype.tryBraneFlip = function () {
        if (!this.branes || typeof this.branes.tryFlip !== 'function') return null;
        var pos = typeof this.playerPos === 'function' ? this.playerPos() : this.playerPos;
        return this.branes.tryFlip(pos);
    };

    // Programmatic bot path (mirrors GG3D input-manager bot hooks).
    Input4D.prototype.botPress = function (code, holdMs) {
        // F stays ability-free even for bots.
        if (code === 'KeyF') return;
        var self = this;
        this.keys[code] = true;
        setTimeout(function () {
            self.keys[code] = false;
            if (code === 'Space') self.jumpPressed = false;
            if (code === 'KeyT') {
                self.rewindHeld = false;
                if (self.timefold && typeof self.timefold.endRewind === 'function') {
                    self.timefold.endRewind();
                }
            }
        }, holdMs || 220);
    };

    window.GG4D_Input4D = Input4D;
})();
