/* GraveGain emergent toasts — live endless-dungeon event herald (v2-native).
 *
 * Companion to gravegain-emergent.js (pure data: SIDEQUESTS / ACTIVITIES /
 * NPCS + nextEvent(seedState) + dialogueFor(npcId, ctx)). This file is the
 * presentation engine: polls the live run, picks seeded events, and shows
 * auto-dismissing toast banners. It never writes game state.
 *
 * Lives at public/games/html/gravegain-emergent-toasts.js, injected into the
 * generated gravegain2d / gravegain3d / gravegain1d bundles by
 * scripts/sync-game-bundles.mjs (BIG-UPGRADE block).
 *
 * Vanilla IIFE, no imports, never throws. Idempotent.
 * No click/key/pointer-lock listeners (toasts auto-dismiss; container is
 * pointer-events:none). Dialogue via textContent only, never innerHTML.
 * Same graphics for all age bands; drugsAdultOnly entries show ONLY when
 * mode === "all"; goreAdultOnly entries are skipped in kid mode (a cozy
 * fallback event is picked instead).
 *
 * Exposes window.GraveGainEmergentToasts = { VERSION, resolveMode,
 * maybeTrigger, pickFor(ctx) }.
 */
(function () {
    'use strict';
    if (window.GraveGainEmergentToasts) return;

    var VERSION = '2.0.0';
    var POLL_MS = 20000;
    var DISMISS_MS = 9000;
    var KID_PRAISE = ['NICE!', 'SPARKLE QUEST!', 'RAINBOW TASK!', 'BRAVE BADGE!'];

    function parseMode(v) {
        try {
            v = String(v == null ? '' : v).trim().toLowerCase();
            if (v === 'kid' || v === 'teen' || v === 'all') return v;
        } catch (e) { /* ignore */ }
        return null;
    }

    function slugOf() {
        try {
            var el = document.currentScript && document.currentScript.getAttribute('data-slug');
            if (el) return String(el);
        } catch (e) { /* ignore */ }
        try {
            var m = String(window.location.pathname || '').match(/\/games\/([^/]+)\//);
            if (m) return m[1];
        } catch (e) { /* ignore */ }
        return 'gravegain2d';
    }

    function resolveMode() {
        try {
            var q = new URLSearchParams(window.location.search).get('content');
            var qm = parseMode(q);
            if (qm) return qm;
        } catch (e) { /* ignore */ }
        try {
            var sm = parseMode(window.localStorage.getItem('4weird-content-mode:' + slugOf()));
            if (sm) return sm;
        } catch (e) { /* ignore */ }
        try {
            var g = window.FourweirdContentMode;
            if (g && parseMode(g.mode)) return parseMode(g.mode);
        } catch (e) { /* ignore */ }
        return 'teen';
    }

    function data() {
        try { return window.GraveGainEmergent || null; } catch (e) { return null; }
    }

    function pick(arr, seed) {
        try {
            if (!arr || !arr.length) return null;
            var i = Math.abs(seed | 0) % arr.length;
            return arr[i];
        } catch (e) { return null; }
    }

    // Mode-gated pick: drugsAdultOnly needs all; goreAdultOnly needs teen+.
    function gatedList(list, mode) {
        var out = [];
        try {
            for (var i = 0; i < (list || []).length; i++) {
                var e = list[i];
                if (!e) continue;
                if (e.drugsAdultOnly && mode !== 'all') continue;
                if (e.goreAdultOnly && mode === 'kid') continue;
                out.push(e);
            }
        } catch (e) { /* return what we have */ }
        return out;
    }

    function liveCtx() {
        var ctx = { floor: 1, kills: 0, gold: 0, seed: 1, active: false };
        try {
            var g = window.GraveGainGame || window.gg || null;
            if (g && g.player && g.enemies) {
                ctx.active = true;
                if (typeof g.kills === 'number') ctx.kills = g.kills;
                if (typeof g.gold === 'number') ctx.gold = g.gold;
                if (typeof g.floor === 'number') ctx.floor = g.floor;
                else if (typeof g.floorIndex === 'number') ctx.floor = g.floorIndex + 1;
                else if (g.dungeon && typeof g.dungeon.floor === 'number') ctx.floor = g.dungeon.floor;
            }
        } catch (e) { /* keep defaults */ }
        try {
            // GraveGain1D: active while a run is on screen (HUD visible).
            var hud = document.getElementById('gg1dHud');
            if (hud && !hud.hidden) {
                ctx.active = true;
                var goldEl = document.getElementById('gg1dGold');
                var secEl = document.getElementById('gg1dSector');
                if (goldEl) { var gn = parseInt(goldEl.textContent, 10); if (isFinite(gn)) ctx.gold = gn; }
                if (secEl) {
                    var m = String(secEl.textContent || '').match(/Sector\s+(\d+)/i);
                    if (m) ctx.floor = parseInt(m[1], 10) || 1;
                }
            }
        } catch (e) { /* keep defaults */ }
        try { ctx.seed = (ctx.floor * 97 + ctx.kills * 13 + ctx.gold) >>> 0; } catch (e) { /* keep */ }
        return ctx;
    }

    var host = null;
    function ensureHost() {
        try {
            if (host && host.isConnected) return host;
            var stage = document.getElementById('gg1dStage')
                || document.getElementById('canvasContainer')
                || document.body;
            var d = document.createElement('div');
            d.id = 'ggEmergentToasts';
            d.setAttribute('aria-hidden', 'true');
            d.style.cssText = 'position:absolute;left:50%;top:8%;transform:translateX(-50%);'
                + 'display:flex;flex-direction:column;gap:8px;align-items:center;'
                + 'pointer-events:none;z-index:4990;max-width:min(92%,560px);';
            try {
                var cs = window.getComputedStyle ? window.getComputedStyle(stage) : null;
                if (stage !== document.body && cs && cs.position === 'static') stage.style.position = 'relative';
            } catch (e) { /* ignore */ }
            stage.appendChild(d);
            host = d;
            return d;
        } catch (e) { return null; }
    }

    function toast(title, body) {
        try {
            var h = ensureHost();
            if (!h) return;
            while (h.childNodes.length >= 2) {
                try { h.removeChild(h.firstChild); } catch (e) { break; }
            }
            var card = document.createElement('div');
            card.style.cssText = 'pointer-events:none;background:rgba(10,8,20,0.88);'
                + 'border:1px solid rgba(255,213,74,0.55);border-radius:10px;'
                + 'padding:8px 14px;color:#ffe9a3;font:600 13px Outfit,sans-serif;'
                + 'text-align:center;box-shadow:0 4px 18px rgba(0,0,0,0.6);'
                + 'transition:opacity 0.8s;';
            var t = document.createElement('div');
            t.style.cssText = 'font-weight:800;letter-spacing:0.06em;font-size:12px;opacity:0.9;';
            t.textContent = title;
            var b = document.createElement('div');
            b.textContent = body;
            card.appendChild(t);
            card.appendChild(b);
            h.appendChild(card);
            window.setTimeout(function () {
                try { card.style.opacity = '0'; } catch (e) { /* ignore */ }
            }, DISMISS_MS - 800);
            window.setTimeout(function () {
                try { if (card.parentNode) card.parentNode.removeChild(card); } catch (e) { /* ignore */ }
            }, DISMISS_MS);
        } catch (e) { /* cosmetic only */ }
    }

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pickPraise() {
        try { return KID_PRAISE[(Math.random() * KID_PRAISE.length) | 0]; } catch (e) { return KID_PRAISE[0]; }
    }

    // pickFor(ctx): data-driven event pick honoring mode gates. Returns
    // { kind, ref, mode } or null when the data module is absent.
    function pickFor(ctx) {
        try {
            var D = data();
            if (!D) return null;
            var mode = (ctx && ctx.mode) ? ctx.mode : resolveMode();
            var seed = (ctx && typeof ctx.seed === 'number') ? ctx.seed : 1;
            var ev = null;
            try {
                if (typeof D.nextEvent === 'function') ev = D.nextEvent(ctx);
            } catch (e) { ev = null; }
            if (!ev || !ev.ref) {
                var q = pick(gatedList(D.SIDEQUESTS, mode), seed);
                ev = q ? { kind: 'quest', ref: q } : null;
            }
            if (ev && ev.ref) {
                if (ev.ref.drugsAdultOnly && mode !== 'all') {
                    var fb = pick(gatedList(D.SIDEQUESTS, mode), seed + 7);
                    ev = fb ? { kind: 'quest', ref: fb } : null;
                } else if (ev.ref.goreAdultOnly && mode === 'kid') {
                    var fb2 = pick(gatedList(D.NPCS, mode), seed + 13);
                    ev = fb2 ? { kind: 'npc', ref: fb2 } : null;
                }
            }
            if (!ev) return null;
            ev.mode = mode;
            return ev;
        } catch (e) { return null; }
    }

    function render(ev, ctx) {
        try {
            var mode = ev.mode || 'teen';
            var ref = ev.ref || {};
            if (ev.kind === 'npc') {
                var line = '';
                try {
                    var D = data();
                    line = (D && typeof D.dialogueFor === 'function')
                        ? D.dialogueFor(ref.id, { kills: ctx.kills, gold: ctx.gold, floor: ctx.floor, mode: mode })
                        : '';
                } catch (e) { line = ''; }
                var who = (ref.emoji ? ref.emoji + ' ' : '') + (ref.name || 'Wanderer');
                if (mode === 'kid') toast('✨ ' + who + ' — ' + pickPraise(), line || 'Stay sparkly, hero!');
                else toast('🌙 ' + who, line || (ref.role || 'A stranger nods at you.'));
            } else if (ev.kind === 'activity') {
                var rule = ref.rule || ref.objective || 'Something glimmers in the dark.';
                if (mode === 'kid') toast('🌈 SIDE SPARKLE — ' + (ref.title || 'Activity'), rule);
                else toast('🎲 SIDE ACTIVITY — ' + (ref.title || 'Activity'), rule);
            } else {
                var obj = ref.objective || ref.rule || 'A new task surfaces from the dark.';
                var giver = ref.giver ? ' — ' + ref.giver : '';
                if (mode === 'kid') toast('🌈 SIDE SPARKLE — ' + (ref.title || 'Quest') + ' ' + pickPraise(), obj + giver);
                else toast('📜 SIDE QUEST — ' + (ref.title || 'Quest'), obj + giver);
            }
        } catch (e) { /* cosmetic only */ }
    }

    var lastFire = 0;
    function maybeTrigger() {
        try {
            var now = Date.now();
            if (now - lastFire < POLL_MS) return false;
            var ctx = liveCtx();
            // Only in real runs: endless mode or floor 3+ (dormant in menus).
            if (!ctx.active) return false;
            if (!(ctx.floor >= 3)) {
                try {
                    var g = window.GraveGainGame || null;
                    var endless = g && (g.endless === true || g.mode === 'endless');
                    if (!endless) return false;
                } catch (e) { return false; }
            }
            var c2 = { floor: ctx.floor, kills: ctx.kills, gold: ctx.gold, seed: (ctx.seed + rnd(0, 999)) | 0, mode: resolveMode() };
            var ev = pickFor(c2);
            if (!ev) return false;
            lastFire = now;
            render(ev, c2);
            return true;
        } catch (e) { return false; }
    }

    function boot() {
        try {
            window.addEventListener('fourweird-content-mode', function () {
                try { lastFire = 0; } catch (e) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }
        try {
            window.setInterval(function () {
                try { maybeTrigger(); } catch (e) { /* never break host */ }
            }, POLL_MS);
        } catch (e) { /* ignore */ }
    }

    try {
        window.GraveGainEmergentToasts = {
            VERSION: VERSION,
            resolveMode: resolveMode,
            maybeTrigger: maybeTrigger,
            pickFor: pickFor
        };
    } catch (e) { /* window unwritable */ }

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (e) { try { boot(); } catch (ignored) { /* ignore */ } }
})();
