/* GraveGain4D time-travel + alternate-worlds engine (agent g4d2-03).
 *
 * Vanilla JS IIFE, idempotent via window.GraveGain4DTime. Never throws:
 * every hook is try/catch guarded. No DOM listeners. No DOM overlays are
 * created by this module (so there is nothing to block input).
 *
 * Canon: same lore as GraveGain2D/3D (LZ crash site -> elven groves ->
 * dwarven vaults). Time-travel is a stroll along +W: the playable 3D world
 * is a hyperplane slice of the 4D world, and Fold Cartographer Vex reads
 * the W-slice folds (see content/gravegain4d-modes.ts: fold/rewind/echo
 * flavor -- "your ghost echo shows where this fold goes", "one rewind
 * per descent", "wave nicely" at your echo).
 *
 * What this module owns (wave2, additive only):
 *   - timeline stack with state snapshots (push/snapshot per tick)
 *   - rewind-to-tick (history is preserved, never destroyed)
 *   - translucent ghost echoes replaying past shots (echo trail records)
 *   - 2-3 parallel-timeline branches (branch on major choices)
 *   - timelineId:worldId addressing (parse/format + resolve)
 *   - fold/merge events: W-slice shifts collapse branches back together
 *
 * Bridges (all optional, load order never matters):
 *   - window.GraveGain4DMath (gg4d-01): foldBlend/sliceT for W easing
 *   - window.GraveGain4DWorlds (gg4d-03): dreamWorld/putt4D/sliceView,
 *     timelines.createTimeline/fork/rewind as the deterministic substrate
 */
