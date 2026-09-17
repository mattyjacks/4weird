(function() {
    'use strict';

    class EnemyEntity {
        constructor(typeData, x, y, difficultyScale = 1.0) {
            this.name = typeData.name;
            this.x = x;
            this.y = y; // mapped to 3D z
            this.radius = 16;
            this.angle = 0;
            this.type = typeData.type || 'skeleton';
            this.isBoss = !!typeData.isBoss;

            this.maxHp = typeData.hp * difficultyScale * (typeData.hpMultiplier || 1);
            this.hp = this.maxHp;
            this.dmg = typeData.dmg * difficultyScale * (typeData.damageMultiplier || 1);
            this.speed = typeData.speed;
            this.elite = !!typeData.elite;
            this.variantKey = EnemyEntity.matchVariant(typeData.variant || typeData.name || '');
            var styleScale = (EnemyEntity.STYLES[this.variantKey] || {}).scale || 1.0;
            this.scale = (typeData.scale || styleScale || 1.0) * (this.elite ? 1.35 : 1.0);
            this.bloodColor = typeData.bloodColor ||
                ((EnemyEntity.STYLES[this.variantKey] || {}).blood) || 0xddddcc;

            this.kx = 0;
            this.ky = 0;
            this.state = 'idle';
            this.spawnX = x;
            this.spawnY = y;
            this.attackTimer = 0;
            this.attackInterval = typeData.attackInterval || 1.0;

            this.group3d = new THREE.Group();
            this.group3d.scale.set(this.scale, this.scale, this.scale);

            this.buildModel(typeData);
        }

        buildModel(typeData) {
            const ProceduralTextures = window.GraveGainProceduralTextures;
            const style = EnemyEntity.STYLES[this.variantKey] || {};
            const bodyColor = (style.body !== undefined) ? style.body : this.bloodColor;
            const boneMat = new THREE.MeshStandardMaterial({
                color: bodyColor, roughness: 0.8, metalness: style.metalness || 0
            });
            const trimMat = new THREE.MeshStandardMaterial({
                color: (style.trim !== undefined) ? style.trim : 0x475569,
                roughness: 0.6, metalness: 0.4
            });
            let eyeColor;
            if (style.eye !== undefined) eyeColor = style.eye;
            else eyeColor = this.isBoss ? 0xff0044 : (typeData.type === 'mage' ? 0x9333ea : 0xff2222);
            if (typeData.elite && !this.isBoss) eyeColor = 0xffd700;
            const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });

            if (this.type === 'skull' || this.variantKey === 'drone') {
                // Flying flaming skull (Drone Array rides the same rig + rotor)
                this.skull = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), boneMat);
                this.skull.position.y = 18;
                this.group3d.add(this.skull);

                const jaw = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 6), boneMat);
                jaw.position.set(0, -5, 1);
                this.skull.add(jaw);

                const le = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 6), eyeMat);
                le.position.set(-2, 1, 4.2);
                this.skull.add(le);
                const re = new THREE.Mesh(new THREE.SphereGeometry(1.0, 6, 6), eyeMat);
                re.position.set(2, 1, 4.2);
                this.skull.add(re);

                // Add flame sprite halo, tinted by variant aura when present
                if (ProceduralTextures && ProceduralTextures.createTorchFlameSprite) {
                    const flame = ProceduralTextures.createTorchFlameSprite();
                    if (style.aura !== undefined && flame.material && flame.material.color) {
                        flame.material.color.setHex(style.aura);
                    }
                    flame.position.y = 18;
                    flame.scale.set(20, 20, 1);
                    this.group3d.add(flame);
                }

                if (this.variantKey === 'drone') {
                    // Rotor disc + antenna mast
                    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.8, 12), trimMat);
                    rotor.position.y = 6;
                    this.skull.add(rotor);
                    const mast = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 1), trimMat);
                    mast.position.y = 3;
                    this.skull.add(mast);
                    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 6), eyeMat);
                    beacon.position.y = 6;
                    mast.add(beacon);
                    // Side gun pods
                    [-1, 1].forEach(s => {
                        const pod = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 5), trimMat);
                        pod.position.set(s * 6, -1, 0);
                        this.skull.add(pod);
                    });
                } else if (typeData.elite || this.isBoss) {
                    // Elite war-skull: brow spikes
                    [-1, 1].forEach(s => {
                        const spike = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3, 1.4), trimMat);
                        spike.position.set(s * 3, 5, 0);
                        this.skull.add(spike);
                    });
                }
            } else {
                // Standard humanoid skeleton structure
                this.torso = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 5), boneMat);
                if (style.wide) this.torso.scale.set(1.6, 1, 1.3);
                this.torso.position.y = 16;
                this.group3d.add(this.torso);

                this.skull = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), boneMat);
                this.skull.position.set(0, 10, 0);
                this.torso.add(this.skull);

                // Eyes
                const le = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), eyeMat);
                le.position.set(-1.8, 1, 3.1);
                this.skull.add(le);
                const re = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), eyeMat);
                re.position.set(1.8, 1, 3.1);
                this.skull.add(re);

                // Limbs
                this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12, 2.2), boneMat);
                this.leftLeg.position.set(-3, -8, 0);
                this.group3d.add(this.leftLeg);

                this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(2.2, 12, 2.2), boneMat);
                this.rightLeg.position.set(3, -8, 0);
                this.group3d.add(this.rightLeg);

                this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(2, 11, 2), boneMat);
                this.leftArm.position.set(-6, 3, 0);
                this.torso.add(this.leftArm);

                this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(2, 11, 2), boneMat);
                this.rightArm.position.set(6, 3, 0);
                this.torso.add(this.rightArm);

                // Variant headgear / accessories (THREE r128 primitives only)
                this.applyVariantHeadgear(typeData, style, trimMat, eyeMat);

                // Extra accessories
                if (this.isBoss && !style.crown) {
                    const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.8, 3, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 }));
                    crown.position.set(0, 4, 0);
                    this.skull.add(crown);
                } else if (typeData.armored && !style.crown) {
                    const helm = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
                    helm.position.set(0, 2, 0);
                    this.skull.add(helm);
                }
            }

            // Aura halo for named variants + elites (tinted flame sprite)
            const auraHex = (typeData.elite && !this.isBoss) ? 0xffd700 : style.aura;
            if (auraHex !== undefined && ProceduralTextures && ProceduralTextures.createTorchFlameSprite) {
                const aura = ProceduralTextures.createTorchFlameSprite();
                if (aura.material && aura.material.color) aura.material.color.setHex(auraHex);
                aura.position.y = 22;
                const s = 26 * this.scale;
                aura.scale.set(s, s, 1);
                this.group3d.add(aura);
            }
        }

        // Headgear / back-piece per visual variant. style.crown selects the rig.
        applyVariantHeadgear(typeData, style, trimMat, eyeMat) {
            const key = style.crown;
            if (!key) return;
            if (key === 'scrap') {
                // Goblin Zed Leader: scrap crown + shoulder spikes
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4, 2.4, 6), trimMat);
                crown.position.set(0, 4, 0);
                this.skull.add(crown);
                [-1, 1].forEach(s => {
                    const spike = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4, 1.6), trimMat);
                    spike.position.set(s * 7, 6, 0);
                    spike.rotation.z = s * -0.4;
                    this.torso.add(spike);
                });
            } else if (key === 'hood') {
                // Elven Necromancer: tapered hood + staff with gem
                const hood = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.4, 5, 6), trimMat);
                hood.position.set(0, 4, -0.5);
                this.skull.add(hood);
                const staff = new THREE.Mesh(new THREE.BoxGeometry(1.2, 18, 1.2), trimMat);
                staff.position.set(8, -2, 2);
                this.torso.add(staff);
                const gem = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), eyeMat);
                gem.position.set(0, 10, 0);
                staff.add(gem);
            } else if (key === 'horned') {
                // Dwarven High Thane: horned helm + beard plate
                const helm = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), trimMat);
                helm.position.set(0, 2.5, 0);
                this.skull.add(helm);
                [-1, 1].forEach(s => {
                    const horn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 4), trimMat);
                    horn.position.set(s * 4.5, 3.5, 0);
                    horn.rotation.y = s * 0.5;
                    this.skull.add(horn);
                });
                const beard = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 1.5), trimMat);
                beard.position.set(0, -4, 3);
                this.skull.add(beard);
            } else if (key === 'mohawk') {
                // Orc Berserker: war mohawk + tusks + pauldrons
                const mohawk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.5, 6), trimMat);
                mohawk.position.set(0, 4.5, 0);
                this.skull.add(mohawk);
                [-1, 1].forEach(s => {
                    const tusk = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1), trimMat);
                    tusk.position.set(s * 2.2, -3.5, 2.5);
                    this.skull.add(tusk);
                    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 4.5), trimMat);
                    pauldron.position.set(s * 7, 6.5, 0);
                    this.torso.add(pauldron);
                });
            } else if (key === 'tanks') {
                // Chem-Golem: back tanks + gut glow
                [-1, 1].forEach(s => {
                    const tank = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 9, 8), trimMat);
                    tank.position.set(s * 5.5, 4, -3.5);
                    this.torso.add(tank);
                });
                const gut = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), eyeMat);
                gut.position.set(0, -2, 2.8);
                this.torso.add(gut);
            } else if (key === 'gold') {
                // Patriarch Clint: gold crown + tattered cape
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.4, 2.6, 8), trimMat);
                crown.position.set(0, 4.2, 0);
                this.skull.add(crown);
                const cape = new THREE.Mesh(new THREE.BoxGeometry(9, 14, 1), new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 1 }));
                cape.position.set(0, -2, -3.5);
                this.torso.add(cape);
            } else if (key === 'warlord') {
                // Bone Goliath Warlord: war crown + shoulder plates
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4, 3.4, 8), trimMat);
                crown.position.set(0, 4.2, 0);
                this.skull.add(crown);
                [-1, 1].forEach(s => {
                    const plate = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 5.5), trimMat);
                    plate.position.set(s * 7.5, 6.5, 0);
                    this.torso.add(plate);
                });
            } else if (key === 'pylons') {
                // Necro-Titan: array pylons ringing the torso
                [[-7, 0], [7, 0], [0, -4], [0, 4]].forEach(o => {
                    const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.8, 16, 1.8), trimMat);
                    pylon.position.set(o[0], 0, o[1] - 1);
                    this.torso.add(pylon);
                    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), eyeMat);
                    tip.position.set(0, 9, 0);
                    pylon.add(tip);
                });
            } else if (key === 'darkwings') {
                // Lucifer Hades: dark crown + halo + wings
                const crown = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 3, 8), new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4, metalness: 0.7 }));
                crown.position.set(0, 4.2, 0);
                this.skull.add(crown);
                [-1, 1].forEach(s => {
                    const wing = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 8), new THREE.MeshStandardMaterial({ color: 0xede9fe, roughness: 0.9 }));
                    wing.position.set(s * 7, 2, -4);
                    wing.rotation.z = s * 0.5;
                    this.torso.add(wing);
                });
                const halo = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.6, 16), eyeMat);
                halo.position.set(0, 8.5, 0);
                this.skull.add(halo);
            }
        }

        update(dt, player, physics, tilemap, game) {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);

            // Decay knockback
            this.x += this.kx * dt;
            this.y += this.ky * dt;
            this.kx -= this.kx * 8 * dt;
            this.ky -= this.ky * 8 * dt;

            // Attack cooldown
            if (this.attackTimer > 0) this.attackTimer -= dt;

            // AI states
            if (dist < 450 && this.state === 'idle') {
                this.state = 'chase';
            }

            if (this.state === 'chase') {
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);

                if (this.type === 'mage' && dist < 320 && dist > 140) {
                    // Ranged attacker keeps distance and casts shadow skull
                    if (this.attackTimer <= 0) {
                        this.attackTimer = 2.4;
                        const forwardX = Math.cos(this.angle);
                        const forwardY = Math.sin(this.angle);
                        game.spawnProjectile(this.x, 18, this.y, forwardX * 220, 0, forwardY * 220, this.dmg, false, 0x9333ea, 'magic');
                        game.audio.playSfx('spell', 0.8);
                    }
                } else {
                    // Melee pursuit
                    const vx = Math.cos(this.angle) * this.speed * dt;
                    const vy = Math.sin(this.angle) * this.speed * dt;
                    physics.moveEntityWithCollision(this, vx, vy, tilemap);

                    // Melee attack range check
                    if (dist < this.radius + player.radius + 12) {
                        if (this.attackTimer <= 0) {
                            this.attackTimer = this.attackInterval;
                            player.takeDamage(this.dmg);

                            if (this.type === 'skull') {
                                // Kamikaze explosion
                                game.vfx.spawnSparks(this.x, this.y, 0xff4422, 30);
                                game.audio.playSfx('explode');
                                this.hp = 0;
                            }
                        }
                    }
                }

                // Walking oscillation animation
                if (this.leftLeg && this.rightLeg) {
                    const cycle = Date.now() * 0.01 * (this.speed / 80);
                    this.leftLeg.rotation.x = Math.sin(cycle) * 0.65;
                    this.rightLeg.rotation.x = -Math.sin(cycle) * 0.65;
                    this.leftArm.rotation.x = -Math.sin(cycle) * 0.45;
                    this.rightArm.rotation.x = Math.sin(cycle) * 0.45;
                }
            }

            this.group3d.position.set(this.x, 0, this.y);
            this.group3d.rotation.y = -this.angle + Math.PI / 2;
        }

        destroy() {
            if (window.GraveGainGame) {
                window.GraveGainGame.scene.remove(this.group3d);
            }
            this.group3d.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
    }

    class LootItem {
        constructor(x, y, type = 'gold', value = 15) {
            const ProceduralTextures = window.GraveGainProceduralTextures;
            this.x = x;
            this.y = y;
            this.type = type;
            this.value = value;
            this.radius = 12;
            this.pulse = Math.random() * Math.PI;

            this.group3d = new THREE.Group();
            const emoji = type === 'gold' ? '🪙' : (type === 'potion' ? '🧪' : '📜');
            this.sprite = ProceduralTextures.createEmojiSprite(emoji, 64);
            this.sprite.position.y = 8;
            this.group3d.add(this.sprite);
            this.group3d.position.set(x, 0, y);
        }

        update(dt, player, range) {
            this.pulse += 5 * dt;
            this.sprite.position.y = 8 + Math.sin(this.pulse) * 3;

            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < range) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const pullSpeed = 340 * dt;
                this.x += Math.cos(angle) * pullSpeed;
                this.y += Math.sin(angle) * pullSpeed;
                this.group3d.position.set(this.x, 0, this.y);
            }
        }

        destroy() {
            if (window.GraveGainGame) window.GraveGainGame.scene.remove(this.group3d);
        }
    }

    // ---- Visual variants + factory (THREE r128 primitives only) ----
    EnemyEntity.STYLES = {
        goblin:     { body: 0x4d7c0f, trim: 0x365314, eye: 0xff2222, scale: 1.3, aura: 0xfb923c, blood: 0x84cc16, crown: 'scrap' },
        necromancer:{ body: 0x0f766e, trim: 0x5eead4, eye: 0xc084fc, scale: 1.2, aura: 0x2dd4bf, blood: 0x2dd4bf, crown: 'hood' },
        thane:      { body: 0xb45309, trim: 0xfbbf24, eye: 0xfbbf24, scale: 1.6, aura: 0xf59e0b, blood: 0xf59e0b, crown: 'horned', metalness: 0.6 },
        berserker:  { body: 0x991b1b, trim: 0x450a0a, eye: 0xff2222, scale: 1.8, aura: 0xef4444, blood: 0xef4444, crown: 'mohawk' },
        drone:      { body: 0x475569, trim: 0x22d3ee, eye: 0x22d3ee, scale: 1.4, aura: 0x22d3ee, blood: 0x22d3ee, metalness: 0.8 },
        golem:      { body: 0x14532d, trim: 0x4ade80, eye: 0x4ade80, scale: 2.0, aura: 0x22c55e, blood: 0x22c55e, crown: 'tanks', wide: true },
        clint:      { body: 0xe7e5e4, trim: 0xffd700, eye: 0xffd700, scale: 1.5, aura: 0xffd700, blood: 0xffd700, crown: 'gold' },
        goliath:    { body: 0xd6d3d1, trim: 0x991b1b, eye: 0xff2222, scale: 2.5, aura: 0xef4444, blood: 0xef4444, crown: 'warlord' },
        titan:      { body: 0x4c1d95, trim: 0xa855f7, eye: 0xe9d5ff, scale: 2.8, aura: 0x8b5cf6, blood: 0x8b5cf6, crown: 'pylons' },
        lucifer:    { body: 0xede9fe, trim: 0x4c1d95, eye: 0xffffff, scale: 3.0, aura: 0xc4b5fd, blood: 0xc4b5fd, crown: 'darkwings' },
        skull:      { eye: 0xff7722, aura: 0xff7722, blood: 0xff7722 }
    };

    // Ordered: first regex hit wins (Lucifer before generic mage, etc.)
    EnemyEntity.VARIANT_MATCH = [
        [/lucifer|hades|consciousness overlord/, 'lucifer'],
        [/necro[\s-]*array titan|necro-titan|\btitan\b/, 'titan'],
        [/chem|golem/, 'golem'],
        [/drone/, 'drone'],
        [/berserker/, 'berserker'],
        [/thane/, 'thane'],
        [/necromancer/, 'necromancer'],
        [/goblin(?! skeleton)|zed leader/, 'goblin'],
        [/clint|patriarch/, 'clint'],
        [/goliath|warlord/, 'goliath'],
        [/skull|wisp/, 'skull']
    ];

    EnemyEntity.matchVariant = function (name) {
        if (EnemyEntity.STYLES[name]) return name; // explicit variant key
        var n = String(name || '').toLowerCase();
        for (var i = 0; i < EnemyEntity.VARIANT_MATCH.length; i++) {
            if (EnemyEntity.VARIANT_MATCH[i][0].test(n)) return EnemyEntity.VARIANT_MATCH[i][1];
        }
        return '';
    };

    EnemyEntity.styleFor = function (name, typeData) {
        var key = EnemyEntity.matchVariant((typeData && typeData.variant) || name);
        var base = EnemyEntity.STYLES[key] || {};
        if (typeData && typeData.elite && !typeData.isBoss) {
            return { body: base.body, trim: 0xffd700, eye: 0xffd700, aura: 0xffd700, blood: base.blood, crown: base.crown, wide: base.wide, metalness: base.metalness };
        }
        return base;
    };

    EnemyEntity.BOSS_STATS = {
        goblin:    { name: 'GOBLIN ZED LEADER', hp: 320, dmg: 22, speed: 130, scale: 1.3, type: 'skeleton', attackInterval: 1.1 },
        necromancer:{ name: 'ELVEN NECROMANCER', hp: 520, dmg: 30, speed: 80, scale: 1.2, type: 'mage', attackInterval: 1.8 },
        thane:     { name: 'DWARVEN HIGH THANE', hp: 800, dmg: 38, speed: 70, scale: 1.6, type: 'skeleton', armored: true, attackInterval: 1.4 },
        berserker: { name: 'HUGE ORC ZED BERSERKER', hp: 950, dmg: 45, speed: 120, scale: 1.8, type: 'skeleton', attackInterval: 1.0 },
        drone:     { name: 'CORRUPTED DRONE ARRAY', hp: 600, dmg: 32, speed: 150, scale: 1.4, type: 'skeleton', attackInterval: 1.2 },
        golem:     { name: 'TOXIC CHEM-GOLEM', hp: 1100, dmg: 42, speed: 60, scale: 2.0, type: 'skeleton', attackInterval: 1.6 },
        clint:     { name: 'REANIMATED PATRIARCH CLINT', hp: 900, dmg: 40, speed: 95, scale: 1.5, type: 'skeleton', attackInterval: 1.3 },
        goliath:   { name: 'BONE GOLIATH WARLORD', hp: 1250, dmg: 48, speed: 75, scale: 2.5, type: 'skeleton', attackInterval: 1.4 },
        titan:     { name: 'NECRO-ARRAY TITAN', hp: 1500, dmg: 55, speed: 70, scale: 2.8, type: 'mage', attackInterval: 1.6 },
        lucifer:   { name: 'LUCIFER HADES', hp: 2000, dmg: 60, speed: 90, scale: 3.0, type: 'mage', attackInterval: 1.2 }
    };

    // Factory: mission bossType string -> fully-styled boss entity.
    // Unknown names fall back to the Bone Goliath Warlord (legacy behavior).
    EnemyEntity.spawnForBoss = function (bossType, x, y, diffScale, difficulty) {
        var key = EnemyEntity.matchVariant(bossType);
        if (!EnemyEntity.BOSS_STATS[key]) key = 'goliath';
        var stats = EnemyEntity.BOSS_STATS[key];
        var style = EnemyEntity.STYLES[key] || {};
        var data = {
            name: stats.name, hp: stats.hp, dmg: stats.dmg, speed: stats.speed,
            scale: stats.scale, type: stats.type, armored: stats.armored,
            variant: key, isBoss: true, attackInterval: stats.attackInterval,
            bloodColor: style.blood,
            hpMultiplier: (difficulty && difficulty.hpMultiplier) || 1,
            damageMultiplier: (difficulty && difficulty.damageMultiplier) || 1
        };
        return new EnemyEntity(data, x, y, diffScale || 1);
    };

    // Per-theme trash-mob pools. Names route through matchVariant so mobs
    // reuse the boss visual language; elite:true adds x1.35 scale + gold eyes.
    EnemyEntity.THEME_MOBS = {
        metallic_ship: [
            { name: 'Rusted Hull Husk', hp: 30, dmg: 10, speed: 110, scale: 0.9, type: 'skeleton' },
            { name: 'Sparking Wire Skull', hp: 18, dmg: 26, speed: 160, scale: 0.9, type: 'skull' },
            { name: 'Shipboard Occultist', hp: 48, dmg: 20, speed: 70, scale: 1.0, type: 'mage' }
        ],
        elven_grove: [
            { name: 'Elven Husk', hp: 28, dmg: 10, speed: 135, scale: 0.9, type: 'skeleton' },
            { name: 'Grove Wisp Skull', hp: 18, dmg: 24, speed: 165, scale: 0.9, type: 'skull' },
            { name: 'Elven Necromancer', hp: 60, dmg: 22, speed: 70, scale: 1.1, type: 'mage', elite: true }
        ],
        dwarven_vault: [
            { name: 'Dwarven Husk', hp: 70, dmg: 14, speed: 85, scale: 1.1, type: 'skeleton', armored: true },
            { name: 'Forge Skull', hp: 20, dmg: 26, speed: 155, scale: 1.0, type: 'skull' },
            { name: 'Dwarven High Thane', hp: 120, dmg: 24, speed: 70, scale: 1.3, type: 'skeleton', armored: true, elite: true }
        ],
        orc_wastes: [
            { name: 'Goblin Skeleton', hp: 25, dmg: 9, speed: 140, scale: 0.8, type: 'skeleton' },
            { name: 'Crimson Skull', hp: 18, dmg: 28, speed: 160, scale: 1.0, type: 'skull' },
            { name: 'Orc Berserker', hp: 110, dmg: 24, speed: 115, scale: 1.4, type: 'skeleton', elite: true }
        ],
        toxic_catacombs: [
            { name: 'Chem Husk', hp: 40, dmg: 12, speed: 100, scale: 1.0, type: 'skeleton' },
            { name: 'Toxic Skull', hp: 18, dmg: 26, speed: 155, scale: 0.9, type: 'skull' },
            { name: 'Chem-Golem', hp: 140, dmg: 26, speed: 60, scale: 1.6, type: 'skeleton', elite: true }
        ],
        stone_crypt: [
            { name: 'Goblin Skeleton', hp: 25, dmg: 8, speed: 120, scale: 0.8, type: 'skeleton' },
            { name: 'Flying Fire Skull', hp: 16, dmg: 28, speed: 155, scale: 0.9, type: 'skull' },
            { name: 'Armored Skeleton', hp: 65, dmg: 14, speed: 85, scale: 1.1, type: 'skeleton', armored: true },
            { name: 'Skeleton Necromancer', hp: 45, dmg: 18, speed: 70, scale: 1.0, type: 'mage' },
            { name: 'Reanimated Patriarch Clint', hp: 130, dmg: 24, speed: 90, scale: 1.2, type: 'skeleton', elite: true }
        ],
        citadel_darkness: [
            { name: 'Citadel Husk', hp: 60, dmg: 16, speed: 110, scale: 1.1, type: 'skeleton', armored: true },
            { name: 'Void Skull', hp: 24, dmg: 30, speed: 165, scale: 1.0, type: 'skull' },
            { name: 'Necro-Array Titan', hp: 180, dmg: 30, speed: 70, scale: 1.6, type: 'mage', elite: true }
        ]
    };

    EnemyEntity.mobsForTheme = function (theme) {
        return EnemyEntity.THEME_MOBS[theme] || EnemyEntity.THEME_MOBS.stone_crypt;
    };

    window.GraveGainEnemyEntity = EnemyEntity;
    window.GraveGainLootItem = LootItem;
})();
