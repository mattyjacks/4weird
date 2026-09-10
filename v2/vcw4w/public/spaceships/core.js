// Core System - Premium Autonomous 3D Spaceship & Solar System Simulation (Three.js Version)
// Implements 3D WebGL rendering, custom modular ship loading, obstacle avoidance,
// flocking behaviors, volumetric solar halo, parallax starfields, and engine trails.

import { ShipBuilder } from './ship-builder.js';

const THREE = window.THREE;

class SpaceSoundSystem {
  constructor() {
    this.muted = true;
    this.ctx = null;
  }
  
  initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (!this.muted) {
      this.initContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    return this.muted;
  }

  playLaser() {
    if (this.muted) return;
    try {
      this.initContext();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio issue ignored
    }
  }

  playExplosion() {
    if (this.muted) return;
    try {
      this.initContext();
      const ctx = this.ctx;
      const bufferSize = ctx.sampleRate * 0.35;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.35);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start();
      noise.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio issues ignored
    }
  }
}

class SpaceGameCore {
  constructor() {
    this.state = {
      initialized: false,
      running: false,
      loading: false,
      error: null,
      cameraMode: 'chase' // chase, top, side, orbit
    };
    
    this.systems = new Map();
    this.soundSystem = new SpaceSoundSystem();
    this.timeScale = 1.0;
    this.credits = 1250;
    
    this.config = {
      maxShips: 7,
      targetFPS: 60
    };
    
    this.performance = {
      frameCount: 0,
      lastTime: 0,
      fps: 60,
      loadTime: 0
    };

    // Three.js Core components
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.lights = [];

    // Entities
    this.ships = [];
    this.aliens = [];
    this.projectiles = [];
    this.particles = [];
    this.planets = [];
    this.asteroids = [];
    this.dust = null;

    // Sun reference & lights
    this.sun = null;
    this.sunLight = null;
    this.sunGlowShells = [];

    // Background Nebula plates
    this.nebulae = [];

    // Controls state
    this.keys = {};
    this.creditsTimer = 0;

    // Autonomous steering helper waypoints
    this.wanderTarget = new THREE.Vector3(200, 0, 100);
    this.wanderAngle = 0;

    this.animationFrameId = null;
  }

  async initialize(canvasId = 'starfield') {
    if (this.state.initialized) return true;
    this.state.loading = true;
    const startTime = performance.now();

    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        throw new Error(`Canvas with ID '${canvasId}' not found.`);
      }

      // 1. Initialize WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x05030a, 1);

