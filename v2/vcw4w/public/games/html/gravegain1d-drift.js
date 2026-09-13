/* GraveGain1D Echo Drift — endless expansion overlay (v2-native, parity-safe).
 *
 * Lives OUTSIDE parity-locked bundles:
 *   v2/vcw4w/public/games/html/gravegain1d-drift.js
 * Wiring lane owns script injection; this file never edits game.js / index.html.
 *
 * What it does (advisory-only, never rewrites core sim):
 *   - Drift modifiers rotating on endless (Echo Drift) runs:
 *       ley-storm      — surge windows: bonus XP/gold pace, slightly hotter foes.
 *       echo-elites    — every Kth kill is tagged an echo elite (bonus streak).
 *       gold-rush-tide — timed window where kills pay bonus gold (advisory).
 *   - Endless boss-echo rotation: exposes echoBossFor(cycle) cycling the 5
 *     gate bosses as "Echo of ..." with cycle-scaling notes (advisory tags
 *     on run._drift* fields only; never spawns or mutates enemies).
 *   - Streak scoring: kill streaks without taking damage earn drift bonus
 *     on top of the base score() — exposed via driftScore(run).
 *   - Hooks: if window.GraveGainEvents exposes a register/add/enqueue-style
 *     API, drift windows are offered to it; if window.GraveGainSidequests
 *     exposes one, a "Driftwalker" quest is offered. Otherwise a standalone
 *     1Hz scheduler announces windows via a small textContent-only overlay.
 *
 * Age bands (same art all bands EXCEPT tone): kid = praise + sparkles, no
 * blood; teen = tense but clean; all = grim. No drugs anywhere in this file.
 * Kill FX routes via window.FourweirdGore.spawn when present, else DOM
 * floaters only (no blood spawned here).
 *
 * Contract: vanilla IIFE, no deps/imports, never throws, idempotent
 * (`if (window.GraveGain1DDrift) return`), guarded try/catch, capped overlay
 * (<=12 nodes), ~1Hz poll, pauses when document.hidden.
 */
