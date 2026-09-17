(function () {
    'use strict';

    // Tile codes. 0/1/2/3 are legacy (floor/wall/water/poison) and keep their
    // original rendering. 4-9 are theme hazards, rendered as tinted overlays
    // by game-runtime (see buildDungeonLayer hazard block).
    var TILE = {
        FLOOR: 0, WALL: 1, WATER: 2, TOXIC: 3, LAVA: 4,
        CRYSTAL: 5, SAND: 6, BONE: 7, METAL: 8, SPARK: 9
    };

    // Per-theme dungeon config. atmosphere is consumed by game-runtime:
    //   scene.fog.color/density <- fogColor/fogDensity,
    //   scene.background        <- fogColor,
    //   ambientLight.color      <- ambientColor.
    var THEMES = {
        metallic_ship: {
            roomBonus: 2,
            roomWeights: { normal: 3, graveyard: 1, treasury: 2, lab: 3, armory: 1 },
            hazards: [8, 8, 2],
            graveHazards: [8],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x0a1628, fogDensity: 0.0028, ambientColor: 0x4a6fa5 }
        },
        elven_grove: {
            roomBonus: 3,
            roomWeights: { normal: 3, graveyard: 2, treasury: 2, lab: 2, grove: 2 },
            hazards: [2, 5, 2],
            graveHazards: [2, 5],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x06231c, fogDensity: 0.0032, ambientColor: 0x2dd4bf }
        },
        dwarven_vault: {
            roomBonus: 1,
            roomWeights: { normal: 3, graveyard: 1, treasury: 3, lab: 2, forge: 2 },
            hazards: [4, 9, 4],
            graveHazards: [4],
            corridorWidth: [2, 2],
            atmosphere: { fogColor: 0x2a1206, fogDensity: 0.0030, ambientColor: 0xf59e0b }
        },
        orc_wastes: {
            roomBonus: 2,
            roomWeights: { normal: 4, graveyard: 2, treasury: 1, lab: 1, arena: 2 },
            hazards: [6, 9, 6],
            graveHazards: [6, 9],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x2b0d0d, fogDensity: 0.0034, ambientColor: 0xef4444 }
        },
        toxic_catacombs: {
            roomBonus: 2,
            roomWeights: { normal: 3, graveyard: 2, treasury: 1, lab: 4 },
            hazards: [3, 3, 2],
            graveHazards: [3],
            corridorWidth: [1, 1],
            atmosphere: { fogColor: 0x0b2b12, fogDensity: 0.0042, ambientColor: 0x22c55e }
        },
        stone_crypt: {
            roomBonus: 0,
            roomWeights: { normal: 4, graveyard: 3, treasury: 2, lab: 1 },
            hazards: [7, 2],
            graveHazards: [7, 7, 2],
            corridorWidth: [1, 2],
            atmosphere: { fogColor: 0x101018, fogDensity: 0.0035, ambientColor: 0x8b8fa3 }
        },
        citadel_darkness: {
            roomBonus: 3,
            roomWeights: { normal: 3, graveyard: 3, treasury: 2, lab: 2, sanctum: 1 },
            hazards: [7, 4, 9],
            graveHazards: [7, 4],
            corridorWidth: [2, 3],
            atmosphere: { fogColor: 0x150826, fogDensity: 0.0038, ambientColor: 0x8b5cf6 }
        }
    };

    var DEFAULT_THEME = 'stone_crypt';

    // Tile code -> overlay meaning. Consumed by game-runtime to tint the
    // instanced hazard overlays for tiles 4-9 (tiles 2/3 keep legacy mats).
    var HAZARD_LEGEND = {
        2: { name: 'water', color: 0x1d4ed8 },
        3: { name: 'toxic', color: 0x22c55e },
        4: { name: 'lava', color: 0xef4416, emissive: true },
        5: { name: 'crystal', color: 0x2dd4bf, emissive: true },
        6: { name: 'sand', color: 0xc2a165 },
        7: { name: 'bone', color: 0xd6d3d1 },
        8: { name: 'metal', color: 0x64748b },
        9: { name: 'sparkite', color: 0xf43f5e, emissive: true }
    };

    function resolveTheme(theme) {
        if (typeof theme === 'string' && THEMES[theme]) return theme;
        return DEFAULT_THEME;
    }

    function pickWeighted(weights) {
        var total = 0;
        var k;
        for (k in weights) { if (weights.hasOwnProperty(k)) total += weights[k]; }
        var roll = Math.random() * total;
        for (k in weights) {
            if (!weights.hasOwnProperty(k)) continue;
            roll -= weights[k];
            if (roll <= 0) return k;
        }
        return 'normal';
    }

class DungeonGenerator {
    constructor() {
        this.gridSize = 70;
        this.tileSize = 48;
    }

    generate(floorNum, theme) {
        theme = resolveTheme(theme);
        var cfg = THEMES[theme];
        var grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(1));
        const rooms = [];
        const roomCount = 10 + Math.min(6, floorNum) + (cfg.roomBonus || 0);