      // 2. Initialize Scene & Camera
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x05030a, 0.0005);

      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 2000);
      this.camera.position.set(0, 80, 220);

      // 3. Initialize Lighting
      const ambientLight = new THREE.AmbientLight(0xddecff, 2.8);
      this.scene.add(ambientLight);
      this.lights.push(ambientLight);

      // Add a DirectionalLight for global highlight illumination
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
      dirLight.position.set(200, 300, 200);
      this.scene.add(dirLight);
      this.lights.push(dirLight);

      // 4. Initialize Environments & Entities
      this.initEnvironment();
      this.initEntities();

      // Keyboard & resize listeners
      window.addEventListener('resize', this.handleResize);
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      this.state.initialized = true;
      this.state.loading = false;
      this.performance.loadTime = performance.now() - startTime;
      
      return true;
    } catch (e) {
      this.state.error = e;
      this.state.loading = false;
      console.error('[SpaceGameCore] WebGL Init failed:', e);
      return false;
    }
  }

  handleResize = () => {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  handleKeyDown = (e) => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.fireLaser(this.ships[0]);
    }
  };

  handleKeyUp = (e) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  handleVisibilityChange = () => {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  };

  getSystem(name) {
    if (name === 'audiosystem') {
      return this.soundSystem;
    }
    return null;
  }

  // Create nebula gradient texture procedurally
  createNebulaTexture(color1, color2) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, color1);
    grad.addColorStop(0.5, color2);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    return new THREE.CanvasTexture(canvas);
  }

  initEnvironment() {
    // 1. Pulsing Glowing Sun
    const sunGeom = new THREE.SphereGeometry(38, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sun = new THREE.Mesh(sunGeom, sunMat);
    this.scene.add(this.sun);

    // Glowing sun shells
    const glowColors = [0xff6600, 0xffaa00, 0xffea00];
    glowColors.forEach((color, idx) => {
      const shellGeom = new THREE.SphereGeometry(38 * (1.1 + idx * 0.15), 32, 32);
      const shellMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25 - idx * 0.07,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      const shell = new THREE.Mesh(shellGeom, shellMat);
      this.sun.add(shell);
      this.sunGlowShells.push(shell);
    });

    this.sunLight = new THREE.PointLight(0xffe6b3, 5.0, 1500, 0.5);
    this.scene.add(this.sunLight);

    // 2. Parallax background starfields
    const starsCount = 600;
    const starGeoms = [new THREE.BufferGeometry(), new THREE.BufferGeometry(), new THREE.BufferGeometry()];
    const starMats = [
      new THREE.PointsMaterial({ color: 0xffffff, size: 2.8, transparent: true, opacity: 0.95 }),
      new THREE.PointsMaterial({ color: 0x00f2fe, size: 3.5, transparent: true, opacity: 0.85 }),
      new THREE.PointsMaterial({ color: 0xa855f7, size: 2.0, transparent: true, opacity: 0.95 })
    ];

    starGeoms.forEach((geom, idx) => {
      const positions = new Float32Array(starsCount * 3);
      for (let i = 0; i < starsCount * 3; i += 3) {
        const radius = 600 + idx * 200 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = radius * Math.cos(phi);
      }
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(geom, starMats[idx]);
      this.scene.add(points);
    });

    // 3. Floating Nebulae Planes
    const nebConfigs = [
      { color1: 'rgba(139, 92, 246, 0.65)', color2: 'rgba(6, 182, 212, 0.15)', pos: new THREE.Vector3(-300, -100, -500), size: 800 },
      { color1: 'rgba(16, 185, 129, 0.55)', color2: 'rgba(139, 92, 246, 0.10)', pos: new THREE.Vector3(400, 150, -400), size: 900 },
      { color1: 'rgba(6, 182, 212, 0.60)', color2: 'rgba(236, 72, 153, 0.20)', pos: new THREE.Vector3(0, -200, -600), size: 1000 }
    ];

    nebConfigs.forEach(conf => {
      const tex = this.createNebulaTexture(conf.color1, conf.color2);
      const geom = new THREE.PlaneGeometry(conf.size, conf.size);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(conf.pos);
      mesh.lookAt(new THREE.Vector3(0, 0, 0));
      this.scene.add(mesh);
      this.nebulae.push(mesh);
    });

    // 4. Planets orbiting around sun
    const planetTypes = [
      { name: 'Planet 1', dist: 280, radius: 14, speed: 0.0006, color: 0xec4899, roughness: 0.4 },
      { name: 'Planet 2', dist: 420, radius: 20, speed: 0.0004, color: 0x06b6d4, roughness: 0.2 },
      { name: 'Planet 3', dist: 580, radius: 28, speed: 0.00025, color: 0x10b981, roughness: 0.5, rings: true },
      { name: 'Planet 4', dist: 750, radius: 18, speed: 0.00018, color: 0xf59e0b, roughness: 0.6 }
    ];

    planetTypes.map((t, idx) => {
      const geom = new THREE.SphereGeometry(t.radius, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: t.color,
        roughness: t.roughness,
        metalness: 0.1,
        flatShading: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(t.dist, 0, 0);
      this.scene.add(mesh);

      let ringsMesh = null;
      if (t.rings) {
        const ringGeom = new THREE.RingGeometry(t.radius * 1.3, t.radius * 2.0, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4
        });
        ringsMesh = new THREE.Mesh(ringGeom, ringMat);
        ringsMesh.rotation.x = Math.PI / 2;
        mesh.add(ringsMesh);
      }

      this.planets.push({
        ...t,
        mesh: mesh,
        angle: Math.random() * Math.PI * 2,
        moons: Array.from({ length: idx % 2 }, () => {
          const mRadius = 3 + Math.random() * 2;
          const mGeom = new THREE.SphereGeometry(mRadius, 16, 16);
          const mMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d });
          const mMesh = new THREE.Mesh(mGeom, mMat);
          this.scene.add(mMesh);
          return {
            mesh: mMesh,
            dist: t.radius * 2.3 + Math.random() * 8,
            radius: mRadius,
            speed: 0.0025 + Math.random() * 0.003,
            angle: Math.random() * Math.PI * 2
          };
        })
      });
    });

    // 5. Orbit Lines
    planetTypes.forEach(p => {
      const orbitGeom = new THREE.BufferGeometry();
      const points = [];
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        points.push(new THREE.Vector3(p.dist * Math.cos(theta), 0, p.dist * Math.sin(theta)));
      }
      orbitGeom.setFromPoints(points);
      const orbitLine = new THREE.Line(orbitGeom, new THREE.LineBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.06 }));
      this.scene.add(orbitLine);
    });

    // 6. Jagged Asteroids
    for (let i = 0; i < 25; i++) {
      const dist = 320 + Math.random() * 300;
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 9;
      
      const geom = new THREE.DodecahedronGeometry(radius, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.9,
        metalness: 0.2,
        flatShading: true
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        dist * Math.cos(angle),
        (Math.random() - 0.5) * 80,
        dist * Math.sin(angle)
      );
      this.scene.add(mesh);
      this.asteroids.push({
        mesh: mesh,
        radius: radius,
        rotationSpeed: new THREE.Vector3(Math.random() * 0.015, Math.random() * 0.015, Math.random() * 0.015)
      });
    }

    // 7. Space Dust/Ambient particles
    const dustCount = 350;
    const dustGeom = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 900;
      dustPos[i + 1] = (Math.random() - 0.5) * 400;
      dustPos[i + 2] = (Math.random() - 0.5) * 900;
    }
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.4
    });
    this.dust = new THREE.Points(dustGeom, dustMat);
    this.scene.add(this.dust);
  }

  initEntities() {
    this.ships = [];
    this.aliens = [];
    this.projectiles = [];
    this.particles = [];

    // Colors & speeds for humans
    const humanShipProfiles = [
      { colorHex: 0x06b6d4, color: '#06b6d4', size: 20, maxSpeed: 210 },
      { colorHex: 0x8b5cf6, color: '#8b5cf6', size: 24, maxSpeed: 170 },
      { colorHex: 0x10b981, color: '#10b981', size: 18, maxSpeed: 250 },
      { colorHex: 0xa855f7, color: '#a855f7', size: 22, maxSpeed: 190 },
      { colorHex: 0xf43f5e, color: '#f43f5e', size: 21, maxSpeed: 200 }
    ];

    // Create fleet of human ships
    for (let i = 0; i < this.config.maxShips; i++) {
      const profile = humanShipProfiles[i % humanShipProfiles.length];
      const offsetAngle = (i / this.config.maxShips) * Math.PI * 2;
      const startDist = 300 + Math.random() * 50;

      // BUILD SHIP WITH PREMADE modular structures
      const shipMesh = ShipBuilder.buildShip('human', 0.1 + i * 0.45);
      
      // Make them BIGLY VISIBLE! (Scale up by 3x)
      shipMesh.scale.set(3.2, 3.2, 3.2);
      this.scene.add(shipMesh);

      shipMesh.position.set(
        startDist * Math.cos(offsetAngle),
        (Math.random() - 0.5) * 40,
        startDist * Math.sin(offsetAngle)
      );

      this.ships.push({
        id: `ship_${i}`,
        mesh: shipMesh,
        pos: shipMesh.position, // Direct link to position vector
        vel: new THREE.Vector3(-Math.sin(offsetAngle) * profile.maxSpeed * 0.6, 0, Math.cos(offsetAngle) * profile.maxSpeed * 0.6),
        color: profile.color,
        colorHex: profile.colorHex,
        size: profile.size,
        maxSpeed: profile.maxSpeed,
        boostTimer: 0,
        boostActive: false,
        shootCooldown: 0,
        trail: [],
        trailMesh: this.createTrailMesh(profile.color)
      });
    }

    // Alien Interceptors
    for (let i = 0; i < 3; i++) {
      const offsetAngle = Math.random() * Math.PI * 2;
      
      const alienMesh = ShipBuilder.buildShip('alien', Math.random());
      // Make aliens bigly visible as well!
      alienMesh.scale.set(3.0, 3.0, 3.0);
      this.scene.add(alienMesh);

      alienMesh.position.set(
        500 * Math.cos(offsetAngle),
        (Math.random() - 0.5) * 60,
        500 * Math.sin(offsetAngle)
      );

      this.aliens.push({
        id: `alien_${i}`,
        mesh: alienMesh,
        pos: alienMesh.position,
        vel: new THREE.Vector3(0, 0, 0),
        colorHex: 0xf43f5e,
        color: '#f43f5e',
        size: 20,
        maxSpeed: 170,
        health: 100,
        shootCooldown: Math.random() * 2.0,
        trail: [],
        trailMesh: this.createTrailMesh('#f43f5e')
      });
    }
  }

  createTrailMesh(color) {
    const geometry = new THREE.BufferGeometry();
    const maxTrailPoints = 30;
    const positions = new Float32Array(maxTrailPoints * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      linewidth: 3 // Line thickness is browser implementation dependent
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    return line;
  }

  updateTrail(ship) {
    const trailPositions = ship.trail;
    trailPositions.push(ship.pos.clone());
    if (trailPositions.length > 30) {
      trailPositions.shift();
    }

    const posAttr = ship.trailMesh.geometry.attributes.position;
    for (let i = 0; i < 30; i++) {
      const pt = trailPositions[Math.min(i, trailPositions.length - 1)] || ship.pos;
      posAttr.setXYZ(i, pt.x, pt.y, pt.z);
    }
    posAttr.needsUpdate = true;
  }

  fireLaser(ship) {
    if (!ship) return;

    // Laser flight vector
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(ship.mesh.quaternion).normalize();

    // Laser offset positions (dual barrel)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.mesh.quaternion).normalize();
    const lPos = ship.pos.clone().addScaledVector(right, -ship.size * 0.45);
    const rPos = ship.pos.clone().addScaledVector(right, ship.size * 0.45);

    const laserGeom = new THREE.BoxGeometry(0.8, 0.8, 12);
    const laserMat = new THREE.MeshBasicMaterial({
      color: ship.colorHex,
      blending: THREE.AdditiveBlending
    });

    const createProj = (startPos) => {
      const mesh = new THREE.Mesh(laserGeom, laserMat);
      mesh.position.copy(startPos);
      mesh.quaternion.copy(ship.mesh.quaternion);
      this.scene.add(mesh);

      this.projectiles.push({
        mesh: mesh,
        dir: dir.clone(),
        speed: 750,
        faction: ship.id.startsWith('alien') ? 'alien' : 'human',
        life: 2.0
      });
    };

    createProj(lPos);
    createProj(rPos);

    this.soundSystem.playLaser();
  }

  spawnExplosion(pos, colorHex, count = 20) {
    this.soundSystem.playExplosion();

    const pGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 70;
      const pitch = (Math.random() - 0.5) * Math.PI;

      velocities.push(new THREE.Vector3(
        speed * Math.cos(angle) * Math.cos(pitch),
        speed * Math.sin(pitch),
        speed * Math.sin(angle) * Math.cos(pitch)
      ));
    }

    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: colorHex,
      size: 3.5,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(pGeom, pMat);
    this.scene.add(points);

    this.particles.push({
      points: points,
      velocities: velocities,
      alpha: 1.0,
      decay: 0.95 + Math.random() * 0.9
    });
  }

  spawnThrustParticle(pos, vel, colorHex) {
    const backward = vel.clone().normalize().negate();
    const speed = 20 + Math.random() * 45;
    
    // Slight randomized exhaust dispersion
    const dir = backward.add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25
    )).normalize();

    const sparkGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(3);
    positions[0] = pos.x + dir.x * -10;
    positions[1] = pos.y + dir.y * -10;
    positions[2] = pos.z + dir.z * -10;
    sparkGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const sparkMat = new THREE.PointsMaterial({
      color: colorHex,
      size: 2.2,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(sparkGeom, sparkMat);
    this.scene.add(points);

    this.particles.push({
      points: points,
      velocities: [dir.multiplyScalar(speed)],
      alpha: 0.9,
      decay: 2.2 + Math.random() * 1.5
    });
  }

  start() {
    if (this.state.running) return;
    this.state.running = true;
    this.performance.lastTime = performance.now();
    this.animate();
  }

  stop() {
    this.state.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    // Dispose entities
    this.ships.forEach(s => {
      this.scene.remove(s.mesh);
      this.scene.remove(s.trailMesh);
    });
    this.aliens.forEach(al => {
      this.scene.remove(al.mesh);
      this.scene.remove(al.trailMesh);
    });
    this.projectiles.forEach(p => this.scene.remove(p.mesh));
    this.particles.forEach(pt => this.scene.remove(pt.points));
    this.planets.forEach(pl => {
      this.scene.remove(pl.mesh);
      pl.moons.forEach(m => this.scene.remove(m.mesh));
    });
    this.asteroids.forEach(ast => this.scene.remove(ast.mesh));

    this.state.initialized = false;
  }

  getStatus() {
    return {
      initialized: this.state.initialized,
      running: this.state.running,
      fps: Math.round(this.performance.fps),
      shipsCount: this.ships.length,
      particlesCount: this.particles.length
    };
  }

  animate = (currentTime = performance.now()) => {
    if (!this.state.running) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    let dt = (currentTime - this.performance.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.performance.lastTime = currentTime;

    this.performance.fps = this.performance.fps * 0.95 + (1 / (dt || 0.016)) * 0.05;

    const activeDt = dt * this.timeScale;

    this.update(activeDt);
    this.renderer.render(this.scene, this.camera);
  };

  update(dt) {
    if (dt <= 0) return;

    // Credit logic updates
    this.creditsTimer += dt;
    if (this.creditsTimer > 1.5) {
      this.credits += Math.floor(Math.random() * 8) + 4;
      this.creditsTimer = 0;
      const creditsEl = document.getElementById('hud-credits');
      if (creditsEl) {
        creditsEl.textContent = `${this.credits} CR`;
      }
    }

    // 1. Orbit Planets & Moons
    this.planets.forEach(p => {
      p.angle += p.speed * dt;
      p.mesh.position.set(p.dist * Math.cos(p.angle), 0, p.dist * Math.sin(p.angle));

      // Rotate planet
      p.mesh.rotation.y += 0.005;

      p.moons.forEach(m => {
        m.angle += m.speed * dt;
        m.mesh.position.set(
          p.mesh.position.x + m.dist * Math.cos(m.angle),
          Math.sin(m.angle) * 4.0,
          p.mesh.position.z + m.dist * Math.sin(m.angle)
        );
      });
    });

    // 2. Rotate Asteroids
    this.asteroids.forEach(a => {
      a.mesh.rotation.x += a.rotationSpeed.x;
      a.mesh.rotation.y += a.rotationSpeed.y;
      a.mesh.rotation.z += a.rotationSpeed.z;
    });

    // 3. Pulse Sun and Glow Halos
    const timeVal = performance.now() * 0.003;
    const sunScale = 1.0 + 0.035 * Math.sin(timeVal);
    this.sun.scale.set(sunScale, sunScale, sunScale);
    this.sunGlowShells.forEach((shell, idx) => {
      const pulse = 1.0 + 0.05 * Math.sin(timeVal + idx * Math.PI * 0.3);
      shell.scale.set(pulse, pulse, pulse);
    });

    // 4. Update Autonomous Waypoint / Wander target
    this.wanderAngle += 0.28 * dt;
    const wanderRadius = 450;
    this.wanderTarget.set(
      wanderRadius * Math.cos(this.wanderAngle),
      40 * Math.sin(this.wanderAngle * 0.7),
      wanderRadius * Math.sin(this.wanderAngle * 0.5) * Math.cos(this.wanderAngle)
    );

    // 5. Update Human Fleet Flocking & Avoidance
    this.ships.forEach((ship, idx) => {
      const isLead = idx === 0;
      const steer = new THREE.Vector3(0, 0, 0);

      // Keyboard steering controls for lead ship (Override Autopilot)
      let manualSteering = false;
      if (isLead) {
        let yawChange = 0;
        let pitchChange = 0;

        if (this.keys['w'] || this.keys['arrowup']) {
          pitchChange = -1.8;
          manualSteering = true;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
          pitchChange = 1.8;
          manualSteering = true;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
          yawChange = -2.2;
          manualSteering = true;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
          yawChange = 2.2;
          manualSteering = true;
        }

        if (manualSteering) {
          const currentForward = ship.vel.clone().normalize();
          const right = new THREE.Vector3(0, 1, 0).cross(currentForward).normalize();
          const up = currentForward.clone().cross(right).normalize();

          if (yawChange !== 0) {
            currentForward.addScaledVector(right, yawChange * dt);
          }
          if (pitchChange !== 0) {
            currentForward.addScaledVector(up, pitchChange * dt);
          }
          currentForward.normalize();
          const targetSp = ship.boostActive ? ship.maxSpeed * 1.5 : ship.maxSpeed;
          ship.vel.copy(currentForward).multiplyScalar(targetSp);
        }
      }

      if (!isLead || !manualSteering) {
        // Target: Wander point or lead ship
        const target = isLead ? this.wanderTarget : this.ships[0].pos;
        const toTarget = target.clone().sub(ship.pos);
        if (toTarget.lengthSq() > 100) {
          steer.add(toTarget.normalize().multiplyScalar(1.4));
        }

        // Flocking behaviors (Separation, Cohesion, Alignment)
        const separation = new THREE.Vector3();
        const cohesion = new THREE.Vector3();
        const alignment = new THREE.Vector3();
        let neighbors = 0;

        this.ships.forEach((other, oIdx) => {
          if (idx === oIdx) return;
          const d = ship.pos.distanceTo(other.pos);
          if (d < 180) {
            neighbors++;
            if (d < 45) {
              const diff = ship.pos.clone().sub(other.pos).normalize();
              separation.addScaledVector(diff, 60 / (d || 1));
            }
            cohesion.add(other.pos);
            alignment.add(other.vel);
          }
        });

        if (neighbors > 0) {
          cohesion.divideScalar(neighbors).sub(ship.pos).normalize();
          steer.addScaledVector(cohesion, 0.75);

          alignment.divideScalar(neighbors).normalize();
          steer.addScaledVector(alignment, 0.55);
        }
        steer.add(separation);
      }

      // SUN AVOIDANCE STEERING FORCE (CRITICAL FIX)
      const distToSun = ship.pos.length();
      const sunAvoidRadius = 165;
      if (distToSun < sunAvoidRadius) {
        const repel = ship.pos.clone().normalize();
        const orbitDir = repel.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
        const factor = Math.pow(1.0 - distToSun / sunAvoidRadius, 2);
        
        steer.addScaledVector(repel, factor * 85.0);
        steer.addScaledVector(orbitDir, factor * 45.0);
      }

      // Obstacle avoidance for planets
      this.planets.forEach(p => {
        const d = ship.pos.distanceTo(p.mesh.position);
        const avoidR = p.radius * 2.5 + 20;
        if (d < avoidR) {
          const repel = ship.pos.clone().sub(p.mesh.position).normalize();
          const factor = (1.0 - d / avoidR);
          steer.addScaledVector(repel, factor * 110.0);
        }
      });

      // Avoid asteroids
      this.asteroids.forEach(a => {
        const d = ship.pos.distanceTo(a.mesh.position);
        const avoidR = a.radius * 2.2 + 15;
        if (d < avoidR) {
          const repel = ship.pos.clone().sub(a.mesh.position).normalize();
          const factor = (1.0 - d / avoidR);
          steer.addScaledVector(repel, factor * 90.0);
        }
      });

      // Integrate velocity & position
      if (steer.lengthSq() > 0.001) {
        steer.normalize().multiplyScalar(ship.maxSpeed * 0.16);
        ship.vel.addScaledVector(steer, dt);
      }

      // Cap speed boundaries
      let speed = ship.vel.length();
      const speedLimit = ship.boostActive ? ship.maxSpeed * 1.5 : ship.maxSpeed;
      if (speed > speedLimit) {
        ship.vel.normalize().multiplyScalar(speedLimit);
      } else if (speed < 60) {
        ship.vel.normalize().multiplyScalar(80);
      }

      ship.pos.addScaledVector(ship.vel, dt);

      // Handle Rotations to face flight direction
      if (ship.vel.lengthSq() > 0.1) {
        // Build rotation matrix looking towards velocity direction
        const targetRotation = new THREE.Matrix4().lookAt(
          ship.pos,
          ship.pos.clone().add(ship.vel),
          new THREE.Vector3(0, 1, 0)
        );
        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotation);
        ship.mesh.quaternion.slerp(targetQuaternion, 7.5 * dt);
      }

      // Occasional boost cycle
      ship.boostTimer -= dt;
      if (ship.boostTimer <= 0) {
        ship.boostActive = !ship.boostActive;
        ship.boostTimer = ship.boostActive ? 1.5 + Math.random() * 2 : 4 + Math.random() * 5;
      }

      // Update light trails
      this.updateTrail(ship);

      // Spark engine particles
      if (Math.random() < 0.38) {
        this.spawnThrustParticle(ship.pos, ship.vel, ship.colorHex);
      }

      // Weapon targeting Skirmish triggers
      ship.shootCooldown -= dt;
      if (ship.shootCooldown <= 0) {
        const targetAlien = this.aliens.find(al => ship.pos.distanceToSquared(al.pos) < 250000);
        if (targetAlien) {
          this.fireLaser(ship);
          ship.shootCooldown = 0.8 + Math.random() * 1.0;
        }
      }
    });

    // 6. Update Aliens AI
    this.aliens.forEach(al => {
      const lead = this.ships[0];
      if (lead) {
        const toLead = lead.pos.clone().sub(al.pos);
        const dist = toLead.length();
        let steer = new THREE.Vector3();

        if (dist > 350) {
          steer.copy(toLead).normalize();
        } else if (dist < 150) {
          steer.copy(toLead).normalize().negate().multiplyScalar(1.2);
        } else {
          // Orbit flight behavior
          steer.copy(toLead).normalize().cross(new THREE.Vector3(0, 1, 0)).normalize();
        }

        // Avoid Sun
        const distToSun = al.pos.length();
        if (distToSun < 165) {
          const repel = al.pos.clone().normalize();
          steer.addScaledVector(repel, 3.2);
        }

        al.vel.addScaledVector(steer, al.maxSpeed * 0.28 * dt);
      }

      // Speed caps
      const speed = al.vel.length();
      if (speed > al.maxSpeed) {
        al.vel.normalize().multiplyScalar(al.maxSpeed);
      }

      al.pos.addScaledVector(al.vel, dt);

      // Face flight orientation
      if (al.vel.lengthSq() > 0.1) {
        const targetRotation = new THREE.Matrix4().lookAt(
          al.pos,
          al.pos.clone().add(al.vel),
          new THREE.Vector3(0, 1, 0)
        );
        const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetRotation);
        al.mesh.quaternion.slerp(targetQuaternion, 7.5 * dt);
      }

      this.updateTrail(al);

      if (Math.random() < 0.25) {
        this.spawnThrustParticle(al.pos, al.vel, al.colorHex);
      }

      // Reverse weapon fire triggers
      al.shootCooldown -= dt;
      if (al.shootCooldown <= 0 && lead) {
        if (al.pos.distanceToSquared(lead.pos) < 220000) {
          this.fireLaser(al);
          al.shootCooldown = 1.6 + Math.random() * 2.0;
        }
      }
    });

    // 7. Update Projectiles
    const nextProjectiles = [];
    this.projectiles.forEach(p => {
      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.life -= dt;

      let destroyed = p.life <= 0;

      if (!destroyed) {
        if (p.faction === 'human') {
          for (let i = this.aliens.length - 1; i >= 0; i--) {
            const al = this.aliens[i];
            if (p.mesh.position.distanceToSquared(al.pos) < (al.size * 2.2) ** 2) {
              destroyed = true;
              this.spawnExplosion(p.mesh.position, al.colorHex, 20);
              al.health -= 35;
              if (al.health <= 0) {
                const angle = Math.random() * Math.PI * 2;
                al.pos.set(600 * Math.cos(angle), (Math.random() - 0.5) * 80, 600 * Math.sin(angle));
                al.vel.set(0, 0, 0);
                al.health = 100;
                this.credits += 250;
                this.spawnExplosion(al.pos, 0xf43f5e, 40);
              }
              break;
            }
          }
        } else {
          for (let i = 0; i < this.ships.length; i++) {
            const sh = this.ships[i];
            if (p.mesh.position.distanceToSquared(sh.pos) < (sh.size * 2.2) ** 2) {
              destroyed = true;
              this.spawnExplosion(p.mesh.position, 0xffffff, 10);
              this.spawnExplosion(sh.pos, sh.colorHex, 15);
              break;
            }
          }
        }
      }

      if (destroyed) {
        this.scene.remove(p.mesh);
      } else {
        nextProjectiles.push(p);
      }
    });
    this.projectiles = nextProjectiles;

    // 8. Update Particles
    const nextParticles = [];
    this.particles.forEach(p => {
      const posAttr = p.points.geometry.attributes.position;
      const count = posAttr.count;

      p.alpha -= p.decay * dt;
      p.points.material.opacity = p.alpha;

      for (let i = 0; i < count; i++) {
        const vx = p.velocities[i].x;
        const vy = p.velocities[i].y;
        const vz = p.velocities[i].z;

        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vx * dt,
          posAttr.getY(i) + vy * dt,
          posAttr.getZ(i) + vz * dt
        );
      }
      posAttr.needsUpdate = true;

      if (p.alpha <= 0) {
        this.scene.remove(p.points);
      } else {
        nextParticles.push(p);
      }
    });
    this.particles = nextParticles;

    // 9. Update Camera positioning
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    const leadShip = this.ships[0];
    if (!leadShip) return;

    let targetCamPos = new THREE.Vector3(0, 80, 220);
    let targetCamLook = new THREE.Vector3(0, 0, 0);

    const mode = this.state.cameraMode;

    if (mode === 'chase') {
      const forwardVec = leadShip.vel.clone().normalize();
      targetCamPos.copy(leadShip.pos).addScaledVector(forwardVec, -170);
      targetCamPos.y += 48;
      targetCamLook.copy(leadShip.pos).addScaledVector(forwardVec, 55);
    } else if (mode === 'top') {
      targetCamPos.set(leadShip.pos.x, 380, leadShip.pos.z + 15);
      targetCamLook.copy(leadShip.pos);
    } else if (mode === 'side') {
      const forwardVec = leadShip.vel.clone().normalize();
      const sideVec = new THREE.Vector3(0, 1, 0).cross(forwardVec).normalize();
      targetCamPos.copy(leadShip.pos).addScaledVector(sideVec, 160);
      targetCamPos.y += 35;
      targetCamLook.copy(leadShip.pos);
    } else if (mode === 'orbit') {
      const timeVal = performance.now() * 0.0001;
      const dist = 580;
      targetCamPos.set(dist * Math.cos(timeVal), 150, dist * Math.sin(timeVal));
      targetCamLook.copy(leadShip.pos).multiplyScalar(0.4);
    }

    this.camera.position.lerp(targetCamPos, 5.0 * dt);
    
    // Smooth camera lookAt transition using a helper target
    const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    currentLook.lerp(targetCamLook, 5.0 * dt);
    this.camera.lookAt(currentLook);
  }
}

export { SpaceGameCore };
