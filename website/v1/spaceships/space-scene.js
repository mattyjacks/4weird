// 4weird Games - Three.js Space Background & Cinematic Combat Controller
// Coordinates Web Workers, Boids AI, and WebGL rendering.
// Optimized for maximum frame rates, low resource utilization, and stunning visual effects.
// No em-dashes or en-dashes used in comments.

import { ShipBuilder } from './ship-builder.js';

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

let scene, camera, renderer;
let ambientLight, sunLight;
let fleetGroup, alienGroup, stationGroup;
let starField, nebulaPlanes = [];
let projectiles = [], debrisList = [], explosions = [], tractorBeams = [];

// Web Workers
let boidsWorker, physicsWorker;
let boidsWorkerBusy = false;
let physicsWorkerBusy = false;
// Track which debris IDs were included in the last physics worker batch.
// Debris spawned while the worker is busy must NOT be evicted by stale responses.
let lastSentDebrisIds = new Set();

// HUD & State
let credits = 0;
let transactionHistory = [];
const activeHumanShips = new Map();
const activeAliens = new Map();
const activeDebris = new Map();
let lastTime = 0;
let nextAlienSpawnTime = 5.0; // Spawns first wave quickly
let nextStationSpawnTime = 15.0; // Spawns first station quickly
let currentStation = null;
let spaceStationActive = false;

// Camera Cinematic Modes
let cameraMode = "chase"; // chase, flyby, side, combat
let cameraTimer = 0.0;
let cameraTargetOffset = new THREE.Vector3();
let cameraLookAtTarget = new THREE.Vector3();
let cameraCurrentRoll = 0.0;

