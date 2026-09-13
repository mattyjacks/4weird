/* GraveGain4D — dream-play boot (DS-GG4D-05, games lane)
 *
 * Vanilla JS boot over the four GG4D modules (dependency order):
 *   ../html/gravegain4d-math.js -> graphics -> worlds -> missions
 * Every module is optional: each access is feature-detected and every block
 * is try/catch fail-open, so the bundle degrades gracefully to a playable
 * 2D putt loop when a module (or THREE) is missing.
 *
 * Play-feel: buttery exponential damping on the W-angle, fold breathing,
 * one-button putt + 4D rotate, time-rewind (R), dream-shift (T).
 * Win condition: putt-to-goal (ball captured at the hole).
 *
 * Runtime-bridge protocol (same { version: 1 } postMessage contract as
 * sibling bundles): game -> host posts ready / stats / save; host -> game
 * listens for pause / resume / reset / load.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined') return;
    if (window.GraveGain4D && window.GraveGain4D.VERSION) return;

    var VERSION = '1.0.0';
    var SLUG = 'gravegain4d';

    // ------------------------------------------------------------------
    // Safe helpers (never throw)
    // ------------------------------------------------------------------
    function opt(name) {
        try { return window[name] || null; } catch (_) { return null; }
    }
    function num(v, d) {
        try {
            var n = Number(v);
            return isFinite(n) ? n : d;
        } catch (_) { return d; }
    }
    function clamp(v, lo, hi) {
        try {
            if (v < lo) return lo;
            if (v > hi) return hi;
            return v;
        } catch (_) { return lo; }
    }
    function $(id) {
        try { return document.getElementById(id); } catch (_) { return null; }
    }
    // Frame-rate independent exponential damping: dream-smooth, buttery.
    function damp(cur, target, rate, dt) {
        try {
            var t = 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
            return cur + (target - cur) * t;
        } catch (_) { return target; }
    }

    // Optional modules (all fail-open).
    var GMath = opt('GraveGain4DMath');
    var GGraphics = opt('GraveGain4DGraphics');
    var GWorlds = opt('GraveGain4DWorlds');
    var GMissions = opt('GraveGain4DMissions');

    function hasTHREE() {
        try {
            return (typeof THREE !== 'undefined') && !!THREE &&
                !!THREE.Scene && !!THREE.PerspectiveCamera &&
                !!THREE.WebGLRenderer;
        } catch (_) { return false; }
    }

    // ------------------------------------------------------------------
    // Runtime-bridge message hooks (game -> host / host -> game)
    // ------------------------------------------------------------------
    function post(type, extra) {
        try {
            var payload = { version: 1, slug: SLUG, type: type };
            if (extra && typeof extra === 'object') {
                for (var k in extra) {
                    if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
                }
            }
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(payload, '*');
            }
        } catch (_) { /* postMessage unavailable; offline play continues */ }
    }
    function announceReady() { post('ready', { game: SLUG, version: VERSION }); }
    function reportStats() {
        try {
            post('stats', {
                hole: S.holeIndex + 1,
                strokes: S.strokes,
                totalStrokes: S.totalStrokes,
                holed: !!S.holed,
                slice: S.sliceLabel
            });
        } catch (_) {}
    }
    function requestSave() {
        try {
            post('save', {
                hole: S.holeIndex,
                totalStrokes: S.totalStrokes,
                dreamShift: S.dreamShift
            });
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Game state
    // ------------------------------------------------------------------
    var S = {
        running: false,
        paused: false,
        started: false,
        holeIndex: 0,
        strokes: 0,
        totalStrokes: 0,
        holed: false,
        // Ball in x/z plane + w slice coordinate.
        ball: { x: 0, z: 0, w: 0 },
        vel: { x: 0, z: 0, w: 0 },
        hole: { x: 5, z: 5, w: 2 },
        // Dream-smooth W-angle: target set by input, current damped toward it.
        wAngle: 0,
        wAngleTarget: 0,
        // Fold breathing phase.
        foldT: 0,
        foldPhase: 0,
        // Dream-shift cycles the visible W-slice offset.
        dreamShift: 0,
        sliceLabel: 'slice-alpha',
        // Time-rewind snapshot stack (ball + w-angle + strokes).
        history: [],
        world: null,
        missions: [],
        mission: null,
        // Render handles.
        canvas: null,
        ctx2d: null,
        renderer: null,
        scene: null,
        camera: null,
        ballMesh: null,
        holeMesh: null,
        tesseract: null,
        useThree: false,
        lastT: 0,
        rafId: 0,
        frame: 0
    };

    function snapshot() {
        try {
            return {
                ball: { x: S.ball.x, z: S.ball.z, w: S.ball.w },
                vel: { x: S.vel.x, z: S.vel.z, w: S.vel.w },
                wAngle: S.wAngleTarget,
                strokes: S.strokes
            };
        } catch (_) { return null; }
    }
    function pushHistory() {
        try {
            var s = snapshot();
            if (!s) return;
            S.history.push(s);
            if (S.history.length > 120) S.history.shift();
        } catch (_) {}
    }
    function rewind() {
        try {
            var s = S.history.pop();
            if (!s) { setStatus('⏪ nothing to rewind'); return; }
            // Also rewind the module timeline when available.
            try {
                if (GWorlds && GWorlds.timelines && S.world && S.world.timeline) {
                    GWorlds.timelines.rewind(S.world.timeline, 1);
                }
            } catch (_) {}
            S.ball = s.ball;
            S.vel = { x: 0, z: 0, w: 0 };
            S.wAngleTarget = num(s.wAngle, 0);
            S.strokes = Math.max(0, Math.floor(num(s.strokes, 0)));
            S.holed = false;
            hideWin();
            setStatus('⏪ rewound one shot');
            reportStats();
        } catch (_) {}
    }
    function dreamShift() {
        try {
            S.dreamShift = (S.dreamShift + 1) % 4;
            // Nudge the W target so the fold visibly breathes into the slice.
            S.wAngleTarget += Math.PI / 8;
            updateSliceLabel();
            setStatus('🌀 dream-shift: ' + S.sliceLabel);
            reportStats();
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Missions / world setup (module-backed, with local fallbacks)
    // ------------------------------------------------------------------
    function loadMissions() {
        try {
            S.missions = [];
            if (GMissions && typeof GMissions.getAllMissions === 'function') {
                var all = GMissions.getAllMissions();
                if (all && all.length) S.missions = all;
            }
        } catch (_) { S.missions = []; }
    }
    function missionForHole(i) {
        try {
            if (S.missions && S.missions.length) return S.missions[i % S.missions.length];
            if (GMissions && typeof GMissions.getMission === 'function') {
                return GMissions.getMission(i);
            }
        } catch (_) {}
        return null;
    }
    function setupHole(i) {
        try {
            S.holeIndex = i;
            S.strokes = 0;
            S.holed = false;
            S.history = [];
            S.vel = { x: 0, z: 0, w: 0 };
            S.wAngleTarget = 0;
            S.wAngle = 0;
            var seed = 1000 + i * 77;
            S.world = null;
            try {
                if (GWorlds && typeof GWorlds.dreamWorld === 'function') {
                    S.world = GWorlds.dreamWorld(seed);
                }
            } catch (_) { S.world = null; }
            var hole = { x: 5, z: 5, w: 2 };
            var spawn = { x: 0, z: 0, w: 0 };
            try {
                if (S.world) {
                    if (S.world.hole) hole = { x: num(S.world.hole.x, 5), z: num(S.world.hole.z, 5), w: num(S.world.hole.w, 2) };
                    if (S.world.spawn) spawn = { x: num(S.world.spawn.x, 0), z: num(S.world.spawn.z, 0), w: num(S.world.spawn.w, 0) };
                }
            } catch (_) {}
            S.hole = hole;
            S.ball = { x: spawn.x, z: spawn.z, w: spawn.w };
            S.mission = missionForHole(i);
            pushHistory();
            updateHud();
            updateSliceLabel();
            setStatus('⛳ hole ' + (i + 1) + ' — putt to the goal');
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Putt-to-goal (win condition)
    // ------------------------------------------------------------------
    function putt() {
        try {
            if (!S.started || S.paused || S.holed) return;
            // Aim in the x/z plane at the hole, plus a W correction toward the
            // hole slice so cross-slice putts can capture.
            var dx = S.hole.x - S.ball.x;
            var dz = S.hole.z - S.ball.z;
            var dw = S.hole.w - (S.ball.w + S.dreamShift * 0.0);
            var dist = Math.sqrt(dx * dx + dz * dz);
            var power = clamp(0.35 + dist * 0.12, 0.4, 1.6);
            var inv = dist > 1e-6 ? 1 / dist : 0;
            var impulse = {
                x: dx * inv * power,
                z: dz * inv * power,
                w: clamp(dw * 0.25, -0.6, 0.6)
            };
            pushHistory();
            var out = null;
            try {
                if (GWorlds && typeof GWorlds.putt4D === 'function') {
                    out = GWorlds.putt4D({
                        pos: { x: S.ball.x, z: S.ball.z, w: S.ball.w },
                        vel: { x: S.vel.x, z: S.vel.z, w: S.vel.w },
                        hole: { x: S.hole.x, z: S.hole.z, w: S.hole.w },
                        strokes: S.strokes,
                        holed: false
                    }, impulse);
                }
            } catch (_) { out = null; }
            if (out && out.pos) {
                S.ball = { x: num(out.pos.x, 0), z: num(out.pos.z, 0), w: num(out.pos.w, 0) };
                S.vel = out.vel ? { x: num(out.vel.x, 0), z: num(out.vel.z, 0), w: num(out.vel.w, 0) } : S.vel;
                S.strokes = Math.floor(num(out.strokes, S.strokes + 1));
                if (out.holed) onHoled();
            } else {
                // Local fallback integrator with the same capture rule.
                S.vel.x += impulse.x; S.vel.z += impulse.z; S.vel.w += impulse.w;
                S.strokes += 1;
                checkCaptureFallback();
            }
            updateHud();
            reportStats();
        } catch (_) {}
    }
    function checkCaptureFallback() {
        try {
            var dx = S.ball.x - S.hole.x;
            var dz = S.ball.z - S.hole.z;
            var radial = Math.sqrt(dx * dx + dz * dz);
            var dw = Math.abs(S.ball.w - S.hole.w);
            if (radial <= 0.6 && dw <= 0.75) {
                S.ball = { x: S.hole.x, z: S.hole.z, w: S.hole.w };
                S.vel = { x: 0, z: 0, w: 0 };
                onHoled();
            }
        } catch (_) {}
    }
    function onHoled() {
        try {
            S.holed = true;
            S.totalStrokes += S.strokes;
            setStatus('✨ holed in ' + S.strokes + '!');
            requestSave();
            reportStats();
            showWin();
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Main loop: damping + fold breathing + render
    // ------------------------------------------------------------------
    function loop(t) {
        try {
            if (!S.running) return;
            S.rafId = requestAnimationFrame(loop);
            var now = num(t, 0);
            var dt = S.lastT ? (now - S.lastT) / 1000 : 0.016;
            S.lastT = now;
            dt = clamp(dt, 0.001, 0.05);
            if (S.paused) return;
            S.frame += 1;

            // Buttery W-angle damping.
            S.wAngle = damp(S.wAngle, S.wAngleTarget, 8, dt);

            // Fold breathing: slow sine over the fold amount.
            S.foldPhase += dt * 1.4;
            S.foldT = 0.5 + 0.5 * Math.sin(S.foldPhase);
            try {
                if (GGraphics && typeof GGraphics.setFoldAmount === 'function') {
                    GGraphics.setFoldAmount(S.foldT);
                }
            } catch (_) {}

            // Friction drift on fallback velocity (module path integrates itself).
            try {
                if (!(GWorlds && typeof GWorlds.putt4D === 'function')) {
                    S.ball.x += S.vel.x * dt * 8;
                    S.ball.z += S.vel.z * dt * 8;
                    S.ball.w += S.vel.w * dt * 8;
                    var f = Math.exp(-3 * dt);
                    S.vel.x *= f; S.vel.z *= f; S.vel.w *= f;
                    checkCaptureFallback();
                }
            } catch (_) {}

            if (S.frame % 30 === 0) updateFoldPill();
            render(now / 1000);
        } catch (_) {
            try { S.rafId = requestAnimationFrame(loop); } catch (__) {}
        }
    }

    // ------------------------------------------------------------------
    // Render: THREE slice projection when available, canvas-2D otherwise
    // ------------------------------------------------------------------
    function render(timeSec) {
        try {
            if (S.useThree) renderThree(timeSec);
            else render2D(timeSec);
        } catch (_) {
            try { render2D(timeSec); } catch (__) {}
        }
    }
    function sliceOffset() {
        try { return S.dreamShift * (Math.PI / 6); } catch (_) { return 0; }
    }
    function projectBall() {
        // Project (x, z, w) into a 2D view using the damped W-angle.
        try {
            var w = S.ball.w + sliceOffset();
            var ang = S.wAngle;
            var c = Math.cos(ang), s = Math.sin(ang);
            // Rotate the (x, w) plane, then orthographic project.
            var px = S.ball.x * c - w * s;
            var py = S.ball.z;
            var depth = S.ball.x * s + w * c;
            return { x: px, y: py, depth: depth };
        } catch (_) { return { x: S.ball.x, y: S.ball.z, depth: 0 }; }
    }
    function renderThree(timeSec) {
        try {
            if (!S.renderer || !S.scene || !S.camera) return;
            var p = projectBall();
            if (S.ballMesh) {
                S.ballMesh.position.set(p.x, 0.5 + 0.08 * Math.sin(timeSec * 2), -p.y);
                var sc = 1 + 0.12 * S.foldT;
                S.ballMesh.scale.set(sc, sc, sc);
            }
            if (S.holeMesh) {
                S.holeMesh.position.set(S.hole.x, 0.05, -S.hole.z);
                S.holeMesh.rotation.z = timeSec * 0.6;
            }
            updateTesseract();
            try {
                if (GGraphics && typeof GGraphics.trippyPulse === 'function') {
                    GGraphics.trippyPulse(S.scene, timeSec, S.foldT);
                }
            } catch (_) {}
            S.renderer.render(S.scene, S.camera);
        } catch (_) {}
    }
    function updateTesseract() {
        try {
            if (!GMath || typeof GMath.tesseractVertices !== 'function') return;
            if (!S.scene || !THREE) return;
            var verts = GMath.tesseractVertices(2.2);
            var edges = (typeof GMath.tesseractEdges === 'function') ? GMath.tesseractEdges() : null;
            if (!verts || !edges) return;
            var ang = S.wAngle + sliceOffset();
            var pts = [];
            for (var i = 0; i < verts.length; i++) {
                var v = verts[i];
                var r = v;
                try {
                    if (typeof GMath.rotXW === 'function') r = GMath.rotXW(r, ang);
                    var pr = (typeof GMath.project4Dto3D === 'function')
                        ? GMath.project4Dto3D(r, 3.2)
                        : { x: r[0], y: r[1], z: r[2] };
                    pts.push(pr);
                } catch (_) {}
            }
            if (!pts.length) return;
            if (S.tesseract) {
                try { S.scene.remove(S.tesseract); } catch (_) {}
                S.tesseract = null;
            }
            var geo = new THREE.BufferGeometry();
            var arr = new Float32Array(edges.length * 6);
            for (var e = 0; e < edges.length; e++) {
                var a = pts[edges[e][0]], b = pts[edges[e][1]];
                if (!a || !b) continue;
                arr[e * 6] = a.x; arr[e * 6 + 1] = a.y + 2.2; arr[e * 6 + 2] = -a.z;
                arr[e * 6 + 3] = b.x; arr[e * 6 + 4] = b.y + 2.2; arr[e * 6 + 5] = -b.z;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
            var mat = new THREE.LineBasicMaterial({ color: 0x7fe7ff, transparent: true, opacity: 0.35 + 0.3 * S.foldT });
            S.tesseract = new THREE.LineSegments(geo, mat);
            S.scene.add(S.tesseract);
        } catch (_) {}
    }
    function render2D(timeSec) {
        try {
            var ctx = S.ctx2d;
            var cv = S.canvas;
            if (!ctx || !cv) return;
            var W = cv.width, H = cv.height;
            ctx.fillStyle = '#05070f';
            ctx.fillRect(0, 0, W, H);
            // Dreamy breathing backdrop.
            try {
                var g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.6);
                var glow = Math.floor(18 + 22 * S.foldT);
                g.addColorStop(0, 'rgb(' + glow + ',' + (glow + 14) + ',' + (glow + 40) + ')');
                g.addColorStop(1, '#05070f');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, W, H);
            } catch (_) {}
            function toPx(x, z) {
                return { x: W / 2 + x * 52, y: H / 2 + z * 52 };
            }
            // Fold ring around the hole (breathes with foldT).
            try {
                var h = toPx(S.hole.x, S.hole.z);
                ctx.strokeStyle = 'rgba(127,231,255,' + (0.35 + 0.4 * S.foldT).toFixed(2) + ')';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(h.x, h.y, 22 + 10 * S.foldT, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#0b1020';
                ctx.beginPath();
                ctx.arc(h.x, h.y, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#7fe7ff';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⛳', h.x, h.y + 5);
            } catch (_) {}
            // Ball (projected through the damped W-angle).
            try {
                var p = projectBall();
                var b = toPx(p.x, p.y);
                var r = 12 + 3 * S.foldT + clamp(-p.depth, -4, 6);
                ctx.fillStyle = '#f4f0ff';
                ctx.beginPath();
                ctx.arc(b.x, b.y, Math.max(6, r), 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(167,139,250,0.85)';
                ctx.beginPath();
                ctx.arc(b.x - 3, b.y - 3, Math.max(2, r * 0.35), 0, Math.PI * 2);
                ctx.fill();
            } catch (_) {}
            // W-angle ribbon (shows the damped rotation).
            try {
                ctx.strokeStyle = 'rgba(196,141,255,0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (var i = 0; i <= 40; i++) {
                    var a = (i / 40) * Math.PI * 2;
                    var rx = W / 2 + Math.cos(a + S.wAngle) * (W * 0.32);
                    var ry = H - 26 + Math.sin(a * 2 + S.foldPhase) * 8;
                    if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
                }
                ctx.stroke();
            } catch (_) {}
            void timeSec;
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // THREE scene setup (optional; 2D fallback otherwise)
    // ------------------------------------------------------------------
    function initRender() {
        try {
            S.canvas = $('gameCanvas');
            S.useThree = false;
            S.renderer = null;
            S.scene = null;
            if (hasTHREE() && S.canvas) {
                try {
                    var renderer = new THREE.WebGLRenderer({ canvas: S.canvas, antialias: true, alpha: false });
                    renderer.setSize(1000, 600, false);
                    var scene = new THREE.Scene();
                    scene.background = new THREE.Color(0x05070f);
                    var camera = new THREE.PerspectiveCamera(55, 1000 / 600, 0.1, 100);
                    camera.position.set(0, 7, 11);
                    camera.lookAt(0, 0, 0);
                    var ambient = new THREE.AmbientLight(0x8899ff, 0.7);
                    scene.add(ambient);
                    var dir = new THREE.DirectionalLight(0xffffff, 0.8);
                    dir.position.set(4, 8, 6);
                    scene.add(dir);
                    var ground = new THREE.Mesh(
                        new THREE.PlaneGeometry(16, 16),
                        new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 1 })
                    );
                    ground.rotation.x = -Math.PI / 2;
                    scene.add(ground);
                    var ball = new THREE.Mesh(
                        new THREE.SphereGeometry(0.35, 20, 20),
                        new THREE.MeshStandardMaterial({ color: 0xf4f0ff, emissive: 0x6d5bd0, emissiveIntensity: 0.45 })
                    );
                    scene.add(ball);
                    var holeRing = new THREE.Mesh(
                        new THREE.TorusGeometry(0.55, 0.09, 10, 40),
                        new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x1a6f8f, emissiveIntensity: 0.8 })
                    );
                    holeRing.rotation.x = -Math.PI / 2;
                    scene.add(holeRing);
                    S.renderer = renderer;
                    S.scene = scene;
                    S.camera = camera;
                    S.ballMesh = ball;
                    S.holeMesh = holeRing;
                    S.useThree = true;
                } catch (_) {
                    S.useThree = false;
                    S.renderer = null;
                    S.scene = null;
                }
            }
            if (!S.useThree && S.canvas) {
                try {
                    S.ctx2d = S.canvas.getContext('2d');
                } catch (_) { S.ctx2d = null; }
            }
            // Let the graphics module track the scene when it can.
            try {
                if (GGraphics && typeof GGraphics.track === 'function' && S.scene) {
                    GGraphics.track(S.scene);
                }
            } catch (_) {}
        } catch (_) {}
    }
    function refit(w, h) {
        try {
            w = Math.max(320, Math.floor(num(w, 1000)));
            h = Math.max(240, Math.floor(num(h, 600)));
            if (S.useThree && S.renderer && S.camera) {
                try {
                    S.camera.aspect = w / h;
                    if (typeof S.camera.updateProjectionMatrix === 'function') S.camera.updateProjectionMatrix();
                    S.renderer.setSize(w, h, false);
                } catch (_) {}
            }
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // HUD + screens
    // ------------------------------------------------------------------
    function setStatus(msg) {
        try {
            var el = $('gg4dStatusPill');
            if (el) el.textContent = String(msg);
        } catch (_) {}
    }
    function updateFoldPill() {
        try {
            var el = $('gg4dFoldPill');
            if (el) el.textContent = 'fold ' + Math.round(S.foldT * 100) + '% · ' + S.sliceLabel;
        } catch (_) {}
    }
    function updateSliceLabel() {
        try {
            var label = 'slice-alpha';
            if (GWorlds && typeof GWorlds.sliceView === 'function') {
                var sv = GWorlds.sliceView(S.ball.w + S.dreamShift);
                if (sv && sv.label) label = String(sv.label);
            } else {
                var names = ['slice-alpha', 'slice-beta', 'slice-gamma', 'slice-delta'];
                label = names[((S.dreamShift % 4) + 4) % 4];
            }
            S.sliceLabel = label;
        } catch (_) { S.sliceLabel = 'slice-alpha'; }
    }
    function updateHud() {
        try {
            var hole = $('gg4dHoleText');
            if (hole) hole.textContent = String(S.holeIndex + 1);
            var strokes = $('gg4dStrokesText');
            if (strokes) strokes.textContent = String(S.strokes);
            var slice = $('gg4dSliceText');
            if (slice) slice.textContent = S.sliceLabel;
            var mission = $('gg4dMissionText');
            if (mission) {
                var name = '—';
                try {
                    if (S.mission && (S.mission.title || S.mission.name || S.mission.id)) {
                        name = String(S.mission.title || S.mission.name || S.mission.id);
                    }
                } catch (_) {}
                mission.textContent = name;
            }
        } catch (_) {}
    }
    function show(el) { try { if (el) el.classList.remove('hidden'); } catch (_) {} }
    function hide(el) { try { if (el) el.classList.add('hidden'); } catch (_) {} }
    function showWin() {
        try {
            var last = (S.missions && S.missions.length)
                ? (S.holeIndex >= S.missions.length - 1)
                : (S.holeIndex >= 9);
            var title = $('gg4dWinTitle');
            if (title) title.textContent = last ? 'DREAM COMPLETE! 🌙✨' : 'HOLED! ✨';
            var sub = $('gg4dWinSub');
            if (sub) sub.textContent = last ? 'All holes folded into one dream' : 'Putt to goal complete';
            var wh = $('gg4dWinHole'); if (wh) wh.textContent = String(S.holeIndex + 1);
            var ws = $('gg4dWinStrokes'); if (ws) ws.textContent = String(S.strokes);
            var wt = $('gg4dWinTotal'); if (wt) wt.textContent = String(S.totalStrokes);
            var next = $('gg4dBtnNext');
            if (next) next.textContent = last ? 'Dream Again ⟳' : 'Next Hole ➔';
            show($('gg4dWinScreen'));
        } catch (_) {}
    }
    function hideWin() { try { hide($('gg4dWinScreen')); } catch (_) {} }
    function nextHole() {
        try {
            hideWin();
            var count = (S.missions && S.missions.length) ? S.missions.length : 10;
            setupHole((S.holeIndex + 1) % count);
            if (S.holeIndex === 0) S.totalStrokes = 0;
            updateHud();
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Pause / resume / reset (buttons, keys, and host messages)
    // ------------------------------------------------------------------
    function pause() {
        try {
            if (!S.started || S.paused) return;
            S.paused = true;
            show($('gg4dPauseScreen'));
            setStatus('⏸ paused');
            post('paused', {});
        } catch (_) {}
    }
    function resume() {
        try {
            if (!S.paused) return;
            S.paused = false;
            hide($('gg4dPauseScreen'));
            setStatus('🌙 dreaming…');
            post('resumed', {});
        } catch (_) {}
    }
    function reset() {
        try {
            setupHole(S.holeIndex);
            S.paused = false;
            hide($('gg4dPauseScreen'));
            hideWin();
            updateHud();
            setStatus('⟳ hole reset');
        } catch (_) {}
    }
    function start() {
        try {
            if (S.started && !S.paused) return;
            S.started = true;
            S.paused = false;
            hide($('gg4dMenuScreen'));
            show($('gameMain'));
            hide($('gg4dPauseScreen'));
            hideWin();
            setStatus('🌙 dreaming…');
            announceReady();
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Input: one-button putt + 4D rotate, R rewind, T dream-shift
    // ------------------------------------------------------------------
    function bindInput() {
        try {
            document.addEventListener('keydown', function (ev) {
                try {
                    var k = (ev && ev.key) || '';
                    if (k === ' ' || k === 'Enter') {
                        if (!S.started) start();
                        else if (S.holed) nextHole();
                        else putt();
                        if (ev.preventDefault) ev.preventDefault();
                    } else if (k === 'q' || k === 'Q' || k === 'ArrowLeft') {
                        S.wAngleTarget -= Math.PI / 12;
                    } else if (k === 'e' || k === 'E' || k === 'ArrowRight') {
                        S.wAngleTarget += Math.PI / 12;
                    } else if (k === 'r' || k === 'R') {
                        rewind();
                    } else if (k === 't' || k === 'T') {
                        dreamShift();
                    } else if (k === 'p' || k === 'P' || k === 'Escape') {
                        if (S.paused) resume(); else pause();
                    }
                } catch (_) {}
            });
            var cv = $('gameCanvas');
            if (cv) {
                cv.addEventListener('pointerdown', function () {
                    try {
                        if (!S.started) start();
                        else if (S.holed) nextHole();
                        else putt();
                    } catch (_) {}
                });
            }
            function onClick(id, fn) {
                try {
                    var el = $(id);
                    if (el) el.addEventListener('click', function () { try { fn(); } catch (_) {} });
                } catch (_) {}
            }
            onClick('gg4dBtnPlay', start);
            onClick('gg4dBtnPutt', function () { if (S.holed) nextHole(); else putt(); });
            onClick('gg4dBtnRewind', rewind);
            onClick('gg4dBtnShift', dreamShift);
            onClick('gg4dBtnPause', pause);
            onClick('gg4dBtnResume', resume);
            onClick('gg4dBtnRestart', reset);
            onClick('gg4dBtnNext', nextHole);
            onClick('gg4dBtnMenu', function () {
                try {
                    S.paused = false;
                    hide($('gg4dPauseScreen'));
                    hide($('gameMain'));
                    hideWin();
                    show($('gg4dMenuScreen'));
                } catch (_) {}
            });
            onClick('gg4dBtnMenu2', function () {
                try {
                    hideWin();
                    hide($('gameMain'));
                    show($('gg4dMenuScreen'));
                } catch (_) {}
            });
        } catch (_) {}
    }

    // Host -> game messages (runtime-bridge protocol, version 1).
    function bindHostMessages() {
        try {
            window.addEventListener('message', function (ev) {
                try {
                    var msg = ev && ev.data;
                    if (!msg || typeof msg !== 'object') return;
                    if (msg.version !== 1) return;
                    if (msg.slug && msg.slug !== SLUG) return;
                    var type = String(msg.type || '');
                    if (type === 'pause') pause();
                    else if (type === 'resume') { start(); resume(); }
                    else if (type === 'reset') reset();
                    else if (type === 'load') {
                        try {
                            if (msg.save && typeof msg.save.hole === 'number') {
                                var count = (S.missions && S.missions.length) ? S.missions.length : 10;
                                setupHole(clamp(Math.floor(msg.save.hole), 0, count - 1));
                            }
                            if (msg.save && typeof msg.save.totalStrokes === 'number') {
                                S.totalStrokes = Math.max(0, Math.floor(msg.save.totalStrokes));
                            }
                            start();
                            updateHud();
                        } catch (_) {}
                    }
                } catch (_) {}
            });
        } catch (_) {}
    }

    // ------------------------------------------------------------------
    // Boot
    // ------------------------------------------------------------------
    function boot() {
        try {
            loadMissions();
            setupHole(0);
            initRender();
            bindInput();
            bindHostMessages();
            updateHud();
            S.running = true;
            S.lastT = 0;
            try { S.rafId = requestAnimationFrame(loop); } catch (_) { S.running = false; }
            // Handshake: announce on load and once more for late listeners
            // (the shell dedupes; extra ready pings only re-trigger save fetch).
            announceReady();
            try {
                setTimeout(announceReady, 1500);
            } catch (_) {}
        } catch (e) {
            try { post('error', { message: String((e && e.message) || e) }); } catch (_) {}
        }
    }

    var api = {
        VERSION: VERSION,
        SLUG: SLUG,
        start: start,
        pause: pause,
        resume: resume,
        reset: reset,
        putt: putt,
        rewind: rewind,
        dreamShift: dreamShift,
        refit: refit,
        state: function () {
            try {
                return {
                    hole: S.holeIndex,
                    strokes: S.strokes,
                    totalStrokes: S.totalStrokes,
                    holed: !!S.holed,
                    slice: S.sliceLabel,
                    modules: {
                        math: !!(GMath && GMath.VERSION),
                        graphics: !!(GGraphics && GGraphics.VERSION),
                        worlds: !!(GWorlds && GWorlds.VERSION),
                        missions: !!(GMissions && GMissions.VERSION),
                        three: S.useThree
                    }
                };
            } catch (_) { return null; }
        }
    };

    try { window.GraveGain4D = api; } catch (_) {}

    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    } catch (_) {
        try { boot(); } catch (__) {}
    }
})();
