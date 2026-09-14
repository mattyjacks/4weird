(function () {
    'use strict';
    if (window.GG4D_Main) return;

    // GraveGain4D bootstrap + rAF loop.
    // Wires every GG4D_* / GraveGain4D* global the other modules publish:
    //   engine   GG4D_Putt (+ optional GG4D_Engine w/ update(dt, input))
    //   graphics GraveGain4DGraphics (+ renderer/camera when provided)
    //   entities GG4D_Entities (optional registry w/ update(dt))
    //   world    GraveGain4DWorlds (optional w/ update(dt))
    //   campaign GraveGain4DMissions (mission list for the HUD tracker)
    //   ui       GG4D_HUD, GG4D_Touch, GG4D_Sound / GG4D_SoundBus
    // Pauses on hidden tab; resize + fullscreenchange refit camera aspect
    // and renderer size ONLY (never requests fullscreen). No fullscreen /
    // dblclick code anywhere in this module. Never throws.

    function pick() {
        var out = {};
        try {
            var w = window;
            out.putt = w.GG4D_Putt || null;
            out.engine = w.GG4D_Engine || null;
            out.graphics = w.GraveGain4DGraphics || w.GG4D_Graphics || null;
            out.entities = w.GG4D_Entities || null;
            out.world = w.GraveGain4DWorlds || w.GG4D_World || null;
            out.campaign = w.GraveGain4DMissions || w.GG4D_Campaign || null;
            out.HUD = w.GG4D_HUD || null;
            out.Touch = w.GG4D_Touch || null;
            out.Sound = w.GG4D_Sound || null;
            out.soundBus = w.GG4D_SoundBus || null;
        } catch (e) { /* ignore */ }
        return out;
    }

    function Main4D(opts) {
        opts = opts || {};
        this.opts = opts;
        this.mods = pick();
        this.hud = null; this.touch = null; this.sound = null;
        this.putt = null;
        this.running = false; this.paused = false;
        this._raf = 0; this._last = 0;
        this.elapsed = 0;
        this.state = {
            hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
            gold: 0, killCredits: 0, w: 0, wMin: 0, wMax: 3,
            strokes: 0, par: 3, chronoSand: 1, brane: 'prime', boss: null
        };
        this._onVis = null; this._onResize = null; this._onFsChange = null;
    }

    Main4D.prototype._refit = function () {
        // Camera aspect + renderer size only. Never requests fullscreen.
        try {
            var g = this.mods.graphics;
            var w = window.innerWidth || 800, h = window.innerHeight || 600;
            var cam = this.camera || null;
            try { if (!cam && g) cam = g.camera || (typeof g.getCamera === 'function' ? g.getCamera() : null); } catch (e) { /* ignore */ }
            if (cam) {
                if (isFinite(w / h)) { cam.aspect = w / h; }
                if (typeof cam.updateProjectionMatrix === 'function') cam.updateProjectionMatrix();
            }
            var ren = this.renderer || (g && (g.renderer || (typeof g.getRenderer === 'function' ? g.getRenderer() : null)));
            if (ren) {
                if (typeof ren.setSize === 'function') ren.setSize(w, h, false);
                else if (ren.domElement) { ren.domElement.width = w; ren.domElement.height = h; }
            }
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.init = function (opts) {
        try {
            opts = opts || this.opts || {};
            this.mods = pick();
            var M = this.mods;
            // Engine: putt instance (fresh per boot unless caller passes one).
            try {
                if (opts.putt) this.putt = opts.putt;
                else if (M.putt && typeof M.putt === 'function') this.putt = new M.putt(opts.puttOpts || {});
                else this.putt = M.putt || null;
            } catch (e) { this.putt = null; }
            if (this.putt && this.putt.par !== undefined) this.state.par = this.putt.par;
            // Renderer/camera passthrough (owned by the host page or graphics module).
            this.renderer = opts.renderer || null;
            this.camera = opts.camera || null;
            // UI: HUD.
            try {
                if (M.HUD && typeof M.HUD === 'function') {
                    this.hud = new M.HUD({ container: opts.hudContainer || null });
                    this.hud.mount(opts.hudContainer || null);
                    this._seedMission();
                }
            } catch (e) { this.hud = null; }
            // UI: touch (coarse pointers only; module no-ops otherwise).
            try {
                if (M.Touch && typeof M.Touch === 'function') {
                    var self = this;
                    this.touch = new M.Touch({
                        onButton: function (name, down) { try { self._onTouchButton(name, down); } catch (e) { /* ignore */ } },
                        onMove: function (mv) { try { self._touchMove = mv; } catch (e) { /* ignore */ } }
                    });
                    this.touch.mount(opts.touchContainer || null);
                    if (!this.touch.root) this.touch = this.touch; // keep for snapshot() even when unmounted
                }
            } catch (e) { this.touch = null; }
            // UI: audio (lazy context; resumes on first gesture).
            try {
                if (opts.sound) this.sound = opts.sound;
                else if (M.soundBus) this.sound = M.soundBus;
                else if (M.Sound && typeof M.Sound === 'function') this.sound = new M.Sound();
                if (this.sound && typeof this.sound.bindFirstGesture === 'function') this.sound.bindFirstGesture();
            } catch (e) { this.sound = null; }
            // Lifecycle: pause on hidden tab; refit on resize/fullscreenchange.
            var self2 = this;
            this._onVis = function () {
                try { document.hidden ? self2.pause() : self2.resume(); } catch (e) { /* ignore */ }
            };
            this._onResize = function () { try { self2._refit(); } catch (e) { /* ignore */ } };
            this._onFsChange = function () { try { self2._refit(); } catch (e) { /* ignore */ } };
            try { document.addEventListener('visibilitychange', this._onVis); } catch (e) { /* ignore */ }
            try { window.addEventListener('resize', this._onResize); } catch (e) { /* ignore */ }
            try { document.addEventListener('fullscreenchange', this._onFsChange); } catch (e) { /* ignore */ }
            try { this._refit(); } catch (e) { /* ignore */ }
            return true;
        } catch (e) { return false; }
    };

    Main4D.prototype._seedMission = function () {
        try {
            if (!this.hud || typeof this.hud.setMission !== 'function') return;
            var C = this.mods.campaign;
            var list = C && (C.MISSIONS || C.missions || (typeof C.list === 'function' ? C.list() : null));
            var m = (list && list[0]) || null;
            if (m) this.hud.setMission(m.title || 'Mission 1', m.objectives || []);
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype._onTouchButton = function (name, down) {
        try {
            if (!down) return;
            if (name === 'putt') this.doPutt();
            else if (name === 'ana' || name === 'kata') {
                if (this.putt && this.putt.ball) {
                    var dir = name === 'ana' ? -1 : 1;
                    this.putt.ball.w = Math.max(this.putt.wMin !== undefined ? this.putt.wMin : 0,
                        Math.min(this.putt.wMax !== undefined ? this.putt.wMax : 3,
                            (this.putt.ball.w || 0) + dir * 0.25));
                    this.state.w = this.putt.ball.w;
                }
                if (this.sound) this.sound.playSfx('wshift');
                if (this.hud) this.hud.popup(name === 'ana' ? 'ana ⇠' : '⇢ kata', 'wshift');
            } else if (name === 'rewind') {
                if (this.sound) this.sound.playSfx('rewind');
                if (this.hud) this.hud.popup('rewind', 'info');
            }
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.doPutt = function (power) {
        try {
            if (this.putt && typeof this.putt.putt === 'function') {
                var r = this.putt.putt(power);
                this.state.strokes = this.putt.strokes | 0;
                if (this.sound) this.sound.playSfx('putt');
                return r;
            }
            return null;
        } catch (e) { return null; }
    };

    Main4D.prototype._tick = function (dt) {
        try {
            var M = this.mods;
            var input = null;
            try { input = this.touch ? this.touch.snapshot() : null; } catch (e) { input = null; }
            // Engine / world / entities updates (all optional, all guarded).
            try {
                if (this.putt && typeof this.putt.update === 'function') this.putt.update(dt, input);
                else if (this.putt && typeof this.putt.step === 'function') this.putt.step(dt);
            } catch (e) { /* ignore */ }
            try { if (M.engine && typeof M.engine.update === 'function') M.engine.update(dt, input); } catch (e) { /* ignore */ }
            try { if (M.world && typeof M.world.update === 'function') M.world.update(dt); } catch (e) { /* ignore */ }
            try { if (M.entities && typeof M.entities.update === 'function') M.entities.update(dt); } catch (e) { /* ignore */ }
            try {
                if (M.graphics && typeof M.graphics.render === 'function') M.graphics.render(dt);
                else if (this.renderer && typeof this.renderer.render === 'function' && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            } catch (e) { /* ignore */ }
            // HUD state pull: putt ball w + strokes.
            try {
                if (this.putt) {
                    if (this.putt.ball && this.putt.ball.w !== undefined) this.state.w = this.putt.ball.w;
                    if (this.putt.wMin !== undefined) this.state.wMin = this.putt.wMin;
                    if (this.putt.wMax !== undefined) this.state.wMax = this.putt.wMax;
                    this.state.strokes = this.putt.strokes | 0;
                    if (this.putt.par !== undefined) this.state.par = this.putt.par;
                }
                if (this.hud) this.hud.update(this.state);
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype._frame = function (t) {
        try {
            if (!this.running || this.paused) return;
            var dt = 0.016;
            try {
                if (this._last) dt = Math.min(0.1, Math.max(0.0001, (t - this._last) / 1000));
            } catch (e) { /* ignore */ }
            this._last = t;
            this.elapsed += dt;
            this._tick(dt);
            var self = this;
            this._raf = requestAnimationFrame(function (tt) { self._frame(tt); });
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.start = function () {
        try {
            if (this.running) return true;
            this.running = true; this.paused = false; this._last = 0;
            var self = this;
            this._raf = requestAnimationFrame(function (t) { self._frame(t); });
            return true;
        } catch (e) { return false; }
    };

    Main4D.prototype.pause = function () {
        try {
            this.paused = true;
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = 0;
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.resume = function () {
        try {
            if (!this.running || !this.paused) return;
            if (document.hidden) return; // stay paused while tab hidden
            this.paused = false; this._last = 0;
            var self = this;
            this._raf = requestAnimationFrame(function (t) { self._frame(t); });
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.stop = function () {
        try {
            this.running = false; this.paused = false;
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = 0;
            // Audio stop path (abandon/menu/hub): silence + release nodes.
            try { if (this.sound && typeof this.sound.stop === 'function') this.sound.stop(); } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };

    Main4D.prototype.destroy = function () {
        try {
            this.stop();
            try { if (this._onVis) document.removeEventListener('visibilitychange', this._onVis); } catch (e) { /* ignore */ }
            try { if (this._onResize) window.removeEventListener('resize', this._onResize); } catch (e) { /* ignore */ }
            try { if (this._onFsChange) document.removeEventListener('fullscreenchange', this._onFsChange); } catch (e) { /* ignore */ }
            try { if (this.hud) this.hud.destroy(); } catch (e) { /* ignore */ }
            try { if (this.touch) this.touch.destroy(); } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    };

    // One-shot boot: new GG4D_Main(opts).init() + start().
    Main4D.boot = function (opts) {
        try {
            var m = new Main4D(opts);
            m.init(opts);
            m.start();
            try { window.GG4D_Game = m; } catch (e) { /* ignore */ }
            return m;
        } catch (e) { return null; }
    };

    try { window.GG4D_Main = Main4D; } catch (e) { /* ignore */ }
})();
