// ==========================================
// 3. LOW-POLY ZOMBIE MODEL & LOGIC
// ==========================================
class Zombie {
  constructor(scene, word, speed, spawnZ, fontTheme, options) {
    this.scene = scene;
    this.word = word;
    this.speed = speed;

    // Status states
    this.isDead = false;
    this.isTargeted = false;
    this.typedLength = 0;
    this.isStunned = false;
    this.stunDuration = 0;

    // --- AWESOME: zombie archetypes (backwards compatible: default walker) ---
    const opt = options || {};
    this.ztype = opt.type || 'walker'; // walker | runner | brute | ghost | boss
    this.scoreValue = opt.scoreValue || 100;
    this.coinValue = opt.coinValue != null ? opt.coinValue : 1;
    this.damage = opt.damage || 20;
    this.knockResist = opt.knockResist || 0; // 0..0.9 reduces shockwave push
    this.hitFlash = 0; // keystroke feedback timer
    this.strafePhase = Math.random() * Math.PI * 2;
    this.dangerPulse = 0;
    
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

    // Archetype tuning (visual + gameplay identity)
    this.archetypeScale = 1.0;
    this.eyeColor = 0xff174d;
    this.eyeIntensity = 2.8;
    if (this.ztype === 'runner') {
      this.archetypeScale = 0.92;
      this.eyeColor = 0xff9100;
      this.eyeIntensity = 3.4;
    } else if (this.ztype === 'brute') {
      this.archetypeScale = 1.45;
      this.eyeColor = 0xbb00ff;
      this.eyeIntensity = 3.2;
    } else if (this.ztype === 'ghost') {
      this.archetypeScale = 1.0;
      this.eyeColor = 0x00f2fe;
      this.eyeIntensity = 3.6;
    } else if (this.ztype === 'boss') {
      this.archetypeScale = 1.9;
      this.eyeColor = 0xff0000;
      this.eyeIntensity = 4.5;
    }

    this.createModel();
    this.createLabel();
  }

