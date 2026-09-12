/* AssassinAnimals FX - 10 titlecard.
   Floor intro cinematic: letterbox bars + FLOOR N / CONTRACT NAME / threat tip,
   auto-dismiss 2.5s, click-to-skip. Wraps launchFloor via assassin:floor event
   (zero render-loop edits). */
(function () {
    'use strict';
    var FX = window.AssassinFX;
    if (!FX) return;

    var CONTRACTS = [
        { name: 'OPERATION SILENT MENAGERIE', tip: 'VIP wears a red halo - pacify or eliminate, then take the keycard.' },
        { name: 'OPERATION GLASS JUNGLE', tip: 'Foliage conceals you: stand still inside bushes to vanish.' },
        { name: 'OPERATION VELVET FANG', tip: 'Coins (Q / Right-click) pull patrols off their route.' },
        { name: 'OPERATION IRON WHISKER', tip: 'Enforcers (white dot) see through disguises up close.' },
        { name: 'OPERATION MIDNIGHT CAGE', tip: 'Hack terminals to loop cameras and forge a keycard.' },
        { name: 'OPERATION CRIMSON DEN', tip: 'Drag bodies (G) into dumpsters before patrols find them.' }
    ];

    function ensure() {
        var vp = FX.viewport();
        if (!vp) return null;
        try {
            if (getComputedStyle(vp).position === 'static') vp.style.position = 'relative';
        } catch (e) {}
        var top = FX.mk('afxBarTop', 'afx-bar afx-top', vp);
        var bot = FX.mk('afxBarBottom', 'afx-bar afx-bottom', vp);
        var card = FX.mk('afxTitlecard', 'afx-titlecard', vp);
        if (card && !card.dataset.built) {
            card.dataset.built = '1';
            card.innerHTML = '<div class="afx-kicker"></div><div class="afx-title"></div>' +
                '<div class="afx-sub"></div><div class="afx-tip"></div>';
            card.addEventListener('click', hide);
        }
        return { top: top, bot: bot, card: card, vp: vp };
    }

    var hideT = 0, barT = 0;
    function hide() {
        try {
            clearTimeout(hideT); clearTimeout(barT);
            var c = FX.el('afxTitlecard');
            var vp = FX.viewport();
            if (c) c.classList.remove('on');
            if (vp) vp.classList.remove('afx-cine');
        } catch (e) {}
    }

    function show(floor) {
        var parts = ensure();
        if (!parts || !parts.card) return;
        var n = Math.max(1, floor | 0 || 1);
        var c = CONTRACTS[(n - 1) % CONTRACTS.length];
        try {
            parts.card.querySelector('.afx-kicker').textContent = '- FLOOR ' + n + ' -';
            var t = parts.card.querySelector('.afx-title');
            t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
            t.textContent = c.name;
            parts.card.querySelector('.afx-sub').textContent = 'Contract target: eliminate the VIP · secure keycard · reach elevator';
            parts.card.querySelector('.afx-tip').textContent = 'THREAT TIP: ' + c.tip;
            parts.vp.classList.add('afx-cine');
            parts.card.classList.add('on');
            clearTimeout(hideT); clearTimeout(barT);
            hideT = setTimeout(hide, 2500);
            barT = setTimeout(function () { try { parts.vp.classList.remove('afx-cine'); } catch (e) {} }, 3100);
            var a = FX.audio();
            if (a && a.ensureActive) { try { a.ensureActive(); a.playTone(220, 'sawtooth', 0.4, 0.08); } catch (e) {} }
        } catch (e) {}
    }

    FX.on('floor', function (d) { show(d.floor); });
    FX.mods.titlecard = { show: show, hide: hide };
})();
