/**
 * Semester Survival - UI Manager
 * Handles menu transitions, shop renders, achievements lists, and simulated ad timers.
 */
(function() {
    'use strict';

    class UIManager {
        constructor() {
            this.currentTab = 'upgrades';
            this.adCallback = null;
        }

        init(callbacks) {
            this.callbacks = callbacks; // { onStartRun, onResume, onRestart, onResetProgress }
            this.setupMenuBindings();
            this.setupShopBindings();
            this.setupSettingsBindings();
            this.updateMenuStats();
        }

        setupMenuBindings() {
            // Main menu navigation
            document.getElementById('btn-start-run').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('TEMPLATE-4weird-start-screen');
                if (this.callbacks.onStartRun) this.callbacks.onStartRun();
            });

            document.getElementById('btn-open-shop').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.showOverlay('overlay-shop');
                this.renderShop();
            });

            document.getElementById('btn-open-achievements').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.showOverlay('overlay-achievements');
                this.renderAchievements();
            });

            document.getElementById('btn-open-settings').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.showOverlay('overlay-settings');
            });

            // Back/Close bindings
            document.getElementById('btn-close-shop').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('overlay-shop');
                this.updateMenuStats();
            });

            document.getElementById('btn-close-achievements').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('overlay-achievements');
            });

            document.getElementById('btn-close-settings').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('overlay-settings');
            });

            // Pause Overlay Resume / Restart
            document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('TEMPLATE-4weird-pause-screen');
                if (this.callbacks.onResume) this.callbacks.onResume();
            });

            document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('TEMPLATE-4weird-pause-screen');
                if (this.callbacks.onRestart) this.callbacks.onRestart();
            });
        }

        setupShopBindings() {
            // Shop tab selections
            document.getElementById('tab-upgrades').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.currentTab = 'upgrades';
                this.switchShopTab();
            });

            document.getElementById('tab-characters').addEventListener('click', () => {
                window.CampusAudio.playMenu();
                this.currentTab = 'characters';
                this.switchShopTab();
            });
        }

        setupSettingsBindings() {
            const checkSound = document.getElementById('setting-sound');
            const checkPremium = document.getElementById('setting-premium');
            const selectControls = document.getElementById('setting-controls');

            // Synchronize starting checkbox values
            checkSound.checked = !window.CampusAudio.muted;
            checkPremium.checked = window.GameStateStore.data.premiumEnabled;
            
            checkSound.addEventListener('change', (e) => {
                window.CampusAudio.playMenu();
                window.CampusAudio.muted = !e.target.checked;
                if (window.CampusAudio.muted) {
                    window.CampusAudio.stopMusic();
                    document.getElementById('TEMPLATE-4weird-mute-btn').textContent = "🔊 Sound Off";
                } else {
                    window.CampusAudio.resumeMusic();
                    document.getElementById('TEMPLATE-4weird-mute-btn').textContent = "🔊 Sound On";
                }
            });

            // Mute sidebar button listener
            document.getElementById('TEMPLATE-4weird-mute-btn').addEventListener('click', () => {
                const muted = window.CampusAudio.toggleMute();
                checkSound.checked = !muted;
                document.getElementById('TEMPLATE-4weird-mute-btn').textContent = muted ? "🔊 Sound Off" : "🔊 Sound On";
            });

            checkPremium.addEventListener('change', (e) => {
                window.CampusAudio.playMenu();
                window.GameStateStore.data.premiumEnabled = e.target.checked;
                window.GameStateStore.save();
                this.updateMenuStats();
            });

            selectControls.addEventListener('change', (e) => {
                window.CampusAudio.playMenu();
                const zone = document.getElementById('mobile-swipe-zone');
                const btns = document.querySelector('.mobile-buttons-container');
                if (e.target.value === 'swipe') {
                    zone.classList.remove('hidden');
                    btns.classList.add('hidden');
                } else {
                    zone.classList.add('hidden');
                    btns.classList.remove('hidden');
                }
            });

            document.getElementById('btn-reset-progress').addEventListener('click', () => {
                if (confirm("Are you sure you want to reset all academic grades, character skins, and upgrades? This cannot be undone.")) {
                    window.GameStateStore.reset();
                    this.updateMenuStats();
                    this.hideOverlay('overlay-settings');
                    window.Campus3DRenderer.applySkin('fresher');
                    if (this.callbacks.onResetProgress) this.callbacks.onResetProgress();
                }
            });
        }

        updateMenuStats() {
            const data = window.GameStateStore.data;
            document.getElementById('menu-current-semester').textContent = data.currentSemester > 8 ? 'Alumni Endless' : data.currentSemester;
            document.getElementById('menu-standing-gpa').textContent = data.cumulativeGpa.toFixed(2);
            document.getElementById('menu-pocket-money').textContent = data.coins;
            document.getElementById('TEMPLATE-4weird-high-score').textContent = data.stats.highestDistance + 'm';
        }

        switchShopTab() {
            const tabUp = document.getElementById('tab-upgrades');
            const tabChar = document.getElementById('tab-characters');
            const paneUp = document.getElementById('pane-upgrades');
            const paneChar = document.getElementById('pane-characters');

            if (this.currentTab === 'upgrades') {
                tabUp.classList.add('active');
                tabChar.classList.remove('active');
                paneUp.classList.add('active');
                paneChar.classList.remove('active');
            } else {
                tabUp.classList.remove('active');
                tabChar.classList.add('active');
                paneUp.classList.remove('active');
                paneChar.classList.add('active');
            }
            this.renderShop();
        }

        renderShop() {
            const data = window.GameStateStore.data;
            document.getElementById('shop-money-val').textContent = data.coins;

            if (this.currentTab === 'upgrades') {
                const container = document.getElementById('upgrades-list-container');
                container.innerHTML = '';
                
                Object.keys(window.UPGRADES_INFO).forEach(key => {
                    const info = window.UPGRADES_INFO[key];
                    const lvl = data.upgrades[key] || 1;
                    const cost = window.GameStateStore.getUpgradeCost(key);
                    const isMax = cost === -1;

                    const card = document.createElement('div');
                    card.className = 'upgrade-card';
                    card.innerHTML = `
                        <div class="upgrade-header">
                            <span class="upgrade-title">${info.name}</span>
                            <span class="upgrade-level">Lvl ${lvl}/${info.maxLvl}</span>
                        </div>
                        <p class="upgrade-desc">${info.desc}</p>
                        <div class="upgrade-buy-row">
                            <span>Cost: 🪙 ${isMax ? 'MAXED' : cost}</span>
                            <button class="btn-buy" ${isMax || data.coins < cost ? 'disabled' : ''} data-key="${key}">
                                ${isMax ? 'MAX' : 'Upgrade'}
                            </button>
                        </div>
                    `;

                    // Bind click action
                    const btn = card.querySelector('.btn-buy');
                    if (btn && !isMax) {
                        btn.addEventListener('click', (e) => {
                            const abilityKey = e.target.getAttribute('data-key');
                            if (window.GameStateStore.upgradeAbility(abilityKey)) {
                                window.CampusAudio.playPowerUp();
                                this.renderShop();
                            }
                        });
                    }
                    container.appendChild(card);
                });
            } else {
                const container = document.getElementById('characters-list-container');
                container.innerHTML = '';

                Object.keys(window.SKINS_INFO).forEach(key => {
                    const info = window.SKINS_INFO[key];
                    const isUnlocked = data.unlockedSkins.includes(key);
                    const isEquipped = data.currentSkin === key;
                    const cost = info.cost;

                    const card = document.createElement('div');
                    card.className = 'character-card';
                    
                    let buyBtnHtml = '';
                    if (isEquipped) {
                        buyBtnHtml = `<button class="btn-buy" disabled>Equipped</button>`;
                    } else if (isUnlocked) {
                        buyBtnHtml = `<button class="btn-buy select-skin" data-key="${key}">Equip</button>`;
                    } else if (cost === -1) {
                        buyBtnHtml = `<button class="btn-buy" disabled>Pass S8 Boss</button>`;
                    } else {
                        buyBtnHtml = `<button class="btn-buy purchase-skin" ${data.coins < cost ? 'disabled' : ''} data-key="${key}">🪙 ${cost}</button>`;
                    }

                    card.innerHTML = `
                        <div class="char-header">
                            <span class="char-title">${info.emoji} ${info.name}</span>
                        </div>
                        <p class="char-desc">${info.desc}</p>
                        <div class="char-buy-row">
                            ${buyBtnHtml}
                        </div>
                    `;

                    // Bind Select/Purchase actions
                    const btnSelect = card.querySelector('.select-skin');
                    if (btnSelect) {
                        btnSelect.addEventListener('click', (e) => {
                            window.CampusAudio.playMenu();
                            data.currentSkin = e.target.getAttribute('data-key');
                            window.GameStateStore.save();
                            window.Campus3DRenderer.applySkin(data.currentSkin);
                            this.renderShop();
                        });
                    }

                    const btnPurchase = card.querySelector('.purchase-skin');
                    if (btnPurchase) {
                        btnPurchase.addEventListener('click', (e) => {
                            const skinKey = e.target.getAttribute('data-key');
                            if (window.GameStateStore.unlockSkin(skinKey)) {
                                window.CampusAudio.playPowerUp();
                                this.renderShop();
                            }
                        });
                    }

                    container.appendChild(card);
                });
            }
        }

        renderAchievements() {
            const data = window.GameStateStore.data;
            const statsContainer = document.getElementById('stats-list-container');
            const badgesContainer = document.getElementById('badges-grid-container');

            // 1. Render transcript stats list
            statsContainer.innerHTML = `
                <div class="stat-item"><span>Current Standing</span><span class="stat-val">Semester ${data.currentSemester > 8 ? 'Alumni' : data.currentSemester}</span></div>
                <div class="stat-item"><span>Cumulative GPA</span><span class="stat-val">${data.cumulativeGpa.toFixed(2)}</span></div>
                <div class="stat-item"><span>Total Runs</span><span class="stat-val">${data.stats.gamesPlayed}</span></div>
                <div class="stat-item"><span>Total Distance Covered</span><span class="stat-val">${data.stats.totalDistance}m</span></div>
                <div class="stat-item"><span>Longest Single Run</span><span class="stat-val">${data.stats.highestDistance}m</span></div>
                <div class="stat-item"><span>Total Coins Collected</span><span class="stat-val">🪙 ${data.stats.coinsCollected}</span></div>
                <div class="stat-item"><span>CATs Passed</span><span class="stat-val">${data.stats.catsPassed}</span></div>
                <div class="stat-item"><span>Exams Passed</span><span class="stat-val">${data.stats.examsPassed}</span></div>
                <div class="stat-item"><span>Powerups Collected</span><span class="stat-val">${data.stats.powerupsCollected}</span></div>
            `;

            // 2. Render badges list checklist
            badgesContainer.innerHTML = '';
            Object.keys(window.BADGES_INFO).forEach(key => {
                const info = window.BADGES_INFO[key];
                const isUnlocked = data.badges.includes(key);

                const card = document.createElement('div');
                card.className = `badge-card ${isUnlocked ? 'unlocked' : ''}`;
                card.innerHTML = `
                    <div class="badge-icon">${isUnlocked ? '🏆' : '🔒'}</div>
                    <span class="badge-name">${info.name}</span>
                    <span class="badge-desc">${info.desc}</span>
                `;
                badgesContainer.appendChild(card);
            });
        }

        updateHud(gpa, energy, coins, semesterIndex, distance, bossHealth) {
            document.getElementById('hud-semester-title').textContent = semesterIndex > 8 ? 'ALUMNI ENDLESS' : `SEMESTER ${semesterIndex}`;
            document.getElementById('hud-distance').textContent = Math.floor(distance) + 'm';
            document.getElementById('hud-gpa-val').textContent = gpa.toFixed(2);
            document.getElementById('hud-coins').textContent = `🪙 ${coins}`;

            // Scale HUD bars
            const gpaPercent = Math.max(0, Math.min(100, (gpa / 4.0) * 100));
            document.getElementById('hud-gpa-bar').style.width = gpaPercent + '%';

            const energyPercent = Math.max(0, Math.min(100, energy));
            document.getElementById('hud-energy-percent').textContent = Math.floor(energy);
            document.getElementById('hud-energy-bar').style.width = energyPercent + '%';

            // Change colors of GPA bar depending on standing
            const gpaBar = document.getElementById('hud-gpa-bar');
            if (gpa < 2.0) {
                gpaBar.style.background = '#ef4444'; // Red alert
            } else if (gpa < 3.0) {
                gpaBar.style.background = '#fbbf24'; // Warning yellow
            } else {
                gpaBar.style.background = '#10b981'; // Green clear
            }

            // Boss health bar render
            const bossHud = document.getElementById('boss-hud-container');
            if (bossHealth !== null && bossHealth >= 0) {
                bossHud.classList.remove('hidden');
                document.getElementById('boss-health-bar').style.width = bossHealth + '%';
                
                // Specific Boss Label naming
                const bossNames = [
                    'First CAT (Dodge Papers)',
                    'Mid Sem Exam (Quick math)',
                    'Project Presentation (Stress overload)',
                    'Major CAT Week (High speed)',
                    'Industrial Attachment (Dodge interviews)',
                    'Research Proposal (Dodge supervisors)',
                    'Project Defense (Final thesis)',
                    'Final Exam (Avoid failing)'
                ];
                document.getElementById('boss-title').textContent = `BOSS: ${bossNames[(semesterIndex - 1) % 8] || 'Final Exam'}`;
            } else {
                bossHud.classList.add('hidden');
            }
        }

        // Custom fail screen setups
        showFailSupp(gpa, semester, onOptionSelected) {
            window.CampusAudio.playFailSupp();
            document.getElementById('fail-supp-gpa').textContent = gpa.toFixed(2);
            document.getElementById('fail-supp-semester').textContent = semester;

            const mercyBtn = document.getElementById('btn-supp-mercy');
            const data = window.GameStateStore.data;
            mercyBtn.disabled = data.deansMercyCount <= 0;
            document.getElementById('supp-mercy-count').textContent = data.deansMercyCount;

            const payBtn = document.getElementById('btn-supp-pay');
            payBtn.disabled = data.coins < 100;

            this.showOverlay('fail-overlay-supp');

            // Clear old listeners
            const clearAndTrigger = (choice) => {
                this.hideOverlay('fail-overlay-supp');
                onOptionSelected(choice);
            };

            payBtn.onclick = () => clearAndTrigger('pay');
            mercyBtn.onclick = () => clearAndTrigger('mercy');
            document.getElementById('btn-supp-ad').onclick = () => clearAndTrigger('ad');
            document.getElementById('btn-supp-repeat').onclick = () => clearAndTrigger('repeat');
        }

        showFailBurnout(distance, onSelected) {
            window.CampusAudio.playFailBurnout();
            document.getElementById('fail-burnout-dist').textContent = Math.floor(distance) + 'm';
            
            // Random funny fail messages matching burnout
            const msgs = [
                '“You collapsed from stress. You slept for 48 hours straight.”',
                '“Panicked and forgot your exam revision cards.”',
                '“Hungry and late. You missed the entire morning lecture.”'
            ];
            document.getElementById('fail-burnout-msg').textContent = msgs[Math.floor(Math.random() * msgs.length)];
            
            this.showOverlay('fail-overlay-burnout');
            this.bindFailOptions('fail-overlay-burnout', onSelected);
        }

        showFailPortal(coins, onSelected) {
            window.CampusAudio.playFailGlitch();
            document.getElementById('fail-portal-coins').textContent = coins;
            this.showOverlay('fail-overlay-portal');
            this.bindFailOptions('fail-overlay-portal', onSelected);
        }

        showFailIncident(gpa, reason, onSelected) {
            window.CampusAudio.playFailGlitch();
            document.getElementById('fail-incident-gpa').textContent = gpa.toFixed(2);
            
            const msgs = {
                sleeping: '“Caught sleeping in class. GPA dropped instantly.”',
                no_id: '“Denied entry to the exam hall. No Student ID, no access.”',
                jammed: '“Tuckshop printer jammed. Assignment submission failed.”'
            };
            document.getElementById('fail-incident-msg').textContent = msgs[reason] || '“Caught without notes. Lecturer gave a warning.”';
            
            this.showOverlay('fail-overlay-incident');
            this.bindFailOptions('fail-overlay-incident', onSelected);
        }

        bindFailOptions(overlayId, onSelected) {
            const overlay = document.getElementById(overlayId);
            const btnRevive = overlay.querySelector('.btn-revive');
            const btnExit = overlay.querySelector('.btn-fail-exit');

            // Disable revive if player is broke and doesn't have premium
            const broke = window.GameStateStore.data.coins < 50;
            const hasPremium = window.GameStateStore.data.premiumEnabled;
            btnRevive.disabled = broke && !hasPremium;

            btnRevive.onclick = () => {
                window.CampusAudio.playMenu();
                this.hideOverlay(overlayId);
                onSelected('revive');
            };

            btnExit.onclick = () => {
                window.CampusAudio.playMenu();
                this.hideOverlay(overlayId);
                onSelected('exit');
            };
        }

        // Satirical ad simulation overlay timer
        showSimulatedAd(onAdDone) {
            this.adCallback = onAdDone;
            const timerVal = document.getElementById('ad-timer-val');
            const skipBtn = document.getElementById('btn-close-ad');
            const waitLbl = document.getElementById('ad-wait-lbl');
            
            // Satirical university sponsors
            const ads = [
                { title: 'TUCKSHOP SMOKIES', desc: 'Slightly cold, but only 30 coins each! Eat now, think later.', emoji: '🌭' },
                { title: 'RENT A CALCULATOR', desc: 'Need a scientific calculator for CAT 2? Lease from your friend for 10 coins!', emoji: '🧮' },
                { title: 'WI-FI HACKER PRO', desc: 'Tired of portal down errors? Get our Wi-Fi booster antenna today!', emoji: '📶' }
            ];
            
            const randomAd = ads[Math.floor(Math.random() * ads.length)];
            document.getElementById('ad-title').textContent = randomAd.title;
            document.getElementById('ad-desc').textContent = randomAd.desc;
            document.getElementById('ad-emoji').textContent = randomAd.emoji;

            skipBtn.classList.add('hidden');
            waitLbl.classList.remove('hidden');
            this.showOverlay('ad-overlay');

            let secondsLeft = 5;
            timerVal.textContent = secondsLeft + 's';

            const interval = setInterval(() => {
                secondsLeft--;
                timerVal.textContent = secondsLeft + 's';
                
                if (secondsLeft <= 0) {
                    clearInterval(interval);
                    skipBtn.classList.remove('hidden');
                    waitLbl.classList.add('hidden');
                    timerVal.textContent = 'Ready';
                }
            }, 1000);

            skipBtn.onclick = () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('ad-overlay');
                if (this.adCallback) this.adCallback();
            };
        }

        showVictory(cumulativeGpa, distance, coins, catsPassed, badgesCount, skinsCount, isEndless, onVictorySelected) {
            window.CampusAudio.playVictory();
            
            // Cumulate final degree classification
            let degree = 'PASS';
            if (cumulativeGpa >= 3.7) degree = 'FIRST CLASS HONOURS';
            else if (cumulativeGpa >= 3.0) degree = 'SECOND CLASS UPPER DIVISION';
            else if (cumulativeGpa >= 2.5) degree = 'SECOND CLASS LOWER DIVISION';

            // Special Dean's List / Chancellor Badge checks
            if (cumulativeGpa === 4.0) degree = 'CHANCELLOR\'S AWARD';

            document.getElementById('victory-class-text').textContent = degree;
            document.getElementById('vic-gpa').textContent = cumulativeGpa.toFixed(2);
            document.getElementById('vic-dist').textContent = Math.floor(distance) + 'm';
            document.getElementById('vic-coins').textContent = `🪙 ${coins}`;
            document.getElementById('vic-cats').textContent = `${catsPassed}/8`;
            document.getElementById('vic-badges').textContent = `${badgesCount}/18`;
            document.getElementById('vic-skins').textContent = `${skinsCount}/10`;

            this.showOverlay('victory-overlay');

            document.getElementById('btn-victory-endless').onclick = () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('victory-overlay');
                onVictorySelected('endless');
            };

            document.getElementById('btn-victory-menu').onclick = () => {
                window.CampusAudio.playMenu();
                this.hideOverlay('victory-overlay');
                onVictorySelected('menu');
            };
        }

        showOverlay(id) {
            document.getElementById(id).classList.remove('hidden');
        }

        hideOverlay(id) {
            document.getElementById(id).classList.add('hidden');
        }
    }

    // Expose UI manager globally
    window.CampusUI = new UIManager();
})();
