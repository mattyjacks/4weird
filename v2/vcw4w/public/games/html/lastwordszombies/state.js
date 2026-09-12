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
    // Pause-aware clock bookkeeping. game.js resumes via direct assignment
    // (currentState = PLAYING, bypassing setGameState), so currentState is
    // an accessor: every transition — setter or setGameState — tracks pause
    // time. TypingController.getWPM() subtracts it via getPausedMs().
    this._currentState = GameState.MENU;
    this.runPausedMs = 0;
    this._pauseBeganAt = 0;
    const self = this;
    Object.defineProperty(this, 'currentState', {
      configurable: true,
      enumerable: true,
      get() { return self._currentState; },
      set(v) { self._trackStateClock(v); self._currentState = v; }
    });
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
    this.bestWPM = this.clampInt0(parseInt(this.safeGet('gg_best_wpm', '0'), 10));
    this.bestStreak = this.clampInt0(parseInt(this.safeGet('gg_best_streak', '0'), 10));
    
    // Difficulty Settings
    this.difficulty = 'normal';
    this.difficultyMultiplier = 1.0;
    this.selectedLevel = 'hallway';
    this.waveWords = new Set();
    
    // Settings and Customizations (private-mode-safe storage reads)
    // Negative-coin / NaN-volume corruption self-heals here (clamped + persisted).
    this.coins = this.clampInt0(parseInt(this.safeGet('gg_coins', '0'), 10));
    this.sfxVolume = this.clamp01(parseFloat(this.safeGet('gg_sfx_vol', '0.8')), 0.8);
    this.musicVolume = this.clamp01(parseFloat(this.safeGet('gg_music_vol', '0.5')), 0.5);
    this.ultraParticles = this.safeGet('gg_ultra_particles', 'true') !== 'false';
    this.screenShake = this.safeGet('gg_screen_shake', 'true') !== 'false';

    // Equipped Upgrades
    this.equippedBlood = this.safeGet('gg_eq_blood', 'default');
    this.equippedFont = this.safeGet('gg_eq_font', 'default');
    this.equippedMusic = this.safeGet('gg_eq_music', 'default');

    // Owned items list (JSON string). Non-array / non-string entries self-heal
    // to ['default'] (e.g. corrupted non-JSON falls back via safeParse).
    const ownedDefaults = ['default'];
    this.ownedItems = this.safeParse('gg_owned', ownedDefaults);
    if (!Array.isArray(this.ownedItems)) {
      this.ownedItems = ownedDefaults.slice();
    } else {
      this.ownedItems = this.ownedItems.filter(x => typeof x === 'string' && x.length > 0);
      if (!this.ownedItems.includes('default')) this.ownedItems.unshift('default');
    }
    // Persist healed coins so corruption does not reappear next load.
    if (String(this.safeGet('gg_coins', '0')) !== String(this.coins)) {
      this.safeSet('gg_coins', String(this.coins));
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
    } catch (e) { /* storage unavailable - play session-only */ }
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

  clamp01(v, fallback) {
    const n = Number(v);
    if (!isFinite(n)) return (isFinite(Number(fallback)) ? Number(fallback) : 0.8);
    return Math.min(1, Math.max(0, n));
  }

  clampInt0(v) {
    const n = Number(v);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  }

  // Active-clock helpers: WPM must exclude PAUSED/GLOSSARY/menu time.
  // _trackStateClock runs on EVERY currentState assignment (including
  // game.js's direct-assignment resume that bypasses setGameState).
  // Freeze is shifted forward on resume so isFrozen() (performance.now
  // based) does not tick down while paused.
  _nowMs() {
    try {
      if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
        return performance.now();
      }
    } catch (e) { /* fall through to Date.now */ }
    return Date.now();
  }

  _trackStateClock(next) {
    try {
      const prev = this._currentState;
      if (prev === next) return;
      if (prev === GameState.PLAYING && next !== GameState.PLAYING) {
        if (!this._pauseBeganAt) this._pauseBeganAt = this._nowMs();
      } else if (next === GameState.PLAYING && prev !== GameState.PLAYING) {
        if (this._pauseBeganAt) {
          const pausedFor = Math.max(0, this._nowMs() - this._pauseBeganAt);
          this.runPausedMs = (Number(this.runPausedMs) || 0) + pausedFor;
          if (Number(this.freezeUntil) > 0) this.freezeUntil += pausedFor;
          this._pauseBeganAt = 0;
        }
      }
    } catch (e) { /* clock bookkeeping must never break state transitions */ }
  }

  // Total ms excluded from WPM since the last startRun (settled pauses +
  // the ongoing non-PLAYING stretch, if any). TypingController reads this.
  getPausedMs() {
    try {
      let total = Number(this.runPausedMs) || 0;
      if (this._currentState !== GameState.PLAYING && this._pauseBeganAt) {
        total += Math.max(0, this._nowMs() - this._pauseBeganAt);
      }
      return total < 0 || !isFinite(total) ? 0 : total;
    } catch (e) {
      return 0;
    }
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
    // Assignment first so the pause-clock accessor records the transition
    // even if DOM work below throws on a partial page.
    this.currentState = state;

    // Null-safe DOM helpers: state transitions must never throw when a
    // screen element is absent (partial DOM / test harness).
    const byId = (id) => {
      try { return document.getElementById(id); } catch (e) { return null; }
    };
    const hide = (id) => { const el = byId(id); if (el && el.classList) el.classList.add('hidden'); };
    const show = (id) => { const el = byId(id); if (el && el.classList) el.classList.remove('hidden'); };

    // Clean up UI screens - template screens
    hide('TEMPLATE-4weird-loading-screen');
    hide('TEMPLATE-4weird-start-screen');
    hide('TEMPLATE-4weird-pause-screen');
    hide('TEMPLATE-4weird-game-over-screen');
    hide('custom-store-screen');
    hide('custom-settings-screen');
    const cleared = byId('wave-cleared-screen');
    if (cleared && cleared.style) cleared.style.display = 'none';
    hide('game-hud');
    
    const speedBtn = byId('game-speed-btn');
    if (speedBtn && speedBtn.style) speedBtn.style.display = 'none';
    const powerBar = byId('powerup-bar');
    if (powerBar && powerBar.classList) powerBar.classList.add('hidden');
    const crosshair = byId('crosshair');
    if (crosshair && crosshair.classList) crosshair.classList.add('hidden');

    switch (state) {
      case GameState.MENU:
        show('TEMPLATE-4weird-start-screen');
        this.updateMenuStats();
        break;
      case GameState.PLAYING:
        show('game-hud');
        if (speedBtn) speedBtn.style.display = 'flex';
        if (powerBar) powerBar.classList.remove('hidden');
        if (crosshair) crosshair.classList.remove('hidden');
        break;
      case GameState.PAUSED:
        show('game-hud');
        show('TEMPLATE-4weird-pause-screen');
        break;
      case GameState.GLOSSARY: {
        const waveEl = byId('cleared-wave-num');
        if (waveEl) waveEl.innerText = this.wave;
        const waveScreen = byId('wave-cleared-screen');
        if (waveScreen && waveScreen.style) waveScreen.style.display = 'flex';
        break;
      }
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
    const base = Number(points);
    const earned = Math.floor((isFinite(base) ? base : 0) * (isFinite(Number(this.combo)) ? Number(this.combo) : 1));
    this.score = (Number(this.score) || 0) + earned;
    // Clamp defensively: external writers (miss penalty in game.js) also
    // touch combo, so re-assert the [1.0, 5.0] invariant before stepping.
    let c = Number(this.combo);
    if (!isFinite(c)) c = 1.0;
    c = Math.min(5.0, Math.max(1.0, c));
    this.combo = Math.min(5.0, parseFloat((c + 0.1).toFixed(1)));
    this.bestCombo = Math.max(Number(this.bestCombo) || 1.0, this.combo);
    this.comboTimer = this.comboThreshold;
    try {
      const scoreVal = document.getElementById('score-val');
      if (scoreVal) scoreVal.innerText = this.score;
    } catch (e) { /* HUD optional */ }

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
    this.maxWave = Math.max(Number(this.maxWave) || 1, Number(this.wave) || 1);
    if (zombie && zombie.ztype === 'boss') this.bossesKilled++;
    // Powerup trickle: every 12 kills earns a random powerup (cap 3 each).
    // HUD re-syncs on every mutation (increment); at-cap kills mutate
    // nothing so no sync is needed.
    if (!this.powerups || typeof this.powerups !== 'object') {
      this.powerups = { bomb: 0, freeze: 0, shield: 0 };
    }
    if (this.kills % 12 === 0) {
      const keys = ['bomb', 'freeze', 'shield'];
      const k = keys[Math.floor(Math.random() * keys.length)];
      const cur = Math.floor(Number(this.powerups[k]));
      const safeCur = (!isFinite(cur) || cur < 0) ? 0 : cur;
      if (safeCur < 3) {
        this.powerups[k] = safeCur + 1;
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
    // Fresh active clock for the new run (WPM excludes future pauses).
    this.runPausedMs = 0;
    this._pauseBeganAt = 0;
    this.updatePowerupHUD();
  }

  usePowerup(kind) {
    if (kind !== 'bomb' && kind !== 'freeze' && kind !== 'shield') return false;
    if (!this.powerups || typeof this.powerups[kind] !== 'number' || !(this.powerups[kind] > 0)) return false;
    if (this.currentState !== GameState.PLAYING) return false;
    this.powerups[kind] = Math.max(0, Math.floor(this.powerups[kind]) - 1);
    this.updatePowerupHUD();
    return true;
  }

  updatePowerupHUD() {
    if (!this.powerups || typeof this.powerups !== 'object') {
      this.powerups = { bomb: 0, freeze: 0, shield: 0 };
    }
    ['bomb', 'freeze', 'shield'].forEach(k => {
      let n = Math.floor(Number(this.powerups[k]));
      if (!isFinite(n) || n < 0) n = 0;
      this.powerups[k] = n;
      let el = null;
      let btn = null;
      try {
        el = document.getElementById('powerup-count-' + k);
        btn = document.getElementById('powerup-btn-' + k);
      } catch (e) { /* HUD optional */ }
      if (el) el.innerText = n;
      if (btn && btn.classList) btn.classList.toggle('depleted', !(n > 0));
    });
  }

  isFrozen() {
    try {
      const until = Number(this.freezeUntil);
      if (!isFinite(until) || until <= 0) return false;
      return this._nowMs() < until;
    } catch (e) {
      return false;
    }
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
    // Self-heal a stray combo (e.g. a bad external write) to the floor.
    if (!isFinite(Number(this.combo)) || Number(this.combo) < 1.0) {
      this.combo = 1.0;
      this.comboTimer = 0;
      this.updateComboHUD();
      return;
    }
    if (this.combo > 1.0) {
      const step = Number(dt);
      this.comboTimer -= (isFinite(step) ? step : 0);
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
    if (typeof itemId !== 'string' || itemId.length === 0) return false;
    // Negative/NaN prices must never credit coins: floor to a sane cost.
    let cost = Number(price);
    if (!isFinite(cost) || cost < 0) cost = 0;
    cost = Math.floor(cost);
    if (!Array.isArray(this.ownedItems)) this.ownedItems = ['default'];
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
    if (typeof itemId !== 'string' || itemId.length === 0) return false;
    if (!Array.isArray(this.ownedItems) || !this.ownedItems.includes(itemId)) return false;

    if (category === 'blood') {
      this.equippedBlood = itemId;
      this.safeSet('gg_eq_blood', itemId);
    } else if (category === 'fonts') {
      this.equippedFont = itemId;
      this.safeSet('gg_eq_font', itemId);
    } else if (category === 'music') {
      this.equippedMusic = itemId;
      this.safeSet('gg_eq_music', itemId);
    } else {
      return false;
    }
    return true;
  }
}
