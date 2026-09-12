/* AssassinAnimals FX - 60 hud-fx.
   Objective tracker (VIP + keycard + elevator arrow), detection floaters
   (❓/❗ projected above guards), directional damage vignette, VIP health
   pips, low-HP pulse, follow-light sweep, footprint trails in foliage,
   muzzle/spark/acid particle variants. All DOM guarded; particles go
   through the exposed AssassinGame.fns (no render-loop rewrite). */
(function () {
    'use strict';
    var FX = window.AssassinFX;
    if (!FX) return;

    var floatPool = [], lastHp = -1, lastBulletN = 0;

    function ensure() {
        var vp = FX.viewport();
        if (!vp) return null;
        var tracker = FX.mk('afxObjectives', 'afx-objectives', vp);
        if (tracker && !tracker.dataset.built) {
            tracker.dataset.built = '1';
            tracker.innerHTML = '<div class="afx-obj-title">◈ CONTRACT</div>' +
                '<div class="afx-obj-row"><span>🎯 VIP</span><strong class="afx-obj-vip">-</strong></div>' +
                '<div class="afx-obj-row"><span>🔑 Keycard</span><strong class="afx-obj-key">-</strong></div>' +
                '<div class="afx-obj-row"><span>🛗 Elevator</span><strong class="afx-obj-arrow">➤</strong></div>';
        }
        var pips = FX.mk('afxVipPips', 'afx-vip-pips', vp);
        var dmg = FX.mk('afxDmgVin', 'afx-dmgvin', vp);
        var low = FX.mk('afxLowHp', 'afx-lowhp', vp);
        var light = FX.mk('afxLight', 'afx-light', vp);
        var floats = FX.mk('afxFloaters', 'afx-floaters', vp);
        return { tracker: tracker, pips: pips, dmg: dmg, low: low, light: light, floats: floats, vp: vp };
    }

    function worldToScreen(s, x, y) {
        try {
            var cv = FX.el('gameCanvas');
            var rect = cv.getBoundingClientRect();
            var dpr = window.devicePixelRatio || 1;
            var lw = cv.width / dpr, lh = cv.height / dpr;
            var sx = (x - s.camera.x) / lw * rect.width;
            var sy = (y - s.camera.y) / lh * rect.height;
            return { x: sx, y: sy, w: rect.width, h: rect.height };
        } catch (e) { return null; }
    }

    var muzzleAcc = 0;
    function tick() {
        var p = ensure();
        var g = FX.game();
        if (!p || !g || !g.state) return;
        var s = g.state, F = g.fns;
        if (s.mode !== 'PLAY' || !s.player || !s.map) {
            ['afxObjectives', 'afxVipPips', 'afxFloaters'].forEach(function (id) {
                var e = FX.el(id); if (e) e.style.display = 'none';
            });
            var lo = FX.el('afxLowHp'); if (lo) lo.classList.remove('on');
            return;
        }

        // - Objective tracker -
        try {
            var vips = s.guards.filter(function (x) { return x.isVIP && x.state !== 'PACIFIED'; }).length;
            p.tracker.style.display = 'block';
            p.tracker.querySelector('.afx-obj-vip').textContent = vips + ' left';
            p.tracker.querySelector('.afx-obj-key').textContent = s.run.hasKey ? 'SECURED' : '-';
            p.tracker.querySelector('.afx-obj-key').className = 'afx-obj-key ' + (s.run.hasKey ? 'yes' : 'no');
            var ang = Math.atan2(s.map.elevator.y - s.player.y, s.map.elevator.x - s.player.x) * 180 / Math.PI;
            var arrow = p.tracker.querySelector('.afx-obj-arrow');
            arrow.style.transform = 'rotate(' + ang + 'deg)';
            arrow.className = 'afx-obj-arrow ' + (s.run.hasKey ? 'go' : 'dim');
            var dist = Math.hypot(s.map.elevator.x - s.player.x, s.map.elevator.y - s.player.y);
            p.tracker.querySelector('.afx-obj-row:last-child span').textContent = '🛗 Elevator ' + Math.round(dist / 50) + 'm';
        } catch (e) {}

        // - VIP health pips -
        try {
            var vipList = s.guards.filter(function (x) { return x.isVIP; }).slice(0, 3);
            if (!vipList.length) { p.pips.style.display = 'none'; }
            else {
                p.pips.style.display = 'block';
                var html = '<div class="afx-pips-title">🎯 TARGET VITALS</div>';
                vipList.forEach(function (v) {
                    var max = 45, n = 5, fill = Math.max(0, v.hp / max);
                    var cells = '';
                    for (var i = 0; i < n; i++) cells += '<i class="' + (i / n < fill ? 'f' : 'e') + '"></i>';
                    html += '<div class="afx-pip-row"><span>VIP</span><div class="afx-pips">' + cells + '</div></div>';
                });
                if (p.pips._h !== html) { p.pips.innerHTML = html; p.pips._h = html; }
            }
        } catch (e) {}

        // - Detection floaters ❓/❗ (pooled, projected) -
        try {
            p.floats.style.display = 'block';
            var need = 0;
            s.guards.forEach(function (gd) {
                if (gd.state === 'PACIFIED') return;
                var mark = null, cls = '';
                if (gd.state === 'CHASE') { mark = '❗'; cls = 'alert'; }
                else if (gd.suspicion > 5) { mark = '❓'; cls = 'sus'; }
                else if (gd.state === 'INSPECT') { mark = '❓'; cls = 'sus dim'; }
                if (!mark) return;
                var sc = worldToScreen(s, gd.x, gd.y - 34);
                if (!sc || sc.x < -20 || sc.y < -20 || sc.x > sc.w + 20 || sc.y > sc.h + 20) return;
                var el = floatPool[need];
                if (!el) {
                    el = document.createElement('div');
                    p.floats.appendChild(el);
                    floatPool[need] = el;
                }
                el.className = 'afx-floater ' + cls;
                el.textContent = mark;
                el.style.display = 'block';
                el.style.transform = 'translate(' + Math.round(sc.x) + 'px,' + Math.round(sc.y) + 'px) translate(-50%,-100%)';
                need++;
            });
            for (var i = need; i < floatPool.length; i++) { try { floatPool[i].style.display = 'none'; } catch (e2) {} }
        } catch (e) {}

        // - Directional damage vignette + low-HP pulse -
        try {
            var hp = s.player.hp;
            if (lastHp >= 0 && hp < lastHp - 0.5) {
                // Hit: edge flash from nearest threat direction.
                var best = null, bd = 1e9;
                s.guards.forEach(function (gd) {
                    var d = Math.hypot(gd.x - s.player.x, gd.y - s.player.y);
                    if (d < bd) { bd = d; best = gd; }
                });
                var deg = best ? Math.atan2(best.y - s.player.y, best.x - s.player.x) * 180 / Math.PI : 0;
                p.dmg.style.setProperty('--afx-hit-ang', Math.round(deg) + 'deg');
                p.dmg.classList.remove('on'); void p.dmg.offsetWidth; p.dmg.classList.add('on');
            }
            lastHp = hp;
            var frac = hp / Math.max(1, s.player.maxHp);
            p.low.classList.toggle('on', frac < 0.32 && hp > 0);
        } catch (e) {}

        // - Follow-light sweep (soft gradient tracking player) -
        try {
            var sc2 = worldToScreen(s, s.player.x, s.player.y);
            if (sc2) {
                p.light.style.display = 'block';
                p.light.style.transform = 'translate(' + Math.round(sc2.x) + 'px,' + Math.round(sc2.y) + 'px) translate(-50%,-50%)';
            }
        } catch (e) {}

        // - Muzzle flashes: new bullets spawn a spark at origin -
        try {
            if (F && F.spawnParticle && s.bullets.length > lastBulletN) {
                for (var b = lastBulletN; b < s.bullets.length; b++) {
                    var bl = s.bullets[b];
                    for (var k = 0; k < 4; k++) {
                        F.spawnParticle(bl.x1, bl.y1, 'rgba(255,220,120,0.9)',
                            Math.random() * 2 + 1, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 10);
                    }
                }
            }
            lastBulletN = s.bullets.length;
        } catch (e) {}

        // - Footprint trails in foliage + acid/spark variety on the move -
        try {
            muzzleAcc++;
            if (F && F.spawnParticle && s.player.inCover && muzzleAcc % 6 === 0) {
                var moving = s.keys.KeyW || s.keys.KeyA || s.keys.KeyS || s.keys.KeyD || s.touch.joystickActive;
                if (moving) F.spawnParticle(s.player.x, s.player.y, 'rgba(16,185,129,0.35)', 5, 0, 0.3, 40);
            }
        } catch (e) {}
    }

    // Particle variety on kills: acid greens / cyan sparks mixed into the red.
    FX.on('kill', function (d) {
        try {
            var g = FX.game();
            if (!g || !g.fns) return;
            var F = g.fns;
            for (var i = 0; i < 10; i++) {
                var col = i % 3 === 0 ? 'rgba(0,255,150,0.7)' : (i % 3 === 1 ? 'rgba(0,229,255,0.8)' : 'rgba(255,220,120,0.8)');
                F.spawnParticle(d.x, d.y, col, Math.random() * 2.5 + 1,
                    (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, 18 + Math.random() * 12);
            }
        } catch (e) {}
    });

    setInterval(tick, 150);
    FX.mods.hudfx = { tick: tick };
})();
