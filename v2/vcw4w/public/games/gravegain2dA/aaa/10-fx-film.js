/* GraveGain2D AAA - 10 film.
   2D adaptation: installs the film treatment overlays (vignette / grain /
   grade) over #canvasContainer and drives damage flash, heal flash, low-HP
   pulse, and the directional hit indicator. Damage AND heals are detected
   by polling player HP each frame - 2D has no potion method to wrap.
   Camera shake goes through game.camera.applyShake - no core edits needed. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    AAA.ready((game) => {
        const c = AAA.container();
        if (!c) return;

        const vignette = AAA.mk('aaaVignette', 'aaa-vignette', c);
        const grain = AAA.mk('aaaGrain', 'aaa-grain', c);
        const grade = AAA.mk('aaaGrade', 'aaa-grade', c);
        const dmgFlash = AAA.mk('aaaDmgFlash', 'aaa-damage-flash', c);
        const healFlash = AAA.mk('aaaHealFlash', 'aaa-heal-flash', c);
        const lowhp = AAA.mk('aaaLowhp', 'aaa-lowhp', c);
        const dmgDir = AAA.mk('aaaDmgDir', 'aaa-dmg-dir', c);
        void vignette; void grain; void grade;

        // Per-floor color grade follows the title-card module's floor events.
        AAA.on('floor', (info) => {
            if (info && info.grade) c.dataset.grade = info.grade;
        });

        let lastPlayer = null;
        let lastHp = 0;
        let flashTimer = 0;
        let healTimer = 0;
        let healCooldown = 0;

        function nearestEnemyAngle(game) {
            const p = game.player;
            if (!p || !game.enemies || !game.enemies.length) return null;
            let best = null;
            let bestDist = 620;
            for (const e of game.enemies) {
                if (e.hp !== undefined && e.hp <= 0) continue;
                const d = Math.hypot((e.x || 0) - p.x, (e.y || 0) - p.y);
                if (d < bestDist) { bestDist = d; best = e; }
            }
            if (!best) return null;
            const world = Math.atan2(best.y - p.y, best.x - p.x);
            // Screen-relative: subtract the player's facing angle.
            return world - (p.angle || 0) + Math.PI / 2;
        }

        AAA.onTick((dt, game) => {
            const p = game.player;
            if (!p || p.isDead) {
                lowhp.classList.remove('on');
                lastPlayer = p || null;
                lastHp = p ? p.hp : 0;
                return;
            }
            if (p !== lastPlayer) {
                lastPlayer = p;
                lastHp = p.hp;
                lowhp.classList.remove('on');
                return;
            }

            healCooldown = Math.max(0, healCooldown - dt);

            // --- Damage detection -------------------------------------------------
            const lost = lastHp - p.hp;
            if (lost > 0.5) {
                dmgFlash.classList.add('on');
                clearTimeout(flashTimer);
                flashTimer = setTimeout(() => dmgFlash.classList.remove('on'), 150);

                const ang = nearestEnemyAngle(game);
                dmgDir.style.setProperty('--rot', `${ang !== null ? ang : Math.random() * Math.PI * 2}rad`);
                dmgDir.classList.remove('on');
                void dmgDir.offsetWidth;
                dmgDir.classList.add('on');

                try {
                    if (game.camera && typeof game.camera.applyShake === 'function') {
                        game.camera.applyShake(Math.min(6, 1.5 + lost * 0.06));
                    }
                } catch (_) { /* shake is garnish */ }

                AAA.emit('hurt', { lost, hp: p.hp, maxHp: p.maxHp });
            } else if (p.hp - lastHp > 5 && healCooldown <= 0) {
                // --- Heal detection (level-ups, pickups): green wash --------------
                healCooldown = 1.5;
                healFlash.classList.add('on');
                clearTimeout(healTimer);
                healTimer = setTimeout(() => healFlash.classList.remove('on'), 380);
                AAA.emit('heal', { hp: p.hp, maxHp: p.maxHp });
            }
            lastHp = p.hp;

            // --- Low-HP heartbeat --------------------------------------------------
            const frac = p.maxHp > 0 ? p.hp / p.maxHp : 1;
            if (frac < 0.32) lowhp.classList.add('on');
            else lowhp.classList.remove('on');
        });
    });
})();
