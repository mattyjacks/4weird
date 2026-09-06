(function () {
    'use strict';

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.8;
        this.ambientOsc1 = null;
        this.ambientOsc2 = null;
        this.ambientGain = null;
        this.ambientPlaying = false;
    }

    initCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playSfx(type, pitchMod = 1.0) {
        this.initCtx();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const mainVol = this.masterVolume * this.sfxVolume;
        if (mainVol <= 0.001) return;

        if (type === 'swing') {
            // Crisp white noise swoosh
            const bufferSize = this.ctx.sampleRate * 0.15;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800 * pitchMod, now);
            filter.frequency.exponentialRampToValueAtTime(300 * pitchMod, now + 0.15);
            filter.Q.value = 3.0;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
            noise.stop(now + 0.15);
        } else if (type === 'hit') {
            // Crunchy impact with low punch
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.12);
            gain.gain.setValueAtTime(0.4 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'crit') {
            // High punchy chime + explosion
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.2);
            gain.gain.setValueAtTime(0.5 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'block') {
            // High metallic parry ding
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
            gain.gain.setValueAtTime(0.45 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'spell') {
            // Mystical rising zap
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320 * pitchMod, now);
            osc.frequency.exponentialRampToValueAtTime(950 * pitchMod, now + 0.22);
            gain.gain.setValueAtTime(0.35 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'explode') {
            // Deep bass rumble
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.35);
            gain.gain.setValueAtTime(0.6 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'loot') {
            // Ascending bright chime
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                gain.gain.setValueAtTime(0.25 * mainVol, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.18);
            });
        } else if (type === 'potion') {
            // Liquid gulp
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.16);
            gain.gain.setValueAtTime(0.3 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'levelup') {
            // Triumphant 4-note chord fanfare
            [440, 554.37, 659.25, 880].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.09);
                gain.gain.setValueAtTime(0.35 * mainVol, now + idx * 0.09);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.4);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.09);
                osc.stop(now + idx * 0.09 + 0.4);
            });
        } else if (type === 'boss_roar') {
            // Low rumbling beast roar
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(70, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.25);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.7);
            gain.gain.setValueAtTime(0.55 * mainVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.7);
        }
    }

    startAmbientMusic() {
        this.initCtx();
        if (!this.ctx || this.ambientPlaying) return;

        try {
            this.ambientGain = this.ctx.createGain();
            this.ambientGain.gain.setValueAtTime(0.08 * this.masterVolume * this.musicVolume, this.ctx.currentTime);

            this.ambientOsc1 = this.ctx.createOscillator();
            this.ambientOsc1.type = 'sawtooth';
            this.ambientOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(160, this.ctx.currentTime);

            this.ambientOsc1.connect(filter);
            filter.connect(this.ambientGain);
            this.ambientGain.connect(this.ctx.destination);

            this.ambientOsc1.start();
            this.ambientPlaying = true;
        } catch (e) {
            // Audio autoplay might be blocked until user gesture
        }
    }

    stopAmbientMusic() {
        if (this.ambientOsc1) {
            try { this.ambientOsc1.stop(); } catch(e) {}
            this.ambientOsc1 = null;
        }
        this.ambientPlaying = false;
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.volume = Math.min(1.0, this.masterVolume);
            u.rate = 1.05;
            window.speechSynthesis.speak(u);
        }
    }
}

    window.GraveGainSoundEngine = SoundEngine;
})();
