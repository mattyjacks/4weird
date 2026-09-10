/**
 * Semester Survival - Controls Handler
 * Captures keystrokes, onscreen button clicks, and touch gestures.
 */
(function() {
    'use strict';

    class InputManager {
        constructor() {
            this.keys = {};
            this.swipeStartX = 0;
            this.swipeStartY = 0;
            this.swipeThreshold = 30; // Minimum swipe distance in pixels
            this.onAction = null; // Callback for actions: 'left', 'right', 'jump', 'slide', 'pause'
            this.active = false;
        }

        init(actionCallback) {
            this.onAction = actionCallback;
            this.setupKeyboard();
            this.setupTouch();
            this.active = true;
        }

        setupKeyboard() {
            document.addEventListener('keydown', (e) => {
                if (!this.active) return;
                
                // Prevent scrolling for navigation keys
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                    e.preventDefault();
                }

                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    this.triggerAction('left');
                } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    this.triggerAction('right');
                } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
                    this.triggerAction('jump');
                } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                    this.triggerAction('slide');
                } else if (e.code === 'KeyP' || e.code === 'Escape') {
                    this.triggerAction('pause');
                }
            });
        }

        setupTouch() {
            const canvas = document.getElementById('TEMPLATE-4weird-gameCanvas');
            if (!canvas) return;

            // Touch Swipe Detection
            canvas.addEventListener('touchstart', (e) => {
                if (!this.active) return;
                const touch = e.touches[0];
                this.swipeStartX = touch.clientX;
                this.swipeStartY = touch.clientY;
            }, { passive: true });

            canvas.addEventListener('touchend', (e) => {
                if (!this.active) return;
                const touch = e.changedTouches[0];
                const diffX = touch.clientX - this.swipeStartX;
                const diffY = touch.clientY - this.swipeStartY;

                // Determine whether horizontal or vertical swipe
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    // Horizontal
                    if (Math.abs(diffX) > this.swipeThreshold) {
                        if (diffX > 0) {
                            this.triggerAction('right');
                        } else {
                            this.triggerAction('left');
                        }
                    }
                } else {
                    // Vertical
                    if (Math.abs(diffY) > this.swipeThreshold) {
                        if (diffY > 0) {
                            this.triggerAction('slide');
                        } else {
                            this.triggerAction('jump');
                        }
                    }
                }
            }, { passive: true });

            // Onscreen Virtual Button Listeners
            const btnLeft = document.getElementById('btn-left');
            const btnRight = document.getElementById('btn-right');
            const btnJump = document.getElementById('btn-jump');
            const btnSlide = document.getElementById('btn-slide');

            if (btnLeft) btnLeft.addEventListener('click', () => this.triggerAction('left'));
            if (btnRight) btnRight.addEventListener('click', () => this.triggerAction('right'));
            if (btnJump) btnJump.addEventListener('click', () => this.triggerAction('jump'));
            if (btnSlide) btnSlide.addEventListener('click', () => this.triggerAction('slide'));
        }

        triggerAction(action) {
            if (this.onAction && this.active) {
                this.onAction(action);
            }
        }

        enable() {
            this.active = true;
        }

        disable() {
            this.active = false;
        }
    }

    // Expose input manager globally
    window.ControlsInput = new InputManager();
})();
