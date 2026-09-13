(function () {
    'use strict';

    // GraveGain4D projector: 4D -> 3D perspective divide by (d - w), then a
    // 3D camera passthrough. Slice mode only shows points near the current
    // w within thickness. All THREE usage is guarded (typeof THREE check)
    // so projection unit-works without three.
    window.GraveGain4D = window.GraveGain4D || {};

    var DEFAULTS = {
        distance: 3.0,
        cameraW: 0,
        thickness: 0.6,
        mode: 'perspective', // 'perspective' | 'slice'
        epsilon: 1e-6
    };

    function Projector(opts) {
        opts = opts || {};
        this.distance = (opts.distance !== undefined && opts.distance !== null) ? opts.distance : DEFAULTS.distance;
        this.cameraW = (opts.cameraW !== undefined && opts.cameraW !== null) ? opts.cameraW : DEFAULTS.cameraW;
        this.thickness = (opts.thickness !== undefined && opts.thickness !== null) ? opts.thickness : DEFAULTS.thickness;
        this.mode = opts.mode || DEFAULTS.mode;
        this.epsilon = (opts.epsilon !== undefined && opts.epsilon !== null) ? opts.epsilon : DEFAULTS.epsilon;
        // Optional 3D camera passthrough: plain { position:{x,y,z}, lookAt }
        // or a live THREE camera; both are optional and guarded.
        this.camera3d = opts.camera3d || null;
    }

    Projector.prototype.setDistance = function (d) {
        this.distance = d;
        return this;
    };

    Projector.prototype.setSlice = function (w, thickness) {
        this.cameraW = w;
        if (thickness !== undefined && thickness !== null) this.thickness = thickness;
        return this;
    };

    Projector.prototype.setMode = function (mode) {
        if (mode === 'perspective' || mode === 'slice') this.mode = mode;
        return this;
    };

    Projector.prototype.setCamera3d = function (cam) {
        this.camera3d = cam || null;
        return this;
    };

    // Perspective divide factor for a w coordinate: d / (d - w).
    Projector.prototype.scaleFor = function (w) {
        var denom = this.distance - w;
        if (Math.abs(denom) < this.epsilon) denom = (denom < 0 ? -1 : 1) * this.epsilon;
        return this.distance / denom;
    };

    Projector.prototype.inSlice = function (w) {
        return Math.abs(w - this.cameraW) <= this.thickness / 2;
    };

    // 3D camera passthrough: subtract a plain position offset when one is
    // configured; live THREE cameras are left to the renderer (guarded, we
    // never assume THREE exists here).
    Projector.prototype.applyCamera3d = function (p3) {
        var cam = this.camera3d;
        if (!cam) return p3;
        try {
            if (cam.position && typeof cam.position.x === 'number') {
                return {
                    x: p3.x - (cam.position.x || 0),
                    y: p3.y - (cam.position.y || 0),
                    z: p3.z - (cam.position.z || 0)
                };
            }
            if (typeof THREE !== 'undefined' && THREE && cam.isCamera && typeof cam.updateMatrixWorld === 'function') {
                // Renderer owns the real view transform; pass through.
                return p3;
            }
        } catch (e) {}
        return p3;
    };

    // Project one plain Vec4 -> { x, y, z, scale, visible, w }.
    Projector.prototype.projectPoint = function (v4) {
        var scale = this.scaleFor(v4.w);
        var p3 = {
            x: v4.x * scale,
            y: v4.y * scale,
            z: v4.z * scale
        };
        p3 = this.applyCamera3d(p3);
        var visible = true;
        if (this.mode === 'slice') visible = this.inSlice(v4.w);
        // Points at/beyond the 4D eye (d - w <= epsilon) are clipped.
        if ((this.distance - v4.w) <= this.epsilon) visible = false;
        return { x: p3.x, y: p3.y, z: p3.z, scale: scale, visible: visible, w: v4.w };
    };

    Projector.prototype.projectBatch = function (points) {
        var self = this;
        return (points || []).map(function (p) { return self.projectPoint(p); });
    };

    // Refit helper mirroring gravegain3d gg3dRefit conventions: updates a
    // camera aspect + renderer size, guarded so pre-init calls (or a
    // THREE-less unit run) never throw.
    function refitRenderer(camera3d, renderer, box) {
        try {
            var w = Math.max(320, (box && box.clientWidth) || 1000);
            var h = Math.max(240, (box && box.clientHeight) || 600);
            if (camera3d) {
                camera3d.aspect = w / h;
                if (typeof camera3d.updateProjectionMatrix === 'function') camera3d.updateProjectionMatrix();
            }
            if (renderer && typeof renderer.setSize === 'function') renderer.setSize(w, h);
            return { w: w, h: h };
        } catch (e) {}
        return null;
    }

    // Guarded THREE.Vector3 converter: returns null without THREE.
    function toThreeVec3(p3) {
        try {
            if (typeof THREE !== 'undefined' && THREE && typeof THREE.Vector3 === 'function') {
                return new THREE.Vector3(p3.x, p3.y, p3.z);
            }
        } catch (e) {}
        return null;
    }

    window.GraveGain4D.Projector = Projector;
    window.GraveGain4D.projectorDefaults = DEFAULTS;
    window.GraveGain4D.refitRenderer = refitRenderer;
    window.GraveGain4D.toThreeVec3 = toThreeVec3;
})();
