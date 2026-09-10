// Performance Manager for High-Optimization Spaceship System
// Prevents crashes, manages memory, and ensures smooth performance

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class PerformanceManager {
  constructor() {
    this.settings = {
      maxVoxelsPerShip: 500,        // Limit voxels to prevent memory issues
      maxActiveShips: 20,           // Maximum ships in scene
      maxProjectiles: 100,          // Maximum projectiles
      lodDistance: 50,              // Distance for LOD switching
      cullingDistance: 200,         // Distance for frustum culling
      garbageCollectionInterval: 30000, // 30 seconds
      performanceMonitorInterval: 5000,  // 5 seconds
      memoryThreshold: 0.8,         // 80% memory usage warning
      frameTimeThreshold: 16.67     // 60 FPS target
    };
    
    this.stats = {
      frameTime: 0,
      memoryUsage: 0,
      activeVoxels: 0,
      activeShips: 0,
      activeProjectiles: 0,
      lastGarbageCollection: Date.now(),
      lastPerformanceCheck: Date.now()
    };
    
    this.lodLevels = {
      high: { voxelSize: 0.3, detail: 1.0 },
      medium: { voxelSize: 0.6, detail: 0.5 },
      low: { voxelSize: 1.2, detail: 0.25 }
    };
    
    this.objectPool = new Map();
    this.geometryCache = new Map();
    this.materialCache = new Map();
    
    this.isOptimizing = false;
    this.performanceCallbacks = [];
    
    this.initializePerformanceMonitoring();
  }

  initializePerformanceMonitoring() {
    // Monitor frame rate
    this.lastFrameTime = performance.now();
    
    // Monitor memory usage
    this.monitorMemory();
    
    // Set up performance intervals
    setInterval(() => this.performanceCheck(), this.settings.performanceMonitorInterval);
    setInterval(() => this.garbageCollect(), this.settings.garbageCollectionInterval);
  }

  monitorMemory() {
    if (performance.memory) {
      this.stats.memoryUsage = performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize;
    }
  }

  performanceCheck() {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    this.stats.frameTime = frameTime;
    this.monitorMemory();
    
    // Check if performance is degrading
    if (frameTime > this.settings.frameTimeThreshold * 2) {
      this.optimizePerformance();
    }
    
    // Check memory usage
    if (this.stats.memoryUsage > this.settings.memoryThreshold) {
      this.emergencyCleanup();
    }
    
    // Notify callbacks
    this.performanceCallbacks.forEach(callback => {
      try {
        callback(this.stats);
      } catch (error) {
        console.warn('Performance callback error:', error);
      }
    });
  }

  optimizePerformance() {
    if (this.isOptimizing) return;
    this.isOptimizing = true;
    
    console.log('Performance optimization triggered');
    
    try {
      // Reduce LOD for distant objects
      this.reduceLOD();
      
      // Clean up unused objects
      this.cleanupUnusedObjects();
      
      // Optimize active ships
      this.optimizeActiveShips();
      
      // Reduce particle effects
      this.reduceParticleEffects();
      
    } catch (error) {
      console.error('Performance optimization error:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  emergencyCleanup() {
    console.warn('Emergency cleanup triggered - high memory usage');
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear caches
    this.geometryCache.clear();
    this.materialCache.clear();
    
    // Remove distant objects
    this.removeDistantObjects();
    
    // Reset object pool
    this.objectPool.clear();
  }

  reduceLOD() {
    if (!window.scene) return;
    
    window.scene.traverse((object) => {
      if (object.userData && object.userData.voxels) {
        const distance = this.getDistanceToCamera(object);
        
        if (distance > this.settings.lodDistance * 2) {
          this.setLODLevel(object, 'low');
        } else if (distance > this.settings.lodDistance) {
          this.setLODLevel(object, 'medium');
        } else {
          this.setLODLevel(object, 'high');
        }
      }
    });
  }

  setLODLevel(shipGroup, level) {
    const lodConfig = this.lodLevels[level];
    
    if (shipGroup.currentLOD === level) return;
    
    shipGroup.currentLOD = level;
    
    // Update voxel visibility based on LOD
    if (shipGroup.userData.voxels) {
      shipGroup.userData.voxels.forEach((voxel, index) => {
        const shouldShow = index % Math.floor(1 / lodConfig.detail) === 0;
        voxel.visible = shouldShow;
      });
    }
  }

  cleanupUnusedObjects() {
    if (!window.scene) return;
    
    const objectsToRemove = [];
    
    window.scene.traverse((object) => {
      // Remove objects too far from camera
      const distance = this.getDistanceToCamera(object);
      if (distance > this.settings.cullingDistance) {
        objectsToRemove.push(object);
      }
      
      // Remove destroyed objects
      if (object.userData && object.userData.destroyed) {
        objectsToRemove.push(object);
      }
    });
    
    objectsToRemove.forEach(object => {
      if (object.parent) {
        object.parent.remove(object);
      }
      this.disposeObject(object);
    });
  }

  optimizeActiveShips() {
    if (!window.activeHumanShips) return;
    
    // Limit number of active ships
    if (window.activeHumanShips.size > this.settings.maxActiveShips) {
      const shipsToRemove = Array.from(window.activeHumanShips.values())
        .slice(this.settings.maxActiveShips);
      
      shipsToRemove.forEach(ship => {
        if (ship.mesh && ship.mesh.parent) {
          ship.mesh.parent.remove(ship.mesh);
        }
        window.activeHumanShips.delete(ship.id);
      });
    }
  }

  reduceParticleEffects() {
    // Reduce trail particles
    if (window.weaponSystem) {
      const projectiles = window.weaponSystem.projectiles || [];
      projectiles.forEach(projectile => {
        if (projectile.userData.trail) {
          // Limit trail length
          if (projectile.userData.trail.length > 5) {
            const toRemove = projectile.userData.trail.splice(5);
            toRemove.forEach(trail => {
              if (trail.parent) {
                trail.parent.remove(trail);
              }
            });
          }
        }
      });
    }
  }

  removeDistantObjects() {
    if (!window.scene) return;
    
    window.scene.traverse((object) => {
      const distance = this.getDistanceToCamera(object);
      if (distance > this.settings.cullingDistance * 2) {
        if (object.parent) {
          object.parent.remove(object);
        }
        this.disposeObject(object);
      }
    });
  }

  garbageCollect() {
    const now = Date.now();
    
    if (now - this.stats.lastGarbageCollection < this.settings.garbageCollectionInterval) {
      return;
    }
    
    console.log('Performing garbage collection');
    
    // Clear old geometries
    this.geometryCache.forEach((geometry, key) => {
      if (now - geometry.lastUsed > 60000) { // 1 minute
        geometry.dispose();
        this.geometryCache.delete(key);
      }
    });
    
    // Clear old materials
    this.materialCache.forEach((material, key) => {
      if (now - material.lastUsed > 60000) { // 1 minute
        material.dispose();
        this.materialCache.delete(key);
      }
    });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    this.stats.lastGarbageCollection = now;
  }

  getDistanceToCamera(object) {
    if (!window.camera) return 0;
    
    return object.position.distanceTo(window.camera.position);
  }

  getCachedGeometry(type, params) {
    const key = `${type}_${JSON.stringify(params)}`;
    
    if (this.geometryCache.has(key)) {
      const geometry = this.geometryCache.get(key);
      geometry.lastUsed = Date.now();
      return geometry;
    }
    
    // Create new geometry
    let geometry;
    switch (type) {
      case 'box':
        geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(params.radius, params.segments, params.segments);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    }
    
    geometry.lastUsed = Date.now();
    this.geometryCache.set(key, geometry);
    
    return geometry;
  }

  getCachedMaterial(type, color) {
    const key = `${type}_${color}`;
    
    if (this.materialCache.has(key)) {
      const material = this.materialCache.get(key);
      material.lastUsed = Date.now();
      return material;
    }
    
    // Create new material
    let material;
    switch (type) {
      case 'standard':
        material = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.8,
          roughness: 0.3
        });
        break;
      case 'basic':
        material = new THREE.MeshBasicMaterial({
          color: color
        });
        break;
      default:
        material = new THREE.MeshStandardMaterial({
          color: color
        });
    }
    
    material.lastUsed = Date.now();
    this.materialCache.set(key, material);
    
    return material;
  }

  disposeObject(object) {
    if (object.geometry) {
      object.geometry.dispose();
    }
    
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
    
    if (object.children) {
      object.children.forEach(child => this.disposeObject(child));
    }
  }

  createOptimizedVoxel(type, color, x, y, z) {
    // Use cached geometries and materials
    const geometry = this.getCachedGeometry('box', { width: 0.3, height: 0.3, depth: 0.3 });
    const material = this.getCachedMaterial('standard', color);
    
    const voxel = new THREE.Mesh(geometry, material);
    voxel.position.set(x, y, z);
    
    // Add optimized userData
    voxel.userData = {
      health: 100,
      maxHealth: 100,
      type: type,
      originalColor: color,
      optimized: true
    };
    
    return voxel;
  }

  getPerformanceStats() {
    return {
      ...this.stats,
      memoryUsageMB: Math.round(this.stats.memoryUsage * 1000),
      fps: Math.round(1000 / this.stats.frameTime),
      cacheSizes: {
        geometries: this.geometryCache.size,
        materials: this.materialCache.size,
        objects: this.objectPool.size
      }
    };
  }

  addPerformanceCallback(callback) {
    this.performanceCallbacks.push(callback);
  }

  removePerformanceCallback(callback) {
    const index = this.performanceCallbacks.indexOf(callback);
    if (index > -1) {
      this.performanceCallbacks.splice(index, 1);
    }
  }

  // Optimized ship generation with performance constraints
  generateOptimizedShip(shipGenerator, shipId, faction) {
    // Check performance before generation
    if (this.stats.memoryUsage > this.settings.memoryThreshold * 0.9) {
      console.warn('High memory usage - skipping ship generation');
      return null;
    }
    
    // Generate ship with voxel limit
    const ship = shipGenerator.generateRealisticShip(shipId, faction);
    
    // Limit voxels if necessary
    if (ship.userData.voxels.length > this.settings.maxVoxelsPerShip) {
      this.limitVoxels(ship, this.settings.maxVoxelsPerShip);
    }
    
    // Optimize ship for performance
    this.optimizeShip(ship);
    
    return ship;
  }

  limitVoxels(ship, maxVoxels) {
    const voxels = ship.userData.voxels;
    
    if (voxels.length <= maxVoxels) return;
    
    // Sort voxels by importance (cockpit, engines, weapons, hull)
    voxels.sort((a, b) => {
      const priority = { cockpit: 5, engine: 4, weapon: 3, structure: 2, hull: 1 };
      return (priority[b.userData.type] || 0) - (priority[a.userData.type] || 0);
    });
    
    // Remove least important voxels
    const toRemove = voxels.splice(maxVoxels);
    toRemove.forEach(voxel => {
      if (voxel.parent) {
        voxel.parent.remove(voxel);
      }
    });
    
    // Update ship stats
    ship.userData.functionalVoxels = {
      engines: voxels.filter(v => v.userData.type === 'engine').length,
      weapons: voxels.filter(v => v.userData.type === 'weapon').length,
      cockpit: voxels.filter(v => v.userData.type === 'cockpit').length,
      hull: voxels.filter(v => v.userData.type === 'hull').length,
      structure: voxels.filter(v => v.userData.type === 'structure').length
    };
  }

  optimizeShip(ship) {
    // Add performance optimizations
    ship.userData.optimized = true;
    ship.currentLOD = 'high';
    
    // Enable frustum culling
    ship.frustumCulled = true;
    
    // Optimize voxels
    ship.userData.voxels.forEach(voxel => {
      voxel.frustumCulled = true;
      
      // Merge similar materials (optimization)
      if (voxel.material && !voxel.material._optimized) {
        voxel.material._optimized = true;
      }
    });
  }
}

// Create global performance manager
window.performanceManager = new PerformanceManager();

export { PerformanceManager };
