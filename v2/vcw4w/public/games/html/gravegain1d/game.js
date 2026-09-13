/* GraveGain1D: The Ley-Line March (v2-native, no v1 source).
 *
 * A one-dimensional GraveGain RPG. The player walks a ley-line east:
 * always right, never left, never jump. One shared tick core drives TWO
 * timing modes: pure turn-based (every input is one tick) and real-time
 * (a live clock ticks the same rules). Only the clock differs.
 *
 * Vanilla IIFE, no dependencies (FourWeirdGraphics / FourWeirdWorkers are
 * optional and guarded). Never throws out of event handlers. Idempotent.
 * Exposes window.GraveGain1D = { VERSION, newRun, tick, CLASSES, SECTORS }.
 */
(function () {
    'use strict';
    if (window.GraveGain1D) return;

    var VERSION = '1.0.0';
    var SAVE_KEY = 'gravegain1d_save_v1';
    var WORLD_LEN = 500;
    var SECTOR_LEN = 100;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---------------- Data ----------------
    var CLASSES = {
        rifleman: { id: 'rifleman', name: 'Line Rifleman', emoji: '🔫', hp: 20, atk: 5, def: 1, spd: 3, range: 4,
            ability: { name: 'Burst Fire', cd: 6, desc: 'Hit ALL enemies in range 4' },
            blurb: 'Lisa walked the line — now it is your turn. Steady aim, sealed helm, no one left behind.' },
        sapper: { id: 'sapper', name: 'Forge Sapper', emoji: '🛠️', hp: 30, atk: 4, def: 3, spd: 1, range: 3,
            ability: { name: 'Stone Oath', cd: 8, desc: 'Shield 8 for 2 ticks + heal 6' },
            blurb: 'Borin needs hands that fix under fire. Carry the big charge, light the dark, break the golems.' },
        runner: { id: 'runner', name: 'Grove Runner', emoji: '🌿', hp: 18, atk: 7, def: 0, spd: 4, range: 3,
            ability: { name: 'Hex Nova', cd: 7, desc: '3 dmg to all in range 4 + slow + drain' },
            blurb: 'Aelindra\u2019s pick: fast feet, quiet steps, field-blessed. Outrun the swarm, cut the anchors first.' }
    };

    var KINDS = {
        shambler: { name: 'Risen Shambler', emoji: '🧟', hp: 12, atk: 2, def: 0, spd: 2, aggro: 6, xp: 3, gold: 2 },
        swarm: { name: 'Skull Swarm', emoji: '💀', hp: 5, atk: 3, def: 0, spd: 4, aggro: 8, xp: 2, gold: 1 },
        brute: { name: 'Zed Brute', emoji: '👹', hp: 22, atk: 5, def: 1, spd: 1, aggro: 5, xp: 5, gold: 4 },
        necro: { name: 'Array Necromancer', emoji: '🧙', hp: 20, atk: 4, def: 0, spd: 2, aggro: 7, xp: 7, gold: 5 }
    };

    var SECTORS = [
        { name: 'Crash Flats', theme: '#1e293b', sky: '#0b0f1a',
            brief: 'Valley Net: "Dropship 420 is down ahead. Fifteen risen converging — helmet seals LOCKED."\nLisa Park: "We put our people back to rest."',
            spawn: [['shambler', 8]],
            boss: { name: 'James Wright, the First Risen', emoji: '🪦', hp: 32, atk: 3, def: 0, mech: 'wright' },
            codex: 'helmet' },
        { name: 'Whisper Groves', theme: '#064e3b', sky: '#02120d',
            brief: 'Queen Aelindra: "The Mother Tree bleeds corruption. Help us free our fallen seers."\nValley Net: "Break the necro-anchors ahead."',
            spawn: [['shambler', 6], ['swarm', 8], ['necro', 1]],
            boss: { name: 'Mirathiel, Echo of the Elder', emoji: '👻', hp: 45, atk: 5, def: 0, mech: 'mirathiel' },
            codex: 'compact' },
        { name: 'Sparkite Cut', theme: '#7c2d12', sky: '#1c0a02',
            brief: 'Forgemaster Borin: "Lower forges overrun! My ancestor\u2019s Golem Hammer lies trapped below."\nArty Fisher: "Stay in the lit lanes."',
            spawn: [['shambler', 6], ['brute', 4]],
            boss: { name: 'The Vault Warden, Forge-Golem', emoji: '🗿', hp: 48, atk: 6, def: 1, mech: 'warden' },
            codex: 'sparkite' },
        { name: 'Ash Gate', theme: '#7f1d1d', sky: '#1c0505',
            brief: 'Warchief Groknak: "Risen orcs ahead — my own blood, wrong eyes. Aim for the joints."\nValley Net: "Hold until artillery locks."',
            spawn: [['shambler', 6], ['brute', 3], ['necro', 1], ['swarm', 4]],
            boss: { name: 'Karguk, Blood-Bound Berserker', emoji: '😈', hp: 60, atk: 6, def: 1, mech: 'karguk' },
            codex: 'guy' },
        { name: 'Relay Approach', theme: '#4c1d95', sky: '#0d021c',
            brief: 'Valley Net: "That is his spire on the horizon. Carry the charge by hand."\nPresident Angel Good: "By the Compact — no race abandons another. End this."',
            spawn: [['shambler', 4], ['brute', 4], ['necro', 2], ['swarm', 8]],
            boss: { name: 'Gate Titan, Herald of the Necrogenesis', emoji: '👹', hp: 85, atk: 6, def: 1, mech: 'titan' },
            codex: 'good' }
    ];

    var CODEX = {
        helmet: { title: 'Helmet On, Soldier', text: 'MoonRock air carries compounds lethal to human lungs. Seal fails, lungs fail — ninety seconds, no second chances.' },
        mercenary: { title: 'LuckyStarShip\u2019s Choice', text: 'MERCENARY dream-picked the FarStar system across 69 light-years and a 200-year voyage. It saw probable futures — it did not foresee him.' },
        compact: { title: 'The Compact of Shared Blood', text: 'On Day 8, Aelindra, Borin, Groknak and Captain Chen mixed blood in one cup and drank. Until the last undead falls, no race abandons another.' },
        sparkite: { title: 'Sparkite & Steel', text: 'Dwarven sparkite powers forges, alchemy — and now Hades\u2019 conduits. Hold the vaults and you starve the Array of fuel.' },
        guy: { title: 'Guy Young\u2019s Paradox', text: 'Clint Oldman died clean at 258, the only natural death on MoonRock — then rose like the rest. Time is weird here; grief is weirder.' },
        good: { title: 'President Good\u2019s Order', text: 'Botanist turned president, Angel Good authorized SafeSpaces, KillCredits and the sky-hammer strike. Her signature, her responsibility — finish it.' }
    };

    var FINALE = {
        hades: 'HADES: "Two centuries alone taught me death is a disease — kneel, child, and no one you love need ever stay buried."',
        lisa: 'LISA: "You stole James, Clint, and every grave that would not stay shut — our nightmare ends HERE, for the living!"',
        valley: 'VALLEY NET: "Array DEACTIVATED. Signal terminated. MoonRock is saved — helmets optional in the SafeSpaces tonight."'
    };

    // ---------------- Profile ----------------
    function loadProfile() {
        var p = { bestX: 0, bestStars: 0, stars: [0, 0, 0, 0, 0], wins: 0, endlessBest: 0, codex: [], settings: { mode: 'turn', speed: 1, cls: 'rifleman' } };
        try {
            var raw = window.localStorage.getItem(SAVE_KEY);
            if (raw) {
                var d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    for (var k in p) if (d[k] !== undefined) p[k] = d[k];
                    if (!p.settings) p.settings = { mode: 'turn', speed: 1, cls: 'rifleman' };
                }
            }
        } catch (e) { /* ignore */ }
        return p;
    }

    function saveProfile(p) {
        try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(p)); } catch (e) { /* quota */ }
    }

    // ---------------- Run state ----------------
    var nextId = 1;

    function newRun(seed, classId, mode) {
        var c = CLASSES[classId] || CLASSES.rifleman;
        var s = {
            seed: seed | 0, cls: c.id, mode: mode === 'realtime' ? 'realtime' : 'turn',
            x: 0, hp: c.hp, maxHp: c.hp, atk: c.atk, def: c.def, spd: c.spd, range: c.range,
            level: 1, xp: 0, gold: 0, potions: 2, kills: 0, ticks: 0,
            enemies: [], cooldowns: { ability: 0 }, shield: 0, shieldT: 0,
            sector: 0, cycle: 0, gateX: SECTOR_LEN - 1, gateOpen: false, boss: null,
            dmgTaken: 0, potionsUsed: 0, over: false, won: false, endless: false,
            rng: mulberry32((seed | 0) || 1),
            events: []
        };
        spawnSector(s, 0);
        return s;
    }

    function xpNext(level) { return 8 + level * 6; }

    // Eastern cap: the campaign world ends at WORLD_LEN; endless chunks
    // extend the line forever (gateX marches east each clear).
    function xCap(s) { return s.endless ? s.gateX + 4 : WORLD_LEN - 1; }

    function scaled(base, cycle) {
        if (!cycle) return base;
        return { hp: Math.round(base.hp * (1 + 0.25 * cycle)), atk: base.atk + cycle, xp: base.xp + cycle, gold: base.gold };
    }

    function spawnSector(s, idx, baseOverride) {
        s.sector = idx;
        s.enemies = [];
        s.gateOpen = false;
        s.boss = null;
        s.dmgTaken = 0;
        s.potionsUsed = 0;
        var base = (baseOverride === undefined) ? idx * SECTOR_LEN : baseOverride;
        s.chunkBase = base;
        s.gateX = base + SECTOR_LEN - 1;
        var comp = SECTORS[Math.min(idx, 4)].spawn;
        var cursor = base + 12;
        for (var i = 0; i < comp.length; i++) {
            var kind = comp[i][0], n = comp[i][1];
            for (var j = 0; j < n; j++) {
                var k = KINDS[kind];
                var st = scaled({ hp: k.hp, atk: k.atk, xp: k.xp, gold: k.gold }, s.cycle);
                cursor += 4 + Math.floor(s.rng() * 5);
                if (cursor > base + SECTOR_LEN - 14) cursor = base + SECTOR_LEN - 14;
                s.enemies.push({ id: nextId++, kind: kind, x: cursor, hp: st.hp, maxHp: st.hp,
                    atk: st.atk, def: k.def, spd: k.spd, aggro: k.aggro, emoji: k.emoji,
                    name: k.name, xp: st.xp, gold: st.gold, t: 0, slow: 0, isBoss: false });
            }
        }
    }

    function spawnBoss(s) {
        var def = SECTORS[Math.min(s.sector, 4)].boss;
        var st = scaled({ hp: def.hp, atk: def.atk, xp: 20, gold: 30 }, s.cycle);
        var b = { id: nextId++, kind: 'boss', x: s.gateX - 2, hp: st.hp, maxHp: st.hp,
            atk: st.atk, def: def.def, spd: 2, aggro: 999, emoji: def.emoji,
            name: def.name, xp: st.xp, gold: st.gold, t: 0, slow: 0, isBoss: true,
            mech: def.mech, half: false };
        s.enemies.push(b);
        s.boss = b;
        return b;
    }

    function roll(s) { return Math.floor(s.rng() * 3) - 1; }

    function damage(s, target, amount, isPlayer, events) {
        amount = Math.max(1, Math.round(amount));
        if (!isPlayer) {
            target.hp -= amount;
            events.push({ t: 'hit', x: target.x, dmg: amount, foe: true });
        } else {
            // SPD dodge: fast couriers slip blows. Shared core, both modes.
            var dodgeCh = Math.max(0, (s.spd - 2) * 0.10);
            if (s.rng() < dodgeCh) {
                events.push({ t: 'hit', x: s.x, dmg: 0, foe: false, blocked: 0, dodged: true });
                return 0;
            }
            var blocked = 0;
            if (s.shieldT > 0 && s.shield > 0) {
                blocked = Math.min(s.shield, amount);
                s.shield -= blocked;
                amount -= blocked;
            }
            s.hp -= amount;
            s.dmgTaken += amount;
            events.push({ t: 'hit', x: s.x, dmg: amount, foe: false, blocked: blocked });
        }
        return amount;
    }

    function gainXp(s, n, events) {
        s.xp += n;
        while (s.xp >= xpNext(s.level)) {
            s.xp -= xpNext(s.level);
            s.level += 1;
            s.maxHp += 2;
            s.hp = Math.min(s.maxHp, s.hp + 3);
            if (s.level % 2 === 0) s.atk += 1;
            events.push({ t: 'level', level: s.level });
        }
    }

    function nearestFoe(s, range) {
        var best = null, bd = 1e9;
        for (var i = 0; i < s.enemies.length; i++) {
            var e = s.enemies[i];
            if (e.hp <= 0) continue;
            var d = Math.abs(e.x - s.x);
            if (d <= range && d < bd) { bd = d; best = e; }
        }
        return best;
    }

    function foeAt(s, x) {
        for (var i = 0; i < s.enemies.length; i++) {
            var e = s.enemies[i];
            if (e.hp > 0 && Math.abs(e.x - x) < 0.6) return e;
        }
        return null;
    }

    function killFoe(s, e, events) {
        s.kills += 1;
        s.gold += e.gold;
        gainXp(s, e.xp, events);
        events.push({ t: 'kill', x: e.x, name: e.name, gold: e.gold });
        if (e.isBoss) {
            s.gateOpen = true;
            s.boss = null;
            events.push({ t: 'bossdown', name: e.name });
        }
    }

    function playerAttack(s, events, multi) {
        var range = s.range;
        var targets = [];
        if (multi) {
            for (var i = 0; i < s.enemies.length; i++) {
                var e = s.enemies[i];
                if (e.hp > 0 && Math.abs(e.x - s.x) <= range) targets.push(e);
            }
            if (!targets.length) { events.push({ t: 'miss' }); return; }
        } else {
            var f = nearestFoe(s, range);
            if (!f) { events.push({ t: 'miss' }); return; }
            targets.push(f);
        }
        for (var j = 0; j < targets.length; j++) {
            var crit = s.rng() < 0.125;
            var dmg = Math.max(1, s.atk - targets[j].def + roll(s));
            if (crit) dmg *= 2;
            damage(s, targets[j], dmg, false, events);
            events.push({ t: 'swing', x: targets[j].x, crit: crit });
            if (targets[j].hp <= 0) killFoe(s, targets[j], events);
        }
    }

    function playerAbility(s, events) {
        if (s.cooldowns.ability > 0) { events.push({ t: 'nocool' }); return; }
        if (s.cls === 'rifleman') {
            s.cooldowns.ability = 6;
            playerAttack(s, events, true);
            events.push({ t: 'ability', name: 'Burst Fire' });
        } else if (s.cls === 'sapper') {
            s.cooldowns.ability = 8;
            s.shield = 8; s.shieldT = 2;
            s.hp = Math.min(s.maxHp, s.hp + 6);
            events.push({ t: 'ability', name: 'Stone Oath' });
        } else {
            s.cooldowns.ability = 7;
            var drained = 0;
            for (var i = s.enemies.length - 1; i >= 0; i--) {
                var e = s.enemies[i];
                if (e.hp > 0 && Math.abs(e.x - s.x) <= 4) {
                    damage(s, e, 3, false, events);
                    e.slow = 1;
                    drained += 1;
                    if (e.hp <= 0) killFoe(s, e, events);
                }
            }
            if (drained > 0) s.hp = Math.min(s.maxHp, s.hp + Math.min(4, drained));
            events.push({ t: 'ability', name: 'Hex Nova' });
        }
    }

    function drinkPotion(s, events) {
        if (s.potions <= 0) { events.push({ t: 'nopotion' }); return; }
        s.potions -= 1;
        s.potionsUsed += 1;
        s.hp = Math.min(s.maxHp, s.hp + Math.ceil(s.maxHp / 2));
        events.push({ t: 'potion', hp: s.hp });
    }

    function enemyAct(s, e, events) {
        if (e.hp <= 0) return;
        e.t += 1;
        if (e.slow > 0) { e.slow -= 1; events.push({ t: 'slow', x: e.x }); return; }
        var d = Math.abs(e.x - s.x);
        if (d > e.aggro) return; // dormant
        var toward = e.x < s.x ? 1 : -1;
        function stepOk(nx) {
            if (nx < 0 || nx > xCap(s)) return false;
            var f = foeAt(s, nx);
            if (f && f !== e) return false;
            if (Math.abs(nx - s.x) < 0.6) return false;
            return true;
        }
        // base = flat pre-mitigation damage (normal melee passes e.atk,
        // specials pass their scripted number: slam 8, charge 7, etc).
        function meleeHit(base) {
            var dmg = Math.max(1, (base || 1) - s.def + roll(s));
            damage(s, null, dmg, true, events);
        }
        if (e.isBoss) { bossAct(s, e, events, d, toward, stepOk, meleeHit); return; }
        if (e.kind === 'swarm') {
            if (d <= 1) { // detonate
                meleeHit(e.atk);
                e.hp = 0;
                events.push({ t: 'explode', x: e.x });
                return;
            }
            for (var k = 0; k < 2; k++) { var nx = e.x + toward; if (stepOk(nx)) e.x = nx; else break; }
            return;
        }
        if (e.kind === 'necro') {
            if (d < 3) { var nx2 = e.x - toward; if (stepOk(nx2)) e.x = nx2; }
            else if (d > 5) { var nx3 = e.x + toward; if (stepOk(nx3)) e.x = nx3; }
            if (e.t % 5 === 0) {
                s.enemies.push({ id: nextId++, kind: 'shambler', x: Math.max(0, s.x - 2),
                    hp: 12, maxHp: 12, atk: 2, def: 0, spd: 2, aggro: 99,
                    emoji: '🧟', name: 'Risen Shambler', xp: 3, gold: 2, t: 0, slow: 0, isBoss: false });
                events.push({ t: 'summon', x: s.x - 2 });
            } else if (d <= 5 && e.t % 2 === 0) {
                meleeHit(e.atk); // array bolt, every other tick
            }
            return;
        }
        if (e.kind === 'brute') {
            if (e.t % 4 === 0 && d <= 2) { meleeHit(8); return; } // forge slam, flat 8
            if (d > 1) { var nxb = e.x + toward; if (stepOk(nxb)) e.x = nxb; }
            else meleeHit(e.atk);
            return;
        }
        // shambler
        if (d > 1) { var nxs = e.x + toward; if (stepOk(nxs)) e.x = nxs; }
        else meleeHit(e.atk);
    }

    function bossAct(s, e, events, d, toward, stepOk, meleeHit) {
        var def = e.mech;
        if (def === 'wright') {
            if (e.t % 4 === 0 && d <= 6) { // Crash Charge telegraph then rush
                e.x = s.x + 1;
                meleeHit(7); // flat 7 charge
                events.push({ t: 'charge', x: e.x });
                return;
            }
            if (e.t % 6 === 0) {
                for (var i = 0; i < 2; i++) {
                    s.enemies.push({ id: nextId++, kind: 'shambler', x: Math.min(xCap(s), e.x + 2 + i),
                        hp: 12, maxHp: 12, atk: 2, def: 0, spd: 2, aggro: 99, emoji: '🧟',
                        name: 'Risen Shambler', xp: 3, gold: 2, t: 0, slow: 0, isBoss: false });
                }
                events.push({ t: 'summon', x: e.x + 2 });
                return;
            }
        } else if (def === 'mirathiel') {
            if (e.t % 5 === 0) {
                s.enemies.push({ id: nextId++, kind: 'shambler', x: Math.max(0, s.x - 2),
                    hp: 12, maxHp: 12, atk: 2, def: 0, spd: 2, aggro: 99, emoji: '🧟',
                    name: 'Root-Bound Husk', xp: 3, gold: 2, t: 0, slow: 0, isBoss: false });
                events.push({ t: 'summon', x: s.x - 2 });
            }
            if (d <= 5 && e.t % 2 === 0) { // Thorn Volley pierces 2 DEF, every other tick
                var dmg = Math.max(1, e.atk - Math.max(0, s.def - 2) + roll(s));
                damage(s, null, dmg, true, events);
                return;
            }
            if (d > 5) { var nx = e.x + toward; if (stepOk(nx)) e.x = nx; }
            return;
        } else if (def === 'warden') {
            if (e.t % 2 === 1) return; // slow golem: acts every 2nd tick
            if (!e.half && e.hp <= e.maxHp / 2) { e.half = true; e.def += 1; events.push({ t: 'enrage', name: e.name }); }
            if (e.t % 4 === 0 && d <= 2) { meleeHit(9); return; } // forge slam, flat 9
            if (d > 1) { var nxw = e.x + toward; if (stepOk(nxw)) e.x = nxw; }
            else meleeHit(e.atk);
            return;
        } else if (def === 'karguk') {
            if (e.t % 5 === 0) { // Down-the-Line Charge: hits wherever you stand
                var dmg2 = Math.max(1, 4 - s.def + roll(s));
                damage(s, null, dmg2, true, events);
                events.push({ t: 'charge', x: s.x });
                return;
            }
            if (d > 1) { var nxk = e.x + toward; if (stepOk(nxk)) e.x = nxk; }
            else meleeHit(e.atk);
            // War Drum: minions +2 ATK while Karguk lives (applied at damage time via aura)
            return;
        } else if (def === 'titan') {
            if (!e.half && e.hp <= e.maxHp / 2) {
                e.half = true;
                var dead = s.enemies.filter(function (m) { return !m.isBoss && m.hp <= 0; }).slice(-2);
                for (var ri = 0; ri < dead.length; ri++) {
                    dead[ri].hp = Math.ceil(dead[ri].maxHp / 2);
                    events.push({ t: 'resurrect', x: dead[ri].x });
                }
                events.push({ t: 'enrage', name: e.name });
            }
            if (e.t % 5 === 0) { // Array Pulse
                damage(s, null, Math.max(1, 3 - s.def + roll(s)), true, events);
                s.enemies.push({ id: nextId++, kind: 'swarm', x: Math.min(xCap(s), s.x + 3),
                    hp: 5, maxHp: 5, atk: 3, def: 0, spd: 4, aggro: 99, emoji: '💀',
                    name: 'Pulse Skull', xp: 2, gold: 1, t: 0, slow: 0, isBoss: false });
                events.push({ t: 'pulse', x: s.x });
                return;
            }
            if (d > 1) { var nxt = e.x + toward; if (stepOk(nxt)) e.x = nxt; }
            else meleeHit(e.atk);
            return;
        }
        if (d > 1) { var nxd = e.x + toward; if (stepOk(nxd)) e.x = nxd; }
        else meleeHit(e.atk);
    }

    // The shared tick core. action = { move:0|1, attack:bool, ability:bool, potion:bool, wait:bool }.
    // Returns the events list. Mutates state. Deterministic given state.rng.
    function tick(s, action) {
        var events = [];
        if (s.over) return events;
        s.ticks += 1;
        action = action || { wait: true };
        // DoT/shield decay first.
        if (s.shieldT > 0) { s.shieldT -= 1; if (s.shieldT <= 0) s.shield = 0; }
        if (s.cooldowns.ability > 0) s.cooldowns.ability -= 1;
        // Player acts (potion first on ties — it always applies before enemies).
        try {
            if (action.potion) drinkPotion(s, events);
            else if (action.ability) playerAbility(s, events);
            else if (action.attack) playerAttack(s, events, false);
            else if (action.move) {
                var nx = s.x + 1;
                var cap = s.gateOpen ? xCap(s) : Math.min(s.gateX + 2, xCap(s));
                if (nx > cap) { events.push({ t: 'wall' }); }
                else if (foeAt(s, nx)) { events.push({ t: 'blocked' }); }
                else { s.x = nx; events.push({ t: 'step', x: nx }); }
            }
        } catch (e) { events.push({ t: 'error' }); }
        // Gate boss spawns when the player nears the sector end.
        if (!s.boss && !s.gateOpen && s.x >= s.gateX - 10) {
            var b = spawnBoss(s);
            events.push({ t: 'boss', name: b.name });
            // The gate seals: distant stragglers crumble outside the arena
            // (no loot) so every boss is a fair duel + its own summons.
            var kept = [];
            for (var ci = 0; ci < s.enemies.length; ci++) {
                var ce = s.enemies[ci];
                if (ce.isBoss || Math.abs(ce.x - s.x) <= 12) kept.push(ce);
                else events.push({ t: 'crumble', x: ce.x });
            }
            s.enemies = kept;
        }
        // Enemies act.
        var aura = 0;
        for (var ai = 0; ai < s.enemies.length; ai++) {
            var m = s.enemies[ai];
            if (m.isBoss && m.hp > 0 && m.mech === 'karguk') aura = 1; // War Drum
        }
        for (var i = 0; i < s.enemies.length; i++) {
            var e = s.enemies[i];
            if (e.hp <= 0 || s.hp <= 0) continue;
            if (aura && !e.isBoss) e._aura = aura; else e._aura = 0;
            var saveAtk = e.atk;
            e.atk += (e._aura || 0);
            try { enemyAct(s, e, events); } catch (err) { events.push({ t: 'error' }); }
            e.atk = saveAtk;
            if (s.hp <= 0) break;
        }
        // Sweep the dead (summons may die the tick they spawn).
        s.enemies = s.enemies.filter(function (e) { return e.hp > 0 || e._keep; });
        // Death / sector-clear / victory.
        if (s.hp <= 0) {
            s.hp = 0;
            s.over = true;
            events.push({ t: 'death', score: score(s) });
            return events;
        }
        if (s.gateOpen && s.x >= s.gateX + 2) {
            // Should not normally happen (gate opens on boss death); treat as clear.
        }
        if (s.gateOpen) {
            var stars = 1;
            if (s.potionsUsed <= 1) stars += 1;
            if (s.dmgTaken <= s.maxHp * 0.25) stars += 1;
            events.push({ t: 'clear', sector: s.sector, stars: stars });
            if (!s.endless && s.sector === 4) {
                s.won = true;
                s.over = true;
                events.push({ t: 'victory', score: score(s) });
            } else {
                // Advance: full field-dressing at the gate (each sector is a
                // self-contained march), +1 potion, next chunk spawns.
                s.hp = s.maxHp;
                s.potions = Math.min(3, s.potions + 1);
                if (!s.endless) {
                    spawnSector(s, s.sector + 1);
                } else {
                    // Endless: the next chunk starts where this gate stood,
                    // sector flavor rotates, cycle scaling grows.
                    s.cycle += 1;
                    var nidx = (s.sector + 1) % 5;
                    spawnSector(s, nidx, s.gateX + 1);
                }
                events.push({ t: 'sector', sector: s.sector });
            }
        }
        return events;
    }

    function score(s) { return s.x + s.level * 10 + s.gold + s.kills * 2; }

    // ---------------- Audio (WebAudio bleeps, no assets) ----------------
    var AC = null;
    var MUTED = false; // M key toggles; beep() stays silent while muted
    function beep(freq, dur, type, vol) {
        try {
            if (MUTED) return;
            if (AC === null) {
                var Ctor = window.AudioContext || window.webkitAudioContext;
                if (!Ctor) return;
                AC = new Ctor();
            }
            if (AC.state === 'suspended') AC.resume();
            var o = AC.createOscillator();
            var g = AC.createGain();
            o.type = type || 'square';
            o.frequency.value = freq;
            g.gain.value = vol || 0.05;
            o.connect(g); g.connect(AC.destination);
            o.start();
            setTimeout(function () { try { o.stop(); } catch (e) { /* ignore */ } }, dur || 80);
        } catch (e) { /* audio is garnish */ }
    }

    function sfx(t) {
        try {
            if (t === 'hit') beep(220, 70, 'square', 0.05);
            else if (t === 'swing') beep(440, 50, 'square', 0.04);
            else if (t === 'kill') { beep(330, 60, 'square', 0.05); setTimeout(function () { beep(520, 90, 'square', 0.05); }, 60); }
            else if (t === 'hurt') beep(140, 120, 'sawtooth', 0.06);
            else if (t === 'level') { beep(520, 80, 'square', 0.05); setTimeout(function () { beep(780, 120, 'square', 0.05); }, 80); }
            else if (t === 'boss') { beep(98, 300, 'sawtooth', 0.07); }
            else if (t === 'victory') { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { beep(f, 140, 'square', 0.06); }, i * 140); }); }
            else if (t === 'death') { [400, 300, 200, 120].forEach(function (f, i) { setTimeout(function () { beep(f, 160, 'sawtooth', 0.06); }, i * 150); }); }
            else if (t === 'potion') beep(660, 100, 'sine', 0.06);
            else if (t === 'step') beep(180, 30, 'sine', 0.02);
        } catch (e) { /* ignore */ }
    }

    // ---------------- Game controller ----------------
    var G = null; // live controller

    function reducedMotion() {
        try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
    }

    function gfxPreset() {
        try {
            var g = window.FourWeirdGraphics;
            if (g && typeof g.get === 'function') {
                var name = 'balanced';
                try {
                    var saved = g.load ? g.load() : null;
                    if (saved && saved.preset) name = String(saved.preset).replace(/^auto:/, '');
                } catch (e) { /* ignore */ }
                return g.get(name);
            }
        } catch (e) { /* ignore */ }
        return { pixelRatioMax: 1.0, particleMult: 0.6, lightCount: 2, shadows: false, postFX: false };
    }

    function el(id) { try { return document.getElementById(id); } catch (e) { return null; } }
    function setText(id, v) { try { var n = el(id); if (n) n.textContent = String(v); } catch (e) { /* ignore */ } }

    function startRun(classId, mode) {
        var seed = (Date.now() % 100000) | 0;
        var run = newRun(seed, classId, mode);
        G = {
            run: run, floaters: [], parts: [],
            acc: 0, last: 0, paused: false, banner: false,
            speed: 1, profile: loadProfile(),
            canvas: el('gg1dCanvas'), ctx: null,
            preset: gfxPreset()
        };
        try { G.ctx = G.canvas.getContext('2d'); } catch (e) { G.ctx = null; }
        try {
            var fw = window.FourWeirdWorkers;
            G.workers = !!(fw && typeof fw.supported === 'function' && fw.supported());
        } catch (e) { G.workers = false; }
        try {
            el('gg1dMenu').style.display = 'none';
            el('gg1dHud').hidden = false;
            el('gg1dTouch').hidden = false;
        } catch (e) { /* ignore */ }
        sizeCanvas();
        showBanner('SECTOR 1 — ' + SECTORS[0].name.toUpperCase(), SECTORS[0].brief, null);
        render();
    }

    function sizeCanvas() {
        try {
            if (!G || !G.canvas) return;
            var q = G.preset;
            var cssW = G.canvas.clientWidth || 960;
            var cssH = Math.round(cssW * 540 / 960);
            var dpr = Math.min(window.devicePixelRatio || 1, q.pixelRatioMax);
            G.canvas.width = Math.round(cssW * dpr);
            G.canvas.height = Math.round(cssH * dpr);
            G.dpr = dpr;
            G.viewW = 960; G.viewH = 540;
        } catch (e) { /* ignore */ }
    }

    // Fullscreen contract: shell helper first, native request with
    // webkit fallback otherwise. Never throws; safe when absent.
    function toggleFullscreen() {
        try {
            if (typeof window.__fourweirdToggleFullscreen === 'function') { window.__fourweirdToggleFullscreen(); return; }
            var st = document.getElementById('gg1dStage') || document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                var p = st.requestFullscreen ? st.requestFullscreen() : (st.webkitRequestFullscreen ? st.webkitRequestFullscreen() : null);
                if (p && p.catch) p.catch(function () { /* denied */ });
            } else if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch (e) { /* ignore */ }
    }

    // ---- Banner (briefings, boss intros, death, victory) ----
    function showBanner(title, text, actions) {
        try {
            if (!G) return;
            G.banner = true;
            setText('gg1dBannerTitle', title);
            setText('gg1dBannerText', text);
            var b = el('gg1dBanner');
            if (!b) return;
            // Action buttons (victory continue, death retry).
            var old = el('gg1dBannerBtns');
            if (old && old.parentNode) old.parentNode.removeChild(old);
            if (actions && actions.length) {
                var row = document.createElement('div');
                row.id = 'gg1dBannerBtns';
                row.style.cssText = 'margin-top:12px;display:flex;gap:10px;justify-content:center;pointer-events:auto;';
                actions.forEach(function (a) {
                    var btn = document.createElement('button');
                    btn.textContent = a.label;
                    btn.style.cssText = 'padding:10px 18px;border-radius:8px;border:1px solid #a855f7;background:#2a1650;color:#fff;font-weight:700;cursor:pointer;';
                    btn.onclick = function () { try { a.fn(); } catch (e) { /* ignore */ } };
                    row.appendChild(btn);
                });
                var card = el('gg1dBannerCard');
                if (card) card.appendChild(row);
                b.style.pointerEvents = 'auto';
            } else {
                b.style.pointerEvents = 'none';
            }
            b.className = 'on';
            if (G.run.mode === 'realtime' && !actions) {
                setTimeout(function () { try { if (G && G.banner) hideBanner(); } catch (e) { /* ignore */ } }, 4200);
            }
        } catch (e) { /* ignore */ }
    }

    function hideBanner() {
        try {
            if (!G) return;
            G.banner = false;
            var b = el('gg1dBanner');
            if (b) { b.className = ''; b.style.pointerEvents = 'none'; }
        } catch (e) { /* ignore */ }
    }

    // ---- Input -> tick ----
    function doAction(kind) {
        try {
            if (!G || !G.run || G.run.over) return;
            if (G.banner) { hideBanner(); if (G.run.mode === 'turn') return; }
            if (G.paused) return;
            var a = { wait: true };
            if (kind === 'step') a = { move: 1 };
            else if (kind === 'attack') a = { attack: true };
            else if (kind === 'ability') a = { ability: true };
            else if (kind === 'potion') a = { potion: true };
            else if (kind === 'wait') a = { wait: true };
            if (G.run.mode === 'turn') {
                var ev = tick(G.run, a);
                onEvents(ev);
                render();
            } else {
                G.intent = a; // consumed by the clock
            }
        } catch (e) { /* never break on input */ }
    }

    function onEvents(events) {
        try {
            for (var i = 0; i < events.length; i++) {
                var e = events[i];
                if (e.t === 'hit') {
                    if (e.dodged) { addFloater(e.x, 'DODGE!', '#a5b4fc'); continue; }
                    addFloater(e.x, (e.dmg > 0 ? '-' : '') + e.dmg, e.foe ? '#fbbf24' : '#ef4444');
                    burst(e.x, e.foe ? '#fbbf24' : '#ef4444', 6);
                    sfx(e.foe ? 'hit' : 'hurt');
                } else if (e.t === 'swing') { if (e.crit) addFloater(e.x, 'CRIT!', '#f472b6'); sfx('swing'); }
                else if (e.t === 'kill') { addFloater(e.x, '+' + e.gold + 'g', '#fbbf24'); sfx('kill'); }
                else if (e.t === 'level') { addFloater(G.run.x, 'LEVEL ' + e.level + '!', '#22c55e'); sfx('level'); }
                else if (e.t === 'miss') addFloater(G.run.x, 'no target', '#94a3b8');
                else if (e.t === 'blocked') addFloater(G.run.x + 1, 'blocked!', '#94a3b8');
                else if (e.t === 'wall') addFloater(G.run.x, 'the Array holds', '#a855f7');
                else if (e.t === 'step') sfx('step');
                else if (e.t === 'potion') { addFloater(G.run.x, '+' + 'HP', '#22c55e'); sfx('potion'); }
                else if (e.t === 'ability') addFloater(G.run.x, e.name + '!', '#a855f7');
                else if (e.t === 'boss') { sfx('boss'); showBanner('💀 ' + e.name.toUpperCase(), bossBrief(e.name) + '\nThe gate seals behind you — distant husks crumble. Duel it.', null); }
                else if (e.t === 'bossdown') addFloater(G.run.x, 'GATE OPEN', '#22c55e');
                else if (e.t === 'summon') addFloater(e.x, 'they rise!', '#ef4444');
                else if (e.t === 'crumble') addFloater(e.x, 'crumbles', '#94a3b8');
                else if (e.t === 'explode') { burst(e.x, '#fb923c', 10); sfx('hurt'); }
                else if (e.t === 'charge') addFloater(e.x, 'CHARGE!', '#ef4444');
                else if (e.t === 'pulse') addFloater(e.x, 'ARRAY PULSE', '#a855f7');
                else if (e.t === 'resurrect') addFloater(e.x, 'RISE AGAIN', '#ef4444');
                else if (e.t === 'enrage') addFloater(G.run.x, e.name + ' rages!', '#ef4444');
                else if (e.t === 'clear') onSectorClear(e.sector, e.stars);
                else if (e.t === 'sector') { /* banner handled in onSectorClear */ }
                else if (e.t === 'death') onDeath(e.score);
                else if (e.t === 'victory') onVictory(e.score);
            }
        } catch (err) { /* garnish */ }
    }

    function bossBrief(name) {
        var map = {
            'James Wright, the First Risen': 'Lisa Park: "James... forgive us. Rest now — for real this time."',
            'Mirathiel, Echo of the Elder': 'Aelindra: "Strike clean, soldier. Leave her something worth remembering."',
            'The Vault Warden, Forge-Golem': 'Borin: "That is MY ancestor\u2019s hammer it guards. Take it back!"',
            'Karguk, Blood-Bound Berserker': 'Groknak: "My blood, wrong eyes. Hold the line — TO WAR!"',
            'Gate Titan, Herald of the Necrogenesis': 'Valley Net: "The Array drinks through this thing. Break it and the spire goes blind."'
        };
        return map[name] || 'Valley Net: "Big signature ahead. Put it down."';
    }

    function unlockCodex(key) {
        try {
            if (!G || CODEX[key] === undefined) return;
            if (G.profile.codex.indexOf(key) === -1) {
                G.profile.codex.push(key);
                saveProfile(G.profile);
            }
        } catch (e) { /* ignore */ }
    }

    function onSectorClear(idx, stars) {
        try {
            var p = G.profile;
            if (idx < 5 && !G.run.endless) {
                p.stars[idx] = Math.max(p.stars[idx] || 0, stars);
                p.bestStars = p.stars.reduce(function (a, b) { return a + b; }, 0);
                var key = SECTORS[idx].codex;
                unlockCodex(key);
                var cx = CODEX[key];
                saveProfile(p);
                var next = SECTORS[Math.min(idx + 1, 4)];
                var txt = 'Sector clear — ' + stars + '/3 stars.' +
                    (cx ? '\n📖 Codex: ' + cx.title + ' — ' + cx.text : '') +
                    (idx + 1 < 5 ? '\n\nNext: SECTOR ' + (idx + 2) + ' — ' + next.name.toUpperCase() + '\n' + next.brief : '');
                showBanner('SECTOR ' + (idx + 1) + ' CLEAR', txt, null);
            } else {
                saveProfile(p);
            }
        } catch (e) { /* ignore */ }
    }

    function onDeath(score) {
        try {
            sfx('death');
            var p = G.profile;
            p.bestX = Math.max(p.bestX, G.run.x);
            if (G.run.endless) p.endlessBest = Math.max(p.endlessBest, G.run.x);
            saveProfile(p);
            showBanner('💀 RUN OVER', 'The line takes another courier.\nScore: ' + score + '  ·  Best east: ' + p.bestX, [
                { label: '↻ March again', fn: function () { toMenu(); } },
                { label: '📜 Menu', fn: function () { toMenu(); } }
            ]);
        } catch (e) { /* ignore */ }
    }

    function onVictory(score) {
        try {
            sfx('victory');
            var p = G.profile;
            p.wins += 1;
            p.bestX = Math.max(p.bestX, G.run.x);
            unlockCodex('mercenary');
            saveProfile(p);
            showBanner('🏆 ARRAY DOWN', FINALE.hades + '\n' + FINALE.lisa + '\n' + FINALE.valley +
                '\nScore: ' + score, [
                { label: '➡️ Echo Drift (endless)', fn: function () { startEndless(); } },
                { label: '📜 Menu', fn: function () { toMenu(); } }
            ]);
        } catch (e) { /* ignore */ }
    }

    function startEndless() {
        try {
            hideBanner();
            G.run.endless = true;
            G.run.over = false;
            G.run.won = false;
            G.run.cycle = 0;
            G.run.x = 0;
            G.run.hp = G.run.maxHp;
            spawnSector(G.run, 0);
            // Endless sectors are elite-flavored via cycle scaling.
            showBanner('🌌 ECHO DRIFT', 'The spire is down, but residual echoes keep spilling west.\nWalk east forever. Bury what rises.', null);
            render();
        } catch (e) { /* ignore */ }
    }

    function toMenu() {
        try {
            hideBanner();
            G = null;
            el('gg1dMenu').style.display = '';
            el('gg1dHud').hidden = true;
            el('gg1dTouch').hidden = true;
            renderCodex();
        } catch (e) { /* ignore */ }
    }

    // ---- Floaters + particles ----
    function addFloater(x, text, color) {
        try {
            if (!G) return;
            if (G.floaters.length > 14) G.floaters.shift();
            G.floaters.push({ x: x, text: String(text), color: color, ttl: 1 });
        } catch (e) { /* ignore */ }
    }

    function burst(x, color, n) {
        try {
            if (!G || reducedMotion()) return;
            var mult = 0.6;
            try { mult = (G.preset && G.preset.particleMult) || 0.6; } catch (e) { /* ignore */ }
            n = Math.max(1, Math.round(n * mult));
            for (var i = 0; i < n; i++) {
                if (G.parts.length > 220) G.parts.shift();
                G.parts.push({ x: x + (Math.random() - 0.5), y: 0.62 + (Math.random() - 0.5) * 0.1,
                    vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 0.6, color: color });
            }
        } catch (e) { /* ignore */ }
    }

    function integrateParts(dt) {
        try {
            if (!G || !G.parts.length) return;
            var useWorker = false;
            try {
                useWorker = G.workers && G.preset && G.preset.particleMult >= 1 &&
                    window.FourWeirdWorkers && G.parts.length > 40;
            } catch (e) { useWorker = false; }
            if (useWorker) {
                var snap = G.parts;
                window.FourWeirdWorkers.run('particle-integrate', {
                    parts: snap.map(function (p) { return { x: p.x, y: p.y, vx: p.vx, vy: p.vy, life: p.life }; }),
                    dt: dt
                }, { timeout: 400 }).then(function (res) {
                    try {
                        if (!G || !res || !res.length) return;
                        for (var i = 0; i < Math.min(res.length, G.parts.length); i++) {
                            G.parts[i].x = res[i].x; G.parts[i].y = res[i].y;
                            G.parts[i].vx = res[i].vx; G.parts[i].vy = res[i].vy;
                            G.parts[i].life = res[i].life;
                        }
                        G.parts = G.parts.filter(function (p) { return p.life > 0; });
                    } catch (e) { /* ignore */ }
                });
                return;
            }
            for (var i = G.parts.length - 1; i >= 0; i--) {
                var p = G.parts[i];
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.vx *= 0.94; p.vy *= 0.94;
                p.life -= dt;
                if (p.life <= 0) G.parts.splice(i, 1);
            }
        } catch (e) { /* ignore */ }
    }

    // ---------------- Render ----------------
    var VIEW_TILES = 40;

    function render() {
        try {
            if (!G || !G.ctx) { renderMenuBackdrop(); return; }
            var ctx = G.ctx, s = G.run;
            var W = 960, H = 540;
            ctx.setTransform(G.dpr || 1, 0, 0, G.dpr || 1, 0, 0);
            var sec = SECTORS[Math.min(s.sector, 4)];
            // Sky.
            var sky = ctx.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, sec.sky);
            sky.addColorStop(0.6, '#05030d');
            sky.addColorStop(1, '#000');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);
            // Giantess + stars.
            ctx.fillStyle = 'rgba(168,85,247,0.25)';
            ctx.beginPath(); ctx.arc(780, 110, 70, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(251,191,36,0.15)';
            ctx.beginPath(); ctx.arc(780, 110, 88, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            var starRng = mulberry32(7);
            for (var si = 0; si < 40; si++) {
                ctx.fillRect(starRng() * W, starRng() * H * 0.5, 1.5, 1.5);
            }
            // Camera: keep the player left-of-center, looking east.
            var cam = clamp(s.x - 12, 0, Math.max(0, xCap(s) - VIEW_TILES));
            var scale = W / VIEW_TILES;
            function sx(x) { return (x - cam) * scale; }
            var trackY = H * 0.66;
            // Ley-line + range bands.
            ctx.fillStyle = 'rgba(168,85,247,0.10)';
            ctx.fillRect(sx(Math.max(0, s.x - s.range)), trackY - 46, s.range * 2 * scale, 92);
            ctx.strokeStyle = 'rgba(168,85,247,0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, trackY); ctx.lineTo(W, trackY); ctx.stroke();
            ctx.fillStyle = 'rgba(148,163,184,0.5)';
            for (var txi = Math.floor(cam); txi < cam + VIEW_TILES; txi++) {
                if (txi % 5 === 0) ctx.fillRect(sx(txi), trackY - 6, 2, 12);
            }
            // Sector progress notch.
            var prog = s.endless
                ? clamp((s.x - (s.chunkBase || 0)) / SECTOR_LEN, 0, 1)
                : clamp(s.x / (WORLD_LEN - 1), 0, 1);
            ctx.fillStyle = '#1e1b2e';
            ctx.fillRect(40, 18, W - 80, 8);
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(40, 18, (W - 80) * prog, 8);
            // Boss gate wall.
            if (!s.gateOpen && s.boss) {
                ctx.font = '28px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('▮▮', sx(s.gateX), trackY - 20);
            }
            // Enemies.
            ctx.textAlign = 'center';
            for (var i = 0; i < s.enemies.length; i++) {
                var e = s.enemies[i];
                if (e.hp <= 0) continue;
                var ex = sx(e.x);
                if (ex < -40 || ex > W + 40) continue;
                var size = e.isBoss ? 40 : 28;
                ctx.font = size + 'px sans-serif';
                // Aggro ring.
                var d = Math.abs(e.x - s.x);
                if (d <= e.aggro) {
                    ctx.strokeStyle = e.isBoss ? 'rgba(239,68,68,0.8)' : 'rgba(239,68,68,0.35)';
                    ctx.lineWidth = e.isBoss ? 3 : 1.5;
                    ctx.beginPath(); ctx.arc(ex, trackY - 20, size * 0.75, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.fillText(e.emoji, ex, trackY - 8);
                // HP bar.
                var bw = e.isBoss ? 64 : 34;
                ctx.fillStyle = '#111';
                ctx.fillRect(ex - bw / 2, trackY - 58, bw, 6);
                ctx.fillStyle = e.isBoss ? '#ef4444' : '#f97316';
                ctx.fillRect(ex - bw / 2, trackY - 58, bw * clamp(e.hp / e.maxHp, 0, 1), 6);
            }
            // Player.
            var px = sx(s.x);
            ctx.font = '36px sans-serif';
            var cls = CLASSES[s.cls] || CLASSES.rifleman;
            ctx.fillText(cls.emoji, px, trackY - 8);
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.moveTo(px + 26, trackY - 30); ctx.lineTo(px + 38, trackY - 22); ctx.lineTo(px + 26, trackY - 14);
            ctx.closePath(); ctx.fill();
            if (s.shieldT > 0) {
                ctx.strokeStyle = 'rgba(34,197,94,0.9)';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(px, trackY - 24, 30, 0, Math.PI * 2); ctx.stroke();
            }
            // Particles.
            for (var pi = 0; pi < G.parts.length; pi++) {
                var p = G.parts[pi];
                var ppx = sx(p.x);
                var ppy = p.y * H;
                ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
                ctx.fillStyle = p.color;
                ctx.fillRect(ppx, ppy, 4, 4);
            }
            ctx.globalAlpha = 1;
            // Floaters.
            ctx.font = 'bold 15px Outfit, sans-serif';
            for (var fi = G.floaters.length - 1; fi >= 0; fi--) {
                var f = G.floaters[fi];
                ctx.fillStyle = f.color;
                ctx.fillText(f.text, sx(f.x), trackY - 80 - (1 - f.ttl) * 40);
            }
            updateHud();
        } catch (e) { /* render must never throw */ }
    }

    function renderMenuBackdrop() {
        try {
            var c = el('gg1dCanvas');
            if (!c) return;
            var ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#05030d';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.fillStyle = 'rgba(168,85,247,0.25)';
            ctx.beginPath(); ctx.arc(c.width * 0.8, c.height * 0.2, 60, 0, Math.PI * 2); ctx.fill();
        } catch (e) { /* ignore */ }
    }

    function updateHud() {
        try {
            if (!G) return;
            var s = G.run;
            setText('gg1dHpText', Math.max(0, Math.ceil(s.hp)) + '/' + s.maxHp + (s.shieldT > 0 ? ' 🛡️' + s.shield : ''));
            setText('gg1dLvl', s.level);
            setText('gg1dXpText', s.xp + '/' + xpNext(s.level));
            setText('gg1dGold', s.gold);
            setText('gg1dPot', s.potions + (s.cooldowns.ability > 0 ? ' · ✦' + s.cooldowns.ability : ' · ✦READY'));
            setText('gg1dSector', (s.endless ? 'Echo Drift +' + s.cycle : 'Sector ' + (Math.min(s.sector, 4) + 1) + '/5') + ' · x' + Math.floor(s.x));
            setText('gg1dMode', s.mode === 'turn' ? '🎲 TURN' : '⚡ LIVE x' + G.speed);
            var hpF = el('gg1dHpFill');
            if (hpF) hpF.style.width = (clamp(s.hp / s.maxHp, 0, 1) * 100).toFixed(1) + '%';
            var xpF = el('gg1dXpFill');
            if (xpF) xpF.style.width = (clamp(s.xp / xpNext(s.level), 0, 1) * 100).toFixed(1) + '%';
            var bb = el('gg1dBossBar');
            if (bb) {
                if (s.boss && s.boss.hp > 0) {
                    bb.className = 'on';
                    setText('gg1dBossName', s.boss.name);
                    var bf = el('gg1dBossFill');
                    if (bf) bf.style.width = (clamp(s.boss.hp / s.boss.maxHp, 0, 1) * 100).toFixed(1) + '%';
                } else bb.className = '';
            }
        } catch (e) { /* ignore */ }
    }

    function renderCodex() {
        try {
            var box = el('gg1dCodex');
            if (!box) return;
            var p = loadProfile();
            var html = '<b>📖 Ley-Line Codex</b> — best east: ' + p.bestX + ' · ★' + p.bestStars + '/15 · victories: ' + p.wins;
            var keys = ['helmet', 'mercenary', 'compact', 'sparkite', 'guy', 'good'];
            for (var i = 0; i < keys.length; i++) {
                var c = CODEX[keys[i]];
                if (p.codex.indexOf(keys[i]) !== -1) html += '<br>📖 <b>' + c.title + '.</b> ' + c.text;
            }
            box.innerHTML = html;
        } catch (e) { /* ignore */ }
    }

    // ---------------- Main loop ----------------
    var STEP_MS = 600;

    function loop(t) {
        try {
            if (!G) { requestAnimationFrame(loop); return; }
            var dt = 0.016;
            try {
                if (G.last) dt = clamp((t - G.last) / 1000, 0, 0.1);
                G.last = t;
            } catch (e) { /* ignore */ }
            // Floaters + particles always animate.
            for (var i = G.floaters.length - 1; i >= 0; i--) {
                G.floaters[i].ttl -= dt * 1.2;
                if (G.floaters[i].ttl <= 0) G.floaters.splice(i, 1);
            }
            integrateParts(dt);
            // Real-time clock.
            var s = G.run;
            if (s && s.mode === 'realtime' && !s.over && !G.paused && !G.banner) {
                G.acc += dt * 1000 * G.speed;
                var guard = 0;
                while (G.acc >= STEP_MS && guard < 4) {
                    G.acc -= STEP_MS;
                    guard += 1;
                    var a = G.intent || { wait: true };
                    G.intent = null;
                    var ev = tick(s, a);
                    onEvents(ev);
                }
                if (guard >= 4) G.acc = 0;
            }
            render();
        } catch (e) { /* loop must never die */ }
        try { requestAnimationFrame(loop); } catch (ignored) { /* ignore */ }
    }

    // ---------------- Wiring ----------------
    function bindMenu() {
        try {
            var mode = 'turn', cls = 'rifleman';
            var p = loadProfile();
            if (p.settings) {
                if (p.settings.mode === 'realtime' || p.settings.mode === 'turn') mode = p.settings.mode;
                if (CLASSES[p.settings.cls]) cls = p.settings.cls;
            }
            function paint() {
                var ms = el('gg1dModePick');
                if (ms) for (var i = 0; i < ms.children.length; i++) {
                    ms.children[i].className = ms.children[i].getAttribute('data-mode') === mode ? 'sel' : '';
                }
                var cs = el('gg1dClassPick');
                if (cs) for (var j = 0; j < cs.children.length; j++) {
                    cs.children[j].className = cs.children[j].getAttribute('data-class') === cls ? 'sel' : '';
                }
            }
            var mp = el('gg1dModePick');
            if (mp) mp.addEventListener('click', function (ev) {
                try {
                    var b = ev.target.closest ? ev.target.closest('[data-mode]') : null;
                    if (b) { mode = b.getAttribute('data-mode'); paint(); beep(520, 50, 'square', 0.03); }
                } catch (e) { /* ignore */ }
            });
            var cp = el('gg1dClassPick');
            if (cp) cp.addEventListener('click', function (ev) {
                try {
                    var b = ev.target.closest ? ev.target.closest('[data-class]') : null;
                    if (b) { cls = b.getAttribute('data-class'); paint(); beep(520, 50, 'square', 0.03); }
                } catch (e) { /* ignore */ }
            });
            paint();
            var go = el('gg1dGoBtn');
            if (go) go.addEventListener('click', function () {
                try {
                    var prof = loadProfile();
                    prof.settings = { mode: mode, speed: 1, cls: cls };
                    saveProfile(prof);
                    startRun(cls, mode);
                } catch (e) { /* ignore */ }
            });
            var tb = el('gg1dTouch');
            if (tb) tb.addEventListener('click', function (ev) {
                try {
                    var b = ev.target.closest ? ev.target.closest('[data-act]') : null;
                    if (b) doAction(b.getAttribute('data-act'));
                } catch (e) { /* ignore */ }
            });
            document.addEventListener('keydown', function (ev) {
                try {
                    if (!G || !G.run) return;
                    var k = ev.key;
                    if (k === 'ArrowRight' || k === 'd' || k === 'D') { ev.preventDefault(); doAction('step'); }
                    else if (k === ' ' || k === 'j' || k === 'J') { ev.preventDefault(); doAction(G.banner ? 'dismiss' : 'attack'); }
                    else if (k === 'Enter') { if (G.banner) hideBanner(); }
                    else if (k === 'k' || k === 'K' || k === '1') doAction('ability');
                    else if (k === 'h' || k === 'H' || k === '2') doAction('potion');
                    else if (k === 'w' || k === 'W' || k === '0') doAction('wait');
                    else if (k === 'q' || k === 'Q') {
                        if (G.run.mode === 'realtime') {
                            G.speed = G.speed === 1 ? 2 : (G.speed === 2 ? 0.5 : 1);
                            addFloater(G.run.x, 'x' + G.speed, '#a5b4fc');
                        }
                    }
                    else if (k === 'p' || k === 'P' || k === 'Escape') {
                        if (G.run.mode === 'realtime') {
                            G.paused = !G.paused;
                            addFloater(G.run.x, G.paused ? 'PAUSED' : 'LIVE', '#a5b4fc');
                        } else if (G.banner) hideBanner();
                    }
                    else if (k === 'f' || k === 'F') toggleFullscreen();
                    else if (k === 'm' || k === 'M') {
                        MUTED = !MUTED;
                        try { addFloater(G.run.x, MUTED ? 'MUTED' : 'SOUND ON', '#a5b4fc'); } catch (e2) { /* ignore */ }
                    }
                } catch (e) { /* ignore */ }
            });
            var cv = el('gg1dCanvas');
            if (cv) cv.addEventListener('click', function () {
                try {
                    if (G && G.banner) hideBanner();
                    else if (G && G.run && G.run.mode === 'turn') doAction('attack');
                } catch (e) { /* ignore */ }
            });
            if (cv) cv.addEventListener('dblclick', function () { try { toggleFullscreen(); } catch (e) { /* ignore */ } });
            document.addEventListener('fullscreenchange', function () { try { sizeCanvas(); } catch (e) { /* ignore */ } });
            document.addEventListener('visibilitychange', function () {
                try { if (document.hidden && G && G.run && G.run.mode === 'realtime') G.paused = true; } catch (e) { /* ignore */ }
            });
            window.addEventListener('resize', function () { try { sizeCanvas(); } catch (e) { /* ignore */ } });
            try {
                window.addEventListener('fourweird-graphics', function (e2) {
                    try {
                        if (!G) return;
                        var g = window.FourWeirdGraphics;
                        if (g && e2 && e2.detail) {
                            G.preset = e2.detail.settings || G.preset;
                            sizeCanvas();
                        }
                    } catch (e) { /* ignore */ }
                });
            } catch (e) { /* ignore */ }
            renderCodex();
        } catch (e) { /* ignore */ }
    }

    function boot() {
        try {
            bindMenu();
            renderMenuBackdrop();
            try {
                var g = window.FourWeirdGraphics;
                if (g && typeof g.auto === 'function') g.auto(function () { try { sizeCanvas(); } catch (e) { /* ignore */ } });
            } catch (e) { /* graphics auto is best-effort */ }
            try { requestAnimationFrame(loop); } catch (e) {
                try { setInterval(function () { loop(performance.now()); }, 50); } catch (ignored) { /* ignore */ }
            }
        } catch (e) { /* ignore */ }
    }

    try {
        window.GraveGain1D = {
            VERSION: VERSION,
            newRun: newRun,
            tick: tick,
            score: score,
            CLASSES: CLASSES,
            SECTORS: SECTORS,
            CODEX: CODEX,
            SAVE_KEY: SAVE_KEY
        };
    } catch (e) { /* window unwritable */ }

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (e) { try { boot(); } catch (ignored) { /* ignore */ } }
})();
