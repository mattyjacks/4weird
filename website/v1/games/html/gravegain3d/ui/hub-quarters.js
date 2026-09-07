(function() {
    'use strict';

    const GameData = window.GraveGainGameData || {};
    const RaceData = GameData.RaceData || {};
    const ClassType = GameData.ClassType || {};
    const ClassData = GameData.ClassData || {};
    const QuartersUpgrades = GameData.QuartersUpgrades || [];
    const BotanySeeds = GameData.BotanySeeds || [];
    const ArmoryUpgrades = GameData.ArmoryUpgrades || [];

    class GraveGainHubQuartersController {
        constructor(game) {
            this.game = game;
        }

        renderCharSelect() {
            const raceGrid = document.getElementById('raceGrid');
            if (raceGrid) {
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

                raceGrid.querySelectorAll('.char-card').forEach(card => {
                    card.addEventListener('click', () => {
                        raceGrid.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                    });
                });
            }

            const classGrid = document.getElementById('classGrid');
            if (classGrid) {
                classGrid.innerHTML = Object.values(ClassType).map((cls, i) => {
                    const c = ClassData[cls];
                    return `<button class="class-btn ${i === 0 ? 'selected' : ''}" data-class="${cls}">${c.title.toUpperCase()}</button>`;
                }).join('');

                classGrid.querySelectorAll('.class-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        classGrid.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                    });
                });
            }
        }

        updateHubQuartersUI() {
            const levelEl = document.getElementById('hubQuartersLevel');
            if (!levelEl) return;
            levelEl.textContent = `Level ${this.game.quartersLevel}`;
            const upgrade = QuartersUpgrades[this.game.quartersLevel - 1];
            if (upgrade) {
                document.getElementById('hubQuartersSize').textContent = upgrade.size;
                document.getElementById('hubQuartersCapacity').textContent = `${upgrade.capacity} Space`;
            }

            if (this.game.quartersLevel < 6) {
                const nextUpgrade = QuartersUpgrades[this.game.quartersLevel];
                document.getElementById('hubQuartersCost').textContent = `${nextUpgrade.cost} $UUSD`;
            } else {
                document.getElementById('hubQuartersCost').textContent = 'MAX LEVEL REACHED';
            }
        }

        renderArmory() {
            const grid = document.getElementById('armoryGrid');
            if (!grid) return;

            grid.innerHTML = ArmoryUpgrades.map(u => {
                const rank = this.game.armoryRanks[u.id] || 0;
                const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
                const isMax = rank >= u.maxRank;

                return `
                    <div class="armory-card">
                        <div class="armory-header">
                            <span class="armory-icon">${u.icon}</span>
                            <div>
                                <div class="armory-title">${u.name}</div>
                                <div class="armory-level">Rank ${rank} / ${u.maxRank}</div>
                            </div>
                        </div>
                        <div class="armory-desc">${u.desc}</div>
                        <div class="armory-footer">
                            <span class="highlight-cyan" style="font-size:0.85rem;">${isMax ? 'MAX RANK' : `${cost} $UUSD`}</span>
                            ${isMax ? '' : `<button class="btn-game btn-primary" style="font-size:0.75rem; padding:6px 12px;" onclick="window.GraveGainGame.buyArmoryUpgrade('${u.id}')">Upgrade</button>`}
                        </div>
                    </div>
                `;
            }).join('');
        }

        buyArmoryUpgrade(upgradeId) {
            const u = ArmoryUpgrades.find(item => item.id === upgradeId);
            if (!u) return;

            const rank = this.game.armoryRanks[u.id] || 0;
            if (rank >= u.maxRank) return;

            const cost = Math.round(u.baseCost * Math.pow(u.mult, rank));
            if (this.game.uusd >= cost) {
                this.game.uusd -= cost;
                this.game.armoryRanks[u.id] = rank + 1;
                this.game.audio.playSfx('levelup');
                this.renderArmory();
                this.game.saveSave();
            }
        }

        renderBotany() {
            const grid = document.getElementById('botanyGrid');
            if (!grid) return;
            const now = Math.floor(Date.now() / 1000);

            grid.innerHTML = this.game.botanyCrops.map((crop, index) => {
                if (!crop.seedId) {
                    return `
                        <div class="plant-slot">
                            <strong>[Empty Hydroponic Slot]</strong>
                            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                                ${BotanySeeds.map(s => `
                                    <button class="btn-game" style="font-size:0.75rem; padding:5px 10px;" onclick="window.GraveGainGame.plantSeed(${index}, '${s.id}')">
                                        Plant ${s.emoji} ${s.name} (25 $UUSD)
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    const seed = BotanySeeds.find(s => s.id === crop.seedId);
                    const elapsed = now - crop.startTime;
                    const percent = Math.min(100, Math.floor((elapsed / crop.growthTime) * 100));
                    const isReady = percent >= 100;

                    return `
                        <div class="plant-slot">
                            <div class="plant-info">
                                <span>${seed.emoji} ${seed.name}</span>
                                <strong>${percent}%</strong>
                            </div>
                            <div class="plant-progress-bg">
                                <div class="plant-progress-fill" style="width: ${percent}%;"></div>
                            </div>
                            ${isReady ? `
                                <button class="btn-game btn-primary" style="font-size:0.8rem; padding:6px 12px; margin-top:5px;" onclick="window.GraveGainGame.harvestCrop(${index})">
                                    🌾 Harvest (+${seed.yield * seed.value} $UUSD)
                                </button>
                            ` : `
                                <span style="font-size:0.75rem; color:var(--grave-text-muted);">Matures in ${Math.max(0, crop.growthTime - elapsed)}s</span>
                            `}
                        </div>
                    `;
                }
            }).join('');
        }

        plantSeed(slotIndex, seedId) {
            const seed = BotanySeeds.find(s => s.id === seedId);
            if (!seed) return;
            if (this.game.uusd >= 25) {
                this.game.uusd -= 25;
                this.game.botanyCrops[slotIndex] = {
                    seedId: seed.id,
                    startTime: Math.floor(Date.now() / 1000),
                    growthTime: seed.time
                };
                this.game.audio.playSfx('loot');
                this.renderBotany();
                this.game.saveSave();
            }
        }

        harvestCrop(slotIndex) {
            const crop = this.game.botanyCrops[slotIndex];
            if (!crop || !crop.seedId) return;
            const seed = BotanySeeds.find(s => s.id === crop.seedId);
            if (!seed) return;
            this.game.uusd += seed.yield * seed.value;
            this.game.botanyCrops[slotIndex] = { seedId: null, startTime: 0, growthTime: 0 };
            this.game.audio.playSfx('loot');
            this.renderBotany();
            this.game.saveSave();
        }

        generateRepairMiniGame() {
            const area = document.getElementById('repairCircuitArea');
            if (!area) return;
            area.innerHTML = '';
            document.getElementById('repairStatus').textContent = 'Status: Ready for calibration';

            const termX = 240;
            const termY = 90;

            const target = document.createElement('div');
            target.className = 'circuit-node terminal';
            target.style.left = `${termX}px`;
            target.style.top = `${termY}px`;
            target.textContent = '🎯';
            area.appendChild(target);

            const comp = document.createElement('div');
            comp.className = 'circuit-node component';
            comp.style.left = '40px';
            comp.style.top = '90px';
            comp.textContent = '💠';
            area.appendChild(comp);

            let isDragging = false;
            const startDrag = () => { isDragging = true; };
            const moveDrag = (e) => {
                if (!isDragging) return;
                const rect = area.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                let px = Math.max(16, Math.min(rect.width - 16, clientX - rect.left));
                let py = Math.max(16, Math.min(rect.height - 16, clientY - rect.top));

                comp.style.left = `${px}px`;
                comp.style.top = `${py}px`;

                if (Math.hypot(px - termX, py - termY) < 22) {
                    isDragging = false;
                    comp.style.left = `${termX}px`;
                    comp.style.top = `${termY}px`;
                    document.getElementById('repairStatus').textContent = 'Status: Circuit calibrated! +50 $UUSD awarded!';
                    this.game.uusd += 50;
                    this.game.audio.playSfx('block');
                    this.game.saveSave();
                }
            };
            const stopDrag = () => { isDragging = false; };

            comp.addEventListener('mousedown', startDrag);
            window.addEventListener('mousemove', moveDrag);
            window.addEventListener('mouseup', stopDrag);

            comp.addEventListener('touchstart', startDrag, { passive: true });
            window.addEventListener('touchmove', moveDrag, { passive: true });
            window.addEventListener('touchend', stopDrag);
        }

        renderLoreList() {
            const listEl = document.getElementById('loreList');
            if (!listEl || !window.GraveGainLore) return;

            const allLore = window.GraveGainLore.getAll();
            listEl.innerHTML = Object.keys(allLore).map(key => {
                const item = allLore[key];
                return `<button class="class-btn" style="text-align: left; padding: 8px; font-size: 0.8rem; width: 100%;" onclick="window.GraveGainGame.viewLoreEntry('${item.id}')">${item.title}</button>`;
            }).join('');

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn && !speakBtn.dataset.bound) {
                speakBtn.dataset.bound = 'true';
                speakBtn.addEventListener('click', () => {
                    const currentId = speakBtn.dataset.currentId;
                    if (currentId) {
                        const item = window.GraveGainLore.get(currentId);
                        if (item) this.game.audio.speak(item.content);
                    }
                });
            }
        }

        viewLoreEntry(id) {
            const item = window.GraveGainLore ? window.GraveGainLore.get(id) : null;
            if (!item) return;

            document.getElementById('loreTitle').textContent = item.title;
            document.getElementById('loreCategory').textContent = `Category: ${item.category.replace('_', ' ')}`;
            document.getElementById('loreContent').textContent = item.content;

            const speakBtn = document.getElementById('btnSpeakLore');
            if (speakBtn) {
                speakBtn.style.display = 'block';
                speakBtn.dataset.currentId = id;
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
                const isSelected = this.game.selectedStoryMissionId === m.id;

                const starStr = unlocked ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '🔒 Locked';
                return `
                    <div class="glass-panel story-card ${unlocked ? '' : 'disabled'} ${isSelected ? 'selected' : ''}" 
                         style="padding: 12px; border: 1px solid ${isSelected ? 'var(--grave-gold)' : 'var(--grave-border)'}; border-radius: 8px; cursor: ${unlocked ? 'pointer' : 'not-allowed'}; opacity: ${unlocked ? 1 : 0.6}; background: ${isSelected ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.4)'};"
                         onclick="window.GraveGainGame.selectStoryMission(${m.id})">
                        <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--grave-gold);">${m.location}</div>
                        <h4 style="margin: 4px 0; font-family: 'Orbitron'; font-size: 0.95rem; color: white;">${m.title}</h4>
                        <p style="font-size: 0.78rem; color: var(--grave-text-muted); margin: 4px 0 8px 0;">${m.subtitle}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                            <span>${starStr}</span>
                            <span class="highlight-gold">+${m.rewardGold}g | +${m.rewardUusd}$</span>
                        </div>
                    </div>
                `;
            }).join('');

            if (btnLaunch) {
                btnLaunch.disabled = !this.game.selectedStoryMissionId;
            }
        }

        selectStoryMission(missionId) {
            if (!window.GraveGainStoryEngine.isUnlocked(missionId)) return;
            this.game.selectedStoryMissionId = missionId;
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

            dialogueScreen.classList.remove('hidden');
            let idx = 0;

            const showLine = () => {
                const item = dialogueList[idx];
                portrait.textContent = item.portrait || '🤖';
                speaker.textContent = item.speaker;
                text.textContent = item.text;
                this.game.audio.speak(`${item.speaker} says: ${item.text}`);
            };

            const handleNext = () => {
                idx++;
                if (idx < dialogueList.length) {
                    showLine();
                } else {
                    nextBtn.removeEventListener('click', handleNext);
                    dialogueScreen.classList.add('hidden');
                    if (onComplete) onComplete();
                }
            };

            nextBtn.onclick = handleNext;
            showLine();
        }
    }

    window.GraveGainHubQuartersController = GraveGainHubQuartersController;
})();