export function initSpaceBackground() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;

  // Initialize Three.js WebGL Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false; // Disabled for resource efficiency

  // Create Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05030a, 0.0035);

  // Perspective Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 500);
  camera.position.set(0, 10, 35);

  // Group setups
  fleetGroup = new THREE.Group();
  alienGroup = new THREE.Group();
  stationGroup = new THREE.Group();
  scene.add(fleetGroup);
  scene.add(alienGroup);
  scene.add(stationGroup);

  // Setup Lights
  ambientLight = new THREE.AmbientLight(0x1a1230, 1.2);
  scene.add(ambientLight);

  // Main star light (cyan sun)
  sunLight = new THREE.DirectionalLight(0x00f2fe, 1.8);
  sunLight.position.set(100, 80, 50);
  scene.add(sunLight);

  // Secondary soft purple backlight
  const purpleLight = new THREE.DirectionalLight(0xbd00ff, 0.9);
  purpleLight.position.set(-80, -40, -50);
  scene.add(purpleLight);

  // Build Deep Space Environment
  createStarField();
  createNebulae();

  // Create Human Squadron (5 modular ships)
  spawnHumanFleet();

  // Initialize Web Workers
  boidsWorker = new Worker('./spaceships/workers/boids-worker.js');
  physicsWorker = new Worker('./spaceships/workers/physics-worker.js');

  // Handle Boids Worker response
  boidsWorker.onmessage = function(e) {
    boidsWorkerBusy = false;
    const { type, data } = e.data;
    if (type === "flocking_results") {
      // Update Humans
      data.humans.forEach(h => {
        const ship = activeHumanShips.get(h.id);
        if (ship) {
          ship.position.fromArray(h.position);
          ship.mesh.position.copy(ship.position); // FIX: Copy physics position to Three.js mesh
          ship.velocity = h.velocity;
          
          // Smooth rotation aligning with velocity
          const targetRot = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(h.velocity[0], h.velocity[1], h.velocity[2]).normalize()
          );
          ship.mesh.quaternion.slerp(targetRot, 0.1);

          // Custom Z roll animation for space flavor
          const rollAngle = h.velocity[0] * -0.12; // Bank into turns
          const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), rollAngle);
          ship.mesh.quaternion.multiply(rollQuat);
        }
      });

      // Update Aliens
      data.aliens.forEach(a => {
        const alien = activeAliens.get(a.id);
        if (alien) {
          alien.position.fromArray(a.position);
          alien.mesh.position.copy(alien.position); // FIX: Copy physics position to Three.js mesh
          alien.velocity = a.velocity;

          const targetRot = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(a.velocity[0], a.velocity[1], a.velocity[2]).normalize()
          );
          alien.mesh.quaternion.slerp(targetRot, 0.1);

          // Spiralling corkscrew roll
          const rollAngle = (Date.now() * 0.005 + alien.seed) % (Math.PI * 2);
          const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), rollAngle);
          alien.mesh.quaternion.multiply(rollQuat);
        }
      });
    }
  };

  // Handle Physics Worker response
  physicsWorker.onmessage = function(e) {
    physicsWorkerBusy = false;
    const { type, data } = e.data;
    if (type === "physics_results") {
      window.debugPhysicsData = window.debugPhysicsData || { hits: 0, collects: 0, receivedWaves: 0 };
      window.debugPhysicsData.receivedWaves++;
      if (data.hitEvents && data.hitEvents.length > 0) {
        window.debugPhysicsData.hits += data.hitEvents.length;
      }
      if (data.collectEvents && data.collectEvents.length > 0) {
        window.debugPhysicsData.collects += data.collectEvents.length;
      }
      // 1. Sync Projectiles
      const updatedProjIds = new Set(data.projectiles.map(p => p.id));
      // Remove dead visual projectiles
      projectiles = projectiles.filter(p => {
        if (!updatedProjIds.has(p.id)) {
          scene.remove(p.mesh);
          if (p.light) scene.remove(p.light);
          return false;
        }
        // Update position
        const pData = data.projectiles.find(item => item.id === p.id);
        if (pData) {
          p.position = pData.position;
          p.mesh.position.fromArray(pData.position);
          if (p.light) p.light.position.copy(p.mesh.position);
        }
        return true;
      });

      // 2. Sync Debris (Scrap)
      // Only evict debris that was actually SENT in this batch.
      // Debris spawned while the worker was busy (not in lastSentDebrisIds) must
      // survive so the next tick can process it.
      const updatedDebrisMap = new Map(data.debris.map(d => [d.id, d]));
      const sentIds = lastSentDebrisIds;
      debrisList = debrisList.filter(d => {
        // Not sent this tick -- newly spawned, keep it for next tick
        if (!sentIds.has(d.id)) return true;
        const dData = updatedDebrisMap.get(d.id);
        if (!dData) {
          // Sent but not returned -- either collected or OOB, remove it
          scene.remove(d.mesh);
          return false;
        }
        d.position = dData.position;
        d.velocity = dData.velocity;
        d.mesh.position.fromArray(dData.position);
        d.mesh.rotation.x += 0.02;
        d.mesh.rotation.y += 0.03;
        return true;
      });

      // 3. Process Hits
      data.hitEvents.forEach(evt => {
        if (evt.alienId) {
          const alien = activeAliens.get(evt.alienId);
          if (alien) {
            alien.health -= evt.damage;
            flashAlien(alien);
            createHitSparks(evt.hitPos, 0x39ff14);
            if (alien.health <= 0) {
              destroyAlien(alien);
            }
          }
        } else if (evt.humanId) {
          const human = activeHumanShips.get(evt.humanId);
          if (human) {
            createHitSparks(evt.hitPos, 0x00f6ff); // Blue shield hit glow
          }
        }
      });

      // 4. Process Collections
      data.collectEvents.forEach(evt => {
        const human = activeHumanShips.get(evt.humanId);
        if (human) {
          human.inventory.push({ type: evt.partType, value: evt.value });
          createCollectVisual(human.position, evt.partType);
        }
        // Remove debris mesh
        const d = debrisList.find(item => item.id === evt.debrisId);
        if (d) {
          scene.remove(d.mesh);
          debrisList = debrisList.filter(item => item.id !== d.id);
        }
      });

      // 5. Draw Tractor Beams
      clearTractorBeams();
      data.beamLines.forEach(beam => {
        drawTractorBeam(beam.start, beam.end);
      });
    }
  };

  // Add Credit Counter HUD element
  createHUD();

  // Resize listener
  window.addEventListener('resize', onWindowResize, false);

  // Start Animation Loop
  requestAnimationFrame(animate);
}

// ===== ENTITY SPAWNERS =====

function spawnHumanFleet() {
  const formation = [
    [0, 0, 0],       // Leader
    [-4, 1, 3],      // Left Wing
    [4, 1, 3],       // Right Wing
    [-7, -1, 6],     // Far Left Wing
    [7, -1, 6]       // Far Right Wing
  ];

  for (let i = 0; i < 5; i++) {
    const id = "human_" + i;
    const mesh = ShipBuilder.buildShip("human", i * 1.5);
    mesh.position.fromArray(formation[i]);
    fleetGroup.add(mesh);

    activeHumanShips.set(id, {
      id: id,
      mesh: mesh,
      position: new THREE.Vector3().fromArray(formation[i]),
      velocity: [0, 0, -5],
      wanderOffset: formation[i],
      inventory: [],
      weaponCooldown: 0.0,
      radius: mesh.userData.collisionRadius
    });

    // Add Engine Thruster point light to one of the ships for visual lighting
    if (i === 0) {
      const thrusterLight = new THREE.PointLight(0x00f6ff, 1.5, 15);
      // Position light behind exhaust nozzle
      thrusterLight.position.set(0, 0, 2);
      mesh.add(thrusterLight);
    }
  }
}

