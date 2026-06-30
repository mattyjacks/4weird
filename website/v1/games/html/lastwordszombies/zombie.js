// ==========================================
// 3. LOW-POLY ZOMBIE MODEL & LOGIC
// ==========================================
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
    
    // Physics variables
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    
    // Boundary offsets
    this.worldX = (Math.random() - 0.5) * 4.0;
    this.worldY = -1.1;
    this.worldZ = spawnZ;
    this.animTime = Math.random() * 100;
    this.fontTheme = fontTheme;

    // Decaying green flesh tones
    const fleshColors = [0x3e6648, 0x2f4d36, 0x4a7353, 0x3a5942];
    // Dirty, ragged shirt colors
    const shirtColors = [0x8f4c4c, 0x4c6a8f, 0x7c8f4c, 0x3d3d3d, 0xbf8f4c];
    // Dirty, ragged pants colors
    const pantsColors = [0x2b2b36, 0x3b3323, 0x223022, 0x1d1e26];
    
    this.fleshColor = fleshColors[Math.floor(Math.random() * fleshColors.length)];
    this.shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
    this.pantsColor = pantsColors[Math.floor(Math.random() * pantsColors.length)];
    
    this.baseTorsoColor = this.shirtColor;
    this.baseHeadColor = this.fleshColor;
    
    this.createModel();
    this.createLabel();
  }

  createModel() {
    this.group = new THREE.Group();
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
    
    // 1. Torso (Ragged shirt color)
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    const torsoMat = new THREE.MeshStandardMaterial({ color: this.shirtColor, roughness: 0.9 });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 0.55;
    this.group.add(this.torso);
    
    // 2. Head (Decaying green flesh color)
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: this.fleshColor, roughness: 0.9 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 1.25, 0);
    this.group.add(this.head);
    
    // 2b. Two separate glowing red eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-0.12, 1.3, 0.26);
    this.group.add(this.eyeL);
    
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR.position.set(0.12, 1.3, 0.26);
    this.group.add(this.eyeR);
    
    // 3. Arms (Low-poly sleeves and flesh hands stretching forward)
    const sleeveGeo = new THREE.BoxGeometry(0.14, 0.14, 0.45);
    const handGeo = new THREE.BoxGeometry(0.12, 0.12, 0.2);
    const sleeveMat = new THREE.MeshStandardMaterial({ color: this.shirtColor, roughness: 0.9 });
    const handMat = new THREE.MeshStandardMaterial({ color: this.fleshColor, roughness: 0.9 });
    
    // Left arm group
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.42, 0.8, -0.05);
    
    const leftSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    leftSleeve.position.set(0, 0, 0.225);
    this.leftArm.add(leftSleeve);
    
    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(0, 0, 0.5);
    this.leftArm.add(leftHand);
    
    this.group.add(this.leftArm);
    
    // Right arm group
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.42, 0.8, -0.05);
    
    const rightSleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    rightSleeve.position.set(0, 0, 0.225);
    this.rightArm.add(rightSleeve);
    
    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(0, 0, 0.5);
    this.rightArm.add(rightHand);
    
    this.group.add(this.rightArm);
    
    // 4. Legs & Shoes (For zombie walking animation)
    const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    const legMat = new THREE.MeshStandardMaterial({ color: this.pantsColor, roughness: 0.9 });
    const shoeGeo = new THREE.BoxGeometry(0.24, 0.1, 0.3);
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181f, roughness: 0.8 });
    
    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.18, 0.1, 0);
    
    const leftPants = new THREE.Mesh(legGeo, legMat);
    leftPants.position.y = -0.325;
    this.leftLeg.add(leftPants);
    
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.65, 0.04);
    this.leftLeg.add(leftShoe);
    
    this.group.add(this.leftLeg);
    
    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.18, 0.1, 0);
    
    const rightPants = new THREE.Mesh(legGeo, legMat);
    rightPants.position.y = -0.325;
    this.rightLeg.add(rightPants);
    
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.65, 0.04);
    this.rightLeg.add(rightShoe);
    
    this.group.add(this.rightLeg);
    
    this.scene.add(this.group);
  }

  createLabel() {
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 512;
    this.labelCanvas.height = 128;
    this.labelCtx = this.labelCanvas.getContext('2d');
    
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTexture.minFilter = THREE.LinearFilter;
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.labelTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    
    this.labelSprite = new THREE.Sprite(spriteMaterial);
    this.labelSprite.renderOrder = 999;
    
    this.labelSprite.scale.set(2.0, 0.5, 1.0);
    this.labelSprite.position.set(0, 1.9, 0);
    
    this.group.add(this.labelSprite);
    this.updateLabelTexture();
  }

  updateLabelTexture() {
    const ctx = this.labelCtx;
    const w = this.labelCanvas.width;
    const h = this.labelCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    let fontName = 'Orbitron, sans-serif';
    if (this.fontTheme === 'pixel') fontName = 'Courier New, monospace';
    if (this.fontTheme === 'cyber') fontName = 'Arial Black, sans-serif';
    
    ctx.font = `bold 44px ${fontName}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const typedText = this.word.substring(0, this.typedLength);
    const remainingText = this.word.substring(this.typedLength);
    
    const typedWidth = ctx.measureText(typedText).width;
    const remainingWidth = ctx.measureText(remainingText).width;
    const totalWidth = typedWidth + remainingWidth;
    
    let startX = (w - totalWidth) / 2;
    
    ctx.fillStyle = 'rgba(5, 5, 12, 0.85)';
    ctx.strokeStyle = this.isTargeted ? 'rgba(255, 0, 119, 0.7)' : 'rgba(0, 242, 254, 0.3)';
    ctx.lineWidth = 4;
    
    const rectX = (w - totalWidth - 40) / 2;
    const rectWidth = totalWidth + 40;
    const rectHeight = 64;
    const rectY = (h - rectHeight) / 2;
    
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 12);
    ctx.fill();
    ctx.stroke();
    
    ctx.textAlign = 'left';
    
    // Highlight typed characters in neon green
    ctx.fillStyle = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';
    ctx.fillText(typedText, startX, h / 2);
    
    // Remaining in white
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(remainingText, startX + typedWidth, h / 2);
    
    this.labelTexture.needsUpdate = true;
  }

  update(dt) {
    this.animTime += dt;
    
    if (this.isStunned) {
      this.stunDuration -= dt;
      if (this.stunDuration <= 0) {
        this.isStunned = false;
      }
    } else {
      if (this.spawnPhase) {
        this.spawnPhaseTimer -= dt;
        const directionSign = this.spawnDoorX < 0 ? 1 : -1;
        this.worldX += directionSign * 2.2 * dt; // walk inward
        this.worldZ += this.speed * 0.5 * dt; // slow forward movement
        
        if (this.spawnPhaseTimer <= 0) {
          this.spawnPhase = false;
        }
      } else {
        this.worldZ += this.speed * dt;
      }
    }
    
    // Apply physical forces
    this.worldX += this.vx * dt;
    this.worldZ += this.vz * dt;
    
    const dist = Math.abs(5.0 - this.worldZ);
    const scaleFactor = Math.max(1.0, dist / 10.0);
    this.labelSprite.scale.set(2.0 * scaleFactor, 0.5 * scaleFactor, 1.0);
    
    this.vx *= Math.pow(0.1, dt);
    this.vz *= Math.pow(0.1, dt);
    
    if (!this.spawnPhase) {
      if (this.worldX > 2.2) this.worldX = 2.2;
      if (this.worldX < -2.2) this.worldX = -2.2;
    }
    
    if (!this.isStunned) {
      const wobble = Math.sin(this.animTime * 8);
      const bobbing = Math.cos(this.animTime * 16) * 0.05;
      
      this.head.position.y = 1.25 + bobbing;
      this.leftArm.rotation.x = -Math.PI / 6 + wobble * 0.2;
      this.rightArm.rotation.x = -Math.PI / 6 - wobble * 0.2;
      
      // Swing legs!
      this.leftLeg.rotation.x = wobble * 0.45;
      this.rightLeg.rotation.x = -wobble * 0.45;
      
      this.group.rotation.y = wobble * 0.05;
      this.group.rotation.z = 0;
    } else {
      this.group.rotation.z = Math.sin(this.animTime * 40) * 0.1;
    }
    
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
  }

  setTargeted(targeted) {
    if (this.isTargeted !== targeted) {
      this.isTargeted = targeted;
      if (targeted) {
        this.torso.material.color.setHex(0xff0055); // pink highlight
        this.head.material.color.setHex(0xff0055);
      } else {
        this.torso.material.color.setHex(this.baseTorsoColor);
        this.head.material.color.setHex(this.baseHeadColor);
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
  }
}
