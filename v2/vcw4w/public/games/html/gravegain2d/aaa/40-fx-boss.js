/* GraveGain2D AAA — 40 boss.
   2D adaptation: 2D has no game.activeBoss — a boss is any live enemy with
   type === 'boss' (ambient floor 6+ threats and story slay_boss targets
   alike). Arrival gets a full boss-fight intro (letterbox + name slam);
   a boss kill gets bullet-time slow-mo (2D setGameSpeed clamps to 0.5x),
   a gold ring burst through the game's ParticleSystem, and a BOSS SLAIN
   callout. Owns the #bossBarContainer HP bar — 2D has none natively.
   Detection polls game.enemies — no core edits needed. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const SLOWMO_SECONDS = 1.3;
    const SLOWMO_SPEED = '0.5'; // 2D setGameSpeed clamps to [0.5, 2]

    AAA.ready((game) => {
        const c = AAA.container();
        if (!c) return;

        const intro = AAA.mk('aaaBossIntro', 'aaa-boss-intro', c);
        intro.innerHTML = '<div class="aaa-boss-kicker">⚠ WARDEN APPROACHES ⚠</div>' +
            '<div class="aaa-boss-name"></div>' +
            '<div class="aaa-boss-sub">SLAY IT · CLAIM THE DEPTHS</div>';
        const nameEl = intro.querySelector('.aaa-boss-name');

        // Boss HP bar (2D has no native one): name + fill, top of viewport.
        const bar = AAA.mk('aaaBossBar', 'aaa-bossbar', c);
        bar.innerHTML = '<div class="aaa-bossbar-name"></div>' +
            '<div class="aaa-bossbar-track"><div class="aaa-bossbar-fill"></div></div>';
        const barName = bar.querySelector('.aaa-bossbar-name');
        const barFill = bar.querySelector('.aaa-bossbar-fill');

        let hadBoss = false;
        let lastX = 0;
        let lastY = 0;
        let introTimer = 0;
        let slowmoTimer = 0;
        let savedSpeed = null;

        function liveBoss() {
            try {
                const list = game.enemies || [];
                for (const e of list) {
                    if (e && e.type === 'boss' && (e.hp === undefined || e.hp > 0)) return e;
                }
            } catch (_) { /* ignore */ }
            return null;
        }

        function bossName(boss) {
            // Story bossType wins, then the live enemy, then a fallback.
            try {
                const m = game.currentMission || null;
                if (m && typeof m.bossType === 'string' && m.bossType) {
                    return m.bossType.toUpperCase();
                }
            } catch (_) { /* ignore */ }
            if (boss) {
                if (typeof boss.name === 'string' && boss.name) return boss.name.toUpperCase();
                if (typeof boss.title === 'string' && boss.title) return boss.title.toUpperCase();
            }
            return 'ANCIENT WARDEN';
        }

        function playIntro(boss) {
            const name = bossName(boss);
            nameEl.textContent = name;
            barName.textContent = `☠ ${name}`;
            bar.classList.add('on');
            clearTimeout(introTimer);
            c.classList.add('aaa-cine');
            intro.classList.add('on');
            AAA.sfx(game, 'hit');
            setTimeout(() => AAA.sfx(game, 'ability'), 250);
            introTimer = setTimeout(() => {
                intro.classList.remove('on');
                // Keep bars up only if another cinematic isn't running its own timers.
                setTimeout(() => { if (!intro.classList.contains('on')) c.classList.remove('aaa-cine'); }, 100);
            }, 2400);
            AAA.emit('bossIntro', { name });
        }

        function playSlay() {
            // Bullet time: tint + drop to 0.5x in realtime mode, then restore.
            clearTimeout(slowmoTimer);
            c.classList.add('aaa-slowmo');
            bar.classList.remove('on');
            savedSpeed = null;
            try {
                if (game.controlMode === 'realtime') {
                    savedSpeed = String(game.gameSpeed !== undefined ? game.gameSpeed : '1');
                    if (typeof game.setGameSpeed === 'function') game.setGameSpeed(SLOWMO_SPEED);
                    else game.gameSpeed = parseFloat(SLOWMO_SPEED);
                }
            } catch (_) { /* slow-mo is garnish */ }
            try {
                if (game.vfx && typeof game.vfx.spawnRing === 'function') {
                    game.vfx.spawnRing(lastX, lastY, 'gold', 140, 0.6);
                    game.vfx.spawnSparks(lastX, lastY, 'gold', 16);
                    if (typeof game.vfx.spawnExplosionVFX === 'function') {
                        game.vfx.spawnExplosionVFX(lastX, lastY);
                    }
                }
            } catch (_) { /* canvas FX is garnish */ }
            if (typeof AAA.announce === 'function') AAA.announce('BOSS SLAIN', 'the depths yield');
            AAA.sfx(game, 'loot');
            slowmoTimer = setTimeout(() => {
                c.classList.remove('aaa-slowmo');
                try {
                    if (savedSpeed !== null) {
                        if (typeof game.setGameSpeed === 'function') game.setGameSpeed(savedSpeed);
                        else game.gameSpeed = parseFloat(savedSpeed) || 1;
                    }
                } catch (_) { /* restore best-effort */ }
            }, SLOWMO_SECONDS * 1000);
            AAA.emit('bossDown', {});
        }

        AAA.onTick((dt, game) => {
            void dt;
            const boss = liveBoss();
            if (boss) {
                lastX = boss.x || 0;
                lastY = boss.y || 0;
                try {
                    if (typeof boss.hp === 'number' && typeof boss.maxHp === 'number' && boss.maxHp > 0) {
                        barFill.style.width = `${Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100))}%`;
                    }
                } catch (_) { /* bar is garnish */ }
            }
            if (boss && !hadBoss) {
                hadBoss = true;
                playIntro(boss);
            } else if (!boss && hadBoss) {
                hadBoss = false;
                bar.classList.remove('on');
                // Only celebrate real slays: the player must be alive to brag.
                if (game.player && !game.player.isDead) playSlay();
            }
        });

        AAA.wrap(game, 'initRun', (orig, ...args) => {
            hadBoss = false;
            clearTimeout(introTimer);
            clearTimeout(slowmoTimer);
            intro.classList.remove('on');
            bar.classList.remove('on');
            c.classList.remove('aaa-slowmo');
            return orig(...args);
        });
    });
})();
