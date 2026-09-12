(function () {
    'use strict';

class ProceduralTextures {
    // Base tile resolution (doubled 256 -> 512 for crisper walls/floors).
    static BASE_SIZE = 512;

    // --- Shared detail overlays (additive-only; safe to call on any ctx) ----
    // Fine film-grain noise. Alpha kept low so the base palette still reads.
    static _grainNoise(ctx, S, alpha = 0.06, dots = null) {
        try {
            const n = dots || Math.floor(S * S / 90);
            for (let i = 0; i < n; i++) {
                const v = Math.random() < 0.5 ? 0 : 255;
                ctx.fillStyle = `rgba(${v},${v},${v},${(Math.random() * alpha).toFixed(3)})`;
                ctx.fillRect(Math.floor(Math.random() * S), Math.floor(Math.random() * S), 1 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2));
            }
        } catch (_) { /* canvas may be missing in tests */ }
    }

    // Darkened corners -> cheap vignette baked into the tile.
    static _vignette(ctx, S, strength = 0.28) {
        try {
            const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S * 0.72);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, `rgba(0,0,0,${strength})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, S, S);
        } catch (_) {}
    }

    // Pale worn edges along tile borders (worn-stone read at glancing angles).
    static _edgeWear(ctx, S, inset = 3, alpha = 0.10) {
        try {
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(inset, inset, S - inset * 2, S - inset * 2);
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, S, S);
        } catch (_) {}
    }

    static _finishTile(canvas, opts = {}) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        return tex;
    }

    static createStoneBrickTexture() {
        const S = ProceduralTextures.BASE_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#1c1830';
        ctx.fillRect(0, 0, S, S);

        const rows = 8;
        const cols = 4;
        const bh = S / rows;
        const bw = S / cols;

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

                // Per-brick speckle (extra detail at 512px).
                for (let s = 0; s < 26; s++) {
                    const v = Math.random() < 0.5 ? '255,255,255' : '0,0,0';
                    ctx.fillStyle = `rgba(${v},${(Math.random() * 0.07).toFixed(3)})`;
                    ctx.fillRect(bx + 4 + Math.random() * (bw - 8), by + 4 + Math.random() * (bh - 8), 2, 2);
                }
            }
        }

        // Mortar grit
        ctx.fillStyle = 'rgba(10, 8, 20, 0.8)';
        for (let r = 0; r <= rows; r++) {
            ctx.fillRect(0, r * bh - 1, S, 2);
        }

        ProceduralTextures._grainNoise(ctx, S);
        ProceduralTextures._vignette(ctx, S);
        ProceduralTextures._edgeWear(ctx, S);

        return ProceduralTextures._finishTile(canvas);
    }

    static createFloorFlagstoneTexture() {
        const S = ProceduralTextures.BASE_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#141724';
        ctx.fillRect(0, 0, S, S);

        // Large flagstone pavers
        const stones = 4;
        const size = S / stones;

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

                // Cracks + speckle detail (visible at 512px).
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const cx0 = i * size + size * (0.3 + Math.random() * 0.4);
                ctx.moveTo(cx0, j * size + 6);
                ctx.lineTo(cx0 + (Math.random() * 20 - 10), j * size + size - 6);
                ctx.stroke();
                for (let s = 0; s < 30; s++) {
                    const v = Math.random() < 0.5 ? '255,255,255' : '0,0,0';
                    ctx.fillStyle = `rgba(${v},${(Math.random() * 0.08).toFixed(3)})`;
                    ctx.fillRect(i * size + 6 + Math.random() * (size - 12), j * size + 6 + Math.random() * (size - 12), 2, 2);
                }
            }
        }

        ProceduralTextures._grainNoise(ctx, S);
        ProceduralTextures._vignette(ctx, S, 0.22);
        ProceduralTextures._edgeWear(ctx, S);

        return ProceduralTextures._finishTile(canvas);
    }

    static createCeilingTexture() {
        const S = ProceduralTextures.BASE_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0c0d18';
        ctx.fillRect(0, 0, S, S);

        // Heavy timber wood beams across ceiling (scaled to S)
        const beam = Math.floor(S * 36 / 256);
        const off = Math.floor(S * 110 / 256);
        ctx.fillStyle = '#221612';
        ctx.fillRect(0, off, S, beam);
        ctx.fillRect(off, 0, beam, S);

        // Wood-grain streaks on the beams (new detail layer).
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        for (let k = 0; k < 8; k++) {
            const yy = off + 4 + (k * (beam - 8)) / 7;
            ctx.beginPath();
            ctx.moveTo(0, yy);
            ctx.bezierCurveTo(S * 0.3, yy + 3, S * 0.6, yy - 3, S, yy);
            ctx.stroke();
        }

        // Iron bolts on intersections
        const bolt = Math.floor(S * 12 / 256);
        const bc = Math.floor(S * 122 / 256);
        ctx.fillStyle = '#4a443e';
        ctx.fillRect(bc, bc, bolt, bolt);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(bc, bc, bolt, 2);

        ProceduralTextures._grainNoise(ctx, S);
        ProceduralTextures._vignette(ctx, S, 0.34);

        return ProceduralTextures._finishTile(canvas);
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
    static createMetalShipTexture() {
        const S = ProceduralTextures.BASE_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, S, S);

        // Brushed-metal streaks (new detail layer).
        for (let i = 0; i < 90; i++) {
            ctx.strokeStyle = `rgba(148,163,184,${(Math.random() * 0.06).toFixed(3)})`;
            ctx.lineWidth = 1;
            const yy = Math.random() * S;
            ctx.beginPath();
            ctx.moveTo(0, yy);
            ctx.lineTo(S, yy + (Math.random() * 6 - 3));
            ctx.stroke();
        }

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, S - 8, S - 8);
        ctx.strokeRect(16, 16, S - 32, S - 32);

        // Rivets
        ctx.fillStyle = '#94a3b8';
        const dots = [10, S / 2, S - 10];
        dots.forEach(x => {
            dots.forEach(y => {
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        ProceduralTextures._grainNoise(ctx, S, 0.05);
        ProceduralTextures._vignette(ctx, S, 0.24);
        ProceduralTextures._edgeWear(ctx, S);

        return ProceduralTextures._finishTile(canvas);
    }

    static createElvenGroveTexture() {        const S = ProceduralTextures.BASE_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, S, S);

        // Moss mottling (new detail layer).
        for (let i = 0; i < 160; i++) {
            ctx.fillStyle = `rgba(${20 + Math.floor(Math.random() * 40)},${120 + Math.floor(Math.random() * 80)},${80 + Math.floor(Math.random() * 40)},${(0.05 + Math.random() * 0.08).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(Math.random() * S, Math.random() * S, 3 + Math.random() * 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bioluminescent vines
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.quadraticCurveTo(128, 200, 256, 80);
        ctx.stroke();

        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.quadraticCurveTo(200, 128, 60, 256);
        ctx.stroke();

        // Extra firefly dots (glow read at 512px).
        for (let i = 0; i < 40; i++) {
            ctx.fillStyle = `rgba(167,243,208,${(0.25 + Math.random() * 0.5).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(Math.random() * S, Math.random() * S, 1.5 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ProceduralTextures._grainNoise(ctx, S, 0.05);
        ProceduralTextures._vignette(ctx, S, 0.26);

        return ProceduralTextures._finishTile(canvas);
    }

    // --- New makers (additive; Three.js r128, CanvasTexture API) --------------

    // Soft radial glow sprite for embers / eyes / boss auras.
    // Returns a THREE.Sprite (additive); .material.map holds the CanvasTexture.
    static createGlowSprite(color = '#ffcc4c', size = 128) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const c = size / 2;
        const grad = ctx.createRadialGradient(c, c, 1, c, c, c);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.25, color);
        grad.addColorStop(0.6, 'rgba(0,0,0,0.35)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(20, 20, 1);
        return sprite;
    }

    // Glowing rune circle, intended as emissiveMap / overlay decal.
    static createEmissiveRuneTexture(size = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const c = size / 2;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        // Outer + inner rings.
        ctx.strokeStyle = '#7df9ff';
        ctx.lineWidth = Math.max(2, size / 64);
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = size / 12;
        [0.42, 0.30].forEach(r => {
            ctx.beginPath();
            ctx.arc(c, c, size * r, 0, Math.PI * 2);
            ctx.stroke();
        });
        // Rune ticks around the ring.
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const r0 = size * 0.30, r1 = size * 0.40;
            ctx.beginPath();
            ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
            ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
            ctx.stroke();
        }
        // Core glyph diamond.
        ctx.beginPath();
        ctx.moveTo(c, c - size * 0.12);
        ctx.lineTo(c + size * 0.12, c);
        ctx.lineTo(c, c + size * 0.12);
        ctx.lineTo(c - size * 0.12, c);
        ctx.closePath();
        ctx.stroke();
        try { ctx.shadowBlur = 0; } catch (_) {}
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    // Vertical gradient skybox/fog card. topColor/bottomColor are css colors.
    static createSkyboxGradient(topColor = '#04030a', bottomColor = '#1a1033', w = 16, h = 256) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, topColor);
        g.addColorStop(1, bottomColor);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    // Per-theme floor/wall material tint. Multiplied over the base stone
    // maps by game-runtime (white = no change, the classic crypt look).
    static themeTint(theme) {
        const TINTS = {
            metallic_ship:   { floor: 0x9fb3c8, wall: 0x8fa3bf },
            elven_grove:     { floor: 0x7dd3a8, wall: 0x6ee7b7 },
            dwarven_vault:   { floor: 0xfbbf24, wall: 0xf59e0b },
            orc_wastes:      { floor: 0xfca5a5, wall: 0xef4444 },
            toxic_catacombs: { floor: 0x86efac, wall: 0x22c55e },
            stone_crypt:     { floor: 0xffffff, wall: 0xd6d3d1 },
            citadel_darkness:{ floor: 0xc4b5fd, wall: 0x8b5cf6 }
        };
        return TINTS[theme] || TINTS.stone_crypt;
    }
}

    window.GraveGainProceduralTextures = ProceduralTextures;
})();
