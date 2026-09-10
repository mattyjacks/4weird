/**
 * Semester Survival - Web Audio Synthesizer Engine
 * Generates custom arcade sound effects and music procedurally.
 */
(function() {
    'use strict';

    class CampusAudio {
        constructor() {
            this.ctx = null;
            this.muted = false;
            this.bgInterval = null;
            this.bgStep = 0;
            this.currentBpm = 110;
            this.academicScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major notes
        }

        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            if (this.muted) {
                this.stopMusic();
            } else {
                this.startMusic();
            }
            return this.muted;
        }

        playMenu() {
            this.init();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        }

        playCollect() {
            this.init();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.12); // G5

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        }

        playPowerUp() {
            this.init();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        }

        playJump() {
            this.init();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }

        playSlide() {
            this.init();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }

        playHit() {
            this.init();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.25);

            // Add simple white noise effect manually
            const bufferSize = this.ctx.sampleRate * 0.25;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2.0 - 1.0;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.08, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            noise.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.start(now);
            osc.stop(now + 0.25);
            noise.start(now);
            noise.stop(now + 0.25);
        }

        // Custom fail tunes
        playFailSupp() {
            this.init();
            this.stopMusic();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const frequencies = [261.63, 246.94, 220.00, 196.00]; // C - B - A - G descending
            frequencies.forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, now + i * 0.25);
                gain.gain.setValueAtTime(0.06, now + i * 0.25);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.22);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.25);
                osc.stop(now + i * 0.25 + 0.22);
            });
        }

        playFailBurnout() {
            this.init();
            this.stopMusic();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(330, now);
            osc.frequency.linearRampToValueAtTime(55, now + 1.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.2);
        }

        playFailGlitch() {
            this.init();
            this.stopMusic();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            // High frequency static burst
            for (let i = 0; i < 6; i++) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(Math.random() * 2000 + 400, now + i * 0.08);
                gain.gain.setValueAtTime(0.03, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.07);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.07);
            }
        }

        playVictory() {
            this.init();
            this.stopMusic();
            if (this.muted) return;
            const now = this.ctx.currentTime;
            // Upbeat graduation tune
            const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50]; // C5 - E5 - G5 - C6 - G5 - C6
            notes.forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f, now + i * 0.15);
                gain.gain.setValueAtTime(0.08, now + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + i * 0.15);
                osc.stop(now + i * 0.15 + 0.2);
            });
        }

        startMusic() {
            this.init();
            if (this.bgInterval) return;
            this.bgStep = 0;
            this.scheduleNextBeat();
        }

        scheduleNextBeat() {
            if (this.muted || !this.bgIntervalActive) return;
            const duration = 60 / this.currentBpm / 2; // Eighth notes
            this.playMusicStep();
            this.bgInterval = setTimeout(() => {
                this.bgStep++;
                this.scheduleNextBeat();
            }, duration * 1000);
        }

        playMusicStep() {
            if (!this.ctx || this.muted) return;
            const now = this.ctx.currentTime;
            
            // Simple retro bass rhythm (C minor: C, Eb, G, Bb)
            const bassline = [130.81, 130.81, 155.56, 155.56, 196.00, 196.00, 233.08, 196.00];
            const step = this.bgStep % 16;
            
            // Play bass note
            if (step % 2 === 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(bassline[Math.floor(step / 2) % bassline.length], now);
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.2);
            }

            // Play hi-hat/noise on specific beats
            if (step % 4 === 2) {
                const bufferSize = this.ctx.sampleRate * 0.04;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.015, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                source.connect(gain);
                gain.connect(this.ctx.destination);
                source.start(now);
                source.stop(now + 0.04);
            }
        }

        setBpm(speedMultiplier) {
            this.currentBpm = 110 + Math.min(60, speedMultiplier * 8);
        }

        stopMusic() {
            this.bgIntervalActive = false;
            if (this.bgInterval) {
                clearTimeout(this.bgInterval);
                this.bgInterval = null;
            }
        }
        
        resumeMusic() {
            this.bgIntervalActive = true;
            this.startMusic();
        }
    }

    // Expose sound synth instance globally
    window.CampusAudio = new CampusAudio();
})();
