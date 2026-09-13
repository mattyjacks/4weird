/* GraveGain4D golf core (agent g4d2-01, envelope DS-G4D2-01).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DGolf. Never throws:
 * every public hook is try/catch guarded. No DOM listeners, no overlays,
 * no geometry construction (this file defines NO BoxGeometry anywhere;
 * 3D models are reused by reference only, lazily, via attachModels()).
 *
 * 4D-golf inspiration (CodeParade 4D Golf): the ball lives at x,y,z,w and
 * the playable 3D world is a hyperplane slice of that 4D world. Aim is
 * yaw/pitch on the slice plus a W-angle (ana/kata): the W-angle splits
 * putt energy between the visible fairway and the fourth direction, so a
 * putt can leave the slice and re-enter it nearer the cup.
 *
 * Same GraveGain lore as GraveGain2D/3D (LZ crash site -> elven groves ->
 * dwarven vaults -> Hades' Array). Hole/par table mirrors the G4D_HOLES
 * legacy hole-table aliases in content/gravegain4d-modes.ts 1:1 (10 holes,
 * shared-mission mapping, par = 4D-golf stroke budget). Canon caddies:
 * President Angel Good, Echo of Elder Mirathiel, Warchief Groknak, and
 * Hades himself on the final hole.
 *
 * Integrator: load AFTER gravegain4d-math.js (math core is optional but
 * preferred; local fallbacks apply when it is absent). This module owns
 * state + physics only; rendering stays with the graphics lane.
 */
