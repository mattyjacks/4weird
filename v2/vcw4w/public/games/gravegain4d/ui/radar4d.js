(function () {
    'use strict';
    if (window.GG4D_Radar) return;

    // GraveGain4D RADAR — circular canvas minimap + floor badge (saga chrome).
    // Same conventions as ui/hud4d.js: vanilla ES5 IIFE, never throws,
    // guarded DOM, owns its CSS + canvas (never edits HUD files).
    // No fullscreen/dblclick.
    //
    // update(state):
    //   { player:{x,z,w,angle}, range, floor, wSlice,
    //     enemies:[{x,z,w,ghost,portal}], portals:[{x,z}], cup:{x,z} }
    //   enemies on the player's w-slice  -> solid red dots
    //   enemies on another w-slice        -> hollow pale "w-ghost" rings
    //   portals                           -> gold diamonds
    //   cup (hole flag)                   -> gold flag glyph
    //   player                            -> white arrow (angle = facing)

    var CSS_ID = 'gg4d-radar-style';
    var SIZE = 140;
    var CSS =
        '.gg4d-radar{position:fixed;right:10px;bottom:10px;z-index:40;' +
        'pointer-events:none;font-family:system-ui,sans-serif;text-align:center}' +
        '.gg4d-radar canvas{width:' + SIZE + 'px;height:' + SIZE + 'px;' +
        'border:1px solid #7d6cf0;border-radius:50%;background:rgba(0,0,0,.55)}' +
        '.gg4d-radar .rd-lbl{font-size:10px;letter-spacing:2px;color:#b9aaff;opacity:.9;margin-top:2px}' +
        '.gg4d-radar .rd-floor{display:inline-block;margin-top:2px;font-size:11px;color:#e8e6df;' +
        'background:rgba(0,0,0,.55);border:1px solid #888;border-radius:10px;padding:1px 10px}';

    function ensureCSS(doc) {
        try {
            if (!doc || doc.getElementById(CSS_ID)) return;
            var st = doc.createElement('style');
            st.id = CSS_ID;
            st.textContent = CSS;
            (doc.head || doc.documentElement).appendChild(st);
        } catch (e) { /* ignore */ }
    }

    function num(v, d) {
        v = Number(v);
        return isFinite(v) ? v : d;
    }

    function Radar4D(opts) {
        opts = opts || {};
        this.root = null;
        this.canvas = null;
        this.ctx = null;
        this.floorEl = null;
        this.sweep = 0;
        this.floor = 1;
        this.wSlice = 0;
        this.range = (opts.range > 0) ? opts.range : 400;
        this.container = opts.container || null;
    }

    Radar4D.prototype.mount = function (container) {
        try {
            if (this.root) return this.root;
            var doc = (container && container.ownerDocument) || document;
            var host = container || this.container || doc.body;
            if (!host || !doc.createElement) return null;
            ensureCSS(doc);
            var root = doc.createElement('div');
            root.className = 'gg4d-radar';
            host.appendChild(root);
            var cv = doc.createElement('canvas');
            cv.width = SIZE; cv.height = SIZE;
            root.appendChild(cv);
            var lbl = doc.createElement('div');
            lbl.className = 'rd-lbl';
            lbl.textContent = 'RADAR SCAN';
            root.appendChild(lbl);
            var fl = doc.createElement('div');
            fl.className = 'rd-floor';
            root.appendChild(fl);
            this.root = root;
            this.canvas = cv;
            this.floorEl = fl;
            try { this.ctx = cv.getContext('2d'); } catch (e) { this.ctx = null; }
            this.setFloor(this.floor, this.wSlice);
            this.update(null);
            return root;
        } catch (e) { return null; }
    };

    Radar4D.prototype.setFloor = function (floor, wSlice) {
        try {
            this.floor = num(floor, this.floor);
            if (wSlice !== undefined) this.wSlice = num(wSlice, this.wSlice);
            if (this.floorEl) this.floorEl.textContent = 'F' + this.floor + ' · W' + this.wSlice;
        } catch (e) { /* ignore */ }
    };

    Radar4D.prototype.update = function (s) {
        try {
            var ctx = this.ctx;
            if (!ctx) return;
            s = s || {};
            var R = SIZE / 2;
            var range = num(s.range, this.range) || 400;
            var px = 0, pz = 0, pw = this.wSlice, ang = 0;
            if (s.player) {
                px = num(s.player.x, 0); pz = num(s.player.z, 0);
                pw = (s.player.w !== undefined) ? num(s.player.w, pw) : pw;
                ang = num(s.player.angle, num(s.player.facing, 0));
            }
            if (s.floor !== undefined || s.wSlice !== undefined || s.w !== undefined) {
                this.setFloor(
                    s.floor !== undefined ? s.floor : this.floor,
                    s.wSlice !== undefined ? s.wSlice : (s.w !== undefined ? s.w : pw));
                pw = this.wSlice;
            }
            var enemies = s.enemies || [];
            var portals = s.portals || [];
            var cup = s.cup || s.flag || null;

            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.save();
            ctx.beginPath();
            ctx.arc(R, R, R - 1, 0, Math.PI * 2);
            ctx.clip();

            // Rings.
            ctx.strokeStyle = 'rgba(125,108,240,.35)';
            ctx.lineWidth = 1;
            [0.33, 0.66, 1].forEach(function (f) {
                ctx.beginPath();
                ctx.arc(R, R, (R - 1) * f, 0, Math.PI * 2);
                ctx.stroke();
            });
            // Crosshair.
            ctx.strokeStyle = 'rgba(125,108,240,.25)';
            ctx.beginPath(); ctx.moveTo(R, 2); ctx.lineTo(R, SIZE - 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2, R); ctx.lineTo(SIZE - 2, R); ctx.stroke();

            function plot(x, z) {
                var dx = (num(x, 0) - px) / range;
                var dz = (num(z, 0) - pz) / range;
                var m = Math.sqrt(dx * dx + dz * dz);
                if (m > 1 && m > 0) { dx /= m; dz /= m; }
                return [R + dx * (R - 4), R + dz * (R - 4)];
            }

            var i, e, p;
            // Portals — gold diamonds.
            ctx.fillStyle = '#ffd24d';
            for (i = 0; i < portals.length; i++) {
                p = plot(portals[i].x, portals[i].z);
                ctx.save();
                ctx.translate(p[0], p[1]);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-3, -3, 6, 6);
                ctx.restore();
            }
            // Portal-flagged enemies also read as gold.
            for (i = 0; i < enemies.length; i++) {
                e = enemies[i] || {};
                if (!e.portal) continue;
                p = plot(e.x, e.z);
                ctx.save();
                ctx.translate(p[0], p[1]);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-3, -3, 6, 6);
                ctx.restore();
            }
            // Enemies: in-slice solid red, off-slice hollow w-ghost rings.
            for (i = 0; i < enemies.length; i++) {
                e = enemies[i] || {};
                if (e.portal) continue;
                p = plot(e.x, e.z);
                var ghost = !!e.ghost || (e.w !== undefined && num(e.w, pw) !== pw);
                if (ghost) {
                    ctx.strokeStyle = 'rgba(185,170,255,.9)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#ff5b4d';
                    ctx.beginPath();
                    ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            // Cup flag — gold pennant.
            if (cup) {
                p = plot(cup.x, cup.z);
                ctx.strokeStyle = '#ffd24d';
                ctx.fillStyle = '#ffd24d';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(p[0], p[1] + 5); ctx.lineTo(p[0], p[1] - 5); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(p[0], p[1] - 5);
                ctx.lineTo(p[0] + 7, p[1] - 2.5);
                ctx.lineTo(p[0], p[1]);
                ctx.closePath(); ctx.fill();
            }
            // Sweep animation.
            this.sweep += 0.06;
            var sx = R + Math.cos(this.sweep) * (R - 2);
            var sy = R + Math.sin(this.sweep) * (R - 2);
            var grad = null;
            try {
                grad = ctx.createLinearGradient(R, R, sx, sy);
                grad.addColorStop(0, 'rgba(125,108,240,0)');
                grad.addColorStop(1, 'rgba(125,108,240,.8)');
            } catch (g) { grad = null; }
            ctx.strokeStyle = grad || 'rgba(125,108,240,.6)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(R, R); ctx.lineTo(sx, sy); ctx.stroke();

            // Player arrow (facing = canvas radians, -Y is "up" when angle 0).
            ctx.save();
            ctx.translate(R, R);
            ctx.rotate(ang);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, -6);
            ctx.lineTo(4.5, 5);
            ctx.lineTo(0, 2.5);
            ctx.lineTo(-4.5, 5);
            ctx.closePath(); ctx.fill();
            ctx.restore();

            ctx.restore();
        } catch (e) { /* ignore */ }
    };

    Radar4D.prototype.destroy = function () {
        try {
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
        } catch (e) { /* ignore */ }
        this.root = null; this.canvas = null; this.ctx = null;
    };

    var singleton = null;
    function get() {
        if (!singleton) singleton = new Radar4D({});
        return singleton;
    }

    try {
        window.GG4D_Radar = {
            Radar: Radar4D,
            SIZE: SIZE,
            mount: function (c) { return get().mount(c); },
            update: function (s) { return get().update(s); },
            setFloor: function (f, w) { return get().setFloor(f, w); }
        };
    } catch (e) { /* ignore */ }
})();
