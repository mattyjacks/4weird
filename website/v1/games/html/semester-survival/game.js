/**
 * Semester Survival - Main Game Loop & Orchestrator
 * Integrates WebAudio, Three.js Renderer, state saving, and UI screens.
 */
(function() {
    'use strict';

    class GameEngine {
        constructor() {
            this.isActive = false;
            this.isPaused = false;
            this.lastTime = 0;
            
            // Run variables
            this.distance = 0;
            this.gpa = 4.00;
            this.energy = 100;
            this.pocketCoins = 0;
            this.speed = 0;
            this.baseStartingSpeed = 0;
            
            // Boss / CAT Variables
            this.bossActive = false;
            this.bossHealth = 100;
            this.bossAttackTimer = 0;
            
            // Power-up durations (in seconds)
            this.shieldActive = false;
            this.magnetTimer = 0;
            this.coffeeTimer = 0;
            this.invulnerableTimer = 0;
            
            // Spawn timers
            this.spawnTimer = 0;
            this.spawnInterval = 1.8; // seconds
            this.entityCounter = 0;
            
            // Current targets
            this.semesterTarget = 400;
        }

        init() {
            // 1. Initialize UI with menu action callbacks
            window.CampusUI.init({
                onStartRun: () => this.startRun(),
                onResume: () => this.resume(),
                onRestart: () => this.abandonRun(),
                onResetProgress: () => this.syncSaveStats()
            });

            // 2. Initialize Three.js 3D viewport
            window.Campus3DRenderer.init();

            // 3. Sync player skin to starts
            this.syncSaveStats();

            // 4. Bind Pause key listener (P / Esc)
            window.ControlsInput.init((action) => {
                if (!this.isActive) return;
                
                if (action === 'pause') {
                    this.togglePause();
                } else if (!this.isPaused) {
                    if (action === 'left') {
                        const current = window.Campus3DRenderer.playerState.lane;
                        if (current > 0) window.Campus3DRenderer.setLane(current - 1);
                    } else if (action === 'right') {
                        const current = window.Campus3DRenderer.playerState.lane;
                        if (current < 2) window.Campus3DRenderer.setLane(current + 1);
                    } else if (action === 'jump') {
                        window.Campus3DRenderer.triggerJump();
                        window.CampusAudio.playJump();
                    } else if (action === 'slide') {
                        window.Campus3DRenderer.triggerSlide();
                        window.CampusAudio.playSlide();
                    }
                }
            });

            // Remove loading screen once canvas is loaded
            setTimeout(() => {
                const screen = document.getElementById('TEMPLATE-4weird-loading-screen');
                if (screen) screen.classList.add('hidden');
            }, 600);
        }

        syncSaveStats() {
            const data = window.GameStateStore.data;
            window.Campus3DRenderer.applySkin(data.currentSkin);
            window.CampusUI.updateMenuStats();
        }

        startRun() {
            this.isActive = true;
            this.isPaused = false;
            this.distance = 0;
            this.gpa = 4.00;
            this.energy = 100;
            this.pocketCoins = 0;
            this.lastTime = performance.now();
            
            this.shieldActive = false;
            this.magnetTimer = 0;
            this.coffeeTimer = 0;
            this.invulnerableTimer = 0;
            this.spawnTimer = 0;
            this.entityCounter = 0;
            
            this.bossActive = false;
            this.bossHealth = 100;
            this.bossAttackTimer = 0;

            const sem = window.GameStateStore.data.currentSemester;
            this.semesterTarget = 200 + sem * 150;
            
            // Starts at a lower, beginner-friendly speed
            this.baseStartingSpeed = 4.5 + sem * 0.5;
            this.speed = this.baseStartingSpeed;
            
            // Dynamic track curves regenerated per game
            window.Campus3DRenderer.regenerateTrackCurve();
            
            // Setup Three.js scene state
            window.Campus3DRenderer.clearEntities();
            window.Campus3DRenderer.setLane(1);
            window.Campus3DRenderer.setTheme(sem);
            window.Campus3DRenderer.setShield(false);

            // Apply character perks
            const skin = window.GameStateStore.data.currentSkin;
            if (skin === 'nightcoder') {
                this.shieldActive = true;
                window.Campus3DRenderer.setShield(true);
            }

            // Sync HUD displays
            document.getElementById('game-hud').classList.remove('hidden');
            window.CampusUI.updateHud(this.gpa, this.energy, this.pocketCoins, sem, this.distance, null);

            // Play music
            window.CampusAudio.setBpm(this.speed);
            window.CampusAudio.resumeMusic();

            window.GameStateStore.data.stats.gamesPlayed++;
            window.GameStateStore.save();

            // Fire request frame loop
            requestAnimationFrame((t) => this.loop(t));
        }

        togglePause() {
            this.isPaused = !this.isPaused;
            if (this.isPaused) {
                window.CampusAudio.stopMusic();
                window.CampusUI.showOverlay('TEMPLATE-4weird-pause-screen');
            } else {
                window.CampusAudio.resumeMusic();
                window.CampusUI.hideOverlay('TEMPLATE-4weird-pause-screen');
                this.lastTime = performance.now();
                requestAnimationFrame((t) => this.loop(t));
            }
        }

        resume() {
            this.isPaused = false;
            window.CampusAudio.resumeMusic();
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }

        abandonRun() {
            this.isActive = false;
            this.isPaused = false;
            window.CampusAudio.stopMusic();
            document.getElementById('game-hud').classList.add('hidden');
            window.CampusUI.showOverlay('TEMPLATE-4weird-start-screen');
            this.syncSaveStats();
        }

        loop(timestamp) {
            if (!this.isActive || this.isPaused) return;

            let deltaTime = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;

            if (deltaTime > 0.1) deltaTime = 0.1;

            this.update(deltaTime);
            
            requestAnimationFrame((t) => this.loop(t));
        }

        update(deltaTime) {
            // 1. Advance distance run
            this.distance += this.speed * deltaTime;
            window.GameStateStore.addDistance(this.speed * deltaTime);

            // 2. Speed gradually increases over time (0.08 units per second)
            this.speed += 0.08 * deltaTime;

            // 3. Slow GPA decay over time
            const gpaDecayRate = window.GameStateStore.data.currentSkin === 'memelord' ? 0.015 : 0.008;
            const multLvl = window.GameStateStore.data.upgrades.scoreMultiplier || 1;
            const multMultiplier = 1.0 + (multLvl - 1) * 0.1;
            
            this.gpa = Math.max(0, Math.min(4.00, this.gpa - gpaDecayRate * deltaTime));

            // 4. Count down timers
            if (this.invulnerableTimer > 0) this.invulnerableTimer -= deltaTime;
            if (this.magnetTimer > 0) this.magnetTimer -= deltaTime;
            if (this.coffeeTimer > 0) {
                this.coffeeTimer -= deltaTime;
                if (this.coffeeTimer <= 0) {
                    this.speed -= 4.0;
                }
            }

            // 5. Update dynamic music speed
            window.CampusAudio.setBpm(this.speed);

            // Check if we hit the boss trigger phase
            const currentSem = window.GameStateStore.data.currentSemester;
            const reachedBossLimit = this.distance >= this.semesterTarget;

            if (reachedBossLimit && !this.bossActive && currentSem <= 8) {
                this.triggerBossFight();
            }

            // 6. Spawn logic
            this.spawnTimer += deltaTime;
            const currentSpawnInterval = this.bossActive ? this.spawnInterval * 0.8 : this.spawnInterval;
            
            if (this.spawnTimer >= currentSpawnInterval) {
                this.spawnTimer = 0;
                this.spawnObstaclesOrPowerUps();
            }

            // 7. Update WebGL coordinates and check collision triggers
            window.Campus3DRenderer.update(deltaTime, this.speed, (collidedEntity) => this.onCollision(collidedEntity));

            // Update UI HUD panel
            const bossHealthPercent = this.bossActive ? this.bossHealth : null;
            window.CampusUI.updateHud(this.gpa, this.energy, this.pocketCoins, currentSem, this.distance, bossHealthPercent);
        }

        triggerBossFight() {
            this.bossActive = true;
            this.bossHealth = 100;
            window.CampusAudio.playPowerUp();
        }

        spawnObstaclesOrPowerUps() {
            const lane = Math.floor(Math.random() * 3);
            this.entityCounter++;

            if (this.bossActive) {
                const projType = Math.random() > 0.4 ? 'paper' : 'deadline';
                window.Campus3DRenderer.spawnObstacle(projType, lane, this.entityCounter);
                return;
            }

            const roll = Math.random();
            if (roll < 0.45) {
                const collRoll = Math.random();
                let type = 'coin';
                if (collRoll < 0.6) type = 'coin';
                else if (collRoll < 0.8) type = 'notes';
                else type = 'coffee';

                window.Campus3DRenderer.spawnCollectible(type, lane, this.entityCounter);
            } else {
                const obsRoll = Math.random();
                let type = 'barrier';
                if (obsRoll < 0.4) type = 'barrier';
                else if (obsRoll < 0.8) type = 'paper';
                else type = 'deadline';

                if (window.GameStateStore.data.currentSemester >= 6 && Math.random() > 0.7) {
                    type = 'invigilator';
                }

                window.Campus3DRenderer.spawnObstacle(type, lane, this.entityCounter);
            }
        }

        onCollision(entity) {
            if (entity.type === 'collectible') {
                window.CampusAudio.playCollect();
                window.GameStateStore.data.stats.powerupsCollected++;

                if (entity.collectibleType === 'coin') {
                    let coinsGained = 1;
                    const dbLvl = window.GameStateStore.data.upgrades.doubleCoins || 1;
                    const doubleChance = (dbLvl - 1) * 0.05;
                    if (Math.random() < doubleChance) {
                        coinsGained = 2;
                    }
                    this.pocketCoins += coinsGained;
                } else if (entity.collectibleType === 'notes') {
                    const seriousMultiplier = window.GameStateStore.data.currentSkin === 'serious' ? 0.15 : 0.10;
                    const upgradeGpaMult = 1.0 + (window.GameStateStore.data.upgrades.scoreMultiplier - 1) * 0.1;
                    this.gpa = Math.min(4.00, this.gpa + seriousMultiplier * upgradeGpaMult);
                    
                    if (window.GameStateStore.data.currentSkin === 'genius') {
                        this.energy = Math.min(100, this.energy + 10);
                    }

                    if (this.bossActive) {
                        this.bossHealth = Math.max(0, this.bossHealth - 12);
                        if (this.bossHealth <= 0) {
                            this.defeatBoss();
                        }
                    }
                } else if (entity.collectibleType === 'coffee') {
                    const coffeeLvl = window.GameStateStore.data.upgrades.coffeeDuration || 1;
                    const duration = 5.0 + (coffeeLvl - 1) * 1.5;
                    
                    this.energy = Math.min(100, this.energy + 25);
                    this.coffeeTimer = duration;
                    this.speed += 4.0;
                }
            } else if (entity.type === 'obstacle') {
                if (this.shieldActive) {
                    this.shieldActive = false;
                    window.Campus3DRenderer.setShield(false);
                    this.invulnerableTimer = 1.5;
                    window.CampusAudio.playHit();
                    return;
                }

                if (this.invulnerableTimer > 0) return;

                window.CampusAudio.playHit();
                this.invulnerableTimer = 1.5;

                this.gpa = Math.max(0, this.gpa - 0.25);
                this.energy = Math.max(0, this.energy - 30);

                if (this.energy <= 0) {
                    this.triggerFail('burnout');
                    return;
                }

                if (entity.obstacleType === 'paper' && Math.random() < 0.3) {
                    this.triggerFail('portal');
                    return;
                }

                if (entity.obstacleType === 'invigilator') {
                    this.triggerFail('incident', 'no_id');
                    return;
                }
            }
        }

        defeatBoss() {
            this.bossActive = false;
            window.CampusAudio.playVictory();
            
            const currentSem = window.GameStateStore.data.currentSemester;
            
            if (this.gpa >= 2.00) {
                window.GameStateStore.data.stats.catsPassed++;
                if (currentSem === 8) {
                    this.triggerVictory();
                } else {
                    window.GameStateStore.data.currentSemester = currentSem + 1;
                    window.GameStateStore.addCoins(this.pocketCoins);
                    window.GameStateStore.save();
                    
                    this.awardSemesterBadges();
                    this.abandonRun();
                }
            } else {
                this.triggerFail('supp');
            }
        }

        awardSemesterBadges() {
            const data = window.GameStateStore.data;
            if (data.currentSemester === 2) window.GameStateStore.awardBadge('fresher');
            if (data.currentSemester === 4) window.GameStateStore.awardBadge('hero');
            if (data.currentSemester === 5) window.GameStateStore.awardBadge('classrep');
            if (data.currentSemester === 6) window.GameStateStore.awardBadge('internship');
            if (data.currentSemester === 7) window.GameStateStore.awardBadge('research');
            
            if (this.gpa === 4.0) window.GameStateStore.awardBadge('deans');
            if (this.gpa > 3.7) window.GameStateStore.data.stats.examsPassed++;
            
            if (window.GameStateStore.data.stats.coinsCollected >= 1000) window.GameStateStore.awardBadge('helb');
            window.GameStateStore.save();
        }

        triggerFail(type, reason = '') {
            this.isActive = false;
            window.CampusAudio.stopMusic();

            const finalizeExit = () => {
                this.abandonRun();
            };

            const finalizeRevive = () => {
                this.isActive = true;
                this.energy = 50;
                this.gpa = Math.max(2.0, this.gpa);
                this.lastTime = performance.now();
                window.CampusAudio.resumeMusic();
                requestAnimationFrame((t) => this.loop(t));
            };

            if (type === 'supp') {
                window.CampusUI.showFailSupp(this.gpa, window.GameStateStore.data.currentSemester, (choice) => {
                    if (choice === 'pay') {
                        window.GameStateStore.data.coins -= 100;
                        window.GameStateStore.data.currentSemester++;
                        window.GameStateStore.save();
                        finalizeExit();
                    } else if (choice === 'mercy') {
                        window.GameStateStore.data.deansMercyCount--;
                        window.GameStateStore.data.currentSemester++;
                        window.GameStateStore.save();
                        finalizeExit();
                    } else if (choice === 'ad') {
                        window.CampusUI.showSimulatedAd(() => {
                            window.GameStateStore.data.currentSemester++;
                            window.GameStateStore.save();
                            finalizeExit();
                        });
                    } else {
                        finalizeExit();
                    }
                });
            } else if (type === 'burnout') {
                window.CampusUI.showFailBurnout(this.distance, (choice) => {
                    if (choice === 'revive') {
                        if (!window.GameStateStore.data.premiumEnabled) {
                            window.GameStateStore.data.coins -= 50;
                        }
                        window.GameStateStore.save();
                        finalizeRevive();
                    } else {
                        finalizeExit();
                    }
                });
            } else if (type === 'portal') {
                window.CampusUI.showFailPortal(this.pocketCoins, (choice) => {
                    if (choice === 'revive') {
                        if (!window.GameStateStore.data.premiumEnabled) {
                            window.GameStateStore.data.coins -= 50;
                        }
                        window.GameStateStore.save();
                        finalizeRevive();
                    } else {
                        finalizeExit();
                    }
                });
            } else if (type === 'incident') {
                window.CampusUI.showFailIncident(this.gpa, reason, (choice) => {
                    if (choice === 'revive') {
                        if (!window.GameStateStore.data.premiumEnabled) {
                            window.GameStateStore.data.coins -= 50;
                        }
                        window.GameStateStore.save();
                        finalizeRevive();
                    } else {
                        finalizeExit();
                    }
                });
            }
        }

        triggerVictory() {
            this.isActive = false;
            window.CampusAudio.stopMusic();

            window.GameStateStore.addCoins(this.pocketCoins);
            window.GameStateStore.awardBadge('gradstar');
            
            if (!window.GameStateStore.data.unlockedSkins.includes('graduate')) {
                window.GameStateStore.data.unlockedSkins.push('graduate');
            }
            window.GameStateStore.save();

            const cGpa = window.GameStateStore.data.cumulativeGpa;
            const dist = this.distance;
            const coins = window.GameStateStore.data.coins;
            const cats = window.GameStateStore.data.stats.catsPassed;
            const badges = window.GameStateStore.data.badges.length;
            const skins = window.GameStateStore.data.unlockedSkins.length;

            window.CampusUI.showVictory(cGpa, dist, coins, cats, badges, skins, false, (choice) => {
                if (choice === 'endless') {
                    window.GameStateStore.data.currentSemester = 9;
                    window.GameStateStore.save();
                    this.startRun();
                } else {
                    this.abandonRun();
                }
            });
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.SemesterSurvivalEngine = new GameEngine();
        window.SemesterSurvivalEngine.init();
    });
})();
