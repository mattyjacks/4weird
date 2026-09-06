(function () {
    'use strict';

    class GraveGainSaveSystem {
        static save(game) {
            localStorage.setItem('GraveGain3D_Save_V2', JSON.stringify({
                gold: game.gold,
                uusd: game.uusd,
                quartersLevel: game.quartersLevel,
                armoryRanks: game.armoryRanks,
                botanyCrops: game.botanyCrops,
                difficulty: game.difficulty
            }));
        }

        static load() {
            const data = localStorage.getItem('GraveGain3D_Save_V2');
            try { return data ? JSON.parse(data) : null; } catch (_) { return null; }
        }
    }

    window.GraveGainSaveSystem = GraveGainSaveSystem;
})();
