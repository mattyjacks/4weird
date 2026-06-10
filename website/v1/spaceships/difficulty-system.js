// Difficulty Progression System
// Gradually increases game difficulty over time to ensure eventual challenge

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class DifficultySystem {
  constructor() {
    this.level = 1;
    this.startTime = Date.now();
    this.lastLevelUp = Date.now();
    
    // Base difficulty parameters
    this.baseParams = {
      alienSpawnRate: 15000, // milliseconds between spawns
      alienHealth: 50,
      alienDamage: 10,
      alienSpeed: 6,
      alienAccuracy: 0.3,
      maxAliens: 5,
      lootMultiplier: 1.0,
      experienceMultiplier: 1.0
    };
    
    // Current difficulty parameters (will be modified by level)
    this.currentParams = { ...this.baseParams };
    
    // Difficulty scaling factors
    this.scaling = {
      spawnRateDecrease: 0.1, // 10% faster spawning per level
      healthIncrease: 0.2,    // 20% more health per level
      damageIncrease: 0.15,   // 15% more damage per level
      speedIncrease: 0.08,    // 8% faster per level
      accuracyIncrease: 0.05, // 5% more accurate per level
      maxAliensIncrease: 1,   // 1 more alien per level
      lootMultiplierIncrease: 0.1, // 10% more loot per level
      experienceMultiplierIncrease: 0.15 // 15% more XP per level
    };
    
    // Special events
    this.events = [];
    this.nextEventTime = Date.now() + 60000; // First event after 1 minute
    
    // Boss encounter settings
    this.bossSettings = {
      enabled: false,
      spawnInterval: 300000, // 5 minutes between bosses
      lastBossSpawn: 0,
      minLevel: 3
    };
  }

  update() {
    const now = Date.now();
    const elapsed = now - this.startTime;
    
    // Calculate current level (1 level per minute)
    const newLevel = Math.floor(elapsed / 60000) + 1;
    
    if (newLevel > this.level) {
      this.levelUp(newLevel);
    }
    
    // Update current parameters based on level
    this.updateCurrentParams();
    
    // Check for special events
    this.checkEvents(now);
    
    // Check for boss encounters
    this.checkBossSpawn(now);
    
    return {
      level: this.level,
      params: this.currentParams,
      timeToNextLevel: 60000 - (elapsed % 60000),
      nextEventIn: Math.max(0, this.nextEventTime - now)
    };
  }

  levelUp(newLevel) {
    const oldLevel = this.level;
    this.level = newLevel;
    this.lastLevelUp = Date.now();
    
    console.log(`DIFFICULTY LEVEL UP: ${oldLevel} → ${newLevel}`);
    
    // Create level up effect
    this.createLevelUpEffect();
    
    // Apply scaling
    this.applyScaling();
    
    // Enable bosses at minimum level
    if (this.level >= this.bossSettings.minLevel && !this.bossSettings.enabled) {
      this.bossSettings.enabled = true;
      console.log('Boss encounters enabled!');
    }
  }

  applyScaling() {
    const level = this.level - 1; // Level 1 = 0 scaling
    
    this.currentParams.alienSpawnRate = Math.max(
      3000, // Minimum 3 second spawn rate
      this.baseParams.alienSpawnRate * (1 - this.scaling.spawnRateDecrease * level)
    );
    
    this.currentParams.alienHealth = Math.floor(
      this.baseParams.alienHealth * (1 + this.scaling.healthIncrease * level)
    );
    
    this.currentParams.alienDamage = Math.floor(
      this.baseParams.alienDamage * (1 + this.scaling.damageIncrease * level)
    );
    
    this.currentParams.alienSpeed = this.baseParams.alienSpeed * (1 + this.scaling.speedIncrease * level);
    
    this.currentParams.alienAccuracy = Math.min(
      0.8, // Maximum 80% accuracy
      this.baseParams.alienAccuracy * (1 + this.scaling.accuracyIncrease * level)
    );
    
    this.currentParams.maxAliens = this.baseParams.maxAliens + (this.scaling.maxAliensIncrease * level);
    
    this.currentParams.lootMultiplier = this.baseParams.lootMultiplier * (1 + this.scaling.lootMultiplierIncrease * level);
    
    this.currentParams.experienceMultiplier = this.baseParams.experienceMultiplier * (1 + this.scaling.experienceMultiplierIncrease * level);
  }

  updateCurrentParams() {
    // This is called every update to ensure params are current
    this.applyScaling();
  }

  shouldSpawnAlien(currentAlienCount) {
    return currentAlienCount < this.currentParams.maxAliens && Math.random() < 0.02 * this.level;
  }

  spawnAlien(alienSystem, position = null) {
    if (!alienSystem) return null;
    
    const spawnPos = position || this.generateSpawnPosition();
    
    const alien = {
      id: "alien_" + Date.now() + "_" + Math.random(),
      position: new THREE.Vector3(...spawnPos),
      velocity: [
        (Math.random() - 0.5) * this.currentParams.alienSpeed,
        (Math.random() - 0.5) * this.currentParams.alienSpeed * 0.5,
        this.currentParams.alienSpeed
      ],
      health: this.currentParams.alienHealth,
      maxHealth: this.currentParams.alienHealth,
      damage: this.currentParams.alienDamage,
      accuracy: this.currentParams.alienAccuracy,
      type: this.getAlienType(),
      level: this.level,
      loot: this.calculateAlienLoot()
    };
    
    return alien;
  }

  generateSpawnPosition() {
    const spawnDistance = 60 + (this.level * 5);
    const angle = Math.random() * Math.PI * 2;
    
    return [
      Math.cos(angle) * spawnDistance,
      (Math.random() - 0.5) * 30,
      -spawnDistance + (Math.random() - 0.5) * 20
    ];
  }

  getAlienType() {
    const rand = Math.random();
    
    if (this.level >= 5 && rand < 0.1) {
      return 'elite';
    } else if (this.level >= 3 && rand < 0.2) {
      return 'veteran';
    } else {
      return 'basic';
    }
  }

  calculateAlienLoot() {
    const baseLoot = {
      basic: { min: 10, max: 25 },
      veteran: { min: 30, max: 50 },
      elite: { min: 60, max: 100 }
    };
    
    const type = this.getAlienType();
    const lootRange = baseLoot[type];
    const loot = Math.floor(
      (lootRange.min + Math.random() * (lootRange.max - lootRange.min)) * 
      this.currentParams.lootMultiplier
    );
    
    return loot;
  }

  checkEvents(now) {
    if (now >= this.nextEventTime) {
      this.triggerRandomEvent();
      this.nextEventTime = now + (60000 + Math.random() * 120000); // 1-3 minutes
    }
  }

  triggerRandomEvent() {
    const events = [
      'reinforcements',
      'weapon_malfunction',
      'loot_bonus',
      'healing_wave',
      'speed_boost',
      'accuracy_debuff'
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    
    console.log(`SPECIAL EVENT: ${event.replace('_', ' ').toUpperCase()}`);
    this.createEventEffect(event);
    
    return event;
  }

  createEventEffect(eventType) {
    let effectColor = 0xffffff;
    
    switch(eventType) {
      case 'reinforcements':
        effectColor = 0xff0000;
        // Spawn extra aliens
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (window.alienSpawnSystem) {
              window.alienSpawnSystem.spawnAlien();
            }
          }, i * 1000);
        }
        break;
        
      case 'weapon_malfunction':
        effectColor = 0xff9900;
        // Temporarily reduce player accuracy
        if (window.weaponSystem) {
          window.weaponSystem.accuracyMultiplier = 0.5;
          setTimeout(() => {
            if (window.weaponSystem) {
              window.weaponSystem.accuracyMultiplier = 1.0;
            }
          }, 10000);
        }
        break;
        
      case 'loot_bonus':
        effectColor = 0xffdd00;
        // Double loot for 30 seconds
        if (window.lootSystem) {
          window.lootSystem.lootMultiplier = 2.0;
          setTimeout(() => {
            if (window.lootSystem) {
              window.lootSystem.lootMultiplier = 1.0;
            }
          }, 30000);
        }
        break;
        
      case 'healing_wave':
        effectColor = 0x00ff00;
        // Heal all player ships
        if (window.activeHumanShips) {
          window.activeHumanShips.forEach(ship => {
            if (ship.ai && window.voxelDamageSystem) {
              window.voxelDamageSystem.repairShip(ship.mesh, 30);
            }
          });
        }
        break;
        
      case 'speed_boost':
        effectColor = 0x00ffff;
        // Increase player ship speed
        if (window.activeHumanShips) {
          window.activeHumanShips.forEach(ship => {
            if (ship.ai) {
              ship.ai.speedBoost = 1.5;
              setTimeout(() => {
                if (ship.ai) ship.ai.speedBoost = 1.0;
              }, 15000);
            }
          });
        }
        break;
        
      case 'accuracy_debuff':
        effectColor = 0x9900ff;
        // Reduce alien accuracy
        this.currentParams.alienAccuracy *= 0.5;
        setTimeout(() => {
          this.updateCurrentParams();
        }, 20000);
        break;
    }
    
    // Create visual effect
    this.createEventVisual(effectColor);
  }

  createEventVisual(color) {
    if (!window.scene) return;
    
    // Create screen-wide flash effect
    const flashGeom = new THREE.PlaneGeometry(200, 200);
    const flashMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.z = -50;
    window.scene.add(flash);
    
    // Fade out effect
    let opacity = 0.3;
    const fadeOut = () => {
      opacity *= 0.9;
      flash.material.opacity = opacity;
      
      if (opacity > 0.01) {
        requestAnimationFrame(fadeOut);
      } else if (flash.parent) {
        flash.parent.remove(flash);
      }
    };
    
    requestAnimationFrame(fadeOut);
  }

  checkBossSpawn(now) {
    if (!this.bossSettings.enabled) return;
    
    if (now - this.bossSettings.lastBossSpawn > this.bossSettings.spawnInterval) {
      this.spawnBoss();
      this.bossSettings.lastBossSpawn = now;
    }
  }

  spawnBoss() {
    console.log('BOSS ENCOUNTER!');
    
    const boss = {
      id: "boss_" + Date.now(),
      position: new THREE.Vector3(0, 10, -80),
      velocity: [0, 0, 2],
      health: this.currentParams.alienHealth * 5,
      maxHealth: this.currentParams.alienHealth * 5,
      damage: this.currentParams.alienDamage * 2,
      accuracy: this.currentParams.alienAccuracy * 1.5,
      type: 'boss',
      level: this.level,
      loot: this.calculateAlienLoot() * 10,
      size: 3.0 // Much larger than normal aliens
    };
    
    if (window.bossSpawnSystem) {
      window.bossSpawnSystem.spawnBoss(boss);
    }
    
    this.createBossEffect();
  }

  createBossEffect() {
    // Create dramatic boss spawn effect
    if (!window.scene) return;
    
    for (let i = 0; i < 50; i++) {
      const particleGeom = new THREE.OctahedronGeometry(0.5, 0);
      const particleMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeom, particleMat);
      const angle = (i / 50) * Math.PI * 2;
      const radius = 20;
      
      particle.position.set(
        Math.cos(angle) * radius,
        Math.sin(i * 0.1) * 10,
        Math.sin(angle) * radius - 80
      );
      
      particle.userData = {
        targetPosition: new THREE.Vector3(0, 10, -80),
        speed: 0.02 + Math.random() * 0.03
      };
      
      window.scene.add(particle);
      this.animateBossParticle(particle);
    }
  }

  animateBossParticle(particle) {
    const animate = () => {
      if (!particle.parent) return;
      
      particle.position.lerp(particle.userData.targetPosition, particle.userData.speed);
      particle.rotation.x += 0.1;
      particle.rotation.y += 0.1;
      
      const distance = particle.position.distanceTo(particle.userData.targetPosition);
      if (distance > 0.5) {
        requestAnimationFrame(animate);
      } else {
        particle.material.opacity *= 0.9;
        if (particle.material.opacity > 0.1) {
          requestAnimationFrame(animate);
        } else if (particle.parent) {
          particle.parent.remove(particle);
        }
      }
    };
    
    requestAnimationFrame(animate);
  }

  createLevelUpEffect() {
    if (!window.scene) return;
    
    // Create level up visual effect
    const ringGeom = new THREE.RingGeometry(10, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(0, 0, -20);
    window.scene.add(ring);
    
    // Animate ring expanding and fading
    let scale = 1;
    let opacity = 0.8;
    
    const animate = () => {
      scale += 0.05;
      opacity *= 0.95;
      
      ring.scale.set(scale, scale, scale);
      ring.material.opacity = opacity;
      
      if (opacity > 0.01) {
        requestAnimationFrame(animate);
      } else if (ring.parent) {
        ring.parent.remove(ring);
      }
    };
    
    requestAnimationFrame(animate);
  }

  getDifficultyReport() {
    return {
      level: this.level,
      timeElapsed: Math.floor((Date.now() - this.startTime) / 1000),
      currentParams: this.currentParams,
      scaling: this.scaling,
      nextLevelIn: 60000 - ((Date.now() - this.startTime) % 60000),
      bossEnabled: this.bossSettings.enabled,
      nextBossIn: this.bossSettings.enabled ? 
        Math.max(0, this.bossSettings.spawnInterval - (Date.now() - this.bossSettings.lastBossSpawn)) : 
        null
    };
  }

  // Debug function to manually set level
  setLevel(level) {
    this.level = Math.max(1, level);
    this.applyScaling();
    console.log(`Difficulty manually set to level ${this.level}`);
  }
}

export { DifficultySystem };
