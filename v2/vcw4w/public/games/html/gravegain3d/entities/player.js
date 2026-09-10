(function() {
    'use strict';

    class PlayerEntity {
        constructor(race, classType, permanentStats = {}) {
            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };
            const ClassType = GameData.ClassType || { WARRIOR: 'warrior', TANK: 'tank', SUPPORT: 'support', MAGE: 'mage' };
            const RaceData = GameData.RaceData || {};
            const ClassData = GameData.ClassData || {};

            this.race = race;
            this.classType = classType;
            const rData = RaceData[race] || { maxHp: 100, hpRegen: 1.0, stamina: 100, speed: 200 };
            const cData = ClassData[classType] || {};

            this.x = 0;
            this.y = 0; // mapped to 3D z
            this.yElevation = 0;
            this.vx = 0;
            this.vy = 0;
            this.radius = 16;

            this.yaw = 0;
            this.pitch = 0;

            const bonusHp = permanentStats.health ? permanentStats.health * 25 : 0;
            this.maxHp = rData.maxHp + bonusHp;
            this.hp = this.maxHp;
            this.hpRegen = rData.hpRegen;
            this.stamina = rData.stamina;
            this.maxStamina = rData.stamina;

            const speedBonus = permanentStats.speed ? (1.0 + permanentStats.speed * 0.1) : 1.0;
            this.speed = rData.speed * speedBonus;

            this.mana = race === Race.ELF ? 100 : 0;
            this.maxMana = 100;
            this.rage = 0;
            this.shieldBubble = 0;
            this.shieldCooldown = 0;
            this.stoneForm = false;
            this.stoneDuration = 0;

            // Combat & stats
            this.level = 1;
            this.xp = 0;
            this.xpNext = 60;
            this.isDead = false;
            this.isBlocking = false;
            this.parryWindow = 0;

            this.potions = 1 + (permanentStats.potions || 0);
            this.perks = [];

            // Movement physics
            this.grounded = true;
            this.platVy = 0;
            this.doubleJumpsLeft = 0;
            this.abilityCooldown = 0;
        }

        update(dt, input, physics, tilemap) {
            if (this.isDead) return;

            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };

            // Health & stamina regeneration
            if (!this.stoneForm) {
                this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
            }
            if (this.race === Race.ELF) {
                this.mana = Math.min(this.maxMana, this.mana + 3.0 * dt);
            }
            if (this.race === Race.ORC) {
                this.rage = Math.max(0, this.rage - 3.0 * dt);
            }
            if (this.race === Race.HUMAN) {
                if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
                else this.shieldBubble = Math.min(25.0, this.shieldBubble + 2.5 * dt);
            }

            if (this.stoneForm) {
                this.stoneDuration -= dt;
                if (this.stoneDuration <= 0) this.stoneForm = false;
            }

            if (this.parryWindow > 0) this.parryWindow -= dt;
            if (this.abilityCooldown > 0) this.abilityCooldown -= dt;

            // Movement vector relative to look yaw
            let moveX = 0;
            let moveZ = 0;

            if (input.keys['KeyW'] || input.keys['ArrowUp']) moveZ -= 1;
            if (input.keys['KeyS'] || input.keys['ArrowDown']) moveZ += 1;
            if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
            if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

            // Mobile virtual joystick input
            if (input.joystick && input.joystick.active) {
                moveX += input.joystick.x;
                moveZ += input.joystick.y;
            }

            let currentSpeed = this.speed;
            if (this.hasPerk('swift')) currentSpeed *= 1.25;

            const isRunning = (input.keys['ShiftLeft'] || input.keys['ShiftRight']) && this.stamina > 5;
            if (isRunning) {
                currentSpeed *= 1.4;
                const cost = this.hasPerk('swift') ? 12 : 20;
                this.stamina = Math.max(0, this.stamina - cost * dt);
            } else {
                this.stamina = Math.min(this.maxStamina, this.stamina + 18 * dt);
            }

            if (this.isBlocking) {
                currentSpeed *= 0.55;
            }

            const moveLen = Math.hypot(moveX, moveZ);
            if (moveLen > 0.05) {
                const normX = moveX / Math.max(1, moveLen);
                const normZ = moveZ / Math.max(1, moveLen);

                const cosYaw = Math.cos(this.yaw);
                const sinYaw = Math.sin(this.yaw);
                this.vx = (normX * cosYaw - normZ * sinYaw) * currentSpeed;
                this.vy = (normX * sinYaw + normZ * cosYaw) * currentSpeed;
            } else {
                this.vx = 0;
                this.vy = 0;
            }

            // Hazard floor effects
            const tx = Math.floor(this.x / 48);
            const ty = Math.floor(this.y / 48);
            if (tilemap && tilemap.grid && tilemap.grid[tx]) {
                const cell = tilemap.grid[tx][ty];
                if (cell === 2) { // Water
                    this.vx *= 0.6;
                    this.vy *= 0.6;
                } else if (cell === 3 && this.race !== Race.DWARF) { // Poison
                    this.takeDamage(10 * dt, 'poison');
                } else if (cell === 4) { // Fire
                    this.takeDamage(15 * dt, 'fire');
                }
            }

            // Jump & Vertical physics
            if (input.keys['Space'] && this.grounded) {
                this.platVy = 280;
                this.grounded = false;
                this.doubleJumpsLeft = this.race === Race.DWARF ? 1 : 0;
                input.keys['Space'] = false;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.4);
            } else if (input.keys['Space'] && !this.grounded && this.race === Race.DWARF && this.doubleJumpsLeft > 0) {
                this.platVy = 230;
                this.doubleJumpsLeft--;
                input.keys['Space'] = false;
                if (window.GraveGainGame) window.GraveGainGame.audio.playSfx('swing', 1.7);
            } else if (input.keys['Space'] && !this.grounded && this.race === Race.HUMAN && this.stamina > 5) {
                this.platVy = Math.min(180, this.platVy + 400 * dt);
                this.stamina = Math.max(0, this.stamina - 30 * dt);
            }

            if (!this.grounded) {
                this.platVy -= 750 * dt;
                this.yElevation += this.platVy * dt;
                if (this.yElevation <= 0) {
                    this.yElevation = 0;
                    this.platVy = 0;
                    this.grounded = true;
                }
            }

            physics.moveEntityWithCollision(this, this.vx * dt, this.vy * dt, tilemap);
        }

        hasPerk(id) {
            return this.perks.some(p => p.id === id);
        }

        takeDamage(dmg, type = 'normal') {
            if (window.gameDebug?.godMode || this.stoneForm || this.isDead) return;

            const GameData = window.GraveGainGameData || {};
            const ClassType = GameData.ClassType || { TANK: 'tank' };
            const Race = GameData.Race || { ORC: 'orc' };

            // Blocking logic
            if (this.isBlocking) {
                if (this.parryWindow > 0) {
                    // Perfect Parry!
                    if (window.GraveGainGame) {
                        window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, 'PARRIED!', 'block');
                        window.GraveGainGame.audio.playSfx('block', 1.3);
                        window.GraveGainGame.vfx.spawnSparks(this.x, this.y, 0x38bdf8, 20);
                    }
                    return;
                }
                const blockPercent = this.classType === ClassType.TANK ? 0.90 : 0.75;
                dmg *= (1.0 - blockPercent);
                if (window.GraveGainGame) {
                    window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, 'BLOCKED!', 'block');
                    window.GraveGainGame.audio.playSfx('block');
                }
            }

            if (this.hasPerk('ironclad')) {
                dmg *= 0.80;
            }

            if (this.race === Race.ORC) {
                this.rage = Math.min(100, this.rage + dmg * 0.8);
            }

            if (this.shieldBubble > 0) {
                const absorbed = Math.min(this.shieldBubble, dmg);
                this.shieldBubble -= absorbed;
                dmg -= absorbed;
                this.shieldCooldown = 5.0;
            }

            this.hp = Math.max(0, this.hp - dmg);

            if (window.GraveGainGame) {
                window.GraveGainGame.cameraController.applyShake(6);
                window.GraveGainGame.audio.playSfx('hit', 0.8);
                window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, `-${Math.round(dmg)}`, 'player-dmg');
            }

            if (this.hp <= 0 && !this.isDead) {
                this.isDead = true;
                if (window.GraveGainGame) window.GraveGainGame.gameOver(false);
            }
        }

        addXp(amt) {
            this.xp += amt;
            if (window.GraveGainGame) {
                window.GraveGainGame.combatText.spawnText(this.x, 20, this.y, `+${amt} XP`, 'xp');
            }
            if (this.xp >= this.xpNext) {
                this.xp -= this.xpNext;
                this.level++;
                this.xpNext = Math.floor(this.xpNext * 1.55);
                if (window.GraveGainGame) window.GraveGainGame.triggerLevelUp();
            }
        }

        triggerAbility() {
            if (this.abilityCooldown > 0) return;
            this.abilityCooldown = 7.0;

            const game = window.GraveGainGame;
            if (!game) return;

            const GameData = window.GraveGainGameData || {};
            const Race = GameData.Race || { HUMAN: 'human', ELF: 'elf', DWARF: 'dwarf', ORC: 'orc' };

            if (this.race === Race.HUMAN) {
                this.shieldBubble = 35.0;
                game.audio.playSfx('spell', 1.2);
                game.vfx.spawnSparks(this.x, this.y, 0x00d2ff, 25);
                game.combatText.spawnText(this.x, 20, this.y, 'SHIELD WALL!', 'heal');
            } else if (this.race === Race.ELF) {
                game.audio.playSfx('spell', 1.5);
                game.vfx.spawnSparks(this.x, this.y, 0x4cff7f, 35);
                game.dealAoEDamage(this.x, this.y, 160, 45, 'nature');
                game.combatText.spawnText(this.x, 20, this.y, 'NATURE BURST!', 'heal');
            } else if (this.race === Race.DWARF) {
                this.stoneForm = true;
                this.stoneDuration = 5.0;
                game.audio.playSfx('block', 0.8);
                game.vfx.spawnSparks(this.x, this.y, 0xffcc4c, 30);
                game.combatText.spawnText(this.x, 20, this.y, 'STONE FORM!', 'block');
            } else if (this.race === Race.ORC) {
                const burstDmg = 35 + this.rage * 0.75;
                this.rage = 0;
                game.audio.playSfx('explode', 1.1);
                game.cameraController.applyShake(10);
                game.vfx.spawnSparks(this.x, this.y, 0xff4c4c, 40);
                game.dealAoEDamage(this.x, this.y, 180, burstDmg, 'rage');
                game.combatText.spawnText(this.x, 20, this.y, 'RAGE BURST!', 'crit');
            }
        }
    }

    window.GraveGainPlayerEntity = PlayerEntity;
})();
