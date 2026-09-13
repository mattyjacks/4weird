/* GraveGain2D sprite pack (G5) — emoji-composite enemies + weapons.
 * Vanilla JS, idempotent, no imports. Pre-renders each sprite to an
 * offscreen canvas with a palette-swap per dungeon theme, cached by
 * (id, theme). Hooks the game's spawn/drop tables best-effort and
 * degrades gracefully when game globals are absent.
 * No gore is drawn here (G7 owns blood/gore FX).
 */
(function () {
    'use strict';
    if (window.GraveGain2DSprites) return;

    var VERSION = '1.0.0+gg2d2.0.0';
    var TILE = 64;

    // Theme palettes: background disc tint + ring accent. No red splatter.
    var THEMES = {
        crypt:     { bg: 'rgba(88,60,140,0.35)',  ring: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
        graveyard: { bg: 'rgba(60,120,70,0.30)',  ring: '#4ade80', glow: 'rgba(74,222,128,0.45)' },
        treasury:  { bg: 'rgba(150,115,30,0.32)', ring: '#facc15', glow: 'rgba(250,204,21,0.5)' },
        ash:       { bg: 'rgba(150,75,25,0.32)',  ring: '#fb923c', glow: 'rgba(251,146,60,0.5)' },
        brine:     { bg: 'rgba(25,110,140,0.32)', ring: '#22d3ee', glow: 'rgba(34,211,238,0.5)' },
        default:   { bg: 'rgba(90,90,110,0.30)',  ring: '#c4b5fd', glow: 'rgba(196,181,253,0.45)' }
    };
    var THEME_ORDER = ['crypt', 'graveyard', 'ash', 'brine', 'treasury'];

    // 14 new emoji-composite enemy variants. Stats mirror EnemyTypes
    // archetypes in gravegain2d/game.js (v2.0.0). `emoji` stays a single
    // base glyph so the stock text renderer keeps working unpatched.
    var ENEMIES = [
        { id: 'ash-ghoul',     name: 'Ash Ghoul',     base: '💀', accent: '🔥', hp: 30,  dmg: 6,  speed: 110, type: 'standard',  blood: 'red',    minFloor: 1 },
        { id: 'brine-husk',    name: 'Brine Husk',    base: '🧜', accent: '💀', hp: 45,  dmg: 8,  speed: 85,  type: 'standard',  blood: 'green',  minFloor: 1 },
        { id: 'thorn-warden',  name: 'Thorn Warden',  base: '🌵', accent: '🛡️', hp: 210, dmg: 16, speed: 62,  type: 'elite',     blood: 'green',  armored: true, minFloor: 3 },
        { id: 'ember-wraith',  name: 'Ember Wraith',  base: '👻', accent: '🔥', hp: 14,  dmg: 32, speed: 155, type: 'exploding', blood: 'purple', minFloor: 2 },
        { id: 'frost-revenant',name: 'Frost Revenant',base: '🧟', accent: '❄️', hp: 55,  dmg: 10, speed: 88,  type: 'standard',  blood: 'red',    minFloor: 2 },
        { id: 'crypt-jackal',  name: 'Crypt Jackal',  base: '🐺', accent: '💀', hp: 22,  dmg: 7,  speed: 165, type: 'standard',  blood: 'red',    minFloor: 1 },
        { id: 'marrow-priest', name: 'Marrow Priest', base: '🧙', accent: '🦴', hp: 380, dmg: 16, speed: 62,  type: 'boss',      blood: 'purple', summoner: true, minFloor: 5 },
        { id: 'sludge-mimic',  name: 'Sludge Mimic',  base: '🟢', accent: '💀', hp: 170, dmg: 18, speed: 74,  type: 'elite',     blood: 'green',  minFloor: 3 },
        { id: 'storm-sire',    name: 'Storm Sire',    base: '⛈️', accent: '👹', hp: 520, dmg: 26, speed: 78,  type: 'boss',      blood: 'red',    ranged: true, minFloor: 6 },
        { id: 'gilt-sentinel', name: 'Gilt Sentinel', base: '🛡️', accent: '✨', hp: 230, dmg: 15, speed: 58,  type: 'elite',     blood: 'red',    armored: true, minFloor: 4 },
        { id: 'void-leech',    name: 'Void Leech',    base: '🕳️', accent: '👻', hp: 12,  dmg: 28, speed: 148, type: 'exploding', blood: 'purple', minFloor: 3 },
        { id: 'tide-caller',   name: 'Tide Caller',   base: '🧜', accent: '🌊', hp: 190, dmg: 17, speed: 66,  type: 'elite',     blood: 'green',  minFloor: 4 },
        { id: 'bone-orchard',  name: 'Bone Orchard',  base: '🌹', accent: '💀', hp: 35,  dmg: 6,  speed: 95,  type: 'standard',  blood: 'red',    minFloor: 2 },
        { id: 'cinder-colossus', name: 'Cinder Colossus', base: '👹', accent: '🔥', hp: 850, dmg: 42, speed: 52, type: 'boss',   blood: 'red',    minFloor: 6 }
    ];

    // 14 weapon pickup sprites (drop table). `emoji` is the map glyph.
    var WEAPONS = [
        { id: 'rusted-cutlass', name: 'Rusted Cutlass', emoji: '⚔️', glyph: '⚔️', accent: '🟤', rarity: 'common',    value: 60  },
        { id: 'grave-mattock',  name: 'Grave Mattock',  emoji: '⛏️', glyph: '⛏️', accent: '⬛', rarity: 'common',    value: 70  },
        { id: 'brine-harpoon',  name: 'Brine Harpoon',  emoji: '🔱', glyph: '🔱', accent: '🌊', rarity: 'uncommon',  value: 140 },
        { id: 'thorn-bow',      name: 'Thorn Bow',      emoji: '🏹', glyph: '🏹', accent: '🌵', rarity: 'uncommon',  value: 150 },
        { id: 'ember-brand',    name: 'Ember Brand',    emoji: '🗡️', glyph: '🗡️', accent: '🔥', rarity: 'rare',      value: 260 },
        { id: 'frost-fang',     name: 'Frost Fang',     emoji: '🗡️', glyph: '🗡️', accent: '❄️', rarity: 'rare',      value: 260 },
        { id: 'crypt-lantern',  name: 'Crypt Lantern',  emoji: '🏮', glyph: '🏮', accent: '💀', rarity: 'uncommon',  value: 130 },
        { id: 'marrow-staff',   name: 'Marrow Staff',   emoji: '🔮', glyph: '🔮', accent: '🦴', rarity: 'rare',      value: 280 },
        { id: 'storm-bell',     name: 'Storm Bell',     emoji: '🔔', glyph: '🔔', accent: '⛈️', rarity: 'rare',      value: 270 },
        { id: 'gilt-ward',      name: 'Gilt Ward',      emoji: '🛡️', glyph: '🛡️', accent: '✨', rarity: 'epic',      value: 420 },
        { id: 'void-tome',      name: 'Void Tome',      emoji: '📕', glyph: '📕', accent: '🕳️', rarity: 'epic',      value: 450 },
        { id: 'tide-conch',     name: 'Tide Conch',     emoji: '🐚', glyph: '🐚', accent: '🌊', rarity: 'uncommon',  value: 145 },
        { id: 'orchard-scythe', name: 'Orchard Scythe', emoji: '🌹', glyph: '🌹', accent: '🗡️', rarity: 'rare',      value: 290 },
        { id: 'cinder-maul',    name: 'Cinder Maul',    emoji: '🔨', glyph: '🔨', accent: '🔥', rarity: 'epic',      value: 480 }
    ];

    var enemyById = {};
    ENEMIES.forEach(function (e) { enemyById[e.id] = e; });
    var weaponById = {};
    WEAPONS.forEach(function (w) { weaponById[w.id] = w; });

    // Offscreen cache keyed by (id, theme).
    var cache = {};
    function cacheKey(id, theme) { return id + '::' + (theme || 'default'); }

    function themePalette(theme) {
        return THEMES[theme] || THEMES.default;
    }

    function currentTheme() {
        try {
            var g = window.GraveGainGame;
            var floor = (g && typeof g.floorIndex === 'number') ? g.floorIndex : 0;
            return THEME_ORDER[((floor % THEME_ORDER.length) + THEME_ORDER.length) % THEME_ORDER.length];
        } catch (e) { return 'crypt'; }
    }

    function makeCanvas(size) {
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        return c;
    }

    // Palette-swap shell: tinted disc + theme ring. Shared by enemies/weapons.
    function paintShell(ctx, size, theme) {
        var pal = themePalette(theme);
        var cx = size / 2, cy = size / 2, r = size / 2 - 2;
        var grad = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
        grad.addColorStop(0, pal.bg);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = pal.ring;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(2, size / 32);
        ctx.beginPath(); ctx.arc(cx, cy, r - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function paintEnemy(def, theme) {
        var size = TILE;
        var c = makeCanvas(size);
        var ctx = c.getContext('2d');
        if (!ctx) return c;
        paintShell(ctx, size, theme);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = (size * 0.52) + 'px serif';
        ctx.fillText(def.base, size / 2, size / 2 + 1);
        // Accent glyph tucked in the lower-right; small so it reads as one foe.
        ctx.font = (size * 0.30) + 'px serif';
        ctx.fillText(def.accent, size * 0.72, size * 0.72);
        return c;
    }

    function paintWeapon(def, theme) {
        var size = TILE;
        var c = makeCanvas(size);
        var ctx = c.getContext('2d');
        if (!ctx) return c;
        paintShell(ctx, size, theme);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = (size * 0.50) + 'px serif';
        ctx.fillText(def.glyph, size / 2, size / 2 + 1);
        ctx.font = (size * 0.26) + 'px serif';
        ctx.fillText(def.accent, size * 0.74, size * 0.30);
        return c;
    }

    function getSprite(id, theme) {
        var def = enemyById[id];
        if (!def) return null;
        var t = theme || currentTheme();
        var k = cacheKey(id, t);
        if (!cache[k]) { try { cache[k] = paintEnemy(def, t); } catch (e) { return null; } }
        return cache[k];
    }

    function getWeaponSprite(id, theme) {
        var def = weaponById[id];
        if (!def) return null;
        var t = theme || currentTheme();
        var k = cacheKey('w:' + id, t);
        if (!cache[k]) { try { cache[k] = paintWeapon(def, t); } catch (e) { return null; } }
        return cache[k];
    }

    // Blit helper for G10 wiring / custom render passes.
    function drawSprite(ctx, canvas, x, y, size) {
        if (!ctx || !canvas) return false;
        try {
            var s = size || TILE;
            ctx.drawImage(canvas, x - s / 2, y - s / 2, s, s);
            return true;
        } catch (e) { return false; }
    }

    // Convert a variant def to an EnemyTypes-shaped row so the stock
    // EnemyEntity/createEnemy path accepts it untouched.
    function toEnemyRow(def) {
        return {
            name: def.name, emoji: def.base, hp: def.hp, dmg: def.dmg,
            speed: def.speed, type: def.type, blood: def.blood,
            armored: !!def.armored, ranged: !!def.ranged, summoner: !!def.summoner,
            spriteId: def.id, accent: def.accent
        };
    }

    function eligibleVariants(floor) {
        var f = (typeof floor === 'number') ? floor : 0;
        return ENEMIES.filter(function (e) { return f >= (e.minFloor || 0); });
    }

    function pickVariant(floor) {
        var pool = eligibleVariants(floor);
        if (!pool.length) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // Game-loop-compatible pickup (mirrors LootItem's surface: update,
    // getEmoji, picked, x/y, type, value) so no engine edit is required.
    function makeWeaponPickup(x, y, weaponId) {
        var def = weaponById[weaponId] || WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
        return {
            x: x, y: y, type: 'item', value: def.value, rarity: def.rarity,
            weaponId: def.id, radius: 8, pulse: Math.random() * Math.PI, picked: false,
            update: function (dt, player, range) {
                this.pulse += 5 * dt;
                var dx = player.x - this.x, dy = player.y - this.y;
                var dist = Math.hypot(dx, dy);
                if (dist < range && dist > 1) {
                    var pull = 300 * dt;
                    this.x += (dx / dist) * pull;
                    this.y += (dy / dist) * pull;
                }
            },
            getEmoji: function () { return def.emoji; }
        };
    }

    function dropWeaponPickup(game, x, y, weaponId) {
        try {
            if (!game || !Array.isArray(game.loot)) return null;
            var p = makeWeaponPickup(x, y, weaponId);
            game.loot.push(p);
            return p;
        } catch (e) { return null; }
    }

    // Best-effort runtime hooks. Everything guarded; failure = vanilla game.
    function hookGame(game) {
        if (!game || game.__gg2dSpritesHooked) return false;
        try {
            // 1) Spawn table: sometimes return a variant row for ambient spawns.
            if (typeof game.getAmbientEnemyType === 'function' && !game.__gg2dAmbientOrig) {
                game.__gg2dAmbientOrig = game.getAmbientEnemyType.bind(game);
                game.getAmbientEnemyType = function () {
                    var orig = game.__gg2dAmbientOrig();
                    try {
                        var floor = (typeof game.floorIndex === 'number') ? game.floorIndex : 0;
                        if (Math.random() < 0.28) {
                            var v = pickVariant(floor);
                            if (v) return toEnemyRow(v);
                        }
                    } catch (e) { /* fall through to vanilla */ }
                    return orig;
                };
            }
            // 2) Skull-summon path: occasionally summon a wraith/leech variant.
            if (typeof game.spawnMinorSkull === 'function' && typeof game.createEnemy === 'function'
                    && !game.__gg2dSkullOrig) {
                game.__gg2dSkullOrig = game.spawnMinorSkull.bind(game);
                game.spawnMinorSkull = function (x, y) {
                    try {
                        if (Math.random() < 0.35) {
                            var pool = [enemyById['ember-wraith'], enemyById['void-leech']];
                            var v = pool[Math.floor(Math.random() * pool.length)];
                            game.enemies.push(game.createEnemy(toEnemyRow(v), x, y, 1.0));
                            return;
                        }
                    } catch (e) { /* fall through */ }
                    return game.__gg2dSkullOrig(x, y);
                };
            }
            // 3) Drop table: seed one weapon cache near the player on hook.
            try {
                if (Array.isArray(game.loot) && game.player && !game.__gg2dCacheSeeded) {
                    game.__gg2dCacheSeeded = true;
                    var def = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
                    dropWeaponPickup(game, game.player.x + 60, game.player.y + 40, def.id);
                }
            } catch (e) { /* drops stay vanilla */ }
            game.__gg2dSpritesHooked = true;
            game.spriteVariants = ENEMIES.map(function (e) { return e.id; });
            return true;
        } catch (e) { return false; }
    }

    var api = {
        VERSION: VERSION,
        gameVersion: '2.0.0',
        enemies: ENEMIES,
        weapons: WEAPONS,
        themes: Object.keys(THEMES),
        getSprite: getSprite,
        getWeaponSprite: getWeaponSprite,
        drawSprite: drawSprite,
        currentTheme: currentTheme,
        toEnemyRow: toEnemyRow,
        pickVariant: pickVariant,
        makeWeaponPickup: makeWeaponPickup,
        dropWeaponPickup: dropWeaponPickup,
        hookGame: hookGame
    };
    window.GraveGain2DSprites = api;

    function init() {
        // Poll for the game global; cap attempts, then stay dormant.
        var attempts = 0;
        var timer = setInterval(function () {
            attempts += 1;
            try {
                if (window.GraveGainGame && hookGame(window.GraveGainGame)) {
                    clearInterval(timer);
                } else if (attempts >= 40) {
                    clearInterval(timer);
                }
            } catch (e) {
                if (attempts >= 40) clearInterval(timer);
            }
        }, 500);
    }

    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({ name: 'gravegain2d-sprites', version: VERSION, init: init });
    try { init(); } catch (e) { /* dormant until G10 wiring calls init */ }
})();
