/* GraveGain4D Weapon Factory — DS-GRAV4D-04 (games lane, grav4d-04)
 * Bridge over GraveGainWeaponFactory.buildWeapon + GraveGain3DModels weapons.
 * Exposes: window.GraveGain4DWeapons { VERSION, MODEL_LIST, PUTTERS, build4D, list }
 */
(function () {
    'use strict';
    if (window.GraveGain4DWeapons && window.GraveGain4DWeapons.VERSION) return;
    var VERSION = '1.0.0';

    // 20-model list: 4 class bases x5 finish variants (passthrough names; no bytes).
    var FINISHES = ['iron', 'silver', 'gold', 'astral', 'void'];
    var BASES = ['warrior', 'tank', 'mage', 'support'];
    var MODEL_LIST = [];
    BASES.forEach(function (b) {
        FINISHES.forEach(function (f) { MODEL_LIST.push(b + '-' + f); });
    });

    // 4 golf-putter variants (soul-putt line).
    var PUTTERS = [
        { key: 'soul-putter-aelindra', label: 'Soul-Putter of Aelindra', emoji: '\u26F3\uFE0F', puttPower: 1.2, echo: 'grove' },
        { key: 'void-putter-citadel',  label: 'Void-Putter of the Citadel', emoji: '\uD83C\uDF11', puttPower: 1.4, echo: 'dark' },
        { key: 'brass-putter-vault',   label: 'Brass-Putter of the Vault', emoji: '\uD83C\uDFC6', puttPower: 1.1, echo: 'gold' },
        { key: 'echo-putter-clint',    label: 'Echo-Putter of Clint', emoji: '\uD83E\uDE9E', puttPower: 1.5, echo: 'clint' }
    ];

    function bridgeBase(classType) {
        try {
            if (typeof window.GraveGainWeaponFactory !== 'undefined' &&
                window.GraveGainWeaponFactory && typeof window.GraveGainWeaponFactory.buildWeapon === 'function') {
                return { node: window.GraveGainWeaponFactory.buildWeapon(classType), kind: 'GraveGainWeaponFactory' };
            }
        } catch (_) { /* fall through */ }
        try {
            if (typeof window.GraveGain3DModels !== 'undefined' &&
                window.GraveGain3DModels && typeof window.GraveGain3DModels.buildWeapon === 'function') {
                return { node: window.GraveGain3DModels.buildWeapon(classType), kind: 'GraveGain3DModels' };
            }
        } catch (_) { /* fall through */ }
        return { node: { descriptor: true, classType: classType }, kind: 'emoji' };
    }

    // build4D(classType, opts): base bridge + W-blade/echo-trail metadata for the 4D renderer.
    function build4D(classType, opts) {
        opts = opts || {};
        var bridged = bridgeBase(classType);
        var putter = null;
        if (opts.putter) {
            for (var i = 0; i < PUTTERS.length; i++) {
                if (PUTTERS[i].key === opts.putter) { putter = PUTTERS[i]; break; }
            }
        }
        var wBlade = {
            // W-blade: second edge offset along w so the 4D renderer can draw the echo trail.
            wOffset: (opts.wOffset !== undefined) ? opts.wOffset : 0.35,
            echoLength: opts.echoLength || 6,
            echoColor: opts.echoColor || 0x8b5cf6,
            trail: [] // renderer pushes {x,y,z,w,t} here
        };
        return {
            classType: classType,
            node: bridged.node,
            bridgeKind: bridged.kind,
            wBlade: wBlade,
            putter: putter,
            swing: { arc: Math.PI / 3, speed: 6.0 },
            putt: putter ? { power: putter.puttPower, echo: putter.echo } : null
        };
    }

    function list() { return MODEL_LIST.slice(); }

    window.GraveGain4DWeapons = {
        VERSION: VERSION, MODEL_LIST: MODEL_LIST, PUTTERS: PUTTERS,
        build4D: build4D, list: list, bridgeBase: bridgeBase
    };
})();
