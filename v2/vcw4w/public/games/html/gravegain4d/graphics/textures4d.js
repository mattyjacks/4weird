/* GraveGain4D textures4d — canvas emoji-sprite factory + stone/rune textures.
 *
 * Same visual language as GraveGain3D graphics/procedural-textures.js:
 * emoji-billboard sprites (canvas-drawn emoji textures), vertex-lit stone
 * colors, particle-burst sprites, voxel-gore cube faces.
 *
 * Three.js r128 global (CDN, same as GG3D). Vanilla IIFE, idempotent via
 * window.GraveGain4DTextures. Never throws: every hook is try/catch guarded.
 * No DOM listeners, no overlays, and no screen-mode or double-click handlers.
 * Letterbox-safe: textures never touch renderer size; canvases used here are
 * offscreen sprite sources only. */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DTextures) return;

        var VERSION = '1.0.0';
        var BASE_SIZE = 512;
        var SPRITE_SIZE = 128;

        // Emoji set shared with GG3D: billboard markers for 4D entities.
        var EMOJI = {
            zombie: '\uD83E\uDDDF',   // 🧟
            skull: '\uD83D\uDC80',    // 💀
            sword: '\uD83D\uDDE1\uFE0F', // 🗡️
            wisp: '\uD83D\uDFE2',     // 🟢
            ghost: '\uD83D\uDC7B',
            rune: '\u2728',
            blood: '\uD83D\uDCA5'
        };

        var _cache = {};

        function hasTHREE() {
            try { return !!(window.THREE && window.THREE.CanvasTexture); }
            catch (e) { return false; }
        }

        function makeCanvas(s) {
            var c = document.createElement('canvas');
            c.width = s;
            c.height = s;
            return c;
        }

        /* ---- shared detail overlays (same recipe as GG3D) ---- */

        function _grainNoise(ctx, S, alpha, dots) {
            try {
                alpha = (typeof alpha === 'number') ? alpha : 0.06;
                var n = dots || Math.floor(S * S / 90);
                for (var i = 0; i < n; i++) {
                    var v = Math.random() < 0.5 ? 0 : 255;
                    ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' +
                        (Math.random() * alpha).toFixed(3) + ')';
                    ctx.fillRect(Math.floor(Math.random() * S), Math.floor(Math.random() * S),
                        1 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 2));
                }
            } catch (_) { /* canvas may be missing in tests */ }
        }

        function _vignette(ctx, S, strength) {
            try {
                strength = (typeof strength === 'number') ? strength : 0.28;
                var g = ctx.createRadialGradient(S / 2, S / 2, S * 0.32, S / 2, S / 2, S * 0.72);
                g.addColorStop(0, 'rgba(0,0,0,0)');
                g.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, S, S);
            } catch (_) {}
        }

        function _edgeWear(ctx, S, inset, alpha) {
            try {
                inset = inset || 3;
                alpha = (typeof alpha === 'number') ? alpha : 0.10;
                ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
                ctx.lineWidth = 2;
                ctx.strokeRect(inset, inset, S - inset * 2, S - inset * 2);
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 4;
                ctx.strokeRect(0, 0, S, S);
            } catch (_) {}
        }

        function _finishTile(canvas) {
            var tex = new window.THREE.CanvasTexture(canvas);
            tex.wrapS = window.THREE.RepeatWrapping;
            tex.wrapT = window.THREE.RepeatWrapping;
            tex.anisotropy = 4;
            return tex;
        }

        /* ---- emoji-sprite factory ---- */

        // Draw one emoji glyph to an offscreen canvas; returns the canvas.
        function drawEmojiCanvas(emoji, size, bg) {
            size = size || SPRITE_SIZE;
            var canvas = makeCanvas(size);
            try {
                var ctx = canvas.getContext('2d');
                if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
                ctx.font = Math.floor(size * 0.72) + 'px "Segoe UI Emoji", "Apple Color Emoji", Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emoji, size / 2, size / 2);
            } catch (_) {}
            return canvas;
        }

        // CanvasTexture for an emoji (cached per glyph+size).
        function emojiTexture(emoji, size) {
            size = size || SPRITE_SIZE;
            var key = 'emoji:' + emoji + ':' + size;
            if (_cache[key]) return _cache[key];
            if (!hasTHREE()) return null;
            try {
                var tex = new window.THREE.CanvasTexture(drawEmojiCanvas(emoji, size, null));
                _cache[key] = tex;
                return tex;
            } catch (_) { return null; }
        }

        // Billboard sprite for an emoji glyph (GG3D look: transparent, no depth write).
        function createEmojiSprite(emoji, size, scale) {
            try {
                if (!hasTHREE()) return null;
                var tex = emojiTexture(emoji, size || SPRITE_SIZE);
                if (!tex) return null;
                var mat = new window.THREE.SpriteMaterial({
                    map: tex, transparent: true, depthWrite: false
                });
                var sprite = new window.THREE.Sprite(mat);
                var s = (typeof scale === 'number') ? scale : 24;
                sprite.scale.set(s, s, 1);
                return sprite;
            } catch (_) { return null; }
        }

        // Convenience: zombie / skull / sword / wisp billboards.
        function createZombieSprite(scale) { return createEmojiSprite(EMOJI.zombie, SPRITE_SIZE, scale || 24); }
        function createSkullSprite(scale) { return createEmojiSprite(EMOJI.skull, SPRITE_SIZE, scale || 20); }
        function createSwordSprite(scale) { return createEmojiSprite(EMOJI.sword, SPRITE_SIZE, scale || 20); }
        function createWispSprite(scale) { return createEmojiSprite(EMOJI.wisp, SPRITE_SIZE, scale || 16); }

        // Soft radial particle-burst sprite (gore bursts, w-pass flashes).
        function createBurstSprite(color, size) {
            try {
                if (!hasTHREE()) return null;
                color = color || '#ffcc4c';
                size = size || 64;
                var canvas = makeCanvas(size);
                var ctx = canvas.getContext('2d');
                var grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
                grad.addColorStop(0, 'rgba(255,240,180,1.0)');
                grad.addColorStop(0.3, color);
                grad.addColorStop(0.7, 'rgba(220,40,10,0.4)');
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, size, size);
                var tex = new window.THREE.CanvasTexture(canvas);
                var mat = new window.THREE.SpriteMaterial({
                    map: tex, transparent: true,
                    blending: window.THREE.AdditiveBlending, depthWrite: false
                });
                var sprite = new window.THREE.Sprite(mat);
                sprite.scale.set(16, 16, 1);
                return sprite;
            } catch (_) { return null; }
        }

        // Voxel-gore cube face: dark red mottled tile for gib cubes.
        function createGoreCubeTexture(size) {
            try {
                if (!hasTHREE()) return null;
                size = size || 128;
                var key = 'gore:' + size;
                if (_cache[key]) return _cache[key];
                var canvas = makeCanvas(size);
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#5a0d0d';
                ctx.fillRect(0, 0, size, size);
                for (var i = 0; i < 90; i++) {
                    var r = 120 + Math.floor(Math.random() * 100);
                    ctx.fillStyle = 'rgba(' + r + ',10,10,' + (0.1 + Math.random() * 0.25).toFixed(3) + ')';
                    ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 5, 2 + Math.random() * 5);
                }
                _grainNoise(ctx, size, 0.08);
                _vignette(ctx, size, 0.3);
                var tex = _finishTile(canvas);
                _cache[key] = tex;
                return tex;
            } catch (_) { return null; }
        }

        /* ---- stone / rune textures (vertex-lit stone colors) ---- */

        // Vertex-lit stone tint helper: returns a THREE.Color multiplier.
        function stoneTint(wDepth) {
            try {
                // Deeper w = colder/darker stone; matches W-fog ramp.
                var t = Math.max(0, Math.min(1, Number(wDepth) || 0));
                var c = new window.THREE.Color(0xd6d3d1);
                c.multiplyScalar(1.0 - t * 0.45);
                return c;
            } catch (_) { return null; }
        }

        function createStoneBrickTexture4D() {
            try {
                if (!hasTHREE()) return null;
                if (_cache.stoneBrick) return _cache.stoneBrick;
                var S = BASE_SIZE;
                var canvas = makeCanvas(S);
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#1c1830';
                ctx.fillRect(0, 0, S, S);
                var rows = 8, cols = 4;
                var bh = S / rows, bw = S / cols;
                for (var r = 0; r < rows; r++) {
                    var offset = (r % 2) * (bw / 2);
                    for (var c = -1; c <= cols; c++) {
                        var bx = c * bw + offset, by = r * bh;
                        var lightness = 22 + Math.floor(Math.random() * 8);
                        ctx.fillStyle = 'hsl(255, 20%, ' + lightness + '%)';
                        ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
                        ctx.fillStyle = 'rgba(255,255,255,0.08)';
                        ctx.fillRect(bx + 2, by + 2, bw - 4, 3);
                        ctx.fillRect(bx + 2, by + 2, 3, bh - 4);
                        ctx.fillStyle = 'rgba(0,0,0,0.35)';
                        ctx.fillRect(bx + 2, by + bh - 5, bw - 4, 3);
                        ctx.fillRect(bx + bw - 5, by + 2, 3, bh - 4);
                    }
                }
                ctx.fillStyle = 'rgba(10,8,20,0.8)';
                for (var m = 0; m <= rows; m++) ctx.fillRect(0, m * bh - 1, S, 2);
                _grainNoise(ctx, S);
                _vignette(ctx, S);
                _edgeWear(ctx, S);
                var tex = _finishTile(canvas);
                _cache.stoneBrick = tex;
                return tex;
            } catch (_) { return null; }
        }

        function createFloorFlagstoneTexture4D() {
            try {
                if (!hasTHREE()) return null;
                if (_cache.flagstone) return _cache.flagstone;
                var S = BASE_SIZE;
                var canvas = makeCanvas(S);
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#141724';
                ctx.fillRect(0, 0, S, S);
                var stones = 4, size = S / stones;
                for (var i = 0; i < stones; i++) {
                    for (var j = 0; j < stones; j++) {
                        var shade = 18 + Math.floor(Math.random() * 7);
                        ctx.fillStyle = 'hsl(220, 18%, ' + shade + '%)';
                        ctx.fillRect(i * size + 3, j * size + 3, size - 6, size - 6);
                        ctx.fillStyle = 'rgba(255,255,255,0.05)';
                        ctx.fillRect(i * size + 3, j * size + 3, size - 6, 2);
                        ctx.fillStyle = 'rgba(0,0,0,0.4)';
                        ctx.fillRect(i * size + 3, j * size + size - 5, size - 6, 2);
                    }
                }
                _grainNoise(ctx, S);
                _vignette(ctx, S, 0.22);
                _edgeWear(ctx, S);
                var tex = _finishTile(canvas);
                _cache.flagstone = tex;
                return tex;
            } catch (_) { return null; }
        }

        // Glowing rune circle for w-gate decals / slice portals.
        function createRuneTexture4D(size) {
            try {
                if (!hasTHREE()) return null;
                size = size || 256;
                var key = 'rune4d:' + size;
                if (_cache[key]) return _cache[key];
                var canvas = makeCanvas(size);
                var ctx = canvas.getContext('2d');
                var c = size / 2;
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, size, size);
                ctx.strokeStyle = '#7df9ff';
                ctx.lineWidth = Math.max(2, size / 64);
                try { ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = size / 12; } catch (_) {}
                [0.42, 0.30].forEach(function (rr) {
                    ctx.beginPath();
                    ctx.arc(c, c, size * rr, 0, Math.PI * 2);
                    ctx.stroke();
                });
                for (var i = 0; i < 12; i++) {
                    var a = (i / 12) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(c + Math.cos(a) * size * 0.30, c + Math.sin(a) * size * 0.30);
                    ctx.lineTo(c + Math.cos(a) * size * 0.40, c + Math.sin(a) * size * 0.40);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.moveTo(c, c - size * 0.12);
                ctx.lineTo(c + size * 0.12, c);
                ctx.lineTo(c, c + size * 0.12);
                ctx.lineTo(c - size * 0.12, c);
                ctx.closePath();
                ctx.stroke();
                try { ctx.shadowBlur = 0; } catch (_) {}
                var tex = new window.THREE.CanvasTexture(canvas);
                tex.wrapS = window.THREE.RepeatWrapping;
                tex.wrapT = window.THREE.RepeatWrapping;
                _cache[key] = tex;
                return tex;
            } catch (_) { return null; }
        }

        function clearCache() {
            try {
                Object.keys(_cache).forEach(function (k) {
                    try { if (_cache[k] && _cache[k].dispose) _cache[k].dispose(); } catch (_) {}
                });
                _cache = {};
            } catch (_) {}
        }

        window.GraveGain4DTextures = {
            version: VERSION,
            BASE_SIZE: BASE_SIZE,
            EMOJI: EMOJI,
            drawEmojiCanvas: drawEmojiCanvas,
            emojiTexture: emojiTexture,
            createEmojiSprite: createEmojiSprite,
            createZombieSprite: createZombieSprite,
            createSkullSprite: createSkullSprite,
            createSwordSprite: createSwordSprite,
            createWispSprite: createWispSprite,
            createBurstSprite: createBurstSprite,
            createGoreCubeTexture: createGoreCubeTexture,
            stoneTint: stoneTint,
            createStoneBrickTexture4D: createStoneBrickTexture4D,
            createFloorFlagstoneTexture4D: createFloorFlagstoneTexture4D,
            createRuneTexture4D: createRuneTexture4D,
            clearCache: clearCache
        };
    } catch (_) { /* never throw */ }
})();
