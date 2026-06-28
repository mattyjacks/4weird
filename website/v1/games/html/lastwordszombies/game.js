// ==========================================
// 1. GAME STATE MANAGER
// ==========================================
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
    
    // Clean up UI screens - template screens
    document.getElementById('TEMPLATE-4weird-loading-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-game-over-screen').classList.add('hidden');
    document.getElementById('custom-store-screen').classList.add('hidden');
    document.getElementById('custom-settings-screen').classList.add('hidden');
    document.getElementById('game-hud').classList.add('hidden');
    
    switch (state) {
      case GameState.MENU:
        document.getElementById('TEMPLATE-4weird-start-screen').classList.remove('hidden');
        break;
      case GameState.PLAYING:
        document.getElementById('game-hud').classList.remove('hidden');
        break;
      case GameState.PAUSED:
        document.getElementById('game-hud').classList.remove('hidden');
        document.getElementById('TEMPLATE-4weird-pause-screen').classList.remove('hidden');
        break;
      case GameState.GAME_OVER:
        document.getElementById('TEMPLATE-4weird-game-over-screen').classList.remove('hidden');
        document.getElementById('TEMPLATE-4weird-final-score-val').innerText = this.score;
        
        // Update high score!
        const savedHighScore = parseInt(localStorage.getItem('gg_high_score') || '0', 10);
        if (this.score > savedHighScore) {
            localStorage.setItem('gg_high_score', this.score);
            document.getElementById('TEMPLATE-4weird-high-score').innerText = this.score;
            document.getElementById('TEMPLATE-4weird-gameover-highscore').innerText = this.score;
        } else {
            document.getElementById('TEMPLATE-4weird-high-score').innerText = savedHighScore;
            document.getElementById('TEMPLATE-4weird-gameover-highscore').innerText = savedHighScore;
        }
        
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
    const valSpan = document.getElementById('combo-val');
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

// ==========================================
// 2. PROCEDURAL SYNTH AUDIO ENGINE
// ==========================================
class AudioManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.ctx = null;
    this.muted = false;
    
    // Nodes
    this.masterSFXGain = null;
    this.masterMusicGain = null;
    
    // Music Sequencer state
    this.musicIntervalId = null;
    this.beatIndex = 0;
    this.tempo = 100; // BPM
  }

  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Create Gain nodes
    this.masterSFXGain = this.ctx.createGain();
    this.masterSFXGain.gain.setValueAtTime(this.muted ? 0 : this.state.sfxVolume, this.ctx.currentTime);
    this.masterSFXGain.connect(this.ctx.destination);
    
    this.masterMusicGain = this.ctx.createGain();
    this.masterMusicGain.gain.setValueAtTime(this.muted ? 0 : this.state.musicVolume, this.ctx.currentTime);
    this.masterMusicGain.connect(this.ctx.destination);
    
    this.startSynthMusic();
  }

  setSFXVolume(val) {
    this.state.sfxVolume = val;
    this.state.saveSettings();
    if (this.masterSFXGain && this.ctx && !this.muted) {
      this.masterSFXGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    this.state.musicVolume = val;
    this.state.saveSettings();
    if (this.masterMusicGain && this.ctx && !this.muted) {
      this.masterMusicGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  toggleMute() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.muted = !this.muted;
    if (this.muted) {
      this.masterSFXGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterMusicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else {
      this.masterSFXGain.gain.setValueAtTime(this.state.sfxVolume, this.ctx.currentTime);
      this.masterMusicGain.gain.setValueAtTime(this.state.musicVolume, this.ctx.currentTime);
    }
    return this.muted;
  }

  stopAll() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  playSFX(type) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.muted) return;
    
    const t = this.ctx.currentTime;
    
    if (type === 'type') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);
      
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      
      osc.connect(gain);
      gain.connect(this.masterSFXGain);
      osc.start(t);
      osc.stop(t + 0.05);
    } 
    else if (type === 'explosion') {
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(20, t + 0.5);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(65, t);
      sub.frequency.linearRampToValueAtTime(30, t + 0.4);
      
      subGain.gain.setValueAtTime(0.6, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterSFXGain);
      
      sub.connect(subGain);
      subGain.connect(this.masterSFXGain);
      
      noise.start(t);
      noise.stop(t + 0.6);
      
      sub.start(t);
      sub.stop(t + 0.5);
    }
    else if (type === 'error') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(130, t);
      
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(133, t);
      
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterSFXGain);
      
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.26);
      osc2.stop(t + 0.26);
    }
    else if (type === 'hurt') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(80, t + 0.2);
      
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      
      osc.connect(gain);
      gain.connect(this.masterSFXGain);
      
      osc.start(t);
      osc.stop(t + 0.22);
    }
  }

  startSynthMusic() {
    if (this.musicIntervalId) clearInterval(this.musicIntervalId);
    
    const stepDuration = 60 / this.tempo / 2; // eighth notes
    this.beatIndex = 0;
    
    this.musicIntervalId = setInterval(() => {
      if (this.muted || this.state.currentState === 'paused' || this.state.musicVolume === 0) return;
      if (!this.ctx) return;
      
      const t = this.ctx.currentTime;
      const theme = this.state.equippedMusic;
      
      let baseScale = [55, 65.41, 73.42, 82.41]; // A1, C2, D2, E2
      if (theme === 'industrial') {
        baseScale = [48.99, 58.27, 65.41, 69.30]; // G1, A#1, C2, C#2
      }
      
      const step = this.beatIndex % 8;
      
      // Base bass notes (every beat)
      if (step % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = theme === 'industrial' ? 'sawtooth' : 'triangle';
        
        const chordIndex = Math.floor(this.beatIndex / 16) % 4;
        let baseFreq = baseScale[0];
        if (chordIndex === 1) baseFreq = baseScale[1];
        if (chordIndex === 2) baseFreq = baseScale[3];
        if (chordIndex === 3) baseFreq = baseScale[2];
        
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.98, t + 0.2);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(theme === 'industrial' ? 300 : 150, t);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterMusicGain);
        
        osc.start(t);
        osc.stop(t + 0.40);
      }
      
      // Arpeggiator melody notes (on specific beats)
      const arpBeats = [0, 3, 5, 6];
      if (arpBeats.includes(step)) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        
        const chordIndex = Math.floor(this.beatIndex / 16) % 4;
        let noteFreq = baseScale[chordIndex] * 4; // Up two octaves
        
        if (step === 3) noteFreq *= 1.25; // Minor third
        if (step === 5) noteFreq *= 1.5;  // Perfect fifth
        if (step === 6) noteFreq *= 1.875; // Minor seventh
        
        osc.frequency.setValueAtTime(noteFreq, t);
        
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        
        osc.connect(gain);
        gain.connect(this.masterMusicGain);
        
        osc.start(t);
        osc.stop(t + 0.20);
      }
      
      this.beatIndex++;
    }, stepDuration * 1000);
  }
}

