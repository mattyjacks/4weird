/* GraveGain random emergent-event scheduler (lane E13, v2-native).
 * Vanilla IIFE, idempotent, no imports. Games load via script tags.
 * Polls window.GraveGainGame (gravegain2d/gravegain3d) and window.GraveGain1D
 * (gravegain1d) for floor/depth; degrades gracefully when absent.
 * Effects are advisory-only modifier flags + banners: never touches engine
 * internals, never rewrites input/storage, single DOM overlay node max.
 * Mode contract: ?content=kid|teen|all > localStorage
 * 4weird-content-mode:<slug> / FourweirdContentMode > window.FourweirdContentMode
 * > fourweird-content-mode CustomEvent. Kid band gets cozy copies
 * (rainbow moon instead of blood moon); drugs never appear in any band.
 */
(function () {
    'use strict';
    if (window.GraveGainEvents) return;

    var VERSION = '1.0.0';
    var TICK_MS = 4000;
    var QUIET_MS = 45000;

    function slug() {
        try {
            if (document && document.body && document.body.getAttribute) {
                var s = document.body.getAttribute('data-slug');
                if (s) return String(s);
            }
        } catch (e) { /* ignore */ }
        try {
            var p = String(location.pathname || '');
            if (p.indexOf('gravegain1d') !== -1) return 'gravegain1d';
            if (p.indexOf('gravegain2d') !== -1) return 'gravegain2d';
            if (p.indexOf('gravegain3d') !== -1) return 'gravegain3d';
        } catch (e) { /* ignore */ }
        return 'gravegain3d';
    }

    function normMode(v) {
        v = String(v == null ? '' : v).toLowerCase();
        if (v === 'kid' || v === 'teen' || v === 'all') return v;
        return '';
    }

    function getMode() {
        try {
            var q = new URLSearchParams(location.search).get('content');
            var m = normMode(q);
            if (m) return m;
        } catch (e) { /* ignore */ }
        try {
            var keys = ['4weird-content-mode:' + slug(), 'FourweirdContentMode'];
            for (var i = 0; i < keys.length; i++) {
                var v = normMode(localStorage.getItem(keys[i]));
                if (v) return v;
            }
        } catch (e) { /* ignore */ }
        try {
            var g = window.FourweirdContentMode;
            if (g) {
                var m2 = normMode(g.mode);
                if (m2) return m2;
            }
        } catch (e) { /* ignore */ }
        return 'teen';
    }

    /* Floor probing across the three runtimes. Unknown shape -> floor 1. */
    function num(v, dflt) {
        var n = Math.floor(Number(v));
        if (!isFinite(n) || n < 1) return dflt;
        return n;
    }
    function probeFloor(obj, keys) {
        if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return 0;
        for (var i = 0; i < keys.length; i++) {
            try {
                var v = obj[keys[i]];
                if (typeof v === 'function') v = v.call(obj);
                var n = num(v, 0);
                if (n > 0) return n;
            } catch (e) { /* ignore */ }
        }
        return 0;
    }
    function currentFloor() {
        var f = probeFloor(window.GraveGainGame,
            ['floor', 'depth', 'level', 'dungeonFloor', 'currentFloor', 'dungeonDepth']);
        if (f > 0) return f;
        try {
            var g1 = window.GraveGain1D;
            if (g1) {
                if (typeof g1.score === 'function') {
                    var s = g1.score();
                    var sf = probeFloor(s, ['floor', 'depth', 'sector', 'level']);
                    if (sf > 0) return sf;
                } else {
                    var pf = probeFloor(g1, ['floor', 'depth', 'sector', 'level']);
                    if (pf > 0) return pf;
                }
            }
        } catch (e) { /* ignore */ }
        return 1;
    }
    function currentTheme() {
        var t = '';
        try {
            var g = window.GraveGainGame;
            if (g) t = String(g.theme || g.currentTheme || g.biome || '');
        } catch (e) { /* ignore */ }
        return t || 'stone_crypt';
    }

    /* Event table: floor-gated (minFloor), weighted, per-event cooldowns.
     * mods are advisory multipliers read via GraveGainEvents.mods(). */
    var EVENTS = [
        { id: 'blood-moon', minFloor: 2, weight: 3, cooldownMs: 180000, durationMs: 90000,
          mods: { enemyMul: 1.5, lootMul: 1.25 },
          kidMods: { enemyMul: 1.1, lootMul: 1.25 },
          text: {
              kid: { title: '🌈 Rainbow Moon!', sub: 'Sparkles rain down! You feel brave and kind. (+25% loot)' },
              teen: { title: '🌕 Blood Moon', sub: 'The dead grow restless. Enemies hit harder, loot glitters.' },
              all: { title: '🌕 BLOOD MOON', sub: 'The moon bleeds. They come hungry — kill big, loot bigger.' } } },
        { id: 'merchant-caravan', minFloor: 1, weight: 3, cooldownMs: 150000, durationMs: 120000,
          mods: { lootMul: 1.2, shopMul: 0.8 },
          text: {
              kid: { title: '🐪 Friendly Caravan!', sub: 'Traders share snacks and shiny deals! (shops 20% off)' },
              teen: { title: '🐪 Merchant Caravan', sub: 'Traveling traders pass through. Shops 20% off, loot +20%.' },
              all: { title: '🐪 Merchant Caravan', sub: 'Black-market wagons roll in. Shops 20% off, loot +20%.' } } },
        { id: 'mimic-infestation', minFloor: 3, weight: 2, cooldownMs: 200000, durationMs: 75000,
          mods: { enemyMul: 1.3, lootMul: 1.5 },
          text: {
              kid: { title: '📦 Giggle-Box Invasion!', sub: 'Some chests are ticklish tricksters! Extra treats inside.' },
              teen: { title: '📦 Mimic Infestation', sub: 'Chests bite back. Check twice — the real ones overflow.' },
              all: { title: '📦 MIMIC INFESTATION', sub: 'Every chest is teeth. Gut them all — the guts are gold.' } } },
        { id: 'shrine-choice', minFloor: 2, weight: 2, cooldownMs: 170000, durationMs: 60000,
          mods: {}, choice: true,
          options: [
              { id: 'bless', mods: { lootMul: 1.4, enemyMul: 1.0 },
                text: { kid: 'Sing the sparkle song (+40% loot)',
                        teen: 'Offer blood (+40% loot)', all: 'Offer blood (+40% loot)' } },
              { id: 'curse', mods: { lootMul: 1.8, enemyMul: 1.4 },
                text: { kid: 'Pet the grumpy gargoyle (+80% loot, spicier foes)',
                        teen: 'Defy the altar (+80% loot, deadlier foes)',
                        all: 'Spit on the altar (+80% loot, deadlier foes)' } }
          ],
          text: {
              kid: { title: '⛩️ Giggly Shrine', sub: 'The shrine hums! Call choose("bless") or choose("curse") — auto-picks soon.' },
              teen: { title: '⛩️ Shrine Choice', sub: 'An old shrine demands a pick: bless or curse. Auto-picks soon.' },
              all: { title: '⛩️ SHRINE CHOICE', sub: 'The Array watches. Bless or curse — hesitate and it picks for you.' } } },
        { id: 'trap-surge', minFloor: 2, weight: 2, cooldownMs: 140000, durationMs: 60000,
          mods: { trapMul: 2.0, lootMul: 1.2 },
          text: {
              kid: { title: '⚙️ Tickle-Trap Surge!', sub: 'Silly traps pop everywhere! Watch your step, hero.' },
              teen: { title: '⚙️ Trap Surge', sub: 'The dungeon arms itself. Traps doubled — loot +20%.' },
              all: { title: '⚙️ TRAP SURGE', sub: 'The floor wants you dead. Traps doubled — loot +20%.' } } },
        { id: 'treasure-goblin', minFloor: 1, weight: 3, cooldownMs: 160000, durationMs: 45000,
          mods: { lootMul: 1.5 },
          text: {
              kid: { title: '👺 Giggly Goblin!', sub: 'A goblin drops candy as it runs! Catch that loot (+50%)!' },
              teen: { title: '👺 Treasure Goblin', sub: 'A goblin flees, dropping loot! Grab it all (+50%).' },
              all: { title: '👺 TREASURE GOBLIN', sub: 'Bleed the little hoarder dry! Loot +50% while it runs.' } } },
        { id: 'ghost-invasion', minFloor: 4, weight: 2, cooldownMs: 220000, durationMs: 90000,
          mods: { enemyMul: 1.6, lootMul: 1.3 },
          text: {
              kid: { title: '👻 Friendly Ghost Parade!', sub: 'Boo! The ghosts want to play. Extra-spooky, extra treats.' },
              teen: { title: '👻 Ghost Invasion', sub: 'The veil tears. Ghosts swarm — banish them for +30% loot.' },
              all: { title: '👻 GHOST INVASION', sub: 'The veil tears open. Send them back screaming — loot +30%.' } } },
        { id: 'floor-collapse', minFloor: 5, weight: 1, cooldownMs: 300000, durationMs: 90000,
          mods: { enemyMul: 1.3, trapMul: 1.5 }, countdown: true,
          text: {
              kid: { title: '⏳ Wobbly Floor!', sub: 'The floor wobbles! Keep moving, hero — 90 seconds of wobbles!' },
              teen: { title: '⏳ Floor Collapse', sub: 'The ceiling groans. 90 seconds — keep moving or get buried!' },
              all: { title: '⏳ FLOOR COLLAPSE', sub: 'The dungeon caves in. 90 seconds — move or be entombed!' } } },
        { id: 'double-loot-eclipse', minFloor: 3, weight: 2, cooldownMs: 240000, durationMs: 60000,
          mods: { lootMul: 2.0 },
          text: {
              kid: { title: '🌈 Double-Treat Eclipse!', sub: 'The sun winks! Everything drops DOUBLE treats!' },
              teen: { title: '🌒 Double-Loot Eclipse', sub: 'Shadows align. All loot DOUBLED for 60 seconds!' },
              all: { title: '🌒 DOUBLE-LOOT ECLIPSE', sub: 'The Array blinks. Strip the dungeon — loot DOUBLED!' } } },
        { id: 'npc-ambush', minFloor: 2, weight: 2, cooldownMs: 180000, durationMs: 75000,
          mods: { enemyMul: 1.4, lootMul: 1.3 },
          text: {
              kid: { title: '🗡️ Grumpy Ambush!', sub: 'Sneaky grumps jump out! Show them your brave face!' },
              teen: { title: '🗡️ NPC Ambush', sub: 'Rival delvers turn on you! Teach them manners (+30% loot).' },
              all: { title: '🗡️ NPC AMBUSH', sub: 'Rival scum want your gold. Leave them in the dirt (+30% loot).' } } },
        { id: 'grave-bloom', minFloor: 1, weight: 2, cooldownMs: 150000, durationMs: 75000,
          mods: { xpMul: 1.25, lootMul: 1.15 },
          text: {
              kid: { title: '🌸 Grave Bloom!', sub: 'Flowers burst from the stones! You feel stronger (+25% XP)!' },
              teen: { title: '🌸 Grave Bloom', sub: 'Pale flowers drink the dark. You feel stronger (+25% XP).' },
              all: { title: '🌸 GRAVE BLOOM', sub: 'The dead feed the flowers. Breathe deep — power +25% XP.' } } },
        { id: 'echo-storm', minFloor: 6, weight: 1, cooldownMs: 300000, durationMs: 60000,
          mods: { enemyMul: 1.5, lootMul: 1.5, trapMul: 1.5 },
          text: {
              kid: { title: '🌪️ Giggle Storm!', sub: 'Echoes tickle the halls! Everything is extra for 60 seconds!' },
              teen: { title: '🌪️ Echo Storm', sub: 'The dungeon echoes itself. Everything intensifies for 60s.' },
              all: { title: '🌪️ ECHO STORM', sub: 'Reality stutters. Everything hits harder — and pays harder.' } } }
    ];

    function byId(id) {
        for (var i = 0; i < EVENTS.length; i++) {
            if (EVENTS[i].id === id) return EVENTS[i];
        }
        return null;
    }

    var state = {
        running: false,
        timer: null,
        lastAny: 0,
        lastFire: {},
        active: [],
        pendingChoice: null,
        collapseWarned: {}
    };

    function now() {
        return Date.now();
    }

    function pruneActive() {
        var t = now();
        var kept = [];
        var i, a;
        for (i = 0; i < state.active.length; i++) {
            a = state.active[i];
            if (a.endsAt > t) kept.push(a);
            else {
                removeTint(a.eventId);
                state.collapseWarned[a.eventId] = false;
            }
        }
        state.active = kept;
        if (state.pendingChoice && state.pendingChoice.resolveAt <= t) {
            resolveChoice(null);
        }
    }

    function isActive(id) {
        pruneActive();
        for (var i = 0; i < state.active.length; i++) {
            if (state.active[i].eventId === id) return true;
        }
        return false;
    }

    function eligible(floor) {
        var t = now();
        var out = [];
        for (var i = 0; i < EVENTS.length; i++) {
            var e = EVENTS[i];
            if (floor < e.minFloor) continue;
            if (isActive(e.id)) continue;
            var last = state.lastFire[e.id] || 0;
            if (t - last < e.cooldownMs) continue;
            out.push(e);
        }
        return out;
    }

    function pickWeighted(list, floor) {
        var total = 0;
        var weights = [];
        var i;
        for (i = 0; i < list.length; i++) {
            var w = list[i].weight * (1 + 0.15 * Math.max(0, floor - list[i].minFloor));
            weights.push(w);
            total += w;
        }
        if (total <= 0) return null;
        var r = Math.random() * total;
        for (i = 0; i < list.length; i++) {
            r -= weights[i];
            if (r <= 0) return list[i];
        }
        return list[list.length - 1];
    }

    function modsFor(def, mode) {
        if (mode === 'kid' && def.kidMods) return def.kidMods;
        return def.mods || {};
    }

    function fire(def, floor, opts) {
        opts = opts || {};
        var t = now();
        var mode = getMode();
        var entry = {
            eventId: def.id,
            floor: floor,
            theme: currentTheme(),
            startedAt: t,
            endsAt: t + (def.durationMs || 60000),
            mods: modsFor(def, mode)
        };
        state.active.push(entry);
        state.lastFire[def.id] = t;
        state.lastAny = t;
        var copy = (def.text && (def.text[mode] || def.text.teen)) || { title: def.id, sub: '' };
        if (def.choice && !opts.skipChoice) {
            state.pendingChoice = {
                eventId: def.id,
                resolveAt: t + 20000,
                options: def.options
            };
        }
        if (def.id === 'blood-moon') applyTint(mode);
        announce(copy.title, copy.sub);
        emit(def, entry, mode);
        if (def.countdown) state.collapseWarned[def.id] = false;
        return entry;
    }

    function maybeCollapseWarn() {
        var t = now();
        for (var i = 0; i < state.active.length; i++) {
            var a = state.active[i];
            var def = byId(a.eventId);
            if (!def || !def.countdown) continue;
            if (!state.collapseWarned[a.eventId] && a.endsAt - t < (def.durationMs || 90000) / 2) {
                state.collapseWarned[a.eventId] = true;
                var mode = getMode();
                announce(mode === 'kid' ? '⏳ Still wobbling!' : '⏳ HALFWAY DOWN',
                    mode === 'kid' ? 'Keep wiggling, hero!' : 'The dust falls faster. Move!');
            }
        }
    }

    function resolveChoice(optionId) {
        var p = state.pendingChoice;
        if (!p) return null;
        state.pendingChoice = null;
        var def = byId(p.eventId);
        if (!def) return null;
        var opt = null;
        var i;
        if (optionId) {
            for (i = 0; i < (def.options || []).length; i++) {
                if (def.options[i].id === optionId) opt = def.options[i];
            }
        }
        if (!opt) opt = (def.options || [])[Math.floor(Math.random() * (def.options || []).length)] || null;
        if (!opt) return null;
        var mode = getMode();
        for (i = 0; i < state.active.length; i++) {
            if (state.active[i].eventId === p.eventId) {
                state.active[i].mods = Object.assign({}, state.active[i].mods, opt.mods);
            }
        }
        var label = (opt.text && (opt.text[mode] || opt.text.teen)) || opt.id;
        announce(mode === 'kid' ? '✨ Shrine giggles!' : '⛩️ Shrine answers', String(label));
        return opt.id;
    }

    function tick() {
        if (state.running === false) return;
        try {
            if (typeof document !== 'undefined' && document.hidden) return;
        } catch (e) { /* ignore */ }
        pruneActive();
        maybeCollapseWarn();
        var t = now();
        if (t - state.lastAny < QUIET_MS && !force._allowQuiet) return;
        var floor = currentFloor();
        var list = eligible(floor);
        if (!list.length) return;
        var p = 0.22 + 0.02 * Math.min(10, floor);
        if (Math.random() < p) {
            var def = pickWeighted(list, floor);
            if (def) fire(def, floor);
        }
    }

    /* Banner: each game's HUD when present, else a DOM overlay. */
    var overlayEl = null;
    var overlayTimer = null;

    function tryHud(title, sub) {
        var cands = [];
        try {
            if (window.GraveGainGame) {
                cands.push(window.GraveGainGame);
                if (window.GraveGainGame.hud) cands.push(window.GraveGainGame.hud);
                if (window.GraveGainGame.ui) cands.push(window.GraveGainGame.ui);
            }
            if (window.GraveGain1D) cands.push(window.GraveGain1D);
        } catch (e) { /* ignore */ }
        var methods = ['announce', 'banner', 'toast', 'showBanner', 'pushToast', 'notify'];
        for (var i = 0; i < cands.length; i++) {
            for (var j = 0; j < methods.length; j++) {
                try {
                    var fn = cands[i][methods[j]];
                    if (typeof fn === 'function') {
                        fn.call(cands[i], title, sub);
                        return true;
                    }
                } catch (e) { /* ignore */ }
            }
        }
        return false;
    }

    function domBanner(title, sub) {
        try {
            if (!document || !document.body) return false;
            if (!overlayEl) {
                overlayEl = document.createElement('div');
                overlayEl.setAttribute('data-ggevents-banner', '1');
                overlayEl.style.cssText = 'position:fixed;top:12%;left:50%;transform:translateX(-50%);' +
                    'z-index:2147483000;pointer-events:none;text-align:center;' +
                    'background:rgba(10,8,20,.88);border:1px solid #a78bfa;border-radius:10px;' +
                    'padding:10px 18px;max-width:min(88vw,520px);' +
                    'font-family:system-ui,sans-serif;color:#f5f3ff;';
                document.body.appendChild(overlayEl);
            }
            while (overlayEl.firstChild) overlayEl.removeChild(overlayEl.firstChild);
            var h = document.createElement('div');
            h.style.cssText = 'font-weight:700;font-size:1.05rem;margin-bottom:2px;';
            h.textContent = String(title);
            var p = document.createElement('div');
            p.style.cssText = 'font-size:.82rem;opacity:.9;';
            p.textContent = String(sub || '');
            overlayEl.appendChild(h);
            overlayEl.appendChild(p);
            overlayEl.style.display = 'block';
            if (overlayTimer) { try { clearTimeout(overlayTimer); } catch (e) { /* ignore */ } }
            overlayTimer = setTimeout(function () {
                try { if (overlayEl) overlayEl.style.display = 'none'; } catch (e) { /* ignore */ }
            }, 6000);
            return true;
        } catch (e) { return false; }
    }

    function announce(title, sub) {
        if (tryHud(title, sub)) return;
        domBanner(title, sub);
    }

    var tintEl = null;
    function applyTint(mode) {
        try {
            if (!document || !document.body) return;
            removeTint('blood-moon');
            tintEl = document.createElement('div');
            tintEl.setAttribute('data-ggevents-tint', 'blood-moon');
            var bg = mode === 'kid'
                ? 'linear-gradient(180deg,rgba(255,0,128,.10),rgba(255,215,0,.10),rgba(0,255,255,.10))'
                : 'radial-gradient(ellipse at center,rgba(255,0,0,.06) 0%,rgba(180,0,0,.20) 100%)';
            tintEl.style.cssText = 'position:fixed;inset:0;z-index:2147482999;' +
                'pointer-events:none;background:' + bg + ';';
            document.body.appendChild(tintEl);
        } catch (e) { /* ignore */ }
    }
    function removeTint() {
        try {
            if (tintEl && tintEl.parentNode) tintEl.parentNode.removeChild(tintEl);
        } catch (e) { /* ignore */ }
        tintEl = null;
    }

    function emit(def, entry, mode) {
        try {
            var ev;
            var detail = { id: def.id, floor: entry.floor, theme: entry.theme, mode: mode, mods: entry.mods };
            if (typeof CustomEvent === 'function') {
                ev = new CustomEvent('gravegain-event', { detail: detail });
            } else {
                ev = document.createEvent('CustomEvent');
                ev.initCustomEvent('gravegain-event', false, false, detail);
            }
            window.dispatchEvent(ev);
        } catch (e) { /* ignore */ }
    }

    function combineMods() {
        pruneActive();
        var out = { lootMul: 1, enemyMul: 1, trapMul: 1, xpMul: 1, shopMul: 1 };
        for (var i = 0; i < state.active.length; i++) {
            var m = state.active[i].mods || {};
            for (var k in m) {
                if (Object.prototype.hasOwnProperty.call(out, k) && isFinite(Number(m[k]))) {
                    out[k] = out[k] * Number(m[k]);
                }
            }
        }
        return out;
    }

    function start() {
        if (state.running) return true;
        state.running = true;
        state.lastAny = now();
        try {
            state.timer = setInterval(tick, TICK_MS);
        } catch (e) { state.timer = null; }
        try {
            if (typeof window.FourweirdContentMode === 'undefined') {
                window.FourweirdContentMode = { mode: getMode(), goreEnabled: false, drugsAllowed: false };
            }
        } catch (e) { /* ignore */ }
        return true;
    }

    function stop() {
        state.running = false;
        try { if (state.timer) clearInterval(state.timer); } catch (e) { /* ignore */ }
        state.timer = null;
        return true;
    }

    function force(id) {
        var def = byId(String(id || ''));
        if (!def) return null;
        force._allowQuiet = true;
        var entry = null;
        try {
            entry = fire(def, currentFloor());
        } finally {
            force._allowQuiet = false;
        }
        return entry;
    }
    force._allowQuiet = false;

    function list() {
        var out = [];
        for (var i = 0; i < EVENTS.length; i++) {
            out.push({
                id: EVENTS[i].id, minFloor: EVENTS[i].minFloor,
                weight: EVENTS[i].weight, cooldownMs: EVENTS[i].cooldownMs,
                durationMs: EVENTS[i].durationMs
            });
        }
        return out;
    }

    function active() {
        pruneActive();
        return state.active.map(function (a) {
            return { eventId: a.eventId, floor: a.floor, endsInMs: Math.max(0, a.endsAt - now()), mods: a.mods };
        });
    }

    var api = {
        VERSION: VERSION,
        events: EVENTS,
        force: force,
        choose: resolveChoice,
        list: list,
        active: active,
        mods: combineMods,
        getMode: getMode,
        floor: currentFloor,
        start: start,
        stop: stop
    };

    window.GraveGainEvents = api;

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain-events', version: VERSION, init: start });
    } catch (e) { /* ignore */ }

    try {
        if (document && document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    } catch (e) {
        try { start(); } catch (ignored) { /* ignore */ }
    }
})();
