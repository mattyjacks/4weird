/* GraveGain4D slicerenderer — renders the current w-slice.
 *
 * The playable 3D world is a hyperplane section of the 4D crypt: rooms and
 * corridors whose w-range contains the current w-slice render solid with
 * vertex-lit stone colors, emoji-billboard sprites, particle bursts and
 * voxel-gore cubes (same visual language as GraveGain3D). Slices one step
 * away are left to wghosts.js as translucent projections. W-fog thickens
 * with |w - wSlice| so depth along ana/kata reads as fog, not clipping.
 *
 * Three.js r128 global (CDN, same as GG3D). Vanilla IIFE, idempotent via
 * window.GraveGain4DSliceRenderer. Never throws. No DOM listeners, no
 * overlays, and no screen-mode or double-click handlers.
 *
 * Letterbox-safe: resize() uses renderer.setSize(w,h,false) and applies the
 * caller-owned camera aspect (camera.aspect = w/h); canvases are styled to
 * max 100% with object-fit contain so the 16/9 box letterboxes instead of
 * stretching (same sizing convention as GG3D .canvas-container).
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DSliceRenderer) return;

        var VERSION = '1.0.0';
        var TILE = 40;          // world units per maze cell
        var WALL_H = 28;        // wall height
        var FOG_NEAR = 60;
        var FOG_FAR = 420;

        function hasTHREE() {
            try { return !!(window.THREE && window.THREE.Scene && window.THREE.WebGLRenderer); }
            catch (e) { return false; }
        }

        function num(n, fb) {
            var v = parseFloat(n);
            return (isFinite(v)) ? v : fb;
        }

        function textures() {
            try { return window.GraveGain4DTextures || null; } catch (e) { return null; }
        }

        function styleCanvasLetterboxed(renderer) {
            try {
                var el = renderer && renderer.domElement;
                if (!el || !el.style) return;
                // GG3D .canvas-container convention: fill box, never overflow.
                el.style.maxWidth = '100%';
                el.style.maxHeight = '100%';
                el.style.width = '100%';
                el.style.height = '100%';
                el.style.objectFit = 'contain';
                el.style.display = 'block';
            } catch (_) {}
        }

        /* ---- construction ---- */

        // opts: { canvas, width, height, antialias }
        // Caller owns the camera: pass it to resize(w,h,camera) to set aspect.
        function createSliceRenderer(opts) {
            try {
                if (!hasTHREE()) return null;
                opts = opts || {};
                var w = Math.max(2, Math.floor(num(opts.width, 640)));
                var h = Math.max(2, Math.floor(num(opts.height, 360)));
                var renderer = new window.THREE.WebGLRenderer({
                    canvas: opts.canvas || undefined,
                    antialias: opts.antialias !== false
                });
                renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
                renderer.setSize(w, h, false);
                styleCanvasLetterboxed(renderer);

                var scene = new window.THREE.Scene();
                scene.background = new window.THREE.Color(0x04030a);
                scene.fog = new window.THREE.Fog(0x0a0618, FOG_NEAR, FOG_FAR);

                var camera = new window.THREE.PerspectiveCamera(70, w / h, 0.5, 2000);
                camera.position.set(0, 60, 120);

                // Vertex-lit look: dim ambient + warm torch directional.
                var ambient = new window.THREE.AmbientLight(0x8a8aa0, 0.55);
                var torch = new window.THREE.DirectionalLight(0xffc37a, 0.9);
                torch.position.set(40, 80, 20);
                scene.add(ambient);
                scene.add(torch);

                var sliceGroup = new window.THREE.Group();
                sliceGroup.name = 'wslice-rooms';
                var fxGroup = new window.THREE.Group();
                fxGroup.name = 'wslice-fx';
                scene.add(sliceGroup);
                scene.add(fxGroup);

                var T = textures();
                var wallTex = null, floorTex = null;
                try {
                    if (T) {
                        if (typeof T.createStoneBrickTexture4D === 'function') wallTex = T.createStoneBrickTexture4D();
                        if (typeof T.createFloorFlagstoneTexture4D === 'function') floorTex = T.createFloorFlagstoneTexture4D();
                    }
                } catch (_) {}

                return {
                    renderer: renderer,
                    scene: scene,
                    camera: camera,
                    lights: { ambient: ambient, torch: torch },
                    sliceGroup: sliceGroup,
                    fxGroup: fxGroup,
                    wallTex: wallTex,
                    floorTex: floorTex,
                    wSlice: 0,
                    width: w,
                    height: h,
                    bursts: [],
                    gore: []
                };
            } catch (_) { return null; }
        }

        // Letterbox-safe resize. Camera aspect is set by the caller: pass the
        // caller-owned camera (usually handle.camera) so w/h stays exact.
        function resizeSliceRenderer(handle, w, h, camera) {
            try {
                if (!handle || !handle.renderer) return;
                w = Math.max(2, Math.floor(num(w, handle.width || 640)));
                h = Math.max(2, Math.floor(num(h, handle.height || 360)));
                handle.renderer.setSize(w, h, false);
                styleCanvasLetterboxed(handle.renderer);
                // Caller-owned camera: aspect set here from caller dimensions.
                var cameraToFit = camera || handle.camera;
                if (cameraToFit) {
                    cameraToFit.aspect = w / h;
                    try { cameraToFit.updateProjectionMatrix(); } catch (_) {}
                    try { handle.camera.aspect = cameraToFit.aspect; } catch (_) {}
                }
                handle.width = w;
                handle.height = h;
            } catch (_) {}
        }

        function setWSlice(handle, w) {
            try {
                if (!handle) return;
                handle.wSlice = Math.round(num(w, 0));
            } catch (_) {}
        }

        /* ---- slice content ---- */

        function sliceContainsW(room, w) {
            try {
                if (!room) return false;
                if (typeof room.w !== 'undefined' && typeof room.w0 === 'undefined') {
                    return Math.round(num(room.w, w)) === Math.round(w);
                }
                var w0 = num(room.w0, -Infinity), w1 = num(room.w1, Infinity);
                return w >= w0 && w <= w1;
            } catch (_) { return false; }
        }

        function clearSliceGroup(handle) {
            try {
                if (!handle || !handle.sliceGroup) return;
                var g = handle.sliceGroup;
                for (var i = g.children.length - 1; i >= 0; i--) {
                    var child = g.children[i];
                    try { g.remove(child); } catch (_) {}
                    try {
                        child.traverse(function (o) {
                            try { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); } catch (_) {}
                            // Shared stone textures outlive the slice: only dispose cloned materials.
                        });
                    } catch (_) {}
                }
            } catch (_) {}
        }

        // rooms: [{ x,z,hx,hz,w|w0..w1, y,h }], corridors: same shape.
        // Rebuilds sliceGroup for wSlice; entities become emoji billboards.
        function renderWSlice(handle, world, wSlice) {
            try {
                if (!handle || !handle.sliceGroup || !hasTHREE()) return 0;
                if (typeof wSlice !== 'undefined') setWSlice(handle, wSlice);
                var w = handle.wSlice;
                clearSliceGroup(handle);
                if (!world) return 0;
                var count = 0;
                var rooms = world.rooms || [];
                var corridors = world.corridors || world.halls || [];
                var i;
                for (i = 0; i < rooms.length; i++) {
                    try {
                        if (sliceContainsW(rooms[i], w) && addRoomBox(handle, rooms[i], false)) count++;
                    } catch (_) {}
                }
                for (i = 0; i < corridors.length; i++) {
                    try {
                        if (sliceContainsW(corridors[i], w) && addRoomBox(handle, corridors[i], true)) count++;
                    } catch (_) {}
                }
                var entities = world.entities || world.monsters || [];
                for (i = 0; i < entities.length; i++) {
                    try {
                        var e = entities[i];
                        if (!e) continue;
                        if (Math.round(num(e.w, w)) === Math.round(w) && addEntityBillboard(handle, e)) count++;
                    } catch (_) {}
                }
                updateWFog(handle, w);
                return count;
            } catch (_) { return 0; }
        }

        // Solid room/corridor box with vertex-lit stone colors.
        function addRoomBox(handle, room, isCorridor) {
            try {
                var hx = num(room.hx, 1) * TILE, hz = num(room.hz, 1) * TILE;
                var h = num(room.h, WALL_H);
                var geo = new window.THREE.BoxGeometry(Math.max(1, hx * 2), Math.max(1, h), Math.max(1, hz * 2));
                // Vertex-light the stone: top face bright, sides shaded.
                var top = new window.THREE.Color(isCorridor ? 0xcfc6b8 : 0xd6d3d1);
                var side = new window.THREE.Color(isCorridor ? 0x8a7f70 : 0x8f8b99);
                var bottom = new window.THREE.Color(0x3a3944);
                var pos = geo.attributes.position;
                var colors = new Float32Array(pos.count * 3);
                for (var i = 0; i < pos.count; i++) {
                    var c = side;
                    try {
                        var ny = pos.getY(i);
                        if (ny > h * 0.4) c = top;
                        else if (ny < -h * 0.4) c = bottom;
                    } catch (_) {}
                    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
                }
                geo.setAttribute('color', new window.THREE.BufferAttribute(colors, 3));
                var mat = new window.THREE.MeshLambertMaterial({
                    map: (isCorridor ? handle.floorTex : handle.wallTex) || null,
                    vertexColors: true
                });
                var mesh = new window.THREE.Mesh(geo, mat);
                mesh.position.set(num(room.x, 0), num(room.y, h / 2), num(room.z, 0));
                handle.sliceGroup.add(mesh);
                // Floor cap so corridors read as walkable stone.
                if (!isCorridor) {
                    try {
                        var capGeo = new window.THREE.PlaneGeometry(Math.max(1, hx * 2), Math.max(1, hz * 2));
                        var capMat = new window.THREE.MeshLambertMaterial({
                            map: handle.floorTex || null, color: 0xbfb9c9
                        });
                        var cap = new window.THREE.Mesh(capGeo, capMat);
                        cap.rotation.x = -Math.PI / 2;
                        cap.position.set(mesh.position.x, 0.5, mesh.position.z);
                        handle.sliceGroup.add(cap);
                    } catch (_) {}
                }
                return mesh;
            } catch (_) { return null; }
        }

        // Emoji-billboard sprite for an in-slice entity (🧟💀🗡️🟢).
        function addEntityBillboard(handle, entity) {
            try {
                var T = textures();
                var emoji = entity.emoji || '\uD83E\uDDDF';
                var sprite = null;
                if (T && typeof T.createEmojiSprite === 'function') {
                    sprite = T.createEmojiSprite(emoji, 128, 24);
                }
                if (!sprite) {
                    var canvas = document.createElement('canvas');
                    canvas.width = 128; canvas.height = 128;
                    var ctx = canvas.getContext('2d');
                    ctx.font = '92px "Segoe UI Emoji", Arial, sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(emoji, 64, 64);
                    var tex = new window.THREE.CanvasTexture(canvas);
                    sprite = new window.THREE.Sprite(
                        new window.THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
                    sprite.scale.set(24, 24, 1);
                }
                sprite.position.set(num(entity.x, 0), num(entity.y, 14), num(entity.z, 0));
                handle.sliceGroup.add(sprite);
                return sprite;
            } catch (_) { return null; }
        }

        /* ---- W-fog ---- */

        // Fog density/color follows distance from the active slice center.
        function updateWFog(handle, wSlice) {
            try {
                if (!handle || !handle.scene) return;
                if (typeof wSlice !== 'undefined') handle.wSlice = Math.round(num(wSlice, handle.wSlice || 0));
                var fog = handle.scene.fog;
                if (!fog) return;
                // Deeper w = denser violet fog; near origin stays thin crypt air.
                var depth = Math.min(1, Math.abs(handle.wSlice) / 4);
                fog.near = FOG_NEAR * (1 - depth * 0.5);
                fog.far = FOG_FAR * (1 - depth * 0.45);
                var c = new window.THREE.Color(0x0a0618).lerp(new window.THREE.Color(0x2a0a3a), depth);
                fog.color.copy(c);
                try { handle.scene.background.copy(c).multiplyScalar(0.45); } catch (_) {}
            } catch (_) {}
        }

        /* ---- fx: particle bursts + voxel gore ---- */

        // Additive particle burst at a 3D position (torch sparks, w-flashes).
        function spawnBurst(handle, x, y, z, color, count) {
            try {
                if (!handle || !handle.fxGroup || !hasTHREE()) return null;
                count = Math.max(1, Math.min(40, Math.floor(num(count, 12))));
                var T = textures();
                var group = new window.THREE.Group();
                for (var i = 0; i < count; i++) {
                    var s = null;
                    try {
                        if (T && typeof T.createBurstSprite === 'function') s = T.createBurstSprite(color || '#ffcc4c', 64);
                        else {
                            var cv = document.createElement('canvas');
                            cv.width = 32; cv.height = 32;
                            s = new window.THREE.Sprite(new window.THREE.SpriteMaterial({ color: 0xffcc4c, transparent: true }));
                            s.scale.set(8, 8, 1);
                        }
                    } catch (_) { continue; }
                    if (!s) continue;
                    s.position.set(num(x, 0) + (Math.random() * 24 - 12),
                        num(y, 14) + (Math.random() * 16 - 4),
                        num(z, 0) + (Math.random() * 24 - 12));
                    group.add(s);
                }
                group.userData.bornAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                handle.fxGroup.add(group);
                handle.bursts.push(group);
                return group;
            } catch (_) { return null; }
        }

        // Voxel-gore cubes: small red boxes with the gore-cube texture.
        function spawnGore(handle, x, y, z, count) {
            try {
                if (!handle || !handle.fxGroup || !hasTHREE()) return null;
                count = Math.max(1, Math.min(24, Math.floor(num(count, 8))));
                var T = textures();
                var goreTex = null;
                try { if (T && typeof T.createGoreCubeTexture === 'function') goreTex = T.createGoreCubeTexture(128); } catch (_) {}
                var group = new window.THREE.Group();
                for (var i = 0; i < count; i++) {
                    var size = 2 + Math.random() * 4;
                    var mat = new window.THREE.MeshLambertMaterial({ map: goreTex || null, color: 0xcc2222 });
                    var cube = new window.THREE.Mesh(new window.THREE.BoxGeometry(size, size, size), mat);
                    cube.position.set(num(x, 0) + (Math.random() * 20 - 10),
                        num(y, 10) + Math.random() * 12,
                        num(z, 0) + (Math.random() * 20 - 10));
                    cube.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
                    group.add(cube);
                }
                group.userData.bornAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                handle.fxGroup.add(group);
                handle.gore.push(group);
                return group;
            } catch (_) { return null; }
        }

        // Age out bursts/gore older than ttlMs (default 1200ms).
        function tickFx(handle, nowMs, ttlMs) {
            try {
                if (!handle || !handle.fxGroup) return;
                var now = num(nowMs, (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
                var ttl = num(ttlMs, 1200);
                ['bursts', 'gore'].forEach(function (key) {
                    var list = handle[key] || [];
                    for (var i = list.length - 1; i >= 0; i--) {
                        var g = list[i];
                        var born = (g && g.userData && g.userData.bornAt) || now;
                        if (now - born > ttl) {
                            try { handle.fxGroup.remove(g); } catch (_) {}
                            try {
                                g.traverse(function (o) {
                                    try { if (o.material && o.material.dispose) o.material.dispose(); } catch (_) {}
                                    try { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); } catch (_) {}
                                });
                            } catch (_) {}
                            list.splice(i, 1);
                        }
                    }
                });
            } catch (_) {}
        }

        function disposeSliceRenderer(handle) {
            try {
                if (!handle) return;
                try { clearSliceGroup(handle); } catch (_) {}
                try {
                    if (handle.renderer && handle.renderer.dispose) handle.renderer.dispose();
                } catch (_) {}
            } catch (_) {}
        }

        window.GraveGain4DSliceRenderer = {
            version: VERSION,
            TILE: TILE,
            WALL_H: WALL_H,
            createSliceRenderer: createSliceRenderer,
            resizeSliceRenderer: resizeSliceRenderer,
            setWSlice: setWSlice,
            renderWSlice: renderWSlice,
            addRoomBox: addRoomBox,
            addEntityBillboard: addEntityBillboard,
            updateWFog: updateWFog,
            spawnBurst: spawnBurst,
            spawnGore: spawnGore,
            tickFx: tickFx,
            disposeSliceRenderer: disposeSliceRenderer
        };
    } catch (_) { /* never throw */ }
})();
