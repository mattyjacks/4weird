/* GraveGain3D AAA - 60 tutorial.
   First-run coach marks: a short bottom-center toast chain teaching move,
   look, attack, block, potion, and the portal goal. Shows once ever
   (localStorage), fast-forwards to the goal tip on first blood. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const FLAG = 'GraveGain3D_AAA_Tutorial';

    AAA.ready(() => {
        let seen = false;
        try { seen = localStorage.getItem(FLAG) === 'done'; } catch (_) { seen = true; }
        if (seen) return;

        const touch = document.body.classList.contains('touch-enabled');
        const steps = touch
            ? [
                '<b>LEFT STICK</b> to move through the crypt',
                'Drag the <b>RIGHT SIDE</b> to look · tap ⚔️ to attack',
                'Tap 🛡️ to block · ⚡ for your class ability',
                'Tap 🧪 to heal · find the ⬇ <b>portal</b> to descend'
            ]
            : [
                '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move through the crypt',
                '<b>MOUSE</b> to look · <b>LEFT-CLICK</b> to attack',
                '<b>RIGHT-CLICK</b> to block · <b>F</b> for your class ability',
                '<b>Q</b> to heal · find the ⬇ <b>portal</b> to descend'
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
