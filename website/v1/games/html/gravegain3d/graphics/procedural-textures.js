(function () {
    'use strict';

class ProceduralTextures {
    static createStoneBrickTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1c1830';
        ctx.fillRect(0, 0, 256, 256);

        const rows = 8;
        const cols = 4;
        const bh = 256 / rows;
        const bw = 256 / cols;

        for (let r = 0; r < rows; r++) {
            const offset = (r % 2) * (bw / 2);
            for (let c = -1; c <= cols; c++) {
                const bx = c * bw + offset;
                const by = r * bh;

                // Brick base color with subtle noise
                const lightness = 22 + Math.floor(Math.random() * 8);
                ctx.fillStyle = `hsl(255, 20%, ${lightness}%)`;
                ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);

                // Top/left highlight
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.fillRect(bx + 2, by + 2, bw - 4, 3);
                ctx.fillRect(bx + 2, by + 2, 3, bh - 4);

                // Bottom/right shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fillRect(bx + 2, by + bh - 5, bw - 4, 3);
                ctx.fillRect(bx + bw - 5, by + 2, 3, bh - 4);
            }
        }

        // Mortar grit
        ctx.fillStyle = 'rgba(10, 8, 20, 0.8)';
        for (let r = 0; r <= rows; r++) {
            ctx.fillRect(0, r * bh - 1, 256, 2);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    static createFloorFlagstoneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#141724';
        ctx.fillRect(0, 0, 256, 256);

        // Large flagstone pavers
        const stones = 4;
        const size = 256 / stones;

        for (let i = 0; i < stones; i++) {
            for (let j = 0; j < stones; j++) {
                const shade = 18 + Math.floor(Math.random() * 7);
                ctx.fillStyle = `hsl(220, 18%, ${shade}%)`;
                ctx.fillRect(i * size + 3, j * size + 3, size - 6, size - 6);

                // Bevel highlights
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(i * size + 3, j * size + 3, size - 6, 2);
                ctx.fillRect(i * size + 3, j * size + 3, 2, size - 6);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(i * size + 3, j * size + size - 5, size - 6, 2);
                ctx.fillRect(i * size + size - 5, j * size + 3, 2, size - 6);
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    static createCeilingTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0c0d18';
        ctx.fillRect(0, 0, 256, 256);

        // Heavy timber wood beams across ceiling
        ctx.fillStyle = '#221612';
        ctx.fillRect(0, 110, 256, 36);
        ctx.fillRect(110, 0, 36, 256);

        // Iron bolts on intersections
        ctx.fillStyle = '#4a443e';
        ctx.fillRect(122, 122, 12, 12);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    static createWoodCrateTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#5a3d28';
        ctx.fillRect(0, 0, 128, 128);

        // Wood planks
        ctx.fillStyle = '#49301e';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(0, i * 32, 128, 30);
        }

        // Cross braces
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#322014';
        ctx.strokeRect(5, 5, 118, 118);
        ctx.beginPath();
        ctx.moveTo(5, 5);
        ctx.lineTo(123, 123);
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    static createTorchFlameSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
        grad.addColorStop(0, 'rgba(255, 240, 180, 1.0)');
        grad.addColorStop(0.3, 'rgba(255, 140, 20, 0.85)');
        grad.addColorStop(0.7, 'rgba(220, 40, 10, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(16, 16, 1);
        return sprite;
    }

    static createEmojiSprite(emoji, size = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.font = `${size * 0.72}px "Segoe UI Emoji", "Apple Color Emoji", Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(24, 24, 1);
        return sprite;
    }
}

    window.GraveGainProceduralTextures = ProceduralTextures;
})();
