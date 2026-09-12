/* GraveGain3D AAA — main-menu treatment: tagline pill, animated title
   glow (see 60-menu.css), and a Continue button when a starship save exists.
   Continue restores meta-progress (already loaded by the core loadSave) and
   jumps straight to character select. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    AAA.ready((game) => {
        const menu = document.getElementById('mainMenuScreen');
        if (!menu) return;

        // Tagline pill under the subtitle, added once.
        const subtitle = menu.querySelector('.menu-subtitle');
        if (subtitle && !menu.querySelector('.aaa-menu-tag')) {
            const tag = document.createElement('div');
            tag.className = 'aaa-menu-tag';
            tag.textContent = 'A 4weird AAA experience';
            subtitle.after(tag);
        }

        // Continue button: only when the save shows real progress.
        let save = null;
        try {
            save = window.GraveGainSaveSystem && typeof window.GraveGainSaveSystem.load === 'function'
                ? window.GraveGainSaveSystem.load()
                : null;
        } catch (_) { save = null; }

        const progressed = save && ((save.gold || 0) > 0 || (save.quartersLevel || 1) > 1 || (save.uusd || 0) !== 250);
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