// ==========================================
// 3. LOW-POLY CYBORG MODEL
// ==========================================
class Zombie {
  constructor(scene, word, speed, spawnZ, fontTheme) {
    this.scene = scene;
    this.word = word;
    this.speed = speed;
    
    // Status states
    this.isDead = false;
    this.isTargeted = false;
    this.typedLength = 0;
    this.isStunned = false;
    this.stunDuration = 0;
    
    // Physics variables
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    
    // Boundary offsets
    this.worldX = (Math.random() - 0.5) * 4.0;
    this.worldY = -1.2;
    this.worldZ = spawnZ;
    this.animTime = Math.random() * 100;
    this.fontTheme = fontTheme;
    
    this.createModel();
    this.createLabel();
  }

  createModel() {
    this.group = new THREE.Group();
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
    
    // Low-poly cyborg design
    // 1. Torso (Dark carbon shell)
    const torsoGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x21252d });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 0.5;
    this.group.add(this.torso);
    
    // 1b. Glowing Cyber Reactor Core on chest
    const coreGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc }); // Neon cyan core
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.set(0, 0.5, 0.21);
    this.group.add(this.core);
    
    // 2. Head (Dark metal alloy)
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x2d323f });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 1.25, 0);
    this.group.add(this.head);
    
    // 2b. Chrome plating on half of the face
    const plateGeo = new THREE.BoxGeometry(0.28, 0.52, 0.52);
    const plateMat = new THREE.MeshLambertMaterial({ color: 0x8a95a5 });
    this.chromePlate = new THREE.Mesh(plateGeo, plateMat);
    this.chromePlate.position.set(0.12, 1.25, 0.01);
    this.group.add(this.chromePlate);
    
    // 3. Cybernetic Glowing Visor (instead of eyes)
    const visorGeo = new THREE.BoxGeometry(0.42, 0.08, 0.1);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Hot pink visor
    this.visor = new THREE.Mesh(visorGeo, visorMat);
    this.visor.position.set(0, 1.3, 0.22);
    this.group.add(this.visor);
    
    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.15, 0.7);
    const hydraulicArmMat = new THREE.MeshLambertMaterial({ color: 0x8a95a5 }); // steel left arm
    const wireArmMat = new THREE.MeshLambertMaterial({ color: 0x1b1b22 }); // carbon right arm
    
    this.leftArm = new THREE.Mesh(armGeo, hydraulicArmMat);
    this.leftArm.position.set(-0.4, 0.8, 0.3);
    
    this.rightArm = new THREE.Mesh(armGeo, wireArmMat);
    this.rightArm.position.set(0.4, 0.8, 0.3);
    
    this.group.add(this.leftArm);
    this.group.add(this.rightArm);
    
    this.scene.add(this.group);
  }

  createLabel() {
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 512;
    this.labelCanvas.height = 128;
    this.labelCtx = this.labelCanvas.getContext('2d');
    
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTexture.minFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    this.labelSprite = new THREE.Sprite(spriteMaterial);
    this.labelSprite.renderOrder = 999;
    
    this.labelSprite.scale.set(2.0, 0.5, 1.0);
    this.labelSprite.position.set(0, 1.9, 0);
    
    this.group.add(this.labelSprite);
    this.updateLabelTexture();
  }

  updateLabelTexture() {
    const ctx = this.labelCtx;
    const w = this.labelCanvas.width;
    const h = this.labelCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    let fontName = 'Orbitron, sans-serif';
    if (this.fontTheme === 'pixel') fontName = 'Courier New, monospace';
    if (this.fontTheme === 'cyber') fontName = 'Arial Black, sans-serif';
    
    ctx.font = `bold 44px ${fontName}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const typedText = this.word.substring(0, this.typedLength);
    const remainingText = this.word.substring(this.typedLength);
    
    const typedWidth = ctx.measureText(typedText).width;
    const remainingWidth = ctx.measureText(remainingText).width;
    const totalWidth = typedWidth + remainingWidth;
    
    let startX = (w - totalWidth) / 2;
    
    ctx.fillStyle = 'rgba(5, 5, 12, 0.85)';
    ctx.strokeStyle = this.isTargeted ? 'rgba(255, 0, 119, 0.7)' : 'rgba(0, 242, 254, 0.3)';
    ctx.lineWidth = 4;
    
    const rectX = (w - totalWidth - 40) / 2;
    const rectWidth = totalWidth + 40;
    const rectHeight = 64;
    const rectY = (h - rectHeight) / 2;
    
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 12);
    ctx.fill();
    ctx.stroke();
    
    ctx.textAlign = 'left';
    
    // Highlight typed characters in neon green
    ctx.fillStyle = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';
    ctx.fillText(typedText, startX, h / 2);
    
    // Remaining in white
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(remainingText, startX + typedWidth, h / 2);
    
    this.labelTexture.needsUpdate = true;
  }

  update(dt, playerZ) {
    this.animTime += dt;
    
    if (this.isStunned) {
      this.stunDuration -= dt;
      if (this.stunDuration <= 0) {
        this.isStunned = false;
      }
    } else {
      if (this.spawnPhase) {
        this.spawnPhaseTimer -= dt;
        const directionSign = this.spawnDoorX < 0 ? 1 : -1;
        this.worldX += directionSign * 2.2 * dt; // walk inward
        this.worldZ += this.speed * 0.5 * dt; // slow forward movement
        
        if (this.spawnPhaseTimer <= 0) {
          this.spawnPhase = false;
        }
      } else {
        this.worldZ += this.speed * dt;
      }
    }
    
    // Apply physical forces
    this.worldX += this.vx * dt;
    this.worldZ += this.vz * dt;
    
    const dist = Math.abs(5.0 - this.worldZ);
    const scaleFactor = Math.max(1.0, dist / 10.0);
    this.labelSprite.scale.set(2.0 * scaleFactor, 0.5 * scaleFactor, 1.0);
    
    this.vx *= Math.pow(0.1, dt);
    this.vz *= Math.pow(0.1, dt);
    
    if (!this.spawnPhase) {
      if (this.worldX > 2.2) this.worldX = 2.2;
      if (this.worldX < -2.2) this.worldX = -2.2;
    }
    
    if (!this.isStunned) {
      const wobble = Math.sin(this.animTime * 8);
      const bobbing = Math.cos(this.animTime * 16) * 0.05;
      
      this.head.position.y = 1.25 + bobbing;
      this.leftArm.rotation.x = wobble * 0.3;
      this.rightArm.rotation.x = -wobble * 0.3;
      
      this.group.rotation.y = wobble * 0.05;
    } else {
      this.group.rotation.z = Math.sin(this.animTime * 40) * 0.1;
    }
    
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
  }

  setTargeted(targeted) {
    if (this.isTargeted !== targeted) {
      this.isTargeted = targeted;
      if (targeted) {
        this.torso.material.color.setHex(0xff0055); // pink highlight
        this.head.material.color.setHex(0xff0055);
      } else {
        this.torso.material.color.setHex(0x21252d); // carbon
        this.head.material.color.setHex(0x2d323f); // alloy
      }
      this.updateLabelTexture();
    }
  }

  setTypedLength(len) {
    if (this.typedLength !== len) {
      this.typedLength = len;
      this.updateLabelTexture();
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.isMesh || child.isSprite) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}

// ==========================================
// 4. PARTICLE SPLATTER ENGINE
// ==========================================
class Particle {
  constructor(scene, position, color, velocity, size, decay) {
    this.scene = scene;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 1.0
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    this.mesh.position.x += (Math.random() - 0.5) * 0.5;
    this.mesh.position.y += (Math.random() - 0.5) * 0.5;
    this.mesh.position.z += (Math.random() - 0.5) * 0.5;
    
    this.scene.add(this.mesh);
    
    this.velocity = velocity;
    this.gravity = -9.8;
    this.life = 1.0;
    this.decay = decay;
  }

  update(dt) {
    this.velocity.y += this.gravity * dt;
    this.mesh.position.addScaledVector(this.velocity, dt);
    
    this.mesh.rotation.x += this.velocity.y * dt * 0.5;
    this.mesh.rotation.y += this.velocity.x * dt * 0.5;
    
    this.life -= this.decay * dt;
    this.mesh.material.opacity = Math.max(0, this.life);
    
    const scale = Math.max(0.1, this.life);
    this.mesh.scale.set(scale, scale, scale);
    
    return this.life > 0;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class ShockwaveRing {
  constructor(scene, position, color) {
    this.scene = scene;
    const geometry = new THREE.RingGeometry(0.1, 0.2, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.scene.add(this.mesh);
    
    this.radius = 0.2;
    this.maxRadius = 3.5;
    this.life = 1.0;
    this.speed = 8.0;
  }

  update(dt) {
    this.radius += this.speed * dt;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.RingGeometry(this.radius * 0.8, this.radius, 16);
    
    this.life -= 2.0 * dt;
    this.mesh.material.opacity = Math.max(0, this.life);
    
    return this.life > 0;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class ParticleManager {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.state = stateManager;
    this.particles = [];
    this.rings = [];
  }

  spawnExplosion(position, colorName) {
    let hexColor = '#00ff66';
    if (colorName === 'plasma') hexColor = '#00ccff';
    if (colorName === 'inferno') hexColor = '#ff0055';
    if (colorName === 'void') hexColor = '#bb00ff';
    
    const count = this.state.ultraParticles ? 40 : 15;
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const speed = 2.0 + Math.random() * 6.0;
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta) + 2.0;
      const vz = speed * Math.cos(phi);
      
      const size = 0.08 + Math.random() * 0.15;
      const decay = 0.8 + Math.random() * 1.0;
      
      const p = new Particle(
        this.scene,
        position,
        hexColor,
        new THREE.Vector3(vx, vy, vz),
        size,
        decay
      );
      this.particles.push(p);
    }
    
    const ring = new ShockwaveRing(this.scene, position, hexColor);
    this.rings.push(ring);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const active = this.particles[i].update(dt);
      if (!active) {
        this.particles[i].destroy();
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const active = this.rings[i].update(dt);
      if (!active) {
        this.rings[i].destroy();
        this.rings.splice(i, 1);
      }
    }
  }

  clear() {
    this.particles.forEach(p => p.destroy());
    this.rings.forEach(r => r.destroy());
    this.particles = [];
    this.rings = [];
  }
}

// ==========================================
// 5. DECRYPTION INPUT CONTROLLER
// ==========================================
class TypingController {
  constructor(stateManager, audioManager, particleManager) {
    this.state = stateManager;
    this.audio = audioManager;
    this.particles = particleManager;
    this.currentTarget = null;
    this.typedBuffer = "";
  }

  handleInput(key, zombies) {
    if (this.state.currentState !== GameState.PLAYING) return;
    
    const letter = key.toLowerCase();
    if (!/^[a-z]$/.test(letter)) return;
    
    this.audio.playSFX('type');
    
    if (!this.currentTarget) {
      const matches = zombies.filter(z => z.word.toLowerCase().startsWith(letter) && z.worldZ < 4.8);
      if (matches.length > 0) {
        matches.sort((a, b) => b.worldZ - a.worldZ);
        this.currentTarget = matches[0];
        this.typedBuffer = letter;
        this.currentTarget.setTargeted(true);
        this.currentTarget.setTypedLength(1);
      }
    } else {
      const nextChar = this.currentTarget.word[this.typedBuffer.length].toLowerCase();
      if (letter === nextChar) {
        this.typedBuffer += letter;
        this.currentTarget.setTypedLength(this.typedBuffer.length);
        
        if (this.typedBuffer.length === this.currentTarget.word.length) {
          this.triggerExplosion(this.currentTarget, zombies);
          this.currentTarget = null;
          this.typedBuffer = "";
        }
      } else {
        this.currentTarget.setTargeted(false);
        this.currentTarget.setTypedLength(0);
        this.currentTarget = null;
        this.typedBuffer = "";
        this.audio.playSFX('error');
      }
    }
  }

  triggerExplosion(zombie, zombies) {
    const explosionPos = zombie.group.position.clone();
    this.particles.spawnExplosion(explosionPos, this.state.equippedBlood);
    this.audio.playSFX('explosion');
    
    this.state.addScore(100);
    this.state.addCoins(1);
    
    zombie.isDead = true;
    
    zombies.forEach(z => {
      if (z === zombie || z.isDead) return;
      
      const dx = z.worldX - zombie.worldX;
      const dz = z.worldZ - zombie.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      const maxRadius = 8.0;
      if (dist < maxRadius) {
        const force = 18.0 * (1 - dist / maxRadius);
        const angle = Math.atan2(dz, dx);
        
        z.vx += Math.cos(angle) * force;
        z.vz += Math.sin(angle) * force * 1.5;
        
        z.isStunned = true;
        z.stunDuration = 1.0;
        this.state.addScore(15);
      }
    });
  }

  reset() {
    if (this.currentTarget) {
      this.currentTarget.setTargeted(false);
      this.currentTarget.setTypedLength(0);
    }
    this.currentTarget = null;
    this.typedBuffer = "";
  }
}

// ==========================================
// 6. BLACK MARKET CUSTOM STORE MANAGER
// ==========================================
const StoreItems = {
  blood: [
    { name: "Neon Green", id: "default", price: 0, color: "#00ff66" },
    { name: "Plasma Blue", id: "plasma", price: 50, color: "#00ccff" },
    { name: "Inferno Red", id: "inferno", price: 100, color: "#ff0055" },
    { name: "Void Purple", id: "void", price: 180, color: "#bb00ff" }
  ],
  fonts: [
    { name: "Cyber Decrypt", id: "default", cssClass: "font-outfit" },
    { name: "Retro Terminal", id: "pixel", price: 30, cssClass: "font-pixel" },
    { name: "Vapor Neon", id: "cyber", price: 80, cssClass: "font-cyber" }
  ],
  music: [
    { name: "Dark Synth", id: "default", price: 0 },
    { name: "Industrial Bass", id: "industrial", price: 120 }
  ]
};

function setupStore(stateManager, audioManager) {
  const container = document.getElementById('store-items-container');
  const storeCoins = document.getElementById('store-coins');
  
  function render() {
    container.innerHTML = '';
    storeCoins.innerText = stateManager.coins;
    
    const activeTabButton = document.querySelector('.store-tabs .tab-btn.active');
    if (!activeTabButton) return;
    
    const category = activeTabButton.dataset.tab;
    const items = StoreItems[category];
    
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'store-card';
      
      const isOwned = stateManager.ownedItems.includes(item.id);
      let isEquipped = false;
      if (category === 'blood') isEquipped = stateManager.equippedBlood === item.id;
      if (category === 'fonts') isEquipped = stateManager.equippedFont === item.id;
      if (category === 'music') isEquipped = stateManager.equippedMusic === item.id;
      
      let priceLabel = '';
      if (isEquipped) {
        priceLabel = 'EQUIPPED';
      } else if (isOwned) {
        priceLabel = 'OWNED';
      } else {
        priceLabel = `${item.price} Credits`;
      }
      
      let btnText = 'Buy';
      let btnClass = 'btn-buy';
      let btnDisabled = false;
      
      if (isEquipped) {
        btnText = 'Equipped';
        btnDisabled = true;
      } else if (isOwned) {
        btnText = 'Equip';
        btnClass = 'btn-equip';
      } else if (stateManager.coins < item.price) {
        btnDisabled = true;
      }
      
      let indicator = '';
      if (category === 'blood') {
        indicator = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${item.color}; margin-right:8px; box-shadow: 0 0 6px ${item.color}"></span>`;
      }
      
      card.innerHTML = `
        <div class="store-card-info">
          <h3 style="color:#fff;">${indicator}${item.name}</h3>
          <p>${priceLabel}</p>
        </div>
        <button class="${btnClass}" ${btnDisabled ? 'disabled' : ''}>
          ${btnText}
        </button>
      `;
      
      const actionButton = card.querySelector('button');
      actionButton.addEventListener('click', () => {
        if (!isOwned) {
          if (stateManager.buyItem(item.id, item.price)) {
            audioManager.playSFX('type');
            stateManager.equipItem(category, item.id);
            render();
          } else {
            audioManager.playSFX('error');
          }
        } else {
          stateManager.equipItem(category, item.id);
          audioManager.playSFX('type');
          
          if (category === 'music') {
            audioManager.startSynthMusic();
          }
          render();
        }
      });
      
      container.appendChild(card);
    });
  }
  
  document.querySelectorAll('.store-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.store-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      audioManager.playSFX('type');
      render();
    });
  });
  
  return {
    render
  };
}

