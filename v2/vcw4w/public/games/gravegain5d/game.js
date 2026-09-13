/* GraveGain5D — Multiverse Transcendence (scaffold, v0.1.0).
 *
 * 5D = 4D hypercube golf + 3D models, but able to transcend universes.
 * Crazier than 4D: every hop rewrites gravity, W-drift, and par; chain hops
 * build combo multipliers; the paradox meter punishes hop spam — overcharge
 * collapses the universe you stand in. Collapsing universes run a doom clock.
 *
 * Vanilla IIFE, idempotent. Rules core (newRun/tick/score) is pure: no
 * document/canvas/localStorage/fetch/eval — DOM lives only in the view layer
 * below the "---- View ----" marker. Reuses GraveGain4DMath / GraveGain4DWorlds
 * and GraveGain3DModels BY REFERENCE when present (never copied); standalone
 * fallback keeps the scaffold playable with zero deps.
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.GraveGain5D && window.GraveGain5D.VERSION) return;

    var VERSION = '0.1.0-scaffold';
    var SAVE_KEY = 'gravegain5d_save_v1';
    var SAVE_VERSION = 1;

    // Optional globals, feature-detected (all fail-open, by reference only).
    function opt(n) { try { return window[n] || null; } catch (_) { return null; } }
    var M4D = opt('GraveGain4DMath');
    var W4D = opt('GraveGain4DWorlds');
    var U5D = opt('GraveGain5DUniverses');
    var M3D = opt('GraveGain3DModels');

    /* ---------------- Universes ---------------- */
    // gravity: putt-distance multiplier. drift: W-slice pull per tick.
    // parDelta: added to the 4D hole par. collapseTicks: doom clock once
    // paradox overcharges while standing here (0 = stable).
    var UNIVERSES = [
        { id: 'prime', name: 'Prime Array', emoji: '🌌', gravity: 1.0, drift: 0.0, parDelta: 0, collapseTicks: 0, blurb: 'Home water. No mods, no mercy.' },
        { id: 'echo', name: 'Echo Expanse', emoji: '🪞', gravity: 0.9, drift: 0.1, parDelta: 0, collapseTicks: 0, blurb: 'Ghost replays linger. Putts echo twice.' },
        { id: 'dream', name: 'Dream Shallows', emoji: '💭', gravity: 1.1, drift: -0.1, parDelta: 1, collapseTicks: 0, blurb: 'Soft physics, generous par, sleepy hazards.' },
        { id: 'void', name: 'Void Maw', emoji: '🕳️', gravity: 1.4, drift: 0.3, parDelta: -1, collapseTicks: 12, blurb: 'Heavy ball, hungry W-drift. Collapses FAST when paradox is hot.' },
        { id: 'bloom', name: 'Bloom Lattice', emoji: '🌸', gravity: 0.7, drift: -0.2, parDelta: 1, collapseTicks: 0, blurb: 'Floaty, forgiving, chain-hop combos bloom here.' },
        { id: 'static', name: 'Static Storm', emoji: '📺', gravity: 1.2, drift: 0.0, parDelta: 0, collapseTicks: 8, blurb: 'Noise scrambles aim. Hop out before it collapses.' }
    ];

    var CLASSES = {
        putter: { name: 'Putter of the Graves', hp: 24, atk: 6, def: 1, spd: 3, range: 4, ability: { name: 'Chain Leap', cd: 5, desc: 'Strike all foes in range and build combo' } },
        warden: { name: 'Paradox Warden', hp: 32, atk: 4, def: 3, spd: 1, range: 3, ability: { name: 'Anchor Reality', cd: 6, desc: 'Vent 25 paradox, clear doom, ward 2 ticks and mend 4' } },
        drifter: { name: 'Universe Drifter', hp: 20, atk: 7, def: 0, spd: 4, range: 3, ability: { name: 'Free Hop', cd: 4, desc: 'Hop free of paradox and strike the nearest foe' } }
    };

    // RACES mirrors gravegain1d (human/elf/dwarf/orc). Deltas are small ints
    // applied in newRun. Teen-clean blurbs; canon grit, no profanity.
    var RACES = {
        human: { name: 'Human', hp: 2, atk: 0, def: 0, spd: 0, blurb: 'Steady line-holder. No race abandons another.' },
        elf: { name: 'Elf', hp: -2, atk: 1, def: 0, spd: 1, blurb: 'Fast spellweaver. Frail frame, keen eye.' },
        dwarf: { name: 'Dwarf', hp: 8, atk: 0, def: 1, spd: -1, blurb: 'Stout forge-kin. Extra bulk, slower boots.' },
        orc: { name: 'Orc', hp: 5, atk: 1, def: 0, spd: 0, blurb: 'Fierce blood-kin. Heavy hits, honor-bound.' }
    };

    // ENEMIES mirrors gravegain1d KINDS (shambler/swarm/brute/necro) plus one
    // universe variant per lane so each hop meets a local haunt.
    var ENEMIES = {
        shambler: { name: 'Risen Shambler', hp: 12, atk: 2, def: 0, xp: 3, gold: 2 },
        swarm: { name: 'Skull Swarm', hp: 6, atk: 3, def: 0, xp: 2, gold: 1 },
        brute: { name: 'Zed Brute', hp: 22, atk: 5, def: 1, xp: 5, gold: 4 },
        necro: { name: 'Array Necromancer', hp: 18, atk: 4, def: 0, xp: 7, gold: 5 },
        echoHusk: { name: 'Echo Husk', hp: 10, atk: 3, def: 0, xp: 4, gold: 2 },
        dreamMaw: { name: 'Dream Maw', hp: 14, atk: 2, def: 1, xp: 4, gold: 3 },
        voidReaver: { name: 'Void Reaver', hp: 26, atk: 6, def: 1, xp: 8, gold: 6 },
        bloomWisp: { name: 'Bloom Wisp', hp: 8, atk: 2, def: 0, xp: 3, gold: 2 },
        staticJitter: { name: 'Static Jitter', hp: 16, atk: 5, def: 0, xp: 6, gold: 4 }
    };

    // Contact-damage scale per universe (Void hits hardest, Bloom softest).
    var UNIVERSE_MIGHT = { prime: 1.0, echo: 1.0, dream: 0.9, void: 1.4, bloom: 0.8, static: 1.2 };
    // Two-slot foe pool per universe; spawnFoes picks deterministically.
    var UNIVERSE_FOES = {
        prime: ['shambler', 'swarm'],
        echo: ['echoHusk', 'swarm'],
        dream: ['dreamMaw', 'shambler'],
        void: ['voidReaver', 'brute'],
        bloom: ['bloomWisp', 'swarm'],
        static: ['staticJitter', 'necro']
    };

    var HOLES = [
        { par: 3, name: 'Multiverse Mouth' },
        { par: 3, name: 'Hull Breach Echo' },
        { par: 4, name: 'Grove Veil Bloom' },
        { par: 3, name: 'Vault Static' },
        { par: 4, name: 'Waste Crossing Void' },
        { par: 5, name: 'Venom Deep Dream' },
        { par: 3, name: 'Dark Antechamber' },
        { par: 4, name: 'Choir of Echoes' },
        { par: 4, name: 'Root Tesseract' },
        { par: 5, name: 'The Prime Array' }
    ];

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function universeById(id) {
        for (var i = 0; i < UNIVERSES.length; i++) {
            if (UNIVERSES[i].id === id) return UNIVERSES[i];
        }
        return UNIVERSES[0];
    }
    function holePar(holeIdx, universeId) {
        var h = HOLES[clamp(holeIdx | 0, 0, HOLES.length - 1)];
        return Math.max(1, h.par + universeById(universeId).parDelta);
    }

    /* ---------------- RPG combat helpers (pure) ---------------- */
    // Series-true combat mirrors gravegain1d: nearestFoe / playerAttack /
    // damage / gainXp. All pure (Math only); view layer animates events.
    function xpNext(level) { return 8 + (level | 0) * 6; }
    function mightOf(universeId) {
        var m = UNIVERSE_MIGHT[universeId];
        return (typeof m === 'number' && m > 0) ? m : 1;
    }
    function baseFoe(kind) { return ENEMIES[kind] || ENEMIES.shambler; }
    function spawnFoes(holeIdx, universeId) {
        var pool = UNIVERSE_FOES[universeId] || UNIVERSE_FOES.prime;
        var out = [];
        for (var i = 0; i < 2; i++) {
            var kind = pool[(holeIdx + i) % pool.length];
            var b = baseFoe(kind);
            var might = mightOf(universeId);
            var hp = Math.max(1, Math.round((b.hp + holeIdx * 2) * (0.9 + 0.1 * might)));
            var atk = Math.max(1, Math.round((b.atk + Math.floor(holeIdx / 3)) * might));
            out.push({ kind: kind, name: b.name, hp: hp, maxHp: hp, atk: atk, def: b.def, xp: b.xp, gold: b.gold });
        }
        return out;
    }
    function nearestFoe(s, range) {
        if (!s || !s.foes) return null;
        var best = null, bd = 1e9;
        for (var i = 0; i < s.foes.length; i++) {
            var e = s.foes[i];
            if (!e || e.hp <= 0) continue;
            var d = Math.abs(i - 0) * 0 + (e.dist != null ? e.dist : 1);
            if (d <= range && d < bd) { bd = d; best = e; }
        }
        return best;
    }
    function damage(s, target, amount, isPlayer, ev) {
        amount = Math.max(1, Math.round(amount));
        ev = ev || [];
        if (!isPlayer) {
            target.hp -= amount;
            ev.push({ t: 'hit', foe: true, kind: target.kind, dmg: amount, hp: Math.max(0, target.hp) });
        } else {
            var blocked = 0;
            if (s.ward > 0) { blocked = Math.min(2, amount); amount -= blocked; }
            amount = Math.max(1, amount - (s.def || 0));
            s.hp -= amount;
            ev.push({ t: 'hit', foe: false, dmg: amount, blocked: blocked, hp: Math.max(0, s.hp) });
            if (s.hp <= 0) {
                s.hp = 0;
                s.over = true;
                s.win = false;
                ev.push({ t: 'collapse', hole: s.hole, universe: s.universe });
            }
        }
        return amount;
    }
    function gainXp(s, n, ev) {
        s.xp += n;
        var need = xpNext(s.level);
        while (s.xp >= need) {
            s.xp -= need;
            s.level += 1;
            s.maxHp += 2;
            s.hp = Math.min(s.maxHp, s.hp + 3);
            if (s.level % 2 === 0) s.atk += 1;
            ev.push({ t: 'level', level: s.level });
            need = xpNext(s.level);
        }
    }
    function killFoe(s, f, ev) {
        s.kills = (s.kills || 0) + 1;
        s.gold += f.gold;
        ev.push({ t: 'kill', kind: f.kind, gold: f.gold });
        gainXp(s, f.xp, ev);
    }
    function playerAttack(s, ev, multi) {
        var range = s.range || 3;
        var targets = [];
        var i, j;
        if (multi) {
            for (i = 0; i < s.foes.length; i++) {
                if (s.foes[i].hp > 0) targets.push(s.foes[i]);
            }
            if (!targets.length) { ev.push({ t: 'miss' }); return; }
        } else {
            var f = nearestFoe(s, range);
            if (!f) { ev.push({ t: 'miss' }); return; }
            targets.push(f);
        }
        for (j = 0; j < targets.length; j++) {
            var crit = s.chain > 0 && ((s.hops + s.strokes + j) % 4 === 0);
            var dmg = Math.max(1, s.atk - (targets[j].def || 0) + (crit ? 2 : 0));
            if (crit) dmg *= 2;
            damage(s, targets[j], dmg, false, ev);
            ev.push({ t: 'swing', kind: targets[j].kind, crit: crit });
            if (targets[j].hp <= 0) killFoe(s, targets[j], ev);
            if (s.over) break;
        }
    }
    // Enemy contact damage, scaled by universe might. Runs after every player
    // action so standing among haunts always costs blood.
    function enemyContact(s, ev) {
        if (!s || !s.foes || s.over) return;
        var might = mightOf(s.universe);
        for (var i = 0; i < s.foes.length; i++) {
            var f = s.foes[i];
            if (!f || f.hp <= 0 || s.over) continue;
            damage(s, null, Math.max(1, Math.round(f.atk * might)), true, ev);
            if (s.over) break;
        }
    }
    function ensureRpg(s) {
        if (typeof s.hp !== 'number' || typeof s.maxHp !== 'number') {
            var c = CLASSES[s.cls] || CLASSES.putter;
            var r = RACES[s.race] || RACES.human;
            s.maxHp = Math.max(1, c.hp + r.hp);
            s.hp = s.maxHp;
        }
        if (typeof s.atk !== 'number') s.atk = (CLASSES[s.cls] || CLASSES.putter).atk;
        if (typeof s.def !== 'number') s.def = (CLASSES[s.cls] || CLASSES.putter).def || 0;
        if (typeof s.spd !== 'number') s.spd = (CLASSES[s.cls] || CLASSES.putter).spd || 0;
        if (typeof s.range !== 'number') s.range = (CLASSES[s.cls] || CLASSES.putter).range;
        if (typeof s.level !== 'number') s.level = 1;
        if (typeof s.xp !== 'number') s.xp = 0;
        if (typeof s.potions !== 'number') s.potions = 2;
        if (typeof s.kills !== 'number') s.kills = 0;
        if (typeof s.cooldown !== 'number') s.cooldown = 0;
        if (typeof s.ward !== 'number') s.ward = 0;
        if (!s.foes) s.foes = spawnFoes(s.hole || 0, s.universe);
    }

    /* ---------------- Rules core (pure) ---------------- */
    function newRun(opts) {
        opts = opts || {};
        var clsKey = CLASSES[opts.cls] ? opts.cls : 'putter';
        var raceKey = RACES[opts.race] ? opts.race : 'human';
        var c = CLASSES[clsKey];
        var r = RACES[raceKey];
        var maxHp = Math.max(1, c.hp + r.hp);
        return {
            mode: 'turn',
            cls: clsKey,
            race: raceKey,
            hp: maxHp,
            maxHp: maxHp,
            atk: Math.max(1, c.atk + r.atk),
            def: Math.max(0, (c.def || 0) + r.def),
            spd: Math.max(1, (c.spd || 0) + r.spd),
            range: c.range,
            level: 1,
            xp: 0,
            potions: 2,
            kills: 0,
            cooldown: 0,
            ward: 0,
            foes: spawnFoes(0, opts.universe || 'prime'),
            hole: 0,
            strokes: 0,
            universe: opts.universe || 'prime',
            w: 0,
            paradox: 0,          // 0..100; 100 = collapse trigger
            chain: 0,            // consecutive hops without a strike
            combo: 1,            // score multiplier from chains
            gold: 0,
            hops: 0,
            doom: 0,             // collapse countdown once triggered
            over: false,
            win: false,
            log: []
        };
    }

    // One discrete action. Returns an event list (view layer animates them).
    // putt stays as the dungeon strike (golf reframed); attack / ability /
    // potion are first-class RPG actions; contact damage taxes every round.
    function tick(s, action) {
        var ev = [];
        if (!s || s.over) return ev;
        action = action || { wait: true };
        ensureRpg(s);
        var u = universeById(s.universe);
        if (s.cooldown > 0) s.cooldown -= 1;
        if (s.ward > 0) s.ward -= 1;

        if (action.hop) {
            var target = typeof action.hop === 'string' ? action.hop : nextUniverse(s.universe);
            return hop(s, target);
        }
        if (action.attack) {
            playerAttack(s, ev, false);
            if (!s.over) enemyContact(s, ev);
            stepDoom(s, ev, u);
            return ev;
        }
        if (action.potion) {
            if (s.potions > 0 && s.hp < s.maxHp && !s.over) {
                s.potions -= 1;
                s.hp = Math.min(s.maxHp, s.hp + Math.ceil(s.maxHp / 2));
                ev.push({ t: 'potion', hp: s.hp, left: s.potions });
                s.paradox = clamp(s.paradox - 6, 0, 100);
            } else {
                ev.push({ t: 'nopotion', left: s.potions });
            }
            if (!s.over) enemyContact(s, ev);
            stepDoom(s, ev, u);
            return ev;
        }
        if (action.putt) {
            var power = clamp(Number(action.power) || 1, 0.25, 3);
            s.strokes += 1;
            s.w = clamp(s.w + u.drift, -3, 3);
            s.paradox = clamp(s.paradox - 4, 0, 100);
            s.chain = 0;
            var need = holePar(s.hole, s.universe);
            var sunk = s.strokes >= need; // dungeon strike: par strikes clear the haunt
            ev.push({ t: 'putt', power: power, gravity: u.gravity, strokes: s.strokes, par: need, strike: true });
            playerAttack(s, ev, false);
            if (sunk && !s.over) {
                var bonus = Math.round(10 * s.combo);
                s.gold += bonus;
                ev.push({ t: 'hole', hole: s.hole, bonus: bonus, combo: s.combo });
                s.hole += 1;
                s.strokes = 0;
                s.combo = 1;
                if (s.hole >= HOLES.length) {
                    s.over = true;
                    s.win = true;
                    ev.push({ t: 'victory', gold: s.gold, hops: s.hops, kills: s.kills, level: s.level });
                } else {
                    s.foes = spawnFoes(s.hole, s.universe);
                    ev.push({ t: 'haunt', hole: s.hole, universe: s.universe });
                }
            }
            if (!s.over) enemyContact(s, ev);
            stepDoom(s, ev, u);
            return ev;
        }
        if (action.ability) {
            if ((s.cooldown || 0) > 0) {
                ev.push({ t: 'nocool', cooldown: s.cooldown });
                if (!s.over) enemyContact(s, ev);
                stepDoom(s, ev, u);
                return ev;
            }
            if (s.cls === 'warden') {
                s.paradox = clamp(s.paradox - 25, 0, 100);
                s.doom = 0;
                s.ward = 2;
                s.hp = Math.min(s.maxHp, s.hp + 4);
                s.cooldown = 6;
                ev.push({ t: 'anchor', paradox: s.paradox, hp: s.hp });
            } else if (s.cls === 'drifter') {
                s.combo = Math.min(8, s.combo + 1);
                ev = ev.concat(hop(s, nextUniverse(s.universe), true));
                if (!s.over) playerAttack(s, ev, false);
                s.cooldown = 4;
                ev.push({ t: 'leap', combo: s.combo });
            } else {
                s.combo = Math.min(8, s.combo + 1);
                playerAttack(s, ev, true);
                s.cooldown = 5;
                ev.push({ t: 'leap', combo: s.combo });
            }
            if (!s.over) enemyContact(s, ev);
            stepDoom(s, ev, u);
            return ev;
        }
        // step / wait: drift + doom advance, haunts still press in.
        s.w = clamp(s.w + u.drift * 0.5, -3, 3);
        ev.push({ t: 'wait', w: s.w });
        if (!s.over) enemyContact(s, ev);
        stepDoom(s, ev, u);
        return ev;
    }

    function nextUniverse(currentId) {
        for (var i = 0; i < UNIVERSES.length; i++) {
            if (UNIVERSES[i].id === currentId) return UNIVERSES[(i + 1) % UNIVERSES.length].id;
        }
        return UNIVERSES[0].id;
    }

    // Hop cost scales with chain length — crazier than 4D world-hop (flat cost).
    // Each hop re-haunts the hole with the target universe roster.
    function hop(s, targetId, free) {
        var ev = [];
        ensureRpg(s);
        var target = universeById(targetId);
        var cost = free ? 0 : 8 + s.chain * 6;
        s.paradox = clamp(s.paradox + cost, 0, 100);
        s.chain += 1;
        s.hops += 1;
        s.combo = Math.min(8, 1 + Math.floor(s.chain / 2));
        s.universe = target.id;
        s.w = 0;
        s.foes = spawnFoes(s.hole || 0, s.universe);
        ev.push({ t: 'hop', to: target.id, paradox: s.paradox, chain: s.chain, combo: s.combo });
        if (s.paradox >= 100) {
            var u = universeById(s.universe);
            var fuse = u.collapseTicks || 6;
            s.doom = fuse;
            ev.push({ t: 'collapse', universe: s.universe, fuse: fuse });
        }
        return ev;
    }

    function stepDoom(s, ev, u) {
        u = u || universeById(s.universe);
        if (s.doom > 0) {
            s.doom -= 1;
            ev.push({ t: 'doom', left: s.doom, universe: s.universe });
            if (s.doom <= 0 && (u.collapseTicks > 0)) {
                // Collapse: bounced back to Prime, paradox vented, combo lost.
                s.universe = 'prime';
                s.paradox = 40;
                s.combo = 1;
                s.chain = 0;
                ev.push({ t: 'collapsed', to: 'prime' });
            } else if (s.doom <= 0) {
                s.paradox = clamp(s.paradox - 30, 0, 100);
            }
        }
    }

    function score(s) {
        if (!s) return 0;
        return s.gold + s.hops * 2 + (s.kills || 0) * 2 + (s.level || 1) * 10 + (s.win ? 100 : 0);
    }

    /* ---------------- Persistence (view-side, fail-open) ---------------- */
    function loadProfile() {
        var fallback = { best: 0, wins: 0, settings: null };
        try {
            var raw = window.localStorage ? window.localStorage.getItem(SAVE_KEY) : null;
            if (!raw) return fallback;
            var p = JSON.parse(raw);
            if (p && p.v === SAVE_VERSION) return p;
            return fallback;
        } catch (_) { return fallback; }
    }
    function saveProfile(p) {
        try {
            p.v = SAVE_VERSION;
            if (window.localStorage) window.localStorage.setItem(SAVE_KEY, JSON.stringify(p));
        } catch (_) { /* fail-open */ }
    }

    /* ---- View ---- */
    var G = null;

    function el(id) { try { return document.getElementById(id); } catch (_) { return null; } }
    function setText(id, v) { try { var n = el(id); if (n) n.textContent = String(v); } catch (_) {} }

    function renderMenuBackdrop() {
        try {
            var c = el('gg5dCanvas');
            if (!c) return;
            var ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#05030d';
            ctx.fillRect(0, 0, c.width, c.height);
            // Multiverse teaser: one ring per universe.
            var cols = ['#22d3ee', '#a855f7', '#f472b6', '#ef4444', '#34d399', '#94a3b8'];
            for (var i = 0; i < 6; i++) {
                ctx.strokeStyle = cols[i % cols.length];
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(c.width * (0.2 + i * 0.12), c.height * 0.4, 24 + (i % 3) * 12, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        } catch (_) {}
    }

    function render() {
        try {
            if (!G || !G.ctx || !G.run) { renderMenuBackdrop(); return; }
            var ctx = G.ctx, s = G.run;
            var W = 1000, H = 600;
            ctx.setTransform(G.dpr || 1, 0, 0, G.dpr || 1, 0, 0);
            var u = universeById(s.universe);
            // Sky tinted per universe (scaffold palette).
            var tints = { prime: '#0e7490', echo: '#7c3aed', dream: '#db2777', void: '#7f1d1d', bloom: '#15803d', static: '#475569' };
            ctx.fillStyle = '#05030d';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = tints[s.universe] || '#0e7490';
            ctx.globalAlpha = 0.25;
            ctx.fillRect(0, 0, W, H * 0.6);
            ctx.globalAlpha = 1;
            // Fairway + hole.
            ctx.strokeStyle = 'rgba(34,211,238,0.7)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(60, H * 0.7); ctx.lineTo(W - 60, H * 0.7); ctx.stroke();
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🕳️', W - 120, H * 0.7 - 12);
            // Ball position from strokes (scaffold: marches right per stroke).
            var bx = 100 + (s.strokes / Math.max(1, holePar(s.hole, s.universe))) * (W - 260);
            ctx.font = '36px sans-serif';
            ctx.fillText('⚪', bx, H * 0.7 - 12);
            ctx.font = '28px sans-serif';
            ctx.fillText(u.emoji, bx, H * 0.7 - 54);
            // HUD line.
            ctx.textAlign = 'left';
            ctx.font = 'bold 16px Outfit, sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('HOLE ' + (s.hole + 1) + '/10  ' + u.emoji + ' ' + u.name.toUpperCase(), 24, 30);
            ctx.fillStyle = s.paradox >= 80 ? '#ef4444' : '#22d3ee';
            ctx.fillText('PARADOX ' + s.paradox + '  CHAIN x' + s.combo + (s.doom > 0 ? '  💥 ' + s.doom : ''), 24, 54);
            updateHud();
        } catch (_) { /* render must never throw */ }
    }

    function updateHud() {
        try {
            if (!G || !G.run) return;
            var s = G.run;
            var u = universeById(s.universe);
            setText('gg5dHole', 'Hole ' + (s.hole + 1) + '/10');
            setText('gg5dStrokes', s.strokes + '/' + holePar(s.hole, s.universe));
            setText('gg5dGold', s.gold);
            setText('gg5dUniverse', u.emoji + ' ' + u.name);
            setText('gg5dParadox', s.paradox + (s.doom > 0 ? ' 💥' + s.doom : ''));
            setText('gg5dChain', 'x' + s.combo);
            setText('gg5dHp', (s.hp != null ? s.hp : '?') + '/' + (s.maxHp != null ? s.maxHp : '?'));
            setText('gg5dLevel', 'Lv' + (s.level || 1) + ' ' + (s.xp || 0) + 'xp');
            setText('gg5dPotions', s.potions != null ? s.potions : '?');
            setText('gg5dFoes', s.foes ? s.foes.filter(function (f) { return f.hp > 0; }).length + ' haunts' : '');
            var pf = el('gg5dParadoxFill');
            if (pf) pf.style.width = clamp(s.paradox, 0, 100).toFixed(0) + '%';
            var badge = el('gg5dParadoxBadge');
            if (badge) badge.className = s.paradox >= 80 ? 'hot' : '';
        } catch (_) {}
    }

    function sizeCanvas() {
        try {
            if (!G || !G.canvas) return;
            var cssW = G.canvas.clientWidth || 1000;
            var cssH = Math.round(cssW * 600 / 1000);
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            G.canvas.width = Math.round(cssW * dpr);
            G.canvas.height = Math.round(cssH * dpr);
            G.dpr = dpr;
        } catch (_) {}
    }

    function showBanner(title, text) {
        try {
            setText('gg5dBannerTitle', title);
            setText('gg5dBannerText', text);
            var b = el('gg5dBanner');
            if (b) b.className = 'on';
        } catch (_) {}
    }
    function hideBanner() {
        try {
            var b = el('gg5dBanner');
            if (b) b.className = '';
        } catch (_) {}
    }

    function startRun(cls, universe, race) {
        G.run = newRun({ cls: cls, universe: universe, race: race });
        try {
            el('gg5dMenu').style.display = 'none';
            el('gg5dHud').hidden = false;
            el('gg5dTouch').hidden = false;
        } catch (_) {}
        sizeCanvas();
        var u = universeById(G.run.universe);
        showBanner('TRANSCEND — ' + u.name.toUpperCase(), u.blurb + '\nU = hop · Space = putt · T = rewind (4D echo)');
        render();
    }

    function doAction(kind) {
        try {
            if (!G || !G.run || G.run.over) return;
            hideBanner();
            var ev;
            if (kind === 'hop') ev = tick(G.run, { hop: true });
            else if (kind === 'attack') ev = tick(G.run, { attack: true });
            else if (kind === 'putt' || kind === 'step') ev = tick(G.run, { putt: true, power: 1 });
            else if (kind === 'ability') ev = tick(G.run, { ability: true });
            else if (kind === 'potion') ev = tick(G.run, { potion: true });
            else ev = tick(G.run, { wait: true });
            if (G.run.over && G.run.win) {
                var p = loadProfile();
                p.wins += 1;
                p.best = Math.max(p.best, score(G.run));
                saveProfile(p);
                showBanner('PRIME ARRAY REACHED', 'Gold ' + G.run.gold + ' · hops ' + G.run.hops + ' · victories ' + p.wins);
            }
            render();
            return ev;
        } catch (_) { return []; }
    }

    function bind() {
        try {
            var cls = 'putter', universe = 'prime';
            function paint() {
                var cp = el('gg5dClassPick');
                if (cp) for (var i = 0; i < cp.children.length; i++) {
                    cp.children[i].className = cp.children[i].getAttribute('data-class') === cls ? 'sel' : '';
                }
                var up = el('gg5dUniversePick');
                if (up) for (var j = 0; j < up.children.length; j++) {
                    up.children[j].className = up.children[j].getAttribute('data-universe') === universe ? 'sel' : '';
                }
            }
            var cpick = el('gg5dClassPick');
            if (cpick) cpick.addEventListener('click', function (ev) {
                try {
                    var b = ev.target.closest ? ev.target.closest('[data-class]') : null;
                    if (b && CLASSES[b.getAttribute('data-class')]) { cls = b.getAttribute('data-class'); paint(); }
                } catch (_) {}
            });
            var upick = el('gg5dUniversePick');
            if (upick) upick.addEventListener('click', function (ev) {
                try {
                    var b2 = ev.target.closest ? ev.target.closest('[data-universe]') : null;
                    if (b2 && universeById(b2.getAttribute('data-universe'))) { universe = b2.getAttribute('data-universe'); paint(); }
                } catch (_) {}
            });
            paint();
            var go = el('gg5dGoBtn');
            if (go) go.addEventListener('click', function () {
                try {
                    var prof = loadProfile();
                    prof.settings = { cls: cls, universe: universe };
                    saveProfile(prof);
                    startRun(cls, universe);
                } catch (_) {}
            });
            var tb = el('gg5dTouch');
            if (tb) tb.addEventListener('click', function (ev) {
                try {
                    var b3 = ev.target.closest ? ev.target.closest('[data-act]') : null;
                    if (b3) doAction(b3.getAttribute('data-act'));
                } catch (_) {}
            });
            document.addEventListener('keydown', function (ev) {
                try {
                    if (!G || !G.run) return;
                    var k = ev.key;
                    if (k === 'u' || k === 'U' || k === 'v' || k === 'V') { ev.preventDefault(); doAction('hop'); }
                    else if (k === ' ' || k === 'Enter') { ev.preventDefault(); doAction('putt'); }
                    else if (k === 'f' || k === 'F') { ev.preventDefault(); doAction('attack'); }
                    else if (k === 'r' || k === 'R') { ev.preventDefault(); doAction('ability'); }
                    else if (k === 'h' || k === 'H') { ev.preventDefault(); doAction('potion'); }
                    else if (k === 'q' || k === 'Q' || k === 'e' || k === 'E') { ev.preventDefault(); doAction('step'); }
                    else if (k === 't' || k === 'T') { ev.preventDefault(); doAction('wait'); }
                } catch (_) {}
            });
            var cv = el('gg5dCanvas');
            if (cv) cv.addEventListener('click', function () { try { hideBanner(); } catch (_) {} });
            document.addEventListener('fullscreenchange', function () { try { sizeCanvas(); } catch (_) {} });
            window.addEventListener('resize', function () { try { sizeCanvas(); } catch (_) {} });
        } catch (_) {}
    }

    function boot() {
        try {
            var canvas = el('gg5dCanvas');
            G = {
                canvas: canvas,
                ctx: canvas ? canvas.getContext('2d') : null,
                dpr: 1,
                run: null
            };
            bind();
            renderMenuBackdrop();
            (function loop() {
                try { render(); } catch (_) {}
                try { requestAnimationFrame(loop); } catch (_) {}
            })();
            return true;
        } catch (_) { return false; }
    }

    var api = {
        VERSION: VERSION,
        SAVE_KEY: SAVE_KEY,
        UNIVERSES: UNIVERSES,
        CLASSES: CLASSES,
        RACES: RACES,
        ENEMIES: ENEMIES,
        HOLES: HOLES,
        newRun: newRun,
        tick: tick,
        hop: hop,
        score: score,
        nearestFoe: nearestFoe,
        playerAttack: playerAttack,
        damage: damage,
        gainXp: gainXp,
        holePar: holePar,
        universeById: universeById,
        doAction: doAction,
        startRun: startRun,
        boot: boot
    };

    try { window.GraveGain5D = api; } catch (_) {}
    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain5d', version: VERSION, init: boot });
    } catch (_) {}

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (_) {}
})();
