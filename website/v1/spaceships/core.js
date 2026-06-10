// Core System - Clean Architecture for Spaceship Game
// Lessons learned: Keep it simple, modular, and reliable

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class SpaceGameCore {
  constructor() {
    this.state = {
      initialized: false,
      running: false,
      loading: false,
      error: null
    };
    
    this.systems = new Map();
    this.config = {
      maxShips: 10,
      maxProjectiles: 50,
      targetFPS: 60,
      loadingTimeout: 5000
    };
    
    this.performance = {
      frameCount: 0,
      lastTime: 0,
      fps: 0,
      loadTime: 0
    };
  }

  async initialize(canvasId = 'starfield') {
    if (this.state.initialized) {
      console.warn('SpaceGameCore already initialized');
      return true;
    }

    this.state.loading = true;
    const startTime = performance.now();

    try {
      // Initialize core systems in order
      await this.initializeRenderer(canvasId);
      await this.initializeScene();
      await this.initializeSystems();
      await this.initializeContent();
      
      this.state.initialized = true;
      this.state.loading = false;
      this.performance.loadTime = performance.now() - startTime;
      
      console.log(`SpaceGameCore initialized in ${this.performance.loadTime.toFixed(2)}ms`);
      return true;
      
    } catch (error) {
      this.state.error = error;
      this.state.loading = false;
      console.error('SpaceGameCore initialization failed:', error);
      this.fallback();
      return false;
    }
  }

  async initializeRenderer(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      throw new Error(`Canvas with id '${canvasId}' not found`);
    }

    // Create optimized renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false, // Performance optimization
      powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x05030a, 1);
    renderer.shadowMap.enabled = false; // Performance optimization
    
    this.systems.set('renderer', renderer);
  }

  async initializeScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05030a, 0.0035);
    
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 500);
    camera.position.set(0, 10, 35);
    
    this.systems.set('scene', scene);
    this.systems.set('camera', camera);
  }

  async initializeSystems() {
    // Initialize all game systems
    const systems = [
      'LightingSystem',
      'StarfieldSystem', 
      'ShipSystem',
      'AlienSystem',
      'InputSystem',
      'UISystem'
    ];

    for (const SystemClass of systems) {
      try {
        const system = await this.createSystem(SystemClass);
        this.systems.set(SystemClass.toLowerCase(), system);
      } catch (error) {
        console.warn(`Failed to initialize ${SystemClass}:`, error);
      }
    }
  }

  async createSystem(systemName) {
    // Dynamic system creation
    switch (systemName) {
      case 'LightingSystem':
        return new LightingSystem(this.systems.get('scene'));
      case 'StarfieldSystem':
        return new StarfieldSystem(this.systems.get('scene'));
      case 'ShipSystem':
        return new ShipSystem(this.systems.get('scene'), this.config.maxShips);
      case 'AlienSystem':
        return new AlienSystem(this.systems.get('scene'));
      case 'InputSystem':
        return new InputSystem();
      case 'UISystem':
        return new UISystem();
      default:
        throw new Error(`Unknown system: ${systemName}`);
    }
  }

  async initializeContent() {
    // Initialize game content
    const shipSystem = this.systems.get('shipsystem');
    const alienSystem = this.systems.get('aliensystem');
    
    if (shipSystem) {
      await shipSystem.spawnFleet();
    }
    
    if (alienSystem) {
      await alienSystem.spawnWave();
    }
  }

  start() {
    if (!this.state.initialized) {
      console.error('Cannot start: System not initialized');
      return false;
    }

    if (this.state.running) {
      console.warn('System already running');
      return true;
    }

    this.state.running = true;
    this.gameLoop();
    return true;
  }

  stop() {
    this.state.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  gameLoop() {
    if (!this.state.running) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.performance.lastTime) / 1000;
    this.performance.lastTime = currentTime;

    // Update FPS counter
    this.performance.frameCount++;
    if (this.performance.frameCount % 60 === 0) {
      this.performance.fps = Math.round(1 / deltaTime);
    }

    // Update all systems
    this.update(deltaTime);

    // Render
    this.render();

    // Continue loop
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  update(deltaTime) {
    // Update all systems
    for (const [name, system] of this.systems) {
      if (system && typeof system.update === 'function') {
        try {
          system.update(deltaTime);
        } catch (error) {
          console.error(`Error updating ${name}:`, error);
        }
      }
    }
  }

  render() {
    const renderer = this.systems.get('renderer');
    const scene = this.systems.get('scene');
    const camera = this.systems.get('camera');

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  fallback() {
    console.log('Initializing fallback 2D starfield');
    const canvas = document.getElementById('starfield');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Simple 2D starfield
    ctx.fillStyle = '#05030a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2;
      const opacity = Math.random() * 0.8 + 0.2;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getSystem(name) {
    return this.systems.get(name.toLowerCase());
  }

  getStatus() {
    return {
      state: this.state,
      performance: this.performance,
      systems: Array.from(this.systems.keys()),
      config: this.config
    };
  }

  destroy() {
    this.stop();
    
    // Cleanup all systems
    for (const [name, system] of this.systems) {
      if (system && typeof system.destroy === 'function') {
        try {
          system.destroy();
        } catch (error) {
          console.error(`Error destroying ${name}:`, error);
        }
      }
    }

    // Cleanup renderer
    const renderer = this.systems.get('renderer');
    if (renderer) {
      renderer.dispose();
    }

    this.systems.clear();
    this.state.initialized = false;
  }
}

// Lighting System
class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    this.initialize();
  }

  initialize() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x1a1230, 1.2);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Main sun light
    const sunLight = new THREE.DirectionalLight(0x00f2fe, 1.8);
    sunLight.position.set(100, 80, 50);
    this.scene.add(sunLight);
    this.lights.push(sunLight);

    // Back light
    const backLight = new THREE.DirectionalLight(0xbd00ff, 0.9);
    backLight.position.set(-80, -40, -50);
    this.scene.add(backLight);
    this.lights.push(backLight);
  }

  update(deltaTime) {
    // Animate lights
    const time = Date.now() * 0.001;
    this.lights[1].position.x = Math.sin(time) * 100;
    this.lights[1].position.z = Math.cos(time) * 50;
  }

  destroy() {
    this.lights.forEach(light => this.scene.remove(light));
    this.lights = [];
  }
}