        for (let i = 0; i < roomCount; i++) {
            const w = Math.floor(Math.random() * 7) + 6;
            const h = Math.floor(Math.random() * 7) + 6;
            const x = Math.floor(Math.random() * (this.gridSize - w - 4)) + 2;
            const y = Math.floor(Math.random() * (this.gridSize - h - 4)) + 2;

            let overlaps = false;
            for (const r of rooms) {
                if (x < r.x + r.w + 2 && x + w > r.x - 2 && y < r.y + r.h + 2 && y + h > r.y - 2) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                let rType = 'normal';
                if (rooms.length === 0) rType = 'spawn';
                else if (i === roomCount - 1) rType = (floorNum % 3 === 0) ? 'boss' : 'safespace';
                else rType = pickWeighted(cfg.roomWeights);

                rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), type: rType });

                for (let rx = x; rx < x + w; rx++) {
                    for (let ry = y; ry < y + h; ry++) {
                        grid[rx][ry] = 0;
                    }
                }
            }
        }

        const hasExit = rooms.some(r => r.type === 'safespace' || r.type === 'boss');
        if (!hasExit && rooms.length > 1) {
            rooms[rooms.length - 1].type = (floorNum % 3 === 0) ? 'boss' : 'safespace';
        }

        var widthRange = cfg.corridorWidth || [1, 1];
        for (let i = 0; i < rooms.length - 1; i++) {
            var cw = widthRange[0] + Math.floor(Math.random() * (widthRange[1] - widthRange[0] + 1));
            this.digCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy, cw);
        }

        // Room hazards: lab rooms take the theme hazard set, graveyards take
        // the theme grave set, forge/treasury rooms in vault/citadel themes
        // get sparkite veins. Hazard tiles double as gameplay: tiles 2/3/4
        // are damaging overlays handled by the runtime hazard checks.
        rooms.forEach(room => {
            var tiles = null;
            if (room.type === 'lab') tiles = cfg.hazards;
            else if (room.type === 'graveyard') tiles = cfg.graveHazards;
            else if ((room.type === 'treasury' || room.type === 'forge') &&
                     (theme === 'dwarven_vault' || theme === 'citadel_darkness')) tiles = [9];
            else if (room.type === 'grove' && theme === 'elven_grove') tiles = [5, 2];
            else if (room.type === 'arena' && theme === 'orc_wastes') tiles = [6];
            else if (room.type === 'armory' && theme === 'metallic_ship') tiles = [8];
            else if (room.type === 'sanctum' && theme === 'citadel_darkness') tiles = [9, 4];
            if (!tiles) return;
            for (let hx = room.x + 1; hx < room.x + room.w - 1; hx += 3) {
                for (let hy = room.y + 1; hy < room.y + room.h - 1; hy += 3) {
                    grid[hx][hy] = tiles[Math.floor(Math.random() * tiles.length)];
                }
            }
        });

        if (rooms.length === 0) {
            const fx = Math.floor(this.gridSize / 2) - 5;
            const fy = Math.floor(this.gridSize / 2) - 5;
            rooms.push({ x: fx, y: fy, w: 10, h: 10, cx: fx + 5, cy: fy + 5, type: 'spawn' });
            for (let rx = fx; rx < fx + 10; rx++) {
                for (let ry = fy; ry < fy + 10; ry++) {
                    grid[rx][ry] = 0;
                }
            }
        }
        const spawnRoom = rooms.find(r => r.type === 'spawn') || rooms[0];
        return {
            grid, rooms, spawnRoom, gridSize: this.gridSize,
            theme: theme,
            atmosphere: {
                fogColor: cfg.atmosphere.fogColor,
                fogDensity: cfg.atmosphere.fogDensity,
                ambientColor: cfg.atmosphere.ambientColor
            },
            hazardLegend: HAZARD_LEGEND
        };
    }

    digCorridor(grid, x1, y1, x2, y2, width) {
        width = Math.max(1, width || 1);
        let curX = x1;
        let curY = y1;
        const carve = (cx, cy) => {
            for (let ox = 0; ox < width; ox++) {
                for (let oy = 0; oy < width; oy++) {
                    const gx = cx + ox;
                    const gy = cy + oy;
                    if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
                        grid[gx][gy] = 0;
                    }
                }
            }
        };
        while (curX !== x2) {
            carve(curX, curY);
            curX += (x2 > curX) ? 1 : -1;
        }
        while (curY !== y2) {
            carve(curX, curY);
            curY += (y2 > curY) ? 1 : -1;
        }
        carve(curX, curY);
    }
}

    DungeonGenerator.THEMES = THEMES;
    DungeonGenerator.TILE = TILE;
    DungeonGenerator.HAZARD_LEGEND = HAZARD_LEGEND;
    DungeonGenerator.DEFAULT_THEME = DEFAULT_THEME;

    window.GraveGainDungeonGenerator = DungeonGenerator;
})();
