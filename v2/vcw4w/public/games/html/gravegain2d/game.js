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
            color: 'rgb(76, 127, 255)',
            maxHp: 100.0,
            hpRegen: 1.0,
            stamina: 100.0,
            speed: 250,
            desc: 'Shield Wall ability (bubble shield absorbs 20 dmg, regenerates after 5s) & Jetpack jump mechanics.'
        },
        [Race.ELF]: {
            name: 'Elf',
            emoji: '🧝‍♀️',
            color: 'rgb(76, 255, 127)',
            maxHp: 75.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 275,
            desc: 'Nature Burst AoE magic ability, Mana Pool (100 mana, +2/s regen), and Hover mechanics.'
        },
        [Race.DWARF]: {
            name: 'Dwarf',
            emoji: '⛏️',
            color: 'rgb(255, 204, 76)',
            maxHp: 150.0,
            hpRegen: 2.0,
            stamina: 100.0,
            speed: 200,
            desc: 'Stone Form immunity, Double Jump mechanics, and Poison resistance.'
        },
        [Race.ORC]: {
            name: 'Orc',
            emoji: '👹',
            color: 'rgb(255, 76, 76)',
            maxHp: 200.0,
            hpRegen: 3.0,
            stamina: 100.0,
            speed: 225,
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
        { name: 'Goblin Skeleton', emoji: '💀', hp: 15, dmg: 3, speed: 120, type: 'standard', blood: 'red' },
        { name: 'Elven Skeleton', emoji: '💀', hp: 25, dmg: 5, speed: 100, type: 'standard', blood: 'green' },
        { name: 'Goblin Zed', emoji: '🧟', hp: 40, dmg: 8, speed: 90, type: 'standard', blood: 'red' },
        { name: 'Small Orc Zed', emoji: '🧟‍♂️', hp: 60, dmg: 12, speed: 80, type: 'standard', blood: 'red' },
        { name: 'Flying Elf Skull', emoji: '👻', hp: 10, dmg: 30, speed: 150, type: 'exploding', blood: 'purple' },
        { name: 'Medium Orc Zed', emoji: '👺', hp: 150, dmg: 20, speed: 70, type: 'elite', blood: 'red' },
        { name: 'Dwarven Zed', emoji: '🛡️', hp: 200, dmg: 15, speed: 60, type: 'elite', blood: 'red', armored: true },
        { name: 'Human Zed', emoji: '🤖', hp: 500, dmg: 25, speed: 80, type: 'boss', blood: 'red', ranged: true },
        { name: 'Huge Orc Zed', emoji: '👹', hp: 800, dmg: 40, speed: 50, type: 'boss', blood: 'red' },
        { name: 'Elven Necromancer', emoji: '🧙', hp: 400, dmg: 15, speed: 60, type: 'boss', blood: 'purple', summoner: true }
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

            // Cap delta to prevent massive physics jumps
            const dt = Math.min(delta, 0.1);
            try {
                this.update(dt);
                this.render();
            } catch (err) {
                // One bad frame must never kill the run: log and keep the loop alive.
                this.frameErrors = (this.frameErrors || 0) + 1;
                if (this.frameErrors < 5) console.error('[GraveGain2D] frame error (loop survives):', err);
            }

            this.frameId = requestAnimationFrame((t) => this.loop(t));
        }
    }

    // Fullscreen contract: shell helper first, native request with
    // webkit fallback otherwise. Never throws; safe when absent.
    function toggleGraveGainFullscreen() {
        try {
            if (typeof window.__fourweirdToggleFullscreen === 'function') { window.__fourweirdToggleFullscreen(); return; }
            const el = document.getElementById('canvasContainer') || document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
                if (p && p.catch) p.catch(() => {});
            } else if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch (e) { /* ignore */ }
    }

    class InputManager {
        constructor() {
            this.keys = {};
            this.mouse = { x: 0, y: 0, click: false, rightClick: false, angle: 0 };
            this.joystick = { active: false, touchId: null, startX: 0, startY: 0, curX: 0, curY: 0, x: 0, y: 0 };
            this.setupListeners();
        }
        setupListeners() {
            window.addEventListener('keydown', (e) => {
                this.keys[e.code] = true;
                if (e.code === 'KeyP' || e.code === 'Escape') {
                    if (window.GraveGainGame) window.GraveGainGame.togglePause();
                }
                if (e.code === 'KeyF') toggleGraveGainFullscreen();
                if (e.code === 'KeyM' && window.GraveGainGame && window.GraveGainGame.audio) {
                    window.GraveGainGame.audio.muted = !window.GraveGainGame.audio.muted;
                }
                if (window.GraveGainGame && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
                    const mode = { Digit1: 'realtime', Digit2: 'chrono', Digit3: 'turnbased' }[e.code];
                    window.GraveGainGame.setControlMode(mode);
                }
            });
            window.addEventListener('keyup', (e) => {
                this.keys[e.code] = false;
            });
            const container = document.getElementById('canvasContainer');
            const toGamePoint = (event) => {
                const rect = container.getBoundingClientRect();
                // Live backing-store dims (refit on fullscreen) — never hardcode 1000x600.
                const g = window.GraveGainGame;
                const gw = (g && g.canvas && g.canvas.width) || 1000;
                const gh = (g && g.canvas && g.canvas.height) || 600;
                return {
                    x: (event.clientX - rect.left) * (gw / rect.width),
                    y: (event.clientY - rect.top) * (gh / rect.height)
                };
            };
            container.addEventListener('mousemove', (e) => {
                const point = toGamePoint(e);
                this.mouse.x = point.x;
                this.mouse.y = point.y;
            });
            container.addEventListener('mousedown', (e) => {
                if (e.button === 0) this.mouse.click = true;
                if (e.button === 2) {
                    e.preventDefault();
                    this.mouse.rightClick = true;
                }
            });
            container.addEventListener('mouseup', (e) => {
                if (e.button === 0) this.mouse.click = false;
                if (e.button === 2) this.mouse.rightClick = false;
            });
            container.addEventListener('contextmenu', (e) => e.preventDefault());

            // Touch support for mobile
            const joystickEl = document.getElementById('mobileJoystick');
            const joystickKnob = joystickEl.querySelector('.mobile-joystick-knob');

            container.addEventListener('touchstart', (e) => {
                const touch = Array.from(e.changedTouches).find(t => {
                    const rect = container.getBoundingClientRect();
                    return t.clientX - rect.left < rect.width / 2;
                });
                if (!touch || this.joystick.active) return;
                const rect = container.getBoundingClientRect();
                const tx = touch.clientX - rect.left;
                const ty = touch.clientY - rect.top;

                // Left half triggers virtual joystick
                if (tx < rect.width / 2) {
                    this.joystick.active = true;
                    this.joystick.touchId = touch.identifier;
                    this.joystick.startX = touch.clientX;
                    this.joystick.startY = touch.clientY;
                    joystickEl.style.display = 'block';
                    joystickEl.style.left = (tx - 50) + 'px';
                    joystickEl.style.top = (ty - 50) + 'px';
                    joystickKnob.style.transform = 'translate(-50%, -50%)';
                }
            }, { passive: true });

            container.addEventListener('touchmove', (e) => {
                if (!this.joystick.active) return;
                const touch = Array.from(e.touches).find(t => t.identifier === this.joystick.touchId);
                if (!touch) return;
                const dx = touch.clientX - this.joystick.startX;
                const dy = touch.clientY - this.joystick.startY;
                const dist = Math.min(Math.hypot(dx, dy), 50);
                const angle = Math.atan2(dy, dx);

                this.joystick.x = (Math.cos(angle) * dist) / 50;
                this.joystick.y = (Math.sin(angle) * dist) / 50;

                joystickKnob.style.left = (50 + this.joystick.x * 50) + '%';
                joystickKnob.style.top = (50 + this.joystick.y * 50) + '%';
            }, { passive: true });

            container.addEventListener('touchend', (e) => {
                if (Array.from(e.changedTouches).some(t => t.identifier === this.joystick.touchId)) {
                    this.joystick.active = false;
                    this.joystick.touchId = null;
                    this.joystick.x = 0;
                    this.joystick.y = 0;
                    joystickEl.style.display = 'none';
                }
            });

            // Mobile Action Buttons
            const attackBtn = document.getElementById('mobileAttackBtn');
            const blockBtn = document.getElementById('mobileBlockBtn');
            const abilityBtn = document.getElementById('mobileAbilityBtn');
            attackBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.mouse.click = true;
            });
            attackBtn.addEventListener('touchend', () => {
                this.mouse.click = false;
            });
            blockBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.mouse.rightClick = true;
            });
            blockBtn.addEventListener('touchend', () => {
                this.mouse.rightClick = false;
            });
            abilityBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys['KeyF'] = true;
            });
            abilityBtn.addEventListener('touchend', () => {
                this.keys['KeyF'] = false;
            });
        }
    }

    class Camera {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.targetX = 0;
            this.targetY = 0;
            this.shake = 0;
            this.shakeMax = 15;
            this.shakeDecay = 30; // shake units per second
            this.punchX = 0;
            this.punchY = 0;
            this.punchDecay = 5;
            this.width = 1000;
            this.height = 600;
        }
        update(dt, playerX, playerY, pvx, pvy, useLead, usePunch) {
            // Camera lead
            let lx = 0;
            let ly = 0;
            if (useLead) {
                lx = pvx * 0.4;
                ly = pvy * 0.4;
            }

            this.targetX = playerX + lx - this.width / 2;
            this.targetY = playerY + ly - this.height / 2;

            // Smooth interpolation
            this.x += (this.targetX - this.x) * 6 * dt;
            this.y += (this.targetY - this.y) * 6 * dt;

            // Decay shake
            if (this.shake > 0) {
                this.shake = Math.max(0, this.shake - this.shakeDecay * dt);
            }

            // Decay punch
            if (usePunch) {
                this.punchX -= this.punchX * this.punchDecay * dt;
                this.punchY -= this.punchY * this.punchDecay * dt;
            } else {
                this.punchX = 0;
                this.punchY = 0;
            }
        }
        applyShake(amt) {
            this.shake = Math.min(this.shake + amt, this.shakeMax);
        }
        applyPunch(vx, vy, force = 80) {
            const dist = Math.hypot(vx, vy) || 1;
            this.punchX += (vx / dist) * force;
            this.punchY += (vy / dist) * force;
        }
        getOffsets() {
            let sx = 0;
            let sy = 0;
            if (this.shake > 0) {
                sx = (Math.random() * 2 - 1) * this.shake;
                sy = (Math.random() * 2 - 1) * this.shake;
            }
            return {
                x: this.x + this.punchX + sx,
                y: this.y + this.punchY + sy
            };
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
            const grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(1)); // 1 = Wall
            const rooms = [];
            const roomCount = 12;

            // Random room placement
            for (let i = 0; i < roomCount; i++) {
                const w = Math.floor(Math.random() * 9) + 6; // 6 to 14
                const h = Math.floor(Math.random() * 9) + 6;
                const x = Math.floor(Math.random() * (this.gridSize - w - 4)) + 2;
                const y = Math.floor(Math.random() * (this.gridSize - h - 4)) + 2;

                // Overlap check
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

                    // Dig room
                    for (let rx = x; rx < x + w; rx++) {
                        for (let ry = y; ry < y + h; ry++) {
                            grid[rx][ry] = 0; // 0 = floor
                        }
                    }
                }
            }

            // Connection with corridors
            for (let i = 0; i < rooms.length - 1; i++) {
                this.digCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
            }

            // Extra corridors loops
            for (let i = 0; i < 3; i++) {
                if (rooms.length > 3) {
                    const r1 = rooms[Math.floor(Math.random() * rooms.length)];
                    const r2 = rooms[Math.floor(Math.random() * rooms.length)];
                    if (r1 !== r2) {
                        this.digCorridor(grid, r1.cx, r1.cy, r2.cx, r2.cy);
                    }
                }
            }

            // Setup Room details & hazards
            const breakableWalls = [];
            rooms.forEach((room) => {
                // Spawn hazards in Lab
                if (room.type === 'lab') {
                    for (let hx = room.x + 1; hx < room.x + room.w - 1; hx += 3) {
                        for (let hy = room.y + 1; hy < room.y + room.h - 1; hy += 3) {
                            const hazardRand = Math.random();
                            if (hazardRand < 0.3) {
                                grid[hx][hy] = 2; // Water (Slow)
                            } else if (hazardRand < 0.6) {
                                grid[hx][hy] = 3; // Poison Gas trap
                            } else if (hazardRand < 0.8) {
                                grid[hx][hy] = 4; // Fire trap
                            } else {
                                grid[hx][hy] = 5; // Ice slick trap
                            }
                        }
                    }
                }
                // Secret breakable wall on standard corridors or room edges
                if (room.type !== 'spawn' && Math.random() < 0.3) {
                    // Mark a wall on the edge as secret breakable
                    const sx = room.x + Math.floor(room.w / 2);
                    const sy = room.y - 1;
                    if (sy >= 0 && grid[sx][sy] === 1) {
                        grid[sx][sy] = 6; // Breakable wall
                        breakableWalls.push({ x: sx, y: sy });
                    }
                }
            });

            // Calculate difficulty rating from spawn
            const spawnRoom = rooms.find(r => r.type === 'spawn') || rooms[0];
            const maxDistance = Math.hypot(this.gridSize, this.gridSize);

            return { grid, rooms, spawnRoom, breakableWalls, gridSize: this.gridSize };
        }

        digCorridor(grid, x1, y1, x2, y2) {
            // L-shaped connection
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
    // 4. ENTITIES: PLAYER, ENEMIES, ITEMS
    // ==========================================
    class PlayerEntity {
        constructor(race, classType) {
            this.race = race;
            this.classType = classType;
            const rData = RaceData[race];

            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.radius = 16;
            this.angle = 0;

            this.maxHp = rData.maxHp;
            this.hp = rData.maxHp;
            this.hpRegen = rData.hpRegen;
            this.stamina = rData.stamina;
            this.maxStamina = rData.stamina;
            this.speed = rData.speed;

            // Abilities & Resource
            this.mana = this.race === Race.ELF ? 100 : 0;
            this.maxMana = 100;
            this.rage = 0; // Built in combat (Orc)
            this.shieldBubble = 0; // Absorption (Human)
            this.shieldCooldown = 0;
            this.stoneForm = false; // Dwarf immunity
            this.stoneDuration = 0;

            // Combat & Buff State
            this.gold = 0;
            this.xp = 0;
            this.level = 1;
            this.nextLevelXp = 50;
            this.levelUpFlash = 0;
            this.isDead = false;
            this.dodgeTime = 0;
            this.perfectBlockWindow = 0;
            this.blockCooldown = 0;
            this.chargeTime = 0;

            // Bloodlust stacks
            this.bloodlust = []; // timestamps of kills

            // Platformer attributes
            this.inPlatformer = false;
            this.platVy = 0;
            this.grounded = false;
            this.doubleJumpsLeft = 0;
            this.hoverTime = 0;
        }

        gainXp(amount) {
            this.xp += Math.max(0, amount);
            let leveledUp = false;
            while (this.xp >= this.nextLevelXp) {
                this.level++;
                this.nextLevelXp += 50 + (this.level - 1) * 25;
                this.maxHp += 10;
                this.hp = this.maxHp;
                this.maxStamina += 5;
                this.stamina = this.maxStamina;
                this.speed += 5;
                this.levelUpFlash = 1.5;
                leveledUp = true;
            }
            if (leveledUp && window.GraveGainGame) {
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnNatureBurstVFX(this.x, this.y);
            }
            return leveledUp;
        }

        update(dt, keys, input, physics, tilemap) {
            if (this.isDead) return;
            this.levelUpFlash = Math.max(0, this.levelUpFlash - dt);

            const now = Date.now();
            // Bloodlust stack cleanup
            this.bloodlust = this.bloodlust.filter(t => now - t < 5000);

            // Adrenaline Rush
            let speedMod = 1.0;
            if (this.hp / this.maxHp < 0.3) {
                speedMod += 0.25;
            }
            // Bloodlust attack speed & movement boost
            speedMod += this.bloodlust.length * 0.04;

            // Regen HP
            if (!this.stoneForm) {
                this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
            }

            // Mana / Rage decay
            if (this.race === Race.ELF) {
                this.mana = Math.min(this.maxMana, this.mana + 2.0 * dt);
            } else if (this.race === Race.ORC) {
                this.rage = Math.max(0, this.rage - 4.0 * dt);
            }

            // Human shield regen delay
            if (this.race === Race.HUMAN) {
                if (this.shieldCooldown > 0) {
                    this.shieldCooldown -= dt;
                } else {
                    this.shieldBubble = Math.min(20.0, this.shieldBubble + 2.0 * dt);
                }
            }

            // Dwarf stone form timer
            if (this.stoneForm) {
                this.stoneDuration -= dt;
                if (this.stoneDuration <= 0) {
                    this.stoneForm = false;
                }
            }

            // Invincible (dodge roll)
            if (this.dodgeTime > 0) {
                this.dodgeTime -= dt;
            }

            // Block timing
            if (this.perfectBlockWindow > 0) this.perfectBlockWindow -= dt;
            if (this.blockCooldown > 0) this.blockCooldown -= dt;

            // Angle alignment
            if (this.inPlatformer) {
                this.angle = this.vx >= 0 ? 0 : Math.PI;
            } else if (input.joystick.active && (Math.abs(input.joystick.x) > 0.15 || Math.abs(input.joystick.y) > 0.15)) {
                this.angle = Math.atan2(input.joystick.y, input.joystick.x);
            } else {
                this.angle = Math.atan2(input.mouse.y - (this.y - window.GraveGainGame.camera.getOffsets().y), input.mouse.x - (this.x - window.GraveGainGame.camera.getOffsets().x));
            }

            // MOVEMENT LOGIC
            if (this.inPlatformer) {
                this.updatePlatformerMovement(dt, keys, physics, tilemap);
            } else {
                this.updateTopDownMovement(dt, keys, input, speedMod, physics, tilemap);
            }
        }

        updateTopDownMovement(dt, keys, input, speedMod, physics, tilemap) {
            let dx = 0;
            let dy = 0;
            if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

            // Virtual joystick override
            if (input.joystick.active) {
                dx = input.joystick.x;
                dy = input.joystick.y;
            }

            let isRunning = (keys['ShiftLeft'] || keys['ShiftRight']) && this.stamina > 5;
            let currentSpeed = this.speed * speedMod;

            if (isRunning) {
                currentSpeed *= 1.5;
                this.stamina = Math.max(0, this.stamina - 20 * dt);
            } else {
                this.stamina = Math.min(this.maxStamina, this.stamina + 15 * dt);
            }

            // Normalize vector
            const len = Math.hypot(dx, dy);
            if (len > 0) {
                dx /= len;
                dy /= len;
                this.vx = dx * currentSpeed;
                this.vy = dy * currentSpeed;
            } else {
                this.vx = 0;
                this.vy = 0;
            }

            // Slow down in water
            const tileX = Math.floor(this.x / 48);
            const tileY = Math.floor(this.y / 48);
            if (tilemap && tilemap.grid && tilemap.grid[tileX] && tilemap.grid[tileX][tileY] === 2) {
                this.vx *= 0.5;
                this.vy *= 0.5;
            }

            // Dodge roll trigger space
            if (keys['Space'] && this.dodgeTime <= 0 && this.stamina >= 30) {
                this.dodgeTime = 0.3; // 0.3s roll
                this.stamina -= 30;
                // Dash push
                if (len > 0) {
                    this.vx = dx * currentSpeed * 2.2;
                    this.vy = dy * currentSpeed * 2.2;
                } else {
                    const rollAngle = this.angle;
                    this.vx = Math.cos(rollAngle) * currentSpeed * 2.2;
                    this.vy = Math.sin(rollAngle) * currentSpeed * 2.2;
                }
            }

            // Move and collide
            physics.moveEntityWithCollision(this, this.vx * dt, this.vy * dt, tilemap);
        }

        updatePlatformerMovement(dt, keys, physics, tilemap) {
            let dx = 0;
            if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

            const targetSpeed = dx * this.speed;
            this.vx += (targetSpeed - this.vx) * 8 * dt;

            // Gravity
            const gravity = 800; // px/s^2
            this.platVy += gravity * dt;

            // Jump
            if (keys['KeyW'] || keys['ArrowUp'] || keys['Space']) {
                if (this.grounded) {
                    this.platVy = -380;
                    this.grounded = false;
                    this.doubleJumpsLeft = this.race === Race.DWARF ? 1 : 0;
                    // Reset jump key
                    keys['Space'] = false;
                    keys['KeyW'] = false;
                    keys['ArrowUp'] = false;
                } else if (this.race === Race.DWARF && this.doubleJumpsLeft > 0) {
                    this.platVy = -320;
                    this.doubleJumpsLeft--;
                    keys['Space'] = false;
                    keys['KeyW'] = false;
                    keys['ArrowUp'] = false;
                } else if (this.race === Race.ELF && this.hoverTime < 1.0) {
                    // Hovering mechanic for elf
                    this.platVy = -40;
                    this.hoverTime += dt;
                }
            }

            // Jetpack mechanic for human
            if (this.race === Race.HUMAN && keys['Space'] && !this.grounded && this.stamina > 5) {
                this.platVy = -200;
                this.stamina = Math.max(0, this.stamina - 45 * dt);
            } else {
                this.stamina = Math.min(this.maxStamina, this.stamina + 20 * dt);
            }

            // Move platformer coords
            const displacement = physics.moveEntityPlatformer(this, this.vx * dt, this.platVy * dt, tilemap);
            this.grounded = displacement.grounded;
            if (this.grounded) {
                this.platVy = 0;
                this.hoverTime = 0;
            }
        }

        takeDamage(dmg, type = 'normal') {
            if (window.gameDebug?.godMode) return;
            if (this.dodgeTime > 0 || this.stoneForm) return;

            // Perfect Block window check
            if (this.perfectBlockWindow > 0) {
                // Perfect block negates damage & staggers
                window.GraveGainGame.audio.play('block');
                window.GraveGainGame.vfx.spawnPerfectBlockVFX(this.x, this.y);
                this.perfectBlockWindow = 0;
                return;
            }

            // Orc Rage builder
            if (this.race === Race.ORC) {
                this.rage = Math.min(100.0, this.rage + dmg * 0.5);
            }

            // Shield wall absorption
            if (this.shieldBubble > 0) {
                const absorbed = Math.min(this.shieldBubble, dmg);
                this.shieldBubble -= absorbed;
                dmg -= absorbed;
                this.shieldCooldown = 5.0; // delay shield regeneration
            }

            this.hp = Math.max(0, this.hp - dmg);
            window.GraveGainGame.camera.applyShake(8);
            window.GraveGainGame.audio.play('hit');
            if (dmg >= 1 && window.GraveGainGame.vfx) {
                window.GraveGainGame.vfx.spawnFloater(this.x, this.y - 26, '-' + Math.round(dmg), '#f87171');
            }

            if (this.hp <= 0 && !this.isDead) {
                this.isDead = true;
                window.GraveGainGame.gameOver(false);
            }
        }

        triggerAbility() {
            if (this.race === Race.HUMAN) {
                // Shield wall manual force activate
                this.shieldBubble = 20.0;
                this.shieldCooldown = 8.0;
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnShieldVFX(this.x, this.y);
                return true;
            } else if (this.race === Race.ELF && this.mana >= 40) {
                this.mana -= 40;
                // Nature Burst AoE
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnNatureBurstVFX(this.x, this.y);
                window.GraveGainGame.dealAoEDamage(this.x, this.y, 120, 20);
                return true;
            } else if (this.race === Race.DWARF && this.stamina >= 50) {
                this.stamina -= 50;
                // Stone Form
                this.stoneForm = true;
                this.stoneDuration = 4.0; // 4 seconds invincibility
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnStoneFormVFX(this.x, this.y);
                return true;
            } else if (this.race === Race.ORC && this.rage >= 30) {
                const burstPower = this.rage;
                this.rage = 0;
                // Rage Burst AoE damage scales with rage amount
                const dmg = 10 + burstPower * 0.4;
                window.GraveGainGame.audio.play('ability');
                window.GraveGainGame.vfx.spawnRageBurstVFX(this.x, this.y);
                window.GraveGainGame.dealAoEDamage(this.x, this.y, 140, dmg);
                return true;
            }
            return false;
        }
    }

    class EnemyEntity {
        constructor(typeData, x, y, difficultyScale) {
            this.name = typeData.name;
            this.emoji = typeData.emoji;
            this.x = x;
            this.y = y;
            this.radius = 16;
            this.angle = 0;
            this.difficultyScale = difficultyScale;

            this.maxHp = typeData.hp * difficultyScale;
            this.hp = this.maxHp;
            this.dmg = typeData.dmg * difficultyScale;
            this.speed = typeData.speed;
            this.armored = !!typeData.armored;
            this.ranged = !!typeData.ranged;
            this.summoner = !!typeData.summoner;
            this.type = typeData.type;
            this.bloodColor = typeData.blood || 'red';

            // AI states
            this.state = 'idle'; // idle, chase, retreat, alert
            this.spawnX = x;
            this.spawnY = y;
            this.pathTargetX = x;
            this.pathTargetY = y;
            this.lastPathTick = 0;
            this.dialogueCooldown = 0;
        }

        update(dt, player, physics, tilemap) {
            if (this.flash > 0) this.flash -= dt;
            const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
            const now = Date.now();

            // Pack tactics
            let packDmgMultiplier = 1.0;
            if (window.GraveGainGame) {
                const closeAllies = window.GraveGainGame.enemies.filter(e => e !== this && Math.hypot(e.x - this.x, e.y - this.y) < 150);
                packDmgMultiplier += closeAllies.length * 0.1;
            }

            // Rethink target path every 0.5s to conserve performance
            if (now - this.lastPathTick > 500) {
                this.lastPathTick = now;

                // Aggro leash check (10 tiles = 480 pixels)
                const distToSpawn = Math.hypot(this.x - this.spawnX, this.y - this.spawnY);
                if (distToSpawn > 480 && this.type !== 'boss') {
                    this.state = 'retreat';
                } else if (distToPlayer < 300) {
                    // Overhearing check or direct alert
                    if (this.state === 'idle') {
                        this.state = 'chase';
                        // Alert other enemies within 300px
                        window.GraveGainGame.alertEnemiesNear(this.x, this.y, 300);
                    }
                }

                // HP flee threshold
                if (this.hp / this.maxHp < 0.2 && this.type !== 'boss' && this.state !== 'retreat') {
                    this.state = 'flee';
                }

                // AI Pathing Decision
                if (this.state === 'chase') {
                    this.pathTargetX = player.x;
                    this.pathTargetY = player.y;
                } else if (this.state === 'retreat') {
                    this.pathTargetX = this.spawnX;
                    this.pathTargetY = this.spawnY;
                    // Heal rapidly
                    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.1);
                    if (distToSpawn < 20) this.state = 'idle';
                } else if (this.state === 'flee') {
                    // Run opposite of player
                    const angle = Math.atan2(this.y - player.y, this.x - player.x);
                    this.pathTargetX = this.x + Math.cos(angle) * 150;
                    this.pathTargetY = this.y + Math.sin(angle) * 150;
                }
            }

            // Movement logic
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

            // Boss actions (Summoning / Ranged)
            if (this.summoner && this.state === 'chase' && Math.random() < 0.005) {
                // Spawn minor flying skull
                window.GraveGainGame.spawnMinorSkull(this.x, this.y);
                window.GraveGainGame.audio.play('spell');
            }

            // Deal contact damage
            if (distToPlayer < this.radius + player.radius) {
                if (this.emoji === '👻') {
                    // Flying skull explodes on contact
                    player.takeDamage(this.dmg, 'explosion');
                    window.GraveGainGame.enemies = window.GraveGainGame.enemies.filter(e => e !== this);
                    window.GraveGainGame.vfx.spawnExplosionVFX(this.x, this.y);
                } else {
                    player.takeDamage(this.dmg * packDmgMultiplier * dt);
                }
            }
        }
    }

    class LootItem {
        constructor(x, y, type, value, rarity = 'common') {
            this.x = x;
            this.y = y;
            this.type = type; // gold, uusd, item
            this.value = value;
            this.rarity = rarity;
            this.radius = 8;
            this.pulse = Math.random() * Math.PI;
        }
        update(dt, player, range) {
            this.pulse += 5 * dt;
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < range) {
                // Magnet logic
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const pullSpeed = 300 * dt;
                this.x += Math.cos(angle) * pullSpeed;
                this.y += Math.sin(angle) * pullSpeed;
            }
        }
        getEmoji() {
            if (this.type === 'gold') return '🪙';
            if (this.type === 'uusd') return '💵';
            if (this.type === 'item') return '📜';
            return '💎';
        }
    }

    // ==========================================
    // 5. SYSTEMS: STATE, COMBAT MATH, VFX, SAVE
    // ==========================================
    class SaveSystem {
        static save(state) {
            try {
                localStorage.setItem('GraveGain2D_Save', JSON.stringify({
                gold: state.gold,
                uusd: state.uusd,
                quartersLevel: state.quartersLevel,
                prestige: state.prestige,
                botanyCrops: state.botanyCrops,
                dailyChallengeDate: state.dailyChallengeDate,
                dailyChallenges: state.dailyChallenges,
                settings: {
                    difficulty: state.difficultyMultiplierSetting,
                    volume: state.audio.masterVolume,
                    pickupRange: state.autoPickupRange,
                    cameraShake: document.getElementById('settingsCameraShake')?.checked,
                    cameraLead: document.getElementById('settingsCameraLead')?.checked,
                    cameraPunch: document.getElementById('settingsCameraPunch')?.checked,
                    controlMode: state.controlMode,
                    gameSpeed: state.gameSpeed
                }
            }));
            } catch (e) { /* blocked storage / quota: autosave is best-effort */ }
        }
        static load() {
            let data = null;
            try {
                data = localStorage.getItem('GraveGain2D_Save');
            } catch (e) { return null; /* blocked storage: start fresh */ }
            if (data) {
                try {
                    return JSON.parse(data);
                } catch(e) {
                    return null;
                }
            }
            return null;
        }
    }

    class AudioController {
        constructor() {
            this.ctx = null;
            this.masterVolume = 0.8;
            this.muted = false; // M key toggles; play()/speak stay silent while muted
        }
        initCtx() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
        }
        play(soundName) {
            if (this.muted) return;
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
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(10, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (soundName === 'block') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (soundName === 'ability') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (soundName === 'loot') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else {
                // Default beep
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            }
        }
        speakFallback(text) {
            if (this.muted) return;
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.volume = this.masterVolume;
                window.speechSynthesis.speak(utterance);
            }
        }
    }

    class ParticleSystem {
        constructor() {
            this.bloodSplats = []; // {x, y, radius, color}
            this.goreChunks = []; // {x, y, vx, vy, time}
            this.sparks = []; // {x, y, vx, vy, color, time}
            this.rings = []; // expanding shockwave rings {x, y, color, radius, maxRadius, life, maxLife}
            this.floaters = []; // floating combat text {x, y, text, color, life}
            this.maxSplats = 200;
            this.maxGore = 50;
        }
        spawnBlood(x, y, color = 'red') {
            for (let i = 0; i < 4; i++) {
                if (this.bloodSplats.length >= this.maxSplats) {
                    this.bloodSplats.shift();
                }
                const rx = x + (Math.random() * 20 - 10);
                const ry = y + (Math.random() * 20 - 10);
                this.bloodSplats.push({ x: rx, y: ry, radius: Math.random() * 6 + 4, color });
            }
        }
        spawnGore(x, y) {
            for (let i = 0; i < 3; i++) {
                if (this.goreChunks.length >= this.maxGore) {
                    this.goreChunks.shift();
                }
                this.goreChunks.push({
                    x, y,
                    vx: (Math.random() * 2 - 1) * 120,
                    vy: -150 - Math.random() * 100, // custom vertical initial velocity
                    life: 0.8
                });
            }
        }
        spawnSparks(x, y, color = 'orange', count = 8) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 100 + 50;
                this.sparks.push({
                    x, y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    color,
                    life: 0.4 + Math.random() * 0.3
                });
            }
        }
        spawnRing(x, y, color = 'white', maxRadius = 60, life = 0.35) {
            if (this.rings.length > 24) this.rings.shift();
            this.rings.push({ x, y, color, radius: 8, maxRadius, life, maxLife: life });
        }
        spawnFloater(x, y, text, color = '#facc15') {
            if (this.floaters.length > 40) this.floaters.shift();
            this.floaters.push({ x, y, text: String(text), color, life: 1.1 });
        }
        spawnShieldVFX(x, y) { this.spawnRing(x, y, 'deepskyblue', 46, 0.4); this.spawnSparks(x, y, 'deepskyblue', 10); }
        spawnNatureBurstVFX(x, y) { this.spawnRing(x, y, '#4ade80', 90, 0.45); this.spawnSparks(x, y, 'green', 14); }
        spawnStoneFormVFX(x, y) { this.spawnRing(x, y, 'gold', 46, 0.4); this.spawnSparks(x, y, 'gold', 10); }
        spawnRageBurstVFX(x, y) { this.spawnRing(x, y, '#ef4444', 100, 0.45); this.spawnSparks(x, y, 'orange', 16); }
        spawnPerfectBlockVFX(x, y) { this.spawnRing(x, y, '#22d3ee', 55, 0.3); this.spawnSparks(x, y, '#22d3ee', 8); }
        spawnExplosionVFX(x, y) { this.spawnRing(x, y, '#c084fc', 80, 0.4); this.spawnSparks(x, y, 'purple', 16); this.spawnBlood(x, y, 'purple'); }
        update(dt) {
            // Update shockwave rings
            this.rings.forEach(r => {
                r.life -= dt;
                const t = 1 - Math.max(0, r.life / r.maxLife);
                r.radius = 8 + (r.maxRadius - 8) * t;
            });
            this.rings = this.rings.filter(r => r.life > 0);

            // Update floating combat text
            this.floaters.forEach(f => {
                f.life -= dt;
                f.y -= 34 * dt;
            });
            this.floaters = this.floaters.filter(f => f.life > 0);

            // Update gore chunks
            this.goreChunks.forEach(g => {
                g.life -= dt;
                g.vy += 800 * dt; // gravity
                g.x += g.vx * dt;
                g.y += g.vy * dt;

                // Simple floor bounce at standard level boundary
                if (g.vy > 0 && Math.random() < 0.1) {
                    g.vy = -g.vy * 0.4;
                }
            });
            this.goreChunks = this.goreChunks.filter(g => g.life > 0);

            // Update sparks
            this.sparks.forEach(s => {
                s.life -= dt;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
            });
            this.sparks = this.sparks.filter(s => s.life > 0);
        }
    }

    class PhysicsController {
        checkAABB(aX, aY, aR, bX, bY, bR) {
            return Math.hypot(aX - bX, aY - bY) < aR + bR;
        }
        moveEntityWithCollision(ent, dx, dy, tilemap) {
            if (!tilemap) {
                ent.x += dx;
                ent.y += dy;
                return;
            }
            // Simple X movement and check
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
        moveEntityPlatformer(ent, dx, dy, tilemap) {
            let grounded = false;
            const ox = ent.x;
            const oy = ent.y;

            ent.x += dx;
            if (this.isCollidingWithWall(ent.x, ent.y, ent.radius, tilemap)) {
                ent.x = ox;
            }

            ent.y += dy;
            if (this.isCollidingWithWall(ent.x, ent.y, ent.radius, tilemap)) {
                // Check if moving down
                if (dy > 0) grounded = true;
                ent.y = oy;
            }
            return { grounded };
        }
        isCollidingWithWall(x, y, radius, tilemap) {
            if (!tilemap || !tilemap.grid) return false;
            // Check boundary points
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
                if (cell === 1 || cell === 6) {
                    return true;
                }
            }
            return false;
        }
    }

    // ==========================================
    // 6. MAIN GAME ENGINE SYSTEM
    // ==========================================
    class GraveGainGame {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.lightCanvas = document.getElementById('lightingCanvas');
            this.lightCtx = this.lightCanvas.getContext('2d');

            this.input = new InputManager();
            this.camera = new Camera();
            this.generator = new DungeonGenerator();
            this.physics = new PhysicsController();
            this.vfx = new ParticleSystem();
            this.audio = new AudioController();

            // Core State Database
            this.gold = 0;
            this.uusd = 200;
            this.quartersLevel = 1;
            this.prestige = 0;
            this.floorIndex = 1;
            this.difficultyMultiplierSetting = 'normal';
            this.controlMode = 'realtime';
            this.gameSpeed = 1;
            this.chronoScale = 0.04;
            this.turnCount = 1;
            this.lastTurnInputAt = 0;
            this.isDialogueActive = false;
            this.dailyChallengeDate = null;
            this.dailyChallenges = null;

            // Active Game Variables
            this.player = null;
            this.enemies = [];
            this.loot = [];
            this.dungeon = null;
            this.alertLevel = 0; // scaled by minutes
            this.sessionStart = 0;
            this.autoPickupRange = 100;
            this.runKills = 0;
            this.runGold = 0;

            // Attack Sweep visual queues
            this.attackSweep = null; // {x, y, radius, startAngle, endAngle, time}

            // Botany & Quarters
            this.botanyCrops = [
                { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
                { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
                { seedId: null, startTime: 0, growthTime: 0, capacity: 0 },
                { seedId: null, startTime: 0, growthTime: 0, capacity: 0 }
            ];

            // Setup elements
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
                this.gold = Math.max(0, Number(saved.gold) || 0);
                this.uusd = Math.max(0, Number(saved.uusd) || 0);
                this.quartersLevel = Math.min(QuartersUpgrades.length, Math.max(1, Math.floor(Number(saved.quartersLevel) || 1)));
                this.prestige = Math.max(0, Number(saved.prestige) || 0);
                this.dailyChallengeDate = typeof saved.dailyChallengeDate === 'string' ? saved.dailyChallengeDate : null;
                this.dailyChallenges = Array.isArray(saved.dailyChallenges) ? saved.dailyChallenges : null;
                if (Array.isArray(saved.botanyCrops)) {
                    this.botanyCrops = saved.botanyCrops
                        .slice(0, this.getBotanySlotLimit())
                        .map(crop => {
                            const seed = BotanySeeds.find(item => item.id === crop?.seedId);
                            return seed
                                ? { seedId: seed.id, startTime: Math.max(0, Number(crop.startTime) || 0), growthTime: seed.time, capacity: seed.space }
                                : { seedId: null, startTime: 0, growthTime: 0, capacity: 0 };
                        });
                }
                if (saved.settings) {
                    this.difficultyMultiplierSetting = saved.settings.difficulty || 'normal';
                    this.audio.masterVolume = Number.isFinite(saved.settings.volume) ? saved.settings.volume : 0.8;
                    this.autoPickupRange = saved.settings.pickupRange || 100;
                    this.controlMode = saved.settings.controlMode || 'realtime';
                    this.gameSpeed = saved.settings.gameSpeed || 1;
                    document.getElementById('settingsDifficulty').value = this.difficultyMultiplierSetting;
                    document.getElementById('settingsMasterVol').value = Math.round(this.audio.masterVolume * 100);
                    document.getElementById('settingsPickupRange').value = this.autoPickupRange;
                    ['CameraShake', 'CameraLead', 'CameraPunch'].forEach(key => {
                        const savedValue = saved.settings[`camera${key.replace('Camera', '')}`];
                        if (typeof savedValue === 'boolean') document.getElementById(`settings${key}`).checked = savedValue;
                    });
                }
            }
            this.updateHubQuartersUI();
            this.setControlMode(this.controlMode);
        }

        saveState() {
            SaveSystem.save(this);
        }

        startAutoSaveTimer() {
            setInterval(() => {
                this.saveState();
            }, 60000);
        }

        generateDailyChallenges() {
            const dateStr = new Date().toDateString();
            if (this.dailyChallengeDate === dateStr && Array.isArray(this.dailyChallenges) && this.dailyChallenges.length === 3) {
                this.dailyChallenges.forEach((challenge, index) => {
                    challenge.rewardGold = Number(challenge.rewardGold) || [75, 125, 150][index];
                    challenge.rewardUusd = Number(challenge.rewardUusd) || [25, 50, 75][index];
                    challenge.claimed = Boolean(challenge.claimed);
                });
                return;
            }
            // Deterministic hash based on date string
            let hash = 0;
            for (let i = 0; i < dateStr.length; i++) {
                hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            this.dailyChallenges = [
                { id: 1, desc: 'Slay ' + (Math.abs(hash % 20) + 15) + ' undead creatures.', target: Math.abs(hash % 20) + 15, current: 0, done: false, claimed: false, rewardGold: 75, rewardUusd: 25 },
                { id: 2, desc: 'Collect ' + (Math.abs((hash >> 2) % 300) + 200) + ' dungeon Gold.', target: Math.abs((hash >> 2) % 300) + 200, current: 0, done: false, claimed: false, rewardGold: 125, rewardUusd: 50 },
                { id: 3, desc: 'Reach Layer ' + (Math.abs((hash >> 4) % 3) + 3) + ' depth.', target: Math.abs((hash >> 4) % 3) + 3, current: 1, done: false, claimed: false, rewardGold: 150, rewardUusd: 75 }
            ];
            this.dailyChallengeDate = dateStr;
        }

        renderDailyChallenges() {
            const el = document.getElementById('dailyChallengesList');
            if (!el) return;
            el.innerHTML = this.dailyChallenges.map(c => `
                <div class="daily-challenge-item">
                    <span>${c.desc}<small class="daily-reward"> +${c.rewardGold}g / +${c.rewardUusd}$</small></span>
                    ${c.done && !c.claimed
                        ? `<button type="button" class="btn-game daily-claim-btn" onclick="window.GraveGainGame.claimDailyChallenge(${c.id})">Claim</button>`
                        : `<strong style="color: ${c.done ? 'var(--grave-purple-glow)' : 'var(--grave-text)'}">${c.claimed ? '✓ Claimed' : `${c.current} / ${c.target}`}</strong>`}
                </div>
            `).join('');
        }

        claimDailyChallenge(id) {
            const challenge = this.dailyChallenges?.find(item => item.id === id);
            if (!challenge || !challenge.done || challenge.claimed) return;
            challenge.claimed = true;
            this.gold += challenge.rewardGold;
            this.uusd += challenge.rewardUusd;
            this.audio.play('loot');
            this.renderDailyChallenges();
            this.saveState();
        }

        updateChallengeProgress(type, amt) {
            const completedBefore = this.dailyChallenges.filter(challenge => challenge.done).length;
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
            if (this.dailyChallenges.filter(challenge => challenge.done).length > completedBefore) this.saveState();
        }

        setupUIListeners() {
            // Main menu buttons
            const btnStoryMode = document.getElementById('btnStoryMode');
            if (btnStoryMode) {
                btnStoryMode.addEventListener('click', () => {
                    document.getElementById('mainMenuScreen').classList.add('hidden');
                    document.getElementById('storyMissionScreen').classList.remove('hidden');
                    this.renderStoryMissionsList();
                });
            }

            const btnStoryBack = document.getElementById('btnStoryBack');
            if (btnStoryBack) {
                btnStoryBack.addEventListener('click', () => {
                    document.getElementById('storyMissionScreen').classList.add('hidden');
                    document.getElementById('mainMenuScreen').classList.remove('hidden');
                });
            }

            const btnStartStoryMission = document.getElementById('btnStartStoryMission');
            if (btnStartStoryMission) {
                btnStartStoryMission.addEventListener('click', () => {
                    if (!this.selectedStoryMissionId) return;
                    document.getElementById('storyMissionScreen').classList.add('hidden');
                    document.getElementById('charSelectScreen').classList.remove('hidden');
                    this.renderCharSelect();
                });
            }

            document.getElementById('btnPlay').addEventListener('click', () => {
                this.selectedStoryMissionId = null;
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
                this.autoPickupRange = parseInt(document.getElementById('settingsPickupRange').value) || 100;
                this.saveState();
                document.getElementById('settingsScreen').classList.add('hidden');
            });

            // Char select buttons
            document.getElementById('btnCharSelectBack').addEventListener('click', () => {
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });

            document.getElementById('btnCharSelectStart').addEventListener('click', () => {
                const selRace = document.querySelector('.char-card.selected')?.dataset.race || Race.HUMAN;
                const selClass = document.querySelector('.class-btn.selected')?.dataset.class || ClassType.WARRIOR;
                const selMode = document.querySelector('.char-mode-card.selected')?.dataset.mode || this.controlMode;
                this.setControlMode(selMode);
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.remove('hidden');
                this.initRun(selRace, selClass);
            });

            // Hub buttons & tabs
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

            // Exchange triggers
            document.getElementById('btnBuyUusd').addEventListener('click', () => {
                if (this.gold >= 10) {
                    this.gold -= 10;
                    this.uusd += 100;
                    this.audio.play('loot');
                    document.getElementById('exchangeGoldBalance').textContent = this.gold + ' Gold';
                    document.getElementById('exchangeUusdBalance').textContent = this.uusd + ' $UUSD';
                    this.saveState();
                }
            });

            document.getElementById('btnBuyGold').addEventListener('click', () => {
                if (this.uusd >= 100) {
                    this.uusd -= 100;
                    this.gold += 10;
                    this.audio.play('loot');
                    document.getElementById('exchangeGoldBalance').textContent = this.gold + ' Gold';
                    document.getElementById('exchangeUusdBalance').textContent = this.uusd + ' $UUSD';
                    this.saveState();
                }
            });

            // Quarters upgrade trigger
            document.getElementById('btnUpgradeQuarters').addEventListener('click', () => {
                if (this.quartersLevel < 6) {
                    const cost = QuartersUpgrades[this.quartersLevel].cost;
                    if (this.uusd >= cost) {
                        this.uusd -= cost;
                        this.quartersLevel++;
                        this.audio.play('ability');
                        this.updateHubQuartersUI();
                        this.renderBotany();
                        this.saveState();
                    }
                }
            });

            document.getElementById('btnGenerateCircuit').addEventListener('click', () => this.generateRepairMiniGame());
            document.querySelectorAll('.btn-mode').forEach(btn => btn.addEventListener('click', () => this.setControlMode(btn.dataset.mode)));
            document.querySelectorAll('.btn-speed').forEach(btn => btn.addEventListener('click', () => this.setGameSpeed(btn.dataset.speed)));
            document.getElementById('btnWaitTurn').addEventListener('click', () => this.executeTurnAction('wait'));
            document.getElementById('mobileWaitBtn').addEventListener('touchstart', (e) => { e.preventDefault(); this.executeTurnAction('wait'); });
            document.querySelectorAll('.char-mode-card').forEach(btn => btn.addEventListener('click', () => this.setControlMode(btn.dataset.mode)));

            // Game over button
            document.getElementById('btnGoToMenu').addEventListener('click', () => {
                document.getElementById('gameOverScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });

            // Return to hub from run
            document.getElementById('btnReturnToHub').addEventListener('click', () => {
                this.loop.stop();
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                this.saveState();
            });

            // Pause triggers
            document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
            document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
            document.getElementById('btnAbandon').addEventListener('click', () => {
                this.loop.stop();
                document.getElementById('pauseScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                this.saveState();
            });

            // Pause-on-hidden: a hidden tab must never keep simulating the run.
            document.addEventListener('visibilitychange', () => {
                try {
                    if (document.hidden && this.player && !this.loop.isPaused &&
                        !document.getElementById('gameMain').classList.contains('hidden')) {
                        this.togglePause();
                    }
                } catch (e) { /* ignore */ }
            });

            // Fullscreen re-fit: sync backing store + camera to the container.
            const refitViewport = () => {
                try {
                    const box = document.getElementById('canvasContainer');
                    const w = Math.max(320, box ? box.clientWidth : 1000) | 0;
                    const h = Math.max(240, box ? box.clientHeight : 600) | 0;
                    for (const c of [this.canvas, this.lightCanvas]) {
                        if (c && (c.width !== w || c.height !== h)) { c.width = w; c.height = h; }
                    }
                    if (this.camera) { this.camera.width = w; this.camera.height = h; }
                } catch (e) { /* ignore */ }
            };
            document.addEventListener('fullscreenchange', refitViewport);
            window.addEventListener('resize', refitViewport);

            // Double-click canvas toggles fullscreen (same contract as the ⛶ button).
            try {
                document.getElementById('canvasContainer').addEventListener('dblclick', () => toggleGraveGainFullscreen());
            } catch (e) { /* ignore */ }
        }

        renderCharSelect() {
            const raceGrid = document.getElementById('raceGrid');
            raceGrid.innerHTML = Object.keys(RaceData).map((key, i) => {
                const race = RaceData[key];
                return `
                    <button type="button" class="char-card ${i === 0 ? 'selected' : ''}" data-race="${key}" aria-pressed="${i === 0}">
                        <span class="char-emoji">${race.emoji}</span>
                        <div class="char-name">${race.name}</div>
                        <div class="char-desc">${race.desc}</div>
                    </button>
                `;
            }).join('');

            // Bind click
            const cards = raceGrid.querySelectorAll('.char-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    cards.forEach(c => c.setAttribute('aria-pressed', String(c === card)));
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
            this.ensureBotanySlots();
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
            const upgradeButton = document.getElementById('btnUpgradeQuarters');
            upgradeButton.disabled = this.quartersLevel >= QuartersUpgrades.length;
            upgradeButton.textContent = this.quartersLevel >= QuartersUpgrades.length
                ? '✓ Maximum Quarters Reached'
                : '🔧 Purchase Expansion Upgrade';
        }

        // ==========================================
        // BOTANY REAL-TIME SIMULATION
        // ==========================================
        getBotanySlotLimit() {
            return Math.min(4 + (this.quartersLevel - 1) * 2, 12);
        }

        ensureBotanySlots() {
            while (this.botanyCrops.length < this.getBotanySlotLimit()) {
                this.botanyCrops.push({ seedId: null, startTime: 0, growthTime: 0, capacity: 0 });
            }
        }

        getBotanySpaceUsed() {
            return this.botanyCrops.reduce((used, crop) => {
                const seed = crop.seedId && BotanySeeds.find(s => s.id === crop.seedId);
                return used + (seed ? seed.space : 0);
            }, 0);
        }

        renderBotany() {
            const grid = document.getElementById('botanyGrid');
            const now = Math.floor(Date.now() / 1000);
            this.ensureBotanySlots();
            const capacity = QuartersUpgrades[this.quartersLevel - 1].capacity;
            document.getElementById('botanyCapacityText').textContent = `Incubators: ${this.botanyCrops.length}/${this.getBotanySlotLimit()} · Growing space: ${this.getBotanySpaceUsed()}/${capacity}`;

            grid.innerHTML = this.botanyCrops.map((crop, index) => {
                if (crop.seedId === null) {
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
            const capacity = QuartersUpgrades[this.quartersLevel - 1].capacity;
            if (seed && this.uusd >= 20 && this.getBotanySpaceUsed() + seed.space <= capacity) {
                this.uusd -= 20;
                this.botanyCrops[slotIndex] = {
                    seedId: seed.id,
                    startTime: Math.floor(Date.now() / 1000),
                    growthTime: seed.time
                };
                this.audio.play('loot');
                this.renderBotany();
                this.saveState();
            }
        }

        harvestCrop(slotIndex) {
            const crop = this.botanyCrops[slotIndex];
            const seed = BotanySeeds.find(s => s.id === crop.seedId);
            this.uusd += seed.yield * seed.value;
            this.botanyCrops[slotIndex] = { seedId: null, startTime: 0, growthTime: 0 };
            this.audio.play('loot');
            this.renderBotany();
            this.saveState();
        }

        // ==========================================
        // CIRCUITS REPAIR MINI GAME
        // ==========================================
        generateRepairMiniGame() {
            const area = document.getElementById('repairCircuitArea');
            area.innerHTML = '';
            this.circuitConnected = false;
            document.getElementById('repairStatus').textContent = 'Status: Calibration offline';

            const termX = 220;
            const termY = 100;

            // Target Dotted Node
            const target = document.createElement('div');
            target.className = 'circuit-node terminal';
            target.style.left = termX + 'px';
            target.style.top = termY + 'px';
            target.textContent = '🎯';
            area.appendChild(target);

            // Draggable Component
            const comp = document.createElement('div');
            comp.className = 'circuit-node component';
            comp.style.left = '40px';
            comp.style.top = '100px';
            comp.textContent = '💠';
            area.appendChild(comp);

            // Drag behavior
            let isDragging = false;
            const dragStart = () => { isDragging = true; };
            const dragMove = (e) => {
                if (!isDragging) return;
                const rect = area.getBoundingClientRect();
                let clientX = e.clientX || e.touches[0].clientX;
                let clientY = e.clientY || e.touches[0].clientY;

                let px = clientX - rect.left;
                let py = clientY - rect.top;

                // Restrict boundaries
                px = Math.max(16, Math.min(rect.width - 16, px));
                py = Math.max(16, Math.min(rect.height - 16, py));

                comp.style.left = px + 'px';
                comp.style.top = py + 'px';

                // Check distance
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
            const mission = this.selectedStoryMissionId && window.GraveGainStoryEngine
                ? window.GraveGainStoryEngine.getMission(this.selectedStoryMissionId) : null;
            this.currentMission = mission ? JSON.parse(JSON.stringify(mission)) : null;
            this.floorIndex = this.currentMission?.minFloor || 1;
            this.sessionStart = Date.now();
            this.runKills = 0;
            this.runGold = 0;
            this.buildDungeonLayer();

            if (this.currentMission) {
                this.updateMissionUI();
                this.playDialogueSequence(this.currentMission.dialogueBefore, () => {
                    this.audio.speakFallback(`Mission Goal: ${this.currentMission.objectives[0].desc}`);
                    });
            } else {
                this.currentMission = null;
                this.updateMissionUI();
            }

            this.loop.start();
        }

        buildDungeonLayer() {
            // Rebuild map grid
            this.dungeon = this.generator.generate(this.floorIndex);
            this.player.x = this.dungeon.spawnRoom.cx * 48 + 24;
            this.player.y = this.dungeon.spawnRoom.cy * 48 + 24;
            this.player.vx = 0;
            this.player.vy = 0;

            // Spawn enemies based on difficulty
            this.enemies = [];
            this.loot = [];

            const diffScale = 1.0 + (Math.min(this.floorIndex, 30) * 0.15);

            this.dungeon.rooms.forEach((room) => {
                if (room.type === 'spawn') return;

                // Spawn enemies in rooms
                let maxRoomMobs = 2;
                if (room.type === 'graveyard') maxRoomMobs = 4;
                if (room.type === 'safespace') maxRoomMobs = 5;

                for (let i = 0; i < maxRoomMobs; i++) {
                    const ex = room.x + Math.floor(Math.random() * room.w);
                    const ey = room.y + Math.floor(Math.random() * room.h);
                    const rx = ex * 48 + 24;
                    const ry = ey * 48 + 24;

                    const enemyData = this.getAmbientEnemyType();
                    this.enemies.push(this.createEnemy(enemyData, rx, ry, diffScale));
                }

                // Spawn gold/chests
                if (room.type === 'treasury') {
                    for (let i = 0; i < 3; i++) {
                        const lx = (room.x + Math.floor(Math.random() * room.w)) * 48 + 24;
                        const ly = (room.y + Math.floor(Math.random() * room.h)) * 48 + 24;
                        this.loot.push(new LootItem(lx, ly, 'gold', 50));
                    }
                }

                // Spawn a lore scroll with a small chance in any room
                if (Math.random() < 0.2) {
                    const lx = (room.x + Math.floor(Math.random() * room.w)) * 48 + 24;
                    const ly = (room.y + Math.floor(Math.random() * room.h)) * 48 + 24;
                    this.loot.push(new LootItem(lx, ly, 'item', 150));
                }
            });

            if (this.currentMission) this.populateMissionTargets();

            // Starter pack: guarantee first contact inside the opening ticks.
            // New players spawn alone in the dark; this seeds 2 nearby foes + 1 gold cache.
            const starters = [];
            for (let x = 0; x < this.dungeon.gridSize && starters.length < 6; x++) {
                for (let y = 0; y < this.dungeon.gridSize && starters.length < 6; y++) {
                    if (this.dungeon.grid[x][y] !== 0) continue;
                    const px = x * 48 + 24, py = y * 48 + 24;
                    const d = Math.hypot(px - this.player.x, py - this.player.y);
                    if (d > 140 && d < 340) starters.push([px, py]);
                }
            }
            starters.slice(0, 2).forEach(([sx, sy]) => {
                this.enemies.push(this.createEnemy(EnemyTypes[0], sx, sy, diffScale));
            });
            if (starters[2]) this.loot.push(new LootItem(starters[2][0], starters[2][1], 'gold', 25));

            this.updateChallengeProgress('depth', this.floorIndex);
            this.updateHUD();
        }

        getAmbientEnemyType() {
            const standard = EnemyTypes.filter(enemy => enemy.type === 'standard');
            const skulls = EnemyTypes.filter(enemy => enemy.type === 'exploding');
            const elites = EnemyTypes.filter(enemy => enemy.type === 'elite');
            const bosses = EnemyTypes.filter(enemy => enemy.type === 'boss');
            const pool = [...standard];

            if (this.floorIndex >= 2) pool.push(...skulls);
            if (this.floorIndex >= 3) pool.push(...elites);
            // Bosses remain uncommon ambient threats. Story bosses are spawned by their mission objective.
            if (this.floorIndex >= 6 && Math.random() < Math.min(0.03 + this.floorIndex * 0.005, 0.08)) {
                return bosses[Math.floor(Math.random() * bosses.length)];
            }
            return pool[Math.floor(Math.random() * pool.length)];
        }

        populateMissionTargets() {
            const openTiles = [];
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    if (this.dungeon.grid[x][y] !== 0) continue;
                    const px = x * 48 + 24;
                    const py = y * 48 + 24;
                    if (Math.hypot(px - this.player.x, py - this.player.y) > 300) openTiles.push([px, py]);
                }
            }
            const spawn = (type, count) => {
                // Hard cap: a corrupt objective count can never spawn-blowup the run.
                const n = Math.min(Math.max(0, count | 0), 40);
                for (let i = 0; i < n && openTiles.length; i++) {
                    const index = Math.floor(Math.random() * openTiles.length);
                    const [x, y] = openTiles.splice(index, 1)[0];
                    this.enemies.push(this.createEnemy(type, x, y, 1 + Math.min(this.floorIndex, 30) * 0.1));
                }
            };
            const standard = EnemyTypes.find(e => e.type === 'standard');
            const elite = EnemyTypes.find(e => e.type === 'elite');
            const skull = EnemyTypes.find(e => e.type === 'exploding');
            const boss = EnemyTypes.find(e => e.type === 'boss');
            this.currentMission.objectives.forEach(objective => {
                if (objective.id === 'slay_boss') spawn(boss, objective.count);
                else if (objective.id === 'slay_skulls') spawn(skull, objective.count);
                else if (objective.id === 'slay_elites') spawn(elite, objective.count);
                else if (objective.id === 'slay_all' || objective.id === 'slay_minions' || objective.id === 'survive_waves') spawn(standard, objective.count);
                else if (objective.id === 'collect_ore') {
                    for (let i = 0; i < objective.count && openTiles.length; i++) {
                        const index = Math.floor(Math.random() * openTiles.length);
                        const [x, y] = openTiles.splice(index, 1)[0];
                        this.loot.push(new LootItem(x, y, 'item', 100));
                    }
                }
            });
        }

        getDifficultyProfile() {
            return {
                easy: { hp: 0.6, damage: 0.5, xp: 0.75, loot: 1.5 },
                normal: { hp: 1, damage: 1, xp: 1, loot: 1 },
                nightmare: { hp: 2.5, damage: 2, xp: 2.5, loot: 0.6 }
            }[this.difficultyMultiplierSetting] || { hp: 1, damage: 1, xp: 1, loot: 1 };
        }

        createEnemy(typeData, x, y, floorScale) {
            const difficulty = this.getDifficultyProfile();
            return new EnemyEntity({
                ...typeData,
                hp: typeData.hp * difficulty.hp,
                dmg: typeData.dmg * difficulty.damage
            }, x, y, floorScale);
        }

        getScaledRewards(gold, xp = 0) {
            const difficulty = this.getDifficultyProfile();
            return { gold: Math.max(1, Math.round(gold * difficulty.loot)), xp: Math.max(1, Math.round(xp * difficulty.xp)) };
        }

        updateMissionUI() {
            const tracker = document.getElementById('missionTracker');
            const text = document.getElementById('missionObjectiveText');
            if (!tracker || !text) return;
            if (!this.currentMission) {
                tracker.classList.add('hidden');
                return;
            }
            const objectives = this.currentMission.objectives || [];
            text.textContent = objectives.map(obj => `${obj.desc}: ${obj.current}/${obj.count}`).join('  •  ');
            tracker.classList.remove('hidden');
        }

        spawnMinorSkull(x, y) {
            const skullData = EnemyTypes.find(e => e.emoji === '👻');
            this.enemies.push(this.createEnemy(skullData, x, y, 1.0));
        }

        dealAoEDamage(x, y, radius, dmg) {
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist <= radius) {
                    e.hp -= dmg;
                    e.flash = 0.15;
                    this.vfx.spawnSparks(e.x, e.y, 'green');
                    this.vfx.spawnFloater(e.x, e.y - 24, '-' + Math.round(dmg), '#fdba74');
                }
            });
            this.enemies = this.enemies.filter(e => {
                if (e.hp <= 0) {
                    const rewards = this.getScaledRewards(15, 10);
                    this.gold += rewards.gold;
                    this.runGold += rewards.gold;
                    this.runKills++;
                    this.player.gainXp(rewards.xp);
                    if (this.currentMission) this.checkStoryObjectives(e);
                    this.updateChallengeProgress('slay', 1);
                    this.updateChallengeProgress('gold', rewards.gold);
                    this.vfx.spawnGore(e.x, e.y);
                    this.vfx.spawnFloater(e.x, e.y - 30, '+' + rewards.gold + 'g', '#fbbf24');
                    this.audio.play('hit');
                    return false;
                }
                return true;
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
            if (!this.player || document.getElementById('gameMain').classList.contains('hidden')) return;
            if (this.loop.isPaused) {
                document.getElementById('pauseScreen').classList.add('hidden');
                this.loop.start();
            } else {
                this.loop.stop();
                document.getElementById('pauseScreen').classList.remove('hidden');
            }
        }

        setControlMode(mode) {
            this.controlMode = ['realtime', 'chrono', 'turnbased'].includes(mode) ? mode : 'realtime';
            this.chronoScale = this.controlMode === 'chrono' ? 0.04 : 1;
            document.querySelectorAll('.btn-mode').forEach(btn => {
                const selected = btn.dataset.mode === this.controlMode;
                btn.classList.toggle('active', selected);
                btn.setAttribute('aria-pressed', String(selected));
            });
            document.querySelectorAll('.char-mode-card').forEach(btn => {
                const selected = btn.dataset.mode === this.controlMode;
                btn.classList.toggle('selected', selected);
                btn.setAttribute('aria-pressed', String(selected));
            });
            document.getElementById('speedSelectorGroup')?.classList.toggle('hidden', this.controlMode !== 'realtime');
            document.getElementById('chronoDisplayGroup')?.classList.toggle('hidden', this.controlMode !== 'chrono');
            document.getElementById('turnDisplayGroup')?.classList.toggle('hidden', this.controlMode !== 'turnbased');
            document.getElementById('mobileWaitBtn')?.classList.toggle('hidden', this.controlMode !== 'turnbased');
            this.turnCount = 1;
            const counter = document.getElementById('hudTurnCounter');
            if (counter) counter.textContent = 'Turn 1';
        }

        setGameSpeed(speed) {
            this.gameSpeed = Math.max(0.5, Math.min(2, Number(speed) || 1));
            document.querySelectorAll('.btn-speed').forEach(btn => {
                const selected = Number(btn.dataset.speed) === this.gameSpeed;
                btn.classList.toggle('active', selected);
                btn.setAttribute('aria-pressed', String(selected));
            });
        }

        setTurnFeedback(msg) {
            const phase = document.getElementById('hudTurnPhase');
            if (phase) phase.textContent = msg || 'YOUR TURN';
        }

        nearestEnemy(maxDist = Infinity) {
            let best = null, bd = maxDist;
            for (const e of this.enemies) {
                const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (d < bd) { bd = d; best = e; }
            }
            return best;
        }

        executeTurnAction(action) {
            if (this.controlMode !== 'turnbased' || !this.player || this.player.isDead) return 'ignored';
            this.setTurnFeedback('YOUR TURN');
            this.advanceTurnState(0.35);
            let result = action;
            const steps = { up:[0,-48], down:[0,48], left:[-48,0], right:[48,0] };
            if (steps[action]) {
                const [dx, dy] = steps[action];
                this.player.angle = Math.atan2(dy, dx);
                const ox = this.player.x, oy = this.player.y;
                this.physics.moveEntityWithCollision(this.player, dx, dy, this.dungeon);
                if (this.player.x === ox && this.player.y === oy) {
                    result = 'blocked';
                    this.setTurnFeedback('🧱 Blocked - pick another way');
                    this.audio.play('block');
                } else {
                    result = 'moved';
                }
            } else if (action === 'attack') {
                // Turn-based has no mouse aim: auto-face the nearest foe in reach first.
                const tgt = this.nearestEnemy(81);
                if (tgt) this.player.angle = Math.atan2(tgt.y - this.player.y, tgt.x - this.player.x);
                result = this.triggerMeleeSwing() > 0 ? 'attack-hit' : 'attack-miss';
                if (result === 'attack-miss') this.setTurnFeedback('💨 No foe in reach - step closer');
            }
            else if (action === 'block') this.activateBlock();
            else if (action === 'ability') {
                result = this.player.triggerAbility() ? 'ability-ok' : 'ability-fail';
                if (result === 'ability-fail') this.setTurnFeedback('🔋 Ability not ready - need resource');
            }
            else if (action === 'wait') {
                this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 25);
                result = 'wait';
            }
            this.enemies.forEach(enemy => enemy.update(0.35, this.player, this.physics, this.dungeon));
            this.vfx.update(0.35);
            if (action === 'block') this.player.perfectBlockWindow = 0;
            this.enemies = this.enemies.filter(e => {
                if (e.hp > 0) return true;
                const rewards = this.getScaledRewards(10, 5);
                this.gold += rewards.gold;
                this.runGold += rewards.gold;
                this.runKills++;
                this.player.gainXp(rewards.xp);
                if (this.currentMission) this.checkStoryObjectives(e);
                this.updateChallengeProgress('slay', 1);
                this.updateChallengeProgress('gold', rewards.gold);
                this.vfx.spawnBlood(e.x, e.y, e.bloodColor);
                this.vfx.spawnGore(e.x, e.y);
                this.vfx.spawnFloater(e.x, e.y - 30, '+' + rewards.gold + 'g', '#fbbf24');
                this.audio.play('hit');
                return false;
            });
            this.loot.forEach(l => {
                if (Math.hypot(this.player.x - l.x, this.player.y - l.y) < this.player.radius + l.radius + 42) {
                    const lootValue = Math.max(1, Math.round(l.value * this.getDifficultyProfile().loot));
                    this.gold += lootValue;
                    this.runGold += lootValue;
                    this.updateChallengeProgress('gold', lootValue);
                    if (l.type === 'item') {
                        this.player.gainXp(this.getScaledRewards(0, 30).xp);
                        if (this.currentMission) this.checkStoryObjectives(null, 'ore');
                    }
                    l.picked = true;
                    this.audio.play('loot');
                }
            });
            this.loot = this.loot.filter(l => !l.picked);
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace');
            if (safespace && Math.hypot(this.player.x - (safespace.cx * 48 + 24), this.player.y - (safespace.cy * 48 + 24)) < 40) {
                this.floorIndex++;
                this.buildDungeonLayer();
            }
            this.turnCount++;
            const counter = document.getElementById('hudTurnCounter');
            if (counter) counter.textContent = `Turn ${this.turnCount}`;
            this.updateHUD();
            return result;
        }

        advanceTurnState(dt) {
            const player = this.player;
            player.levelUpFlash = Math.max(0, player.levelUpFlash - dt);
            player.bloodlust = player.bloodlust.filter(time => Date.now() - time < 5000);
            if (!player.stoneForm) player.hp = Math.min(player.maxHp, player.hp + player.hpRegen * dt);
            player.stamina = Math.min(player.maxStamina, player.stamina + 15 * dt);
            if (player.race === Race.ELF) player.mana = Math.min(player.maxMana, player.mana + 2 * dt);
            if (player.race === Race.ORC) player.rage = Math.max(0, player.rage - 4 * dt);
            if (player.race === Race.HUMAN) {
                player.shieldCooldown = Math.max(0, player.shieldCooldown - dt);
                if (player.shieldCooldown === 0) player.shieldBubble = Math.min(20, player.shieldBubble + 2 * dt);
            }
            if (player.stoneForm) {
                player.stoneDuration -= dt;
                if (player.stoneDuration <= 0) player.stoneForm = false;
            }
            player.dodgeTime = Math.max(0, player.dodgeTime - dt);
            player.perfectBlockWindow = Math.max(0, player.perfectBlockWindow - dt);
            player.blockCooldown = Math.max(0, player.blockCooldown - dt);
        }

        // ==========================================
        // REVENUE & PHYSICS LOOP UPDATE
        // ==========================================
        update(dt) {
            if (!this.player) return;
            if (this.isDialogueActive) {
                return;
            }
            if (this.controlMode === 'turnbased') {
                const keys = this.input.keys;
                const joy = this.input.joystick;
                const canUseJoy = joy.active && Math.hypot(joy.x, joy.y) > 0.65 && Date.now() - this.lastTurnInputAt > 240;
                let joyAction = null;
                if (canUseJoy) joyAction = Math.abs(joy.y) > Math.abs(joy.x) ? (joy.y < 0 ? 'up' : 'down') : (joy.x < 0 ? 'left' : 'right');
                const action = keys['KeyW'] || keys['ArrowUp'] ? 'up' : keys['KeyS'] || keys['ArrowDown'] ? 'down' : keys['KeyA'] || keys['ArrowLeft'] ? 'left' : keys['KeyD'] || keys['ArrowRight'] ? 'right' : keys['Space'] ? 'wait' : this.input.mouse.click ? 'attack' : this.input.mouse.rightClick ? 'block' : keys['KeyF'] || keys['ShiftLeft'] ? 'ability' : joyAction;
                if (action) { ['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyF','ShiftLeft'].forEach(k => keys[k] = false); this.input.mouse.click = false; this.input.mouse.rightClick = false; this.lastTurnInputAt = Date.now(); this.executeTurnAction(action); }
                this.camera.update(dt, this.player.x, this.player.y, 0, 0, false, false);
                return;
            }
            let effectiveDt = dt * (this.controlMode === 'realtime' ? this.gameSpeed : 1);
            if (this.controlMode === 'chrono') {
                const keys = this.input.keys;
                const active = this.input.mouse.click || this.input.mouse.rightClick || this.input.joystick.active || ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyF','ShiftLeft'].some(k => keys[k]);
                this.chronoScale += ((active ? 1 : 0.04) - this.chronoScale) * 0.22;
                effectiveDt = dt * this.chronoScale;
                const badge = document.getElementById('chronoStatusBadge');
                if (badge) badge.textContent = this.chronoScale > 0.25 ? `TIME FLOWING ${Math.round(this.chronoScale * 100)}%` : 'TIME FROZEN';
            }
            const useShake = document.getElementById('settingsCameraShake').checked;
            const useLead = document.getElementById('settingsCameraLead').checked;
            const usePunch = document.getElementById('settingsCameraPunch').checked;

            // Update player
            this.player.update(effectiveDt, this.input.keys, this.input, this.physics, this.dungeon);

            // Update enemies
            this.enemies.forEach(e => e.update(effectiveDt, this.player, this.physics, this.dungeon));

            // Clean up dead skeletons
            this.enemies = this.enemies.filter(e => {
                if (e.hp <= 0) {
                    const rewards = this.getScaledRewards(10, 5);
                    this.gold += rewards.gold;
                    this.runGold += rewards.gold;
                    this.runKills++;
                    this.player.gainXp(rewards.xp);
                    if (this.currentMission) this.checkStoryObjectives(e);
                    this.updateChallengeProgress('slay', 1);
                    this.updateChallengeProgress('gold', rewards.gold);
                    this.vfx.spawnBlood(e.x, e.y, e.bloodColor);
                    this.vfx.spawnGore(e.x, e.y);
                    this.audio.play('hit');
                    this.player.bloodlust.push(Date.now());
                    return false;
                }
                return true;
            });

            // Update loot pickup
            this.loot.forEach(l => {
                l.update(effectiveDt, this.player, this.autoPickupRange);
                const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                if (dist < this.player.radius + l.radius) {
                    const lootValue = Math.max(1, Math.round(l.value * this.getDifficultyProfile().loot));
                    this.gold += lootValue;
                    this.runGold += lootValue;
                    this.updateChallengeProgress('gold', lootValue);
                    if (l.type === 'item') {
                        this.player.gainXp(this.getScaledRewards(0, 30).xp);
                        this.audio.speakFallback('Vocal log recovered.');
                        if (this.currentMission) this.checkStoryObjectives(null, 'ore');
                    }
                    l.picked = true;
                    this.audio.play('loot');
                    this.vfx.spawnSparks(l.x, l.y, l.type === 'item' ? 'purple' : 'gold', 6);
                }
            });
            this.loot = this.loot.filter(l => !l.picked);

            // Camera bounds
            this.camera.update(effectiveDt, this.player.x, this.player.y, this.player.vx, this.player.vy, useLead, usePunch);

            // Update VFX
            this.vfx.update(effectiveDt);

            // Check if player reaches stairs (End Zone/Stairs: safespace room center)
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace');
            if (safespace) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                if (Math.hypot(this.player.x - sx, this.player.y - sy) < 40) {
                    // Descend layer
                    this.floorIndex++;
                    this.buildDungeonLayer();
                }
            }

            // Player combat triggers
            if (this.input.mouse.click) {
                this.triggerMeleeSwing();
                this.input.mouse.click = false;
            }

            const usingMovementKey = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(key => this.input.keys[key]);
            if (this.input.keys['KeyF'] || (this.input.keys['ShiftLeft'] && !usingMovementKey)) {
                this.player.triggerAbility();
                this.input.keys['KeyF'] = false;
                this.input.keys['ShiftLeft'] = false;
            }

            if (this.input.mouse.rightClick) this.activateBlock();

            this.updateHUD();
        }

        triggerMeleeSwing() {
            // Melee Sweep sweep matches an arc of angle 120deg
            const angle = this.player.angle;
            const sweepRadius = 65;
            let hits = 0;

            // Attack swipe visual queue
            this.attackSweep = {
                x: this.player.x,
                y: this.player.y,
                radius: sweepRadius,
                angle: angle,
                life: 0.15 // fades over 150ms
            };

            this.enemies.forEach(e => {
                const dx = e.x - this.player.x;
                const dy = e.y - this.player.y;
                const dist = Math.hypot(dx, dy);

                if (dist <= sweepRadius) {
                    // Check angle sweep
                    const targetAngle = Math.atan2(dy, dx);
                    let diff = Math.abs(angle - targetAngle);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;

                    if (diff <= (Math.PI * 120) / 360) {
                        e.hp -= 8;
                        e.flash = 0.12;
                        hits++;
                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);
                        this.vfx.spawnFloater(e.x, e.y - 24, '-8', '#fecaca');
                        this.audio.play('hit');
                    }
                }
            });
            return hits;
        }

        activateBlock() {
            if (!this.player || this.player.blockCooldown > 0) return false;
            this.player.perfectBlockWindow = 0.22;
            this.player.blockCooldown = 0.45;
            this.audio.play('block');
            this.vfx.spawnPerfectBlockVFX(this.player.x, this.player.y);
            return true;
        }

        updateHUD() {
            if (!this.player) return;
            document.getElementById('hudHpBar').style.width = Math.max(0, (this.player.hp / this.player.maxHp) * 100) + '%';
            document.getElementById('hudHpText').textContent = Math.round(this.player.hp) + '/' + this.player.maxHp;

            document.getElementById('hudStaminaBar').style.width = (this.player.stamina / this.player.maxStamina) * 100 + '%';
            document.getElementById('hudStaminaText').textContent = Math.round(this.player.stamina) + '/' + this.player.maxStamina;

            // Set Resource bar by Race
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
            document.getElementById('hudFloorText').textContent = `L${this.floorIndex} · Lv${this.player.level}`;
            document.getElementById('hudXpText').textContent = `${Math.round(this.player.xp)} / ${this.player.nextLevelXp} XP`;
        }

        // ==========================================
        // 2D CANVAS VIEWPORT RENDER
        // ==========================================
        render() {
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;
            ctx.clearRect(0, 0, w, h);

            // Offsets
            const offset = this.camera.getOffsets();

            // RENDER TILES
            if (this.dungeon) {
                const size = 48;
                for (let x = 0; x < this.dungeon.gridSize; x++) {
                    for (let y = 0; y < this.dungeon.gridSize; y++) {
                        const tile = this.dungeon.grid[x][y];
                        const screenX = x * size - offset.x;
                        const screenY = y * size - offset.y;

                        // Cull if outside camera view
                        if (screenX < -size || screenX > w || screenY < -size || screenY > h) continue;

                        if (tile === 1) {
                            ctx.fillStyle = '#1e1b4b';
                            ctx.fillRect(screenX, screenY, size, size);
                            ctx.strokeStyle = '#312e81';
                            ctx.strokeRect(screenX, screenY, size, size);
                        } else if (tile === 2) {
                            ctx.fillStyle = '#1e40af'; // Water
                            ctx.fillRect(screenX, screenY, size, size);
                            ctx.fillStyle = '#93c5fd';
                            ctx.font = '20px serif';
                            ctx.fillText('〜', screenX + 14, screenY + 32);
                        } else if (tile === 3) {
                            ctx.fillStyle = 'rgba(16, 185, 129, 0.4)'; // Poison
                            ctx.fillRect(screenX, screenY, size, size);
                            ctx.fillStyle = '#6ee7b7';
                            ctx.font = '18px serif';
                            ctx.fillText('☠', screenX + 15, screenY + 31);
                        } else if (tile === 4) {
                            ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; // Fire
                            ctx.fillRect(screenX, screenY, size, size);
                            ctx.fillStyle = '#fca5a5';
                            ctx.font = '18px serif';
                            ctx.fillText('🔥', screenX + 13, screenY + 32);
                        } else if (tile === 5) {
                            ctx.fillStyle = 'rgba(125, 211, 252, 0.35)'; // Ice slick (previously invisible!)
                            ctx.fillRect(screenX, screenY, size, size);
                            ctx.fillStyle = '#e0f2fe';
                            ctx.font = '18px serif';
                            ctx.fillText('❄', screenX + 15, screenY + 31);
                        } else if (tile === 6) {
                            ctx.fillStyle = '#475569'; // Breakable Wall
                            ctx.fillRect(screenX, screenY, size, size);
                            ctx.fillStyle = '#f59e0b';
                            ctx.font = '16px serif';
                            ctx.fillText('⚡', screenX + 16, screenY + 30);
                        } else {
                            ctx.fillStyle = '#334155'; // Standard floor (Slate Blue)
                            ctx.fillRect(screenX, screenY, size, size);
                            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                            ctx.strokeRect(screenX, screenY, size, size);
                        }
                    }
                }
            }

            // Blood splats overlay
            this.vfx.bloodSplats.forEach(s => {
                ctx.fillStyle = s.color === 'purple' ? 'rgba(147, 51, 234, 0.4)' : (s.color === 'green' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)');
                ctx.beginPath();
                ctx.arc(s.x - offset.x, s.y - offset.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Attack Sweep trail render
            if (this.attackSweep) {
                const sweep = this.attackSweep;
                ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(sweep.x - offset.x, sweep.y - offset.y, sweep.radius, sweep.angle - Math.PI / 3, sweep.angle + Math.PI / 3);
                ctx.stroke();

                sweep.life -= 0.016; // tick life
                if (sweep.life <= 0) this.attackSweep = null;
            }

            // Exit stairs beacon: pulsing marker + offscreen edge arrow so players always know the goal
            const safe = this.dungeon && this.dungeon.rooms.find(r => r.type === 'safespace');
            if (safe) {
                const sx = safe.cx * 48 + 24 - offset.x;
                const sy = safe.cy * 48 + 24 - offset.y;
                const pulse = 3 + Math.sin(performance.now() / 300) * 2;
                ctx.save();
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2 + pulse * 0.4;
                ctx.beginPath();
                ctx.arc(sx, sy, 22 + pulse, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 15px Orbitron, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('▼ EXIT', sx, sy - 30);
                ctx.restore();
                if (sx < 0 || sx > w || sy < 0 || sy > h) {
                    const cx = Math.max(30, Math.min(w - 30, sx));
                    const cy = Math.max(50, Math.min(h - 30, sy));
                    const ang = Math.atan2(sy - h / 2, sx - w / 2);
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(ang);
                    ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
                    ctx.font = '18px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('➤', 0, 0);
                    ctx.restore();
                }
            }

            // Shockwave rings (abilities, blocks, explosions)
            this.vfx.rings.forEach(r => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
                ctx.strokeStyle = r.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(r.x - offset.x, r.y - offset.y, r.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });

            // Draw Loot items
            this.loot.forEach(l => {
                ctx.font = '18px Arial';
                ctx.fillText(l.getEmoji(), l.x - offset.x - 8, l.y - offset.y + 8);
            });

            // Draw player
            if (this.player && !this.player.isDead) {
                ctx.save();
                ctx.translate(this.player.x - offset.x, this.player.y - offset.y);
                ctx.rotate(this.player.angle);

                // Body rendering
                ctx.fillStyle = RaceData[this.player.race].color;
                ctx.font = '28px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(RaceData[this.player.race].emoji, 0, 0);

                ctx.restore();

                // Draw immunity bubble shield if active
                if (this.player.stoneForm) {
                    ctx.strokeStyle = 'gold';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(this.player.x - offset.x, this.player.y - offset.y, 25, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (this.player.shieldBubble > 0) {
                    ctx.strokeStyle = 'deepskyblue';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.player.x - offset.x, this.player.y - offset.y, 25, 0, Math.PI * 2);
                    ctx.stroke();
                }

                if (this.player.levelUpFlash > 0) {
                    ctx.save();
                    ctx.globalAlpha = Math.min(1, this.player.levelUpFlash * 1.5);
                    ctx.fillStyle = '#facc15';
                    ctx.font = 'bold 18px Orbitron, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`LEVEL ${this.player.level}!`, this.player.x - offset.x, this.player.y - offset.y - 40 - (1.5 - this.player.levelUpFlash) * 22);
                    ctx.restore();
                }
            }

            // Draw enemies
            this.enemies.forEach(e => {
                ctx.save();
                ctx.translate(e.x - offset.x, e.y - offset.y);
                ctx.rotate(e.angle);

                ctx.font = '26px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(e.emoji, 0, 0);

                ctx.restore();

                if (e.flash > 0) {
                    ctx.save();
                    ctx.globalAlpha = Math.min(1, e.flash * 6);
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(e.x - offset.x, e.y - offset.y, 18, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Draw health bar overlay
                if (e.hp < e.maxHp) {
                    ctx.fillStyle = 'black';
                    ctx.fillRect(e.x - offset.x - 15, e.y - offset.y - 25, 30, 4);
                    ctx.fillStyle = 'red';
                    ctx.fillRect(e.x - offset.x - 15, e.y - offset.y - 25, (e.hp / e.maxHp) * 30, 4);
                }
            });

            // Draw Sparks & Gore
            this.vfx.goreChunks.forEach(g => {
                ctx.fillStyle = 'maroon';
                ctx.fillRect(g.x - offset.x - 4, g.y - offset.y - 4, 8, 8);
            });

            this.vfx.sparks.forEach(s => {
                ctx.fillStyle = s.color;
                ctx.fillRect(s.x - offset.x - 2, s.y - offset.y - 2, 4, 4);
            });

            // Floating combat text (damage, gold, level-ups)
            this.vfx.floaters.forEach(f => {
                ctx.save();
                ctx.globalAlpha = Math.min(1, f.life);
                ctx.fillStyle = f.color;
                ctx.font = 'bold 15px Orbitron, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(f.text, f.x - offset.x, f.y - offset.y);
                ctx.restore();
            });

            // RENDER 2.5D LIGHTING PASS
            this.renderLightingOverlay();
        }

        renderLightingOverlay() {
            const ctx = this.lightCtx;
            const w = this.lightCanvas.width;
            const h = this.lightCanvas.height;
            ctx.clearRect(0, 0, w, h);

            // Ambient darkness
            ctx.fillStyle = 'rgba(5, 5, 15, 0.82)'; // dark environment
            ctx.fillRect(0, 0, w, h);

            // Point lights (Flashlight or points lights)
            if (this.player && !this.player.isDead) {
                const offset = this.camera.getOffsets();
                const px = this.player.x - offset.x;
                const py = this.player.y - offset.y;

                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';

                // Radial gradient around player (point light)
                const rad = ctx.createRadialGradient(px, py, 10, px, py, 130);
                rad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
                rad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
                ctx.fillStyle = rad;
                ctx.beginPath();
                ctx.arc(px, py, 130, 0, Math.PI * 2);
                ctx.fill();

                // Directional flashlight cone
                const angle = this.player.angle;
                const coneLength = 250;
                const coneAngle = Math.PI / 4; // 45 deg width

                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.arc(px, py, coneLength, angle - coneAngle, angle + coneAngle);
                ctx.closePath();
                const coneGrad = ctx.createRadialGradient(px, py, 10, px + Math.cos(angle) * coneLength, py + Math.sin(angle) * coneLength, coneLength);
                coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                coneGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
                ctx.fillStyle = coneGrad;
                ctx.fill();

                ctx.restore();
            }
        }

        renderLoreList() {
            const listEl = document.getElementById('loreList');
            if (!listEl) return;

            const allLore = window.GraveGainLore.getAll();
            listEl.innerHTML = Object.keys(allLore).map(key => {
                const item = allLore[key];
                return `<button class="class-btn" style="text-align: left; padding: 8px; font-size: 0.8rem; width: 100%;" onclick="window.GraveGainGame.viewLoreEntry('${item.id}')">${item.title}</button>`;
            }).join('');

            // Attach speech button listener once
            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn && !speakBtn.dataset.bound) {
                speakBtn.dataset.bound = "true";
                speakBtn.addEventListener('click', () => {
                    const currentId = speakBtn.dataset.currentId;
                    if (currentId) {
                        const item = window.GraveGainLore.get(currentId);
                        if (item) {
                            this.audio.speakFallback(item.content);
                        }
                    }
                });
            }
        }

        renderStoryMissionsList() {
            const grid = document.getElementById('storyMissionsGrid');
            const btnLaunch = document.getElementById('btnStartStoryMission');
            if (!grid || !window.GraveGainStoryMissions) return;

            const missions = window.GraveGainStoryMissions;
            grid.innerHTML = missions.map(m => {
                const unlocked = window.GraveGainStoryEngine.isUnlocked(m.id);
                const progress = window.GraveGainStoryEngine.getProgress();
                const stars = progress.stars[m.id] || 0;
                const isSelected = this.selectedStoryMissionId === m.id;

                const starStr = unlocked ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '🔒 Locked';
                return `
                    <button type="button" class="glass-panel story-card ${unlocked ? '' : 'disabled'} ${isSelected ? 'selected' : ''}"
                         style="padding: 12px; width: 100%; text-align: left; font-family: var(--grave-font); color: var(--grave-text); border: 1px solid ${isSelected ? 'var(--grave-gold)' : 'var(--grave-border)'}; border-radius: 8px; cursor: ${unlocked ? 'pointer' : 'not-allowed'}; opacity: ${unlocked ? 1 : 0.6}; background: ${isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.4)'};"
                         ${unlocked ? `onclick="window.GraveGainGame.selectStoryMission(${m.id})"` : 'disabled'}>
                        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--grave-gold);">${m.location}</div>
                        <h4 style="margin: 4px 0; font-family: 'Orbitron'; font-size: 0.95rem; color: white;">${m.title}</h4>
                        <p style="font-size: 0.78rem; color: var(--grave-text-muted); margin: 4px 0 8px 0;">${m.subtitle}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                            <span>${starStr}</span>
                            <span class="highlight-gold">+${m.rewardGold}g | +${m.rewardUusd}$</span>
                        </div>
                    </button>
                `;
            }).join('');

            if (btnLaunch) {
                btnLaunch.disabled = !this.selectedStoryMissionId;
            }
        }

        selectStoryMission(missionId) {
            if (!window.GraveGainStoryEngine.isUnlocked(missionId)) return;
            this.selectedStoryMissionId = missionId;
            this.renderStoryMissionsList();
        }

        playDialogueSequence(dialogueList, onComplete) {
            if (!dialogueList || dialogueList.length === 0) {
                if (onComplete) onComplete();
                return;
            }

            const dialogueScreen = document.getElementById('storyDialogueScreen');
            const portrait = document.getElementById('dialoguePortrait');
            const speaker = document.getElementById('dialogueSpeaker');
            const text = document.getElementById('dialogueText');
            const nextBtn = document.getElementById('btnNextDialogue');

            if (!dialogueScreen) {
                if (onComplete) onComplete();
                return;
            }

            this.isDialogueActive = true;
            dialogueScreen.classList.remove('hidden');
            let idx = 0;

            const showLine = () => {
                const item = dialogueList[idx];
                portrait.textContent = item.portrait || '🤖';
                speaker.textContent = item.speaker;
                text.textContent = item.text;
                this.audio.speakFallback(`${item.speaker} says: ${item.text}`);
            };

            const handleNext = () => {
                idx++;
                if (idx < dialogueList.length) {
                    showLine();
                } else {
                    nextBtn.removeEventListener('click', handleNext);
                    dialogueScreen.classList.add('hidden');
                    this.isDialogueActive = false;
                    if (onComplete) onComplete();
                }
            };

            nextBtn.onclick = handleNext;
            showLine();
        }

        checkStoryObjectives(enemyKilled, collectedItem = null) {
            if (!this.currentMission || !this.currentMission.objectives) return;
            let allComplete = true;

            this.currentMission.objectives.forEach(obj => {
                if (obj.current < obj.count) {
                    if (obj.id === 'collect_ore' && collectedItem === 'ore') {
                        obj.current++;
                    } else if (obj.id === 'slay_boss' && enemyKilled?.type === 'boss') {
                        obj.current++;
                    } else if (enemyKilled && (obj.id === 'slay_all' || obj.id === 'survive_waves' || obj.id === 'slay_minions')) {
                        obj.current++;
                    } else if (obj.id === 'slay_skulls' && enemyKilled?.type === 'exploding') {
                        obj.current++;
                    } else if (obj.id === 'slay_elites' && enemyKilled?.type === 'elite') {
                        obj.current++;
                    }
                }
                if (obj.current < obj.count) allComplete = false;
            });

            this.updateMissionUI();

            if (allComplete && !this.currentMission.completed) {
                this.currentMission.completed = true;
                this.gold += this.currentMission.rewardGold;
                this.uusd += this.currentMission.rewardUusd;

                window.GraveGainStoryEngine.completeMission(this.currentMission.id, 3);
                this.saveState();

                this.playDialogueSequence(this.currentMission.dialogueAfter, () => {
                    this.gameOver(true);
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

            const missionComplete = victory && this.currentMission?.completed;
            document.getElementById('gameOverTitle').textContent = missionComplete ? 'MISSION COMPLETE' : (victory ? 'RUN COMPLETED' : 'RUN TERMINATED');
            document.getElementById('gameOverSub').textContent = missionComplete
                ? `${this.currentMission.title} secured - campaign rewards transmitted.`
                : (victory ? 'Safespace terminal extracted' : 'Vitals flatlined');

            document.getElementById('goRaceClass').textContent = this.player.race.toUpperCase() + ' ' + this.player.classType.toUpperCase();
            document.getElementById('goFloor').textContent = 'Layer ' + this.floorIndex;
            document.getElementById('goKills').textContent = this.runKills;
            document.getElementById('goGold').textContent = this.runGold + (missionComplete ? this.currentMission.rewardGold : 0);
            document.getElementById('goXp').textContent = Math.round(this.player.xp || 0);

            this.audio.speakFallback(missionComplete ? 'Mission complete. Rewards secured.' : (victory ? 'Run completed. Safespace reached.' : 'Game over. Run terminated.'));
            this.saveState();
        }
    }

    // Initialize globally
    window.addEventListener('DOMContentLoaded', () => {
        window.GraveGainGame = new GraveGainGame();
    });
})();

// ===== DEVELOPER DEBUGGING API =====
window.gameDebug = {
    name: "Grave Gain 2D",
    getScore: () => window.GraveGainGame ? window.GraveGainGame.gold : 0,
    setScore: (g) => {
        if (!window.GraveGainGame) return;
        window.GraveGainGame.gold = Math.max(0, Number(g) || 0);
        if (window.GraveGainGame.player) window.GraveGainGame.player.gold = window.GraveGainGame.gold;
    },
    getHealth: () => window.GraveGainGame?.player ? window.GraveGainGame.player.hp : 0,
    setHealth: (h) => {
        if (!window.GraveGainGame?.player) return;
        window.GraveGainGame.player.hp = Math.max(0, Math.min(window.GraveGainGame.player.maxHp, Number(h) || 0));
    },
    win: () => {
        if (window.GraveGainGame) window.GraveGainGame.gameOver(true);
    },
    lose: () => {
        if (window.GraveGainGame) window.GraveGainGame.gameOver(false);
    },
    godMode: false,
    toggleGodMode: function() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
};