(function () {
    'use strict';
    if (window.GraveGain1DDrift) return; // idempotent under double-injection

    var VERSION = '1.0.0';
    var MOD_ID = 'gravegain1d-drift';
    var POLL_MS = 1000;
    var MAX_NOTES = 12;
    var ELITE_EVERY = 7;       // every 7th drift kill is an echo elite
    var STORM_EVERY = 45;      // ticks between ley-storm windows
    var STORM_LEN = 12;        // ticks a storm lasts
    var TIDE_EVERY = 90;       // ticks between gold-rush tides
    var TIDE_LEN = 15;         // ticks a tide lasts

    var MODIFIERS = [
        { id: 'ley-storm', name: 'Ley-Storm', emoji: '\u26A1',
            desc: 'Surge window: faster pace, hotter foes, bonus streak.',
            kid: 'Sparkle storm! Shiny fast feet!',
            teen: 'The ley-line surges. Hold the line.',
            all: 'The ley-line screams raw voltage. Bleed or be buried.' },
        { id: 'echo-elites', name: 'Echo Elites', emoji: '\uD83D\uDC7B',
            desc: 'Every 7th drift kill is an echo elite worth bonus streak.',
            kid: 'Super-duper echo buddies give extra stars!',
            teen: 'Echoes wear old faces. Bury them twice.',
            all: 'Dead couriers walk again. Put the bastards down twice.' },
        { id: 'gold-rush-tide', name: 'Gold Rush Tide', emoji: '\uD83E\uDE99',
            desc: 'Timed window: drift kills pay bonus gold (advisory).',
            kid: 'Coin shower! Yay, treasure sparkles!',
            teen: 'Sparkite tide. Grab what glitters.',
            all: 'Sparkite tide. Grab the gold, damn the cost.' }
    ];

    var BOSS_ECHOES = [
        { slot: 0, echo: 'Echo of the First Risen' },
        { slot: 1, echo: 'Echo of the Elder' },
        { slot: 2, echo: 'Echo of the Vault Warden' },
        { slot: 3, echo: 'Echo of the Blood-Bound' },
        { slot: 4, echo: 'Echo of the Gate Titan' }
    ];

    var PRAISE = ['Brave!', 'Shiny!', 'Star-marcher!', 'Gold star!', 'Hero step!'];

    // ---------------- Mode contract (fail-closed to teen) ----------------
    function getMode() {
        try {
            var q = null;
            try {
                var m = /[?&]content=(kid|teen|all)/i.exec(String(window.location && window.location.search || ''));
                if (m) q = m[1].toLowerCase();
            } catch (e) { /* ignore */ }
            if (q) return q;
            try {
                var ls = window.localStorage;
                if (ls) {
                    var v = ls.getItem('4weird-content-mode:gravegain1d') || ls.getItem('FourweirdContentMode');
                    if (v) {
                        var parsed = null;
                        try { parsed = JSON.parse(v); } catch (e2) { parsed = null; }
                        var s = String((parsed && parsed.mode) || v).toLowerCase();
                        if (s.indexOf('kid') !== -1) return 'kid';
                        if (s.indexOf('all') !== -1) return 'all';
                        if (s.indexOf('teen') !== -1) return 'teen';
                    }
                }
            } catch (e) { /* ignore */ }
            try {
                var g = window.FourweirdContentMode;
                if (g && typeof g.mode === 'string') {
                    var gm = g.mode.toLowerCase();
                    if (gm === 'kid' || gm === 'teen' || gm === 'all') return gm;
                }
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
        return 'teen';
    }

    function lineFor(mod) {
        try {
            var mode = getMode();
            if (mode === 'kid') return mod.kid;
            if (mode === 'all') return mod.all;
            return mod.teen;
        } catch (e) { return mod.teen; }
    }

    // ---------------- Drift state (per observed run object) ----------------
    // WeakMap would be ideal but keep ES5-broad: tag the run object itself
    // with _drift* advisory fields only (never core combat fields).
    function driftOf(run) {
        try {
            if (!run || typeof run !== 'object') return null;
            if (!run._drift || typeof run._drift !== 'object') {
                run._drift = {
                    streak: 0, best: 0, elites: 0, stormsSeen: 0, tidesSeen: 0,
                    bonus: 0, tideBonus: 0, stormActive: 0, tideActive: 0,
                    lastKills: (typeof run.kills === 'number') ? run.kills : 0,
                    lastHp: (typeof run.hp === 'number') ? run.hp : 0,
                    started: false
                };
            }
            return run._drift;
        } catch (e) { return null; }
    }

    function echoBossFor(cycle) {
        try {
            var c = Math.floor(Number(cycle) || 0);
            if (!isFinite(c) || c < 0) c = 0;
            var slot = c % BOSS_ECHOES.length;
            var lap = Math.floor(c / BOSS_ECHOES.length);
            return { slot: slot, lap: lap, echo: BOSS_ECHOES[slot].echo, cycle: c };
        } catch (e) { return { slot: 0, lap: 0, echo: BOSS_ECHOES[0].echo, cycle: 0 }; }
    }

    function activeWindows(run) {
        var out = [];
        try {
            var d = driftOf(run);
            if (!d) return out;
            if (d.stormActive > 0) out.push('ley-storm');
            if (d.tideActive > 0) out.push('gold-rush-tide');
            out.push('echo-elites'); // elites are always "on" in drift
        } catch (e) { /* ignore */ }
        return out;
    }

    function driftScore(run) {
        try {
            var base = 0;
            try {
                var GG = window.GraveGain1D;
                if (GG && typeof GG.score === 'function') base = Number(GG.score(run)) || 0;
                else base = (Number(run.x) || 0) + (Number(run.level) || 1) * 10 + (Number(run.gold) || 0) + (Number(run.kills) || 0) * 2;
            } catch (e) { base = 0; }
            var d = driftOf(run);
            var bonus = d ? (Number(d.bonus) || 0) + (Number(d.tideBonus) || 0) : 0;
            return base + bonus;
        } catch (e) { return 0; }
    }

    // Observe one tick's events and update streak/modifier state. Pure
    // bookkeeping on run._drift; never touches hp/atk/enemies.
    function observe(run, events) {
        try {
            if (!run || !events || !events.length) return;
            var d = driftOf(run);
            if (!d) return;
            var isDrift = !!run.endless;
            for (var i = 0; i < events.length; i++) {
                var e = events[i];
                if (!e || typeof e.t !== 'string') continue;
                if (e.t === 'kill') {
                    d.streak += 1;
                    if (d.streak > d.best) d.best = d.streak;
                    d.bonus += 1 + Math.min(9, Math.floor(d.streak / 3)); // streak curve
                    if (isDrift && (Number(run.kills) || 0) % ELITE_EVERY === 0) {
                        d.elites += 1;
                        d.bonus += 5;
                        celebrate(run, 'elite');
                    }
                    if (d.tideActive > 0) d.tideBonus += 2;
                    if (d.stormActive > 0) d.bonus += 1;
                } else if (e.t === 'hit' && e.foe === false && !e.dodged && Number(e.dmg) > 0) {
                    d.streak = 0; // taking damage breaks the streak
                } else if (e.t === 'death') {
                    d.streak = 0;
                } else if (e.t === 'sector' && isDrift) {
                    var echo = echoBossFor(run.cycle);
                    run._driftBossEcho = echo.echo;
                    announce('boss-echo', echo.echo + ' stirs beyond the gate (cycle ' + echo.cycle + ').');
                } else if (e.t === 'boss' && isDrift) {
                    var eb = echoBossFor(run.cycle);
                    run._driftBossEcho = eb.echo;
                }
            }
            // Modifier windows advance on the run tick clock.
            if (isDrift && typeof run.ticks === 'number') {
                if (run.ticks > 0 && run.ticks % STORM_EVERY === 0 && d.stormActive <= 0) {
                    d.stormActive = STORM_LEN;
                    d.stormsSeen += 1;
                    celebrate(run, 'storm');
                    announce('ley-storm', lineFor(MODIFIERS[0]));
                    offerToEvents('ley-storm', lineFor(MODIFIERS[0]));
                }
                if (run.ticks > 0 && run.ticks % TIDE_EVERY === 0 && d.tideActive <= 0) {
                    d.tideActive = TIDE_LEN;
                    d.tidesSeen += 1;
                    celebrate(run, 'tide');
                    announce('gold-rush-tide', lineFor(MODIFIERS[2]));
                    offerToEvents('gold-rush-tide', lineFor(MODIFIERS[2]));
                }
            }
            if (d.stormActive > 0) d.stormActive -= 1;
            if (d.tideActive > 0) d.tideActive -= 1;
            d.lastKills = Number(run.kills) || 0;
            d.lastHp = Number(run.hp) || 0;
        } catch (e) { /* never throw out of the tick path */ }
    }

    // ---------------- Age-safe celebration FX ----------------
    function celebrate(run, kind) {
        try {
            var mode = getMode();
            var gore = null;
            try { gore = window.FourweirdGore; } catch (e) { gore = null; }
            if (gore && typeof gore.spawn === 'function') {
                try {
                    if (mode === 'kid') {
                        gore.spawn({ kind: 'sparkle', x: Number(run.x) || 0, text: PRAISE[(Number(run.kills) || 0) % PRAISE.length] });
                    } else if (kind === 'elite' && mode === 'all') {
                        gore.spawn({ kind: 'hit', x: Number(run.x) || 0 });
                    } else {
                        gore.spawn({ kind: kind === 'tide' ? 'coin' : 'spark', x: Number(run.x) || 0 });
                    }
                } catch (e) { /* garnish */ }
                return;
            }
            // No gore bus: DOM floater fallback (text only, no blood).
            var host = null;
            try { host = document.getElementById('gg1dDriftFx'); } catch (e) { host = null; }
            if (!host) return;
            var s = document.createElement('span');
            var label = mode === 'kid'
                ? ('\u2728 ' + PRAISE[(Number(run.kills) || 0) % PRAISE.length])
                : (kind === 'storm' ? '\u26A1 LEY-STORM' : (kind === 'tide' ? '\u2728 GOLD TIDE' : '\uD83D\uDC7B ECHO ELITE'));
            s.textContent = label;
            s.setAttribute('data-drift-fx', kind);
            while (host.childNodes.length >= 8) { try { host.removeChild(host.firstChild); } catch (e) { break; } }
            host.appendChild(s);
            setTimeout(function () { try { if (s.parentNode) s.parentNode.removeChild(s); } catch (e) { /* ignore */ } }, 2500);
        } catch (e) { /* ignore */ }
    }

    // ---------------- Overlay notes (standalone scheduler UI) ----------------
    var notes = [];
    function ensureRoot() {
        try {
            var root = document.getElementById('gg1dDriftNotes');
            if (root) return root;
            root = document.createElement('div');
            root.id = 'gg1dDriftNotes';
            root.setAttribute('aria-live', 'polite');
            root.style.cssText = 'position:fixed;left:8px;bottom:8px;max-width:280px;z-index:40;pointer-events:none;font:12px/1.4 system-ui,sans-serif;';
            document.body.appendChild(root);
            var fx = document.createElement('div');
            fx.id = 'gg1dDriftFx';
            fx.style.cssText = 'position:fixed;left:8px;bottom:120px;z-index:40;pointer-events:none;font:12px/1.4 system-ui,sans-serif;';
            document.body.appendChild(fx);
            return root;
        } catch (e) { return null; }
    }

    function announce(id, text) {
        try {
            if (document.hidden) { notes.push({ id: id, text: text }); if (notes.length > MAX_NOTES) notes.shift(); return; }
            var root = ensureRoot();
            if (!root) return;
            var d = document.createElement('div');
            d.textContent = '\uD83C\uDF00 drift: ' + String(text).slice(0, 140);
            d.setAttribute('data-drift-note', id);
            d.style.cssText = 'background:rgba(10,10,26,.82);color:#e2e8f0;border:1px solid #4c1d95;border-radius:8px;padding:4px 8px;margin-top:4px;pointer-events:none;';
            root.appendChild(d);
            while (root.childNodes.length > 6) { try { root.removeChild(root.firstChild); } catch (e) { break; } }
            setTimeout(function () { try { if (d.parentNode) d.parentNode.removeChild(d); } catch (e) { /* ignore */ } }, 6000);
        } catch (e) { /* ignore */ }
    }

    // ---------------- Optional hooks into sibling E-lanes ----------------
    function offerToEvents(id, text) {
        try {
            var E = window.GraveGainEvents;
            if (!E || typeof E !== 'object') return false;
            var mod = null;
            for (var i = 0; i < MODIFIERS.length; i++) if (MODIFIERS[i].id === id) mod = MODIFIERS[i];
            var payload = { id: 'drift-' + id, text: text, mod: id, drift: true };
            var fns = ['register', 'add', 'addEvent', 'enqueue', 'push', 'schedule'];
            for (var f = 0; f < fns.length; f++) {
                try {
                    if (typeof E[fns[f]] === 'function') { E[fns[f]](payload); return true; }
                } catch (e) { /* try next */ }
            }
            try {
                if (typeof E.nextEvent === 'function') { /* poll-style API: nothing to push */ return false; }
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
        return false;
    }

    function offerQuest() {
        try {
            var Q = window.GraveGainSidequests;
            if (!Q || typeof Q !== 'object') return false;
            var quest = { id: 'driftwalker', title: 'Driftwalker',
                desc: 'Survive 3 Echo Drift cycles without falling.',
                drift: true, goal: { cycles: 3 } };
            var fns = ['register', 'add', 'addQuest', 'enqueue', 'push'];
            for (var i = 0; i < fns.length; i++) {
                try {
                    if (typeof Q[fns[i]] === 'function') { Q[fns[i]](quest); return true; }
                } catch (e) { /* try next */ }
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    // ---------------- Tick/newRun wrappers (observe-only) ----------------
    var wrapped = false;
    function wrapTick() {
        try {
            var GG = window.GraveGain1D;
            if (!GG || wrapped) return;
            if (typeof GG.tick !== 'function' || typeof GG.newRun !== 'function') return;
            var origTick = GG.tick;
            var origNew = GG.newRun;
            GG.newRun = function (seed, classId, mode) {
                var run = null;
                try { run = origNew.apply(this, arguments); } catch (e) { throw e; }
                try {
                    var d = driftOf(run);
                    if (d) d.started = true;
                    offerQuest();
                } catch (e) { /* ignore */ }
                return run;
            };
            GG.tick = function (run, action) {
                var events = null;
                try { events = origTick.apply(this, arguments); } catch (e) { throw e; }
                try { observe(run, events); } catch (e) { /* ignore */ }
                return events;
            };
            wrapped = true;
        } catch (e) { /* ignore */ }
    }

    // ---------------- Standalone scheduler (DOM poll fallback) ----------------
    var timer = null;
    var lastSectorText = '';
    function poll() {
        try {
            if (document.hidden) return;
            wrapTick();
            // Surface drift HUD line when the 1D HUD is live.
            var sectorEl = null;
            try { sectorEl = document.getElementById('gg1dSector'); } catch (e) { sectorEl = null; }
            if (sectorEl) {
                var t = String(sectorEl.textContent || '');
                if (t !== lastSectorText) {
                    lastSectorText = t;
                    if (t.indexOf('Echo Drift') !== -1) {
                        offerQuest();
                        flushNotes();
                    }
                }
            }
        } catch (e) { /* ignore */ }
    }

    function flushNotes() {
        try {
            if (!notes.length || document.hidden) return;
            var q = notes.splice(0, notes.length);
            for (var i = 0; i < q.length; i++) announce(q[i].id, q[i].text);
        } catch (e) { /* ignore */ }
    }

    function init() {
        try {
            if (init._done) return;
            init._done = true;
            wrapTick();
            offerQuest();
            try {
                if (timer === null && typeof setInterval === 'function') {
                    timer = setInterval(function () { try { poll(); } catch (e) { /* ignore */ } }, POLL_MS);
                }
            } catch (e) { /* ignore */ }
            try {
                document.addEventListener('visibilitychange', function () { try { flushNotes(); } catch (e) { /* ignore */ } });
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    var api = {
        VERSION: VERSION,
        modifiers: MODIFIERS,
        bossEchoes: BOSS_ECHOES,
        echoBossFor: echoBossFor,
        getActive: activeWindows,
        getStreak: function (run) { try { var d = driftOf(run); return d ? d.streak : 0; } catch (e) { return 0; } },
        getBest: function (run) { try { var d = driftOf(run); return d ? d.best : 0; } catch (e) { return 0; } },
        driftScore: driftScore,
        getMode: getMode,
        init: init
    };

    try { window.GraveGain1DDrift = api; } catch (e) { /* window unwritable */ }
    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: MOD_ID, version: VERSION, init: init });
    } catch (e) { /* ignore */ }

    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    } catch (e) { try { init(); } catch (ignored) { /* ignore */ } }
})();
