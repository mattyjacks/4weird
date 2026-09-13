/* GraveGain MMORPG shared world-event clock (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero DOM writes.
 * Games (gravegain1d / gravegain2d / gravegain3d + mmorpg-3d.js) load it via
 * a plain script tag and read the deterministic UTC schedule derived from
 * Date.now() — no network, no storage, no engine hooks.
 *
 *   window.GraveGainMMORPGEvents = { VERSION, nextEvent, describe }
 *
 * nextEvent(nowMs?) -> { id, kind, name, startsAtMs, startsInMs, endsAtMs,
 *   durationMs, detail } for the soonest upcoming world event across the
 *   three schedules (hourly Spire boss, 30-min ley-line surge, 15-min
 *   dungeon mutator rotation). describe(input?) -> one-line human string.
 * Every public function is guarded and NEVER throws: on any failure it
 * returns a safe fallback value.
 *
 * Mode contract (mirrors gravegain-events.js): ?content=kid|teen|all >
 * localStorage 4weird-content-mode:<slug> / FourweirdContentMode >
 * window.FourweirdContentMode > fourweird-content-mode CustomEvent.
 * Kid band gets cozy copies; drugs never appear in any band.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var MIN = 60 * 1000;
    var HOUR = 60 * MIN;

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGainMMORPGEvents) return;

    /* ---- content mode (kid-safe copies), guarded like the 2d/3d events file ---- */
    function normMode(v) {
        try {
            v = String(v == null ? '' : v).toLowerCase();
            if (v === 'kid' || v === 'teen' || v === 'all') return v;
        } catch (e) { /* ignore */ }
        return '';
    }
    function getMode() {
        try {
            var q = new URLSearchParams(win.location.search).get('content');
            var m = normMode(q);
            if (m) return m;
        } catch (e) { /* ignore */ }
        try {
            var keys = ['4weird-content-mode:gravegain3d', 'FourweirdContentMode'];
            for (var i = 0; i < keys.length; i++) {
                var v = normMode(win.localStorage.getItem(keys[i]));
                if (v) return v;
            }
        } catch (e) { /* ignore */ }
        try {
            if (win.FourweirdContentMode) {
                var m2 = normMode(win.FourweirdContentMode.mode);
                if (m2) return m2;
            }
        } catch (e) { /* ignore */ }
        return 'teen';
    }
    function pickText(pair, mode) {
        try {
            if (pair && pair[mode]) return String(pair[mode]);
            if (pair && pair.teen) return String(pair.teen);
        } catch (e) { /* ignore */ }
        return '';
    }

    /* ---- world-event tables ---- */
    var BOSSES = [
        { id: 'grave-titan',
          name: { kid: 'Grumbly Grave Giant', teen: 'Grave Titan', all: 'GRAVE TITAN' } },
        { id: 'spire-widow',
          name: { kid: 'Shy Spire Spider', teen: 'Spire Widow', all: 'SPIRE WIDOW' } },
        { id: 'marrow-choir',
          name: { kid: 'Humming Bone Choir', teen: 'Marrow Choir', all: 'MARROW CHOIR' } },
        { id: 'lantern-thief',
          name: { kid: 'Sneaky Lantern Borrower', teen: 'Lantern Thief', all: 'LANTERN THIEF' } }
    ];
    var SURGES = [
        { id: 'ember', buff: '+25% XP',
          name: { kid: 'Cozy Ember Glow', teen: 'Ember Ley Surge', all: 'EMBER LEY SURGE' } },
        { id: 'frost', buff: '+25% loot',
          name: { kid: 'Snowy Sparkle Drift', teen: 'Frost Ley Surge', all: 'FROST LEY SURGE' } },
        { id: 'storm', buff: 'fast runs',
          name: { kid: 'Giggle Thunder Rumble', teen: 'Storm Ley Surge', all: 'STORM LEY SURGE' } },
        { id: 'bloom', buff: '+25% XP',
          name: { kid: 'Flower-Pop Bloom Wave', teen: 'Bloom Ley Surge', all: 'BLOOM LEY SURGE' } }
    ];
    var MUTATORS = [
        { id: 'double-loot',
          name: { kid: 'Double Treats!', teen: 'Double Loot', all: 'DOUBLE LOOT' } },
        { id: 'swift-foes',
          name: { kid: 'Zippy Grumps', teen: 'Swift Foes', all: 'SWIFT FOES' } },
        { id: 'thick-fog',
          name: { kid: 'Fluffy Fog', teen: 'Thick Fog', all: 'THICK FOG' } },
        { id: 'golden-chests',
          name: { kid: 'Golden Giggle-Boxes', teen: 'Golden Chests', all: 'GOLDEN CHESTS' } },
        { id: 'bravery-aura',
          name: { kid: 'Brave-Heart Hug', teen: 'Bravery Aura', all: 'BRAVERY AURA' } },
        { id: 'trap-party',
          name: { kid: 'Tickle-Trap Party', teen: 'Trap Party', all: 'TRAP PARTY' } }
    ];

    var SPIRE_DURATION = 15 * MIN;
    var SURGE_DURATION = 10 * MIN;
    var MUTATOR_DURATION = 15 * MIN;
    var SURGE_SLOT = 30 * MIN;
    var SURGE_OFFSET = 15 * MIN;
    var MUTATOR_SLOT = 15 * MIN;

    function normNow(v) {
        try {
            var n = Math.floor(Number(v));
            if (isFinite(n) && n > 0) return n;
        } catch (e) { /* ignore */ }
        try {
            return Date.now();
        } catch (e) { /* ignore */ }
        return 0;
    }
    function idx(n, len) {
        try {
            var k = Math.floor(n) % len;
            if (k < 0) k += len;
            return k;
        } catch (e) { /* ignore */ }
        return 0;
    }

    /* Next hourly Spire boss: spawns on the hour, 15-minute window. */
    function nextSpire(now) {
        var start = now - (now % HOUR) + HOUR;
        var hourNo = Math.floor(start / HOUR);
        var boss = BOSSES[idx(hourNo, BOSSES.length)] || BOSSES[0];
        return {
            id: 'spire-boss-' + boss.id,
            kind: 'spire-boss',
            ref: boss.id,
            name: pickText(boss.name, 'teen'),
            startsAtMs: start,
            startsInMs: Math.max(0, start - now),
            endsAtMs: start + SPIRE_DURATION,
            durationMs: SPIRE_DURATION,
            detail: 'Hourly Spire boss (' + boss.id + '), 15m window'
        };
    }

    /* Ley-line surge: every 30 min at :15/:45 UTC, 10-minute buff window. */
    function nextSurge(now) {
        var k = Math.ceil((now - SURGE_OFFSET) / SURGE_SLOT);
        if (!isFinite(k) || k < 0) k = 0;
        var start = SURGE_OFFSET + k * SURGE_SLOT;
        if (start <= now) { k += 1; start = SURGE_OFFSET + k * SURGE_SLOT; }
        var surge = SURGES[idx(k, SURGES.length)] || SURGES[0];
        return {
            id: 'ley-surge-' + surge.id,
            kind: 'ley-surge',
            ref: surge.id,
            name: pickText(surge.name, 'teen'),
            startsAtMs: start,
            startsInMs: Math.max(0, start - now),
            endsAtMs: start + SURGE_DURATION,
            durationMs: SURGE_DURATION,
            detail: 'Ley-line surge (' + surge.id + ', ' + surge.buff + '), 10m window'
        };
    }

    /* Dungeon mutator: rotates on the quarter hour, 15-minute window. */
    function nextMutator(now) {
        var k = Math.ceil(now / MUTATOR_SLOT);
        if (!isFinite(k) || k < 0) k = 0;
        var start = k * MUTATOR_SLOT;
        if (start <= now) { k += 1; start = k * MUTATOR_SLOT; }
        var mut = MUTATORS[idx(k, MUTATORS.length)] || MUTATORS[0];
        return {
            id: 'mutator-' + mut.id,
            kind: 'mutator',
            ref: mut.id,
            name: pickText(mut.name, 'teen'),
            startsAtMs: start,
            startsInMs: Math.max(0, start - now),
            endsAtMs: start + MUTATOR_DURATION,
            durationMs: MUTATOR_DURATION,
            detail: 'Dungeon mutator (' + mut.id + '), 15m window'
        };
    }

    function fallbackEvent(now) {
        return {
            id: 'spire-boss-grave-titan',
            kind: 'spire-boss',
            ref: 'grave-titan',
            name: 'Grave Titan',
            startsAtMs: now,
            startsInMs: 0,
            endsAtMs: now + SPIRE_DURATION,
            durationMs: SPIRE_DURATION,
            detail: 'Hourly Spire boss, 15m window'
        };
    }

    /* Soonest of the three schedules. NEVER throws. */
    function nextEvent(nowMs) {
        try {
            var now = normNow(nowMs);
            var cands = [nextSpire(now), nextSurge(now), nextMutator(now)];
            var best = cands[0];
            for (var i = 1; i < cands.length; i++) {
                if (cands[i].startsAtMs < best.startsAtMs) best = cands[i];
            }
            return best;
        } catch (e) {
            try {
                return fallbackEvent(normNow());
            } catch (ignored) {
                return { id: 'unknown', kind: 'unknown', ref: '', name: 'World event',
                    startsAtMs: 0, startsInMs: 0, endsAtMs: 0, durationMs: 0, detail: '' };
            }
        }
    }

    function nextOfKind(kind, now) {
        try {
            if (kind === 'spire-boss') return nextSpire(now);
            if (kind === 'ley-surge') return nextSurge(now);
            if (kind === 'mutator') return nextMutator(now);
        } catch (e) { /* ignore */ }
        return null;
    }

    function fmtCountdown(ms) {
        try {
            var s = Math.max(0, Math.round(ms / 1000));
            var h = Math.floor(s / 3600);
            var m = Math.floor((s % 3600) / 60);
            if (h > 0) return h + 'h ' + m + 'm';
            if (m > 0) return m + 'm';
            return s + 's';
        } catch (e) { /* ignore */ }
        return 'soon';
    }

    function eventName(ev, mode) {
        try {
            var table = ev.kind === 'spire-boss' ? BOSSES
                : ev.kind === 'ley-surge' ? SURGES : MUTATORS;
            for (var i = 0; i < table.length; i++) {
                if (table[i].id === ev.ref) return pickText(table[i].name, mode) || ev.name;
            }
        } catch (e) { /* ignore */ }
        try {
            return String(ev.name || ev.id || 'World event');
        } catch (e) { /* ignore */ }
        return 'World event';
    }

    /* One-line human summary. Accepts an event object, a kind/id string,
     * or nothing (describes the next event). NEVER throws. */
    function describe(input) {
        try {
            var mode = getMode();
            var ev = null;
            if (typeof input === 'string') {
                var key = input.toLowerCase();
                var kind = null;
                if (key.indexOf('spire') !== -1) kind = 'spire-boss';
                else if (key.indexOf('surge') !== -1 || key.indexOf('ley') !== -1) kind = 'ley-surge';
                else if (key.indexOf('mutat') !== -1) kind = 'mutator';
                ev = (kind ? nextOfKind(kind, normNow()) : null) || nextEvent();
            } else if (input && typeof input === 'object') {
                ev = input;
            } else {
                ev = nextEvent();
            }
            var name = eventName(ev, mode);
            var kindLabel = ev.kind === 'spire-boss' ? 'Spire Boss'
                : ev.kind === 'ley-surge' ? 'Ley-Line Surge'
                : ev.kind === 'mutator' ? 'Dungeon Mutator' : 'World event';
            var when;
            try {
                when = Number(ev.startsInMs);
            } catch (e) { when = NaN; }
            if (!isFinite(when)) when = 0;
            if (when <= 0) {
                return mode === 'kid'
                    ? '🎉 LIVE NOW: ' + name + ' (' + kindLabel + ') — come play!'
                    : '🔥 LIVE NOW: ' + name + ' (' + kindLabel + ')';
            }
            return mode === 'kid'
                ? '⏳ In ' + fmtCountdown(when) + ': ' + name + ' (' + kindLabel + ') — get ready, hero!'
                : '⏳ In ' + fmtCountdown(when) + ': ' + name + ' (' + kindLabel + ')';
        } catch (e) {
            try {
                return '⏳ Next world event soon — check back shortly!';
            } catch (ignored) { /* ignore */ }
            return 'Next world event soon.';
        }
    }

    try {
        win.GraveGainMMORPGEvents = {
            VERSION: VERSION,
            nextEvent: nextEvent,
            describe: describe
        };
    } catch (e) { /* ignore */ }

    try {
        win.GraveGainMods = win.GraveGainMods || [];
        win.GraveGainMods.push({ name: 'gravegain-mmorpg-events', version: VERSION, init: function () { return true; } });
    } catch (e) { /* ignore */ }
})();
