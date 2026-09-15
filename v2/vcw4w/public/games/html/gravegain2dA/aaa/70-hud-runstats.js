/* GraveGain2D AAA - 70 run stats.
   2D adaptation: owns the run clock, resets shots/hits/combo on initRun,
   counts melee swings (triggerMeleeSwing, return = confirmed hits) for
   accuracy, and stamps a stats ribbon (time · accuracy · best combo ·
   depth · kills · gold) onto the game-over screen next to the existing
   #go* fields - extending, never replacing, core content. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    function fmtTime(ms) {
        const s = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(s / 60);
        return `${m}:${String(s % 60).padStart(2, '0')}`;
    }

    AAA.ready((game) => {
        AAA.wrap(game, 'initRun', (orig, ...args) => {
            AAA.state.runStart = Date.now();
            AAA.state.shots = 0;
            AAA.state.hits = 0;
            AAA.state.maxCombo = 0;
            AAA.state.streak = 0;
            // Drop last run's ribbon so stats never stack.
            const old = document.querySelector('#gameOverScreen .aaa-runstats');
            if (old) old.remove();
            const out = orig(...args);
            AAA.emit('runStart', { at: AAA.state.runStart });
            return out;
        });

        // Each swing is a trigger pull; its return value is confirmed hits.
        AAA.wrap(game, 'triggerMeleeSwing', (orig, ...args) => {
            AAA.state.shots += 1;
            const out = orig(...args);
            try {
                if (typeof out === 'number' && out > 0) AAA.state.hits += out;
            } catch (_) { /* counting is garnish */ }
            return out;
        });

        AAA.wrap(game, 'gameOver', (orig, victory, ...rest) => {
            const out = orig(victory, ...rest);
            try {
                const screen = document.getElementById('gameOverScreen');
                const box = screen ? screen.querySelector('.menu-content > div[style]') : null;
                if (screen && box && !box.querySelector('.aaa-runstats')) {
                    const shots = AAA.state.shots || 0;
                    const hits = AAA.state.hits || 0;
                    const acc = shots > 0 ? Math.round((hits / shots) * 100) : 0;
                    const missionComplete = victory && game.currentMission && game.currentMission.completed;
                    const gold = (game.runGold || 0) +
                        (missionComplete ? (game.currentMission.rewardGold || 0) : 0);
                    const ribbon = document.createElement('div');
                    ribbon.className = 'aaa-runstats';
                    const cells = [
                        [fmtTime(Date.now() - (AAA.state.runStart || Date.now())), 'Run time'],
                        [`${acc}%`, 'Accuracy'],
                        [`${AAA.state.maxCombo || 0}`, 'Best combo'],
                        [`Layer ${game.floorIndex || 1}`, 'Depth'],
                        [`${game.runKills || 0}`, 'Kills'],
                        [`${gold}`, 'Gold']
                    ];
                    ribbon.innerHTML = cells
                        .map(([v, k]) => `<div class="aaa-runstat"><div class="v">${v}</div><div class="k">${k}</div></div>`)
                        .join('');
                    box.appendChild(ribbon);
                }
            } catch (e) { console.warn('[AAA] run-stats ribbon failed', e); }
            AAA.emit('runEnd', { victory: !!victory });
            return out;
        });
    });
})();
