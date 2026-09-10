(function() {
    'use strict';

    // =========================================================================
    // 1. DATA STRUCTURES, CONFIGURATIONS & ENUMS
    // =========================================================================
    const GameData = window.GraveGainGameData || {};
    const Race = GameData.Race;
    const ClassType = GameData.ClassType;
    const DifficultyData = GameData.DifficultyData;
    const RaceData = GameData.RaceData;
    const ClassData = GameData.ClassData;
    const QuartersUpgrades = GameData.QuartersUpgrades;
    const BotanySeeds = GameData.BotanySeeds;
    const ArmoryUpgrades = GameData.ArmoryUpgrades;
    const RoguelikePerks = GameData.RoguelikePerks;

    // Pointer lock is optional (and commonly unavailable inside embedded game
    // players). Never let a rejected lock request break the rest of the game.
    function requestPointerLockSafely(element) {
        if (!element?.requestPointerLock || document.body.classList.contains('touch-enabled')) return;
        try {
            const request = element.requestPointerLock();
            if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch (_) { /* Mouse-look simply remains unlocked. */ }
    }

    function exitPointerLockSafely() {
        if (!document.exitPointerLock || !document.pointerLockElement) return;
        try {
            const request = document.exitPointerLock();
            if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch (_) { /* Already unlocked or unsupported by the host. */ }
    }

    // =========================================================================
    // 2. PROCEDURAL CANVAS TEXTURE GENERATOR
    // =========================================================================
    const ProceduralTextures = window.GraveGainProceduralTextures;

    // =========================================================================
    // 3. PROCEDURAL WEB AUDIO SYNTHESIZER
    // =========================================================================
    const SoundEngine = window.GraveGainSoundEngine;

    // =========================================================================
    // 4. FLOATING COMBAT TEXT & NOTIFICATIONS
    // =========================================================================
    const CombatTextManager = window.GraveGainCombatTextManager;

    // =========================================================================
    // 5. INPUT MANAGER & FULL MOBILE CONTROLS
    // =========================================================================
    const InputManager = window.GraveGainInputManager;

    // =========================================================================
    // 6. 3D FIRST-PERSON WEAPON BUILDER
    // =========================================================================
    const WeaponFactory = window.GraveGainWeaponFactory;

    // =========================================================================
    // 7. PROJECTILES & ENVIRONMENT PROPS
    // =========================================================================
    const Projectile = window.GraveGainProjectile;
    const DungeonProp = window.GraveGainDungeonProp;

    // =========================================================================
    // 8. ENTITIES: PLAYER, ENEMIES, LOOT
    // =========================================================================
    const PlayerEntity = window.GraveGainPlayerEntity;
    const EnemyEntity = window.GraveGainEnemyEntity;
    const LootItem = window.GraveGainLootItem;

    const ParticleSystem = window.GraveGainParticleSystem;

    // =========================================================================
    // 11. DUNGEON GENERATOR
    // =========================================================================
    const DungeonGenerator = window.GraveGainDungeonGenerator;

    // =========================================================================
    // 12. PHYSICS CONTROLLER
    // =========================================================================
    const PhysicsController = window.GraveGainPhysicsController;

    // =========================================================================
    // 13. CAMERA CONTROLLER
    // =========================================================================
    const CameraController = window.GraveGainCameraController;

    // =========================================================================
    // 14. SAVE SYSTEM
    // =========================================================================
    const SaveSystem = window.GraveGainSaveSystem;

    // =========================================================================
    // 15. MAIN GRAVEGAIN3D GAME ENGINE
    // =========================================================================
    class GraveGainGame {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.container = document.getElementById('canvasContainer');

            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
            this.renderer.setSize(this.container.clientWidth || 1000, this.container.clientHeight || 600);
            this.performance = new window.GraveGainPerformanceManager(this.renderer);
            this.renderer.shadowMap.enabled = false;
            this.graphics = new window.GraveGainGraphicsBridge(
                document.getElementById('effectsCanvas'), this.container
            );

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x04030a);
            this.scene.fog = new THREE.FogExp2(0x04030a, 0.0035);

            this.camera3d = new THREE.PerspectiveCamera(68, (this.container.clientWidth || 1000) / (this.container.clientHeight || 600), 2, 900);

            // Enhanced 3D Atmospheric Lighting
            this.ambientLight = new THREE.AmbientLight(0x2d1f4d, 0.65);
            this.scene.add(this.ambientLight);

            // Player lantern with subtle warm dynamic aura
            this.playerLantern = new THREE.PointLight(0xffecd2, 2.4, 210, 1.2);
            this.scene.add(this.playerLantern);

            // Tactical flashlight with smooth penumbra & specular reach
            this.flashlight = new THREE.SpotLight(0xfff7e6, 4.2, 360, Math.PI / 5.5, 0.75, 1.1);
            this.scene.add(this.flashlight);
            this.flashlightTarget = new THREE.Object3D();
            this.scene.add(this.flashlightTarget);
            this.flashlight.target = this.flashlightTarget;

            this.scene.add(this.camera3d);

            // Subsystems
            this.input = new InputManager();
            this.audio = new SoundEngine();
            this.cameraController = new CameraController();
            this.generator = new DungeonGenerator();
            this.physics = new PhysicsController();
            this.vfx = new ParticleSystem(this.scene);
            this.combatText = new CombatTextManager(document.getElementById('combatTextContainer'), this.camera3d);
            this.hubController = window.GraveGainHubQuartersController ? new window.GraveGainHubQuartersController(this) : null;

            // Textures cache
            this.textures = {
                wall: ProceduralTextures.createStoneBrickTexture(),
                floor: ProceduralTextures.createFloorFlagstoneTexture(),
                ceiling: ProceduralTextures.createCeilingTexture()
            };

            // Persistent State
            this.gold = 0;
            this.uusd = 250;
            this.quartersLevel = 1;
            this.floorIndex = 1;
            this.difficulty = 'normal';
            this.kills = 0;
            this.armoryRanks = { health: 0, damage: 0, speed: 0, potions: 0, greed: 0 };

            this.botanyCrops = [
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 },
                { seedId: null, startTime: 0, growthTime: 0 }
            ];

            // In-run Entities
            this.player = null;
            this.weaponGroup = null;
            this.enemies = [];
            this.props = [];
            this.loot = [];
            this.projectiles = [];
            this.mapMeshes = [];
            this.torches = [];
            this.dungeon = null;
            this.activeBoss = null;

            // Combat timers & animations
            this.swingTime = 0;
            this.swingDuration = 0.26;
            this.swingCombo = 0;
            this.hitstop = 0;
            this.isPaused = false;
            this.lastFrameTime = performance.now();
            this.hordeTimer = 35.0;

            // Control Modes & Game Speed
            this.controlMode = 'realtime'; // 'realtime' | 'chrono' | 'turnbased'
            this.gameSpeed = 1.0;
            this.chronoScale = 1.0;
            this.turnCount = 1;
            this.isTurnProcessing = false;
            this.joyTurnDebounce = false;

            // Minimap setup
            this.minimapCanvas = document.getElementById('hudMinimap');
            this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

            this.setupUI();
            this.loadSave();
            this.setupWindowResize();
            this.startLoop();
        }

        setupWindowResize() {
            const onResize = () => {
                const w = this.container.clientWidth || 1000;
                const h = this.container.clientHeight || 600;
                this.camera3d.aspect = w / h;
                this.camera3d.updateProjectionMatrix();
                this.renderer.setSize(w, h);
                this.graphics.resize();
            };
            window.addEventListener('resize', onResize);
            document.addEventListener('fullscreenchange', onResize);
            document.addEventListener('visibilitychange', () => {
                this.graphics.setActive(!document.hidden);
            });
        }

        loadSave() {
            const data = SaveSystem.load();
            if (data) {
                this.gold = data.gold || 0;
                this.uusd = data.uusd !== undefined ? data.uusd : 250;
                this.quartersLevel = data.quartersLevel || 1;
                if (data.armoryRanks) this.armoryRanks = data.armoryRanks;
                if (data.botanyCrops) this.botanyCrops = data.botanyCrops;
                if (DifficultyData[data.difficulty]) this.difficulty = data.difficulty;
            }
            const difficultySelect = document.getElementById('settingsDifficulty');
            if (difficultySelect) difficultySelect.value = this.difficulty;
            this.updateHubQuartersUI();
            this.renderArmory();
        }

        saveSave() {
            SaveSystem.save(this);
        }

        startLoop() {
            const frame = (t) => {
                const frameMs = t - this.lastFrameTime;
                const dt = Math.min(frameMs / 1000, 0.1);
                this.lastFrameTime = t;
                this.performance.sample(frameMs);

                if (!this.isPaused) {
                    this.update(dt);
                    this.render();
                }

                requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        }

        initRun(race, classType) {
            this.player = new PlayerEntity(race, classType, this.armoryRanks);
            this.floorIndex = 1;
            this.kills = 0;
            this.turnCount = 1;
            this.isTurnProcessing = false;
            this.chronoScale = 1.0;
            this.setControlMode(this.controlMode || 'realtime');

            // Attach 3D First-Person Weapon
            if (this.weaponGroup) {
                this.camera3d.remove(this.weaponGroup);
            }
            this.weaponGroup = WeaponFactory.buildWeapon(classType);
            this.camera3d.add(this.weaponGroup);

            this.audio.startAmbientMusic();
            this.buildDungeonLayer();

            if (this.selectedStoryMissionId && window.GraveGainStoryMissions) {
                const mission = window.GraveGainStoryEngine.getMission(this.selectedStoryMissionId);
                if (mission) {
                    this.currentMission = JSON.parse(JSON.stringify(mission)); // Clone mission
                    this.combatText.showBanner(`STORY: ${mission.title}`);
                    this.playDialogueSequence(mission.dialogueBefore, () => {
                        this.audio.speak(`Mission Goal: ${mission.objectives[0].desc}`);
                    });
                }
            } else {
                this.currentMission = null;
                this.combatText.showBanner(`LAYER 1 - DEPLOYED`);
            }
            this.audio.playSfx('spell', 1.0);
        }

        clearDungeon() {
            this.mapMeshes.forEach(m => {
                this.scene.remove(m);
                if (m.geometry) m.geometry.dispose();
                if (m.material) {
                    if (Array.isArray(m.material)) m.material.forEach(mat => mat.dispose());
                    else m.material.dispose();
                }
            });
            this.mapMeshes = [];

            this.torches.forEach(t => {
                this.scene.remove(t.light);
                this.scene.remove(t.sprite);
            });
            this.torches = [];

            this.enemies.forEach(e => e.destroy());
            this.enemies = [];

            this.props.forEach(p => p.destroy());
            this.props = [];

            this.loot.forEach(l => l.destroy());
            this.loot = [];

            this.projectiles.forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
            this.projectiles = [];

            this.vfx.clear();
            this.activeBoss = null;

            const bossBar = document.getElementById('bossBarContainer');
            if (bossBar) bossBar.classList.add('hidden');
        }

        buildDungeonLayer() {
            this.clearDungeon();
            this.dungeon = this.generator.generate(this.floorIndex);

            // Spawn player in spawn room
            this.player.x = this.dungeon.spawnRoom.cx * 48 + 24;
            this.player.y = this.dungeon.spawnRoom.cy * 48 + 24;
            this.player.vx = 0;
            this.player.vy = 0;

            const wallGeo = new THREE.BoxGeometry(48, 72, 48);
            const wallMat = new THREE.MeshStandardMaterial({ map: this.textures.wall, roughness: 0.85 });

            const floorGeo = new THREE.PlaneGeometry(48, 48);
            const floorMat = new THREE.MeshStandardMaterial({ map: this.textures.floor, roughness: 0.9 });

            const ceilGeo = new THREE.PlaneGeometry(48, 48);
            const ceilMat = new THREE.MeshStandardMaterial({ map: this.textures.ceiling, roughness: 0.95 });

            const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.75, roughness: 0.1 });
            const poisonMat = new THREE.MeshStandardMaterial({ color: 0x15803d, transparent: true, opacity: 0.7, roughness: 0.2 });

            // Instanced tile layer: one draw call per material instead of one
            // Mesh per tile (a 70x70 grid created thousands of meshes before).
            // frustumCulled is off because a single instanced mesh spans the
            // whole dungeon and r128 cannot compute its bounds reliably.
            let wallCount = 0, openCount = 0, waterCount = 0, poisonCount = 0;
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    const tile = this.dungeon.grid[x][y];
                    if (tile === 1) wallCount++;
                    else {
                        openCount++;
                        if (tile === 2) waterCount++;
                        else if (tile === 3) poisonCount++;
                    }
                }
            }

            const wallInst = wallCount > 0 ? new THREE.InstancedMesh(wallGeo, wallMat, wallCount) : null;
            const floorInst = openCount > 0 ? new THREE.InstancedMesh(floorGeo, floorMat, openCount) : null;
            const ceilInst = openCount > 0 ? new THREE.InstancedMesh(ceilGeo, ceilMat, openCount) : null;
            const waterInst = waterCount > 0 ? new THREE.InstancedMesh(floorGeo, waterMat, waterCount) : null;
            const poisonInst = poisonCount > 0 ? new THREE.InstancedMesh(floorGeo, poisonMat, poisonCount) : null;
            [wallInst, floorInst, ceilInst, waterInst, poisonInst].forEach(inst => {
                if (inst) inst.frustumCulled = false;
            });

            const dummy = new THREE.Object3D();
            let wi = 0, oi = 0, wai = 0, poi = 0;
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    const tile = this.dungeon.grid[x][y];
                    const tx = x * 48 + 24;
                    const ty = y * 48 + 24;

                    if (tile === 1) {
                        dummy.position.set(tx, 36, ty);
                        dummy.rotation.set(0, 0, 0);
                        dummy.updateMatrix();
                        wallInst.setMatrixAt(wi++, dummy.matrix);
                    } else {
                        // Floor
                        dummy.position.set(tx, 0, ty);
                        dummy.rotation.set(-Math.PI / 2, 0, 0);
                        dummy.updateMatrix();
                        floorInst.setMatrixAt(oi, dummy.matrix);

                        // Ceiling
                        dummy.position.set(tx, 72, ty);
                        dummy.rotation.set(Math.PI / 2, 0, 0);
                        dummy.updateMatrix();
                        ceilInst.setMatrixAt(oi++, dummy.matrix);

                        if (tile === 2) {
                            dummy.position.set(tx, 0.4, ty);
                            dummy.rotation.set(-Math.PI / 2, 0, 0);
                            dummy.updateMatrix();
                            waterInst.setMatrixAt(wai++, dummy.matrix);
                        } else if (tile === 3) {
                            dummy.position.set(tx, 0.4, ty);
                            dummy.rotation.set(-Math.PI / 2, 0, 0);
                            dummy.updateMatrix();
                            poisonInst.setMatrixAt(poi++, dummy.matrix);
                        }
                    }
                }
            }
            [wallInst, floorInst, ceilInst, waterInst, poisonInst].forEach(inst => {
                if (!inst) return;
                inst.instanceMatrix.needsUpdate = true;
                this.scene.add(inst);
                this.mapMeshes.push(inst);
            });

            // Spawn Torches, Props & Enemies in rooms
            const diffScale = 1.0 + (this.floorIndex * 0.18);
            const difficulty = DifficultyData[this.difficulty] || DifficultyData.normal;

            this.dungeon.rooms.forEach((room) => {
                // Spawn torch on room wall
                const torchX = room.cx * 48 + 24;
                const torchZ = room.y * 48 + 4;
                const torchLight = new THREE.PointLight(0xff9922, 1.8, 120, 1.6);
                torchLight.position.set(torchX, 36, torchZ + 12);
                this.scene.add(torchLight);

                const torchSprite = ProceduralTextures.createTorchFlameSprite();
                torchSprite.position.set(torchX, 36, torchZ + 12);
                this.scene.add(torchSprite);

                this.torches.push({ light: torchLight, sprite: torchSprite, baseIntensity: 1.8, seed: Math.random() * 10 });

                if (room.type === 'spawn') return;

                if (room.type === 'boss') {
                    // Spawn Floor Boss: Ancient Bone Goliath
                    const boss = new EnemyEntity({
                        name: 'BONE GOLIATH',
                        hp: 450 + this.floorIndex * 150,
                        dmg: 35,
                        speed: 75,
                        scale: 2.5,
                        isBoss: true,
                        attackInterval: 1.4,
                        hpMultiplier: difficulty.hpMultiplier,
                        damageMultiplier: difficulty.damageMultiplier
                    }, room.cx * 48 + 24, room.cy * 48 + 24, diffScale);
                    this.scene.add(boss.group3d);
                    this.enemies.push(boss);
                    this.activeBoss = boss;

                    const bossBar = document.getElementById('bossBarContainer');
                    if (bossBar) bossBar.classList.remove('hidden');
                    document.getElementById('bossName').textContent = 'ANCIENT BONE GOLIATH';
                    this.audio.playSfx('boss_roar');
                    this.combatText.showBanner('⚠️ BOSS ENCOUNTER: BONE GOLIATH ⚠️');
                    return;
                }

                // Spawn props
                if (Math.random() < 0.6) {
                    const px = (room.x + 1) * 48 + 24;
                    const pz = (room.y + 1) * 48 + 24;
                    const prop = new DungeonProp(px, pz, 'crate');
                    this.scene.add(prop.group3d);
                    this.props.push(prop);
                }

                if (room.type === 'treasury') {
                    const cx = room.cx * 48 + 24;
                    const cz = room.cy * 48 + 24;
                    const chest = new DungeonProp(cx, cz, 'chest');
                    this.scene.add(chest.group3d);
                    this.props.push(chest);
                }

                // Spawn enemies
                const mobCount = room.type === 'graveyard' ? 4 : 2;
                for (let i = 0; i < mobCount; i++) {
                    const ex = (room.x + Math.floor(Math.random() * room.w)) * 48 + 24;
                    const ey = (room.y + Math.floor(Math.random() * room.h)) * 48 + 24;

                    const rand = Math.random();
                    let eData = { name: 'Goblin Skeleton', hp: 25, dmg: 8, speed: 120, scale: 0.8, type: 'skeleton' };
                    if (rand < 0.3) {
                        eData = { name: 'Flying Fire Skull', hp: 16, dmg: 28, speed: 155, scale: 0.9, type: 'skull' };
                    } else if (rand < 0.6) {
                        eData = { name: 'Armored Skeleton', hp: 65, dmg: 14, speed: 85, scale: 1.1, armored: true, type: 'skeleton' };
                    } else if (rand < 0.85) {
                        eData = { name: 'Skeleton Necromancer', hp: 45, dmg: 18, speed: 70, scale: 1.0, type: 'mage' };
                    }

                    eData.hpMultiplier = difficulty.hpMultiplier;
                    eData.damageMultiplier = difficulty.damageMultiplier;

                    const enemy = new EnemyEntity(eData, ex, ey, diffScale);
                    this.scene.add(enemy.group3d);
                    this.enemies.push(enemy);
                }
            });

            // Safespace exit portal
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                const portal = ProceduralTextures.createEmojiSprite('🌀', 128);
                portal.position.set(sx, 20, sy);
                this.scene.add(portal);
                this.mapMeshes.push(portal);
            }

            this.updateHUD();
        }

        spawnProjectile(x, y, z, vx, vy, vz, dmg, isPlayer, color, type) {
            const p = new Projectile(x, y, z, vx, vy, vz, dmg, isPlayer, color, type);
            this.scene.add(p.mesh);
            this.projectiles.push(p);
        }

        triggerMeleeAttack() {
            if (this.swingTime > 0 || !this.player) return;

            const cData = ClassData[this.player.classType];
            this.swingDuration = cData.attackSpeed;
            this.swingTime = this.swingDuration;
            this.swingCombo = (this.swingCombo + 1) % 3;

            this.cameraController.applyPunch(0.04, -0.02);

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);

            if (this.player.classType === ClassType.MAGE) {
                // Cast projectile
                this.audio.playSfx('spell');
                const speed = 400;
                this.spawnProjectile(
                    this.player.x,
                    this.player.yElevation + 18,
                    this.player.y,
                    forward.x * speed,
                    forward.y * speed,
                    forward.z * speed,
                    cData.baseDmg,
                    true,
                    0xa855f7,
                    'magic'
                );
            } else if (this.player.classType === ClassType.SUPPORT) {
                // Rapid bio-needle
                this.audio.playSfx('spell', 1.6);
                const speed = 480;
                this.spawnProjectile(
                    this.player.x,
                    this.player.yElevation + 18,
                    this.player.y,
                    forward.x * speed,
                    forward.y * speed,
                    forward.z * speed,
                    cData.baseDmg,
                    true,
                    0x22c55e,
                    'chem'
                );
            } else {
                // Melee slash or hammer slam
                this.audio.playSfx('swing');
                const sweepRange = cData.range;

                // Check enemies
                this.enemies.forEach(e => {
                    const dx = e.x - this.player.x;
                    const dy = e.y - this.player.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist <= sweepRange) {
                        const toEnemy = new THREE.Vector3(dx, 0, dy).normalize();
                        const dot = forward.x * toEnemy.x + forward.z * toEnemy.z;

                        if (dot > 0.45) { // 70-degree cone
                            this.applyHitToEnemy(e, cData.baseDmg, forward);
                        }
                    }
                });

                // Check breakable props
                this.props.forEach(prop => {
                    if (prop.broken) return;
                    const dist = Math.hypot(prop.x - this.player.x, prop.z - this.player.y);
                    if (dist <= sweepRange) {
                        this.breakProp(prop);
                    }
                });
            }
        }

        performMeleeAttack() {
            return this.triggerMeleeAttack();
        }

        applyHitToEnemy(enemy, baseDmg, dir) {
            let dmg = baseDmg;
            const dmgBonus = this.armoryRanks.damage ? (1.0 + this.armoryRanks.damage * 0.15) : 1.0;
            dmg *= dmgBonus;

            if (this.player.hasPerk('goldrush')) {
                dmg *= (1.0 + (this.gold / 20) * 0.01);
            }

            let isCrit = Math.random() < (ClassData[this.player.classType].critChance + (this.player.hasPerk('critfury') ? 0.20 : 0));
            if (isCrit) {
                dmg *= ClassData[this.player.classType].critMult;
            }

            enemy.hp -= dmg;
            enemy.kx = dir.x * 160;
            enemy.ky = dir.z * 160;

            // Trigger hitstop & audio
            this.hitstop = 0.04;
            this.vfx.spawnBlood(enemy.x, enemy.y, enemy.bloodColor);
            this.emitGraphicsBurst(enemy.x, enemy.y, isCrit ? '#fbbf24' : '#ef4444', isCrit ? 1.5 : 0.8);
            this.audio.playSfx(isCrit ? 'crit' : 'hit');

            // Crosshair hit indicator
            const crosshair = document.getElementById('hudCrosshair');
            if (crosshair) {
                crosshair.classList.add('hit');
                setTimeout(() => crosshair.classList.remove('hit'), 120);
            }

            this.combatText.spawnText(enemy.x, 20, enemy.y, `${isCrit ? 'CRIT! ' : ''}${Math.round(dmg)}`, isCrit ? 'crit' : 'damage');

            // Perks triggers
            if (this.player.hasPerk('vampiric')) {
                const leech = Math.max(1, dmg * 0.15);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + leech);
            }

            if (this.player.hasPerk('lightning')) {
                this.triggerChainLightning(enemy, 18);
            }

            if (this.player.hasPerk('executioner') && !enemy.isBoss && (enemy.hp / enemy.maxHp < 0.25)) {
                enemy.hp = 0;
                this.combatText.spawnText(enemy.x, 25, enemy.y, 'EXECUTED!', 'crit');
            }
        }

        triggerChainLightning(sourceEnemy, dmg) {
            let hits = 0;
            this.enemies.forEach(target => {
                if (target !== sourceEnemy && hits < 2) {
                    const dist = Math.hypot(target.x - sourceEnemy.x, target.y - sourceEnemy.y);
                    if (dist < 200) {
                        target.hp -= dmg;
                        this.vfx.spawnSparks(target.x, target.y, 0x38bdf8, 15);
                        this.combatText.spawnText(target.x, 20, target.y, `⚡${dmg}`, 'block');
                        hits++;
                    }
                }
            });
            if (hits > 0) this.audio.playSfx('spell', 1.8);
        }

        breakProp(prop) {
            prop.broken = true;
            this.scene.remove(prop.group3d);
            this.vfx.spawnSparks(prop.x, prop.z, 0xb45309, 20);
            this.audio.playSfx('hit', 1.2);

            if (prop.type === 'chest') {
                this.audio.playSfx('loot');
                for (let i = 0; i < 4; i++) {
                    const ox = prop.x + (Math.random() * 20 - 10);
                    const oz = prop.z + (Math.random() * 20 - 10);
                    const item = new LootItem(ox, oz, 'gold', 35);
                    this.scene.add(item.group3d);
                    this.loot.push(item);
                }
                if (Math.random() < 0.5) {
                    const pot = new LootItem(prop.x, prop.z, 'potion', 1);
                    this.scene.add(pot.group3d);
                    this.loot.push(pot);
                }
            } else {
                if (Math.random() < 0.5) {
                    const item = new LootItem(prop.x, prop.z, 'gold', 15);
                    this.scene.add(item.group3d);
                    this.loot.push(item);
                }
            }
        }

        dealAoEDamage(x, y, radius, dmg, type) {
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - x, e.y - y);
                if (dist <= radius) {
                    e.hp -= dmg;
                    e.kx = (e.x - x) * 1.5;
                    e.ky = (e.y - y) * 1.5;
                    this.combatText.spawnText(e.x, 20, e.y, `${Math.round(dmg)}`, 'crit');
                    this.vfx.spawnSparks(e.x, e.y, type === 'nature' ? 0x4cff7f : 0xff4c4c, 15);
                }
            });
        }

        usePotion() {
            if (!this.player || this.player.isDead) return;
            if (this.player.potions > 0 && this.player.hp < this.player.maxHp) {
                this.player.potions--;
                const healAmt = Math.round(this.player.maxHp * 0.5);
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
                this.audio.playSfx('potion');
                this.vfx.spawnSparks(this.player.x, this.player.y, 0x4ade80, 20);
                this.combatText.spawnText(this.player.x, 20, this.player.y, `+${healAmt} HP`, 'heal');
                this.updateHUD();
            }
        }

        triggerLevelUp() {
            this.isPaused = true;
            this.audio.playSfx('levelup');

            const screen = document.getElementById('levelUpScreen');
            const grid = document.getElementById('perkCardsGrid');
            if (!screen || !grid) return;

            // Pick 3 random distinct perks (guard: exhausted pool must not softlock)
            const pool = RoguelikePerks.filter(p => !this.player.hasPerk(p.id));
            if (pool.length === 0) {
                screen.classList.add('hidden');
                this.isPaused = false;
                return;
            }
            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 3);

            grid.innerHTML = selected.map(perk => `
                <div class="perk-card" data-perk="${perk.id}">
                    <span class="perk-rarity perk-rarity-${perk.rarity}">${perk.rarity}</span>
                    <span class="perk-icon">${perk.icon}</span>
                    <div class="perk-name">${perk.name}</div>
                    <div class="perk-desc">${perk.desc}</div>
                    <button class="btn-game btn-primary" style="font-size:0.8rem; padding:8px 16px; margin-top:auto;">Select Boon</button>
                </div>
            `).join('');

            const cards = grid.querySelectorAll('.perk-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const perkId = card.dataset.perk;
                    const chosen = RoguelikePerks.find(p => p.id === perkId);
                    if (chosen) {
                        this.player.perks.push(chosen);
                        this.combatText.showBanner(`BOON ACQUIRED: ${chosen.name}`);
                    }
                    screen.classList.add('hidden');
                    this.isPaused = false;
                    requestPointerLockSafely(this.container);
                });
            });

            screen.classList.remove('hidden');
            exitPointerLockSafely();
        }

        setControlMode(mode) {
            this.controlMode = mode;

            // Update Mode Buttons in HUD
            document.querySelectorAll('.btn-mode').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            // Update Mode Cards in Char Select
            document.querySelectorAll('.char-mode-card').forEach(card => {
                card.classList.toggle('selected', card.dataset.mode === mode);
            });

            // Update Mobile Mode Panel buttons
            document.querySelectorAll('.mmp-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            const speedGroup = document.getElementById('speedSelectorGroup');
            const turnGroup = document.getElementById('turnDisplayGroup');
            const chronoGroup = document.getElementById('chronoDisplayGroup');
            const mobileWait = document.getElementById('mobileWaitBtn');
            const controlsHint = document.getElementById('controlsHint');
            const mmpSpeeds = document.getElementById('mmpSpeeds');
            const mmhModeBadge = document.getElementById('mmhModeBadge');
            const mobileStatusBar = document.getElementById('mobileStatusBar');
            const mobileStatusText = document.getElementById('mobileStatusText');

            if (mode === 'realtime') {
                if (speedGroup) speedGroup.classList.remove('hidden');
                if (turnGroup) turnGroup.classList.add('hidden');
                if (chronoGroup) chronoGroup.classList.add('hidden');
                if (mobileWait) mobileWait.classList.add('hidden');
                if (mmpSpeeds) mmpSpeeds.style.display = 'flex';
                if (mmhModeBadge) mmhModeBadge.textContent = '⚡ RT';
                if (mobileStatusBar) mobileStatusBar.classList.add('hidden');
                if (controlsHint) controlsHint.textContent = 'Controls: WASD Move | Mouse Look | Left-Click Attack | Right-Click Block | F Ability | Space Jump | Q Potion';
            } else if (mode === 'chrono') {
                if (speedGroup) speedGroup.classList.add('hidden');
                if (turnGroup) turnGroup.classList.add('hidden');
                if (chronoGroup) chronoGroup.classList.remove('hidden');
                if (mobileWait) mobileWait.classList.add('hidden');
                if (mmpSpeeds) mmpSpeeds.style.display = 'none';
                if (mmhModeBadge) mmhModeBadge.textContent = '⏳ CHR';
                if (mobileStatusBar) {
                    mobileStatusBar.classList.remove('hidden');
                    if (mobileStatusText) mobileStatusText.textContent = 'TIME FROZEN';
                }
                if (controlsHint) controlsHint.textContent = 'Chrono-Lock: Time moves ONLY when you move, look, or attack! Freeze still to dodge.';
            } else if (mode === 'turnbased') {
                if (speedGroup) speedGroup.classList.add('hidden');
                if (turnGroup) turnGroup.classList.remove('hidden');
                if (chronoGroup) chronoGroup.classList.add('hidden');
                if (mobileWait) mobileWait.classList.remove('hidden');
                if (mmpSpeeds) mmpSpeeds.style.display = 'none';
                if (mmhModeBadge) mmhModeBadge.textContent = '🎲 TB';
                if (mobileStatusBar) {
                    mobileStatusBar.classList.remove('hidden');
                    if (mobileStatusText) mobileStatusText.textContent = 'YOUR TURN';
                }
                if (controlsHint) controlsHint.textContent = 'Turn-Based: WASD Step (1 tile) | Left-Click Attack | ⏳ Wait Turn (Space / Button) | Q Potion';
                this.turnCount = 1;
                const turnCounter = document.getElementById('hudTurnCounter');
                if (turnCounter) turnCounter.textContent = `Turn ${this.turnCount}`;
                const turnPhase = document.getElementById('hudTurnPhase');
                if (turnPhase) {
                    turnPhase.textContent = 'YOUR TURN';
                    turnPhase.className = 'turn-phase-badge player-phase';
                }
            }
        }

        setGameSpeed(speed) {
            this.gameSpeed = parseFloat(speed) || 1.0;
            document.querySelectorAll('.btn-speed').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.speed) === this.gameSpeed);
            });
        }

        executeTurnAction(action) {
            if (this.controlMode !== 'turnbased' || this.isTurnProcessing || !this.player || this.player.isDead) return;

            this.isTurnProcessing = true;
            const phaseBadge = document.getElementById('hudTurnPhase');
            if (phaseBadge) {
                phaseBadge.textContent = 'PLAYER ACTION';
                phaseBadge.className = 'turn-phase-badge player-phase';
            }

            // 1. Execute Player Action
            if (action === 'step_forward' || action === 'step_backward' || action === 'step_left' || action === 'step_right') {
                const stepDist = 48;
                let nx = 0, nz = 0;
                if (action === 'step_forward') nz = -1;
                else if (action === 'step_backward') nz = 1;
                else if (action === 'step_left') nx = -1;
                else if (action === 'step_right') nx = 1;

                const cosYaw = Math.cos(this.player.yaw);
                const sinYaw = Math.sin(this.player.yaw);
                const dx = (nx * cosYaw - nz * sinYaw) * stepDist;
                const dy = (nx * sinYaw + nz * cosYaw) * stepDist;

                this.physics.moveEntityWithCollision(this.player, dx, dy, this.dungeon);
                this.audio.playSfx('swing', 2.0);
            } else if (action === 'attack') {
                this.triggerMeleeAttack();
            } else if (action === 'ability') {
                this.player.triggerAbility();
            } else if (action === 'wait') {
                // Recover stamina & defensive posture
                this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 35);
                if (this.player.race === Race.HUMAN) {
                    this.player.shieldBubble = Math.min(25, this.player.shieldBubble + 8);
                }
                this.combatText.spawnText(this.player.x, 20, this.player.y, 'DEFENDING / WAITING', 'block');
                this.audio.playSfx('block', 0.9);
            } else if (action === 'potion') {
                this.usePotion();
            }

            // Check loot pickups
            const pickupRange = 55;
            this.loot.forEach(l => {
                const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                if (dist < this.player.radius + l.radius + pickupRange) {
                    if (l.type === 'potion') {
                        this.player.potions = Math.min(5, this.player.potions + 1);
                        this.audio.playSfx('potion');
                        this.combatText.spawnText(this.player.x, 20, this.player.y, '+1 POTION', 'heal');
                    } else {
                        this.gold += l.value;
                        this.audio.playSfx('loot');
                        this.combatText.spawnText(this.player.x, 20, this.player.y, `+${l.value} Gold`, 'crit');
                    }
                    l.picked = true;
                    l.destroy();
                }
            });
            this.loot = this.loot.filter(l => !l.picked);

            // Hazard checks on current tile
            const tx = Math.floor(this.player.x / 48);
            const ty = Math.floor(this.player.y / 48);
            if (this.dungeon && this.dungeon.grid && this.dungeon.grid[tx]) {
                const cell = this.dungeon.grid[tx][ty];
                if (cell === 3 && this.player.race !== Race.DWARF) {
                    this.player.takeDamage(12, 'poison');
                } else if (cell === 4) {
                    this.player.takeDamage(16, 'fire');
                }
            }

            // Portal Descent check
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace && (!this.activeBoss || this.activeBoss.hp <= 0)) {
                const sx = safespace.cx * 48 + 24;
                const sy = safespace.cy * 48 + 24;
                if (Math.hypot(this.player.x - sx, this.player.y - sy) < 45) {
                    this.floorIndex++;
                    this.buildDungeonLayer();
                    this.combatText.showBanner(`DESCENDED TO LAYER ${this.floorIndex}`);
                    this.audio.playSfx('spell', 1.3);
                    this.isTurnProcessing = false;
                    return;
                }
            }

            // 2. Enemy Phase
            if (phaseBadge) {
                phaseBadge.textContent = 'ENEMY TURN';
                phaseBadge.className = 'turn-phase-badge enemy-phase';
            }
            const mobileStatusText2 = document.getElementById('mobileStatusText');
            if (mobileStatusText2) mobileStatusText2.textContent = 'ENEMY TURN ⚔️';

            setTimeout(() => {
                if (!this.player || this.player.isDead) {
                    this.isTurnProcessing = false;
                    return;
                }

                // Advance projectiles: one turn equals 0.35s of realtime
                // flight, stepped through the same update() the realtime
                // loop uses so gravity, wall collision, and lifetime expiry
                // behave identically in both modes.
                this.projectiles.forEach(p => {
                    p.update(0.35, this.dungeon);
                    if (p.isPlayer) {
                        this.enemies.forEach(e => {
                            const dist = Math.hypot(e.x - p.x, e.y - p.z);
                            if (dist < e.radius + p.radius) {
                                p.dead = true;
                                this.applyHitToEnemy(e, p.dmg, new THREE.Vector3(p.vx, 0, p.vz).normalize());
                            }
                        });
                    } else {
                        const dist = Math.hypot(this.player.x - p.x, this.player.y - p.z);
                        if (dist < this.player.radius + p.radius) {
                            p.dead = true;
                            this.player.takeDamage(p.dmg);
                        }
                    }
                });
                this.projectiles.filter(p => p.dead).forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
                this.projectiles = this.projectiles.filter(p => !p.dead);

                // Enemies take turn
                this.enemies.forEach(e => {
                    if (e.hp <= 0) return;
                    const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);

                    if (dist < 450 && e.state === 'idle') {
                        e.state = 'chase';
                    }

                    if (e.state === 'chase') {
                        e.angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);

                        if (dist < e.radius + this.player.radius + 18) {
                            // In melee range -> attack player
                            this.player.takeDamage(e.dmg);
                            this.audio.playSfx('hit', 0.9);
                            this.combatText.spawnText(this.player.x, 20, this.player.y, `-${Math.round(e.dmg)}`, 'damage');
                            if (e.type === 'skull') {
                                this.vfx.spawnSparks(e.x, e.y, 0xff4422, 25);
                                this.audio.playSfx('explode');
                                e.hp = 0;
                            }
                        } else if (e.type === 'mage' && dist < 320 && Math.random() < 0.65) {
                            // Spell projectile
                            const forwardX = Math.cos(e.angle);
                            const forwardY = Math.sin(e.angle);
                            this.spawnProjectile(e.x, 18, e.y, forwardX * 220, 0, forwardY * 220, e.dmg, false, 0x9333ea, 'magic');
                            this.audio.playSfx('spell', 0.8);
                        } else {
                            // Step toward player
                            const stepSize = Math.min(38, dist - (e.radius + this.player.radius));
                            if (stepSize > 0) {
                                const evx = Math.cos(e.angle) * stepSize;
                                const evy = Math.sin(e.angle) * stepSize;
                                this.physics.moveEntityWithCollision(e, evx, evy, this.dungeon);
                            }
                        }
                        e.group3d.position.set(e.x, 0, e.y);
                        e.group3d.rotation.y = -e.angle + Math.PI / 2;
                    }
                });

                // Clean dead enemies & drop loot
                this.enemies.forEach(e => {
                    if (e.hp <= 0) {
                        const greedMult = this.armoryRanks.greed ? (1.0 + this.armoryRanks.greed * 0.25) : 1.0;
                        const difficulty = DifficultyData[this.difficulty] || DifficultyData.normal;
                        const goldGain = Math.round((e.isBoss ? 150 : 15) * greedMult * difficulty.lootMultiplier);
                        const xpGain = Math.round((e.isBoss ? 120 : 25) * difficulty.xpMultiplier);

                        this.gold += goldGain;
                        this.kills++;
                        this.player.addXp(xpGain);
                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);

                        // Check Story Mission objectives
                        if (this.currentMission) {
                            this.checkStoryObjectives(e);
                        }

                        const loot = new LootItem(e.x, e.y, (Math.random() < 0.25 ? 'potion' : 'gold'), goldGain);
                        this.scene.add(loot.group3d);
                        this.loot.push(loot);

                        if (e.isBoss) {
                            this.activeBoss = null;
                            this.audio.playSfx('levelup');
                            this.combatText.showBanner('🏆 BOSS DEFEATED! 🏆');
                            const bossBar = document.getElementById('bossBarContainer');
                            if (bossBar) bossBar.classList.add('hidden');
                        }
                        e.destroy();
                    }
                });
                this.enemies = this.enemies.filter(e => e.hp > 0);

                // End of turn
                this.turnCount++;
                const turnCounter = document.getElementById('hudTurnCounter');
                if (turnCounter) turnCounter.textContent = `Turn ${this.turnCount}`;
                if (phaseBadge) {
                    phaseBadge.textContent = 'YOUR TURN';
                    phaseBadge.className = 'turn-phase-badge player-phase';
                }
                const mobileStatusTextEnd = document.getElementById('mobileStatusText');
                if (mobileStatusTextEnd) mobileStatusTextEnd.textContent = `YOUR TURN (T${this.turnCount})`;
                this.isTurnProcessing = false;
                this.updateHUD();
                this.drawMinimap();
            }, 130);
        }

        update(dt) {
            if (!this.player) return;
            if (this.hitstop > 0) {
                this.hitstop -= dt;
                return;
            }

            const isShake = document.getElementById('settingsCameraShake').checked;

            // 1. Determine effectiveDt based on controlMode
            let effectiveDt = dt;
            if (this.controlMode === 'realtime') {
                effectiveDt = dt * this.gameSpeed;
            } else if (this.controlMode === 'chrono') {
                // Chrono-Lock (SUPERHOT style): Time moves ONLY when you move, look, or attack
                const isMovingKeys = !!(this.input.keys['KeyW'] || this.input.keys['KeyS'] || 
                                        this.input.keys['KeyA'] || this.input.keys['KeyD'] ||
                                        this.input.keys['ArrowUp'] || this.input.keys['ArrowDown'] ||
                                        this.input.keys['ArrowLeft'] || this.input.keys['ArrowRight'] ||
                                        this.input.keys['Space']);
                const isJoyMoving = this.input.joystick.active && Math.hypot(this.input.joystick.x, this.input.joystick.y) > 0.08;
                const isLooking = (this.input.lastLookDelta || 0) > 0.8;
                const isAttacking = this.swingTime > 0 || this.input.mouse.click || this.input.mouse.isBlocking;
                const isAbilOrPot = !!(this.input.keys['KeyF'] || this.input.keys['KeyQ']);

                const hasActivity = isMovingKeys || isJoyMoving || isLooking || isAttacking || isAbilOrPot;
                const targetScale = hasActivity ? 1.0 : 0.035;
                this.chronoScale = THREE.MathUtils.lerp(this.chronoScale, targetScale, 0.22);
                effectiveDt = dt * this.chronoScale;

                if (this.input.lastLookDelta) {
                    this.input.lastLookDelta *= 0.65;
                }

                const badge = document.getElementById('chronoStatusBadge');
                const mobileSt = document.getElementById('mobileStatusText');
                if (badge) {
                    if (this.chronoScale > 0.25) {
                        badge.textContent = `TIME FLOWING (${Math.round(this.chronoScale * 100)}%)`;
                        badge.className = 'chrono-badge flowing';
                        if (mobileSt) mobileSt.textContent = `⏩ ${Math.round(this.chronoScale * 100)}%`;
                    } else {
                        badge.textContent = 'TIME FROZEN';
                        badge.className = 'chrono-badge frozen';
                        if (mobileSt) mobileSt.textContent = '❄️ FROZEN';
                    }
                }
            } else if (this.controlMode === 'turnbased') {
                // Turn-based mode: continuous physics paused, discrete actions drive turns
                effectiveDt = 0;

                if (!this.isTurnProcessing) {
                    if (this.input.keys['KeyW'] || this.input.keys['ArrowUp']) {
                        this.input.keys['KeyW'] = false;
                        this.input.keys['ArrowUp'] = false;
                        this.executeTurnAction('step_forward');
                    } else if (this.input.keys['KeyS'] || this.input.keys['ArrowDown']) {
                        this.input.keys['KeyS'] = false;
                        this.input.keys['ArrowDown'] = false;
                        this.executeTurnAction('step_backward');
                    } else if (this.input.keys['KeyA'] || this.input.keys['ArrowLeft']) {
                        this.input.keys['KeyA'] = false;
                        this.input.keys['ArrowLeft'] = false;
                        this.executeTurnAction('step_left');
                    } else if (this.input.keys['KeyD'] || this.input.keys['ArrowRight']) {
                        this.input.keys['KeyD'] = false;
                        this.input.keys['ArrowRight'] = false;
                        this.executeTurnAction('step_right');
                    } else if (this.input.keys['Space']) {
                        this.input.keys['Space'] = false;
                        this.executeTurnAction('wait');
                    } else if (this.input.mouse.click) {
                        this.input.mouse.click = false;
                        this.executeTurnAction('attack');
                    } else if (this.input.keys['KeyF']) {
                        this.input.keys['KeyF'] = false;
                        this.executeTurnAction('ability');
                    } else if (this.input.joystick.active && Math.hypot(this.input.joystick.x, this.input.joystick.y) > 0.6) {
                        if (!this.joyTurnDebounce) {
                            this.joyTurnDebounce = true;
                            const jx = this.input.joystick.x;
                            const jy = this.input.joystick.y;
                            if (Math.abs(jy) > Math.abs(jx)) {
                                this.executeTurnAction(jy < 0 ? 'step_forward' : 'step_backward');
                            } else {
                                this.executeTurnAction(jx < 0 ? 'step_left' : 'step_right');
                            }
                            setTimeout(() => { this.joyTurnDebounce = false; }, 260);
                        }
                    }
                }
            }

            // 2. Realtime/Chrono updates
            if (this.controlMode !== 'turnbased') {
                this.player.isBlocking = this.input.mouse.isBlocking;

                // Handle primary attack
                if (this.input.mouse.click) {
                    this.triggerMeleeAttack();
                    this.input.mouse.click = false;
                }

                // Handle ability
                if (this.input.keys['KeyF']) {
                    this.player.triggerAbility();
                    this.input.keys['KeyF'] = false;
                }

                this.player.update(effectiveDt, this.input, this.physics, this.dungeon);

                // Update enemies
                this.enemies.forEach(e => e.update(effectiveDt, this.player, this.physics, this.dungeon, this));

                // Clean dead enemies & drop loot
                this.enemies.forEach(e => {
                    if (e.hp <= 0) {
                        const greedMult = this.armoryRanks.greed ? (1.0 + this.armoryRanks.greed * 0.25) : 1.0;
                        const difficulty = DifficultyData[this.difficulty] || DifficultyData.normal;
                        const goldGain = Math.round((e.isBoss ? 150 : 15) * greedMult * difficulty.lootMultiplier);
                        const xpGain = Math.round((e.isBoss ? 120 : 25) * difficulty.xpMultiplier);

                        this.gold += goldGain;
                        this.kills++;
                        this.player.addXp(xpGain);
                        this.vfx.spawnBlood(e.x, e.y, e.bloodColor);

                        // Drop loot
                        const loot = new LootItem(e.x, e.y, (Math.random() < 0.25 ? 'potion' : 'gold'), goldGain);
                        this.scene.add(loot.group3d);
                        this.loot.push(loot);

                        if (e.isBoss) {
                            this.activeBoss = null;
                            this.audio.playSfx('levelup');
                            this.combatText.showBanner('🏆 BOSS DEFEATED! 🏆');
                            const bossBar = document.getElementById('bossBarContainer');
                            if (bossBar) bossBar.classList.add('hidden');
                        }

                        e.destroy();
                    }
                });
                this.enemies = this.enemies.filter(e => e.hp > 0);

                // Update Boss health bar
                if (this.activeBoss) {
                    const percent = Math.max(0, (this.activeBoss.hp / this.activeBoss.maxHp) * 100);
                    document.getElementById('bossHpBar').style.width = `${percent}%`;
                    document.getElementById('bossHpText').textContent = `${Math.round(this.activeBoss.hp)} / ${Math.round(this.activeBoss.maxHp)}`;
                }

                // Update Projectiles
                this.projectiles.forEach(p => {
                    p.update(effectiveDt, this.dungeon);
                    if (p.isPlayer) {
                        this.enemies.forEach(e => {
                            const dist = Math.hypot(e.x - p.x, e.y - p.z);
                            if (dist < e.radius + p.radius) {
                                p.dead = true;
                                this.applyHitToEnemy(e, p.dmg, new THREE.Vector3(p.vx, 0, p.vz).normalize());
                            }
                        });
                    } else {
                        const dist = Math.hypot(this.player.x - p.x, this.player.y - p.z);
                        if (dist < this.player.radius + p.radius) {
                            p.dead = true;
                            this.player.takeDamage(p.dmg);
                        }
                    }
                });
                this.projectiles.filter(p => p.dead).forEach(p => { this.scene.remove(p.mesh); p.dispose(); });
                this.projectiles = this.projectiles.filter(p => !p.dead);

                // Update Loot Pickups
                const pickupRange = parseFloat(document.getElementById('settingsPickupRange').value) * 24 || 120;
                this.loot.forEach(l => {
                    l.update(effectiveDt, this.player, pickupRange);
                    const dist = Math.hypot(this.player.x - l.x, this.player.y - l.y);
                    if (dist < this.player.radius + l.radius) {
                        if (l.type === 'potion') {
                            this.player.potions = Math.min(5, this.player.potions + 1);
                            this.audio.playSfx('potion');
                            this.combatText.spawnText(this.player.x, 20, this.player.y, '+1 POTION', 'heal');
                        } else {
                            this.gold += l.value;
                            this.audio.playSfx('loot');
                            this.combatText.spawnText(this.player.x, 20, this.player.y, `+${l.value} Gold`, 'crit');
                        }
                        l.picked = true;
                        l.destroy();
                    }
                });
                this.loot = this.loot.filter(l => !l.picked);

                // Portal Descent check
                const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
                if (safespace && (!this.activeBoss || this.activeBoss.hp <= 0)) {
                    const sx = safespace.cx * 48 + 24;
                    const sy = safespace.cy * 48 + 24;
                    if (Math.hypot(this.player.x - sx, this.player.y - sy) < 45) {
                        this.floorIndex++;
                        this.buildDungeonLayer();
                        this.combatText.showBanner(`DESCENDED TO LAYER ${this.floorIndex}`);
                        this.audio.playSfx('spell', 1.3);
                    }
                }
            }

            // Update weapon viewmodel animation
            if (this.weaponGroup) {
                const animDt = effectiveDt > 0 ? effectiveDt : dt * 1.5;
                if (this.swingTime > 0) {
                    this.swingTime -= animDt;
                    const progress = (this.swingDuration - this.swingTime) / this.swingDuration;
                    const arc = Math.sin(progress * Math.PI);

                    if (this.weaponGroup.mainHand) {
                        this.weaponGroup.mainHand.position.x = 2.8 - arc * 4.5;
                        this.weaponGroup.mainHand.position.y = -2.8 + arc * 1.8;
                        this.weaponGroup.mainHand.rotation.z = -Math.PI / 7 - arc * 1.5;
                    }
                } else {
                    // Idle bobbing
                    const idleBob = Math.sin(Date.now() * 0.003) * 0.15;
                    if (this.weaponGroup.mainHand) {
                        this.weaponGroup.mainHand.position.y = -2.8 + idleBob;
                    }
                    if (this.weaponGroup.offHand) {
                        // Raised in block position if blocking
                        if (this.player.isBlocking) {
                            this.weaponGroup.offHand.position.set(-1.0, -1.8, -4.5);
                            this.weaponGroup.offHand.rotation.set(0, 0, 0);
                        } else {
                            this.weaponGroup.offHand.position.set(-3.2, -3.2, -6.0);
                            this.weaponGroup.offHand.rotation.set(0, Math.PI / 6, 0);
                        }
                    }
                }
            }

            // Torches gentle flicker
            const dynamicLights = document.getElementById('settingsDynamicLights').checked;
            this.torches.forEach(t => {
                const f = Math.sin(Date.now() * 0.008 + t.seed);
                t.light.intensity = dynamicLights ? t.baseIntensity + f * 0.4 : t.baseIntensity;
            });

            // Camera orientation & follow
            this.cameraController.update(dt);
            this.camera3d.rotation.order = 'YXZ';
            this.camera3d.rotation.y = this.player.yaw + this.cameraController.punchX;
            this.camera3d.rotation.x = this.player.pitch + this.cameraController.punchY;

            let shakeOffset = new THREE.Vector3(0, 0, 0);
            if (isShake && this.cameraController.shake > 0) {
                const s = this.cameraController.shake * 0.15;
                shakeOffset.set((Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s);
            }

            this.camera3d.position.set(this.player.x, this.player.yElevation + 20, this.player.y).add(shakeOffset);

            // Synchronize player lantern and flashlight
            this.playerLantern.position.copy(this.camera3d.position);
            this.flashlight.position.copy(this.camera3d.position);

            const forward = new THREE.Vector3();
            this.camera3d.getWorldDirection(forward);
            this.flashlightTarget.position.copy(this.camera3d.position).add(forward.multiplyScalar(100));

            this.vfx.update(effectiveDt > 0 ? effectiveDt : dt * 0.1);
            this.updateHUD();
            this.drawMinimap();
        }

        drawMinimap() {
            if (!this.minimapCtx || !this.dungeon || !this.player) return;
            const ctx = this.minimapCtx;
            const w = this.minimapCanvas.width;
            const h = this.minimapCanvas.height;

            ctx.clearRect(0, 0, w, h);

            // Centered on player
            const scale = 0.45;
            const cx = w / 2;
            const cy = h / 2;

            ctx.save();
            ctx.translate(cx, cy);

            // Draw rooms & corridors
            ctx.fillStyle = '#1e293b';
            for (let x = 0; x < this.dungeon.gridSize; x++) {
                for (let y = 0; y < this.dungeon.gridSize; y++) {
                    if (this.dungeon.grid[x][y] !== 1) {
                        const mx = (x * 48 + 24 - this.player.x) * scale;
                        const my = (y * 48 + 24 - this.player.y) * scale;
                        ctx.fillRect(mx - 4, my - 4, 8, 8);
                    }
                }
            }

            // Draw portal
            const safespace = this.dungeon.rooms.find(r => r.type === 'safespace' || r.type === 'boss');
            if (safespace) {
                const sx = (safespace.cx * 48 + 24 - this.player.x) * scale;
                const sy = (safespace.cy * 48 + 24 - this.player.y) * scale;
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(sx, sy, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw enemies
            ctx.fillStyle = '#ef4444';
            this.enemies.forEach(e => {
                const ex = (e.x - this.player.x) * scale;
                const ey = (e.y - this.player.y) * scale;
                ctx.beginPath();
                ctx.arc(ex, ey, e.isBoss ? 6 : 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw player arrow in center
            ctx.restore();
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-this.player.yaw + Math.PI / 2);

            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(5, 5);
            ctx.lineTo(0, 2);
            ctx.lineTo(-5, 5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        updateHUD() {
            if (!this.player) return;

            document.getElementById('hudHpBar').style.width = `${Math.max(0, (this.player.hp / this.player.maxHp) * 100)}%`;
            document.getElementById('hudHpText').textContent = `${Math.round(this.player.hp)}/${this.player.maxHp}`;

            document.getElementById('hudStaminaBar').style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
            document.getElementById('hudStaminaText').textContent = `${Math.round(this.player.stamina)}/${this.player.maxStamina}`;

            document.getElementById('hudXpBar').style.width = `${Math.min(100, (this.player.xp / this.player.xpNext) * 100)}%`;
            document.getElementById('hudXpText').textContent = `${this.player.xp}/${this.player.xpNext}`;
            document.getElementById('hudLevelBadge').textContent = `LV ${this.player.level}`;

            document.getElementById('hudPotionCount').textContent = this.player.potions;
            const mobPot = document.getElementById('mobilePotionCount');
            if (mobPot) mobPot.textContent = this.player.potions;

            const resBar = document.getElementById('hudResourceBar');
            const resLabel = document.getElementById('hudResourceLabel');
            const resText = document.getElementById('hudResourceText');

            if (this.player.race === Race.ELF) {
                resLabel.textContent = '🔮 Mana';
                resBar.style.width = `${(this.player.mana / this.player.maxMana) * 100}%`;
                resText.textContent = `${Math.round(this.player.mana)}/100`;
            } else if (this.player.race === Race.ORC) {
                resLabel.textContent = '🔥 Rage';
                resBar.style.width = `${this.player.rage}%`;
                resText.textContent = `${Math.round(this.player.rage)}/100`;
            } else if (this.player.race === Race.HUMAN) {
                resLabel.textContent = '🛡️ Shield';
                resBar.style.width = `${(this.player.shieldBubble / 25) * 100}%`;
                resText.textContent = `${Math.round(this.player.shieldBubble)}/25`;
            } else {
                resLabel.textContent = '💎 Stone';
                resBar.style.width = this.player.stoneForm ? '100%' : '0%';
                resText.textContent = this.player.stoneForm ? 'IMMUNE' : 'READY';
            }

            document.getElementById('hudGoldText').textContent = this.gold;
            document.getElementById('hudUusdText').textContent = this.uusd;
            document.getElementById('hudFloorText').textContent = `Layer ${this.floorIndex}`;

            // === Mobile Mini-HUD Updates ===
            const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
            const staPct = (this.player.stamina / this.player.maxStamina) * 100;
            const mmhHp = document.getElementById('mmhHpBar');
            const mmhSta = document.getElementById('mmhStaBar');
            const mmhHpTxt = document.getElementById('mmhHpText');
            const mmhStaTxt = document.getElementById('mmhStaText');
            const mmhGold = document.getElementById('mmhGold');
            const mmhFloor = document.getElementById('mmhFloor');

            if (mmhHp) mmhHp.style.width = `${hpPct}%`;
            if (mmhSta) mmhSta.style.width = `${staPct}%`;
            if (mmhHpTxt) mmhHpTxt.textContent = Math.round(this.player.hp);
            if (mmhStaTxt) mmhStaTxt.textContent = Math.round(this.player.stamina);
            if (mmhGold) mmhGold.textContent = this.gold;
            if (mmhFloor) mmhFloor.textContent = `L${this.floorIndex}`;
        }

        render() {
            this.renderer.render(this.scene, this.camera3d);
        }

        emitGraphicsBurst(worldX, worldZ, color = '#ffcc4c', strength = 1) {
            if (!this.graphics.enabled) return;
            const point = new THREE.Vector3(worldX, 16, worldZ).project(this.camera3d);
            if (point.z < -1 || point.z > 1) return;
            const rect = this.container.getBoundingClientRect();
            this.graphics.burst(
                (point.x * 0.5 + 0.5) * rect.width,
                (-point.y * 0.5 + 0.5) * rect.height,
                color,
                strength
            );
        }

        togglePause() {
            if (this.isPaused) {
                document.getElementById('pauseScreen').classList.add('hidden');
                this.container.classList.remove('paused');
                this.isPaused = false;
                // Only request pointer lock on desktop (not touch devices)
                if (!document.body.classList.contains('touch-enabled')) {
                    requestPointerLockSafely(this.container);
                }
            } else {
                this.isPaused = true;
                this.container.classList.add('paused');
                document.getElementById('pauseScreen').classList.remove('hidden');
                exitPointerLockSafely();
            }
        }

        gameOver(victory = false) {
            this.isPaused = true;
            document.getElementById('gameMain').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.remove('hidden');

            document.getElementById('gameOverTitle').textContent = victory ? 'RUN COMPLETED' : 'RUN TERMINATED';
            document.getElementById('gameOverSub').textContent = victory ? 'Extraction beacon established' : 'Vitals flatlined';

            document.getElementById('goRaceClass').textContent = `${this.player.race.toUpperCase()} ${this.player.classType.toUpperCase()}`;
            document.getElementById('goFloor').textContent = `Layer ${this.floorIndex}`;
            document.getElementById('goKills').textContent = this.kills;
            document.getElementById('goGold').textContent = this.gold;
            document.getElementById('goXp').textContent = this.player.xp;

            this.audio.speak(victory ? 'Run Completed. Returning to Starship.' : 'Game Over. Run Terminated.');
            this.audio.stopAmbientMusic();
            this.clearDungeon();
            this.saveSave();
        }

        // =========================================================================
        // 16. UI SETUP & LUCKYSTARSHIP HUB INTEGRATION
        // =========================================================================
        setupUI() {
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
                this.selectedStoryMissionId = null; // Standard Endless Run
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('charSelectScreen').classList.remove('hidden');
                this.renderCharSelect();
            });

            document.getElementById('btnEnterHub').addEventListener('click', () => {
                document.getElementById('mainMenuScreen').classList.add('hidden');
                document.getElementById('hubScreen').classList.remove('hidden');
                this.renderBotany();
                this.renderArmory();
                this.generateRepairMiniGame();
            });

            document.getElementById('btnOpenSettings').addEventListener('click', () => {
                document.getElementById('settingsScreen').classList.remove('hidden');
            });

            document.getElementById('btnSaveSettings').addEventListener('click', () => {
                this.audio.masterVolume = document.getElementById('settingsMasterVol').value / 100;
                const requestedDifficulty = document.getElementById('settingsDifficulty').value;
                this.difficulty = DifficultyData[requestedDifficulty] ? requestedDifficulty : 'normal';
                this.input.lookSensitivity = (parseFloat(document.getElementById('settingsMouseSens').value) || 3.5) * 0.00065;
                this.input.invertY = document.getElementById('settingsInvertY').checked;

                const touchMode = document.getElementById('settingsTouchMode').value;
                if (touchMode === 'always') {
                    document.body.classList.add('touch-enabled');
                } else if (touchMode === 'never') {
                    document.body.classList.remove('touch-enabled');
                } else {
                    const shouldUseTouchUi = ('ontouchstart' in window) ||
                        navigator.maxTouchPoints > 0 ||
                        window.innerWidth <= 900 ||
                        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
                    if (shouldUseTouchUi) {
                        document.body.classList.add('touch-enabled');
                    } else {
                        document.body.classList.remove('touch-enabled');
                    }
                }

                document.getElementById('settingsScreen').classList.add('hidden');
                this.saveSave();
            });

            document.getElementById('btnCharSelectBack').addEventListener('click', () => {
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });

            document.getElementById('btnCharSelectStart').addEventListener('click', () => {
                const selRace = document.querySelector('.char-card.selected')?.dataset.race || 'human';
                const selClass = document.querySelector('.class-btn.selected')?.dataset.class || 'warrior';
                const selMode = document.querySelector('.char-mode-card.selected')?.dataset.mode || this.controlMode || 'realtime';
                this.setControlMode(selMode);
                document.getElementById('charSelectScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.remove('hidden');
                this.initRun(selRace, selClass);
            });

            // Control Mode Buttons
            document.querySelectorAll('.btn-mode').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                });
            });

            // Variable Speed Buttons
            document.querySelectorAll('.btn-speed').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const speed = e.currentTarget.dataset.speed;
                    this.setGameSpeed(speed);
                });
            });

            // Turn-Based Wait Button
            const waitBtn = document.getElementById('btnWaitTurn');
            if (waitBtn) {
                waitBtn.addEventListener('click', () => {
                    this.executeTurnAction('wait');
                });
            }

            // Character Select Mode Cards
            document.querySelectorAll('.char-mode-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                });
            });

            // === MOBILE PANEL UI WIRING ===
            const mobileModePanel = document.getElementById('mobileModePanel');
            const mmhSettingsBtn = document.getElementById('mmhSettingsBtn');
            const mmpCloseBtn = document.getElementById('mmpCloseBtn');
            const mobilePauseBtn = document.getElementById('mobilePauseBtn');

            if (mmhSettingsBtn && mobileModePanel) {
                mmhSettingsBtn.addEventListener('click', () => {
                    mobileModePanel.classList.toggle('hidden');
                });
                mmhSettingsBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    mobileModePanel.classList.toggle('hidden');
                });
            }

            if (mmpCloseBtn && mobileModePanel) {
                mmpCloseBtn.addEventListener('click', () => {
                    mobileModePanel.classList.add('hidden');
                });
                mmpCloseBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    mobileModePanel.classList.add('hidden');
                });
            }

            // Mobile mode buttons
            document.querySelectorAll('.mmp-mode-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                    if (mobileModePanel) mobileModePanel.classList.add('hidden');
                });
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const mode = e.currentTarget.dataset.mode;
                    this.setControlMode(mode);
                    if (mobileModePanel) mobileModePanel.classList.add('hidden');
                });
            });

            // Mobile speed buttons
            document.querySelectorAll('.mmp-speed-btn').forEach(btn => {
                const applySpeed = (e) => {
                    e.preventDefault();
                    const speed = e.currentTarget.dataset.speed;
                    this.setGameSpeed(speed);
                    // sync mmp-speed-btn active states
                    document.querySelectorAll('.mmp-speed-btn').forEach(b => {
                        b.classList.toggle('active', parseFloat(b.dataset.speed) === this.gameSpeed);
                    });
                };
                btn.addEventListener('click', applySpeed);
                btn.addEventListener('touchstart', applySpeed);
            });

            // Mobile pause button
            if (mobilePauseBtn) {
                mobilePauseBtn.addEventListener('click', () => this.togglePause());
                mobilePauseBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.togglePause();
                });
            }

            document.getElementById('btnLeaveHub').addEventListener('click', () => {
                document.getElementById('hubScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                this.saveSave();
            });

            // Hub Navigation Tabs
            const tabBtns = document.querySelectorAll('.hub-tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    tabBtns.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    const targetTab = e.target.dataset.tab;
                    document.querySelectorAll('.hub-pane').forEach(p => p.classList.remove('active'));
                    const activePane = document.getElementById(`tab-${targetTab}`);
                    if (activePane) activePane.classList.add('active');

                    if (targetTab === 'exchange') {
                        document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                        document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                    } else if (targetTab === 'lore') {
                        this.renderLoreList();
                    } else if (targetTab === 'armory') {
                        this.renderArmory();
                    }
                });
            });

            // Exchange Buttons
            document.getElementById('btnBuyUusd').addEventListener('click', () => {
                if (this.gold >= 10) {
                    this.gold -= 10;
                    this.uusd += 100;
                    this.audio.playSfx('loot');
                    document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                    document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                }
            });

            document.getElementById('btnBuyGold').addEventListener('click', () => {
                if (this.uusd >= 100) {
                    this.uusd -= 100;
                    this.gold += 10;
                    this.audio.playSfx('loot');
                    document.getElementById('exchangeGoldBalance').textContent = `${this.gold} Gold`;
                    document.getElementById('exchangeUusdBalance').textContent = `${this.uusd} $UUSD`;
                }
            });

            // Quarters Upgrade
            document.getElementById('btnUpgradeQuarters').addEventListener('click', () => {
                if (this.quartersLevel < 6) {
                    // The displayed next-level cost belongs to the next entry,
                    // not the current level's historical purchase price.
                    const cost = QuartersUpgrades[this.quartersLevel].cost;
                    if (this.uusd >= cost) {
                        this.uusd -= cost;
                        this.quartersLevel++;
                        this.audio.playSfx('levelup');
                        this.updateHubQuartersUI();
                        this.saveSave();
                    }
                }
            });

            document.getElementById('btnGenerateCircuit').addEventListener('click', () => {
                this.generateRepairMiniGame();
            });

            // Potion Drink Buttons
            const potBtn = document.getElementById('btnUsePotion');
            if (potBtn) potBtn.addEventListener('click', () => this.usePotion());

            // Pause & Return Buttons
            document.getElementById('btnPause').addEventListener('click', () => this.togglePause());
            document.getElementById('btnResume').addEventListener('click', () => this.togglePause());
            document.getElementById('btnAbandon').addEventListener('click', () => {
                this.isPaused = false;
                this.clearDungeon();
                this.audio.stopAmbientMusic();
                document.getElementById('pauseScreen').classList.add('hidden');
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                exitPointerLockSafely();
                this.saveSave();
            });

            document.getElementById('btnReturnToHub').addEventListener('click', () => {
                this.isPaused = false;
                this.clearDungeon();
                this.audio.stopAmbientMusic();
                document.getElementById('gameMain').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
                exitPointerLockSafely();
                this.saveSave();
            });

            document.getElementById('btnGoToMenu').addEventListener('click', () => {
                document.getElementById('gameOverScreen').classList.add('hidden');
                document.getElementById('mainMenuScreen').classList.remove('hidden');
            });
        }

        renderCharSelect() {
            if (this.hubController) return this.hubController.renderCharSelect();
        }

        updateHubQuartersUI() {
            if (this.hubController) return this.hubController.updateHubQuartersUI();
        }

        renderArmory() {
            if (this.hubController) return this.hubController.renderArmory();
        }

        buyArmoryUpgrade(upgradeId) {
            if (this.hubController) return this.hubController.buyArmoryUpgrade(upgradeId);
        }

        renderBotany() {
            if (this.hubController) return this.hubController.renderBotany();
        }

        plantSeed(slotIndex, seedId) {
            if (this.hubController) return this.hubController.plantSeed(slotIndex, seedId);
        }

        harvestCrop(slotIndex) {
            if (this.hubController) return this.hubController.harvestCrop(slotIndex);
        }

        generateRepairMiniGame() {
            if (this.hubController) return this.hubController.generateRepairMiniGame();
        }

        renderLoreList() {
            if (this.hubController) return this.hubController.renderLoreList();
        }

        renderStoryMissionsList() {
            if (this.hubController) return this.hubController.renderStoryMissionsList();
        }

        checkStoryObjectives(enemyKilled) {
            if (!this.currentMission || !this.currentMission.objectives) return;
            let allComplete = true;

            this.currentMission.objectives.forEach(obj => {
                if (obj.current < obj.count) {
                    if (obj.id === 'slay_boss' && enemyKilled.isBoss) {
                        obj.current++;
                    } else if (obj.id === 'slay_all' || obj.id === 'survive_waves' || obj.id === 'slay_minions') {
                        obj.current++;
                    } else if (obj.id === 'slay_skulls' && enemyKilled.type === 'skull') {
                        obj.current++;
                    } else if (obj.id === 'slay_elites' && enemyKilled.scale >= 1.5) {
                        obj.current++;
                    }
                    this.combatText.spawnText(this.player.x, 25, this.player.y, `Goal: ${obj.current}/${obj.count}`, 'xp');
                }
                if (obj.current < obj.count) allComplete = false;
            });

            if (allComplete && !this.currentMission.completed) {
                this.currentMission.completed = true;
                this.gold += this.currentMission.rewardGold;
                this.uusd += this.currentMission.rewardUusd;

                window.GraveGainStoryEngine.completeMission(this.currentMission.id, 3);
                this.saveSave();

                this.combatText.showBanner(`🏆 MISSION COMPLETED! 🏆`);
                this.playDialogueSequence(this.currentMission.dialogueAfter, () => {
                    this.gameOver(true);
                });
            }
        }

        selectStoryMission(missionId) {
            if (this.hubController) return this.hubController.selectStoryMission(missionId);
        }

        playDialogueSequence(dialogueList, onComplete) {
            if (this.hubController) return this.hubController.playDialogueSequence(dialogueList, onComplete);
            if (onComplete) onComplete();
        }

        viewLoreEntry(id) {
            if (this.hubController) return this.hubController.viewLoreEntry(id);
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        if (!window.THREE) {
            const msg = document.createElement('div');
            msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#04030a;color:#f5e6c8;font-family:sans-serif;font-size:1rem;text-align:center;padding:2rem;z-index:9999;';
            msg.textContent = 'GraveGain3D could not load the Three.js 3D library (both CDN sources unreachable). Check your connection and reload.';
            document.body.appendChild(msg);
            return;
        }
        try {
            window.GraveGainGame = new GraveGainGame();
        } catch (err) {
            const msg = document.createElement('div');
            msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#04030a;color:#f5e6c8;font-family:sans-serif;font-size:1rem;text-align:center;padding:2rem;z-index:9999;';
            msg.textContent = 'GraveGain3D failed to start WebGL (' + (err && err.message ? err.message : err) + '). Try a browser with hardware acceleration enabled.';
            document.body.appendChild(msg);
            throw err;
        }
    });

    // Universal VibeCodeWorker & Game Runner integration bindings
    Object.defineProperty(window, 'game', {
        configurable: true,
        get: () => {
            const gg = window.GraveGainGame;
            if (!gg) return null;
            return {
                instance: gg,
                get score() { return gg.gold || 0; },
                get isGameOver() {
                    const goScreen = document.getElementById('gameOverScreen');
                    return (goScreen && !goScreen.classList.contains('hidden')) || (gg.player ? gg.player.isDead : false);
                },
                get player() {
                    if (!gg.player) return null;
                    return {
                        x: gg.player.x,
                        y: gg.player.y,
                        hp: gg.player.hp,
                        maxHp: gg.player.maxHp,
                        stamina: gg.player.stamina,
                        level: gg.player.level,
                        xp: gg.player.xp,
                        race: gg.player.race,
                        classType: gg.player.classType
                    };
                },
                get floor() { return gg.floorIndex || 1; },
                get kills() { return gg.kills || 0; },
                get inDungeon() {
                    const gameMain = document.getElementById('gameMain');
                    return gameMain && !gameMain.classList.contains('hidden') && !gg.isPaused;
                },
                startQuickRun: (race = 'human', classType = 'warrior', mode = 'realtime') => {
                    const mainMenu = document.getElementById('mainMenuScreen');
                    const charSelect = document.getElementById('charSelectScreen');
                    const gameMain = document.getElementById('gameMain');
                    if (mainMenu) mainMenu.classList.add('hidden');
                    if (charSelect) charSelect.classList.add('hidden');
                    if (gameMain) gameMain.classList.remove('hidden');
                    gg.setControlMode(mode);
                    gg.initRun(race, classType);
                    return true;
                },
                attack: () => {
                    if (gg.player && !gg.isPaused) {
                        if (typeof gg.triggerMeleeAttack === 'function') {
                            gg.triggerMeleeAttack();
                        } else if (typeof gg.performMeleeAttack === 'function') {
                            gg.performMeleeAttack();
                        }
                        return true;
                    }
                    return false;
                },
                // ---- Virtual bot-mouse API (routed via GraveGainBotInput) ----
                look: (dx = 0, dy = 0) => {
                    if (window.GraveGainBotInput) return window.GraveGainBotInput.look(dx, dy);
                    return false;
                },
                attackAt: (nx = 500, ny = 500) => {
                    // Aim the view at a normalized screen point, then attack.
                    if (window.GraveGainBotInput) return window.GraveGainBotInput.click(nx, ny, 'attack');
                    return false;
                },
                setBotControl: (on) => {
                    if (window.GraveGainBotInput) window.GraveGainBotInput.setBotControl(on);
                    if (window.GraveGainBotCursor) window.GraveGainBotCursor.setBotControl(on);
                    return true;
                },
                ability: () => {
                    if (gg.player && !gg.isPaused) {
                        gg.player.triggerAbility();
                        return true;
                    }
                    return false;
                },
                usePotion: () => {
                    if (gg.usePotion) {
                        gg.usePotion();
                        return true;
                    }
                    return false;
                }
            };
        }
    });

    Object.defineProperty(window, 'gameState', {
        configurable: true,
        get: () => {
            const gg = window.GraveGainGame;
            return {
                title: document.title,
                url: window.location.href,
                canvas: !!document.querySelector('#gameCanvas'),
                score: gg ? gg.gold : 0,
                isGameOver: window.game ? window.game.isGameOver : false,
                playerState: window.game ? window.game.player : null,
                floor: gg ? gg.floorIndex : 1,
                enemiesCount: gg && gg.enemies ? gg.enemies.length : 0,
                activeMode: gg ? gg.controlMode : 'realtime'
            };
        }
    });

    window.gameDebug = {
        name: "GraveGain3D (Complete FPS Edition)",
        getScore: () => window.GraveGainGame ? window.GraveGainGame.gold : 0,
        setScore: (g) => { if (window.GraveGainGame) window.GraveGainGame.gold = g; },
        getHealth: () => window.GraveGainGame && window.GraveGainGame.player ? window.GraveGainGame.player.hp : 0,
        setHealth: (h) => { if (window.GraveGainGame && window.GraveGainGame.player) window.GraveGainGame.player.hp = h; },
        addXp: (x) => { if (window.GraveGainGame && window.GraveGainGame.player) window.GraveGainGame.player.addXp(x); },
        win: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(true); },
        lose: () => { if (window.GraveGainGame) window.GraveGainGame.gameOver(false); },
        godMode: false,
        toggleGodMode: function() {
            this.godMode = !this.godMode;
            return this.godMode;
        }
    };
})();
