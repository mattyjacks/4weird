/* GraveGain5D — Multiverse Transcendence (scaffold, v0.1.0).
 *
 * 5D = 4D hypercube golf + 3D models, but able to transcend universes.
 * Crazier than 4D: every hop rewrites gravity, W-drift, and par; chain hops
 * build combo multipliers; the paradox meter punishes hop spam — overcharge
 * collapses the universe you stand in. Collapsing universes run a doom clock.
 *
 * Vanilla IIFE, idempotent. Rules core (newRun/tick/score) is pure: no
 * document/canvas/localStorage/fetch/eval — DOM lives only in the view layer
 * below the "---- View ----" marker. Reuses GraveGain4DMath / GraveGain4DWorlds
 * and GraveGain3DModels BY REFERENCE when present (never copied); standalone
 * fallback keeps the scaffold playable with zero deps.
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.GraveGain5D && window.GraveGain5D.VERSION) return;

    var VERSION = '0.1.0-scaffold';
    var SAVE_KEY = 'gravegain5d_save_v1';
    var SAVE_VERSION = 1;

    // Optional globals, feature-detected (all fail-open, by reference only).
    function opt(n) { try { return window[n] || null; } catch (_) { return null; } }
    var M4D = opt('GraveGain4DMath');
    var W4D = opt('GraveGain4DWorlds');
    var U5D = opt('GraveGain5DUniverses');
    var M3D = opt('GraveGain3DModels');

    /* ---------------- Universes ---------------- */
    // gravity: putt-distance multiplier. drift: W-slice pull per tick.
    // parDelta: added to the 4D hole par. collapseTicks: doom clock once
    // paradox overcharges while standing here (0 = stable).
    var UNIVERSES = [
        { id: 'prime', name: 'Prime Array', emoji: '🌌', gravity: 1.0, drift: 0.0, parDelta: 0, collapseTicks: 0, blurb: 'Home water. No mods, no mercy.' },
        { id: 'echo', name: 'Echo Expanse', emoji: '🪞', gravity: 0.9, drift: 0.1, parDelta: 0, collapseTicks: 0, blurb: 'Ghost replays linger. Putts echo twice.' },
        { id: 'dream', name: 'Dream Shallows', emoji: '💭', gravity: 1.1, drift: -0.1, parDelta: 1, collapseTicks: 0, blurb: 'Soft physics, generous par, sleepy hazards.' },
        { id: 'void', name: 'Void Maw', emoji: '🕳️', gravity: 1.4, drift: 0.3, parDelta: -1, collapseTicks: 12, blurb: 'Heavy ball, hungry W-drift. Collapses FAST when paradox is hot.' },
        { id: 'bloom', name: 'Bloom Lattice', emoji: '🌸', gravity: 0.7, drift: -0.2, parDelta: 1, collapseTicks: 0, blurb: 'Floaty, forgiving, chain-hop combos bloom here.' },
        { id: 'static', name: 'Static Storm', emoji: '📺', gravity: 1.2, drift: 0.0, parDelta: 0, collapseTicks: 8, blurb: 'Noise scrambles aim. Hop out before it collapses.' }
    ];

    var CLASSES = {
        putter: { name: 'Void Putter', hp: 20, atk: 5, range: 4, ability: 'Chain Leap' },
        warden: { name: 'Paradox Warden', hp: 30, atk: 4, range: 3, ability: 'Anchor Reality' },
        drifter: { name: 'Universe Drifter', hp: 18, atk: 6, range: 3, ability: 'Free Hop' }
    };

    var HOLES = [
        { par: 3, name: 'Multiverse Mouth' },
        { par: 3, name: 'Hull Breach Echo' },
        { par: 4, name: 'Grove Veil Bloom' },
        { par: 3, name: 'Vault Static' },
        { par: 4, name: 'Waste Crossing Void' },
        { par: 5, name: 'Venom Deep Dream' },
        { par: 3, name: 'Dark Antechamber' },
        { par: 4, name: 'Choir of Echoes' },
        { par: 4, name: 'Root Tesseract' },
        { par: 5, name: 'The Prime Array' }
    ];

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function universeById(id) {
        for (var i = 0; i < UNIVERSES.length; i++) {
            if (UNIVERSES[i].id === id) return UNIVERSES[i];
        }
        return UNIVERSES[0];
    }
    function holePar(holeIdx, universeId) {
        var h = HOLES[clamp(holeIdx | 0, 0, HOLES.length - 1)];
        return Math.max(1, h.par + universeById(universeId).parDelta);
    }

    /* ---------------- Rules core (pure) ---------------- */
    function newRun(opts) {
        opts = opts || {};
        return {
            mode: 'turn',
            cls: CLASSES[opts.cls] ? opts.cls : 'putter',
            hole: 0,
            strokes: 0,
            universe: opts.universe || 'prime',
            w: 0,
            paradox: 0,          // 0..100; 100 = collapse trigger
            chain: 0,            // consecutive hops without a putt
            combo: 1,            // score multiplier from chains
            gold: 0,
            hops: 0,
            doom: 0,             // collapse countdown once triggered
            over: false,
            win: false,
            log: []
        };
    }

    // One discrete action. Returns an event list (view layer animates them).
    function tick(s, action) {
        var ev = [];
        if (!s || s.over) return ev;
        action = action || { wait: true };
        var u = universeById(s.universe);

        if (action.hop) {
            var target = typeof action.hop === 'string' ? action.hop : nextUniverse(s.universe);
            return hop(s, target);
        }
        if (action.putt) {
            var power = clamp(Number(action.power) || 1, 0.25, 3);
            s.strokes += 1;
            s.w = clamp(s.w + u.drift, -3, 3);
            s.paradox = clamp(s.paradox - 4, 0, 100);
            s.chain = 0;
            var need = holePar(s.hole, s.universe);
            var sunk = s.strokes >= need; // scaffold putting: par strokes sink it
            ev.push({ t: 'putt', power: power, gravity: u.gravity, strokes: s.strokes, par: need });
            if (sunk) {
                var bonus = Math.round(10 * s.combo);
                s.gold += bonus;
                ev.push({ t: 'hole', hole: s.hole, bonus: bonus, combo: s.combo });
                s.hole += 1;
                s.strokes = 0;
                s.combo = 1;
                if (s.hole >= HOLES.length) {
                    s.over = true;
                    s.win = true;
                    ev.push({ t: 'victory', gold: s.gold, hops: s.hops });
                }
            }
            stepDoom(s, ev, u);
            return ev;
        }
        if (action.ability) {
            if (s.cls === 'warden') {
                s.paradox = clamp(s.paradox - 25, 0, 100);
                s.doom = 0;
                ev.push({ t: 'anchor', paradox: s.paradox });
            } else if (s.cls === 'drifter') {
                ev = ev.concat(hop(s, nextUniverse(s.universe), true));
            } else {
                s.combo = Math.min(8, s.combo + 1);
                ev.push({ t: 'leap', combo: s.combo });
            }
            stepDoom(s, ev, u);
            return ev;
        }
        // step / wait: drift + doom advance, nothing else (scaffold).
        s.w = clamp(s.w + u.drift * 0.5, -3, 3);
        ev.push({ t: 'wait', w: s.w });
        stepDoom(s, ev, u);
        return ev;
    }

    function nextUniverse(currentId) {
        for (var i = 0; i < UNIVERSES.length; i++) {
            if (UNIVERSES[i].id === currentId) return UNIVERSES[(i + 1) % UNIVERSES.length].id;
        }
        return UNIVERSES[0].id;
    }

    // Hop cost scales with chain length — crazier than 4D world-hop (flat cost).
    function hop(s, targetId, free) {
        var ev = [];
        var target = universeById(targetId);
        var cost = free ? 0 : 8 + s.chain * 6;
        s.paradox = clamp(s.paradox + cost, 0, 100);
        s.chain += 1;
        s.hops += 1;
        s.combo = Math.min(8, 1 + Math.floor(s.chain / 2));
        s.universe = target.id;
        s.w = 0;
        ev.push({ t: 'hop', to: target.id, paradox: s.paradox, chain: s.chain, combo: s.combo });
        if (s.paradox >= 100) {
            var u = universeById(s.universe);
            var fuse = u.collapseTicks || 6;
            s.doom = fuse;
            ev.push({ t: 'collapse', universe: s.universe, fuse: fuse });
        }
        return ev;
    }

    function stepDoom(s, ev, u) {
        u = u || universeById(s.universe);
        if (s.doom > 0) {
            s.doom -= 1;
            ev.push({ t: 'doom', left: s.doom, universe: s.universe });
            if (s.doom <= 0 && (u.collapseTicks > 0)) {
                // Collapse: bounced back to Prime, paradox vented, combo lost.
                s.universe = 'prime';
                s.paradox = 40;
                s.combo = 1;
                s.chain = 0;
                ev.push({ t: 'collapsed', to: 'prime' });
            } else if (s.doom <= 0) {
                s.paradox = clamp(s.paradox - 30, 0, 100);
            }
        }
    }

    function score(s) {
        if (!s) return 0;
        return s.gold + s.hops * 2 + (s.win ? 100 : 0);
    }

    /* ---------------- Persistence (view-side, fail-open) ---------------- */
    function loadProfile() {
        var fallback = { best: 0, wins: 0, settings: null };
        try {
            var raw = window.localStorage ? window.localStorage.getItem(SAVE_KEY) : null;
            if (!raw) return fallback;
            var p = JSON.parse(raw);
            if (p && p.v === SAVE_VERSION) return p;
            return fallback;
        } catch (_) { return fallback; }
    }
    function saveProfile(p) {
        try {
            p.v = SAVE_VERSION;
            if (window.localStorage) window.localStorage.setItem(SAVE_KEY, JSON.stringify(p));
        } catch (_) { /* fail-open */ }
    }

    /* ---- View ---- */
    var G = null;

    function el(id) { try { return document.getElementById(id); } catch (_) { return null; } }
    function setText(id, v) { try { var n = el(id); if (n) n.textContent = String(v); } catch (_) {} }

    function renderMenuBackdrop() {
        try {
            var c = el('gg5dCanvas');
            if (!c) return;
            var ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#05030d';
            ctx.fillRect(0, 0, c.width, c.height);
            // Multiverse teaser: one ring per universe.
            var cols = ['#22d3ee', '#a855f7', '#f472b6', '#ef4444', '#34d399', '#94a3b8'];
            for (var i = 0; i < 6; i++) {
                ctx.strokeStyle = cols[i % cols.length];
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(c.width * (0.2 + i * 0.12), c.height * 0.4, 24 + (i % 3) * 12, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        } catch (_) {}
    }

    function render() {
        try {
            if (!G || !G.ctx || !G.run) { renderMenuBackdrop(); return; }
            var ctx = G.ctx, s = G.run;
            var W = 1000, H = 600;
            ctx.setTransform(G.dpr || 1, 0, 0, G.dpr || 1, 0, 0);
            var u = universeById(s.universe);
            // Sky tinted per universe (scaffold palette).
            var tints = { prime: '#0e7490', echo: '#7c3aed', dream: '#db2777', void: '#7f1d1d', bloom: '#15803d', static: '#475569' };
            ctx.fillStyle = '#05030d';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = tints[s.universe] || '#0e7490';
            ctx.globalAlpha = 0.25;
            ctx.fillRect(0, 0, W, H * 0.6);
            ctx.globalAlpha = 1;
            // Fairway + hole.
            ctx.strokeStyle = 'rgba(34,211,238,0.7)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(60, H * 0.7); ctx.lineTo(W - 60, H * 0.7); ctx.stroke();
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🕳️', W - 120, H * 0.7 - 12);
            // Ball position from strokes (scaffold: marches right per stroke).
            var bx = 100 + (s.strokes / Math.max(1, holePar(s.hole, s.universe))) * (W - 260);
            ctx.font = '36px sans-serif';
            ctx.fillText('⚪', bx, H * 0.7 - 12);
            ctx.font = '28px sans-serif';
            ctx.fillText(u.emoji, bx, H * 0.7 - 54);
            // HUD line.
            ctx.textAlign = 'left';
            ctx.font = 'bold 16px Outfit, sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('HOLE ' + (s.hole + 1) + '/10  ' + u.emoji + ' ' + u.name.toUpperCase(), 24, 30);
            ctx.fillStyle = s.paradox >= 80 ? '#ef4444' : '#22d3ee';
            ctx.fillText('PARADOX ' + s.paradox + '  CHAIN x' + s.combo + (s.doom > 0 ? '  💥 ' + s.doom : ''), 24, 54);
            updateHud();
        } catch (_) { /* render must never throw */ }
    }

    function updateHud() {
        try {
            if (!G || !G.run) return;
            var s = G.run;
            var u = universeById(s.universe);
            setText('gg5dHole', 'Hole ' + (s.hole + 1) + '/10');
            setText('gg5dStrokes', s.strokes + '/' + holePar(s.hole, s.universe));
            setText('gg5dGold', s.gold);
            setText('gg5dUniverse', u.emoji + ' ' + u.name);
            setText('gg5dParadox', s.paradox + (s.doom > 0 ? ' 💥' + s.doom : ''));
            setText('gg5dChain', 'x' + s.combo);
            var pf = el('gg5dParadoxFill');
            if (pf) pf.style.width = clamp(s.paradox, 0, 100).toFixed(0) + '%';
            var badge = el('gg5dParadoxBadge');
            if (badge) badge.className = s.paradox >= 80 ? 'hot' : '';
        } catch (_) {}
    }

    function sizeCanvas() {
        try {
            if (!G || !G.canvas) return;
            var cssW = G.canvas.clientWidth || 1000;
            var cssH = Math.round(cssW * 600 / 1000);
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            G.canvas.width = Math.round(cssW * dpr);
            G.canvas.height = Math.round(cssH * dpr);
            G.dpr = dpr;
        } catch (_) {}
    }

    function showBanner(title, text) {
        try {
            setText('gg5dBannerTitle', title);
            setText('gg5dBannerText', text);
            var b = el('gg5dBanner');
            if (b) b.className = 'on';
        } catch (_) {}
    }
    function hideBanner() {
        try {
            var b = el('gg5dBanner');
            if (b) b.className = '';
        } catch (_) {}
    }

    function startRun(cls, universe) {
        G.run = newRun({ cls: cls, universe: universe });
        try {
            el('gg5dMenu').style.display = 'none';
            el('gg5dHud').hidden = false;
            el('gg5dTouch').hidden = false;
        } catch (_) {}
        sizeCanvas();
        var u = universeById(G.run.universe);
        showBanner('TRANSCEND — ' + u.name.toUpperCase(), u.blurb + '\nU = hop · Space = putt · T = rewind (4D echo)');
        render();
    }

    function doAction(kind) {
        try {
            if (!G || !G.run || G.run.over) return;
            hideBanner();
            var ev;
            if (kind === 'hop') ev = tick(G.run, { hop: true });
            else if (kind === 'putt' || kind === 'attack' || kind === 'step') ev = tick(G.run, { putt: true, power: 1 });
            else if (kind === 'ability') ev = tick(G.run, { ability: true });
            else if (kind === 'potion') {
                G.run.paradox = clamp(G.run.paradox - 10, 0, 100);
                ev = [{ t: 'vent', paradox: G.run.paradox }];
            }
            else ev = tick(G.run, { wait: true });
            if (G.run.over && G.run.win) {
                var p = loadProfile();
                p.wins += 1;
                p.best = Math.max(p.best, score(G.run));
                saveProfile(p);
                showBanner('PRIME ARRAY REACHED', 'Gold ' + G.run.gold + ' · hops ' + G.run.hops + ' · victories ' + p.wins);
            }
            render();
            return ev;
        } catch (_) { return []; }
    }

    function bind() {
        try {
            var cls = 'putter', universe = 'prime';
            function paint() {
                var cp = el('gg5dClassPick');
                if (cp) for (var i = 0; i < cp.children.length; i++) {
                    cp.children[i].className = cp.children[i].getAttribute('data-class') === cls ? 'sel' : '';
                }
                var up = el('gg5dUniversePick');
                if (up) for (var j = 0; j < up.children.length; j++) {
                    up.children[j].className = up.children[j].getAttribute('data-universe') === universe ? 'sel' : '';
                }
            }
            var cpick = el('gg5dClassPick');
            if (cpick) cpick.addEventListener('click', function (ev) {
                try {
                    var b = ev.target.closest ? ev.target.closest('[data-class]') : null;
                    if (b && CLASSES[b.getAttribute('data-class')]) { cls = b.getAttribute('data-class'); paint(); }
                } catch (_) {}
            });
            var upick = el('gg5dUniversePick');
            if (upick) upick.addEventListener('click', function (ev) {
                try {
                    var b2 = ev.target.closest ? ev.target.closest('[data-universe]') : null;
                    if (b2 && universeById(b2.getAttribute('data-universe'))) { universe = b2.getAttribute('data-universe'); paint(); }
                } catch (_) {}
            });
            paint();
            var go = el('gg5dGoBtn');
            if (go) go.addEventListener('click', function () {
                try {
                    var prof = loadProfile();
                    prof.settings = { cls: cls, universe: universe };
                    saveProfile(prof);
                    startRun(cls, universe);
                } catch (_) {}
            });
            var tb = el('gg5dTouch');
            if (tb) tb.addEventListener('click', function (ev) {
                try {
                    var b3 = ev.target.closest ? ev.target.closest('[data-act]') : null;
                    if (b3) doAction(b3.getAttribute('data-act'));
                } catch (_) {}
            });
            document.addEventListener('keydown', function (ev) {
                try {
                    if (!G || !G.run) return;
                    var k = ev.key;
                    if (k === 'u' || k === 'U' || k === 'v' || k === 'V') { ev.preventDefault(); doAction('hop'); }
                    else if (k === ' ' || k === 'Enter') { ev.preventDefault(); doAction('putt'); }
                    else if (k === 'q' || k === 'Q' || k === 'e' || k === 'E') { ev.preventDefault(); doAction('step'); }
                    else if (k === 't' || k === 'T') { ev.preventDefault(); doAction('wait'); }
                } catch (_) {}
            });
            var cv = el('gg5dCanvas');
            if (cv) cv.addEventListener('click', function () { try { hideBanner(); } catch (_) {} });
            document.addEventListener('fullscreenchange', function () { try { sizeCanvas(); } catch (_) {} });
            window.addEventListener('resize', function () { try { sizeCanvas(); } catch (_) {} });
        } catch (_) {}
    }

    function boot() {
        try {
            var canvas = el('gg5dCanvas');
            G = {
                canvas: canvas,
                ctx: canvas ? canvas.getContext('2d') : null,
                dpr: 1,
                run: null
            };
            bind();
            renderMenuBackdrop();
            (function loop() {
                try { render(); } catch (_) {}
                try { requestAnimationFrame(loop); } catch (_) {}
            })();
            return true;
        } catch (_) { return false; }
    }

    var api = {
        VERSION: VERSION,
        SAVE_KEY: SAVE_KEY,
        UNIVERSES: UNIVERSES,
        CLASSES: CLASSES,
        HOLES: HOLES,
        newRun: newRun,
        tick: tick,
        hop: hop,
        score: score,
        holePar: holePar,
        universeById: universeById,
        doAction: doAction,
        startRun: startRun,
        boot: boot
    };

    try { window.GraveGain5D = api; } catch (_) {}
    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain5d', version: VERSION, init: boot });
    } catch (_) {}

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (_) {}
})();