function spawnAlienWave() {
  const count = 2 + Math.floor(Math.random() * 2);
  const targetKeys = Array.from(activeHumanShips.keys());

  let fleetZ = 0.0;
  if (activeHumanShips.size > 0) {
    let sumZ = 0.0;
    activeHumanShips.forEach(h => sumZ += h.position.z);
    fleetZ = sumZ / activeHumanShips.size;
  }

  for (let i = 0; i < count; i++) {
    const id = "alien_" + Date.now() + "_" + i;
    // Spawn ahead along Z-axis (relative to current average fleet Z)
    const spawnPos = [
      (Math.random() - 0.5) * 40.0,
      (Math.random() - 0.5) * 15.0,
      fleetZ - 130.0 + (Math.random() - 0.5) * 20.0
    ];

    const mesh = ShipBuilder.buildShip("alien", Math.random() * 5.0);
    mesh.position.fromArray(spawnPos);
    alienGroup.add(mesh);

    const randomTarget = targetKeys[Math.floor(Math.random() * targetKeys.length)];

    activeAliens.set(id, {
      id: id,
      mesh: mesh,
      position: new THREE.Vector3().fromArray(spawnPos),
      velocity: [0, 0, 8],
      targetId: randomTarget,
      health: 3,
      radius: mesh.userData.collisionRadius,
      seed: Math.random() * 100
    });

    // Warp flare effect
    createWarpFlare(spawnPos);
  }
}

function spawnSpaceStation() {
  if (spaceStationActive) return;
  spaceStationActive = true;

  let fleetZ = 0.0;
  if (activeHumanShips.size > 0) {
    let sumZ = 0.0;
    activeHumanShips.forEach(h => sumZ += h.position.z);
    fleetZ = sumZ / activeHumanShips.size;
  }

  const station = ShipBuilder.buildStation(Math.random());
  station.position.set(0, 25, fleetZ - 280.0); // Spawn far ahead of the fleet
  stationGroup.add(station);
  currentStation = station;
}

// ===== GRAPHICS & PARTICLES =====

function createStarField() {
  const count = 2500;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 300.0;
    positions[i + 1] = (Math.random() - 0.5) * 150.0;
    positions[i + 2] = -Math.random() * 300.0;
    sizes[i/3] = 0.5 + Math.random() * 1.5;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Small, efficient point texture shader representation
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  starField = new THREE.Points(geom, mat);
  scene.add(starField);
}

function createNebulae() {
  const geom = new THREE.PlaneGeometry(120, 120);
  const colors = [0x8b5cf6, 0x00f2fe, 0x10b981];
  
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: colors[i],
      transparent: true,
      opacity: 0.035 + (i * 0.01),
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set((i - 1) * 35, (i - 1) * 15, -120 - i * 40);
    mesh.rotation.z = i * Math.PI / 4;
    scene.add(mesh);
    nebulaPlanes.push(mesh);
  }
}

function createWarpFlare(pos) {
  const flareGeom = new THREE.SphereGeometry(2.0, 8, 8);
  const flareMat = new THREE.MeshBasicMaterial({
    color: 0xda70d6,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const flare = new THREE.Mesh(flareGeom, flareMat);
  flare.position.fromArray(pos);
  scene.add(flare);

  explosions.push({
    mesh: flare,
    type: "warp",
    scaleSpeed: 12.0,
    maxScale: 6.0,
    opacity: 0.85
  });
}

function flashAlien(alien) {
  alien.mesh.traverse(child => {
    if (child.isMesh && child.material && child.material.emissive) {
      if (child.userData.origEmissive === undefined) {
        child.userData.origEmissive = child.material.emissive.getHex();
      }
      child.material.emissive.setHex(0xffffff);
      setTimeout(() => {
        if (child.material && child.material.emissive) {
          child.material.emissive.setHex(child.userData.origEmissive);
        }
      }, 70);
    }
  });
}

function createHitSparks(pos, colorHex) {
  const count = 15;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i*3] = pos[0];
    positions[i*3+1] = pos[1];
    positions[i*3+2] = pos[2];

    velocities.push([
      (Math.random() - 0.5) * 8.0,
      (Math.random() - 0.5) * 8.0,
      (Math.random() - 0.5) * 8.0
    ]);
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: colorHex,
    size: 0.4,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geom, mat);
  scene.add(points);

  explosions.push({
    mesh: points,
    type: "spark",
    velocities: velocities,
    positions: positions,
    life: 0.4
  });
}

