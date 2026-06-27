import * as THREE from 'three';
import { StateManager, GameState } from './state.js';
import { AudioManager } from './audio.js';
import { ParticleManager } from './particles.js';
import { Zombie } from './zombie.js';
import { TypingController } from './typing.js';
import { setupStore } from './store.js';

class GameApp {
  constructor() {
    // 1. Core State & Audio
    this.state = new StateManager();
    this.audio = new AudioManager(this.state);
    
    // 2. Three.js Setup
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    
    // Cyberpunk ambient fog
    this.scene.background = new THREE.Color(0x020205);
    this.scene.fog = new THREE.FogExp2(0x020205, 0.025);
    
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    // Camera is positioned at the start of the corridor facing down -Z
    this.camera.position.set(0, 0.2, 5.0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    
    // 3. Subsystem Managers
    this.particles = new ParticleManager(this.scene, this.state);
    this.typing = new TypingController(this.state, this.audio, this.particles);
    
    // Game lists
    this.zombies = [];
    
    // Timers & spawner state
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.flickerTimer = 0;
    
    // Screen shake parameters
    this.shakeIntensity = 0;
    this.shakeDecay = 4.0;
    
    // 4. Build Environment
    this.lights = [];
    this.corridorGirders = [];
    this.build3DCorridor();
    
    // 5. Setup event bindings
    this.bindEvents();
    
    // 6. Init UI overlays
    this.storeController = setupStore(this.state, this.audio);
    this.initSettingsUI();
    
    // 7. Begin main rendering loop
    requestAnimationFrame((t) => this.loop(t));
  }

  build3DCorridor() {
    // Build walls, ceiling and floor running down the corridor from Z=10 to Z=-160
    const corridorLength = 170;
    const corridorWidth = 6.0;
    const corridorHeight = 4.0;
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const floorMat = new THREE.MeshLambertMaterial({ 
      color: 0x111115,
      roughness: 0.9
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.2, -corridorLength / 2 + 10);
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const ceilingMat = new THREE.MeshLambertMaterial({ color: 0x0c0c10 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, corridorHeight - 1.2, -corridorLength / 2 + 10);
    this.scene.add(ceiling);
    
    // Left Wall
    const leftWallGeo = new THREE.PlaneGeometry(corridorLength, corridorHeight);
    const leftWallMat = new THREE.MeshLambertMaterial({ color: 0x09090d });
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
    
    // Add metallic structural beams / archways along the corridor (every 12 units)
    for (let z = 10; z > -corridorLength + 10; z -= 12) {
      this.createArchway(z, corridorWidth, corridorHeight);
      this.createCeilingLight(z, corridorHeight);
    }
    
    // Ambient global light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    this.scene.add(ambientLight);
    
    // Directional light down the corridor
    const dirLight = new THREE.DirectionalLight(0x00ccff, 0.2);
    dirLight.position.set(0, 3, 5);
    this.scene.add(dirLight);
  }

  createArchway(z, width, height) {
    const beamThickness = 0.25;
    const beamDepth = 0.4;
    const material = new THREE.MeshLambertMaterial({ color: 0x181822 });
    
    const archGroup = new THREE.Group();
    
    // Left support column
    const leftCol = new THREE.Mesh(new THREE.BoxGeometry(beamThickness, height, beamDepth), material);
    leftCol.position.set(-width / 2 + beamThickness / 2, height / 2 - 1.2, z);
    archGroup.add(leftCol);
    
    // Right support column
    const rightCol = leftCol.clone();
    rightCol.position.x = width / 2 - beamThickness / 2;
    archGroup.add(rightCol);
    
    // Top crossbeam
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(width, beamThickness, beamDepth), material);
    topBeam.position.set(0, height - 1.2 - beamThickness / 2, z);
    archGroup.add(topBeam);
    
    this.scene.add(archGroup);
    this.corridorGirders.push(archGroup);
  }

  createCeilingLight(z, height) {
    // 3D Neon bulb model
    const bulbGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.rotation.z = Math.PI / 2;
    bulb.position.set(0, height - 1.25, z);
    
    // Add real PointLight
    // Randomize light color: blue, green, pink
    const colors = [0x00ff66, 0x00ccff, 0xff0055];
    const lightColor = colors[Math.abs(z) % colors.length];
    bulbMat.color.setHex(lightColor);
    
    const light = new THREE.PointLight(lightColor, 1.5, 12);
    light.position.set(0, height - 1.4, z);
    
    this.scene.add(bulb);
    this.scene.add(light);
    
    this.lights.push({ bulb, light, baseIntensity: 1.5, zOffset: z });
  }

  bindEvents() {
    // Window Resize
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Keyboard inputs
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
    
    // Menu Buttons click handlers
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-store').addEventListener('click', () => this.openStore());
    document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
    
    document.getElementById('btn-store-back').addEventListener('click', () => this.backToMenu());
    document.getElementById('btn-settings-back').addEventListener('click', () => this.closeSettings());
    
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());
  }

  initSettingsUI() {
    const sfxSlider = document.getElementById('slider-sfx');
    const musicSlider = document.getElementById('slider-music');
    const particleCheckbox = document.getElementById('chk-particles');
    
    // Load state values into DOM
    sfxSlider.value = this.state.sfxVolume;
    musicSlider.value = this.state.musicVolume;
    particleCheckbox.checked = this.state.ultraParticles;
    
    // Bind listeners
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
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  startGame() {
    this.audio.init();
    
    // Clear screen arrays
    this.zombies.forEach(z => z.destroy());
    this.zombies = [];
    this.particles.clear();
    
    // Reset state parameters
    this.state.score = 0;
    this.state.wave = 1;
    this.state.zombiesKilled = 0;
    this.state.zombiesActive = 0;
    this.state.coinsEarnedThisRun = 0;
    this.state.health = 100;
    this.state.resetCombo();
    
    // Reset indicators
    document.getElementById('score-val').innerText = '0';
    document.getElementById('wave-val').innerText = '1';
    document.getElementById('health-bar-fill').style.width = '100%';
    
    this.typing.reset();
    this.calculateWaveBudget();
    
    this.spawnTimer = 0;
    this.state.setGameState(GameState.PLAYING);
  }

  calculateWaveBudget() {
    // Number of zombies to spawn increases per wave
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
    this.state.setGameState(GameState.MENU); // back-state trigger safety
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('store-screen').classList.add('active');
    this.storeController.render();
    
    // Boot audio just in case
    this.audio.init();
  }

  openSettings() {
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('settings-screen').classList.add('active');
    this.audio.init();
  }

  closeSettings() {
    document.getElementById('settings-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
  }

  backToMenu() {
    document.getElementById('store-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
  }

  quitToMenu() {
    this.state.setGameState(GameState.MENU);
  }

  togglePause() {
    if (this.state.currentState === GameState.PLAYING) {
      this.state.setGameState(GameState.PAUSED);
    } else if (this.state.currentState === GameState.PAUSED) {
      document.getElementById('pause-screen').classList.remove('active');
      this.state.currentState = GameState.PLAYING;
      document.getElementById('hud-overlay').classList.remove('hidden');
    }
  }

  triggerCameraShake(intensity) {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + intensity);
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000); // capped delta
    this.lastTime = timestamp;
    
    if (this.state.currentState === GameState.PLAYING) {
      this.update(dt);
    }
    
    this.render(dt);
    
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
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
      
      // Check distance to camera (corridor player reaches at Z=5.0)
      if (z.worldZ >= 4.8) {
        // Player bit!
        this.state.health = Math.max(0, this.state.health - 20);
        document.getElementById('health-bar-fill').style.width = `${this.state.health}%`;
        
        this.triggerCameraShake(0.5);
        this.audio.playSFX('hurt');
        
        // Break current target lock if this was the target
        if (this.typing.currentTarget === z) {
          this.typing.reset();
        }
        
        // Remove zombie
        z.destroy();
        this.zombies.splice(i, 1);
        
        // Count as finished/killed to progress wave
        this.state.zombiesKilled++;
        this.updateZombiesHUD();
        
        if (this.state.health <= 0) {
          this.state.setGameState(GameState.GAME_OVER);
          this.audio.stopAll();
        }
        continue;
      }
      
      // If dead (obliterated by typing)
      if (z.isDead) {
        this.triggerCameraShake(0.35);
        z.destroy();
        this.zombies.splice(i, 1);
        
        this.state.zombiesKilled++;
        this.updateZombiesHUD();
      }
    }
    
    // 3. Check Wave Complete
    if (this.state.zombiesKilled >= this.state.zombiesInWave && this.zombies.length === 0) {
      this.state.wave++;
      document.getElementById('wave-val').innerText = this.state.wave;
      this.calculateWaveBudget();
      this.triggerCameraShake(0.2);
    }
    
    // 4. Update Combo decay
    this.state.updateCombo(dt);
    
    // 5. Update Particles
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
    
    // Ensure we don't pick words starting with a character that an active zombie already has 
    // to avoid multi-selection targeting issues (unless fallback is required)
    const activeStartChars = this.zombies.map(z => z.word[0].toLowerCase());
    let candidates = wordList.filter(w => !activeStartChars.includes(w[0].toLowerCase()));
    
    if (candidates.length === 0) {
      candidates = wordList; // fallback
    }
    
    const word = candidates[Math.floor(Math.random() * candidates.length)];
    
    // Speed increases per wave
    const speed = 1.8 + this.state.wave * 0.22;
    // Spawn depth down the corridor Z
    const spawnDepth = -70.0;
    
    const z = new Zombie(this.scene, word, speed, spawnDepth, this.state.equippedFont);
    this.zombies.push(z);
  }

  render(dt) {
    // 1. Neon Flicker animation
    this.flickerTimer += dt;
    this.lights.forEach(l => {
      // Periodic flickering
      const noise = Math.sin(this.flickerTimer * 12 + l.zOffset) * Math.cos(this.flickerTimer * 4);
      let intensity = l.baseIntensity;
      
      if (noise > 0.75) {
        intensity *= 0.15; // flicker down
        l.bulb.material.color.setHex(0x111115); // off-dark neon
      } else {
        l.bulb.material.color.setHex(l.light.color.getHex());
      }
      
      l.light.intensity = intensity;
    });
    
    // 2. Apply Camera Shake displacement
    if (this.shakeIntensity > 0) {
      this.shakeIntensity -= this.shakeDecay * dt;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;
      
      const dx = (Math.random() - 0.5) * this.shakeIntensity * 0.15;
      const dy = (Math.random() - 0.5) * this.shakeIntensity * 0.15;
      
      this.camera.position.set(dx, 0.2 + dy, 5.0);
    } else {
      this.camera.position.set(0, 0.2, 5.0);
    }
    
    // 3. Render WebGL
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game app on load
window.addEventListener('load', () => {
  new GameApp();
});
