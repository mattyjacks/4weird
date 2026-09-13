(function () {
    'use strict';

    // GraveGain4D tesseract spark pool.
    // 4D velocity (vx,vy,vz,vw) integrated in 4D, projected by
    // GraveGain4DGraphics/GraveGain4DMath when present; trails via fading
    // line history; w-flip shimmer when w crosses zero; DreamForge morph
    // shimmer hook (window.DreamForge.onMorph) tints bursts. Perf tiers
    // potato/balanced/high/ultra scale spawn counts; prune cap evicts oldest.
    // Vanilla script, no imports. Exposes window.GraveGain4DParticles.

    var TIERS = {
        potato:   { mult: 0.25, max: 150,  trail: 0, glow: false },
        balanced: { mult: 0.6,  max: 450,  trail: 4, glow: true },
        high:     { mult: 1.0,  max: 900,  trail: 8, glow: true },
        ultra:    { mult: 1.8,  max: 1600, trail: 12, glow: true }
    };

    function hasThree() {
        try { return (typeof THREE !== 'undefined') && !!THREE.Scene; }
        catch (_) { return false; }
    }

    function Particles4D(scene, opts) {
        opts = opts || {};
        this.scene = scene || null;
        this.tier = opts.tier || 'balanced';
        var cfg = TIERS[this.tier] || TIERS.balanced;
        this.mult = cfg.mult;
        this.cap = opts.cap || cfg.max;
        this.trailLen = cfg.trail;
        this.sparks = [];
        this.degraded = [];
        this.morphTint = 0xffffff;
        this.time = 0;
        try {
            this.geo = hasThree() ? new THREE.BoxGeometry(1.6, 1.6, 1.6) : null;
        } catch (_) { this.geo = null; }
        this._hookDreamForge();
    }

    Particles4D.prototype._hookDreamForge = function () {
        try {
            var self = this;
            var DF = window.DreamForge;
            if (DF && typeof DF.onMorph === 'function') {
                DF.onMorph(function (morph) {
                    self.dreamforgeMorph(morph);
                });
            } else if (DF && typeof DF.addListener === 'function') {
                DF.addListener('morph', function (morph) { self.dreamforgeMorph(morph); });
            }
        } catch (_) {}
    };

    // DreamForge morph shimmer hook: tint + agitate the live pool.
    Particles4D.prototype.dreamforgeMorph = function (morph) {
        try {
            var hue = (morph && morph.hue != null) ? morph.hue : (Math.random() * 360);
            this.morphTint = new (THREE.Color)('hsl(' + Math.round(((hue % 360) + 360) % 360) + ',90%,65%)');
        } catch (_) { this.morphTint = 0xc084fc; }
        for (var i = 0; i < this.sparks.length; i++) {
            var s = this.sparks[i];
            s.shimmer = 1;
            s.vx += (Math.random() - 0.5) * 60;
            s.vw += (Math.random() - 0.5) * 2.5;
            try { if (s.mat) s.mat.color.setHex(this.morphTint.getHex ? this.morphTint.getHex() : 0xc084fc); } catch (_) {}
        }
    };

    Particles4D.prototype.setTier = function (tier) {
        if (!TIERS[tier]) return;
        this.tier = tier;
        this.mult = TIERS[tier].mult;
        this.cap = TIERS[tier].max;
        this.trailLen = TIERS[tier].trail;
        this.prune();
    };

    Particles4D.prototype.setBudget = function (cap) {
        var n = Math.floor(Number(cap));
        if (isFinite(n) && n > 0) this.cap = n;
        this.prune();
    };

    Particles4D.prototype._budget = function (count) {
        var scaled = Math.max(0, Math.round(count * this.mult));
        if (scaled <= 0) return 0;
        var room = this.cap - (this.sparks.length + this.degraded.length);
        if (room >= scaled) return scaled;
        this.prune(scaled - Math.max(0, room));
        return Math.min(scaled, this.cap);
    };

    Particles4D.prototype.prune = function (n) {
        var need = n != null ? n : Math.max(0, (this.sparks.length + this.degraded.length) - this.cap);
        for (var i = 0; i < need; i++) {
            if (this.sparks.length) this._kill(this.sparks.shift());
            else if (this.degraded.length) this.degraded.shift();
            else break;
        }
        // Hard prune cap: never hold more than cap entries total.
        while ((this.sparks.length + this.degraded.length) > this.cap) {
            if (this.sparks.length) this._kill(this.sparks.shift());
            else this.degraded.shift();
        }
    };

    Particles4D.prototype._mat = function (hex) {
        return new THREE.MeshBasicMaterial({
            color: hex, transparent: true, opacity: 1,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
    };

    function randVel(speed) {
        return {
            vx: (Math.random() * 2 - 1) * speed,
            vy: Math.random() * speed,
            vz: (Math.random() * 2 - 1) * speed,
            vw: (Math.random() * 2 - 1) * 2.0
        };
    }

    // Spawn a tesseract spark burst at 4D position p4 = [x,y,z,w].
    Particles4D.prototype.spawnFoldSparks = function (p4, hexColor, count) {
        p4 = p4 || [0, 0, 0, 0];
        var n = this._budget(count == null ? 15 : count);
        if (!n) return 0;
        if (!hasThree() || !this.scene || !this.geo) {
            for (var d = 0; d < n; d++) {
                this.degraded.push({ p4: p4.slice(), life: 0.6, maxLife: 0.6 });
            }
            this.prune();
            return n;
        }
        for (var i = 0; i < n; i++) {
            var v = randVel(140);
            var mat = this._mat(hexColor == null ? 0xc084fc : hexColor);
            var mesh;
            try {
                mesh = new THREE.Mesh(this.geo, mat);
                mesh.position.set(p4[0], p4[1], p4[2]);
                this.scene.add(mesh);
            } catch (_) { continue; }
            this.sparks.push({
                mesh: mesh, mat: mat,
                x: p4[0], y: p4[1], z: p4[2], w: p4[3] || 0,
                vx: v.vx, vy: v.vy, vz: v.vz, vw: v.vw,
                life: 0.7 + Math.random() * 0.5, maxLife: 1.0,
                prevW: p4[3] || 0, shimmer: 0,
                trail: []
            });
        }
        this.prune();
        return n;
    };

    // W-flip burst: high vw spread so sparks strobe as w crosses zero.
    Particles4D.prototype.spawnWFlip = function (p4, hexColor, count) {
        var n = this.spawnFoldSparks(p4, hexColor == null ? 0x00e5ff : hexColor, count == null ? 20 : count);
        for (var i = Math.max(0, this.sparks.length - n); i < this.sparks.length; i++) {
            var s = this.sparks[i];
            s.vw = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 2.5);
            s.shimmer = 1;
        }
        return n;
    };

    Particles4D.prototype._kill = function (s) {
        try {
            if (s.mesh && this.scene) this.scene.remove(s.mesh);
            if (s.mat) s.mat.dispose();
            if (s.trailLine && this.scene) this.scene.remove(s.trailLine);
        } catch (_) {}
    };

    Particles4D.prototype.update = function (dt, projectFn) {
        dt = Math.min(0.1, Math.max(0, Number(dt) || 0.016));
        this.time += dt;
        // Degraded 2D pool: pure lifetime decay.
        for (var d = this.degraded.length - 1; d >= 0; d--) {
            this.degraded[d].life -= dt;
            if (this.degraded[d].life <= 0) this.degraded.splice(d, 1);
        }
        if (!hasThree()) return { live: this.degraded.length, degraded: true };
        for (var i = this.sparks.length - 1; i >= 0; i--) {
            var s = this.sparks[i];
            s.life -= dt;
            if (s.life <= 0) {
                this._kill(s);
                this.sparks.splice(i, 1);
                continue;
            }
            s.prevW = s.w;
            s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.w += s.vw * dt;
            s.vy -= 220 * dt;
            // W-flip shimmer: strobe scale/opacity on zero crossing.
            var flipped = (s.prevW <= 0 && s.w > 0) || (s.prevW >= 0 && s.w < 0);
            if (flipped) s.shimmer = 1;
            s.shimmer = Math.max(0, s.shimmer - dt * 3);
            var f = s.life / s.maxLife;
            try {
                var p = (typeof projectFn === 'function')
                    ? projectFn([s.x, s.y, s.z, s.w])
                    : [s.x, s.y, s.z, s.w];
                s.mesh.position.set(p[0], p[1], p[2]);
                var sc = (0.6 + 0.8 * f) * (1 + s.shimmer * 1.6);
                s.mesh.scale.set(sc, sc, sc);
                s.mat.opacity = Math.min(1, f * 1.4 + s.shimmer * 0.5);
                // Trails: keep last N projected points as a fading line.
                if (this.trailLen > 0) {
                    s.trail.push(p[0], p[1], p[2]);
                    while (s.trail.length > this.trailLen * 3) {
                        s.trail.splice(0, 3);
                    }
                    if (s.trail.length >= 6 && !s.trailLine) {
                        var tg = new THREE.BufferGeometry();
                        tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(s.trail), 3));
                        s.trailLine = new THREE.Line(tg, new THREE.LineBasicMaterial({
                            color: s.mat.color.getHex(), transparent: true, opacity: 0.4,
                            blending: THREE.AdditiveBlending, depthWrite: false
                        }));
                        this.scene.add(s.trailLine);
                    } else if (s.trailLine) {
                        var attr = s.trailLine.geometry.getAttribute('position');
                        try {
                            s.trailLine.geometry.dispose();
                        } catch (_) {}
                        var ng = new THREE.BufferGeometry();
                        ng.setAttribute('position', new THREE.BufferAttribute(new Float32Array(s.trail), 3));
                        s.trailLine.geometry = ng;
                        void attr;
                    }
                }
            } catch (_) { /* per-spark failures must not kill the frame */ }
        }
        return { live: this.sparks.length, degraded: false };
    };

    Particles4D.prototype.clear = function () {
        while (this.sparks.length) this._kill(this.sparks.shift());
        this.degraded.length = 0;
    };

    Particles4D.prototype.liveCount = function () {
        return this.sparks.length + this.degraded.length;
    };

    window.GraveGain4DParticles = {
        Particles4D: Particles4D,
        TIERS: TIERS,
        create: function (scene, opts) { return new Particles4D(scene, opts); }
    };
})();
