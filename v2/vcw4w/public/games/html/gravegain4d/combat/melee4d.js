(function () {
    'use strict';

    // GraveGain4D — melee4d: GG3D-parity 3-hit combo melee + 4D slice check.
    // GG3D source of truth:
    //   gravegain3d/engine/game-data.js      (ClassData baseDmg/crit/range)
    //   gravegain3d/engine/game-runtime.js   (triggerMeleeAttack: swingCombo
    //     cycles 0..2, mage/support fire projectiles, warrior/tank 70-degree
    //     cone sweep + applyHitToEnemy crit/knockback/blood)
    //   gravegain3d/entities/player.js       (takeDamage block hook lives in
    //     block4d.js here; potion lives in abilities4d.js drinkPotion)
    // 4D twist: range is checked in 3D (x,y,z) against ClassData.range, plus
    // a |dw| slice tolerance so ana/kata-adjacent targets are hittable but
    // off-slice targets are not. Left-click doubles as putt: the integrator
    // should call tryAttack() first and fall through to the putt charge
    // (input4d.js startPuttCharge) only when no enemy was in range.
    // No fullscreen bindings, no dblclick listeners.

    var CLASS_MELEE = {
        warrior: { baseDmg: 20, crit: 0.15, critMult: 2.0, range: 68,  attackSpeed: 0.28, kind: 'slash', coneDot: 0.45 },
        mage:    { baseDmg: 26, crit: 0.20, critMult: 2.2, range: 450, attackSpeed: 0.38, kind: 'bolt',  coneDot: 0.0 },
        tank:    { baseDmg: 32, crit: 0.10, critMult: 1.8, range: 75,  attackSpeed: 0.45, kind: 'slam',  coneDot: 0.45 },
        support: { baseDmg: 14, crit: 0.12, critMult: 1.7, range: 400, attackSpeed: 0.18, kind: 'dart',  coneDot: 0.0 }
    };

    var COMBO_WINDOW = 1.1;   // seconds to chain hit N -> N+1 (GG3D: swing-gated)
    var SLICE_TOL = 1.5;      // |dw| tolerance in w-slices for melee slash/slam
    var BOLT_SLICE_TOL = 2.5; // bolts/darts travel, so a wider w tolerance

    function classOf(player) {
        var c = (player && player.classType) || 'warrior';
        return CLASS_MELEE[c] || CLASS_MELEE.warrior;
    }

    function num(v, fb) {
        var n = parseFloat(v);
        return isFinite(n) ? n : fb;
    }

    function ensureState(player) {
        if (!player._melee4d) {
            player._melee4d = { combo: 0, comboTimer: 0, swingTime: 0, swingDuration: 0.28 };
        }
        return player._melee4d;
    }

    function update(player, dt) {
        if (!player) return;
        var s = ensureState(player);
        if (s.swingTime > 0) s.swingTime = Math.max(0, s.swingTime - dt);
        if (s.comboTimer > 0) {
            s.comboTimer -= dt;
            if (s.comboTimer <= 0) s.combo = 0;
        }
    }

    function ready(player) {
        var s = ensureState(player);
        return s.swingTime <= 0 && !player.isDead;
    }

    function dist3(ax, ay, az, bx, by, bz) {
        var dx = ax - bx, dy = ay - by, dz = az - bz;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Voxel-gore hook: prefers the 4D slice renderer's gore cubes, falls
    // back to GG3D-style vfx hooks when present, never throws.
    function gore(ctx, x, y, z, crit) {
        try {
            if (ctx && ctx.slice && typeof ctx.slice.spawnGore === 'function') {
                ctx.slice.spawnGore(ctx.slice, x, y, z, crit ? 14 : 8);
                return;
            }
            var R = window.GG4D_SliceRenderer || window.GG4D_Slice;
            if (R && typeof R.spawnGore === 'function') { R.spawnGore(R.handle || R, x, y, z, crit ? 14 : 8); return; }
            var game = (ctx && ctx.game) || window.GG4D_Game || window.GraveGainGame;
            if (game && game.vfx && typeof game.vfx.spawnBlood === 'function') {
                game.vfx.spawnBlood(x, (y !== undefined ? y : z), 0xcc2222);
                return;
            }
            if (game && typeof game.emitGraphicsBurst === 'function') {
                game.emitGraphicsBurst(x, y, crit ? '#fbbf24' : '#ef4444', crit ? 1.5 : 0.8);
            }
        } catch (_) { /* gore is garnish */ }
    }

    function sfx(ctx, type, pitch) {
        try {
            var game = (ctx && ctx.game) || window.GG4D_Game || window.GraveGainGame;
            if (game && game.audio && typeof game.audio.playSfx === 'function') game.audio.playSfx(type, pitch);
            else if (window.GG4D_Sound && typeof window.GG4D_Sound.play === 'function') window.GG4D_Sound.play(type);
        } catch (_) { /* silent */ }
    }

    function text(ctx, x, y, z, msg, cls) {
        try {
            var game = (ctx && ctx.game) || window.GG4D_Game || window.GraveGainGame;
            if (game && game.combatText && typeof game.combatText.spawnText === 'function') {
                game.combatText.spawnText(x, y, z, msg, cls);
            }
        } catch (_) { /* silent */ }
    }

    function rollCrit(player, spec) {
        var bonus = 0;
        try {
            if (player.hasPerk && player.hasPerk('critfury')) bonus += 0.20;
            if (player.perks && player.perks.some(function (p) { return p && p.id === 'critfury'; })) bonus += 0.0; // counted once via hasPerk when present
        } catch (_) { /* ignore */ }
        return Math.random() < (spec.crit + bonus);
    }

    function applyHit(player, enemy, dir, ctx, comboMult) {
        var spec = classOf(player);
        var dmg = spec.baseDmg * num(comboMult, 1);
        try {
            if (player.dmgMult) dmg *= num(player.dmgMult, 1);
        } catch (_) { /* ignore */ }
        var isCrit = rollCrit(player, spec);
        if (isCrit) dmg *= spec.critMult;
        enemy.hp = num(enemy.hp, 0) - dmg;
        if (dir) {
            enemy.kx = num(enemy.kx, 0) + dir.x * 160;
            enemy.ky = num(enemy.ky, 0) + (dir.y || 0) * 40;
            enemy.kz = num(enemy.kz, 0) + (dir.z || 0) * 160;
        }
        if (ctx && typeof ctx.onHit === 'function') { try { ctx.onHit(enemy, dmg, isCrit); } catch (_) {} }
        gore(ctx, enemy.x, enemy.y, enemy.z, isCrit);
        sfx(ctx, isCrit ? 'crit' : 'hit');
        text(ctx, enemy.x, 20, (enemy.z !== undefined ? enemy.z : enemy.y),
            (isCrit ? 'CRIT! ' : '') + Math.round(dmg), isCrit ? 'crit' : 'damage');
        // Rage feeds Orc burst (GG3D parity: dealing damage also rages via ctx).
        try {
            if (player.race === 'orc') player.rage = Math.min(100, num(player.rage, 0) + dmg * 0.25);
            if (player.hasPerk && player.hasPerk('vampiric')) {
                player.hp = Math.min(player.maxHp, player.hp + Math.max(1, dmg * 0.15));
            }
        } catch (_) { /* ignore */ }
        return { dmg: dmg, crit: isCrit };
    }

    // Main entry: left-click attack. Returns a result object; when
    // result.didAttack is false the integrator should fall through to the
    // golf putt path (input4d.js putt charge).
    function tryAttack(player, enemies, aimDir, ctx) {
        ctx = ctx || {};
        if (!player || player.isDead) return { didAttack: false };
        if (!ready(player)) return { didAttack: false, busy: true };
        var spec = classOf(player);
        var s = ensureState(player);

        s.swingDuration = spec.attackSpeed;
        s.swingTime = spec.attackSpeed;
        var comboIndex = s.combo; // 0,1,2 — this swing's step
        var comboMult = [1.0, 1.0, 1.6][comboIndex] || 1.0; // 3rd hit finisher
        s.combo = (s.combo + 1) % 3;
        s.comboTimer = COMBO_WINDOW;

        var px = num(player.x, 0), py = num(player.y, 0), pz = num(player.z, 0), pw = num(player.w, 0);
        var dir = aimDir || { x: Math.sin(player.yaw || 0), y: 0, z: -Math.cos(player.yaw || 0) };
        var hits = [];

        if (spec.kind === 'bolt' || spec.kind === 'dart') {
            // Mage arcane bolts / Support bio-darts: spawn one projectile via
            // the ctx bridge (ballistics4d) so w-travel is simulated there.
            sfx(ctx, 'spell', spec.kind === 'dart' ? 1.6 : 1.0);
            var spawned = null;
            try {
                if (typeof ctx.spawnProjectile === 'function') {
                    spawned = ctx.spawnProjectile({
                        x: px, y: py + 18, z: pz, w: pw,
                        vx: dir.x * (spec.kind === 'dart' ? 480 : 400),
                        vy: dir.y || 0, vz: dir.z * (spec.kind === 'dart' ? 480 : 400),
                        dmg: spec.baseDmg * comboMult, isPlayer: true,
                        kind: spec.kind === 'dart' ? 'chem' : 'magic'
                    });
                }
            } catch (_) { spawned = null; }
            text(ctx, px, 20, pz, comboIndex === 2 ? 'FINISHER!' : ('HIT ' + (comboIndex + 1)), 'damage');
            return { didAttack: true, combo: comboIndex, kind: spec.kind, projectile: spawned || true, hits: hits };
        }

        // Warrior slash / Tank slam: 3D range + |dw| slice gate + facing cone.
        sfx(ctx, 'swing');
        var tol = SLICE_TOL;
        var list = enemies || [];
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (!e || e.hp <= 0) continue;
            var d3 = dist3(px, py, pz, num(e.x, 0), num(e.y, 0), num(e.z, 0));
            if (d3 > spec.range + num(e.radius, 0)) continue;
            if (Math.abs(num(e.w, pw) - pw) > tol) continue; // off-slice: putt past it
            var dx = num(e.x, 0) - px, dz = num(e.z, 0) - pz;
            var len = Math.hypot(dx, dz) || 1;
            var dot = (dir.x * dx + dir.z * dz) / len;
            if (dot > spec.coneDot) {
                var r = applyHit(player, e, dir, ctx, comboMult);
                hits.push({ enemy: e, dmg: r.dmg, crit: r.crit });
            }
        }
        if (comboIndex === 2) text(ctx, px, 24, pz, 'FINISHER!', 'crit');
        return { didAttack: true, combo: comboIndex, kind: spec.kind, hits: hits };
    }

    window.GG4D_Melee = {
        TABLE: CLASS_MELEE,
        COMBO_WINDOW: COMBO_WINDOW,
        SLICE_TOL: SLICE_TOL,
        BOLT_SLICE_TOL: BOLT_SLICE_TOL,
        update: update,
        ready: ready,
        tryAttack: tryAttack,
        applyHit: applyHit
    };
})();
