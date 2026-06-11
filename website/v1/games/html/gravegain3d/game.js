(function() {
    'use strict';

    // ==========================================
    // 1. DATA structures & CONFIGS
    // ==========================================
    const Race = {
        HUMAN: 'human',
        ELF: 'elf',
        DWARF: 'dwarf',
        ORC: 'orc'
    };

    const ClassType = {
        WARRIOR: 'warrior',
        TANK: 'tank',
        SUPPORT: 'support',
        MAGE: 'mage'
    };

    const RaceData = {
        [Race.HUMAN]: {
            name: 'Human',
            emoji: '👩‍🚀',
            color: 0x4c7fff,
            maxHp: 100.0,
            hpRegen: 1.0,
            stamina: 100.0,
            speed: 240,
            desc: 'Shield Wall ability (bubble shield absorbs 20 dmg, regenerates after 5s) & Jetpack jump mechanics.'
        },
        [Race.ELF]: {
            name: 'Elf',
            emoji: '🧝‍♀️',
            color: 0x4cff7f,
            maxHp: 75.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 260,
            desc: 'Nature Burst AoE magic ability, Mana Pool (100 mana, +2/s regen), and Hover mechanics.'
        },
        [Race.DWARF]: {
            name: 'Dwarf',
            emoji: '⛏️',
            color: 0xffcc4c,
            maxHp: 150.0,
            hpRegen: 2.0,
            stamina: 100.0,
            speed: 190,
            desc: 'Stone Form immunity, Double Jump mechanics, and Poison resistance.'
        },
        [Race.ORC]: {
            name: 'Orc',
            emoji: '👹',
            color: 0xff4c4c,
            maxHp: 200.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 210,
            desc: 'Rage Burst AoE ability (scales with Rage built in combat), and Ground Stomp landing attack.'
        }
    };

    const ClassTitles = {
        [ClassType.WARRIOR]: { [Race.HUMAN]: 'Soldier', [Race.ELF]: 'Assassin', [Race.DWARF]: 'Slayer', [Race.ORC]: 'Berserker' },
        [ClassType.TANK]: { [Race.HUMAN]: 'Warden', [Race.ELF]: 'Paladin', [Race.DWARF]: 'Brute', [Race.ORC]: 'Guardian' },
        [ClassType.SUPPORT]: { [Race.HUMAN]: 'Medic', [Race.ELF]: 'Brewer', [Race.DWARF]: 'Shaman', [Race.ORC]: 'Druid' },
        [ClassType.MAGE]: { [Race.HUMAN]: 'Engineer', [Race.ELF]: 'Tinkerer', [Race.DWARF]: 'Warlock', [Race.ORC]: 'Witch' }
    };

    const EnemyTypes = [
        { name: 'Goblin Skeleton', hp: 20, dmg: 4, speed: 100, scale: 0.8 },
        { name: 'Elven Skeleton', hp: 30, dmg: 6, speed: 110, scale: 1.0 },
        { name: 'Dwarven Skeleton', hp: 50, dmg: 8, speed: 85, scale: 0.9, armored: true },
        { name: 'Huge Orc Skeleton', hp: 120, dmg: 15, speed: 70, scale: 1.4, elite: true }
    ];

    const QuartersUpgrades = [
        { level: 1, size: '400x300 px', capacity: 100, cost: 250 },
        { level: 2, size: '600x400 px', capacity: 150, cost: 500 },
        { level: 3, size: '800x500 px', capacity: 200, cost: 900 },
        { level: 4, size: '1000x600 px', capacity: 250, cost: 1400 },
        { level: 5, size: '1200x700 px', capacity: 300, cost: 2000 },
        { level: 6, size: '1400x800 px', capacity: 350, cost: 2500 }
    ];

    const BotanySeeds = [
        { id: 'cannabis', name: 'Cannabis Sativa', space: 15, time: 120, yield: 3, value: 50, emoji: '🌿' },
        { id: 'mushroom', name: 'Magic Mushroom', space: 8, time: 80, yield: 2, value: 75, emoji: '🍄' },
        { id: 'bloodrose', name: 'Blood Rose', space: 10, time: 60, yield: 1, value: 120, emoji: '🌹' }
    ];

    // Canvas texture utility for 3D billboard icons
    function createEmojiSprite(emoji, size = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        ctx.font = `${size * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(24, 24, 1);
        return sprite;
    }

    // ==========================================
    // 2. ENGINES & GAME CONTROLLERS
    // ==========================================
    class GameLoop {
        constructor(updateCallback, renderCallback) {
            this.update = updateCallback;
            this.render = renderCallback;
            this.lastTime = 0;
            this.isPaused = false;
            this.frameId = null;
        }
        start() {
            if (this.frameId !== null && !this.isPaused) return;
            this.lastTime = performance.now();
            this.isPaused = false;
            this.loop(this.lastTime);
        }
        stop() {
            this.isPaused = true;
            if (this.frameId) {
                cancelAnimationFrame(this.frameId);
            }
        }
        loop(timestamp) {
            if (this.isPaused) return;
            const delta = (timestamp - this.lastTime) / 1000.0;
            this.lastTime = timestamp;

            const dt = Math.min(delta, 0.1);
            this.update(dt);
            this.render();

            this.frameId = requestAnimationFrame((t) => this.loop(t));
        }
    }

    class InputManager {
        constructor() {
            this.keys = {};
            this.mouse = { x: 0, y: 0, click: false };
            this.joystick = { active: false, x: 0, y: 0 };
            this.setupListeners();
        }
        setupListeners() {
            window.addEventListener('keydown', (e) => {
                this.keys[e.code] = true;
                if (e.code === 'KeyP' || e.code === 'Escape') {
                    if (window.GraveGainGame) window.GraveGainGame.togglePause();
                }
            });
            window.addEventListener('keyup', (e) => {
                this.keys[e.code] = false;
            });

            const container = document.getElementById('canvasContainer');
            container.addEventListener('mousedown', (e) => {
                if (document.pointerLockElement !== container) {
                    container.requestPointerLock();
                } else if (e.button === 0) {
                    this.mouse.click = true;
                }
            });

            // PointerLock controls trigger camera look
            document.addEventListener('mousemove', (e) => {
                if (document.pointerLockElement === container && window.GraveGainGame) {
                    const game = window.GraveGainGame;
                    if (game.player) {
                        game.player.yaw -= e.movementX * 0.0022;
                        game.player.pitch -= e.movementY * 0.0022;
                        // Clamp vertical view angle
                        game.player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, game.player.pitch));
                    }
                }
            });
        }
    }

    class CameraController {
        constructor() {
            this.shake = 0;
            this.shakeMax = 12;
            this.shakeDecay = 25;
            this.punchX = 0;
            this.punchY = 0;
            this.punchDecay = 8;
        }
        applyShake(amt) {
            this.shake = Math.min(this.shake + amt, this.shakeMax);
        }
        applyPunch(vy, vx = 0) {
            this.punchY += vy;
            this.punchX += vx;
        }
        update(dt) {
            if (this.shake > 0) this.shake = Math.max(0, this.shake - this.shakeDecay * dt);
            this.punchX -= this.punchX * this.punchDecay * dt;
            this.punchY -= this.punchY * this.punchDecay * dt;
        }
    }

    // ==========================================
    // 3. PROCEDURAL GENERATION & WORLD LOGIC
    // ==========================================
    class DungeonGenerator {
        constructor() {
            this.gridSize = 80;
            this.tileSize = 48;
        }
        generate(floorNum) {
            const grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(1));
            const rooms = [];
            const roomCount = 12;

            for (let i = 0; i < roomCount; i++) {
                const w = Math.floor(Math.random() * 9) + 6;
                const h = Math.floor(Math.random() * 9) + 6;
                const x = Math.floor(Math.random() * (this.gridSize - w - 4)) + 2;
                const y = Math.floor(Math.random() * (this.gridSize - h - 4)) + 2;

                let overlaps = false;
                for (const r of rooms) {
                    if (x < r.x + r.w + 2 && x + w > r.x - 2 && y < r.y + r.h + 2 && y + h > r.y - 2) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    const roomTypes = ['normal', 'graveyard', 'treasury', 'shrine', 'lab', 'normal'];
                    let rType = roomTypes[Math.floor(Math.random() * roomTypes.length)];
                    if (rooms.length === 0) rType = 'spawn';
                    else if (i === roomCount - 1) rType = 'safespace';

                    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), type: rType });

                    for (let rx = x; rx < x + w; rx++) {
                        for (let ry = y; ry < y + h; ry++) {
                            grid[rx][ry] = 0;
                        }
                    }
                }
            }

            for (let i = 0; i < rooms.length - 1; i++) {
                this.digCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
            }

            for (let i = 0; i < 3; i++) {
                if (rooms.length > 3) {
                    const r1 = rooms[Math.floor(Math.random() * rooms.length)];
                    const r2 = rooms[Math.floor(Math.random() * rooms.length)];
                    if (r1 !== r2) this.digCorridor(grid, r1.cx, r1.cy, r2.cx, r2.cy);
                }
            }

            rooms.forEach((room) => {
                if (room.type === 'lab') {
                    for (let hx = room.x + 1; hx < room.x + room.w - 1; hx += 3) {
                        for (let hy = room.y + 1; hy < room.y + room.h - 1; hy += 3) {
                            const hazardRand = Math.random();
                            if (hazardRand < 0.3) {
                                grid[hx][hy] = 2; // Water
                            } else if (hazardRand < 0.6) {
                                grid[hx][hy] = 3; // Poison
                            } else if (hazardRand < 0.8) {
                                grid[hx][hy] = 4; // Fire
                            } else {
                                grid[hx][hy] = 5; // Ice
                            }
                        }
                    }
                }
                if (room.type !== 'spawn' && Math.random() < 0.3) {
                    const sx = room.x + Math.floor(room.w / 2);
                    const sy = room.y - 1;
                    if (sy >= 0 && grid[sx][sy] === 1) grid[sx][sy] = 6; // Breakable wall
                }
            });

            const spawnRoom = rooms.find(r => r.type === 'spawn') || rooms[0];
            return { grid, rooms, spawnRoom, gridSize: this.gridSize };
        }

        digCorridor(grid, x1, y1, x2, y2) {
            let curX = x1;
            let curY = y1;
            while (curX !== x2) {
                grid[curX][curY] = 0;
                curX += (x2 > curX) ? 1 : -1;
            }
            while (curY !== y2) {
                grid[curX][curY] = 0;
                curY += (y2 > curY) ? 1 : -1;
            }
        }
    }

    // ==========================================
    // 4. ENTITIES: PLAYER, SKELETON ENEMIES
    // ==========================================
    class PlayerEntity {
        constructor(race, classType) {
            this.race = race;
            this.classType = classType;
            const rData = RaceData[race];

            this.x = 0;
            this.y = 0; // mapped to 3D z
            this.yElevation = 0;
            this.vx = 0;
            this.vy = 0;
            this.radius = 16;
            
            // Yaw & Pitch for FPS camera look
            this.yaw = 0;
            this.pitch = 0;

            this.maxHp = rData.maxHp;
            this.hp = rData.maxHp;
            this.hpRegen = rData.hpRegen;
            this.stamina = rData.stamina;
            this.maxStamina = rData.stamina;
            this.speed = rData.speed;

            this.mana = this.race === Race.ELF ? 100 : 0;
            this.maxMana = 100;
            this.rage = 0;
            this.shieldBubble = 0;
            this.shieldCooldown = 0;
            this.stoneForm = false;
            this.stoneDuration = 0;

            this.gold = 0;
            this.xp = 0;
            this.level = 1;
            this.isDead = false;
            this.dodgeTime = 0;

            this.bloodlust = [];
            this.grounded = true;
            this.platVy = 0;
            this.doubleJumpsLeft = 0;
        }

        update(dt, keys, input, physics, tilemap) {
            if (this.isDead) return;

            const now = Date.now();
            this.bloodlust = this.bloodlust.filter(t => now - t < 5000);

            let speedMod = 1.0;
            if (this.hp / this.maxHp < 0.3) speedMod += 0.25;
            speedMod += this.bloodlust.length * 0.04;

            if (!this.stoneForm) {
                this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
            }

            if (this.race === Race.ELF) {
                this.mana = Math.min(this.maxMana, this.mana + 2.0 * dt);
            } else if (this.race === Race.ORC) {
                this.rage = Math.max(0, this.rage - 4.0 * dt);
            }

            if (this.race === Race.HUMAN) {
                if (this.shieldCooldown > 0) {
                    this.shieldCooldown -= dt;
                } else {
                    this.shieldBubble = Math.min(20.0, this.shieldBubble + 2.0 * dt);
                }
            }

            if (this.stoneForm) {
                this.stoneDuration -= dt;
                if (this.stoneDuration <= 0) this.stoneForm = false;
            }

            if (this.dodgeTime > 0) this.dodgeTime -= dt;

            // Strafe relative to camera direction (Yaw)
            let moveX = 0;
            let moveZ = 0;
            if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

            let currentSpeed = this.speed * speedMod;
            let isRunning = (keys['ShiftLeft'] || keys['ShiftRight']) && this.stamina > 5;

            if (isRunning) {
                currentSpeed *= 1.45;
                this.stamina = Math.max(0, this.stamina - 20 * dt);
            } else {
                this.stamina = Math.min(this.maxStamina, this.stamina + 15 * dt);
            }

            const moveLen = Math.hypot(moveX, moveZ);
            if (moveLen > 0) {
                moveX /= moveLen;
                moveZ /= moveLen;

                // Project movements along look angle (yaw)
                const cosYaw = Math.cos(this.yaw);
                const sinYaw = Math.sin(this.yaw);
                this.vx = (moveX * cosYaw - moveZ * sinYaw) * currentSpeed;
                this.vy = (moveX * sinYaw + moveZ * cosYaw) * currentSpeed;
            } else {
                this.vx = 0;
                this.vy = 0;
            }

            // Slow check
            const tileX = Math.floor(this.x / 48);
            const tileY = Math.floor(this.y / 48);
            if (tilemap && tilemap.grid && tilemap.grid[tileX] && tilemap.grid[tileX][tileY] === 2) {
                this.vx *= 0.5;
                this.vy *= 0.5;
            }

            // Jump
            if (keys['Space'] && this.grounded) {
                this.platVy = 270;
                this.grounded = false;
                this.doubleJumpsLeft = this.race === Race.DWARF ? 1 : 0;
                keys['Space'] = false;
            } else if (keys['Space'] && !this.grounded && this.race === Race.DWARF && this.doubleJumpsLeft > 0) {
                this.platVy = 220;
                this.doubleJumpsLeft--;
                keys['Space'] = false;
            } else if (keys['Space'] && !this.grounded && this.race === Race.HUMAN && this.stamina > 5) {
                this.platVy = 110;
                this.stamina = Math.max(0, this.stamina - 35 * dt);
            }

            if (!this.grounded) {
                this.platVy -= 800 * dt;
                this.yElevation += this.platVy * dt;
                if (this.yElevation <= 0) {
                    this.yElevation = 0;
                    this.platVy = 0;
                    this.grounded = true;
                }
            }

            physics.moveEntityWithCollision(this, this.vx * dt, this.vy * dt, tilemap);
        }

        takeDamage(dmg, type = 'normal') {
            if (window.gameDebug?.godMode) return;
            if (this.dodgeTime > 0 || this.stoneForm) return;

            if (this.race === Race.ORC) {
                this.rage = Math.min(100.0, this.rage + dmg * 0.5);
            }

            if (this.shieldBubble > 0) {
                const absorbed = Math.min(this.shieldBubble, dmg);
                this.shieldBubble -= absorbed;
                dmg -= absorbed;
                this.shieldCooldown = 5.0;
            }

            this.hp = Math.max(0, this.hp - dmg);
            window.GraveGainGame.cameraController.applyShake(8);
            window.GraveGainGame.audio.play('hit');

            if (this.hp <= 0 && !this.isDead) {
                this.isDead = true;
                window.GraveGainGame.gameOver(false);
            }
        }

        triggerAbility() {
            if (this.race === Race.HUMAN) {
                this.shieldBubble = 20.0;
                this.shieldCooldown = 8.0;
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnSparks(this.x, this.y, 0x00d2ff, 15);
            } else if (this.race === Race.ELF && this.mana >= 40) {
                this.mana -= 40;
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnSparks(this.x, this.y, 0x4cff7f, 25);
                window.GraveGainGame.dealAoEDamage(this.x, this.y, 140, 25);
            } else if (this.race === Race.DWARF && this.stamina >= 50) {
                this.stamina -= 50;
                this.stoneForm = true;
                this.stoneDuration = 4.0;
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnSparks(this.x, this.y, 0xffcc4c, 25);
            } else if (this.race === Race.ORC && this.rage >= 30) {
                const burstPower = this.rage;
                this.rage = 0;
                const dmg = 15 + burstPower * 0.5;
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnSparks(this.x, this.y, 0xff4c4c, 30);
                window.GraveGainGame.dealAoEDamage(this.x, this.y, 160, dmg);
            }
        }
    }

    // Hierarchical 3D Animated Skeleton Model
    class EnemyEntity {
        constructor(typeData, x, y, difficultyScale) {
            this.name = typeData.name;
            this.x = x;
            this.y = y; // mapped to z
            this.radius = 16;
            this.angle = 0;

            this.maxHp = typeData.hp * difficultyScale;
            this.hp = this.maxHp;
            this.dmg = typeData.dmg * difficultyScale;
            this.speed = typeData.speed;
            this.scale = typeData.scale;

            // Knockback velocities
            this.kx = 0;
            this.ky = 0;

            this.state = 'idle';
            this.spawnX = x;
            this.spawnY = y;
            this.pathTargetX = x;
            this.pathTargetY = y;
            this.lastPathTick = 0;

            // 3D Skeleton structure
            this.group3d = new THREE.Group();
            this.group3d.scale.set(this.scale, this.scale, this.scale);

            const boneMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
            const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

            // Torso pivot
            this.torso = new THREE.Mesh(new THREE.BoxGeometry(8, 14, 5), boneMat);
            this.torso.position.y = 16;
            this.group3d.add(this.torso);

            // Skull
            this.skull = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), boneMat);
            this.skull.position.set(0, 10, 0);
            this.torso.add(this.skull);

            // Red glowing eyes
            this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), redEyeMat);
            this.leftEye.position.set(-1.8, 1, 3.1);
            this.skull.add(this.leftEye);

            this.rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 6), redEyeMat);
            this.rightEye.position.set(1.8, 1, 3.1);
            this.skull.add(this.rightEye);

            // Left leg
            this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), boneMat);
            this.leftLeg.position.set(-3, -8, 0);
            this.group3d.add(this.leftLeg);

            // Right leg
            this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 2), boneMat);
            this.rightLeg.position.set(3, -8, 0);
            this.group3d.add(this.rightLeg);

            // Left arm
            this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 11, 1.8), boneMat);
            this.leftArm.position.set(-6, 3, 0);
            this.torso.add(this.leftArm);

            // Right arm
            this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 11, 1.8), boneMat);
            this.rightArm.position.set(6, 3, 0);
            this.torso.add(this.rightArm);
        }

        update(dt, player, physics, tilemap) {
            const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
            const now = Date.now();

            // Decay knockback
            this.x += this.kx * dt;
            this.y += this.ky * dt;
            this.kx -= this.kx * 8 * dt;
            this.ky -= this.ky * 8 * dt;

            if (now - this.lastPathTick > 500) {
                this.lastPathTick = now;
                const distToSpawn = Math.hypot(this.x - this.spawnX, this.y - this.spawnY);

                if (distToSpawn > 600) {
                    this.state = 'retreat';
                } else if (distToPlayer < 400) {
                    if (this.state === 'idle') {
                        this.state = 'chase';
                        window.GraveGainGame.alertEnemiesNear(this.x, this.y, 400);
                    }
                }

                if (this.state === 'chase') {
                    this.pathTargetX = player.x;
                    this.pathTargetY = player.y;
                } else if (this.state === 'retreat') {
                    this.pathTargetX = this.spawnX;
                    this.pathTargetY = this.spawnY;
                    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1);
                    if (distToSpawn < 20) this.state = 'idle';
                }
            }

            if (this.state !== 'idle') {
                const dx = this.pathTargetX - this.x;
                const dy = this.pathTargetY - this.y;
                const len = Math.hypot(dx, dy);
                if (len > 5) {
                    this.angle = Math.atan2(dy, dx);
                    const vx = (dx / len) * this.speed * dt;
                    const vy = (dy / len) * this.speed * dt;
                    physics.moveEntityWithCollision(this, vx, vy, tilemap);
                }
            }

            // Deal contact damage (skeletons raise arms and bite/slash)
            if (distToPlayer < this.radius + player.radius) {
                player.takeDamage(this.dmg * dt);
                
                // Swing arms forward in attack motion
                this.leftArm.rotation.x = -1.2;
                this.rightArm.rotation.x = -1.2;
            } else if (this.state === 'chase' || this.state === 'retreat') {
                // Walking animation cycle rotation oscillation
                const cycle = now * 0.01 * (this.speed / 100);
                this.leftLeg.rotation.x = Math.sin(cycle) * 0.65;
                this.rightLeg.rotation.x = -Math.sin(cycle) * 0.65;
                this.leftArm.rotation.x = -Math.sin(cycle) * 0.45;
                this.rightArm.rotation.x = Math.sin(cycle) * 0.45;
                this.torso.position.y = 16 + Math.abs(Math.sin(cycle * 2)) * 1.5;
            } else {
                // Reset limb rotation when idle
                this.leftLeg.rotation.x = 0;
                this.rightLeg.rotation.x = 0;
                this.leftArm.rotation.x = 0;
                this.rightArm.rotation.x = 0;
                this.torso.position.y = 16;
            }

            // Align 3D group
            this.group3d.position.set(this.x, 0, this.y);
            // Face player
            this.group3d.rotation.y = -this.angle + Math.PI / 2;
        }

        destroy() {
            window.GraveGainGame.scene.remove(this.group3d);
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
        constructor(x, y, type, value) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.value = value;
            this.radius = 8;
            this.pulse = Math.random() * Math.PI;

            this.group3d = new THREE.Group();
            const emoji = type === 'gold' ? '🪙' : (type === 'item' ? '📜' : '💵');
            this.sprite3d = createEmojiSprite(emoji, 64);
            this.sprite3d.position.y = 10;
            this.group3d.add(this.sprite3d);
        }
        update(dt, player, range) {
            this.pulse += 5 * dt;
            this.sprite3d.position.y = 10 + Math.sin(this.pulse) * 4;

            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < range) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const pullSpeed = 300 * dt;
                this.x += Math.cos(angle) * pullSpeed;
                this.y += Math.sin(angle) * pullSpeed;
            }
            this.group3d.position.set(this.x, 0, this.y);
            this.sprite3d.rotation.y = player.yaw;
        }
        destroy() {
            window.GraveGainGame.scene.remove(this.group3d);
            if (this.sprite3d.material) {
                if (this.sprite3d.material.map) this.sprite3d.material.map.dispose();
                this.sprite3d.material.dispose();
            }
        }
    }

    // ==========================================
    // 5. SYSTEMS: PHYSICS, PARTICLE & AUDIO
    // ==========================================
    class PhysicsController {
        moveEntityWithCollision(ent, dx, dy, tilemap) {
            if (!tilemap) {
                ent.x += dx;
                ent.y += dy;
                return;
            }
            const ox = ent.x;
            const oy = ent.y;

            ent.x += dx;
            if (this.isCollidingWithWall(ent.x, ent.y, ent.radius, tilemap)) {
                ent.x = ox;
            }

            ent.y += dy;
            if (this.isCollidingWithWall(ent.x, ent.y, ent.radius, tilemap)) {
                ent.y = oy;
            }
        }

        isCollidingWithWall(x, y, radius, tilemap) {
            if (!tilemap || !tilemap.grid) return false;
            const points = [
                { x: x - radius, y: y - radius },
                { x: x + radius, y: y - radius },
                { x: x - radius, y: y + radius },
                { x: x + radius, y: y + radius }
            ];
            for (const p of points) {
                const tx = Math.floor(p.x / 48);
                const ty = Math.floor(p.y / 48);
                if (tx < 0 || tx >= tilemap.gridSize || ty < 0 || ty >= tilemap.gridSize) {
                    return true;
                }
                const cell = tilemap.grid[tx] ? tilemap.grid[tx][ty] : undefined;
                if (cell === 1 || cell === 6) return true;
            }
            return false;
        }
    }

    class ParticleSystem {
        constructor(scene) {
            this.scene = scene;
            this.chunks = [];
        }
        spawnBlood(x, z, hexColor = 0xef4444) {
            const mat = new THREE.MeshBasicMaterial({ color: hexColor });

            for (let i = 0; i < 8; i++) {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), mat);
                mesh.position.set(x + (Math.random() * 8 - 4), 16 + Math.random() * 8, z + (Math.random() * 8 - 4));
                this.scene.add(mesh);
                this.chunks.push({
                    mesh,
                    vx: (Math.random() * 2 - 1) * 90,
                    vy: 120 + Math.random() * 100,
                    vz: (Math.random() * 2 - 1) * 90,
                    life: 0.5 + Math.random() * 0.4
                });
            }
        }
        spawnSparks(x, z, hexColor = 0xffcc4c, count = 10) {
            const mat = new THREE.MeshBasicMaterial({ color: hexColor });

            for (let i = 0; i < count; i++) {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat);
                mesh.position.set(x, 14, z);
                this.scene.add(mesh);
                this.chunks.push({
                    mesh,
                    vx: (Math.random() * 2 - 1) * 130,
                    vy: 60 + Math.random() * 120,
                    vz: (Math.random() * 2 - 1) * 130,
                    life: 0.35 + Math.random() * 0.25
                });
            }
        }
        update(dt) {
            this.chunks.forEach(c => {
                c.life -= dt;
                c.vy -= 600 * dt; // gravity
                c.mesh.position.x += c.vx * dt;
                c.mesh.position.y += c.vy * dt;
                c.mesh.position.z += c.vz * dt;

                if (c.mesh.position.y <= 1) {
                    c.mesh.position.y = 1;
                    c.vx *= 0.5;
                    c.vz *= 0.5;
                }
            });
            const dead = this.chunks.filter(c => c.life <= 0);
            dead.forEach(c => {
                this.scene.remove(c.mesh);
                if (c.mesh.geometry) c.mesh.geometry.dispose();
            });
            this.chunks = this.chunks.filter(c => c.life > 0);
        }
        clear() {
            this.chunks.forEach(c => {
                this.scene.remove(c.mesh);
                if (c.mesh.geometry) c.mesh.geometry.dispose();
            });
            this.chunks = [];
        }
    }

    class AudioController {
        constructor() {
            this.ctx = null;
            this.masterVolume = 0.8;
        }
        initCtx() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
        }
        play(soundName) {
            this.initCtx();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const now = this.ctx.currentTime;
            gain.gain.setValueAtTime(this.masterVolume * 0.1, now);

            if (soundName === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(140, now);
                osc.frequency.exponentialRampToValueAtTime(8, now + 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (soundName === 'block') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (soundName === 'ability') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.exponentialRampToValueAtTime(700, now + 0.25);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (soundName === 'loot') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(750, now);
                osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            }
        }
        speakFallback(text) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = this.masterVolume;
                window.speechSynthesis.speak(utterance);
            }
        }
    }

    class SaveSystem {
        static save(state) {
            localStorage.setItem('GraveGain3D_Save', JSON.stringify({
                gold: state.gold,
                uusd: state.uusd,
                quartersLevel: state.quartersLevel,
                prestige: state.prestige,
                botanyCrops: state.botanyCrops,
                playerRace: state.player ? state.player.race : null,
                playerClass: state.player ? state.player.classType : null,
                playerHp: state.player ? state.player.hp : null,
                playerXp: state.player ? state.player.xp : null,
                playerLevel: state.player ? state.player.level : null,
                floorIndex: state.floorIndex
            }));
        }
        static load() {
            const data = localStorage.getItem('GraveGain3D_Save');
            if (data) {
                try { return JSON.parse(data); } catch(e) { return null; }
            }
            return null;
        }
    }

    // ==========================================
    // 6. MAIN GAME ENGINE SYSTEM (FPS Redesign)
    // ==========================================
    class GraveGainGame {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
            this.renderer.setSize(this.canvas.width, this.canvas.height);
            this.renderer.shadowMap.enabled = true;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x020205);
            this.scene.fog = new THREE.FogExp2(0x020205, 0.004);

            this.camera3d = new THREE.PerspectiveCamera(65, this.canvas.width / this.canvas.height, 2, 1000);

            // Lighting Setup
            const ambLight = new THREE.AmbientLight(0x0f0b20, 0.25);
            this.scene.add(ambLight);

            // Player lantern light
            this.playerLight = new THREE.PointLight(0xffddaa, 2.2, 140, 1.2);
            this.scene.add(this.playerLight);

            // Spotlight Flashlight (Flickering/glow look)
            this.flashlight = new THREE.SpotLight(0xffffff, 4.0, 320, Math.PI / 6, 0.5, 1.0);
            this.scene.add(this.flashlight);
            this.flashlightTarget = new THREE.Object3D();
            this.scene.add(this.flashlightTarget);
            this.flashlight.target = this.flashlightTarget;

            // Model First-Person Sword Group
            this.weaponGroup = new THREE.Group();
            
            // Blade hilt, guard, blade mesh assembly
            const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
            hilt.position.set(0, -1.8, 0);
            this.weaponGroup.add(hilt);

            const guard = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xffd700 }));
            guard.position.set(0, 0, 0);
            this.weaponGroup.add(guard);

            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 0.3), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 }));
            blade.position.set(0, 6, 0);
            this.weaponGroup.add(blade);

            // Anchor to lower-right of camera
            this.weaponGroup.position.set(3, -3.2, -7.5);
            this.weaponGroup.rotation.set(-Math.PI / 4.5, 0, -Math.PI / 7);
            
            this.camera3d.add(this.weaponGroup);
            this.scene.add(this.camera3d); // Add camera to scene to display child weapon

            this.input = new InputManager();
            this.cameraController = new CameraController();
            this.generator = new DungeonGenerator();
            this.physics = new PhysicsController();
            this.vfx = new ParticleSystem(this.scene);
            this.audio = new AudioController();

            this.gold = 0;
            this.uusd = 200;
            this.quartersLevel = 1;
            this.prestige = 0;
            this.floorIndex = 1;
            this.difficultyMultiplierSetting = 'normal';

            this.player = null;
            this.enemies = [];
            this.loot = [];
            this.dungeon = null;
            this.autoPickupRange = 5.0; // units

            // Melee Weapon swing states
            this.swingTime = 0;
            this.swingDuration = 0.22; // 220ms swing speed

            // Horde Spawner state
            this.hordeTimer = 18.0; // wave every 18 seconds

            // Hitstop frame freeze timer
            this.hitstop = 0;

            this.botanyCrops = [
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 }
            ];

            this.mapMeshes = [];

            this.loop = new GameLoop((dt) => this.update(dt), () => this.render());
            this.setupUIListeners();
            this.loadState();
            this.generateDailyChallenges();
            this.renderDailyChallenges();
            this.startAutoSaveTimer();
        }

        loadState() {
            const saved = SaveSystem.load();
            if (saved) {
                this.gold = saved.gold || 0;
                this.uusd = saved.uusd || 200;
                this.quartersLevel = saved.quartersLevel || 1;
                this.prestige = saved.prestige || 0;
                if (saved.botanyCrops) this.botanyCrops = saved.botanyCrops;
                if (saved.playerRace) this.savedPlayerRace = saved.playerRace;
                if (saved.playerClass) this.savedPlayerClass = saved.playerClass;
                if (saved.playerHp !== undefined) this.savedPlayerHp = saved.playerHp;
                if (saved.playerXp !== undefined) this.savedPlayerXp = saved.playerXp;
                if (saved.playerLevel !== undefined) this.savedPlayerLevel = saved.playerLevel;
                if (saved.floorIndex) this.savedFloorIndex = saved.floorIndex;
            }
            this.updateHubQuartersUI();
        }

        saveState() {
            SaveSystem.save(this);
        }

        startAutoSaveTimer() {
            setInterval(() => this.saveState(), 60000);
        }

        generateDailyChallenges() {
            const dateStr = new Date().toDateString();
            let hash = 0;
            for (let i = 0; i < dateStr.length; i++) {
                hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            this.dailyChallenges = [
                { id: 1, desc: 'Slay ' + (Math.abs(hash % 20) + 15) + ' skeleton warriors.', target: Math.abs(hash % 20) + 15, current: 0, done: false },
                { id: 2, desc: 'Collect ' + (Math.abs((hash >> 2) % 300) + 200) + ' dungeon Gold.', target: Math.abs((hash >> 2) % 300) + 200, current: 0, done: false },
                { id: 3, desc: 'Reach Layer ' + (Math.abs((hash >> 4) % 3) + 3) + ' depth.', target: Math.abs((hash >> 4) % 3) + 3, current: 1, done: false }
            ];
        }

        renderDailyChallenges() {
            const el = document.getElementById('dailyChallengesList');
            if (!el) return;
            el.innerHTML = this.dailyChallenges.map(c => `
                <div class="daily-challenge-item">
                    <span>${c.desc}</span>
                    <strong style="color: ${c.done ? 'var(--grave-purple-glow)' : 'var(--grave-text)'}">${c.current} / ${c.target}</strong>
                </div>
            `).join('');
        }

        updateChallengeProgress(type, amt) {
            if (type === 'slay') {
                this.dailyChallenges[0].current = Math.min(this.dailyChallenges[0].target, this.dailyChallenges[0].current + amt);
                if (this.dailyChallenges[0].current >= this.dailyChallenges[0].target) this.dailyChallenges[0].done = true;
            }
            if (type === 'gold') {
                this.dailyChallenges[1].current = Math.min(this.dailyChallenges[1].target, this.dailyChallenges[1].current + amt);
                if (this.dailyChallenges[1].current >= this.dailyChallenges[1].target) this.dailyChallenges[1].done = true;
            }
            if (type === 'depth') {
                this.dailyChallenges[2].current = Math.max(this.dailyChallenges[2].current, amt);
                if (this.dailyChallenges[2].current >= this.dailyChallenges[2].target) this.dailyChallenges[2].done = true;
            }
            this.renderDailyChallenges();
        }

        setupUIListeners() {
            document.getElementById('btnPlay').addEventListener('click', () => {
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('charSelectScreen').classList.remove('hidden');
                this.renderCharSelect();
            });

            document.getElementById('btnEnterHub').addEventListener('click', () => {
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('hubScreen').classList.remove('hidden');
                this.renderBotany();
                this.generateRepairMiniGame();
            });

            document.getElementById('btnOpenSettings').addEventListener('click', () => {
                document.getElementById('settingsScreen').classList.remove('hidden');
            });

            document.getElementById('btnSaveSettings').addEventListener('click', () => {
                this.difficultyMultiplierSetting = document.getElementById('settingsDifficulty').value;
                this.audio.masterVolume = document.getElementById('settingsMasterVol').value / 100;
                this.autoPickupRange = parseFloat(document.getElementById('settingsPickupRange').value) || 5.0;
                document.getElementById('settingsScreen').classList.add('hidden');
            });

            document.getElementById('btnCharSelectBack').addEventListener('click', () => {
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });

            document.getElementById('btnCharSelectStart').addEventListener('click', () => {
                const selRace = document.querySelector('.char-card.selected').dataset.race;
                const selClass = document.querySelector('.class-btn.selected').dataset.class;
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.remove('hidden');
                this.initRun(selRace, selClass);
            });

            document.getElementById('btnLeaveHub').addEventListener('click', () => {
                document.getElementById('hubScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                this.saveState();
            });

            const tabBtns = document.querySelectorAll('.hub-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    const targetTab = e.target.dataset.tab;
                    const panes = document.querySelectorAll('.hub-pane');
                    panes.forEach(pane => pane.classList.remove('active'));
                    document.getElementById('tab-' + targetTab).classList.add('active');

                    if (targetTab === 'exchange') {
                        document.getElementById('exchangeGoldBalance').textContent = this.gold + ' Gold';
                        document.getElementById('exchangeUusdBalance').textContent = this.uusd + ' $UUSD';
                    } else if (targetTab === 'lore') {
                        this.renderLoreList();
                    }
                });
            });

            document.getElementById('btnBuyUusd').addEventListener('click', () => {
                if (this.gold >= 10) {
                    this.gold -= 10;
                    this.uusd += 100;
                    this.audio.play('loot');
                    document.getElementById('exchangeGoldBalance').textContent = this.gold + ' Gold';
                    document.getElementById('exchangeUusdBalance').textContent = this.uusd + ' $UUSD';
                }
            });

            document.getElementById('btnBuyGold').addEventListener('click', () => {
                if (this.uusd >= 100) {
                    this.uusd -= 100;
                    this.gold += 10;
                    this.audio.play('loot');
                    document.getElementById('exchangeGoldBalance').textContent = this.gold + ' Gold';
                    document.getElementById('exchangeUusdBalance').textContent = this.uusd + ' $UUSD';
                }
            });

            document.getElementById('btnUpgradeQuarters').addEventListener('click', () => {
                if (this.quartersLevel < 6) {
                    const cost = QuartersUpgrades[this.quartersLevel - 1].cost;
                    if (this.uusd >= cost) {
                        this.uusd -= cost;
                        this.quartersLevel++;
                        this.audio.play('ability');
                        this.updateHubQuartersUI();
                    }
                }
            });

            document.getElementById('btnGoToMenu').addEventListener('click', () => {
                document.getElementById('gameOverScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });

            document.getElementById('btnReturnToHub').addEventListener('click', () => {
                this.loop.stop();
                this.clearScene();
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                document.exitPointerLock();
                this.saveState();
            });

            document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
            document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
            document.getElementById('btnAbandon').addEventListener('click', () => {
                this.loop.stop();
                this.clearScene();
                document.getElementById('pauseScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                document.exitPointerLock();
                this.saveState();
            });
        }

        renderCharSelect() {
            const raceGrid = document.getElementById('raceGrid');
            raceGrid.innerHTML = Object.keys(RaceData).map((key, i) => {
                const race = RaceData[key];
                return `
                    <div class="char-card ${i === 0 ? 'selected' : ''}" data-race="${key}">
                        <span class="char-emoji">${race.emoji}</span>
                        <div class="char-name">${race.name}</div>
                        <div class="char-desc">${race.desc}</div>
                    </div>
                `;
            }).join('');

            const cards = raceGrid.querySelectorAll('.char-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                });
            });

            const classGrid = document.getElementById('classGrid');
            classGrid.innerHTML = Object.keys(ClassType).map((key, i) => {
                return `<button class="class-btn ${i === 0 ? 'selected' : ''}" data-class="${key}">${key.toUpperCase()}</button>`;
            }).join('');

            const classBtns = classGrid.querySelectorAll('.class-btn');
            classBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    classBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });
        }

        updateHubQuartersUI() {
            document.getElementById('hubQuartersLevel').textContent = 'Level ' + this.quartersLevel;
            const upgrade = QuartersUpgrades[this.quartersLevel - 1];
            document.getElementById('hubQuartersSize').textContent = upgrade.size;
            document.getElementById('hubQuartersCapacity').textContent = upgrade.capacity + ' Space';

            if (this.quartersLevel < 6) {
                const nextUpgrade = QuartersUpgrades[this.quartersLevel];
                document.getElementById('hubQuartersCost').textContent = nextUpgrade.cost + ' $UUSD';
            } else {
                document.getElementById('hubQuartersCost').textContent = 'MAX LEVEL REACHED';
            }
        }

        // ==========================================
        // BOTANY SIMULATION
        // ==========================================
        renderBotany() {
            const grid = document.getElementById('botanyGrid');
            const now = Math.floor(Date.now() / 1000);

            grid.innerHTML = this.botanyCrops.map((crop, index) => {
                if (crop.seedId === null || crop.seedId === undefined) {
                    return `
                        <div class="plant-slot">
                            <strong>[Empty Incubator Space]</strong>
                            <div style="display:flex; flex-direction:column; gap:5px; margin-top:8px;">
                                ${BotanySeeds.map(s => `<button class="btn-game" style="font-size:0.75rem; padding:5px 10px;" onclick="window.GraveGainGame.plantSeed(${index}, '${s.id}')">Plant ${s.name} (Cost: 20 $UUSD)</button>`).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    const seed = BotanySeeds.find(s => s.id === crop.seedId);
                    const elapsed = now - crop.startTime;
                    const percent = Math.min(100, Math.floor((elapsed / crop.growthTime) * 100));
                    const isHarvestable = percent >= 100;

                    return `
                        <div class="plant-slot">
                            <div class="plant-info">
                                <span>${seed.emoji} ${seed.name}</span>
                                <span>${percent}%</span>
                            </div>
                            <div class="plant-progress-bg">
                                <div class="plant-progress-fill" style="width: ${percent}%;"></div>
                            </div>
                            ${isHarvestable 
                                ? `<button class="btn-game btn-primary" style="font-size:0.8rem; padding:6px 12px; margin-top:5px;" onclick="window.GraveGainGame.harvestCrop(${index})">🌾 Harvest (Gain ${seed.yield * seed.value} $UUSD)</button>`
                                : `<span style="font-size:0.75rem; color:var(--grave-text-muted);">Growing... (${Math.max(0, crop.growthTime - elapsed)}s remaining)</span>`
                            }
                        </div>
                    `;
                }
            }).join('');
        }

        plantSeed(slotIndex, seedId) {
            const seed = BotanySeeds.find(s => s.id === seedId);
            if (this.uusd >= 20) {
                this.uusd -= 20;
                this.botanyCrops[slotIndex] = {
                    seedId: seed.id,
                    startTime: Math.floor(Date.now() / 1000),
                    growthTime: seed.time
                };
                this.audio.play('loot');
                this.renderBotany();
            }
        }

        harvestCrop(slotIndex) {
            const crop = this.botanyCrops[slotIndex];
            const seed = BotanySeeds.find(s => s.id === crop.seedId);
            this.uusd += seed.yield * seed.value;
            this.botanyCrops[slotIndex] = { seedId: null, startTime: 0, growthTime: 0 };
            this.audio.play('loot');
            this.renderBotany();
        }

        // ==========================================
        // CIRCUITS REPAIR STATION
        // ==========================================
        generateRepairMiniGame() {
            const area = document.getElementById('repairCircuitArea');
            area.innerHTML = '';
            this.circuitConnected = false;
            document.getElementById('repairStatus').textContent = 'Status: Calibration offline';

            const termX = 220;
            const termY = 100;

            const target = document.createElement('div');
            target.className = 'circuit-node terminal';
            target.style.left = termX + 'px';
            target.style.top = termY + 'px';
            target.textContent = '🎯';
            area.appendChild(target);

            const comp = document.createElement('div');
            comp.className = 'circuit-node component';
            comp.style.left = '40px';
            comp.style.top = '100px';
            comp.textContent = '💠';
            area.appendChild(comp);

            let isDragging = false;
            const dragStart = () => { isDragging = true; };
            const dragMove = (e) => {
                if (!isDragging) return;
                const rect = area.getBoundingClientRect();
                let clientX = e.clientX || (e.touches && e.touches[0].clientX);
                let clientY = e.clientY || (e.touches && e.touches[0].clientY);

                let px = clientX - rect.left;
                let py = clientY - rect.top;

                px = Math.max(16, Math.min(rect.width - 16, px));
                py = Math.max(16, Math.min(rect.height - 16, py));

                comp.style.left = px + 'px';
                comp.style.top = py + 'px';

                const dist = Math.hypot(px - termX, py - termY);
                if (dist < 20) {
                    isDragging = false;
                    comp.style.left = termX + 'px';
                    comp.style.top = termY + 'px';
                    this.circuitConnected = true;
                    document.getElementById('repairStatus').textContent = 'Status: Circuit Calibrated successfully!';
                    this.audio.play('block');
                }
            };
            const dragEnd = () => { isDragging = false; };

            comp.addEventListener('mousedown', dragStart);
            window.addEventListener('mousemove', dragMove);
            window.addEventListener('mouseup', dragEnd);

            comp.addEventListener('touchstart', dragStart, { passive: true });
            window.addEventListener('touchmove', dragMove, { passive: true });
            window.addEventListener('touchend', dragEnd);
        }

        // ==========================================
        // CORE RUN INITIALIZATION
        // ==========================================
        initRun(race, classType) {
            this.player = new PlayerEntity(race, classType);
            if (this.savedPlayerRace === race && this.savedPlayerClass === classType) {
                this.player.hp = Math.min(this.player.maxHp, this.savedPlayerHp || this.player.maxHp);
                this.player.xp = this.savedPlayerXp || 0;
                this.player.level = this.savedPlayerLevel || 1;
                this.floorIndex = this.savedFloorIndex || 1;
            } else {
                this.floorIndex = 1;
            }
            this.buildDungeonLayer();
            this.loop.start();
        }

        clearScene() {
            this.mapMeshes.forEach(m => {
                this.scene.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) {
                    if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                    else m.material.dispose();
                }
            });
            this.mapMeshes = [];
            this.enemies.forEach(e => e.destroy());
            this.enemies = [];
            this.loot.forEach(l => l.destroy());
            this.loot = [];
            this.vfx.clear();
        }

        buildDungeonLayer() {
            this.clearScene();

            this.dungeon = this.generator.generate(this.floorIndex);

            // Player coordinates initialization
            this.player.x = this.dungeon.spawnRoom.cx * 48 + 24;
            this.player.y = this.dungeon.spawnRoom.cy * 48 + 24;
            this.player.vx = 0;
            this.player.vy = 0;

            // Height-increased Walls (height=96) to completely block FPS view lines
            const wallGeo = new THREE.BoxGeometry(48, 96, 48);
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x18153b, roughness: 0.7 });
            const floorGeo = new THREE.PlaneGeometry(48, 48);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x242e3d, roughness: 0.95 });

            const waterMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, transparent: true, opacity: 0.7 });
            const poisonMat = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.5 });
            const fireMat = new THREE.MeshStandardMaterial({ color: 0xef4444, transparent: true, opacity: 0.5 });
            const iceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
            const breakMat = new THREE.MeshStandardMaterial({ color: 0x3e4a5c, roughness: 0.7 });

            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    const tile = this.dungeon.grid[x][y];
                    const tx = x * 48 + 24;
                    const ty = y * 48 + 24;

                    if (tile === 1) {
                        const wall = new THREE.Mesh(wallGeo, wallMat);
                        wall.position.set(tx, 48, ty);
                        this.scene.add(wall);
                        this.mapMeshes.push(wall);
                    } else {
                        const floor = new THREE.Mesh(floorGeo, floorMat);
                        floor.rotation.x = -Math.PI / 2;
                        floor.position.set(tx, 0, ty);
                        this.scene.add(floor);
                        this.mapMeshes.push(floor);

                        if (tile === 2) {
                            const water = new THREE.Mesh(floorGeo, waterMat);
                            water.rotation.x = -Math.PI / 2;
                            water.position.set(tx, 0.5, ty);
                            this.scene.add(water);
                            this.mapMeshes.push(water);
                        } else if (tile === 3) {
                            const poison = new THREE.Mesh(floorGeo, poisonMat);
                            poison.rotation.x = -Math.PI / 2;
                            poison.position.set(tx, 0.5, ty);
                            this.scene.add(poison);
                            this.mapMeshes.push(poison);
                        } else if (tile === 4) {
                            const fire = new THREE.Mesh(floorGeo, fireMat);
                            fire.rotation.x = -Math.PI / 2;
                            fire.position.set(tx, 0.5, ty);
                            this.scene.add(fire);
                            this.mapMeshes.push(fire);
                        } else if (tile === 5) {
                            const ice = new THREE.Mesh(floorGeo, iceMat);
                            ice.rotation.x = -Math.PI / 2;
                            ice.position.set(tx, 0.5, ty);
                            this.scene.add(ice);
                            this.mapMeshes.push(ice);
                        } else if (tile === 6) {
                            const breakWall = new THREE.Mesh(wallGeo, breakMat);
                            breakWall.position.set(tx, 48, ty);
                            this.scene.add(breakWall);
                            this.mapMeshes.push(breakWall);

                            const bolt = createEmojiSprite('⚡', 64);
                            bolt.position.set(tx, 106, ty);
                            this.scene.add(bolt);
                            this.mapMeshes.push(bolt);
                        }
                    }
                }
            }

            // Spawn standard enemies
            const diffScale = 1.0 + (this.floorIndex * 0.15);

            this.dungeon.rooms.forEach((room) => {
                if (room.type === 'spawn') return;

                let maxRoomMobs = 2;
                if (room.type === 'graveyard') maxRoomMobs = 4;
                if (room.type === 'safespace') maxRoomMobs = 0;

                for (let i = 0; i < maxRoomMobs; i++) {
                    const ex = room.x + Math.floor(Math.random() * room.w);
                    const ey = room.y + Math.floor(Math.random() * room.h);
                    const rx = ex * 48 + 24;
                    const ry = ey * 48 + 24;

                    const enemyData = EnemyTypes[Math.floor(Math.random() * EnemyTypes.length)];
                    const enemy = new EnemyEntity(enemyData, rx, ry, diffScale);
                    this.scene.add(enemy.group3d);
                    this.enemies.push(enemy);
                }

                if (room.type === 'treasury') {
                    for (let i = 0; i < 3; i++) {
                        const lx = (room.x + Math.floor(Math.random() * room.w)) * 48 + 24;
                        const ly = (room.y + Math.floor(Math.random() * room.h)) * 48 + 24;
                        const loot = new LootItem(lx, ly, 'gold', 50);
                        this.scene.add(loot.group3d);
                        this.loot.push(loot);
                    }
                }

                if (Math.random() < 0.25) {
                    const lx = (room.x + Math.floor(Math.random() * room.w)) * 48 + 24;
                    const ly = (room.y + Math.floor(Math.random() * room.h)) * 48 + 24;
                    const loot = new LootItem(lx, ly, 'item', 150);
                    this.scene.add(loot.group3d);
                    this.loot.push(loot);
                }
            });

            // Recreate visual stairs (Safespace portal emoji) in 3D
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace');
            if (safespace) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                const portal = createEmojiSprite('🌀', 128);
                portal.position.set(sx, 16, sy);
                this.scene.add(portal);
                this.mapMeshes.push(portal);
            }

            this.updateChallengeProgress('depth', this.floorIndex);
            this.updateHUD();
        }

        spawnMinorSkull(x, y) {
            const skull = new EnemyEntity({ name: 'Flying Skull', hp: 10, dmg: 15, speed: 130, scale: 0.7 }, x, y, 1.0);
            this.scene.add(skull.group3d);
            this.enemies.push(skull);
        }

        dealAoEDamage(x, y, radius, dmg) {
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist <= radius) {
                    e.hp -= dmg;
                    e.kx = (e.x - x) * 1.5;
                    e.ky = (e.y - y) * 1.5;
                    this.vfx.spawnSparks(e.x, e.y, 0x4cff7f, 10);
                }
            });
        }

        alertEnemiesNear(x, y, radius) {
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist < radius && e.state === 'idle') {
                    e.state = 'chase';
                }
            });
        }

        togglePause() {
            const container = document.getElementById('canvasContainer');
            if (this.loop.isPaused) {
                document.getElementById('pauseScreen').classList.add('hidden');
                container.classList.remove('paused');
                this.loop.start();
                container.requestPointerLock();
            } else {
                this.loop.stop();
                container.classList.add('paused');
                document.getElementById('pauseScreen').classList.remove('hidden');
                document.exitPointerLock();
            }
        }

        // Periodically spawn waves of skeletons behind sightlines (Hordes)
        triggerHordeWave() {
            const spawnCount = Math.floor(Math.random() * 4) + 6; // 6-10 skeletons
            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);

            let spawned = 0;
            const diffScale = 1.0 + (this.floorIndex * 0.15);

            for (let attempts = 0; attempts < 40 && spawned < spawnCount; attempts++) {
                const room = this.dungeon.rooms[Math.floor(Math.random() * this.dungeon.rooms.length)];
                const ex = room.cx * 48 + 24;
                const ey = room.cy * 48 + 24;

                const dist = Math.hypot(this.player.x - ex, this.player.y - ey);
                if (dist > 180 && dist < 700) {
                    const toSpawn = new THREE.Vector3(ex - this.player.x, 0, ey - this.player.y).normalize();
                    const dot = forward.dot(toSpawn);
                    
                    // Spawn out of sight (behind camera view cone)
                    if (dot < 0.4) {
                        const enemyData = EnemyTypes[Math.floor(Math.random() * EnemyTypes.length)];
                        const skeleton = new EnemyEntity(enemyData, ex, ey, diffScale);
                        skeleton.state = 'chase';
                        this.scene.add(skeleton.group3d);
                        this.enemies.push(skeleton);
                        spawned++;
                    }
                }
            }
            this.audio.speakFallback("Undead horde approaching!");
        }

        update(dt) {
            // Check frame freeze hitstop
            if (this.hitstop > 0) {
                this.hitstop -= dt;
                return;
            }

            const useShake = document.getElementById('settingsCameraShake').checked;

            this.player.update(dt, this.input.keys, this.input, this.physics, this.dungeon);
            this.enemies.forEach(e => e.update(dt, this.player, this.physics, this.dungeon));

            // Clean dead skeletons
            this.enemies.forEach(e => {
                if (e.hp <= 0) {
                    this.gold += 10;
                    this.player.xp += 5;
                    this.updateChallengeProgress('slay', 1);
                    this.updateChallengeProgress('gold', 10);
                    this.vfx.spawnBlood(e.x, e.y, e.bloodColor);
                    this.audio.play('hit');
                    this.player.bloodlust.push(Date.now());
                    
                    // Explode joints into scattered bones particles
                    this.vfx.spawnSparks(e.x, e.y, 0xddddcc, 15);
                    e.destroy();
                }
            });
            this.enemies = this.enemies.filter(e => e.hp > 0);

            // Update Loot Pickups
            this.loot.forEach(l => {
                l.update(dt, this.player, this.autoPickupRange * 24);
                const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                if (dist < this.player.radius + l.radius) {
                    this.gold += l.value;
                    this.updateChallengeProgress('gold', l.value);
                    if (l.type === 'item') {
                        this.player.xp += 30;
                        this.audio.speakFallback('Vocal log recovered.');
                    }
                    this.audio.play('loot');
                    this.vfx.spawnSparks(l.x, l.y, l.type === 'item' ? 0x9333ea : 0xffcc4c, 8);
                    l.picked = true;
                    l.destroy();
                }
            });
            this.loot = this.loot.filter(l => !l.picked);

            // Horde Spawner waves
            this.hordeTimer -= dt;
            if (this.hordeTimer <= 0) {
                this.hordeTimer = 18.0;
                this.triggerHordeWave();
            }

            // Melee Weapon slashing animations
            if (this.swingTime > 0) {
                this.swingTime -= dt;
                const progress = (this.swingDuration - this.swingTime) / this.swingDuration;
                const swingArc = Math.sin(progress * Math.PI);
                
                // Swing sword horizontally across view
                this.weaponGroup.position.x = 3 - swingArc * 5.2;
                this.weaponGroup.position.y = -3.2 + swingArc * 2.0;
                this.weaponGroup.position.z = -7.5 + swingArc * 1.5;
                this.weaponGroup.rotation.z = -Math.PI / 7 - swingArc * Math.PI / 2.2;
                this.weaponGroup.rotation.y = swingArc * Math.PI / 4.0;
            } else {
                this.weaponGroup.position.set(3, -3.2, -7.5);
                this.weaponGroup.rotation.set(-Math.PI / 4.5, 0, -Math.PI / 7);
            }

            // Sync Camera Position at eye-level (y=20)
            this.cameraController.update(dt);
            this.camera3d.rotation.order = 'YXZ';
            this.camera3d.rotation.y = this.player.yaw + this.cameraController.punchX;
            this.camera3d.rotation.x = this.player.pitch + this.cameraController.punchY;

            let shakeOffset = new THREE.Vector3(0, 0, 0);
            if (useShake && this.cameraController.shake > 0) {
                shakeOffset.set(
                    (Math.random() * 2 - 1) * this.cameraController.shake * 0.15,
                    (Math.random() * 2 - 1) * this.cameraController.shake * 0.15,
                    (Math.random() * 2 - 1) * this.cameraController.shake * 0.15
                );
            }

            this.camera3d.position.set(this.player.x, this.player.yElevation + 20, this.player.y).add(shakeOffset);

            // Lighting orientation tracking
            this.playerLight.position.set(this.player.x, this.player.yElevation + 20, this.player.y);
            
            // Spotlight flashlight direction
            this.flashlight.position.set(this.player.x, this.player.yElevation + 20, this.player.y);
            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            this.flashlightTarget.position.copy(this.camera3d.position).add(forward.multiplyScalar(100));

            this.vfx.update(dt);

            // Level descent portal
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace');
            if (safespace) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                if (Math.hypot(this.player.x - sx, this.player.y - sy) < 40) {
                    this.floorIndex++;
                    this.buildDungeonLayer();
                }
            }

            // Action combat triggers
            if (this.input.mouse.click) {
                this.triggerMeleeSwing();
                this.input.mouse.click = false;
            }

            if (this.input.keys['KeyF']) {
                this.player.triggerAbility();
                this.input.keys['KeyF'] = false;
            }

            this.updateHUD();
        }

        triggerMeleeSwing() {
            if (this.swingTime > 0) return;
            this.swingTime = this.swingDuration;

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const sweepRadius = 70;

            // Punch/Recoil camera rotation slightly on swing
            this.cameraController.applyPunch(0.04, -0.015);

            this.enemies.forEach(e => {
                const dx = e.x - this.player.x;
                const dy = e.y - this.player.y;
                const dist = Math.hypot(dx, dy);

                if (dist <= sweepRadius) {
                    const toEnemy = new THREE.Vector3(dx, 0, dy).normalize();
                    const dot = forward.dot(toEnemy);

                    // 75-degree frontal attack cone
                    if (dot > Math.cos(Math.PI / 2.4)) {
                        e.hp -= 8;
                        
                        // Directional knockback force
                        const force = 140;
                        e.kx = forward.x * force;
                        e.ky = forward.z * force;

                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);
                        this.audio.play('hit');

                        // Vermintide 2-style hitstop frame freeze on impact
                        this.hitstop = 0.04; 
                    }
                }
            });
        }

        updateHUD() {
            if (!this.player) return;
            document.getElementById('hudHpBar').style.width = Math.max(0, (this.player.hp / this.player.maxHp) * 100) + '%';
            document.getElementById('hudHpText').textContent = Math.round(this.player.hp) + '/' + this.player.maxHp;

            document.getElementById('hudStaminaBar').style.width = (this.player.stamina / this.player.maxStamina) * 100 + '%';
            document.getElementById('hudStaminaText').textContent = Math.round(this.player.stamina) + '/' + this.player.maxStamina;

            const resBar = document.getElementById('hudResourceBar');
            const resLabel = document.getElementById('hudResourceLabel');
            const resText = document.getElementById('hudResourceText');

            if (this.player.race === Race.ELF) {
                resLabel.textContent = '🔮 Mana';
                resBar.style.width = (this.player.mana / this.player.maxMana) * 100 + '%';
                resText.textContent = Math.round(this.player.mana) + '/' + this.player.maxMana;
            } else if (this.player.race === Race.ORC) {
                resLabel.textContent = '🔥 Rage';
                resBar.style.width = this.player.rage + '%';
                resText.textContent = Math.round(this.player.rage) + '/100';
            } else if (this.player.race === Race.HUMAN) {
                resLabel.textContent = '🛡️ Shield';
                resBar.style.width = (this.player.shieldBubble / 20) * 100 + '%';
                resText.textContent = Math.round(this.player.shieldBubble) + '/20';
            } else {
                resLabel.textContent = '💎 Stone';
                resBar.style.width = this.player.stoneForm ? '100%' : '0%';
                resText.textContent = this.player.stoneForm ? 'IMMUNE' : 'READY';
            }

            document.getElementById('hudGoldText').textContent = this.gold;
            document.getElementById('hudUusdText').textContent = this.uusd;
            document.getElementById('hudFloorText').textContent = 'Layer ' + this.floorIndex;
        }

        render() {
            this.renderer.render(this.scene, this.camera3d);
        }

        renderLoreList() {
            const listEl = document.getElementById('loreList');
            if (!listEl) return;

            const allLore = window.GraveGainLore.getAll();
            listEl.innerHTML = Object.keys(allLore).map(key => {
                const item = allLore[key];
                return `<button class="class-btn" style="text-align: left; padding: 8px; font-size: 0.8rem; width: 100%;" onclick="window.GraveGainGame.viewLoreEntry('${item.id}')">${item.title}</button>`;
            }).join('');

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn && !speakBtn.dataset.bound) {
                speakBtn.dataset.bound = "true";
                speakBtn.addEventListener('click', () => {
                    const currentId = speakBtn.dataset.currentId;
                    if (currentId) {
                        const item = window.GraveGainLore.get(currentId);
                        if (item) this.audio.speakFallback(item.content);
                    }
                });
            }
        }

        viewLoreEntry(id) {
            const item = window.GraveGainLore.get(id);
            if (!item) return;

            document.getElementById('loreTitle').textContent = item.title;
            document.getElementById('loreCategory').textContent = "Category: " + item.category.replace('_', ' ');
            document.getElementById('loreContent').textContent = item.content;

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn) {
                speakBtn.style.display = 'block';
                speakBtn.dataset.currentId = id;
            }
        }

        gameOver(victory = false) {
            this.loop.stop();
            document.getElementById('gameMain').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.remove('hidden');

            document.getElementById('gameOverTitle').textContent = victory ? 'RUN COMPLETED' : 'RUN TERMINATED';
            document.getElementById('gameOverSub').textContent = victory ? 'Safespace terminal extracted' : 'Vitals flatlined';

            document.getElementById('goRaceClass').textContent = this.player.race.toUpperCase() + ' ' + this.player.classType.toUpperCase();
            document.getElementById('goFloor').textContent = 'Layer ' + this.floorIndex;
            document.getElementById('goGold').textContent = this.gold;

            this.audio.speakFallback('Game Over. Run Terminated.');
            this.clearScene();
            this.saveState();
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.GraveGainGame = new GraveGainGame();
    });
})();

window.gameDebug = {
    name: "Grave Gain 3D (FPS)",
    getScore: () => window.GraveGainGame ? window.GraveGainGame.gold : 0,
    setScore: (g) => { if (window.GraveGainGame) { window.GraveGainGame.gold = g; } },
    getHealth: () => window.GraveGainGame ? window.GraveGainGame.player.hp : 0,
    setHealth: (h) => { if (window.GraveGainGame) window.GraveGainGame.player.hp = h; },
    win: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(true); },
    lose: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(false); },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