  createModel() {
    this.group = new THREE.Group();
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
    this.group.scale.setScalar(this.archetypeScale || 1);
    
    // Layered, low-poly body: readable at distance without a costly character asset.
    const torsoGeo = new THREE.CylinderGeometry(0.31, 0.4, 0.9, 7);
    const torsoMat = new THREE.MeshStandardMaterial({ color: this.shirtColor, roughness: 0.82, metalness: 0.08 });
    this.torso = new THREE.Mesh(torsoGeo, torsoMat);
    this.torso.position.y = 0.55;
    this.group.add(this.torso);
    
    // A faceted head, jaw, and exposed neck give the zombies a stronger silhouette.
    const headGeo = new THREE.IcosahedronGeometry(0.31, 1);
    const headMat = new THREE.MeshStandardMaterial({ color: this.fleshColor, roughness: 0.78, metalness: 0.04 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 1.25, 0);
    this.group.add(this.head);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 6), headMat);
    neck.position.set(0, 0.98, 0);
    this.group.add(neck);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.28), new THREE.MeshStandardMaterial({ color: 0x233c2b, roughness: 1 }));
    jaw.position.set(0, 1.08, 0.14);
    jaw.rotation.x = -0.14;
    this.group.add(jaw);
    
    // 2b. Two separate glowing eyes (color varies by archetype)
    const eyeMat = new THREE.MeshStandardMaterial({ color: this.eyeColor, emissive: this.eyeColor, emissiveIntensity: this.eyeIntensity, roughness: 0.25 });
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 6);
    
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-0.12, 1.3, 0.26);
    this.group.add(this.eyeL);
    
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR.position.set(0.12, 1.3, 0.26);
    this.group.add(this.eyeR);

    // Torn shirt panel and a faint bio-luminescent wound keep the model legible in dark levels.
    const wound = new THREE.Mesh(
      new THREE.CircleGeometry(0.11, 8),
      new THREE.MeshBasicMaterial({ color: 0x78ff8a, transparent: true, opacity: 0.8 })
    );
    wound.position.set(0.13, 0.57, 0.205);
    this.group.add(wound);
    
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

    // --- Archetype flair: spikes / crown / ghost shimmer ---
    if (this.ztype === 'brute' || this.ztype === 'boss') {
      const spikeMat = new THREE.MeshStandardMaterial({
        color: this.ztype === 'boss' ? 0xffd700 : 0x2a2a33,
        emissive: this.ztype === 'boss' ? 0xff5500 : 0xbb00ff,
        emissiveIntensity: this.ztype === 'boss' ? 1.2 : 0.7,
        roughness: 0.4, metalness: 0.6
      });
      const spikes = this.ztype === 'boss' ? 5 : 3;
      for (let s = 0; s < spikes; s++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 5), spikeMat);
        const ang = (s / spikes) * Math.PI * 2;
        spike.position.set(Math.cos(ang) * 0.28, 1.02, Math.sin(ang) * 0.28);
        spike.rotation.z = -Math.cos(ang) * 0.5;
        spike.rotation.x = Math.sin(ang) * 0.5;
        this.group.add(spike);
      }
      // Boss crown ring
      if (this.ztype === 'boss') {
        const crown = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.045, 8, 12),
          new THREE.MeshBasicMaterial({ color: 0xffd700 })
        );
        crown.position.set(0, 1.58, 0);
        crown.rotation.x = Math.PI / 2 - 0.15;
        this.group.add(crown);
      }
    }
    if (this.ztype === 'ghost') {
      // Phantom shimmer: translucent body + halo ring.
      // Eyes stay opaque so the glow reads at distance and shared
      // emissive eyeMat isn't dimmed for every ghost.
      this.group.traverse(child => {
        if (child === this.eyeL || child === this.eyeR) return;
        if (child.isMesh && child.material && child.material.transparent !== true) {
          child.material.transparent = true;
          child.material.opacity = 0.82;
        }
      });
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.02, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      halo.position.set(0, 0.15, 0);
      halo.rotation.x = Math.PI / 2;
      this.group.add(halo);
      this.halo = halo;
    }
    // Runners lean forward aggressively
    if (this.ztype === 'runner') {
      this.group.rotation.x = 0.12;
    }
    
    this.scene.add(this.group);
    this.group.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
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

    // Type icon prefix: instant readability at a glance
    let prefix = '';
    let borderColor = 'rgba(0, 242, 254, 0.3)';
    if (this.ztype === 'runner') { prefix = '» '; borderColor = 'rgba(255,145,0,0.8)'; }
    if (this.ztype === 'brute') { prefix = '◆ '; borderColor = 'rgba(187,0,255,0.8)'; }
    if (this.ztype === 'ghost') { prefix = '◊ '; borderColor = 'rgba(0,242,254,0.85)'; }
    if (this.ztype === 'boss') { prefix = '♛ '; borderColor = 'rgba(255,215,0,0.9)'; }
    if (this.isTargeted) borderColor = 'rgba(255, 0, 119, 0.9)';

    let fontName = 'Orbitron, sans-serif';
    if (this.fontTheme === 'pixel') fontName = 'Courier New, monospace';
    if (this.fontTheme === 'cyber') fontName = 'Arial Black, sans-serif';
    
    ctx.font = `bold 44px ${fontName}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // NOTE: prefix is decorative - typing progress maps to the raw word only.
    const cleanTyped = this.word.substring(0, this.typedLength);
    const cleanRemaining = this.word.substring(this.typedLength);

    const prefixWidth = prefix ? ctx.measureText(prefix).width : 0;
    const typedWidth = ctx.measureText(cleanTyped).width;
    const remainingWidth = ctx.measureText(cleanRemaining).width;
    const totalWidth = prefixWidth + typedWidth + remainingWidth;

    const startX = (w - totalWidth) / 2;

    ctx.fillStyle = 'rgba(5, 5, 12, 0.9)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;

    const rectX = (w - totalWidth - 44) / 2;
    const rectWidth = totalWidth + 44;
    const rectHeight = this.ztype === 'boss' ? 76 : 64;
    const rectY = (h - rectHeight) / 2;

    ctx.beginPath();
    // roundRect is missing on older canvas - fall back to rect
    if (ctx.roundRect) ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 12);
    else ctx.rect(rectX, rectY, rectWidth, rectHeight);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';

    let cursorX = startX;
    // Type icon in its own color
    if (prefix) {
      ctx.fillStyle = this.ztype === 'boss' ? '#ffd700' : borderColor.replace(/[\d.]+\)$/, '1)');
      try { ctx.fillStyle = this.ztype === 'boss' ? '#ffd700' : '#ffb300'; } catch (e) { /* noop */ }
      if (this.ztype === 'ghost') ctx.fillStyle = '#00f2fe';
      if (this.ztype === 'runner') ctx.fillStyle = '#ff9100';
      if (this.ztype === 'brute') ctx.fillStyle = '#d580ff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(prefix, cursorX, h / 2);
      cursorX += prefixWidth;
    }

    // Dark outline under the word so white/green text stays legible
    // against bright level backgrounds. Stroked at the same coords
    // as the fills below, so typed-progress alignment is unchanged.
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(cleanTyped || ' ', cursorX, h / 2);
    ctx.strokeText(cleanRemaining || ' ', cursorX + typedWidth, h / 2);

    // Highlight typed characters in neon green
    ctx.fillStyle = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';
    ctx.fillText(cleanTyped, cursorX, h / 2);

    // Remaining in white
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(cleanRemaining, cursorX + typedWidth, h / 2);

    this.labelTexture.needsUpdate = true;
  }

  // Keystroke feedback: white flash + tiny pop. Called by TypingController.
  pingHit() {
    this.hitFlash = 0.12;
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
    // Big zombies get bigger labels - readability at distance
    const typeLabelMul = this.ztype === 'boss' ? 1.35 : this.ztype === 'brute' ? 1.15 : 1.0;
    this.labelSprite.scale.set(2.0 * scaleFactor * typeLabelMul, 0.5 * scaleFactor * typeLabelMul, 1.0);
    
    this.vx *= Math.pow(0.1, dt);
    this.vz *= Math.pow(0.1, dt);
    
    if (!this.spawnPhase) {
      if (this.worldX > 2.2) this.worldX = 2.2;
      if (this.worldX < -2.2) this.worldX = -2.2;
    }
    
    if (!this.isStunned) {
      const speedMul = this.ztype === 'runner' ? 1.7 : this.ztype === 'boss' ? 0.7 : 1.0;
      const wobble = Math.sin(this.animTime * 8 * speedMul);
      const bobbing = Math.cos(this.animTime * 16 * speedMul) * 0.05;

      // Ghosts weave side-to-side - harder to ignore, fun to hunt
      if (this.ztype === 'ghost' && !this.spawnPhase) {
        this.strafePhase += dt * 2.2;
        this.worldX += Math.sin(this.strafePhase) * 1.1 * dt;
      }
      // Runners zig-zag slightly
      if (this.ztype === 'runner' && !this.spawnPhase) {
        this.strafePhase += dt * 3.0;
        this.worldX += Math.sin(this.strafePhase) * 0.5 * dt;
      }

      this.head.position.y = 1.25 + bobbing;
      this.leftArm.rotation.x = -Math.PI / 6 + wobble * 0.2;
      this.rightArm.rotation.x = -Math.PI / 6 - wobble * 0.2;

      // Swing legs!
      this.leftLeg.rotation.x = wobble * 0.45;
      this.rightLeg.rotation.x = -wobble * 0.45;

      this.group.rotation.y = wobble * 0.05;
      this.group.rotation.z = 0;
      if (this.ztype !== 'runner') this.group.rotation.x = 0;
      if (this.halo) {
        this.halo.rotation.z += dt * 2.5;
        this.halo.position.y = 0.15 + Math.sin(this.animTime * 3) * 0.08;
      }
    } else {
      this.group.rotation.z = Math.sin(this.animTime * 40) * 0.1;
    }

    // Keystroke hit-flash: pop white then decay
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const k = Math.max(0, this.hitFlash / 0.12);
      if (this.torso && this.torso.material && this.torso.material.emissive) {
        this.torso.material.emissive.setRGB(0.6 * k, 0.6 * k, 0.6 * k);
      }
      const pop = 1 + 0.06 * k;
      this.group.scale.setScalar((this.archetypeScale || 1) * pop);
    } else {
      if (this.torso && this.torso.material && this.torso.material.emissive) {
        this.torso.material.emissive.setRGB(0, 0, 0);
      }
      // Always restore scale when the flash ends - a zombie stunned
      // mid-flash must not stay frozen at the popped size.
      this.group.scale.setScalar(this.archetypeScale || 1);
    }

    // Danger proximity: pulse red when about to breach (worldZ > 0.5)
    if (this.worldZ > 0.5 && !this.isDead) {
      this.dangerPulse += dt * 8;
      const glow = 0.5 + 0.5 * Math.sin(this.dangerPulse);
      if (this.eyeL) this.eyeL.scale.setScalar(1 + glow * 0.6);
      if (this.eyeR) this.eyeR.scale.setScalar(1 + glow * 0.6);
    } else if (this.eyeL) {
      this.eyeL.scale.setScalar(1);
      if (this.eyeR) this.eyeR.scale.setScalar(1);
    }

    this.group.position.set(this.worldX, this.worldY, this.worldZ);
  }

  setTargeted(targeted) {
    if (this.isTargeted !== targeted) {
      this.isTargeted = targeted;
      if (targeted) {
        const hl = this.ztype === 'boss' ? 0xffd700 : 0xff0055;
        this.torso.material.color.setHex(hl);
        this.head.material.color.setHex(hl);
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
    // CanvasTextures are GPU resources too - free the label explicitly
    if (this.labelTexture) this.labelTexture.dispose();
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
