/* AssassinAnimals FX - 70 menu polish.
   Rotating contracts preview line under the main-menu buttons. */
(function () {
    'use strict';
    var FX = window.AssassinFX;
    if (!FX) return;
    var LINES = [
        '◈ FLOOR 1 · OPERATION SILENT MENAGERIE - 1 VIP · low threat',
        '◈ FLOOR 3 · OPERATION VELVET FANG - enforcers on patrol',
        '◈ FLOOR 5 · OPERATION MIDNIGHT CAGE - cameras + lasers live',
        '◈ endless descent · the complex learns your name'
    ];
    var i = 0;
    function tick() {
        try {
            var box = document.querySelector('#mainMenuScreen .menu-buttons');
            if (!box) return;
            var el = FX.el('afxContracts');
            if (!el) {
                el = document.createElement('div');
                el.id = 'afxContracts'; el.className = 'afx-contracts';
                box.appendChild(el);
            }
            el.textContent = LINES[i % LINES.length];
            i++;
        } catch (e) {}
    }
    tick();
    setInterval(tick, 4000);
})();
