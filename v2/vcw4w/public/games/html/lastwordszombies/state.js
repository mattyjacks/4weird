// ==========================================
// 1. GAME STATE MANAGER
// ==========================================
const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  GLOSSARY: 'glossary'
};

class StateManager {
  constructor() {
    this.currentState = GameState.MENU;
    
    // Core game metrics
    this.score = 0;
    this.wave = 1;
    this.zombiesInWave = 0;
    this.zombiesKilled = 0;
    this.zombiesActive = 0;
    this.health = 100;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.comboThreshold = 2.5; // seconds to keep combo
    this.coinsEarnedThisRun = 0;

    // --- AWESOME: run stats + powerups ---
    this.kills = 0;
    this.bestCombo = 1.0;
    this.maxWave = 1;
    this.bossesKilled = 0;
    this.runStartEpoch = 0;
    this.powerups = { bomb: 1, freeze: 1, shield: 1 }; // one of each per run to start
    this.freezeUntil = 0;
    this.bestWPM = parseInt(this.safeGet('gg_best_wpm', '0'), 10) || 0;
    this.bestStreak = parseInt(this.safeGet('gg_best_streak', '0'), 10) || 0;
    
    // Difficulty Settings
    this.difficulty = 'normal';
    this.difficultyMultiplier = 1.0;
    this.selectedLevel = 'hallway';
    this.waveWords = new Set();
    
    // Settings and Customizations (private-mode-safe storage reads)
    this.coins = parseInt(this.safeGet('gg_coins', '0'), 10) || 0;
    this.sfxVolume = this.clamp01(parseFloat(this.safeGet('gg_sfx_vol', '0.8')));
    this.musicVolume = this.clamp01(parseFloat(this.safeGet('gg_music_vol', '0.5')));
    this.ultraParticles = this.safeGet('gg_ultra_particles', 'true') !== 'false';
    this.screenShake = this.safeGet('gg_screen_shake', 'true') !== 'false';

    // Equipped Upgrades
    this.equippedBlood = this.safeGet('gg_eq_blood', 'default');
    this.equippedFont = this.safeGet('gg_eq_font', 'default');
    this.equippedMusic = this.safeGet('gg_eq_music', 'default');

    // Owned items list (JSON string)
    const ownedDefaults = ['default'];
    this.ownedItems = this.safeParse('gg_owned', ownedDefaults);
    if (!Array.isArray(this.ownedItems) || !this.ownedItems.includes('default')) {
      this.ownedItems = ownedDefaults.slice();
    }
  }

