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
        }

        sample(frameMs) {
            this.samples.push(frameMs);
            if (this.samples.length < this.sampleFrames) return;
            const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
            this.samples.length = 0;
            const next = average > 24 ? Math.max(this.minPixelRatio, this.pixelRatio - 0.25) :
                average < 15 ? Math.min(this.maxPixelRatio, this.pixelRatio + 0.25) : this.pixelRatio;
            if (next !== this.pixelRatio) {
                this.pixelRatio = next;
                this.renderer.setPixelRatio(next);
                this.renderer.setSize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight, false);
            }
        }
    }

    window.GraveGainPerformanceManager = PerformanceManager;
})();
