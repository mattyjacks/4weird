

class Particle {
  constructor(scene, position, color, velocity, size, decay) {
    this.scene = scene;
    
    // Low poly blocky blood look
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 1.0
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    // Add noise to initial position
    this.mesh.position.x += (Math.random() - 0.5) * 0.5;
    this.mesh.position.y += (Math.random() - 0.5) * 0.5;
    this.mesh.position.z += (Math.random() - 0.5) * 0.5;
    
    this.scene.add(this.mesh);
    
    this.velocity = velocity;
    this.gravity = -9.8; // Falling down along Y
    this.life = 1.0;
    this.decay = decay;
  }

  update(dt) {
    // Apply gravity
    this.velocity.y += this.gravity * dt;
    
    // Apply velocity
    this.mesh.position.addScaledVector(this.velocity, dt);
    
    // Rotate particle
    this.mesh.rotation.x += this.velocity.y * dt * 0.5;
    this.mesh.rotation.y += this.velocity.x * dt * 0.5;
    
    // Fade out
    this.life -= this.decay * dt;
    this.mesh.material.opacity = Math.max(0, this.life);
    
    // Shrink particle slightly over time
    const scale = Math.max(0.1, this.life);
    this.mesh.scale.set(scale, scale, scale);
    
    return this.life > 0;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

// Visual blast shockwave ring
class ShockwaveRing {
  constructor(scene, position, color) {
    this.scene = scene;
    
    // Torus or Flat Ring
    const geometry = new THREE.RingGeometry(0.1, 0.2, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    // Face the camera (slightly offset Z to avoid clipping)
    this.mesh.rotation.x = 0;
    
    this.scene.add(this.mesh);
    
    this.radius = 0.2;
    this.maxRadius = 3.5;
    this.life = 1.0;
    this.speed = 8.0; // expand speed
  }

  update(dt) {
    this.radius += this.speed * dt;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.RingGeometry(this.radius * 0.8, this.radius, 16);
    
    this.life -= 2.0 * dt; // vanishes fast
    this.mesh.material.opacity = Math.max(0, this.life);
    
    return this.life > 0;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

class ParticleManager {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.state = stateManager;
    this.particles = [];
    this.rings = [];
  }

  spawnExplosion(position, colorName) {
    // Map blood theme color to hex values
    let hexColor = '#00ff66';
    if (colorName === 'plasma') hexColor = '#00ccff';
    if (colorName === 'inferno') hexColor = '#ff0055';
    if (colorName === 'void') hexColor = '#bb00ff';
    
    const count = this.state.ultraParticles ? 40 : 15;
    
    // 1. Spawn cubic blood particles
    for (let i = 0; i < count; i++) {
      // Direct velocity outward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const speed = 2.0 + Math.random() * 6.0;
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta) + 2.0; // blast upward slightly
      const vz = speed * Math.cos(phi);
      
      const size = 0.08 + Math.random() * 0.15;
      const decay = 0.8 + Math.random() * 1.0; // lives 0.5 to 1.25 seconds
      
      const p = new Particle(
        this.scene,
        position,
        hexColor,
        new THREE.Vector3(vx, vy, vz),
        size,
        decay
      );
      this.particles.push(p);
    }
    
    // 2. Spawn expansion ring
    const ring = new ShockwaveRing(this.scene, position, hexColor);
    this.rings.push(ring);
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const active = this.particles[i].update(dt);
      if (!active) {
        this.particles[i].destroy();
        this.particles.splice(i, 1);
      }
    }
    
    // Update rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const active = this.rings[i].update(dt);
      if (!active) {
        this.rings[i].destroy();
        this.rings.splice(i, 1);
      }
    }
  }

  clear() {
    this.particles.forEach(p => p.destroy());
    this.rings.forEach(r => r.destroy());
    this.particles = [];
    this.rings = [];
  }
}
