/* GraveGain MMO world-boss fronts (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Reads the weekly rotation data passed
 * in by the caller (worldboss.rotation.json) and assesses front reports.
 *
 *   window.GraveGainMMOWorldBoss = {
 *     VERSION, weekIndex, bossForWeek, assess, describe
 *   }
 *
 * Kill rule (from worldboss.rotation.json killRule): total damage must
 * reach threshold AND every front must deal at least 20% of threshold.
 * Every public function is guarded and NEVER throws: on any failure it
 * returns a safe fallback value.
 *
 * Mode contract (mirrors gravegain-mmorpg-events.js): kid band gets cozy
 * copies; no drugs in any band (none exist here).
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var WEEK_MS = 604800000;
    var DEFAULT_MIN_PCT = 20;

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGainMMOWorldBoss) return;

    function normNum(v, fallback) {
        try {
            var n = Number(v);
            if (isFinite(n)) return n;
        } catch (e) { /* ignore */ }
        return fallback;
    }

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

    function normMinPct(v) {
        var n = normNum(v, DEFAULT_MIN_PCT);
        if (!(n > 0)) return DEFAULT_MIN_PCT;
        if (n > 100) return 100;
        return n;
    }

    function bossList(rotation) {
        try {
            if (rotation && rotation.bosses && rotation.bosses.length) return rotation.bosses;
        } catch (e) { /* ignore */ }
        return [];
    }

    function rotationStartMs(rotation) {
        try {
            var t = Date.parse(rotation.rotationStartUtc);
            if (isFinite(t)) return t;
        } catch (e) { /* ignore */ }
        return 0;
    }

    /* Zero-based count of whole weeks since rotation start (clamped at 0). */
    function weekIndex(nowMs, rotation) {
        try {
            var now = normNow(nowMs);
            var start = rotationStartMs(rotation);
            var span = WEEK_MS;
            try {
                var custom = Math.floor(Number(rotation.weekMs));
                if (isFinite(custom) && custom > 0) span = custom;
            } catch (e) { /* ignore */ }
            var d = Math.floor((now - start) / span);
            if (!isFinite(d) || d < 0) return 0;
            return d;
        } catch (e) { /* ignore */ }
        return 0;
    }

    /* Deterministic boss for a UTC week; null when rotation has no bosses. */
    function bossForWeek(nowMs, rotation) {
        try {
            var list = bossList(rotation);
            if (!list.length) return null;
            var i = weekIndex(nowMs, rotation) % list.length;
            if (i < 0) i += list.length;
            return list[i] || null;
        } catch (e) { /* ignore */ }
        return null;
    }

    /* Assess a front damage report against the kill rule.
     * report: { threshold, frontMinimumPct?, fronts: [{ id, damage }] }
     * Returns { kill, total, threshold, minPct, fronts, unmet }.
     * pct figures are percent-of-threshold per front. Never throws. */
    function assess(report) {
        var safe = { kill: false, total: 0, threshold: 0, minPct: DEFAULT_MIN_PCT, fronts: [], unmet: [] };
        try {
            if (!report) return safe;
            var threshold = normNum(report.threshold, 0);
            if (!(threshold > 0)) return safe;
            safe.threshold = threshold;
            var minPct = normMinPct(report.frontMinimumPct);
            safe.minPct = minPct;
            var raws = [];
            try {
                if (report.fronts && report.fronts.length) raws = report.fronts;
            } catch (e) { /* ignore */ }
            if (!raws.length) return safe;
            var total = 0;
            var allMet = true;
            for (var i = 0; i < raws.length; i++) {
                var row = raws[i] || {};
                var id = '';
                try { id = String(row.id == null ? 'front-' + i : row.id); } catch (e) { id = 'front-' + i; }
                var dmg = normNum(row.damage, 0);
                if (!(dmg > 0)) dmg = 0;
                total += dmg;
                var pct = (dmg / threshold) * 100;
                var met = pct >= minPct;
                if (!met) allMet = false;
                safe.fronts.push({ id: id, damage: dmg, pct: pct, met: met });
                if (!met) safe.unmet.push(id);
            }
            safe.total = total;
            safe.kill = total >= threshold && allMet;
            return safe;
        } catch (e) { /* ignore */ }
        return safe;
    }

    function describe(input) {
        try {
            if (!input) return 'No world-boss report.';
            if (typeof input.kill === 'boolean') {
                var total = normNum(input.total, 0);
                var th = normNum(input.threshold, 0);
                var head = input.kill ? 'KILL' : 'HOLD';
                var extra = '';
                try {
                    if (input.unmet && input.unmet.length) extra = ' weak: ' + input.unmet.join(', ');
                } catch (e) { /* ignore */ }
                return head + ' ' + Math.floor(total) + '/' + Math.floor(th) + extra;
            }
            if (input.id) return 'This week: ' + String(input.id) + '.';
            return 'World boss active.';
        } catch (e) { /* ignore */ }
        return 'World boss unknown.';
    }

    win.GraveGainMMOWorldBoss = {
        VERSION: VERSION,
        weekIndex: weekIndex,
        bossForWeek: bossForWeek,
        assess: assess,
        describe: describe
    };
})();
