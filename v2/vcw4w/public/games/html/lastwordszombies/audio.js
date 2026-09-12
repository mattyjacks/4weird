class AudioManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.ctx = null;
    this.muted = false;
    
    // Nodes
    this.masterSFXGain = null;
    this.masterMusicGain = null;
    
    // Music Sequencer state
    this.musicIntervalId = null;
    this.beatIndex = 0;
    this.tempo = 100; // BPM
  }

  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // no WebAudio: stay silent, never throw into startGame
    this.ctx = new AudioContextClass();
    
    // Create Gain nodes
    this.masterSFXGain = this.ctx.createGain();
    this.masterSFXGain.gain.setValueAtTime(this.muted ? 0 : this.state.sfxVolume, this.ctx.currentTime);
    this.masterSFXGain.connect(this.ctx.destination);
    
    this.masterMusicGain = this.ctx.createGain();
    this.masterMusicGain.gain.setValueAtTime(this.muted ? 0 : this.state.musicVolume, this.ctx.currentTime);
    this.masterMusicGain.connect(this.ctx.destination);
    
    this.startSynthMusic();
  }

  setSFXVolume(val) {
    this.state.sfxVolume = Math.min(1, Math.max(0, Number(val) || 0));
    this.state.saveSettings();
    if (this.masterSFXGain && this.ctx && !this.muted) {
      // Smoothed step: an instant setValueAtTime mid-blast can click.
      this.masterSFXGain.gain.setTargetAtTime(this.state.sfxVolume, this.ctx.currentTime, 0.02);
    }
  }

  setMusicVolume(val) {
    this.state.musicVolume = Math.min(1, Math.max(0, Number(val) || 0));
    this.state.saveSettings();
    if (this.masterMusicGain && this.ctx && !this.muted) {
      this.masterMusicGain.gain.setTargetAtTime(this.state.musicVolume, this.ctx.currentTime, 0.02);
    }
  }

  // Call when the tab becomes visible again - browsers suspend AudioContext
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.muted = !this.muted;
    if (this.muted) {
      this.masterSFXGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterMusicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else {
      this.masterSFXGain.gain.setValueAtTime(this.state.sfxVolume, this.ctx.currentTime);
      this.masterMusicGain.gain.setValueAtTime(this.state.musicVolume, this.ctx.currentTime);
    }
    return this.muted;
  }

  stopAll() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  // Called on wave changes - music gets tenser as waves climb.
  setIntensity(wave) {
    const target = Math.min(150, 100 + (wave - 1) * 8);
    if (target !== this.tempo) {
      this.tempo = target;
      // Only restart a running sequencer: never resurrect music
      // after stopAll() silenced it (tempo still applies on next start).
      if (this.ctx && this.musicIntervalId) this.startSynthMusic();
    }
  }

  playSFX(type, opt) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.muted) return;

    const t = this.ctx.currentTime;
    // Combo pitch ladder: streaks sound progressively more electric
    const streak = typeof opt === 'number' ? opt : (opt && opt.streak) || 0;
    const pitchMul = 1 + Math.min(12, streak) * 0.045;

    if (type === 'type') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime((320 + Math.random() * 200) * pitchMul, t);
      osc.frequency.exponentialRampToValueAtTime(120 * pitchMul, t + 0.04);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.masterSFXGain);
      osc.start(t);
      osc.stop(t + 0.05);
      // Sparkle layer on hot streaks
      if (streak >= 8) {
        const hi = this.ctx.createOscillator();
        const hg = this.ctx.createGain();
        hi.type = 'sine';
        hi.frequency.setValueAtTime(1400 * pitchMul, t);
        hg.gain.setValueAtTime(0.03, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        hi.connect(hg);
        hg.connect(this.masterSFXGain);
        hi.start(t);
        hi.stop(t + 0.09);
      }
    }
    else if (type === 'explosion') {
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(20, t + 0.5);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(65, t);
      sub.frequency.linearRampToValueAtTime(30, t + 0.4);
      
      subGain.gain.setValueAtTime(0.6, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterSFXGain);
      
      sub.connect(subGain);
      subGain.connect(this.masterSFXGain);
      
      noise.start(t);
      noise.stop(t + 0.6);
      
      sub.start(t);
      sub.stop(t + 0.5);
    }
    else if (type === 'error') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(130, t);
      
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(133, t);
      
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterSFXGain);
      
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.26);
      osc2.stop(t + 0.26);
    }
    else if (type === 'hurt') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(80, t + 0.2);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.masterSFXGain);

      osc.start(t);
      osc.stop(t + 0.22);
    }
    else if (type === 'kill') {
      // Kill-confirm blip: two-note zap up
      [660, 990].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t + i * 0.05);
        gain.gain.setValueAtTime(0.08, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.09);
        osc.connect(gain);
        gain.connect(this.masterSFXGain);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.1);
      });
    }
    else if (type === 'streak') {
      // Killstreak announcement arp
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.07);
        gain.gain.setValueAtTime(0.09, t + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.16);
        osc.connect(gain);
        gain.connect(this.masterSFXGain);
        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.18);
      });
    }
    else if (type === 'waveclear') {
      // Wave-clear fanfare: rising major triad + shimmer
      [392, 494, 587, 784].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.09);
        gain.gain.setValueAtTime(0.14, t + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.3);
        osc.connect(gain);
        gain.connect(this.masterSFXGain);
        osc.start(t + i * 0.09);
        osc.stop(t + i * 0.09 + 0.32);
      });
    }
    else if (type === 'gameover') {
      // Dark descending sting
      [330, 262, 208, 131].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.18);
        gain.gain.setValueAtTime(0.14, t + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.18 + 0.3);
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(1200, t);
        osc.connect(flt);
        flt.connect(gain);
        gain.connect(this.masterSFXGain);
        osc.start(t + i * 0.18);
        osc.stop(t + i * 0.18 + 0.32);
      });
    }
    else if (type === 'boss') {
      // Boss roar: detuned low saws + noise growl
      [55, 58, 82].forEach(f => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.linearRampToValueAtTime(f * 0.6, t + 0.7);
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(gain);
        gain.connect(this.masterSFXGain);
        osc.start(t);
        osc.stop(t + 0.85);
      });
    }
    else if (type === 'freeze') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.4);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.masterSFXGain);
      osc.start(t);
      osc.stop(t + 0.5);
    }
    else if (type === 'bomb') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.7);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain);
      gain.connect(this.masterSFXGain);
      osc.start(t);
      osc.stop(t + 0.85);
    }
    else if (type === 'shield') {
      [440, 554, 659].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + i * 0.06);
        gain.gain.setValueAtTime(0.1, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(this.masterSFXGain);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.22);
      });
    }
    else if (type === 'alarm') {
      [880, 660].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t + i * 0.12);
        gain.gain.setValueAtTime(0.06, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.11);
        osc.connect(gain);
        gain.connect(this.masterSFXGain);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.12);
      });
    }
  }

  startSynthMusic() {
    if (this.musicIntervalId) clearInterval(this.musicIntervalId);
    
    const stepDuration = 60 / this.tempo / 2; // eighth notes
    this.beatIndex = 0;
    
    this.musicIntervalId = setInterval(() => {
      if (this.muted || this.state.currentState === 'paused' || this.state.musicVolume === 0) return;
      if (!this.ctx) return;
      
      const t = this.ctx.currentTime;
      const theme = this.state.equippedMusic;
      
      let baseScale = [55, 65.41, 73.42, 82.41]; // A1, C2, D2, E2
      if (theme === 'industrial') {
        baseScale = [48.99, 58.27, 65.41, 69.30]; // G1, A#1, C2, C#2
      }
      
      const step = this.beatIndex % 8;
      
      // Base bass notes (every beat)
      if (step % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = theme === 'industrial' ? 'sawtooth' : 'triangle';
        
        const chordIndex = Math.floor(this.beatIndex / 16) % 4;
        let baseFreq = baseScale[0];
        if (chordIndex === 1) baseFreq = baseScale[1];
        if (chordIndex === 2) baseFreq = baseScale[3];
        if (chordIndex === 3) baseFreq = baseScale[2];
        
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.98, t + 0.2);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(theme === 'industrial' ? 300 : 150, t);
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterMusicGain);
        
        osc.start(t);
        osc.stop(t + 0.40);
      }
      
      // Arpeggiator melody notes (on specific beats)
      const arpBeats = [0, 3, 5, 6];
      if (arpBeats.includes(step)) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        
        const chordIndex = Math.floor(this.beatIndex / 16) % 4;
        let noteFreq = baseScale[chordIndex] * 4; // Up two octaves
        
        if (step === 3) noteFreq *= 1.25; // Minor third
        if (step === 5) noteFreq *= 1.5;  // Perfect fifth
        if (step === 6) noteFreq *= 1.875; // Minor seventh
        
        osc.frequency.setValueAtTime(noteFreq, t);
        
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        
        osc.connect(gain);
        gain.connect(this.masterMusicGain);
        
        osc.start(t);
        osc.stop(t + 0.20);
      }
      
      this.beatIndex++;
    }, stepDuration * 1000);
  }
}
