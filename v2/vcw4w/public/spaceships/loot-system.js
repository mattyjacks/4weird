// Loot and Economy System
// Handles loot collection, sharing, and repair mechanics

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class LootSystem {
  constructor() {
    this.totalLoot = 0;
    this.sharedLoot = 0;
    this.lastShare = Date.now();
    this.shareInterval = 5000; // Share every 5 seconds
    
    // Loot values based on alien type and difficulty
    this.lootValues = {
      basic: { min: 10, max: 25 },
      elite: { min: 30, max: 50 },
      boss: { min: 100, max: 200 }
    };
  }

  addLoot(amount, source = 'alien') {
    this.totalLoot += amount;
    console.log(`Loot collected: ${amount} from ${source}. Total: ${this.totalLoot}`);
    
    // Create loot pickup effect
    this.createLootEffect(amount);
    
    return amount;
  }

  shareLoot(humanShips) {
    const now = Date.now();
    if (now - this.lastShare > this.shareInterval && this.totalLoot > 0) {
      const activeShips = Array.from(humanShips.values());
      
      if (activeShips.length > 0) {
        const shareAmount = Math.floor(this.totalLoot / activeShips.length);
        
        activeShips.forEach(ship => {
          ship.ai.loot += shareAmount;
          console.log(`Ship ${ship.id} received ${shareAmount} loot. Total: ${ship.ai.loot}`);
        });
        
        this.sharedLoot += this.totalLoot;
        this.totalLoot = 0;
        this.lastShare = now;
        
        // Create share effect
        this.createShareEffect(activeShips, shareAmount);
        
        return {
          shared: true,
          amountPerShip: shareAmount,
          totalShips: activeShips.length
        };
      }
    }
    
    return { shared: false };
  }

  calculateLootValue(alienType, difficultyLevel = 1) {
    const baseValue = this.lootValues[alienType] || this.lootValues.basic;
    const difficultyMultiplier = 1 + (difficultyLevel * 0.2);
    const variance = 0.8 + Math.random() * 0.4; // ±20% variance
    
    const value = (baseValue.min + Math.random() * (baseValue.max - baseValue.min)) 
                  * difficultyMultiplier * variance;
    
    return Math.floor(value);
  }

  createLootEffect(amount) {
    // Create visual effect for loot collection
    const particleCount = Math.min(15, Math.floor(amount / 5));
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeom = new THREE.OctahedronGeometry(0.2, 0);
      const particleMat = new THREE.MeshBasicMaterial({
        color: 0xffdd00,
        transparent: true,
        opacity: 0.9
      });
      
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 8
        ),
        lifetime: 1500,
        rotationSpeed: Math.random() * 0.2
      };
      
      if (window.scene) {
        window.scene.add(particle);
        this.animateLootParticle(particle);
      }
    }
  }

  createShareEffect(ships, amount) {
    ships.forEach(ship => {
      // Create effect above each ship
      const textGeom = new THREE.PlaneGeometry(4, 1);
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      
      context.fillStyle = '#ffdd00';
      context.font = 'bold 32px Arial';
      context.textAlign = 'center';
      context.fillText(`+${amount}`, 128, 45);
      
      const texture = new THREE.CanvasTexture(canvas);
      const textMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      const textMesh = new THREE.Mesh(textGeom, textMat);
      textMesh.position.copy(ship.position);
      textMesh.position.y += 5;
      textMesh.userData = {
        lifetime: 2000,
        velocity: new THREE.Vector3(0, 0.05, 0)
      };
      
      if (window.scene) {
        window.scene.add(textMesh);
        this.animateShareText(textMesh);
      }
    });
  }

  animateLootParticle(particle) {
    const animate = () => {
      if (!particle.parent) return;
      
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
      particle.rotation.x += particle.userData.rotationSpeed;
      particle.rotation.y += particle.userData.rotationSpeed;
      
      particle.userData.velocity.y -= 0.2; // Gravity
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

  animateShareText(textMesh) {
    const animate = () => {
      if (!textMesh.parent) return;
      
      textMesh.position.add(textMesh.userData.velocity);
      textMesh.material.opacity *= 0.98;
      textMesh.userData.lifetime -= 16;
      
      if (textMesh.userData.lifetime > 0) {
        requestAnimationFrame(animate);
      } else if (textMesh.parent) {
        textMesh.parent.remove(textMesh);
      }
    };
    
    requestAnimationFrame(animate);
  }

  getStats() {
    return {
      totalLoot: this.totalLoot,
      sharedLoot: this.sharedLoot,
      lastShare: this.lastShare,
      shareInterval: this.shareInterval
    };
  }
}

class RepairSystem {
  constructor(lootSystem) {
    this.lootSystem = lootSystem;
    this.repairCost = 5; // 5 loot per health point
    this.autoRepair = true;
    this.repairThreshold = 30; // Auto-repair when health < 30%
    this.repairEfficiency = 1.0; // Can be upgraded
  }

  repairShip(ship, repairAmount = null) {
    if (!ship.ai) return { success: false, reason: 'No AI system' };
    
    const maxRepair = repairAmount || 20;
    const currentHealth = ship.ai.health;
    const maxHealth = ship.ai.maxHealth;
    
    if (currentHealth >= maxHealth) {
      return { success: false, reason: 'Already at full health' };
    }
    
    const healthNeeded = Math.min(maxRepair, maxHealth - currentHealth);
    const cost = Math.ceil(healthNeeded * this.repairCost / this.repairEfficiency);
    
    if (ship.ai.loot < cost) {
      return { success: false, reason: 'Insufficient loot', needed: cost, available: ship.ai.loot };
    }
    
    // Perform repair
    ship.ai.loot -= cost;
    const actualRepair = Math.floor(healthNeeded * this.repairEfficiency);
    
    if (window.voxelDamageSystem) {
      const repairResult = window.voxelDamageSystem.repairShip(ship.mesh, actualRepair);
      ship.ai.health = repairResult.newHealth;
      
      console.log(`Ship ${ship.id} repaired ${actualRepair.toFixed(1)} health for ${cost} loot`);
      
      return {
        success: true,
        repaired: actualRepair,
        cost: cost,
        newHealth: ship.ai.health,
        repairedVoxels: repairResult.repairedVoxels
      };
    } else {
      // Fallback if voxel system not available
      ship.ai.health = Math.min(maxHealth, currentHealth + actualRepair);
      
      return {
        success: true,
        repaired: actualRepair,
        cost: cost,
        newHealth: ship.ai.health
      };
    }
  }

  autoRepairAll(humanShips) {
    if (!this.autoRepair) return { repaired: 0, totalCost: 0 };
    
    let repaired = 0;
    let totalCost = 0;
    
    humanShips.forEach(ship => {
      const healthPercent = ship.ai.health / ship.ai.maxHealth;
      
      if (healthPercent < (this.repairThreshold / 100)) {
        const repairResult = this.repairShip(ship);
        if (repairResult.success) {
          repaired++;
          totalCost += repairResult.cost;
        }
      }
    });
    
    return { repaired, totalCost };
  }

  upgradeRepairEfficiency() {
    const upgradeCost = 100;
    
    // Find a ship to pay for the upgrade
    for (let ship of window.activeHumanShips.values()) {
      if (ship.ai.loot >= upgradeCost) {
        ship.ai.loot -= upgradeCost;
        this.repairEfficiency = Math.min(2.0, this.repairEfficiency + 0.2);
        console.log(`Repair efficiency upgraded to ${this.repairEfficiency.toFixed(1)}x`);
        return { success: true, newEfficiency: this.repairEfficiency };
      }
    }
    
    return { success: false, reason: 'Insufficient fleet loot for upgrade' };
  }

  setAutoRepair(enabled) {
    this.autoRepair = enabled;
    console.log(`Auto-repair ${enabled ? 'enabled' : 'disabled'}`);
  }

  getStats() {
    return {
      repairCost: this.repairCost,
      autoRepair: this.autoRepair,
      repairThreshold: this.repairThreshold,
      repairEfficiency: this.repairEfficiency
    };
  }
}

export { LootSystem, RepairSystem };
