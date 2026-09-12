// ==========================================
// 7. CORE 3D GAME APP
// ==========================================
class GameApp {
  constructor() {
    this.state = new StateManager();
    this.audio = new AudioManager(this.state);
    
    // 2. Three.js Setup (fail fast with a readable error if shell is missing)
    this.container = document.getElementById('canvas-container');
    if (!this.container) throw new Error('Missing #canvas-container');
    this.scene = new THREE.Scene();
    
    this.scene.background = new THREE.Color(0x030308);
    this.scene.fog = new THREE.FogExp2(0x030308, 0.022);
    
    this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 0.2, 5.0);
    
    // Add player spotlight
    this.flashlight = new THREE.SpotLight(0x8eefff, 18.0, 30.0, Math.PI / 5, 0.55, 1.2);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.camera.near = 0.5;
    this.flashlight.shadow.camera.far = 35;
    this.flashlight.shadow.bias = -0.001;
    this.createPlayerHands();
    this.scene.add(this.camera);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.62;
    this.container.appendChild(this.renderer.domElement);
    
    this.particles = new ParticleManager(this.scene, this.state);
    this.typing = new TypingController(this.state, this.audio, this.particles);
    
    this.zombies = [];
    this.spawnDoors = [];
    this.lights = [];
    this.corridorGirders = [];
    this.levelMeshes = [];
    this.isSpeedUpActive = false;
    this.gameTimeScale = 1;

    // --- AWESOME: juice + flow state ---
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.bestStreakThisRun = 0;
    this.bossSpawnedThisWave = false;
    this.bossActive = null;
    this.damageFlash = 0;
    this.gameOverSlowMo = 0;
    this.lowHpAlarmTimer = 0;
    this.muzzleFlash = 0;
    this.announceTimer = null;
    this.announceSubTimer = null;
    this.waveBannerTimer = null;
    // Hardening: run token invalidates stale async timeouts (slow-mo game
    // over, banners) when a new run starts; _gameOverPending stops repeat
    // handleGameOver calls while health stays 0; _eventsBound keeps
    // bindEvents single-run; _dom caches hot-path HUD lookups.
    this._runSeq = 0;
    this._gameOverPending = false;
    this._eventsBound = false;
    this._settingsBound = false;
    this._dom = {};
    
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.flickerTimer = 0;
    
    this.shakeIntensity = 0;
    this.shakeDecay = 4.0;
    
    this.buildLevelScene();
    this.bindEvents();
    
    this.storeController = setupStore(this.state, this.audio);
    this.initSettingsUI();
    
    // Remove loading screen on complete (null-guarded: menu shell may vary)
    const loadingEl = document.getElementById('TEMPLATE-4weird-loading-screen');
    if (loadingEl) loadingEl.classList.add('hidden');
    this.state.setGameState(GameState.MENU);
    
