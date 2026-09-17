(function () {
    'use strict';

    // GraveGain4D — timefold: ring buffer of player snapshots @60Hz x 10s.
    // Hold T to rewind. Rewinding costs chrono-sand per second.

    var HZ = 60;
    var SECONDS = 10;
    var CAPACITY = HZ * SECONDS; // 600 snapshots

    function cloneState(s) {
        // Shallow-clone plain snapshot fields; nested objects copied one level.
        var out = {};
        for (var k in s) {
            if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
            var v = s[k];
            if (v && typeof v === 'object') {
                if (Array.isArray(v)) out[k] = v.slice();
                else out[k] = Object.assign({}, v);
            } else {
                out[k] = v;
            }
        }
        return out;
    }

    function Timefold(opts) {
        opts = opts || {};
        this.capacity = opts.capacity || CAPACITY;
        this.tickHz = opts.tickHz || HZ;
        this.sand = opts.sand !== undefined ? opts.sand : 100;
        this.maxSand = opts.maxSand !== undefined ? opts.maxSand : 100;
        this.drainPerSecond = opts.drainPerSecond !== undefined ? opts.drainPerSecond : 25;
        this.buf = new Array(this.capacity);
        this.head = 0;   // next write index
        this.count = 0;  // valid entries
        this.acc = 0;    // fractional-time accumulator for 60Hz sampling
        this.rewinding = false;
        this.rewound = 0; // snapshots consumed during current rewind hold
    }

    Timefold.prototype.configure = function (opts) {
        if (!opts) return this;
        if (opts.drainPerSecond !== undefined) this.drainPerSecond = opts.drainPerSecond;
        if (opts.maxSand !== undefined) this.maxSand = opts.maxSand;
        if (opts.sand !== undefined) this.sand = Math.min(this.maxSand, opts.sand);
        return this;
    };

    // Call every frame with dt and the live player state; samples at 60Hz.
    Timefold.prototype.record = function (dt, state) {
        if (this.rewinding) return false;
        if (!state) return false;
        this.acc += dt;
        var step = 1 / this.tickHz;
        var wrote = false;
        while (this.acc >= step) {
            this.acc -= step;
            this.buf[this.head] = cloneState(state);
            this.head = (this.head + 1) % this.capacity;
            if (this.count < this.capacity) this.count += 1;
            wrote = true;
        }
        return wrote;
    };

    Timefold.prototype.canRewind = function () {
        return this.count > 1 && this.sand > 0;
    };

    Timefold.prototype.beginRewind = function () {
        if (!this.canRewind()) return false;
        this.rewinding = true;
        this.rewound = 0;
        return true;
    };

    Timefold.prototype.endRewind = function () {
        this.rewinding = false;
        this.acc = 0;
        return this.rewound;
    };

    // Consume one snapshot per 60Hz tick while T is held; drains chrono-sand.
    // Returns the restored snapshot, or null when rewind stops (empty/out of sand).
    Timefold.prototype.rewindStep = function (dt) {
        if (!this.rewinding) return null;
        if (this.count <= 1 || this.sand <= 0) {
            this.endRewind();
            return null;
        }
        this.acc += dt;
        var step = 1 / this.tickHz;
        var restored = null;
        while (this.acc >= step) {
            this.acc -= step;
            var cost = this.drainPerSecond * step;
            if (this.sand < cost || this.count <= 1) {
                this.endRewind();
                break;
            }
            this.sand -= cost;
            // Pop newest: head points at next write slot, so step back twice
            // (one for the write cursor, one for the snapshot to restore).
            this.head = (this.head - 1 + this.capacity) % this.capacity;
            restored = this.buf[this.head];
            this.buf[this.head] = undefined;
            this.count -= 1;
            this.rewound += 1;
        }
        return restored ? cloneState(restored) : null;
    };

    Timefold.prototype.addSand = function (amount) {
        this.sand = Math.min(this.maxSand, Math.max(0, this.sand + amount));
        return this.sand;
    };

    Timefold.prototype.clear = function () {
        this.buf = new Array(this.capacity);
        this.head = 0;
        this.count = 0;
        this.acc = 0;
        this.rewinding = false;
        this.rewound = 0;
    };

    Timefold.prototype.depthSeconds = function () {
        return this.count / this.tickHz;
    };

    window.GG4D_Timefold = Timefold;
})();
