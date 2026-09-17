(function () {
    'use strict';

    window.GraveGainConfig = Object.freeze({
        difficulty: Object.freeze({
            easy: Object.freeze({ hpMultiplier: 0.6, damageMultiplier: 0.5, xpMultiplier: 0.75, lootMultiplier: 1.5 }),
            normal: Object.freeze({ hpMultiplier: 1, damageMultiplier: 1, xpMultiplier: 1, lootMultiplier: 1 }),
            nightmare: Object.freeze({ hpMultiplier: 2.5, damageMultiplier: 2, xpMultiplier: 2.5, lootMultiplier: 0.6 })
        }),
        render: Object.freeze({ minPixelRatio: 0.75, maxPixelRatio: 1.5, sampleFrames: 90 })
    });
})();
