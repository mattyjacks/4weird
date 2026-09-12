/* AssassinAnimals FX - 50 audio director.
   Extends the existing audio synth (never replaces): combat/stealth/alert
   layers (faster bassline on alert), footstep ticks by operative noise,
   takedown stinger, VIP fanfare, alarm loop, UI clicks. Mute persistence
   + volume slider injected into pause menu if missing. */
(function () {
    'use strict';
    var FX = window.AssassinFX;
    if (!FX) return;

    var MUTE_KEY = 'assassinanimals_muted_v1', VOL_KEY = 'assassinanimals_vol_v1';
    var vol = 0.7, lastStep = -1, alarmT = 0, stepT = 0;

    function audio() { return FX.audio(); }

    function applyVol() {
        try {
            var a = audio();
            if (a && a.masterGain && a.ctx) a.masterGain.gain.setValueAtTime(a.muted ? 0 : vol, a.ctx.currentTime);
        } catch (e) {}
    }

    function restore() {
        try {
            var a = audio();
            if (!a) return false;
            try {
                if (localStorage.getItem(MUTE_KEY) === '1' && !a.muted) a.toggleMute();
                var v = parseFloat(localStorage.getItem(VOL_KEY));
                if (!isNaN(v)) vol = Math.max(0, Math.min(1, v));
            } catch (e) {}
            applyVol();
            syncBtn();
            return true;
        } catch (e) { return false; }
    }

    function syncBtn() {
        try {
            var a = audio();
            var b = FX.el('btnToggleSound');
            if (b && a) b.textContent = a.muted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
            var s = FX.el('afxVol');
            if (s) s.value = String(Math.round(vol * 100));
        } catch (e) {}
    }

    // UI clicks on menu buttons (delegated, guarded).
    document.addEventListener('click', function (e) {
        try {
            var t = e.target && e.target.closest ? e.target.closest('button') : null;
            if (!t) return;
            var a = audio();
            if (a && a.ensureActive) {
                a.ensureActive();
                if (!a.muted && a.playTone) a.playTone(700, 'sine', 0.06, 0.04);
            }
        } catch (err) {}
    });

    // Footsteps: tick rate scales with operative noiseBase; volume scaled.
    setInterval(function () {
        try {
            var g = FX.game();
            if (!g || !g.state) return;
            var s = g.state, a = g.audio;
            if (s.mode !== 'PLAY' || !s.player || s.player.hp <= 0) return;
            if (!a || !a.ctx || a.muted || a.ctx.state !== 'running') return;
            var moving = s.keys.KeyW || s.keys.KeyA || s.keys.KeyS || s.keys.KeyD || (s.touch.joystickActive && (s.touch.moveX || s.touch.moveY));
            if (!moving) return;
            var noise = s.player.noiseBase || 0;
            var interval = noise <= 0 ? 900 : noise > 55 ? 260 : 480;
            var now = Date.now();
            if (now - stepT < interval) return;
            stepT = now;
            var v = noise <= 0 ? 0.015 : noise > 55 ? 0.06 : 0.032;
            var o = a.ctx.createOscillator(), gn = a.ctx.createGain();
            o.type = 'triangle'; o.frequency.setValueAtTime(140 + Math.random() * 60, a.ctx.currentTime);
            gn.gain.setValueAtTime(v, a.ctx.currentTime);
            gn.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + 0.07);
            o.connect(gn); gn.connect(a.sfxGain);
            o.start(); o.stop(a.ctx.currentTime + 0.07);
        } catch (e) {}
    }, 120);

    // Alert layer: double-time hats + tension pulse while alerts.active; alarm loop.
    setInterval(function () {
        try {
            var g = FX.game();
            if (!g || !g.state) return;
            var s = g.state, a = g.audio;
            if (!a || !a.ctx || a.muted || a.ctx.state !== 'running') return;
            if (s.mode !== 'PLAY') return;
            var step = a.musicStep;
            if (step !== lastStep) {
                lastStep = step;
                if (s.alerts && s.alerts.active && step % 2 === 1 && a.playSynthHat) a.playSynthHat(0.05);
            }
            if (s.alerts && s.alerts.active) {
                var now = Date.now();
                if (now - alarmT > 1400) {
                    alarmT = now;
                    if (a.playAlarm) a.playAlarm();
                }
            }
        } catch (e) {}
    }, 140);

    // Takedown stinger + VIP fanfare: layered over existing playTakedown/playCoin.
    FX.on('takedown', function (d) {
        try {
            var a = audio();
            if (!a || !a.playTone) return;
            var base = [180, 90, 1400];
            base.forEach(function (f, i) { setTimeout(function () { try { a.playTone(f, i < 2 ? 'sine' : 'triangle', 0.15, 0.08); } catch (e) {} }, i * 70); });
            if (d.isVIP && a.playLevelUp) setTimeout(function () { try { a.playLevelUp(); } catch (e) {} }, 250);
        } catch (e) {}
    });
    FX.on('kill', function (d) {
        try {
            var a = audio();
            if (!a || !a.playTone) return;
            if (d.isVIP) {
                [392, 523.25, 659.25, 783.99, 1046.5, 1568].forEach(function (f, i) {
                    setTimeout(function () { try { a.playTone(f, 'triangle', 0.3, 0.1); } catch (e) {} }, i * 100);
                });
            } else {
                setTimeout(function () { try { a.playTone(220, 'square', 0.12, 0.06); } catch (e) {} }, 0);
            }
        } catch (e) {}
    });

    // Pause-menu volume slider + persisted mute (inject if missing).
    function injectPauseControls() {
        try {
            var pc = document.querySelector('#pauseScreen .pause-container');
            if (!pc || FX.el('afxVolRow')) return;
            var row = document.createElement('div');
            row.id = 'afxVolRow'; row.className = 'afx-vol-row';
            row.innerHTML = '<label for="afxVol">🔊 Volume</label>' +
                '<input id="afxVol" type="range" min="0" max="100" step="1" value="70">';
            pc.insertBefore(row, pc.firstChild ? pc.firstChild.nextSibling.nextSibling : null);
            var slider = row.querySelector('#afxVol');
            try { slider.value = String(Math.round(vol * 100)); } catch (e) {}
            slider.addEventListener('input', function () {
                try {
                    vol = Math.max(0, Math.min(100, parseInt(slider.value, 10) || 0)) / 100;
                    localStorage.setItem(VOL_KEY, String(vol));
                    var a = audio();
                    if (a) { a.ensureActive(); if (a.muted && vol > 0) a.toggleMute(); }
                    applyVol(); syncBtn();
                } catch (e) {}
            });
        } catch (e) {}
    }

    // Persist mute toggles (wrap toggleMute once audio exists).
    function hookMute() {
        try {
            var a = audio();
            if (!a || a.__afxMuteHooked) return true;
            a.__afxMuteHooked = true;
            var orig = a.toggleMute.bind(a);
            a.toggleMute = function () {
                var out = orig();
                try { localStorage.setItem(MUTE_KEY, a.muted ? '1' : '0'); } catch (e) {}
                syncBtn();
                return out;
            };
            return true;
        } catch (e) { return false; }
    }

    var tries = 0;
    var boot = setInterval(function () {
        try {
            tries++;
            if (restore()) hookMute();
            injectPauseControls();
            if (tries > 40) clearInterval(boot);
        } catch (e) {}
    }, 500);

    FX.mods.audioDirector = { setVolume: function (v) { vol = v; applyVol(); } };
})();
