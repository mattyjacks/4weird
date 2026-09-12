/* AssassinAnimals FX - 20 announcer.
   Killstreak callouts (DOUBLE KILL / TRIPLE / RAMPAGE / SILENT STRING),
   combo meter, kill flash, VIP slow-mo flash + banner. Driven by
   assassin:kill / assassin:takedown events; synth stings extend (never
   replace) the existing audio object. */
(function () {
    'use strict';
    var FX = window.AssassinFX;
    if (!FX) return;

    var STREAK_WINDOW = 4000, COMBO_WINDOW = 3000;
    var streak = 0, lastKillT = 0, silentStreak = 0;
    var combo = 0, comboT = 0;

    function sting(freqs, type, gap, vol) {
        try {
            var a = FX.audio();
            if (!a || !a.playTone) return;
            freqs.forEach(function (f, i) {
                setTimeout(function () { try { a.playTone(f, type || 'sawtooth', 0.22, vol || 0.1); } catch (e) {} }, i * (gap || 90));
            });
        } catch (e) {}
    }

    function ensure() {
        var vp = FX.viewport();
        if (!vp) return null;
        var an = FX.mk('afxAnnouncer', 'afx-announcer', vp);
        if (an && !an.dataset.built) {
            an.dataset.built = '1';
            an.innerHTML = '<div class="afx-announce-main"></div><div class="afx-announce-sub"></div>';
        }
        var cb = FX.mk('afxCombo', 'afx-combo', vp);
        if (cb && !cb.dataset.built) {
            cb.dataset.built = '1';
            cb.innerHTML = '<div class="afx-combo-n"></div><div class="afx-combo-bar"><div class="afx-combo-fill"></div></div>';
        }
        var flash = FX.mk('afxKillflash', 'afx-killflash', vp);
        var vip = FX.mk('afxVipflash', 'afx-vipflash', vp);
        return { an: an, cb: cb, flash: flash, vip: vip };
    }

    function announce(main, sub, cls) {
        try {
            var p = ensure();
            if (!p || !p.an) return;
            p.an.querySelector('.afx-announce-main').textContent = main || '';
            p.an.querySelector('.afx-announce-sub').textContent = sub || '';
            p.an.classList.remove('on', 'vip');
            if (cls) p.an.classList.add(cls);
            void p.an.offsetWidth;
            p.an.classList.add('on');
        } catch (e) {}
    }

    function popFlash() {
        try {
            var p = ensure();
            if (!p || !p.flash) return;
            p.flash.classList.remove('on'); void p.flash.offsetWidth; p.flash.classList.add('on');
        } catch (e) {}
    }

    function vipSlowMo() {
        try {
            var g = FX.game();
            // timeScale dip: game loop reads state.speedMultiplier
            if (g && g.state) {
                g.state.speedMultiplier = 0.25;
                setTimeout(function () { try { g.state.speedMultiplier = 1; } catch (e) {} }, 900);
            }
            var p = ensure();
            if (p && p.vip) {
                p.vip.classList.remove('on'); void p.vip.offsetWidth; p.vip.classList.add('on');
            }
            var cv = FX.el('gameCanvas');
            if (cv) { cv.classList.remove('afx-desat'); void cv.offsetWidth; cv.classList.add('afx-desat'); setTimeout(function () { try { cv.classList.remove('afx-desat'); } catch (e) {} }, 1000); }
        } catch (e) {}
    }

    function renderCombo() {
        try {
            var p = ensure();
            if (!p || !p.cb) return;
            if (combo >= 2) {
                p.cb.querySelector('.afx-combo-n').textContent = combo + ' HIT COMBO';
                p.cb.querySelector('.afx-combo-fill').style.width = FX.clamp((comboT / COMBO_WINDOW) * 100, 0, 100) + '%';
                p.cb.classList.add('on');
            } else p.cb.classList.remove('on');
        } catch (e) {}
    }

    function onKill(d) {
        try {
            var now = Date.now();
            streak = (now - lastKillT < STREAK_WINDOW) ? streak + 1 : 1;
            lastKillT = now;
            combo += 1; comboT = COMBO_WINDOW;
            renderCombo();
            popFlash();

            if (d.isVIP) {
                vipSlowMo();
                announce('🎯 VIP ELIMINATED', 'target neutralized · keycard intel exposed', 'vip');
                sting([523.25, 659.25, 783.99, 1046.5, 1318.5], 'triangle', 95, 0.12);
                return;
            }
            if (d.silent) {
                silentStreak += 1;
                if (silentStreak >= 3) { announce('SILENT STRING x' + silentStreak, 'ghost protocol holds', ''); sting([880, 1174, 1568], 'sine', 80, 0.09); }
                else if (silentStreak === 2) { announce('SILENT DOUBLE', 'no one heard a thing', ''); sting([880, 1174], 'sine', 90, 0.09); }
            } else silentStreak = 0;

            if (streak === 2) { announce('DOUBLE KILL', 'two fall as one'); sting([440, 660], 'sawtooth', 90, 0.1); }
            else if (streak === 3) { announce('TRIPLE KILL', 'hat trick of ruin'); sting([440, 660, 880], 'sawtooth', 85, 0.11); }
            else if (streak >= 4) { announce('RAMPAGE x' + streak, 'unstoppable'); sting([440, 554, 659, 880], 'sawtooth', 80, 0.12); }
            else if (!d.silent) sting([300], 'sawtooth', 90, 0.07);
            else sting([660], 'sine', 90, 0.07);
        } catch (e) {}
    }

    setInterval(function () {
        try {
            var step = 250;
            if (comboT > 0) { comboT -= step; if (comboT <= 0) { combo = 0; } renderCombo(); }
            if (Date.now() - lastKillT > STREAK_WINDOW) streak = 0;
        } catch (e) {}
    }, 250);

    FX.on('kill', onKill);
    FX.on('takedown', function (d) {
        try {
            combo += 1; comboT = COMBO_WINDOW; renderCombo(); popFlash();
            if (d.isVIP) {
                vipSlowMo();
                announce('🎯 VIP PACIFIED', 'silent legend · nobody saw it', 'vip');
                sting([523.25, 659.25, 783.99, 1046.5], 'triangle', 95, 0.11);
            } else {
                silentStreak += 1;
                if (silentStreak >= 3) announce('SILENT STRING x' + silentStreak, 'ghost protocol holds', '');
                sting([720, 1080], 'sine', 85, 0.08);
            }
        } catch (e) {}
    });
    FX.mods.announcer = { announce: announce };
})();
