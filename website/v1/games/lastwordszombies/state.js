const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
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
    
    // Clean up UI screens
    document.querySelectorAll('.ui-screen').forEach(s => s.classList.remove('active'));
    
    switch (state) {
      case GameState.MENU:
        document.getElementById('menu-screen').classList.add('active');
        document.getElementById('hud-overlay').classList.add('hidden');
        break;
      case GameState.PLAYING:
        document.getElementById('hud-overlay').classList.remove('hidden');
        break;
      case GameState.PAUSED:
        document.getElementById('pause-screen').classList.add('active');
        break;
      case GameState.GAME_OVER:
        document.getElementById('gameover-screen').classList.add('active');
        document.getElementById('hud-overlay').classList.add('hidden');
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('final-wave').innerText = this.wave;
        document.getElementById('coins-earned').innerText = this.coinsEarnedThisRun;
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
    const fillPercent = this.combo > 1.0 ? (this.comboTimer / this.comboThreshold) * 100 : 0;
    const valSpan = document.getElementById('combo-val');
    valSpan.innerText = this.combo.toFixed(1);
    
    // Animate HUD indicator based on combo multiplier
    if (this.combo >= 3.0) {
      valSpan.style.color = '#ff0055';
    } else if (this.combo >= 2.0) {
      valSpan.style.color = '#00ccff';
    } else {
      valSpan.style.color = '#00ff66';
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
