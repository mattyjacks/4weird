/* GraveGain4D trippy folding-vector visual layer (agent g4d2-04).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DTrippy. Never throws:
 * every public hook is try/catch guarded. No click/keydown/pointer-lock
 * listeners. The optional overlay canvas uses pointer-events:none so it can
 * never block input.
 *
 * What it is: a self-folding vector flow-field projected from 4D down to
 * the visible 3D slice (rendered as a dreamy 2D canvas layer), with a
 * dream-hue palette that cycles over time, slice-pulse bursts fired on
 * fold events, and a particle budget cap with automatic quality degrade
 * (drops particle count when frame times sag, restores when smooth).
 *
 * ZERO new art: this module defines no enemy/weapon meshes and no new
 * 3D primitive geometry of any kind. It reuses GraveGain3D model builders by
 * reference only (window.GraveGainGraphics3D / window.GraveGain3DModels
 * are read, never extended), and uses the 4D geometry projection ONLY
 * when window.GraveGain4DGeometry is present (optional chaining, hard
 * fallback to an internal XW/YW pseudo-4D fold otherwise).
 */
(function () {
    'use strict';
    if (window.GraveGain4DTrippy) return;

    var VERSION = '1.0.0';

    /* ============ TUNABLES (budget caps + quality ladder) ============ */

    var MAX_PARTICLES = 900;      // hard budget cap: never exceed
    var MIN_PARTICLES = 150;      // floor for the lowest quality rung
    var QUALITY_STEPS = [1, 0.66, 0.4, 0.22]; // fraction of MAX per rung
    var qualityIndex = 0;         // 0 = full quality
    var FOLD_SLOW_MS = 24;        // avg frame ms above this -> degrade
    var FOLD_FAST_MS = 17;        // avg frame ms below this -> may upgrade
    var frameAvgMs = 16;
    var frameSamples = 0;
    var lastQualityShiftAt = 0;

    /* ============ STATE ============ */

    var foldAmount = 0.5;         // 0..1, how hard the field folds itself
    var hueBase = 280;            // dream-violet start; cycles forever
    var hueSpeed = 14;            // hue degrees per second
    var running = false;
    var canvas = null;
    var ctx = null;
    var rafId = 0;
    var lastT = 0;
    var elapsed = 0;
    var wAngle = 0;
    var pulse = 0;                // 0..1 slice-pulse energy, decays per frame
    var pulseHue = 320;
    var foldEvents = 0;
    var particles = [];
    var contentMode = 'all';
    var resizeHandler = null;

    function particleBudget() {
        try {
            var frac = QUALITY_STEPS[qualityIndex];
            if (typeof frac !== 'number' || !isFinite(frac)) frac = 1;
            var n = Math.floor(MAX_PARTICLES * frac);
            if (n < MIN_PARTICLES) n = MIN_PARTICLES;
            if (n > MAX_PARTICLES) n = MAX_PARTICLES;
            return n;
        } catch (e) { return MAX_PARTICLES; }
    }

    /* ============ 4D PROJECTION (optional geometry reuse) ============ */

    // Project a 4D flow vector (x, y, z, w) down to the 3D slice angle pair
    // used to steer a particle. Prefers window.GraveGain4DGeometry when it
    // exists; otherwise falls back to an internal XW/YW rotation fold.
    // Never throws; always returns a finite { ax, ay } steering pair.
    function projectFlow(x, y, z, w, t) {
        try {
            var geo = null;
            try { geo = window.GraveGain4DGeometry || null; } catch (e) { geo = null; }
            if (geo) {
                try {
                    // Optional-chaining style access without hard dependency:
                    // any present projector wins (project / project4D / fold).
                    var fn = null;
                    try {
                        if (typeof geo.project === 'function') fn = geo.project;
                        else if (typeof geo.project4D === 'function') fn = geo.project4D;
                        else if (typeof geo.fold === 'function') fn = geo.fold;
                    } catch (e) { fn = null; }
                    if (fn) {
                        var out = null;
                        try { out = fn.call(geo, x, y, z, w, t); } catch (e) { out = null; }
                        if (out && isFinite(Number(out.ax)) && isFinite(Number(out.ay))) {
                            return { ax: Number(out.ax), ay: Number(out.ay) };
                        }
                        if (out && isFinite(Number(out.x)) && isFinite(Number(out.y))) {
                            return { ax: Number(out.x), ay: Number(out.y) };
                        }
                    }
                } catch (e) { /* fall through to internal fold */ }
            }
            // Internal fallback: rotate in XW and YW planes, perspective divide.
            var a = wAngle + (typeof t === 'number' && isFinite(t) ? t * 0.35 : 0);
            var cosA = Math.cos(a);
            var sinA = Math.sin(a);
            var w0 = (isFinite(w) ? w : 0) + foldAmount * (x * 0.6 + y * 0.3 + z * 0.5);
            var x1 = x * cosA - w0 * sinA;
            var y1 = y * cosA - w0 * sinA * 0.6;
            var dist = 2.5;
            var s = dist / (dist - w0 * 0.5);
            if (!isFinite(s)) s = 1;
            if (s < 0.2) s = 0.2;
            if (s > 3) s = 3;
            // Self-folding curl: swirl the steering angle by position + time.
            var swirl = Math.sin(x1 * 2.1 + elapsed * 0.9) + Math.cos(y1 * 1.7 - elapsed * 0.7);
            var ang = Math.atan2(y1, x1) + swirl * (0.4 + foldAmount * 1.2);
            var mag = (0.4 + 0.6 * Math.min(1, Math.abs(s - 1) + 0.35)) * (0.5 + foldAmount);
            return { ax: Math.cos(ang) * mag, ay: Math.sin(ang) * mag };
        } catch (e) {
            return { ax: 0, ay: 0 };
        }
    }

    /* ============ PARTICLES ============ */

    function rand(min, max) {
        try { return min + Math.random() * (max - min); } catch (e) { return min; }
    }

    function spawnParticle(W, H, anywhere) {
        try {
            var edge = Math.floor(rand(0, 4));
            var p = {
                x: rand(0, W), y: rand(0, H),
                vx: 0, vy: 0,
                life: rand(2, 7), age: anywhere ? rand(0, 4) : 0,
                size: rand(0.8, 2.6),
                hueOff: rand(0, 80),
                w: rand(-1, 1)
            };
            if (!anywhere) {
                if (edge === 0) { p.x = rand(0, W); p.y = -4; }
                else if (edge === 1) { p.x = W + 4; p.y = rand(0, H); }
                else if (edge === 2) { p.x = rand(0, W); p.y = H + 4; }
                else { p.x = -4; p.y = rand(0, H); }
            }
            return p;
        } catch (e) {
            return { x: 0, y: 0, vx: 0, vy: 0, life: 5, age: 0, size: 1.5, hueOff: 0, w: 0 };
        }
    }

    function syncParticleCount(W, H) {
        try {
            var want = particleBudget();
            while (particles.length < want) particles.push(spawnParticle(W, H, true));
            if (particles.length > want) particles.length = want;
            return particles.length;
        } catch (e) { return particles.length; }
    }

    function dreamColor(speedMag, hueOff) {
        try {
            var hue = (hueBase + hueOff + speedMag * 40 + pulse * 60) % 360;
            if (hue < 0) hue += 360;
            var light = 55 + 12 * Math.sin(elapsed * 2 + hueOff) + pulse * 15;
            if (light < 30) light = 30;
            if (light > 85) light = 85;
            return 'hsl(' + hue.toFixed(1) + ',85%,' + light.toFixed(1) + '%)';
        } catch (e) { return 'hsl(280,85%,60%)'; }
    }

    /* ============ QUALITY AUTO-DEGRADE ============ */

    function noteFrame(ms, now) {
        try {
            if (!isFinite(ms) || ms < 0) return qualityIndex;
            frameAvgMs = frameAvgMs * 0.92 + ms * 0.08;
            frameSamples++;
            if (frameSamples < 30) return qualityIndex;
            if (now - lastQualityShiftAt < 1500) return qualityIndex;
            if (frameAvgMs > FOLD_SLOW_MS && qualityIndex < QUALITY_STEPS.length - 1) {
                qualityIndex++;
                lastQualityShiftAt = now;
                frameSamples = 0;
                try {
                    var W = canvas ? canvas.width : 0, H = canvas ? canvas.height : 0;
                    syncParticleCount(W, H);
                } catch (e) { /* ignore */ }
            } else if (frameAvgMs < FOLD_FAST_MS && qualityIndex > 0) {
                qualityIndex--;
                lastQualityShiftAt = now;
                frameSamples = 0;
            }
            return qualityIndex;
        } catch (e) { return qualityIndex; }
    }

    /* ============ RENDER LOOP ============ */

    function frame(nowMs) {
        try {
            if (!running) return;
            var now = (typeof nowMs === 'number' && isFinite(nowMs)) ? nowMs : 0;
            var dt = lastT ? (now - lastT) / 1000 : 0.016;
            if (!isFinite(dt) || dt <= 0) dt = 0.016;
            if (dt > 0.1) dt = 0.1;
            try { noteFrame(dt * 1000, now); } catch (e) { /* ignore */ }
            lastT = now;
            elapsed += dt;
            wAngle += dt * (0.25 + foldAmount * 0.9);
            hueBase = (hueBase + dt * hueSpeed) % 360;
            if (pulse > 0) {
                pulse -= dt * 1.4;
                if (pulse < 0) pulse = 0;
            }
            step(dt);
            draw();
        } catch (e) { /* never throw out of rAF */ }
        try {
            if (running) {
                if (typeof requestAnimationFrame === 'function') {
                    rafId = requestAnimationFrame(frame);
                } else {
                    rafId = setTimeout(function () { frame(0); }, 33);
                }
            }
        } catch (e) { /* ignore */ }
    }

    function step(dt) {
        try {
            if (!canvas) return;
            var W = canvas.width, H = canvas.height;
            if (!W || !H) return;
            syncParticleCount(W, H);
            var t = elapsed;
            for (var i = 0; i < particles.length; i++) {
                try {
                    var p = particles[i];
                    p.age += dt;
                    if (p.age >= p.life || p.x < -12 || p.x > W + 12 || p.y < -12 || p.y > H + 12) {
                        particles[i] = spawnParticle(W, H, false);
                        continue;
                    }
                    var nx = (p.x / W) * 2 - 1;
                    var ny = (p.y / H) * 2 - 1;
                    var steer = projectFlow(nx, ny, Math.sin(t + p.w * 3), p.w, t);
                    var boost = 1 + pulse * 2.2;
                    p.vx += steer.ax * dt * 90 * boost;
                    p.vy += steer.ay * dt * 90 * boost;
                    p.vx *= (1 - 0.9 * dt);
                    p.vy *= (1 - 0.9 * dt);
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                } catch (e) { /* keep other particles flowing */ }
            }
        } catch (e) { /* ignore */ }
    }

    function draw() {
        try {
            if (!ctx || !canvas) return;
            var W = canvas.width, H = canvas.height;
            if (!W || !H) return;
            ctx.clearRect(0, 0, W, H);
            // Dream-wash background tint, breathing with the pulse.
            try {
                var washHue = ((hueBase + 180) % 360 + 360) % 360;
                ctx.fillStyle = 'hsla(' + washHue.toFixed(0) + ',70%,12%,' + (0.10 + pulse * 0.22).toFixed(3) + ')';
                ctx.fillRect(0, 0, W, H);
            } catch (e) { /* ignore */ }
            // Slice-pulse ring: expanding burst on fold events.
            try {
                if (pulse > 0.01) {
                    var cx = W / 2, cy = H / 2;
                    var maxR = Math.sqrt(cx * cx + cy * cy);
                    var r = maxR * (1 - pulse);
                    ctx.save();
                    ctx.strokeStyle = 'hsla(' + (((pulseHue + hueBase) % 360 + 360) % 360).toFixed(0) + ',90%,65%,' + (pulse * 0.8).toFixed(3) + ')';
                    ctx.lineWidth = 1 + pulse * 5;
                    ctx.beginPath();
                    ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            } catch (e) { /* ignore */ }
            try { ctx.globalCompositeOperation = 'lighter'; } catch (e) { /* ignore */ }
            for (var i = 0; i < particles.length; i++) {
                try {
                    var p = particles[i];
                    var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) / 120;
                    if (!isFinite(sp)) sp = 0;
                    ctx.fillStyle = dreamColor(sp, p.hueOff);
                    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(elapsed * 3 + p.hueOff);
                    if (ctx.globalAlpha < 0.15) ctx.globalAlpha = 0.15;
                    if (ctx.globalAlpha > 1) ctx.globalAlpha = 1;
                    var s = p.size * (1 + sp + pulse * 1.5);
                    ctx.fillRect(p.x, p.y, s, s);
                    // Trail stub along velocity: the folding-vector feel.
                    if (sp > 0.05) {
                        ctx.strokeStyle = ctx.fillStyle;
                        ctx.lineWidth = Math.max(0.5, s * 0.4);
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
                        ctx.stroke();
                    }
                } catch (e) { /* keep drawing the rest */ }
            }
            try {
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    /* ============ CANVAS / LIFECYCLE ============ */

    function ensureCanvas() {
        try {
            if (canvas && ctx) return canvas;
            if (typeof document === 'undefined') return null;
            var el = null;
            try { el = document.getElementById('gg4d-trippy-layer'); } catch (e) { el = null; }
            if (el && el.getContext) {
                canvas = el;
            } else {
                canvas = document.createElement('canvas');
                canvas.id = 'gg4d-trippy-layer';
                try {
                    canvas.style.position = 'fixed';
                    canvas.style.left = '0';
                    canvas.style.top = '0';
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    canvas.style.pointerEvents = 'none';
                    canvas.style.zIndex = '5';
                    canvas.setAttribute('aria-hidden', 'true');
                } catch (e) { /* ignore */ }
                try {
                    if (document.body) document.body.appendChild(canvas);
                } catch (e) { return null; }
            }
            try {
                ctx = canvas.getContext('2d');
            } catch (e) { ctx = null; }
            sizeToViewport();
            return canvas;
        } catch (e) { return null; }
    }

    function sizeToViewport() {
        try {
            if (!canvas) return false;
            var w = 800, h = 600;
            try {
                if (typeof window !== 'undefined') {
                    if (isFinite(window.innerWidth) && window.innerWidth > 0) w = Math.floor(window.innerWidth);
                    if (isFinite(window.innerHeight) && window.innerHeight > 0) h = Math.floor(window.innerHeight);
                }
            } catch (e) { /* keep defaults */ }
            // Cap backing-store pixels so the budget cap holds on hidpi.
            try {
                var scale = 1;
                if (qualityIndex >= 2) scale = 0.75;
                if (qualityIndex >= 3) scale = 0.6;
                canvas.width = Math.max(2, Math.floor(w * scale));
                canvas.height = Math.max(2, Math.floor(h * scale));
            } catch (e) { return false; }
            return true;
        } catch (e) { return false; }
    }

    function start(targetCanvas) {
        try {
            if (targetCanvas && targetCanvas.getContext) {
                canvas = targetCanvas;
                try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
            } else {
                ensureCanvas();
            }
            if (!ctx) return false;
            if (running) return true;
            running = true;
            lastT = 0;
            frameSamples = 0;
            try {
                if (!resizeHandler && typeof window !== 'undefined' && window.addEventListener) {
                    resizeHandler = function () { try { sizeToViewport(); } catch (e) { /* ignore */ } };
                    window.addEventListener('resize', resizeHandler);
                }
            } catch (e) { /* ignore */ }
            try {
                if (typeof requestAnimationFrame === 'function') {
                    rafId = requestAnimationFrame(frame);
                } else {
                    rafId = setTimeout(function () { frame(0); }, 33);
                }
            } catch (e) { running = false; return false; }
            return true;
        } catch (e) { return false; }
    }

    function stop() {
        try {
            running = false;
            try {
                if (typeof cancelAnimationFrame === 'function' && rafId) cancelAnimationFrame(rafId);
                else if (rafId) clearTimeout(rafId);
            } catch (e) { /* ignore */ }
            rafId = 0;
            return true;
        } catch (e) { return false; }
    }

    // Slice-pulse burst fired on fold events: spikes pulse energy, shifts
    // the pulse hue, and nudges the fold angle for a visible "slice snap".
    function onFold(opts) {
        try {
            foldEvents++;
            var strength = 0.7;
            try {
                if (opts && isFinite(Number(opts.strength))) {
                    strength = Number(opts.strength);
                    if (strength < 0) strength = 0;
                    if (strength > 1.5) strength = 1.5;
                }
            } catch (e) { /* keep default */ }
            pulse = Math.min(1.25, pulse + 0.35 + strength * 0.5);
            try {
                pulseHue = (pulseHue + 47 + strength * 30) % 360;
            } catch (e) { /* ignore */ }
            try { wAngle += 0.15 + strength * 0.25; } catch (e) { /* ignore */ }
            return { pulse: pulse, foldEvents: foldEvents };
        } catch (e) { return { pulse: pulse, foldEvents: foldEvents }; }
    }

    function setFoldAmount(v) {
        try {
            var n = Number(v);
            if (!isFinite(n)) return foldAmount;
            if (n < 0) n = 0;
            if (n > 1) n = 1;
            var prev = foldAmount;
            foldAmount = n;
            // Crossing a fold threshold fires a gentle slice-pulse burst.
            try {
                if (Math.abs(n - prev) >= 0.25) onFold({ strength: Math.abs(n - prev) });
            } catch (e) { /* ignore */ }
            return foldAmount;
        } catch (e) { return foldAmount; }
    }

    function setQuality(i) {
        try {
            var n = Math.floor(Number(i));
            if (!isFinite(n)) return qualityIndex;
            if (n < 0) n = 0;
            if (n > QUALITY_STEPS.length - 1) n = QUALITY_STEPS.length - 1;
            qualityIndex = n;
            lastQualityShiftAt = 0;
            frameSamples = 0;
            try { sizeToViewport(); } catch (e) { /* ignore */ }
            return qualityIndex;
        } catch (e) { return qualityIndex; }
    }

    function getStats() {
        try {
            return {
                version: VERSION,
                running: running,
                particles: particles.length,
                budget: particleBudget(),
                maxParticles: MAX_PARTICLES,
                qualityIndex: qualityIndex,
                frameAvgMs: Math.round(frameAvgMs * 100) / 100,
                pulse: Math.round(pulse * 1000) / 1000,
                foldAmount: foldAmount,
                foldEvents: foldEvents,
                usesGeometryProjection: !!(window.GraveGain4DGeometry && (
                    typeof window.GraveGain4DGeometry.project === 'function' ||
                    typeof window.GraveGain4DGeometry.project4D === 'function' ||
                    typeof window.GraveGain4DGeometry.fold === 'function'))
            };
        } catch (e) {
            return { version: VERSION, running: false };
        }
    }

    function boot() {
        try {
            if (typeof window !== 'undefined' && window.addEventListener) {
                window.addEventListener('fourweird-content-mode', function (ev) {
                    try {
                        if (ev && ev.detail && ev.detail.mode) contentMode = String(ev.detail.mode);
                        else if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                            contentMode = String(window.FourweirdContentMode.mode);
                        }
                    } catch (e) { /* ignore */ }
                });
            }
        } catch (e) { /* ignore */ }
        try {
            if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                contentMode = String(window.FourweirdContentMode.mode);
            }
        } catch (e) { /* ignore */ }
    }

    var api = {
        VERSION: VERSION,
        MAX_PARTICLES: MAX_PARTICLES,
        MIN_PARTICLES: MIN_PARTICLES,
        start: start,
        stop: stop,
        onFold: onFold,
        setFoldAmount: setFoldAmount,
        getFoldAmount: function () { try { return foldAmount; } catch (e) { return 0.5; } },
        setQuality: setQuality,
        getQuality: function () { try { return qualityIndex; } catch (e) { return 0; } },
        getStats: getStats,
        projectFlow: projectFlow,
        isRunning: function () { try { return running; } catch (e) { return false; } },
        getContentMode: function () { try { return contentMode; } catch (e) { return 'all'; } }
    };

    try {
        window.GraveGain4DTrippy = api;
    } catch (e) { /* ignore */ }

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain4d-trippy', version: VERSION, init: function () { return api; } });
    } catch (e) { /* ignore */ }

    try {
        if (typeof document !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', boot);
            } else {
                boot();
            }
        }
    } catch (e) { /* ignore */ }
})();
