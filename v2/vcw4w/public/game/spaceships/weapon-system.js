// Weapon System for AI Combat
// Handles weapon firing, projectiles, and combat effects

// THREE.js is loaded globally via CDN in index.html
const THREE = window.THREE;

class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.weaponTypes = {
      laser: { damage: 25, speed: 60, color: 0x00ff00, cooldown: 2000 },
      plasma: { damage: 40, speed: 45, color: 0xff00ff, cooldown: 3000 },
      missile: { damage: 60, speed: 30, color: 0xff6600, cooldown: 4000 },
      rapid: { damage: 15, speed: 80, color: 0x00ffff, cooldown: 500 }
    };
  }

  fireWeapon(ship, target, options = {}) {
    const weaponType = options.type || 'laser';
    const weaponConfig = this.weaponTypes[weaponType];
    
    if (!weaponConfig) {
      console.warn(`Unknown weapon type: ${weaponType}`);
      return null;
    }

    const projectile = this.createProjectile(ship, target, weaponConfig, options);
    if (projectile) {
      this.projectiles.push(projectile);
      this.createMuzzleFlash(ship.position, weaponConfig.color);
    }
    
    return projectile;
  }

  createProjectile(ship, target, weaponConfig, options) {
    const projectileGeom = options.geometry || new THREE.SphereGeometry(0.3, 8, 8);
    const projectileMat = new THREE.MeshBasicMaterial({
      color: options.color || weaponConfig.color,
      transparent: true,
      opacity: 0.9
    });
    
    const projectile = new THREE.Mesh(projectileGeom, projectileMat);
    projectile.position.copy(ship.position);
    
    // Calculate direction to target with prediction
    const direction = this.calculateInterceptDirection(ship.position, target.position, target.velocity || [0, 0, 0], weaponConfig.speed);
    
    projectile.userData = {
      velocity: direction.multiplyScalar(weaponConfig.speed),
      owner: ship.id,
      damage: options.damage || weaponConfig.damage,
      weaponType: weaponConfig.weaponType || weaponType,
      lifetime: 3000,
      creationTime: Date.now(),
      trail: []
    };
    
    this.scene.add(projectile);
    return projectile;
  }

  calculateInterceptDirection(firePos, targetPos, targetVel, projectileSpeed) {
    const firePosition = firePos instanceof THREE.Vector3 ? firePos.clone() : new THREE.Vector3(...firePos);
    const targetPosition = targetPos instanceof THREE.Vector3 ? targetPos.clone() : new THREE.Vector3(...targetPos);
    const targetVelocity = targetVel instanceof THREE.Vector3 ? targetVel.clone() : new THREE.Vector3(...targetVel);
    
    const relativePosition = new THREE.Vector3().subVectors(targetPosition, firePosition);
    const distance = relativePosition.length();
    
    // Simple prediction - assume target continues current velocity
    const timeToIntercept = distance / projectileSpeed;
    const predictedPosition = new THREE.Vector3().addVectors(targetPosition, targetVelocity.multiplyScalar(timeToIntercept));
    
    const direction = new THREE.Vector3().subVectors(predictedPosition, firePosition).normalize();
    return direction;
  }

  createMuzzleFlash(position, color) {
    const flashGeom = new THREE.SphereGeometry(0.5, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });
    
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.copy(position);
    this.scene.add(flash);
    
    // Animate and remove flash
    let scale = 1;
    let opacity = 0.8;
    
    const animate = () => {
      scale += 0.1;
      opacity *= 0.8;
      
      flash.scale.set(scale, scale, scale);
      flash.material.opacity = opacity;
      
      if (opacity > 0.01) {
        requestAnimationFrame(animate);
      } else if (flash.parent) {
        flash.parent.remove(flash);
      }
    };
    
    requestAnimationFrame(animate);
  }

  updateProjectiles(dt, activeAliens, activeHumanShips) {
    const projectilesToRemove = [];
    
    this.projectiles.forEach((projectile, index) => {
      // Update position
      projectile.position.add(projectile.userData.velocity.clone().multiplyScalar(dt));
      
      // Add trail effect
      if (projectile.userData.trail.length > 10) {
        const oldTrail = projectile.userData.trail.shift();
        if (oldTrail.parent) {
          oldTrail.parent.remove(oldTrail);
        }
      }
      
      const trailGeom = new THREE.SphereGeometry(0.1, 4, 4);
      const trailMat = new THREE.MeshBasicMaterial({
        color: projectile.material.color,
        transparent: true,
        opacity: 0.3
      });
      
      const trail = new THREE.Mesh(trailGeom, trailMat);
      trail.position.copy(projectile.position);
      projectile.userData.trail.push(trail);
      this.scene.add(trail);
      
      // Check lifetime
      const age = Date.now() - projectile.userData.creationTime;
      if (age > projectile.userData.lifetime) {
        projectilesToRemove.push(index);
        return;
      }
      
      // Check collisions
      const hit = this.checkCollisions(projectile, activeAliens, activeHumanShips);
      if (hit) {
        this.createImpactEffect(projectile.position, projectile.material.color);
        projectilesToRemove.push(index);
        
        // Apply damage through voxel damage system if available
        if (window.voxelDamageSystem && hit.target.mesh.userData.voxels) {
          const damageResult = window.voxelDamageSystem.applyDamage(
            hit.target.mesh, 
            projectile.userData.damage, 
            projectile.position
          );
          
          // Update target health
          if (hit.target.ai) {
            hit.target.ai.health = damageResult.remainingHealth;
          } else {
            hit.target.health = damageResult.remainingHealth;
          }
          
          console.log(`Projectile hit ${hit.target.id}: ${damageResult.damageDealt.toFixed(1)} damage, ${damageResult.destroyedVoxels} voxels destroyed`);
        } else {
          // Fallback damage
          if (hit.target.ai) {
            hit.target.ai.health -= projectile.userData.damage;
          } else {
            hit.target.health -= projectile.userData.damage;
          }
        }
      }
    });
    
    // Remove dead projectiles
    projectilesToRemove.reverse().forEach(index => {
      const projectile = this.projectiles[index];
      
      // Remove trail
      projectile.userData.trail.forEach(trail => {
        if (trail.parent) {
          trail.parent.remove(trail);
        }
      });
      
      if (projectile.parent) {
        projectile.parent.remove(projectile);
      }
      
      this.projectiles.splice(index, 1);
    });
  }

  checkCollisions(projectile, activeAliens, activeHumanShips) {
    const ownerIsHuman = projectile.userData.owner.startsWith('human_');
    
    // Check against appropriate targets
    const targets = ownerIsHuman ? activeAliens : activeHumanShips;
    
    for (let [id, target] of targets) {
      if (id === projectile.userData.owner) continue; // Don't hit self
      
      const distance = projectile.position.distanceTo(target.position);
      const hitRadius = 3.0; // Collision radius
      
      if (distance < hitRadius) {
        return { target: target, distance: distance };
      }
    }
    
    return null;
  }

  createImpactEffect(position, color) {
    // Create impact particles
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeom = new THREE.OctahedronGeometry(0.1, 0);
      const particleMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
      });
      
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.position.copy(position);
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        ),
        lifetime: 1000,
        rotationSpeed: Math.random() * 0.2
      };
      
      this.scene.add(particle);
      this.animateImpactParticle(particle);
    }
    
    // Create impact flash
    const flashGeom = new THREE.SphereGeometry(1.0, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5
    });
    
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.copy(position);
    this.scene.add(flash);
    
    // Animate flash
    let scale = 0.5;
    let opacity = 0.5;
    
    const animateFlash = () => {
      scale += 0.1;
      opacity *= 0.85;
      
      flash.scale.set(scale, scale, scale);
      flash.material.opacity = opacity;
      
      if (opacity > 0.01) {
        requestAnimationFrame(animateFlash);
      } else if (flash.parent) {
        flash.parent.remove(flash);
      }
    };
    
    requestAnimationFrame(animateFlash);
  }

  animateImpactParticle(particle) {
    const animate = () => {
      if (!particle.parent) return;
      
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
      particle.rotation.x += particle.userData.rotationSpeed;
      particle.rotation.y += particle.userData.rotationSpeed;
      
      particle.userData.velocity.multiplyScalar(0.95);
      particle.material.opacity *= 0.92;
      particle.userData.lifetime -= 16;
      
      if (particle.userData.lifetime > 0) {
        requestAnimationFrame(animate);
      } else if (particle.parent) {
        particle.parent.remove(particle);
      }
    };
    
    requestAnimationFrame(animate);
  }

  clearAllProjectiles() {
    this.projectiles.forEach(projectile => {
      // Remove trails
      projectile.userData.trail.forEach(trail => {
        if (trail.parent) {
          trail.parent.remove(trail);
        }
      });
      
      if (projectile.parent) {
        projectile.parent.remove(projectile);
      }
    });
    
    this.projectiles = [];
  }

  getProjectileCount() {
    return this.projectiles.length;
  }

  getStats() {
    return {
      activeProjectiles: this.projectiles.length,
      weaponTypes: Object.keys(this.weaponTypes)
    };
  }
}

export { WeaponSystem };
