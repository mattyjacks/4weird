class TypingController {
  constructor(stateManager, audioManager, particleManager) {
    this.state = stateManager;
    this.audio = audioManager;
    this.particles = particleManager;
    this.currentTarget = null;
    this.typedBuffer = "";
    // Stats for end-of-run report
    this.keysHit = 0;
    this.keysMissed = 0;
    this.wordsCompleted = 0;
    this.runStartTime = 0;
    this.streak = 0;
    this.bestStreak = 0;
  }

  startRun() {
    this.keysHit = 0;
    this.keysMissed = 0;
    this.wordsCompleted = 0;
    this.runStartTime = performance.now();
    this.streak = 0;
    this.bestStreak = 0;
  }

  getWPM() {
    if (!this.runStartTime) return 0;
    // Honest clock: exclude PAUSED/GLOSSARY/menu time tracked by the state
    // manager (see StateManager.getPausedMs / runPausedMs). Falls back to
    // wall-clock when the state object predates that API.
    let paused = 0;
    try {
      if (this.state && typeof this.state.getPausedMs === 'function') {
        paused = this.state.getPausedMs() || 0;
      } else if (this.state && typeof this.state.runPausedMs === 'number') {
        paused = this.state.runPausedMs || 0;
      }
    } catch (e) { paused = 0; }
    if (!isFinite(paused) || paused < 0) paused = 0;
    const elapsed = Math.max(0, performance.now() - this.runStartTime - paused);
    const mins = Math.max(1 / 60, elapsed / 60000);
    // Standard: 5 chars = 1 word
    return Math.round((this.keysHit / 5) / mins);
  }

  getAccuracy() {
    const total = this.keysHit + this.keysMissed;
    if (!total) return 100;
    return Math.round((this.keysHit / total) * 100);
  }

  // Pick the most threatening match: closest to breach first, boss > brute > runner.
  // Deterministic: ties break by type rank, then word (case-insensitive), so
  // the same zombie set always yields the same target regardless of spawn order.
  // Never mutates the input array (sorts a copy).
  pickTarget(matches) {
    if (!Array.isArray(matches) || matches.length === 0) return null;
    const rank = z => (z.ztype === 'boss' ? 0 : z.ztype === 'brute' ? 1 : z.ztype === 'runner' ? 2 : z.ztype === 'ghost' ? 3 : 4);
    const wordOf = z => (z && typeof z.word === 'string' ? z.word.toLowerCase() : '');
    const zOf = z => (z && isFinite(Number(z.worldZ)) ? Number(z.worldZ) : -Infinity);
    return matches.slice().sort((a, b) =>
      (zOf(b) - zOf(a)) ||
      (rank(a) - rank(b)) ||
      (wordOf(a) < wordOf(b) ? -1 : wordOf(a) > wordOf(b) ? 1 : 0)
    )[0] || null;
  }

  // Accuracy policy (documented — getAccuracy counts keysHit vs keysMissed):
  // - correct key ............ keysHit+1 (hit)
  // - key matching nothing .... keysMissed+1 (miss)
  // - wrong key while locked on (smart-retarget path): keysMissed+1 (miss);
  //   if the key starts another zombie's word we immediately re-feed it, so a
  //   successful retarget records 1 miss + 1 hit on the new target.
  // - dropTarget (Backspace) / auto-reset on dead target: neutral, no keys
  //   counted either way — re-aiming is free.
  handleInput(key, zombies) {
    if (this.state.currentState !== GameState.PLAYING) return;
    // Multi-char key names ('Shift', 'CapsLock', 'Enter', 'Backspace', dead
    // keys) are control input, never letters — ignore before lowercasing.
    if (typeof key !== 'string' || key.length !== 1) return;
    if (!Array.isArray(zombies)) return;

    const letter = key.toLowerCase();
    if (!/^[a-z]$/.test(letter)) return;

    if (!this.currentTarget) {
      const matches = zombies.filter(z => z && !z.isDead && typeof z.word === 'string' && z.word.toLowerCase().startsWith(letter) && z.worldZ < 4.8);
      if (matches.length > 0) {
        this.audio.playSFX('type', this.streak);
        const target = this.pickTarget(matches);
        if (!target) {
          this.keysMissed++;
          this.streak = 0;
          this.audio.playSFX('error');
          if (window.game) window.game.onTypingError();
          return;
        }
        this.currentTarget = target;
        this.typedBuffer = letter;
        this.currentTarget.setTargeted(true);
        this.currentTarget.setTypedLength(1);
        this.currentTarget.pingHit();
        this.keysHit++;
        this.streak++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);

        if (window.game) {
          window.game.animateKeyboardPress(letter);
          window.game.onCorrectKey(this.currentTarget, this.streak);
        }
      } else {
        this.keysMissed++;
        this.streak = 0;
        this.audio.playSFX('error');
        if (window.game) window.game.onTypingError();
      }
    } else {
      // Target died or breached while typing - auto-retarget same letter.
      // Neutral: reset() counts no keys either way, the re-fed key decides.
      if (!this.currentTarget || this.currentTarget.isDead || this.currentTarget.worldZ >= 4.8) {
        this.reset();
        this.handleInput(key, zombies);
        return;
      }
      if (typeof this.currentTarget.word !== 'string' || this.typedBuffer.length >= this.currentTarget.word.length) {
        this.reset();
        this.handleInput(key, zombies);
        return;
      }
      const nextChar = this.currentTarget.word[this.typedBuffer.length].toLowerCase();
      if (letter === nextChar) {
        this.audio.playSFX('type', this.streak);
        this.typedBuffer += letter;
        this.currentTarget.setTypedLength(this.typedBuffer.length);
        this.currentTarget.pingHit();
        this.keysHit++;
        this.streak++;
        this.bestStreak = Math.max(this.bestStreak, this.streak);

        if (window.game) {
          window.game.animateKeyboardPress(letter);
          window.game.onCorrectKey(this.currentTarget, this.streak);
        }

        if (this.typedBuffer.length === this.currentTarget.word.length) {
          this.wordsCompleted++;
          this.triggerExplosion(this.currentTarget, zombies);
          this.currentTarget = null;
          this.typedBuffer = "";
        }
      } else {
        // Smart recovery: if the wrong key starts another zombie's word, switch to it
        const matches = zombies.filter(z => z !== this.currentTarget && !z.isDead && z.word.toLowerCase().startsWith(letter) && z.worldZ < 4.8);
        this.currentTarget.setTargeted(false);
        this.currentTarget.setTypedLength(0);
        this.currentTarget = null;
        this.typedBuffer = "";
        this.keysMissed++;
        this.streak = 0;
        this.audio.playSFX('error');
        if (window.game) window.game.onTypingError();
        if (matches.length > 0) {
          this.handleInput(key, zombies);
        }
      }
    }
  }

  triggerExplosion(zombie, zombies) {
    const explosionPos = zombie.group.position.clone();
    this.particles.spawnExplosion(explosionPos, this.state.equippedBlood);
    // Laser tracer from player to kill - sells the "decrypt shot"
    if (window.game && window.game.getMuzzleWorldPos) {
      try {
        this.particles.spawnTracer(window.game.getMuzzleWorldPos(), explosionPos, 0x00f2fe);
      } catch (e) { /* cosmetic only */ }
    }
    this.particles.spawnFloatingText(
      explosionPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
      '+' + Math.floor((zombie.scoreValue || 100) * (this.state.combo || 1)),
      (zombie.ztype === 'boss') ? '#ffd700' : '#00ff66',
      zombie.ztype === 'boss' || zombie.ztype === 'brute'
    );
    this.audio.playSFX('explosion');

    this.state.addScore(zombie.scoreValue || 100);
    this.state.addCoins(zombie.coinValue != null ? zombie.coinValue : 1);
    this.state.registerKill(zombie);
    this.state.waveWords.add(zombie.word.toLowerCase());

    zombie.isDead = true;

    zombies.forEach(z => {
      if (z === zombie || z.isDead) return;

      const dx = z.worldX - zombie.worldX;
      const dz = z.worldZ - zombie.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const maxRadius = 8.0;
      if (dist < maxRadius) {
        const resist = z.knockResist || 0;
        const force = 18.0 * (1 - dist / maxRadius) * (1 - resist);
        const angle = Math.atan2(dz, dx);

        z.vx += Math.cos(angle) * force;
        z.vz += Math.sin(angle) * force * 1.5;

        z.isStunned = true;
        z.stunDuration = 1.0 * (1 - resist * 0.5);
        this.state.addScore(15);
      }
    });

    if (window.game) window.game.onZombieKilled(zombie, zombies);
  }

  reset() {
    if (this.currentTarget) {
      this.currentTarget.setTargeted(false);
      this.currentTarget.setTypedLength(0);
    }
    this.currentTarget = null;
    this.typedBuffer = "";
  }

  // Backspace: drop the current lock-on with no penalty (re-aim freely)
  dropTarget() {
    if (!this.currentTarget) return;
    this.currentTarget.setTargeted(false);
    this.currentTarget.setTypedLength(0);
    this.currentTarget = null;
    this.typedBuffer = "";
  }
}
