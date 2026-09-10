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
            this.scale = typeData.scale || 1.0;
            this.bloodColor = typeData.bloodColor || 0xddddcc;

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
            const boneMat = new THREE.MeshStandardMaterial({ color: this.bloodColor, roughness: 0.8 });
            const eyeColor = this.isBoss ? 0xff0044 : (typeData.type === 'mage' ? 0x9333ea : 0xff2222);
            const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });

            if (this.type === 'skull') {
                // Flying flaming skull
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

                // Add flame sprite halo
                if (ProceduralTextures && ProceduralTextures.createTorchFlameSprite) {
                    const flame = ProceduralTextures.createTorchFlameSprite();
                    flame.position.y = 18;
                    flame.scale.set(20, 20, 1);
                    this.group3d.add(flame);
                }
            } else {
                // Standard humanoid skeleton structure
                this.torso = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 5), boneMat);
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

                // Extra accessories
                if (this.isBoss) {
                    const crown = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.8, 3, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 }));
                    crown.position.set(0, 4, 0);
                    this.skull.add(crown);
                } else if (typeData.armored) {
                    const helm = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 }));
                    helm.position.set(0, 2, 0);
                    this.skull.add(helm);
                }
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

    window.GraveGainEnemyEntity = EnemyEntity;
    window.GraveGainLootItem = LootItem;
})();
