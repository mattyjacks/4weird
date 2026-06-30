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
    
    // Difficulty Settings
    this.difficulty = 'normal';
    this.difficultyMultiplier = 1.0;
    this.selectedLevel = 'hallway';
    this.waveWords = new Set();
    
    // Settings and Customizations (Load from localStorage)
    this.coins = parseInt(localStorage.getItem('gg_coins') || '0', 10);
    this.sfxVolume = parseFloat(localStorage.getItem('gg_sfx_vol') || '0.8');
    this.musicVolume = parseFloat(localStorage.getItem('gg_music_vol') || '0.5');
    this.ultraParticles = localStorage.getItem('gg_ultra_particles') !== 'false';
    
    // Equipped Upgrades
    this.equippedBlood = localStorage.getItem('gg_eq_blood') || 'default';
    this.equippedFont = localStorage.getItem('gg_eq_font') || 'default';
    this.equippedMusic = localStorage.getItem('gg_eq_music') || 'default';
    
    // Owned items list (JSON string)
    const ownedDefaults = ['default'];
    this.ownedItems = JSON.parse(localStorage.getItem('gg_owned') || JSON.stringify(ownedDefaults));
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
    document.getElementById('wave-cleared-screen').classList.add('hidden');
    document.getElementById('game-hud').classList.add('hidden');
    
    const speedBtn = document.getElementById('game-speed-btn');
    if (speedBtn) speedBtn.style.display = 'none';
    
    switch (state) {
      case GameState.MENU:
        document.getElementById('TEMPLATE-4weird-start-screen').classList.remove('hidden');
        break;
      case GameState.PLAYING:
        document.getElementById('game-hud').classList.remove('hidden');
        if (speedBtn) speedBtn.style.display = 'flex';
        break;
      case GameState.PAUSED:
        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
        break;
      case GameState.GLOSSARY:
        document.getElementById('cleared-wave-num').innerText = this.wave;
        document.getElementById('wave-cleared-screen').classList.remove('hidden');
        break;
      case GameState.GAME_OVER:
        const screenEl = document.getElementById('TEMPLATE-4weird-game-over-screen');
        if (screenEl) screenEl.classList.remove('hidden');
        
        const scoreValEl = document.getElementById('TEMPLATE-4weird-final-score-val');
        if (scoreValEl) scoreValEl.innerText = this.score;
        
        // Update high score!
        const savedHighScore = parseInt(localStorage.getItem('gg_high_score') || '0', 10);
        let finalHighScore = savedHighScore;
        if (this.score > savedHighScore) {
            localStorage.setItem('gg_high_score', this.score);
            finalHighScore = this.score;
        }
        
        const hsEl1 = document.getElementById('TEMPLATE-4weird-high-score');
        const hsEl2 = document.getElementById('TEMPLATE-4weird-gameover-highscore');
        if (hsEl1) hsEl1.innerText = finalHighScore;
        if (hsEl2) hsEl2.innerText = finalHighScore;
        
        const coinsEl = document.getElementById('coins-earned');
        if (coinsEl) coinsEl.innerText = this.coinsEarnedThisRun;
        break;
    }
  }

  addScore(points) {
    const earned = Math.floor(points * this.combo);
    this.score += earned;
    document.getElementById('score-val').innerText = this.score;
    
    // Increment combo
    this.combo = Math.min(5.0, parseFloat((this.combo + 0.1).toFixed(1)));
    this.comboTimer = this.comboThreshold;
    this.updateComboHUD();
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
    localStorage.setItem('gg_coins', this.coins);
    
    const storeCoinsSpan = document.getElementById('store-coins');
    if (storeCoinsSpan) storeCoinsSpan.innerText = this.coins;
  }

  saveSettings() {
    localStorage.setItem('gg_sfx_vol', this.sfxVolume);
    localStorage.setItem('gg_music_vol', this.musicVolume);
    localStorage.setItem('gg_ultra_particles', this.ultraParticles);
  }

  buyItem(itemId, price) {
    if (this.coins >= price && !this.ownedItems.includes(itemId)) {
      this.coins -= price;
      localStorage.setItem('gg_coins', this.coins);
      
      this.ownedItems.push(itemId);
      localStorage.setItem('gg_owned', JSON.stringify(this.ownedItems));
      return true;
    }
    return false;
  }

  equipItem(category, itemId) {
    if (!this.ownedItems.includes(itemId)) return false;
    
    if (category === 'blood') {
      this.equippedBlood = itemId;
      localStorage.setItem('gg_eq_blood', itemId);
    } else if (category === 'fonts') {
      this.equippedFont = itemId;
      localStorage.setItem('gg_eq_font', itemId);
    } else if (category === 'music') {
      this.equippedMusic = itemId;
      localStorage.setItem('gg_eq_music', itemId);
    }
    return true;
  }
}