// ==========================================
// 7. CORE 3D GAME APP
// ==========================================
class GameApp {
  constructor() {
    this.state = new StateManager();
    this.audio = new AudioManager(this.state);
    
    // 2. Three.js Setup
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    
    this.scene.background = new THREE.Color(0x030308);
    this.scene.fog = new THREE.FogExp2(0x030308, 0.022);
    
    this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 0.2, 5.0);
    
    // FIXING THE LIGHTING:
    // Add player flashlight/spotlight attached directly to camera view!
    this.flashlight = new THREE.PointLight(0x00f2fe, 25.0, 18.0, 1.5);
    this.camera.add(this.flashlight);
    this.scene.add(this.camera);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    
    this.particles = new ParticleManager(this.scene, this.state);
    this.typing = new TypingController(this.state, this.audio, this.particles);
    
    this.zombies = [];
    this.spawnDoors = [];
    this.lights = [];
    this.corridorGirders = [];
    
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.flickerTimer = 0;
    
    this.shakeIntensity = 0;
    this.shakeDecay = 4.0;
    
    this.build3DCorridor();
    this.bindEvents();
    
    this.storeController = setupStore(this.state, this.audio);
    this.initSettingsUI();
    
    // Remove loading screen on complete
    document.getElementById('TEMPLATE-4weird-loading-screen').classList.add('hidden');
    this.state.setGameState(GameState.MENU);
    