    requestAnimationFrame((t) => this.loop(t));
  }

  addLevelMesh(obj) {
    this.scene.add(obj);
    this.levelMeshes.push(obj);
    return obj;
  }

  buildLevelScene() {
    // Clear old level meshes
    if (this.levelMeshes) {
      this.levelMeshes.forEach(mesh => {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }
    
    this.levelMeshes = [];
    this.spawnDoors = [];
    this.lights = [];
    this.corridorGirders = [];
    
    const level = this.state.selectedLevel || 'hallway';
    
    if (level === 'city') {
      this.scene.background = new THREE.Color(0x05050c);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(0x05050c);
        this.scene.fog.density = 0.02;
      }
      this.buildCity();
    } else if (level === 'graveyard') {
      this.scene.background = new THREE.Color(0x08040d);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(0x08040d);
        this.scene.fog.density = 0.028;
      }
      this.buildGraveyard();
    } else {
      // Default: Hallway
      this.scene.background = new THREE.Color(0x030308);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(0x030308);
        this.scene.fog.density = 0.022;
      }
      this.buildHallway();
    }
  }

  buildHallway() {
    const corridorLength = 170;
    const corridorWidth = 6.0;
    const corridorHeight = 4.0;
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x0f1118, 
      roughness: 0.18, 
      metalness: 0.7 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.2, -corridorLength / 2 + 10);
    floor.receiveShadow = true;
    this.addLevelMesh(floor);
    
    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const ceilingMat = new THREE.MeshStandardMaterial({ 
      color: 0x08080c, 
      roughness: 0.5, 
      metalness: 0.3 
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, corridorHeight - 1.2, -corridorLength / 2 + 10);
    this.addLevelMesh(ceiling);
    
    // Left Wall
    const leftWallGeo = new THREE.PlaneGeometry(corridorLength, corridorHeight);
    const leftWallMat = new THREE.MeshStandardMaterial({ 
      color: 0x0a0c10, 
      roughness: 0.35, 
      metalness: 0.5 
    });
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-corridorWidth / 2, corridorHeight / 2 - 1.2, -corridorLength / 2 + 10);
    leftWall.receiveShadow = true;
    this.addLevelMesh(leftWall);
    
    // Right Wall
    const rightWall = leftWall.clone();
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(corridorWidth / 2, corridorHeight / 2 - 1.2, -corridorLength / 2 + 10);
    this.addLevelMesh(rightWall);

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
    
    // Add ambient fill light
    const ambientLight = new THREE.HemisphereLight(0x18304d, 0x050609, 0.22);
    this.addLevelMesh(ambientLight);
    
    // Add directional lighting down the corridor
    const dirLight = new THREE.DirectionalLight(0x8eefff, 0.32);
    dirLight.position.set(0, 3, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    this.addLevelMesh(dirLight);
  }

  buildCity() {
    const roadLength = 170;
    const roadWidth = 6.0;
    
    // Road (asphalt)
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMat = new THREE.MeshStandardMaterial({ 
      color: 0x121217, 
      roughness: 0.8, 
      metalness: 0.1 
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -1.2, -roadLength / 2 + 10);
    road.receiveShadow = true;
    this.addLevelMesh(road);
    
    // Skyscrapers & Building Facades
    const bColors = [0x08090f, 0x050608];
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.8 });
    
    for (let z = 10; z > -roadLength + 10; z -= 12) {
      if (Math.abs((z - 2) % 24) < 1.5 || Math.abs((z - 14) % 24) < 1.5) {
        // Leave gaps for alleyway doors
        this.createClassroomDoor(z, true, roadWidth);
        this.createClassroomDoor(z - 12.0, false, roadWidth);
        continue;
      }
      
      // Building Left
      const bLeftGeo = new THREE.BoxGeometry(4.0, 15.0, 10.0);
      const bLeftMat = new THREE.MeshStandardMaterial({ color: bColors[Math.abs(Math.floor(z)) % 2], roughness: 0.5 });
      const bLeft = new THREE.Mesh(bLeftGeo, bLeftMat);
      bLeft.position.set(-roadWidth / 2 - 2.0, 7.5 - 1.2, z);
      this.addLevelMesh(bLeft);
      
      // Add glowing windows on left building
      for (let w = 0; w < 4; w++) {
        const wMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.25), windowMat);
        wMesh.position.set(-roadWidth / 2 - 0.01, 1.0 + w * 2.0, z - 3 + w * 2);
        wMesh.rotation.y = Math.PI / 2;
        this.addLevelMesh(wMesh);
      }
      
      // Building Right
      const bRight = bLeft.clone();
      bRight.position.x = roadWidth / 2 + 2.0;
      this.addLevelMesh(bRight);
      
      // Add glowing windows on right building
      for (let w = 0; w < 4; w++) {
        const wMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.25), windowMat);
        wMesh.position.set(roadWidth / 2 + 0.01, 1.0 + w * 2.0, z + 3 - w * 2);
        wMesh.rotation.y = -Math.PI / 2;
        this.addLevelMesh(wMesh);
      }
      
      // Neon streetlights acting as flicker lights
      const streetlightGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 8);
      const streetlightMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
      const streetlightL = new THREE.Mesh(streetlightGeo, streetlightMat);
      streetlightL.position.set(-roadWidth / 2 + 0.1, 1.6 - 1.2, z);
      this.addLevelMesh(streetlightL);
      
      const lightBulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      lightBulb.position.set(-roadWidth / 2 + 0.1, 3.2 - 1.2, z);
      this.addLevelMesh(lightBulb);
      
      const light = new THREE.PointLight(0xff00ff, 9.0, 11.0);
      light.position.set(-roadWidth / 2 + 0.1, 3.0 - 1.2, z);
      this.addLevelMesh(light);
      this.lights.push({ bulb: lightBulb, light, baseIntensity: 9.0, zOffset: z });
    }
    
    // Ambient night lighting
    const ambientLight = new THREE.HemisphereLight(0x1b2450, 0x0b0610, 0.2);
    this.addLevelMesh(ambientLight);
    
    // Directional sky light
    const dirLight = new THREE.DirectionalLight(0xa78bfa, 0.28);
    dirLight.position.set(0, 5, 5);
    this.addLevelMesh(dirLight);
  }

  buildGraveyard() {
    const roadLength = 170;
    const roadWidth = 6.0;
    
    // Ground (grass/dirt)
    const groundGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x090e09, 
      roughness: 0.95, 
      metalness: 0.05 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -1.2, -roadLength / 2 + 10);
    ground.receiveShadow = true;
    this.addLevelMesh(ground);
    
    // Spooky Purple Digital Moon
    const moonGeo = new THREE.RingGeometry(0.1, 6.0, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0x9d00ff, side: THREE.DoubleSide });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(0, 8.0, -110);
    this.addLevelMesh(moon);
    
    // Crypt doors / tombs
    for (let z = 2.0; z > -roadLength + 10; z -= 24.0) {
      this.createClassroomDoor(z, true, roadWidth);
      this.createClassroomDoor(z - 12.0, false, roadWidth);
    }
    
    // Tombstones, iron fences, and spooky cyber-trees
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, metalness: 0.8, roughness: 0.3 });
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.9 });
    
    for (let z = 10; z > -roadLength + 10; z -= 6.0) {
      if (Math.abs((z - 2) % 24) < 1.5 || Math.abs((z - 14) % 24) < 1.5) continue;
      
      // Gothic Fence Pillars
      const pillarGeo = new THREE.BoxGeometry(0.2, 2.0, 0.2);
      const pillarL = new THREE.Mesh(pillarGeo, fenceMat);
      pillarL.position.set(-roadWidth / 2, 1.0 - 1.2, z);
      this.addLevelMesh(pillarL);
      
      const pillarR = pillarL.clone();
      pillarR.position.x = roadWidth / 2;
      this.addLevelMesh(pillarR);
      
      // Spooky cyber tree every 18 units
      if (Math.abs(z) % 18 === 0) {
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 3.0, 8), new THREE.MeshStandardMaterial({ color: 0x111116 }));
        trunk.position.set(0, 1.5, 0);
        treeGroup.add(trunk);
        
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true }));
        leaves.position.set(0, 3.0, 0);
        treeGroup.add(leaves);
        
        treeGroup.position.set(-roadWidth / 2 - 1.0, -1.2, z);
        this.addLevelMesh(treeGroup);
      }
      
      // Holographic Gravestones
      const stoneGeo = new THREE.BoxGeometry(0.15, 0.8, 0.45);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.9 });
      
      // Left Tombstone
      const stoneL = new THREE.Mesh(stoneGeo, stoneMat);
      stoneL.position.set(-roadWidth / 2 + 0.6, 0.4 - 1.2, z);
      this.addLevelMesh(stoneL);
      // Glowing cross on left stone
      const crossVertL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.3, 0.05), crossMat);
      crossVertL.position.set(-roadWidth / 2 + 0.68, 0.45 - 1.2, z);
      this.addLevelMesh(crossVertL);
      const crossHorizL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.18), crossMat);
      crossHorizL.position.set(-roadWidth / 2 + 0.68, 0.5 - 1.2, z);
      this.addLevelMesh(crossHorizL);
      
      // Right Tombstone
      const stoneR = new THREE.Mesh(stoneGeo, stoneMat);
      stoneR.position.set(roadWidth / 2 - 0.6, 0.4 - 1.2, z - 2.0);
      this.addLevelMesh(stoneR);
      // Glowing cross on right stone
      const crossVertR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.3, 0.05), crossMat);
      crossVertR.position.set(roadWidth / 2 - 0.68, 0.45 - 1.2, z - 2.0);
      this.addLevelMesh(crossVertR);
      const crossHorizR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.18), crossMat);
      crossHorizR.position.set(roadWidth / 2 - 0.68, 0.5 - 1.2, z - 2.0);
      this.addLevelMesh(crossHorizR);
      
      // Spooky green ground lights
      if (Math.abs(z) % 12 === 0) {
        const lightBulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
        lightBulb.position.set(roadWidth / 2 - 0.4, 0.05 - 1.2, z);
        this.addLevelMesh(lightBulb);
        
        const light = new THREE.PointLight(0x00ff88, 7.0, 8.0);
        light.position.set(roadWidth / 2 - 0.4, 0.2 - 1.2, z);
        this.addLevelMesh(light);
        this.lights.push({ bulb: lightBulb, light, baseIntensity: 7.0, zOffset: z });
      }
    }
    
    // Spooky graveyard ground ambient glow
    const ambientLight = new THREE.HemisphereLight(0x2a173d, 0x030804, 0.18);
    this.addLevelMesh(ambientLight);
    
    // Cool purple moonlight
    const dirLight = new THREE.DirectionalLight(0xc084fc, 0.25);
    dirLight.position.set(0, 6, 6);
    this.addLevelMesh(dirLight);
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
    
    this.addLevelMesh(archGroup);
    this.corridorGirders.push(archGroup);
  }

  createCeilingLight(z, height) {
    const bulbGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.rotation.z = Math.PI / 2;
    bulb.position.set(0, height - 1.25, z);
    
    const light = new THREE.PointLight(0x00ff88, 10.0, 12.0);
    light.position.set(0, height - 1.4, z);
    
    this.addLevelMesh(bulb);
    this.addLevelMesh(light);
    
    this.lights.push({ bulb, light, baseIntensity: 10.0, zOffset: z });
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
    this.addLevelMesh(rackGroup);
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
    
    this.addLevelMesh(doorGroup);
    
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
    this.addLevelMesh(clockGroup);
  }

  createPlayerHands() {
    this.handsGroup = new THREE.Group();
    
    const suitMat = new THREE.MeshLambertMaterial({ color: 0x111115 }); // dark sleeve
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x2b1e17 }); // dark leather glove
    
    // 1. KEYBOARD GROUP (Held in center, tilted towards player)
    this.keyboardGroup = new THREE.Group();
    this.keyboardGroup.position.set(0, -0.22, -0.45);
    this.keyboardGroup.rotation.set(Math.PI / 4.2, 0, 0);
    
    // Keyboard Base
    const kbBaseMat = new THREE.MeshStandardMaterial({ color: 0x16161c, roughness: 0.6, metalness: 0.4 });
    const kbBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.015, 0.12),
      kbBaseMat
    );
    this.keyboardGroup.add(kbBase);
    
    // Glowing stripes on sides
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.122), stripeMat);
    stripeL.position.set(-0.141, 0, 0);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.122), stripeMat);
    stripeR.position.set(0.141, 0, 0);
    this.keyboardGroup.add(stripeL);
    this.keyboardGroup.add(stripeR);
    
    // Spotlight attached to hands group pointing down the corridor
    this.flashlight.position.set(0, -0.15, -0.45);
    this.handsGroup.add(this.flashlight);
    
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, -0.15, -10.0);
    this.handsGroup.add(lightTarget);
    this.flashlight.target = lightTarget;
    
    // Volumetric Cone attached to hands group pointing forward
    const volumetricGeo = new THREE.CylinderGeometry(0.015, 1.2, 5.0, 16, 1, true);
    const volumetricMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const volumetricCone = new THREE.Mesh(volumetricGeo, volumetricMat);
    volumetricCone.rotation.x = -Math.PI / 2;
    volumetricCone.position.set(0, -0.15, -2.95);
    this.handsGroup.add(volumetricCone);
    
    // Create QWERTY keys layout
    const rows = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];
    
    const keyW = 0.02;
    const keyH = 0.006;
    const keyD = 0.016;
    const keySpacing = 0.024;
    
    const keyColors = [0x00f2fe, 0xff0055, 0x00ffcc, 0xbd00ff];
    this.qwertyKeyMeshes = {};
    this.keyboardKeys = [];
    
    for (let r = 0; r < rows.length; r++) {
      const rowKeys = rows[r];
      const rowZ = -0.03 + r * 0.03;
      const rowWidth = (rowKeys.length - 1) * keySpacing;
      const startX = -rowWidth / 2;
      
      for (let c = 0; c < rowKeys.length; c++) {
        const char = rowKeys[c];
        const kColor = keyColors[(r + c) % keyColors.length];
        const keyMat = new THREE.MeshStandardMaterial({
          color: kColor,
          emissive: kColor,
          emissiveIntensity: 0.5,
          roughness: 0.5
        });
        const keyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(keyW, keyH, keyD),
          keyMat
        );
        const kx = startX + c * keySpacing;
        keyMesh.position.set(kx, 0.009, rowZ);
        
        this.keyboardGroup.add(keyMesh);
        this.qwertyKeyMeshes[char] = keyMesh;
        this.keyboardKeys.push(keyMesh);
      }
    }
    
    this.handsGroup.add(this.keyboardGroup);
    
    // 2. LEFT ARM (holding the left side of the keyboard)
    const leftArmGroup = new THREE.Group();
    const leftSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.25, 8),
      suitMat
    );
    leftSleeve.rotation.x = Math.PI / 2;
    leftSleeve.position.set(0, 0, 0.125);
    leftArmGroup.add(leftSleeve);
    const leftGlove = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 0.05),
      skinMat
    );
    leftGlove.position.set(0, 0, 0);
    leftArmGroup.add(leftGlove);
    
    leftArmGroup.position.set(-0.14, 0, 0.02);
    leftArmGroup.rotation.set(Math.PI / 4, 0, Math.PI / 6);
    this.keyboardGroup.add(leftArmGroup);
    
    // 3. RIGHT ARM (pokes keys, idle holds the right side)
    this.rightArmGroup = new THREE.Group();
    const rightSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8),
      suitMat
    );
    rightSleeve.rotation.x = Math.PI / 2.2;
    rightSleeve.position.set(0, -0.01, 0.12);
    this.rightArmGroup.add(rightSleeve);
    const rightGlove = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 0.05),
      skinMat
    );
    rightGlove.position.set(0, 0.015, -0.03);
    this.rightArmGroup.add(rightGlove);
    
    this.rightArmIdlePos = new THREE.Vector3(0.14, -0.22, -0.42);
    this.rightArmGroup.position.copy(this.rightArmIdlePos);
    this.rightArmGroup.rotation.set(-Math.PI / 8, -Math.PI / 10, -Math.PI / 18);
    this.handsGroup.add(this.rightArmGroup);
    
    this.camera.add(this.handsGroup);
    
    this.pokeTimer = 0.0;
    this.pokeDuration = 0.18;
    this.targetPokeCamPos = new THREE.Vector3();
  }

  animateKeyboardPress(char) {
    if (!char) return;
    const lowerChar = char.toLowerCase();
    const keyMesh = this.qwertyKeyMeshes[lowerChar];

    if (keyMesh) {
      if (this.keyboardGroup) {
        this.keyboardGroup.scale.set(1.05, 1.05, 1.05);
      }

      const origIntensity = keyMesh.material.emissiveIntensity;
      keyMesh.material.emissiveIntensity = 2.5;
      keyMesh.position.y = 0.005;
      setTimeout(() => {
        keyMesh.material.emissiveIntensity = origIntensity;
        keyMesh.position.y = 0.009;
      }, 75);

      this.keyboardGroup.updateMatrix();
      this.targetPokeCamPos.copy(keyMesh.position).applyMatrix4(this.keyboardGroup.matrix);
      this.pokeTimer = this.pokeDuration;
    }
    // Every keystroke fires a tiny muzzle flash light pulse
    this.muzzleFlash = Math.min(1, this.muzzleFlash + 0.35);
  }

  isMenuHomeVisible() {
    const el = document.getElementById('TEMPLATE-4weird-start-screen');
    return el && !el.classList.contains('hidden');
  }

  // World position of the player's "gun" for laser tracers
  getMuzzleWorldPos() {
    const v = new THREE.Vector3();
    if (this.keyboardGroup) {
      this.keyboardGroup.getWorldPosition(v);
    } else {
      this.camera.getWorldPosition(v);
    }
    return v;
  }

  // Cached HUD lookup: avoids per-frame getElementById + centralizes null guards.
  dom(id) {
    if (this._dom[id] === undefined) this._dom[id] = document.getElementById(id);
    const el = this._dom[id];
    // If the shell injects nodes late, retry once instead of caching null forever.
    if (!el) this._dom[id] = document.getElementById(id);
    return this._dom[id] || null;
  }

  // Null-safe click binding used by bindEvents so one missing button can
  // never abort the whole wiring pass.
  onBtn(id, evt, fn, opts) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.addEventListener(evt, fn, opts);
    return true;
  }

  // Center-screen toast announcements (killstreaks, powerups, boss warnings)
  announce(text, color, sub) {
    const banner = document.getElementById('kill-announce');
    if (!banner) return;
    banner.innerText = text;
    banner.style.color = color || '#fff';
    banner.style.textShadow = `0 0 18px ${color || '#00f2fe'}`;
    banner.classList.remove('show');
    void banner.offsetWidth;
    banner.classList.add('show');
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => banner.classList.remove('show'), 1400);
    if (this.announceSubTimer) { clearTimeout(this.announceSubTimer); this.announceSubTimer = null; }
    if (sub) {
      const subEl = document.getElementById('kill-announce-sub');
      if (subEl) {
        subEl.innerText = sub;
        subEl.classList.remove('show');
        void subEl.offsetWidth;
        subEl.classList.add('show');
        this.announceSubTimer = setTimeout(() => subEl.classList.remove('show'), 1400);
      }
    }
  }

  showWaveBanner(wave, isBoss) {
    const banner = document.getElementById('wave-banner');
    if (!banner) return;
    const title = banner.querySelector('.wave-banner-title');
    const sub = banner.querySelector('.wave-banner-sub');
    if (title) title.innerText = isBoss ? `⚠ BOSS WAVE ${wave} ⚠` : `WAVE ${wave}`;
    if (sub) sub.innerText = isBoss ? 'A massive signature approaches. Hold the line!' : this.waveTagline(wave);
    banner.classList.remove('show', 'boss');
    void banner.offsetWidth;
    if (isBoss) banner.classList.add('boss');
    banner.classList.add('show');
    if (this.waveBannerTimer) clearTimeout(this.waveBannerTimer);
    this.waveBannerTimer = setTimeout(() => banner.classList.remove('show'), 2200);
  }

  waveTagline(wave) {
    if (wave <= 1) return 'Decrypt the words. Hold the grid.';
    if (wave === 2) return 'Runners inbound - type fast.';
    if (wave === 3) return 'Phantoms phase through the dark.';
    if (wave === 4) return 'Brutes incoming. Big scores.';
    return 'Threat level rising. No mercy.';
  }

  onCorrectKey(target, streak) {
    // Crosshair pulse on every hit
    const ch = document.getElementById('crosshair');
    if (ch) {
      ch.classList.remove('pulse');
      void ch.offsetWidth;
      ch.classList.add('pulse');
    }
    // Streak callouts
    if (streak === 10) { this.announce('RAMPAGE x10', '#00f2fe'); this.audio.playSFX('streak'); }
    else if (streak === 20) { this.announce('FRENZY x20', '#fcf003'); this.audio.playSFX('streak'); }
    else if (streak === 35) { this.announce('UNSTOPPABLE x35', '#ff0077'); this.audio.playSFX('streak'); }
    else if (streak === 50) { this.announce('LEGENDARY x50', '#ffd700'); this.audio.playSFX('streak'); }
    this.killStreakTimer = 4.0;
  }

  onTypingError() {
    // Miss = combo penalty + red edge flash (stakes without cruelty)
    this.state.combo = Math.max(1.0, parseFloat((this.state.combo - 0.5).toFixed(1)));
    this.state.comboTimer = Math.min(this.state.comboTimer, 1.0);
    this.state.updateComboHUD();
    this.damageFlash = Math.min(0.6, this.damageFlash + 0.25);
    this.triggerCameraShake(0.12);
  }

  onZombieKilled(zombie, zombies) {
    this.killStreak++;
    this.bestStreakThisRun = Math.max(this.bestStreakThisRun, this.killStreak);
    this.killStreakTimer = 4.0;
    this.muzzleFlash = 1.0;
    this.audio.playSFX('kill');

    // Streak announcements by kills without taking damage
    if (this.killStreak === 5) { this.announce('KILLING SPREE', '#00ff66'); this.audio.playSFX('streak'); }
    else if (this.killStreak === 10) { this.announce('DOMINATING', '#00f2fe'); this.audio.playSFX('streak'); }
    else if (this.killStreak === 15) { this.announce('MASSACRE', '#fcf003'); this.audio.playSFX('streak'); }
    else if (this.killStreak === 25) { this.announce('ZOMBIE APOCALYPSE', '#ff0077'); this.audio.playSFX('streak'); }

    if (zombie.ztype === 'boss') {
      this.bossActive = null;
      this.triggerCameraShake(1.2);
      this.announce('BOSS DECRYPTED', '#ffd700', '+1000 PTS · +10 CREDITS');
      this.audio.playSFX('waveclear');
      // Boss drops a bonus powerup
      const keys = ['bomb', 'freeze', 'shield'];
      const k = keys[Math.floor(Math.random() * keys.length)];
      this.state.powerups[k] = Math.min(3, (this.state.powerups[k] || 0) + 1);
      this.state.updatePowerupHUD();
      this.hideBossBar();
    } else if (zombie.ztype === 'brute') {
      this.triggerCameraShake(0.5);
    }

    this.updateWaveProgress();
  }

  updateWaveProgress() {
    const fill = this.dom('wave-progress-fill');
    if (!fill) return;
    const total = Math.max(1, this.state.zombiesInWave);
    const done = Math.min(total, this.state.zombiesKilled);
    fill.style.width = `${(done / total) * 100}%`;
  }

  showBossBar(word) {
    const bar = document.getElementById('boss-bar');
    if (!bar) return;
    bar.classList.remove('hidden');
    const name = document.getElementById('boss-name');
    if (name && word) name.innerText = `♛ ${word.toUpperCase()} ♛`;
    this.updateBossBar();
  }

  updateBossBar() {
    const bar = this.dom('boss-bar');
    if (!bar || !this.bossActive || this.bossActive.isDead) return;
    const fill = this.dom('boss-hp-fill');
    if (!fill) return;
    const total = this.bossActive.word.length;
    const left = total - this.bossActive.typedLength;
    fill.style.width = `${(left / total) * 100}%`;
  }

  hideBossBar() {
    const bar = document.getElementById('boss-bar');
    if (bar) bar.classList.add('hidden');
  }

  // --- POWERUPS (keys 1/2/3 + HUD buttons) ---
  // Bomb never consumes a charge on an empty field; shield never burns a
  // charge at full HP. Both report why instead of silently wasting stock.
  useBomb() {
    const live = this.zombies.filter(z => !z.isDead);
    if (live.length === 0) {
      this.announce('NO TARGETS', '#718096');
      return;
    }
    if (!this.state.usePowerup('bomb')) return;
    this.audio.playSFX('bomb');
    this.triggerCameraShake(1.0);
    const center = new THREE.Vector3(0, 0.5, -10);
    this.particles.spawnExplosion(center, 'inferno');
    this.particles.spawnCelebration(center);
    // Wipe all normal zombies, chunk bosses hard (typed progress +4)
    let kills = 0;
    this.zombies.forEach(z => {
      if (z.isDead) return;
      if (z.ztype === 'boss') {
        z.setTypedLength(Math.min(z.word.length, z.typedLength + 4));
        if (z.typedLength >= z.word.length) {
          this.typing.triggerExplosion(z, this.zombies);
          kills++;
        } else {
          z.pingHit();
        }
      } else {
        this.particles.spawnExplosion(z.group.position.clone(), this.state.equippedBlood);
        this.state.addScore(z.scoreValue || 100);
        this.state.addCoins(z.coinValue != null ? z.coinValue : 1);
        this.state.registerKill(z);
        this.state.waveWords.add(z.word.toLowerCase());
        z.isDead = true;
        kills++;
      }
    });
    if (this.typing.currentTarget && this.typing.currentTarget.isDead) this.typing.reset();
    this.announce(`SHOCKWAVE ×${kills}`, '#ff5500');
    this.updateWaveProgress();
  }

  useFreeze() {
    if (!this.state.usePowerup('freeze')) return;
    this.audio.playSFX('freeze');
    this.state.freezeUntil = performance.now() + 5000;
    this.announce('CRYO FREEZE - 5s', '#00f2fe');
    const center = new THREE.Vector3(0, 0.5, -12);
    this.particles.spawnPortal(center, 0x00f2fe);
  }

  useShield() {
    if (this.state.health >= 100) {
      this.announce('ARMOR FULL', '#00ff66');
      return;
    }
    if (!this.state.usePowerup('shield')) return;
    this.audio.playSFX('shield');
    this.state.health = Math.min(100, this.state.health + 40);
    this.updateHealthBar();
    this.particles.spawnFloatingText(new THREE.Vector3(0, 1, 0), '+40 SHIELD', '#00ff66', true);
    this.announce('SHIELD RESTORED', '#00ff66');
  }

  isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  }

  // Focus the hidden typing input without scrolling the page. The input is
  // anchored inside the game frame (see .mobile-typing-input), and
  // preventScroll stops mobile browsers from jumping vertically to reveal it.
  focusMobileInput() {
    if (!this.isTouchDevice()) return;
    if (this.state.currentState !== GameState.PLAYING) return;
    const mobileInput = document.getElementById('mobile-game-input');
    if (!mobileInput) return;
    this.lockFrameHeight();
    try {
      mobileInput.focus({ preventScroll: true });
    } catch (err) {
      mobileInput.focus();
    }
  }

  blurMobileInput() {
    const mobileInput = document.getElementById('mobile-game-input');
    if (mobileInput && document.activeElement === mobileInput) {
      mobileInput.blur();
    }
  }

  // Pin the game frame to its current pixel height while the keyboard is up.
  // Mobile keyboards shrink the layout viewport (and vh units), which would
  // otherwise resize the frame + canvas on every open/close and make the
  // game jump. Cleared when leaving PLAYING.
  lockFrameHeight() {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (!frame || frame.dataset.lwzLocked === 'true') return;
    const rect = frame.getBoundingClientRect();
    if (rect.height > 0) {
      frame.dataset.lwzLocked = 'true';
      frame.style.height = `${rect.height}px`;
      frame.style.minHeight = '0px';
    }
  }

  unlockFrameHeight() {
    const frame = document.querySelector('.TEMPLATE-4weird-game-frame');
    if (!frame) return;
    if (frame.dataset.lwzLocked !== 'true' && !frame.style.height) return;
    delete frame.dataset.lwzLocked;
    frame.style.height = '';
    frame.style.minHeight = '';
    this._lastCanvasW = 0;
    this._lastCanvasH = 0;
    this.resizeCanvas();
  }

  populateGlossary() {
    const container = document.getElementById('wave-word-definitions');
    if (!container) return;
    container.innerHTML = '';
    
    if (this.state.waveWords.size === 0) {
      container.innerHTML = '<p style="color: #718096; font-family: var(--font-cyber);">No words decrypted in this wave.</p>';
      return;
    }
    
    this.state.waveWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      const defs = WORD_DEFINITIONS[lowerWord] || ["n. No definition found in cyber database."];
      
      const entryDiv = document.createElement('div');
      entryDiv.className = 'word-def-entry';
      
      const title = document.createElement('div');
      title.className = 'word-def-title';
      title.innerText = word;
      
      const list = document.createElement('ul');
      list.className = 'word-def-list';
      
      defs.forEach(def => {
        const li = document.createElement('li');
        li.innerText = def;
        list.appendChild(li);
      });
      
      entryDiv.appendChild(title);
      entryDiv.appendChild(list);
      container.appendChild(entryDiv);
    });
  }

  bindEvents() {
    // Single-run: a second GameApp (HMR / re-boot) must not double-wire keys.
    if (this._eventsBound) return;
    this._eventsBound = true;
    window.addEventListener('resize', () => this.resizeCanvas());
    // Mobile keyboards fire viewport resizes as they open/close. The frame
    // height is locked during PLAYING, so this only re-fits the renderer
    // when the container actually changed size (see resizeCanvas guard).
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.resizeCanvas());
    }
    
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'SET_GAME_SPEED') {
        const speed = parseFloat(e.data.speed);
        if (!isNaN(speed) && speed > 0) {
          this.gameTimeScale = speed;
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      // Do not trap browser navigation/dev shortcuts (F1-F12 only: a bare
      // startsWith('F') would also swallow Shift+F / CapsLock-F keystrokes)
      if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key) || e.key === 'Tab') {
        return;
      }

      // Keystrokes from the hidden mobile input are handled by its own
      // 'input' listener - letting them bubble here would double-type.
      if (e.target && e.target.id === 'mobile-game-input') return;

      // Never hijack keys while a settings slider is being adjusted
      if (e.target && e.target.type === 'range' && e.key !== 'Escape') return;

      if (this.state.currentState === GameState.MENU) {
        if (e.key === 'Escape') {
          // Close store/settings back to the main menu (null-safe)
          const storeEl = document.getElementById('custom-store-screen');
          const settingsEl = document.getElementById('custom-settings-screen');
          if (storeEl && !storeEl.classList.contains('hidden')) this.backToMenu();
          else if (settingsEl && !settingsEl.classList.contains('hidden')) this.closeSettings();
        } else if (e.key === 'Enter') {
          if (this.isMenuHomeVisible()) this.startGame();
        } else if (e.key.toLowerCase() === 'i') {
          if (this.isMenuHomeVisible()) this.openStore();
        }
      } else if (this.state.currentState === GameState.PLAYING) {
        if (e.key === 'Escape') {
          this.togglePause();
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          this.typing.dropTarget();
        } else if (e.key === 'Shift' || e.key === ' ') {
          e.preventDefault();
          this.setSpeedUp(true);
        } else if (e.key === '1') {
          this.useBomb();
        } else if (e.key === '2') {
          this.useFreeze();
        } else if (e.key === '3') {
          this.useShield();
        } else if (!e.repeat) {
          // Held-key auto-repeat must not type for the player
          this.typing.handleInput(e.key, this.zombies);
        }
      } else if (this.state.currentState === GameState.PAUSED) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          this.togglePause();
        }
      } else if (this.state.currentState === GameState.GAME_OVER) {
        if (e.key === 'Enter') {
          this.startGame();
        }
      } else if (this.state.currentState === GameState.GLOSSARY) {
        if (e.key === 'Enter') {
          const btn = document.getElementById('btn-next-wave');
          if (btn) btn.click();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift' || e.key === ' ') {
        this.setSpeedUp(false);
      }
    });

    // Mobile Keyboard Support
    const mobileInput = document.getElementById('mobile-game-input');
    const mobileBtn = document.getElementById('mobile-keyboard-btn');
    
    if (this.isTouchDevice() && mobileBtn) {
      mobileBtn.style.display = 'flex';

      // Tapping the play area re-opens the keyboard without scrolling.
      this.container.addEventListener('click', () => {
        this.focusMobileInput();
      });
    }

    if (mobileBtn) {
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Toggle: focused -> dismiss keyboard, blurred -> bring it back.
        if (document.activeElement === mobileInput) {
          this.blurMobileInput();
        } else {
          this.focusMobileInput();
        }
        if (mobileBtn.blur) mobileBtn.blur();
      });
    }

    if (mobileInput) {
      mobileInput.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
          // Trigger speed up or stun payload
          this.setSpeedUp(true);
        }
      });
      mobileInput.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
          this.setSpeedUp(false);
        }
      });
      mobileInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length > 0) {
          for (let i = 0; i < val.length; i++) {
            const char = val[i];
            if (char === ' ') {
              // Spacebar can trigger speed up / payload
              continue;
            }
            this.typing.handleInput(char, this.zombies);
          }
          e.target.value = '';
        }
      });
    }

    // Difficulty selection bindings
    const diffBtns = document.querySelectorAll('.btn-diff');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        diffBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        e.currentTarget.classList.add('active');
        e.currentTarget.setAttribute('aria-pressed', 'true');
        const diff = e.currentTarget.getAttribute('data-diff');
        this.state.difficulty = diff;
        if (diff === 'easy') {
          this.state.difficultyMultiplier = 0.6;
        } else if (diff === 'hard') {
          this.state.difficultyMultiplier = 1.4;
        } else {
          this.state.difficultyMultiplier = 1.0;
        }
      });
    });

    // Level selection bindings
    const levelBtns = document.querySelectorAll('.btn-level');
    levelBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        levelBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        e.currentTarget.classList.add('active');
        e.currentTarget.setAttribute('aria-pressed', 'true');
        const lvl = e.currentTarget.getAttribute('data-level');
        this.state.selectedLevel = lvl;
      });
    });
    
    // Connect to template navigation buttons (each null-safe so one missing
    // button can never throw and abort the rest of the wiring).
    this.onBtn('TEMPLATE-4weird-start-btn', 'click', () => this.startGame());
    this.onBtn('btn-custom-store', 'click', () => this.openStore());
    this.onBtn('btn-custom-settings', 'click', () => this.openSettings());
    this.onBtn('btn-store-back', 'click', () => this.backToMenu());
    this.onBtn('btn-settings-back', 'click', () => this.closeSettings());
    this.onBtn('TEMPLATE-4weird-play-again-btn', 'click', () => this.startGame());
    this.onBtn('TEMPLATE-4weird-resume-btn', 'click', () => this.togglePause());
    this.onBtn('TEMPLATE-4weird-pause-restart-btn', 'click', () => this.startGame());
    this.onBtn('TEMPLATE-4weird-restart-btn', 'click', () => this.quitToMenu());
    this.onBtn('TEMPLATE-4weird-gameover-menu-btn', 'click', () => this.quitToMenu());
    
    // View wave definitions from game over screen
    this.onBtn('btn-gameover-definitions', 'click', () => {
      this.populateGlossary();
      // Temporarily change button to restart/reboot
      const btnNext = document.getElementById('btn-next-wave');
      if (!btnNext) return;
      btnNext.innerText = 'REBOOT SYSTEM';
      btnNext.dataset.gameOverReboot = 'true';
      this.state.setGameState(GameState.GLOSSARY);
    });

    // Wave Cleared Glossary button
    this.onBtn('btn-next-wave', 'click', (e) => {
      if (e.currentTarget.dataset.gameOverReboot === 'true') {
        e.currentTarget.dataset.gameOverReboot = 'false';
        e.currentTarget.innerText = 'START NEXT WAVE';
        this.startGame();
        return;
      }
      this.state.wave++;
      const waveVal = document.getElementById('wave-val');
      if (waveVal) waveVal.innerText = this.state.wave;
      this.calculateWaveBudget();
      this.triggerCameraShake(0.2);
      this.state.waveWords.clear();
      this.typing.reset();
      this.state.setGameState(GameState.PLAYING);
      this.audio.setIntensity(this.state.wave);
      this.showWaveBanner(this.state.wave, this.isBossWave(this.state.wave));
      this.lockFrameHeight();
      this.focusMobileInput();
    });

    // Powerup HUD buttons
    ['bomb', 'freeze', 'shield'].forEach(kind => {
      const btn = document.getElementById('powerup-btn-' + kind);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (kind === 'bomb') this.useBomb();
          if (kind === 'freeze') this.useFreeze();
          if (kind === 'shield') this.useShield();
          // Keep Space for speed-boost: never leave focus parked on the button
          if (btn.blur) btn.blur();
          this.focusMobileInput();
        });
      }
    });

    // Touch devices get a SHIFT-free speed label
    const speedLabel = document.getElementById('game-speed-label');
    if (speedLabel) speedLabel.innerText = this.isTouchDevice() ? 'SPEED ×3' : 'SPEED UP [SHIFT]';

    // Auto-pause when tab hidden - no cheap deaths while alt-tabbed
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.currentState === GameState.PLAYING) {
        this.togglePause();
      } else if (!document.hidden) {
        this.audio.resume();
      }
    });

    // Same guard for Alt-Tab / window blur on desktop
    window.addEventListener('blur', () => {
      if (this.state.currentState === GameState.PLAYING) {
        this.togglePause();
      }
    });

    // Mute button handler (null-safe)
    this.onBtn('TEMPLATE-4weird-mute-btn', 'click', (e) => {
        this.toggleMute(e.target);
    });

    // Speed Up Button click-and-hold bindings
    const speedBtn = document.getElementById('game-speed-btn');
    if (speedBtn) {
      const startSpeedUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setSpeedUp(true);
      };
      const stopSpeedUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setSpeedUp(false);
      };
      
      speedBtn.addEventListener('mousedown', startSpeedUp);
      speedBtn.addEventListener('mouseup', stopSpeedUp);
      speedBtn.addEventListener('mouseleave', stopSpeedUp);
      
      speedBtn.addEventListener('touchstart', startSpeedUp, { passive: false });
      speedBtn.addEventListener('touchend', stopSpeedUp, { passive: false });
      speedBtn.addEventListener('touchcancel', stopSpeedUp, { passive: false });
    }
  }

  toggleMute(btn) {
    this.audio.init();
    const isMuted = this.audio.toggleMute();
    if (!btn) return;
    if (isMuted) {
      btn.classList.add('active');
      btn.innerText = '🔇 Muted';
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.innerText = '🔊 Sound';
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  setSpeedUp(isActive) {
    this.isSpeedUpActive = isActive;
    const speedBtn = document.getElementById('game-speed-btn');
    if (speedBtn) {
      if (isActive) {
        speedBtn.classList.add('active');
      } else {
        speedBtn.classList.remove('active');
      }
    }
  }

  initSettingsUI() {
    const sfxSlider = document.getElementById('slider-sfx');
    const musicSlider = document.getElementById('slider-music');
    const particleCheckbox = document.getElementById('chk-particles');
    const shakeCheckbox = document.getElementById('chk-shake');
    const sfxVal = document.getElementById('slider-sfx-val');
    const musicVal = document.getElementById('slider-music-val');

    // Refresh control positions (safe to run again after a progress reset)
    if (sfxSlider) sfxSlider.value = this.state.sfxVolume;
    if (musicSlider) musicSlider.value = this.state.musicVolume;
    if (particleCheckbox) particleCheckbox.checked = this.state.ultraParticles;
    if (shakeCheckbox) shakeCheckbox.checked = this.state.screenShake !== false;
    if (sfxVal) sfxVal.innerText = `${Math.round(this.state.sfxVolume * 100)}%`;
    if (musicVal) musicVal.innerText = `${Math.round(this.state.musicVolume * 100)}%`;
    // Bind listeners exactly once
    if (this._settingsBound) return;
    this._settingsBound = true;

    if (sfxSlider) {
      sfxSlider.addEventListener('input', (e) => {
        this.audio.init();
        this.audio.setSFXVolume(parseFloat(e.target.value));
        if (sfxVal) sfxVal.innerText = `${Math.round(e.target.value * 100)}%`;
      });
    }

    if (musicSlider) {
      musicSlider.addEventListener('input', (e) => {
        this.audio.init();
        this.audio.setMusicVolume(parseFloat(e.target.value));
        if (musicVal) musicVal.innerText = `${Math.round(e.target.value * 100)}%`;
      });
    }

    if (particleCheckbox) {
      particleCheckbox.addEventListener('change', (e) => {
        this.state.ultraParticles = e.target.checked;
        this.state.saveSettings();
      });
    }

    if (shakeCheckbox) {
      shakeCheckbox.checked = this.state.screenShake !== false;
      shakeCheckbox.addEventListener('change', (e) => {
        this.state.screenShake = e.target.checked;
        this.state.saveSettings();
      });
    }

    const resetBtn = document.getElementById('btn-reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset high scores, credits, unlocks and stats?')) {
          this.audio.init();
          this.state.resetProgress();
          this.storeController.render();
          this.initSettingsUI();
          this.audio.playSFX('shield');
        }
      });
    }
  }

  resizeCanvas() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    // Skip keyboard/orientation noise: only touch the renderer when the
    // container actually changed size. This stops the canvas (and camera)
    // from thrashing while the mobile keyboard animates open/closed.
    if (this._lastCanvasW === w && this._lastCanvasH === h) return;
    this._lastCanvasW = w;
    this._lastCanvasH = h;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  startGame() {
    this.audio.init();
    // New run invalidates any pending slow-mo game-over timeout / banner
    // timers from the previous run, and clears the re-entry latch.
    this._runSeq++;
    this._gameOverPending = false;

    // Focus parked on START/REBOOT buttons would make Space re-click them -
    // hand keyboard control back to the game.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    this.typing.reset();
    this.typing.startRun();
    this.state.startRun();
    // Drop any leftover cryo freeze from a previous run so the new run
    // never starts with a stale wall-clock freeze.
    this.state.freezeUntil = 0;
    this.zombies.forEach(z => z.destroy());
    this.zombies = [];
    this.particles.clear();
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.bestStreakThisRun = 0;
    this.gameTimeScale = 1;
    this.bossSpawnedThisWave = false;
    this.bossActive = null;
    this.damageFlash = 0;
    this.gameOverSlowMo = 0;
    this.hideBossBar();
    
    this.lastTime = 0;
    this.setSpeedUp(false);
    
    this.state.score = 0;
    this.state.wave = 1;
    this.state.zombiesKilled = 0;
    this.state.zombiesActive = 0;
    this.state.coinsEarnedThisRun = 0;
    this.state.health = 100;
    this.state.resetCombo();
    this.state.waveWords.clear();
    
    // Ensure the Next Wave button is reset back to default
    const btnNext = document.getElementById('btn-next-wave');
    if (btnNext) {
      btnNext.dataset.gameOverReboot = 'false';
      btnNext.innerText = 'START NEXT WAVE';
    }
    
    const scoreVal = document.getElementById('score-val');
    if (scoreVal) scoreVal.innerText = '0';
    const waveVal = document.getElementById('wave-val');
    if (waveVal) waveVal.innerText = '1';
    this.updateHealthBar();
    this.buildLevelScene();
    this.calculateWaveBudget();

    // Spawn immediately so a new run never presents an empty corridor for seconds.
    // (Large finite value: forces one spawn on the next tick, then resets to 0.)
    this.spawnTimer = 9999;
    // startGame is a full reset from ANY state (menu / pause / game over /
    // double-click): never leave a stale pause overlay stacked above the HUD.
    const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    const hud = document.getElementById('game-hud');
    if (hud) hud.classList.remove('hidden');
    this.state.setGameState(GameState.PLAYING);
    this.audio.setIntensity(1);
    this.showWaveBanner(1, false);
    this.updateWaveProgress();
    this.resizeCanvas();
    this.lockFrameHeight();
    this.focusMobileInput();
  }

  isBossWave(wave) {
    return wave % 5 === 0;
  }

  calculateWaveBudget() {
    // Spawn budget: boss waves field 1 boss + (5 + wave) escorts so the
    // clear condition (zombiesKilled >= zombiesInWave with zero alive)
    // stays reachable; normal waves scale linearly. bossSpawnedThisWave
    // resets here AND in startGame so a boss can never be skipped twice.
    if (this.isBossWave(this.state.wave)) {
      // Boss wave: 1 boss + escorts scaled by wave
      this.state.zombiesInWave = 6 + this.state.wave;
      this.bossSpawnedThisWave = false;
    } else {
      this.state.zombiesInWave = 10 + this.state.wave * 5;
    }
    this.state.zombiesKilled = 0;
    this.state.zombiesActive = 0;
    this.updateZombiesHUD();
    this.updateWaveProgress();
  }

  updateZombiesHUD() {
    const el = this.dom('zombie-count');
    if (!el) return;
    const left = this.state.zombiesInWave - this.state.zombiesKilled;
    el.innerText = left;
  }

  // Single choke point for the shield bar: width + green/amber/red state
  updateHealthBar() {
    const fill = this.dom('health-bar-fill');
    if (!fill) return;
    fill.style.width = `${this.state.health}%`;
    fill.classList.remove('hp-high', 'hp-mid', 'hp-low');
    fill.classList.add(this.state.health > 60 ? 'hp-high' : this.state.health > 30 ? 'hp-mid' : 'hp-low');
  }

  openStore() {
    this.state.setGameState(GameState.MENU);
    const start = document.getElementById('TEMPLATE-4weird-start-screen');
    if (start) start.classList.add('hidden');
    const store = document.getElementById('custom-store-screen');
    if (store) store.classList.remove('hidden');
    if (this.storeController) this.storeController.render();
    this.audio.init();
  }

  openSettings() {
    const start = document.getElementById('TEMPLATE-4weird-start-screen');
    if (start) start.classList.add('hidden');
    const settings = document.getElementById('custom-settings-screen');
    if (settings) settings.classList.remove('hidden');
    this.audio.init();
  }

  closeSettings() {
    const settings = document.getElementById('custom-settings-screen');
    if (settings) settings.classList.add('hidden');
    const start = document.getElementById('TEMPLATE-4weird-start-screen');
    if (start) start.classList.remove('hidden');
  }

  backToMenu() {
    const store = document.getElementById('custom-store-screen');
    if (store) store.classList.add('hidden');
    const settings = document.getElementById('custom-settings-screen');
    if (settings) settings.classList.add('hidden');
    const start = document.getElementById('TEMPLATE-4weird-start-screen');
    if (start) start.classList.remove('hidden');
  }

  quitToMenu() {
    this.blurMobileInput();
    this.unlockFrameHeight();
    this.setSpeedUp(false);
    this.hideBossBar();
    this.typing.reset();
    // New menu visit invalidates pending game-over timeouts and clears the
    // pause overlay so MENU can never stack under PAUSED.
    this._runSeq++;
    this._gameOverPending = false;
    this.gameTimeScale = 1;
    this.state.freezeUntil = 0;
    const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    this.state.setGameState(GameState.MENU);
  }

  togglePause() {
    if (this.state.currentState === GameState.PLAYING) {
      this.blurMobileInput();
      this.unlockFrameHeight();
      // Cryo-freeze pause compensation lives in StateManager._trackStateClock
      // (shifts freezeUntil on resume); nothing to stash here.
      this.state.setGameState(GameState.PAUSED);
    } else if (this.state.currentState === GameState.PAUSED) {
      this.state.setGameState(GameState.PLAYING);
      const pauseScreen = document.getElementById('TEMPLATE-4weird-pause-screen');
      if (pauseScreen) pauseScreen.classList.add('hidden');
      const hud = document.getElementById('game-hud');
      if (hud) hud.classList.remove('hidden');
      // lastTime gap while paused would otherwise inject one huge dt frame.
      this.lastTime = 0;
      this.lockFrameHeight();
      this.focusMobileInput();
    }
  }

  triggerCameraShake(intensity) {
    if (!this.state.screenShake) return;
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + intensity);
  }

  loop(timestamp) {
    // The rAF chain must never die: schedule the next frame FIRST so even a
    // throwing update/render below cannot freeze the game forever.
    requestAnimationFrame((t) => this.loop(t));
    try {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min(0.1, Math.max(0, (timestamp - this.lastTime) / 1000));
      this.lastTime = timestamp;

      if (this.state.currentState === GameState.PLAYING) {
        this.update(dt);
      }

      this.render(dt);
    } catch (err) {
      // One bad frame logs instead of killing the loop; lastTime already
      // advanced so the next frame gets a sane dt.
      if (typeof console !== 'undefined' && console.error) console.error('[LWZ] frame error:', err);
    }
  }

  update(dt) {
    // Cryo freeze: world stops, player keeps typing
    const frozen = this.state.isFrozen();
    const activeDt = frozen ? 0 : (this.isSpeedUpActive ? dt * 3.0 : dt) * this.gameTimeScale;

    // Killstreak decay (no kill for 4s = streak over)
    if (this.killStreakTimer > 0) {
      this.killStreakTimer -= dt;
      if (this.killStreakTimer <= 0) this.killStreak = 0;
    }

    // 0. Update door slide animations (open 4 units/s, close 2 units/s)
    const DOOR_OPEN_RATE = 4.0, DOOR_CLOSE_RATE = 2.0;
    this.spawnDoors.forEach(door => {
      if (door.state === 'opening') {
        door.slideProgress = Math.min(1.0, door.slideProgress + activeDt * DOOR_OPEN_RATE);
        if (door.slideProgress >= 1.0) {
          door.state = 'open';
          door.timer = 1.0;
        }
      } else if (door.state === 'open') {
        door.timer -= activeDt;
        if (door.timer <= 0) {
          door.state = 'closing';
        }
      } else if (door.state === 'closing') {
        door.slideProgress = Math.max(0.0, door.slideProgress - activeDt * DOOR_CLOSE_RATE);
        if (door.slideProgress <= 0.0) {
          door.state = 'closed';
          door.statusLightMat.color.setHex(0xff0055);
        }
      }
      
      const doorHeight = 2.8;
      door.doorMesh.position.y = ((doorHeight - 0.05) / 2 - 1.2) + (door.slideProgress * 2.6);
    });

    // 1. Spawner Logic (budget: spawned-ever = killed + alive; breaches count
    // as killed so the wave-clear condition stays attainable)
    this.spawnTimer += activeDt;
    const SPAWN_BASE_INTERVAL = 3.5, SPAWN_RAMP_PER_WAVE = 0.25, SPAWN_MIN_INTERVAL = 1.0;
    const spawnInterval = Math.max(SPAWN_MIN_INTERVAL, SPAWN_BASE_INTERVAL - this.state.wave * SPAWN_RAMP_PER_WAVE);
    
    const totalSpawned = this.state.zombiesKilled + this.zombies.length;
    
    if (this.spawnTimer >= spawnInterval && totalSpawned < this.state.zombiesInWave) {
      this.spawnTimer = 0;
      this.spawnZombie();
    }
    
    // 2. Update Zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      z.update(activeDt);

      if (z.worldZ >= 4.8) { // BREACH_LINE: past the camera plane = player hit
        const dmg = z.damage || 20;
        this.state.health = Math.max(0, this.state.health - dmg);
        this.updateHealthBar();
        this.damageFlash = 1.0;
        this.killStreak = 0;

        this.triggerCameraShake(z.ztype === 'boss' ? 1.2 : 0.5);
        this.audio.playSFX('hurt');
        // A breached boss is gone: clear the reference (not just the bar) so
        // the HP widget can never track a destroyed zombie. Breaches count
        // toward the wave budget so the clear condition stays reachable.
        if (z.ztype === 'boss') { this.bossActive = null; this.hideBossBar(); }

        if (this.typing.currentTarget === z) {
          this.typing.reset();
        }

        z.destroy();
        this.zombies.splice(i, 1);

        this.state.zombiesKilled++;
        this.updateZombiesHUD();
        this.updateWaveProgress();

        if (this.state.health <= 0) {
          this.handleGameOver();
        }
        continue;
      }

      if (z.isDead) {
        this.triggerCameraShake(z.ztype === 'boss' ? 1.0 : 0.35);
        z.destroy();
        this.zombies.splice(i, 1);

        this.state.zombiesKilled++;
        this.updateZombiesHUD();
        this.updateWaveProgress();
      }
    }

    // Live boss HP bar
    this.updateBossBar();

    // Low-HP heartbeat alarm + vignette pulse
    if (this.state.health <= 30 && this.state.health > 0) {
      this.lowHpAlarmTimer -= dt;
      if (this.lowHpAlarmTimer <= 0) {
        this.lowHpAlarmTimer = 1.6;
        this.audio.playSFX('alarm');
      }
    }

    // Damage vignette decay
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 1.8);
    this.updateVignette();

    if (this.state.zombiesKilled >= this.state.zombiesInWave && this.zombies.length === 0) {
      this.populateGlossary();
      this.state.setGameState(GameState.GLOSSARY);
      this.hideBossBar();
      this.blurMobileInput();
      this.unlockFrameHeight();
      this.triggerCameraShake(0.2);
      this.audio.playSFX('waveclear');
      try {
        this.particles.spawnCelebration(new THREE.Vector3(0, 1, -12));
      } catch (e) { /* cosmetic */ }
      this.fillGlossaryStats();
    }
    
    this.state.updateCombo(activeDt);
    this.particles.update(activeDt);
  }

  handleGameOver() {
    // Guard: health stays 0 until the delayed GAME_OVER cut, so every further
    // breach in that window would re-enter here. One pending cut per run.
    if (this._gameOverPending) return;
    this._gameOverPending = true;
    const runId = this._runSeq;
    // Slow-mo death beat: freeze zombies for drama, then cut to game over
    this.gameOverSlowMo = 1.2;
    this.gameTimeScale = 0.25;
    this.triggerCameraShake(1.0);
    this.audio.playSFX('gameover');
    this.hideBossBar();
    const wpm = this.typing.getWPM ? this.typing.getWPM() : 0;
    const acc = this.typing.getAccuracy ? this.typing.getAccuracy() : 100;
    const streak = Math.max(this.bestStreakThisRun, this.typing.bestStreak || 0);
    const newBest = this.state.recordRunEnd(wpm, acc, streak);
    this.fillGameOverStats(wpm, acc, streak, newBest);
    setTimeout(() => {
      // Stale timeout (user already restarted / quit) must not clobber the
      // fresh run's state.
      if (runId !== this._runSeq) return;
      this._gameOverPending = false;
      this.gameTimeScale = 1;
      this.state.setGameState(GameState.GAME_OVER);
      this.blurMobileInput();
      this.unlockFrameHeight();
      this.audio.stopAll();
    }, 900);
  }

  fillGameOverStats(wpm, acc, streak, newBest) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };
    set('stat-kills', this.state.kills);
    set('stat-wave', this.state.maxWave || this.state.wave);
    set('stat-combo', (this.state.bestCombo || 1).toFixed(1) + 'x');
    set('stat-wpm', wpm);
    set('stat-acc', acc + '%');
    set('stat-streak', streak);
    const badge = document.getElementById('newbest-badge');
    if (badge) badge.style.display = newBest ? 'inline-block' : 'none';
  }

  fillGlossaryStats() {
    const el = document.getElementById('glossary-stats');
    if (!el) return;
    const wpm = this.typing.getWPM ? this.typing.getWPM() : 0;
    const acc = this.typing.getAccuracy ? this.typing.getAccuracy() : 100;
    el.innerText = `WAVE ${this.state.wave} · ${this.state.kills} KILLS · ${wpm} WPM · ${acc}% ACC · BEST COMBO ${(this.state.bestCombo || 1).toFixed(1)}x`;
  }

  updateVignette() {
    const v = this.dom('damage-vignette');
    if (!v) return;
    const lowHp = this.state.health <= 30 ? (0.35 + 0.15 * Math.sin(performance.now() / 300)) : 0;
    const hit = Math.min(0.85, this.damageFlash);
    const frozen = this.state.isFrozen() ? 0.25 : 0;
    const total = Math.min(0.9, lowHp + hit);
    v.style.opacity = total.toFixed(2);
    v.classList.toggle('frozen', frozen > 0);
  }

  // Pick archetype by wave: early = walkers, then runners/ghosts, then brutes.
  // Boss waves force one boss first, then escorts.
  rollArchetype() {
    const wave = this.state.wave;
    if (this.isBossWave(wave) && !this.bossSpawnedThisWave) return 'boss';
    const r = Math.random();
    if (wave <= 1) return r < 0.85 ? 'walker' : 'runner';
    if (wave === 2) return r < 0.65 ? 'walker' : r < 0.85 ? 'runner' : 'ghost';
    if (wave === 3) return r < 0.5 ? 'walker' : r < 0.72 ? 'runner' : r < 0.88 ? 'ghost' : 'brute';
    if (wave === 4) return r < 0.4 ? 'walker' : r < 0.62 ? 'runner' : r < 0.8 ? 'ghost' : 'brute';
    return r < 0.34 ? 'walker' : r < 0.56 ? 'runner' : r < 0.74 ? 'ghost' : 'brute';
  }

  archetypeConfig(type, wave) {
    const diff = this.state.difficultyMultiplier || 1;
    const base = (1.8 + wave * 0.22) * diff;
    switch (type) {
      case 'runner': return { speed: base * 1.5, score: 125, coins: 1, damage: 15, knockResist: 0, list: 'short' };
      case 'ghost': return { speed: base * 1.2, score: 150, coins: 2, damage: 20, knockResist: 0.25, list: 'mid' };
      case 'brute': return { speed: base * 0.68, score: 250, coins: 3, damage: 30, knockResist: 0.7, list: 'long' };
      case 'boss': return { speed: base * 0.55, score: 1000, coins: 10, damage: 35, knockResist: 0.9, list: 'long' };
      default: return { speed: base, score: 100, coins: 1, damage: 20, knockResist: 0, list: 'wave' };
    }
  }

  spawnZombie() {
    const type = this.rollArchetype();
    const cfg = this.archetypeConfig(type, this.state.wave);

    let wordList;
    if (cfg.list === 'short') wordList = SHORT_WORDS;
    else if (cfg.list === 'mid') wordList = MID_WORDS;
    else if (cfg.list === 'long') wordList = LONG_WORDS;
    else {
      const rand = Math.random();
      if (this.state.wave === 1) {
        wordList = rand < 0.7 ? SHORT_WORDS : MID_WORDS;
      } else if (this.state.wave === 2) {
        wordList = rand < 0.4 ? SHORT_WORDS : MID_WORDS;
      } else if (this.state.wave === 3) {
        if (rand < 0.15) wordList = SHORT_WORDS;
        else if (rand < 0.85) wordList = MID_WORDS;
        else wordList = LONG_WORDS;
      } else if (this.state.wave === 4) {
        wordList = rand < 0.5 ? MID_WORDS : LONG_WORDS;
      } else {
        wordList = rand < 0.1 ? MID_WORDS : LONG_WORDS;
      }
      // Brutes/bosses always get meaty words regardless of wave
      if (type === 'brute' || type === 'boss') wordList = LONG_WORDS;
      if (type === 'runner') wordList = Math.random() < 0.8 ? SHORT_WORDS : MID_WORDS;
    }
    
    const activeStartChars = this.zombies.map(z => (z.word && z.word[0] || '').toLowerCase());
    let candidates = wordList.filter(w => !activeStartChars.includes(w[0].toLowerCase()));

    if (candidates.length === 0) {
      candidates = wordList;
    }

    // First zombie of a run is always a tiny word - a free tutorial kill.
    if (this.state.wave === 1 && this.state.zombiesKilled === 0 && this.zombies.length === 0 && type !== 'boss') {
      const easy = SHORT_WORDS.filter(w => w.length <= 4 && !activeStartChars.includes(w[0].toLowerCase()));
      if (easy.length > 0) candidates = easy;
    }

    const word = candidates[Math.floor(Math.random() * candidates.length)];
    if (!word) return; // empty external word list: skip frame, never throw
    const speed = cfg.speed;

    const validDoors = this.spawnDoors.filter(d => d.z < -10 && d.z > -80);
    let selectedDoor = null;
    if (validDoors.length > 0) {
      selectedDoor = validDoors[Math.floor(Math.random() * validDoors.length)];
    }

    let spawnX = (Math.random() - 0.5) * 4.0;
    // Deep enough for the scene to breathe, close enough to be playable.
    // Bosses spawn center-stage for maximum menace.
    let spawnZ = type === 'boss' ? -20.0 : -24.0;

    if (selectedDoor) {
      selectedDoor.state = 'opening';
      selectedDoor.statusLightMat.color.setHex(type === 'boss' ? 0xffd700 : 0x00ffcc);

      spawnX = type === 'boss' ? 0 : selectedDoor.x;
      spawnZ = Math.max(selectedDoor.z, -30.0);
      // Spawn portal flash at the doorway
      try {
        const portalPos = new THREE.Vector3(selectedDoor.x, -0.5, selectedDoor.z + 0.5);
        this.particles.spawnPortal(portalPos, type === 'boss' ? 0xffd700 : 0x00ffcc);
      } catch (e) { /* cosmetic only */ }
    }

    const z = new Zombie(this.scene, word, speed, spawnZ, this.state.equippedFont, {
      type, scoreValue: cfg.score, coinValue: cfg.coins, damage: cfg.damage, knockResist: cfg.knockResist
    });
    z.worldX = spawnX;

    if (type === 'boss') {
      this.bossSpawnedThisWave = true;
      this.bossActive = z;
      this.showBossBar(word);
      this.audio.playSFX('boss');
      this.announce('⚠ BOSS INBOUND ⚠', '#ffd700', word.toUpperCase());
      this.triggerCameraShake(0.8);
    }
    
    if (selectedDoor) {
      z.spawnPhase = true;
      z.spawnPhaseTimer = 1.0;
      z.spawnDoorX = selectedDoor.x;
    }
    
    this.zombies.push(z);
  }

  render(dt) {
    // Pause truly freezes the scene: cosmetic animation (light flicker,
    // keyboard bob, arm poke, shake decay, muzzle flare) runs on rdt = 0
    // while PAUSED, but the final render still executes so the frame stays
    // alive behind the overlay. update() already stops when not PLAYING,
    // which is what freezes zombies / particles / combo timers.
    const paused = this.state.currentState === GameState.PAUSED;
    const rdt = paused ? 0 : dt;
    this.flickerTimer += rdt;
    const frozen = this.state.isFrozen();
    this.lights.forEach(l => {
      const noise = Math.sin(this.flickerTimer * 12 + l.zOffset) * Math.cos(this.flickerTimer * 4);
      let intensity = l.baseIntensity;

      if (frozen) {
        // Cryo freeze: dim warm lights, push everything icy blue
        intensity *= 0.55;
        l.bulb.material.color.setHex(0x88ddff);
      } else if (noise > 0.75) {
        intensity *= 0.15;
        l.bulb.material.color.setHex(0x111115);
      } else {
        l.bulb.material.color.setHex(l.light.color.getHex());
      }

      l.light.intensity = intensity;
    });
    
    const time = this.flickerTimer * 2.2;
    
    // Bobbing / breathing animation for keyboard
    if (this.keyboardGroup) {
      this.keyboardGroup.position.y = -0.22 + Math.sin(time) * 0.008;
      this.keyboardGroup.position.x = Math.cos(time * 0.5) * 0.005;
      
      // Keyboard press scale decay
      if (this.keyboardGroup.scale.x > 1.0) {
        const decay = rdt * 1.5;
        this.keyboardGroup.scale.x = Math.max(1.0, this.keyboardGroup.scale.x - decay);
        this.keyboardGroup.scale.y = Math.max(1.0, this.keyboardGroup.scale.y - decay);
        this.keyboardGroup.scale.z = Math.max(1.0, this.keyboardGroup.scale.z - decay);
      }
    }
    
    // Right arm poke/idle handling
    if (this.rightArmGroup) {
      if (this.pokeTimer > 0) {
        this.pokeTimer -= rdt;
        const progress = 1.0 - (this.pokeTimer / this.pokeDuration);
        const factor = Math.sin(progress * Math.PI);
        
        this.rightArmGroup.position.copy(this.rightArmIdlePos).lerp(this.targetPokeCamPos, factor);
        this.rightArmGroup.rotation.z = (-Math.PI / 18) * factor;
        this.rightArmGroup.rotation.x = (-Math.PI / 12) * factor;
      } else {
        this.rightArmGroup.position.copy(this.rightArmIdlePos);
        this.rightArmGroup.position.y += Math.sin(time - 0.5) * 0.006;
        this.rightArmGroup.position.x += Math.cos(time * 0.5 - 0.5) * 0.004;
        this.rightArmGroup.rotation.set(-Math.PI / 8, -Math.PI / 10, -Math.PI / 18);
      }
    }
    
    if (this.shakeIntensity > 0) {
      this.shakeIntensity -= this.shakeDecay * rdt;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;

      const dx = (Math.random() - 0.5) * this.shakeIntensity * 0.15;
      const dy = (Math.random() - 0.5) * this.shakeIntensity * 0.15;

      this.camera.position.set(dx, 0.2 + dy, 5.0);
    } else {
      this.camera.position.set(0, 0.2, 5.0);
    }

    // Muzzle flash: flashlight flares on every kill/keystroke, decays fast
    if (this.muzzleFlash > 0) {
      this.muzzleFlash = Math.max(0, this.muzzleFlash - rdt * 6);
      if (this.flashlight) this.flashlight.intensity = 18.0 + this.muzzleFlash * 22;
    } else if (this.flashlight) {
      this.flashlight.intensity = 18.0;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game app on load (with a readable error if the 3D engine or WebGL fails)
window.addEventListener('load', () => {
  if (typeof THREE === 'undefined') {
    const err = document.getElementById('loading-error');
    if (err) {
      err.style.display = 'block';
      err.innerText = 'Could not load the 3D engine (CDN blocked?). Check your connection and refresh the page.';
    }
    return;
  }
  try {
    window.game = new GameApp();
  } catch (err) {
    const el = document.getElementById('loading-error');
    if (el) {
      el.style.display = 'block';
      el.innerText = 'WebGL unavailable: ' + (err && err.message ? err.message : err);
    }
  }
});