// Starfield System
class StarfieldSystem {
  constructor(scene) {
    this.scene = scene;
    this.stars = null;
    this.initialize();
  }

  initialize() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < 2000; i++) {
      positions.push(
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000
      );

      const color = new THREE.Color();
      const choice = Math.random();
      if (choice < 0.3) {
        color.setHSL(0.6, 0.2, 0.8); // Blue
      } else if (choice < 0.6) {
        color.setHSL(0.1, 0.2, 0.9); // Yellow
      } else {
        color.setHSL(0, 0, 0.9); // White
      }
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  update(deltaTime) {
    if (this.stars) {
      this.stars.rotation.y += deltaTime * 0.02;
    }
  }

  destroy() {
    if (this.stars) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      this.stars.material.dispose();
    }
  }
}

// Ship System
class ShipSystem {
  constructor(scene, maxShips) {
    this.scene = scene;
    this.maxShips = maxShips;
    this.ships = new Map();
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  async spawnFleet() {
    const positions = [
      [0, 0, 0],
      [-15, 2, 8],
      [15, 2, 8],
      [-25, -2, 12],
      [25, -2, 12]
    ];

    for (let i = 0; i < Math.min(positions.length, this.maxShips); i++) {
      const ship = this.createShip(`ship_${i}`);
      ship.position.set(...positions[i]);
      this.group.add(ship);
      this.ships.set(`ship_${i}`, ship);
    }
  }

  createShip(id) {
    const group = new THREE.Group();
    
    // Hull
    const hullGeometry = new THREE.BoxGeometry(4, 2, 6);
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      metalness: 0.8,
      roughness: 0.3
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    group.add(hull);

    // Wings
    const wingGeometry = new THREE.BoxGeometry(8, 0.5, 4);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c5aa0,
      metalness: 0.8,
      roughness: 0.3
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = -0.5;
    group.add(wings);

    // Engine
    const engineGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.z = 3;
    group.add(engine);

    group.userData = { id, type: 'ship' };
    return group;
  }

  update(deltaTime) {
    const time = Date.now() * 0.001;
    
    this.ships.forEach((ship, id) => {
      ship.position.y = Math.sin(time + parseInt(id)) * 0.5;
      ship.rotation.y += deltaTime * 0.1;
    });
  }

  destroy() {
    this.ships.forEach(ship => this.group.remove(ship));
    this.scene.remove(this.group);
    this.ships.clear();
  }
}

// Alien System
class AlienSystem {
  constructor(scene) {
    this.scene = scene;
    this.aliens = new Map();
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  async spawnWave() {
    for (let i = 0; i < 3; i++) {
      const alien = this.createAlien(`alien_${i}`);
      alien.position.set(
        (Math.random() - 0.5) * 100,
        0,
        -50 - Math.random() * 50
      );
      this.group.add(alien);
      this.aliens.set(`alien_${i}`, alien);
    }
  }

  createAlien(id) {
    const group = new THREE.Group();
    
    const geometry = new THREE.ConeGeometry(2, 4, 4);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      metalness: 0.6,
      roughness: 0.4
    });
    const alien = new THREE.Mesh(geometry, material);
    alien.rotation.z = Math.PI;
    group.add(alien);

