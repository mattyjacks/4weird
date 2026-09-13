(function () {
    'use strict';
    if (window.GG4D_Modes) return;

    // GraveGain4D — modes4d: saga combat modes (Realtime / Chrono-Lock / Turn-Based).
    // Mirrors the other GraveGains' controlMode: 'realtime' | 'chrono' | 'turnbased'.
    //
    // Hook (DO NOT edit main4d.js — call from your own wiring):
    //   var M = window.GG4D_Modes;
    //   var gate = M.gate(rawDt, { moving: .., putting: .., charging: .. });
    //   main.putt.update(gate.playerDt, input);   // player-side sim
    //   entities/world update with gate.enemyDt  // enemy/ballistic sim (0 in TB player phase)
    // Or per-system: M.resolveWorldDt(rawDt, activity) for world dt,
    // M.allowEnemyMotion() to freeze enemies during the player turn.
    //
    // Conventions:
    // - rawDt is the clamped frame dt from GG4D_Main._frame (max 0.1s).
    // - timefold.js has no timeScale field; when a host timeScale exists
    //   (opts.timeScale or window.GG4D_Time.timeScale), it multiplies first.
    // - Turn-Based fixed sim step is 0.5s of sim per committed player action.
    // Never throws; idempotent (safe to include twice).

    var MODES = ['realtime', 'chrono', 'turnbased'];

    var LABELS = {
        realtime: 'Realtime',
        chrono: 'Chrono-Lock',
        turnbased: 'Turn-Based'
    };

    var DESCS = {
        realtime: 'World runs at full speed.',
        chrono: 'SUPERHOT-like: world crawls at 8% while you stand still.',
        turnbased: 'You act, then enemies + ballistics step a fixed 0.5s sim.'
    };

    var CRAWL = 0.08;      // chrono idle scale (standing still)
    var TURN_STEP = 0.5;   // turnbased fixed enemy/ballistic sim (seconds)
    var LS_KEY = 'gravegain4d:modes';

    var current = 'realtime';

    // Turn state — JSON-serializable. phase 'player': only the player acts
    // (no free enemy motion); phase 'enemy': fixed-step sim runs, then back.
    var turn = {
        phase: 'player',   // 'player' | 'enemy'
        turn: 0,           // completed full rounds
        queue: [],         // actor ids in initiative order, e.g. ['player','ghoul-1',...]
        cursor: 0,         // index into queue of whose action is up
        pendingAction: null
    };

    function isValidMode(m) { return MODES.indexOf(m) !== -1; }

    function num(v, dflt) {
        try {
            if (typeof v === 'number' && isFinite(v)) return v;
            var n = Number(v);
            if (isFinite(n)) return n;
        } catch (e) { /* ignore */ }
        return dflt;
    }

    function hostTimeScale() {
        // Optional external slow-mo (rewind recovery, abilities). Absent => 1.
        try {
            var t = window.GG4D_Time || window.GG4D_Timefold || null;
            if (t) {
                if (typeof t.timeScale === 'number' && isFinite(t.timeScale)) return Math.max(0, t.timeScale);
                if (typeof t.getTimeScale === 'function') {
                    var s = t.getTimeScale();
                    if (isFinite(s)) return Math.max(0, s);
                }
            }
        } catch (e) { /* ignore */ }
        return 1;
    }

    // Player activity probe. Accepts { moving, putting, charging } booleans,
    // or a raw input snapshot / putt instance — anything truthy counts.
    // moving: locomotion or aim keys held. putting: ball struck this frame.
    // charging: putt charge held (Putt4D.charging).
    function isActive(activity) {
        try {
            if (!activity || typeof activity !== 'object') return !!activity;
            if (activity.moving || activity.putting || activity.charging) return true;
            // Raw touch/keyboard snapshot shape: { buttons:{}, move:{x,y}, putt? }
            if (activity.buttons && typeof activity.buttons === 'object') {
                for (var k in activity.buttons) {
                    if (Object.prototype.hasOwnProperty.call(activity.buttons, k) && activity.buttons[k]) return true;
                }
            }
            if (activity.move && (activity.move.x || activity.move.y)) return true;
            if (activity.charging === true) return true;
            return false;
        } catch (e) { return false; }
    }

    function resolveWorldDt(rawDt, activity, opts) {
        try {
            var dt = num(rawDt, 0.016);
            if (!(dt > 0)) return 0;
            if (dt > 0.1) dt = 0.1; // match main4d clamp
            var ts = 1;
            try {
                if (opts && opts.timeScale !== undefined) ts = num(opts.timeScale, 1);
                else ts = hostTimeScale();
            } catch (e) { ts = 1; }
            if (!(ts >= 0)) ts = 1;
            var mode = current;
            try {
                if (opts && isValidMode(opts.mode)) mode = opts.mode;
            } catch (e) { /* ignore */ }
            if (mode === 'realtime') return dt * ts;
            if (mode === 'chrono') return dt * ts * (isActive(activity) ? 1 : CRAWL);
            if (mode === 'turnbased') {
                // Free world motion is frozen; motion happens via commitPlayerTurn's
                // fixed 0.5s sim. Player aiming UI may still use raw dt (see gate()).
                return 0;
            }
            return dt * ts;
        } catch (e) { return 0; }
    }

    function allowEnemyMotion() {
        try {
            if (current !== 'turnbased') return true;
            return turn.phase === 'enemy';
        } catch (e) { return true; }
    }

    // Main-loop gate: one call per tick. Returns { mode, playerDt, enemyDt,
    // worldDt, allowEnemies, turnPhase }. playerDt stays live in every mode
    // (aim/move/charge UI); enemyDt is 0 during the TB player phase and the
    // chrono-scaled dt otherwise.
    function gate(rawDt, activity, opts) {
        try {
            var dt = num(rawDt, 0.016);
            if (dt > 0.1) dt = 0.1;
            if (!(dt > 0)) dt = 0;
            var ts = 1;
            try {
                if (opts && opts.timeScale !== undefined) ts = num(opts.timeScale, 1);
                else ts = hostTimeScale();
            } catch (e) { ts = 1; }
            if (!(ts >= 0)) ts = 1;
            var base = dt * ts;
            var out = {
                mode: current,
                playerDt: base,
                enemyDt: base,
                worldDt: base,
                allowEnemies: true,
                turnPhase: turn.phase
            };
            if (current === 'chrono') {
                var scale = isActive(activity) ? 1 : CRAWL;
                out.enemyDt = base * scale;
                out.worldDt = base * scale;
                out.allowEnemies = true;
            } else if (current === 'turnbased') {
                out.turnPhase = turn.phase;
                if (turn.phase === 'player') {
                    out.enemyDt = 0;
                    out.worldDt = 0;
                    out.allowEnemies = false;
                } else {
                    out.enemyDt = base;
                    out.worldDt = base;
                    out.allowEnemies = true;
                }
            }
            return out;
        } catch (e) {
            return { mode: current, playerDt: 0.016, enemyDt: 0.016, worldDt: 0.016, allowEnemies: true, turnPhase: 'player' };
        }
    }

    // ---- Turn-Based order queue ----
    // queue: array of actor ids in initiative order. Player always acts
    // first each round; enemies+ballistics resolve as one fixed 0.5s sim
    // block (no per-enemy free motion during the player turn).

    function setQueue(ids) {
        try {
            turn.queue = Array.isArray(ids) ? ids.filter(function (id) {
                return typeof id === 'string' && id;
            }).slice(0, 64) : [];
            turn.cursor = 0;
            return turn.queue.slice();
        } catch (e) { return []; }
    }

    function getQueue() {
        try { return turn.queue.slice(); } catch (e) { return []; }
    }

    function beginPlayerTurn() {
        try {
            turn.phase = 'player';
            turn.pendingAction = null;
            return true;
        } catch (e) { return false; }
    }

    // action: { kind: 'move'|'putt'|'ability'|'wait', ... } (JSON-safe).
    // stepWorldFn: function (fixedDt) — runs enemy+ballistic sim for TURN_STEP.
    // Returns { ok, turn } — the round counter increments per committed action.
    function commitPlayerTurn(action, stepWorldFn) {
        try {
            if (current !== 'turnbased') return { ok: false, reason: 'not-turnbased' };
            if (turn.phase !== 'player') return { ok: false, reason: 'not-player-phase' };
            var act = null;
            try {
                act = action && typeof action === 'object' ? JSON.parse(JSON.stringify(action)) : { kind: 'wait' };
            } catch (e) { act = { kind: 'wait' }; }
            if (typeof act.kind !== 'string') act.kind = 'wait';
            if (['move', 'putt', 'ability', 'wait'].indexOf(act.kind) === -1) act.kind = 'wait';
            turn.pendingAction = act;
            turn.phase = 'enemy';
            // Fixed 0.5s enemy+ballistic sim, chunked so physics stays stable.
            try {
                if (typeof stepWorldFn === 'function') {
                    var remaining = TURN_STEP, h = 1 / 60;
                    var guard = 0;
                    while (remaining > 1e-9 && guard < 64) {
                        var step = Math.min(h, remaining);
                        stepWorldFn(step);
                        remaining -= step;
                        guard += 1;
                    }
                }
            } catch (e) { /* enemy sim is best-effort */ }
            turn.turn += 1;
            turn.cursor = turn.queue.length ? (turn.cursor + 1) % turn.queue.length : 0;
            turn.phase = 'player';
            turn.pendingAction = null;
            return { ok: true, turn: turn.turn };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    function getTurnState() {
        try { return JSON.parse(JSON.stringify(turn)); } catch (e) { return { phase: 'player', turn: 0, queue: [], cursor: 0, pendingAction: null }; }
    }

    function setTurnState(s) {
        try {
            if (!s || typeof s !== 'object') return false;
            if (s.phase === 'player' || s.phase === 'enemy') turn.phase = s.phase;
            if (isFinite(+s.turn)) turn.turn = Math.max(0, Math.floor(+s.turn));
            if (Array.isArray(s.queue)) setQueue(s.queue);
            if (isFinite(+s.cursor) && turn.queue.length) {
                turn.cursor = Math.max(0, Math.floor(+s.cursor)) % turn.queue.length;
            }
            turn.pendingAction = null;
            return true;
        } catch (e) { return false; }
    }

    // ---- Mode registry ----

    function setMode(m) {
        try {
            if (!isValidMode(m)) return false;
            if (m === current) return true;
            current = m;
            if (m === 'turnbased') beginPlayerTurn();
            else { turn.phase = 'player'; turn.pendingAction = null; }
            try {
                if (window.localStorage) window.localStorage.setItem(LS_KEY, current);
            } catch (e) { /* storage unavailable */ }
            try {
                window.dispatchEvent(new CustomEvent('gg4d-mode-change', { detail: { mode: current } }));
            } catch (e) { /* ignore */ }
            try {
                if (window.GraveGain4DSaveBridge && typeof window.GraveGain4DSaveBridge.requestSave === 'function') {
                    window.GraveGain4DSaveBridge.requestSave('mode-change');
                }
            } catch (e) { /* best-effort */ }
            return true;
        } catch (e) { return false; }
    }

    function getMode() { return current; }

    function describe(m) {
        try {
            var id = isValidMode(m) ? m : current;
            return { id: id, label: LABELS[id], desc: DESCS[id] };
        } catch (e) { return { id: 'realtime', label: 'Realtime', desc: '' }; }
    }

    // ---- Persistence (save state) ----
    // Mode rides inside the savebridge snapshot when present; these helpers
    // are the standalone JSON form + localStorage fallback.

    function toJSON() {
        try {
            return { mode: current, turn: getTurnState() };
        } catch (e) { return { mode: 'realtime', turn: null }; }
    }

    function fromJSON(snap) {
        try {
            if (!snap || typeof snap !== 'object') return false;
            var mode = snap.mode != null ? snap.mode : snap.combatMode;
            var ok = true;
            if (mode !== undefined) ok = setMode(isValidMode(mode) ? mode : 'realtime') && true;
            if (snap.turn && typeof snap.turn === 'object') setTurnState(snap.turn);
            return ok;
        } catch (e) { return false; }
    }

    function loadStored() {
        try {
            // Host pending load wins (fresh cloud save), then localStorage.
            var pending = null;
            try { pending = window.__gravegain4dPendingLoad || null; } catch (e) { pending = null; }
            if (pending && typeof pending === 'object') {
                if (isValidMode(pending.combatMode)) { setMode(pending.combatMode); return true; }
                if (pending.modes && isValidMode(pending.modes.mode)) {
                    setMode(pending.modes.mode);
                    if (pending.modes.turn) setTurnState(pending.modes.turn);
                    return true;
                }
            }
            if (window.localStorage) {
                var raw = window.localStorage.getItem(LS_KEY);
                if (isValidMode(raw)) { current = raw; return true; }
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    try { loadStored(); } catch (e) { /* ignore */ }

    var api = {
        MODES: MODES.slice(),
        CRAWL: CRAWL,
        TURN_STEP: TURN_STEP,
        setMode: setMode,
        getMode: getMode,
        describe: describe,
        isActive: isActive,
        resolveWorldDt: resolveWorldDt,
        allowEnemyMotion: allowEnemyMotion,
        gate: gate,
        setQueue: setQueue,
        getQueue: getQueue,
        beginPlayerTurn: beginPlayerTurn,
        commitPlayerTurn: commitPlayerTurn,
        getTurnState: getTurnState,
        setTurnState: setTurnState,
        toJSON: toJSON,
        fromJSON: fromJSON,
        loadStored: loadStored
    };

    try {
        // Savebridge hook: persist mode inside the host snapshot when the
        // bridge scrapes window.__gravegain4dSnapshot.
        var prev = null;
        try { prev = window.__gravegain4dSnapshot || null; } catch (e) { prev = null; }
        var hooks = prev && typeof prev === 'object' ? prev : {};
        var prevGet = (hooks && typeof hooks.get === 'function') ? hooks.get : null;
        var prevSet = (hooks && typeof hooks.set === 'function') ? hooks.set : null;
        hooks.get = function () {
            var base = null;
            try { base = prevGet ? prevGet() : null; } catch (e) { base = null; }
            if (!base || typeof base !== 'object') base = { schema: 1, slug: 'gravegain4d' };
            try { base.combatMode = current; } catch (e) { /* ignore */ }
            try { base.modes = toJSON(); } catch (e) { /* ignore */ }
            return base;
        };
        hooks.set = function (snap) {
            var r = true;
            try { r = prevSet ? prevSet(snap) : true; } catch (e) { r = false; }
            try {
                if (snap && typeof snap === 'object') {
                    if (isValidMode(snap.combatMode)) setMode(snap.combatMode);
                    else if (snap.modes) fromJSON(snap.modes);
                }
            } catch (e) { /* ignore */ }
            return r;
        };
        try { window.__gravegain4dSnapshot = hooks; } catch (e) { /* ignore */ }
    } catch (e) { /* bridge hook is best-effort */ }

    try { window.GG4D_Modes = api; } catch (e) { /* ignore */ }
})();