function destroyAlien(alien) {
  // 1. Create large beautiful explosion particle sphere
  createHitSparks(alien.position.toArray(), 0xff3300);
  
  const shockGeom = new THREE.RingGeometry(0.1, 1.5, 16);
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const shock = new THREE.Mesh(shockGeom, shockMat);
  shock.position.copy(alien.position);
  scene.add(shock);

  explosions.push({
    mesh: shock,
    type: "ring",
    scaleSpeed: 10.0,
    maxScale: 8.0,
    opacity: 0.9
  });

  // Dynamic Point Light Flash for explosion lighting
  const flashLight = new THREE.PointLight(0xffaa00, 4.0, 30);
  flashLight.position.copy(alien.position);
  scene.add(flashLight);
  setTimeout(() => scene.remove(flashLight), 150);

  // 2. Spawn Salvageable Scrap Debris (Alien Spaceship Parts)
  const partTypes = ["Thruster Core", "Weapon Housing", "Plating", "Shield Module", "Processor"];
  const debrisCount = 2 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < debrisCount; i++) {
    const dId = "debris_" + Date.now() + "_" + i;
    const itemType = partTypes[Math.floor(Math.random() * partTypes.length)];
    const val = 100 + Math.floor(Math.random() * 100);

    // Assembly tiny metal box for scrap
    const boxGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x8b8f96,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x39ff14, // Poison green highlight to show it is alien scrap
      emissiveIntensity: 0.2
    });
    const dMesh = new THREE.Mesh(boxGeom, boxMat);
    dMesh.position.copy(alien.position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3
    ));
    scene.add(dMesh);

    debrisList.push({
      id: dId,
      mesh: dMesh,
      position: dMesh.position.toArray(),
      velocity: [
        (Math.random() - 0.5) * 2.5, // Low scatter so ships can catch it
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 1.5
      ],
      partType: itemType,
      value: val
    });
  }

  // 3. Remove alien from simulation
  alienGroup.remove(alien.mesh);
  activeAliens.delete(alien.id);
}

// ===== WEAPONS FIRING =====

function fireHumanWeapon(ship, typeIdx) {
  const id = "laser_" + Date.now() + "_" + Math.random();
  const origin = new THREE.Vector3().copy(ship.mesh.position);
  
  // Offset origin slightly forward
  origin.z -= 2.0;

  let geom, mat, vel, dmg, pMesh, pLight;

  if (typeIdx === 0) {
    // 1. Red Laser Bolt
    geom = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6);
    geom.rotateX(1.5708);
    mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    pMesh = new THREE.Mesh(geom, mat);
    vel = [0, 0, -85];
    dmg = 1;
  } 
  else if (typeIdx === 1) {
    // 2. Cyan Plasma Sphere (with dynamic light)
    geom = new THREE.SphereGeometry(0.4, 8, 8);
    mat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    pMesh = new THREE.Mesh(geom, mat);
    vel = [0, 0, -50];
    dmg = 2;

    pLight = new THREE.PointLight(0x00f2fe, 1.2, 12);
    scene.add(pLight);
  } 
  else if (typeIdx === 2) {
    // 3. Homing Seeker Missile
    geom = new THREE.ConeGeometry(0.18, 0.8, 6);
    geom.rotateX(1.5708);
    mat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    pMesh = new THREE.Mesh(geom, mat);
    vel = [(Math.random() - 0.5) * 10.0, 5.0, -45]; // Fired slightly upwards, then curves
    dmg = 3;
  } 
  else if (typeIdx === 3) {
    // 4. Arc lightning Beam (instant check, visual duration)
    // Find a target alien
    const aliensArr = Array.from(activeAliens.values());
    if (aliensArr.length > 0) {
      const target = aliensArr[Math.floor(Math.random() * aliensArr.length)];
      drawLightningArc(origin, target.position);
      target.health -= 1.5;
      flashAlien(target);
      createHitSparks(target.position.toArray(), 0xbd00ff);
      if (target.health <= 0) destroyAlien(target);
      return; // Arc lightning doesn't spawn a standard flying projectile
    } else {
      // Fallback to red laser if no target
      fireHumanWeapon(ship, 0);
      return;
    }
  } 
  else {
    // 5. Phase Disk (rotating ring)
    geom = new THREE.TorusGeometry(0.5, 0.08, 4, 12);
    mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    pMesh = new THREE.Mesh(geom, mat);
    pMesh.rotation.y = 1.5708;
    vel = [0, 0, -60];
    dmg = 2;
  }

  pMesh.position.copy(origin);
  scene.add(pMesh);

  projectiles.push({
    id: id,
    mesh: pMesh,
    position: [origin.x, origin.y, origin.z],
    velocity: vel,
    owner: "human",
    damage: dmg,
    life: 0.0,
    light: pLight
  });
}

