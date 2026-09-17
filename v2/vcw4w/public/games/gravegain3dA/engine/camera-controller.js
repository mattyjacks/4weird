(function () {
    'use strict';

    class CameraController {
        constructor() { this.shake = 0; this.punchX = 0; this.punchY = 0; }
        applyShake(amount) { this.shake = Math.min(this.shake + amount, 14); }
        applyPunch(vertical, horizontal = 0) { this.punchY += vertical; this.punchX += horizontal; }
        update(dt) {
            this.shake = Math.max(0, this.shake - 25 * dt);
            this.punchX -= this.punchX * 10 * dt;
            this.punchY -= this.punchY * 10 * dt;
        }
    }

    window.GraveGainCameraController = CameraController;
})();
