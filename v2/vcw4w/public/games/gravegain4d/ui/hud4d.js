(function () {
    'use strict';
    if (window.GG4D_HUD) return;

    // GraveGain4D HUD — HP/stamina/gold/KillCredits + 4D meters.
    // Same popup style as gravegain3d/ui/combat-text.js: absolutely-
    // positioned divs with class "combat-text <type>", removed after ~850ms,
    // plus a #hudNotification-style banner hook. Never throws; all DOM
    // access is guarded so the module is safe headless / pre-DOM.

    var CSS_ID = 'gg4d-hud-style';

    var CSS =
        '.gg4d-hud{position:fixed;inset:0;pointer-events:none;z-index:40;' +
        'font-family:system-ui,sans-serif;color:#e8e6df;font-size:13px}' +
        '.gg4d-tl{position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:6px}' +
        '.gg4d-bar{width:200px;height:14px;background:rgba(0,0,0,.55);border:1px solid #555;border-radius:3px;overflow:hidden}' +
        '.gg4d-bar>i{display:block;height:100%;width:100%}' +
        '.gg4d-hp>i{background:linear-gradient(90deg,#c0392b,#e74c3c)}' +
        '.gg4d-st>i{background:linear-gradient(90deg,#1e8449,#58d68d)}' +
        '.gg4d-row{display:flex;gap:10px;align-items:center;text-shadow:0 1px 2px #000}' +
        '.gg4d-w{width:200px;height:12px;background:rgba(0,0,0,.55);border:1px solid #7d6cf0;border-radius:6px;position:relative;overflow:hidden}' +
        '.gg4d-w>i{position:absolute;top:0;bottom:0;left:50%;width:4px;margin-left:-2px;background:#b9aaff}' +
        '.gg4d-wlbl{display:flex;justify-content:space-between;width:200px;font-size:11px;opacity:.9}' +
        '.gg4d-sand{width:200px;height:10px;background:rgba(0,0,0,.55);border:1px solid #d4ac0d;border-radius:3px;overflow:hidden}' +
        '.gg4d-sand>i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#7e5109,#f9e79f)}' +
        '.gg4d-brane{padding:2px 8px;border:1px solid #888;border-radius:10px;background:rgba(0,0,0,.5);display:inline-block}' +
        '.gg4d-boss{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:min(480px,70vw);display:none}' +
        '.gg4d-boss.on{display:block}' +
        '.gg4d-boss .nm{text-align:center;margin-bottom:3px;text-shadow:0 1px 2px #000}' +
        '.gg4d-boss .gg4d-bar{width:100%;height:12px;border-color:#a00}' +
        '.gg4d-boss .gg4d-bar>i{background:linear-gradient(90deg,#7b241c,#ff5b4d)}' +
        '.gg4d-mission{position:absolute;top:10px;right:10px;max-width:240px;background:rgba(0,0,0,.5);' +
        'border:1px solid #666;border-radius:4px;padding:6px 8px}' +
        '.gg4d-mission h4{margin:0 0 4px;font-size:12px}' +
        '.gg4d-mission ul{margin:0;padding-left:16px;font-size:12px}' +
        '.gg4d-pop{position:absolute;transform:translate(-50%,-50%);pointer-events:none}' +
        '.combat-text{position:absolute;transform:translate(-50%,-50%);font-weight:700;' +
        'text-shadow:0 1px 2px #000,-1px 0 2px #000;animation:gg4d-rise .85s ease-out forwards}' +
        '.combat-text.damage{color:#ff6b5e}.combat-text.crit{color:#ffd24d;font-size:1.3em}' +
        '.combat-text.heal{color:#7dffa8}.combat-text.gold{color:#ffe98a}' +
        '.combat-text.wshift{color:#b9aaff}.combat-text.info{color:#cfe3ff}' +
        '@keyframes gg4d-rise{from{opacity:1;margin-top:0}to{opacity:0;margin-top:-42px}}' +
        '.gg4d-banner{position:absolute;top:22%;left:50%;transform:translateX(-50%);font-size:22px;' +
        'font-weight:800;text-shadow:0 2px 4px #000;background:rgba(0,0,0,.55);padding:8px 18px;' +
        'border:1px solid #999;border-radius:6px;display:none}' +
        '.gg4d-banner.on{display:block}';

    function el(tag, cls, parent) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (parent) parent.appendChild(d);
        return d;
    }

    function setWidth(bar, frac) {
        try {
            frac = Math.max(0, Math.min(1, Number(frac) || 0));
            bar.style.width = (frac * 100).toFixed(1) + '%';
        } catch (e) { /* ignore */ }
    }

    function HUD4D(opts) {
        opts = opts || {};
        this.root = null;
        this.hpFill = null; this.stFill = null; this.sandFill = null;
        this.wNeedle = null; this.goldEl = null; this.kcEl = null;
        this.strokeEl = null; this.braneEl = null; this.bossWrap = null;
        this.bossFill = null; this.bossName = null; this.popLayer = null;
        this.bannerEl = null; this.missionEl = null; this.missionBody = null;
        this.bannerTimer = null;
        this.container = opts.container || null;
    }

    HUD4D.prototype.mount = function (container) {
        try {
            if (this.root) return this.root;
            var doc = (container && container.ownerDocument) || document;
            var host = container || this.container || doc.body;
            if (!host) return null;
            if (!doc.getElementById(CSS_ID)) {
                var st = doc.createElement('style');
                st.id = CSS_ID;
                st.textContent = CSS;
                (doc.head || doc.documentElement).appendChild(st);
            }
            var root = el('div', 'gg4d-hud', host);
            var tl = el('div', 'gg4d-tl', root);
            var hp = el('div', 'gg4d-bar gg4d-hp', tl); this.hpFill = el('i', '', hp);
            var stm = el('div', 'gg4d-bar gg4d-st', tl); this.stFill = el('i', '', stm);
            var row = el('div', 'gg4d-row', tl);
            this.goldEl = el('span', '', row); this.kcEl = el('span', '', row);
            this.strokeEl = el('span', '', row);
            var wlbl = el('div', 'gg4d-wlbl', tl);
            wlbl.appendChild(doc.createTextNode('ana'));
            wlbl.appendChild(doc.createTextNode('W-slice'));
            wlbl.appendChild(doc.createTextNode('kata'));
            var w = el('div', 'gg4d-w', tl); this.wNeedle = el('i', '', w);
            var sand = el('div', 'gg4d-sand', tl); this.sandFill = el('i', '', sand);
            this.braneEl = el('span', 'gg4d-brane', tl);
            var boss = el('div', 'gg4d-boss', root);
            this.bossName = el('div', 'nm', boss);
            var bb = el('div', 'gg4d-bar', boss); this.bossFill = el('i', '', bb);
            var mission = el('div', 'gg4d-mission', root);
            el('h4', '', mission).textContent = 'Mission';
            this.missionBody = el('ul', '', mission);
            this.missionEl = mission;
            this.bannerEl = el('div', 'gg4d-banner', root);
            this.popLayer = el('div', 'gg4d-pop', root);
            this.popLayer.style.cssText = 'position:absolute;inset:0;overflow:hidden';
            this.root = root;
            this.update({});
            return root;
        } catch (e) { return null; }
    };

    // state: {hp,maxHp,stamina,maxStamina,gold,killCredits,w,wMin,wMax,
    //         strokes,par,chronoSand(0..1),brane,boss:{name,hp,maxHp}|null}
    HUD4D.prototype.update = function (s) {
        try {
            s = s || {};
            if (!this.root) return;
            setWidth(this.hpFill, s.maxHp ? s.hp / s.maxHp : (s.hpFrac !== undefined ? s.hpFrac : 1));
            setWidth(this.stFill, s.maxStamina ? s.stamina / s.maxStamina : (s.stFrac !== undefined ? s.stFrac : 1));
            setWidth(this.sandFill, s.chronoSand !== undefined ? s.chronoSand : 1);
            if (this.goldEl) this.goldEl.textContent = '🪙 ' + (s.gold | 0 || 0);
            if (this.kcEl) this.kcEl.textContent = '💀 ' + (s.killCredits | 0 || 0);
            if (this.strokeEl) this.strokeEl.textContent = '⛳ ' + (s.strokes | 0 || 0) + '/' + (s.par !== undefined ? s.par : '–');
            if (this.wNeedle) {
                var lo = (s.wMin !== undefined ? s.wMin : 0), hi = (s.wMax !== undefined ? s.wMax : 3);
                var wv = (s.w !== undefined ? s.w : (lo + hi) / 2);
                var f = hi > lo ? (wv - lo) / (hi - lo) : 0.5;
                f = Math.max(0, Math.min(1, f));
                this.wNeedle.style.left = (f * 100).toFixed(1) + '%';
            }
            if (this.braneEl) this.braneEl.textContent = 'brane: ' + (s.brane || 'prime');
            this.setBoss(s.boss || null);
        } catch (e) { /* ignore */ }
    };

    HUD4D.prototype.setBoss = function (boss) {
        try {
            if (!this.root) return;
            if (!boss) { this.bossFill.parentNode.parentNode.classList.remove('on'); return; }
            var wrap = this.bossFill.parentNode.parentNode;
            wrap.classList.add('on');
            if (this.bossName) this.bossName.textContent = boss.name || 'Boss';
            setWidth(this.bossFill, boss.maxHp ? boss.hp / boss.maxHp : 1);
        } catch (e) { /* ignore */ }
    };

    // Combat-text popup at screen px (x,y) within the HUD root.
    // Falls back to container centre when coords omitted.
    HUD4D.prototype.popup = function (text, type, x, y) {
        try {
            var layer = this.popLayer || (this.root ? this.root : null);
            if (!layer || !document.createElement) return null;
            var rect = layer.getBoundingClientRect ? layer.getBoundingClientRect() : { width: 640, height: 400 };
            var d = document.createElement('div');
            d.className = 'combat-text ' + (type || 'damage');
            d.style.left = ((x !== undefined ? x : rect.width / 2)) + 'px';
            d.style.top = ((y !== undefined ? y : rect.height / 2)) + 'px';
            d.textContent = String(text);
            layer.appendChild(d);
            setTimeout(function () { try { d.remove(); } catch (e) { /* ignore */ } }, 850);
            return d;
        } catch (e) { return null; }
    };

    // Project a world XYZ through a THREE camera into HUD px, then popup.
    HUD4D.prototype.popupWorld = function (camera, wx, wy, wz, text, type) {
        try {
            var T = window.THREE;
            if (!camera || !T || !T.Vector3) return this.popup(text, type);
            var layer = this.popLayer || this.root;
            var v = new T.Vector3(wx, (wy || 0) + 14, wz).project(camera);
            if (v.z > 1) return null;
            var rect = layer.getBoundingClientRect();
            return this.popup(text, type,
                (v.x * 0.5 + 0.5) * rect.width,
                (-v.y * 0.5 + 0.5) * rect.height);
        } catch (e) { return null; }
    };

    HUD4D.prototype.banner = function (text, duration) {
        try {
            // Prefer the host page banner when present (3D parity).
            var ext = document.getElementById('hudNotification');
            if (ext) {
                ext.textContent = String(text);
                ext.classList.remove('hidden');
                clearTimeout(this.bannerTimer);
                this.bannerTimer = setTimeout(function () {
                    try { ext.classList.add('hidden'); } catch (e) { /* ignore */ }
                }, duration || 2500);
                return;
            }
            if (!this.bannerEl) return;
            this.bannerEl.textContent = String(text);
            this.bannerEl.classList.add('on');
            clearTimeout(this.bannerTimer);
            var self = this;
            this.bannerTimer = setTimeout(function () {
                try { self.bannerEl.classList.remove('on'); } catch (e) { /* ignore */ }
            }, duration || 2500);
        } catch (e) { /* ignore */ }
    };

    // Mission tracker hook: setMission(title, [{desc,current,count, done}])
    HUD4D.prototype.setMission = function (title, objectives) {
        try {
            if (!this.missionBody) return;
            while (this.missionBody.firstChild) this.missionBody.removeChild(this.missionBody.firstChild);
            var h = this.missionEl ? this.missionEl.querySelector('h4') : null;
            if (h) h.textContent = title || 'Mission';
            (objectives || []).forEach(function (o) {
                var li = document.createElement('li');
                var mark = o.done ? '✔ ' : '• ';
                var prog = (o.count ? ' (' + (o.current | 0) + '/' + o.count + ')' : '');
                li.textContent = mark + (o.desc || o.text || '') + prog;
                this.missionBody.appendChild(li);
            }, this);
            if (this.missionEl) this.missionEl.style.display = (!title && !(objectives && objectives.length)) ? 'none' : '';
        } catch (e) { /* ignore */ }
    };

    HUD4D.prototype.destroy = function () {
        try {
            clearTimeout(this.bannerTimer);
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
        } catch (e) { /* ignore */ }
        this.root = null;
    };

    try { window.GG4D_HUD = HUD4D; } catch (e) { /* ignore */ }
})();
