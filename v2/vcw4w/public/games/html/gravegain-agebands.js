/* =========================================================================
 * gravegain-agebands.js — G7 single age-band director (gravegain3d/2d/1d)
 * -------------------------------------------------------------------------
 * Vanilla JS, idempotent, no imports. Loads via script tag BEFORE the gore
 * overlays (gore-gravegain3d.js, gore-gravegain2d.js) so the bands are set
 * before any kill FX or item text resolves.
 *
 * Mode contract (mirrors sibling overlays):
 *   ?content=kid|teen|all  >  localStorage "4weird-content-mode:<slug>"
 *   ("gravegain3d" | "gravegain2d" | "gravegain1d")  >  localStorage
 *   "FourweirdContentMode" (plain or {mode} JSON)  >
 *   window.FourweirdContentMode.mode  >  default "teen".
 * Publishes window.FourweirdContentMode = { mode, goreEnabled, drugsAllowed }
 * and dispatches a "fourweird-content-mode" CustomEvent on every set.
 *
 * Bands (fail-closed: unknown mode behaves as teen, never as adult):
 *   kid : ZERO blood. All kill FX rerouted to rainbow sparkles + praise
 *         words. Drug-named items/dialogue renamed to candy/juice.
 *   teen: blood yes, capped; NO gibs / decals / dismember. Drugs renamed.
 *   all : full gore passthrough + drugsAllowed=true. Restores originals.
 *
 * Exposes window.GraveGainAgeBands { getMode, setMode, isDrugsAllowed,
 * isGoreFull, VERSION (+ helpers) } and pushes to window.GraveGainMods.
 * ========================================================================= */
