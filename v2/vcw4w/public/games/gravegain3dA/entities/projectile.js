(function () {
    'use strict';

const ProceduralTextures = window.GraveGainProceduralTextures;

class Projectile {
    constructor(x, y, z, vx, vy, vz, dmg, isPlayer, color = 0xa855f7, type = 'magic') {
        this.x = x;
        this.y = y;
        this.z = z;
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;
        this.dmg = dmg;
        this.isPlayer = isPlayer;
        this.color = color;
        this.type = type;
        this.life = 2.5;
        this.radius = 8;
        this.dead = false;

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(2.5, 8, 8),
            new THREE.MeshBasicMaterial({ color })
        );
        this.mesh.position.set(x, y, z);
    }

    update(dt, tilemap) {
        this.life -= dt;
        if (this.life <= 0) {
            this.dead = true;
            return;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
        this.mesh.position.set(this.x, this.y, this.z);

        // Tile collision
        const tx = Math.floor(this.x / 48);
        const tz = Math.floor(this.z / 48);
        if (tilemap && tilemap.grid && tilemap.grid[tx] && (tilemap.grid[tx][tz] === 1 || tilemap.grid[tx][tz] === 6)) {
            this.dead = true;
        }
    }

    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh = null;
        }
    }
}

class DungeonProp {
    constructor(x, z, type = 'crate') {
        this.x = x;
        this.z = z;
        this.type = type;
        this.hp = type === 'chest' ? 1 : 15;
        this.radius = 16;
        this.broken = false;
        this.group3d = new THREE.Group();

        if (type === 'crate') {
            const geo = new THREE.BoxGeometry(20, 20, 20);
            const mat = new THREE.MeshStandardMaterial({
                map: ProceduralTextures.createWoodCrateTexture(),
                roughness: 0.8
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 10;
            this.group3d.add(mesh);
        } else if (type === 'chest') {
            const geo = new THREE.BoxGeometry(24, 16, 18);
            const mat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.4, roughness: 0.4 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = 8;
            this.group3d.add(mesh);

            const lock = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 2), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9 }));
            lock.position.set(0, 8, 9.5);
            this.group3d.add(lock);
        }

        this.group3d.position.set(x, 0, z);
    }

    destroy() {
        if (window.GraveGainGame) window.GraveGainGame.scene.remove(this.group3d);
    }
}

    window.GraveGainProjectile = Projectile;
    window.GraveGainDungeonProp = DungeonProp;
})();
