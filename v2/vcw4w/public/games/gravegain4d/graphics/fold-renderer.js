(function () {
    'use strict';

    // GraveGain4D folding-vector renderer.
    // Projects tesseract edges/cells via window.GraveGain4DMath when present,
    // otherwise falls back to a local 4D->3D perspective projection.
    // Draws THREE.LineSegments + translucent cell meshes with XW/YW/ZW
    // auto-drift + beat pulse (vectors folding in on themselves), w-depth
    // fog / chromatic tint. Remounts 3D entity meshes supplied by bridges
    // at their projected positions. Degrades to emoji billboards / canvas 2D
    // sprite cards when THREE / WebGL is unavailable.
    // Vanilla script, no imports. Exposes window.GraveGain4DGraphics.

    var EMOJI_FALLBACK = ['🌀', '💜', '👁️', '✨', '🔮', '🕸️', '💀', '🌌'];
    var FOG_NEAR_W = -2.5;
    var FOG_FAR_W = 2.5;

    function hasThree() {
        try {
            return (typeof THREE !== 'undefined') && !!THREE.Scene;
        } catch (_) { return false; }
    }

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    // Local 4D rotation in XW / YW / ZW planes, then perspective divide by w.
    function localProject(p4, angles, camDist) {
        var x = p4[0], y = p4[1], z = p4[2], w = p4[3];
        var c, s, t;
        c = Math.cos(angles.xw); s = Math.sin(angles.xw);
        t = x * c - w * s; w = x * s + w * c; x = t;
        c = Math.cos(angles.yw); s = Math.sin(angles.yw);
        t = y * c - w * s; w = y * s + w * c; y = t;
        c = Math.cos(angles.zw); s = Math.sin(angles.zw);
        t = z * c - w * s; w = z * s + w * c; z = t;
        var d = (camDist || 3.2);
        var k = d / Math.max(0.35, d - w);
        return [x * k, y * k, z * k, w, k];
    }

    function mathProject(p4, cam) {
        try {
            var M = window.GraveGain4DMath;
            if (M) {
                if (typeof M.project === 'function') return M.project(p4, cam);
                if (typeof M.project4D === 'function') return M.project4D(p4, cam);
                if (typeof M.rotXW === 'function') {
                    // Compose via math helpers when the full projector is absent.
                    var a = (cam && cam.angles) || { xw: 0.5, yw: 0.35, zw: 0.2 };
                    return localProject(p4, a, cam && cam.dist);
                }
            }
        } catch (_) { /* fall through to local */ }
        var angles = (cam && cam.angles) || { xw: 0.5, yw: 0.35, zw: 0.2 };
        return localProject(p4, (cam && cam.angles) || angles, cam && cam.dist);
    }

    // Unit tesseract: 16 verts, 32 edges, 8 cube cells (by index).
    function tesseractVerts(size) {
        var s = (size == null ? 1 : size) / 2;
        var v = [];
        for (var i = 0; i < 16; i++) {
            v.push([
                (i & 1) ? s : -s,
                (i & 2) ? s : -s,
                (i & 4) ? s : -s,
                (i & 8) ? s : -s
            ]);
        }
        return v;
    }

    function tesseractEdges() {
        var e = [];
        for (var i = 0; i < 16; i++) {
            for (var b = 0; b < 4; b++) {
                var j = i ^ (1 << b);
                if (j > i) e.push([i, j]);
            }
        }
        return e; // 32 edges
    }

    // 8 cubic cells of the tesseract, each as 8 vert indices.
    function tesseractCells() {
        var cells = [];
        // Fix one axis at - / + -> the 8 bounding cubes.
        for (var axis = 0; axis < 4; axis++) {
            for (var side = 0; side < 2; side++) {
                var cell = [];
                for (var i = 0; i < 16; i++) {
                    var bit = (i >> axis) & 1;
                    if (bit === side) cell.push(i);
                }
                cells.push(cell);
            }
        }
        return cells;
    }

    var EDGES = tesseractEdges();
    var CELLS = tesseractCells();

    function wFog(w) {
        return clamp((w - FOG_NEAR_W) / (FOG_FAR_W - FOG_NEAR_W), 0, 1);
    }

    // Chromatic tint: near-w -> magenta/cyan split, far-w -> deep violet.
    function chromaticTint(w, t, out) {
        var f = wFog(w);
        var hue = (285 + f * 60 + t * 24) % 360;
        out = out || {};
        out.hue = hue;
        out.color = 'hsl(' + Math.round(hue) + ',85%,' + Math.round(lerp(62, 34, f)) + '%)';
        out.edgeA = 'hsl(' + Math.round((hue + 300) % 360) + ',90%,60%)';
        out.edgeB = 'hsl(' + Math.round((hue + 60) % 360) + ',90%,60%)';
        out.alpha = lerp(0.95, 0.25, f);
        return out;
    }

    function FoldRenderer(opts) {
        opts = opts || {};
        this.scene = opts.scene || null;
        this.mode = hasThree() ? 'webgl' : 'billboard';
        this.angles = { xw: 0.45, yw: 0.3, zw: 0.18 };
        this.drift = opts.drift || { xw: 0.22, yw: 0.16, zw: 0.11 };
        this.beat = 0;
        this.time = 0;
        this.fold = 1;
        this.edgeLines = null;
        this.cellMeshes = [];
        this.entityLayer = null;
        this.billboardEl = null;
        this.bridgeMeshes = new Map(); // entityId -> THREE.Object3D
        this.tintCache = {};
        if (this.mode === 'webgl' && this.scene) this._buildThree();
    }

    FoldRenderer.prototype._buildThree = function () {
        try {
            var edgeGeo = new THREE.BufferGeometry();
            var pos = new Float32Array(EDGES.length * 2 * 3);
            edgeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            var edgeMat = new THREE.LineBasicMaterial({
                color: 0xc084fc, transparent: true, opacity: 0.9,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            this.edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
            this.edgeLines.frustumCulled = false;
            this.scene.add(this.edgeLines);

            this.cellMeshes = [];
            for (var i = 0; i < CELLS.length; i++) {
                var g = new THREE.BufferGeometry();
                // Render each cube cell as 12 triangle-fan verts is overkill;
                // use a translucent box proxy scaled per-frame (cheap fold read).
                var m = new THREE.Mesh(
                    new THREE.BoxGeometry(1, 1, 1),
                    new THREE.MeshBasicMaterial({
                        color: 0x7c3aed, transparent: true, opacity: 0.07,
                        blending: THREE.AdditiveBlending, depthWrite: false,
                        side: THREE.DoubleSide
                    })
                );
                this.scene.add(m);
                this.cellMeshes.push(m);
            }

            this.entityLayer = new THREE.Group();
            this.scene.add(this.entityLayer);
        } catch (_) {
            this.mode = 'billboard';
        }
    };

    FoldRenderer.prototype.setBeat = function (b) {
        this.beat = clamp(Number(b) || 0, 0, 1);
    };

    FoldRenderer.prototype.setAngles = function (xw, yw, zw) {
        if (isFinite(xw)) this.angles.xw = xw;
        if (isFinite(yw)) this.angles.yw = yw;
        if (isFinite(zw)) this.angles.zw = zw;
    };

    // scene4d: { verts4d?, size?, center4d?, edges?, entities? }
    // cam: { angles?, dist?, beat?, driftScale?, position4d? }
    FoldRenderer.prototype.renderFold = function (scene4d, cam) {
        scene4d = scene4d || {};
        cam = cam || {};
        var dt = clamp(Number(cam.dt) || 0.016, 0, 0.1);
        this.time += dt;
        var beat = (cam.beat != null) ? cam.beat : this.beat;
        this.setBeat(beat);

        // Auto-drift in the three 4D planes + beat pulse (fold in on itself).
        var ds = Number(cam.driftScale) || 1;
        this.angles.xw += this.drift.xw * ds * dt;
        this.angles.yw += this.drift.yw * ds * dt;
        this.angles.zw += this.drift.zw * ds * dt;
        if (cam.angles) {
            // Camera may bias (not override) the drift so bridges can steer.
            this.angles.xw = lerp(this.angles.xw, cam.angles.xw, 0.04);
            this.angles.yw = lerp(this.angles.yw, cam.angles.yw, 0.04);
            this.angles.zw = lerp(this.angles.zw, cam.angles.zw, 0.04);
        }
        var pulse = 1 - 0.22 * this.beat * (0.5 + 0.5 * Math.sin(this.time * 6.0));
        this.fold = pulse;

        if (this.mode !== 'webgl' || !this.scene || !this.edgeLines) {
            return this._renderBillboards(scene4d, cam);
        }
        return this._renderWebGL(scene4d, cam);
    };

    FoldRenderer.prototype._projectSet = function (verts4d, cam) {
        var out = new Array(verts4d.length);
        var effCam = { angles: this.angles, dist: cam.dist || 3.2 };
        for (var i = 0; i < verts4d.length; i++) {
            var p = mathProject(verts4d[i], effCam);
            // Apply fold pulse toward origin: vectors folding in on themselves.
            out[i] = [p[0] * this.fold, p[1] * this.fold, p[2] * this.fold, p[3], p[4]];
        }
        return out;
    };

    FoldRenderer.prototype._renderWebGL = function (scene4d, cam) {
        var size = scene4d.size != null ? scene4d.size : 2;
        var center = scene4d.center4d || [0, 0, 0, 0];
        var verts = scene4d.verts4d || tesseractVerts(size).map(function (v) {
            return [v[0] + center[0], v[1] + center[1], v[2] + center[2], v[3] + center[3]];
        });
        var edges = scene4d.edges || EDGES;
        var proj = this._projectSet(verts, cam);

        // Edges -> LineSegments positions + w-depth fog via vertex colors
        // (cheap chromatic read: near = hot, far = violet).
        var attr = this.edgeLines.geometry.getAttribute('position');
        for (var i = 0; i < edges.length; i++) {
            var a = proj[edges[i][0]], b = proj[edges[i][1]];
            attr.setXYZ(i * 2, a[0], a[1], a[2]);
            attr.setXYZ(i * 2 + 1, b[0], b[1], b[2]);
        }
        attr.needsUpdate = true;
        var wAvg = 0;
        for (var k = 0; k < proj.length; k++) wAvg += proj[k][3];
        wAvg /= Math.max(1, proj.length);
        var tint = chromaticTint(wAvg, this.time);
        try {
            var c = new THREE.Color('hsl(' + Math.round(tint.hue) + ',85%,60%)');
            this.edgeLines.material.color.copy(c);
            this.edgeLines.material.opacity = 0.65 + 0.3 * this.beat;
        } catch (_) { /* color parse may vary across THREE builds */ }

        // Cells -> translucent proxies: centroid + mean w drive scale/opacity.
        for (var ci = 0; ci < this.cellMeshes.length && ci < CELLS.length; ci++) {
            var cell = CELLS[ci];
            var cx = 0, cy = 0, cz = 0, cw = 0;
            for (var vi = 0; vi < cell.length; vi++) {
                var pp = proj[cell[vi] % proj.length];
                cx += pp[0]; cy += pp[1]; cz += pp[2]; cw += pp[3];
            }
            var n = Math.max(1, cell.length);
            var mesh = this.cellMeshes[ci];
            mesh.position.set(cx / n, cy / n, cz / n);
            var f = wFog(cw / n);
            var s = Math.max(0.05, (size * 0.5 * this.fold) * (1 - f * 0.55));
            mesh.scale.set(s, s, s);
            mesh.rotation.set(this.time * 0.3 + ci, this.angles.xw + ci * 0.7, this.angles.yw);
            mesh.material.opacity = 0.05 + 0.10 * this.beat + 0.05 * (1 - f);
        }

        // Remount bridged 3D entity meshes at projected positions.
        this._remountEntities(scene4d.entities || [], cam);

        return { mode: 'webgl', verts: proj.length, edges: edges.length, tint: tint, fold: this.fold };
    };

    FoldRenderer.prototype._remountEntities = function (entities, cam) {
        if (!this.entityLayer) return;
        var seen = new Set();
        for (var i = 0; i < entities.length; i++) {
            var e = entities[i];
            if (!e || e.id == null) continue;
            seen.add(String(e.id));
            var mesh = this.bridgeMeshes.get(String(e.id));
            if (!mesh && e.mesh) {
                mesh = e.mesh;
                try { this.entityLayer.add(mesh); } catch (_) { continue; }
                this.bridgeMeshes.set(String(e.id), mesh);
            }
            if (!mesh) continue;
            var p4 = e.pos4d || [e.x || 0, e.y || 0, e.z || 0, e.w || 0];
            var p = mathProject(p4, { angles: this.angles, dist: cam.dist || 3.2 });
            try {
                mesh.position.set(p[0] * this.fold, p[1] * this.fold, p[2] * this.fold);
                var f = wFog(p[3]);
                var sc = Math.max(0.15, (p[4] || 1) * (1 - f * 0.5));
                if (e.baseScale) sc *= e.baseScale;
                mesh.scale.set(sc, sc, sc);
                mesh.visible = f < 0.98;
            } catch (_) { /* bridged mesh may be disposed */ }
        }
        // Detach meshes for entities that left the bridge set.
        var self = this;
        this.bridgeMeshes.forEach(function (mesh, id) {
            if (!seen.has(id)) {
                try { self.entityLayer.remove(mesh); } catch (_) {}
                self.bridgeMeshes.delete(id);
            }
        });
    };

    // No-THREE path: emoji billboards on a 2D canvas overlay.
    FoldRenderer.prototype._renderBillboards = function (scene4d, cam) {
        try {
            if (!this.billboardEl) {
                var cv = document.createElement('canvas');
                cv.setAttribute('data-g4d', 'fold-billboards');
                cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
                (cam.mount || document.body).appendChild(cv);
                this.billboardEl = cv;
            }
            var ctx = this.billboardEl.getContext('2d');
            var W = this.billboardEl.width = this.billboardEl.clientWidth || 640;
            var H = this.billboardEl.height = this.billboardEl.clientHeight || 400;
            ctx.clearRect(0, 0, W, H);
            var verts = scene4d.verts4d || tesseractVerts(scene4d.size || 2);
            var proj = this._projectSet(verts, cam);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (var i = 0; i < proj.length; i++) {
                var f = wFog(proj[i][3]);
                var x = W / 2 + proj[i][0] * 90 * this.fold;
                var y = H / 2 - proj[i][1] * 90 * this.fold;
                ctx.globalAlpha = lerp(0.95, 0.3, f);
                ctx.font = Math.round(lerp(22, 10, f)) + 'px serif';
                ctx.fillText(EMOJI_FALLBACK[i % EMOJI_FALLBACK.length], x, y);
            }
            var ents = scene4d.entities || [];
            for (var ei = 0; ei < ents.length; ei++) {
                var p4 = ents[ei].pos4d || [0, 0, 0, 0];
                var p = mathProject(p4, { angles: this.angles, dist: cam.dist || 3.2 });
                var ex = W / 2 + p[0] * 90, ey = H / 2 - p[1] * 90;
                ctx.globalAlpha = 0.95;
                ctx.font = '20px serif';
                ctx.fillText(ents[ei].emoji || '💀', ex, ey);
            }
            ctx.globalAlpha = 1;
            return { mode: 'billboard', verts: proj.length, fold: this.fold };
        } catch (_) {
            return { mode: 'billboard', fold: this.fold, degraded: true };
        }
    };

    FoldRenderer.prototype.project4D = function (p4, cam) {
        var eff = { angles: this.angles, dist: (cam && cam.dist) || 3.2 };
        return mathProject(p4, eff);
    };

    FoldRenderer.prototype.clear = function () {
        try {
            if (this.edgeLines) {
                var attr = this.edgeLines.geometry.getAttribute('position');
                for (var i = 0; i < attr.count; i++) attr.setXYZ(i, 0, 0, 0);
                attr.needsUpdate = true;
            }
            for (var ci = 0; ci < this.cellMeshes.length; ci++) {
                this.cellMeshes[ci].visible = false;
            }
        } catch (_) {}
    };

    FoldRenderer.prototype.dispose = function () {
        try {
            if (this.edgeLines && this.scene) this.scene.remove(this.edgeLines);
            for (var i = 0; i < this.cellMeshes.length; i++) {
                if (this.scene) this.scene.remove(this.cellMeshes[i]);
            }
            if (this.entityLayer && this.scene) this.scene.remove(this.entityLayer);
            if (this.billboardEl && this.billboardEl.parentNode) {
                this.billboardEl.parentNode.removeChild(this.billboardEl);
            }
        } catch (_) {}
        this.bridgeMeshes.clear();
    };

    window.GraveGain4DGraphics = {
        FoldRenderer: FoldRenderer,
        tesseractVerts: tesseractVerts,
        tesseractEdges: function () { return EDGES.slice(); },
        tesseractCells: tesseractCells,
        chromaticTint: chromaticTint,
        create: function (opts) { return new FoldRenderer(opts); }
    };
})();
