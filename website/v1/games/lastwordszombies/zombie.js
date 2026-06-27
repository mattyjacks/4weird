class Zombie {
  constructor(scene, word, speed, spawnZ, fontTheme) {
    this.scene = scene;
    this.word = word;
    this.speed = speed;
    
    // Status states
    this.isDead = false;
    this.isTargeted = false;
    this.typedLength = 0;
    this.isStunned = false;
    this.stunDuration = 0;
    
    // Physics variables (along 3D dimensions)
    this.vx = 0;
    this.vy = 0;
    this.vz = 0; // positive pushes zombie back (away from player)
    
    // Corridor boundary positions: X is roughly -2.5 to 2.5
    this.worldX = (Math.random() - 0.5) * 4.0;
    this.worldY = -1.2; // Feet level in the corridor
    this.worldZ = spawnZ;
    
    // Wobble animation timer
    this.animTime = Math.random() * 100;
    
    // Equipped font selection
    this.fontTheme = fontTheme;
    
    this.createModel();
    this.createLabel();
  }

  createModel() {
    this.group = new THREE.Group();
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
    
    // Low-poly zombie design
    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
    const torsoMat = new THREE.MeshLambertMaterial({ color: 0x22442b });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 0.5; // pivot feet at 0
    this.group.add(this.torso);
    
    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x3e6b4d });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 1.25, 0);
    this.group.add(this.head);
    
    // 3. Glowing Eyes
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.15, 1.3, -0.22);
    
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.15, 1.3, -0.22);
    
    this.group.add(this.leftEye);
    this.group.add(this.rightEye);
    
    // 4. Arms (pointing straight forward in zombie style)
    const armGeo = new THREE.BoxGeometry(0.15, 0.15, 0.7);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x3e6b4d });
    
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.4, 0.8, -0.3);
    
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.4, 0.8, -0.3);
    
    this.group.add(this.leftArm);
    this.group.add(this.rightArm);
    
    // Add to main scene
    this.scene.add(this.group);
  }

  createLabel() {
    // Generate text canvas texture
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 512;
    this.labelCanvas.height = 128;
    this.labelCtx = this.labelCanvas.getContext('2d');
    
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTexture.minFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true
    });
    
    this.labelSprite = new THREE.Sprite(spriteMaterial);
    
    // Scale label sprite
    this.labelSprite.scale.set(2.0, 0.5, 1.0);
    this.labelSprite.position.set(0, 1.9, 0); // Position above head
    
    this.group.add(this.labelSprite);
    this.updateLabelTexture();
  }

  updateLabelTexture() {
    const ctx = this.labelCtx;
    const w = this.labelCanvas.width;
    const h = this.labelCanvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    // Select Font style
    let fontName = 'Outfit, sans-serif';
    if (this.fontTheme === 'pixel') fontName = 'Courier New, monospace';
    if (this.fontTheme === 'cyber') fontName = 'Arial Black, sans-serif';
    
    ctx.font = `bold 44px ${fontName}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Get text widths
    const typedText = this.word.substring(0, this.typedLength);
    const remainingText = this.word.substring(this.typedLength);
    
    const typedWidth = ctx.measureText(typedText).width;
    const remainingWidth = ctx.measureText(remainingText).width;
    const totalWidth = typedWidth + remainingWidth;
    
    let startX = (w - totalWidth) / 2;
    
    // Background card border for readability in dark corridor
    ctx.fillStyle = 'rgba(5, 5, 12, 0.8)';
    ctx.strokeStyle = this.isTargeted ? 'rgba(255, 0, 85, 0.6)' : 'rgba(0, 204, 255, 0.2)';
    ctx.lineWidth = 4;
    
    // Rounded label backing
    const rectX = (w - totalWidth - 40) / 2;
    const rectWidth = totalWidth + 40;
    const rectHeight = 64;
    const rectY = (h - rectHeight) / 2;
    
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 12);
    ctx.fill();
    ctx.stroke();
    
    // Draw text (Split highlight)
    ctx.textAlign = 'left';
    
    // 1. Highlight typed characters in neon green (or pink if target locked but typing is active)
    ctx.fillStyle = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';
    ctx.fillText(typedText, startX, h / 2);
    
    // 2. Default white for remaining characters
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(remainingText, startX + typedWidth, h / 2);
    
    this.labelTexture.needsUpdate = true;
  }

  update(dt, playerZ) {
    this.animTime += dt;
    
    if (this.isStunned) {
      this.stunDuration -= dt;
      if (this.stunDuration <= 0) {
        this.isStunned = false;
      }
    } else {
      // Normal path: advance forward (decrease Z towards player camera at 0)
      this.worldZ -= this.speed * dt;
    }
    
    // Apply physical knockback forces
    this.worldX += this.vx * dt;
    this.worldZ += this.vz * dt;
    
    // Drag/Friction to settle forces
    this.vx *= Math.pow(0.1, dt);
    this.vz *= Math.pow(0.1, dt);
    
    // Ensure bounds inside the corridor
    if (this.worldX > 2.2) this.worldX = 2.2;
    if (this.worldX < -2.2) this.worldX = -2.2;
    
    // Wobble legs/arms animation during movement (only if not stunned)
    if (!this.isStunned) {
      const wobble = Math.sin(this.animTime * 8);
      const bobbing = Math.cos(this.animTime * 16) * 0.05;
      
      // Update geometry positions locally inside group
      this.head.position.y = 1.25 + bobbing;
      this.leftArm.rotation.x = wobble * 0.3;
      this.rightArm.rotation.x = -wobble * 0.3;
      
      // Pivot entire body slightly
      this.group.rotation.y = wobble * 0.05;
    } else {
      // Shake body if stunned
      this.group.rotation.z = Math.sin(this.animTime * 40) * 0.1;
    }
    
    // Sync 3D position
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
  }

  setTargeted(targeted) {
    if (this.isTargeted !== targeted) {
      this.isTargeted = targeted;
      
      // Highlight body mesh if locked
      if (targeted) {
        this.torso.material.color.setHex(0xff0055); // neon pink torso
        this.head.material.color.setHex(0xff0055);
      } else {
        this.torso.material.color.setHex(0x22442b); // normal green
        this.head.material.color.setHex(0x3e6b4d);
      }
      this.updateLabelTexture();
    }
  }

  setTypedLength(len) {
    if (this.typedLength !== len) {
      this.typedLength = len;
      this.updateLabelTexture();
    }
  }

  destroy() {
    this.scene.remove(this.group);
    
    // Dispose 3D mesh resources
    this.group.traverse(child => {
      if (child.isMesh || child.isSprite) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    
    this.labelTexture.dispose();
    this.labelCanvas = null;
  }
}
