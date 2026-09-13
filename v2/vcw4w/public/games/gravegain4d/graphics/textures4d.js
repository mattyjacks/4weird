(function () {
    'use strict';

    // GraveGain4D procedural 4D textures.
    // Canvas-generated per mission theme (ship/grove/vault/wastes/catacombs/
    // crypt/citadel) + trippy fold gradient + alternate-world tints.
    // Vanilla script, no imports. Returns THREE.CanvasTexture when THREE is
    // present, otherwise the raw canvas element.

    var SIZE = 256;
    var cache = new Map();

    var THEMES = {
        ship:      { base: '#232946', glow: '#00e5ff', dark: '#0b0e1d', motif: 'panels' },
        grove:     { base: '#14331f', glow: '#7CFC00', dark: '#07130c', motif: 'vines' },
        vault:     { base: '#3a2d12', glow: '#ffd34c', dark: '#171006', motif: 'vault' },
        wastes:    { base: '#3d2330', glow: '#ff5c8a', dark: '#160a10', motif: 'cracks' },
        catacombs: { base: '#2b2340', glow: '#b79cff', dark: '#100c1c', motif: 'bones' },
        crypt:     { base: '#123038', glow: '#4cf5d2', dark: '#061416', motif: 'runes' },
        citadel:   { base: '#3a2337', glow: '#ff9d4c', dark: '#170d16', motif: 'sigils' }
    };

    var ALT_TINTS = {
        normal:   'rgba(0,0,0,0)',
        mirror:   'rgba(0,229,255,0.10)',
        hollow:   'rgba(183,156,255,0.14)',
        rot:      'rgba(255,92,138,0.12)',
        radiant:  'rgba(255,211,76,0.10)'
    };

    function makeCanvas(s) {
        var cv = document.createElement('canvas');
        cv.width = s || SIZE;
        cv.height = s || SIZE;
        return cv;
    }

    function grain(ctx, S, alpha, dots) {
        try {
            var n = dots || Math.floor(S * S / 110);
            for (var i = 0; i < n; i++) {
                var v = Math.random() < 0.5 ? 0 : 255;
                ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (Math.random() * alpha).toFixed(3) + ')';
                ctx.fillRect(Math.floor(Math.random() * S), Math.floor(Math.random() * S), 1, 1);
            }
        } catch (_) {}
    }

    function vignette(ctx, S, strength) {
        try {
            var g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, 'rgba(0,0,0,' + (strength || 0.32) + ')');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, S, S);
        } catch (_) {}
    }

    function motif(ctx, S, name, glow) {
        ctx.save();
        try {
            ctx.strokeStyle = glow;
            ctx.fillStyle = glow;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1.5;
            if (name === 'panels') {
                for (var y = 0; y <= 4; y++) {
                    ctx.beginPath(); ctx.moveTo(0, y * S / 4); ctx.lineTo(S, y * S / 4); ctx.stroke();
                }
                for (var x = 0; x <= 4; x++) {
                    ctx.beginPath(); ctx.moveTo(x * S / 4, 0); ctx.lineTo(x * S / 4, S); ctx.stroke();
                }
                ctx.globalAlpha = 0.9;
                for (var i = 0; i < 6; i++) {
                    ctx.fillRect(Math.random() * S, Math.random() * S, 6, 2);
                }
            } else if (name === 'vines') {
                for (var v = 0; v < 9; v++) {
                    ctx.beginPath();
                    var vx = Math.random() * S;
                    ctx.moveTo(vx, S);
                    ctx.bezierCurveTo(vx - 30, S * 0.66, vx + 30, S * 0.33, vx - 10, 0);
                    ctx.stroke();
                }
            } else if (name === 'vault') {
                ctx.strokeRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8);
                ctx.strokeRect(S * 0.22, S * 0.22, S * 0.56, S * 0.56);
                ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.12, 0, Math.PI * 2); ctx.stroke();
            } else if (name === 'cracks') {
                for (var c = 0; c < 7; c++) {
                    ctx.beginPath();
                    var px = Math.random() * S, py = Math.random() * S;
                    ctx.moveTo(px, py);
                    for (var s = 0; s < 5; s++) {
                        px += (Math.random() - 0.5) * 60; py += (Math.random() - 0.5) * 60;
                        ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                }
            } else if (name === 'bones') {
                for (var b = 0; b < 8; b++) {
                    ctx.globalAlpha = 0.35;
                    ctx.fillRect(Math.random() * S, Math.random() * S, 18, 4);
                }
            } else if (name === 'runes') {
                ctx.textAlign = 'center';
                ctx.font = Math.floor(S / 10) + 'px serif';
                var runes = 'ᚠᚱᛟᛞᚨᛚᚷᛝ';
                for (var r = 0; r < 8; r++) {
                    ctx.globalAlpha = 0.7;
                    ctx.fillText(runes[r % runes.length], Math.random() * S, Math.random() * S);
                }
            } else { // sigils
                for (var g2 = 0; g2 < 4; g2++) {
                    ctx.beginPath();
                    ctx.arc(S / 2, S / 2, S * (0.12 + g2 * 0.09), 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.beginPath(); ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2); ctx.stroke();
            }
        } catch (_) {}
        ctx.restore();
    }

    function paintTheme(name) {
        var def = THEMES[name] || THEMES.crypt;
        var S = SIZE;
        var cv = makeCanvas(S);
        var ctx = cv.getContext('2d');
        if (!ctx) return cv;
        // Base with diagonal 4D sheen.
        var g = ctx.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, def.dark);
        g.addColorStop(0.5, def.base);
        g.addColorStop(1, def.dark);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S, S);
        // Trippy w-band wash.
        var w = ctx.createLinearGradient(0, S, S, 0);
        w.addColorStop(0, 'rgba(124,58,237,0.25)');
        w.addColorStop(0.5, 'rgba(0,0,0,0)');
        w.addColorStop(1, def.glow + '22');
        ctx.fillStyle = w;
        ctx.fillRect(0, 0, S, S);
        motif(ctx, S, def.motif, def.glow);
        grain(ctx, S, 0.07);
        vignette(ctx, S, 0.32);
        return cv;
    }

    function foldGradientCanvas(t, alt) {
        var S = SIZE;
        var cv = makeCanvas(S);
        try {
            var ctx = cv.getContext('2d');
            if (!ctx) return cv;
            var hue = (280 + (t || 0) * 40) % 360;
            var g = ctx.createLinearGradient(0, 0, S, S);
            g.addColorStop(0, 'hsl(' + Math.round(hue) + ',85%,30%)');
            g.addColorStop(0.5, 'hsl(' + Math.round((hue + 60) % 360) + ',90%,55%)');
            g.addColorStop(1, 'hsl(' + Math.round((hue + 300) % 360) + ',85%,28%)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, S, S);
            // Folding bands: vectors folding in on themselves.
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            for (var i = 0; i < 8; i++) {
                var y = (i / 8) * S + Math.sin((t || 0) * 3 + i) * 8;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, S - y); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            var tint = ALT_TINTS[alt] || ALT_TINTS.normal;
            ctx.fillStyle = tint;
            ctx.fillRect(0, 0, S, S);
            grain(ctx, S, 0.05);
        } catch (_) {}
        return cv;
    }

    function toTexture(canvas) {
        try {
            if (typeof THREE !== 'undefined' && THREE.CanvasTexture) {
                var tex = new THREE.CanvasTexture(canvas);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.anisotropy = 4;
                return tex;
            }
        } catch (_) {}
        return canvas;
    }

    window.GraveGain4DTextures = {
        SIZE: SIZE,
        listThemes: function () { return Object.keys(THEMES); },
        altWorlds: function () { return Object.keys(ALT_TINTS); },
        getTheme: function (name, opts) {
            var key = 'theme:' + (name || 'crypt');
            if (!cache.has(key)) cache.set(key, toTexture(paintTheme(name || 'crypt')));
            void (opts && opts.alt);
            return cache.get(key);
        },
        getFoldGradient: function (t, alt) {
            // Animated: bucket time so the cache stays bounded.
            var bucket = Math.round((Number(t) || 0) * 8) % 64;
            var key = 'fold:' + bucket + ':' + (alt || 'normal');
            if (!cache.has(key)) {
                if (cache.size > 96) cache.clear();
                cache.set(key, toTexture(foldGradientCanvas(Number(t) || 0, alt)));
            }
            return cache.get(key);
        },
        getAlternateTint: function (world) { return ALT_TINTS[world] || ALT_TINTS.normal; },
        clearCache: function () { cache.clear(); }
    };
})();
