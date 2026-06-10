// Core System - Premium Autonomous Solar System & Quest Simulation
// Visual and telemetry refinements: volumetric solar halos, orbit path lines, moons, engine thruster trails, and AU HUD telemetry.

import { ShipBuilder } from './ship-builder.js';

const THREE = window.THREE;

class SpaceGameCore {
  constructor() {
    this.state = {
      initialized: false,
      running: false,
      loading: false,
      error: null,
      cameraMode: 'chase' // dynamic, chase, top, side
    };
    
    this.systems = new Map();
    this.config = {
      maxShips: 5,
      maxProjectiles: 100,
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

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x05030a, 1);
    renderer.shadowMap.enabled = false;
    
    this.systems.set('renderer', renderer);
  }

  async initializeScene() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05030a, 0.0025);
    
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 800);
    camera.position.set(0, 45, 110);
    
    this.systems.set('scene', scene);
    this.systems.set('camera', camera);
  }

  async initializeSystems() {
    const systems = [
      'SpaceDustSystem',
      'LightingSystem',
      'StarfieldSystem',
      'SolarSystemSystem',
      'ShipSystem',
      'AlienSystem',
      'ProjectileSystem',
      'ExplosionSystem',
      'QuestSystem',
      'InputSystem',
      'UISystem'
    ];

    for (const SystemClass of systems) {
      try {
        const system = await this.createSystem(SystemClass);
        system.core = this; // Dynamically inject core engine reference
        this.systems.set(SystemClass.toLowerCase(), system);
      } catch (error) {
        console.warn(`Failed to initialize ${SystemClass}:`, error);
      }
    }
  }

  async createSystem(systemName) {
    switch (systemName) {
      case 'SpaceDustSystem':
        return new SpaceDustSystem(this.systems.get('scene'));
      case 'LightingSystem':
        return new LightingSystem(this.systems.get('scene'));
      case 'StarfieldSystem':
        return new StarfieldSystem(this.systems.get('scene'));
      case 'SolarSystemSystem':
        return new SolarSystemSystem(this.systems.get('scene'));
      case 'ShipSystem':
        return new ShipSystem(this.systems.get('scene'), this.config.maxShips);
      case 'AlienSystem':
        return new AlienSystem(this.systems.get('scene'));
      case 'ProjectileSystem':
        return new ProjectileSystem(this.systems.get('scene'));
      case 'ExplosionSystem':
        return new ExplosionSystem(this.systems.get('scene'));
      case 'QuestSystem':
        return new QuestSystem(this.systems.get('scene'), this);
      case 'InputSystem':
        return new InputSystem();
      case 'UISystem':
        return new UISystem(this);
      default:
        throw new Error(`Unknown system: ${systemName}`);
    }
  }

  async initializeContent() {
    const shipSystem = this.systems.get('shipsystem');
    if (shipSystem) {
      await shipSystem.spawnFleet();
    }
    const questSystem = this.systems.get('questsystem');
    if (questSystem) {
      questSystem.generateQuest();
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
    this.performance.lastTime = performance.now();
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
    const deltaTime = Math.min((currentTime - this.performance.lastTime) / 1000, 0.1);
    this.performance.lastTime = currentTime;

    this.performance.frameCount++;
    if (this.performance.frameCount % 30 === 0) {
      this.performance.fps = Math.round(1 / deltaTime);
    }

    this.update(deltaTime);
    this.updateCamera(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  render() {
    const renderer = this.systems.get('renderer');
    const scene = this.systems.get('scene');
    const camera = this.systems.get('camera');

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  update(deltaTime) {
    // 5x simulated speedup factor
    const scaledDt = deltaTime * 5.0;

    // Local visual-only updates
    const spaceDustSystem = this.systems.get('spacedustsystem');
    if (spaceDustSystem) spaceDustSystem.update(scaledDt);

    const starfieldSystem = this.systems.get('starfieldsystem');
    if (starfieldSystem) starfieldSystem.update(scaledDt);

    const explosionSystem = this.systems.get('explosionsystem');
    if (explosionSystem) explosionSystem.update(scaledDt);

    // Initialize Worker if not done yet
    if (!this.worker) {
      this.initWorker();
    }

    // Pass calculations to worker if it is ready
    if (this.worker && !this.workerBusy) {
      this.workerBusy = true;

      const shipSystem = this.systems.get('shipsystem');
      const alienSystem = this.systems.get('aliensystem');
      const projSystem = this.systems.get('projectilesystem');
      const solarSystem = this.systems.get('solarsystemsystem');
      const questSystem = this.systems.get('questsystem');

      const shipData = [];
      if (shipSystem) {
        shipSystem.ships.forEach((ship, id) => {
          shipData.push({
            id: id,
            pos: { x: ship.position.x, y: ship.position.y, z: ship.position.z },
            offset: { x: ship.baseOffset.x, y: ship.baseOffset.y, z: ship.baseOffset.z }
          });
        });
      }

      const alienData = [];
      if (alienSystem) {
        alienSystem.aliens.forEach((alien, id) => {
          alienData.push({
            id: id,
            pos: { x: alien.position.x, y: alien.position.y, z: alien.position.z },
            speed: alien.speed,
            health: alien.health,
            isBoss: alien.isBoss || false
          });
        });
      }

      const projData = [];
      if (projSystem) {
        projSystem.projectiles.forEach((proj, idx) => {
          projData.push({
            idx: idx,
            pos: { x: proj.position.x, y: proj.position.y, z: proj.position.z },
            dir: { x: proj.direction.x, y: proj.direction.y, z: proj.direction.z },
            speed: proj.speed,
            faction: proj.faction,
            life: proj.life
          });
        });
      }

      const planetData = [];
      if (solarSystem) {
        solarSystem.planets.forEach((planet, id) => {
          const moons = [];
          planet.moons.forEach((m, mIdx) => {
            moons.push({ id: mIdx, angle: m.angle, speed: m.speed, distance: m.distance });
          });
          planetData.push({
            id: id,
            angle: planet.angle,
            speed: planet.speed,
            moons: moons
          });
        });
      }

      const targetPos = questSystem && questSystem.targetPosition ? { 
        x: questSystem.targetPosition.x, 
        y: questSystem.targetPosition.y, 
        z: questSystem.targetPosition.z 
      } : null;

      this.worker.postMessage({
        type: 'simulate',
        data: {
          deltaTime: scaledDt,
          ships: shipData,
          aliens: alienData,
          projectiles: projData,
          planets: planetData,
          targetPos: targetPos
        }
      });
    }

    // Handle weapons shooting and Quest timer updates
    this.runFiringLogic(scaledDt);

    // Update UI system
    const uiSystem = this.systems.get('uisystem');
    if (uiSystem) uiSystem.update(deltaTime);
  }

  initWorker() {
    const workerCode = `
      self.onmessage = function(e) {
        const { type, data } = e.data;
        if (type === 'simulate') {
          const { deltaTime, ships, aliens, projectiles, planets, targetPos } = data;
          
          const shipUpdates = [];
          const lead = ships.find(s => s.id === 'ship_0');
          if (lead && targetPos) {
            const dx = targetPos.x - lead.pos.x;
            const dy = targetPos.y - lead.pos.y;
            const dz = targetPos.z - lead.pos.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist > 5) {
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;
              lead.pos.x += nx * 32 * deltaTime;
              lead.pos.y += ny * 32 * deltaTime;
              lead.pos.z += nz * 32 * deltaTime;
              lead.dir = { x: nx, y: ny, z: nz };
            }
            shipUpdates.push({ id: lead.id, pos: lead.pos, dir: lead.dir });
            
            ships.forEach(s => {
              if (s.id === 'ship_0') return;
              const tx = lead.pos.x + s.offset.x;
              const ty = lead.pos.y + s.offset.y;
              const tz = lead.pos.z + s.offset.z;
              s.pos.x += (tx - s.pos.x) * 2.5 * deltaTime;
              s.pos.y += (ty - s.pos.y) * 2.5 * deltaTime;
              s.pos.z += (tz - s.pos.z) * 2.5 * deltaTime;
              shipUpdates.push({ id: s.id, pos: s.pos });
            });
          }
          
          const alienUpdates = [];
          aliens.forEach(alien => {
            if (lead) {
              const dx = lead.pos.x - alien.pos.x;
              const dy = lead.pos.y - alien.pos.y;
              const dz = lead.pos.z - alien.pos.z;
              const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;
              alien.pos.x += nx * alien.speed * deltaTime;
              alien.pos.y += ny * alien.speed * deltaTime;
              alien.pos.z += nz * alien.speed * deltaTime;
              alien.dir = { x: nx, y: ny, z: nz };
            } else {
              alien.pos.z += alien.speed * deltaTime;
              alien.dir = { x: 0, y: 0, z: 1 };
            }
            alienUpdates.push({ id: alien.id, pos: alien.pos, dir: alien.dir });
          });
          
          const planetUpdates = [];
          planets.forEach(p => {
            p.angle += p.speed * deltaTime;
            const moons = [];
            p.moons.forEach(m => {
              m.angle += m.speed * deltaTime;
              moons.push({ id: m.id, angle: m.angle });
            });
            planetUpdates.push({ id: p.id, angle: p.angle, moons: moons });
          });
          
          const projUpdates = [];
          const collisions = [];
          projectiles.forEach(proj => {
            proj.pos.x += proj.dir.x * proj.speed * deltaTime;
            proj.pos.y += proj.dir.y * proj.speed * deltaTime;
            proj.pos.z += proj.dir.z * proj.speed * deltaTime;
            proj.life -= deltaTime;
            
            let destroyed = proj.life <= 0;
            if (!destroyed) {
              if (proj.faction === 'human') {
                aliens.forEach(alien => {
                  if (destroyed || alien.health <= 0) return;
                  const dx = proj.pos.x - alien.pos.x;
                  const dy = proj.pos.y - alien.pos.y;
                  const dz = proj.pos.z - alien.pos.z;
                  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                  const hitRadius = alien.isBoss ? 45.0 : 15.0;
                  if (dist < hitRadius) {
                    collisions.push({
                      type: 'alien_hit',
                      alienId: alien.id,
                      pos: { ...proj.pos }
                    });
                    alien.health -= 25;
                    destroyed = true;
                  }
                });
              } else {
                ships.forEach(ship => {
                  if (destroyed) return;
                  const dx = proj.pos.x - ship.pos.x;
                  const dy = proj.pos.y - ship.pos.y;
                  const dz = proj.pos.z - ship.pos.z;
                  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                  if (dist < 10.0) {
                    collisions.push({
                      type: 'human_hit',
                      shipId: ship.id,
                      pos: { ...proj.pos }
                    });
                    destroyed = true;
                  }
                });
              }
            }
            projUpdates.push({
              idx: proj.idx,
              pos: proj.pos,
              life: proj.life,
              destroyed: destroyed
            });
          });
          
          self.postMessage({
            type: 'results',
            ships: shipUpdates,
            aliens: alienUpdates,
            planets: planetUpdates,
            projectiles: projUpdates,
            collisions: collisions
          });
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    this.workerBusy = false;
    
    this.worker.onmessage = (e) => {
      this.workerBusy = false;
      const { type, ships, aliens, planets, projectiles, collisions } = e.data;
      if (type !== 'results') return;
      
      const shipSystem = this.systems.get('shipsystem');
      const alienSystem = this.systems.get('aliensystem');
      const projSystem = this.systems.get('projectilesystem');
      const solarSystem = this.systems.get('solarsystemsystem');
      const explosionSystem = this.systems.get('explosionsystem');
      const questSystem = this.systems.get('questsystem');
      
      // Update ships
      if (shipSystem && ships) {
        ships.forEach(s => {
          const ship = shipSystem.ships.get(s.id);
          if (ship) {
            ship.position.set(s.pos.x, s.pos.y, s.pos.z);
            if (s.dir) {
              const targetRot = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                new THREE.Vector3(s.dir.x, s.dir.y, s.dir.z)
              );
              ship.mesh.quaternion.copy(targetRot);
            } else {
              const lead = shipSystem.ships.get('ship_0');
              if (lead) ship.mesh.quaternion.copy(lead.mesh.quaternion);
            }
            
            // Pulse engine thruster trails
            if (ship.trail) {
              const scale = 0.8 + Math.sin(Date.now() * 0.05 + ship.position.x) * 0.15;
              ship.trail.scale.set(1, 1, scale);
            }
            // Fade shields
            if (ship.shieldFlashTime > 0) {
              ship.shieldFlashTime -= 0.05 * 5.0; // scale shield fade speed too
              ship.shield.material.opacity = Math.max(0, ship.shieldFlashTime);
            }
          }
        });
      }
      
      // Update aliens
      if (alienSystem && aliens) {
        aliens.forEach(a => {
          const alien = alienSystem.aliens.get(a.id);
          if (alien) {
            alien.position.set(a.pos.x, a.pos.y, a.pos.z);
            if (a.dir) {
              const targetRot = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1),
                new THREE.Vector3(a.dir.x, a.dir.y, a.dir.z)
              );
              alien.mesh.quaternion.copy(targetRot);
            }
            // Pulse engine thruster trails
            if (alien.trail) {
              const scale = 0.8 + Math.sin(Date.now() * 0.05 + alien.speed) * 0.15;
              alien.trail.scale.set(1, 1, scale);
            }
          }
        });
      }
      
      // Update planets
      if (solarSystem && planets) {
        // Pulse Sun Halos
        const time = Date.now() * 0.005;
        solarSystem.glowShells.forEach((shell, idx) => {
          const pulse = 1.0 + Math.sin(time * 1.5 + idx) * 0.03;
          shell.scale.setScalar(pulse);
        });

        planets.forEach(p => {
          const planet = solarSystem.planets.get(p.id);
          if (planet) {
            planet.angle = p.angle;
            planet.group.position.set(
              solarSystem.sun.position.x + Math.cos(planet.angle) * planet.distance,
              0,
              solarSystem.sun.position.z + Math.sin(planet.angle) * planet.distance
            );
            planet.mesh.rotation.y += 0.02 * 5.0;
            
            p.moons.forEach(m => {
              const moon = planet.moons[m.id];
              if (moon) {
                moon.angle = m.angle;
                moon.mesh.position.set(
                  Math.cos(moon.angle) * moon.distance,
                  0,
                  Math.sin(moon.angle) * moon.distance
                );
                moon.mesh.rotation.y += 0.04 * 5.0;
              }
            });
          }
        });
      }
      
      // Update projectiles
      if (projSystem && projectiles) {
        projectiles.forEach(p => {
          const proj = projSystem.projectiles[p.idx];
          if (proj) {
            proj.position.set(p.pos.x, p.pos.y, p.pos.z);
            proj.life = p.life;
            if (p.destroyed) {
              proj.life = 0;
            }
          }
        });
        
        for (let i = projSystem.projectiles.length - 1; i >= 0; i--) {
          const proj = projSystem.projectiles[i];
          if (proj.life <= 0) {
            projSystem.removeProjectile(proj, i);
          }
        }
      }
      
      // Handle collisions
      if (collisions) {
        collisions.forEach(col => {
          if (col.type === 'alien_hit') {
            const alien = alienSystem ? alienSystem.aliens.get(col.alienId) : null;
            if (alien) {
              if (explosionSystem) explosionSystem.createExplosion(new THREE.Vector3(col.pos.x, col.pos.y, col.pos.z), 0x39ff14);
              alien.health -= 25;
              if (alienSystem) alienSystem.flashAlien(alien);
              if (alien.health <= 0) {
                if (explosionSystem) explosionSystem.createExplosion(alien.position, 0xff0055, true);
                if (alienSystem) alienSystem.destroyAlien(alien, col.alienId);
                if (questSystem) questSystem.registerEnemyKill();
              }
            }
          } else if (col.type === 'human_hit') {
            const ship = shipSystem ? shipSystem.ships.get(col.shipId) : null;
            if (ship) {
              if (explosionSystem) explosionSystem.createExplosion(new THREE.Vector3(col.pos.x, col.pos.y, col.pos.z), 0xff3300);
              if (shipSystem) shipSystem.flashShield(ship);
            }
          }
        });
      }
    };
  }

  runFiringLogic(deltaTime) {
    const shipSystem = this.systems.get('shipsystem');
    const alienSystem = this.systems.get('aliensystem');
    const projSystem = this.systems.get('projectilesystem');
    const questSystem = this.systems.get('questsystem');

    if (!shipSystem || !alienSystem || !projSystem || !questSystem) return;

    const leadShip = shipSystem.getLeadShip();
    if (!leadShip) return;

    // Autopilot ships shooting raiders
    shipSystem.ships.forEach((ship, id) => {
      if (!ship.lastShot) ship.lastShot = 0;
      const nextShotDelay = (1200 + Math.random() * 1000) / 5.0;
      if (Date.now() - ship.lastShot > nextShotDelay) {
        const target = alienSystem.getNearestAlien(ship.position);
        if (target && ship.position.distanceTo(target.position) < 250) {
          projSystem.fire(ship.position, target.position, 'human');
          ship.lastShot = Date.now();
        }
      }
    });

    // Alien firing logic
    alienSystem.aliens.forEach((alien, id) => {
      if (!alien.lastShot) alien.lastShot = 0;
      const nextShotDelay = (1800 + Math.random() * 1500) / 5.0;
      if (Date.now() - alien.lastShot > nextShotDelay) {
        const targetShip = shipSystem.getRandomShip();
        if (targetShip) {
          if (alien.isBoss) {
            // Boss shoots 3 spread projectiles
            projSystem.fire(alien.position, targetShip.position, 'alien');
            const leftOffset = new THREE.Vector3(-15, 0, -10).applyQuaternion(alien.mesh.quaternion);
            const rightOffset = new THREE.Vector3(15, 0, -10).applyQuaternion(alien.mesh.quaternion);
            projSystem.fire(new THREE.Vector3().copy(alien.position).add(leftOffset), targetShip.position, 'alien');
            projSystem.fire(new THREE.Vector3().copy(alien.position).add(rightOffset), targetShip.position, 'alien');
          } else {
            projSystem.fire(alien.position, targetShip.position, 'alien');
          }
          alien.lastShot = Date.now();
        }
      }
    });

    if (questSystem) questSystem.update(deltaTime);
  }

  updateCamera(deltaTime) {
    const camera = this.systems.get('camera');
    const shipSystem = this.systems.get('shipsystem');
    if (!camera || !shipSystem) return;

    const leadShip = shipSystem.getLeadShip();
    if (!leadShip) return;

    const targetPos = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();

    if (this.state.cameraMode === 'chase') {
      // Rotate chase offset relative to the ship's actual heading
      const backOffset = new THREE.Vector3(0, 3.5, 16);
      backOffset.applyQuaternion(leadShip.quaternion);
      targetPos.copy(leadShip.position).add(backOffset);

      const lookOffset = new THREE.Vector3(0, 0.8, -25);
      lookOffset.applyQuaternion(leadShip.quaternion);
      lookTarget.copy(leadShip.position).add(lookOffset);

      // Speed-based FOV effect
      const targetFOV = 64; // Slightly wider for chase mode speed feeling
      if (camera.fov !== targetFOV) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, deltaTime * 2.0);
        camera.updateProjectionMatrix();
      }
    } else if (this.state.cameraMode === 'top') {
      targetPos.copy(leadShip.position).add(new THREE.Vector3(0, 100, -10));
      lookTarget.copy(leadShip.position);
      if (camera.fov !== 60) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 60, deltaTime * 2.0);
        camera.updateProjectionMatrix();
      }
    } else if (this.state.cameraMode === 'side') {
      targetPos.copy(leadShip.position).add(new THREE.Vector3(70, 8, -10));
      lookTarget.copy(leadShip.position);
      if (camera.fov !== 60) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 60, deltaTime * 2.0);
        camera.updateProjectionMatrix();
      }
    } else {
      const time = Date.now() * 0.00015;
      const radius = 150;
      targetPos.set(Math.sin(time) * radius, 65, Math.cos(time) * radius - 50);
      lookTarget.copy(leadShip.position);
      if (camera.fov !== 60) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 60, deltaTime * 2.0);
        camera.updateProjectionMatrix();
      }
    }

    camera.position.lerp(targetPos, deltaTime * 2.5);
    
    const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    const lerpedLook = currentLook.lerp(lookTarget, deltaTime * 2.5);
    camera.lookAt(lerpedLook);
  }

  simulateCombat(deltaTime) {
    const shipSystem = this.systems.get('shipsystem');
    const alienSystem = this.systems.get('aliensystem');
    const projSystem = this.systems.get('projectilesystem');
    const explosionSystem = this.systems.get('explosionsystem');
    const questSystem = this.systems.get('questsystem');

    if (!shipSystem || !alienSystem || !projSystem || !explosionSystem || !questSystem) return;

    // Autopilot ships shooting raiders
    shipSystem.ships.forEach((ship, id) => {
      if (!ship.lastShot) ship.lastShot = 0;
      if (Date.now() - ship.lastShot > 1200 + Math.random() * 1000) {
        const target = alienSystem.getNearestAlien(ship.position);
        if (target && ship.position.distanceTo(target.position) < 80) {
          projSystem.fire(ship.position, target.position, 'human');
          ship.lastShot = Date.now();
        }
      }
    });

    // Alien firing logic
    alienSystem.aliens.forEach((alien, id) => {
      if (!alien.lastShot) alien.lastShot = 0;
      if (Date.now() - alien.lastShot > 1800 + Math.random() * 1500) {
        const targetShip = shipSystem.getRandomShip();
        if (targetShip) {
          projSystem.fire(alien.position, targetShip.position, 'alien');
          alien.lastShot = Date.now();
        }
      }
    });

    // Check collisions
    projSystem.projectiles.forEach((proj, idx) => {
      if (proj.faction === 'human') {
        alienSystem.aliens.forEach((alien, aId) => {
          if (proj.position.distanceTo(alien.position) < 5.0) {
            explosionSystem.createExplosion(proj.position, 0x39ff14);
            projSystem.removeProjectile(proj, idx);
            
            alien.health -= 25;
            alienSystem.flashAlien(alien);

            if (alien.health <= 0) {
              explosionSystem.createExplosion(alien.position, 0xff0055, true);
              alienSystem.destroyAlien(alien, aId);
              questSystem.registerEnemyKill();
            }
          }
        });
      } else {
        shipSystem.ships.forEach((ship, sId) => {
          if (proj.position.distanceTo(ship.position) < 4.0) {
            explosionSystem.createExplosion(proj.position, 0xff3300);
            projSystem.removeProjectile(proj, idx);
            shipSystem.flashShield(ship);
          }
        });
      }
    });
  }

  fallback() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = '#05030a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const [name, system] of this.systems) {
      if (system && typeof system.destroy === 'function') {
        try {
          system.destroy();
        } catch (error) {
          console.error(`Error destroying ${name}:`, error);
        }
      }
    }
    const renderer = this.systems.get('renderer');
    if (renderer) {
      renderer.dispose();
    }
    this.systems.clear();
    this.state.initialized = false;
  }
}


// Space Dust System (Dynamic Speed Particles)
class SpaceDustSystem {
  constructor(scene) {
    this.scene = scene;
    this.dust = null;
    this.particleCount = 600;
    this.initialize();
  }

  initialize() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < this.particleCount; i++) {
      positions.push(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 150,
        (Math.random() - 0.5) * 600
      );

      const color = new THREE.Color();
      if (Math.random() < 0.5) {
        color.setHSL(0.5, 0.9, 0.85); // Cyan
      } else {
        color.setHSL(0.8, 0.9, 0.85); // Purple
      }
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.dust = new THREE.Points(geometry, material);
    this.scene.add(this.dust);
  }

  update(deltaTime) {
    if (!this.dust) return;

    const positions = this.dust.geometry.attributes.position.array;
    const core = this.core;
    const shipSystem = core ? core.getSystem('shipsystem') : null;
    const leadShip = shipSystem ? shipSystem.getLeadShip() : null;

    let speedVec = new THREE.Vector3(0, 0, 1);
    if (leadShip) {
      const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(leadShip.quaternion);
      speedVec.copy(forwardVec).multiplyScalar(-1);
    }

    const speed = 120;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += speedVec.x * speed * deltaTime;
      positions[i + 1] += speedVec.y * speed * deltaTime;
      positions[i + 2] += speedVec.z * speed * deltaTime;

      const pz = positions[i + 2];
      const relativeZ = leadShip ? pz - leadShip.position.z : pz;
      
      if (relativeZ > 300) {
        positions[i] = leadShip ? leadShip.position.x + (Math.random() - 0.5) * 400 : (Math.random() - 0.5) * 400;
        positions[i + 1] = leadShip ? leadShip.position.y + (Math.random() - 0.5) * 150 : (Math.random() - 0.5) * 150;
        positions[i + 2] = leadShip ? leadShip.position.z - 300 : -300;
      } else if (relativeZ < -300) {
        positions[i] = leadShip ? leadShip.position.x + (Math.random() - 0.5) * 400 : (Math.random() - 0.5) * 400;
        positions[i + 1] = leadShip ? leadShip.position.y + (Math.random() - 0.5) * 150 : (Math.random() - 0.5) * 150;
        positions[i + 2] = leadShip ? leadShip.position.z + 300 : 300;
      }
    }

    this.dust.geometry.attributes.position.needsUpdate = true;
  }

  destroy() {
    if (this.dust) {
      this.scene.remove(this.dust);
      this.dust.geometry.dispose();
      this.dust.material.dispose();
      this.dust = null;
    }
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
    const ambientLight = new THREE.AmbientLight(0x130a24, 1.2);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffa500, 1.5);
    sunLight.position.set(0, 100, -50);
    this.scene.add(sunLight);
    this.lights.push(sunLight);
  }

  update(deltaTime) {}

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
    this.nebulae = [];
    this.initialize();
  }

  initialize() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < 3000; i++) {
      positions.push(
        (Math.random() - 0.5) * 1200,
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 1200
      );

      const color = new THREE.Color();
      const choice = Math.random();
      if (choice < 0.35) color.setHSL(0.6, 0.8, 0.85); // Light blue
      else if (choice < 0.65) color.setHSL(0.85, 0.8, 0.75); // Magenta
      else color.setHSL(0.1, 0.2, 0.95); // Warm white
      
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);

    const nebulaGeom = new THREE.PlaneGeometry(350, 350);
    const nebulaColors = [0x5f27cd, 0x00d2d3, 0xff9f43];
    for (let i = 0; i < 3; i++) {
      const nebulaMat = new THREE.MeshBasicMaterial({
        color: nebulaColors[i],
        transparent: true,
        opacity: 0.045 + (i * 0.015),
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(nebulaGeom, nebulaMat);
      mesh.position.set((i - 1) * 80, (i - 1) * 30, -250 - i * 60);
      mesh.rotation.z = i * Math.PI / 4;
      this.scene.add(mesh);
      this.nebulae.push(mesh);
    }
  }

  update(deltaTime) {
    if (this.stars) this.stars.rotation.y += deltaTime * 0.005;
    this.nebulae.forEach((neb, idx) => {
      neb.rotation.z += deltaTime * (0.008 * (idx + 1));
    });
  }

  destroy() {
    if (this.stars) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      this.stars.material.dispose();
    }
    this.nebulae.forEach(neb => {
      this.scene.remove(neb);
      neb.geometry.dispose();
      neb.material.dispose();
    });
    this.nebulae = [];
  }
}

// Procedural Solar System (Sun + Glow Halos + Orbit Lines + 4 Planets + Moons)
class SolarSystemSystem {
  constructor(scene) {
    this.scene = scene;
    this.planets = new Map();
    this.solarGroup = new THREE.Group();
    this.scene.add(this.solarGroup);
    this.glowShells = [];
    this.moons = [];
    this.initialize();
  }

  initialize() {
    // 1. Central Sun
    const sunGeom = new THREE.SphereGeometry(40, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.sun = new THREE.Mesh(sunGeom, sunMat);
    this.sun.position.set(0, 0, -50);
    this.solarGroup.add(this.sun);

    // Volumetric glow shells for sun
    const glowConfigs = [
      { radius: 50.0, color: 0xff7700, opacity: 0.18 },
      { radius: 68.0, color: 0xff3300, opacity: 0.09 }
    ];
    glowConfigs.forEach(gc => {
      const glowGeom = new THREE.SphereGeometry(gc.radius, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: gc.color,
        transparent: true,
        opacity: gc.opacity,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const shell = new THREE.Mesh(glowGeom, glowMat);
      shell.position.copy(this.sun.position);
      this.solarGroup.add(shell);
      this.glowShells.push(shell);
    });

    this.sunLight = new THREE.PointLight(0xffddaa, 3.5, 2500);
    this.sunLight.position.copy(this.sun.position);
    this.solarGroup.add(this.sunLight);

    // 2. Planets
    const planetConfigs = [
      { id: 'planet_1', name: 'Kepler-42', radius: 14, distance: 220, speed: 0.08, color: 0x0abde3,
        moons: [{ radius: 2.2, distance: 28, speed: 1.0, color: 0x95afc0 }]
      },
      { id: 'planet_2', name: 'Vulcan', radius: 20, distance: 390, speed: 0.05, color: 0xee5253, moons: [] },
      { id: 'planet_3', name: 'Poseidon', radius: 32, distance: 560, speed: 0.03, color: 0x5f27cd, hasRings: true,
        moons: [
          { radius: 3.5, distance: 48, speed: 0.8, color: 0xdf9ffb },
          { radius: 2.0, distance: 60, speed: 0.5, color: 0x7ed6df }
        ]
      },
      { id: 'planet_4', name: 'Cimmeria', radius: 18, distance: 750, speed: 0.015, color: 0xffffff, moons: [] }
    ];

    planetConfigs.forEach(config => {
      const planetGroup = new THREE.Group();
      
      const geom = new THREE.SphereGeometry(config.radius, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: config.color,
        metalness: 0.2,
        roughness: 0.8,
        flatShading: true
      });
      const planetMesh = new THREE.Mesh(geom, mat);
      planetGroup.add(planetMesh);

      // Orbital Path Ring (Tactical map look)
      const orbitGeom = new THREE.TorusGeometry(config.distance, 0.06, 3, 64);
      const orbitMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.09
      });
      const orbitLine = new THREE.Mesh(orbitGeom, orbitMat);
      orbitLine.position.copy(this.sun.position);
      orbitLine.rotation.x = Math.PI / 2;
      this.solarGroup.add(orbitLine);

      if (config.hasRings) {
        const ringGeom = new THREE.TorusGeometry(config.radius * 1.8, 0.4, 4, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffbe76,
          transparent: true,
          opacity: 0.5,
          wireframe: true
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2.5;
        planetGroup.add(ring);
      }

      // Spawn Moons
      const moonDataList = [];
      config.moons.forEach(mConfig => {
        const mGeom = new THREE.SphereGeometry(mConfig.radius, 8, 8);
        const mMat = new THREE.MeshStandardMaterial({
          color: mConfig.color,
          roughness: 0.9,
          flatShading: true
        });
        const mMesh = new THREE.Mesh(mGeom, mMat);
        
        const mAngle = Math.random() * Math.PI * 2;
        mMesh.position.set(
          Math.cos(mAngle) * mConfig.distance,
          0,
          Math.sin(mAngle) * mConfig.distance
        );
        planetGroup.add(mMesh);

        moonDataList.push({
          mesh: mMesh,
          distance: mConfig.distance,
          speed: mConfig.speed,
          angle: mAngle
        });
      });

      const angle = Math.random() * Math.PI * 2;
      planetGroup.position.set(
        this.sun.position.x + Math.cos(angle) * config.distance,
        0,
        this.sun.position.z + Math.sin(angle) * config.distance
      );

      this.solarGroup.add(planetGroup);
      this.planets.set(config.id, {
        group: planetGroup,
        mesh: planetMesh,
        name: config.name,
        distance: config.distance,
        speed: config.speed,
        angle: angle,
        moons: moonDataList
      });
    });
  }

  update(deltaTime) {
    // Pulse Sun Halos
    const time = Date.now() * 0.001;
    this.glowShells.forEach((shell, idx) => {
      const pulse = 1.0 + Math.sin(time * 1.5 + idx) * 0.03;
      shell.scale.setScalar(pulse);
    });

    this.planets.forEach(planet => {
      planet.angle += planet.speed * deltaTime;
      planet.group.position.set(
        this.sun.position.x + Math.cos(planet.angle) * planet.distance,
        0,
        this.sun.position.z + Math.sin(planet.angle) * planet.distance
      );
      planet.mesh.rotation.y += deltaTime * 0.4;

      // Update Moons
      planet.moons.forEach(moon => {
        moon.angle += moon.speed * deltaTime;
        moon.mesh.position.set(
          Math.cos(moon.angle) * moon.distance,
          0,
          Math.sin(moon.angle) * moon.distance
        );
        moon.mesh.rotation.y += deltaTime * 0.8;
      });
    });
  }

  destroy() {
    this.scene.remove(this.solarGroup);
    this.planets.clear();
    this.glowShells = [];
  }
}

// Ship System (Autonomous with Exhaust Trails)
class ShipSystem {
  constructor(scene, maxShips) {
    this.scene = scene;
    this.maxShips = maxShips;
    this.ships = new Map();
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  async spawnFleet() {
    const offsets = [
      [0, 0, 0],
      [-10, 1, 6],
      [10, 1, 6],
      [-18, -1, 12],
      [18, -1, 12]
    ];

    for (let i = 0; i < Math.min(offsets.length, this.maxShips); i++) {
      const id = `ship_${i}`;
      const ship = ShipBuilder.buildShip('human', 0.15 + i * 0.5);
      ship.position.set(offsets[i][0], offsets[i][1], offsets[i][2]);
      this.group.add(ship);

      // Shield mesh
      const shieldGeom = new THREE.SphereGeometry(3.5, 12, 12);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        wireframe: true,
        transparent: true,
        opacity: 0
      });
      const shield = new THREE.Mesh(shieldGeom, shieldMat);
      ship.add(shield);

      // Engine Thruster trail mesh
      const trailGeom = new THREE.ConeGeometry(0.4, 2.5, 5);
      trailGeom.rotateX(Math.PI / 2);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.8
      });
      const trail = new THREE.Mesh(trailGeom, trailMat);
      trail.position.set(0, 0, 3.2); // position behind engines
      ship.add(trail);

      this.ships.set(id, {
        mesh: ship,
        shield: shield,
        trail: trail,
        position: ship.position,
        baseOffset: new THREE.Vector3(...offsets[i]),
        shieldFlashTime: 0,
        lastShot: 0
      });
    }
  }

  getLeadShip() {
    const lead = this.ships.get('ship_0');
    return lead ? lead.mesh : null;
  }

  getRandomShip() {
    const arr = Array.from(this.ships.values());
    if (arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  flashShield(shipData) {
    shipData.shieldFlashTime = 1.0;
  }

  update(deltaTime) {
    const core = this.core;
    const questSystem = core ? core.getSystem('questsystem') : null;
    const lead = this.ships.get('ship_0');

    if (lead && questSystem && questSystem.targetPosition) {
      const target = questSystem.targetPosition;
      const dir = new THREE.Vector3().copy(target).sub(lead.position);
      const dist = dir.length();

      if (dist > 5) {
        dir.normalize();
        lead.position.addScaledVector(dir, 32 * deltaTime);
        
        const targetRot = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          dir
        );
        lead.mesh.quaternion.slerp(targetRot, deltaTime * 3);
      } else {
        lead.mesh.rotation.y += deltaTime * 0.2;
      }
    }

    if (lead) {
      this.ships.forEach((ship, id) => {
        if (id === 'ship_0') return;
        const targetPos = new THREE.Vector3().copy(lead.position).add(ship.baseOffset);
        ship.position.lerp(targetPos, deltaTime * 2.5);
        ship.mesh.quaternion.copy(lead.mesh.quaternion);
      });
    }

    // Pulse engine thruster trails
    const time = Date.now() * 0.05;
    this.ships.forEach(ship => {
      // Scales trail to simulate thruster exhaust vibrations
      const scale = 0.85 + Math.sin(time) * 0.15 + Math.random() * 0.1;
      ship.trail.scale.set(1, 1, scale);
      
      // Update shields
      if (ship.shieldFlashTime > 0) {
        ship.shieldFlashTime -= deltaTime * 2.5;
        ship.shield.material.opacity = Math.max(ship.shieldFlashTime * 0.3, 0);
      } else {
        ship.shield.material.opacity = 0;
      }
    });
  }

  destroy() {
    this.ships.forEach(ship => this.group.remove(ship.mesh));
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

  async spawnWave(centerPos = new THREE.Vector3(0, 0, -80)) {
    this.aliens.forEach(alien => this.group.remove(alien.mesh));
    this.aliens.clear();

    for (let i = 0; i < 3; i++) {
      const id = `alien_${Date.now()}_${i}`;
      const alienMesh = ShipBuilder.buildShip('alien', Math.random());
      
      const spawnPos = new THREE.Vector3().copy(centerPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 40 - 50
      ));
      alienMesh.position.copy(spawnPos);
      this.group.add(alienMesh);

      // Add warning red thruster trail
      const trailGeom = new THREE.ConeGeometry(0.3, 2.0, 5);
      trailGeom.rotateX(Math.PI / 2);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.8
      });
      const trail = new THREE.Mesh(trailGeom, trailMat);
      trail.position.set(0, 0, 2.8);
      alienMesh.add(trail);

      this.aliens.set(id, {
        mesh: alienMesh,
        trail: trail,
        position: alienMesh.position,
        speed: 10 + Math.random() * 6,
        health: 60,
        maxHealth: 60,
        lastShot: 0
      });
    }
  }

  async spawnBoss(centerPos = new THREE.Vector3(0, 0, -80)) {
    this.aliens.forEach(alien => this.group.remove(alien.mesh));
    this.aliens.clear();

    const id = 'alien_mothership';
    const alienMesh = new THREE.Group();
    
    const bodyGeom = new THREE.CylinderGeometry(15, 15, 4, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x18181a,
      metalness: 0.9,
      roughness: 0.2,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    alienMesh.add(body);

    const domeGeom = new THREE.SphereGeometry(8, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.y = 2.1;
    dome.rotation.x = -Math.PI / 2;
    alienMesh.add(dome);

    const wingGeom = new THREE.BoxGeometry(32, 1, 8);
    const wing = new THREE.Mesh(wingGeom, bodyMat);
    alienMesh.add(wing);

    const trailGeom = new THREE.ConeGeometry(2.0, 10.0, 6);
    trailGeom.rotateX(Math.PI / 2);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.7
    });
    const trail = new THREE.Mesh(trailGeom, trailMat);
    trail.position.set(0, 0, 7);
    alienMesh.add(trail);

    const spawnPos = new THREE.Vector3().copy(centerPos).add(new THREE.Vector3(0, 0, -120));
    alienMesh.position.copy(spawnPos);
    this.group.add(alienMesh);

    this.aliens.set(id, {
      mesh: alienMesh,
      trail: trail,
      position: alienMesh.position,
      speed: 6,
      health: 500,
      maxHealth: 500,
      lastShot: 0,
      isBoss: true
    });
  }

  getNearestAlien(pos) {
    let nearest = null;
    let minDist = Infinity;
    this.aliens.forEach(alien => {
      const dist = pos.distanceTo(alien.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = alien;
      }
    });
    return nearest;
  }

  flashAlien(alien) {
    alien.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        const origColor = child.material.color.getHex();
        child.material.color.setHex(0xffffff);
        setTimeout(() => {
          if (child.material) child.material.color.setHex(origColor);
        }, 100);
      }
    });
  }

  destroyAlien(alien, id) {
    this.group.remove(alien.mesh);
    this.aliens.delete(id);
  }

  update(deltaTime) {
    const core = this.core;
    const shipSystem = core ? core.getSystem('shipsystem') : null;
    const target = shipSystem ? shipSystem.getLeadShip() : null;

    this.aliens.forEach((alien, id) => {
      // Pulse trail
      const scale = 0.8 + Math.sin(Date.now() * 0.05 + alien.speed) * 0.15;
      alien.trail.scale.set(1, 1, scale);

      if (target) {
        const dir = new THREE.Vector3().copy(target.position).sub(alien.position).normalize();
        alien.position.addScaledVector(dir, alien.speed * deltaTime);

        const targetRot = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          dir
        );
        alien.mesh.quaternion.slerp(targetRot, deltaTime * 2);
      } else {
        alien.position.z += alien.speed * deltaTime;
      }
    });
  }

  destroy() {
    this.aliens.forEach(alien => this.group.remove(alien.mesh));
    this.scene.remove(this.group);
    this.aliens.clear();
  }
}

// Projectile System
class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  fire(origin, target, faction) {
    const dir = new THREE.Vector3().copy(target).sub(origin).normalize();
    const geom = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 5);
    geom.rotateX(Math.PI / 2);
    
    const color = faction === 'human' ? 0x00f2fe : 0xff3300;
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geom, mat);
    
    mesh.position.copy(origin);
    mesh.lookAt(new THREE.Vector3().copy(origin).add(dir));
    this.group.add(mesh);

    this.projectiles.push({
      mesh: mesh,
      position: mesh.position,
      direction: dir,
      speed: 130,
      faction: faction,
      life: 2.0
    });
  }

  removeProjectile(proj, idx) {
    this.group.remove(proj.mesh);
    proj.mesh.geometry.dispose();
    proj.mesh.material.dispose();
    this.projectiles.splice(idx, 1);
  }

  update(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.position.addScaledVector(proj.direction, proj.speed * deltaTime);
      proj.life -= deltaTime;

      if (proj.life <= 0) {
        this.removeProjectile(proj, i);
      }
    }
  }

  destroy() {
    this.projectiles.forEach(proj => {
      this.group.remove(proj.mesh);
      proj.mesh.geometry.dispose();
      proj.mesh.material.dispose();
    });
    this.scene.remove(this.group);
    this.projectiles = [];
  }
}

// Explosion System
class ExplosionSystem {
  constructor(scene) {
    this.scene = scene;
    this.explosions = [];
  }

  createExplosion(pos, colorHex, large = false) {
    const count = large ? 50 : 16;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI;
      const force = large ? (6 + Math.random() * 20) : (4 + Math.random() * 8);

      velocities.push(new THREE.Vector3(
        Math.cos(angle1) * Math.sin(angle2) * force,
        Math.sin(angle1) * Math.sin(angle2) * force,
        Math.cos(angle2) * force
      ));
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: large ? 0.7 : 0.35,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);

    let shockwave = null;
    if (large) {
      const ringGeom = new THREE.RingGeometry(0.1, 1.2, 12);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      shockwave = new THREE.Mesh(ringGeom, ringMat);
      shockwave.position.copy(pos);
      shockwave.rotation.x = Math.PI / 2;
      this.scene.add(shockwave);
    }

    this.explosions.push({
      points: points,
      velocities: velocities,
      positions: positions,
      shockwave: shockwave,
      life: large ? 0.7 : 0.4,
      maxLife: large ? 0.7 : 0.4
    });
  }

  update(deltaTime) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.life -= deltaTime;

      if (exp.life <= 0) {
        this.scene.remove(exp.points);
        exp.points.geometry.dispose();
        exp.points.material.dispose();
        if (exp.shockwave) {
          this.scene.remove(exp.shockwave);
          exp.shockwave.geometry.dispose();
          exp.shockwave.material.dispose();
        }
        this.explosions.splice(i, 1);
        continue;
      }

      const posArr = exp.positions;
      for (let j = 0; j < exp.velocities.length; j++) {
        const vel = exp.velocities[j];
        posArr[j * 3] += vel.x * deltaTime;
        posArr[j * 3 + 1] += vel.y * deltaTime;
        posArr[j * 3 + 2] += vel.z * deltaTime;
      }
      exp.points.geometry.attributes.position.needsUpdate = true;
      exp.points.material.opacity = exp.life / exp.maxLife;

      if (exp.shockwave) {
        const scale = 1 + (1 - exp.life / exp.maxLife) * 12;
        exp.shockwave.scale.set(scale, scale, 1);
        exp.shockwave.material.opacity = exp.life / exp.maxLife;
      }
    }
  }

  destroy() {
    this.explosions.forEach(exp => {
      this.scene.remove(exp.points);
      if (exp.shockwave) this.scene.remove(exp.shockwave);
    });
    this.explosions = [];
  }
}

// Quest System
class QuestSystem {
  constructor(scene, core) {
    this.scene = scene;
    this.core = core;
    this.activeQuest = null;
    this.questHistory = [];
    this.targetPosition = new THREE.Vector3(0, 0, -40);
    this.questProgress = 0;
    this.questTimer = 0;
    this.enemyKills = 0;
    this.anomalyMesh = null;
  }

  generateQuest() {
    const solarSystem = this.core ? this.core.getSystem('solarsystemsystem') : null;
    if (!solarSystem) return;

    const planetIds = Array.from(solarSystem.planets.keys());
    const targetPlanetId = planetIds[Math.floor(Math.random() * planetIds.length)];
    const planet = solarSystem.planets.get(targetPlanetId);

    const questTypes = [
      {
        type: 'PATROL',
        title: `PATROL ${planet.name.toUpperCase()}`,
        desc: `Perform high-orbit security scans around world ${planet.name}.`,
        duration: 12
      },
      {
        type: 'DEFEND',
        title: `DEFEND COLONY: ${planet.name.toUpperCase()}`,
        desc: `Intercept incoming hostile pirate raiding fleets targeting ${planet.name}.`,
        duration: 20
      },
      {
        type: 'SCAN',
        title: `SCAN NEBULA ANOMALY`,
        desc: `Deploy sensor vectors to investigate spatial energy signatures.`,
        duration: 10
      },
      {
        type: 'BOSS',
        title: `DEFEAT ALIEN MOTHERSHIP`,
        desc: `A massive spatial distortion detected! Intercept and destroy the Alien Mothership.`,
        duration: 35
      }
    ];

    const chosen = questTypes[Math.floor(Math.random() * questTypes.length)];
    this.activeQuest = {
      type: chosen.type,
      title: chosen.title,
      description: chosen.desc,
      targetPlanetId: targetPlanetId,
      duration: chosen.duration,
      planetName: planet.name
    };

    this.questProgress = 0;
    this.questTimer = 0;
    this.enemyKills = 0;

    if (chosen.type === 'SCAN') {
      this.targetPosition.set(
        (Math.random() - 0.5) * 500,
        (Math.random() - 0.5) * 40,
        -300 - Math.random() * 300
      );
      this.createAnomalyVisual(this.targetPosition);
    } else {
      this.targetPosition.copy(planet.group.position);
    }

    if (chosen.type === 'DEFEND') {
      const alienSys = this.core.getSystem('aliensystem');
      if (alienSys) {
        alienSys.spawnWave(planet.group.position);
      }
    }

    if (chosen.type === 'BOSS') {
      const alienSys = this.core.getSystem('aliensystem');
      if (alienSys) {
        alienSys.spawnBoss(planet.group.position);
      }
    }

    console.log(`NEW QUEST INITIATED: ${chosen.title}`);
  }

  createAnomalyVisual(pos) {
    this.cleanupAnomaly();

    const geom = new THREE.SphereGeometry(3.0, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xda70d6,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    this.anomalyMesh = new THREE.Mesh(geom, mat);
    this.anomalyMesh.position.copy(pos);
    this.scene.add(this.anomalyMesh);
  }

  cleanupAnomaly() {
    if (this.anomalyMesh) {
      this.scene.remove(this.anomalyMesh);
      this.anomalyMesh.geometry.dispose();
      this.anomalyMesh.material.dispose();
      this.anomalyMesh = null;
    }
  }

  registerEnemyKill() {
    this.enemyKills++;
  }

  update(deltaTime) {
    if (!this.activeQuest) return;

    const solarSystem = this.core ? this.core.getSystem('solarsystemsystem') : null;
    const shipSystem = this.core ? this.core.getSystem('shipsystem') : null;

    if (solarSystem && shipSystem) {
      const lead = shipSystem.getLeadShip();

      if (this.activeQuest.type !== 'SCAN') {
        const planet = solarSystem.planets.get(this.activeQuest.targetPlanetId);
        if (planet) {
          this.targetPosition.copy(planet.group.position);
        }
      }

      if (lead) {
        const distToTarget = lead.position.distanceTo(this.targetPosition);
        
        if (this.activeQuest.type === 'SCAN') {
          if (this.anomalyMesh) {
            this.anomalyMesh.rotation.y += deltaTime * 0.6;
            this.anomalyMesh.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.15);
          }

          if (distToTarget < 15) {
            this.questTimer += deltaTime;
            this.questProgress = Math.min((this.questTimer / this.activeQuest.duration) * 100, 100);

            const projSys = this.core.getSystem('projectilesystem');
            if (projSys && Math.random() < 0.1) {
              projSys.fire(lead.position, this.targetPosition, 'human');
            }
          }
        } else if (this.activeQuest.type === 'PATROL') {
          if (distToTarget < 20) {
            this.questTimer += deltaTime;
            this.questProgress = Math.min((this.questTimer / this.activeQuest.duration) * 100, 100);

            const angle = Date.now() * 0.001;
            const orbitDist = 18;
            this.targetPosition.add(new THREE.Vector3(Math.cos(angle) * orbitDist, 0, Math.sin(angle) * orbitDist));
          }
        } else if (this.activeQuest.type === 'DEFEND') {
          const alienSys = this.core.getSystem('aliensystem');
          if (alienSys) {
            if (alienSys.aliens.size === 0 || this.enemyKills >= 3) {
              this.questProgress = 100;
            } else {
              this.questProgress = (this.enemyKills / 3) * 100;
            }
          }
        } else if (this.activeQuest.type === 'BOSS') {
          const alienSys = this.core.getSystem('aliensystem');
          if (alienSys) {
            const boss = alienSys.aliens.get('alien_mothership');
            if (!boss || boss.health <= 0) {
              this.questProgress = 100;
            } else {
              this.questProgress = ((boss.maxHealth - boss.health) / boss.maxHealth) * 100;
            }
          }
        }

        if (this.questProgress >= 100) {
          this.cleanupAnomaly();
          this.questHistory.unshift(`✓ Completed: ${this.activeQuest.title}`);
          if (this.questHistory.length > 3) this.questHistory.pop();
          
          this.generateQuest();
        }
      }
    }
  }

  destroy() {
    this.cleanupAnomaly();
  }
}

// Input System
class InputSystem {
  constructor() {
    window.addEventListener('resize', () => {
      const core = this.core;
      if (core) {
        const renderer = core.getSystem('renderer');
        const camera = core.getSystem('camera');
        if (renderer && camera) {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        }
      }
    });
  }
  update(deltaTime) {}
  destroy() {}
}

// UI System
class UISystem {
  constructor(core) {
    this.core = core;
    this.elements = new Map();
    this.initialize();
  }

  initialize() {
    this.injectTelemetryCSS();
    this.createFPSCounter();
    this.createResetButton();
    this.createMissionControlFeed();
  }

  injectTelemetryCSS() {
    if (document.getElementById('sim-telemetry-css')) return;
    const style = document.createElement('style');
    style.id = 'sim-telemetry-css';
    style.textContent = `
      #hero {
        position: relative !important;
      }
      .beacon-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
        box-shadow: 0 0 8px currentColor;
        animation: beacon-pulse 1.2s infinite ease-in-out;
      }
      @keyframes beacon-pulse {
        0%, 100% { transform: scale(0.8); opacity: 0.5; }
        50% { transform: scale(1.3); opacity: 1; }
      }
      
      /* Mobile CSS Overrides */
      @media (max-width: 768px) {
        #fps-counter {
          top: 10px !important;
          left: 10px !important;
          font-size: 10px !important;
          padding: 4px 8px !important;
        }
        #btn-reset-simulation {
          top: 10px !important;
          right: 10px !important;
          font-size: 10px !important;
          padding: 6px 12px !important;
        }
        #mission-log-feed {
          bottom: 15px !important;
          left: 15px !important;
          right: 15px !important;
          width: calc(100% - 30px) !important;
          padding: 10px 14px !important;
          border-radius: 8px !important;
        }
        #mission-log-feed #quest-desc,
        #mission-log-feed #quest-distance,
        #mission-log-feed #quest-progress-bar {
          margin-bottom: 8px !important;
        }
        #mission-log-feed #quest-history-list {
          max-height: 45px;
          overflow-y: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  createFPSCounter() {
    const fpsElement = document.createElement('div');
    fpsElement.id = 'fps-counter';
    fpsElement.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      color: #00f2fe;
      font-family: 'Orbitron', monospace;
      font-size: 13px;
      z-index: 1000;
      background: rgba(10, 5, 25, 0.65);
      border: 1px solid rgba(0, 242, 254, 0.25);
      backdrop-filter: blur(8px);
      padding: 6px 12px;
      border-radius: 4px;
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.1);
    `;
    const container = document.getElementById('hero') || document.body;
    container.appendChild(fpsElement);
    this.elements.set('fps', fpsElement);
  }

  createResetButton() {
    const btn = document.createElement('button');
    btn.id = 'btn-reset-simulation';
    btn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: rgba(20, 10, 40, 0.7);
      border: 1px solid #00f2fe;
      color: #00f2fe;
      font-family: 'Orbitron', sans-serif;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 1px;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);
      transition: all 0.2s ease;
    `;
    btn.textContent = 'RESET SPACE SIMULATION';

    btn.addEventListener('mouseover', () => {
      btn.style.background = '#00f2fe';
      btn.style.color = '#05030a';
      btn.style.boxShadow = '0 0 25px #00f2fe';
    });

    btn.addEventListener('mouseout', () => {
      btn.style.background = 'rgba(20, 10, 40, 0.7)';
      btn.style.color = '#00f2fe';
      btn.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.2)';
    });

    btn.addEventListener('click', () => {
      console.log('RESETTING SPACE SIMULATION...');
      const gameMain = window.game;
      if (gameMain) {
        gameMain.destroy();
        gameMain.init();
      }
    });

    const container = document.getElementById('hero') || document.body;
    container.appendChild(btn);
    this.elements.set('resetBtn', btn);
  }

  createMissionControlFeed() {
    const feed = document.createElement('div');
    feed.id = 'mission-log-feed';
    feed.style.cssText = `
      position: absolute;
      bottom: 25px;
      left: 25px;
      z-index: 1000;
      background: rgba(10, 5, 25, 0.75);
      border: 1px solid rgba(139, 92, 246, 0.35);
      backdrop-filter: blur(12px);
      padding: 18px;
      border-radius: 12px;
      color: white;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
      width: 310px;
      transition: all 0.3s ease;
    `;

    feed.innerHTML = `
      <div style="font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 1.5px; color: #a78bfa; margin-bottom: 12px; border-bottom: 1px solid rgba(139,92,246,0.2); padding-bottom: 6px;">
        📡 MISSION CONTROL LOG
      </div>
      
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span id="beacon-indicator" class="beacon-dot" style="color: #00f2fe;"></span>
        <span id="quest-title" style="font-family: 'Orbitron'; font-weight: 700; font-size: 11px; color: #00f2fe;">
          LOADING QUEST DATA...
        </span>
      </div>
      
      <div id="quest-desc" style="font-size: 11px; color: #94a3b8; line-height: 1.4; margin-bottom: 6px;">
        Initializing hyperdrive link.
      </div>

      <div id="quest-distance" style="font-family: 'Orbitron'; font-size: 10px; color: #a78bfa; margin-bottom: 12px;">
        DISTANCE: -- AU
      </div>

      <div style="background: rgba(255,255,255,0.06); height: 5px; border-radius: 3px; overflow: hidden; margin-bottom: 16px;">
        <div id="quest-progress-bar" style="background: #00f2fe; width: 0%; height: 100%; transition: width 0.1s;"></div>
      </div>

      <div style="font-family: 'Orbitron', sans-serif; font-size: 9px; color: #64748b; margin-bottom: 6px;">COMPLETED MISSIONS:</div>
      <div id="quest-history-list" style="font-size: 10px; color: #10b981; line-height: 1.5;">
        <div style="color: #64748b;">(no records yet)</div>
      </div>
    `;

    const container = document.getElementById('hero') || document.body;
    container.appendChild(feed);
    this.elements.set('feed', feed);
  }

  update(deltaTime) {
    const core = this.core;
    if (!core) return;

    if (this.elements.has('fps')) {
      const fpsElement = this.elements.get('fps');
      fpsElement.textContent = `FPS: ${core.performance.fps} | Load: ${core.performance.loadTime.toFixed(0)}ms`;
    }

    const questSystem = core.getSystem('questsystem');
    const shipSystem = core.getSystem('shipsystem');
    if (questSystem && questSystem.activeQuest && shipSystem) {
      const q = questSystem.activeQuest;
      
      const titleEl = document.getElementById('quest-title');
      const descEl = document.getElementById('quest-desc');
      const distEl = document.getElementById('quest-distance');
      const beaconEl = document.getElementById('beacon-indicator');
      const barEl = document.getElementById('quest-progress-bar');
      const historyEl = document.getElementById('quest-history-list');

      if (titleEl) titleEl.textContent = q.title;
      if (descEl) descEl.textContent = q.description;
      if (barEl) barEl.style.width = `${questSystem.questProgress.toFixed(0)}%`;

      // Live AU Telemetry
      const lead = shipSystem.getLeadShip();
      if (lead && distEl) {
        const d = lead.position.distanceTo(questSystem.targetPosition);
        if (d < 18) {
          distEl.textContent = 'STATUS: OPERATIONAL RANGE';
          distEl.style.color = '#10b981';
        } else {
          distEl.textContent = `DISTANCE: ${(d / 10).toFixed(1)} AU`;
          distEl.style.color = '#a78bfa';
        }
      }

      // Beacon Dot Pulsing Color
      if (beaconEl) {
        if (q.type === 'SCAN') beaconEl.style.color = '#da70d6';
        else if (q.type === 'DEFEND') beaconEl.style.color = '#ff3300';
        else beaconEl.style.color = '#00f2fe';
      }

      if (historyEl) {
        if (questSystem.questHistory.length > 0) {
          historyEl.innerHTML = questSystem.questHistory.map(h => `<div style="margin-bottom:3px;">${h}</div>`).join('');
        } else {
          historyEl.innerHTML = `<div style="color: #64748b;">(no records yet)</div>`;
        }
      }
    }
  }

  destroy() {
    this.elements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.elements.clear();
    const style = document.getElementById('sim-telemetry-css');
    if (style) style.remove();
  }
}

export { SpaceGameCore };
