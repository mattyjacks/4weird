(function (global) {
    'use strict';
    // GraveGain4DConfig — frozen config contract mirroring GraveGainConfig.
    // Plain script, no imports, fail-open (frozen so callers cannot mutate).
    function freezeDeep(obj) {
        try {
            if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
                var keys = Object.keys(obj);
                for (var i = 0; i < keys.length; i++) {
                    try { freezeDeep(obj[keys[i]]); } catch (_) { /* ignore */ }
                }
                Object.freeze(obj);
            }
        } catch (_) { /* ignore */ }
        return obj;
    }
    var config = {
        difficulty: {
            easy: { puttMultiplier: 1.25, wobble: 0.4, xpMultiplier: 0.75, mulligans: 5 },
            normal: { puttMultiplier: 1.0, wobble: 1.0, xpMultiplier: 1.0, mulligans: 3 },
            nightmare: { puttMultiplier: 0.8, wobble: 2.0, xpMultiplier: 2.5, mulligans: 0 }
        },
        speeds: {
            puttPowerMax: 20,
            puttScale: 1.5,
            ballFriction: 0.92,
            wDrag: 0.96,
            maxSubSteps: 4
        },
        wBounds: { min: -8, max: 8, sliceDefault: 0, thicknessDefault: 2.5, camDistDefault: 3 },
        par: { default: 3, min: 1, max: 7 },
        perf: {
            low: { pixelRatio: 0.75, sampleFrames: 60 },
            medium: { pixelRatio: 1.0, sampleFrames: 90 },
            high: { pixelRatio: 1.5, sampleFrames: 120 }
        },
        ageBands: {
            kids: { wobbleScale: 0.5, puttAssist: 1.3, label: 'kids' },
            standard: { wobbleScale: 1.0, puttAssist: 1.0, label: 'standard' },
            senior: { wobbleScale: 0.7, puttAssist: 1.15, label: 'senior' }
        }
    };
    freezeDeep(config);
    try {
        if (global && !global.GraveGain4DConfig) global.GraveGain4DConfig = config;
    } catch (_) { /* fail-open */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