    const glowGeometry = new THREE.SphereGeometry(0.3, 6, 6);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.z = 2;
    group.add(glow);

    group.userData = { id, type: 'alien', velocity: new THREE.Vector3(0, 0, 2) };
    return group;
  }

  update(deltaTime) {
    this.aliens.forEach((alien, id) => {
      alien.position.z += alien.userData.velocity.z * deltaTime * 10;
      alien.rotation.y += deltaTime * 0.5;
      
      // Reset if too far
      if (alien.position.z > 50) {
        alien.position.z = -100;
        alien.position.x = (Math.random() - 0.5) * 100;
      }
    });
  }

  destroy() {
    this.aliens.forEach(alien => this.group.remove(alien));
    this.scene.remove(this.group);
    this.aliens.clear();
  }
}

// Input System
class InputSystem {
  constructor() {
    this.keys = {};
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    window.addEventListener('resize', () => {
      // Handle resize
    });
  }

  update(deltaTime) {
    // Handle input
  }

  destroy() {
    // Cleanup
  }
}

// UI System
class UISystem {
  constructor() {
    this.elements = new Map();
    this.initialize();
  }

  initialize() {
    // Create UI elements
    this.createFPSCounter();
  }

  createFPSCounter() {
    const fpsElement = document.createElement('div');
    fpsElement.id = 'fps-counter';
    fpsElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      color: white;
      font-family: monospace;
      font-size: 14px;
      z-index: 1000;
      background: rgba(0,0,0,0.5);
      padding: 5px;
      border-radius: 3px;
    `;
    document.body.appendChild(fpsElement);
    this.elements.set('fps', fpsElement);
  }

  update(deltaTime) {
    const core = window.spaceGameCore;
    if (core && this.elements.has('fps')) {
      const fpsElement = this.elements.get('fps');
      fpsElement.textContent = `FPS: ${core.performance.fps} | Load: ${core.performance.loadTime.toFixed(0)}ms`;
    }
  }

  destroy() {
    this.elements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.elements.clear();
  }
}

// Export core class
export { SpaceGameCore };
