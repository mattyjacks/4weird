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
    
    // Add player spotlight
    this.flashlight = new THREE.SpotLight(0x00f2fe, 50.0, 35.0, Math.PI / 4.5, 0.6, 1.0);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.camera.near = 0.5;
    this.flashlight.shadow.camera.far = 35;
    this.flashlight.shadow.bias = -0.001;
    this.createPlayerHands();
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
    this.levelMeshes = [];
    this.isSpeedUpActive = false;
    
    this.lastTime = 0;
    this.spawnTimer = 0;
    this.flickerTimer = 0;
    
    this.shakeIntensity = 0;
    this.shakeDecay = 4.0;
    
    this.buildLevelScene();
    this.bindEvents();
    
    this.storeController = setupStore(this.state, this.audio);
    this.initSettingsUI();
    
    // Remove loading screen on complete
    document.getElementById('TEMPLATE-4weird-loading-screen').classList.add('hidden');
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
    const ambientLight = new THREE.AmbientLight(0x0a1128, 0.45);
    this.addLevelMesh(ambientLight);
    
    // Add directional lighting down the corridor
    const dirLight = new THREE.DirectionalLight(0x00f2fe, 0.65);
    dirLight.position.set(0, 3, 5);
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
      
      const light = new THREE.PointLight(0xff00ff, 45.0, 15.0);
      light.position.set(-roadWidth / 2 + 0.1, 3.0 - 1.2, z);
      this.addLevelMesh(light);
      this.lights.push({ bulb: lightBulb, light, baseIntensity: 45.0, zOffset: z });
    }
    
    // Ambient night lighting
    const ambientLight = new THREE.AmbientLight(0x0f0b18, 0.45);
    this.addLevelMesh(ambientLight);
    
    // Directional sky light
    const dirLight = new THREE.DirectionalLight(0x8b5cf6, 0.55);
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
        
        const light = new THREE.PointLight(0x00ff88, 30.0, 10.0);
        light.position.set(roadWidth / 2 - 0.4, 0.2 - 1.2, z);
        this.addLevelMesh(light);
        this.lights.push({ bulb: lightBulb, light, baseIntensity: 30.0, zOffset: z });
      }
    }
    
    // Spooky graveyard ground ambient glow
    const ambientLight = new THREE.AmbientLight(0x0d0818, 0.4);
    this.addLevelMesh(ambientLight);
    
    // Cool purple moonlight
    const dirLight = new THREE.DirectionalLight(0xa855f7, 0.5);
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
    
    const light = new THREE.PointLight(0x00ff88, 45.0, 16.0);
    light.position.set(0, height - 1.4, z);
    
    this.addLevelMesh(bulb);
    this.addLevelMesh(light);
    
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
  }

  isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
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
        } else if (e.key === 'Shift' || e.key === ' ') {
          e.preventDefault();
          this.setSpeedUp(true);
        } else {
          this.typing.handleInput(e.key, this.zombies);
        }
      } else if (this.state.currentState === GameState.PAUSED) {
        if (e.key === 'Escape') {
          this.togglePause();
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
      
      // Focus when clicking container
      this.container.addEventListener('click', () => {
        if (this.state.currentState === GameState.PLAYING) {
          mobileInput.focus();
        }
      });
    }

    if (mobileBtn) {
      mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileInput.focus();
      });
    }

    if (mobileInput) {
      mobileInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length > 0) {
          for (let i = 0; i < val.length; i++) {
            this.typing.handleInput(val[i], this.zombies);
          }
          e.target.value = '';
        }
      });
    }

    // Difficulty selection bindings
    const diffBtns = document.querySelectorAll('.btn-diff');
    diffBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        diffBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
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
        levelBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const lvl = e.currentTarget.getAttribute('data-level');
        this.state.selectedLevel = lvl;
      });
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
    
    // Wave Cleared Glossary button
    document.getElementById('btn-next-wave').addEventListener('click', () => {
      this.state.wave++;
      document.getElementById('wave-val').innerText = this.state.wave;
      this.calculateWaveBudget();
      this.triggerCameraShake(0.2);
      this.state.waveWords.clear();
      this.state.setGameState(GameState.PLAYING);
      if (this.isTouchDevice() && mobileInput) {
        mobileInput.focus();
      }
    });

    // Mute button handler
    document.getElementById('TEMPLATE-4weird-mute-btn').addEventListener('click', (e) => {
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
    if (isMuted) {
      btn.classList.add('active');
      btn.innerText = '🔇 Muted';
    } else {
      btn.classList.remove('active');
      btn.innerText = '🔊 Sound';
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
    
    if (sfxSlider && musicSlider && particleCheckbox) {
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
    
    this.typing.reset();
    this.zombies.forEach(z => z.destroy());
    this.zombies = [];
    this.particles.clear();
    
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
    
    document.getElementById('score-val').innerText = '0';
    document.getElementById('wave-val').innerText = '1';
    document.getElementById('health-bar-fill').style.width = '100%';
    this.buildLevelScene();
    this.calculateWaveBudget();
    
    this.spawnTimer = 0;
    this.state.setGameState(GameState.PLAYING);
    this.resizeCanvas();
    
    const mobileInput = document.getElementById('mobile-game-input');
    if (this.isTouchDevice() && mobileInput) {
      mobileInput.focus();
    }
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
    const activeDt = this.isSpeedUpActive ? dt * 3.0 : dt;

    // 0. Update door slide animations
    this.spawnDoors.forEach(door => {
      if (door.state === 'opening') {
        door.slideProgress = Math.min(1.0, door.slideProgress + activeDt * 4.0);
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
        door.slideProgress = Math.max(0.0, door.slideProgress - activeDt * 2.0);
        if (door.slideProgress <= 0.0) {
          door.state = 'closed';
          door.statusLightMat.color.setHex(0xff0055);
        }
      }
      
      const doorHeight = 2.8;
      door.doorMesh.position.y = ((doorHeight - 0.05) / 2 - 1.2) + (door.slideProgress * 2.6);
    });

    // 1. Spawner Logic
    this.spawnTimer += activeDt;
    const spawnInterval = Math.max(1.0, 3.5 - this.state.wave * 0.25);
    
    const totalSpawned = this.state.zombiesKilled + this.zombies.length;
    
    if (this.spawnTimer >= spawnInterval && totalSpawned < this.state.zombiesInWave) {
      this.spawnTimer = 0;
      this.spawnZombie();
    }
    
    // 2. Update Zombies
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      z.update(activeDt);
      
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
      this.populateGlossary();
      this.state.setGameState(GameState.GLOSSARY);
      this.triggerCameraShake(0.2);
    }
    
    this.state.updateCombo(activeDt);
    this.particles.update(activeDt);
  }

  spawnZombie() {
    let wordList = SHORT_WORDS;
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
    
    const activeStartChars = this.zombies.map(z => z.word[0].toLowerCase());
    let candidates = wordList.filter(w => !activeStartChars.includes(w[0].toLowerCase()));
    
    if (candidates.length === 0) {
      candidates = wordList;
    }
    
    const word = candidates[Math.floor(Math.random() * candidates.length)];
    const speed = (1.8 + this.state.wave * 0.22) * this.state.difficultyMultiplier;
    
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
    
    const time = this.flickerTimer * 2.2;
    
    // Bobbing / breathing animation for keyboard
    if (this.keyboardGroup) {
      this.keyboardGroup.position.y = -0.22 + Math.sin(time) * 0.008;
      this.keyboardGroup.position.x = Math.cos(time * 0.5) * 0.005;
      
      // Keyboard press scale decay
      if (this.keyboardGroup.scale.x > 1.0) {
        const decay = dt * 1.5;
        this.keyboardGroup.scale.x = Math.max(1.0, this.keyboardGroup.scale.x - decay);
        this.keyboardGroup.scale.y = Math.max(1.0, this.keyboardGroup.scale.y - decay);
        this.keyboardGroup.scale.z = Math.max(1.0, this.keyboardGroup.scale.z - decay);
      }
    }
    
    // Right arm poke/idle handling
    if (this.rightArmGroup) {
      if (this.pokeTimer > 0) {
        this.pokeTimer -= dt;
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
