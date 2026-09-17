(function () {
    'use strict';

    // Pooled, budget-capped particle system with additive glow spawners.
    // Existing signatures (spawnSparks/spawnBlood/spawnDeathBurst/update/clear)
    // are unchanged; new spawners are additive-only.
    class ParticleSystem {
        constructor(scene, opts = {}) {
            this.scene = scene;
            this.chunks = [];   // box debris (gravity + floor bounce)
            this.glows = [];    // additive sprites (embers/wisps, gravity + fade)
            this.rings = [];    // expanding aura rings (fade + grow)
            this.particleMult = opts.particleMult || 1;
            this.maxParticles = opts.maxParticles || 900;
            this.gravity = opts.gravity || 600;
            try {
                this._boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
                this._bloodGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
            } catch (_) { this._boxGeo = null; this._bloodGeo = null; }
        }

        // Called by game-runtime when the graphics preset changes.
        setParticleMult(mult) {
            const m = Number(mult);
            if (isFinite(m) && m > 0) this.particleMult = Math.min(3, Math.max(0.2, m));
        }

        setBudget(max) {
            const n = Number(max);
            if (isFinite(n) && n > 0) this.maxParticles = Math.floor(n);
        }

        _liveCount() {
            return this.chunks.length + this.glows.length + this.rings.length;
        }

        // Scale a requested count by particleMult and clamp to remaining budget.
        // Evicts oldest entries when over budget (pool behavior).
        _budget(count) {
            const scaled = Math.max(0, Math.round(count * this.particleMult));
            if (scaled <= 0) return 0;
            const room = this.maxParticles - this._liveCount();
            if (room >= scaled) return scaled;
            this._evict(scaled - Math.max(0, room));
            return Math.min(scaled, this.maxParticles);
        }

        _evict(n) {
            for (let i = 0; i < n; i++) {
                if (this.chunks.length) this._killChunk(this.chunks.shift());
                else if (this.glows.length) this._killGlow(this.glows.shift());
                else if (this.rings.length) this._killRing(this.rings.shift());
                else break;
            }
        }

        _additiveMat(hexColor, opacity = 1) {
            return new THREE.MeshBasicMaterial({
                color: hexColor, transparent: true, opacity,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
        }

        spawnSparks(x, z, hexColor = 0xffcc4c, count = 15) {
            const n = this._budget(count);
            if (!n) return;
            const mat = this._additiveMat(hexColor);
            for (let i = 0; i < n; i++) {
                const mesh = new THREE.Mesh(this._boxGeo || new THREE.BoxGeometry(1.8, 1.8, 1.8), mat);
                mesh.position.set(x, 14, z);
                this.scene.add(mesh);
                const maxLife = 0.4 + Math.random() * 0.3;
                this.chunks.push({
                    mesh,
                    mat,
                    vx: (Math.random() * 2 - 1) * 140,
                    vy: 80 + Math.random() * 120,
                    vz: (Math.random() * 2 - 1) * 140,
                    life: maxLife, maxLife, additive: true
                });
            }
        }

        spawnBlood(x, z, hexColor = 0xef4444, count = 12) {
            const n = this._budget(count);
            if (!n) return;
            const mat = new THREE.MeshBasicMaterial({ color: hexColor, transparent: true, opacity: 1 });
            for (let i = 0; i < n; i++) {
                const mesh = new THREE.Mesh(this._bloodGeo || new THREE.BoxGeometry(2.5, 2.5, 2.5), mat);
                mesh.position.set(x + (Math.random() * 6 - 3), 16, z + (Math.random() * 6 - 3));
                this.scene.add(mesh);
                const maxLife = 0.5 + Math.random() * 0.3;
                this.chunks.push({
                    mesh,
                    mat,
                    vx: (Math.random() * 2 - 1) * 100,
                    vy: 100 + Math.random() * 80,
                    vz: (Math.random() * 2 - 1) * 100,
                    life: maxLife, maxLife, additive: false
                });
            }
        }

        // Torch embers: small additive sprites that rise, drift and fade.
        spawnTorchEmber(x, y, z, count = 6, hexColor = 0xffaa33) {
            const n = this._budget(count);
            if (!n) return;
            const PT = window.GraveGainProceduralTextures;
            for (let i = 0; i < n; i++) {
                let sprite = null;
                try {
                    sprite = PT && PT.createGlowSprite
                        ? PT.createGlowSprite('#ffbb44')
                        : PT.createTorchFlameSprite();
                } catch (_) { continue; }
                sprite.position.set(x + (Math.random() * 8 - 4), y + Math.random() * 6, z + (Math.random() * 8 - 4));
                const s = 4 + Math.random() * 6;
                sprite.scale.set(s, s, 1);
                if (sprite.material && sprite.material.color && typeof hexColor === 'number') {
                    try { sprite.material.color.setHex(hexColor); } catch (_) {}
                }
                this.scene.add(sprite);
                const maxLife = 0.7 + Math.random() * 0.8;
                this.glows.push({
                    sprite, life: maxLife, maxLife,
                    vx: (Math.random() * 2 - 1) * 18,
                    vy: 22 + Math.random() * 30,
                    vz: (Math.random() * 2 - 1) * 18
                });
            }
        }

        // Soul wisps: slow cyan/violet drifters with sine sway + fade.
        spawnSoulWisp(x, z, hexColor = 0x2dd4bf, count = 4) {
            const n = this._budget(count);
            if (!n) return;
            const PT = window.GraveGainProceduralTextures;
            for (let i = 0; i < n; i++) {
                let sprite = null;
                try {
                    const css = '#' + Number(hexColor).toString(16).padStart(6, '0');
                    sprite = PT && PT.createGlowSprite ? PT.createGlowSprite(css) : PT.createTorchFlameSprite();
                } catch (_) { continue; }
                sprite.position.set(x + (Math.random() * 30 - 15), 12 + Math.random() * 26, z + (Math.random() * 30 - 15));
                const s = 8 + Math.random() * 10;
                sprite.scale.set(s, s, 1);
                this.scene.add(sprite);
                const maxLife = 1.6 + Math.random() * 1.4;
                this.glows.push({
                    sprite, life: maxLife, maxLife,
                    vx: (Math.random() * 2 - 1) * 14,
                    vy: 8 + Math.random() * 12,
                    vz: (Math.random() * 2 - 1) * 14,
                    sway: Math.random() * Math.PI * 2
                });
            }
        }

        // Boss aura ring: expanding additive shockwave that fades out.
        spawnBossAuraRing(x, z, hexColor = 0x8b5cf6, maxScale = 160) {
            const n = this._budget(1);
            if (!n) return;
            try {
                const geo = new THREE.RingGeometry(8, 11, 40);
                const mat = new THREE.MeshBasicMaterial({
                    color: hexColor, transparent: true, opacity: 0.9,
                    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.set(x, 2, z);
                this.scene.add(mesh);
                this.rings.push({ mesh, mat, geo, life: 1.0, maxLife: 1.0, maxScale });
            } catch (_) { /* r128 RingGeometry always exists; stay silent */ }
        }

        // Death-burst color per enemy type/name. Mirrors the enemy.js variant
        // palette so kill feedback matches the model that died.
        static deathBurstColorFor(nameOrType) {
            const n = String(nameOrType || '').toLowerCase();
            if (/lucifer|hades|consciousness/.test(n)) return 0xc4b5fd; // white-violet
            if (/titan|necro/.test(n)) return 0x8b5cf6;                 // citadel violet
            if (/golem|chem|toxic/.test(n)) return 0x22c55e;            // toxic green
            if (/drone/.test(n)) return 0x22d3ee;                       // array cyan
            if (/necromancer|elf|grove|wisp/.test(n)) return 0x2dd4bf;  // elven teal
            if (/thane|dwarf|forge|spark/.test(n)) return 0xf59e0b;     // dwarven amber
            if (/berserker|orc|goblin/.test(n)) return 0xef4444;        // orc red
            if (/clint|patriarch/.test(n)) return 0xffd700;             // relic gold
            if (/goliath|warlord/.test(n)) return 0xef4444;
            if (/skull/.test(n)) return 0xff7722;
            if (/mage/.test(n)) return 0xa855f7;
            return 0xef4444;
        }

        spawnDeathBurst(x, z, nameOrType, count) {
            const color = ParticleSystem.deathBurstColorFor(nameOrType);
            this.spawnSparks(x, z, color, count || 22);
            this.spawnBlood(x, z, color, 10);
            // Extra soul-wisp flourish on high particle budgets (free on low:
            // _budget returns 0 when the pool is exhausted).
            this.spawnSoulWisp(x, z, color, 3);
        }

        _killChunk(c) {
            try {
                this.scene.remove(c.mesh);
                if (c.mesh.geometry && c.mesh.geometry !== this._boxGeo && c.mesh.geometry !== this._bloodGeo) c.mesh.geometry.dispose();
            } catch (_) {}
        }

        _killGlow(g) {
            try {
                this.scene.remove(g.sprite);
                if (g.sprite.material) {
                    if (g.sprite.material.map) g.sprite.material.map.dispose();
                    g.sprite.material.dispose();
                }
            } catch (_) {}
        }

        _killRing(r) {
            try {
                this.scene.remove(r.mesh);
                if (r.geo) r.geo.dispose();
                if (r.mat) r.mat.dispose();
            } catch (_) {}
        }

        update(dt) {
            // Box debris: gravity + floor bounce + fade.
            this.chunks.forEach(c => {
                c.life -= dt;
                c.vy -= this.gravity * dt;
                c.mesh.position.x += c.vx * dt;
                c.mesh.position.y += c.vy * dt;
                c.mesh.position.z += c.vz * dt;
                if (c.mesh.position.y <= 1) {
                    c.mesh.position.y = 1;
                    c.vx *= 0.5;
                    c.vz *= 0.5;
                }
                // Fade: shrink + fade shared-burst material toward end of life.
                try {
                    const f = Math.max(0, c.life / c.maxLife);
                    if (c.additive && c.mat) c.mat.opacity = Math.min(1, f * 1.5);
                    const s = 0.4 + 0.6 * f;
                    c.mesh.scale.set(s, s, s);
                } catch (_) {}
            });

            // Glow sprites: rise/drift + per-sprite fade.
            this.glows.forEach(g => {
                g.life -= dt;
                g.vy -= 12 * dt; // slight settle so embers don't accelerate forever
                g.sprite.position.x += g.vx * dt + (g.sway !== undefined ? Math.sin(performance.now() * 0.003 + g.sway) * 12 * dt : 0);
                g.sprite.position.y += g.vy * dt;
                g.sprite.position.z += g.vz * dt;
                try {
                    const f = Math.max(0, g.life / g.maxLife);
                    if (g.sprite.material) g.sprite.material.opacity = Math.min(1, f * 1.6);
                } catch (_) {}
            });

            // Aura rings: expand + fade.
            this.rings.forEach(r => {
                r.life -= dt;
                const t = 1 - Math.max(0, r.life / r.maxLife);
                try {
                    const s = 1 + t * (r.maxScale / 11);
                    r.mesh.scale.set(s, s, 1);
                    r.mat.opacity = 0.9 * (1 - t);
                } catch (_) {}
            });

            const dead = this.chunks.filter(c => c.life <= 0);
            const liveMats = new Set(this.chunks.filter(c => c.life > 0).map(c => c.mat));
            dead.forEach(c => {
                this._killChunk(c);
                if (c.mat && !liveMats.has(c.mat)) { try { c.mat.dispose(); } catch (_) {} }
            });
            this.chunks = this.chunks.filter(c => c.life > 0);

            const deadG = this.glows.filter(g => g.life <= 0);
            deadG.forEach(g => this._killGlow(g));
            this.glows = this.glows.filter(g => g.life > 0);

            const deadR = this.rings.filter(r => r.life <= 0);
            deadR.forEach(r => this._killRing(r));
            this.rings = this.rings.filter(r => r.life > 0);
        }

        clear() {
            const mats = new Set(this.chunks.map(c => c.mat));
            this.chunks.forEach(c => this._killChunk(c));
            mats.forEach(m => { try { m.dispose(); } catch (_) {} });
            this.chunks = [];
            this.glows.forEach(g => this._killGlow(g));
            this.glows = [];
            this.rings.forEach(r => this._killRing(r));
            this.rings = [];
        }
    }

    window.GraveGainParticleSystem = ParticleSystem;
})();
