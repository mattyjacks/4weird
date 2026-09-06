(function () {
    'use strict';

    class PhysicsController {
        moveEntityWithCollision(entity, dx, dy, tilemap) {
            if (!tilemap) { entity.x += dx; entity.y += dy; return; }
            const oldX = entity.x;
            const oldY = entity.y;
            entity.x += dx;
            if (this.isColliding(entity.x, entity.y, entity.radius, tilemap)) entity.x = oldX;
            entity.y += dy;
            if (this.isColliding(entity.x, entity.y, entity.radius, tilemap)) entity.y = oldY;
        }

        isColliding(x, y, radius, tilemap) {
            if (!tilemap?.grid) return false;
            const corners = [[x - radius, y - radius], [x + radius, y - radius], [x - radius, y + radius], [x + radius, y + radius]];
            return corners.some(([px, py]) => {
                const tx = Math.floor(px / 48);
                const ty = Math.floor(py / 48);
                if (tx < 0 || tx >= tilemap.gridSize || ty < 0 || ty >= tilemap.gridSize) return true;
                const cell = tilemap.grid[tx][ty];
                return cell === 1 || cell === 6;
            });
        }
    }

    window.GraveGainPhysicsController = PhysicsController;
})();