    requestAnimationFrame((t) => this.loop(t));
  }

  build3DCorridor() {
    const corridorLength = 170;
    const corridorWidth = 6.0;
    const corridorHeight = 4.0;
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x111218 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.2, -corridorLength / 2 + 10);
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const ceilingMat = new THREE.MeshLambertMaterial({ color: 0x08080c });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, corridorHeight - 1.2, -corridorLength / 2 + 10);
    this.scene.add(ceiling);
    
    // Left Wall
    const leftWallGeo = new THREE.PlaneGeometry(corridorLength, corridorHeight);
    const leftWallMat = new THREE.MeshLambertMaterial({ color: 0x0c0d12 });
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-corridorWidth / 2, corridorHeight / 2 - 1.2, -corridorLength / 2 + 10);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    
    // Right Wall
    const rightWall = leftWall.clone();
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(corridorWidth / 2, corridorHeight / 2 - 1.2, -corridorLength / 2 + 10);
    this.scene.add(rightWall);

    // Server Racks
    const rackWidth = 0.8;
    const rackHeight = 2.4;
    const rackDepth = 0.35;
    const neonColors = [0x00ffcc, 0xff0055, 0x00ff66];
    
    for (let z = 5; z > -corridorLength + 10; z -= 1.8) {
      if (Math.abs((z - 10) % 12) < 1.2) continue;
      if (Math.abs((z - 2) % 24) < 1.5 || Math.abs((z - 14) % 24) < 1.5) continue;
      
      const neonColor = neonColors[Math.abs(Math.floor(z)) % neonColors.length];
      this.createDetailedServerRack(-corridorWidth / 2 + rackDepth / 2, rackHeight / 2 - 1.2, z, rackWidth, rackHeight, rackDepth, neonColor);
      this.createDetailedServerRack(corridorWidth / 2 - rackDepth / 2, rackHeight / 2 - 1.2, z, rackWidth, rackHeight, rackDepth, neonColor);
    }
    
    // Doors
    for (let z = 2.0; z > -corridorLength + 10; z -= 24.0) {
      this.createClassroomDoor(z, true, corridorWidth);
      this.createClassroomDoor(z - 12.0, false, corridorWidth);
    }
    
    // Girders
    for (let z = 10; z > -corridorLength + 10; z -= 12) {
      this.createArchway(z, corridorWidth, corridorHeight);
      this.createCeilingLight(z, corridorHeight);
      
      if (Math.abs(z - 10) % 24 === 0) {
        this.createCeilingClock(z, corridorHeight);
      }
    }
    
    // FIXING THE LIGHTING:
    // Add ambient blue fill light to prevent black voids in the corridor walls
    const ambientLight = new THREE.AmbientLight(0x0a1128, 0.45);
    this.scene.add(ambientLight);
    
    // Add bright blue directional lighting down the corridor
    const dirLight = new THREE.DirectionalLight(0x00f2fe, 0.65);
    dirLight.position.set(0, 3, 5);
    this.scene.add(dirLight);
  }

  createArchway(z, width, height) {
    const beamThickness = 0.2;
    const beamDepth = 0.3;
    const material = new THREE.MeshLambertMaterial({ color: 0x22252e });
    
    const archGroup = new THREE.Group();
    
    const leftCol = new THREE.Mesh(new THREE.BoxGeometry(beamThickness, height, beamDepth), material);
    leftCol.position.set(-width / 2 + beamThickness / 2, height / 2 - 1.2, z);
    archGroup.add(leftCol);
    
    const rightCol = leftCol.clone();
    rightCol.position.x = width / 2 - beamThickness / 2;
    archGroup.add(rightCol);
    
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, beamThickness, beamDepth), material);
    topBeam.position.set(0, height - 1.2 - beamThickness / 2, z);
    archGroup.add(topBeam);
    
    // Neon accent strips inside columns
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const neonLiningL = new THREE.Mesh(new THREE.BoxGeometry(0.02, height, 0.05), neonMat);
    neonLiningL.position.set(-width / 2 + beamThickness + 0.01, height / 2 - 1.2, z);
    archGroup.add(neonLiningL);
    
    const neonLiningR = neonLiningL.clone();
    neonLiningR.position.x = width / 2 - beamThickness - 0.01;
    archGroup.add(neonLiningR);
    
    this.scene.add(archGroup);
    this.corridorGirders.push(archGroup);
  }

  createCeilingLight(z, height) {
    const bulbGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.rotation.z = Math.PI / 2;
    bulb.position.set(0, height - 1.25, z);
    
    // FIXING THE LIGHTING:
    // Greatly increase PointLight intensity (45.0) and range (16.0) for visual clarity
    const light = new THREE.PointLight(0x00ff88, 45.0, 16.0);
    light.position.set(0, height - 1.4, z);
    
    this.scene.add(bulb);
    this.scene.add(light);
    
    this.lights.push({ bulb, light, baseIntensity: 45.0, zOffset: z });
  }

  createDetailedServerRack(x, y, z, width, height, depth, color) {
    const rackGroup = new THREE.Group();
    const isLeftWall = x < 0;
    
    const cabinetMat = new THREE.MeshLambertMaterial({ color: 0x161821 });
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(depth, height, width), cabinetMat);
    cabinet.position.set(0, 0, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    rackGroup.add(cabinet);
    
    const faceOffset = isLeftWall ? depth / 2 + 0.005 : -depth / 2 - 0.005;
    const slotMat = new THREE.MeshLambertMaterial({ color: 0x222530 });
    const ledOffMat = new THREE.MeshBasicMaterial({ color: 0x334433 });
    const ledOnMat = new THREE.MeshBasicMaterial({ color: color });
    
    const slotCount = 8;
    const slotHeight = (height - 0.2) / slotCount;
    
    for (let i = 0; i < slotCount; i++) {
      const slotY = -height / 2 + 0.15 + i * slotHeight;
      const slotMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, slotHeight * 0.85, width * 0.9), slotMat);
      slotMesh.position.set(faceOffset, slotY, 0);
      rackGroup.add(slotMesh);
      
      for (let l = 0; l < 4; l++) {
        const ledGeo = new THREE.BoxGeometry(0.01, 0.02, 0.02);
        const led = new THREE.Mesh(ledGeo, Math.random() > 0.4 ? ledOnMat : ledOffMat);
        const ledZ = -width * 0.35 + l * (width * 0.22);
        led.position.set(faceOffset + (isLeftWall ? 0.012 : -0.012), slotY, ledZ);
        rackGroup.add(led);
      }
    }
    
    rackGroup.position.set(x, y, z);
    this.scene.add(rackGroup);
  }

  createClassroomDoor(z, isLeft, corridorWidth) {
    const doorGroup = new THREE.Group();
    const doorWidth = 1.4;
    const doorHeight = 2.8;
    const doorThickness = 0.08;
    
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x22252d });
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorHeight, 0.1), frameMat);
    frameLeft.position.set(0, doorHeight / 2 - 1.2, -doorWidth / 2 - 0.05);
    const frameRight = frameLeft.clone();
    frameRight.position.z = doorWidth / 2 + 0.05;
    
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, doorWidth + 0.2), frameMat);
    frameTop.position.set(0, doorHeight - 1.2 + 0.05, 0);
    
    doorGroup.add(frameLeft);
    doorGroup.add(frameRight);
    doorGroup.add(frameTop);
    
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x3e4451 });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorHeight - 0.05, doorWidth), doorMat);
    doorMesh.position.set(0, (doorHeight - 0.05) / 2 - 1.2, 0);
    doorGroup.add(doorMesh);
    
    const lightGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const statusLightMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Red lock light
    const statusLight = new THREE.Mesh(lightGeo, statusLightMat);
    statusLight.position.set(isLeft ? 0.06 : -0.06, doorHeight - 1.2 + 0.05, 0);
    doorGroup.add(statusLight);
    
    const xPos = isLeft ? -corridorWidth / 2 + doorThickness / 2 : corridorWidth / 2 - doorThickness / 2;
    doorGroup.position.set(xPos, 0, z);
    
    this.scene.add(doorGroup);
    
    this.spawnDoors.push({
      group: doorGroup,
      doorMesh: doorMesh,
      statusLight: statusLight,
      statusLightMat: statusLightMat,
      isLeft: isLeft,
      z: z,
      x: xPos,
      state: 'closed',
      slideProgress: 0,
      timer: 0
    });
  }

  createCeilingClock(z, height) {
    const clockGroup = new THREE.Group();
    
    const diskMat = new THREE.MeshLambertMaterial({ color: 0x222228 });
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 16), diskMat);
    disk.rotation.x = Math.PI / 2;
    clockGroup.add(disk);
    
    const holoRingMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffcc, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.22, 24), holoRingMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.set(0, -0.25, 0);
    clockGroup.add(ring1);
    
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8 });
    const crossBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.16), coreMat);
    crossBar1.position.set(0, -0.25, 0);
    const crossBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.02), coreMat);
    crossBar2.position.set(0, -0.25, 0);
    clockGroup.add(crossBar1);
    clockGroup.add(crossBar2);
    
    clockGroup.position.set(0, height - 1.25, z);
    this.scene.add(clockGroup);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    window.addEventListener('keydown', (e) => {
      if (this.state.currentState === GameState.MENU) {
        if (e.key === 'Enter') {
          this.startGame();
        } else if (e.key.toLowerCase() === 'i') {
          this.openStore();
        }
      } else if (this.state.currentState === GameState.PLAYING) {
        if (e.key === 'Escape') {
          this.togglePause();
        } else {
          this.typing.handleInput(e.key, this.zombies);
        }
      } else if (this.state.currentState === GameState.PAUSED) {
        if (e.key === 'Escape') {
          this.togglePause();
        }
      }
    });
    
    // Connect to template navigation buttons
    document.getElementById('TEMPLATE-4weird-start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('btn-custom-store').addEventListener('click', () => this.openStore());
    document.getElementById('btn-custom-settings').addEventListener('click', () => this.openSettings());
    document.getElementById('btn-store-back').addEventListener('click', () => this.backToMenu());
    document.getElementById('btn-settings-back').addEventListener('click', () => this.closeSettings());
    document.getElementById('TEMPLATE-4weird-play-again-btn').addEventListener('click', () => this.startGame());
    document.getElementById('TEMPLATE-4weird-resume-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('TEMPLATE-4weird-restart-btn').addEventListener('click', () => this.quitToMenu());
    
    // Mute button handler
    document.getElementById('TEMPLATE-4weird-mute-btn').addEventListener('click', (e) => {
        this.toggleMute(e.target);
    });
  }

  toggleMute(btn) {
    this.audio.init();
    const isMuted = this.audio.toggleMute();
    if (isMuted) {
      btn.classList.add('active');
      btn.innerText = '🔇 Muted';
    } else {
      btn.classList.remove('active');
      btn.innerText = '🔊 Sound';
    }
  }

  initSettingsUI() {
    const sfxSlider = document.getElementById('slider-sfx');
    const musicSlider = document.getElementById('slider-music');
    const particleCheckbox = document.getElementById('chk-particles');
    
    sfxSlider.value = this.state.sfxVolume;
    musicSlider.value = this.state.musicVolume;
    particleCheckbox.checked = this.state.ultraParticles;
    
    sfxSlider.addEventListener('input', (e) => {
      this.audio.setSFXVolume(parseFloat(e.target.value));
    });
    
    musicSlider.addEventListener('input', (e) => {
      this.audio.setMusicVolume(parseFloat(e.target.value));
    });
    
    particleCheckbox.addEventListener('change', (e) => {
      this.state.ultraParticles = e.target.checked;
      this.state.saveSettings();
    });
  }

  resizeCanvas() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  startGame() {
    this.audio.init();
    
    this.zombies.forEach(z => z.destroy());
    this.zombies = [];
    this.particles.clear();
    
    this.state.score = 0;
    this.state.wave = 1;
    this.state.zombiesKilled = 0;
    this.state.zombiesActive = 0;
    this.state.coinsEarnedThisRun = 0;
    this.state.health = 100;
    this.state.resetCombo();
    
    document.getElementById('score-val').innerText = '0';
    document.getElementById('wave-val').innerText = '1';
    document.getElementById('health-bar-fill').style.width = '100%';
    
    this.typing.reset();
    this.calculateWaveBudget();
    
    this.spawnTimer = 0;
    this.state.setGameState(GameState.PLAYING);
    this.resizeCanvas();
  }

  calculateWaveBudget() {
    this.state.zombiesInWave = 10 + this.state.wave * 5;
    this.state.zombiesKilled = 0;
    this.state.zombiesActive = 0;
    this.updateZombiesHUD();
  }

  updateZombiesHUD() {
    const left = this.state.zombiesInWave - this.state.zombiesKilled;
    document.getElementById('zombie-count').innerText = left;
  }

  openStore() {
    this.state.setGameState(GameState.MENU);
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('custom-store-screen').classList.remove('hidden');
    this.storeController.render();
    this.audio.init();
  }

  openSettings() {
    document.getElementById('TEMPLATE-4weird-start-screen').classList.add('hidden');
    document.getElementById('custom-settings-screen').classList.remove('hidden');
    this.audio.init();
  }

  closeSettings() {
    document.getElementById('custom-settings-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-start-screen').classList.remove('hidden');
  }

  backToMenu() {
    document.getElementById('custom-store-screen').classList.add('hidden');
    document.getElementById('TEMPLATE-4weird-start-screen').classList.remove('hidden');
  }

  quitToMenu() {
    this.state.setGameState(GameState.MENU);
  }

  togglePause() {
    if (this.state.currentState === GameState.PLAYING) {
      this.state.setGameState(GameState.PAUSED);
    } else if (this.state.currentState === GameState.PAUSED) {
      this.state.currentState = GameState.PLAYING;
      document.getElementById('TEMPLATE-4weird-pause-screen').classList.add('hidden');
      document.getElementById('game-hud').classList.remove('hidden');
    }
  }

  triggerCameraShake(intensity) {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + intensity);
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    
    if (this.state.currentState === GameState.PLAYING) {
      this.update(dt);
    }
    
    this.render(dt);
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // 0. Update door slide animations
    this.spawnDoors.forEach(door => {
      if (door.state === 'opening') {
        door.slideProgress = Math.min(1.0, door.slideProgress + dt * 4.0);
        if (door.slideProgress >= 1.0) {
          door.state = 'open';
          door.timer = 1.0;
        }
      } else if (door.state === 'open') {
        door.timer -= dt;
        if (door.timer <= 0) {
          door.state = 'closing';
        }
      } else if (door.state === 'closing') {
        door.slideProgress = Math.max(0.0, door.slideProgress - dt * 2.0);
        if (door.slideProgress <= 0.0) {
          door.state = 'closed';
          door.statusLightMat.color.setHex(0xff0055);
        }
      }
      
      const doorHeight = 2.8;
      door.doorMesh.position.y = ((doorHeight - 0.05) / 2 - 1.2) + (door.slideProgress * 2.6);
    });

    // 1. Spawner Logic
    this.spawnTimer += dt;
    const spawnInterval = Math.max(1.0, 3.5 - this.state.wave * 0.25);
    
    const totalSpawned = this.state.zombiesKilled + this.zombies.length;
    
    if (this.spawnTimer >= spawnInterval && totalSpawned < this.state.zombiesInWave) {
      this.spawnTimer = 0;
      this.spawnZombie();
    }
    
    // 2. Update Zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      z.update(dt);
      
      if (z.worldZ >= 4.8) {
        this.state.health = Math.max(0, this.state.health - 20);
        document.getElementById('health-bar-fill').style.width = `${this.state.health}%`;
        
        this.triggerCameraShake(0.5);
        this.audio.playSFX('hurt');
        
        if (this.typing.currentTarget === z) {
          this.typing.reset();
        }
        
        z.destroy();
        this.zombies.splice(i, 1);
        
        this.state.zombiesKilled++;
        this.updateZombiesHUD();
        
        if (this.state.health <= 0) {
          this.state.setGameState(GameState.GAME_OVER);
          this.audio.stopAll();
        }
        continue;
      }
      
      if (z.isDead) {
        this.triggerCameraShake(0.35);
        z.destroy();
        this.zombies.splice(i, 1);
        
        this.state.zombiesKilled++;
        this.updateZombiesHUD();
      }
    }
    
    if (this.state.zombiesKilled >= this.state.zombiesInWave && this.zombies.length === 0) {
      this.state.wave++;
      document.getElementById('wave-val').innerText = this.state.wave;
      this.calculateWaveBudget();
      this.triggerCameraShake(0.2);
    }
    
    this.state.updateCombo(dt);
    this.particles.update(dt);
  }

  spawnZombie() {
    const shortWords = ["run", "die", "zap", "hex", "web", "glitch", "neon", "code", "byte", "bot"];
    const midWords = ["vector", "zombie", "shader", "linear", "render", "matrix", "cypher", "binary", "system", "flicker"];
    const longWords = ["javascript", "stereoscope", "development", "antigravity", "perspective", "monetization", "customization"];
    
    let wordList = shortWords;
    if (this.state.wave >= 5) {
      wordList = longWords;
    } else if (this.state.wave >= 3) {
      wordList = midWords;
    }
    
    const activeStartChars = this.zombies.map(z => z.word[0].toLowerCase());
    let candidates = wordList.filter(w => !activeStartChars.includes(w[0].toLowerCase()));
    
    if (candidates.length === 0) {
      candidates = wordList;
    }
    
    const word = candidates[Math.floor(Math.random() * candidates.length)];
    const speed = 1.8 + this.state.wave * 0.22;
    
    const validDoors = this.spawnDoors.filter(d => d.z < -10 && d.z > -80);
    let selectedDoor = null;
    if (validDoors.length > 0) {
      selectedDoor = validDoors[Math.floor(Math.random() * validDoors.length)];
    }
    
    let spawnX = (Math.random() - 0.5) * 4.0;
    let spawnZ = -70.0;
    
    if (selectedDoor) {
      selectedDoor.state = 'opening';
      selectedDoor.statusLightMat.color.setHex(0x00ffcc);
      
      spawnX = selectedDoor.x;
      spawnZ = selectedDoor.z;
    }
    
    const z = new Zombie(this.scene, word, speed, spawnZ, this.state.equippedFont);
    z.worldX = spawnX;
    
    if (selectedDoor) {
      z.spawnPhase = true;
      z.spawnPhaseTimer = 1.0;
      z.spawnDoorX = selectedDoor.x;
    }
    
    this.zombies.push(z);
  }

  render(dt) {
    this.flickerTimer += dt;
    this.lights.forEach(l => {
      const noise = Math.sin(this.flickerTimer * 12 + l.zOffset) * Math.cos(this.flickerTimer * 4);
      let intensity = l.baseIntensity;
      
      if (noise > 0.75) {
        intensity *= 0.15;
        l.bulb.material.color.setHex(0x111115);
      } else {
        l.bulb.material.color.setHex(l.light.color.getHex());
      }
      
      l.light.intensity = intensity;
    });
    
    if (this.shakeIntensity > 0) {
      this.shakeIntensity -= this.shakeDecay * dt;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;
      
      const dx = (Math.random() - 0.5) * this.shakeIntensity * 0.15;
      const dy = (Math.random() - 0.5) * this.shakeIntensity * 0.15;
      
      this.camera.position.set(dx, 0.2 + dy, 5.0);
    } else {
      this.camera.position.set(0, 0.2, 5.0);
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game app on load
window.addEventListener('load', () => {
  window.game = new GameApp();
});
