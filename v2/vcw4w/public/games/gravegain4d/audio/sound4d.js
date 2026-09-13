(function () {
    'use strict';

    // GraveGain4D audio: pure WebAudio synth, zero external assets.
    // W-pitch rule: pitched voices scale by 2^(w / 12) where w is the
    // 4th-axis coordinate in "semitone" units (w=0 concert pitch).
    // Mute policy: every play*() is a no-op when there is no
    // AudioContext (headless/SSR) or when muted / masterVolume ~ 0.
    function wRatio(w) {
        const n = Number(w) || 0;
        const clamped = Math.max(-12, Math.min(12, n));
        return Math.pow(2, clamped / 12);
    }

    class Audio4D {
        constructor() {
            this.ctx = null;
            this.masterVolume = 0.8;
            this.sfxVolume = 0.8;
            this.muted = false;
        }

        initCtx() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    try { this.ctx = new AudioCtx(); } catch (_) { this.ctx = null; }
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                try {
                    const p = this.ctx.resume();
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch (_) { /* autoplay policy: resume on next gesture */ }
            }
            return this.ctx;
        }

        get audible() {
            return !!this.ctx && !this.muted && (this.masterVolume * this.sfxVolume) > 0.001;
        }

        setMasterVolume(v) {
            this.masterVolume = Math.max(0, Math.min(1, Number(v) || 0));
        }

        setSfxVolume(v) {
            this.sfxVolume = Math.max(0, Math.min(1, Number(v) || 0));
        }

        setMuted(m) { this.muted = !!m; }
        toggleMute() { this.muted = !this.muted; return this.muted; }

        _out() {
            this.initCtx();
            if (!this.ctx || this.muted) return null;
            const g = this.masterVolume * this.sfxVolume;
            if (g <= 0.001) return null;
            return g;
        }

        _tone(opts) {
            // opts: {freq, freqEnd, dur, type, vol, delay}
            const level = this._out();
            if (level === null) return;
            const now = this.ctx.currentTime + (opts.delay || 0);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = opts.type || 'sine';
            osc.frequency.setValueAtTime(Math.max(20, opts.freq), now);
            if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), now + opts.dur);
            gain.gain.setValueAtTime((opts.vol || 0.3) * level, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + opts.dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + opts.dur + 0.02);
        }

        _noise(opts) {
            // opts: {dur, filterFrom, filterTo, type, Q, vol, delay}
            const level = this._out();
            if (level === null) return;
            const now = this.ctx.currentTime + (opts.delay || 0);
            const len = Math.max(1, Math.floor(this.ctx.sampleRate * opts.dur));
            const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = opts.type || 'bandpass';
            filter.frequency.setValueAtTime(opts.filterFrom, now);
            if (opts.filterTo) filter.frequency.exponentialRampToValueAtTime(opts.filterTo, now + opts.dur);
            filter.Q.value = opts.Q || 1.0;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime((opts.vol || 0.3) * level, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + opts.dur);
            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            src.start(now);
        }

        // Power-scaled putt thock: low sine thump + click, pitch and
        // weight grow with power01. w bends pitch via wRatio.
        putt(power01, w) {
            const p = Math.max(0, Math.min(1, Number(power01) || 0));
            const r = wRatio(w);
            this._tone({ freq: (90 + 60 * p) * r, freqEnd: 55 * r, dur: 0.12 + 0.08 * p, type: 'sine', vol: 0.5 + 0.3 * p });
            this._noise({ dur: 0.03, filterFrom: 3000 * r, type: 'highpass', vol: 0.15 + 0.15 * p });
        }

        // Fold sweep: W-rotation glide, direction = sign(angle).
        fold(angle, w) {
            const a = Number(angle) || 0;
            const dir = a < 0 ? -1 : 1;
            const span = Math.min(1, Math.abs(a) / Math.PI);
            const r = wRatio(w);
            const from = dir > 0 ? 220 * r : 880 * r;
            const to = dir > 0 ? 880 * r : 220 * r;
            this._tone({ freq: from, freqEnd: to, dur: 0.25 + 0.35 * span, type: 'sawtooth', vol: 0.18 });
            this._noise({ dur: 0.3, filterFrom: 600 * r, filterTo: 3600 * r, type: 'bandpass', Q: 2.0, vol: 0.12 });
        }

        // Timeline rewind: reverse-feel rising noise + descending tone.
        rewind() {
            this._noise({ dur: 0.45, filterFrom: 400, filterTo: 5000, type: 'bandpass', Q: 1.5, vol: 0.25 });
            this._tone({ freq: 900, freqEnd: 180, dur: 0.45, type: 'triangle', vol: 0.22 });
        }

        // World-shift chime: bright two-note motif, W-bent.
        worldShift(w) {
            const r = wRatio(w);
            this._tone({ freq: 660 * r, dur: 0.18, type: 'sine', vol: 0.3 });
            this._tone({ freq: 990 * r, dur: 0.3, type: 'sine', vol: 0.3, delay: 0.12 });
        }

        bossSting() {
            this._tone({ freq: 110, freqEnd: 55, dur: 0.6, type: 'sawtooth', vol: 0.35 });
            this._tone({ freq: 116.5, freqEnd: 58, dur: 0.6, type: 'sawtooth', vol: 0.35, delay: 0.02 });
            this._noise({ dur: 0.4, filterFrom: 200, filterTo: 120, type: 'lowpass', vol: 0.2 });
        }

        pickup(w) {
            const r = wRatio(w);
            this._tone({ freq: 880 * r, dur: 0.09, type: 'square', vol: 0.12 });
            this._tone({ freq: 1320 * r, dur: 0.14, type: 'square', vol: 0.12, delay: 0.07 });
        }

        levelup(w) {
            const r = wRatio(w);
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((f, i) => {
                this._tone({ freq: f * r, dur: 0.16, type: 'triangle', vol: 0.25, delay: i * 0.09 });
            });
        }

        swing(w) {
            const r = wRatio(w);
            this._noise({ dur: 0.15, filterFrom: 800 * r, filterTo: 300 * r, type: 'bandpass', Q: 3.0, vol: 0.3 });
        }

        jump(w) {
            const r = wRatio(w);
            this._tone({ freq: 300 * r, freqEnd: 600 * r, dur: 0.15, type: 'sine', vol: 0.2 });
        }

        uiClick() {
            this._tone({ freq: 1200, dur: 0.05, type: 'sine', vol: 0.15 });
        }

        play(name, opts) {
            opts = opts || {};
            switch (name) {
                case 'putt': return this.putt(opts.power01, opts.w);
                case 'fold': return this.fold(opts.angle, opts.w);
                case 'rewind': return this.rewind();
                case 'worldShift': case 'world-shift': return this.worldShift(opts.w);
                case 'boss': case 'bossSting': return this.bossSting();
                case 'pickup': return this.pickup(opts.w);
                case 'levelup': return this.levelup(opts.w);
                case 'swing': case 'attack': return this.swing(opts.w);
                case 'jump': return this.jump(opts.w);
                default: return this.uiClick();
            }
        }
    }

    if (!window.GraveGain4DAudio) window.GraveGain4DAudio = new Audio4D();
})();
