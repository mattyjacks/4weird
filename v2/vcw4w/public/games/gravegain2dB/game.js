/* GraveGain2dB: Breach MoonRock — run-and-gun scaffold (v0.2.0).
 *
 * 2D horizontal side-scrolling run-and-gun: run right, jump/dash with
 * coyote time + jump buffering + i-frames, aim 360, collapse supports,
 * rescue civilians, extract. Solo first; 2-4p co-op after core.
 *
 * Vanilla IIFE, idempotent. Rules core (newRun/tick/score) is pure: no
 * document/canvas/localStorage/fetch/eval — DOM lives only in the view
 * layer below the "---- View ----" marker. Sibling terrain/player/campaign
 * modules are reused BY REFERENCE when present (tuning passed in via opts
 * from the view layer); the scaffold is fully playable with zero deps.
 *
 * Save separation: ALL keys live under `gravegain2dB.*`. This bundle MUST
 * NOT read or write `gravegain2dA.*` keys. Canonical slug `gravegain2dB`
 * (mixed case); lowercase `gravegain2db` is a compat redirect owned by the
 * site integrator, never rewritten here.
 */
(function () {
    'use strict';
    if (typeof window === 'undefined') return;
    if (window.GraveGain2dB && window.GraveGain2dB.VERSION) return;

    var VERSION = '0.2.0-scaffold';
    var SAVE_KEY = 'gravegain2dB.shell.v1';
    var SAVE_VERSION = 1;

    /* Fixed timestep: exactly 1/60 sim step; view clamps frame delta 0.1s. */
    var DT = 1 / 60;
    var GRAV = 2200;          // px/s^2
    var MOVE = 260;           // px/s run speed
    var AIR_CTL = 0.75;       // air steering factor
    var JUMP_V = 760;         // px/s jump velocity
    var COYOTE = 0.10;        // s forgiving ledge grace
    var JBUF = 0.12;          // s jump buffer
    var DASH_V = 640;         // px/s dash velocity
    var DASH_T = 0.16;        // s dash duration
    var DASH_CD = 0.9;        // s dash cooldown
    var IFRAMES = 0.25;       // s dash invulnerability

    var HEROES = {
        lisa:    { name: 'Lisa Park',  emoji: 'HERO_LISA',    hp: 100, armor: 25, skill: 'Thruster Kick' },
        arty:    { name: 'Arty Fisher', emoji: 'HERO_ARTY',   hp: 100, armor: 25, skill: 'Remote Charge' },
        groknak: { name: 'Groknak',    emoji: 'HERO_GROK',    hp: 140, armor: 15, skill: 'Rage Ram' },
        valley:  { name: 'Valley Net', emoji: 'HERO_VALLEY',  hp: 90,  armor: 40, skill: 'Signal Pulse' }
    };

    var WEAPONS = {
        pulse:   { name: 'Pulse rifle',    cd: 0.14, dmg: 12, speed: 900, pierce: true },
        scatter: { name: 'Scatter blaster', cd: 0.55, dmg: 8, speed: 700, pellets: 5 },
        launcher:{ name: 'Grave launcher', cd: 0.9,  dmg: 40, speed: 520, blast: 90 }
    };

    var FOES = {
        zed:    { hp: 30,  dmg: 10, speed: 90,  kind: 'chase' },
        rifle:  { hp: 45,  dmg: 8,  speed: 60,  kind: 'ranged' },
        sapper: { hp: 25,  dmg: 25, speed: 130, kind: 'bomber' }
    };

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function sign(v) { return v < 0 ? -1 : 1; }

    /* Pure deterministic RNG (mulberry32) so runs are seed-replayable. */
    function rng32(seed) {
        var a = (seed >>> 0) || 1;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* ---------------- Pure core ---------------- */
    function newRun(opts) {
        opts = opts || {};
        var hero = HEROES[opts.hero] ? opts.hero : 'lisa';
        var H = HEROES[hero];
        var move = (typeof opts.moveSpeed === 'number' && opts.moveSpeed > 0) ? opts.moveSpeed : MOVE;
        var jumpV = (typeof opts.jumpV === 'number' && opts.jumpV > 0) ? opts.jumpV : JUMP_V;
        var rand = rng32(typeof opts.seed === 'number' ? opts.seed : 1337);
        var foes = [];
        var foeIds = ['zed', 'zed', 'rifle', 'zed', 'sapper'];
        for (var i = 0; i < foeIds.length; i++) {
            var f = FOES[foeIds[i]];
            foes.push({
                id: i, type: foeIds[i], hp: f.hp, maxHp: f.hp,
                x: 700 + i * 260 + Math.floor(rand() * 80), y: 0, vx: 0, vy: 0,
                fireCd: 1 + rand() * 2, fuse: 0
            });
        }
        var civs = [];
        for (var c = 0; c < 3; c++) {
            civs.push({ id: c, x: 900 + c * 700, saved: false, downed: false });
        }
        return {
            v: 1, hero: hero, mission: opts.mission || 'bdb-m01',
            moveSpeed: move, jumpV: jumpV, seed: (typeof opts.seed === 'number' ? opts.seed : 1337),
            player: {
                x: 80, y: 0, vx: 0, vy: 0, face: 1, ground: true,
                hp: H.hp, maxHp: H.hp, armor: H.armor, maxArmor: H.armor,
                coyote: 0, jbuf: 0, dashT: 0, dashCd: 0, iframes: 0,
                fireCd: 0, altCd: 0, altAmmo: 1, aim: 0,
                weapon: 'pulse', alt: 'grenade', ammo: -1
            },
            foes: foes, shots: [], civs: civs,
            unstable: { x: 1500, hp: 60, maxHp: 60, warnT: 0, dropped: false },
            objective: 'Secure survivors + black box',
            ticks: 0, time: 0, kills: 0, rescued: 0, chain: 0, chainT: 0,
            demolition: 0, over: false, win: false, extracted: false
        };
    }

    function hurtPlayer(s, dmg) {
        var p = s.player;
        if (p.iframes > 0 || s.over) return;
        var soak = Math.min(p.armor, Math.ceil(dmg * 0.5));
        p.armor -= soak;
        p.hp -= (dmg - soak);
        if (p.hp <= 0) { p.hp = 0; s.over = true; s.win = false; }
    }

    function fireWeapon(s, ev) {
        var p = s.player;
        var w = WEAPONS[p.weapon] || WEAPONS.pulse;
        if (p.fireCd > 0) return;
        p.fireCd = w.cd;
        var n = w.pellets || 1;
        for (var i = 0; i < n; i++) {
            var spread = n > 1 ? (i - (n - 1) / 2) * 0.09 : 0;
            var a = p.aim + spread;
            s.shots.push({
                x: p.x, y: p.y - 20, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
                dmg: w.dmg, pierce: !!w.pierce, blast: w.blast || 0, life: 1.2, foe: false
            });
        }
        ev.push({ t: 'shot', weapon: p.weapon });
    }

    function altFire(s, ev) {
        var p = s.player;
        if (p.altCd > 0 || p.altAmmo <= 0) return;
        p.altCd = 1.2; p.altAmmo -= 1;
        s.shots.push({
            x: p.x, y: p.y - 20, vx: p.face * 420, vy: -260,
            dmg: 55, pierce: false, blast: 120, life: 2.0, foe: false
        });
        ev.push({ t: 'alt', alt: p.alt });
    }

    /* One fixed DT step. input: {move, jump, aim, fire, alt, dash,
     * interact, swap}. Returns event list (view layer animates them). */
    function tick(s, input) {
        var ev = [];
        if (!s || s.over) return ev;
        input = input || {};
        var p = s.player;
        var mv = clamp(typeof input.move === 'number' ? input.move : 0, -1, 1);

        s.ticks += 1;
        s.time += DT;
        if (s.chainT > 0) { s.chainT -= DT; if (s.chainT <= 0) s.chain = 0; }

        /* Timers. */
        if (p.fireCd > 0) p.fireCd -= DT;
        if (p.altCd > 0) p.altCd -= DT;
        if (p.dashCd > 0) p.dashCd -= DT;
        if (p.iframes > 0) p.iframes -= DT;
        if (p.coyote > 0) p.coyote -= DT;
        if (p.jbuf > 0) p.jbuf -= DT;

        /* Horizontal: ground full authority, air steered. */
        var target = mv * s.moveSpeed;
        if (p.dashT <= 0) {
            if (p.ground) p.vx = target;
            else p.vx += clamp(target - p.vx, -s.moveSpeed * AIR_CTL * DT * 10, s.moveSpeed * AIR_CTL * DT * 10);
        }
        if (mv !== 0) p.face = sign(mv);

        /* Jump: buffer + coyote. */
        if (input.jump) p.jbuf = JBUF;
        if (p.jbuf > 0 && (p.ground || p.coyote > 0)) {
            p.vy = -s.jumpV; p.ground = false; p.coyote = 0; p.jbuf = 0;
            ev.push({ t: 'jump' });
        }

        /* Dash: burst + i-frames. */
        if (input.dash && p.dashCd <= 0 && p.dashT <= 0) {
            p.dashT = DASH_T; p.dashCd = DASH_CD; p.iframes = Math.max(p.iframes, IFRAMES);
            ev.push({ t: 'dash' });
        }
        if (p.dashT > 0) { p.dashT -= DT; p.vx = p.face * DASH_V; p.vy = 0; }

        /* Aim + fire. */
        if (typeof input.aim === 'number') p.aim = input.aim;
        if (input.swap && WEAPONS[input.swap]) {
            p.weapon = input.swap;
            ev.push({ t: 'swap', weapon: p.weapon });
        }
        if (input.fire) fireWeapon(s, ev);
        if (input.alt) altFire(s, ev);

        /* Gravity + integrate (floor y=0). */
        if (p.dashT <= 0) p.vy += GRAV * DT;
        p.x += p.vx * DT;
        p.y += p.vy * DT;
        if (p.x < 20) { p.x = 20; p.vx = 0; }
        if (p.y >= 0) {
            if (!p.ground && p.vy > 500) ev.push({ t: 'land' });
            p.y = 0; p.vy = 0;
            if (!p.ground) { p.ground = true; }
            p.coyote = COYOTE;
        } else if (p.ground && p.y < -1) {
            p.ground = false; p.coyote = COYOTE;
        }

        /* Shots: move, expire, hit foes / unstable support. */
        for (var i = s.shots.length - 1; i >= 0; i--) {
            var sh = s.shots[i];
            sh.x += sh.vx * DT; sh.y += sh.vy * DT; sh.life -= DT;
            if (!sh.foe) sh.vy += 300 * DT;
            var dead = sh.life <= 0;
            if (!dead && !sh.foe) {
                for (var f = 0; f < s.foes.length; f++) {
                    var foe = s.foes[f];
                    if (foe.hp <= 0) continue;
                    var dx = foe.x - sh.x, dy = (foe.y - 20) - sh.y;
                    if (dx * dx + dy * dy < 900) {
                        foe.hp -= sh.dmg;
                        if (sh.blast > 0) {
                            for (var g = 0; g < s.foes.length; g++) {
                                var o = s.foes[g];
                                if (o === foe || o.hp <= 0) continue;
                                var ox = o.x - sh.x, oy = (o.y - 20) - sh.y;
                                if (ox * ox + oy * oy < sh.blast * sh.blast) o.hp -= Math.ceil(sh.dmg / 2);
                            }
                            var ux = s.unstable.x - sh.x, uy = (0 - 40) - sh.y;
                            if (ux * ux + uy * uy < (sh.blast + 60) * (sh.blast + 60)) {
                                s.unstable.hp -= sh.dmg;
                                ev.push({ t: 'hit-support', hp: Math.max(0, Math.ceil(s.unstable.hp)) });
                            }
                            ev.push({ t: 'blast', x: Math.round(sh.x), y: Math.round(sh.y) });
                        }
                        if (foe.hp <= 0) {
                            s.kills += 1; s.chain += 1; s.chainT = 3;
                            ev.push({ t: 'kill', type: foe.type, chain: s.chain });
                        } else {
                            ev.push({ t: 'hit', type: foe.type });
                        }
                        if (!sh.pierce) { dead = true; break; }
                    }
                }
            }
            if (dead) s.shots.splice(i, 1);
        }
        if (s.shots.length > 80) s.shots.splice(0, s.shots.length - 80);

        /* Foes: chase / ranged / bomber. */
        for (var k = 0; k < s.foes.length; k++) {
            var F = s.foes[k], FD = FOES[F.type] || FOES.zed;
            if (F.hp <= 0) continue;
            var px = p.x - F.x;
            if (FD.kind === 'ranged') {
                F.fireCd -= DT;
                if (Math.abs(px) < 500 && F.fireCd <= 0) {
                    F.fireCd = 2.2;
                    s.shots.push({
                        x: F.x, y: F.y - 20, vx: sign(px) * 380, vy: 0,
                        dmg: FD.dmg, pierce: false, blast: 0, life: 1.5, foe: true
                    });
                    ev.push({ t: 'foe-shot' });
                }
                F.x += sign(px) * FD.speed * 0.4 * DT;
            } else if (FD.kind === 'bomber') {
                F.x += sign(px) * FD.speed * DT;
                if (Math.abs(px) < 36) {
                    F.hp = 0; s.kills += 1; s.chain += 1; s.chainT = 3;
                    ev.push({ t: 'blast', x: Math.round(F.x), y: -20 });
                    hurtPlayer(s, FD.dmg);
                    ev.push({ t: 'hurt', dmg: FD.dmg });
                }
            } else {
                F.x += sign(px) * FD.speed * DT;
                if (Math.abs(px) < 34 && Math.abs(p.y - F.y) < 60) {
                    hurtPlayer(s, FD.dmg);
                    ev.push({ t: 'hurt', dmg: FD.dmg });
                    F.x -= sign(px) * 60;
                }
            }
        }
        /* Foe shots vs player. */
        for (var q = s.shots.length - 1; q >= 0; q--) {
            var fs = s.shots[q];
            if (!fs.foe) continue;
            var fdx = p.x - fs.x, fdy = (p.y - 20) - fs.y;
            if (fdx * fdx + fdy * fdy < 625) {
                hurtPlayer(s, fs.dmg);
                ev.push({ t: 'hurt', dmg: fs.dmg });
                s.shots.splice(q, 1);
            }
        }

        /* Unstable support: two-step warning then collapse. */
        var U = s.unstable;
        if (!U.dropped) {
            if (U.hp <= U.maxHp * 0.5 && U.warnT <= 0) {
                U.warnT = 1.5;
                ev.push({ t: 'unstable' });
            }
            if (U.warnT > 0) U.warnT -= DT;
            if (U.hp <= 0) {
                U.dropped = true; s.demolition += 1;
                ev.push({ t: 'collapse', x: U.x });
                for (var z = 0; z < s.foes.length; z++) {
                    var cf = s.foes[z];
                    if (cf.hp > 0 && Math.abs(cf.x - U.x) < 160) {
                        cf.hp = 0; s.kills += 1; s.chain += 1; s.chainT = 3;
                        ev.push({ t: 'kill', type: cf.type, chain: s.chain, crushed: true });
                    }
                }
            }
        }

        /* Rescue: interact near a live civilian. */
        if (input.interact) {
            for (var n = 0; n < s.civs.length; n++) {
                var cv = s.civs[n];
                if (!cv.saved && Math.abs(cv.x - p.x) < 70) {
                    cv.saved = true; s.rescued += 1;
                    ev.push({ t: 'rescue', id: cv.id });
                    break;
                }
            }
        }

        /* Objective + extract at x=2600 after >=1 rescue. */
        var alive = 0;
        for (var a = 0; a < s.foes.length; a++) if (s.foes[a].hp > 0) alive += 1;
        if (s.rescued >= 1 && p.x >= 2600) {
            s.extracted = true; s.over = true; s.win = true;
            ev.push({ t: 'extract' });
        } else if (alive === 0 && s.rescued >= s.civs.length) {
            s.objective = 'Push east to extract';
        }
        return ev;
    }

    function score(s) {
        if (!s) return 0;
        var timeBonus = Math.max(0, 600 - Math.floor(s.time) * 2);
        return s.kills * 10 + s.rescued * 50 + s.demolition * 15 +
            s.chain * 5 + timeBonus + (s.win ? 200 : 0) + (s.extracted ? 100 : 0);
    }

    /* ---- View ---- */
    var G = null;

    function el(id) { try { return document.getElementById(id); } catch (_) { return null; } }
    function setText(id, v) { try { var n = el(id); if (n) n.textContent = String(v); } catch (_) {} }
    function opt(n) { try { return window[n] || null; } catch (_) { return null; } }

    function missing(name) {
        try {
            var b = el('gg2dbObjective');
            if (b && !missing._said) { missing._said = true; }
        } catch (_) {}
    }

    function loadProfile() {
        var fallback = { best: 0, wins: 0, hero: 'lisa' };
        try {
            var raw = window.localStorage ? window.localStorage.getItem(SAVE_KEY) : null;
            if (!raw) return fallback;
            var d = JSON.parse(raw);
            if (d && d.v === SAVE_VERSION) return d;
            return fallback;
        } catch (_) { return fallback; }
    }
    function saveProfile(p) {
        try {
            p.v = SAVE_VERSION;
            if (window.localStorage) window.localStorage.setItem(SAVE_KEY, JSON.stringify(p));
        } catch (_) { /* fail-open */ }
    }

    /* Viewport: 1280x720 CSS cap; canvas backing store scaled by DPR<=2. */
    function sizeCanvas() {
        try {
            if (!G || !G.canvas) return;
            var cssW = G.canvas.clientWidth || 960;
            var cssH = Math.round(cssW * 9 / 16);
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            G.canvas.width = Math.round(cssW * dpr);
            G.canvas.height = Math.round(cssH * dpr);
            G.dpr = dpr;
        } catch (_) {}
    }

    function showBanner(title, text) {
        try {
            setText('gg2dbBannerTitle', title);
            setText('gg2dbBannerText', text);
            var b = el('gg2dbBanner');
            if (b) b.className = 'on';
        } catch (_) {}
    }
    function hideBanner() {
        try {
            var b = el('gg2dbBanner');
            if (b) b.className = '';
        } catch (_) {}
    }

    function updateHud() {
        try {
            if (!G || !G.run) return;
            var s = G.run, p = s.player;
            var w = WEAPONS[p.weapon] || WEAPONS.pulse;
            setText('gg2dbHp', Math.ceil(p.hp) + '/' + p.maxHp);
            setText('gg2dbArmor', Math.ceil(p.armor));
            setText('gg2dbWeapon', w.name);
            setText('gg2dbAlt', p.altAmmo > 0 ? 'Grenade x' + p.altAmmo : 'Grenade --');
            setText('gg2dbObjective', s.objective);
            setText('gg2dbRescues', s.rescued + ' rescued');
            setText('gg2dbWaypoint', p.x < 2600 ? '➡️ E' : '📡 EXTRACT');
        } catch (_) {}
    }

    function render() {
        try {
            if (!G || !G.ctx) return;
            var ctx = G.ctx, s = G.run;
            var W = 960, H = 540;
            ctx.setTransform(G.dpr || 1, 0, 0, G.dpr || 1, 0, 0);
            /* Scale 960x540 logical stage into actual backing store. */
            var sx = G.canvas.width / (G.dpr || 1) / W;
            var sy = G.canvas.height / (G.dpr || 1) / H;
            ctx.scale(sx, sy);
            ctx.fillStyle = '#04050a';
            ctx.fillRect(0, 0, W, H);
            /* Parallax: moon + skyline by camera. */
            var cam = s ? clamp(s.player.x - 300, 0, 2000) : 0;
            ctx.font = '64px sans-serif'; ctx.textAlign = 'left';
            ctx.fillText('🌙', W - 120 - cam * 0.02, 90);
            ctx.fillStyle = '#131a33';
            ctx.fillRect(0, H - 90, W, 90);
            ctx.fillStyle = '#1d2648';
            for (var k = 0; k < 10; k++) {
                var bx = ((k * 220 - cam * 0.6) % (W + 200) + W + 200) % (W + 200) - 100;
                ctx.fillRect(bx, H - 160 - ((k * 53) % 60), 90, 160 + ((k * 53) % 60));
            }
            if (!s) return;
            var p = s.player;
            var px = p.x - cam;
            /* Civilians. */
            ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
            for (var c = 0; c < s.civs.length; c++) {
                var cv = s.civs[c];
                var cx = cv.x - cam;
                if (cx < -40 || cx > W + 40) continue;
                ctx.fillText(cv.saved ? '✅' : '🧑‍🌾', cx, H - 110);
                if (!cv.saved && Math.abs(cv.x - p.x) < 70) ctx.fillText('📡 E', cx, H - 150);
            }
            /* Unstable support tower. */
            var ux = s.unstable.x - cam;
            if (ux > -60 && ux < W + 60) {
                ctx.fillText('🏚️', ux, H - 140);
                if (!s.unstable.dropped && s.unstable.hp <= s.unstable.maxHp * 0.5) {
                    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#f5c542';
                    ctx.fillText('⚠️ UNSTABLE', ux, H - 180);
                    ctx.fillStyle = '#e8ecff'; ctx.font = '28px sans-serif';
                }
            }
            /* Foes. */
            var glyph = { zed: '🧟', rifle: '💀', sapper: '🧌' };
            for (var f = 0; f < s.foes.length; f++) {
                var F = s.foes[f];
                if (F.hp <= 0) continue;
                var fx = F.x - cam;
                if (fx < -40 || fx > W + 40) continue;
                ctx.fillText(glyph[F.type] || '🧟', fx, H - 110);
            }
            /* Shots. */
            for (var q = 0; q < s.shots.length; q++) {
                var sh = s.shots[q];
                var qx = sh.x - cam;
                if (qx < -20 || qx > W + 20) continue;
                ctx.fillText(sh.foe ? '🔥' : (sh.blast > 0 ? '🚀' : '💥'), qx, (H - 110) + sh.y);
            }
            /* Player + near-player ammo/cooldown + collapse danger. */
            var heroEmoji = { lisa: '🧑‍🚀', arty: '👨‍🔧', groknak: '👹', valley: '🤖' };
            if (p.iframes > 0 && Math.floor(s.time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
            ctx.fillText(heroEmoji[s.hero] || '🧑‍🚀', px, H - 110);
            ctx.globalAlpha = 1;
            ctx.font = '12px sans-serif'; ctx.fillStyle = '#9aa3c0'; ctx.textAlign = 'left';
            var w = WEAPONS[p.weapon] || WEAPONS.pulse;
            ctx.fillText(w.name + (p.fireCd > 0 ? ' …' : ' ●') +
                (p.dashCd > 0 ? '  💨…' : '  💨●'), px - 30, H - 150);
            if (!s.unstable.dropped && Math.abs(p.x - s.unstable.x) < 220 &&
                s.unstable.hp <= s.unstable.maxHp * 0.5) {
                ctx.fillStyle = '#ff5d5d';
                ctx.fillText('⬇ DANGER: COLLAPSE', px - 50, H - 170);
                ctx.fillStyle = '#9aa3c0';
            }
            /* Score line. */
            ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#f5c542'; ctx.textAlign = 'left';
            ctx.fillText('SCORE ' + score(s) + '  ⏱ ' + Math.floor(s.time) + 's  🔗x' +
                Math.max(1, s.chain), 16, 24);
            ctx.fillStyle = '#e8ecff';
            updateHud();
        } catch (_) { /* render must never throw */ }
    }

    function readPad() {
        /* Gamepad: left stick move, right stick aim, RT fire, LT alt,
         * South jump, East dash, West interact, Menu pause. Fail-open. */
        try {
            var gps = navigator.getGamepads ? navigator.getGamepads() : null;
            if (!gps) return null;
            for (var i = 0; i < gps.length; i++) {
                var gp = gps[i];
                if (gp && gp.connected) return gp;
            }
        } catch (_) {}
        return null;
    }

    function startRun(hero) {
        /* Sibling tuning by reference (view-side only): player movement
         * tuning + terrain material table, when sibling modules loaded. */
        var moveSpeed = MOVE, jumpV = JUMP_V;
        try {
            var PM = opt('GraveGain2dBPlayerMovement');
            if (PM && PM.TUNING) {
                if (typeof PM.TUNING.moveSpeed === 'number') moveSpeed = PM.TUNING.moveSpeed;
                if (typeof PM.TUNING.jumpV === 'number') jumpV = PM.TUNING.jumpV;
            }
        } catch (_) {}
        var mission = 'bdb-m01';
        try {
            var REG = opt('GraveGain2dBCampaignRegistry');
            if (REG && typeof REG.first === 'function') {
                var m = REG.first();
                if (m && m.id) mission = m.id;
            } else if (REG && REG.missions && REG.missions[0] && REG.missions[0].id) {
                mission = REG.missions[0].id;
            }
        } catch (_) {}
        G.run = newRun({ hero: hero, mission: mission, moveSpeed: moveSpeed, jumpV: jumpV, seed: 1337 });
        try {
            el('gg2dbMenu').style.display = 'none';
            el('gg2dbHud').style.display = 'flex';
            el('gg2dbTouch').hidden = false;
        } catch (_) {}
        sizeCanvas();
        showBanner('BREACH — ' + mission.toUpperCase(),
            'Run right · E rescues · collapse the 🏚️ · extract at 2600\nSpace jump · Shift dash · RMB/Q grenade');
        G.acc = 0; G.last = performance.now();
    }

    function stepInput() {
        var inp = { move: 0, jump: false, fire: false, alt: false, dash: false, interact: false };
        try {
            var K = G.keys;
            if (K.left) inp.move -= 1;
            if (K.right) inp.move += 1;
            if (K.jump) { inp.jump = true; K.jump = false; }
            if (K.interact) { inp.interact = true; K.interact = false; }
            if (K.dash) { inp.dash = true; K.dash = false; }
            if (K.alt) { inp.alt = true; K.alt = false; }
            if (K.swap) { inp.swap = K.swap; K.swap = null; }
            inp.fire = !!K.fireHeld;
            /* Mouse 360 aim: angle from player screen pos to cursor. */
            if (G.run && typeof K.mx === 'number') {
                var rect = G.canvas.getBoundingClientRect();
                var cam = clamp(G.run.player.x - 300, 0, 2000);
                var px = (G.run.player.x - cam) / 960 * rect.width;
                inp.aim = Math.atan2(K.my - (rect.height - 110 / 540 * rect.height), K.mx - px);
            }
            var gp = readPad();
            if (gp) {
                var ax = (gp.axes && gp.axes.length > 0) ? gp.axes[0] : 0;
                if (Math.abs(ax) > 0.25) inp.move = clamp(ax, -1, 1);
                var rx = gp.axes && gp.axes.length > 2 ? gp.axes[2] : 0;
                var ry = gp.axes && gp.axes.length > 3 ? gp.axes[3] : 0;
                if (Math.hypot(rx, ry) > 0.35) inp.aim = Math.atan2(ry, rx);
                var b = gp.buttons || [];
                if (b[7] && b[7].pressed) inp.fire = true;
                if (b[6] && b[6].pressed) inp.alt = true;
                if (b[0] && b[0].pressed && !G.padJump) { inp.jump = true; G.padJump = true; }
                if (!(b[0] && b[0].pressed)) G.padJump = false;
                if (b[1] && b[1].pressed && !G.padDash) { inp.dash = true; G.padDash = true; }
                if (!(b[1] && b[1].pressed)) G.padDash = false;
                if (b[2] && b[2].pressed && !G.padUse) { inp.interact = true; G.padUse = true; }
                if (!(b[2] && b[2].pressed)) G.padUse = false;
            }
        } catch (_) {}
        return inp;
    }

    function loop(now) {
        try {
            if (G.run && !G.run.over && !G.paused) {
                /* Fixed timestep: DT steps, frame delta clamped to 0.1s. */
                var frame = (now - G.last) / 1000;
                G.last = now;
                if (!(frame >= 0)) frame = 0;
                if (frame > 0.1) frame = 0.1;
                G.acc += frame;
                var n = 0;
                while (G.acc >= DT && n < 6) {
                    var ev = tick(G.run, stepInput());
                    G.acc -= DT; n += 1;
                    for (var i = 0; i < ev.length; i++) {
                        if (ev[i].t === 'extract' || (G.run.over && !G.runCounted)) {
                            G.runCounted = true;
                            var p = loadProfile();
                            p.wins += G.run.win ? 1 : 0;
                            p.best = Math.max(p.best, score(G.run));
                            saveProfile(p);
                            showBanner(G.run.win ? 'EXTRACTED ✓' : 'RUN LOST',
                                'Score ' + score(G.run) + ' · kills ' + G.run.kills +
                                ' · rescued ' + G.run.rescued + '/' + G.run.civs.length +
                                ' · best ' + p.best);
                        }
                    }
                    if (G.run.over) { G.acc = 0; break; }
                }
                if (n >= 6) G.acc = 0;
            } else {
                G.last = now;
            }
            render();
        } catch (_) {}
        try { requestAnimationFrame(loop); } catch (_) {}
    }

    function bind() {
        try {
            var hero = 'lisa';
            G.keys = { left: false, right: false, jump: false, fireHeld: false, alt: false, dash: false, interact: false, swap: null, mx: 480, my: 200 };
            function paint() {
                var hp = el('gg2dbHeroPick');
                if (hp) for (var i = 0; i < hp.children.length; i++) {
                    hp.children[i].className = hp.children[i].getAttribute('data-hero') === hero ? 'sel' : '';
                }
            }
            var pick = el('gg2dbHeroPick');
            if (pick) pick.addEventListener('click', function (ev) {
                try {
                    var b = ev.target.closest ? ev.target.closest('[data-hero]') : null;
                    if (b && HEROES[b.getAttribute('data-hero')]) {
                        hero = b.getAttribute('data-hero'); paint();
                        var prof = loadProfile(); prof.hero = hero; saveProfile(prof);
                    }
                } catch (_) {}
            });
            paint();
            var go = el('gg2dbGoBtn');
            if (go) go.addEventListener('click', function () {
                try { G.runCounted = false; startRun(hero); } catch (_) {}
            });
            var tb = el('gg2dbTouch');
            if (tb) tb.addEventListener('click', function (ev) {
                try {
                    var b2 = ev.target.closest ? ev.target.closest('[data-act]') : null;
                    if (!b2 || !G.run) return;
                    var a = b2.getAttribute('data-act');
                    if (a === 'jump') G.keys.jump = true;
                    else if (a === 'dash') G.keys.dash = true;
                    else if (a === 'interact') G.keys.interact = true;
                    else if (a === 'alt') G.keys.alt = true;
                    else if (a === 'fire') {
                        G.keys.fireHeld = true;
                        setTimeout(function () { try { G.keys.fireHeld = false; } catch (_) {} }, 150);
                    }
                } catch (_) {}
            });
            document.addEventListener('keydown', function (ev) {
                try {
                    var k = ev.key;
                    if (k === 'ArrowLeft' || k === 'a' || k === 'A') G.keys.left = true;
                    else if (k === 'ArrowRight' || k === 'd' || k === 'D') G.keys.right = true;
                    else if (k === ' ' || k === 'w' || k === 'W' || k === 'ArrowUp') { G.keys.jump = true; ev.preventDefault(); }
                    else if (k === 'e' || k === 'E') G.keys.interact = true;
                    else if (k === 'Shift') G.keys.dash = true;
                    else if (k === 'q' || k === 'Q') G.keys.alt = true;
                    else if (k === '1') G.keys.swap = 'pulse';
                    else if (k === '2') G.keys.swap = 'scatter';
                    else if (k === '3') G.keys.swap = 'launcher';
                    else if (k === 'Escape' || k === 'p' || k === 'P') {
                        G.paused = !G.paused;
                        showBanner(G.paused ? 'PAUSED' : 'BREACH', G.paused ? 'Esc resume · controls in menu' : '');
                        if (!G.paused) hideBanner();
                    }
                } catch (_) {}
            });
            document.addEventListener('keyup', function (ev) {
                try {
                    var k = ev.key;
                    if (k === 'ArrowLeft' || k === 'a' || k === 'A') G.keys.left = false;
                    else if (k === 'ArrowRight' || k === 'd' || k === 'D') G.keys.right = false;
                } catch (_) {}
            });
            if (G.canvas) {
                G.canvas.addEventListener('mousemove', function (ev) {
                    try {
                        var r = G.canvas.getBoundingClientRect();
                        G.keys.mx = ev.clientX - r.left;
                        G.keys.my = ev.clientY - r.top;
                    } catch (_) {}
                });
                G.canvas.addEventListener('mousedown', function (ev) {
                    try {
                        if (ev.button === 0) G.keys.fireHeld = true;
                        else if (ev.button === 2) G.keys.alt = true;
                    } catch (_) {}
                });
                document.addEventListener('mouseup', function (ev) {
                    try { if (ev.button === 0) G.keys.fireHeld = false; } catch (_) {}
                });
                G.canvas.addEventListener('contextmenu', function (ev) {
                    try { ev.preventDefault(); } catch (_) {}
                });
                G.canvas.addEventListener('wheel', function (ev) {
                    try {
                        var order = ['pulse', 'scatter', 'launcher'];
                        var cur = G.run ? order.indexOf(G.run.player.weapon) : 0;
                        var nxt = (cur + (ev.deltaY > 0 ? 1 : order.length - 1)) % order.length;
                        G.keys.swap = order[nxt];
                        ev.preventDefault();
                    } catch (_) {}
                }, { passive: false });
                G.canvas.addEventListener('click', function () { try { hideBanner(); } catch (_) {} });
            }
            var fs = el('gg2dbFsBtn');
            if (fs) fs.addEventListener('click', function () {
                try {
                    var st = el('gg2dbStage');
                    if (typeof window.__fourweirdToggleFullscreen === 'function') { window.__fourweirdToggleFullscreen(); return; }
                    if (!document.fullscreenElement && st && st.requestFullscreen) st.requestFullscreen();
                    else if (document.exitFullscreen) document.exitFullscreen();
                } catch (_) {}
            });
            document.addEventListener('fullscreenchange', function () { try { sizeCanvas(); } catch (_) {} });
            window.addEventListener('resize', function () { try { sizeCanvas(); } catch (_) {} });
        } catch (_) {}
    }

    function boot() {
        try {
            window.__gg2dbMissing = window.__gg2dbMissing || function () {};
            var canvas = el('gg2dbCanvas');
            G = {
                canvas: canvas,
                ctx: canvas ? canvas.getContext('2d') : null,
                dpr: 1, run: null, acc: 0, last: 0,
                paused: false, runCounted: false, padJump: false, padDash: false, padUse: false,
                keys: null
            };
            try {
                var prof = loadProfile();
                if (prof && HEROES[prof.hero]) G.hero = prof.hero;
            } catch (_) {}
            bind();
            sizeCanvas();
            try { requestAnimationFrame(function (t) { G.last = t || performance.now(); requestAnimationFrame(loop); }); }
            catch (_) {}
            try {
                if (window.FourweirdContentMode && typeof window.FourweirdContentMode.ready === 'function') {
                    window.FourweirdContentMode.ready({ slug: 'gravegain2dB', shell: 'gravegain2dB-scaffold-0.2.0' });
                }
            } catch (_) {}
            return true;
        } catch (_) { return false; }
    }

    var api = {
        VERSION: VERSION,
        SAVE_KEY: SAVE_KEY,
        DT: DT,
        HEROES: HEROES,
        WEAPONS: WEAPONS,
        FOES: FOES,
        newRun: newRun,
        tick: tick,
        score: score,
        startRun: startRun,
        boot: boot
    };

    try { window.GraveGain2dB = api; } catch (_) {}
    /* Legacy shell alias: the previous menu/hub/mission shell exposed a
     * GraveGain2dBSim starter. Keep a read-only starter alias only. */
    try {
        if (!window.GraveGain2dBSim) window.GraveGain2dBSim = { start: function () { try { startRun('lisa'); } catch (_) {} } };
    } catch (_) {}
    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain2dB', version: VERSION, init: boot });
    } catch (_) {}

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    } catch (_) {}
})();
