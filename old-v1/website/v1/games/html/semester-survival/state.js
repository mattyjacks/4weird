/**
 * Semester Survival - Game State Manager
 * Tracks grades, unlocks, stats, upgrades, and saves progress to localStorage.
 */
(function() {
    'use strict';

    const SAVE_KEY = '4weird_semester_survival_save_v1';

    const DEFAULT_STATE = {
        currentSemester: 1,
        cumulativeGpa: 4.00,
        coins: 0,
        gems: 0,
        currentSkin: 'fresher',
        unlockedSkins: ['fresher'],
        premiumEnabled: false,
        deansMercyCount: 0,
        upgrades: {
            magnet: 1,
            shield: 1,
            doubleCoins: 1,
            headStart: 1,
            scoreMultiplier: 1,
            coffeeDuration: 1,
            helbBonus: 1
        },
        stats: {
            totalDistance: 0,
            highestDistance: 0,
            gamesPlayed: 0,
            coinsCollected: 0,
            gemsCollected: 0,
            assignmentsSurvived: 0,
            catsPassed: 0,
            examsPassed: 0,
            powerupsCollected: 0,
            timeStarted: Date.now()
        },
        badges: []
    };

    const SKINS_INFO = {
        fresher: { name: 'The Fresher', cost: 0, emoji: '👶', desc: 'Fresh eyes, empty wallet. Standard speed.' },
        serious: { name: 'The Serious Student', cost: 200, emoji: '🤓', desc: 'GPA increases 15% faster.' },
        lastminute: { name: 'The Last Minute Reader', cost: 400, emoji: '⏳', desc: 'Invincible for 5s after hitting obstacles.' },
        nightcoder: { name: 'The Night Coder', cost: 600, emoji: '💻', desc: 'Shield starts at 150% capacity.' },
        groupleader: { name: 'The Group Leader', cost: 800, emoji: '🗣️', desc: 'Permanent small coin magnet.' },
        classrep: { name: 'The Class Representative', cost: 1000, emoji: '📢', desc: '10% slower obstacle speed.' },
        genius: { name: 'The Genius', cost: 1500, emoji: '🧠', desc: 'Notes restore 10% energy.' },
        memelord: { name: 'The Meme Lord', cost: 2000, emoji: '🤡', desc: 'Double coins, but GPA decays slightly faster.' },
        researcher: { name: 'The Researcher', cost: 2500, emoji: '🔬', desc: 'Power-ups last 30% longer.' },
        graduate: { name: 'The Graduate', cost: -1, emoji: '🎓', desc: 'Unlocked upon graduation. The ultimate survivor.' }
    };

    const UPGRADES_INFO = {
        magnet: { name: 'Coin Magnet', baseCost: 50, costStep: 45, maxLvl: 10, desc: 'Pulls coins from adjacent lanes.' },
        shield: { name: 'Academic Shield', baseCost: 60, costStep: 50, maxLvl: 10, desc: 'Absorbs exam errors. Starts with more shields.' },
        doubleCoins: { name: 'Double Coins', baseCost: 80, costStep: 70, maxLvl: 10, desc: 'Chance to double collected money.' },
        headStart: { name: 'Head Start', baseCost: 100, costStep: 90, maxLvl: 10, desc: 'Start runs at further distances.' },
        scoreMultiplier: { name: 'GPA Multiplier', baseCost: 75, costStep: 60, maxLvl: 10, desc: 'Increases GPA gain rate.' },
        coffeeDuration: { name: 'Coffee Duration', baseCost: 50, costStep: 40, maxLvl: 10, desc: 'Keeps coffee energy boost active longer.' },
        helbBonus: { name: 'HELB Bonus', baseCost: 90, costStep: 80, maxLvl: 10, desc: 'Disbursements grant much larger coin gains.' }
    };

    const BADGES_INFO = {
        fresher: { name: 'Fresher', desc: 'Enroll in university. Complete S1.' },
        classrep: { name: 'Class Representative', desc: 'Survive group work drama in S3.' },
        survival: { name: 'Assignment Survivor', desc: 'Submit 15 assignments in runs.' },
        destroyer: { name: 'CAT Destroyer', desc: 'Ace 5 CAT bosses.' },
        hero: { name: 'Group Work Hero', desc: 'Complete Semester 4.' },
        night: { name: 'Night Reader', desc: 'Collect 20 coffee powerups.' },
        coffee: { name: 'Coffee Addict', desc: 'Keep coffee speed boost active 30s.' },
        library: { name: 'Library Legend', desc: 'Use 5 library cards.' },
        research: { name: 'Research Master', desc: 'Complete S6 research proposal.' },
        internship: { name: 'Internship Champion', desc: 'Survive S5 attachment boss.' },
        helb: { name: 'HELB Millionaire', desc: 'Collect 1000 total coins.' },
        deans: { name: 'Deans List', desc: 'Finish any semester with GPA 4.0.' },
        straighta: { name: 'Straight A Student', desc: 'Finish 3 semesters with GPA > 3.7.' },
        perfect: { name: 'Perfect Semester', desc: 'Dodge all obstacles in one semester.' },
        gradstar: { name: 'Graduation Star', desc: 'Graduate from university.' },
        chancellor: { name: 'Chancellors Award', desc: 'Finish S8 with cumulative GPA 4.0.' },
        legend: { name: 'Campus Legend', desc: 'Cover 10,000m total distance.' },
        attendance: { name: 'Attendance Survivor', desc: 'Graduate with GPA exactly 2.0.' }
    };

    class GameState {
        constructor() {
            this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
            this.load();
        }

        load() {
            try {
                const stored = localStorage.getItem(SAVE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Deep copy structures to prevent missing upgrades/stats in old saves
                    this.data = Object.assign({}, DEFAULT_STATE, parsed);
                    this.data.upgrades = Object.assign({}, DEFAULT_STATE.upgrades, parsed.upgrades);
                    this.data.stats = Object.assign({}, DEFAULT_STATE.stats, parsed.stats);
                    this.data.badges = parsed.badges || [];
                }
            } catch (e) {
                console.error('Failed to load save state:', e);
            }
        }

        save() {
            try {
                localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
            } catch (e) {
                console.error('Failed to write save state:', e);
            }
        }

        reset() {
            this.data = JSON.parse(JSON.stringify(DEFAULT_STATE));
            this.data.stats.timeStarted = Date.now();
            this.save();
        }

        unlockSkin(skinKey) {
            const cost = SKINS_INFO[skinKey].cost;
            if (cost >= 0 && this.data.coins >= cost && !this.data.unlockedSkins.includes(skinKey)) {
                this.data.coins -= cost;
                this.data.unlockedSkins.push(skinKey);
                this.save();
                return true;
            }
            return false;
        }

        upgradeAbility(abilityKey) {
            const currentLvl = this.data.upgrades[abilityKey] || 1;
            const info = UPGRADES_INFO[abilityKey];
            if (!info || currentLvl >= info.maxLvl) return false;

            const cost = info.baseCost + (currentLvl - 1) * info.costStep;
            if (this.data.coins >= cost) {
                this.data.coins -= cost;
                this.data.upgrades[abilityKey] = currentLvl + 1;
                this.save();
                return true;
            }
            return false;
        }

        getUpgradeCost(abilityKey) {
            const currentLvl = this.data.upgrades[abilityKey] || 1;
            const info = UPGRADES_INFO[abilityKey];
            if (!info || currentLvl >= info.maxLvl) return -1;
            return info.baseCost + (currentLvl - 1) * info.costStep;
        }

        awardBadge(badgeKey) {
            if (!this.data.badges.includes(badgeKey)) {
                this.data.badges.push(badgeKey);
                this.save();
                return true;
            }
            return false;
        }

        addCoins(amount) {
            let actualAmount = amount;
            if (this.data.premiumEnabled) {
                actualAmount *= 2; // Premium 2x multiplier
            }
            this.data.coins += actualAmount;
            this.data.stats.coinsCollected += actualAmount;
            this.save();
        }

        addDistance(amount) {
            this.data.stats.totalDistance += amount;
            if (amount > this.data.stats.highestDistance) {
                this.data.stats.highestDistance = amount;
            }
            this.save();
        }
        
        setGpa(gpa) {
            this.data.cumulativeGpa = parseFloat(gpa.toFixed(2));
            this.save();
        }
    }

    // Expose classes & info globally
    window.GameStateStore = new GameState();
    window.SKINS_INFO = SKINS_INFO;
    window.UPGRADES_INFO = UPGRADES_INFO;
    window.BADGES_INFO = BADGES_INFO;
})();
