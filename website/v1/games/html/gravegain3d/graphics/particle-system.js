(function () {
    'use strict';

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.chunks = [];
    }

    spawnSparks(x, z, hexColor = 0xffcc4c, count = 15) {
        const mat = new THREE.MeshBasicMaterial({ color: hexColor });
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), mat);
            mesh.position.set(x, 14, z);
            this.scene.add(mesh);
            this.chunks.push({
                mesh,
                vx: (Math.random() * 2 - 1) * 140,
                vy: 80 + Math.random() * 120,
                vz: (Math.random() * 2 - 1) * 140,
                life: 0.4 + Math.random() * 0.3
            });
        }
    }

    spawnBlood(x, z, hexColor = 0xef4444, count = 12) {
        const mat = new THREE.MeshBasicMaterial({ color: hexColor });
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), mat);
            mesh.position.set(x + (Math.random() * 6 - 3), 16, z + (Math.random() * 6 - 3));
            this.scene.add(mesh);
            this.chunks.push({
                mesh,
                vx: (Math.random() * 2 - 1) * 100,
                vy: 100 + Math.random() * 80,
                vz: (Math.random() * 2 - 1) * 100,
                life: 0.5 + Math.random() * 0.3
            });
        }
    }

    update(dt) {
        this.chunks.forEach(c => {
            c.life -= dt;
            c.vy -= 600 * dt;
            c.mesh.position.x += c.vx * dt;
            c.mesh.position.y += c.vy * dt;
            c.mesh.position.z += c.vz * dt;
            if (c.mesh.position.y <= 1) {
                c.mesh.position.y = 1;
                c.vx *= 0.5;
                c.vz *= 0.5;
            }
        });

        const dead = this.chunks.filter(c => c.life <= 0);
        dead.forEach(c => {
            this.scene.remove(c.mesh);
            if (c.mesh.geometry) c.mesh.geometry.dispose();
        });
        this.chunks = this.chunks.filter(c => c.life > 0);
    }

    clear() {
        this.chunks.forEach(c => {
            this.scene.remove(c.mesh);
            if (c.mesh.geometry) c.mesh.geometry.dispose();
        });
        this.chunks = [];
    }
}

    window.GraveGainParticleSystem = ParticleSystem;
})();
