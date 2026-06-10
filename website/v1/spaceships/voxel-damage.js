// Voxel-based damage system for realistic spaceship destruction
// Ships are built from individual voxel blocks that can be damaged and destroyed

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class VoxelDamageSystem {
  constructor() {
    this.voxelSize = 0.3;
    this.damageSpreadRadius = 2.0;
    this.shipGenerator = null;
  }

  createVoxelShip(faction, shipId) {
    // Use realistic ship generator for human ships to create authentic designs
    if (faction === 'human') {
      if (!this.shipGenerator) {
        // Import RealisticShipGenerator if not already available
        if (typeof RealisticShipGenerator !== 'undefined') {
          this.shipGenerator = new RealisticShipGenerator();
        } else {
          console.warn('RealisticShipGenerator not available, falling back to default ship design');
          return this.createDefaultVoxelShip(faction, shipId);
        }
      }
      
      try {
        // Temporarily disabled performance manager to fix loading
        // if (window.performanceManager) {
        //   return window.performanceManager.generateOptimizedShip(this.shipGenerator, shipId, faction);
        // } else {
          return this.shipGenerator.generateRealisticShip(shipId, faction);
        // }
      } catch (error) {
        console.error('Error generating realistic ship:', error);
        return this.createDefaultVoxelShip(faction, shipId);
      }
    } else {
      // Use default design for aliens
      return this.createDefaultVoxelShip(faction, shipId);
    }
  }

  createDefaultVoxelShip(faction, shipId) {
    const shipGroup = new THREE.Group();
    const voxels = [];
    
    // Create hull voxels - main body structure
    for (let x = -3; x <= 3; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -4; z <= 4; z++) {
          if (this.shouldCreateHullVoxel(x, y, z)) {
            const voxel = this.createVoxel(faction, 'hull', x, y, z);
            shipGroup.add(voxel);
            voxels.push(voxel);
          }
        }
      }
    }
    
    // Create cockpit voxels - more critical components
    for (let x = -1; x <= 1; x++) {
      for (let y = 0; y <= 2; y++) {
        for (let z = -2; z <= 0; z++) {
          const voxel = this.createVoxel(faction, 'cockpit', x, y, z);
          shipGroup.add(voxel);
          voxels.push(voxel);
        }
      }
    }
    
    // Create engine voxels
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 0; y++) {
        for (let z = 4; z <= 5; z++) {
          const voxel = this.createVoxel(faction, 'engine', x, y, z);
          shipGroup.add(voxel);
          voxels.push(voxel);
        }
      }
    }
    
    // Create weapon voxels
    for (let y = 0; y <= 1; y++) {
      for (let z = -5; z <= -4; z++) {
        const leftVoxel = this.createVoxel(faction, 'weapon', -2, y, z);
        const rightVoxel = this.createVoxel(faction, 'weapon', 2, y, z);
        shipGroup.add(leftVoxel);
        shipGroup.add(rightVoxel);
        voxels.push(leftVoxel, rightVoxel);
      }
    }
    
    shipGroup.userData = {
      voxels: voxels,
      faction: faction,
      shipId: shipId,
      collisionRadius: 2.5,
      totalHealth: this.calculateTotalHealth(voxels),
      maxTotalHealth: this.calculateTotalHealth(voxels),
      functionalVoxels: {
        engines: voxels.filter(v => v.userData.type === 'engine').length,
        weapons: voxels.filter(v => v.userData.type === 'weapon').length,
        cockpit: voxels.filter(v => v.userData.type === 'cockpit').length
      }
    };
    
    return shipGroup;
  }

  shouldCreateHullVoxel(x, y, z) {
    // Create a ship-like shape with the voxels
    const dist = Math.abs(x) + Math.abs(y) + Math.abs(z/2);
    return dist <= 4 && !(z > 3 && Math.abs(x) > 1);
  }

  createVoxel(faction, type, x, y, z) {
    const geometry = new THREE.BoxGeometry(this.voxelSize, this.voxelSize, this.voxelSize);
    
    let color, emissiveColor, health;
    switch (type) {
      case 'hull':
        color = faction === 'human' ? 0x8f9ca6 : 0x5a0a2a;
        emissiveColor = 0x000000;
        health = 100;
        break;
      case 'cockpit':
        color = faction === 'human' ? 0x00ffff : 0xff0055;
        emissiveColor = faction === 'human' ? 0x00ffff : 0xff0055;
        health = 150;
        break;
      case 'engine':
        color = faction === 'human' ? 0xff6600 : 0x990000;
        emissiveColor = faction === 'human' ? 0xff3300 : 0x660000;
        health = 80;
        break;
      case 'weapon':
        color = faction === 'human' ? 0x00ff00 : 0xff0000;
        emissiveColor = faction === 'human' ? 0x00aa00 : 0xaa0000;
        health = 60;
        break;
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.3,
      emissive: emissiveColor,
      emissiveIntensity: type === 'cockpit' ? 0.2 : 0.1
    });
    
    const voxel = new THREE.Mesh(geometry, material);
    voxel.position.set(x * this.voxelSize, y * this.voxelSize, z * this.voxelSize);
    voxel.userData = {
      health: health,
      maxHealth: health,
      type: type,
      faction: faction,
      originalColor: color,
      originalEmissive: emissiveColor
    };
    
    return voxel;
  }

  calculateTotalHealth(voxels) {
    return voxels.reduce((sum, voxel) => sum + voxel.userData.health, 0);
  }

  applyDamage(ship, damage, impactPoint) {
    const voxels = ship.userData.voxels;
    let totalDamageDealt = 0;
    const destroyedVoxels = [];
    
    voxels.forEach(voxel => {
      if (!voxel.visible) return; // Skip already destroyed voxels
      
      const distance = voxel.position.distanceTo(impactPoint);
      if (distance < this.damageSpreadRadius) {
        const damageMultiplier = 1.0 - (distance / this.damageSpreadRadius);
        const actualDamage = damage * damageMultiplier;
        const oldHealth = voxel.userData.health;
        
        voxel.userData.health = Math.max(0, voxel.userData.health - actualDamage);
        totalDamageDealt += Math.min(actualDamage, oldHealth);
        
        // Update visual appearance based on damage
        this.updateVoxelAppearance(voxel);
        
        // Check if voxel is destroyed
        if (voxel.userData.health <= 0) {
          voxel.visible = false;
          destroyedVoxels.push(voxel);
          this.createVoxelDebris(voxel);
        }
      }
    });
    
    // Update ship's total health
    ship.userData.totalHealth = this.calculateTotalHealth(voxels);
    
    // Update functional components
    this.updateFunctionalComponents(ship);
    
    // Create damage effect
    if (totalDamageDealt > 0) {
      this.createDamageEffect(impactPoint, totalDamageDealt);
    }
    
    return {
      damageDealt: totalDamageDealt,
      destroyedVoxels: destroyedVoxels.length,
      remainingHealth: ship.userData.totalHealth,
      functionalComponents: ship.userData.functionalVoxels
    };
  }

  updateVoxelAppearance(voxel) {
    const healthPercent = voxel.userData.health / voxel.userData.maxHealth;
    
    if (healthPercent < 0.3) {
      // Heavily damaged - dark grey
      voxel.material.color.setHex(0x333333);
      voxel.material.emissive.setHex(0x000000);
      voxel.material.emissiveIntensity = 0;
    } else if (healthPercent < 0.6) {
      // Moderately damaged - darker version
      const color = new THREE.Color(voxel.userData.originalColor);
      color.multiplyScalar(0.5);
      voxel.material.color.copy(color);
      voxel.material.emissiveIntensity *= 0.3;
    } else if (healthPercent < 0.8) {
      // Lightly damaged - slightly darker
      const color = new THREE.Color(voxel.userData.originalColor);
      color.multiplyScalar(0.8);
      voxel.material.color.copy(color);
      voxel.material.emissiveIntensity *= 0.7;
    }
  }

  updateFunctionalComponents(ship) {
    const voxels = ship.userData.voxels;
    
    ship.userData.functionalVoxels = {
      engines: voxels.filter(v => v.userData.type === 'engine' && v.visible).length,
      weapons: voxels.filter(v => v.userData.type === 'weapon' && v.visible).length,
      cockpit: voxels.filter(v => v.userData.type === 'cockpit' && v.visible).length
    };
  }

  repairShip(ship, repairAmount) {
    const voxels = ship.userData.voxels;
    let totalRepaired = 0;
    let repairedVoxels = 0;
    
    // Prioritize critical components first
    const repairPriority = ['cockpit', 'engine', 'weapon', 'hull'];
    
    repairPriority.forEach(type => {
      const typeVoxels = voxels.filter(v => v.userData.type === type && !v.visible);
      
      typeVoxels.forEach(voxel => {
        if (totalRepaired >= repairAmount) return;
        
        const repairNeeded = voxel.userData.maxHealth;
        const actualRepair = Math.min(repairNeeded, repairAmount - totalRepaired);
        
        voxel.userData.health = actualRepair;
        voxel.visible = true;
        
        // Restore appearance
        voxel.material.color.setHex(voxel.userData.originalColor);
        voxel.material.emissive.setHex(voxel.userData.originalEmissive);
        voxel.material.emissiveIntensity = type === 'cockpit' ? 0.2 : 0.1;
        
        totalRepaired += actualRepair;
        repairedVoxels++;
      });
    });
    
    // Repair damaged but not destroyed voxels
    voxels.forEach(voxel => {
      if (totalRepaired >= repairAmount) return;
      if (voxel.visible && voxel.userData.health < voxel.userData.maxHealth) {
        const repairNeeded = voxel.userData.maxHealth - voxel.userData.health;
        const actualRepair = Math.min(repairNeeded, repairAmount - totalRepaired);
        
        voxel.userData.health += actualRepair;
        totalRepaired += actualRepair;
        
        this.updateVoxelAppearance(voxel);
      }
    });
    
    // Update ship's total health
    ship.userData.totalHealth = this.calculateTotalHealth(voxels);
    this.updateFunctionalComponents(ship);
    
    // Create repair effect
    if (repairedVoxels > 0) {
      this.createRepairEffect(ship.position, repairedVoxels);
    }
    
    return {
      repairedAmount: totalRepaired,
      repairedVoxels: repairedVoxels,
      newHealth: ship.userData.totalHealth
    };
  }

  createVoxelDebris(voxel) {
    // Create small debris pieces when voxel is destroyed
    for (let i = 0; i < 3; i++) {
      const debrisGeom = new THREE.BoxGeometry(this.voxelSize * 0.3, this.voxelSize * 0.3, this.voxelSize * 0.3);
      const debrisMat = new THREE.MeshStandardMaterial({
        color: voxel.userData.originalColor,
        metalness: 0.5,
        roughness: 0.8
      });
      
      const debris = new THREE.Mesh(debrisGeom, debrisMat);
      debris.position.copy(voxel.position);
      debris.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        lifetime: 3000
      };
      
      if (window.scene) {
        window.scene.add(debris);
        this.animateDebris(debris);
      }
    }
  }

  animateDebris(debris) {
    const animate = () => {
      if (!debris.parent) return;
      
      debris.position.add(debris.userData.velocity.clone().multiplyScalar(0.016));
      debris.rotation.x += 0.1;
      debris.rotation.y += 0.15;
      
      debris.userData.velocity.y -= 0.1; // Gravity
      debris.userData.lifetime -= 16;
      
      if (debris.userData.lifetime > 0) {
        requestAnimationFrame(animate);
      } else if (debris.parent) {
        debris.parent.remove(debris);
      }
    };
    
    requestAnimationFrame(animate);
  }

  createDamageEffect(impactPoint, damage) {
    // Create visual damage effect
    const particleCount = Math.min(20, Math.floor(damage / 5));
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeom = new THREE.SphereGeometry(0.1, 4, 4);
      const particleMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.position.copy(impactPoint);
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        lifetime: 1000
      };
      
      if (window.scene) {
        window.scene.add(particle);
        this.animateParticle(particle);
      }
    }
  }

  createRepairEffect(shipPosition, voxelCount) {
    // Create visual repair effect
    for (let i = 0; i < voxelCount; i++) {
      const particleGeom = new THREE.SphereGeometry(0.15, 6, 6);
      const particleMat = new THREE.MeshBasicMaterial({
        color: 0x44ff44,
        transparent: true,
        opacity: 0.9
      });
      
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.position.copy(shipPosition);
      particle.position.add(new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ));
      
      particle.userData = {
        targetPosition: particle.position.clone(),
        lifetime: 2000
      };
      
      if (window.scene) {
        window.scene.add(particle);
        this.animateRepairParticle(particle);
      }
    }
  }

  animateParticle(particle) {
    const animate = () => {
      if (!particle.parent) return;
      
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
      particle.userData.velocity.multiplyScalar(0.95);
      particle.material.opacity *= 0.95;
      particle.userData.lifetime -= 16;
      
      if (particle.userData.lifetime > 0) {
        requestAnimationFrame(animate);
      } else if (particle.parent) {
        particle.parent.remove(particle);
      }
    };
    
    requestAnimationFrame(animate);
  }

  animateRepairParticle(particle) {
    const animate = () => {
      if (!particle.parent) return;
      
      particle.position.lerp(particle.userData.targetPosition, 0.1);
      particle.material.opacity *= 0.98;
      particle.userData.lifetime -= 16;
      
      if (particle.userData.lifetime > 0) {
        requestAnimationFrame(animate);
      } else if (particle.parent) {
        particle.parent.remove(particle);
      }
    };
    
    requestAnimationFrame(animate);
  }
}

export { VoxelDamageSystem };