function drawLightningArc(start, end) {
  const points = [];
  const segments = 8;
  const dir = new THREE.Vector3().subVectors(end, start);
  const segmentLength = dir.length() / segments;

  for (let i = 0; i <= segments; i++) {
    const p = new THREE.Vector3().copy(start).addScaledVector(dir, i / segments);
    if (i > 0 && i < segments) {
      // Add zigzag offset
      p.x += (Math.random() - 0.5) * 1.5;
      p.y += (Math.random() - 0.5) * 1.5;
      p.z += (Math.random() - 0.5) * 1.5;
    }
    points.push(p);
  }

  const pathGeom = new THREE.BufferGeometry().setFromPoints(points);
  const pathMat = new THREE.LineBasicMaterial({ color: 0xbd00ff, linewidth: 2 });
  const line = new THREE.Line(pathGeom, pathMat);
  scene.add(line);

  // Auto clean up lightning line
  setTimeout(() => scene.remove(line), 90);
}

// ===== TRACTOR BEAM VISUALS =====

function clearTractorBeams() {
  tractorBeams.forEach(b => scene.remove(b));
  tractorBeams = [];
}

function drawTractorBeam(startArray, endArray) {
  const start = new THREE.Vector3().fromArray(startArray);
  const end = new THREE.Vector3().fromArray(endArray);

  const points = [];
  const count = 12;
  const dir = new THREE.Vector3().subVectors(end, start);

  // Draw a spiral coil helix representing the tractor beam
  for (let i = 0; i <= count; i++) {
    const frac = i / count;
    const basePos = new THREE.Vector3().copy(start).addScaledVector(dir, frac);
    
    // Add helical offsets
    const angle = frac * Math.PI * 8.0 + Date.now() * 0.01;
    const radius = 0.4 * (1.0 - frac); // Narrowing cone
    
    // Orthogonal offsets
    const offset = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    offset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), dir.clone().normalize()));

    basePos.add(offset);
    points.push(basePos);
  }

  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.6
  });
  const line = new THREE.Line(geom, mat);
  scene.add(line);
  tractorBeams.push(line);
}

// ===== HUD & TRANSACTIONS =====

function createHUD() {
  // HUD layout built purely in styled HTML overlay for resource efficiency
  const hud = document.createElement('div');
  hud.id = "background-hud";
  hud.style.cssText = `
    position: absolute;
    top: 90px;
    left: 24px;
    z-index: 50;
    pointer-events: none;
    font-family: 'Orbitron', 'Inter', sans-serif;
    color: #fff;
    text-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
  `;
  
  hud.innerHTML = `
    <div style="background: rgba(10,10,20,0.6); padding: 12px 20px; border-radius: 8px; border: 1px solid rgba(0,242,254,0.3); backdrop-filter: blur(5px);">
      <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px;">Fleet earnings</div>
      <div style="font-size: 24px; font-weight: 700; color: #00f2fe;" id="hud-credits">0 CR</div>
    </div>
    <div id="hud-history" style="margin-top: 10px; font-size: 11px; max-height: 120px; overflow: hidden; opacity: 0.8; width: 220px; display: flex; flex-direction: column; gap: 4px;"></div>
  `;

  document.getElementById('hero').appendChild(hud);
}

function updateHUDCredits() {
  const creditsEl = document.getElementById('hud-credits');
  if (creditsEl) {
    creditsEl.textContent = credits.toLocaleString() + " CR";
  }
}

function addTransaction(itemType, value) {
  credits += value;
  updateHUDCredits();

  // Add to scrolling history list
  const historyEl = document.getElementById('hud-history');
  if (historyEl) {
    const entry = document.createElement('div');
    entry.style.cssText = `
      background: rgba(16, 185, 129, 0.15);
      border-left: 2px solid #10b981;
      padding: 4px 8px;
      border-radius: 0 4px 4px 0;
      color: #34d399;
      animation: slideIn 0.3s ease;
    `;
    entry.textContent = `+${value} CR: Sold ${itemType}`;
    historyEl.prepend(entry);

    // Limit log length
    if (historyEl.children.length > 4) {
      historyEl.removeChild(historyEl.lastChild);
    }
  }
}

