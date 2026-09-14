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
        this.master = null; // master gain: live-mute + stop target
        this.masterVolume = 0.8;
        this.sfxVolume = 0.8;
        this.muted = false;
        this.playing = false; // restart guard: true while nodes active
        this._active = []; // tracked {stop, disc} for stop()
        this._gestureBound = false;
    }

    Sound4D.prototype._ensureMaster = function () {
        try {
            if (!this.ctx) return null;
            if (!this.master) {
                this.master = this.ctx.createGain();
                this.master.gain.value = this.muted ? 0 : 1;
                this.master.connect(this.ctx.destination);
            }
            return this.master;
        } catch (e) { return null; }
    };

    Sound4D.prototype._track = function (nodes) {
        // nodes: array of { stop: fn, disc: fn } — stop()+disconnect()+drop.
        try {
            var self = this;
            this._active.push.apply(this._active, nodes);
            this.playing = true;
            var done = function () {
                try {
                    var i = self._active.indexOf(nodes);
                    if (i !== -1) self._active.splice(i, 1);
                    if (!self._active.length) self.playing = false;
                } catch (e) { /* ignore */ }
            };
            var last = nodes[nodes.length - 1];
            if (last && last.node && typeof last.node.onended !== 'undefined') {
                try { last.node.onended = done; } catch (e) { /* ignore */ }
            } else {
                setTimeout(done, (nodes.durMs || 600) + 50);
            }
        } catch (e) { /* ignore */ }
    };

    Sound4D.prototype.initCtx = function () {
        try {
            if (!this.ctx) {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (AC) this.ctx = new AC();
                this.master = null; // rebuilt lazily by _ensureMaster
            }
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            this._ensureMaster();
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
        try {
            this.muted = !!m;
            // Live mute: apply to the master gain immediately so in-flight
            // one-shots silence without waiting for the next playSfx.
            if (this.master && this.ctx) {
                this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.01);
            }
        } catch (e) { /* ignore */ }
        return this.muted;
    };

    Sound4D.prototype.toggleMute = function () {
        return this.setMuted(!this.muted);
    };

    // Stop path for game-over/abandon/menu/hub: stop()+disconnect()+null
    // every tracked node, then tear down the master gain + context handle.
    // Never throws; safe to call when idle or context-less.
    Sound4D.prototype.stop = function () {
        try {
            var act = this._active || [];
            this._active = [];
            for (var i = 0; i < act.length; i++) {
                var grp = act[i];
                for (var j = 0; j < grp.length; j++) {
                    try { if (grp[j].stop) grp[j].stop(); } catch (e) { /* ignore */ }
                    try { if (grp[j].disc) grp[j].disc(); } catch (e) { /* ignore */ }
                }
            }
            try { if (this.master) this.master.disconnect(); } catch (e) { /* ignore */ }
            this.master = null;
            this.playing = false;
            try { if (this.ctx && typeof this.ctx.suspend === 'function') this.ctx.suspend(); } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
        return true;
    };

    Sound4D.prototype.destroy = function () {
        try { this.stop(); } catch (e) { /* ignore */ }
        try { this.ctx = null; } catch (e) { /* ignore */ }
        return true;
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
            var out = this._ensureMaster() || ctx.destination;
            var osc = ctx.createOscillator(), g = ctx.createGain();
            osc.type = opts.type || 'sine';
            osc.frequency.setValueAtTime(Math.max(20, opts.f0), now);
            if (opts.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), now + opts.dur);
            g.gain.setValueAtTime(opts.vol, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + opts.dur);
            osc.connect(g); g.connect(out);
            osc.start(now); osc.stop(now + opts.dur + 0.02);
            this._track([{ node: osc, stop: function () { try { osc.stop(); } catch (e) { /* ignore */ } }, disc: function () { try { osc.disconnect(); } catch (e) { /* ignore */ } try { g.disconnect(); } catch (e) { /* ignore */ } } }]);
        } catch (e) { /* ignore */ }
    };

    Sound4D.prototype._noise = function (dur, f0, f1, vol, q) {
        try {
            var ctx = this.ctx, now = ctx.currentTime;
            var out = this._ensureMaster() || ctx.destination;
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
            src.connect(flt); flt.connect(g); g.connect(out);
            src.start(now); src.stop(now + dur);
            this._track([{ node: src, stop: function () { try { src.stop(); } catch (e) { /* ignore */ } }, disc: function () { try { src.disconnect(); } catch (e) { /* ignore */ } try { flt.disconnect(); } catch (e) { /* ignore */ } try { g.disconnect(); } catch (e) { /* ignore */ } } }]);
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
                var out = this._ensureMaster() || ctx.destination;
                var osc = ctx.createOscillator(), g = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1200 * p, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);
                g.gain.setValueAtTime(0.001, now);
                g.gain.exponentialRampToValueAtTime(0.35 * v, now + 0.3);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
                osc.connect(g); g.connect(out);
                osc.start(now); osc.stop(now + 0.5);
                this._track([{ node: osc, stop: function () { try { osc.stop(); } catch (e) { /* ignore */ } }, disc: function () { try { osc.disconnect(); } catch (e) { /* ignore */ } try { g.disconnect(); } catch (e) { /* ignore */ } } }]);
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
