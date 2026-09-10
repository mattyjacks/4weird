// Debug System for Testing
// Provides debugging tools and system verification

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class DebugSystem {
  constructor() {
    this.enabled = true;
    this.debugInfo = {
      shipsCreated: 0,
      aliensCreated: 0,
      projectilesFired: 0,
      damageDealt: 0,
      lootCollected: 0
    };
  }

  logSystemStatus() {
    if (!this.enabled) return;
    
    console.log('=== SPACESHIP SYSTEM STATUS ===');
    console.log('Scene:', !!window.scene);
    console.log('Weapon System:', !!window.weaponSystem);
    console.log('Repair System:', !!window.repairSystem);
    console.log('Loot System:', !!window.lootSystem);
    console.log('Voxel Damage System:', !!window.voxelDamageSystem);
    console.log('Difficulty System:', !!window.difficultySystem);
    console.log('Performance Manager:', !!window.performanceManager);
    console.log('Active Human Ships:', window.activeHumanShips?.size || 0);
    console.log('Active Aliens:', window.activeAliens?.size || 0);
    console.log('Projectiles:', window.weaponSystem?.getProjectileCount() || 0);
    
    // Temporarily disabled performance stats to fix loading
    // if (window.performanceManager) {
    //   const stats = window.performanceManager.getPerformanceStats();
    //   console.log('--- PERFORMANCE STATS ---');
    //   console.log('FPS:', stats.fps);
    //   console.log('Frame Time:', stats.frameTime.toFixed(2) + 'ms');
    //   console.log('Memory Usage:', stats.memoryUsageMB + 'MB');
    //   console.log('Active Voxels:', stats.activeVoxels);
    //   console.log('Cache Sizes:', stats.cacheSizes);
    //   console.log('-------------------------');
    // }
    
    console.log('===============================');
  }

  createDebugMarker(position, color = 0xff0000, size = 1.0) {
    if (!window.scene) return;
    
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: 0.8 
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    window.scene.add(marker);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (marker.parent) {
        marker.parent.remove(marker);
      }
    }, 5000);
  }

  createDebugText(text, position) {
    if (!window.scene) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#ffffff';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(text, 128, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(8, 2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.copy(position);
    window.scene.add(textMesh);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (textMesh.parent) {
        textMesh.parent.remove(textMesh);
      }
    }, 3000);
  }

  testVoxelShipCreation() {
    console.log('Testing voxel ship creation...');
    
    if (!window.voxelDamageSystem) {
      console.error('Voxel damage system not available');
      return;
    }
    
    const testShip = window.voxelDamageSystem.createVoxelShip('human', 'debug_ship');
    testShip.position.set(0, 0, 0);
    
    if (window.scene) {
      window.scene.add(testShip);
      this.createDebugText('DEBUG SHIP', new THREE.Vector3(0, 5, 0));
      console.log('Debug voxel ship created successfully');
    } else {
      console.error('Scene not available for debug ship');
    }
  }

  testWeaponSystem() {
    console.log('Testing weapon system...');
    
    if (!window.weaponSystem) {
      console.error('Weapon system not available');
      return;
    }
    
    const mockShip = {
      id: 'debug_ship',
      position: new THREE.Vector3(0, 0, 0)
    };
    
    const mockTarget = {
      position: new THREE.Vector3(0, 0, -20),
      velocity: [0, 0, 0]
    };
    
    const projectile = window.weaponSystem.fireWeapon(mockShip, mockTarget);
    if (projectile) {
      console.log('Test projectile fired successfully');
      this.createDebugMarker(mockTarget.position, 0x00ff00, 2.0);
    } else {
      console.error('Failed to fire test projectile');
    }
  }

  testDamageSystem() {
    console.log('Testing damage system...');
    
    if (!window.voxelDamageSystem || !window.activeHumanShips.size) {
      console.error('Damage system or ships not available');
      return;
    }
    
    // Get first human ship for testing
    const firstShip = Array.from(window.activeHumanShips.values())[0];
    if (firstShip && firstShip.mesh) {
      const damageResult = window.voxelDamageSystem.applyDamage(
        firstShip.mesh, 
        25, 
        new THREE.Vector3(0, 0, 0)
      );
      
      console.log('Damage test result:', damageResult);
      this.createDebugText('DAMAGE TEST', firstShip.position.clone().add(new THREE.Vector3(0, 5, 0)));
    }
  }

  testRandomShipGeneration() {
    console.log('Testing realistic ship generation...');
    
    if (!window.RealisticShipGenerator) {
      console.error('RealisticShipGenerator not available');
      return;
    }
    
    const generator = new window.RealisticShipGenerator();
    
    // Generate 5 different realistic ships for testing
    for (let i = 0; i < 5; i++) {
      const testShip = generator.generateRealisticShip(`test_realistic_${i}`, 'human');
      testShip.position.set(i * 20, 0, -60);
      
      if (window.scene) {
        window.scene.add(testShip);
        console.log(`Generated realistic ship ${i}: class=${testShip.userData.shipClass}, role=${testShip.userData.blueprint.role}, mass=${testShip.userData.blueprint.mass}kg, health=${testShip.userData.totalHealth}`);
        
        // Add debug text for each ship
        this.createDebugText(
          `${testShip.userData.shipClass.toUpperCase()}`, 
          testShip.position.clone().add(new THREE.Vector3(0, 10, 0))
        );
      }
    }
    
    console.log('Realistic ship generation test completed');
  }

  testPerformanceLoad() {
    console.log('Performance test temporarily disabled to fix loading issue');
    console.log('Run debugStatus() to check system status');
  }

  runAllTests() {
    console.log('Running all debug tests...');
    this.logSystemStatus();
    this.testVoxelShipCreation();
    this.testWeaponSystem();
    this.testDamageSystem();
    this.testRandomShipGeneration();
    this.testPerformanceLoad();
  }

  updateDebugInfo(key, value = 1) {
    this.debugInfo[key] += value;
  }

  getDebugInfo() {
    return { ...this.debugInfo };
  }

  toggleDebug() {
    this.enabled = !this.enabled;
    console.log(`Debug system ${this.enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create global debug instance
window.debugSystem = new DebugSystem();

// Add debug commands to console
window.debugTests = () => window.debugSystem.runAllTests();
window.debugStatus = () => window.debugSystem.logSystemStatus();
window.toggleDebug = () => window.debugSystem.toggleDebug();
window.testRandomShips = () => window.debugSystem.testRandomShipGeneration();
// Temporarily disabled performance commands to fix loading
// window.testPerformance = () => window.debugSystem.testPerformanceLoad();
// window.optimizeNow = () => window.performanceManager?.optimizePerformance();

export { DebugSystem };
