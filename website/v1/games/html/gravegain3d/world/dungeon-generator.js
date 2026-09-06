(function () {
    'use strict';

class DungeonGenerator {
    constructor() {
        this.gridSize = 70;
        this.tileSize = 48;
    }

    generate(floorNum) {
        const grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(1));
        const rooms = [];
        const roomCount = 10 + Math.min(6, floorNum);

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
                else {
                    const types = ['normal', 'graveyard', 'treasury', 'lab', 'normal'];
                    rType = types[Math.floor(Math.random() * types.length)];
                }

                rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), type: rType });

                for (let rx = x; rx < x + w; rx++) {
                    for (let ry = y; ry < y + h; ry++) {
                        grid[rx][ry] = 0;
                    }
                }
            }
        }

        for (let i = 0; i < rooms.length - 1; i++) {
            this.digCorridor(grid, rooms[i].cx, rooms[i].cy, rooms[i + 1].cx, rooms[i + 1].cy);
        }

        // Room hazards
        rooms.forEach(room => {
            if (room.type === 'lab') {
                for (let hx = room.x + 1; hx < room.x + room.w - 1; hx += 3) {
                    for (let hy = room.y + 1; hy < room.y + room.h - 1; hy += 3) {
                        grid[hx][hy] = Math.random() < 0.5 ? 3 : 2; // Poison or Water
                    }
                }
            }
        });

        const spawnRoom = rooms.find(r => r.type === 'spawn') || rooms[0];
        return { grid, rooms, spawnRoom, gridSize: this.gridSize };
    }

    digCorridor(grid, x1, y1, x2, y2) {
        let curX = x1;
        let curY = y1;
        while (curX !== x2) {
            grid[curX][curY] = 0;
            curX += (x2 > curX) ? 1 : -1;
        }
        while (curY !== y2) {
            grid[curX][curY] = 0;
            curY += (y2 > curY) ? 1 : -1;
        }
    }
}

    window.GraveGainDungeonGenerator = DungeonGenerator;
})();
