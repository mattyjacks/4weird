class Particle {
  constructor(scene, position, color, velocity, size, decay) {
    this.scene = scene;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 1.0
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    this.mesh.position.x += (Math.random() - 0.5) * 0.5;
    this.mesh.position.y += (Math.random() - 0.5) * 0.5;
    this.mesh.position.z += (Math.random() - 0.5) * 0.5;
    
    this.scene.add(this.mesh);
    
    this.velocity = velocity;
    this.gravity = -9.8;
    this.life = 1.0;
    this.decay = decay;
  }

  update(dt) {
    this.velocity.y += this.gravity * dt;
    this.mesh.position.addScaledVector(this.velocity, dt);
    
    this.mesh.rotation.x += this.velocity.y * dt * 0.5;
    this.mesh.rotation.y += this.velocity.x * dt * 0.5;
    
    this.life -= this.decay * dt;
    this.mesh.material.opacity = Math.max(0, this.life);
    
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

class ShockwaveRing {
  constructor(scene, position, color) {
    this.scene = scene;
    const geometry = new THREE.RingGeometry(0.1, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    // Lay flat-ish so it reads as a ground shockwave from the player view
    this.mesh.rotation.x = -Math.PI / 2 + 0.35;
    this.scene.add(this.mesh);

    this.radius = 0.2;
    this.maxRadius = 3.5;
    this.life = 1.0;
    this.speed = 9.0;
    // Second inner ring for a richer blast
    const inner = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.1, 32),
      material.clone()
    );
    inner.position.copy(position);
    inner.rotation.x = -Math.PI / 2 + 0.35;
    this.scene.add(inner);
    this.inner = inner;
  }

  update(dt) {
    this.radius += this.speed * dt;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.RingGeometry(this.radius * 0.82, this.radius, 32);
    if (this.inner) {
      const r2 = this.radius * 0.55;
      this.inner.geometry.dispose();
      this.inner.geometry = new THREE.RingGeometry(r2 * 0.8, r2, 32);
      this.inner.material.opacity = Math.max(0, this.life * 0.7);
    }

    this.life -= 1.8 * dt;
    this.mesh.material.opacity = Math.max(0, this.life);

    return this.life > 0 && this.radius < this.maxRadius + 2;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    if (this.inner) {
      this.scene.remove(this.inner);
      this.inner.geometry.dispose();
      this.inner.material.dispose();
    }
  }
}

// Instant laser tracer from the player keyboard to a killed zombie.
// Purely cosmetic: fades in ~120ms, additive so it pops on dark levels.
class TracerBeam {
  constructor(scene, from, to, color) {
    this.scene = scene;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = Math.max(0.5, dir.length());
    const geo = new THREE.CylinderGeometry(0.012, 0.03, len, 6, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color || 0x00f2fe),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(from).addScaledVector(dir, 0.5);
    // Orient cylinder (default +Y) along dir
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.scene.add(this.mesh);
    this.life = 1.0;
  }
  update(dt) {
    this.life -= 8.0 * dt;
    this.mesh.material.opacity = Math.max(0, this.life * 0.95);
    const s = Math.max(0.15, this.life);
    this.mesh.scale.set(s, 1, s);
    return this.life > 0;
  }
  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

// Floating 3D score / combo text that rises and fades.
class FloatingText {
  constructor(scene, position, text, color, big) {
    this.scene = scene;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.font = `900 ${big ? 84 : 64}px Orbitron, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 18;
    ctx.shadowColor = color || '#00ff66';
    ctx.fillStyle = color || '#ffffff';
    ctx.fillText(String(text).slice(0, 14), 256, 80);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    this.sprite = new THREE.Sprite(mat);
    const scale = big ? 1.6 : 1.0;
    this.sprite.scale.set(2.2 * scale, 0.69 * scale, 1);
    this.sprite.renderOrder = 1000;
    this.sprite.position.copy(position);
    this.scene.add(this.sprite);
    this.life = 1.0;
    this.vel = 1.6;
  }
  update(dt) {
    this.life -= 1.1 * dt;
    this.sprite.position.y += this.vel * dt;
    this.vel *= Math.pow(0.25, dt);
    this.sprite.material.opacity = Math.max(0, Math.min(1, this.life * 1.4));
    return this.life > 0;
  }
  destroy() {
    this.scene.remove(this.sprite);
    if (this.sprite.material.map) this.sprite.material.map.dispose();
    this.sprite.material.dispose();
  }
}

// Swirling spawn portal flash at a doorway when a zombie emerges.
class SpawnPortal {
  constructor(scene, position, color) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color || 0x00ffcc),
      transparent: true, opacity: 0.85, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.rings = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.25 + i * 0.22, 0.33 + i * 0.22, 24), mat.clone());
      m.position.y = 0.4 + i * 0.35;
      m.rotation.x = -Math.PI / 2 + 0.2;
      this.group.add(m);
      this.rings.push(m);
    }
    this.scene.add(this.group);
    this.life = 1.0;
  }
  update(dt) {
    this.life -= 1.6 * dt;
    const t = 1 - this.life;
    this.rings.forEach((r, i) => {
      const s = 1 + t * (1.2 + i * 0.4);
      r.scale.set(s, s, s);
      r.material.opacity = Math.max(0, this.life * (0.9 - i * 0.2));
      r.rotation.z += dt * (2 + i);
    });
    return this.life > 0;
  }
  destroy() {
    this.rings.forEach(r => { r.geometry.dispose(); r.material.dispose(); });
    this.scene.remove(this.group);
  }
}

class ParticleManager {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.state = stateManager;
    this.particles = [];
    this.rings = [];
    this.tracers = [];
    this.floaters = [];
    this.portals = [];
  }

  bloodColor(name) {
    if (name === 'plasma') return '#00ccff';
    if (name === 'inferno') return '#ff0055';
    if (name === 'void') return '#bb00ff';
    if (name === 'gold') return '#fcf003';
    if (name === 'toxic') return '#a3ff00';
    return '#00ff66';
  }

  spawnExplosion(position, colorName) {
    const hexColor = this.bloodColor(colorName);
    
    const count = this.state.ultraParticles ? 40 : 15;
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const speed = 2.0 + Math.random() * 6.0;
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta) + 2.0;
      const vz = speed * Math.cos(phi);
      
      const size = 0.08 + Math.random() * 0.15;
      const decay = 0.8 + Math.random() * 1.0;
      
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
    
    const ring = new ShockwaveRing(this.scene, position, hexColor);
    this.rings.push(ring);

    // Extra flash sparks shooting upward — sells the "overload" pop
    const sparkCount = this.state.ultraParticles ? 14 : 6;
    for (let i = 0; i < sparkCount; i++) {
      const p = new Particle(
        this.scene,
        position,
        '#ffffff',
        new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 7, (Math.random() - 0.5) * 8),
        0.05 + Math.random() * 0.06,
        1.6 + Math.random()
      );
      this.particles.push(p);
    }
  }

  spawnTracer(from, to, color) {
    if (!from || !to) return;
    this.tracers.push(new TracerBeam(this.scene, from.clone ? from.clone() : from, to.clone ? to.clone() : to, color || 0x00f2fe));
  }

  spawnFloatingText(position, text, color, big) {
    this.floaters.push(new FloatingText(this.scene, position.clone ? position.clone() : position, text, color, big));
  }

  spawnPortal(position, color) {
    this.portals.push(new SpawnPortal(this.scene, position.clone ? position.clone() : position, color || 0x00ffcc));
  }

  // Screen-wide celebration for wave clears (cheap: reuses box particles)
  spawnCelebration(center) {
    const colors = ['#00f2fe', '#ff0077', '#fcf003', '#00ff66', '#8b5cf6'];
    const n = this.state.ultraParticles ? 60 : 25;
    for (let i = 0; i < n; i++) {
      const p = new Particle(
        this.scene,
        center,
        colors[i % colors.length],
        new THREE.Vector3((Math.random() - 0.5) * 10, 3 + Math.random() * 8, -2 - Math.random() * 6),
        0.06 + Math.random() * 0.1,
        0.7 + Math.random() * 0.8
      );
      this.particles.push(p);
    }
  }

  update(dt) {
    this.trim();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const active = this.particles[i].update(dt);
      if (!active) {
        this.particles[i].destroy();
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const active = this.rings[i].update(dt);
      if (!active) {
        this.rings[i].destroy();
        this.rings.splice(i, 1);
      }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      if (!this.tracers[i].update(dt)) {
        this.tracers[i].destroy();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      if (!this.floaters[i].update(dt)) {
        this.floaters[i].destroy();
        this.floaters.splice(i, 1);
      }
    }
    for (let i = this.portals.length - 1; i >= 0; i--) {
      if (!this.portals[i].update(dt)) {
        this.portals[i].destroy();
        this.portals.splice(i, 1);
      }
    }
  }

  // Hard caps: long sessions can never run away on memory/GPU
  trim() {
    while (this.particles.length > 400) {
      const p = this.particles.shift();
      if (p) p.destroy();
    }
    while (this.floaters.length > 24) {
      const f = this.floaters.shift();
      if (f) f.destroy();
    }
    while (this.tracers.length > 12) {
      const t = this.tracers.shift();
      if (t) t.destroy();
    }
    while (this.portals.length > 8) {
      const p = this.portals.shift();
      if (p) p.destroy();
    }
  }

  clear() {
    this.particles.forEach(p => p.destroy());
    this.rings.forEach(r => r.destroy());
    this.tracers.forEach(t => t.destroy());
    this.floaters.forEach(f => f.destroy());
    this.portals.forEach(p => p.destroy());
    this.particles = [];
    this.rings = [];
    this.tracers = [];
    this.floaters = [];
    this.portals = [];
  }
}
