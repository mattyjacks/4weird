/* GraveGain MMO warband sigil banners (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Builds inline SVG banner strings for
 * the sigils listed in warbands.json so any game page can stamp a
 * warband banner without fetching image assets.
 *
 *   window.GraveGainMMOWarbandBanner = { VERSION, SIGILS, list, svgFor }
 *
 * svgFor(sigilId, primary, secondary) always returns a string (a safe
 * fallback banner on any bad input) and NEVER throws. Colors outside
 * #rrggbb fall back to the sigil default pair. All output is ASCII.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var W = 96;
    var H = 120;

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGainMMOWarbandBanner) return;

    var SIGILS = ['lantern', 'wave', 'moon', 'fang', 'skull', 'surge'];

    var DEFAULT_PAIRS = {
        lantern: ['#c2410c', '#fbbf24'],
        wave: ['#0369a1', '#67e8f9'],
        moon: ['#6d28d9', '#e9d5ff'],
        fang: ['#166534', '#bef264'],
        skull: ['#3f3f46', '#fafafa'],
        surge: ['#0e7490', '#f0abfc']
    };

    function normSigil(id) {
        try {
            var s = String(id == null ? '' : id).toLowerCase();
            for (var i = 0; i < SIGILS.length; i++) {
                if (SIGILS[i] === s) return s;
            }
        } catch (e) { /* ignore */ }
        return 'skull';
    }

    function normColor(v, fallback) {
        try {
            var s = String(v == null ? '' : v);
            if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
        } catch (e) { /* ignore */ }
        return fallback;
    }

    /* Inner sigil artwork per id, drawn in the accent color (c2). */
    function sigilArt(id, c2) {
        try {
            if (id === 'lantern') {
                return '<rect x="38" y="38" width="20" height="30" rx="6" fill="' + c2 + '"/>'
                    + '<rect x="43" y="30" width="10" height="8" rx="2" fill="' + c2 + '"/>'
                    + '<rect x="43" y="68" width="10" height="6" rx="2" fill="' + c2 + '"/>'
                    + '<circle cx="48" cy="53" r="6" fill="#1c1917"/>';
            }
            if (id === 'wave') {
                return '<path d="M22 62 q9 -14 18 0 t18 0 t18 0" stroke="' + c2 + '" stroke-width="7" fill="none" stroke-linecap="round"/>'
                    + '<path d="M22 80 q9 -14 18 0 t18 0 t18 0" stroke="' + c2 + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
            }
            if (id === 'moon') {
                return '<path d="M62 34 a26 26 0 1 0 12 48 a20 20 0 1 1 -12 -48 z" fill="' + c2 + '"/>'
                    + '<circle cx="60" cy="44" r="3" fill="' + c2 + '"/>';
            }
            if (id === 'fang') {
                return '<path d="M34 36 l14 44 l6 -20 l6 20 l14 -44 z" fill="' + c2 + '"/>';
            }
            if (id === 'surge') {
                return '<path d="M54 30 l-20 34 h12 l-6 22 l22 -36 h-12 z" fill="' + c2 + '"/>';
            }
            /* skull (also the fallback) */
            return '<circle cx="48" cy="54" r="17" fill="' + c2 + '"/>'
                + '<rect x="37" y="62" width="22" height="12" rx="3" fill="' + c2 + '"/>'
                + '<circle cx="42" cy="53" r="4" fill="#1c1917"/>'
                + '<circle cx="54" cy="53" r="4" fill="#1c1917"/>';
        } catch (e) { /* ignore */ }
        return '';
    }

    function list() {
        try {
            return SIGILS.slice();
        } catch (e) { /* ignore */ }
        return [];
    }

    /* Full banner SVG string for a sigil + color pair. Never throws. */
    function svgFor(sigilId, primary, secondary) {
        try {
            var id = normSigil(sigilId);
            var pair = DEFAULT_PAIRS[id] || DEFAULT_PAIRS.skull;
            var c1 = normColor(primary, pair[0]);
            var c2 = normColor(secondary, pair[1]);
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 96 120" role="img">'
                + '<path d="M14 6 h68 v78 l-34 30 l-34 -30 z" fill="' + c1 + '"/>'
                + '<path d="M20 12 h56 v68 l-28 25 l-28 -25 z" fill="none" stroke="' + c2 + '" stroke-width="3"/>'
                + '<circle cx="48" cy="24" r="5" fill="' + c2 + '"/>'
                + sigilArt(id, c2)
                + '</svg>';
            return svg;
        } catch (e) { /* ignore */ }
        try {
            return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 96 120" role="img">'
                + '<path d="M14 6 h68 v78 l-34 30 l-34 -30 z" fill="#3f3f46"/></svg>';
        } catch (e2) { /* ignore */ }
        return '';
    }

    win.GraveGainMMOWarbandBanner = {
        VERSION: VERSION,
        SIGILS: SIGILS,
        list: list,
        svgFor: svgFor
    };
})();
