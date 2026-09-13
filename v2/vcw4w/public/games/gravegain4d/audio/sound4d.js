(function () {
    'use strict';
    if (window.GG4D_Sound) return;

    // GraveGain4D sound — WebAudio bleeps, same hook shape as
    // gravegain3d/audio/sound-engine.js (initCtx / playSfx / volumes).
    // Sounds: putt thock, w-shift shimmer, rewind reverse sweep, gore
    // splat. Lazy AudioContext: created + resumed on first user gesture.
    // Never throws.

    function Sound4D() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this.sfxVolume = 0.8;
        this.muted = false;
        this._gestureBound = false;
    }

    Sound4D.prototype.initCtx = function () {
        try {
            if (!this.ctx) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (AC) this.ctx = new AC();
            }
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        } catch (e) { /* ignore */ }
        return this.ctx;
    };

    // Bind one-time gesture listeners so the context resumes lazily.
    Sound4D.prototype.bindFirstGesture = function () {
        try {
            if (this._gestureBound) return;
            this._gestureBound = true;
            var self = this;
            var wake = function () { try { self.initCtx(); } catch (e) { /* ignore */ } };
            ['pointerdown', 'touchend', 'keydown'].forEach(function (t) {
                try { window.addEventListener(t, wake, { once: true, passive: true }); } catch (e) {
                    try { window.addEventListener(t, wake); } catch (e2) { /* ignore */ }
                }
            });
        } catch (e) { /* ignore */ }
    };

    Sound4D.prototype.setMuted = function (m) {
        try { this.muted = !!m; } catch (e) { /* ignore */ }
        return this.muted;
    };

    Sound4D.prototype.toggleMute = function () {
        return this.setMuted(!this.muted);
    };

    Sound4D.prototype._vol = function () {
        try {
            if (this.muted) return 0;
            return this.masterVolume * this.sfxVolume;
        } catch (e) { return 0; }
    };

    Sound4D.prototype._tone = function (opts) {
        // opts: {type,f0,f1,dur,vol,delay}
        try {
            var ctx = this.ctx, now = ctx.currentTime + (opts.delay || 0);
            var osc = ctx.createOscillator(), g = ctx.createGain();
            osc.type = opts.type || 'sine';
            osc.frequency.setValueAtTime(Math.max(20, opts.f0), now);
            if (opts.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), now + opts.dur);
            g.gain.setValueAtTime(opts.vol, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + opts.dur);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(now); osc.stop(now + opts.dur + 0.02);
        } catch (e) { /* ignore */ }
    };

    Sound4D.prototype._noise = function (dur, f0, f1, vol, q) {
        try {
            var ctx = this.ctx, now = ctx.currentTime;
            var n = Math.floor(ctx.sampleRate * dur);
            var buf = ctx.createBuffer(1, Math.max(1, n), ctx.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            var src = ctx.createBufferSource(); src.buffer = buf;
            var flt = ctx.createBiquadFilter();
            flt.type = 'bandpass'; flt.Q.value = q || 2;
            flt.frequency.setValueAtTime(f0, now);
            if (f1) flt.frequency.exponentialRampToValueAtTime(f1, now + dur);
            var g = ctx.createGain();
            g.gain.setValueAtTime(vol, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + dur);
            src.connect(flt); flt.connect(g); g.connect(ctx.destination);
            src.start(now); src.stop(now + dur);
        } catch (e) { /* ignore */ }
    };

    Sound4D.prototype.playSfx = function (type, pitchMod) {
        try {
            this.bindFirstGesture();
            this.initCtx();
            if (!this.ctx) return false;
            var v = this._vol();
            if (v <= 0.001) return false;
            var p = (pitchMod && isFinite(pitchMod)) ? pitchMod : 1.0;
            var now = this.ctx.currentTime;

            if (type === 'putt') {
                // Woody thock: low sine thump + click.
                this._tone({ type: 'sine', f0: 220 * p, f1: 70, dur: 0.12, vol: 0.5 * v });
                this._noise(0.03, 2500 * p, 1200, 0.25 * v, 3);
            } else if (type === 'wshift' || type === 'w-shift') {
                // Shimmer: rising ana->kata glide, two detuned triangles.
                this._tone({ type: 'triangle', f0: 400 * p, f1: 1400 * p, dur: 0.28, vol: 0.3 * v });
                this._tone({ type: 'sine', f0: 600 * p, f1: 2100 * p, dur: 0.28, vol: 0.2 * v, delay: 0.03 });
            } else if (type === 'rewind') {
                // Reverse sweep: falling saw + reversed-feel swell.
                var ctx = this.ctx;
                var osc = ctx.createOscillator(), g = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1200 * p, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
                g.gain.setValueAtTime(0.001, now);
                g.gain.exponentialRampToValueAtTime(0.35 * v, now + 0.3);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                osc.connect(g); g.connect(ctx.destination);
                osc.start(now); osc.stop(now + 0.5);
            } else if (type === 'splat' || type === 'gore') {
                // Gore splat: noise burst + low gurgle drop.
                this._noise(0.18, 900 * p, 200, 0.4 * v, 1.2);
                this._tone({ type: 'square', f0: 140 * p, f1: 40, dur: 0.2, vol: 0.22 * v });
            } else if (type === 'swing') {
                this._noise(0.15, 800 * p, 300, 0.3 * v, 3);
            } else if (type === 'hit' || type === 'crit') {
                this._tone({ type: 'sawtooth', f0: (type === 'crit' ? 320 : 160) * p, f1: 30, dur: 0.12, vol: 0.4 * v });
            } else if (type === 'gold' || type === 'heal' || type === 'pickup') {
                this._tone({ type: 'sine', f0: 880 * p, f1: 1320 * p, dur: 0.12, vol: 0.3 * v });
            } else {
                return false;
            }
            return true;
        } catch (e) { return false; }
    };

    // Convenience aliases used by main4d wiring.
    Sound4D.prototype.putt = function () { return this.playSfx('putt'); };
    Sound4D.prototype.wShift = function () { return this.playSfx('wshift'); };
    Sound4D.prototype.rewind = function () { return this.playSfx('rewind'); };
    Sound4D.prototype.splat = function () { return this.playSfx('splat'); };

    try {
        window.GG4D_Sound = Sound4D;
        // Shared singleton for the bootstrap loop.
        if (!window.GG4D_SoundBus) {
            try { window.GG4D_SoundBus = new Sound4D(); } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }
})();