function createCollectVisual(shipPos, partType) {
  // Project ship 3D position to 2D screen coordinates
  const tempV = new THREE.Vector3().copy(shipPos);
  tempV.project(camera);

  const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
  const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;

  const floatingText = document.createElement('div');
  floatingText.className = "floating-tx";
  floatingText.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    color: #00f2fe;
    font-family: 'Orbitron', sans-serif;
    font-size: 12px;
    font-weight: 700;
    pointer-events: none;
    z-index: 1000;
    transform: translate(-50%, -50%);
    animation: floatUp 1.2s ease-out forwards;
    text-shadow: 0 0 5px rgba(0, 242, 254, 0.8);
  `;
  floatingText.textContent = `+Salvaged ${partType}`;
  document.body.appendChild(floatingText);

  // Remove element after animation ends
  setTimeout(() => document.body.removeChild(floatingText), 1200);
}

function triggerStationSale(ship, stationPos) {
  if (ship.inventory.length === 0) return;

  // Transfer beam effect (yellow flash laser)
  const lineGeom = new THREE.BufferGeometry().setFromPoints([
    ship.mesh.position,
    stationPos
  ]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2 });
  const line = new THREE.Line(lineGeom, lineMat);
  scene.add(line);
  setTimeout(() => scene.remove(line), 150);

  // Clear ship inventory and add credit values
  let totalCR = 0;
  ship.inventory.forEach(item => {
    totalCR += item.value;
    addTransaction(item.type, item.value);
  });
  ship.inventory = [];

  // Project 3D station position to screen to show floating text
  const tempV = new THREE.Vector3().copy(stationPos);
  tempV.project(camera);
  const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
  const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;

  const floatingText = document.createElement('div');
  floatingText.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    color: #ffffd7;
    font-family: 'Orbitron', sans-serif;
    font-size: 15px;
    font-weight: 900;
    pointer-events: none;
    z-index: 1000;
    transform: translate(-50%, -50%);
    animation: floatUp 1.5s ease-out forwards;
    text-shadow: 0 0 8px rgba(255,215,0,0.8);
  `;
  floatingText.textContent = `TRANSACTION: +${totalCR} CR`;
  document.body.appendChild(floatingText);
  setTimeout(() => document.body.removeChild(floatingText), 1500);
}

// ===== MAIN ANIMATION & SIMULATION LOOP =====

