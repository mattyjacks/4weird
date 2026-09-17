(function () {
    'use strict';

    class PerformanceManager {
        constructor(renderer) {
            this.renderer = renderer;
            this.samples = [];
            const config = window.GraveGainConfig?.render;
            this.minPixelRatio = config?.minPixelRatio ?? 0.75;
            this.maxPixelRatio = config?.maxPixelRatio ?? 1.5;
            this.sampleFrames = config?.sampleFrames ?? 90;
            this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
            renderer.setPixelRatio(this.pixelRatio);
            // Sustained-slowness tracking for preset auto-degrade. Counts
            // consecutive slow sample windows; stepped down only, never up.
            this.slowWindows = 0;
            this.slowWindowThreshold = 3;
            this.slowFrameMs = 24;
        }

        sample(frameMs) {
            this.samples.push(frameMs);
            if (this.samples.length < this.sampleFrames) return;
            const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
            this.samples.length = 0;
            if (average > this.slowFrameMs) {
                // Degrade-only pixel nudge (no step-up: avoids oscillation).
                const next = Math.max(this.minPixelRatio, this.pixelRatio - 0.25);
                if (next !== this.pixelRatio) {
                    this.pixelRatio = next;
                    this.renderer.setPixelRatio(next);
                    this.renderer.setSize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight, false);
                }
                // Sustained slowness: step the graphics preset down one rung.
                this.slowWindows += 1;
                if (this.slowWindows >= this.slowWindowThreshold) {
                    this.slowWindows = 0;
                    try {
                        const gs = window.GraveGainGraphicsSettings;
                        if (gs && typeof gs.autoDegrade === 'function') {
                            gs.autoDegrade('sustained slow frames');
                        } else {
                            window.dispatchEvent(new window.CustomEvent('gravegain-graphics-autodegrade', {
                                detail: { reason: 'sustained slow frames', averageMs: average }
                            }));
                        }
                    } catch (_) { /* degrade is best-effort */ }
                }
            } else {
                this.slowWindows = 0;
            }
        }
    }

    window.GraveGainPerformanceManager = PerformanceManager;
})();
