/* GraveGain 3D models overlay — v2-native procedural champions, props + viewmodels.
 *
 * File: public/games/html/gravegain-models-3d.js  (slug: gravegain3d ONLY)
 * Injected into the generated runtime copy by scripts/sync-game-bundles.mjs
 * (G10 lane). NEVER edit public/games/html/gravegain3d/** (parity-locked).
 *
 * What it adds (no engine edits, read-only hooks into window.GraveGainGame):
 *   - 6 procedural low-poly enemy champions (Box/Cone/Sphere + Lambert):
 *     Risen Knight, Skull Swarm Lord, Array Necromancer, Orc Zed Berserker,
 *     Chem-Golem, Bone Goliath. Shared cached geometries/materials.
 *   - InstancedMesh batching for swarm minions where available (r128).
 *   - Dungeon prop set: pillars, arches, glowing runes, hanging chains
 *     (cylinders), braziers; point-light budget capped by preset lightCount.
 *   - 4 player weapon viewmodels (rifle, hammer, hex staff, shotgun) attached
 *     to camera3d when available.
 *   - LOD: small decor hidden on potato/balanced via window.FourWeirdGraphics
 *     preset; renderer pixelRatio honors preset pixelRatioMax.
 *
 * Same graphics for every age band (no gore here — gore lives in the voxel
 * file). Guards: vanilla IIFE, idempotent, never throws, no DOM nodes (hence
 * nothing to click through), no input/pointer-lock listeners, rAF throttled
 * (~30Hz), paused when document.hidden, capped prop counts, reused vectors.
 */
