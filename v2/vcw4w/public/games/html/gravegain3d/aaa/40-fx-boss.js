/* GraveGain3D AAA - 40 boss.
   Warden arrival gets a full boss-fight intro (letterbox + name slam + roar);
   a warden kill gets bullet-time slow-mo and a BOSS SLAIN callout.
   Detection polls game.activeBoss - no core edits needed. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const SLOWMO_SECONDS = 1.3;
    const SLOWMO_SPEED = '0.3';

    AAA.ready((game) => {
        const c = AAA.container();
        if (!c) return;

        const intro = AAA.mk('aaaBossIntro', 'aaa-boss-intro', c);
        intro.innerHTML = '<div class="aaa-boss-kicker">⚠ WARDEN APPROACHES ⚠</div>' +
            '<div class="aaa-boss-name"></div>' +
            '<div class="aaa-boss-sub">SLAY IT · CLAIM THE DEPTHS</div>';
        const nameEl = intro.querySelector('.aaa-boss-name');

        let hadBoss = false;
        let introTimer = 0;
        let slowmoTimer = 0;
        let savedSpeed = null;

        function campaignExtra() {
            try {
                const m = game.currentMission || null;
                if (!m) return null; // endless mode: no campaign data
                if (m._campaign) return m._campaign;
                if (window.GraveGainCampaign && typeof window.GraveGainCampaign.getExtra === 'function') {
                    return window.GraveGainCampaign.getExtra(m.id) || null;
                }
            } catch (_) { /* ignore */ }
            return null;
        }

        function campaignBossDisplay() {
            try {
                const extra = campaignExtra();
                if (extra && extra.bossDisplay && typeof extra.bossDisplay === 'object') {
                    return extra.bossDisplay;
                }
                // Fallback: mission bossType from the story def.
                const m = game.currentMission || null;
                if (m && typeof m.bossType === 'string' && m.bossType) {
                    return { name: m.bossType, banner: null };
                }
            } catch (_) { /* ignore */ }
            return null;
        }

        function bossName(boss) {
            // Campaign extras win (bossDisplay.name), then live boss, then DOM.
            const display = campaignBossDisplay();
            if (display && typeof display.name === 'string' && display.name) {
                return display.name.toUpperCase();
            }
            if (boss) {
                if (typeof boss.name === 'string' && boss.name) return boss.name.toUpperCase();
                if (typeof boss.title === 'string' && boss.title) return boss.title.toUpperCase();
                if (typeof boss.type === 'string' && boss.type) return boss.type.toUpperCase().replace(/_/g, ' ');
            }
            const dom = document.getElementById('bossName');
            if (dom && dom.textContent.trim()) return dom.textContent.trim().toUpperCase();
            return 'ANCIENT WARDEN';
        }

        function playIntro(boss) {
            nameEl.textContent = bossName(boss);
            clearTimeout(introTimer);
            c.classList.add('aaa-cine');
            intro.classList.add('on');
            AAA.sfx(game, 'explode', 0.6);
            setTimeout(() => AAA.sfx(game, 'spell', 0.7), 250);
            // Campaign boss banner (extras bossDisplay.banner) via combat text.
            try {
                const display = campaignBossDisplay();
                if (display && display.banner && game.combatText &&
                    typeof game.combatText.showBanner === 'function') {
                    game.combatText.showBanner(display.banner);
                }
            } catch (_) { /* banner is garnish */ }
            // Announcer callout through the shared 30 module.
            try {
                if (typeof AAA.announce === 'function') {
                    AAA.announce('⚠ WARDEN APPROACHES ⚠', nameEl.textContent);
                }
            } catch (_) { /* ignore */ }
            introTimer = setTimeout(() => {
                intro.classList.remove('on');
                // Keep bars up only if another cinematic isn't running its own timers.
                setTimeout(() => { if (!intro.classList.contains('on')) c.classList.remove('aaa-cine'); }, 100);
            }, 2400);
            AAA.emit('bossIntro', { name: nameEl.textContent });
        }

        function playSlay() {
            // Bullet time: tint + drop to 0.3x in realtime mode, then restore.
            clearTimeout(slowmoTimer);
            c.classList.add('aaa-slowmo');
            // Slay flash: white-hot fullscreen pulse over the slow-mo tint.
            let flash = document.getElementById('aaaBossSlay');
            if (!flash) {
                flash = document.createElement('div');
                flash.id = 'aaaBossSlay';
                flash.className = 'aaa-boss-slay';
                c.appendChild(flash);
            }
            flash.classList.remove('on');
            void flash.offsetWidth;
            flash.classList.add('on');
            setTimeout(() => flash.classList.remove('on'), 700);
            savedSpeed = null;
            try {
                if (game.controlMode === 'realtime') {
                    savedSpeed = String(game.gameSpeed !== undefined ? game.gameSpeed : '1.0');
                    if (typeof game.setGameSpeed === 'function') game.setGameSpeed(SLOWMO_SPEED);
                    else game.gameSpeed = parseFloat(SLOWMO_SPEED);
                }
            } catch (_) { /* slow-mo is garnish */ }
            // Announcer callout (shared 30 module): campaign boss name when known.
            try {
                const display = campaignBossDisplay();
                const sub = (display && display.name)
                    ? `${display.name} has fallen`.toUpperCase()
                    : 'the depths yield';
                if (typeof AAA.announce === 'function') AAA.announce('BOSS SLAIN', sub);
            } catch (_) {
                if (typeof AAA.announce === 'function') AAA.announce('BOSS SLAIN', 'the depths yield');
            }
            AAA.sfx(game, 'levelup');
            slowmoTimer = setTimeout(() => {
                c.classList.remove('aaa-slowmo');
                try {
                    if (savedSpeed !== null) {
                        if (typeof game.setGameSpeed === 'function') game.setGameSpeed(savedSpeed);
                        else game.gameSpeed = parseFloat(savedSpeed) || 1.0;
                    }
                } catch (_) { /* restore best-effort */ }
            }, SLOWMO_SECONDS * 1000);
            AAA.emit('bossDown', {});
        }

        AAA.onTick((dt, game) => {
            void dt;
            const boss = game.activeBoss || null;
            if (boss && !hadBoss) {
                hadBoss = true;
                playIntro(boss);
            } else if (!boss && hadBoss) {
                hadBoss = false;
                // Only celebrate real slays: the player must be alive to brag.
                if (game.player && !game.player.isDead) playSlay();
            }
        });

        AAA.wrap(game, 'initRun', (orig, ...args) => {
            hadBoss = false;
            clearTimeout(introTimer);
            clearTimeout(slowmoTimer);
            intro.classList.remove('on');
            c.classList.remove('aaa-slowmo');
            return orig(...args);
        });
    });
})();