function animate(timestamp) {
  requestAnimationFrame(animate);

  const dt = Math.min((timestamp - lastTime) / 1000, 0.1) || 0.016;
  lastTime = timestamp;

  // Slow environment rotation and center starfield around camera
  if (starField) {
    starField.position.copy(camera.position);
  }
  starField.rotation.z += 0.015 * dt;

  nebulaPlanes.forEach((p, idx) => {
    p.rotation.z += (idx % 2 === 0 ? 0.005 : -0.005) * dt;
    // Wrap nebulae when they go behind the camera
    if (p.position.z > camera.position.z + 50.0) {
      p.position.z -= 300.0;
    }
  });

  // Calculate average fleet Z first to use for cleanup and station interactions
  let fleetZ = 0.0;
  if (activeHumanShips.size > 0) {
    let sumZ = 0.0;
    activeHumanShips.forEach(h => sumZ += h.position.z);
    fleetZ = sumZ / activeHumanShips.size;
  }

  // Rotate station parts if station is active (station remains stationary in space)
  if (spaceStationActive && currentStation) {
    currentStation.userData.blinkers.forEach(b => {
      // Periodic blink glow intensity
      b.material.opacity = Math.sin(timestamp * 0.008) * 0.5 + 0.5;
    });

    currentStation.children.forEach(child => {
      if (child.userData && child.userData.rotateSpeed) {
        child.rotation.y += child.userData.rotateSpeed * dt;
      }
    });

    // Trigger docking salvage transfer when humans fly near
    if (currentStation.position.z > fleetZ - 70.0 && currentStation.position.z < fleetZ + 20.0) {
      activeHumanShips.forEach(h => {
        if (h.inventory.length > 0) {
          triggerStationSale(h, currentStation.position);
        }
      });
    }

    // Discard station once past the camera (stationary station, camera passes it)
    if (currentStation.position.z > camera.position.z + 80.0) {
      stationGroup.remove(currentStation);
      currentStation = null;
      spaceStationActive = false;
      nextStationSpawnTime = 40.0 + Math.random() * 20.0;
    }
  } else {
    nextStationSpawnTime -= dt;
    if (nextStationSpawnTime <= 0) {
      spawnSpaceStation();
    }
  }

  // Active Alien Cleanup: remove aliens that are far behind the camera/fleet
  const aliensToDelete = [];
  activeAliens.forEach((alien, id) => {
    const pastCamera = alien.position.z > camera.position.z + 20.0;
    const pastFleet = alien.position.z > fleetZ + 50.0;
    if (pastCamera || pastFleet) {
      aliensToDelete.push({ id, reason: `pastCamera: ${pastCamera} (alien Z: ${alien.position.z.toFixed(1)}, camThreshold: ${(camera.position.z + 20.0).toFixed(1)}), pastFleet: ${pastFleet} (fleetZ: ${fleetZ.toFixed(1)}, fleetThreshold: ${(fleetZ + 50.0).toFixed(1)})` });
    }
  });
  aliensToDelete.forEach(item => {
    const alien = activeAliens.get(item.id);
    if (alien) {
      console.log(`[4weird-debug] Deleting alien ${item.id}: ${item.reason}`);
      alienGroup.remove(alien.mesh);
      activeAliens.delete(item.id);
    }
  });

  // Alien spawn loop
  const alienKeys = Array.from(activeAliens.keys());
  if (alienKeys.length === 0) {
    nextAlienSpawnTime -= dt;
    if (nextAlienSpawnTime <= 0) {
      spawnAlienWave();
      nextAlienSpawnTime = 30.0 + Math.random() * 15.0;
    }
  }

  // 1. Trigger Async Boids AI Worker
  if (!boidsWorkerBusy) {
    boidsWorkerBusy = true;
    
    // Prepare minimal data sets to optimize serialization
    const hData = Array.from(activeHumanShips.values()).map(h => ({
      id: h.id,
      position: [h.position.x, h.position.y, h.position.z],
      velocity: h.velocity,
      wanderOffset: h.wanderOffset,
      maxSpeed: 7.0
    }));

    const aData = Array.from(activeAliens.values()).map(a => ({
      id: a.id,
      position: [a.position.x, a.position.y, a.position.z],
      velocity: a.velocity,
      targetId: a.targetId,
      maxSpeed: 11.5
    }));

    // Target wanders via simple sin/cos paths to simulate organic flying patterns
    // targetZ is relative to the fleet's current average Z so ships always fly forward
    const targetZ = fleetZ - 45.0;
    const targetX = Math.sin(timestamp * 0.0006) * 18.0;
    const targetY = Math.cos(timestamp * 0.0004) * 6.0;

    boidsWorker.postMessage({
      type: "calculate_flocking",
      data: {
        humans: hData,
        aliens: aData,
        wanderTarget: [targetX, targetY, targetZ],
        dt: dt,
        bounds: { width: 32.0, height: 16.0 }
      }
    });
  }

  // 2. Trigger Async Physics & Collisions Worker
  if (!physicsWorkerBusy) {
    physicsWorkerBusy = true;

    const pData = projectiles.map(p => ({
      id: p.id,
      position: p.position,
      velocity: p.velocity,
      owner: p.owner,
      damage: p.damage,
      life: p.life
    }));

    const aData = Array.from(activeAliens.values()).map(a => ({
      id: a.id,
      position: [a.position.x, a.position.y, a.position.z],
      health: a.health,
      radius: a.radius
    }));

    const hData = Array.from(activeHumanShips.values()).map(h => ({
      id: h.id,
      position: [h.position.x, h.position.y, h.position.z],
      radius: h.radius
    }));

    // Record which debris IDs are in this batch so the response handler
    // knows not to evict items spawned after this snapshot was taken.
    lastSentDebrisIds = new Set(debrisList.map(d => d.id));
    // Use live Three.js mesh position -- not the stale cached snapshot array
    const dData = debrisList.map(d => ({
      id: d.id,
      position: [d.mesh.position.x, d.mesh.position.y, d.mesh.position.z],
      velocity: d.velocity,
      partType: d.partType,
      value: d.value
    }));

    physicsWorker.postMessage({
      type: "simulate_physics",
      data: {
        projectiles: pData,
        aliens: aData,
        humans: hData,
        debris: dData,
        dt: dt,
        fleetZ: fleetZ
      }
    });
  }

  // 3. Human Firing Logic
  activeHumanShips.forEach(h => {
    h.weaponCooldown -= dt;
    if (h.weaponCooldown <= 0.0 && activeAliens.size > 0) {
      // Fire random weapon type (index 0 to 4)
      const weaponType = Math.floor(Math.random() * 5);
      fireHumanWeapon(h, weaponType);
      h.weaponCooldown = 0.5 + Math.random() * 0.8; // Random firing interval
    }
  });

  // 4. Update local particle explosions
  explosions = explosions.filter(exp => {
    if (exp.type === "warp") {
      const s = exp.mesh.scale.x + exp.scaleSpeed * dt;
      exp.mesh.scale.set(s, s, s);
      exp.mesh.material.opacity -= 1.8 * dt;
      if (exp.mesh.material.opacity <= 0) {
        scene.remove(exp.mesh);
        return false;
      }
    } 
    else if (exp.type === "ring") {
      const s = exp.mesh.scale.x + exp.scaleSpeed * dt;
      exp.mesh.scale.set(s, s, s);
      exp.mesh.material.opacity -= 1.4 * dt;
      if (exp.mesh.material.opacity <= 0) {
        scene.remove(exp.mesh);
        return false;
      }
    } 
    else if (exp.type === "spark") {
      exp.life -= dt;
      if (exp.life <= 0) {
        scene.remove(exp.mesh);
        return false;
      }
      // Update points position array locally
      const posAttr = exp.mesh.geometry.attributes.position;
      for (let i = 0; i < exp.velocities.length; i++) {
        posAttr.array[i*3] += exp.velocities[i][0] * dt;
        posAttr.array[i*3+1] += exp.velocities[i][1] * dt;
        posAttr.array[i*3+2] += exp.velocities[i][2] * dt;
      }
      posAttr.needsUpdate = true;
      exp.mesh.material.opacity = exp.life / 0.4;
    }
    return true;
  });

  // 5. Update Cinematic Camera
  updateCamera(dt, timestamp);

  // Render Scene
  renderer.render(scene, camera);
}

