/* GraveGain2D AAA — 50 objectives.
   2D adaptation: binds to the EXISTING #missionTracker /
   #missionObjectiveText HUD (never replaces core rendering) and enriches
   it after every core updateMissionUI: story contract with live progress,
   boss bounty with live HP, or the descent directive with hostile count —
   each suffixed with the run kill tally. Flashes on change. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    AAA.ready((game) => {
        const tracker = document.getElementById('missionTracker');
        const text = document.getElementById('missionObjectiveText');
        if (!tracker || !text) return;

        let lastText = '';

        function liveBoss() {
            try {
                const list = game.enemies || [];
                for (const e of list) {
                    if (e && e.type === 'boss' && (e.hp === undefined || e.hp > 0)) return e;
                }
            } catch (_) { /* ignore */ }
            return null;
        }

        function bossHp(boss) {
            try {
                if (typeof boss.hp === 'number' && typeof boss.maxHp === 'number' && boss.maxHp > 0) {
                    return ` · ${Math.max(0, Math.round((boss.hp / boss.maxHp) * 100))}%`;
                }
            } catch (_) { /* ignore */ }
            return '';
        }

        function bossLabel(boss) {
            try {
                const m = game.currentMission || null;
                if (m && typeof m.bossType === 'string' && m.bossType) return m.bossType;
            } catch (_) { /* ignore */ }
            return (boss && boss.name) || 'THE WARDEN';
        }

        function suffix() {
            return ` · ⚔ ${game.runKills || 0} kills`;
        }

        // Wrap — never replace — the core renderer: let it paint first,
        // then append the live AAA suffix.
        AAA.wrap(game, 'updateMissionUI', (orig, ...args) => {
            const out = orig(...args);
            try {
                if (tracker.classList.contains('hidden')) return out;
                const boss = liveBoss();
                let extra = '';
                if (boss) {
                    extra = ` · ☠ ${bossLabel(boss)}${bossHp(boss)}`;
                } else if (!game.currentMission) {
                    const hostiles = (game.enemies || []).filter((e) => e.hp === undefined || e.hp > 0).length;
                    extra = ` · Layer ${game.floorIndex || 1} · ${hostiles} hostile${hostiles === 1 ? '' : 's'}`;
                }
                const key = `${text.textContent}|${extra}|${game.runKills || 0}`;
                if (key !== lastText) {
                    lastText = key;
                    // Strip our previous suffix before re-appending (idempotent).
                    const base = text.textContent.split(' · ⚔ ')[0].split(' · ☠ ')[0].split(' · Layer ')[0];
                    text.textContent = `${base}${extra}${suffix()}`;
                    tracker.classList.remove('aaa-flash');
                    void tracker.offsetWidth;
                    tracker.classList.add('aaa-flash');
                }
            } catch (e) { console.warn('[AAA] objective enrich failed', e); }
            return out;
        });

        // Kills / boss HP change between core updates — refresh at 2 Hz so
        // the tracker stays live without fighting the core renderer.
        let acc = 0;
        AAA.onTick((dt, g) => {
            acc += dt;
            if (acc < 0.5) return;
            acc = 0;
            try {
                if (!g.player || g.player.isDead) return;
                if (typeof g.updateMissionUI === 'function') g.updateMissionUI();
            } catch (_) { /* never fatal */ }
        });
    });
})();