(function () {
    'use strict';
    try {
        if (window.GraveGain4DGolf) return;

        var VERSION = '1.0.0';

        /* ================ tiny guards ================ */
        function num(n, fallback) {
            try {
                if (typeof n === 'number' && isFinite(n)) return n;
                var v = parseFloat(n);
                return (isFinite(v)) ? v : fallback;
            } catch (e) { return fallback; }
        }

        function clamp(n, lo, hi) {
            try {
                n = num(n, lo); lo = num(lo, 0); hi = num(hi, 1);
                if (n < lo) return lo;
                if (n > hi) return hi;
                return n;
            } catch (e) { return 0; }
        }

        function v4(x, y, z, w) {
            try {
                return { x: num(x, 0), y: num(y, 0), z: num(z, 0), w: num(w, 0) };
            } catch (e) { return { x: 0, y: 0, z: 0, w: 0 }; }
        }

        function v4copy(a) {
            try {
                a = a || {};
                return v4(a.x, a.y, a.z, a.w);
            } catch (e) { return v4(0, 0, 0, 0); }
        }

        function v4dist(a, b) {
            try {
                a = a || {}; b = b || {};
                var dx = num(a.x, 0) - num(b.x, 0);
                var dy = num(a.y, 0) - num(b.y, 0);
                var dz = num(a.z, 0) - num(b.z, 0);
                var dw = num(a.w, 0) - num(b.w, 0);
                return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
            } catch (e) { return 0; }
        }

        function v4speed(a) {
            try {
                a = a || {};
                return Math.sqrt(
                    num(a.x, 0) * num(a.x, 0) + num(a.y, 0) * num(a.y, 0) +
                    num(a.z, 0) * num(a.z, 0) + num(a.w, 0) * num(a.w, 0));
            } catch (e) { return 0; }
        }

        function math4() {
            try { return window.GraveGain4DMath || null; }
            catch (e) { return null; }
        }

        /* ================ canon hole table ================
         * Mirrors G4D_HOLES in content/gravegain4d-modes.ts (hole, missionId,
         * title, dungeonTheme, par). Par is the stroke budget per hole: the
         * front nine is gentle, the back nine is grim.
         */
        var HOLES = [
            { hole: 1, missionId: 1, title: 'Mission 1: LZ Crash Site Defense', dungeonTheme: 'metallic_ship', par: 3, caddie: 'President Angel Good' },
            { hole: 2, missionId: 2, title: 'Mission 2: Cleansing the Elven Groves', dungeonTheme: 'elven_grove', par: 4, caddie: 'Echo of Elder Mirathiel' },
            { hole: 3, missionId: 3, title: 'Mission 3: Deep In The Dwarven Vaults', dungeonTheme: 'dwarven_vault', par: 4, caddie: 'Ember Cartographer Sable' },
            { hole: 4, missionId: 4, title: 'Mission 4: Orc Nomad Outpost Siege', dungeonTheme: 'orc_wastes', par: 5, caddie: 'Warchief Groknak' },
            { hole: 5, missionId: 5, title: 'Mission 5: Signal in the Shallows', dungeonTheme: 'metallic_ship', par: 4, caddie: 'President Angel Good' },
            { hole: 6, missionId: 6, title: 'Mission 6: The Alchemical Catacombs', dungeonTheme: 'toxic_catacombs', par: 3, caddie: 'Ossuary Twins, Pell & Marrow' },
            { hole: 7, missionId: 7, title: 'Mission 7: The Tomb of Clint Oldman', dungeonTheme: 'stone_crypt', par: 4, caddie: 'Echo of Elder Mirathiel' },
            { hole: 8, missionId: 8, title: 'Mission 8: Orbital Strike Calibration', dungeonTheme: 'dwarven_vault', par: 5, caddie: 'Fold Cartographer Vex' },
            { hole: 9, missionId: 9, title: 'Mission 9: Gate of the NecroGenesis', dungeonTheme: 'citadel_darkness', par: 5, caddie: 'Warchief Groknak' },
            { hole: 10, missionId: 10, title: "Mission 10: Lucifer's Shadow", dungeonTheme: 'citadel_darkness', par: 5, caddie: 'Hades' }
        ];

        function getHole(hole) {
            try {
                hole = Math.floor(num(hole, 1));
                for (var i = 0; i < HOLES.length; i++) {
                    if (HOLES[i].hole === hole) return HOLES[i];
                }
                return null;
            } catch (e) { return null; }
        }

        /* ================ stroke state machine ================
         * aim -> power -> putt -> roll -> aim ... -> hole-out.
         * aim: player adjusts yaw/pitch/W-angle. power: meter runs 0..1.
         * putt: launch impulse applied (one tick). roll: physics integrate.
         * hole-out: cup captured; terminal until nextHole().
         */
        var STATES = {
            AIM: 'aim',
            POWER: 'power',
            PUTT: 'putt',
            ROLL: 'roll',
            HOLE_OUT: 'hole-out'
        };

        function isState(s) {
            try {
                return s === 'aim' || s === 'power' || s === 'putt' ||
                    s === 'roll' || s === 'hole-out';
            } catch (e) { return false; }
        }

        /* ================ tuning ================ */
        var TUNE = {
            minSpeed: 2.0,      /* tap-in off the toe */
            maxSpeed: 26.0,     /* full-blooded drive down the fold */
            rollFriction: 1.35, /* exponential damping per second on the green */
            flyDrag: 0.12,      /* thin MoonRock air while lofted */
            gravity: 9.8,       /* pulls lofted balls back to the slice */
            bounce: 0.35,       /* ground restitution for hopped putts */
            stopEps: 0.08,      /* below this the ball is at rest */
            captureSpeed: 3.2,  /* faster than this lips out over the cup */
            cupRadius: 0.45,    /* 4D capture radius around the cup */
            wallBounce: 0.45,   /* fold-wall restitution at the course edge */
            baseHalf: 26.0,     /* course half-size, grows slightly per hole */
            teeGap: 12.0        /* tee-to-cup distance along +X */
        };

        function holeHalf(holeNum) {
            try { return TUNE.baseHalf + num(holeNum, 1) * 0.8; }
            catch (e) { return TUNE.baseHalf; }
        }

        function teeFor(holeNum) {
            try {
                var h = holeHalf(holeNum);
                return v4(-h + 3, 0, 0, 0);
            } catch (e) { return v4(0, 0, 0, 0); }
        }

        function cupFor(holeNum) {
            try {
                var h = holeHalf(holeNum);
                /* The cup drifts ana/kata down the card: later holes hide
                 * the cup off-slice so the W-angle matters. Hades (hole 10)
                 * buries it deepest in +W. */
                var wHide = (num(holeNum, 1) - 1) * 0.55;
                return v4(h - 3, 0, (holeNum % 2) ? 2.5 : -2.5, wHide);
            } catch (e) { return v4(0, 0, 0, 0); }
        }

        /* ================ round ================ */
        function newRound(opts) {
            try {
                opts = opts || {};
                var startHole = Math.floor(num(opts.startHole, 1));
                if (startHole < 1) startHole = 1;
                if (startHole > HOLES.length) startHole = HOLES.length;
                var round = {
                    hole: startHole,
                    state: STATES.AIM,
                    strokes: 0,
                    ball: { pos: teeFor(startHole), vel: v4(0, 0, 0, 0) },
                    tee: teeFor(startHole),
                    cup: cupFor(startHole),
                    aim: { yaw: 0, pitch: 0, wAngle: 0 },
                    power: 0,
                    powerDir: 1,
                    scorecard: [],
                    events: [],
                    listeners: [],
                    recording: false,
                    echo: [],
                    tick: 0,
                    time: 0
                };
                return round;
            } catch (e) {
                return {
                    hole: 1, state: 'aim', strokes: 0,
                    ball: { pos: v4(0, 0, 0, 0), vel: v4(0, 0, 0, 0) },
                    tee: v4(0, 0, 0, 0), cup: v4(0, 0, 0, 0),
                    aim: { yaw: 0, pitch: 0, wAngle: 0 }, power: 0,
                    powerDir: 1, scorecard: [], events: [], listeners: [],
                    recording: false, echo: [], tick: 0, time: 0
                };
            }
        }

        function setState(round, next) {
            try {
                if (!round || !isState(next)) return false;
                var prev = round.state;
                round.state = next;
                if (prev !== next) emit(round, { type: 'state', from: prev, to: next, hole: round.hole, tick: round.tick });
                return true;
            } catch (e) { return false; }
        }

        /* Aim: yaw around the green (radians), pitch for loft (radians,
         * small), wAngle for the ana/kata split (radians). Positive wAngle
         * leans ana (+W), negative leans kata (-W). */
        function setAim(round, aim) {
            try {
                if (!round) return false;
                aim = aim || {};
                if (round.state !== STATES.AIM && round.state !== STATES.POWER) return false;
                round.aim = {
                    yaw: num(aim.yaw, round.aim ? round.aim.yaw : 0),
                    pitch: clamp(num(aim.pitch, 0), -0.45, 0.45),
                    wAngle: clamp(num(aim.wAngle, 0), -1.2, 1.2)
                };
                return true;
            } catch (e) { return false; }
        }

        function aimDirection(round) {
            try {
                var yaw = num(round && round.aim && round.aim.yaw, 0);
                var pitch = num(round && round.aim && round.aim.pitch, 0);
                var wA = num(round && round.aim && round.aim.wAngle, 0);
                var cp = Math.cos(pitch), sp = Math.sin(pitch);
                var cw = Math.cos(wA), sw = Math.sin(wA);
                /* xyz carry cos(wAngle), w carries sin(wAngle): full ana puts
                 * the whole putt through the fold, full kata the reverse. */
                var d = v4(Math.cos(yaw) * cp * cw, sp * cw, Math.sin(yaw) * cp * cw, sw);
                var m = math4();
                if (m && m.vec4norm) {
                    try { return m.vec4norm(d); } catch (e) { /* fall through */ }
                }
                var len = v4speed(d);
                if (len > 1e-9) {
                    d.x /= len; d.y /= len; d.z /= len; d.w /= len;
                }
                return d;
            } catch (e) { return v4(1, 0, 0, 0); }
        }

        function setPower(round, p) {
            try {
                if (!round) return false;
                if (round.state !== STATES.AIM && round.state !== STATES.POWER) return false;
                round.power = clamp(p, 0, 1);
                if (round.state === STATES.AIM) setState(round, STATES.POWER);
                return true;
            } catch (e) { return false; }
        }

        /* Oscillates the power meter 0..1..0 for UI drivers that tick it. */
        function tickPower(round, dt) {
            try {
                if (!round || round.state !== STATES.POWER) return num(round && round.power, 0);
                var rate = 1.4 * num(dt, 0.016);
                var p = num(round.power, 0) + rate * num(round.powerDir, 1);
                if (p >= 1) { p = 1; round.powerDir = -1; }
                if (p <= 0) { p = 0; round.powerDir = 1; }
                round.power = p;
                return p;
            } catch (e) { return 0; }
        }

        /* Strike the ball: aim -> power -> putt. Counts the stroke. */
        function putt(round) {
            try {
                if (!round) return false;
                if (round.state !== STATES.AIM && round.state !== STATES.POWER) return false;
                var speed = TUNE.minSpeed + clamp(round.power, 0, 1) * (TUNE.maxSpeed - TUNE.minSpeed);
                var dir = aimDirection(round);
                round.ball.vel = v4(dir.x * speed, dir.y * speed, dir.z * speed, dir.w * speed);
                round.strokes += 1;
                setState(round, STATES.PUTT);
                emit(round, {
                    type: 'stroke', hole: round.hole, stroke: round.strokes,
                    power: num(round.power, 0), speed: speed, tick: round.tick
                });
                setState(round, STATES.ROLL);
                return true;
            } catch (e) { return false; }
        }

        function emit(round, ev) {
            try {
                if (!round || !ev) return;
                ev = ev || {};
                if (typeof ev.tick !== 'number') ev.tick = num(round.tick, 0);
                round.events.push(ev);
                if (round.events.length > 256) round.events.splice(0, round.events.length - 256);
                var ls = (round.listeners && round.listeners.length) ? round.listeners.slice() : [];
                for (var i = 0; i < ls.length; i++) {
                    try { ls[i](ev); } catch (e) { /* listener faults never break physics */ }
                }
            } catch (e) { /* never throw */ }
        }

        function onEvent(round, fn) {
            try {
                if (!round || typeof fn !== 'function') return false;
                round.listeners.push(fn);
                return true;
            } catch (e) { return false; }
        }

        function drainEvents(round) {
            try {
                if (!round || !round.events) return [];
                var out = round.events.slice();
                round.events.length = 0;
                return out;
            } catch (e) { return []; }
        }

        /* ================ per-tick ghost-echo recording ================
         * The time module replays these: every physics tick records the 4D
         * ball position so a "ghost echo" (you, one breath ago) can putt
         * beside you. Hooks are plain callbacks, safe to leave unset.
         */
        function startRecording(round) {
            try {
                if (!round) return false;
                round.recording = true;
                round.echo = [];
                return true;
            } catch (e) { return false; }
        }

        function stopRecording(round) {
            try {
                if (!round) return [];
                round.recording = false;
                return getEcho(round);
            } catch (e) { return []; }
        }

        function recordTick(round) {
            try {
                if (!round || !round.recording) return;
                var sample = { tick: num(round.tick, 0), t: num(round.time, 0), pos: v4copy(round.ball.pos) };
                round.echo.push(sample);
                if (round.echo.length > 4096) round.echo.splice(0, round.echo.length - 4096);
                if (round.onRecordTick) {
                    try { round.onRecordTick(sample); } catch (e) { /* ignore */ }
                }
            } catch (e) { /* never throw */ }
        }

        /* Per-tick position hook for the ghost-echo consumer. */
        function onRecordTick(round, fn) {
            try {
                if (!round) return false;
                if (fn && typeof fn !== 'function') return false;
                round.onRecordTick = fn || null;
                return true;
            } catch (e) { return false; }
        }

        function getEcho(round) {
            try {
                if (!round || !round.echo) return [];
                var out = [];
                for (var i = 0; i < round.echo.length; i++) {
                    out.push({ tick: round.echo[i].tick, t: round.echo[i].t, pos: v4copy(round.echo[i].pos) });
                }
                return out;
            } catch (e) { return []; }
        }

        function clearEcho(round) {
            try {
                if (!round) return false;
                round.echo = [];
                return true;
            } catch (e) { return false; }
        }

        /* ================ 4D ball physics ================ */
        function step(round, dt) {
            try {
                if (!round) return false;
                dt = num(dt, 0.016);
                if (!(dt > 0)) dt = 0.016;
                if (dt > 0.05) dt = 0.05; /* clamp spiral-of-death steps */
                if (round.state !== STATES.ROLL && round.state !== STATES.PUTT) return true;

                var pos = round.ball.pos, vel = round.ball.vel;
                var airborne = num(pos.y, 0) > 0 || num(vel.y, 0) > 0;

                if (airborne) {
                    vel.y -= TUNE.gravity * dt;
                    var drag = Math.exp(-TUNE.flyDrag * dt);
                    vel.x *= drag; vel.y *= drag; vel.z *= drag; vel.w *= drag;
                } else {
                    var grip = Math.exp(-TUNE.rollFriction * dt);
                    vel.x *= grip; vel.z *= grip; vel.w *= grip;
                    vel.y = 0;
                }

                pos.x += vel.x * dt; pos.y += vel.y * dt;
                pos.z += vel.z * dt; pos.w += vel.w * dt;

                /* Ground: the slice floor. Hopped putts bounce, then grip. */
                if (num(pos.y, 0) <= 0) {
                    pos.y = 0;
                    if (num(vel.y, 0) < -0.6) {
                        vel.y = -vel.y * TUNE.bounce;
                    } else {
                        vel.y = 0;
                    }
                }

                /* Fold walls: the course edge folds the ball back in. */
                var half = holeHalf(round.hole);
                if (Math.abs(num(pos.x, 0)) > half) {
                    pos.x = (pos.x > 0 ? half : -half);
                    vel.x = -vel.x * TUNE.wallBounce;
                }
                if (Math.abs(num(pos.z, 0)) > half) {
                    pos.z = (pos.z > 0 ? half : -half);
                    vel.z = -vel.z * TUNE.wallBounce;
                }
                if (Math.abs(num(pos.w, 0)) > half) {
                    pos.w = (pos.w > 0 ? half : -half);
                    vel.w = -vel.w * TUNE.wallBounce;
                }

                round.tick += 1;
                round.time += dt;
                recordTick(round);

                /* Cup capture: 4D distance + gentle speed + on the slice. */
                var d = v4dist(pos, round.cup);
                var sp = v4speed(vel);
                if (d <= TUNE.cupRadius && sp <= TUNE.captureSpeed && Math.abs(num(pos.y, 0)) <= 0.35) {
                    return holeOut(round);
                }

                /* Rest: back to aim for the next stroke of the saga. */
                if (sp <= TUNE.stopEps && num(pos.y, 0) <= 0.001) {
                    round.ball.vel = v4(0, 0, 0, 0);
                    round.power = 0;
                    round.powerDir = 1;
                    setState(round, STATES.AIM);
                    emit(round, { type: 'rest', hole: round.hole, strokes: round.strokes, pos: v4copy(pos), tick: round.tick });
                }
                return true;
            } catch (e) { return false; }
        }

        function holeOut(round) {
            try {
                if (!round) return false;
                round.ball.pos = v4copy(round.cup);
                round.ball.vel = v4(0, 0, 0, 0);
                round.power = 0;
                round.powerDir = 1;
                setState(round, STATES.HOLE_OUT);
                var def = getHole(round.hole);
                var par = def ? def.par : 4;
                var entry = {
                    hole: num(round.hole, 1),
                    missionId: def ? def.missionId : num(round.hole, 1),
                    title: def ? def.title : '',
                    par: par,
                    strokes: num(round.strokes, 0),
                    name: scoreName(num(round.strokes, 0), par)
                };
                round.scorecard.push(entry);
                emit(round, {
                    type: 'hole-complete', hole: entry.hole, missionId: entry.missionId,
                    title: entry.title, par: entry.par, strokes: entry.strokes,
                    name: entry.name, tick: round.tick
                });
                emit(round, { type: 'hole-out', hole: entry.hole, strokes: entry.strokes, tick: round.tick });
                return true;
            } catch (e) { return false; }
        }

        /* Advance after hole-out: resets ball/aim/strokes for the next hole.
         * Returns false past hole 10 (the card is complete). */
        function nextHole(round) {
            try {
                if (!round) return false;
                if (round.state !== STATES.HOLE_OUT) return false;
                if (num(round.hole, 1) >= HOLES.length) return false;
                round.hole += 1;
                round.state = STATES.AIM;
                round.strokes = 0;
                round.tee = teeFor(round.hole);
                round.cup = cupFor(round.hole);
                round.ball = { pos: v4copy(round.tee), vel: v4(0, 0, 0, 0) };
                round.aim = { yaw: 0, pitch: 0, wAngle: 0 };
                round.power = 0;
                round.powerDir = 1;
                round.echo = [];
                emit(round, { type: 'hole-start', hole: round.hole, tick: round.tick });
                return true;
            } catch (e) { return false; }
        }

        function isRoundComplete(round) {
            try {
                if (!round) return false;
                return round.scorecard.length >= HOLES.length;
            } catch (e) { return false; }
        }

        /* ================ par + scorecard ================ */
        function scoreName(strokes, par) {
            try {
                var d = Math.floor(num(strokes, 0)) - Math.floor(num(par, 4));
                if (num(strokes, 0) <= 0) return 'no strokes';
                if (d <= -3) return 'albatross';
                if (d === -2) return 'eagle';
                if (d === -1) return 'birdie';
                if (d === 0) return 'par';
                if (d === 1) return 'bogey';
                if (d === 2) return 'double bogey';
                return '+' + d;
            } catch (e) { return 'par'; }
        }

        function getScorecard(round) {
            try {
                if (!round || !round.scorecard) return { holes: [], totalStrokes: 0, totalPar: 0, thru: 0 };
                var holes = [];
                var ts = 0, tp = 0;
                for (var i = 0; i < round.scorecard.length; i++) {
                    var e = round.scorecard[i];
                    holes.push({
                        hole: e.hole, missionId: e.missionId, title: e.title,
                        par: e.par, strokes: e.strokes, name: e.name
                    });
                    ts += num(e.strokes, 0); tp += num(e.par, 0);
                }
                return { holes: holes, totalStrokes: ts, totalPar: tp, thru: holes.length };
            } catch (e) { return { holes: [], totalStrokes: 0, totalPar: 0, thru: 0 }; }
        }

        function totalPar() {
            try {
                var t = 0;
                for (var i = 0; i < HOLES.length; i++) t += HOLES[i].par;
                return t;
            } catch (e) { return 0; }
        }

        /* ================ caddie barks (canon voices) ================ */
        var CADDIE_LINES = {
            'President Angel Good': [
                'Tend the green like a garden, sailor: soft hands, and the fold will carry it home.',
                'The LuckyStarShip runs on patience. So does this putt. Breathe, then stroke.'
            ],
            'Echo of Elder Mirathiel': [
                'The roots remember every line you ever putted. This one breaks ana at the end.',
                'Hush. Feel where the slice folds, and let your echo show you the cup.'
            ],
            'Warchief Groknak': [
                'HA! Hit it like you mean to break the Array! ...gently. Break it GENTLY.',
                'Groknak once drove a ball through three timelines. It still counted as one stroke!'
            ],
            'Ember Cartographer Sable': [
                'I inked this fold twice. Aim a hair kata-side of the marker stone.',
                'Mind the redraw: the cup drifts when you blink. Commit, then look.'
            ],
            'Ossuary Twins, Pell & Marrow': [
                'Pell counts the strokes, Marrow names them. Make this one a pretty name.',
                'The bones nap under this green. Putt soft, or join the walls.'
            ],
            'Fold Cartographer Vex': [
                'There: your ghost echo already holed it. Copy yourself from a breath ago.',
                'Spend your W-angle late, when the fold turns against you.'
            ],
            'Hades': [
                'So. The little gardener putts against the Array itself. I buried better players in deeper folds.',
                'Every timeline ends in my cup, mortal. Miss, and the echo keeps the ball.'
            ]
        };

        function getCaddieBark(hole, line) {
            try {
                var def = getHole(hole);
                var who = def ? def.caddie : 'Fold Cartographer Vex';
                var lines = CADDIE_LINES[who] || CADDIE_LINES['Fold Cartographer Vex'];
                var idx = ((Math.floor(num(line, 0)) % lines.length) + lines.length) % lines.length;
                return { speaker: who, text: lines[idx] };
            } catch (e) { return { speaker: 'Fold Cartographer Vex', text: 'Read the fold.' }; }
        }

        /* ================ slice view (render handoff) ================
         * Returns the ball/cup 3D slice positions for the graphics lane.
         * Prefers GraveGain4DMath.project4Dto3D when loaded; falls back to
         * a plain xyz drop so the game still renders without the math core.
         */
        function getSliceView(round, wDist) {
            try {
                if (!round) return { ball: { x: 0, y: 0, z: 0 }, cup: { x: 0, y: 0, z: 0 } };
                var m = math4();
                var d = num(wDist, 4);
                if (m && m.project4Dto3D) {
                    return {
                        ball: m.project4Dto3D(round.ball.pos, d),
                        cup: m.project4Dto3D(round.cup, d)
                    };
                }
                return {
                    ball: { x: num(round.ball.pos.x, 0), y: num(round.ball.pos.y, 0), z: num(round.ball.pos.z, 0) },
                    cup: { x: num(round.cup.x, 0), y: num(round.cup.y, 0), z: num(round.cup.z, 0) }
                };
            } catch (e) { return { ball: { x: 0, y: 0, z: 0 }, cup: { x: 0, y: 0, z: 0 } }; }
        }

        /* ================ 3D-model reuse (by reference only) ================
         * The graphics lane owns every mesh. This accessor only reads the
         * shared registries so a renderer can bind the ball marker; it
         * creates nothing and defines no geometry of any kind. */
        function attachModels() {
            try {
                var gfx = null, models = null;
                try { gfx = window.GraveGainGraphics3D || null; } catch (e) { gfx = null; }
                try { models = window.GraveGain3DModels || null; } catch (e) { models = null; }
                return { graphics3D: gfx, models3D: models };
            } catch (e) { return { graphics3D: null, models3D: null }; }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                STATES: STATES,
                HOLES: HOLES,
                TUNE: TUNE,
                getHole: getHole,
                totalPar: totalPar,
                newRound: newRound,
                setState: setState,
                setAim: setAim,
                aimDirection: aimDirection,
                setPower: setPower,
                tickPower: tickPower,
                putt: putt,
                step: step,
                holeOut: holeOut,
                nextHole: nextHole,
                isRoundComplete: isRoundComplete,
                scoreName: scoreName,
                getScorecard: getScorecard,
                onEvent: onEvent,
                drainEvents: drainEvents,
                startRecording: startRecording,
                stopRecording: stopRecording,
                onRecordTick: onRecordTick,
                getEcho: getEcho,
                clearEcho: clearEcho,
                getCaddieBark: getCaddieBark,
                getSliceView: getSliceView,
                attachModels: attachModels,
                teeFor: teeFor,
                cupFor: cupFor
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain4DGolf = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: 'gravegain4d-golf', version: VERSION });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: golf core stays silent */ }
})();
