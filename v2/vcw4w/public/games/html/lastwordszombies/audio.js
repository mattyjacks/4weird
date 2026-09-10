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
    this.state.sfxVolume = val;
    this.state.saveSettings();
    if (this.masterSFXGain && this.ctx && !this.muted) {
      this.masterSFXGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    this.state.musicVolume = val;
    this.state.saveSettings();
    if (this.masterMusicGain && this.ctx && !this.muted) {
      this.masterMusicGain.gain.setValueAtTime(val, this.ctx.currentTime);
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

  playSFX(type) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.muted) return;
    
    const t = this.ctx.currentTime;
    
    if (type === 'type') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);
      
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      
      osc.connect(gain);
      gain.connect(this.masterSFXGain);
      osc.start(t);
      osc.stop(t + 0.05);
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
