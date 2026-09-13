(function () {
    'use strict';
    // =========================================================================
    // GRAVEGAIN4D BALLISTICS — enemy projectiles traveling in 4D with w-bounce.
    // A bolt is { x,y,z,w, vx,vy,vz,vw, dmg, life, r, color, wMin,wMax }.
    // Each tick integrates x += v*dt in all four axes; when w exits
    // [wMin, wMax] the w-velocity reflects (ana/kata bank shot) and the bolt
    // keeps flying. Slice culling: bolts far from sliceW render faded and
    // only collide when |w - player.w| < hitW. JSON-serializable for the
    // save bridge. No fullscreen/dblclick code.
    // =========================================================================
    try {
        if (typeof window === 'undefined') return;
        if (window.GraveGainBallistics4D) return;

        function num(n, fb) {
            var v = parseFloat(n);
            return (isFinite(v)) ? v : fb;
        }

        var DEFAULT_W_HALF_RANGE = 260; // w walls relative to spawn w
        var DEFAULT_HIT_W = 90;         // w proximity required for a hit

        class Bolt4D {
            constructor(opts) {
                opts = opts || {};
                this.x = num(opts.x, 0); this.y = num(opts.y, 0);
                this.z = num(opts.z, 0); this.w = num(opts.w, 0);
                this.vx = num(opts.vx, 0); this.vy = num(opts.vy, 0);
                this.vz = num(opts.vz, 0); this.vw = num(opts.vw, 0);
                this.dmg = num(opts.dmg, 10);
                this.life = num(opts.life, 4.0);
                this.r = num(opts.r, 8);
                this.color = (opts.color !== undefined) ? opts.color : 0xc084fc;
                this.kind = opts.kind || 'wraith_bolt';
                this.hitW = num(opts.hitW, DEFAULT_HIT_W);
                var spawnW = this.w;
                this.wMin = (opts.wMin !== undefined) ? num(opts.wMin, spawnW - DEFAULT_W_HALF_RANGE) : spawnW - DEFAULT_W_HALF_RANGE;
                this.wMax = (opts.wMax !== undefined) ? num(opts.wMax, spawnW + DEFAULT_W_HALF_RANGE) : spawnW + DEFAULT_W_HALF_RANGE;
                this.bounces = 0;
                this.maxBounces = Math.round(num(opts.maxBounces, 3));
                this.dead = false;
                this.sprite = null;
                this.buildSprite();
            }

            buildSprite() {
                try {
                    if (typeof THREE === 'undefined') return;
                    var geo = new THREE.SphereGeometry(this.r * 0.5, 8, 8);
                    var mat = new THREE.MeshBasicMaterial({ color: this.color });
                    this.sprite = new THREE.Mesh(geo, mat);
                    this.sprite.position.set(this.x, this.z, this.y);
                } catch (e) { this.sprite = null; }
            }

            // Returns 'alive' | 'hit' | 'expired'.
            update(dt, player, sliceW, onHit) {
                dt = Math.min(num(dt, 0.016), 0.1);
                if (this.dead) return 'expired';
                this.life -= dt;
                if (this.life <= 0) { this.destroy(); return 'expired'; }

                this.x += this.vx * dt; this.y += this.vy * dt;
                this.z += this.vz * dt; this.w += this.vw * dt;

                // W-bounce: reflect vw at the fold walls (bank shot ana/kata).
                if (this.w < this.wMin) {
                    this.w = this.wMin;
                    if (this.vw < 0) {
                        this.vw = -this.vw;
                        this.bounces++;
                    }
                } else if (this.w > this.wMax) {
                    this.w = this.wMax;
                    if (this.vw > 0) {
                        this.vw = -this.vw;
                        this.bounces++;
                    }
                }
                if (this.bounces > this.maxBounces) { this.destroy(); return 'expired'; }

                if (this.sprite) {
                    try {
                        this.sprite.position.set(this.x, this.z, this.y);
                        var dw = Math.abs(this.w - num(sliceW, this.w));
                        var fade = Math.max(0.15, 1 - dw / 300);
                        if (this.sprite.material) {
                            this.sprite.material.transparent = true;
                            this.sprite.material.opacity = fade;
                        }
                    } catch (e) { /* never throws */ }
                }

                // Hit test: slice-plane contact + w proximity.
                if (player) {
                    var dx = num(player.x, 0) - this.x;
                    var dy = num(player.y, 0) - this.y;
                    var dwHit = Math.abs(num(player.w, 0) - this.w);
                    var pr = num(player.radius, 14);
                    if (dwHit < this.hitW && (dx * dx + dy * dy) < (pr + this.r) * (pr + this.r)) {
                        try { if (onHit) onHit(player, this); else if (player.takeDamage) player.takeDamage(this.dmg); } catch (e) {}
                        this.destroy();
                        return 'hit';
                    }
                }
                return 'alive';
            }

            destroy() {
                this.dead = true;
                try {
                    if (this.sprite && this.sprite.parent) this.sprite.parent.remove(this.sprite);
                    if (this.sprite) {
                        if (this.sprite.geometry) { try { this.sprite.geometry.dispose(); } catch (e) {} }
                        if (this.sprite.material) { try { this.sprite.material.dispose(); } catch (e) {} }
                    }
                } catch (e) { /* never throws */ }
                this.sprite = null;
            }

            toJSON() {
                return {
                    x: this.x, y: this.y, z: this.z, w: this.w,
                    vx: this.vx, vy: this.vy, vz: this.vz, vw: this.vw,
                    dmg: this.dmg, life: this.life, r: this.r, color: this.color,
                    kind: this.kind, hitW: this.hitW,
                    wMin: this.wMin, wMax: this.wMax,
                    bounces: this.bounces, maxBounces: this.maxBounces, dead: this.dead
                };
            }

            static fromJSON(data) {
                data = data || {};
                var b = new Bolt4D(data);
                b.bounces = Math.round(num(data.bounces, 0));
                b.dead = !!data.dead;
                return b;
            }
        }

        // Aim a bolt from `from4` at `to4` with scalar speed + optional w-arc.
        function fireBolt(from4, to4, speed, opts) {
            from4 = from4 || {}; to4 = to4 || {}; opts = opts || {};
            var dx = num(to4.x, 0) - num(from4.x, 0);
            var dy = num(to4.y, 0) - num(from4.y, 0);
            var dz = num(to4.z, 0) - num(from4.z, 0);
            var dw = num(to4.w, 0) - num(from4.w, 0);
            var len = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw) || 1;
            var sp = num(speed, 240);
            var o = Object.assign({}, opts, {
                x: num(from4.x, 0), y: num(from4.y, 0),
                z: num(from4.z, 0), w: num(from4.w, 0),
                vx: (dx / len) * sp, vy: (dy / len) * sp,
                vz: (dz / len) * sp, vw: (dw / len) * sp + num(opts.wArc, 0)
            });
            return new Bolt4D(o);
        }

        // Fan of N bolts spread across the XW plane (boss signature).
        function fireFan(from4, to4, speed, count, spreadRad, opts) {
            var bolts = [];
            count = Math.max(1, Math.round(num(count, 3)));
            spreadRad = num(spreadRad, 0.5);
            for (var i = 0; i < count; i++) {
                var t = (count === 1) ? 0 : (i / (count - 1) - 0.5) * 2; // -1..1
                var ang = t * spreadRad;
                var dx = num(to4.x, 0) - num(from4.x, 0);
                var dy = num(to4.y, 0) - num(from4.y, 0);
                var base = Math.atan2(dy, dx) + ang;
                var sp = num(speed, 240);
                var dw = num(to4.w, 0) - num(from4.w, 0);
                var o = Object.assign({}, opts || {}, {
                    x: num(from4.x, 0), y: num(from4.y, 0),
                    z: num(from4.z, 0), w: num(from4.w, 0),
                    vx: Math.cos(base) * sp, vy: Math.sin(base) * sp,
                    vz: 0, vw: (dw >= 0 ? 1 : -1) * Math.abs(Math.sin(ang)) * sp * 0.6
                });
                bolts.push(new Bolt4D(o));
            }
            return bolts;
        }

        window.GraveGainBallistics4D = {
            Bolt4D: Bolt4D,
            fireBolt: fireBolt,
            fireFan: fireFan,
            DEFAULT_W_HALF_RANGE: DEFAULT_W_HALF_RANGE,
            DEFAULT_HIT_W: DEFAULT_HIT_W
        };
    } catch (e) { /* never throws */ }
})();
