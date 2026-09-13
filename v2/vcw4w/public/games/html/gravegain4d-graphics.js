/* GraveGain4D graphics (trippy 4D folding, agent gg4d-02).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DGraphics. Never throws:
 * every hook is try/catch guarded. No click/keydown/pointer-lock listeners.
 * No DOM overlays are created by this module (so there is nothing to block
 * input); any future overlay MUST use pointer-events:none.
 *
 * ZERO new art: this module defines no enemy/weapon meshes. It REUSES the
 * GraveGain3D model builders by delegation (window.GraveGainGraphics3D and
 * window.GraveGain3DModels when present) and only adds 4D fold FX on top:
 * project4DGroup (XW rotation + perspective divide per vertex), trippyPulse
 * (breathing emissive/rotation for the vectors-folding-on-themselves feel),
 * and setFoldAmount (0..1). Same graphics for every content mode — the
 * fourweird-content-mode event is stored only, never changes models.
 */
(function () {
    'use strict';
    if (window.GraveGain4DGraphics) return;

    var VERSION = '1.0.0';
    var contentMode = 'all';
    var foldAmount = 0.5;
    var tracked = [];

    function hasTHREE(T) {
        try {
            var R = T || window.THREE;
            return !!(R && R.Group && R.Mesh);
        } catch (e) { return false; }
    }

    function gfx3d() {
        try { return window.GraveGainGraphics3D || null; } catch (e) { return null; }
    }

    function models3d() {
        try { return window.GraveGain3DModels || null; } catch (e) { return null; }
    }

    /* ============ DELEGATED BUILDERS (reuse 3D art by reference) ============ */

    function buildEnemy(key, opts) {
        try {
            var m = models3d();
            if (m && typeof m.buildEnemy === 'function') return m.buildEnemy(key, opts);
        } catch (e) { /* ignore */ }
        return null;
    }

    function buildWeapon(name, tOrOpts) {
        try {
            var g = gfx3d();
            if (g && typeof g.buildWeapon === 'function') {
                var w = g.buildWeapon(name, tOrOpts);
                if (w) return w;
            }
        } catch (e) { /* ignore */ }
        try {
            var m = models3d();
            if (m && typeof m.buildWeapon === 'function') return m.buildWeapon(name, tOrOpts);
        } catch (e) { /* ignore */ }
        return null;
    }

    function buildProp(name, tOrOpts) {
        try {
            var g = gfx3d();
            if (g && typeof g.buildProp === 'function') return g.buildProp(name, tOrOpts);
        } catch (e) { /* ignore */ }
        return null;
    }

    function list() {
        try {
            var m = models3d();
            if (m && typeof m.list === 'function') return m.list();
        } catch (e) { /* ignore */ }
        return { version: VERSION, enemies: [], weapons: [] };
    }

    /* ============ 4D FOLD FX ============ */

    function track(group) {
        try {
            if (!group) return false;
            if (tracked.indexOf(group) === -1) tracked.push(group);
            return true;
        } catch (e) { return false; }
    }

    function untrack(group) {
        try {
            var i = tracked.indexOf(group);
            if (i !== -1) tracked.splice(i, 1);
            return true;
        } catch (e) { return false; }
    }

    // XW-plane 4D rotation + perspective divide, applied per vertex.
    // Each vertex gets a deterministic w coordinate derived from its base
    // position scaled by the fold amount, rotates in the XW plane by
    // wAngle, then projects back to 3D with a perspective divide.
    // Base positions are cached on first call so repeated calls fold from
    // the original shape (never accumulate drift). Returns true if at
    // least one mesh was folded, false otherwise (never throws).
    function project4DGroup(group, wAngle) {
        try {
            if (!group) return false;
            if (!hasTHREE()) return false;
            var a = (typeof wAngle === 'number' && isFinite(wAngle)) ? wAngle : 0;
            var cosA, sinA;
            try { cosA = Math.cos(a); sinA = Math.sin(a); } catch (e) { return false; }
            var dist = 2.5;
            var meshes = [];
            try {
                if (group.isMesh) {
                    meshes.push(group);
                } else if (group && typeof group.traverse === 'function') {
                    group.traverse(function (o) {
                        try { if (o && o.isMesh) meshes.push(o); } catch (e) { /* ignore */ }
                    });
                } else {
                    return false;
                }
            } catch (e) { return false; }
            if (!meshes.length) return false;
            var folded = 0;
            for (var mi = 0; mi < meshes.length; mi++) {
                try {
                    var mesh = meshes[mi];
                    var geo = mesh.geometry;
                    if (!geo || !geo.attributes || !geo.attributes.position) continue;
                    var pos = geo.attributes.position;
                    if (!pos.array || typeof pos.array.length !== 'number') continue;
                    try { if (!geo.userData) geo.userData = {}; } catch (e) { continue; }
                    try {
                        if (!geo.userData.gg4dBase) {
                            geo.userData.gg4dBase = new Float32Array(pos.array);
                        }
                    } catch (e) { continue; }
                    var base = geo.userData.gg4dBase;
                    if (!base || base.length !== pos.array.length) continue;
                    var arr = pos.array;
                    for (var i = 0; i < arr.length; i += 3) {
                        try {
                            var x0 = base[i], y0 = base[i + 1], z0 = base[i + 2];
                            var w0 = foldAmount * (x0 * 0.6 + y0 * 0.3 + z0 * 0.5);
                            var x1 = x0 * cosA - w0 * sinA;
                            var w1 = x0 * sinA + w0 * cosA;
                            var s = dist / (dist - w1 * 0.5);
                            if (!isFinite(s)) s = 1;
                            if (s < 0.2) s = 0.2;
                            if (s > 3) s = 3;
                            arr[i] = x1 * s;
                            arr[i + 1] = y0 * s;
                            arr[i + 2] = z0 * s;
                        } catch (e) { /* keep other vertices folding */ }
                    }
                    try { pos.needsUpdate = true; } catch (e) { /* ignore */ }
                    try { if (typeof geo.computeVertexNormals === 'function') geo.computeVertexNormals(); } catch (e) { /* ignore */ }
                    folded++;
                } catch (e) { /* ignore */ }
            }
            if (folded > 0) track(group);
            return folded > 0;
        } catch (e) { return false; }
    }

    // Breathing emissive + slow folding rotation over tracked groups.
    // Call once per frame (or on a timer) with elapsed seconds t.
    function trippyPulse(t) {
        try {
            var time = (typeof t === 'number' && isFinite(t)) ? t : 0;
            var k = 0.5 + 0.5 * Math.sin(time * 1.7);
            for (var i = 0; i < tracked.length; i++) {
                try {
                    var group = tracked[i];
                    if (!group) continue;
                    try {
                        group.rotation.y += 0.005 + 0.02 * foldAmount;
                        group.rotation.z = 0.08 * Math.sin(time * 0.9 + i);
                    } catch (e) { /* ignore */ }
                    try {
                        if (typeof group.traverse === 'function') {
                            group.traverse(function (o) {
                                try {
                                    if (o && o.material && o.material.emissive) {
                                        var m = o.material;
                                        if (typeof m.__gg4dBaseEI !== 'number') {
                                            m.__gg4dBaseEI = (typeof m.emissiveIntensity === 'number') ? m.emissiveIntensity : 1;
                                        }
                                        m.emissiveIntensity = m.__gg4dBaseEI * (0.75 + 0.6 * k * (0.4 + foldAmount));
                                    }
                                } catch (e) { /* ignore */ }
                            });
                        }
                    } catch (e) { /* ignore */ }
                } catch (e) { /* ignore */ }
            }
            return true;
        } catch (e) { return false; }
    }

    function setFoldAmount(v) {
        try {
            var n = Number(v);
            if (!isFinite(n)) return foldAmount;
            if (n < 0) n = 0;
            if (n > 1) n = 1;
            foldAmount = n;
            return foldAmount;
        } catch (e) { return foldAmount; }
    }

    function getFoldAmount() {
        try { return foldAmount; } catch (e) { return 0.5; }
    }

    /* ============ BOOT (mode listener only, mirrors 3D contract) ============ */

    function boot() {
        try {
            window.addEventListener('fourweird-content-mode', function (ev) {
                try {
                    if (ev && ev.detail && ev.detail.mode) contentMode = String(ev.detail.mode);
                    else if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                        contentMode = String(window.FourweirdContentMode.mode);
                    }
                } catch (e) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }
        try {
            if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                contentMode = String(window.FourweirdContentMode.mode);
            }
        } catch (e) { /* ignore */ }
    }

    var api = {
        VERSION: VERSION,
        buildEnemy: buildEnemy,
        buildWeapon: buildWeapon,
        buildProp: buildProp,
        list: list,
        project4DGroup: project4DGroup,
        trippyPulse: trippyPulse,
        setFoldAmount: setFoldAmount,
        getFoldAmount: getFoldAmount,
        track: track,
        untrack: untrack,
        getContentMode: function () { try { return contentMode; } catch (e) { return 'all'; } }
    };

    try {
        window.GraveGain4DGraphics = api;
    } catch (e) { /* ignore */ }

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain4d-graphics', version: VERSION, init: function () { return api; } });
    } catch (e) { /* ignore */ }

    try {
        if (typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', boot);
            } else {
                boot();
            }
        }
    } catch (e) { /* ignore */ }
})();