(function () {
    'use strict';
    try {
        if (typeof window === 'undefined') return;
        if (window.GraveGain4DTime) return;

        var VERSION = '1.0.0';
        var MOD_NAME = 'gravegain4d-time';

        /* World ids: canon-grounded alternates. Each id maps to a
         * deterministic dreamWorld seed + dungeon theme (mirrors
         * gravegain4d-worlds.js canonThemes / content/gravegain4d-modes.ts
         * G4D_HOLES dungeonTheme column). */
        var WORLDS = [
            { id: 'lz-crash', seed: 4201, theme: 'metallic_ship', location: 'Colony LZ Sector Alpha' },
            { id: 'elven-grove', seed: 4202, theme: 'elven_grove', location: 'Bioluminescent Forest Vaults' },
            { id: 'dwarven-vault', seed: 4203, theme: 'dwarven_vault', location: 'Central Highlands Deep Mines' },
            { id: 'orc-wastes', seed: 4204, theme: 'orc_wastes', location: 'LuckyStarShip hub' },
            { id: 'citadel-dark', seed: 4209, theme: 'citadel_darkness', location: 'MoonRock' }
        ];

        var MAX_TIMELINES = 3;
        var MAX_SNAPSHOTS = 240;
        var MAX_ECHOES = 64;

        /* Branches that count as "major choices" and fork a timeline. */
        var MAJOR_CHOICES = ['spare-seer', 'burn-anchor', 'hold-gate', 'take-fold', 'keep-echo'];

        var __tlCounter = 0;
        var __listeners = { branch: [], rewind: [], fold: [], merge: [], echo: [] };

        function num(v, dflt) {
            try {
                if (typeof v === 'number' && isFinite(v)) return v;
                var n = Number(v);
                if (isFinite(n)) return n;
            } catch (_) { /* ignore */ }
            return dflt;
        }

        function str(v, dflt) {
            try {
                if (typeof v === 'string' && v.length) return v;
                if (v != null) return String(v);
            } catch (_) { /* ignore */ }
            return dflt;
        }

        function clone(v) {
            try { return JSON.parse(JSON.stringify(v)); }
            catch (_) {
                try {
                    if (v && typeof v === 'object') {
                        var out = (v instanceof Array) ? [] : {};
                        for (var k in v) {
                            try { out[k] = v[k]; } catch (__) { /* ignore */ }
                        }
                        return out;
                    }
                    return v;
                } catch (__) { return null; }
            }
        }

        function mathBridge() {
            try {
                if (window.GraveGain4DMath && typeof window.GraveGain4DMath === 'object') return window.GraveGain4DMath;
            } catch (_) { /* ignore */ }
            return null;
        }

        function worldsBridge() {
            try {
                if (window.GraveGain4DWorlds && typeof window.GraveGain4DWorlds === 'object') return window.GraveGain4DWorlds;
            } catch (_) { /* ignore */ }
            return null;
        }

        function worldById(worldId) {
            try {
                var id = str(worldId, '');
                for (var i = 0; i < WORLDS.length; i++) {
                    if (WORLDS[i].id === id) return WORLDS[i];
                }
            } catch (_) { /* ignore */ }
            return null;
        }

        function emit(kind, evt) {
            try {
                var list = __listeners[kind] || [];
                for (var i = 0; i < list.length; i++) {
                    try { list[i](clone(evt)); } catch (_) { /* one bad listener never breaks time */ }
                }
            } catch (_) { /* ignore */ }
        }

        /* ================ timeline stack ================
         * A timeline is { id, tick, worldId, snapshots[], echoes[],
         * branches[], parent }. The engine holds up to 3 live timelines;
         * timeline 0 is always the prime descent. Snapshots are plain
         * state clones { tick, pos, vel, w, worldId, label }; rewinding
         * restores a clone but keeps the stack (5D-Chess rule: the future
         * is preserved as branch history, same as worlds.js rewind). */
        var __timelines = [];

        function createTimeline(worldId, opts) {
            try {
                if (__timelines.length >= MAX_TIMELINES) return null;
                var w = worldById(worldId) || WORLDS[0];
                __tlCounter += 1;
                var tl = {
                    id: 't' + __tlCounter + '-' + w.id,
                    tick: 0,
                    worldId: w.id,
                    snapshots: [],
                    echoes: [],
                    branches: [{ id: 0, originTick: 0, originTimeline: null, choice: 'genesis' }],
                    activeBranch: 0,
                    parent: (opts && opts.parent) ? str(opts.parent, null) : null,
                    choice: (opts && opts.choice) ? str(opts.choice, 'genesis') : 'genesis'
                };
                // Deterministic substrate: mirror into worlds.js timelines when present.
                try {
                    var wb = worldsBridge();
                    if (wb && wb.timelines && typeof wb.timelines.createTimeline === 'function') {
                        tl.substrate = wb.timelines.createTimeline(w.seed);
                    }
                } catch (_) { /* substrate is best-effort */ }
                __timelines.push(tl);
                snapshot(tl.id, { pos: { x: 0, z: 0, w: 0 }, label: 'genesis' });
                return tl;
            } catch (_) { return null; }
        }

        function getTimeline(timelineId) {
            try {
                for (var i = 0; i < __timelines.length; i++) {
                    if (__timelines[i].id === timelineId) return __timelines[i];
                }
            } catch (_) { /* ignore */ }
            return null;
        }

        function listTimelines() {
            try { return clone(__timelines); } catch (_) { return []; }
        }

        function reset() {
            try { __timelines = []; __tlCounter = 0; return true; }
            catch (_) { return false; }
        }

        function snapshot(timelineId, state) {
            try {
                var tl = (timelineId && typeof timelineId === 'object') ? timelineId : getTimeline(timelineId);
                if (!tl) return null;
                var st = clone(state || {});
                if (!st || typeof st !== 'object') st = {};
                var tick = (typeof st.tick === 'number' && isFinite(st.tick)) ? Math.floor(st.tick) : num(tl.tick, 0);
                var snap = {
                    tick: tick,
                    pos: clone(st.pos || { x: 0, z: 0, w: 0 }),
                    vel: clone(st.vel || { x: 0, z: 0, w: 0 }),
                    w: num(st.w != null ? st.w : (st.pos && st.pos.w), 0),
                    worldId: str(st.worldId || tl.worldId, tl.worldId),
                    label: str(st.label, '')
                };
                tl.snapshots.push(snap);
                if (tl.snapshots.length > MAX_SNAPSHOTS) tl.snapshots.splice(0, tl.snapshots.length - MAX_SNAPSHOTS);
                if (tick > num(tl.tick, 0)) tl.tick = tick;
                return clone(snap);
            } catch (_) { return null; }
        }

        /* ================ rewind-to-tick ================
         * Restores the nearest snapshot at-or-before tick onto a live
         * state object (returned as a clone; caller writes back). The
         * stack is never truncated: a 'rewind' marker is recorded so
         * ghost echoes can still replay the undone future. */
        function rewindToTick(timelineId, tick) {
            try {
                var tl = getTimeline(timelineId);
                if (!tl) return null;
                var target = Math.floor(num(tick, 0));
                if (!(target >= 0)) target = 0;
                var best = null;
                for (var i = 0; i < tl.snapshots.length; i++) {
                    var s = tl.snapshots[i];
                    if (num(s.tick, 0) <= target && (!best || num(s.tick, 0) >= num(best.tick, 0))) best = s;
                }
                if (!best && tl.snapshots.length) best = tl.snapshots[0];
                if (!best) return null;
                var from = num(tl.tick, 0);
                tl.tick = num(best.tick, 0);
                try {
                    tl.snapshots.push({ tick: from, kind: 'rewind', from: from, to: tl.tick, pos: clone(best.pos), vel: { x: 0, z: 0, w: 0 }, w: num(best.w, 0), worldId: tl.worldId, label: 'rewind' });
                    if (tl.snapshots.length > MAX_SNAPSHOTS) tl.snapshots.splice(0, tl.snapshots.length - MAX_SNAPSHOTS);
                } catch (_) { /* marker is best-effort */ }
                try {
                    var wb = worldsBridge();
                    if (tl.substrate && wb && wb.timelines && typeof wb.timelines.rewind === 'function') {
                        wb.timelines.rewind(tl.substrate, from - tl.tick);
                    }
                } catch (_) { /* ignore */ }
                emit('rewind', { timelineId: tl.id, from: from, to: tl.tick, address: address(tl.id, tl.worldId) });
                return clone(best);
            } catch (_) { return null; }
        }

        /* ================ ghost echoes ================
         * recordShot stores a past putt { tick, from, to, impulse } on the
         * timeline; echoTrail replays them as translucent ghosts: each echo
         * carries opacity fading with age (newest ~0.55, oldest -> 0.08),
         * so the renderer draws them as see-through past selves. Vex
         * flavor: "echoes are just you from a breath ago -- wave nicely". */
        function recordShot(timelineId, shot) {
            try {
                var tl = getTimeline(timelineId);
                if (!tl) return null;
                var s = clone(shot || {});
                if (!s || typeof s !== 'object') s = {};
                var echo = {
                    tick: Math.floor(num(s.tick != null ? s.tick : tl.tick, 0)),
                    from: clone(s.from || { x: 0, z: 0, w: 0 }),
                    to: clone(s.to || s.from || { x: 0, z: 0, w: 0 }),
                    impulse: clone(s.impulse || { x: 0, z: 0, w: 0 }),
                    worldId: str(s.worldId || tl.worldId, tl.worldId),
                    label: str(s.label, 'putt')
                };
                tl.echoes.push(echo);
                if (tl.echoes.length > MAX_ECHOES) tl.echoes.splice(0, tl.echoes.length - MAX_ECHOES);
                emit('echo', { timelineId: tl.id, echo: clone(echo) });
                return clone(echo);
            } catch (_) { return null; }
        }

        function echoTrail(timelineId, uptoTick) {
            try {
                var tl = getTimeline(timelineId);
                if (!tl) return [];
                var upto = (uptoTick == null) ? num(tl.tick, 0) : Math.floor(num(uptoTick, 0));
                var past = [];
                for (var i = 0; i < tl.echoes.length; i++) {
                    if (num(tl.echoes[i].tick, 0) <= upto) past.push(tl.echoes[i]);
                }
                var out = [];
                for (var j = 0; j < past.length; j++) {
                    var age = (past.length - 1) - j; /* 0 = newest */
                    var opacity = 0.55 * Math.pow(0.86, age);
                    if (opacity < 0.08) opacity = 0.08;
                    var ghost = clone(past[j]);
                    ghost.opacity = Math.round(opacity * 100) / 100;
                    ghost.translucent = true;
                    out.push(ghost);
                }
                return out;
            } catch (_) { return []; }
        }

        /* ================ parallel branches ================
         * branchOn forks a new parallel timeline on a major choice
         * (spare-seer / burn-anchor / hold-gate / take-fold / keep-echo).
         * Minor choices stay on the current branch. Cap: 3 live timelines;
         * further forks return null instead of silently dropping history. */
        function isMajorChoice(choice) {
            try {
                var c = str(choice, '');
                for (var i = 0; i < MAJOR_CHOICES.length; i++) {
                    if (MAJOR_CHOICES[i] === c) return true;
                }
                return false;
            } catch (_) { return false; }
        }

        function branchOn(timelineId, choice, worldId) {
            try {
                var tl = getTimeline(timelineId);
                if (!tl) return null;
                var c = str(choice, '');
                if (!isMajorChoice(c)) return null;
                if (__timelines.length >= MAX_TIMELINES) return null;
                var w = worldById(worldId) || worldById(tl.worldId) || WORLDS[0];
                var kid = createTimeline(w.id, { parent: tl.id, choice: c });
                if (!kid) return null;
                // Seed the child with the parent's present so the fork
                // replays the same past, then diverges on the choice.
                try {
                    kid.snapshots = clone(tl.snapshots) || [];
                    kid.echoes = clone(tl.echoes) || [];
                    kid.tick = num(tl.tick, 0);
                    kid.branches = clone(tl.branches) || kid.branches;
                    kid.branches.push({ id: kid.branches.length, originTick: num(tl.tick, 0), originTimeline: tl.id, choice: c });
                    kid.activeBranch = kid.branches.length - 1;
                    try {
                        var wb = worldsBridge();
                        if (tl.substrate && kid.substrate && wb && wb.timelines && typeof wb.timelines.fork === 'function') {
                            wb.timelines.fork(tl.substrate);
                        }
                    } catch (_) { /* ignore */ }
                } catch (_) { /* seeding is best-effort */ }
                emit('branch', { from: tl.id, to: kid.id, choice: c, address: address(kid.id, kid.worldId) });
                return clone(kid);
            } catch (_) { return null; }
        }

        /* ================ timelineId:worldId addressing ================
         * Canonical address form is "timelineId:worldId" (e.g.
         * "t2-elven-grove:elven-grove"). parseAddress splits on the LAST
         * colon so timeline ids may themselves contain colons. */
        function address(timelineId, worldId) {
            try { return str(timelineId, 't0') + ':' + str(worldId, 'lz-crash'); }
            catch (_) { return 't0:lz-crash'; }
        }

        function parseAddress(addr) {
            try {
                var a = str(addr, '');
                var idx = a.lastIndexOf(':');
                if (idx < 0) return { timelineId: a, worldId: '' };
                return { timelineId: a.slice(0, idx), worldId: a.slice(idx + 1) };
            } catch (_) { return { timelineId: '', worldId: '' }; }
        }

        function resolve(addr) {
            try {
                var p = parseAddress(addr);
                var tl = getTimeline(p.timelineId);
                if (!tl) return null;
                var w = worldById(p.worldId) || worldById(tl.worldId) || null;
                var dream = null;
                try {
                    var wb = worldsBridge();
                    if (wb && typeof wb.dreamWorld === 'function' && w) dream = wb.dreamWorld(w.seed);
                } catch (_) { dream = null; }
                return { timeline: clone(tl), world: w ? clone(w) : null, dream: dream };
            } catch (_) { return null; }
        }

        /* ================ fold / merge events ================
         * onWSliceShift(wBefore, wAfter): when the 4D slice slides far
         * enough along W (delta >= 1 slice), the fold collapses the
         * youngest branch timelines back into the prime timeline --
         * parallel selves braid into one canopy (Mother Tree flavor).
         * Emits 'fold' always, plus one 'merge' per collapsed timeline.
         * Surviving echoes are kept on the prime line so ghosts persist
         * after the merge. Easing uses GraveGain4DMath.foldBlend when
         * present, plain smootherstep otherwise. */
        function foldBlendW(wBefore, wAfter, t) {
            try {
                var m = mathBridge();
                var a = { x: 0, y: 0, z: 0, w: num(wBefore, 0) };
                var b = { x: 0, y: 0, z: 0, w: num(wAfter, 0) };
                if (m && typeof m.foldBlend === 'function') {
                    var v = m.foldBlend(a, b, t);
                    return num(v && v.w, num(wAfter, 0));
                }
                var tt = num(t, 0);
                if (tt < 0) tt = 0;
                if (tt > 1) tt = 1;
                var e = tt * tt * tt * (tt * (tt * 6 - 15) + 10);
                return num(a.w, 0) + (num(b.w, 0) - num(a.w, 0)) * e;
            } catch (_) { return num(wAfter, 0); }
        }

        function onWSliceShift(wBefore, wAfter) {
            try {
                var before = num(wBefore, 0);
                var after = num(wAfter, 0);
                var delta = Math.abs(after - before);
                var eased = foldBlendW(before, after, 1);
                var evt = { wBefore: before, wAfter: after, wEased: eased, delta: delta, merged: [] };
                if (delta >= 1 && __timelines.length > 1) {
                    var prime = __timelines[0];
                    var dropped = __timelines.slice(1);
                    for (var i = 0; i < dropped.length; i++) {
                        try {
                            var d = dropped[i];
                            // Braid echoes + newest snapshots into prime.
                            prime.echoes = (prime.echoes || []).concat(clone(d.echoes) || []);
                            if (prime.echoes.length > MAX_ECHOES) prime.echoes.splice(0, prime.echoes.length - MAX_ECHOES);
                            prime.snapshots = (prime.snapshots || []).concat(clone(d.snapshots) || []);
                            prime.snapshots.sort(function (p, q) { return num(p.tick, 0) - num(q.tick, 0); });
                            if (prime.snapshots.length > MAX_SNAPSHOTS) prime.snapshots.splice(0, prime.snapshots.length - MAX_SNAPSHOTS);
                            evt.merged.push({ timelineId: d.id, into: prime.id, choice: d.choice });
                            emit('merge', { from: d.id, into: prime.id, choice: d.choice, w: after });
                        } catch (_) { /* one bad branch never blocks the fold */ }
                    }
                    __timelines = [prime];
                }
                emit('fold', clone(evt));
                return clone(evt);
            } catch (_) { return { wBefore: 0, wAfter: 0, wEased: 0, delta: 0, merged: [] }; }
        }

        function on(kind, fn) {
            try {
                if (!__listeners[kind]) return false;
                if (typeof fn !== 'function') return false;
                __listeners[kind].push(fn);
                return true;
            } catch (_) { return false; }
        }

        function worldIds() {
            try {
                var out = [];
                for (var i = 0; i < WORLDS.length; i++) out.push(WORLDS[i].id);
                return out;
            } catch (_) { return []; }
        }

        var api = null;
        try {
            api = {
                VERSION: VERSION,
                WORLDS: clone(WORLDS),
                MAJOR_CHOICES: clone(MAJOR_CHOICES),
                MAX_TIMELINES: MAX_TIMELINES,
                createTimeline: createTimeline,
                getTimeline: function (id) { try { return clone(getTimeline(id)); } catch (_) { return null; } },
                listTimelines: listTimelines,
                reset: reset,
                snapshot: snapshot,
                rewindToTick: rewindToTick,
                recordShot: recordShot,
                echoTrail: echoTrail,
                branchOn: branchOn,
                isMajorChoice: isMajorChoice,
                address: address,
                parseAddress: parseAddress,
                resolve: resolve,
                onWSliceShift: onWSliceShift,
                foldBlendW: foldBlendW,
                worldIds: worldIds,
                on: on
            };
        } catch (e) { api = { VERSION: '1.0.0' }; }

        try { window.GraveGain4DTime = api; } catch (e) { /* ignore */ }

        try {
            if (!window.GraveGainMods) window.GraveGainMods = [];
            window.GraveGainMods.push({ name: MOD_NAME, version: VERSION, init: function () { return api; } });
        } catch (e) { /* ignore */ }
    } catch (e) { /* never throw: time engine stays silent */ }
})();
