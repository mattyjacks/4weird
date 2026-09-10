(function () {
    'use strict';

    /**
     * Owns optional worker-rendered visual effects. The game can continue to
     * use its normal renderer when a browser does not support OffscreenCanvas.
     */
    class GraphicsBridge {
        constructor(canvas, container) {
            this.canvas = canvas;
            this.container = container;
            this.worker = null;
            this.enabled = false;

            if (!canvas || !window.Worker || !canvas.transferControlToOffscreen) return;

            try {
                const offscreen = canvas.transferControlToOffscreen();
                this.worker = new Worker('engine/graphics-worker.js');
                this.worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
                this.enabled = true;
                this.resize();
            } catch (_) {
                // Graceful fallback: the base Three.js scene remains playable.
                this.enabled = false;
                this.worker?.terminate();
                this.worker = null;
            }
        }

        resize() {
            if (!this.enabled) return;
            const rect = this.container.getBoundingClientRect();
            this.worker.postMessage({
                type: 'resize',
                width: Math.max(1, Math.floor(rect.width)),
                height: Math.max(1, Math.floor(rect.height)),
                pixelRatio: Math.min(self.devicePixelRatio || 1, 1.5)
            });
        }

        burst(x, y, color = '#ffcc4c', strength = 1) {
            if (!this.enabled) return;
            this.worker.postMessage({ type: 'burst', x, y, color, strength });
        }

        setActive(active) {
            if (this.enabled) this.worker.postMessage({ type: 'active', active });
        }

        destroy() {
            this.worker?.terminate();
            this.worker = null;
            this.enabled = false;
        }
    }

    window.GraveGainGraphicsBridge = GraphicsBridge;
})();
