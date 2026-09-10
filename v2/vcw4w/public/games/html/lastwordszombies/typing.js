class TypingController {
  constructor(stateManager, audioManager, particleManager) {
    this.state = stateManager;
    this.audio = audioManager;
    this.particles = particleManager;
    this.currentTarget = null;
    this.typedBuffer = "";
  }

  handleInput(key, zombies) {
    if (this.state.currentState !== GameState.PLAYING) return;
    
    const letter = key.toLowerCase();
    if (!/^[a-z]$/.test(letter)) return;
    
    if (!this.currentTarget) {
      const matches = zombies.filter(z => z.word.toLowerCase().startsWith(letter) && z.worldZ < 4.8);
      if (matches.length > 0) {
        this.audio.playSFX('type');
        matches.sort((a, b) => b.worldZ - a.worldZ);
        this.currentTarget = matches[0];
        this.typedBuffer = letter;
        this.currentTarget.setTargeted(true);
        this.currentTarget.setTypedLength(1);
        
        if (window.game) {
          window.game.animateKeyboardPress(letter);
        }
      } else {
        this.audio.playSFX('error');
      }
    } else {
      const nextChar = this.currentTarget.word[this.typedBuffer.length].toLowerCase();
      if (letter === nextChar) {
        this.audio.playSFX('type');
        this.typedBuffer += letter;
        this.currentTarget.setTypedLength(this.typedBuffer.length);
        
        if (window.game) {
          window.game.animateKeyboardPress(letter);
        }
        
        if (this.typedBuffer.length === this.currentTarget.word.length) {
          this.triggerExplosion(this.currentTarget, zombies);
          this.currentTarget = null;
          this.typedBuffer = "";
        }
      } else {
        this.currentTarget.setTargeted(false);
        this.currentTarget.setTypedLength(0);
        this.currentTarget = null;
        this.typedBuffer = "";
        this.audio.playSFX('error');
      }
    }
  }

  triggerExplosion(zombie, zombies) {
    const explosionPos = zombie.group.position.clone();
    this.particles.spawnExplosion(explosionPos, this.state.equippedBlood);
    this.audio.playSFX('explosion');
    
    this.state.addScore(100);
    this.state.addCoins(1);
    this.state.waveWords.add(zombie.word.toLowerCase());
    
    zombie.isDead = true;
    
    zombies.forEach(z => {
      if (z === zombie || z.isDead) return;
      
      const dx = z.worldX - zombie.worldX;
      const dz = z.worldZ - zombie.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      const maxRadius = 8.0;
      if (dist < maxRadius) {
        const force = 18.0 * (1 - dist / maxRadius);
        const angle = Math.atan2(dz, dx);
        
        z.vx += Math.cos(angle) * force;
        z.vz += Math.sin(angle) * force * 1.5;
        
        z.isStunned = true;
        z.stunDuration = 1.0;
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
