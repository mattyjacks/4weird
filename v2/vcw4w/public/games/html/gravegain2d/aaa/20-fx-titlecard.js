/* GraveGain2D AAA - 20 title cards.
   2D adaptation: every dungeon layer opens with a cinematic DOM card -
   letterbox bars slide in, the layer name slams on, the color grade shifts,
   then play resumes. Hooks buildDungeonLayer, so story runs, endless runs,
   and descents all get the treatment with zero core edits. Mission cards
   read game.currentMission (title / subtitle / location / bossType from the
   shared story engine) - skippable by click/tap, auto-dismiss. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const FLOORS = [
        { name: 'THE BREACH', sub: 'Perimeter collapse · threat minimal', grade: 'crypt' },
        { name: 'EMBER CRYPTS', sub: 'The stone still burns here', grade: 'ember' },
        { name: 'VERDANT HOLLOW', sub: 'Something grows in the dark', grade: 'verdant' },
        { name: 'THE VOID CHOIR', sub: 'Listen. It sings back.', grade: 'void' },
        { name: 'MARROW DEEP', sub: 'The moon remembers every bone', grade: 'marrow' }
    ];
    const ENDLESS_GRADES = ['void', 'marrow', 'ember', 'crypt', 'verdant'];

    function floorInfo(n) {
        if (n >= 1 && n <= FLOORS.length) return { n, ...FLOORS[n - 1] };
        return {
            n,
            name: 'THE HOLLOW INFINITE',
            sub: `Depth ${n} · the dark learns your name`,
            grade: ENDLESS_GRADES[n % ENDLESS_GRADES.length]
        };
    }

    AAA.ready((game) => {
        const c = AAA.container();
        if (!c) return;

        const barTop = AAA.mk('aaaBarTop', 'aaa-bar top', c);
        const barBottom = AAA.mk('aaaBarBottom', 'aaa-bar bottom', c);
        void barTop; void barBottom;

        const card = AAA.mk('aaaTitlecard', 'aaa-titlecard', c);
        card.innerHTML = '<div class="aaa-kicker"></div>' +
            '<div class="aaa-title"></div>' +
            '<div class="aaa-sub"></div>' +
            '<div class="aaa-rule"></div>';
        const kickerEl = card.querySelector('.aaa-kicker');
        const titleEl = card.querySelector('.aaa-title');
        const subEl = card.querySelector('.aaa-sub');

        let hideTimer = 0;
        let barTimer = 0;

        // Click/tap skips any card (mission intros especially) - endless-safe.
        card.style.pointerEvents = 'auto';
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            clearTimeout(hideTimer);
            clearTimeout(barTimer);
            card.classList.remove('on');
            c.classList.remove('aaa-cine');
        });

        function showMissionCard(mission) {
            if (!mission) return; // endless mode: floor card only
            AAA.state.floor = game.floorIndex || mission.minFloor || 1;
            const id = mission.id !== undefined && mission.id !== null ? mission.id : '?';
            kickerEl.textContent = `- Mission ${id} -`;
            titleEl.style.animation = 'none';
            void titleEl.offsetWidth;
            titleEl.style.animation = '';
            titleEl.textContent = (mission.title || `MISSION ${id}`).toUpperCase();
            const sub = mission.subtitle || '';
            const loc = mission.location || '';
            const threat = mission.bossType ? `☠ ${mission.bossType}` : '';
            subEl.textContent = [sub, loc, threat].filter(Boolean).join(' · ');

            clearTimeout(hideTimer);
            clearTimeout(barTimer);
            c.classList.add('aaa-cine');
            card.classList.add('on');
            hideTimer = setTimeout(() => card.classList.remove('on'), 2500);
            barTimer = setTimeout(() => c.classList.remove('aaa-cine'), 3100);

            AAA.sfx(game, 'ability');
            AAA.emit('missionCard', { id });
            AAA.emit('missionStart', { id });
        }

        function showCard(n) {
            const info = floorInfo(n);
            AAA.state.floor = n;
            c.dataset.grade = info.grade;
            kickerEl.textContent = `- Layer ${n} -`;
            // Retrigger the slam-in animation on repeat visits.
            titleEl.style.animation = 'none';
            void titleEl.offsetWidth;
            titleEl.style.animation = '';
            titleEl.textContent = info.name;
            subEl.textContent = info.sub;

            clearTimeout(hideTimer);
            clearTimeout(barTimer);
            c.classList.add('aaa-cine');
            card.classList.add('on');
            hideTimer = setTimeout(() => card.classList.remove('on'), 2300);
            barTimer = setTimeout(() => c.classList.remove('aaa-cine'), 2900);

            AAA.emit('floor', { n, name: info.name, grade: info.grade });
        }

        // buildDungeonLayer runs on run start AND every descent,
        // so one hook covers every layer reveal in every mode.
        AAA.wrap(game, 'buildDungeonLayer', (orig, ...args) => {
            const out = orig(...args);
            try {
                const n = game.floorIndex || 1;
                showCard(n);
            } catch (e) { console.warn('[AAA] title card failed', e); }
            return out;
        });

        // Mission intro card: fires once per run start, AFTER initRun has
        // cloned currentMission. Endless guard: no currentMission → no-op,
        // so endless keeps the plain floor card. Deferred slightly so it
        // overrides (not stacks with) the floor card from the rebuild.
        AAA.wrap(game, 'initRun', (orig, ...args) => {
            const out = orig(...args);
            try {
                const mission = game.currentMission || null;
                if (!mission) return out; // endless mode: floor card only
                setTimeout(() => {
                    try {
                        if (game.currentMission) showMissionCard(game.currentMission);
                    } catch (e) { console.warn('[AAA] mission card failed', e); }
                }, 150);
            } catch (e) { console.warn('[AAA] mission card hook failed', e); }
            return out;
        });
    });
})();
