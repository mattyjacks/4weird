(function () {
    'use strict';

    // GraveGain4D — block4d: hold-right-click mitigation, GG3D parity.
    // GG3D source of truth: player.js takeDamage() —
    //   perfect parry window negates all damage; otherwise Tank blocks 90%,
    //   everyone else 75%. Blocking slows movement (0.55x, applied by the
    //   movement integrator reading player.isBlocking).
    // 4D additions: stamina drain while held, STONE-meter spend option
    // (Dwarf fantasy: burn STONE slices to fully absorb one hit).
    // No fullscreen bindings, no dblclick listeners.

    var BLOCK_PCT = {
        warrior: 0.75,
        mage: 0.60,
        tank: 0.90,
        support: 0.65
    };

    var PARRY_WINDOW = 0.25;  // seconds of perfect parry after block raise
    var STAMINA_DRAIN = 12;   // stamina per second while blocking
    var STONE_COST = 25;      // STONE meter per fully-absorbed hit

    function blockPct(classType) {
        return BLOCK_PCT[classType] !== undefined ? BLOCK_PCT[classType] : 0.75;
    }

    // Call on right-mouse state change. Rising edge (warrior parry, and a
    // short parry for all classes per GG3D parryWindow field) arms the
    // perfect-parry window.
    function setBlocking(player, heldDown) {
        if (!player || player.isDead) return false;
        var was = !!player.isBlocking;
        player.isBlocking = !!heldDown;
        if (!was && heldDown) {
            player.parryWindow = PARRY_WINDOW; // GG3D field name parity
            return true; // raised this tick
        }
        if (was && !heldDown) player.parryWindow = 0;
        return !!player.isBlocking;
    }

    function update(player, dt) {
        if (!player) return;
        if (player.parryWindow > 0) player.parryWindow = Math.max(0, player.parryWindow - dt);
        if (player.isBlocking) {
            player.stamina = Math.max(0, (parseFloat(player.stamina) || 0) - STAMINA_DRAIN * dt);
            if (player.stamina <= 0) {
                player.isBlocking = false; // guard broken: stamina empty
                player.parryWindow = 0;
                try {
                    var game = window.GG4D_Game || window.GraveGainGame;
                    if (game && game.combatText) game.combatText.spawnText(player.x, 20, player.z || player.y, 'GUARD BROKEN!', 'player-dmg');
                } catch (_) { /* silent */ }
            }
        }
    }

    function sfx(type, pitch) {
        try {
            var game = window.GG4D_Game || window.GraveGainGame;
            if (game && game.audio && typeof game.audio.playSfx === 'function') game.audio.playSfx(type, pitch);
        } catch (_) { /* silent */ }
    }

    // Spend STONE meter to fully absorb one incoming hit. Returns true when
    // absorbed (caller should skip remaining damage). Never throws when the
    // player has no STONE field — returns false so damage flows normally.
    function spendStone(player, ctx) {
        if (!player) return false;
        var stone = parseFloat(player.stone !== undefined ? player.stone : player.stoneMeter);
        if (!isFinite(stone) || stone < STONE_COST) return false;
        if (player.stone !== undefined) player.stone = stone - STONE_COST;
        else player.stoneMeter = stone - STONE_COST;
        sfx('block', 0.8);
        try {
            var game = (ctx && ctx.game) || window.GG4D_Game || window.GraveGainGame;
            if (game && game.combatText) game.combatText.spawnText(player.x, 20, player.z || player.y, 'STONE WARD!', 'block');
            if (game && game.vfx && typeof game.vfx.spawnSparks === 'function') {
                game.vfx.spawnSparks(player.x, player.z || player.y, 0xffcc4c, 20);
            }
        } catch (_) { /* silent */ }
        return true;
    }

    // Mitigate one incoming hit. Mirrors GG3D takeDamage() block branch:
    // parry -> 0 damage; blocking -> pct reduction; STONE spend (opt-in via
    // opts.stone=true) -> full absorb before HP is touched.
    function mitigate(player, rawDmg, opts) {
        opts = opts || {};
        rawDmg = parseFloat(rawDmg) || 0;
        if (!player || player.isDead) return { dmg: 0, parried: false, blocked: false, stone: false };
        if (player.stoneForm) return { dmg: 0, parried: false, blocked: false, stone: true, stoneForm: true };
        if (opts.stone && spendStone(player, opts.ctx)) {
            return { dmg: 0, parried: false, blocked: true, stone: true };
        }
        if (player.isBlocking) {
            if (player.parryWindow > 0) {
                // Warrior-crisp perfect parry (GG3D 'PARRIED!' text + sparks).
                sfx('block', 1.3);
                try {
                    var game = (opts.ctx && opts.ctx.game) || window.GG4D_Game || window.GraveGainGame;
                    if (game && game.combatText) game.combatText.spawnText(player.x, 20, player.z || player.y, 'PARRIED!', 'block');
                    if (game && game.vfx && typeof game.vfx.spawnSparks === 'function') {
                        game.vfx.spawnSparks(player.x, player.z || player.y, 0x38bdf8, 20);
                    }
                } catch (_) { /* silent */ }
                return { dmg: 0, parried: true, blocked: true, stone: false };
            }
            var pct = blockPct(player.classType);
            sfx('block');
            return { dmg: rawDmg * (1.0 - pct), parried: false, blocked: true, stone: false, pct: pct };
        }
        return { dmg: rawDmg, parried: false, blocked: false, stone: false };
    }

    window.GG4D_Block = {
        BLOCK_PCT: BLOCK_PCT,
        PARRY_WINDOW: PARRY_WINDOW,
        STAMINA_DRAIN: STAMINA_DRAIN,
        STONE_COST: STONE_COST,
        blockPct: blockPct,
        setBlocking: setBlocking,
        update: update,
        mitigate: mitigate,
        spendStone: spendStone
    };
})();
