class TypingController {
  constructor(stateManager, audioManager, particleManager) {
    this.state = stateManager;
    this.audio = audioManager;
    this.particles = particleManager;
    this.currentTarget = null;
    this.typedBuffer = "";
  }

  handleInput(key, zombies) {
    if (this.state.currentState !== 'playing') return;
    
    const letter = key.toLowerCase();
    if (!/^[a-z]$/.test(letter)) return; // Only allow a-z characters
    
    // Play clicking noise
    this.audio.playSFX('type');
    
    if (!this.currentTarget) {
      // Find candidate zombies (closest first on Z-axis)
      // Closer zombies have smaller Z values (approaching 0)
      const matches = zombies.filter(z => z.word.toLowerCase().startsWith(letter) && z.worldZ > 2.0);
      
      if (matches.length > 0) {
        // Sort by Z coordinate (smaller Z = closer to camera)
        matches.sort((a, b) => a.worldZ - b.worldZ);
        
        this.currentTarget = matches[0];
        this.typedBuffer = letter;
        this.currentTarget.setTargeted(true);
        this.currentTarget.setTypedLength(1);
      }
    } else {
      // We already have a target. Verify next letter.
      const nextChar = this.currentTarget.word[this.typedBuffer.length].toLowerCase();
      
      if (letter === nextChar) {
        this.typedBuffer += letter;
        this.currentTarget.setTypedLength(this.typedBuffer.length);
        
        // Completed the word?
        if (this.typedBuffer.length === this.currentTarget.word.length) {
          this.triggerExplosion(this.currentTarget, zombies);
          this.currentTarget = null;
          this.typedBuffer = "";
        }
      } else {
        // Typo! Break lock-on and clear buffer
        this.currentTarget.setTargeted(false);
        this.currentTarget.setTypedLength(0);
        this.currentTarget = null;
        this.typedBuffer = "";
        this.audio.playSFX('error');
      }
    }
  }

  triggerExplosion(zombie, zombies) {
    // 1. Particle splatter & Audio
    const explosionPos = zombie.group.position.clone();
    this.particles.spawnExplosion(explosionPos, this.state.equippedBlood);
    this.audio.playSFX('explosion');
    
    // 2. Score rewards
    this.state.addScore(100);
    this.state.addCoins(1);
    
    // Mark target dead so update loops filter it out
    zombie.isDead = true;
    
    // 3. Apply radial knockback to nearby zombies
    zombies.forEach(z => {
      if (z === zombie || z.isDead) return;
      
      const dx = z.worldX - zombie.worldX;
      const dz = z.worldZ - zombie.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      const maxRadius = 8.0; // Three.js units
      if (dist < maxRadius) {
        const force = 18.0 * (1 - dist / maxRadius);
        const angle = Math.atan2(dz, dx);
        
        // Push zombie outward
        z.vx += Math.cos(angle) * force;
        z.vz += Math.sin(angle) * force * 1.5; // push backward heavily along Z
        
        // Apply stun status
        z.isStunned = true;
        z.stunDuration = 1.0; // 1 second stun
        
        // Award minor scores for impact chain
        this.state.addScore(15);
      }
    });
  }

  reset() {
    if (this.currentTarget) {
      this.currentTarget.setTargeted(false);
      this.currentTarget.setTypedLength(0);
    }
    this.currentTarget = null;
    this.typedBuffer = "";
  }
}
