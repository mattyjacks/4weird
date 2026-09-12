/* GraveGain2D AAA - 60 tutorial.
   2D adaptation: first-run coach marks as bottom-center toasts teaching the
   2D control scheme (WASD / click attack / right-click block / F or Shift
   ability / loot + safespace goal). Shows once ever (localStorage),
   fast-forwards to the goal tip on first blood. Dismissable by click. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const FLAG = 'GraveGain2D_AAA_Tutorial';

    AAA.ready(() => {
        let seen = false;
        try { seen = localStorage.getItem(FLAG) === 'done'; } catch (_) { seen = true; }
        if (seen) return;

        const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const steps = touch
            ? [
                'Use the <b>LEFT STICK</b> to move through the dungeon',
                'Tap ⚔️ to attack · 🛡️ to block · ✦ for your race ability',
                'Grab 🪙 gold & gear - find the <b>safespace terminal</b> to descend'
            ]
            : [
                '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows to move · <b>LEFT-CLICK</b> to attack',
                '<b>RIGHT-CLICK</b> to block · <b>F</b> or <b>Shift</b> for your race ability',
                'Loot 🪙 gold from the fallen - reach the <b>safespace terminal</b> to descend'
            ];

        const toast = AAA.mk('aaaToast', 'aaa-toast');
        let started = false;
        let done = false;
        let timer = 0;
        let idx = 0;

        function finish() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            toast.classList.remove('on');
            try { localStorage.setItem(FLAG, 'done'); } catch (_) { /* private mode */ }
        }

        function show(i) {
            if (done) return;
            if (i >= steps.length) { finish(); return; }
            idx = i;
            toast.innerHTML = steps[i];
            toast.classList.add('on');
            clearTimeout(timer);
            timer = setTimeout(() => {
                toast.classList.remove('on');
                timer = setTimeout(() => show(i + 1), 350);
            }, 3200);
        }

        // Click dismisses the current tip and advances.
        toast.addEventListener('click', () => {
            if (done) return;
            clearTimeout(timer);
            toast.classList.remove('on');
            timer = setTimeout(() => show(idx + 1), 250);
        });

        AAA.on('runStart', () => {
            if (started || done) return;
            started = true;
            setTimeout(() => show(0), 3200); // let the title card land first
        });

        // First blood means the basics clicked - jump to the goal tip.
        AAA.on('kill', () => {
            if (!started || done || idx >= steps.length - 1) return;
            clearTimeout(timer);
            toast.classList.remove('on');
            timer = setTimeout(() => show(steps.length - 1), 400);
        });

        AAA.on('runEnd', () => { if (!done) finish(); });
    });
})();
