(function () {
    'use strict';

    // GraveGain4D hyperdungeon: procedural tesseract grid of 3x3 rooms x
    // 3 w-slices (27 rooms). Corridors link x/y neighbours inside a slice;
    // ana/kata w-passages link the same (gx, gy) across adjacent w slices.
    // The map is plain JSON-serializable: { rooms, cells, portals }.
    // Style mirrors gravegain3d/world/dungeon-generator.js (IIFE, TILE /
    // THEMES tables, resolveTheme + pickWeighted, HyperDungeonGenerator).
    window.GraveGain4D = window.GraveGain4D || {};

    var TILE = {
        FLOOR: 0, WALL: 1, WATER: 2, TOXIC: 3, LAVA: 4,
        CRYSTAL: 5, SAND: 6, BONE: 7, METAL: 8, SPARK: 9,
        // 4D-only markers (rendered as overlays by the runtime).
        ANA_GATE: 10, KATA_GATE: 11
    };

    var W_SLICES = 3;
    var GRID_N = 3;
    var ROOM_WORLD = 12;

    var THEMES = {
        metallic_ship: {
            roomBonus: 0,
            roomWeights: { normal: 3, graveyard: 1, treasury: 2, lab: 3, armory: 1 },
            hazards: [8, 8, 2],
            atmosphere: { fogColor: 0x0a1628, fogDensity: 0.0028, ambientColor: 0x4a6fa5 }
        },
        elven_grove: {
            roomBonus: 0,
            roomWeights: { normal: 3, graveyard: 2, treasury: 2, lab: 2, grove: 2 },
            hazards: [2, 5, 2],
            atmosphere: { fogColor: 0x06231c, fogDensity: 0.0032, ambientColor: 0x2dd4bf }
        },
        dwarven_vault: {
            roomBonus: 0,
            roomWeights: { normal: 3, graveyard: 1, treasury: 3, lab: 2, forge: 2 },
            hazards: [4, 9, 4],
            atmosphere: { fogColor: 0x2a1206, fogDensity: 0.0030, ambientColor: 0xf59e0b }
        },
        stone_crypt: {
            roomBonus: 0,
            roomWeights: { normal: 4, graveyard: 3, treasury: 2, lab: 1 },
            hazards: [7, 2],
            atmosphere: { fogColor: 0x101018, fogDensity: 0.0035, ambientColor: 0x8b8fa3 }
        }
    };

    var DEFAULT_THEME = 'stone_crypt';

    function resolveTheme(theme) {
        if (typeof theme === 'string' && THEMES[theme]) return theme;
        return DEFAULT_THEME;
    }

    // Seeded RNG (mulberry32) so hyperdungeons are reproducible; falls back
    // to Math.random when no seed is given.
    function makeRng(seed) {
        if (seed === undefined || seed === null) return Math.random;
        var a = seed >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function pickWeighted(weights, rng) {
        var total = 0;
        var k;
        for (k in weights) { if (weights.hasOwnProperty(k)) total += weights[k]; }
        var roll = rng() * total;
        for (k in weights) {
            if (!weights.hasOwnProperty(k)) continue;
            roll -= weights[k];
            if (roll <= 0) return k;
        }
        return 'normal';
    }

    function roomId(gx, gy, gw) {
        return 'r_' + gx + '_' + gy + '_w' + gw;
    }

    function HyperDungeonGenerator() {
        this.gridN = GRID_N;
        this.wSlices = W_SLICES;
        this.roomWorld = ROOM_WORLD;
    }

    // Generate a tesseract map. Options: { seed, theme, floorNum }.
    // Returns { rooms, cells, portals, spawnRoom, exitRoom, gridN, wSlices,
    // theme, atmosphere } — all plain JSON-safe values.
    HyperDungeonGenerator.prototype.generate = function (opts) {
        opts = opts || {};
        var rng = makeRng(opts.seed);
        var theme = resolveTheme(opts.theme);
        var cfg = THEMES[theme];
        var floorNum = opts.floorNum || 1;

        var rooms = [];
        var cells = [];
        var portals = [];
        var gx, gy, gw;

        for (gw = 0; gw < this.wSlices; gw++) {
            for (gx = 0; gx < this.gridN; gx++) {
                for (gy = 0; gy < this.gridN; gy++) {
                    var isSpawn = (gx === 0 && gy === 0 && gw === 0);
                    var isExit = (gx === this.gridN - 1 && gy === this.gridN - 1 && gw === this.wSlices - 1);
                    var type = 'normal';
                    if (isSpawn) type = 'spawn';
                    else if (isExit) type = (floorNum % 3 === 0) ? 'boss' : 'safespace';
                    else type = pickWeighted(cfg.roomWeights, rng);

                    var tile = TILE.FLOOR;
                    if (type === 'lab' || type === 'graveyard') {
                        var hazards = cfg.hazards || [TILE.FLOOR];
                        tile = hazards[Math.floor(rng() * hazards.length)];
                    }

                    var room = {
                        id: roomId(gx, gy, gw),
                        gx: gx, gy: gy, gw: gw,
                        x: gx * this.roomWorld,
                        y: gy * this.roomWorld,
                        w: (gw - (this.wSlices - 1) / 2) * this.roomWorld,
                        cx: gx * this.roomWorld + this.roomWorld / 2,
                        cy: gy * this.roomWorld + this.roomWorld / 2,
                        type: type,
                        tile: tile
                    };
                    rooms.push(room);
                    cells.push({ x: gx, y: gy, w: gw, tile: tile, roomId: room.id });
                }
            }
        }

        var byKey = {};
        rooms.forEach(function (r) { byKey[r.gx + ',' + r.gy + ',' + r.gw] = r; });

        // In-slice corridors: link +x and +y neighbours inside each w slice.
        for (gw = 0; gw < this.wSlices; gw++) {
            for (gx = 0; gx < this.gridN; gx++) {
                for (gy = 0; gy < this.gridN; gy++) {
                    var from = byKey[gx + ',' + gy + ',' + gw];
                    if (gx + 1 < this.gridN) {
                        var east = byKey[(gx + 1) + ',' + gy + ',' + gw];
                        portals.push({ from: from.id, to: east.id, axis: 'x', kind: 'corridor' });
                    }
                    if (gy + 1 < this.gridN) {
                        var south = byKey[gx + ',' + (gy + 1) + ',' + gw];
                        portals.push({ from: from.id, to: south.id, axis: 'y', kind: 'corridor' });
                    }
                }
            }
        }

        // Ana/kata w-passages: link the same (gx, gy) across adjacent slices.
        // kind 'ana' goes gw -> gw+1, 'kata' goes gw -> gw-1.
        for (gx = 0; gx < this.gridN; gx++) {
            for (gy = 0; gy < this.gridN; gy++) {
                for (gw = 0; gw < this.wSlices - 1; gw++) {
                    var lo = byKey[gx + ',' + gy + ',' + gw];
                    var hi = byKey[gx + ',' + gy + ',' + (gw + 1)];
                    portals.push({ from: lo.id, to: hi.id, axis: 'w', kind: 'ana' });
                    portals.push({ from: hi.id, to: lo.id, axis: 'w', kind: 'kata' });
                }
            }
        }

        var spawnRoom = null;
        var exitRoom = null;
        rooms.forEach(function (r) {
            if (r.type === 'spawn') spawnRoom = r;
            if (r.type === 'boss' || r.type === 'safespace') exitRoom = r;
        });

        return {
            rooms: rooms,
            cells: cells,
            portals: portals,
            spawnRoom: spawnRoom || rooms[0],
            exitRoom: exitRoom || rooms[rooms.length - 1],
            gridN: this.gridN,
            wSlices: this.wSlices,
            roomWorld: this.roomWorld,
            theme: theme,
            atmosphere: {
                fogColor: cfg.atmosphere.fogColor,
                fogDensity: cfg.atmosphere.fogDensity,
                ambientColor: cfg.atmosphere.ambientColor
            }
        };
    };

    HyperDungeonGenerator.prototype.serialize = function (map) {
        return JSON.stringify(map);
    };

    HyperDungeonGenerator.prototype.deserialize = function (json) {
        return JSON.parse(typeof json === 'string' ? json : JSON.stringify(json));
    };

    // Guarded debug meshes: returns null without THREE, else a THREE.Group
    // of one box per room (caller adds it to the scene).
    HyperDungeonGenerator.prototype.buildDebugMeshes = function (map) {
        try {
            if (typeof THREE === 'undefined' || !THREE) return null;
            var group = new THREE.Group();
            (map.rooms || []).forEach(function (r) {
                var geo = new THREE.BoxGeometry(6, 6, 6);
                var mat = new THREE.MeshBasicMaterial({ wireframe: true });
                var mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(r.cx, r.w, r.cy);
                group.add(mesh);
            });
            return group;
        } catch (e) {}
        return null;
    };

    HyperDungeonGenerator.TILE = TILE;
    HyperDungeonGenerator.THEMES = THEMES;
    HyperDungeonGenerator.DEFAULT_THEME = DEFAULT_THEME;
    HyperDungeonGenerator.W_SLICES = W_SLICES;
    HyperDungeonGenerator.GRID_N = GRID_N;

    window.GraveGain4D.HyperDungeonGenerator = HyperDungeonGenerator;
    window.GraveGain4D.HyperDungeon = HyperDungeonGenerator;
})();
