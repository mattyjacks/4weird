(function () {
    'use strict';

    // GraveGain4D — abilities4d: GG3D-parity race abilities + class ults.
    // GG3D source of truth: player.js triggerAbility() (Human Shield Wall,
    // Elf Nature Burst, Dwarf Stone Form, Orc Rage Burst — 7s cooldown) and
    // game-data.js ClassData blurbs (Whirlwind / Meteor Storm / Ground Stomp
    // / Nanite Swarm ults, named here with numbers). Potion (Q heal juice,
    // GG3D usePotion: 50% maxHp when potions remain) also lives here so Q has
    // one owner. F triggers abilities: pollAbility() fires the race ability
    // on the KeyF edge; the class ult is one explicit call away
    // (triggerUlt) for integrators that bind long-press-F or a HUD button —
    // never dblclick (forbidden). Cooldowns tick in update().
    // No fullscreen bindings, no dblclick listeners.

    var RACE_COOLDOWN = 7.0;

    var RACE_ABILITIES = {
        human: { name: 'Shield Wall',  cooldown: 7,  desc: 'Absorb bubble (35) + slow regen bubble.' },
        elf:   { name: 'Nature Burst', cooldown: 7,  desc: 'AoE 45 dmg / r160 + Mana-fueled.' },
        dwarf: { name: 'Stone Form',   cooldown: 12, desc: '5s invulnerability (no regen while stoned).' },
        orc:   { name: 'Rage Burst',   cooldown: 7,  desc: 'AoE 35 + 0.75xRage / r180, vents all Rage.' }
    };

    var CLASS_ULTS = {
        warrior: { name: 'Whirlwind',    cooldown: 25, radius: 120, dmgMult: 2.0, desc: '360-degree 3D sweep + every w-slice in tolerance.' },
        mage:    { name: 'Meteor Storm', cooldown: 40, radius: 220, dmg: 80,      desc: 'Skyfall barrage on the locked slice.' },
        tank:    { name: 'Ground Stomp', cooldown: 30, radius: 170, dmg: 65,      desc: 'Shockwave + heavy knockback, breaks guards.' },
        support: { name: 'Nanite Swarm', cooldown: 35, radius: 200, heal: 40,     desc: 'Heal allies/self + toxic cloud on enemies.' }
    };

    var POTION_HEAL_FRac = 0.5;
    var POTION_MAX = 5;

    function num(v, fb) {
        var n = parseFloat(v);
        return isFinite(n) ? n : fb;
    }

    function gameOf(ctx) {
        return (ctx && ctx.game) || window.GG4D_Game || window.GraveGainGame || null;
    }

    function update(player, dt) {
        if (!player) return;
        if (player.abilityCooldown > 0) player.abilityCooldown = Math.max(0, player.abilityCooldown - dt);
        if (player.ultCooldown > 0) player.ultCooldown = Math.max(0, player.ultCooldown - dt);
        if (player.mana !== undefined && player.race === 'elf') {
            player.mana = Math.min(num(player.maxMana, 100), num(player.mana, 0) + 3.0 * dt);
        }
        if (player.race === 'orc' && !(player._rageHeld)) {
            player.rage = Math.max(0, num(player.rage, 0) - 3.0 * dt);
        }
        if (player.race === 'human') {
            if (player.shieldCooldown > 0) player.shieldCooldown -= dt;
            else player.shieldBubble = Math.min(25.0, num(player.shieldBubble, 0) + 2.5 * dt);
        }
        if (player.stoneForm) {
            player.stoneDuration = num(player.stoneDuration, 0) - dt;
            if (player.stoneDuration <= 0) { player.stoneForm = false; player.stoneDuration = 0; }
        }
    }

    // Q potion / juice: GG3D usePotion parity (needs potions>0 and missing HP).
    function drinkPotion(player, ctx) {
        if (!player || player.isDead) return false;
        if (num(player.potions, 0) <= 0) return false;
        if (num(player.hp, 0) >= num(player.maxHp, 1)) return false;
        player.potions -= 1;
        var heal = Math.round(num(player.maxHp, 100) * POTION_HEAL_FRac);
        player.hp = Math.min(num(player.maxHp, 100), num(player.hp, 0) + heal);
        var game = gameOf(ctx);
        try {
            if (game && game.audio) game.audio.playSfx('potion');
            if (game && game.vfx) game.vfx.spawnSparks(player.x, player.z || player.y, 0x4ade80, 20);
            if (game && game.combatText) game.combatText.spawnText(player.x, 20, player.z || player.y, '+' + heal + ' HP', 'heal');
        } catch (_) { /* silent */ }
        return true;
    }

    // F race ability. Returns {fired, reason} — reason is 'cooldown' when gated.
    function triggerAbility(player, ctx) {
        ctx = ctx || {};
        if (!player || player.isDead) return { fired: false };
        if (num(player.abilityCooldown, 0) > 0) return { fired: false, reason: 'cooldown' };
        var game = gameOf(ctx);
        var race = player.race || 'human';
        player.abilityCooldown = (RACE_ABILITIES[race] || {}).cooldown || RACE_COOLDOWN;

        function fx(color, count, label, cls, sfxName, pitch) {
            try {
                if (game && game.audio) game.audio.playSfx(sfxName || 'spell', pitch);
                if (game && game.vfx) game.vfx.spawnSparks(player.x, player.z || player.y, color, count);
                if (game && game.combatText) game.combatText.spawnText(player.x, 20, player.z || player.y, label, cls);
            } catch (_) { /* silent */ }
        }

        if (race === 'human') {
            player.shieldBubble = 35.0;
            fx(0x00d2ff, 25, 'SHIELD WALL!', 'heal', 'spell', 1.2);
        } else if (race === 'elf') {
            fx(0x4cff7f, 35, 'NATURE BURST!', 'heal', 'spell', 1.5);
            if (game && typeof game.dealAoEDamage === 'function') {
                try { game.dealAoEDamage(player.x, player.z || player.y, 160, 45, 'nature'); } catch (_) {}
            } else if (typeof ctx.dealAoE === 'function') {
                try { ctx.dealAoE(player, 160, 45, 'nature'); } catch (_) {}
            }
        } else if (race === 'dwarf') {
            player.stoneForm = true;
            player.stoneDuration = 5.0;
            fx(0xffcc4c, 30, 'STONE FORM!', 'block', 'block', 0.8);
        } else if (race === 'orc') {
            var burst = 35 + num(player.rage, 0) * 0.75;
            player.rage = 0;
            try {
                if (game && game.cameraController) game.cameraController.applyShake(10);
                if (game && game.audio) game.audio.playSfx('explode', 1.1);
                if (game && game.vfx) game.vfx.spawnSparks(player.x, player.z || player.y, 0xff4c4c, 40);
                if (game && game.combatText) game.combatText.spawnText(player.x, 20, player.z || player.y, 'RAGE BURST!', 'crit');
                if (game && typeof game.dealAoEDamage === 'function') game.dealAoEDamage(player.x, player.z || player.y, 180, burst, 'rage');
                else if (typeof ctx.dealAoE === 'function') ctx.dealAoE(player, 180, burst, 'rage');
            } catch (_) { /* silent */ }
        }
        return { fired: true, race: race };
    }

    // Class ult. Same F key family (integrator: long-press F or HUD button).
    function triggerUlt(player, enemies, ctx) {
        ctx = ctx || {};
        if (!player || player.isDead) return { fired: false };
        if (num(player.ultCooldown, 0) > 0) return { fired: false, reason: 'cooldown' };
        var cls = player.classType || 'warrior';
        var ult = CLASS_ULTS[cls] || CLASS_ULTS.warrior;
        player.ultCooldown = ult.cooldown;
        var game = gameOf(ctx);
        var count = 0;
        try {
            if (cls === 'warrior') {
                // Whirlwind: melee sweep ignoring facing cone, 4D slice-gated.
                var melee = window.GG4D_Melee;
                (enemies || []).forEach(function (e) {
                    if (!e || e.hp <= 0) return;
                    var dx = num(e.x, 0) - num(player.x, 0);
                    var dy = num(e.y, 0) - num(player.y, 0);
                    var dz = num(e.z, 0) - num(player.z, 0);
                    if (Math.sqrt(dx * dx + dy * dy + dz * dz) > ult.radius) return;
                    if (Math.abs(num(e.w, num(player.w, 0)) - num(player.w, 0)) > 1.5) return;
                    if (melee && typeof melee.applyHit === 'function') melee.applyHit(player, e, { x: dx, y: 0, z: dz }, ctx, ult.dmgMult);
                    else e.hp -= 40;
                    count++;
                });
                if (game && game.audio) game.audio.playSfx('swing', 0.8);
            } else if (cls === 'mage') {
                if (game && typeof game.dealAoEDamage === 'function') game.dealAoEDamage(player.x, player.z || player.y, ult.radius, ult.dmg, 'meteor');
                else if (typeof ctx.dealAoE === 'function') ctx.dealAoE(player, ult.radius, ult.dmg, 'meteor');
                else (enemies || []).forEach(function (e) { if (e && e.hp > 0) { e.hp -= ult.dmg; count++; } });
                if (game && game.audio) game.audio.playSfx('explode', 1.0);
            } else if (cls === 'tank') {
                (enemies || []).forEach(function (e) {
                    if (!e || e.hp <= 0) return;
                    var ddx = num(e.x, 0) - num(player.x, 0);
                    var ddz = (num(e.z, num(e.y, 0))) - (num(player.z, num(player.y, 0)));
                    if (Math.hypot(ddx, ddz) > ult.radius) return;
                    e.hp -= ult.dmg;
                    e.kx = num(e.kx, 0) + ddx * 3;
                    e.kz = num(e.kz, 0) + ddz * 3;
                    if (e.isBlocking !== undefined) e.isBlocking = false; // guard break
                    count++;
                });
                try { if (game && game.cameraController) game.cameraController.applyShake(12); } catch (_) {}
                if (game && game.audio) game.audio.playSfx('explode', 0.9);
            } else {
                // Support Nanite Swarm: heal self + poison enemies in radius.
                player.hp = Math.min(num(player.maxHp, 100), num(player.hp, 0) + ult.heal);
                (enemies || []).forEach(function (e) {
                    if (!e || e.hp <= 0) return;
                    var pdx = num(e.x, 0) - num(player.x, 0);
                    var pdz = (num(e.z, num(e.y, 0))) - (num(player.z, num(player.y, 0)));
                    if (Math.hypot(pdx, pdz) > ult.radius) return;
                    e.hp -= 30;
                    e.poison = (num(e.poison, 0) || 0) + 3;
                    count++;
                });
                if (game && game.audio) game.audio.playSfx('spell', 1.3);
            }
            if (game && game.combatText) game.combatText.spawnText(player.x, 24, player.z || player.y, ult.name.toUpperCase() + '!', 'crit');
        } catch (_) { /* ult must never break the frame */ }
        return { fired: true, ult: ult.name, hits: count };
    }

    // Per-frame wiring for the canon map. Reads the SAME input object the
    // game loop already polls (GG3D keys/mouse shape or GG4D Input4D shape
    // via the GG4D_Keymap helpers) — never binds its own listeners.
    // Returns { ability, ult, potion } outcomes for the HUD to consume.
    function pollCombatInput(player, input, enemies, ctx) {
        var out = { ability: null, ult: null, potion: false };
        if (!player || !input) return out;
        var K = window.GG4D_Keymap;
        var fEdge = K && typeof K.pressedEdge === 'function'
            ? K.pressedEdge(input, 'ability')
            : !!input.keys && !!input.keys.KeyF && !input._fHeld4d;
        if (input.keys && !K) {
            if (input.keys.KeyF && !input._fHeld4d) { input._fHeld4d = true; }
            else if (!input.keys.KeyF) input._fHeld4d = false;
            else fEdge = false;
        }
        var qEdge = K && typeof K.pressedEdge === 'function'
            ? K.pressedEdge(input, 'potion')
            : false;
        if (fEdge) out.ability = triggerAbility(player, ctx);
        if (qEdge) out.potion = drinkPotion(player, ctx);
        // NOTE: with input4d.js as-shipped, KeyQ feeds w-shift and KeyF is
        // swallowed — Q/F edges here stay false until the integrator applies
        // the keymap4d.js BINDING_CHANGE (ana Q->R, un-ignore F).
        if (K && typeof K.poll === 'function') { /* edges consumed above; keep fresh */ }
        return out;
    }

    window.GG4D_Abilities = {
        RACE_ABILITIES: RACE_ABILITIES,
        CLASS_ULTS: CLASS_ULTS,
        RACE_COOLDOWN: RACE_COOLDOWN,
        POTION_MAX: POTION_MAX,
        update: update,
        triggerAbility: triggerAbility,
        triggerUlt: triggerUlt,
        drinkPotion: drinkPotion,
        usePotion: drinkPotion, // GG3D usePotion alias
        pollCombatInput: pollCombatInput
    };
})();
