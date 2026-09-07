(function () {
    'use strict';

    // Input owns its pointer-lock request so it has no dependency on the
    // runtime's private helpers after code splitting.
    function requestPointerLockSafely(element) {
        if (!element?.requestPointerLock || document.body.classList.contains('touch-enabled')) return;
        try {
            const request = element.requestPointerLock();
            if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch (_) { /* Embedded players may deny pointer lock. */ }
    }

class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { click: false, rightClick: false, isBlocking: false };
        this.lookSensitivity = 0.0022;
        this.invertY = false;
        this.lastLookDelta = 0;

        // Mobile virtual analog joystick
        this.joystick = { active: false, x: 0, y: 0, originX: 0, originY: 0 };

        // Mobile touch look gesture
        this.touchLook = { active: false, lastX: 0, lastY: 0 };

        this.setupDesktopControls();
        this.setupMobileControls();
    }

    setupDesktopControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (window.GraveGainGame) window.GraveGainGame.togglePause();
            }
            if (e.code === 'KeyQ') {
                if (window.GraveGainGame) window.GraveGainGame.usePotion();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        const container = document.getElementById('canvasContainer');
        if (!container) return;

        container.addEventListener('contextmenu', (e) => e.preventDefault());

        container.addEventListener('mousedown', (e) => {
            // Bot/synthetic presses (virtual mouse, autoplay, playtests) must
            // act as real attacks even without pointer lock, which embedded
            // players and headless test windows routinely deny. Human first
            // clicks still request pointer lock as before.
            const botDriven = e.isTrusted === false ||
                (window.GraveGainBotInput && window.GraveGainBotInput.isBotControl());
            if (document.pointerLockElement !== container && !botDriven) {
                requestPointerLockSafely(container);
            } else {
                if (e.button === 0) {
                    this.mouse.click = true;
                } else if (e.button === 2) {
                    this.mouse.isBlocking = true;
                    this.mouse.rightClick = true;
                }
            }
        });

        // Programmatic look/attack for the virtual bot mouse. Routes through
        // the same flags the per-frame loop polls, so bot + human share one
        // input path (see ui/bot-cursor.js GraveGainBotInput for the driver).
        this.botLook = (dx, dy) => {
            if (window.GraveGainBotInput) return window.GraveGainBotInput.look(dx, dy);
            return false;
        };
        this.botAttack = () => {
            if (!window.GraveGainGame || !window.GraveGainGame.player) return false;
            this.mouse.click = true;
            return true;
        };
        this.botBlock = (on) => {
            this.mouse.isBlocking = on !== false;
            this.mouse.rightClick = on !== false;
        };
        this.botPress = (code, holdMs) => {
            if (code === 'KeyQ' && window.GraveGainGame) {
                window.GraveGainGame.usePotion();
                return;
            }
            if (code === 'KeyF' && window.GraveGainGame && window.GraveGainGame.player) {
                window.GraveGainGame.player.triggerAbility();
                return;
            }
            this.keys[code] = true;
            setTimeout(() => { this.keys[code] = false; }, holdMs || 220);
        };

        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.mouse.isBlocking = false;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === container && window.GraveGainGame && window.GraveGainGame.player) {
                const p = window.GraveGainGame.player;
                p.yaw -= e.movementX * this.lookSensitivity;
                const dy = this.invertY ? -e.movementY : e.movementY;
                p.pitch -= dy * this.lookSensitivity;
                p.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, p.pitch));
                this.lastLookDelta = (this.lastLookDelta || 0) + Math.abs(e.movementX) + Math.abs(e.movementY);
            }
        });
    }

    setupMobileControls() {
        const isTouchSupported = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isNarrowViewport = window.innerWidth <= 900;
        const isPointerCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (isTouchSupported || isNarrowViewport || isPointerCoarse) {
            document.body.classList.add('touch-enabled');
        }
        // Also watch for resize to toggle mobile layout
        window.addEventListener('resize', () => {
            const nowNarrow = window.innerWidth <= 900;
            const nowTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            const nowCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
            if (nowNarrow || nowTouch || nowCoarse) {
                document.body.classList.add('touch-enabled');
            } else {
                document.body.classList.remove('touch-enabled');
            }
        });

        // Virtual analog joystick. Track the initiating pointer so a second
        // finger used for looking or attacking cannot hijack movement.
        const joystickContainer = document.getElementById('mobileJoystick');
        const knob = document.getElementById('mobileJoystickKnob');

        if (joystickContainer && knob) {
            let joystickPointerId = null;
            const onJoyStart = (e) => {
                if (joystickPointerId !== null) return;
                e.preventDefault();
                joystickPointerId = e.pointerId;
                joystickContainer.setPointerCapture?.(e.pointerId);
                const rect = joystickContainer.getBoundingClientRect();
                this.joystick.active = true;
                this.joystick.originX = rect.left + rect.width / 2;
                this.joystick.originY = rect.top + rect.height / 2;
                onJoyMove(e);
            };

            const onJoyMove = (e) => {
                if (!this.joystick.active || e.pointerId !== joystickPointerId) return;
                e.preventDefault();
                const dx = e.clientX - this.joystick.originX;
                const dy = e.clientY - this.joystick.originY;
                const maxRadius = 45;
                const dist = Math.hypot(dx, dy);

                if (dist > 0) {
                    const clampedDist = Math.min(dist, maxRadius);
                    const angle = Math.atan2(dy, dx);
                    const kx = Math.cos(angle) * clampedDist;
                    const ky = Math.sin(angle) * clampedDist;

                    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
                    this.joystick.x = kx / maxRadius;
                    this.joystick.y = ky / maxRadius;
                }
            };

            const onJoyEnd = (e) => {
                if (e.pointerId !== joystickPointerId) return;
                this.joystick.active = false;
                this.joystick.x = 0;
                this.joystick.y = 0;
                joystickPointerId = null;
                knob.style.transform = 'translate(-50%, -50%)';
            };

            joystickContainer.addEventListener('pointerdown', onJoyStart);
            joystickContainer.addEventListener('pointermove', onJoyMove);
            joystickContainer.addEventListener('pointerup', onJoyEnd);
            joystickContainer.addEventListener('pointercancel', onJoyEnd);
            joystickContainer.addEventListener('lostpointercapture', onJoyEnd);
        }

        // Mobile Touch Look Gesture
        const lookZone = document.getElementById('mobileTouchLookZone');
        if (lookZone) {
            let lookPointerId = null;
            lookZone.addEventListener('pointerdown', (e) => {
                if (lookPointerId !== null) return;
                e.preventDefault();
                lookPointerId = e.pointerId;
                lookZone.setPointerCapture?.(e.pointerId);
                this.touchLook.active = true;
                this.touchLook.lastX = e.clientX;
                this.touchLook.lastY = e.clientY;
            });

            lookZone.addEventListener('pointermove', (e) => {
                if (e.pointerId !== lookPointerId || !this.touchLook.active || !window.GraveGainGame || !window.GraveGainGame.player) return;
                e.preventDefault();
                const dx = e.clientX - this.touchLook.lastX;
                const dy = e.clientY - this.touchLook.lastY;
                this.touchLook.lastX = e.clientX;
                this.touchLook.lastY = e.clientY;

                const p = window.GraveGainGame.player;
                const sens = this.lookSensitivity * 1.5;
                p.yaw -= dx * sens;
                const moveY = this.invertY ? -dy : dy;
                p.pitch -= moveY * sens;
                p.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, p.pitch));
                this.lastLookDelta = (this.lastLookDelta || 0) + Math.abs(dx) + Math.abs(dy);
            });

            const endLook = (e) => {
                if (e.pointerId !== lookPointerId) return;
                this.touchLook.active = false;
                lookPointerId = null;
            };
            lookZone.addEventListener('pointerup', endLook);
            lookZone.addEventListener('pointercancel', endLook);
            lookZone.addEventListener('lostpointercapture', endLook);
        }

        // Mobile Action Buttons
        const attackBtn = document.getElementById('mobileAttackBtn');
        const blockBtn = document.getElementById('mobileBlockBtn');
        const abilityBtn = document.getElementById('mobileAbilityBtn');
        const jumpBtn = document.getElementById('mobileJumpBtn');
        const potionBtn = document.getElementById('mobilePotionBtn');
        const waitBtn = document.getElementById('mobileWaitBtn');

        if (attackBtn) {
            attackBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.mouse.click = true;
            });
            attackBtn.addEventListener('click', (e) => {
                if (e.detail === 0) this.mouse.click = true;
            });
        }

        if (blockBtn) {
            blockBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.mouse.isBlocking = true;
                this.mouse.rightClick = true;
            });
            const endBlock = () => {
                this.mouse.isBlocking = false;
            };
            blockBtn.addEventListener('pointerup', endBlock);
            blockBtn.addEventListener('pointercancel', endBlock);
            blockBtn.addEventListener('lostpointercapture', endBlock);
            blockBtn.addEventListener('click', (e) => {
                if (e.detail !== 0) return;
                this.mouse.rightClick = true;
                this.mouse.isBlocking = true;
                requestAnimationFrame(() => { this.mouse.isBlocking = false; });
            });
        }

        if (abilityBtn) {
            abilityBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.keys['KeyF'] = true;
            });
            const clearAbility = () => { this.keys['KeyF'] = false; };
            abilityBtn.addEventListener('pointerup', clearAbility);
            abilityBtn.addEventListener('pointercancel', clearAbility);
            abilityBtn.addEventListener('lostpointercapture', clearAbility);
            abilityBtn.addEventListener('click', (e) => {
                if (e.detail === 0) {
                    this.keys['KeyF'] = true;
                    requestAnimationFrame(clearAbility);
                }
            });
        }

        if (jumpBtn) {
            jumpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.keys['Space'] = true;
            });
            const clearJump = () => { this.keys['Space'] = false; };
            jumpBtn.addEventListener('pointerup', clearJump);
            jumpBtn.addEventListener('pointercancel', clearJump);
            jumpBtn.addEventListener('lostpointercapture', clearJump);
            jumpBtn.addEventListener('click', (e) => {
                if (e.detail === 0) {
                    this.keys['Space'] = true;
                    requestAnimationFrame(clearJump);
                }
            });
        }

        if (potionBtn) {
            potionBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.usePotion();
            });
            potionBtn.addEventListener('click', (e) => {
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.usePotion();
            });
        }

        if (waitBtn) {
            waitBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (window.GraveGainGame) window.GraveGainGame.executeTurnAction('wait');
            });
            waitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (e.detail === 0 && window.GraveGainGame) window.GraveGainGame.executeTurnAction('wait');
            });
        }
    }
}

    window.GraveGainInputManager = InputManager;
})();
