(function () {
    'use strict';

    // GraveGain4D — branes: Light/Gloom twin states per w-slice.
    // B flips the player's brane, but ONLY at rift portals.

    var LIGHT = 'light';
    var GLOOM = 'gloom';

    function Branes(opts) {
        opts = opts || {};
        this.wMin = opts.wMin !== undefined ? opts.wMin : 0;
        this.wMax = opts.wMax !== undefined ? opts.wMax : 3;
        this.portalRadius = opts.portalRadius !== undefined ? opts.portalRadius : 2.5;
        // Per-slice twin state: index -> 'light' | 'gloom'. Defaults to light.
        this.slices = {};
        // Registered rift portals: [{ x, y, z, w }].
        this.portals = [];
        // Optional hook: fn(playerPos) -> portal object or null.
        this.findPortal = null;
        this.flips = 0;
    }

    Branes.prototype.sliceIndex = function (w) {
        return Math.round(w);
    };

    Branes.prototype.get = function (w) {
        var i = this.sliceIndex(w);
        return this.slices[i] || LIGHT;
    };

    Branes.prototype.set = function (w, state) {
        var i = this.sliceIndex(w);
        if (state !== LIGHT && state !== GLOOM) return this.get(w);
        this.slices[i] = state;
        return state;
    };

    Branes.prototype.addPortal = function (x, y, z, w) {
        var p = { x: x || 0, y: y || 0, z: z || 0, w: w || 0 };
        this.portals.push(p);
        return p;
    };

    Branes.prototype.clearPortals = function () {
        this.portals.length = 0;
    };

    function dist4(a, b) {
        var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z, dw = a.w - b.w;
        return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
    }

    Branes.prototype.portalNear = function (playerPos) {
        if (!playerPos) return null;
        if (typeof this.findPortal === 'function') {
            try { return this.findPortal(playerPos) || null; } catch (_) { return null; }
        }
        for (var i = 0; i < this.portals.length; i++) {
            if (dist4(playerPos, this.portals[i]) <= this.portalRadius) return this.portals[i];
        }
        return null;
    };

    Branes.prototype.canFlip = function (playerPos) {
        return !!this.portalNear(playerPos);
    };

    // B key path: flips the brane of the player's current w-slice, but only
    // when standing at a rift portal. Returns the new state, or null if denied.
    Branes.prototype.tryFlip = function (playerPos) {
        var portal = this.portalNear(playerPos);
        if (!portal) return null;
        var w = playerPos.w !== undefined ? playerPos.w : portal.w;
        var next = this.get(w) === LIGHT ? GLOOM : LIGHT;
        this.set(w, next);
        this.flips += 1;
        return { state: next, slice: this.sliceIndex(w), portal: portal };
    };

    Branes.prototype.isGloom = function (w) {
        return this.get(w) === GLOOM;
    };

    Branes.LIGHT = LIGHT;
    Branes.GLOOM = GLOOM;

    window.GG4D_Branes = Branes;
})();
