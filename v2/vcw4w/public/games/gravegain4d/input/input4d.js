(function () {
    'use strict';

    // GraveGain4D input: WASD/arrows + mouse + touch, plus 4D bindings.
    //
    // KEY MAP (canon, do not remap without updating game.js + docs):
    //   WASD / Arrows .... move (W/S = forward/back, A/D = strafe)
    //   Mouse move ........ look/aim (pointer-locked on canvas container)
    //   Left click ........ attack normally, PUTT when puttMode is on
    //   Middle click / J .. ability (always; never w-shift)
    //   Q / E ............. ana / kata plane rotation hold
    //   R ................. w+ (ana-direction nudge / putt w-aim in putt mode)
    //   F ................. CONTEXT: w- ONLY while puttMode is on,
    //                       ABILITY otherwise (3D canon: F = ability).
    //                       R/F w-shift ONLY in putt mode, F ability otherwise.
    //   T ................. timeline rewind / reverse time (edge, anytime)
    //   V ................. DEPRECATED (was world-hop; alternate worlds moved
    //                       to GraveGain5D). V is a no-op in 4D, kept as an edge
    //                       for save-compat only.
    //   G ................. putt-mode toggle (edge)
    //   Space ............. jump (held + edge)
    //   P / Esc ........... pause toggle (edge)
    //
    // Touch: left-half virtual joystick = move, right-half drag = look,
    // action buttons (ATK/PUTT, ABILITY, JUMP, W+/W-, MODE) set the same
    // flags as their desktop twins; a W-slider element may be bound via
    // bindWSlider(el) to drive wAxis directly.
    //
    // Frame protocol: game calls poll() for held state, then consume()
    // for edge events (consume clears the edge queue).

    function requestPointerLockSafely(element) {
        if (!element?.requestPointerLock || document.body.classList.contains('touch-enabled')) return;
        try {
            const request = element.requestPointerLock();
            if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch (_) { /* embedded players may deny pointer lock */ }
    }

    class Input4D {
        constructor() {
            this.keys = {};
            this.look = { dx: 0, dy: 0 };
            this.lookSensitivity = 0.0022;
            this.invertY = false;
            this.puttMode = false;
            this.wAxis = 0; // -1..1 held intent (R+/F- or touch buttons/slider)
            this.wSliderValue = 0;

            // Edge queue drained by consume()
            this._edges = {
                attack: 0, putt: 0, ability: 0, rewind: 0,
                worldHop: 0, jump: 0, puttModeToggled: 0, pause: 0
            };
            this.jumpHeld = false;
            this.aimHeld = false;
            this.attackHeld = false;

            this.joystick = { active: false, id: -1, x: 0, y: 0, originX: 0, originY: 0 };
            this.touchLook = { active: false, id: -1, lastX: 0, lastY: 0 };
            this.touch = { wPlus: false, wMinus: false };
            this._container = null;

            this.setupDesktopControls();
            this.setupMobileControls();
        }

        get isPuttMode() { return this.puttMode; }

        _emit(name) { this._edges[name] = (this._edges[name] || 0) + 1; }

        _togglePuttMode() {
            this.puttMode = !this.puttMode;
            this._emit('puttModeToggled');
        }

        _pause() {
            this._emit('pause');
            if (window.GraveGain4D && typeof window.GraveGain4D.togglePause === 'function') {
                try { window.GraveGain4D.togglePause(); } catch (_) {}
            } else if (window.GraveGainGame && typeof window.GraveGainGame.togglePause === 'function') {
                try { window.GraveGainGame.togglePause(); } catch (_) {}
            }
        }

        setupDesktopControls() {
            window.addEventListener('keydown', (e) => {
                if (e.repeat) {
                    this.keys[e.code] = true;
                    return;
                }
                this.keys[e.code] = true;
                switch (e.code) {
                    case 'KeyG': this._togglePuttMode(); break;
                    case 'KeyT': this._emit('rewind'); break;
                    case 'KeyV': this._emit('worldHop'); break; // deprecated no-op: 4D ignores worldHop (5D feature)
                    case 'KeyJ': this._emit('ability'); break;
                    case 'Space':
                        this.jumpHeld = true;
                        this._emit('jump');
                        if (e.target === document.body) e.preventDefault();
                        break;
                    case 'KeyF':
                        // Context key: w- in putt mode, ability otherwise.
                        if (this.puttMode) { this.keys.__wMinus = true; }
                        else this._emit('ability');
                        break;
                    case 'KeyR': this.keys.__wPlus = true; break;
                    case 'KeyP': case 'Escape': this._pause(); break;
                    default: break;
                }
            });

            window.addEventListener('keyup', (e) => {
                this.keys[e.code] = false;
                if (e.code === 'Space') this.jumpHeld = false;
                if (e.code === 'KeyR') this.keys.__wPlus = false;
                if (e.code === 'KeyF') this.keys.__wMinus = false;
            });

            window.addEventListener('blur', () => {
                this.keys = {};
                this.jumpHeld = false;
                this.aimHeld = false;
                this.attackHeld = false;
            });

            const container = document.getElementById('canvasContainer') || document.getElementById('gameContainer');
            if (!container) return;
            this._container = container;
            container.addEventListener('contextmenu', (e) => e.preventDefault());

            container.addEventListener('mousedown', (e) => {
                const botDriven = e.isTrusted === false ||
                    (window.GraveGainBotInput && typeof window.GraveGainBotInput.isBotControl === 'function' && window.GraveGainBotInput.isBotControl());
                if (document.pointerLockElement !== container && !botDriven) {
                    requestPointerLockSafely(container);
                }
                if (e.button === 0) {
                    this.attackHeld = true;
                    if (this.puttMode) this._emit('putt');
                    else this._emit('attack');
                } else if (e.button === 1) {
                    this._emit('ability');
                    e.preventDefault();
                } else if (e.button === 2) {
                    this.aimHeld = true;
                }
            });
            window.addEventListener('mouseup', (e) => {
                if (e.button === 0) this.attackHeld = false;
                if (e.button === 2) this.aimHeld = false;
            });
            document.addEventListener('mousemove', (e) => {
                if (document.pointerLockElement === this._container) {
                    this.look.dx += e.movementX * this.lookSensitivity;
                    this.look.dy += e.movementY * this.lookSensitivity * (this.invertY ? -1 : 1);
                }
            });
        }

        setupMobileControls() {
            const opts = { passive: false };
            window.addEventListener('touchstart', (e) => {
                document.body.classList.add('touch-enabled');
                for (const t of e.changedTouches) {
                    if (t.clientX < window.innerWidth * 0.45 && !this.joystick.active) {
                        this.joystick.active = true;
                        this.joystick.id = t.identifier;
                        this.joystick.originX = t.clientX;
                        this.joystick.originY = t.clientY;
                        this.joystick.x = 0;
                        this.joystick.y = 0;
                    } else if (!this.touchLook.active) {
                        this.touchLook.active = true;
                        this.touchLook.id = t.identifier;
                        this.touchLook.lastX = t.clientX;
                        this.touchLook.lastY = t.clientY;
                    }
                }
            }, opts);
            window.addEventListener('touchmove', (e) => {
                for (const t of e.changedTouches) {
                    if (this.joystick.active && t.identifier === this.joystick.id) {
                        const R = 60;
                        let dx = (t.clientX - this.joystick.originX) / R;
                        let dy = (t.clientY - this.joystick.originY) / R;
                        const m = Math.hypot(dx, dy) || 1;
                        if (m > 1) { dx /= m; dy /= m; }
                        this.joystick.x = dx;
                        this.joystick.y = dy;
                        e.preventDefault();
                    } else if (this.touchLook.active && t.identifier === this.touchLook.id) {
                        this.look.dx += (t.clientX - this.touchLook.lastX) * this.lookSensitivity * 1.4;
                        this.look.dy += (t.clientY - this.touchLook.lastY) * this.lookSensitivity * 1.4 * (this.invertY ? -1 : 1);
                        this.touchLook.lastX = t.clientX;
                        this.touchLook.lastY = t.clientY;
                    }
                }
            }, opts);
            const endTouch = (e) => {
                for (const t of e.changedTouches) {
                    if (this.joystick.active && t.identifier === this.joystick.id) {
                        this.joystick.active = false;
                        this.joystick.id = -1;
                        this.joystick.x = 0;
                        this.joystick.y = 0;
                    }
                    if (this.touchLook.active && t.identifier === this.touchLook.id) {
                        this.touchLook.active = false;
                        this.touchLook.id = -1;
                    }
                }
            };
            window.addEventListener('touchend', endTouch);
            window.addEventListener('touchcancel', endTouch);
        }

        // Touch action buttons: call from UI (ATK, ABILITY, JUMP, W+/W-, MODE).
        pressAction(name) {
            switch (name) {
                case 'attack': case 'putt':
                    if (this.puttMode) this._emit('putt');
                    else this._emit('attack');
                    break;
                case 'ability': this._emit('ability'); break;
                case 'jump': this.jumpHeld = true; this._emit('jump'); break;
                case 'releaseJump': this.jumpHeld = false; break;
                case 'wPlus': this.touch.wPlus = true; break;
                case 'releaseWPlus': this.touch.wPlus = false; break;
                case 'wMinus': this.touch.wMinus = true; break;
                case 'releaseWMinus': this.touch.wMinus = false; break;
                case 'puttMode': this._togglePuttMode(); break;
                case 'rewind': this._emit('rewind'); break;
                case 'worldHop': this._emit('worldHop'); break; // deprecated: 4D runtime ignores worldHop (5D feature)
                case 'pause': this._pause(); break;
                default: break;
            }
        }

        // Bind an <input type="range" min="-1" max="1"> as the W driver.
        bindWSlider(el) {
            if (!el || typeof el.addEventListener !== 'function') return;
            const read = () => { this.wSliderValue = Math.max(-1, Math.min(1, Number(el.value) || 0)); };
            el.addEventListener('input', read);
            read();
        }

        _heldW() {
            // Keyboard R/F drive w ONLY in putt mode (F is ability otherwise);
            // touch W-buttons / W-slider have no key conflict so always apply.
            let w = 0;
            if (this.puttMode) {
                if (this.keys.__wPlus || this.keys.KeyR) w += 1;
                if (this.keys.__wMinus) w -= 1;
            }
            if (this.touch.wPlus) w += 1;
            if (this.touch.wMinus) w -= 1;
            if (w === 0 && this.wSliderValue) w = this.wSliderValue;
            return Math.max(-1, Math.min(1, w));
        }

        // Held-state snapshot for the frame (no clearing).
        poll() {
            const k = this.keys;
            let mx = 0, mz = 0;
            if (k.KeyW || k.ArrowUp) mz += 1;
            if (k.KeyS || k.ArrowDown) mz -= 1;
            if (k.KeyA || k.ArrowLeft) mx -= 1;
            if (k.KeyD || k.ArrowRight) mx += 1;
            mx += this.joystick.x;
            mz -= this.joystick.y;
            const m = Math.hypot(mx, mz);
            if (m > 1) { mx /= m; mz /= m; }
            const dx = this.look.dx;
            const dy = this.look.dy;
            this.look.dx = 0;
            this.look.dy = 0;
            return {
                move: { x: mx, z: mz },
                look: { dx, dy },
                w: this._heldW(),
                ana: !!k.KeyQ,
                kata: !!k.KeyE,
                puttMode: this.puttMode,
                jumpHeld: this.jumpHeld || !!k.Space,
                aimHeld: this.aimHeld || !!k.ShiftLeft || !!k.ShiftRight,
                attackHeld: this.attackHeld
            };
        }

        // Edge events since last consume(); clears the queue.
        consume() {
            const out = { ...this._edges };
            for (const key of Object.keys(this._edges)) this._edges[key] = 0;
            return out;
        }
    }

    if (!window.GraveGain4DInput) window.GraveGain4DInput = new Input4D();
})();
