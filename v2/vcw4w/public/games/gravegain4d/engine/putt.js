(function () {
    'use strict';

    // GraveGain4D — putt: 4D-golf combat.
    // Aim an XYZ+W vector, hold left-click to charge, release to putt the
    // holy moonstone ball. 4D ricochet: the ball bounces in w at slice
    // bounds. Strokes counted, par per floor.

    var DEFAULTS = {
        wMin: 0,
        wMax: 3,
        friction: 0.985,      // per-tick velocity damping at 60Hz
        stopEpsilon: 0.02,     // below this speed the ball rests
        minPower: 2,
        maxPower: 22,
        chargeRate: 18,        // power units per second held
        restitution: 0.78,     // w-bounce energy kept at slice bounds
        par: 3
    };

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    function Putt4D(opts) {
        opts = opts || {};
        this.wMin = opts.wMin !== undefined ? opts.wMin : DEFAULTS.wMin;
        this.wMax = opts.wMax !== undefined ? opts.wMax : DEFAULTS.wMax;
        this.friction = opts.friction !== undefined ? opts.friction : DEFAULTS.friction;
        this.stopEpsilon = opts.stopEpsilon !== undefined ? opts.stopEpsilon : DEFAULTS.stopEpsilon;
        this.minPower = opts.minPower !== undefined ? opts.minPower : DEFAULTS.minPower;
        this.maxPower = opts.maxPower !== undefined ? opts.maxPower : DEFAULTS.maxPower;
        this.chargeRate = opts.chargeRate !== undefined ? opts.chargeRate : DEFAULTS.chargeRate;
        this.restitution = opts.restitution !== undefined ? opts.restitution : DEFAULTS.restitution;
        this.par = opts.par !== undefined ? opts.par : DEFAULTS.par;
        this.ball = { x: 0, y: 0, z: 0, w: 0 };
        this.vel = { x: 0, y: 0, z: 0, w: 0 };
        // Aim is a unit-ish XYZ+W direction vector; w component steers ana/kata.
        this.aim = { x: 0, y: 0, z: 1, w: 0 };
        this.charging = false;
        this.charge = 0;
        this.strokes = 0;
        this.bounces = 0;
        // Optional wall-collision hook: fn(ball, vel) -> may mutate vel, returns true if bounced.
        this.onCollide = null;
    }

    Putt4D.prototype.setAim = function (x, y, z, w) {
        var len = Math.sqrt(x * x + y * y + z * z + w * w);
        if (!len || !isFinite(len)) return this.aim;
        this.aim.x = x / len;
        this.aim.y = y / len;
        this.aim.z = z / len;
        this.aim.w = w / len;
        return this.aim;
    };

    Putt4D.prototype.setPar = function (par) {
        this.par = par | 0;
        return this.par;
    };

    Putt4D.prototype.isMoving = function () {
        var v = this.vel;
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z + v.w * v.w) > this.stopEpsilon;
    };

    Putt4D.prototype.canPutt = function () {
        return !this.charging && !this.isMoving();
    };

    Putt4D.prototype.startCharge = function () {
        if (!this.canPutt()) return false;
        this.charging = true;
        this.charge = 0;
        return true;
    };

    Putt4D.prototype.holdCharge = function (dt) {
        if (!this.charging) return 0;
        this.charge = clamp(this.charge + this.chargeRate * dt, 0, 1);
        return this.charge;
    };

    Putt4D.prototype.chargePower = function () {
        return this.minPower + (this.maxPower - this.minPower) * this.charge;
    };

    Putt4D.prototype.releasePutt = function () {
        if (!this.charging) return null;
        this.charging = false;
        var power = this.chargePower();
        this.charge = 0;
        this.vel.x = this.aim.x * power;
        this.vel.y = this.aim.y * power;
        this.vel.z = this.aim.z * power;
        this.vel.w = this.aim.w * power;
        this.strokes += 1;
        return { power: power, strokes: this.strokes };
    };

    Putt4D.prototype.cancelCharge = function () {
        this.charging = false;
        this.charge = 0;
    };

    // 4D ricochet: integrate, damp, bounce in w at slice bounds.
    Putt4D.prototype.update = function (dt) {
        if (this.charging) this.holdCharge(dt);
        var steps = Math.max(1, Math.round(dt / (1 / 60)));
        var h = dt / steps;
        for (var i = 0; i < steps; i++) {
            this.ball.x += this.vel.x * h;
            this.ball.y += this.vel.y * h;
            this.ball.z += this.vel.z * h;
            this.ball.w += this.vel.w * h;
            // Slice-bound ricochet in w.
            if (this.ball.w < this.wMin) {
                this.ball.w = this.wMin + (this.wMin - this.ball.w);
                this.vel.w = -this.vel.w * this.restitution;
                this.bounces += 1;
            } else if (this.ball.w > this.wMax) {
                this.ball.w = this.wMax - (this.ball.w - this.wMax);
                this.vel.w = -this.vel.w * this.restitution;
                this.bounces += 1;
            }
            if (typeof this.onCollide === 'function') {
                if (this.onCollide(this.ball, this.vel)) this.bounces += 1;
            }
            var damp = Math.pow(this.friction, h * 60);
            this.vel.x *= damp;
            this.vel.y *= damp;
            this.vel.z *= damp;
            this.vel.w *= damp;
            if (!this.isMoving()) {
                this.vel.x = this.vel.y = this.vel.z = this.vel.w = 0;
            }
        }
        return this.ball;
    };

    Putt4D.prototype.placeBall = function (x, y, z, w) {
        this.ball.x = x || 0;
        this.ball.y = y || 0;
        this.ball.z = z || 0;
        this.ball.w = clamp(w || 0, this.wMin, this.wMax);
        this.vel.x = this.vel.y = this.vel.z = this.vel.w = 0;
        this.cancelCharge();
        return this.ball;
    };

    Putt4D.prototype.newFloor = function (par, spawn) {
        this.strokes = 0;
        this.bounces = 0;
        if (par !== undefined) this.setPar(par);
        if (spawn) this.placeBall(spawn.x, spawn.y, spawn.z, spawn.w);
        else this.placeBall(0, 0, 0, this.wMin);
        return { par: this.par, ball: this.ball };
    };

    Putt4D.prototype.scoreVsPar = function () {
        return this.strokes - this.par;
    };

    window.GG4D_Putt = Putt4D;
})();
