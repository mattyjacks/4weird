/* GraveGain4D wghosts — translucent projections of adjacent w-slices.
 *
 * Entities/geometry one w-step away render as translucent "W-ghosts"
 * (opacity ~0.25): emoji-billboard sprites + wireframe room shells with a
 * color-cycling trippy fog tint. Helps the player read ana/kata adjacency
 * without leaving the current slice.
 *
 * Three.js r128 global (CDN, same as GG3D). Vanilla IIFE, idempotent via
 * window.GraveGain4DWGhosts. Never throws. No DOM listeners, no overlays,
 * and no screen-mode or double-click handlers. Letterbox-safe: touches no renderer sizing.
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DWGhosts) return;

        var VERSION = '1.0.0';
        var GHOST_OPACITY = 0.25;
        // Trippy fog cycle (magenta -> cyan -> lime -> amber).
        var FOG_CYCLE = [0xff2fd6, 0x22d3ee, 0x84cc16, 0xf59e0b, 0x8b5cf6];

        function hasTHREE() {
            try { return !!(window.THREE && window.THREE.Group); }
            catch (e) { return false; }
        }

        function num(n, fb) {
            var v = parseFloat(n);
            return (isFinite(v)) ? v : fb;
        }

        function textures() {
            try { return window.GraveGain4DTextures || null; } catch (e) { return null; }
        }

        /* ---- layer ---- */

        // Owns one THREE.Group of ghost projections + its trippy fog state.
        // opts: { opacity, cycleSpeed }
        function createWGhostLayer(scene, opts) {
            try {
                if (!hasTHREE() || !scene) return null;
                opts = opts || {};
                var group = new window.THREE.Group();
                group.name = 'wghost-layer';
                var layer = {
                    group: group,
                    opacity: (typeof opts.opacity === 'number') ? opts.opacity : GHOST_OPACITY,
                    cycleSpeed: (typeof opts.cycleSpeed === 'number') ? opts.cycleSpeed : 0.6,
                    fogPhase: 0,
                    fogColor: new window.THREE.Color(FOG_CYCLE[0]),
                    ghosts: []
                };
                try { scene.add(group); } catch (_) {}
                return layer;
            } catch (_) { return null; }
        }

        function clearWGhostLayer(layer) {
            try {
                if (!layer || !layer.group) return;
                for (var i = layer.group.children.length - 1; i >= 0; i--) {
                    var child = layer.group.children[i];
                    try { layer.group.remove(child); } catch (_) {}
                    disposeGhostObject(child);
                }
                layer.ghosts = [];
            } catch (_) {}
        }

        function disposeGhostObject(obj) {
            try {
                if (!obj) return;
                obj.traverse(function (o) {
                    try { if (o.material && o.material.dispose) o.material.dispose(); } catch (_) {}
                    try { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); } catch (_) {}
                });
            } catch (_) {}
        }

        function setGhostOpacity(layer, opacity) {
            try {
                if (!layer) return;
                layer.opacity = Math.max(0, Math.min(1, num(opacity, GHOST_OPACITY)));
                layer.ghosts.forEach(function (g) {
                    try {
                        if (g.material) {
                            g.material.opacity = layer.opacity;
                            g.material.transparent = true;
                        }
                    } catch (_) {}
                });
            } catch (_) {}
        }

        /* ---- ghost builders ---- */

        // Translucent billboard of an entity in an adjacent w-slice.
        // entity: { x,y,z,w, emoji|kind }. wDir: +1 (ana) or -1 (kata).
        function projectEntityGhost(layer, entity, wDir) {
            try {
                if (!layer || !entity || !hasTHREE()) return null;
                var T = textures();
                var emoji = entity.emoji || kindToEmoji(entity.kind);
                var sprite = null;
                try {
                    if (T && typeof T.createEmojiSprite === 'function') {
                        sprite = T.createEmojiSprite(emoji, 128, 20);
                    } else {
                        var canvas = document.createElement('canvas');
                        canvas.width = 128; canvas.height = 128;
                        var ctx = canvas.getContext('2d');
                        ctx.font = '92px "Segoe UI Emoji", Arial, sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(emoji, 64, 64);
                        var tex = new window.THREE.CanvasTexture(canvas);
                        var mat0 = new window.THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
                        sprite = new window.THREE.Sprite(mat0);
                        sprite.scale.set(20, 20, 1);
                    }
                } catch (_) { return null; }
                if (!sprite) return null;
                sprite.position.set(num(entity.x, 0), num(entity.y, 12), num(entity.z, 0));
                sprite.material.transparent = true;
                sprite.material.opacity = layer.opacity;
                sprite.material.depthWrite = false;
                // Ana ghosts float slightly up, kata ghosts sink: depth cue.
                sprite.position.y += (wDir >= 0 ? 4 : -4);
                try { layer.group.add(sprite); } catch (_) {}
                layer.ghosts.push(sprite);
                return sprite;
            } catch (_) { return null; }
        }

        function kindToEmoji(kind) {
            try {
                switch (String(kind || '').toLowerCase()) {
                    case 'zombie': return '\uD83E\uDDDF';
                    case 'skull': return '\uD83D\uDC80';
                    case 'sword': return '\uD83D\uDDE1\uFE0F';
                    case 'wisp': return '\uD83D\uDFE2';
                    default: return '\uD83D\uDC7B';
                }
            } catch (_) { return '\uD83D\uDC7B'; }
        }

        // Wireframe shell of a room in an adjacent w-slice (geometry echo).
        // room: { x,z,hx,hz,y,h } in world units.
        function projectRoomGhost(layer, room, wDir) {
            try {
                if (!layer || !room || !hasTHREE()) return null;
                var w = num(room.hx, 40) * 2, h = num(room.h, 28), d = num(room.hz, 40) * 2;
                var geo = new window.THREE.BoxGeometry(Math.max(1, w), Math.max(1, h), Math.max(1, d));
                var mat = new window.THREE.MeshBasicMaterial({
                    color: layer.fogColor.clone(),
                    wireframe: true, transparent: true, opacity: layer.opacity, depthWrite: false
                });
                var mesh = new window.THREE.Mesh(geo, mat);
                mesh.position.set(num(room.x, 0), num(room.y, h / 2), num(room.z, 0));
                try { layer.group.add(mesh); } catch (_) {}
                layer.ghosts.push(mesh);
                return mesh;
            } catch (_) { return null; }
        }

        /* ---- per-frame update ---- */

        // Rebuild ghosts for entities/rooms adjacent to wSlice (|w-wSlice|==1).
        // world: { entities:[{x,y,z,w,...}], rooms:[{x,z,w,...}] }.
        function updateWGhosts(layer, world, wSlice, timeSec) {
            try {
                if (!layer) return;
                clearWGhostLayer(layer);
                if (!world) return;
                var w = Math.round(num(wSlice, 0));
                var entities = world.entities || world.monsters || [];
                var rooms = world.rooms || [];
                var i, e;
                for (i = 0; i < entities.length; i++) {
                    try {
                        e = entities[i];
                        if (!e) continue;
                        var dw = Math.round(num(e.w, w)) - w;
                        if (Math.abs(dw) === 1) projectEntityGhost(layer, e, dw);
                    } catch (_) {}
                }
                for (i = 0; i < rooms.length; i++) {
                    try {
                        var r = rooms[i];
                        if (!r) continue;
                        var rw = Math.round(num(r.w, w)) - w;
                        if (Math.abs(rw) === 1) projectRoomGhost(layer, r, rw);
                    } catch (_) {}
                }
                cycleFogColor(layer, timeSec || 0);
            } catch (_) {}
        }

        // Advance the trippy fog tint; ghosts track the current cycle color.
        function cycleFogColor(layer, timeSec) {
            try {
                if (!layer) return null;
                var t = num(timeSec, 0) * layer.cycleSpeed;
                var n = FOG_CYCLE.length;
                var idx = Math.floor(t) % n;
                var next = (idx + 1) % n;
                var frac = t - Math.floor(t);
                var a = new window.THREE.Color(FOG_CYCLE[idx]);
                var b = new window.THREE.Color(FOG_CYCLE[next]);
                layer.fogColor.copy(a).lerp(b, frac);
                layer.ghosts.forEach(function (g) {
                    try {
                        if (g && g.material && g.geometry && g.geometry.type === 'BoxGeometry') {
                            g.material.color.copy(layer.fogColor);
                        }
                    } catch (_) {}
                });
                return layer.fogColor;
            } catch (_) { return null; }
        }

        function ghostCount(layer) {
            try { return (layer && layer.ghosts) ? layer.ghosts.length : 0; }
            catch (_) { return 0; }
        }

        window.GraveGain4DWGhosts = {
            version: VERSION,
            GHOST_OPACITY: GHOST_OPACITY,
            FOG_CYCLE: FOG_CYCLE.slice(),
            createWGhostLayer: createWGhostLayer,
            clearWGhostLayer: clearWGhostLayer,
            setGhostOpacity: setGhostOpacity,
            projectEntityGhost: projectEntityGhost,
            projectRoomGhost: projectRoomGhost,
            updateWGhosts: updateWGhosts,
            cycleFogColor: cycleFogColor,
            ghostCount: ghostCount
        };
    } catch (_) { /* never throw */ }
})();