function updateCamera(dt, timestamp) {
  cameraTimer -= dt;
  if (cameraTimer <= 0) {
    // Switch camera perspective automatically
    const modes = ["chase", "flyby", "side", "combat"];
    cameraMode = modes[Math.floor(Math.random() * modes.length)];
    cameraTimer = 8.0 + Math.random() * 6.0; // Stay in mode for 8-14 seconds
  }

  // Get average position of human fleet
  const fleetPos = new THREE.Vector3();
  if (activeHumanShips.size > 0) {
    activeHumanShips.forEach(h => fleetPos.add(h.position));
    fleetPos.divideScalar(activeHumanShips.size);
  }

  // Set camera target positions based on mode
  if (cameraMode === "chase") {
    // Behind fleet, looking forward (Closer to show details)
    cameraTargetOffset.set(0, 3.5, 14.0);
    cameraLookAtTarget.copy(fleetPos).add(new THREE.Vector3(0, 0, -20));
    // Roll slightly based on target offset wandering
    cameraCurrentRoll = THREE.MathUtils.lerp(cameraCurrentRoll, Math.sin(timestamp * 0.0005) * 0.2, 0.05);
  } 
  else if (cameraMode === "flyby") {
    // Static in space ahead, fleet flies past (Closer offset)
    cameraTargetOffset.set(8.0, -3.0, -24.0);
    cameraLookAtTarget.copy(fleetPos);
    cameraCurrentRoll = THREE.MathUtils.lerp(cameraCurrentRoll, 0.6, 0.05); // Upside-down tilt
  } 
  else if (cameraMode === "side") {
    // Tracking sweeping view from side (Closer orbiting)
    const orbitAngle = timestamp * 0.0002;
    cameraTargetOffset.set(Math.cos(orbitAngle) * 16.0, 3.5, Math.sin(orbitAngle) * 8.0);
    cameraLookAtTarget.copy(fleetPos);
    cameraCurrentRoll = THREE.MathUtils.lerp(cameraCurrentRoll, -0.1, 0.05);
  } 
  else if (cameraMode === "combat" && activeAliens.size > 0) {
    // Keep a human and alien in view (Closer offset)
    const aliensArr = Array.from(activeAliens.values());
    const firstAlien = aliensArr[0].position;
    cameraTargetOffset.set(-10.0, 5.0, 10.0);
    cameraLookAtTarget.copy(fleetPos).add(firstAlien).multiplyScalar(0.5);
    cameraCurrentRoll = THREE.MathUtils.lerp(cameraCurrentRoll, Math.sin(timestamp * 0.001) * 0.4, 0.05);
  } else {
    // Fallback chase
    cameraTargetOffset.set(0, 3.5, 14.0);
    cameraLookAtTarget.copy(fleetPos).add(new THREE.Vector3(0, 0, -20));
  }

  // Smoothly interpolate camera position and lookAt target
  const destCamPos = new THREE.Vector3().copy(fleetPos).add(cameraTargetOffset);
  camera.position.lerp(destCamPos, 0.05);

  // Build lookAt rotation
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.lookAt(camera.position, cameraLookAtTarget, new THREE.Vector3(0, 1, 0));
  const targetRotation = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
  
  // Apply z-roll orientation
  const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), cameraCurrentRoll);
  targetRotation.multiply(rollQuat);

  camera.quaternion.slerp(targetRotation, 0.05);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Register dynamic floating keyframes in the global stylesheet
const style = document.createElement('style');
style.textContent = `
  @keyframes floatUp {
    0% { transform: translate(-50%, -50%) translateY(0); opacity: 1; }
    100% { transform: translate(-50%, -50%) translateY(-60px); opacity: 0; }
  }
  @keyframes slideIn {
    0% { transform: translateX(-20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

// Expose globally for components.js / script.js integration & debugging
window.initSpaceBackground = initSpaceBackground;
window.debugSpaceScene = () => ({
  scene, camera, fleetGroup, activeHumanShips, activeAliens, debrisList, currentStation,
  nextAlienSpawnTime, nextStationSpawnTime, spaceStationActive, credits, boidsWorkerBusy, physicsWorkerBusy, projectiles
});
