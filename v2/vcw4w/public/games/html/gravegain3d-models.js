/* GraveGain 3D Models — G2 lane (enemies + weapons model pack)
 * Vanilla JS, idempotent, no imports. Loaded via <script> tag.
 * Builds low-poly enemy + weapon meshes from THREE r128 primitives
 * (Box / Cone / Sphere / Cylinder groups) with per-dungeon-theme
 * palettes and emissive accents. Degrades to billboarded emoji
 * sprites (or plain descriptors) when THREE / WebGL is absent.
 *
 * Exposes: window.GraveGain3DModels { VERSION, THEMES, enemies,
 *   weapons, buildEnemy, buildWeapon, mountWeapon, spriteFor,
 *   domFor, integrate, list }
 * Registry: pushes { name, version, init } to window.GraveGainMods.
 */
(function () {
    'use strict';

    if (window.GraveGain3DModels && window.GraveGain3DModels.VERSION) return;

    var VERSION = '1.0.0';

    // ---- Dungeon-theme palettes (bodies + trims + emissive accents) ----
    var THEMES = {
        stone_crypt:      { label: 'Stone Crypt',        body: 0xd6d3d1, trim: 0x57534e, emissive: 0xff2222 },
        metallic_ship:    { label: 'Metallic Ship',      body: 0x64748b, trim: 0x22d3ee, emissive: 0x22d3ee },
        elven_grove:      { label: 'Elven Grove',        body: 0x4d7c0f, trim: 0x5eead4, emissive: 0x4ade80 },
        dwarven_vault:    { label: 'Dwarven Vault',      body: 0xb45309, trim: 0xfbbf24, emissive: 0xfb923c },
        orc_wastes:       { label: 'Orc Wastes',         body: 0x991b1b, trim: 0x450a0a, emissive: 0xef4444 },
        toxic_catacombs:  { label: 'Toxic Catacombs',    body: 0x14532d, trim: 0x4ade80, emissive: 0x22c55e },
        citadel_darkness: { label: 'Citadel of Darkness', body: 0x4c1d95, trim: 0xa855f7, emissive: 0x8b5cf6 }
    };

    function themeOf(name) {
        return THEMES[name] || THEMES.stone_crypt;
    }

    // ---- Capability probes (no globals touched) ----
    function hasTHREE() {
        return (typeof THREE !== 'undefined') && !!THREE &&
            !!THREE.Group && !!THREE.Mesh &&
            !!THREE.BoxGeometry && !!THREE.ConeGeometry &&
            !!THREE.SphereGeometry && !!THREE.CylinderGeometry;
    }

    function isWebGLAvailable() {
        try {
            if (typeof document === 'undefined') return false;
            var c = document.createElement('canvas');
            return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
        } catch (_) { return false; }
    }

    // ---- Shared material cache (no per-frame allocation; build-time only) ----
    var matCache = {};
    function std(color, opts) {
        opts = opts || {};
        var key = 's:' + color + ':' + (opts.emissive || 0) + ':' +
            (opts.ei || 0) + ':' + (opts.metal || 0) + ':' +
            (opts.rough !== undefined ? opts.rough : 0.8) + ':' +
            (opts.transparent ? 1 : 0) + ':' + (opts.opacity !== undefined ? opts.opacity : 1);
        if (!matCache[key]) {
            var p = { color: color, roughness: (opts.rough !== undefined ? opts.rough : 0.8), metalness: opts.metal || 0 };
            if (opts.emissive) { p.emissive = opts.emissive; p.emissiveIntensity = opts.ei || 0.8; }
            if (opts.transparent) { p.transparent = true; p.opacity = (opts.opacity !== undefined ? opts.opacity : 0.85); }
            matCache[key] = new THREE.MeshStandardMaterial(p);
        }
        return matCache[key];
    }
    var basicCache = {};
    function basic(color) {
        if (!basicCache[color]) basicCache[color] = new THREE.MeshBasicMaterial({ color: color });
        return basicCache[color];
    }

    // ---- Primitive helpers (LOD-friendly: tiny segment counts) ----
    function B(w, h, d, mat, x, y, z) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x || 0, y || 0, z || 0);
        return m;
    }
    function C(rt, rb, h, mat, x, y, z, seg) {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 6), mat);
        m.position.set(x || 0, y || 0, z || 0);
        return m;
    }
    function S(r, mat, x, y, z, w, h) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(r, w || 6, h || 5), mat);
        m.position.set(x || 0, y || 0, z || 0);
        return m;
    }
    function K(r, h, mat, x, y, z, seg) {
        var m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 6), mat);
        m.position.set(x || 0, y || 0, z || 0);
        return m;
    }
    // Paired emissive eyes on a head/face parent.
    function eyes(parent, eyeMat, spread, y, z, r) {
        var l = S(r || 1.0, eyeMat, -(spread || 2), y || 1, z || 4.2);
        var rr = S(r || 1.0, eyeMat, (spread || 2), y || 1, z || 4.2);
        parent.add(l); parent.add(rr);
        return parent;
    }
    // Simple two-leg + two-arm humanoid limb set (boxes/cylinders).
    function limbs(g, boneMat, trimMat, wide) {
        var lw = wide ? 4.5 : 3;
        var armL = B(lw, 12, lw, boneMat, -(7 + lw / 2), 14, 0);
        var armR = B(lw, 12, lw, boneMat, (7 + lw / 2), 14, 0);
        var fistL = S(2.2, trimMat, -(7 + lw / 2), 7, 0);
        var fistR = S(2.2, trimMat, (7 + lw / 2), 7, 0);
        var legL = B(3.5, 10, 3.5, boneMat, -3, 5, 0);
        var legR = B(3.5, 10, 3.5, boneMat, 3, 5, 0);
        g.add(armL); g.add(armR); g.add(fistL); g.add(fistR); g.add(legL); g.add(legR);
        return g;
    }

    // ================================================================
    // ENEMIES (12) — origin at feet, ~20-40 units tall (engine scale)
    // ================================================================
    var enemies = {};

    // 1. Skeleton Brute — hulking armored skeleton (stone_crypt).
    enemies.skeletonBrute = {
        key: 'skeletonBrute', name: 'Skeleton Brute', emoji: '💀',
        theme: 'stone_crypt', poly: 96, scale: 1.6,
        desc: 'Hulking armored skeleton with brow spikes and pauldrons.',
        build: function (T) {
            var g = new THREE.Group();
            var bone = std(T.body, {}), trim = std(T.trim, { metal: 0.6, rough: 0.4 });
            var eye = basic(T.emissive);
            var torso = B(13, 15, 7, bone, 0, 17, 0); g.add(torso);
            var ribs = B(10, 2, 7.4, trim, 0, 15, 0); g.add(ribs);
            var ribs2 = B(10, 2, 7.4, trim, 0, 20, 0); g.add(ribs2);
            var skull = B(7, 7, 7, bone, 0, 28, 0); g.add(skull);
            var jaw = B(5.5, 3, 5.5, bone, 0, 23.5, 0.8); g.add(jaw);
            eyes(skull, eye, 2, 1, 3.7);
            [-1, 1].forEach(function (s) {
                g.add(K(1.6, 4, trim, s * 4.2, 32.5, 0));       // brow spikes
                g.add(S(3.4, trim, s * 9.5, 24, 0));            // pauldrons
            });
            limbs(g, bone, trim, true);
            return g;
        }
    };

    // 2. Crypt Wraith — floating hooded spectre (citadel_darkness).
    enemies.cryptWraith = {
        key: 'cryptWraith', name: 'Crypt Wraith', emoji: '👻',
        theme: 'citadel_darkness', poly: 64, scale: 1.3,
        desc: 'Floating hooded spectre with emissive hollow eyes.',
        build: function (T) {
            var g = new THREE.Group();
            var robe = std(T.body, { transparent: true, opacity: 0.85, rough: 0.9 });
            var glow = basic(T.emissive);
            var glowMat = std(T.emissive, { emissive: T.emissive, ei: 1.0 });
            var shroud = K(9, 24, robe, 0, 14, 0, 8); g.add(shroud);
            var hood = S(4.5, robe, 0, 27, 0, 8, 6); g.add(hood);
            eyes(hood, glow, 1.8, 0.5, 3.6, 1.1);
            var halo = C(6, 6, 0.8, glowMat, 0, 8, 0, 12); g.add(halo); // aura disc
            [-1, 1].forEach(function (s) {
                var claw = C(0.9, 1.4, 9, robe, s * 7, 15, 1, 5);
                claw.rotation.z = s * 0.5; g.add(claw);
            });
            g.position.y = 2;
            return g;
        }
    };

    // 3. Marrow Golem — stacked-ossuary brute (dwarven_vault).
    enemies.marrowGolem = {
        key: 'marrowGolem', name: 'Marrow Golem', emoji: '🪨',
        theme: 'dwarven_vault', poly: 110, scale: 2.0,
        desc: 'Stacked marrow-stone brute with glowing fissure veins.',
        build: function (T) {
            var g = new THREE.Group();
            var rock = std(T.body, { rough: 0.95 }), trim = std(T.trim, { metal: 0.3, rough: 0.6 });
            var vein = std(T.emissive, { emissive: T.emissive, ei: 1.0 });
            g.add(B(14, 8, 9, rock, 0, 8, 0));    // pelvis block
            g.add(B(17, 12, 11, rock, 0, 18, 0)); // chest block
            g.add(B(8, 3, 11.4, vein, 0, 18, 0)); // fissure band
            g.add(B(9, 8, 9, rock, 0, 29, 0));    // head block
            eyes(g, basic(T.emissive), 2.4, 30, 4.7);
            [-1, 1].forEach(function (s) {
                g.add(S(4.5, rock, s * 12, 22, 0));              // boulder shoulders
                g.add(C(3, 3.6, 14, rock, s * 12, 11, 0));       // pillar arms
                g.add(B(2, 6, 2, vein, s * 12, 20, 4.6));        // arm runes
                g.add(C(4, 5, 8, trim, s * 5, 4, 0));            // stub legs
            });
            return g;
        }
    };

    // 4. Plague Rats — swarm of three rats on a nest disc (toxic_catacombs).
    enemies.plagueRats = {
        key: 'plagueRats', name: 'Plague Rats Swarm', emoji: '🐀',
        theme: 'toxic_catacombs', poly: 108, scale: 1.0,
        desc: 'Three glowing-eyed plague rats circling a nest.',
        build: function (T) {
            var g = new THREE.Group();
            var fur = std(T.body, { rough: 0.95 }), glow = basic(T.emissive);
            g.add(C(11, 12, 2, std(T.trim, { rough: 0.9 }), 0, 1, 0, 10)); // nest disc
            [[-5, 2, 0.4], [5, 1, -0.5], [0, -5, 2.6]].forEach(function (p) {
                var rat = new THREE.Group();
                var bodyR = S(2.6, fur, 0, 3, 0); bodyR.scale.set(1.4, 0.9, 1); rat.add(bodyR);
                rat.add(S(1.4, fur, 3.4, 3.4, 0));                 // head
                eyes(rat, glow, 0.7, 3.7, 1.2, 0.45);
                var tail = C(0.35, 0.5, 6, fur, -4.4, 2.6, 0, 5);
                tail.rotation.z = 1.2; rat.add(tail);
                rat.position.set(p[0], 0, p[1]); rat.rotation.y = p[2];
                g.add(rat);
            });
            return g;
        }
    };

    // 5. Tomb Spider — crypt crawler (stone_crypt).
    enemies.tombSpider = {
        key: 'tombSpider', name: 'Tomb Spider', emoji: '🕷️',
        theme: 'stone_crypt', poly: 104, scale: 1.2,
        desc: 'Eight-legged tomb crawler with a clustered emissive gaze.',
        build: function (T) {
            var g = new THREE.Group();
            var chitin = std(T.body, { rough: 0.7 }), trim = std(T.trim, { metal: 0.4, rough: 0.5 });
            var eye = basic(T.emissive);
            var abdomen = S(5.5, chitin, 0, 7, -5, 7, 6); abdomen.scale.set(1, 0.9, 1.3); g.add(abdomen);
            g.add(B(6, 5, 6, trim, 0, 6, 2)); // cephalothorax
            [[-1.5, 8.5], [0, 9], [1.5, 8.5], [-2.6, 7], [2.6, 7]].forEach(function (e) {
                g.add(S(0.8, eye, e[0], e[1], 5.2));
            });
            [-1, 1].forEach(function (s) {
                for (var i = 0; i < 4; i++) {
                    var leg = C(0.7, 0.9, 11, chitin, s * (5 + i * 1.2), 5 - i * 0.6, -3 + i * 2.4, 5);
                    leg.rotation.z = s * 0.9; g.add(leg);
                }
                g.add(K(1.2, 3, trim, s * 2.5, 9.5, 2.5)); // fangs
            });
            return g;
        }
    };

    // 6. Rust Husk — corroded ship автоматон (metallic_ship).
    enemies.rustHusk = {
        key: 'rustHusk', name: 'Rusted Hull Husk', emoji: '🤖',
        theme: 'metallic_ship', poly: 92, scale: 1.1,
        desc: 'Corroded hull-plated husk with a cyan visor slit.',
        build: function (T) {
            var g = new THREE.Group();
            var hull = std(T.body, { metal: 0.7, rough: 0.5 });
            var trim = std(T.trim, { emissive: T.emissive, ei: 0.7, metal: 0.5, rough: 0.4 });
            var visor = std(T.emissive, { emissive: T.emissive, ei: 1.0 });
            g.add(B(9, 14, 6, hull, 0, 16, 0));
            g.add(B(9.6, 3, 6.4, trim, 0, 20, 0)); // chest band
            g.add(B(6.5, 6.5, 6.5, hull, 0, 27, 0));
            g.add(B(5, 1.6, 0.8, visor, 0, 27.5, 3.4)); // visor slit
            g.add(C(0.4, 0.4, 6, trim, 3, 32, 0, 5));   // antenna mast
            g.add(S(1.0, visor, 3, 35.4, 0));           // antenna tip
            [-1, 1].forEach(function (s) {
                g.add(C(1.6, 2, 11, hull, s * 7, 14, 0)); // piston arms
                g.add(B(3, 9, 3, hull, s * 3, 4.5, 0));   // legs
            });
            return g;
        }
    };

    // 7. Grove Wisp — orbiting shard spirit (elven_grove).
    enemies.groveWisp = {
        key: 'groveWisp', name: 'Grove Wisp', emoji: '💚',
        theme: 'elven_grove', poly: 56, scale: 1.0,
        desc: 'Floating verdant core ringed by orbiting bark shards.',
        build: function (T) {
            var g = new THREE.Group();
            var core = std(T.emissive, { emissive: T.emissive, ei: 1.2 });
            var bark = std(T.body, { rough: 0.9 });
            g.add(S(3.6, core, 0, 20, 0, 8, 6));
            g.add(S(2.2, basic(0xffffff), 0, 20, 0, 6, 5)); // hot heart
            for (var i = 0; i < 4; i++) {
                var a = (i / 4) * Math.PI * 2;
                g.add(K(1.4, 4, bark, Math.cos(a) * 7, 20 + (i % 2) * 3, Math.sin(a) * 7));
            }
            g.add(C(4, 5.5, 1.6, std(T.trim, { emissive: T.emissive, ei: 0.6 }), 0, 12, 0, 8)); // glow base
            return g;
        }
    };

    // 8. Forge Imp — horned furnace sprite (dwarven_vault).
    enemies.forgeImp = {
        key: 'forgeImp', name: 'Forge Imp', emoji: '🔥',
        theme: 'dwarven_vault', poly: 72, scale: 0.9,
        desc: 'Horned furnace imp with ember belly and coal limbs.',
        build: function (T) {
            var g = new THREE.Group();
            var coal = std(0x292524, { rough: 0.9 });
            var ember = std(T.emissive, { emissive: T.emissive, ei: 1.1 });
            g.add(B(7, 9, 6, coal, 0, 12, 0));
            g.add(S(2.4, ember, 0, 12, 3.1, 6, 5)); // belly ember
            var head = S(3.4, coal, 0, 20, 0, 7, 6); g.add(head);
            eyes(head, basic(T.emissive), 1.5, 0.6, 2.8, 0.8);
            [-1, 1].forEach(function (s) {
                var horn = K(1.2, 4.5, std(T.trim, { metal: 0.5, rough: 0.4 }), s * 3.4, 23.5, 0);
                horn.rotation.z = -s * 0.5; g.add(horn);
                g.add(C(1, 1.3, 8, coal, s * 5.5, 11, 0, 5));
                g.add(C(1.2, 1.5, 7, coal, s * 2.4, 3.5, 0, 5));
            });
            return g;
        }
    };

    // 9. Grave Mage — tattered crypt caster (citadel_darkness).
    enemies.graveMage = {
        key: 'graveMage', name: 'Grave Mage', emoji: '🧙',
        theme: 'citadel_darkness', poly: 84, scale: 1.2,
        desc: 'Tattered crypt caster with a soul-charged focus staff.',
        build: function (T) {
            var g = new THREE.Group();
            var cloth = std(T.body, { rough: 0.9 });
            var trim = std(T.trim, { emissive: T.emissive, ei: 0.5, rough: 0.5 });
            g.add(C(4, 8, 16, cloth, 0, 10, 0, 8)); // robe
            var head = S(3.2, std(0xe7e5e4, { rough: 0.8 }), 0, 20.5, 0, 7, 6); g.add(head);
            eyes(head, basic(T.emissive), 1.4, 0.5, 2.6, 0.75);
            var hat = K(4.5, 9, cloth, 0, 27, 0, 8); hat.rotation.z = 0.12; g.add(hat);
            g.add(C(3, 3, 1.2, trim, 0, 23, 0, 8)); // hat band
            var staff = C(0.5, 0.6, 18, trim, 6, 14, 0, 6); g.add(staff);
            g.add(S(1.8, std(T.emissive, { emissive: T.emissive, ei: 1.2 }), 6, 24, 0, 7, 6)); // focus
            return g;
        }
    };

    // 10. Bone Archer — skeletal skirmisher with bow (orc_wastes).
    enemies.boneArcher = {
        key: 'boneArcher', name: 'Bone Archer', emoji: '🏹',
        theme: 'orc_wastes', poly: 88, scale: 1.1,
        desc: 'Skeletal skirmisher nocking a marrow arrow.',
        build: function (T) {
            var g = new THREE.Group();
            var bone = std(0xe7e5e4, { rough: 0.8 });
            var trim = std(T.trim, { rough: 0.6 });
            var gut = std(T.body, { rough: 0.9 });
            g.add(B(7, 12, 5, bone, 0, 15, 0));
            var skull = B(5.5, 5.5, 5.5, bone, 0, 24, 0); g.add(skull);
            eyes(skull, basic(T.emissive), 1.8, 0.8, 3, 0.9);
            limbs(g, bone, trim, false);
            var bow = new THREE.Group(); // stave from two angled limbs
            var upper = C(0.5, 0.5, 11, gut, 0, 5, 0, 5); upper.rotation.z = 0.35;
            var lower = C(0.5, 0.5, 11, gut, 0, -5, 0, 5); lower.rotation.z = -0.35;
            bow.add(upper); bow.add(lower);
            var arrow = C(0.3, 0.3, 13, bone, -4, 0, 0, 5); arrow.rotation.z = Math.PI / 2;
            bow.add(arrow);
            bow.position.set(9, 15, 2); bow.rotation.y = 0.4;
            g.add(bow);
            return g;
        }
    };

    // 11. Sarcophagus Sentinel — animated tomb vessel (stone_crypt).
    enemies.sarcophagusSentinel = {
        key: 'sarcophagusSentinel', name: 'Sarcophagus Sentinel', emoji: '🗿',
        theme: 'stone_crypt', poly: 76, scale: 1.8,
        desc: 'Animated tomb vessel with glowing funerary inlay.',
        build: function (T) {
            var g = new THREE.Group();
            var stone = std(T.body, { rough: 0.85 });
            var gold = std(T.trim === 0x57534e ? 0xd4af37 : T.trim, { metal: 0.7, rough: 0.3 });
            var inlay = std(T.emissive, { emissive: T.emissive, ei: 0.9 });
            g.add(B(12, 26, 7, stone, 0, 15, 0));   // coffin slab
            g.add(B(13, 3, 8, gold, 0, 3, 0));      // plinth
            g.add(B(6, 8, 1, inlay, 0, 17, 3.7));   // chest inlay
            var mask = B(6, 6, 3, gold, 0, 29, 1.5); g.add(mask);
            eyes(mask, basic(T.emissive), 1.7, 0.8, 1.7, 0.8);
            g.add(K(4, 5, gold, 0, 35, 0, 4));      // crown cap
            [-1, 1].forEach(function (s) {
                g.add(B(2.5, 20, 5, stone, s * 7.5, 14, 0)); // side pillars
            });
            return g;
        }
    };

    // 12. Void Revenant — darkness emissary (citadel_darkness).
    enemies.voidRevenant = {
        key: 'voidRevenant', name: 'Void Revenant', emoji: '🌌',
        theme: 'citadel_darkness', poly: 90, scale: 1.5,
        desc: 'Darkness emissary wreathed in violet spikes.',
        build: function (T) {
            var g = new THREE.Group();
            var voidMat = std(T.body, { rough: 0.85 });
            var rim = std(T.trim, { emissive: T.emissive, ei: 0.8, rough: 0.4 });
            g.add(C(3.5, 9, 22, voidMat, 0, 13, 0, 8)); // tattered column
            var skull = S(3.6, std(0xede9fe, { rough: 0.7 }), 0, 26, 0.5, 7, 6); g.add(skull);
            eyes(skull, basic(0xffffff), 1.5, 0.6, 3, 0.9);
            for (var i = 0; i < 5; i++) {
                var a = (i / 5) * Math.PI * 2;
                var spike = K(1.1, 6, rim, Math.cos(a) * 8, 12 + (i % 3) * 4, Math.sin(a) * 8);
                spike.rotation.z = Math.cos(a) * 0.6;
                spike.rotation.x = -Math.sin(a) * 0.6;
                g.add(spike);
            }
            g.add(C(5, 5, 1, rim, 0, 3, 0, 10)); // rift base
            return g;
        }
    };

    // ================================================================
    // WEAPONS (13) — origin at grip, blade pointing +Y
    // ================================================================
    var weapons = {};

    function gripSet(g, wood, y) {
        g.add(C(0.55, 0.65, 4.5, wood, 0, y || 0, 0, 6));
        return g;
    }

    // 1. Greatsword
    weapons.greatsword = {
        key: 'greatsword', name: 'Crypt Greatsword', emoji: '🗡️',
        theme: 'stone_crypt', poly: 40, length: 22,
        desc: 'Massive cross-hilt greatsword with a rune fuller.',
        build: function (T) {
            var g = new THREE.Group();
            var steel = std(0xe2e8f0, { metal: 0.9, rough: 0.2 });
            var gold = std(0xd4af37, { metal: 0.8, rough: 0.3 });
            var rune = std(T.emissive, { emissive: T.emissive, ei: 0.9 });
            var wood = std(0x3d271d, { rough: 0.8 });
            gripSet(g, wood, -2);
            g.add(S(0.9, gold, 0, -4.6, 0));            // pommel
            g.add(B(6.5, 1.1, 1.6, gold, 0, 0.6, 0));   // crossguard
            g.add(B(1.6, 15, 0.5, steel, 0, 8.6, 0));   // blade
            g.add(K(0.8, 2.4, steel, 0, 17.3, 0, 4));   // tip
            g.add(B(0.5, 12, 0.56, rune, 0, 8, 0));     // rune fuller
            return g;
        }
    };

    // 2. Reaper Scythe
    weapons.scythe = {
        key: 'scythe', name: 'Reaper Scythe', emoji: '🌙',
        theme: 'citadel_darkness', poly: 44, length: 24,
        desc: 'Long-hafted scythe with a curved violet-edged blade.',
        build: function (T) {
            var g = new THREE.Group();
            var haft = std(0x2d1a38, { rough: 0.7 });
            var edge = std(0xcbd5e1, { metal: 0.9, rough: 0.25 });
            var glow = std(T.emissive, { emissive: T.emissive, ei: 1.0 });
            g.add(C(0.5, 0.6, 22, haft, 0, 3, 0, 6));
            var arc1 = B(9, 1.4, 0.4, edge, 4.5, 14.5, 0); arc1.rotation.z = 0.25; g.add(arc1);
            var arc2 = B(7, 1.2, 0.4, edge, 9.5, 16.5, 0); arc2.rotation.z = 0.7; g.add(arc2);
            var tip = K(0.7, 2.6, glow, 12.4, 18.2, 0, 4); tip.rotation.z = -0.9; g.add(tip);
            g.add(C(1.1, 1.1, 1.4, glow, 0, 13.2, 0, 6)); // haft collar
            return g;
        }
    };

    // 3. Runeblade
    weapons.runeblade = {
        key: 'runeblade', name: 'Runeblade of the Vault', emoji: '⚔️',
        theme: 'dwarven_vault', poly: 42, length: 20,
        desc: 'Rune-etched blade that burns amber along the edge.',
        build: function (T) {
            var g = new THREE.Group();
            var steel = std(0xf1f5f9, { metal: 0.95, rough: 0.15 });
            var rune = std(T.emissive, { emissive: T.emissive, ei: 1.1 });
            var wood = std(0x1f2937, { rough: 0.8 });
            gripSet(g, wood, -2);
            g.add(B(4.5, 1, 1.4, std(T.trim, { metal: 0.7, rough: 0.3 }), 0, 0.6, 0));
            g.add(B(1.4, 13, 0.45, steel, 0, 7.6, 0));
            g.add(K(0.7, 2.2, steel, 0, 15.2, 0, 4));
            [4, 7, 10].forEach(function (y) { g.add(B(1.5, 0.9, 0.5, rune, 0, y, 0)); });
            return g;
        }
    };

    // 4. Bone Club
    weapons.boneclub = {
        key: 'boneclub', name: 'Marrow Bone Club', emoji: '🦴',
        theme: 'orc_wastes', poly: 36, length: 16,
        desc: 'Knobbed marrow club veined with rage-light.',
        build: function (T) {
            var g = new THREE.Group();
            var bone = std(0xe7e5e4, { rough: 0.8 });
            var vein = std(T.emissive, { emissive: T.emissive, ei: 0.9 });
            g.add(C(0.8, 1.1, 10, bone, 0, 1, 0, 6));
            g.add(S(2.6, bone, 0, 7.5, 0));
            g.add(S(2.0, bone, 0, 10, 0));
            g.add(C(2.05, 2.05, 0.9, vein, 0, 8.7, 0, 8)); // glowing joint
            g.add(K(0.9, 2, bone, 0, 12.2, 0, 5));
            return g;
        }
    };

    // 5. War Axe
    weapons.waraxe = {
        key: 'waraxe', name: 'Thane War Axe', emoji: '🪓',
        theme: 'dwarven_vault', poly: 38, length: 15,
        desc: 'Broad twin-bearded axe head on a rune-bound haft.',
        build: function (T) {
            var g = new THREE.Group();
            var haft = std(0x3d271d, { rough: 0.8 });
            var head = std(T.trim, { metal: 0.85, rough: 0.25 });
            var edge = std(T.emissive, { emissive: T.emissive, ei: 0.8 });
            g.add(C(0.6, 0.7, 14, haft, 0, 1, 0, 6));
            var beard = B(1.2, 5, 4.5, head, 2.2, 8, 0); g.add(beard);
            var beard2 = B(1.2, 5, 4.5, head, -2.2, 8, 0); g.add(beard2);
            g.add(B(5.6, 1.2, 1.2, edge, 0, 10.2, 0)); // top edge light
            g.add(K(0.6, 2, head, 0, 9, 0, 4));        // top spike
            return g;
        }
    };

    // 6. Ritual Dagger
    weapons.ritualdagger = {
        key: 'ritualdagger', name: 'Ritual Dagger', emoji: '🔪',
        theme: 'citadel_darkness', poly: 30, length: 9,
        desc: 'Slim sacrificial dagger with a soul-gem pommel.',
        build: function (T) {
            var g = new THREE.Group();
            var steel = std(0xe2e8f0, { metal: 0.9, rough: 0.2 });
            var gem = std(T.emissive, { emissive: T.emissive, ei: 1.2 });
            gripSet(g, std(0x1f2937, { rough: 0.8 }), -1.5);
            g.add(B(3, 0.7, 1, std(T.trim, { metal: 0.7, rough: 0.3 }), 0, 0.8, 0));
            g.add(B(0.9, 5.5, 0.3, steel, 0, 3.9, 0));
            g.add(K(0.45, 1.4, steel, 0, 7.3, 0, 4));
            g.add(S(0.8, gem, 0, -4, 0, 6, 5));
            return g;
        }
    };

    // 7. Plague Flail
    weapons.plagueflail = {
        key: 'plagueflail', name: 'Plague Flail', emoji: '☠️',
        theme: 'toxic_catacombs', poly: 52, length: 18,
        desc: 'Chained spiked censer-head dripping toxic light.',
        build: function (T) {
            var g = new THREE.Group();
            var iron = std(0x374151, { metal: 0.85, rough: 0.3 });
            var bile = std(T.emissive, { emissive: T.emissive, ei: 1.0 });
            g.add(C(0.6, 0.7, 9, iron, 0, -1.5, 0, 6));
            g.add(C(0.25, 0.25, 3, iron, 0, 4.5, 0, 5));   // chain
            g.add(C(0.25, 0.25, 3, iron, 0.8, 6.5, 0, 5)); // chain link 2
            var head = S(2.4, iron, 1.4, 9, 0, 7, 6); g.add(head);
            for (var i = 0; i < 6; i++) {
                var a = (i / 6) * Math.PI * 2;
                var sp = K(0.5, 1.8, iron, 1.4 + Math.cos(a) * 2.6, 9 + Math.sin(a) * 2.6, 0, 4);
                sp.rotation.z = -a; g.add(sp);
            }
            g.add(S(1.0, bile, 1.4, 9, 1.8, 6, 5)); // bile blister
            return g;
        }
    };

    // 8. Grave Crossbow
    weapons.crossbow = {
        key: 'crossbow', name: 'Grave Crossbow', emoji: '🏹',
        theme: 'metallic_ship', poly: 40, length: 12,
        desc: 'Compact steel crossbow with a cyan range-sight.',
        build: function (T) {
            var g = new THREE.Group();
            var stock = std(T.body, { metal: 0.6, rough: 0.5 });
            var bow = std(0x1f2937, { metal: 0.8, rough: 0.3 });
            var sight = std(T.emissive, { emissive: T.emissive, ei: 1.1 });
            var tiller = B(1.6, 1.6, 11, stock, 0, 0, 0); g.add(tiller);
            var armL = B(5.5, 0.8, 0.8, bow, -3, 0, 4); armL.rotation.y = 0.5; g.add(armL);
            var armR = B(5.5, 0.8, 0.8, bow, 3, 0, 4); armR.rotation.y = -0.5; g.add(armR);
            var bolt = C(0.25, 0.25, 10, std(0xe7e5e4, { rough: 0.6 }), 0, 1, 1, 5);
            bolt.rotation.x = Math.PI / 2; g.add(bolt);
            g.add(S(0.6, sight, 0, 2, -2, 6, 5)); // sight bead
            return g;
        }
    };

    // 9. Void Spear
    weapons.voidspear = {
        key: 'voidspear', name: 'Void Spear', emoji: '🔱',
        theme: 'citadel_darkness', poly: 34, length: 26,
        desc: 'Needle-tipped void spear humming with violet charge.',
        build: function (T) {
            var g = new THREE.Group();
            var shaft = std(0x1e1b4b, { rough: 0.6 });
            var tip = std(T.emissive, { emissive: T.emissive, ei: 1.2 });
            g.add(C(0.45, 0.55, 20, shaft, 0, 0, 0, 6));
            g.add(K(1.1, 5, tip, 0, 12.5, 0, 6));
            g.add(B(3.4, 0.9, 0.9, std(T.trim, { metal: 0.7, rough: 0.3 }), 0, 9.6, 0));
            g.add(C(0.9, 0.9, 1.2, tip, 0, -9, 0, 6)); // butt charge
            return g;
        }
    };

    // 10. Rust Cutlass
    weapons.rustcutlass = {
        key: 'rustcutlass', name: 'Rust Cutlass', emoji: '🏴‍☠️',
        theme: 'metallic_ship', poly: 36, length: 17,
        desc: 'Pitted boarding cutlass with a sparking cyan edge.',
        build: function (T) {
            var g = new THREE.Group();
            var pitted = std(T.body, { metal: 0.7, rough: 0.55 });
            var edge = std(T.emissive, { emissive: T.emissive, ei: 0.6 });
            gripSet(g, std(0x292524, { rough: 0.9 }), -2);
            g.add(S(2.2, pitted, 1.2, -0.4, 0, 6, 5)); // basket guard
            var blade = B(1.3, 12, 0.4, pitted, 0, 7, 0); blade.rotation.z = 0.08; g.add(blade);
            g.add(B(0.4, 11, 0.44, edge, 0.7, 7, 0));  // spark edge
            g.add(K(0.65, 1.8, pitted, 1, 13.8, 0, 4));
            return g;
        }
    };

    // 11. Crypt Shield
    weapons.cryptshield = {
        key: 'cryptshield', name: 'Crypt Shield', emoji: '🛡️',
        theme: 'stone_crypt', poly: 32, length: 10,
        desc: 'Warded tomb-door shield with a glowing boss.',
        build: function (T) {
            var g = new THREE.Group();
            var plate = std(T.body, { metal: 0.5, rough: 0.5 });
            var rim = std(T.trim === 0x57534e ? 0xd4af37 : T.trim, { metal: 0.8, rough: 0.3 });
            var boss = std(T.emissive, { emissive: T.emissive, ei: 1.0 });
            g.add(B(7, 10, 0.9, plate, 0, 2, 0));
            g.add(B(7.6, 10.6, 0.5, rim, 0, 2, -0.3));
            g.add(S(1.6, boss, 0, 2, 0.9, 7, 6));
            g.add(B(1.4, 6, 0.4, boss, 0, 2, 0.55)); // ward bar
            g.add(B(5, 1.2, 0.4, boss, 0, 2, 0.55)); // ward cross
            return g;
        }
    };

    // 12. Soul Lantern
    weapons.soullantern = {
        key: 'soullantern', name: 'Soul Lantern', emoji: '🏮',
        theme: 'elven_grove', poly: 34, length: 10,
        desc: 'Caged wisp-light lantern on a crooked hook.',
        build: function (T) {
            var g = new THREE.Group();
            var cage = std(0x292524, { metal: 0.7, rough: 0.5 });
            var soul = std(T.emissive, { emissive: T.emissive, ei: 1.3 });
            g.add(C(0.3, 0.3, 3, cage, 0, 5, 0, 5));  // handle stub
            g.add(K(2.4, 1.8, cage, 0, 3.2, 0, 6));   // cap
            g.add(S(1.7, soul, 0, 1, 0, 8, 6));       // soul core
            [-1, 1].forEach(function (s) {
                g.add(B(0.4, 3.4, 0.4, cage, s * 1.9, 1, 0));
                g.add(B(0.4, 3.4, 0.4, cage, 0, 1, s * 1.9));
            });
            g.add(C(2.1, 2.1, 0.5, cage, 0, -0.9, 0, 8)); // base ring
            return g;
        }
    };

    // 13. Marrow Hammer
    weapons.marrowhammer = {
        key: 'marrowhammer', name: 'Marrow Hammer', emoji: '🔨',
        theme: 'dwarven_vault', poly: 32, length: 16,
        desc: 'Forge-blessed maul head laced with molten seams.',
        build: function (T) {
            var g = new THREE.Group();
            var haft = std(0x1f2937, { rough: 0.8 });
            var head = std(T.body, { metal: 0.6, rough: 0.4 });
            var seam = std(T.emissive, { emissive: T.emissive, ei: 1.0 });
            g.add(C(0.6, 0.7, 13, haft, 0, 0, 0, 6));
            g.add(B(4.5, 4.5, 6.5, head, 0, 7.5, 0));
            g.add(B(4.6, 1, 6.6, seam, 0, 7.5, 0)); // molten seam
            g.add(B(2, 2, 1, seam, 0, 7.5, 3.4));   // face sigil
            g.add(S(0.9, head, 0, -7, 0));          // pommel cap
            return g;
        }
    };

    // ---- Fallback: billboarded emoji sprite / DOM chip / descriptor ----
    function spriteFor(emoji, scale) {
        try {
            if (!hasTHREE() || typeof document === 'undefined') return null;
            var size = 128;
            var cv = document.createElement('canvas');
            cv.width = size; cv.height = size;
            var ctx = cv.getContext('2d');
            if (!ctx) return null;
            ctx.font = '96px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(emoji, size / 2, size / 2 + 6);
            var tex = new THREE.CanvasTexture(cv);
            var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
            var s = scale || 18;
            sp.scale.set(s, s, 1); // THREE.Sprite always faces camera = billboard
            return sp;
        } catch (_) { return null; }
    }

    // DOM chip fallback for canvases without WebGL (called explicitly by G10 wiring).
    function domFor(kind, key) {
        try {
            if (typeof document === 'undefined') return null;
            var def = (kind === 'weapon' ? weapons : enemies)[key];
            if (!def) return null;
            var el = document.createElement('div');
            el.className = 'gg3d-fallback gg3d-fallback-' + kind;
            el.setAttribute('data-gg3d', kind + ':' + key);
            el.textContent = def.emoji || '❔';
            el.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;' +
                'font-size:42px;line-height:1;pointer-events:none;user-select:none;';
            el.title = def.name;
            return el;
        } catch (_) { return null; }
    }

    function themedPalette(def) {
        var T = themeOf(def.theme);
        return { body: T.body, trim: T.trim, emissive: T.emissive };
    }

    // Safe builders: THREE.Group on success, emoji sprite when WebGL is
    // missing, plain descriptor when THREE/document are absent.
    function buildEnemy(key, opts) {
        opts = opts || {};
        var def = enemies[key];
        if (!def) return null;
        if (!hasTHREE()) return { fallback: true, kind: 'enemy', key: key, emoji: def.emoji, name: def.name };
        var g;
        try {
            g = def.build(themedPalette(def));
        } catch (_) { g = null; }
        if (!g) {
            var sp = spriteFor(def.emoji, 20);
            if (sp) return sp;
            return { fallback: true, kind: 'enemy', key: key, emoji: def.emoji, name: def.name };
        }
        if (!isWebGLAvailable() && opts.fallback !== 'mesh') {
            var fb = spriteFor(def.emoji, 20);
            if (fb) return fb;
        }
        g.userData.gg3d = { kind: 'enemy', key: key, version: VERSION };
        var s = (opts.scale || def.scale || 1);
        g.scale.set(s, s, s);
        return g;
    }

    function buildWeapon(key, opts) {
        opts = opts || {};
        var def = weapons[key];
        if (!def) return null;
        if (!hasTHREE()) return { fallback: true, kind: 'weapon', key: key, emoji: def.emoji, name: def.name };
        var g;
        try {
            g = def.build(themedPalette(def));
        } catch (_) { g = null; }
        if (!g) {
            var sp = spriteFor(def.emoji, 14);
            if (sp) return sp;
            return { fallback: true, kind: 'weapon', key: key, emoji: def.emoji, name: def.name };
        }
        if (!isWebGLAvailable() && opts.fallback !== 'mesh') {
            var fb = spriteFor(def.emoji, 14);
            if (fb) return fb;
        }
        g.userData.gg3d = { kind: 'weapon', key: key, version: VERSION };
        return g;
    }

    // Attach a weapon mesh to an enemy/player rig (slot = Object3D or Group).
    function mountWeapon(holder, weaponKey, opts) {
        opts = opts || {};
        if (!holder || typeof holder.add !== 'function') return null;
        var w = buildWeapon(weaponKey, opts);
        if (!w || w.fallback) return null;
        if (opts.position) w.position.set(opts.position[0], opts.position[1], opts.position[2]);
        if (opts.rotation) w.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2]);
        if (opts.scale) w.scale.set(opts.scale, opts.scale, opts.scale);
        holder.add(w);
        return w;
    }

    // Additive wiring hook for G10: registers NEW visual variants + weapon
    // builders without overwriting anything the engine already owns.
    function integrate() {
        var applied = { enemies: 0, weapons: 0 };
        try {
            var EE = window.GraveGainEnemyEntity;
            if (EE && EE.STYLES) {
                Object.keys(enemies).forEach(function (k) {
                    if (EE.STYLES[k]) return; // never overwrite engine styles
                    var d = enemies[k], T = themeOf(d.theme);
                    EE.STYLES[k] = {
                        body: T.body, trim: T.trim, eye: T.emissive,
                        aura: T.emissive, blood: T.body, scale: d.scale || 1.0
                    };
                    applied.enemies++;
                });
            }
            var WF = window.GraveGainWeaponFactory;
            if (WF) {
                WF.custom = WF.custom || {};
                Object.keys(weapons).forEach(function (k) {
                    if (WF.custom[k]) return;
                    WF.custom[k] = weapons[k];
                    applied.weapons++;
                });
            }
        } catch (_) { /* wiring is best-effort; models stay usable standalone */ }
        return applied;
    }

    function list() {
        return {
            version: VERSION,
            enemies: Object.keys(enemies),
            weapons: Object.keys(weapons)
        };
    }

    var api = {
        VERSION: VERSION,
        THEMES: THEMES,
        enemies: enemies,
        weapons: weapons,
        buildEnemy: buildEnemy,
        buildWeapon: buildWeapon,
        mountWeapon: mountWeapon,
        spriteFor: spriteFor,
        domFor: domFor,
        integrate: integrate,
        list: list
    };

    window.GraveGain3DModels = api;

    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({
        name: 'gravegain3d-models',
        version: VERSION,
        init: function () { return api; }
    });
})();
