/* GraveGain2D AAA - 90 menu upgrade.
   2D adaptation: animated gradient title (see css/60-menu.css), a tagline
   pill, a mission-stars preview row read from the SHARED story progress
   (campaign parity with 3D), daily-challenge polish class, and a Continue
   button when the GraveGain2D save shows real progress. Continue restores
   meta-progress (already loaded by the core loadSave) and jumps straight
   to character select. Never touches the save key, controls, or joystick. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    AAA.ready((game) => {
        const menu = document.getElementById('mainMenuScreen');
        if (!menu) return;

        // Animated gradient title.
        try {
            const title = menu.querySelector('.menu-title');
            if (title && !title.classList.contains('aaa-title-anim')) {
                title.classList.add('aaa-title-anim');
            }
        } catch (_) { /* garnish */ }

        // Tagline pill under the subtitle, added once.
        try {
            const subtitle = menu.querySelector('.menu-subtitle');
            if (subtitle && !menu.querySelector('.aaa-menu-tag')) {
                const tag = document.createElement('div');
                tag.className = 'aaa-menu-tag';
                tag.textContent = 'A 4weird AAA experience · 10-mission campaign';
                subtitle.after(tag);
            }
        } catch (_) { /* garnish */ }

        // Mission stars preview: shared campaign progress (2D & 3D parity).
        try {
            if (!menu.querySelector('.aaa-stars-row') && window.GraveGainStoryEngine &&
                typeof window.GraveGainStoryEngine.getProgress === 'function') {
                const progress = window.GraveGainStoryEngine.getProgress() || {};
                const stars = progress.stars || {};
                const missions = typeof window.GraveGainStoryEngine.getAllMissions === 'function'
                    ? window.GraveGainStoryEngine.getAllMissions()
                    : (window.GraveGainStoryMissions || []);
                if (missions && missions.length) {
                    const row = document.createElement('div');
                    row.className = 'aaa-stars-row';
                    row.title = 'Campaign progress (shared with GraveGain3D)';
                    row.innerHTML = missions.slice(0, 10).map((m) => {
                        const s = stars[m.id] || 0;
                        const done = (progress.completedMissions || []).includes(m.id);
                        const glyph = s >= 3 ? '★★★' : s === 2 ? '★★☆' : s === 1 ? '★☆☆' : '☆☆☆';
                        return `<span class="aaa-star${done ? ' done' : ''}" title="Mission ${m.id}: ${s}/3 stars">${glyph}</span>`;
                    }).join('');
                    const challenges = menu.querySelector('.daily-challenges-container');
                    if (challenges) challenges.before(row);
                    else {
                        const group = menu.querySelector('.btn-group');
                        if (group) group.before(row);
                    }
                }
            }
        } catch (_) { /* garnish */ }

        // Daily challenge styling hook (CSS does the work).
        try {
            const daily = menu.querySelector('.daily-challenges-container');
            if (daily) daily.classList.add('aaa-daily');
        } catch (_) { /* garnish */ }

        // Continue button: only when the save shows real progress.
        let save = null;
        try {
            const raw = localStorage.getItem('GraveGain2D_Save');
            save = raw ? JSON.parse(raw) : null;
        } catch (_) { save = null; }

        const progressed = save && ((save.gold || 0) > 0 || (save.quartersLevel || 1) > 1 || (save.uusd || 0) > 0);
        if (!progressed) return;

        const group = menu.querySelector('.btn-group');
        if (!group || group.querySelector('.aaa-continue-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'btn-game btn-primary aaa-continue-btn';
        btn.textContent = `▶ Continue · ${save.gold || 0} gold · Quarters ${save.quartersLevel || 1}`;
        btn.addEventListener('click', () => {
            document.getElementById('mainMenuScreen').classList.add('hidden');
            document.getElementById('charSelectScreen').classList.remove('hidden');
            try {
                if (typeof game.renderCharSelect === 'function') game.renderCharSelect();
            } catch (e) { console.warn('[AAA] renderCharSelect failed', e); }
        });
        group.prepend(btn);
    });
})();
