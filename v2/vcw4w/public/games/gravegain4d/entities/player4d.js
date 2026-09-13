/* GraveGain4D Player — DS-GRAV4D-04 (games lane, grav4d-04)
 * Bridge over GraveGain3D player stats + weapon/model resources. No model bytes copied.
 * Exposes: window.GraveGain4DPlayer { VERSION, CLASSES, create, integrate, setPuttStance }
 */
(function () {
    'use strict';
    if (window.GraveGain4DPlayer && window.GraveGain4DPlayer.VERSION) return;
    var VERSION = '1.0.0';

    // Mirror 3D class stat shape (race bonus resolved via 3D GameData when present).
    // 4D adds mana: the time-travel resource. Manual rewinds burn mana +
    // stamina; death-rewind burns maxHp + mana + stamina (see REWIND_COST).
    var CLASSES = {
        warrior: { label: 'Warrior', maxHp: 120, stamina: 100, mana: 60,  speed: 210, dmg: 14, emoji: '\u2694\uFE0F' },
        tank:    { label: 'Tank',    maxHp: 180, stamina: 90,  mana: 50,  speed: 165, dmg: 11, emoji: '\uD83D\uDEE1\uFE0F' },
        mage:    { label: 'Mage',    maxHp: 85,  stamina: 80,  mana: 120, speed: 195, dmg: 18, emoji: '\uD83E\uDE84' },
        support: { label: 'Support', maxHp: 100, stamina: 110, mana: 90,  speed: 200, dmg: 10, emoji: '\u2697\uFE0F' }
    };

    // 4D time-travel cost model (the feature over GraveGain3D):
    // - manual reverse (T, anytime): costs mana + stamina, never HP.
    // - death reverse (auto on lethal damage): rewinds time instead of game
    //   over, but permanently taxes maxHp plus drains mana/stamina.
    var REWIND_COST = {
        manual: { mana: 15, stamina: 10 },
        death: { maxHpLoss: 10, manaDrainFrac: 0.5, staminaDrainFrac: 0.5, reviveHpFrac: 0.5 }
    };

    function classStats(classType) {
        var base = CLASSES[classType] || CLASSES.warrior;
        // Bridge: prefer 3D ClassData when the 3D runtime is loaded.
        try {
            var GD = window.GraveGainGameData || null;
            if (GD && GD.ClassData && GD.ClassData[classType]) {
                var c = GD.ClassData[classType];
                return {
                    label: base.label,
                    maxHp: c.maxHp || base.maxHp,
                    stamina: (c.stamina !== undefined) ? c.stamina : base.stamina,
                    mana: (c.mana !== undefined) ? c.mana : base.mana,
                    speed: c.speed || base.speed,
                    dmg: c.dmg || base.dmg,
                    emoji: base.emoji
                };
            }
        } catch (_) { /* fall through to static mirror */ }
        return { label: base.label, maxHp: base.maxHp, stamina: base.stamina, mana: base.mana, speed: base.speed, dmg: base.dmg, emoji: base.emoji };
    }

    function create(opts) {
        opts = opts || {};
        var classType = opts.classType || 'warrior';
        var st = classStats(classType);
        var p = {
            classType: classType,
            label: st.label,
            pos4: { x: opts.x || 0, y: 0, z: opts.z || 0, w: opts.w || 0 },
            vel4: { x: 0, y: 0, z: 0, w: 0 },
            yaw: 0, pitch: 0, wTilt: 0,
            maxHp: st.maxHp + (opts.bonusHp || 0),
            stamina: st.stamina, maxStamina: st.stamina,
            mana: st.mana, maxMana: st.mana,
            speed: st.speed,
            dmg: st.dmg,
            level: 1, xp: 0, xpNext: 60, gold: 0,
            puttStance: false, puttAim: 0, puttCharge: 0,
            isDead: false,
            deathsRewound: 0,
            lastPos4: null,
            weapon: null, weaponKind: 'bridge'
        };
        p.hp = p.maxHp;
        mountWeapon(p, classType);
        return p;
    }

    function mountWeapon(p, classType) {
        // Bridge 1: GraveGainWeaponFactory.buildWeapon (full 3D rig).
        try {
            if (typeof window.GraveGainWeaponFactory !== 'undefined' &&
                window.GraveGainWeaponFactory && typeof window.GraveGainWeaponFactory.buildWeapon === 'function') {
                p.weapon = window.GraveGainWeaponFactory.buildWeapon(classType);
                p.weaponKind = 'GraveGainWeaponFactory';
                return p.weapon;
            }
        } catch (_) { /* fall through */ }
        // Bridge 2: GraveGain3DModels.buildWeapon passthrough.
        try {
            if (typeof window.GraveGain3DModels !== 'undefined' &&
                window.GraveGain3DModels && typeof window.GraveGain3DModels.buildWeapon === 'function') {
                p.weapon = window.GraveGain3DModels.buildWeapon(classType);
                p.weaponKind = 'GraveGain3DModels';
                return p.weapon;
            }
        } catch (_) { /* fall through */ }
        // Fallback: emoji descriptor (no THREE present).
        var st = CLASSES[classType] || CLASSES.warrior;
        p.weapon = { descriptor: true, emoji: st.emoji, classType: classType };
        p.weaponKind = 'emoji';
        return p.weapon;
    }

    function setPuttStance(p, on) {
        p.puttStance = !!on;
        if (!on) { p.puttCharge = 0; }
        return p.puttStance;
    }

    // input: { fwd,back,left,right (bool), ana,cata (bool Q/E), wUp,wDown (bool R/F),
    //          putt (bool G edge), aim (radians), charge (0..1) }
    // dt seconds. bounds: { minX,maxX,minZ,maxZ,minW,maxW } optional.
    function integrate(p, dt, input, bounds) {
        if (!p || p.isDead) return p;
        input = input || {};
        var sp = p.speed * (p.puttStance ? 0.35 : 1.0);
        var dx = ((input.right ? 1 : 0) - (input.left ? 1 : 0));
        var dz = ((input.back ? 1 : 0) - (input.fwd ? 1 : 0));
        var dw = ((input.wUp ? 1 : 0) - (input.wDown ? 1 : 0));
        var dy = ((input.ana ? 1 : 0) - (input.cata ? 1 : 0)); // Q ana / E kata vertical
        var len = Math.sqrt(dx * dx + dz * dz + dw * dw + dy * dy);
        if (len > 1) { dx /= len; dz /= len; dw /= len; dy /= len; }
        // Stamina drain on w-shift sprint.
        if (dw !== 0 && p.stamina > 0) {
            p.stamina = Math.max(0, p.stamina - 8 * dt);
        } else {
            p.stamina = Math.min(p.maxStamina, p.stamina + 6 * dt);
        }
        p.vel4.x = dx * sp; p.vel4.z = dz * sp; p.vel4.w = dw * sp * 0.6; p.vel4.y = dy * sp * 0.5;
        p.pos4.x += p.vel4.x * dt; p.pos4.z += p.vel4.z * dt;
        p.pos4.w += p.vel4.w * dt; p.pos4.y += p.vel4.y * dt;
        if (bounds) {
            if (bounds.minX !== undefined) p.pos4.x = Math.max(bounds.minX, Math.min(bounds.maxX, p.pos4.x));
            if (bounds.minZ !== undefined) p.pos4.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, p.pos4.z));
            if (bounds.minW !== undefined) p.pos4.w = Math.max(bounds.minW, Math.min(bounds.maxW, p.pos4.w));
        }
        if (typeof input.aim === 'number') p.puttAim = input.aim;
        if (typeof input.charge === 'number') p.puttCharge = Math.max(0, Math.min(1, input.charge));
        // Regen mirrors 3D hpRegen default 1.0; mana regens slower (time resource).
        p.hp = Math.min(p.maxHp, p.hp + 1.0 * dt);
        if (typeof p.mana === 'number' && typeof p.maxMana === 'number') {
            p.mana = Math.min(p.maxMana, p.mana + 2.0 * dt);
        }
        // Remember last safe position for death-rewind (cheap ring: keep one).
        try {
            if (p.hp > 0) {
                p.lastPos4 = { x: p.pos4.x, y: p.pos4.y, z: p.pos4.z, w: p.pos4.w };
            }
        } catch (_) { /* ignore */ }
        return p;
    }

    // Manual time reverse, usable at ANY point (T key / rewind edge).
    // Returns { ok, reason }. Costs mana + stamina; never HP. Fail-open.
    function reverseTime(p) {
        try {
            if (!p || p.isDead) return { ok: false, reason: 'dead' };
            var cost = REWIND_COST.manual;
            if ((p.mana || 0) < cost.mana) return { ok: false, reason: 'no-mana' };
            if ((p.stamina || 0) < cost.stamina) return { ok: false, reason: 'no-stamina' };
            p.mana -= cost.mana;
            p.stamina = Math.max(0, p.stamina - cost.stamina);
            if (p.lastPos4) {
                p.pos4 = { x: p.lastPos4.x, y: p.lastPos4.y, z: p.lastPos4.z, w: p.lastPos4.w };
            }
            p.vel4 = { x: 0, y: 0, z: 0, w: 0 };
            return { ok: true, reason: 'reversed' };
        } catch (_) { return { ok: false, reason: 'error' }; }
    }

    // Lethal-damage entry point. When damage would kill, time reverses
    // instead of dying: position rewinds to last safe pos, but the player
    // pays maxHp loss + mana/stamina drain. Returns { died, rewound }.
    // Fail-open: never throws; true game-over only when maxHp is exhausted.
    function damage(p, amount) {
        try {
            if (!p || p.isDead) return { died: true, rewound: false };
            var dmg = Number(amount);
            if (!isFinite(dmg) || dmg <= 0) return { died: false, rewound: false };
            p.hp -= dmg;
            if (p.hp > 0) return { died: false, rewound: false };
            return applyDeathRewind(p);
        } catch (_) { return { died: false, rewound: false }; }
    }

    function applyDeathRewind(p) {
        try {
            var cost = REWIND_COST.death;
            p.maxHp = Math.max(20, (p.maxHp || 100) - cost.maxHpLoss);
            p.maxMana = Math.max(10, (p.maxMana || 60) - 2);
            p.maxStamina = Math.max(10, (p.maxStamina || 100) - 2);
            p.mana = Math.max(0, (p.mana || 0) * (1 - cost.manaDrainFrac));
            p.stamina = Math.max(0, (p.stamina || 0) * (1 - cost.staminaDrainFrac));
            if (p.lastPos4) {
                p.pos4 = { x: p.lastPos4.x, y: p.lastPos4.y, z: p.lastPos4.z, w: p.lastPos4.w };
            }
            p.vel4 = { x: 0, y: 0, z: 0, w: 0 };
            p.deathsRewound = (p.deathsRewound || 0) + 1;
            if (p.maxHp <= 20 && (p.deathsRewound || 0) > 8) {
                // Timeline exhausted: true death after repeated rewinds.
                p.hp = 0; p.isDead = true;
                return { died: true, rewound: false };
            }
            p.hp = Math.max(1, Math.floor(p.maxHp * cost.reviveHpFrac));
            p.isDead = false;
            return { died: false, rewound: true };
        } catch (_) {
            try { p.hp = 1; p.isDead = false; } catch (_) { /* ignore */ }
            return { died: false, rewound: true };
        }
    }

    function gainXp(p, amount) {
        p.xp += amount;
        while (p.xp >= p.xpNext) {
            p.xp -= p.xpNext; p.level += 1;
            p.xpNext = Math.floor(p.xpNext * 1.4);
            p.maxHp += 12; p.hp = p.maxHp; p.dmg += 2;
        }
        return p.level;
    }

    window.GraveGain4DPlayer = {
        VERSION: VERSION, CLASSES: CLASSES, REWIND_COST: REWIND_COST,
        create: create, mountWeapon: mountWeapon, integrate: integrate,
        setPuttStance: setPuttStance, gainXp: gainXp, classStats: classStats,
        reverseTime: reverseTime, damage: damage, applyDeathRewind: applyDeathRewind
    };
})();
