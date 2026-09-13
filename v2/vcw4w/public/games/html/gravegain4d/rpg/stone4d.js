(function () {
    'use strict';
    if (window.GG4D_Stone) return;

    // GraveGain4D STONE meter — block-resource bar mirroring the saga STONE bar.
    // Saga rules (gravegain3d/entities/player.js, engine/game-data.js):
    //   Bulwark Stance (Right Click) = ~90% block; Dwarf Stone Form = 5s immune.
    // 4D model here: melee hits BUILD stone, spending on Bulwark blocks and
    // Stone Form DRAINS it; full bar reads READY.
    //
    // Same conventions as ui/hud4d.js: vanilla ES5 IIFE, never throws,
    // guarded DOM, owns its CSS + DOM (never edits HUD files). No dblclick.
    //
    //   onMeleeHit(n)      — build (default +12 per hit)
    //   spend(n, reason)   — spend, false when insufficient
    //   tryBulwark(cost)   — spend-or-fail for a Bulwark block
    //   tryStoneForm()     — full-bar (or >= cost) spend -> 5s immune window
    //   update(dt)         — ticks the Stone Form countdown; call each frame

    var CSS_ID = 'gg4d-stone-style';
    var MAX = 100;
    var BUILD_PER_HIT = 12;
    var BULWARK_COST = 25;
    var STONEFORM_COST = 100;
    var STONEFORM_SECONDS = 5.0;
    var CSS =
        '.gg4d-stone{position:fixed;left:10px;bottom:10px;z-index:40;pointer-events:none;' +
        'font-family:system-ui,sans-serif;color:#e8e6df;font-size:12px}' +
        '.gg4d-stone .st-lbl{display:flex;justify-content:space-between;width:200px;' +
        'text-shadow:0 1px 2px #000;margin-bottom:2px}' +
        '.gg4d-stone .st-ready{font-weight:800;color:#8a7a3a}' +
        '.gg4d-stone.ready .st-ready{color:#ffd24d;text-shadow:0 0 6px #ffd24d}' +
        '.gg4d-stone .st-bar{width:200px;height:14px;background:rgba(0,0,0,.55);' +
        'border:1px solid #8a7a3a;border-radius:3px;overflow:hidden}' +
        '.gg4d-stone .st-bar>i{display:block;height:100%;width:0%;' +
        'background:linear-gradient(90deg,#7e5109,#f9e79f)}' +
        '.gg4d-stone.ready .st-bar{border-color:#ffd24d;box-shadow:0 0 8px rgba(255,210,77,.6)}' +
        '.gg4d-stone .st-form{display:none;margin-top:2px;font-weight:800;color:#cfe3ff;' +
        'text-shadow:0 1px 2px #000}' +
        '.gg4d-stone.immune .st-form{display:block}';

    function ensureCSS(doc) {
        try {
            if (!doc || doc.getElementById(CSS_ID)) return;
            var st = doc.createElement('style');
            st.id = CSS_ID;
            st.textContent = CSS;
            (doc.head || doc.documentElement).appendChild(st);
        } catch (e) { /* ignore */ }
    }

    function clamp(v) {
        v = Number(v);
        if (!isFinite(v)) return 0;
        return Math.max(0, Math.min(MAX, v));
    }

    function Stone4D(opts) {
        opts = opts || {};
        this.value = clamp(opts.value);
        this.formLeft = 0; // Stone Form immunity countdown (seconds).
        this.root = null;
        this.fill = null;
        this.readyEl = null;
        this.valEl = null;
        this.formEl = null;
        this.container = opts.container || null;
    }

    Stone4D.prototype.mount = function (container) {
        try {
            if (this.root) return this.root;
            var doc = (container && container.ownerDocument) || document;
            var host = container || this.container || doc.body;
            if (!host || !doc.createElement) return null;
            ensureCSS(doc);
            var root = doc.createElement('div');
            root.className = 'gg4d-stone';
            host.appendChild(root);
            var lbl = doc.createElement('div');
            lbl.className = 'st-lbl';
            root.appendChild(lbl);
            var nm = doc.createElement('span');
            nm.textContent = '🪨 STONE';
            lbl.appendChild(nm);
            this.valEl = doc.createElement('span');
            lbl.appendChild(this.valEl);
            this.readyEl = doc.createElement('span');
            this.readyEl.className = 'st-ready';
            lbl.appendChild(this.readyEl);
            var bar = doc.createElement('div');
            bar.className = 'st-bar';
            root.appendChild(bar);
            this.fill = doc.createElement('i');
            bar.appendChild(this.fill);
            this.formEl = doc.createElement('div');
            this.formEl.className = 'st-form';
            root.appendChild(this.formEl);
            this.root = root;
            this.render();
            return root;
        } catch (e) { return null; }
    };

    Stone4D.prototype.render = function () {
        try {
            if (!this.root) return;
            if (this.fill) this.fill.style.width = (this.value).toFixed(1) + '%';
            var ready = this.value >= MAX;
            if (this.valEl) this.valEl.textContent = Math.floor(this.value) + '/' + MAX;
            if (this.readyEl) this.readyEl.textContent = ready ? 'READY' : '';
            if (this.formEl) {
                this.formEl.textContent = this.formLeft > 0 ?
                    'STONE FORM — IMMUNE ' + this.formLeft.toFixed(1) + 's' : '';
            }
            if (this.root.classList) {
                if (ready) this.root.classList.add('ready');
                else this.root.classList.remove('ready');
                if (this.formLeft > 0) this.root.classList.add('immune');
                else this.root.classList.remove('immune');
            }
        } catch (e) { /* ignore */ }
    };

    // Build on melee hits. Extra param kept for crits (x2 callers pass 2x).
    Stone4D.prototype.onMeleeHit = function (amount) {
        try {
            if (amount === undefined || amount === null) amount = BUILD_PER_HIT;
            this.value = clamp(this.value + Number(amount));
            this.render();
            return this.value;
        } catch (e) { return 0; }
    };

    Stone4D.prototype.spend = function (amount, reason) {
        try {
            amount = Math.max(0, Number(amount) || 0);
            if (this.value < amount) return false;
            this.value = clamp(this.value - amount);
            this.render();
            return true;
        } catch (e) { return false; }
    };

    // Bulwark block: costs stone, caller applies the 90% reduction.
    Stone4D.prototype.tryBulwark = function (cost) {
        try {
            if (cost === undefined || cost === null) cost = BULWARK_COST;
            return this.spend(cost, 'bulwark');
        } catch (e) { return false; }
    };

    // Stone Form: full-bar spend -> 5s immune (saga parity).
    Stone4D.prototype.tryStoneForm = function () {
        try {
            if (this.formLeft > 0) return true; // already immune
            if (!this.spend(STONEFORM_COST, 'stoneform')) return false;
            this.formLeft = STONEFORM_SECONDS;
            this.render();
            return true;
        } catch (e) { return false; }
    };

    Stone4D.prototype.isImmune = function () {
        try { return this.formLeft > 0; } catch (e) { return false; }
    };

    Stone4D.prototype.isReady = function () {
        try { return this.value >= MAX; } catch (e) { return false; }
    };

    // Tick the immunity window; call each frame with dt seconds.
    Stone4D.prototype.update = function (dt) {
        try {
            dt = Number(dt);
            if (!isFinite(dt) || dt < 0) return;
            if (this.formLeft > 0) {
                this.formLeft = Math.max(0, this.formLeft - dt);
                this.render();
            }
        } catch (e) { /* ignore */ }
    };

    Stone4D.prototype.reset = function () {
        try {
            this.value = 0;
            this.formLeft = 0;
            this.render();
        } catch (e) { /* ignore */ }
    };

    Stone4D.prototype.destroy = function () {
        try {
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
        } catch (e) { /* ignore */ }
        this.root = null;
    };

    var singleton = null;
    function get() {
        if (!singleton) singleton = new Stone4D({});
        return singleton;
    }

    try {
        window.GG4D_Stone = {
            Stone: Stone4D,
            MAX: MAX,
            BUILD_PER_HIT: BUILD_PER_HIT,
            BULWARK_COST: BULWARK_COST,
            STONEFORM_COST: STONEFORM_COST,
            STONEFORM_SECONDS: STONEFORM_SECONDS,
            mount: function (c) { return get().mount(c); },
            onMeleeHit: function (n) { return get().onMeleeHit(n); },
            spend: function (n, r) { return get().spend(n, r); },
            tryBulwark: function (c) { return get().tryBulwark(c); },
            tryStoneForm: function () { return get().tryStoneForm(); },
            isImmune: function () { return get().isImmune(); },
            isReady: function () { return get().isReady(); },
            update: function (dt) { return get().update(dt); },
            reset: function () { return get().reset(); }
        };
    } catch (e) { /* ignore */ }
})();
