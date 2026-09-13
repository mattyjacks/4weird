/* GraveGain 3D graphics upgrade (BIG graphics wave, agent G-01).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGainGraphics3D. Never throws:
 * every hook is try/catch guarded. No click/keydown/pointer-lock listeners.
 * No DOM overlays are created by this module (so there is nothing to block
 * input); any future overlay MUST use pointer-events:none.
 *
 * THREE.js r128 only: builders use BoxGeometry, CylinderGeometry,
 * OctahedronGeometry, SphereGeometry, TorusGeometry, ConeGeometry and
 * MeshStandardMaterial. Never imports anything; every 3D function guards
 * `if (!window.THREE) return` (builders take THREE as an argument and bail
 * to null without it). Same graphics for every content mode — the
 * fourweird-content-mode event is stored only, never changes models.
 */
(function () {
    'use strict';
    if (window.GraveGainGraphics3D) return;

    var VERSION = '2.0.0';
    var contentMode = 'all';

    function hasTHREE(T) {
        try {
            var R = T || window.THREE;
            return !!(R && R.Group && R.Mesh);
        } catch (e) { return false; }
    }

    function R128(T) {
        try { return (T || window.THREE) || null; } catch (e) { return null; }
    }

    function stdMat(T, color, emissive, emissiveIntensity, roughness, metalness) {
        var R = R128(T);
        try {
            return new R.MeshStandardMaterial({
                color: color,
                emissive: emissive || 0x000000,
                emissiveIntensity: (typeof emissiveIntensity === 'number') ? emissiveIntensity : 1,
                roughness: (typeof roughness === 'number') ? roughness : 0.6,
                metalness: (typeof metalness === 'number') ? metalness : 0.4
            });
        } catch (e) { return null; }
    }

    function part(T, geo, mat) {
        var R = R128(T);
        try { return new R.Mesh(geo, mat); } catch (e) { return null; }
    }

    function add(group, mesh, x, y, z, rx, ry, rz) {
        try {
            if (!mesh) return;
            if (typeof x === 'number') mesh.position.set(x, y || 0, z || 0);
            if (typeof rx === 'number') mesh.rotation.set(rx, ry || 0, rz || 0);
            group.add(mesh);
        } catch (e) { /* ignore */ }
    }

    /* ================= WEAPONS ================= */

    function buildLongsword(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(0.09, 1.15, 0.03), stdMat(T, 0xb9c4d4, 0x000000, 1, 0.35, 0.9)), 0, 0.85, 0);
            add(g, part(T, new R.ConeGeometry(0.07, 0.22, 4), stdMat(T, 0xd7e0ee, 0x000000, 1, 0.3, 0.9)), 0, 1.53, 0);
            add(g, part(T, new R.BoxGeometry(0.42, 0.07, 0.09), stdMat(T, 0x6b5a33, 0x000000, 1, 0.6, 0.6)), 0, 0.26, 0);
            add(g, part(T, new R.CylinderGeometry(0.045, 0.045, 0.34, 10), stdMat(T, 0x3a2a1a, 0x000000, 1, 0.85, 0.1)), 0, 0.05, 0);
            add(g, part(T, new R.SphereGeometry(0.07, 10, 8), stdMat(T, 0x8a742f, 0x000000, 1, 0.5, 0.8)), 0, -0.15, 0);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildWarhammer(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.CylinderGeometry(0.045, 0.055, 1.25, 10), stdMat(T, 0x4a3420, 0x000000, 1, 0.85, 0.15)), 0, 0.4, 0);
            add(g, part(T, new R.BoxGeometry(0.5, 0.28, 0.28), stdMat(T, 0x707a8c, 0x000000, 1, 0.45, 0.85)), 0, 1.05, 0);
            add(g, part(T, new R.ConeGeometry(0.12, 0.34, 4), stdMat(T, 0x707a8c, 0x000000, 1, 0.45, 0.85)), 0, 1.05, 0.42, Math.PI / 2, 0, 0);
            add(g, part(T, new R.SphereGeometry(0.07, 10, 8), stdMat(T, 0x2c2c34, 0x000000, 1, 0.6, 0.6)), 0, -0.26, 0);
            add(g, part(T, new R.TorusGeometry(0.09, 0.025, 8, 16), stdMat(T, 0x8a742f, 0x000000, 1, 0.5, 0.8)), 0, 0.88, 0, Math.PI / 2, 0, 0);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildArcaneStaff(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.CylinderGeometry(0.04, 0.05, 1.6, 10), stdMat(T, 0x2e1f3d, 0x000000, 1, 0.8, 0.2)), 0, 0.3, 0);
            add(g, part(T, new R.OctahedronGeometry(0.16), stdMat(T, 0x3b1f6e, 0x7a3cff, 1.4, 0.25, 0.1)), 0, 1.28, 0);
            add(g, part(T, new R.TorusGeometry(0.22, 0.03, 8, 20), stdMat(T, 0x8a742f, 0x000000, 1, 0.5, 0.8)), 0, 1.28, 0, 0, 0, 0);
            add(g, part(T, new R.SphereGeometry(0.06, 10, 8), stdMat(T, 0x8a742f, 0x000000, 1, 0.5, 0.8)), 0, -0.54, 0);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildChemGun(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(0.16, 0.2, 0.85), stdMat(T, 0x2f4f3a, 0x000000, 1, 0.6, 0.5)), 0, 0.55, 0);
            add(g, part(T, new R.CylinderGeometry(0.09, 0.09, 0.5, 12), stdMat(T, 0x39d353, 0x1a7a2e, 0.9, 0.3, 0.2)), 0, 0.72, -0.1, Math.PI / 2, 0, 0);
            add(g, part(T, new R.CylinderGeometry(0.05, 0.07, 0.4, 10), stdMat(T, 0x1c1c22, 0x000000, 1, 0.5, 0.7)), 0, 0.55, 0.6, Math.PI / 2, 0, 0);
            add(g, part(T, new R.ConeGeometry(0.06, 0.14, 10), stdMat(T, 0x39d353, 0x39d353, 1.2, 0.4, 0.3)), 0, 0.55, 0.85, Math.PI / 2, 0, 0);
            add(g, part(T, new R.SphereGeometry(0.05, 10, 8), stdMat(T, 0xb3ff5e, 0x7aff00, 1.5, 0.3, 0.1)), 0, 0.68, 0.25);
            add(g, part(T, new R.BoxGeometry(0.1, 0.22, 0.12), stdMat(T, 0x3a2a1a, 0x000000, 1, 0.85, 0.1)), 0, 0.32, -0.25);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildRuneblade(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(0.1, 1.05, 0.035), stdMat(T, 0x2b3550, 0x0a1030, 0.7, 0.4, 0.85)), 0, 0.82, 0);
            add(g, part(T, new R.OctahedronGeometry(0.09), stdMat(T, 0x101a3a, 0x3c8cff, 1.8, 0.25, 0.2)), 0, 1.44, 0);
            add(g, part(T, new R.OctahedronGeometry(0.055), stdMat(T, 0x0d1440, 0x3c8cff, 2.0, 0.25, 0.2)), 0, 1.0, 0.035);
            add(g, part(T, new R.OctahedronGeometry(0.055), stdMat(T, 0x0d1440, 0x3c8cff, 2.0, 0.25, 0.2)), 0, 0.66, 0.035);
            add(g, part(T, new R.TorusGeometry(0.14, 0.03, 8, 18), stdMat(T, 0x1a1a24, 0x3c8cff, 0.5, 0.5, 0.8)), 0, 0.28, 0, 0, 0, 0);
            add(g, part(T, new R.CylinderGeometry(0.045, 0.045, 0.32, 10), stdMat(T, 0x14141c, 0x000000, 1, 0.85, 0.2)), 0, 0.06, 0);
            add(g, part(T, new R.SphereGeometry(0.065, 10, 8), stdMat(T, 0x1a1a24, 0x3c8cff, 0.8, 0.5, 0.7)), 0, -0.13, 0);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildBoneScythe(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.CylinderGeometry(0.04, 0.05, 1.7, 10), stdMat(T, 0xcfc39a, 0x000000, 1, 0.8, 0.05)), 0, 0.35, 0);
            add(g, part(T, new R.TorusGeometry(0.55, 0.06, 8, 20, Math.PI * 0.75), stdMat(T, 0xe8e0c4, 0x000000, 1, 0.55, 0.1)), 0.28, 1.25, 0, 0, 0, Math.PI * 0.1);
            add(g, part(T, new R.ConeGeometry(0.07, 0.22, 8), stdMat(T, 0xe8e0c4, 0x000000, 1, 0.55, 0.1)), 0.78, 1.62, 0, 0, 0, -Math.PI / 3);
            add(g, part(T, new R.SphereGeometry(0.11, 10, 8), stdMat(T, 0xd8cda6, 0x000000, 1, 0.8, 0.05)), 0, 1.22, 0);
            add(g, part(T, new R.SphereGeometry(0.06, 8, 6), stdMat(T, 0x8a2be2, 0x8a2be2, 1.2, 0.4, 0.1)), 0, 1.22, 0.1);
            add(g, part(T, new R.SphereGeometry(0.07, 10, 8), stdMat(T, 0xcfc39a, 0x000000, 1, 0.8, 0.05)), 0, -0.54, 0);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildEmberCrossbow(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(0.12, 0.12, 0.9), stdMat(T, 0x4a2c14, 0x000000, 1, 0.8, 0.2)), 0, 0.55, 0);
            add(g, part(T, new R.BoxGeometry(0.7, 0.07, 0.1), stdMat(T, 0x33200f, 0x000000, 1, 0.75, 0.25)), 0, 0.62, 0.38);
            add(g, part(T, new R.BoxGeometry(0.66, 0.015, 0.015), stdMat(T, 0xd8cda6, 0x000000, 1, 0.7, 0.1)), 0, 0.62, 0.3);
            add(g, part(T, new R.CylinderGeometry(0.03, 0.03, 0.5, 8), stdMat(T, 0x5a5a66, 0x000000, 1, 0.5, 0.7)), 0, 0.62, 0.15, Math.PI / 2, 0, 0);
            add(g, part(T, new R.OctahedronGeometry(0.07), stdMat(T, 0x521a08, 0xff5a00, 1.8, 0.3, 0.2)), 0, 0.68, -0.05);
            add(g, part(T, new R.BoxGeometry(0.1, 0.2, 0.14), stdMat(T, 0x241608, 0x000000, 1, 0.85, 0.1)), 0, 0.36, -0.3);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildFrostbrandAxe(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.CylinderGeometry(0.045, 0.055, 1.2, 10), stdMat(T, 0x2c3a4a, 0x000000, 1, 0.8, 0.3)), 0, 0.4, 0);
            add(g, part(T, new R.BoxGeometry(0.34, 0.4, 0.07), stdMat(T, 0xa9c6de, 0x1a4a6e, 0.5, 0.35, 0.85)), 0.2, 1.0, 0);
            add(g, part(T, new R.BoxGeometry(0.34, 0.4, 0.07), stdMat(T, 0xa9c6de, 0x1a4a6e, 0.5, 0.35, 0.85)), -0.2, 1.0, 0);
            add(g, part(T, new R.ConeGeometry(0.1, 0.26, 4), stdMat(T, 0xd7e9f7, 0x66c2ff, 0.9, 0.3, 0.8)), 0.2, 1.32, 0);
            add(g, part(T, new R.ConeGeometry(0.1, 0.26, 4), stdMat(T, 0xd7e9f7, 0x66c2ff, 0.9, 0.3, 0.8)), -0.2, 1.32, 0);
            add(g, part(T, new R.OctahedronGeometry(0.08), stdMat(T, 0x0d2a4a, 0x66c2ff, 1.8, 0.25, 0.2)), 0, 1.0, 0);
            add(g, part(T, new R.SphereGeometry(0.06, 10, 8), stdMat(T, 0x2c3a4a, 0x66c2ff, 0.6, 0.6, 0.5)), 0, -0.24, 0);
        } catch (e) { /* ignore */ }
        return g;
    }

    var WEAPONS = {
        longsword: buildLongsword,
        warhammer: buildWarhammer,
        arcanestaff: buildArcaneStaff,
        chemgun: buildChemGun,
        runeblade: buildRuneblade,
        bonescythe: buildBoneScythe,
        embercrossbow: buildEmberCrossbow,
        frostbrandaxe: buildFrostbrandAxe
    };

    var WEAPON_ALIASES = {
        'longsword': 'longsword', 'long-sword': 'longsword', 'long sword': 'longsword',
        'warhammer': 'warhammer', 'war-hammer': 'warhammer', 'war hammer': 'warhammer',
        'arcanestaff': 'arcanestaff', 'arcane-staff': 'arcanestaff', 'arcane staff': 'arcanestaff',
        'arcane_staff': 'arcanestaff', 'staff': 'arcanestaff',
        'chemgum': 'chemgum', 'chemgum-placeholder': 'chemgum',
        'chemguncorrect': 'chemguncorrect',
        'runeblade': 'runeblade', 'rune-blade': 'runeblade', 'rune blade': 'runeblade',
        'bonescythe': 'bonescythe', 'bone-scythe': 'bonescythe', 'bone scythe': 'bonescythe',
        'embercrossbow': 'embercrossbow', 'ember-crossbow': 'embercrossbow', 'ember crossbow': 'embercrossbow',
        'frostbrandaxe': 'frostbrandaxe', 'frostbrand-axe': 'frostbrandaxe', 'frostbrand axe': 'frostbrandaxe'
    };
    // Fix the chem-gun alias keys (kept explicit so the mapping is obvious).
    try {
        WEAPON_ALIASES['chemguncorrect'] = undefined;
        WEAPON_ALIASES['chemgum'] = undefined;
        WEAPON_ALIASES['chemgum-placeholder'] = undefined;
        WEAPON_ALIASES['chemguncorrect'] = undefined;
        delete WEAPON_ALIASES['chemgum'];
        delete WEAPON_ALIASES['chemgum-placeholder'];
        delete WEAPON_ALIASES['chemguncorrect'];
        WEAPON_ALIASES['chemguncorrect2'] = undefined;
        delete WEAPON_ALIASES['chemguncorrect2'];
        WEAPON_ALIASES['chemgun'] = 'chemgun';
        WEAPON_ALIASES['chem-gun'] = 'chemgun';
        WEAPON_ALIASES['chem gun'] = 'chemgun';
        WEAPON_ALIASES['chem_gun'] = 'chemgun';
    } catch (e) { /* ignore */ }

    function normName(name) {
        try {
            var k = String(name || '').toLowerCase().replace(/_/g, '-').trim();
            if (WEAPON_ALIASES[k]) return WEAPON_ALIASES[k];
            var flat = k.replace(/[\s-]/g, '');
            if (WEAPONS[flat]) return flat;
            return '';
        } catch (e) { return ''; }
    }

    function buildWeapon(name, T) {
        try {
            if (!hasTHREE(R128(T))) return null;
            var key = normName(name);
            if (!key || !WEAPONS[key]) return null;
            return WEAPONS[key](R128(T));
        } catch (e) { return null; }
    }

    /* ================= PROPS ================= */

    function buildAltar(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(1.4, 0.25, 0.9), stdMat(T, 0x3d3d4a, 0x000000, 1, 0.85, 0.1)), 0, 0.12, 0);
            add(g, part(T, new R.BoxGeometry(1.0, 0.7, 0.6), stdMat(T, 0x4a4a58, 0x000000, 1, 0.85, 0.1)), 0, 0.6, 0);
            add(g, part(T, new R.BoxGeometry(1.2, 0.12, 0.8), stdMat(T, 0x2c2c38, 0x000000, 1, 0.8, 0.15)), 0, 1.0, 0);
            add(g, part(T, new R.OctahedronGeometry(0.16), stdMat(T, 0x3b1f6e, 0x9a3cff, 1.5, 0.25, 0.1)), 0, 1.3, 0);
            add(g, part(T, new R.CylinderGeometry(0.05, 0.07, 0.35, 8), stdMat(T, 0xd8cda6, 0x000000, 1, 0.8, 0.05)), -0.4, 1.2, 0.15);
            add(g, part(T, new R.CylinderGeometry(0.05, 0.07, 0.35, 8), stdMat(T, 0xd8cda6, 0x000000, 1, 0.8, 0.05)), 0.4, 1.2, 0.15);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildTombstone(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(0.9, 0.2, 0.7), stdMat(T, 0x3a3a44, 0x000000, 1, 0.9, 0.05)), 0, 0.1, 0);
            add(g, part(T, new R.BoxGeometry(0.6, 0.9, 0.18), stdMat(T, 0x55555f, 0x000000, 1, 0.9, 0.05)), 0, 0.62, 0, 0, 0, 0.06);
            add(g, part(T, new R.CylinderGeometry(0.3, 0.3, 0.18, 12, 1, false, 0, Math.PI), stdMat(T, 0x55555f, 0x000000, 1, 0.9, 0.05)), 0, 1.07, 0, 0, 0, 0.06);
            add(g, part(T, new R.BoxGeometry(0.36, 0.06, 0.02), stdMat(T, 0x2c2c34, 0x000000, 1, 0.9, 0.0)), 0, 0.72, 0.1);
            add(g, part(T, new R.SphereGeometry(0.09, 8, 6), stdMat(T, 0x2e4a2e, 0x000000, 1, 0.95, 0.0)), 0.32, 0.24, 0.1);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildCrystalCluster(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.CylinderGeometry(0.4, 0.5, 0.25, 7), stdMat(T, 0x3a3a44, 0x000000, 1, 0.9, 0.05)), 0, 0.12, 0);
            add(g, part(T, new R.OctahedronGeometry(0.32), stdMat(T, 0x2a6e8a, 0x1a9ec2, 0.9, 0.2, 0.1)), 0, 0.55, 0);
            add(g, part(T, new R.OctahedronGeometry(0.2), stdMat(T, 0x3b1f6e, 0x9a3cff, 1.0, 0.2, 0.1)), 0.3, 0.4, 0.1, 0, 0, 0.4);
            add(g, part(T, new R.OctahedronGeometry(0.16), stdMat(T, 0x1a6e4a, 0x2ae27a, 1.0, 0.2, 0.1)), -0.28, 0.36, -0.08, 0.3, 0, -0.4);
            add(g, part(T, new R.OctahedronGeometry(0.12), stdMat(T, 0x2a6e8a, 0x1a9ec2, 1.2, 0.2, 0.1)), 0.05, 0.9, -0.05);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildBonePile(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.SphereGeometry(0.16, 10, 8), stdMat(T, 0xd8cda6, 0x000000, 1, 0.85, 0.0)), 0, 0.16, 0);
            add(g, part(T, new R.SphereGeometry(0.13, 10, 8), stdMat(T, 0xcfc39a, 0x000000, 1, 0.85, 0.0)), 0.25, 0.13, 0.1);
            add(g, part(T, new R.SphereGeometry(0.13, 10, 8), stdMat(T, 0xe0d6b2, 0x000000, 1, 0.85, 0.0)), -0.24, 0.13, -0.05);
            add(g, part(T, new R.CylinderGeometry(0.05, 0.05, 0.7, 8), stdMat(T, 0xd8cda6, 0x000000, 1, 0.85, 0.0)), 0.05, 0.32, 0, 0, 0, Math.PI / 2.3);
            add(g, part(T, new R.CylinderGeometry(0.045, 0.045, 0.6, 8), stdMat(T, 0xcfc39a, 0x000000, 1, 0.85, 0.0)), -0.1, 0.28, 0.15, Math.PI / 2.2, 0, 0.5);
            add(g, part(T, new R.TorusGeometry(0.16, 0.045, 8, 14), stdMat(T, 0xe0d6b2, 0x000000, 1, 0.85, 0.0)), -0.05, 0.12, 0.3, Math.PI / 2, 0, 0);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildTorchSconce(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(0.18, 0.4, 0.1), stdMat(T, 0x3a3a44, 0x000000, 1, 0.85, 0.2)), 0, 0.9, 0);
            add(g, part(T, new R.CylinderGeometry(0.06, 0.04, 0.35, 8), stdMat(T, 0x2c2c34, 0x000000, 1, 0.7, 0.5)), 0, 1.15, 0.12, 0.5, 0, 0);
            add(g, part(T, new R.CylinderGeometry(0.09, 0.06, 0.14, 8), stdMat(T, 0x1c1c22, 0x000000, 1, 0.7, 0.4)), 0, 1.32, 0.2);
            add(g, part(T, new R.ConeGeometry(0.08, 0.22, 8), stdMat(T, 0xff8a00, 0xff6a00, 2.0, 0.5, 0.0)), 0, 1.5, 0.2);
            add(g, part(T, new R.SphereGeometry(0.05, 8, 6), stdMat(T, 0xffe28a, 0xffc233, 2.2, 0.5, 0.0)), 0, 1.58, 0.2);
        } catch (e) { /* ignore */ }
        return g;
    }

    function buildDungeonDoor(T) {
        if (!hasTHREE(R128(T))) return null;
        var R = R128(T), g = new R.Group();
        try {
            add(g, part(T, new R.BoxGeometry(0.5, 2.6, 0.4), stdMat(T, 0x4a4a58, 0x000000, 1, 0.85, 0.1)), -0.95, 1.3, 0);
            add(g, part(T, new R.BoxGeometry(0.5, 2.6, 0.4), stdMat(T, 0x4a4a58, 0x000000, 1, 0.85, 0.1)), 0.95, 1.3, 0);
            add(g, part(T, new R.BoxGeometry(2.4, 0.5, 0.4), stdMat(T, 0x4a4a58, 0x000000, 1, 0.85, 0.1)), 0, 2.75, 0);
            add(g, part(T, new R.BoxGeometry(0.7, 2.2, 0.15), stdMat(T, 0x3a2a1a, 0x000000, 1, 0.85, 0.1)), -0.36, 1.15, 0);
            add(g, part(T, new R.BoxGeometry(0.7, 2.2, 0.15), stdMat(T, 0x33241a, 0x000000, 1, 0.85, 0.1)), 0.36, 1.15, 0);
            add(g, part(T, new R.SphereGeometry(0.06, 8, 6), stdMat(T, 0x8a742f, 0x000000, 1, 0.5, 0.8)), -0.12, 1.15, 0.12);
            add(g, part(T, new R.TorusGeometry(0.12, 0.025, 8, 16), stdMat(T, 0x8a742f, 0x000000, 1, 0.5, 0.8)), -0.12, 1.0, 0.12);
            add(g, part(T, new R.OctahedronGeometry(0.09), stdMat(T, 0x3b1f6e, 0x9a3cff, 1.2, 0.3, 0.2)), 0, 2.75, 0.1);
        } catch (e) { /* ignore */ }
        return g;
    }

    var PROPS = {
        altar: buildAltar,
        tombstone: buildTombstone,
        crystalcluster: buildCrystalCluster,
        bonepile: buildBonePile,
        torchsconce: buildTorchSconce,
        torch: buildTorchSconce,
        dungeondoor: buildDungeonDoor,
        door: buildDungeonDoor
    };

    function buildProp(name, T) {
        try {
            if (!hasTHREE(R128(T))) return null;
            var k = String(name || '').toLowerCase().replace(/[\s_-]/g, '');
            if (k === 'crystal' || k === 'crystals') k = 'crystalcluster';
            if (k === 'bone' || k === 'bones') k = 'bonepile';
            if (k === 'sconce') k = 'torchsconce';
            if (!PROPS[k]) return null;
            return PROPS[k](R128(T));
        } catch (e) { return null; }
    }

    /* ================= LIGHT ================= */

    function gfxPreset() {
        try {
            var g = window.FourWeirdGraphics;
            if (g && typeof g.get === 'function') {
                var name = 'balanced';
                try {
                    if (typeof g.load === 'function') {
                        var saved = g.load();
                        if (saved && saved.preset) name = String(saved.preset).replace(/^auto:/, '');
                    }
                } catch (e) { /* ignore */ }
                var s = g.get(name);
                if (s) { s.__presetName = name; return s; }
            }
        } catch (e) { /* ignore */ }
        return { __presetName: 'balanced', pixelRatioMax: 1.0, particleMult: 0.6, lightCount: 2, shadows: false, postFX: false };
    }

    function liveGame() {
        try {
            if (window.GraveGainGame) return window.GraveGainGame;
            if (window.gg) return window.gg;
        } catch (e) { /* ignore */ }
        return null;
    }

    function applyLighting(preset) {
        try {
            var s = preset || gfxPreset();
            var prMax = (s && typeof s.pixelRatioMax === 'number') ? s.pixelRatioMax : 1.0;
            var game = liveGame();
            if (!game) return false;
            try {
                var renderer = game.renderer || game.__renderer;
                if (renderer && typeof renderer.setPixelRatio === 'function') {
                    var cap = Math.min(prMax, (typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1) || 1);
                    renderer.setPixelRatio(Math.max(0.5, cap));
                }
            } catch (e) { /* ignore */ }
            try {
                var scene = game.scene || game.__scene;
                if (scene && scene.fog) {
                    if (typeof game.__ggBaseFogDensity !== 'number' && typeof scene.fog.density === 'number') {
                        game.__ggBaseFogDensity = scene.fog.density;
                    }
                    if (typeof game.__ggBaseFogDensity === 'number' && typeof scene.fog.density === 'number') {
                        // Gentle "breathing": thicker fog on low presets (mood), thinner on ultra (clarity).
                        var mult = (prMax >= 2) ? 0.85 : (prMax >= 1.5 ? 1.0 : 1.2);
                        scene.fog.density = game.__ggBaseFogDensity * mult;
                    }
                }
            } catch (e) { /* ignore */ }
            try {
                // Torch-flicker amplitude consumed by the game loop / graphics-plus layer.
                var flicker = (prMax <= 0.75) ? 0 : (prMax >= 2 ? 0.35 : 0.2);
                game.__ggPlusFlicker = flicker;
            } catch (e) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    }

    function getQuality() {
        try {
            var s = gfxPreset();
            return (s && s.__presetName) ? s.__presetName : 'balanced';
        } catch (e) { return 'balanced'; }
    }

    /* ================= FX ================= */

    function flashHit(obj) {
        try {
            if (!window.THREE || !obj) return false;
            var targets = [];
            try {
                if (typeof obj.traverse === 'function') {
                    obj.traverse(function (o) { if (o && o.material && o.material.emissive) targets.push(o.material); });
                } else if (obj.material && obj.material.emissive) {
                    targets.push(obj.material);
                }
            } catch (e) { return false; }
            if (!targets.length) return false;
            var i;
            for (i = 0; i < targets.length; i++) {
                try {
                    var m = targets[i];
                    if (!m.__ggFlashSaved) {
                        m.__ggFlashSaved = true;
                        m.__ggFlashHex = m.emissive.getHex();
                    }
                    m.emissive.setHex(0xffffff);
                    m.emissiveIntensity = 2.0;
                } catch (e) { /* ignore */ }
            }
            try {
                setTimeout(function () {
                    try {
                        for (var j = 0; j < targets.length; j++) {
                            try {
                                var mm = targets[j];
                                if (mm.__ggFlashSaved) {
                                    mm.emissive.setHex(mm.__ggFlashHex);
                                    mm.emissiveIntensity = 1.0;
                                }
                            } catch (e) { /* ignore */ }
                        }
                    } catch (e) { /* ignore */ }
                }, 90);
            } catch (e) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    }

    function muzzleLight(color) {
        try {
            if (!window.THREE) return null;
            var R = window.THREE;
            var light = new R.PointLight(typeof color === 'number' ? color : 0xffa233, 2.2, 9);
            try {
                setTimeout(function () {
                    try {
                        light.intensity = 0;
                        if (light.parent) light.parent.remove(light);
                    } catch (e) { /* ignore */ }
                }, 120);
            } catch (e) { /* ignore */ }
            return light;
        } catch (e) { return null; }
    }

    function buildBossAura(color) {
        try {
            if (!window.THREE) return null;
            var R = window.THREE;
            var g = new R.Group();
            var mat = stdMat(null, 0x1a1a24, (typeof color === 'number' ? color : 0xff2233), 1.6, 0.4, 0.2);
            var ring = part(null, new R.TorusGeometry(1.2, 0.07, 8, 40), mat);
            add(g, ring, 0, 0.15, 0, Math.PI / 2, 0, 0);
            var ring2 = part(null, new R.TorusGeometry(0.85, 0.05, 8, 32), mat);
            add(g, ring2, 0, 0.15, 0, Math.PI / 2, 0, 0);
            var core = part(null, new R.CylinderGeometry(1.0, 1.0, 0.04, 24), mat);
            add(g, core, 0, 0.1, 0);
            return g;
        } catch (e) { return null; }
    }

    var FX = {
        flashHit: flashHit,
        muzzleLight: muzzleLight,
        buildBossAura: buildBossAura
    };

    /* ================= BOOT ================= */

    var lightingApplied = false;
    var pollTries = 0;

    function applyOnce() {
        try { if (applyLighting()) lightingApplied = true; } catch (e) { /* ignore */ }
    }

    function pollForGame() {
        try {
            if (lightingApplied) return;
            if (pollTries >= 20) return;
            pollTries++;
            var game = liveGame();
            if (game) { applyOnce(); return; }
            setTimeout(pollForGame, 1000);
        } catch (e) { /* ignore */ }
    }

    function boot() {
        try { applyOnce(); } catch (e) { /* ignore */ }
        try { pollForGame(); } catch (e) { /* ignore */ }
        try {
            window.addEventListener('fourweird-graphics', function () {
                try { lightingApplied = false; pollTries = 0; applyOnce(); pollForGame(); } catch (e) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }
        try {
            // Same graphics for every content mode (gore/drugs live in other
            // modules); store the mode only, never swap models.
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
        WEAPONS: WEAPONS,
        buildWeapon: buildWeapon,
        PROPS: PROPS,
        buildProp: buildProp,
        FX: FX,
        applyLighting: applyLighting,
        getQuality: getQuality,
        getContentMode: function () { try { return contentMode; } catch (e) { return 'all'; } }
    };

    try {
        window.GraveGainGraphics3D = api;
    } catch (e) { /* ignore */ }

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain-graphics-3d', version: VERSION, init: applyOnce });
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