  // --- Private-mode-safe storage (Safari/Firefox containers can throw) ---
  safeGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) { /* storage unavailable — play session-only */ }
  }

  safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) { /* noop */ }
  }

  safeParse(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  clamp01(v) {
    const n = Number(v);
    if (!isFinite(n)) return 0.8;
    return Math.min(1, Math.max(0, n));
  }

  // Returning-player chips on the start screen + sidebar high score
  updateMenuStats() {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };
    const hs = parseInt(this.safeGet('gg_high_score', '0'), 10) || 0;
    set('menu-high-score', hs);
    set('menu-best-wpm', this.bestWPM || 0);
    set('menu-coins', this.coins || 0);
    set('TEMPLATE-4weird-high-score', hs);
    set('store-coins', this.coins);
    const wrap = document.getElementById('menu-stats');
    if (wrap && (hs > 0 || (this.coins || 0) > 0 || (this.bestWPM || 0) > 0)) {
      wrap.style.display = 'flex';
    }
  }

  resetProgress() {
    ['gg_coins', 'gg_high_score', 'gg_best_wpm', 'gg_best_streak', 'gg_runs', 'gg_total_kills',
     'gg_owned', 'gg_eq_blood', 'gg_eq_font', 'gg_eq_music',
     'gg_sfx_vol', 'gg_music_vol', 'gg_ultra_particles', 'gg_screen_shake'
    ].forEach(k => this.safeRemove(k));
    this.coins = 0;
    this.coinsEarnedThisRun = 0;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.5;
    this.ultraParticles = true;
    this.screenShake = true;
    this.equippedBlood = 'default';
    this.equippedFont = 'default';
    this.equippedMusic = 'default';
    this.ownedItems = ['default'];
    this.bestWPM = 0;
    this.bestStreak = 0;
    this.saveSettings();
    this.updateMenuStats();
  }

  setGameState(state) {
    this.currentState = state;
    
    // Clean up UI screens - template screens
    document.getElementById('TEMPLATE-4weird-loading-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    document.getElementById('custom-store-screen').classList.add('hidden');
    document.getElementById('custom-settings-screen').classList.add('hidden');
    document.getElementById('wave-cleared-screen').style.display = 'none';
    document.getElementById('game-hud').classList.add('hidden');
    
    const speedBtn = document.getElementById('game-speed-btn');
    if (speedBtn) speedBtn.style.display = 'none';
    const powerBar = document.getElementById('powerup-bar');
    if (powerBar) powerBar.classList.add('hidden');
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.classList.add('hidden');

    switch (state) {
      case GameState.MENU:
        document.getElementById('TEMPLATE-4weird-start-screen').classList.remove('hidden');
        this.updateMenuStats();
        break;
      case GameState.PLAYING:
        document.getElementById('game-hud').classList.remove('hidden');
        if (speedBtn) speedBtn.style.display = 'flex';
        if (powerBar) powerBar.classList.remove('hidden');
        if (crosshair) crosshair.classList.remove('hidden');
        break;
      case GameState.PAUSED:
        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
        break;
      case GameState.GLOSSARY:
        document.getElementById('cleared-wave-num').innerText = this.wave;
        document.getElementById('wave-cleared-screen').style.display = 'flex';
        break;
      case GameState.GAME_OVER:
        const screenEl = document.getElementById('TEMPLATE-4weird-game-over-screen');
        if (screenEl) screenEl.classList.remove('hidden');
        
        const scoreValEl = document.getElementById('TEMPLATE-4weird-final-score-val');
        if (scoreValEl) scoreValEl.innerText = this.score;
        
        // Update high score!
        const savedHighScore = parseInt(this.safeGet('gg_high_score', '0'), 10) || 0;
        let finalHighScore = savedHighScore;
        if (this.score > savedHighScore) {
            this.safeSet('gg_high_score', String(this.score));
            finalHighScore = this.score;
        }
        
        const hsEl1 = document.getElementById('TEMPLATE-4weird-high-score');
        const hsEl2 = document.getElementById('TEMPLATE-4weird-gameover-highscore');
        if (hsEl1) hsEl1.innerText = finalHighScore;
        if (hsEl2) hsEl2.innerText = finalHighScore;
        break;
    }
  }

  addScore(points) {
    const earned = Math.floor(points * this.combo);
    this.score += earned;
    document.getElementById('score-val').innerText = this.score;

    // Score pop animation on the HUD
    const scoreEl = document.getElementById('score-val');
    if (scoreEl) {
      scoreEl.classList.remove('score-pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-pop');
    }

    // Increment combo
    this.combo = Math.min(5.0, parseFloat((this.combo + 0.1).toFixed(1)));
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = this.comboThreshold;
    this.updateComboHUD();
  }

  registerKill(zombie) {
    this.kills++;
    this.maxWave = Math.max(this.maxWave, this.wave);
    if (zombie && zombie.ztype === 'boss') this.bossesKilled++;
    // Powerup trickle: every 12 kills earns a random powerup (cap 3 each)
    if (this.kills % 12 === 0) {
      const keys = ['bomb', 'freeze', 'shield'];
      const k = keys[Math.floor(Math.random() * keys.length)];
      if (this.powerups[k] < 3) {
        this.powerups[k]++;
        if (window.game) window.game.announce(`${k.toUpperCase()} +1`, k === 'bomb' ? '#ff5500' : k === 'freeze' ? '#00f2fe' : '#00ff66');
        this.updatePowerupHUD();
      }
    }
  }

  startRun() {
    this.kills = 0;
    this.bestCombo = 1.0;
    this.maxWave = 1;
    this.bossesKilled = 0;
    this.runStartEpoch = Date.now();
    this.powerups = { bomb: 1, freeze: 1, shield: 1 };
    this.freezeUntil = 0;
    this.updatePowerupHUD();
  }

  usePowerup(kind) {
    if (!this.powerups[kind] || this.powerups[kind] <= 0) return false;
    if (this.currentState !== GameState.PLAYING) return false;
    this.powerups[kind]--;
    this.updatePowerupHUD();
    return true;
  }

  updatePowerupHUD() {
    ['bomb', 'freeze', 'shield'].forEach(k => {
      const el = document.getElementById('powerup-count-' + k);
      if (el) el.innerText = this.powerups[k] || 0;
      const btn = document.getElementById('powerup-btn-' + k);
      if (btn) btn.classList.toggle('depleted', !(this.powerups[k] > 0));
    });
  }

  isFrozen() {
    return performance.now() < this.freezeUntil;
  }

  recordRunEnd(wpm, accuracy, streak) {
    let newBest = false;
    if (wpm > this.bestWPM) { this.bestWPM = wpm; this.safeSet('gg_best_wpm', String(wpm)); newBest = true; }
    if (streak > this.bestStreak) { this.bestStreak = streak; this.safeSet('gg_best_streak', String(streak)); }
    const games = (parseInt(this.safeGet('gg_runs', '0'), 10) || 0) + 1;
    this.safeSet('gg_runs', String(games));
    const totalKills = (parseInt(this.safeGet('gg_total_kills', '0'), 10) || 0) + this.kills;
    this.safeSet('gg_total_kills', String(totalKills));
    this.updateMenuStats();
    return newBest;
  }

  resetCombo() {
    this.combo = 1.0;
    this.comboTimer = 0;
    this.updateComboHUD();
  }

  updateCombo(dt) {
    if (this.currentState !== GameState.PLAYING) return;
    if (this.combo > 1.0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.resetCombo();
      }
    }
  }

  updateComboHUD() {
    const valSpan = document.getElementById('combo-val');
    if (valSpan) {
      valSpan.innerText = this.combo.toFixed(1);
      
      // Animate HUD indicator based on combo multiplier
      if (this.combo >= 3.0) {
        valSpan.style.color = '#ff0077';
      } else if (this.combo >= 2.0) {
        valSpan.style.color = '#00f2fe';
      } else {
        valSpan.style.color = '#00ff66';
      }
    }
  }

  addCoins(amount) {
    this.coins += amount;
    this.coinsEarnedThisRun += amount;
    this.safeSet('gg_coins', String(this.coins));
    this.updateMenuStats();
  }

  saveSettings() {
    this.safeSet('gg_sfx_vol', String(this.sfxVolume));
    this.safeSet('gg_music_vol', String(this.musicVolume));
    this.safeSet('gg_ultra_particles', String(this.ultraParticles));
    this.safeSet('gg_screen_shake', String(this.screenShake));
  }

  buyItem(itemId, price) {
    const cost = Number(price) || 0;
    if (this.coins >= cost && !this.ownedItems.includes(itemId)) {
      this.coins -= cost;
      this.safeSet('gg_coins', String(this.coins));

      this.ownedItems.push(itemId);
      this.safeSet('gg_owned', JSON.stringify(this.ownedItems));
      this.updateMenuStats();
      return true;
    }
    return false;
  }

  equipItem(category, itemId) {
    if (!this.ownedItems.includes(itemId)) return false;

    if (category === 'blood') {
      this.equippedBlood = itemId;
      this.safeSet('gg_eq_blood', itemId);
    } else if (category === 'fonts') {
      this.equippedFont = itemId;
      this.safeSet('gg_eq_font', itemId);
    } else if (category === 'music') {
      this.equippedMusic = itemId;
      this.safeSet('gg_eq_music', itemId);
    }
    return true;
  }
}
