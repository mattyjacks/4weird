/* GraveGain4D dream-rift: dreamgen.js — seeded PRNG dungeon mutator (Oasis-inspired).
 *
 * The world re-dreams itself around the player: on entering a rift zone,
 * rooms BEYOND the player's view regenerate (layout + corruption palette).
 * Safety rails: never mutates the room under the player's feet, never moves
 * objectives / exits / cups / the player. Every regen emits its dream-seed
 * hex + a MERCENARY whisper line for the toast feed.
 *
 * Deterministic: mulberry32 + FNV-1a string hash. Seed lives in state
 * (state.dream.seed, state.dream.regens) so saves round-trip exactly.
 * Vanilla JS IIFE, idempotent via window.GG4D_Dream. Never throws.
 * No fullscreen / dblclick code. No DOM listeners created by this module.
 */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        if (window.GG4D_Dream) return;

        var VERSION = '1.0.0';

        /* ---------------- utils ---------------- */

        function num(v, dflt) {
            try {
                if (typeof v === 'number' && isFinite(v)) return v;
                var n = Number(v);
                if (isFinite(n)) return n;
            } catch (_) { /* ignore */ }
            return dflt;
        }

        function uint32(seed) {
            try {
                if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
                if (typeof seed === 'string') {
                    var h = 2166136261 >>> 0;
                    for (var i = 0; i < seed.length; i++) {
                        h ^= seed.charCodeAt(i);
                        h = Math.imul(h, 16777619) >>> 0;
                    }
                    return h >>> 0;
                }
                if (seed == null) return (Math.random() * 0xFFFFFFFF) >>> 0;
                return (Number(seed) >>> 0) || 0;
            } catch (_) { return 0; }
        }

        function hexSeed(u) {
            try {
                var s = (u >>> 0).toString(16).toUpperCase();
                while (s.length < 8) s = '0' + s;
                return '0x' + s;
            } catch (_) { return '0x00000000'; }
        }

        function mulberry(seedInt) {
            var a = (seedInt >>> 0) || 0;
            return function () {
                try {
                    a = (a + 0x6D2B79F5) >>> 0;
                    var t = a;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                } catch (_) { return 0.5; }
            };
        }

        function pick(rnd, arr) {
            try {
                if (!arr || !arr.length) return null;
                return arr[Math.floor(rnd() * arr.length) % arr.length];
            } catch (_) { return null; }
        }

        /* ---------------- GraveGain theming ---------------- */

        // NecroGenesis corruption stages drive wall/floor palette shifts.
        var CORRUPTION_STAGES = [
            'pristine', 'whispered', 'veined', 'blossomed', 'necrotic', 'genesis'
        ];

        var PALETTES = {
            pristine:  { wall: '#3a4a5a', floor: '#1c2430', glow: '#7fd4ff', name: 'Pristine Stone' },
            whispered: { wall: '#4a3f5e', floor: '#221f30', glow: '#b79cff', name: 'Whispered Chapel' },
            veined:    { wall: '#5e2f4a', floor: '#2b1622', glow: '#ff5f9e', name: 'Necro-Veined Crypt' },
            blossomed: { wall: '#3f5e2f', floor: '#16241a', glow: '#8fff6a', name: 'Elven Overbloom' },
            necrotic:  { wall: '#2e2e1a', floor: '#141208', glow: '#e8c33a', name: 'Dwarven Gold-Seam Rot' },
            genesis:   { wall: '#0e2e33', floor: '#081416', glow: '#3af2e8', name: 'NecroGenesis Womb' }
        };

        // Elven glow-trees + dwarven gold seams projected in 4D: decor tags
        // with an ana/kata (w) offset so the renderer can parallax them.
        var DECOR_SETS = {
            elven: ['glow-tree', 'glow-tree', 'moon-moss', 'wisp-lantern', 'root-arch'],
            dwarven: ['gold-seam', 'gold-seam', 'rune-pillar', 'forge-ember', 'vault-door'],
            necro: ['bone-chandelier', 'corruption-bloom', 'ash-drift', 'womb-sac', 'crypt-fog'],
            mixed: ['glow-tree', 'gold-seam', 'corruption-bloom', 'rune-pillar', 'moon-moss']
        };

        var WHISPERS = [
            'The MERCENARY remembers what these stones forgot.',
            'Sleep, little crypt. Wake changed.',
            'Gold remembers the mountain. Flesh forgets.',
            'The trees dream in four directions at once.',
            'What you cannot see has already been rewritten.',
            'NecroGenesis turns the page behind your back.',
            'The rift keeps your footing honest. Nothing else.',
            'Aelindra hums; the walls grow leaves to listen.',
            'The vault counts its gold twice and finds bone.',
            'Dream kindly, delver. The dark dreams back.'
        ];

        /* ---------------- state ---------------- */

        function ensureState(state) {
            try {
                state = state && typeof state === 'object' ? state : {};
                if (!state.dream || typeof state.dream !== 'object') state.dream = {};
                if (state.dream.seed == null) state.dream.seed = uint32('grave-' + Date.now());
                else state.dream.seed = uint32(state.dream.seed);
                if (!num(state.dream.regens, null) && state.dream.regens !== 0) state.dream.regens = 0;
                state.dream.regens = Math.max(0, Math.floor(num(state.dream.regens, 0)));
                if (!state.dream.lastHex) state.dream.lastHex = hexSeed(state.dream.seed);
                if (!state.dream.lastWhisper) state.dream.lastWhisper = '';
                if (!Array.isArray(state.dream.history)) state.dream.history = [];
                return state;
            } catch (_) {
                return { dream: { seed: 0, regens: 0, lastHex: '0x00000000', lastWhisper: '', history: [] } };
            }
        }

        function setSeed(state, seed) {
            try {
                state = ensureState(state);
                state.dream.seed = uint32(seed);
                state.dream.regens = 0;
                state.dream.lastHex = hexSeed(state.dream.seed);
                state.dream.history = [];
                return state.dream.seed;
            } catch (_) { return 0; }
        }

        /* ---------------- room model ----------------
         * Room: { id, x, y, w, theme, palette, decor:[{kind,wOff}], tags:[] }
         * Tags that PIN a room (never regenerated): 'spawn','objective',
         * 'exit','cup','portal','shop','boss','safe'. Caller marks them;
         * we also auto-pin any room containing player/objective coords.
         */

        var PINNED_TAGS = { spawn: 1, objective: 1, exit: 1, cup: 1, portal: 1, shop: 1, boss: 1, safe: 1 };

        function roomPinned(room) {
            try {
                if (!room) return true;
                var tags = room.tags || [];
                for (var i = 0; i < tags.length; i++) {
                    if (PINNED_TAGS[tags[i]]) return true;
                }
                return false;
            } catch (_) { return true; }
        }

        function dist2(ax, ay, bx, by) {
            try {
                var dx = num(ax, 0) - num(bx, 0);
                var dy = num(ay, 0) - num(by, 0);
                return dx * dx + dy * dy;
            } catch (_) { return Infinity; }
        }

        function genRoom(rnd, id, x, y, regenIndex) {
            try {
                var stage = pick(rnd, CORRUPTION_STAGES) || 'whispered';
                var pal = PALETTES[stage] || PALETTES.whispered;
                var themeRoll = rnd();
                var theme = themeRoll < 0.34 ? 'elven_grove'
                    : themeRoll < 0.67 ? 'dwarven_vault' : 'necro_crypt';
                var decorPool = theme === 'elven_grove' ? DECOR_SETS.elven
                    : theme === 'dwarven_vault' ? DECOR_SETS.dwarven
                    : DECOR_SETS.necro;
                var nDecor = 1 + Math.floor(rnd() * 3);
                var decor = [];
                for (var i = 0; i < nDecor; i++) {
                    decor.push({
                        kind: pick(rnd, decorPool) || 'crypt-fog',
                        // ana/kata projection offset: renderer slides decor along w.
                        wOff: Math.floor(rnd() * 5) - 2,
                        glow: pal.glow
                    });
                }
                // Dwarven vaults always keep at least one gold seam.
                if (theme === 'dwarven_vault' && decor.length) {
                    var hasGold = false;
                    for (var g = 0; g < decor.length; g++) {
                        if (decor[g].kind === 'gold-seam') { hasGold = true; break; }
                    }
                    if (!hasGold) decor[0] = { kind: 'gold-seam', wOff: 0, glow: '#e8c33a' };
                }
                return {
                    id: id, x: x, y: y,
                    theme: theme, palette: stage,
                    colors: { wall: pal.wall, floor: pal.floor, glow: pal.glow, name: pal.name },
                    decor: decor, tags: [],
                    dreamSeed: hexSeed(uint32(id + ':' + regenIndex)),
                    regen: regenIndex
                };
            } catch (_) {
                return { id: id, x: x, y: y, theme: 'necro_crypt', palette: 'whispered', decor: [], tags: [] };
            }
        }

        /* ---------------- the dream mutator ----------------
         * redream(state, dungeon, player, opts):
         *   dungeon: { rooms: [...] } (mutated in place, also returned)
         *   player: { x, y, viewRadius } — rooms within viewRadius are safe.
         *   opts: { protectIds:[], protectPoints:[{x,y,r}], objectives:[{x,y,r}] }
         * Returns { seedHex, whisper, changed:[ids], skipped:[ids] }.
         */
        function redream(state, dungeon, player, opts) {
            var result = { seedHex: '0x00000000', whisper: '', changed: [], skipped: [] };
            try {
                state = ensureState(state);
                if (!dungeon || !Array.isArray(dungeon.rooms)) return result;
                opts = opts && typeof opts === 'object' ? opts : {};
                player = player && typeof player === 'object' ? player : { x: 0, y: 0 };

                var px = num(player.x, 0), py = num(player.y, 0);
                var viewR = Math.max(0, num(player.viewRadius, 3));
                var viewR2 = viewR * viewR;

                // Advance deterministic stream: seed + regen counter.
                state.dream.regens += 1;
                var dreamU = (uint32(state.dream.seed) + Math.imul(state.dream.regens >>> 0, 0x85EBCA6B)) >>> 0;
                var rnd = mulberry(dreamU);
                result.seedHex = hexSeed(dreamU);
                result.whisper = pick(mulberry(dreamU ^ 0xC2B28059), WHISPERS) || WHISPERS[0];

                state.dream.lastHex = result.seedHex;
                state.dream.lastWhisper = result.whisper;
                state.dream.history.push({ regen: state.dream.regens, hex: result.seedHex, whisper: result.whisper });
                if (state.dream.history.length > 50) state.dream.history.splice(0, state.dream.history.length - 50);

                var protectIds = {};
                try {
                    (opts.protectIds || []).forEach(function (id) { protectIds[id] = 1; });
                } catch (_) { /* ignore */ }
                var protectPoints = (opts.protectPoints || []).concat(opts.objectives || []);

                for (var i = 0; i < dungeon.rooms.length; i++) {
                    var room = dungeon.rooms[i];
                    if (!room) { continue; }
                    // Rule 1: pinned tags never regenerate.
                    if (roomPinned(room)) { result.skipped.push(room.id); continue; }
                    // Rule 2: explicit protect ids.
                    if (protectIds[room.id]) { result.skipped.push(room.id); continue; }
                    // Rule 3: never under feet — inside view radius is safe.
                    var rx = num(room.x, 0), ry = num(room.y, 0);
                    if (dist2(rx, ry, px, py) <= viewR2) { result.skipped.push(room.id); continue; }
                    // Rule 4: never on objectives / exits (protect points).
                    var guarded = false;
                    for (var p = 0; p < protectPoints.length; p++) {
                        var pt = protectPoints[p] || {};
                        var pr = Math.max(0, num(pt.r, 1.5));
                        if (dist2(rx, ry, num(pt.x, 0), num(pt.y, 0)) <= pr * pr) { guarded = true; break; }
                    }
                    if (guarded) { result.skipped.push(room.id); continue; }

                    var fresh = genRoom(rnd, room.id, rx, ry, state.dream.regens);
                    // Preserve identity + position + pins; rewrite dreamable fields.
                    room.theme = fresh.theme;
                    room.palette = fresh.palette;
                    room.colors = fresh.colors;
                    room.decor = fresh.decor;
                    room.dreamSeed = fresh.dreamSeed;
                    room.regen = fresh.regen;
                    result.changed.push(room.id);
                }
                return result;
            } catch (_) { return result; }
        }

        function describe(state) {
            try {
                state = ensureState(state);
                return {
                    seed: state.dream.seed >>> 0,
                    seedHex: hexSeed(state.dream.seed),
                    regens: state.dream.regens,
                    lastHex: state.dream.lastHex,
                    lastWhisper: state.dream.lastWhisper
                };
            } catch (_) { return {}; }
        }

        function serialize(state) {
            try {
                state = ensureState(state);
                return { seed: state.dream.seed >>> 0, regens: state.dream.regens, history: state.dream.history.slice(-50) };
            } catch (_) { return { seed: 0, regens: 0, history: [] }; }
        }

        function restore(state, snap) {
            try {
                state = ensureState(state);
                if (snap && typeof snap === 'object') {
                    if (snap.seed != null) state.dream.seed = uint32(snap.seed);
                    if (snap.regens != null) state.dream.regens = Math.max(0, Math.floor(num(snap.regens, 0)));
                    if (Array.isArray(snap.history)) state.dream.history = snap.history.slice(-50);
                    state.dream.lastHex = hexSeed((uint32(state.dream.seed) + Math.imul(state.dream.regens >>> 0, 0x85EBCA6B)) >>> 0);
                }
                return state;
            } catch (_) { return state; }
        }

        window.GG4D_Dream = {
            VERSION: VERSION,
            CORRUPTION_STAGES: CORRUPTION_STAGES.slice(),
            PALETTES: JSON.parse(JSON.stringify(PALETTES)),
            WHISPERS: WHISPERS.slice(),
            ensureState: ensureState,
            setSeed: setSeed,
            redream: redream,
            genRoom: genRoom,
            describe: describe,
            serialize: serialize,
            restore: restore,
            hexSeed: hexSeed,
            uint32: uint32
        };
    } catch (_) { /* never throw */ }
})();
