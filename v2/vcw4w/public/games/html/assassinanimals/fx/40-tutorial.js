/* AssassinAnimals FX — 40 tutorial.
   First-floor contextual toasts (move/strike/takedown/coin/ability/hack),
   localStorage-gated assassinanimals_tutorial_v1, dismissable. */
(function () {
    'use strict';
    var FX = window.AssassinFX;
    if (!FX) return;
    var KEY = 'assassinanimals_tutorial_v1';
    var done = false, seen = {}, box = null;

    function gated() {
        try { return !!localStorage.getItem(KEY); } catch (e) { return true; }
    }
    function mark() {
        try { localStorage.setItem(KEY, '1'); } catch (e) {}
    }

    function ensure() {
        try {
            box = FX.el('afxToasts');
            if (!box) {
                var vp = FX.viewport();
                if (!vp) return null;
                box = document.createElement('div');
                box.id = 'afxToasts'; box.className = 'afx-toasts';
                vp.appendChild(box);
            }
            return box;
        } catch (e) { return null; }
    }

    function toast(id, icon, text, ms) {
        if (done || seen[id]) return;
        seen[id] = true;
        var host = ensure();
        if (!host) return;
        try {
            var d = document.createElement('div');
            d.className = 'afx-toast';
            d.innerHTML = '<span class="afx-toast-icon"></span><span class="afx-toast-txt"></span><button class="afx-toast-x" aria-label="Dismiss">×</button>';
            d.querySelector('.afx-toast-icon').textContent = icon;
            d.querySelector('.afx-toast-txt').textContent = text;
            d.querySelector('.afx-toast-x').addEventListener('click', function () { try { d.remove(); } catch (e) {} });
            host.appendChild(d);
            setTimeout(function () { try { d.classList.add('out'); setTimeout(function () { try { d.remove(); } catch (e) {} }, 400); } catch (e) {} }, ms || 5000);
        } catch (e) {}
    }

    function watch() {
        try {
            var g = FX.game();
            if (!g || !g.state) return;
            var s = g.state;
            if (s.mode !== 'PLAY' || !s.player) return;
            if (s.run.floor > 1) { if (!done) { done = true; mark(); var b = ensure(); if (b) b.innerHTML = ''; } return; }
            if (!seen.move && (s.keys.KeyW || s.keys.KeyA || s.keys.KeyS || s.keys.KeyD || s.touch.joystickActive)) { /* moving already */ }
            if (!seen.move) toast('move', '🕹️', 'Move with WASD / arrows — or the left stick on touch.', 6000);
            if (!seen.strike && s.run.kills + s.run.pacifications > 0) toast('strike', '⚔️', 'Strike: Click / Space. Sneak behind for a silent takedown (E).', 6000);
            else if (!seen.strike && s.currentContextAction && s.currentContextAction.type === 'TAKEDOWN') toast('takedown', '🤫', 'Press E now — silent takedown available!', 6000);
            if (!seen.coin && (s.thrownCoins.length || (s.guards.some(function (x) { return x.state === 'INSPECT'; })))) toast('coin', '🪙', 'Toss a coin (Q / Right-click) to pull guards off patrol.', 6000);
            if (!seen.ability && s.player.abilityCooldown > 0) toast('ability', '⚡', 'Signature ability fired (SHIFT / F). Watch the cooldown bar.', 6000);
            if (!seen.hack && s.terminals.some(function (t) { return Math.hypot(t.x - s.player.x, t.y - s.player.y) < 120; })) toast('hack', '🖥️', 'Terminal nearby — press E to hack, loop cameras, forge keycard.', 6000);
            if (!seen.key && s.run.hasKey) { toast('key', '🔑', 'Keycard secured! Follow the green objective arrow to the elevator.', 6000); }
        } catch (e) {}
    }

    // Replay/skip affordance: double-click toast stack clears + opts out.
    document.addEventListener('dblclick', function (e) {
        try { if (e.target && e.target.closest && e.target.closest('#afxToasts')) { done = true; mark(); ensure().innerHTML = ''; } } catch (err) {}
    });

    if (!gated()) setInterval(watch, 1200);
    FX.mods.tutorial = { reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} done = false; seen = {}; } };
})();
