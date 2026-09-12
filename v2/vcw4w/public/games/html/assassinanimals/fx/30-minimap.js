/* AssassinAnimals FX - 30 minimap radar.
   Small canvas top-right: player/guards/VIP/elevator dots, range rings,
   fogged unless recon (hawk ping) is active. DOM created if missing. */
(function () {
    'use strict';
    var FX = window.AssassinFX;
    if (!FX) return;

    var cv = null, cx2d = null, SIZE = 148;

    function ensure() {
        try {
            cv = FX.el('afxMinimap');
            if (!cv) {
                var vp = FX.viewport();
                if (!vp) return;
                cv = document.createElement('canvas');
                cv.id = 'afxMinimap';
                cv.className = 'afx-minimap';
                cv.width = SIZE; cv.height = SIZE;
                cv.title = 'Tactical radar - VIP red · guards amber · elevator green';
                vp.appendChild(cv);
            }
            if (!cx2d && cv) cx2d = cv.getContext('2d');
        } catch (e) {}
    }

    function draw() {
        try {
            ensure();
            var g = FX.game();
            if (!cv || !cx2d || !g || !g.state) return;
            var s = g.state;
            if (s.mode !== 'PLAY' || !s.map || !s.player) { cv.style.display = 'none'; return; }
            cv.style.display = 'block';

            var mapW = s.map.cols * 50, mapH = s.map.rows * 50;
            function px(x) { return (x / mapW) * SIZE; }
            function py(y) { return (y / mapH) * SIZE; }

            cx2d.clearRect(0, 0, SIZE, SIZE);
            cx2d.fillStyle = 'rgba(5,8,16,0.82)';
            cx2d.beginPath(); cx2d.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2); cx2d.fill();
            cx2d.strokeStyle = 'rgba(0,229,255,0.5)'; cx2d.lineWidth = 1.5;
            cx2d.beginPath(); cx2d.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2); cx2d.stroke();
            cx2d.strokeStyle = 'rgba(0,229,255,0.12)';
            cx2d.beginPath(); cx2d.arc(SIZE / 2, SIZE / 2, SIZE / 4, 0, Math.PI * 2); cx2d.stroke();

            var recon = !!(s.player.reconActiveTimer && s.player.reconActiveTimer > 0);
            var alert = !!(s.alerts && s.alerts.active);

            // Elevator (always shown - it's the objective)
            try {
                cx2d.fillStyle = s.run.hasKey ? '#00ff66' : '#ff007f';
                cx2d.beginPath(); cx2d.arc(px(s.map.elevator.x), py(s.map.elevator.y), 3.5, 0, Math.PI * 2); cx2d.fill();
            } catch (e) {}

            // Guards: VIP red diamond, chase flashing, else amber; fogged unless recon/close
            (s.guards || []).forEach(function (gd) {
                try {
                    if (gd.state === 'PACIFIED') return;
                    var dx = gd.x - s.player.x, dy = gd.y - s.player.y;
                    var dist = Math.hypot(dx, dy);
                    var visible = recon || dist < 420;
                    if (!visible) return;
                    var x = px(gd.x), y = py(gd.y);
                    if (gd.isVIP) {
                        cx2d.fillStyle = '#ff0055';
                        cx2d.save(); cx2d.translate(x, y); cx2d.rotate(Math.PI / 4);
                        cx2d.fillRect(-3.4, -3.4, 6.8, 6.8); cx2d.restore();
                        cx2d.strokeStyle = 'rgba(255,0,85,0.7)';
                        cx2d.beginPath(); cx2d.arc(x, y, 6 + Math.sin(Date.now() / 200) * 1.5, 0, Math.PI * 2); cx2d.stroke();
                    } else {
                        var flash = gd.state === 'CHASE' && Math.floor(Date.now() / 250) % 2 === 0;
                        cx2d.fillStyle = flash ? '#ff0055' : (alert ? '#ff7a00' : '#ffea00');
                        cx2d.beginPath(); cx2d.arc(x, y, gd.state === 'CHASE' ? 3 : 2.2, 0, Math.PI * 2); cx2d.fill();
                    }
                } catch (e) {}
            });

            // Player wedge
            try {
                var pxx = px(s.player.x), pyy = py(s.player.y);
                cx2d.save(); cx2d.translate(pxx, pyy); cx2d.rotate(s.player.angle || 0);
                cx2d.fillStyle = '#00ff66';
                cx2d.beginPath(); cx2d.moveTo(5, 0); cx2d.lineTo(-3.5, -3.5); cx2d.lineTo(-3.5, 3.5); cx2d.closePath(); cx2d.fill();
                cx2d.restore();
            } catch (e) {}

            if (!recon) {
                cx2d.fillStyle = 'rgba(3,5,10,0.35)';
                cx2d.font = '8px Orbitron, sans-serif'; cx2d.textAlign = 'center';
                cx2d.fillText('RECON FOG', SIZE / 2, SIZE - 8);
            }
        } catch (e) {}
    }

    setInterval(draw, 200);
    FX.mods.minimap = { draw: draw };
})();