(function () {
    'use strict';
    if (window.GraveGainAgeBands) return; // idempotent

    var VERSION = '1.0.0';
    var MODES = { kid: 1, teen: 1, all: 1 };
    var DEFAULT_MODE = 'teen';
    var SLUGS = ['gravegain3d', 'gravegain2d', 'gravegain1d'];
    var LS_PREFIX = '4weird-content-mode:';
    var LS_LEGACY = 'FourweirdContentMode';
    var EVENT_NAME = 'fourweird-content-mode';

    var KID_PRAISE = [
        'NICE!', 'POOF!', '+100 BRAVE!', 'SPARKLE DOWN!',
        'GENTLE TAP!', 'NAP TIME!', 'RAINBOW!'
    ];
    var RAINBOW = ['#ffd54a', '#ff6b6b', '#4ecdc4', '#a78bfa', '#86efac', '#f9a8d4', '#ffffff'];

    // Drug-word reskin table. Applied to kid AND teen (drugs ONLY on all).
    // Each entry: [regex, kidReplacement, teenReplacement].
    var DRUG_WORDS = [
        [/magic\s*mushrooms?/gi, 'Yummy Candy Caps', 'Trail Mushrooms (Culinary)'],
        [/mushrooms?/gi, 'candy caps', 'mushrooms (culinary)'],
        [/shrooms?/gi, 'candy caps', 'trail caps'],
        [/psilocybin|mycelium|mycel/gi, 'sparkle sprout', 'grove sprout'],
        [/mana\s*potions?/gi, 'Berry Juice', 'Mana Juice'],
        [/health\s*potions?/gi, 'Berry Juice', 'Healing Juice'],
        [/healing\s*potions?/gi, 'Berry Juice', 'Healing Juice'],
        [/potions?/gi, 'juice', 'juice'],
        [/\belixirs?\b/gi, 'juice', 'juice'],
        [/\btonics?\b/gi, 'juice', 'juice'],
        [/\bbrews?\b/gi, 'fizz', 'fizz'],
        [/\bbrewery\b/gi, 'fizz house', 'fizz house'],
        [/\bherbs?\b/gi, 'spice leaves', 'spice leaves'],
        [/\bsmoke\b/gi, 'mist', 'mist'],
        [/\bsmoking\b/gi, 'misting', 'misting'],
        [/\bcannabis\b|\bweed\b|\bmarijuana\b|\bganja\b|\bhash\b/gi, 'sparkle herb', 'grove herb'],
        [/\bdrug(s)?\b/gi, 'candy', 'remedy']
    ];

    var state = { mode: DEFAULT_MODE };
    var backup = {}; // key -> original string, for restore on "all"
    var backupCount = 0;
    var MAX_BACKUPS = 500;
    var fxLayer = null;
    var fxCount = 0;

    function isValidMode(m) {
        try { return !!MODES[String(m).toLowerCase().trim()]; } catch (_) { return false; }
    }

    function normMode(v) {
        try {
            if (v === undefined || v === null) return null;
            var s = String(v).trim();
            if (!s) return null;
            if (s.charAt(0) === '{') {
                try {
                    var o = JSON.parse(s);
                    if (o && o.mode) return normMode(o.mode);
                } catch (_) { return null; }
            }
            s = s.toLowerCase();
            return MODES[s] ? s : null;
        } catch (_) { return null; }
    }

    function readLsKey(key) {
        try {
            var raw = window.localStorage.getItem(key);
            return normMode(raw);
        } catch (_) { return null; }
    }

    function resolveMode() {
        try {
            var q = new URLSearchParams(window.location.search).get('content');
            var m = normMode(q);
            if (m) return m;
        } catch (_) {}
        try {
            if (window.localStorage) {
                for (var i = 0; i < SLUGS.length; i++) {
                    var sm = readLsKey(LS_PREFIX + SLUGS[i]);
                    if (sm) return sm;
                }
                var leg = readLsKey(LS_LEGACY);
                if (leg) return leg;
            }
        } catch (_) {}
        try {
            if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                var g = normMode(window.FourweirdContentMode.mode);
                if (g) return g;
            }
        } catch (_) {}
        return DEFAULT_MODE;
    }

    function getMode() {
        try { return MODES[state.mode] ? state.mode : DEFAULT_MODE; }
        catch (_) { return DEFAULT_MODE; }
    }

    // Fail-closed: drugs ONLY on explicit "all".
    function isDrugsAllowed() {
        try { return getMode() === 'all'; } catch (_) { return false; }
    }

    // Fail-closed: full gore ONLY on explicit "all".
    function isGoreFull() {
        try { return getMode() === 'all'; } catch (_) { return false; }
    }

    function isBloodAllowed() {
        try { return getMode() !== 'kid'; } catch (_) { return true; }
    }

    function isGibAllowed() {
        try { return getMode() === 'all'; } catch (_) { return false; }
    }

    function praise() {
        try { return KID_PRAISE[(Math.random() * KID_PRAISE.length) | 0]; }
        catch (_) { return 'NICE!'; }
    }

    function publishMode() {
        try {
            window.FourweirdContentMode = {
                mode: state.mode,
                goreEnabled: state.mode !== 'kid',
                drugsAllowed: state.mode === 'all'
            };
        } catch (_) {}
        try {
            var ev;
            var detail = {
                mode: state.mode,
                goreEnabled: state.mode !== 'kid',
                drugsAllowed: state.mode === 'all'
            };
            if (typeof window.CustomEvent === 'function') {
                ev = new window.CustomEvent(EVENT_NAME, { detail: detail });
            } else {
                ev = window.document.createEvent('CustomEvent');
                ev.initCustomEvent(EVENT_NAME, false, false, detail);
            }
            window.dispatchEvent(ev);
        } catch (_) {}
    }

    function setMode(m) {
        var n = normMode(m);
        if (!n) return false; // fail-closed: reject garbage, keep current
        state.mode = n;
        try {
            if (window.localStorage) {
                for (var i = 0; i < SLUGS.length; i++) {
                    try { window.localStorage.setItem(LS_PREFIX + SLUGS[i], n); } catch (_) {}
                }
                try { window.localStorage.setItem(LS_LEGACY, n); } catch (_) {}
            }
        } catch (_) {}
        publishMode();
        try { reskinAll(); } catch (_) {}
        return true;
    }

    function sanitizeString(s, mode) {
        try {
            if (typeof s !== 'string' || !s) return s;
            var teen = mode === 'teen';
            var out = s;
            for (var i = 0; i < DRUG_WORDS.length; i++) {
                var e = DRUG_WORDS[i];
                e[0].lastIndex = 0;
                out = out.replace(e[0], teen ? e[2] : e[1]);
            }
            return out;
        } catch (_) { return s; }
    }

    function remember(key, original) {
        try {
            if (backupCount >= MAX_BACKUPS) return;
            if (!Object.prototype.hasOwnProperty.call(backup, key)) {
                backup[key] = original;
                backupCount++;
            }
        } catch (_) {}
    }

    // Patch display-string fields of a game-data object in place.
    function patchDisplayObject(obj, keyPrefix) {
        try {
            if (!obj || typeof obj !== 'object') return;
            var FIELDS = ['name', 'displayName', 'label', 'title', 'desc', 'description', 'content'];
            for (var f = 0; f < FIELDS.length; f++) {
                var field = FIELDS[f];
                var val = null;
                try { val = obj[field]; } catch (_) { continue; }
                if (typeof val !== 'string' || !val) continue;
                var bkey = keyPrefix + '.' + field;
                if (isDrugsAllowed()) {
                    if (Object.prototype.hasOwnProperty.call(backup, bkey)) {
                        try { obj[field] = backup[bkey]; } catch (_) {}
                        try { delete backup[bkey]; backupCount--; } catch (_) {}
                    }
                } else {
                    var clean = sanitizeString(val, getMode());
                    if (clean !== val) {
                        remember(bkey, val);
                        try { obj[field] = clean; } catch (_) {}
                    }
                }
            }
        } catch (_) {}
    }

    function eachIn(container, fn) {
        try {
            if (!container) return;
            if (Object.prototype.toString.call(container) === '[object Array]') {
                for (var i = 0; i < container.length; i++) {
                    try { fn(container[i], i); } catch (_) {}
                }
            } else if (typeof container === 'object') {
                var keys = null;
                try { keys = Object.keys(container); } catch (_) { return; }
                for (var j = 0; j < keys.length; j++) {
                    try { fn(container[keys[j]], keys[j]); } catch (_) {}
                }
            }
        } catch (_) {}
    }

    function reskinDataObjects() {
        try {
            var mode = getMode();
            var slug = null;
            try {
                var gs = [window.GraveGainGameData, window.GameData, window.GRAVEGAIN_DATA];
                for (var g = 0; g < gs.length; g++) {
                    var gd = gs[g];
                    if (!gd || typeof gd !== 'object') continue;
                    eachIn(gd.BotanySeeds, function (s, k) { patchDisplayObject(s, 'seed.' + String(k)); });
                    eachIn(gd.Seeds, function (s, k) { patchDisplayObject(s, 'seed.' + String(k)); });
                    eachIn(gd.Items, function (s, k) { patchDisplayObject(s, 'item.' + String(k)); });
                    eachIn(gd.Loot, function (s, k) { patchDisplayObject(s, 'loot.' + String(k)); });
                    eachIn(gd.Weapons, function (s, k) { patchDisplayObject(s, 'weapon.' + String(k)); });
                }
            } catch (_) {}
            // Lore database entries (gravegain3d/lore.js, gravegain2d/lore.js).
            try {
                var lores = [window.LoreDatabase, window.GraveGainLore];
                for (var l = 0; l < lores.length; l++) {
                    (function (ldb) {
                        if (!ldb || typeof ldb !== 'object') return;
                        eachIn(ldb, function (entry, k) {
                            if (!entry || typeof entry !== 'object') return;
                            patchDisplayObject(entry, 'lore.' + String(k));
                        });
                    })(lores[l]);
                }
            } catch (_) {}
            // Live loot instances on a running game (3D LootItem type/name).
            try {
                var games = [window.GraveGainGame, window.gg];
                for (var gi = 0; gi < games.length; gi++) {
                    var game = games[gi];
                    if (!game) continue;
                    if (isDrugsAllowed()) continue; // adult: leave live loot alone
                    eachIn(game.loot, function (it) {
                        try {
                            if (it && typeof it.type === 'string' && /potion|elixir|tonic|brew|herb|mushroom/i.test(it.type)) {
                                if (!it.__agebandsTagged) {
                                    it.__agebandsTagged = true;
                                    try { it.label = sanitizeString(it.label || it.type, mode); } catch (_) {}
                                }
                            }
                        } catch (_) {}
                    });
                }
            } catch (_) {}
            void slug;
        } catch (_) {}
    }

    function reskinDom() {
        try {
            var disallowed = !isDrugsAllowed();
            // Hide explicitly tagged drug nodes when not adult.
            try {
                if (window.document && window.document.querySelectorAll) {
                    var tagged = window.document.querySelectorAll('[data-drug]');
                    for (var i = 0; i < tagged.length; i++) {
                        var el = tagged[i];
                        try {
                            if (disallowed) {
                                if (!el.hasAttribute('data-agebands-hidden')) {
                                    el.setAttribute('data-agebands-hidden', el.style.display || '');
                                }
                                el.style.display = 'none';
                            } else if (el.hasAttribute('data-agebands-hidden')) {
                                el.style.display = el.getAttribute('data-agebands-hidden') || '';
                                el.removeAttribute('data-agebands-hidden');
                            }
                        } catch (_) {}
                    }
                }
            } catch (_) {}
            if (!disallowed) return; // adult: no text scrubbing
            // Text-node sweep: rename drug words in visible dialogue/labels.
            try {
                if (!window.document || !window.document.createTreeWalker) return;
                var mode = getMode();
                var walker = window.document.createTreeWalker(
                    window.document.body,
                    window.NodeFilter.SHOW_TEXT,
                    null
                );
                var node = null;
                var budget = 400;
                var test = /potion|elixir|herb|brew|mushroom|shroom|tonic|smoke|cannabis|weed|marijuana|ganja|psilocybin|mycel/i;
                while (budget-- > 0) {
                    try { node = walker.nextNode(); } catch (_) { break; }
                    if (!node) break;
                    try {
                        var t = node.nodeValue;
                        if (!t || t.length > 2000 || !test.test(t)) continue;
                        var parent = node.parentNode;
                        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) continue;
                        test.lastIndex = 0;
                        var clean = sanitizeString(t, mode);
                        if (clean !== t) node.nodeValue = clean;
                    } catch (_) {}
                }
            } catch (_) {}
        } catch (_) {}
    }

    function reskinAll() {
        try { reskinDataObjects(); } catch (_) {}
        try { reskinDom(); } catch (_) {}
    }

    // -- kid sparkle FX (DOM overlay, works for 1D/2D/3D) ----------------------
    function ensureFxLayer() {
        try {
            if (fxLayer && window.document.body.contains(fxLayer)) return fxLayer;
            var host = window.document.getElementById('canvasContainer') || window.document.body;
            var layer = window.document.createElement('div');
            layer.id = 'gg-agebands-fx';
            layer.setAttribute('aria-hidden', 'true');
            layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:6000;';
            try {
                var cs = window.getComputedStyle ? window.getComputedStyle(host) : null;
                if (host !== window.document.body && cs && cs.position === 'static') {
                    host.style.position = 'relative';
                }
            } catch (_) {}
            host.appendChild(layer);
            fxLayer = layer;
            return fxLayer;
        } catch (_) { return null; }
    }

    function pick(arr) {
        try { return arr[(Math.random() * arr.length) | 0]; } catch (_) { return arr[0]; }
    }

    function sparkleBurst(vpx, vpy) {
        try {
            var layer = ensureFxLayer();
            if (!layer) return;
            var lr = layer.getBoundingClientRect();
            var x = (typeof vpx === 'number' ? vpx : window.innerWidth / 2) - lr.left;
            var y = (typeof vpy === 'number' ? vpy : window.innerHeight * 0.42) - lr.top;
            for (var i = 0; i < 14; i++) {
                if (fxCount > 120) break; // perf cap
                var s = window.document.createElement('div');
                var size = 3 + Math.random() * 5;
                var dx = (Math.random() * 2 - 1) * 70;
                var dy = -20 - Math.random() * 70;
                s.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;' +
                    'width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
                    'background:' + pick(RAINBOW) + ';opacity:0.95;pointer-events:none;' +
                    'transition:left 0.6s ease-out,top 0.6s ease-out,opacity 0.6s;';
                layer.appendChild(s);
                fxCount++;
                (function (el, ddx, ddy) {
                    window.requestAnimationFrame(function () {
                        try {
                            el.style.left = (x + ddx) + 'px';
                            el.style.top = (y + ddy) + 'px';
                            el.style.opacity = '0';
                        } catch (_) {}
                    });
                    window.setTimeout(function () {
                        try { if (el.parentNode) el.parentNode.removeChild(el); } catch (_) {}
                        try { fxCount = Math.max(0, fxCount - 1); } catch (_) {}
                    }, 750);
                })(s, dx, dy);
            }
            var f = window.document.createElement('div');
            f.textContent = praise();
            f.style.cssText = 'position:absolute;left:' + x + 'px;top:' + (y - 20) + 'px;' +
                'transform:translate(-50%,-100%);font-weight:800;font-size:20px;' +
                'color:#ffe9a3;text-shadow:0 2px 6px rgba(0,0,0,0.8);pointer-events:none;' +
                'transition:top 0.9s ease-out,opacity 0.9s;';
            layer.appendChild(f);
            window.requestAnimationFrame(function () {
                try { f.style.top = (y - 66) + 'px'; f.style.opacity = '0'; } catch (_) {}
            });
            window.setTimeout(function () {
                try { if (f.parentNode) f.parentNode.removeChild(f); } catch (_) {}
            }, 1000);
        } catch (_) {}
    }

    // Clamp teen gore opts: strip gibs/decals/dismember/heavy, cap counts.
    function clampTeenOpts(opts) {
        try {
            if (opts === undefined || opts === null) return opts;
            if (typeof opts === 'number') return Math.min(opts, 3);
            if (typeof opts !== 'object') return opts;
            var out = {};
            for (var k in opts) {
                try { if (Object.prototype.hasOwnProperty.call(opts, k)) out[k] = opts[k]; } catch (_) {}
            }
            out.gibs = false; out.gib = false; out.decals = false; out.decal = false;
            out.dismember = false; out.dismemberment = false; out.heavy = false;
            out.blood = true; // teen keeps capped blood
            if (typeof out.count === 'number') out.count = Math.min(out.count, 3);
            if (typeof out.kills === 'number') out.kills = Math.min(out.kills, 3);
            return out;
        } catch (_) { return opts; }
    }

    function routeKill(vpx, vpy, opts) {
        // Returns true when the director consumed the event (kid mode).
        try {
            var mode = getMode();
            if (mode === 'kid') {
                sparkleBurst(vpx, vpy);
                try {
                    window.dispatchEvent(new window.CustomEvent('fourweird-gore', {
                        detail: { game: 'gravegain', mode: 'kid', blood: false, praise: true }
                    }));
                } catch (_) {}
                return true;
            }
            if (mode === 'teen') return clampTeenOpts(opts);
            return opts; // all: full passthrough
        } catch (_) { return opts; }
    }

    function wrapGoreBus() {
        try {
            var bus = window.FourweirdGore;
            if (!bus || typeof bus.spawn !== 'function' || bus.spawn.__agebandsWrapped) return;
            var orig = bus.spawn;
            var wrapped = function (x, y, opts) {
                try {
                    var mode = getMode();
                    if (mode === 'kid') {
                        var vpx = (typeof x === 'number') ? x : undefined;
                        var vpy = (typeof y === 'number') ? y : undefined;
                        // Support legacy descriptor-object call: spawn({x,y,...}).
                        if (x && typeof x === 'object') {
                            try { vpx = typeof x.x === 'number' ? x.x : undefined; } catch (_) {}
                            try { vpy = typeof x.y === 'number' ? x.y : undefined; } catch (_) {}
                        }
                        sparkleBurst(vpx, vpy);
                        return undefined; // swallow: ZERO blood on kid
                    }
                    if (mode === 'teen') {
                        return orig.call(this, x, y, clampTeenOpts(opts));
                    }
                    return orig.call(this, x, y, opts); // all: passthrough
                } catch (_) {
                    try { return orig.call(this, x, y, opts); } catch (_) { return undefined; }
                }
            };
            wrapped.__agebandsWrapped = true;
            bus.spawn = wrapped;
        } catch (_) {}
    }

    function wrapOverlay(hookName, methods) {
        try {
            var ov = window[hookName];
            if (!ov || ov.__agebandsWrapped) return;
            var marks = 0;
            for (var i = 0; i < methods.length; i++) {
                (function (name) {
                    try {
                        var orig = ov[name];
                        if (typeof orig !== 'function' || orig.__agebandsWrapped) return;
                        var w = function () {
                            try {
                                var mode = getMode();
                                var args = Array.prototype.slice.call(arguments);
                                if (mode === 'kid') {
                                    // Reroute numeric coords when present; else center.
                                    var cx = null, cy = null;
                                    for (var a = 0; a < args.length; a++) {
                                        if (typeof args[a] === 'number') {
                                            if (cx === null) cx = args[a];
                                            else if (cy === null) { cy = args[a]; break; }
                                        }
                                    }
                                    if (cx !== null && cy !== null && cx <= 1000 && cy <= 1000) {
                                        sparkleBurst((cx / 1000) * window.innerWidth, (cy / 1000) * window.innerHeight);
                                    } else {
                                        sparkleBurst(undefined, undefined);
                                    }
                                    return undefined; // suppress blood return
                                }
                                if (mode === 'teen') {
                                    for (var b = 0; b < args.length; b++) {
                                        if (args[b] && typeof args[b] === 'object') args[b] = clampTeenOpts(args[b]);
                                        if (typeof args[b] === 'number' && b === args.length - 1) {
                                            args[b] = Math.min(args[b], 3); // cap trailing counts
                                        }
                                    }
                                    return orig.apply(this, args);
                                }
                                return orig.apply(this, args); // all: passthrough
                            } catch (_) {
                                try { return orig.apply(this, arguments); } catch (_) { return undefined; }
                            }
                        };
                        w.__agebandsWrapped = true;
                        ov[name] = w;
                        marks++;
                    } catch (_) {}
                })(methods[i]);
            }
            if (marks > 0) {
                try { ov.__agebandsWrapped = true; } catch (_) {}
            }
        } catch (_) {}
    }

    function poll() {
        try { wrapGoreBus(); } catch (_) {}
        try { wrapOverlay('GraveGain3DGore', ['spawnKill', 'onKill', 'burst']); } catch (_) {}
        try { wrapOverlay('GraveGain2DGore', ['burst', 'spawnBlood', 'spawnGore']); } catch (_) {}
        try {
            var vfx = window.GraveGainGame && window.GraveGainGame.vfx;
            if (vfx && !vfx.__agebandsWrapped) {
                (function (v) {
                    ['spawnBlood', 'spawnGore'].forEach(function (name) {
                        try {
                            var orig = v[name];
                            if (typeof orig !== 'function' || orig.__agebandsWrapped) return;
                            var w = function (x, y, color) {
                                try {
                                    if (getMode() === 'kid') {
                                        var p = null;
                                        try {
                                            var canvas = window.document.getElementById('gameCanvas');
                                            if (canvas) {
                                                var cr = canvas.getBoundingClientRect();
                                                p = { x: cr.left + cr.width / 2, y: cr.top + cr.height * 0.42 };
                                            }
                                        } catch (_) {}
                                        sparkleBurst(p ? p.x : undefined, p ? p.y : undefined);
                                        return undefined;
                                    }
                                } catch (_) {}
                                return orig.call(this, x, y, color);
                            };
                            w.__agebandsWrapped = true;
                            v[name] = w;
                        } catch (_) {}
                    });
                    try { v.__agebandsWrapped = true; } catch (_) {}
                })(vfx);
            }
        } catch (_) {}
        try { reskinAll(); } catch (_) {}
    }

    // Adopt externally broadcast modes (fail-closed: ignore invalid).
    try {
        window.addEventListener(EVENT_NAME, function (e) {
            try {
                var d = e && e.detail;
                var m = normMode(d && typeof d === 'object' ? d.mode : d);
                if (m && m !== state.mode) {
                    state.mode = m;
                    publishMode();
                    reskinAll();
                }
            } catch (_) {}
        });
    } catch (_) {}

    state.mode = resolveMode();
    publishMode();

    window.GraveGainAgeBands = {
        VERSION: VERSION,
        getMode: getMode,
        setMode: setMode,
        isDrugsAllowed: isDrugsAllowed,
        isGoreFull: isGoreFull,
        // helpers (not required, but useful for wiring/QA):
        isBloodAllowed: isBloodAllowed,
        isGibAllowed: isGibAllowed,
        praise: praise,
        sanitize: sanitizeString,
        reskin: reskinAll,
        routeKill: routeKill
    };

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({
            name: 'gravegain-agebands',
            version: VERSION,
            init: function () {
                try { publishMode(); } catch (_) {}
                try { poll(); } catch (_) {}
            }
        });
    } catch (_) {}

    try {
        if (window.document && window.document.readyState === 'loading') {
            window.document.addEventListener('DOMContentLoaded', function () {
                try { poll(); } catch (_) {}
                try { setInterval(poll, 1200); } catch (_) {}
            });
        } else {
            try { poll(); } catch (_) {}
            try { setInterval(poll, 1200); } catch (_) {}
        }
    } catch (_) {
        try { setInterval(poll, 1200); } catch (_) {}
    }
})();