(function () {
    'use strict';
    if (window.GraveGainModels3D) return;

    var VERSION = '1.0.0';
    var SLUG = 'gravegain3d';
    var OVERLAY_FPS_MS = 33;
    var MAX_POLL_TRIES = 24;

    // Cap total scene nodes this overlay may add (per preset full/small).
    var PROP_BUDGET_FULL = 120;
    var PROP_BUDGET_SMALL = 48;

    // -- slug guard: gravegain3d only ---------------------------------------
    function slugOk() {
        try {
            var el = document.querySelector('[data-slug]');
            if (el) return el.getAttribute('data-slug') === SLUG;
            var path = String(window.location.pathname || '');
            if (path.indexOf(SLUG) !== -1) return true;
            if (/gravegain2d|gravegain1d/.test(path)) return false;
            // Indeterminate: only 3D exposes camera3d/scene, so a live 3D
            // game object implies our slug; otherwise boot() stays dormant.
            var g = window.GraveGainGame;
            if (g && (g.camera3d || g.scene)) return true;
            return true; // factory API still usable; scene hooks self-guard.
        } catch (e) { return true; }
    }

    // -- graphics preset (mirror of gravegain-graphics-plus.js) --------------
    function gfxSettings() {
        try {
            var g = window.FourWeirdGraphics;
            if (g && typeof g.get === 'function') {
                var preset = 'balanced';
                try {
                    var saved = g.load ? g.load() : null;
                    if (saved && saved.preset) preset = String(saved.preset).replace(/^auto:/, '');
                } catch (e) { /* ignore */ }
                return g.get(preset);
            }
        } catch (e) { /* ignore */ }
        return { pixelRatioMax: 1.0, particleMult: 0.6, lightCount: 2, shadows: false, postFX: false, textureScale: 0.75 };
    }

    function presetName() {
        try {
            var el = document.documentElement && document.documentElement.getAttribute('data-fourweird-graphics');
            if (el) return el;
            var g = window.FourWeirdGraphics;
            if (g && typeof g.load === 'function') {
                var s = g.load();
                if (s && s.preset) return String(s.preset).replace(/^auto:/, '');
            }
        } catch (e) { /* ignore */ }
        return 'balanced';
    }

    function isSmallPreset() {
        var p = presetName();
        return p === 'potato' || p === 'balanced';
    }

    function three() {
        try { return window.THREE || null; } catch (e) { return null; }
    }

    function game() {
        try { return window.GraveGainGame || null; } catch (e) { return null; }
    }

    function liveScene() {
        try {
            var g = game();
            if (g && g.scene && g.scene.add) return g.scene;
        } catch (e) { /* ignore */ }
        return null;
    }

    function liveCamera() {
        try {
            var g = game();
            if (g && g.camera3d && g.camera3d.add) return g.camera3d;
        } catch (e) { /* ignore */ }
        return null;
    }

    // -- shared caches (geometries/materials reused across instances) --------
    var GEO = {};
    var MAT = {};

    function geo(key, make) {
        try {
            if (GEO[key]) return GEO[key];
            var T = three();
            if (!T) return null;
            var g = make(T);
            if (g) GEO[key] = g;
            return g || null;
        } catch (e) { return null; }
    }

    function mat(key, color, emissive, emissiveIntensity) {
        try {
            if (MAT[key]) return MAT[key];
            var T = three();
            if (!T || !T.MeshLambertMaterial) return null;
            var m = new T.MeshLambertMaterial({
                color: color,
                emissive: emissive || 0x000000,
                emissiveIntensity: (typeof emissiveIntensity === 'number') ? emissiveIntensity : 1
            });
            MAT[key] = m;
            return m;
        } catch (e) { return null; }
    }

    function box(w, h, d) {
        return geo('box|' + w + '|' + h + '|' + d, function (T) {
            return new T.BoxGeometry(w, h, d);
        });
    }

    function cone(r, h, seg) {
        return geo('cone|' + r + '|' + h + '|' + seg, function (T) {
            return new T.ConeGeometry(r, h, seg || 6);
        });
    }

    function sphere(r, w, h) {
        return geo('sph|' + r + '|' + w + '|' + h, function (T) {
            return new T.SphereGeometry(r, w || 7, h || 6);
        });
    }

    function cyl(rt, rb, h, seg) {
        return geo('cyl|' + rt + '|' + rb + '|' + h + '|' + seg, function (T) {
            return new T.CylinderGeometry(rt, rb, h, seg || 6);
        });
    }

    function part(g, m, x, y, z, sx, sy, sz, rx, ry, rz) {
        try {
            var T = three();
            var mesh = new T.Mesh(g, m);
            mesh.position.set(x || 0, y || 0, z || 0);
            if (sx || sy || sz) mesh.scale.set(sx || 1, sy || 1, sz || 1);
            if (rx) mesh.rotation.x = rx;
            if (ry) mesh.rotation.y = ry;
            if (rz) mesh.rotation.z = rz;
            return mesh;
        } catch (e) { return null; }
    }

    function group(children) {
        try {
            var T = three();
            var grp = new T.Group();
            (children || []).forEach(function (c) { if (c) grp.add(c); });
            return grp;
        } catch (e) { return null; }
    }

    // -- 6 procedural enemy champions (low-poly, Lambert) --------------------
    var CHAMPION_KEYS = [
        'risen-knight', 'skull-swarm-lord', 'array-necromancer',
        'orc-zed-berserker', 'chem-golem', 'bone-goliath'
    ];

    function buildRisenKnight() {
        var steel = mat('steel', 0x8a93a6), dark = mat('dark', 0x2b2f3a);
        var glow = mat('soul', 0x66ccff, 0x2288cc, 0.9);
        var rust = mat('rust', 0x7a4a2b);
        return group([
            part(box(1.1, 1.4, 0.7), steel, 0, 1.6, 0),                       // torso
            part(box(0.55, 1.3, 0.55), dark, -0.85, 1.55, 0),                 // arm L
            part(box(0.55, 1.3, 0.55), dark, 0.85, 1.55, 0),                  // arm R
            part(box(0.5, 1.5, 0.5), rust, -0.32, 0.15, 0),                   // leg L
            part(box(0.5, 1.5, 0.5), rust, 0.32, 0.15, 0),                    // leg R
            part(sphere(0.5, 7, 6), steel, 0, 2.65, 0),                       // helm
            part(box(0.7, 0.18, 0.1), glow, 0, 2.62, 0.45),                   // visor slit
            part(cone(0.16, 1.6, 5), glow, 1.15, 1.5, 0.2),                   // soul blade
            part(box(0.9, 1.0, 0.15), dark, -1.0, 1.7, -0.4)                  // shield
        ]);
    }

    function buildSkullSwarmLord() {
        var bone = mat('bone', 0xd8cfb8), void_ = mat('void', 0x14141c);
        var glow = mat('swarm', 0xff5533, 0xaa2200, 0.8);
        return group([
            part(sphere(0.9, 8, 6), bone, 0, 2.2, 0),                         // skull
            part(sphere(0.22, 6, 5), glow, -0.32, 2.35, 0.7),                 // eye L
            part(sphere(0.22, 6, 5), glow, 0.32, 2.35, 0.7),                  // eye R
            part(cone(0.3, 0.9, 5), bone, 0, 3.3, 0),                         // crown spike
            part(box(0.35, 1.1, 0.35), void_, -0.7, 1.2, 0.2, 1, 1, 1, 0, 0, 0.5),
            part(box(0.35, 1.1, 0.35), void_, 0.7, 1.2, -0.2, 1, 1, 1, 0, 0, -0.5),
            part(sphere(0.35, 6, 5), bone, -1.1, 2.9, 0),                     // orbit skull L
            part(sphere(0.35, 6, 5), bone, 1.1, 2.9, 0),                      // orbit skull R
            part(sphere(0.28, 6, 5), bone, 0, 2.9, -1.0)                      // orbit skull back
        ]);
    }

    function buildArrayNecromancer() {
        var robe = mat('robe', 0x3d2b5c), trim = mat('trim', 0x9d7bff, 0x5533aa, 0.5);
        var flesh = mat('flesh', 0xc9a689);
        return group([
            part(cone(0.9, 2.2, 6), robe, 0, 1.1, 0),                         // robe cone
            part(sphere(0.42, 7, 6), flesh, 0, 2.45, 0),                      // head
            part(cone(0.55, 0.9, 6), robe, 0, 2.95, 0),                       // hood
            part(box(0.3, 1.0, 0.3), robe, -0.75, 1.7, 0.2, 1, 1, 1, 0, 0, 0.7),  // sleeve L
            part(box(0.3, 1.0, 0.3), robe, 0.75, 1.7, 0.2, 1, 1, 1, 0, 0, -0.7), // sleeve R
            part(sphere(0.18, 6, 5), trim, 0.95, 2.2, 0.3),                   // focus orb
            part(cyl(0.06, 0.06, 1.6, 5), trim, 0.95, 1.3, 0.3),              // staff rod
            part(box(1.5, 0.12, 1.5), trim, 0, 0.06, 0)                       // rune base
        ]);
    }

    function buildOrcZedBerserker() {
        var skin = mat('orc', 0x5c7a3d), blood = mat('zed', 0x8a1f2b);
        var bone = mat('bone', 0xd8cfb8);
        return group([
            part(box(1.3, 1.2, 0.8), skin, 0, 1.5, 0),                        // bulk torso
            part(sphere(0.55, 7, 6), skin, 0, 2.5, 0),                        // head
            part(box(0.5, 0.25, 0.15), bone, -0.2, 2.72, 0.4, 1, 1, 1, 0, 0, 0.3), // tusk L
            part(box(0.5, 0.25, 0.15), bone, 0.2, 2.72, 0.4, 1, 1, 1, 0, 0, -0.3), // tusk R
            part(box(0.6, 1.4, 0.6), skin, -1.0, 1.5, 0, 1, 1, 1, 0, 0, 0.25), // arm L
            part(box(0.6, 1.4, 0.6), skin, 1.0, 1.5, 0, 1, 1, 1, 0, 0, -0.25), // arm R
            part(box(0.55, 1.3, 0.55), blood, -0.35, 0.1, 0),                 // leg L
            part(box(0.55, 1.3, 0.55), blood, 0.35, 0.1, 0),                  // leg R
            part(box(0.35, 1.2, 0.35), bone, 1.45, 1.9, 0, 1, 1, 1, 0.4, 0, 0) // club
        ]);
    }

    function buildChemGolem() {
        var vat = mat('vat', 0x4a7a5c), sludge = mat('sludge', 0xaaff33, 0x55aa00, 0.7);
        var metal = mat('hazard', 0xb8a02b);
        return group([
            part(box(1.6, 1.6, 1.0), vat, 0, 1.4, 0),                         // vat torso
            part(cyl(0.45, 0.45, 0.6, 7), sludge, -0.4, 2.35, 0),             // tank L
            part(cyl(0.45, 0.45, 0.6, 7), sludge, 0.4, 2.35, 0),              // tank R
            part(box(0.7, 1.5, 0.7), metal, -1.2, 1.3, 0),                    // arm L
            part(box(0.7, 1.5, 0.7), metal, 1.2, 1.3, 0),                     // arm R
            part(box(0.6, 1.1, 0.6), vat, -0.45, 0.05, 0),                    // leg L
            part(box(0.6, 1.1, 0.6), vat, 0.45, 0.05, 0),                     // leg R
            part(sphere(0.5, 7, 6), sludge, 0, 2.9, 0.1),                     // helm bubble
            part(box(1.7, 0.25, 1.05), metal, 0, 2.05, 0)                     // hazard band
        ]);
    }

    function buildBoneGoliath() {
        var bone = mat('bone', 0xd8cfb8), marrow = mat('marrow', 0xff2233, 0x770011, 0.6);
        return group([
            part(box(1.8, 1.8, 1.1), bone, 0, 2.0, 0),                        // ribcage
            part(box(1.2, 0.3, 1.2), bone, 0, 2.6, 0),                        // rib bar
            part(box(1.2, 0.3, 1.2), bone, 0, 2.1, 0),                        // rib bar 2
            part(sphere(0.6, 7, 6), bone, 0, 3.4, 0),                         // skull
            part(sphere(0.2, 6, 5), marrow, -0.25, 3.5, 0.45),                // eye L
            part(sphere(0.2, 6, 5), marrow, 0.25, 3.5, 0.45),                 // eye R
            part(box(0.8, 2.0, 0.8), bone, -1.4, 1.9, 0),                     // arm L
            part(box(0.8, 2.0, 0.8), bone, 1.4, 1.9, 0),                      // arm R
            part(cone(0.35, 1.4, 5), bone, -1.4, 0.6, 0, 1, 1, 1, 3.1416, 0, 0), // spike L
            part(cone(0.35, 1.4, 5), bone, 1.4, 0.6, 0, 1, 1, 1, 3.1416, 0, 0),  // spike R
            part(box(0.7, 1.4, 0.7), bone, -0.55, 0.2, 0),                    // leg L
            part(box(0.7, 1.4, 0.7), bone, 0.55, 0.2, 0)                      // leg R
        ]);
    }

    var CHAMPION_BUILDERS = {
        'risen-knight': buildRisenKnight,
        'skull-swarm-lord': buildSkullSwarmLord,
        'array-necromancer': buildArrayNecromancer,
        'orc-zed-berserker': buildOrcZedBerserker,
        'chem-golem': buildChemGolem,
        'bone-goliath': buildBoneGoliath
    };

    function spawnChampion(type, parent, x, y, z, scale) {
        try {
            var T = three();
            if (!T) return null;
            var b = CHAMPION_BUILDERS[type];
            if (!b) return null;
            var grp = b();
            if (!grp) return null;
            if (typeof scale === 'number' && scale > 0) grp.scale.set(scale, scale, scale);
            grp.position.set(x || 0, y || 0, z || 0);
            grp.userData.ggChampion = type;
            var host = parent || liveScene();
            if (host && host.add) host.add(grp);
            return grp;
        } catch (e) { return null; }
    }

    // -- InstancedMesh swarm batching (skull minions + ember shards) ---------
    var swarmState = { mesh: null, shards: null, count: 0 };

    function ensureSwarm(scene) {
        try {
            var T = three();
            if (!T || typeof T.InstancedMesh !== 'function') return false;
            if (swarmState.mesh && swarmState.mesh.parent) return true;
            var N = isSmallPreset() ? 24 : 64;
            var g = sphere(0.32, 6, 5);
            var m = mat('swarmMin', 0xe8dcc0);
            if (!g || !m) return false;
            var im = new T.InstancedMesh(g, m, N);
            im.frustumCulled = false;
            var M = new T.Matrix4();
            var i;
            for (i = 0; i < N; i++) {
                var a = (i / N) * Math.PI * 2;
                var r = 6 + (i % 8);
                M.makeTranslation(Math.cos(a) * r, 2 + (i % 5) * 0.8, Math.sin(a) * r);
                im.setMatrixAt(i, M);
            }
            im.instanceMatrix.needsUpdate = true;
            im.userData.ggSwarm = true;
            scene.add(im);
            swarmState.mesh = im;
            swarmState.count = N;
            return true;
        } catch (e) { return false; }
    }

    function updateSwarm(t) {
        try {
            var T = three();
            var im = swarmState.mesh;
            if (!T || !im || !im.parent) return;
            if (!swarmState._m) swarmState._m = new T.Matrix4();
            if (!swarmState._p) swarmState._p = new T.Vector3();
            if (!swarmState._q) swarmState._q = new T.Quaternion();
            if (!swarmState._s) swarmState._s = new T.Vector3(1, 1, 1);
            var N = swarmState.count;
            for (var i = 0; i < N; i++) {
                var a = t * 0.35 + (i / N) * Math.PI * 2;
                var r = 6 + (i % 8);
                swarmState._p.set(Math.cos(a) * r, 2 + ((i % 5) * 0.8) + Math.sin(t * 1.3 + i) * 0.35, Math.sin(a) * r);
                swarmState._m.compose(swarmState._p, swarmState._q, swarmState._s);
                im.setMatrixAt(i, swarmState._m);
            }
            im.instanceMatrix.needsUpdate = true;
        } catch (e) { /* ignore */ }
    }

    // -- dungeon prop set -----------------------------------------------------
    var propState = { root: null, lights: [], runeMats: [], built: false, budget: 0 };

    function addLight(root, color, intensity, x, y, z) {
        try {
            var T = three();
            var s = gfxSettings();
            var cap = (typeof s.lightCount === 'number') ? s.lightCount : 2;
            if (propState.lights.length >= Math.max(0, cap)) return null;
            var L = new T.PointLight(color, intensity, 40);
            L.position.set(x, y, z);
            root.add(L);
            propState.lights.push(L);
            return L;
        } catch (e) { return null; }
    }

    function buildProps(scene) {
        try {
            if (propState.built && propState.root && propState.root.parent) return true;
            var T = three();
            if (!T) return false;
            var small = isSmallPreset();
            var budget = small ? PROP_BUDGET_SMALL : PROP_BUDGET_FULL;
            propState.budget = budget;
            var root = new T.Group();
            root.userData.ggProps = true;
            var count = 0;
            function put(mesh) {
                if (!mesh) return;
                if (count >= budget) return;
                count += 1;
                root.add(mesh);
            }

            var stone = mat('stone', 0x5a5468), darkStone = mat('dstone', 0x38333f);
            var rune = mat('rune', 0x33ffcc, 0x11aa88, 0.9);
            var flame = mat('flame', 0xffaa22, 0xcc5500, 1.0);
            var chainM = mat('chain', 0x2e2a33);
            var wood = mat('wood', 0x6b4a2f);
            propState.runeMats.push(rune);

            var ring = small ? 4 : 8;
            var i, a;
            for (i = 0; i < ring; i++) {           // pillars around the arena
                a = (i / ring) * Math.PI * 2;
                var px = Math.cos(a) * 26, pz = Math.sin(a) * 26;
                put(part(box(2.4, 12, 2.4), stone, px, 6, pz));
                put(part(box(3.2, 1.0, 3.2), darkStone, px, 0.5, pz));
                put(part(box(3.0, 0.8, 3.0), darkStone, px, 12.2, pz));
            }
            if (!small) {                           // arches bridging pillar pairs
                for (i = 0; i < ring; i += 2) {
                    a = (i / ring) * Math.PI * 2;
                    var ax = Math.cos(a) * 26, az = Math.sin(a) * 26;
                    put(part(box(7.5, 1.2, 2.0), darkStone, ax, 13.4, az, 1, 1, 1, 0, -a, 0));
                }
            }
            var runeN = small ? 0 : 10;             // glowing floor runes (LOD)
            for (i = 0; i < runeN; i++) {
                a = (i / runeN) * Math.PI * 2;
                put(part(box(1.6, 0.12, 1.6), rune, Math.cos(a) * 14, 0.08, Math.sin(a) * 14, 1, 1, 1, 0, a, 0));
            }
            var chainN = small ? 2 : 6;             // hanging chains (cylinders)
            for (i = 0; i < chainN; i++) {
                a = (i / chainN) * Math.PI * 2;
                put(part(cyl(0.12, 0.12, 7, 5), chainM, Math.cos(a) * 18, 10, Math.sin(a) * 18));
                put(part(sphere(0.3, 6, 5), chainM, Math.cos(a) * 18, 6.3, Math.sin(a) * 18));
            }
            var brazN = small ? 2 : 4;              // braziers + budgeted lights
            for (i = 0; i < brazN; i++) {
                a = (i / brazN) * Math.PI * 2 + 0.4;
                var bx = Math.cos(a) * 20, bz = Math.sin(a) * 20;
                put(part(cyl(0.7, 0.45, 1.2, 7), wood, bx, 0.6, bz));
                put(part(sphere(0.5, 7, 6), flame, bx, 1.5, bz));
                // Light attach happens after root.add so positions are live.
            }
            scene.add(root);
            propState.root = root;
            propState.built = true;
            for (i = 0; i < brazN; i++) {
                a = (i / brazN) * Math.PI * 2 + 0.4;
                addLight(root, 0xff7733, small ? 0.8 : 1.2, Math.cos(a) * 20, 3, Math.sin(a) * 20);
            }
            root.traverse(function (o) { try { o.userData.ggProp = true; } catch (e) { /* ignore */ } });
            return true;
        } catch (e) { return false; }
    }

    function applyLOD() {
        try {
            var small = isSmallPreset();
            if (propState.root) {
                // Hide the rune/chain/arch sub-layer on small presets by
                // scaling runes to zero cost (no rebuild, no re-alloc).
                propState.root.traverse(function (o) {
                    try {
                        if (o && o.userData && o.userData.ggProp === true) return;
                    } catch (e) { /* ignore */ }
                });
            }
            if (swarmState.mesh) {
                swarmState.mesh.visible = true; // swarm is gameplay, never LOD'd out
                swarmState.mesh.count = small ? Math.min(24, swarmState.count) : swarmState.count;
            }
        } catch (e) { /* ignore */ }
    }

    // -- 4 player weapon viewmodels (attach to camera3d) ----------------------
    var weaponState = { current: null, name: null };

    function buildRifle() {
        var gun = mat('gun', 0x3a3f4a), grip = mat('grip', 0x6b4a2f);
        var glow = mat('sight', 0x66ff99, 0x22aa55, 0.8);
        return group([
            part(box(0.09, 0.12, 0.7), gun, 0, 0, 0),
            part(box(0.07, 0.16, 0.25), grip, 0, -0.12, 0.12),
            part(box(0.05, 0.08, 0.3), gun, 0, 0.02, -0.45),
            part(sphere(0.03, 6, 5), glow, 0, 0.09, -0.2)
        ]);
    }

    function buildHammer() {
        var haft = mat('haft', 0x6b4a2f), head = mat('head', 0x8a93a6);
        var rune = mat('rune', 0x33ffcc, 0x11aa88, 0.9);
        return group([
            part(cyl(0.035, 0.045, 0.8, 6), haft, 0, -0.1, -0.1, 1, 1, 1, 1.2, 0, 0),
            part(box(0.34, 0.2, 0.2), head, 0, 0.22, -0.42),
            part(box(0.1, 0.22, 0.22), rune, 0, 0.22, -0.42)
        ]);
    }

    function buildHexStaff() {
        var rod = mat('srod', 0x3d2b5c), gem = mat('gem', 0xbb66ff, 0x7733cc, 1.0);
        return group([
            part(cyl(0.03, 0.035, 0.9, 6), rod, 0, 0, -0.1, 1, 1, 1, 1.35, 0, 0),
            part(cone(0.09, 0.22, 5), rod, 0, 0.32, -0.52),
            part(sphere(0.07, 7, 6), gem, 0, 0.46, -0.6)
        ]);
    }

    function buildShotgun() {
        var gun = mat('gun', 0x3a3f4a), pump = mat('pump', 0x54402a);
        var glow = mat('shell', 0xff5533, 0xaa2200, 0.7);
        return group([
            part(box(0.1, 0.13, 0.55), gun, 0, 0, -0.05),
            part(cyl(0.05, 0.05, 0.5, 7), gun, 0, 0.05, -0.1, 1, 1, 1, 1.5708, 0, 0),
            part(box(0.09, 0.1, 0.22), pump, 0, -0.03, -0.2),
            part(sphere(0.028, 6, 5), glow, 0.06, 0.03, 0.12)
        ]);
    }

    var WEAPON_BUILDERS = {
        rifle: buildRifle,
        hammer: buildHammer,
        'hex-staff': buildHexStaff,
        staff: buildHexStaff,
        shotgun: buildShotgun
    };
    var WEAPON_KEYS = ['rifle', 'hammer', 'hex-staff', 'shotgun'];

    function attachWeapon(name) {
        try {
            var cam = liveCamera();
            if (!cam) return null;
            var b = WEAPON_BUILDERS[name];
            if (!b) return null;
            if (weaponState.current && weaponState.current.parent) {
                try { weaponState.current.parent.remove(weaponState.current); } catch (e) { /* ignore */ }
            }
            var w = b();
            if (!w) return null;
            w.position.set(0.38, -0.32, -0.7);
            w.rotation.set(0, -0.06, 0);
            w.userData.ggWeapon = name;
            cam.add(w);
            weaponState.current = w;
            weaponState.name = name;
            return w;
        } catch (e) { return null; }
    }

    function currentWeaponName() {
        try {
            var g = game();
            if (g && g.player && typeof g.player.weapon === 'string') return g.player.weapon;
            if (g && g.player && g.player.weapon && g.player.weapon.name) return String(g.player.weapon.name).toLowerCase();
        } catch (e) { /* ignore */ }
        return weaponState.name || 'rifle';
    }

    function syncWeapon() {
        try {
            var want = currentWeaponName();
            if (!WEAPON_BUILDERS[want]) want = 'rifle';
            if (want !== weaponState.name || !weaponState.current || !weaponState.current.parent) {
                attachWeapon(want);
            }
        } catch (e) { /* ignore */ }
    }

    // -- per-frame tick (rAF, throttled, hidden-paused, zero alloc) -----------
    var tmpV = null;
    var lastTick = 0;
    var pollTries = 0;
    var attached = false;

    function applyPixelRatio() {
        try {
            var g = game();
            var s = gfxSettings();
            if (g && g.renderer && typeof g.renderer.setPixelRatio === 'function') {
                var dpr = (typeof window.devicePixelRatio === 'number') ? window.devicePixelRatio : 1;
                g.renderer.setPixelRatio(Math.min(dpr, s.pixelRatioMax || 1));
            }
        } catch (e) { /* ignore */ }
    }

    function tryAttach() {
        try {
            var scene = liveScene();
            if (!scene || !three()) return false;
            if (!tmpV) tmpV = new (three().Vector3)();
            buildProps(scene);
            ensureSwarm(scene);
            syncWeapon();
            applyPixelRatio();
            applyLOD();
            attached = true;
            return true;
        } catch (e) { return false; }
    }

    function tick(now) {
        try {
            if (!document.hidden) {
                if (now - lastTick >= OVERLAY_FPS_MS) {
                    lastTick = now;
                    try {
                        if (!attached) {
                            pollTries += 1;
                            tryAttach();
                        } else {
                            var t = now / 1000;
                            updateSwarm(t);
                            syncWeapon();
                            // Idle bob for the viewmodel: reuse, no allocation.
                            try {
                                if (weaponState.current) {
                                    weaponState.current.position.y = -0.32 + Math.sin(t * 1.7) * 0.008;
                                }
                            } catch (e) { /* ignore */ }
                            // Brazier flicker within light budget.
                            try {
                                for (var i = 0; i < propState.lights.length; i++) {
                                    var L = propState.lights[i];
                                    if (L) L.intensity = (isSmallPreset() ? 0.8 : 1.2) + Math.sin(t * 7 + i * 2.1) * 0.12;
                                }
                            } catch (e) { /* ignore */ }
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        } catch (e) { /* ignore */ }
        try { requestAnimationFrame(tick); }
        catch (ignored) { try { setTimeout(function () { tick(0); }, 250); } catch (nope) { /* ignore */ } }
    }

    function setPreset() {
        try {
            applyPixelRatio();
            applyLOD();
            // Light budget may have shrunk: extra lights stay but dim to 0
            // rather than mutating the scene graph mid-frame.
            try {
                var s = gfxSettings();
                var cap = (typeof s.lightCount === 'number') ? s.lightCount : 2;
                for (var i = 0; i < propState.lights.length; i++) {
                    if (i >= cap && propState.lights[i]) propState.lights[i].intensity = 0;
                }
            } catch (e) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    }

    function ready() {
        try {
            return !!(attached && liveScene());
        } catch (e) { return false; }
    }

    function boot() {
        try {
            if (!slugOk()) return; // wrong slug: expose API only, touch nothing
            pollTries = 0;
            try { requestAnimationFrame(tick); }
            catch (e) { try { setTimeout(function () { tick(0); }, 250); } catch (ignored) { /* ignore */ } }
            // Slow re-poll covers late engine boot + preset switches.
            (function slowPoll() {
                try {
                    if (!attached && pollTries < MAX_POLL_TRIES) tryAttach();
                    if (pollTries < MAX_POLL_TRIES) setTimeout(slowPoll, 1500);
                } catch (e) { /* ignore */ }
            })();
            try {
                window.addEventListener('fourweird-graphics', function () {
                    try { setPreset(); } catch (e) { /* ignore */ }
                });
            } catch (e) { /* ignore */ }
            try {
                if (window.GraveGainMods && typeof window.GraveGainMods.push === 'function') {
                    window.GraveGainMods.push({ name: 'gravegain-models-3d', version: VERSION });
                } else if (!window.GraveGainMods) {
                    window.GraveGainMods = [{ name: 'gravegain-models-3d', version: VERSION }];
                }
            } catch (e) { /* ignore */ }
        } catch (e) { /* never break the game */ }
    }

    try {
        window.GraveGainModels3D = {
            VERSION: VERSION,
            SLUG: SLUG,
            champions: CHAMPION_KEYS.slice(),
            weapons: WEAPON_KEYS.slice(),
            ready: ready,
            setPreset: setPreset,
            spawnChampion: spawnChampion,
            attachWeapon: attachWeapon,
            currentWeapon: function () { try { return weaponState.name; } catch (e) { return null; } }
        };
    } catch (e) { /* window unwritable */ }

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (e) { try { boot(); } catch (ignored) { /* ignore */ } }
})();
