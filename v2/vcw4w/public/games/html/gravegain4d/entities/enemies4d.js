(function () {
    'use strict';
    // =========================================================================
    // GRAVEGAIN4D ENEMIES — trash-mob roster (agent: enemies/bosses 4D).
    // Same GraveGain canon as gravegain3d/entities/enemy.js: undead cannibals
    // risen by Lucifer Hades NecroGenesis. KillCredits/gold drops on death,
    // voxel gore burst on death. 4D twist: every enemy lives in (x, y, z, w);
    // the playable 3D slice is a hyperplane at sliceW (see gravegain4d-math).
    //
    // Shape mirrors EnemyEntity: constructor(typeData, x, y, z, w, diffScale),
    // fields { name, x,y,z,w, radius, angle, hp/maxHp, dmg, speed, elite,
    // isBoss, variantKey, scale, bloodColor, kx,ky,kz,kw, state, attackTimer,
    // attackInterval }, update(dt, player, game), takeDamage(), die(),
    // toJSON()/fromJSON() for the save bridge. Emoji-billboard visuals
    // (no fullscreen/dblclick code anywhere in this file).
    // =========================================================================
    try {
        if (typeof window === 'undefined') return;
        if (window.GraveGainEnemies4D) return;

        var MATH = window.GraveGain4DMath || null;

        function num(n, fb) {
            var v = parseFloat(n);
            return (isFinite(v)) ? v : fb;
        }

        // ---- Emoji billboard (matches LootItem.createEmojiSprite style) ----
        function makeEmojiBillboard(emoji, sizePx) {
            try {
                var PT = window.GraveGainProceduralTextures;
                if (PT && PT.createEmojiSprite) return PT.createEmojiSprite(emoji, sizePx || 64);
                if (typeof THREE === 'undefined') return null;
                var c = document.createElement('canvas');
                c.width = c.height = sizePx || 64;
                var g = c.getContext('2d');
                g.font = ((sizePx || 64) - 8) + 'px serif';
                g.textAlign = 'center';
                g.textBaseline = 'middle';
                g.fillText(emoji, (sizePx || 64) / 2, (sizePx || 64) / 2);
                var tex = new THREE.CanvasTexture(c);
                var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
                return new THREE.Sprite(mat);
            } catch (e) { return null; }
        }

        function dist4(ax, ay, az, aw, bx, by, bz, bw) {
            var dx = ax - bx, dy = ay - by, dz = az - bz, dw = aw - bw;
            return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
        }

        class Enemy4D {
            constructor(typeData, x, y, z, w, difficultyScale) {
                typeData = typeData || {};
                var diff = num(difficultyScale, 1) || 1;
                this.key = typeData.key || 'hyper_slime';
                this.name = typeData.name || 'Hyper-Slime';
                this.emoji = typeData.emoji || '🟢';
                this.x = num(x, 0); this.y = num(y, 0);
                this.z = num(z, 0); this.w = num(w, 0);
                this.spawnX = this.x; this.spawnY = this.y;
                this.spawnZ = this.z; this.spawnW = this.w;
                this.radius = num(typeData.radius, 16);
                this.angle = 0;       // yaw in slice plane
                this.xwAngle = 0;     // XW fold rotation (golem + render tilt)
                this.type = typeData.type || 'melee';
                this.isBoss = false;
                this.elite = !!typeData.elite;

                this.maxHp = Math.round(num(typeData.hp, 30) * diff * num(typeData.hpMultiplier, 1));
                this.hp = this.maxHp;
                this.dmg = num(typeData.dmg, 8) * diff * num(typeData.damageMultiplier, 1);
                this.speed = num(typeData.speed, 90);
                this.variantKey = this.key;
                this.scale = num(typeData.scale, 1) * (this.elite ? 1.35 : 1.0);
                this.bloodColor = (typeData.bloodColor !== undefined) ? typeData.bloodColor : 0x84cc16;

                // 4D knockback velocity
                this.kx = 0; this.ky = 0; this.kz = 0; this.kw = 0;
                this.state = 'idle';
                this.attackTimer = 0;
                this.attackInterval = num(typeData.attackInterval, 1.2);
                this.blinkTimer = num(typeData.blinkInterval, 3.0); // wraith/bat w-phase
                this.slamTimer = 0;      // golem telegraph countdown
                this.slamTelegraph = 0;  // >0 while flashing before slam
                this.wobble = Math.random() * Math.PI * 2;
                this.sliceW = this.w;    // last rendered slice position

                // Drops (KillCredits + gold, same economy words as 3D loot)
                this.goldValue = Math.round(num(typeData.gold, 12) * diff);
                this.killCredits = Math.round(num(typeData.killCredits, 1));

                this.ai = Object.assign({}, typeData.ai || {});
                this.group3d = null;
                this.billboard = null;
                this.buildModel(typeData);
            }

            buildModel(typeData) {
                try {
                    if (typeof THREE === 'undefined') return;
                    this.group3d = new THREE.Group();
                    this.group3d.scale.set(this.scale, this.scale, this.scale);
                    this.billboard = makeEmojiBillboard(this.emoji, 64);
                    if (this.billboard) {
                        this.billboard.position.y = 20;
                        this.billboard.scale.set(22, 22, 1);
                        this.group3d.add(this.billboard);
                    }
                    // W-echo: a second, translucent billboard offset along the
                    // slice normal so the player sees the ana/kata twin.
                    if (typeData.wEcho !== false) {
                        var echo = makeEmojiBillboard(this.emoji, 48);
                        if (echo) {
                            echo.material.opacity = 0.35;
                            echo.position.set(10, 14, -10);
                            echo.scale.set(14, 14, 1);
                            this.group3d.add(echo);
                            this.wEcho = echo;
                        }
                    }
                    this.syncSlice(this.w);
                } catch (e) { /* visuals never break logic */ }
            }

            // Project (x,y,z,w) onto the visible 3D slice at sliceW.
            syncSlice(sliceW) {
                try {
                    this.sliceW = num(sliceW, this.w);
                    if (!this.group3d) return;
                    var dw = this.w - this.sliceW;
                    var fade = Math.max(0.15, 1 - Math.abs(dw) / 220);
                    this.group3d.position.set(this.x, Math.max(0, this.z - Math.abs(dw) * 0.15), this.y);
                    this.group3d.rotation.y = -this.angle + Math.PI / 2;
                    this.group3d.rotation.x = this.xwAngle * 0.25;
                    if (this.billboard && this.billboard.material) {
                        this.billboard.material.opacity = fade;
                    }
                    // Telegraph flash: pulse scale while winding up a slam.
                    if (this.slamTelegraph > 0 && this.billboard) {
                        var p = 1 + 0.25 * Math.sin(Date.now() * 0.03);
                        this.billboard.scale.set(22 * p, 22 * p, 1);
                    }
                } catch (e) { /* never throws */ }
            }

            update(dt, player, game, sliceW) {
                dt = Math.min(num(dt, 0.016), 0.1);
                player = player || {};
                var px = num(player.x, 0), py = num(player.y, 0);
                var pz = num(player.z, 0), pw = num(player.w, 0);
                var d = dist4(this.x, this.y, this.z, this.w, px, py, pz, pw);

                // Decay 4D knockback
                this.x += this.kx * dt; this.y += this.ky * dt;
                this.z += this.kz * dt; this.w += this.kw * dt;
                var damp = Math.max(0, 1 - 8 * dt);
                this.kx *= damp; this.ky *= damp; this.kz *= damp; this.kw *= damp;
                this.wobble += dt * 3;

                if (this.attackTimer > 0) this.attackTimer -= dt;
                if (this.blinkTimer > 0) this.blinkTimer -= dt;
                if (this.slamTimer > 0) this.slamTimer -= dt;

                if (d < 520 && this.state === 'idle') this.state = 'chase';

                if (this.state === 'chase') {
                    this.angle = Math.atan2(py - this.y, px - this.x);

                    if (this.key === 'hyper_slime') {
                        // Ooze hop: burst speed with sine wobble, drifts in w.
                        var hop = 1 + 0.4 * Math.sin(this.wobble);
                        this.moveToward(player, this.speed * hop, dt, game);
                        this.w += Math.sin(this.wobble * 0.5) * 20 * dt;
                    } else if (this.key === 'tesseract_golem') {
                        // Rotates in XW; telegraphed slam when close in slice.
                        this.xwAngle += dt * 0.9;
                        var sliceDist = Math.hypot(px - this.x, py - this.y);
                        if (sliceDist < 90 && this.slamTimer <= 0 && this.slamTelegraph <= 0) {
                            this.slamTelegraph = 0.8; // wind-up, visible flash
                            if (game && game.audio) { try { game.audio.playSfx('telegraph', 0.6); } catch (e) {} }
                        }
                        if (this.slamTelegraph > 0) {
                            this.slamTelegraph -= dt;
                            if (this.slamTelegraph <= 0) {
                                this.slamTimer = 2.2;
                                if (game && game.enemySlam) {
                                    try { game.enemySlam(this, sliceDist); } catch (e) {}
                                } else if (player.takeDamage && sliceDist < 110) {
                                    try { player.takeDamage(this.dmg * 1.6); } catch (e) {}
                                }
                                if (game && game.vfx) { try { game.vfx.spawnSparks(this.x, this.y, 0xfbbf24, 24); } catch (e) {} }
                            }
                        } else {
                            this.moveToward(player, this.speed, dt, game);
                        }
                    } else if (this.key === 'pentachoron_wraith') {
                        // Ana/kata blinks: periodic teleport along w toward player.
                        if (this.blinkTimer <= 0) {
                            this.blinkTimer = this.ai.blinkInterval || 3.0;
                            this.w = pw + (Math.random() - 0.5) * 60;
                            this.x += (Math.random() - 0.5) * 80;
                            this.y += (Math.random() - 0.5) * 80;
                            if (game && game.vfx) { try { game.vfx.spawnSparks(this.x, this.y, 0xc084fc, 16); } catch (e) {} }
                        }
                        this.moveToward(player, this.speed, dt, game);
                    } else if (this.key === 'rift_qubit_bat') {
                        // Fast, erratic w-phase flutter; kamikaze like 3D skulls.
                        this.w = pw + Math.sin(this.wobble * 2.1) * 120;
                        this.moveToward(player, this.speed, dt, game);
                    } else {
                        this.moveToward(player, this.speed, dt, game);
                    }

                    // Ranged attackers spit 4D projectiles (see ballistics.js).
                    if (this.type === 'ranged' && d < 380 && d > 120 && this.attackTimer <= 0) {
                        this.attackTimer = this.attackInterval;
                        if (game && game.spawnEnemyProjectile4D) {
                            try { game.spawnEnemyProjectile4D(this, player); } catch (e) {}
                        }
                    }

                    // Melee contact (slice-plane distance + w proximity).
                    var dw = Math.abs(this.w - pw);
                    var contact = Math.hypot(px - this.x, py - this.y) < this.radius + num(player.radius, 14) + 12;
                    if (contact && dw < 90 && this.attackTimer <= 0 && player.takeDamage) {
                        this.attackTimer = this.attackInterval;
                        try { player.takeDamage(this.dmg); } catch (e) {}
                        if (this.key === 'rift_qubit_bat') {
                            // Kamikaze pop, mirrors 3D skull behavior.
                            if (game && game.vfx) { try { game.vfx.spawnSparks(this.x, this.y, 0xff4422, 30); } catch (e) {} }
                            this.hp = 0;
                        }
                    }
                }

                this.syncSlice(sliceW !== undefined ? sliceW : pw);
                return this.hp <= 0 ? 'dead' : this.state;
            }

            moveToward(player, speed, dt, game) {
                var dx = num(player.x, 0) - this.x, dy = num(player.y, 0) - this.y;
                var dz = num(player.z, 0) - this.z, dw = num(player.w, 0) - this.w;
                var len = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw) || 1;
                this.x += (dx / len) * speed * dt;
                this.y += (dy / len) * speed * dt;
                this.z += (dz / len) * speed * dt;
                // W drift is damped: enemies chase mostly in-slice, phase in w.
                this.w += (dw / len) * speed * 0.35 * dt;
                if (game && game.physics && game.tilemap && game.physics.moveEntityWithCollision) {
                    try { game.physics.moveEntityWithCollision(this, 0, 0, game.tilemap); } catch (e) {}
                }
            }

            takeDamage(amount, kx, ky, kz, kw) {
                this.hp -= num(amount, 0);
                this.kx += num(kx, 0); this.ky += num(ky, 0);
                this.kz += num(kz, 0); this.kw += num(kw, 0);
                return this.hp <= 0;
            }

            // Death: voxel gore burst + KillCredits/gold payload.
            // Returns { gold, killCredits, splits } — splits carry w-offsets
            // for hyper-slime fission (handled by the spawner).
            die(game) {
                var payload = {
                    gold: this.goldValue,
                    killCredits: this.killCredits + (this.elite ? 1 : 0),
                    splits: []
                };
                try {
                    var VG = window.GraveGainVoxelGore || window.GraveGainVoxGore;
                    if (VG && VG.spawn) {
                        VG.spawn(this.x, this.y, this.bloodColor, 24);
                    } else if (game && game.vfx && game.vfx.spawnSparks) {
                        game.vfx.spawnSparks(this.x, this.y, this.bloodColor, 24);
                    }
                    if (game && game.audio) game.audio.playSfx('enemyDie', 0.7);
                } catch (e) { /* never throws */ }
                if (this.key === 'hyper_slime' && !this.isMini) {
                    // Fission across w: two minis offset ana (+w) and kata (-w).
                    payload.splits = [
                        { key: 'hyper_slime_mini', wOffset: 60 },
                        { key: 'hyper_slime_mini', wOffset: -60 }
                    ];
                }
                this.destroy();
                return payload;
            }

            destroy() {
                try {
                    if (this.group3d && this.group3d.parent) this.group3d.parent.remove(this.group3d);
                    if (this.group3d) {
                        this.group3d.traverse(function (child) {
                            if (child.geometry) { try { child.geometry.dispose(); } catch (e) {} }
                            if (child.material) {
                                try {
                                    if (child.material.map) child.material.map.dispose();
                                    child.material.dispose();
                                } catch (e) {}
                            }
                        });
                    }
                } catch (e) { /* never throws */ }
                this.group3d = null;
                this.billboard = null;
            }

            // ---- Save bridge: JSON-serializable state ----
            toJSON() {
                return {
                    key: this.key, name: this.name, emoji: this.emoji,
                    x: this.x, y: this.y, z: this.z, w: this.w,
                    hp: this.hp, maxHp: this.maxHp, dmg: this.dmg,
                    speed: this.speed, elite: this.elite,
                    state: this.state, attackTimer: this.attackTimer,
                    goldValue: this.goldValue, killCredits: this.killCredits,
                    isMini: !!this.isMini, bloodColor: this.bloodColor,
                    scale: this.scale
                };
            }

            static fromJSON(data) {
                data = data || {};
                var e = new Enemy4D({
                    key: data.key, name: data.name, emoji: data.emoji,
                    hp: data.maxHp || data.hp, dmg: data.dmg, speed: data.speed,
                    elite: data.elite, gold: data.goldValue,
                    killCredits: data.killCredits, bloodColor: data.bloodColor,
                    scale: data.scale
                }, data.x, data.y, data.z, data.w, 1);
                e.hp = num(data.hp, e.maxHp);
                e.state = data.state || 'chase';
                e.attackTimer = num(data.attackTimer, 0);
                e.isMini = !!data.isMini;
                return e;
            }
        }

        // ---- Roster stat blocks: HP / attack / speed ----
        Enemy4D.ROSTER = {
            hyper_slime: {
                key: 'hyper_slime', name: 'Hyper-Slime', emoji: '🟢',
                hp: 46, dmg: 10, speed: 95, scale: 1.1, radius: 16,
                type: 'melee', gold: 12, killCredits: 1,
                bloodColor: 0x4ade80, attackInterval: 1.1,
                ai: { splitsAcrossW: true },
                lore: 'NecroGenesis ooze. Fissions ana/kata on death.'
            },
            hyper_slime_mini: {
                key: 'hyper_slime_mini', name: 'Hyper-Slime Mote', emoji: '🟢',
                hp: 18, dmg: 6, speed: 130, scale: 0.6, radius: 10,
                type: 'melee', gold: 5, killCredits: 1,
                bloodColor: 0x4ade80, attackInterval: 0.9, ai: {}
            },
            tesseract_golem: {
                key: 'tesseract_golem', name: 'Tesseract Golem', emoji: '🗿',
                hp: 170, dmg: 26, speed: 55, scale: 1.7, radius: 24,
                type: 'melee', gold: 30, killCredits: 3,
                bloodColor: 0xf59e0b, attackInterval: 1.8,
                ai: { xwSpin: true, telegraphedSlam: true },
                lore: 'Rotates in XW. Flash = slam incoming. Sidestep in w.'
            },
            pentachoron_wraith: {
                key: 'pentachoron_wraith', name: 'Pentachoron Wraith', emoji: '👹',
                hp: 70, dmg: 22, speed: 105, scale: 1.2, radius: 15,
                type: 'ranged', gold: 26, killCredits: 2,
                bloodColor: 0xc084fc, attackInterval: 2.0, blinkInterval: 3.0,
                ai: { blinkInterval: 3.0, anaKata: true },
                lore: 'Five-celled horror. Blinks ana/kata; never where you aim.'
            },
            rift_qubit_bat: {
                key: 'rift_qubit_bat', name: 'Rift Qubit Bat', emoji: '🦇',
                hp: 20, dmg: 24, speed: 185, scale: 0.8, radius: 10,
                type: 'skull', gold: 10, killCredits: 1,
                bloodColor: 0x22d3ee, attackInterval: 1.0,
                ai: { kamikaze: true, wFlutter: true },
                lore: 'Superposed pest. Collapses into your face. Explodes.'
            },
            grave_husk_4d: {
                key: 'grave_husk_4d', name: 'Fold Husk', emoji: '🧟',
                hp: 34, dmg: 11, speed: 110, scale: 1.0, radius: 15,
                type: 'melee', gold: 12, killCredits: 1,
                bloodColor: 0xddddcc, attackInterval: 1.2, ai: {}
            },
            marrow_skull_4d: {
                key: 'marrow_skull_4d', name: 'Marrow Skull', emoji: '💀',
                hp: 18, dmg: 26, speed: 160, scale: 0.9, radius: 10,
                type: 'skull', gold: 10, killCredits: 1,
                bloodColor: 0xff7722, attackInterval: 1.0, ai: { kamikaze: true }
            },
            hex_cultist_4d: {
                key: 'hex_cultist_4d', name: 'Fold Occultist', emoji: '🧙',
                hp: 55, dmg: 20, speed: 70, scale: 1.0, radius: 14,
                type: 'ranged', gold: 20, killCredits: 2,
                bloodColor: 0x2dd4bf, attackInterval: 2.2, ai: {}
            }
        };

        Enemy4D.spawn = function (key, x, y, z, w, diffScale, overrides) {
            var base = Enemy4D.ROSTER[key] || Enemy4D.ROSTER.grave_husk_4d;
            var data = Object.assign({}, base, overrides || {});
            var e = new Enemy4D(data, x, y, z, w, diffScale || 1);
            if (key === 'hyper_slime_mini') e.isMini = true;
            return e;
        };

        // Per-theme trash pools (mirrors EnemyEntity.THEME_MOBS keys from
        // gravegain4d-missions.js dungeonTheme values).
        Enemy4D.THEME_MOBS_4D = {
            metallic_ship: ['grave_husk_4d', 'rift_qubit_bat', 'hex_cultist_4d'],
            elven_grove: ['grave_husk_4d', 'marrow_skull_4d', 'pentachoron_wraith'],
            dwarven_vault: ['tesseract_golem', 'marrow_skull_4d', 'grave_husk_4d'],
            orc_wastes: ['hyper_slime', 'rift_qubit_bat', 'pentachoron_wraith'],
            toxic_catacombs: ['hyper_slime', 'tesseract_golem', 'hex_cultist_4d'],
            stone_crypt: ['grave_husk_4d', 'marrow_skull_4d', 'hex_cultist_4d'],
            citadel_darkness: ['pentachoron_wraith', 'tesseract_golem', 'rift_qubit_bat']
        };

        Enemy4D.mobsForTheme = function (theme) {
            return (Enemy4D.THEME_MOBS_4D[theme] || Enemy4D.THEME_MOBS_4D.stone_crypt).slice();
        };

        window.GraveGainEnemies4D = Enemy4D;
    } catch (e) { /* never throws */ }
})();
