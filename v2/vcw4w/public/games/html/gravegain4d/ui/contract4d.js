(function () {
    'use strict';
    if (window.GG4D_Contract) return;

    // GraveGain4D CONTRACT tracker — right-side saga chrome.
    // Same conventions as ui/hud4d.js: vanilla ES5 IIFE, never throws,
    // all DOM access guarded (safe headless / pre-DOM), creates its own
    // DOM + CSS (never touches HUD4D internals). No fullscreen/dblclick.
    //
    // Fed two ways:
    //   1. setMission(title, objectives) — objectives shaped like
    //      campaign/m01.js: [{id, desc, count}] (count optional).
    //   2. onKill(evt) — kill events bump live counts; the first
    //      incomplete counted objective whose id matches (or any
    //      slay/kill objective when no id matches) advances.
    // Pulls the active campaign mission automatically when
    // window.GG4D_Campaign exposes getCurrent()/current.

    var CSS_ID = 'gg4d-contract-style';
    var CSS =
        '.gg4d-contract{position:fixed;top:132px;right:10px;width:230px;z-index:40;' +
        'pointer-events:none;font-family:system-ui,sans-serif;color:#e8e6df;font-size:12px;' +
        'background:rgba(0,0,0,.55);border:1px solid #8a7a3a;border-radius:4px;padding:7px 9px}' +
        '.gg4d-contract .ct-kicker{font-size:10px;letter-spacing:2px;color:#d8c56a;opacity:.9}' +
        '.gg4d-contract h4{margin:2px 0 6px;font-size:12px}' +
        '.gg4d-contract ul{margin:0;padding-left:16px}' +
        '.gg4d-contract li{margin:2px 0;text-shadow:0 1px 2px #000}' +
        '.gg4d-contract li.done{color:#7dffa8;text-decoration:line-through}' +
        '.gg4d-contract .ct-stamp{display:none;margin-top:6px;text-align:center;font-weight:800;' +
        'font-size:13px;color:#7dffa8;border:2px solid #7dffa8;border-radius:4px;' +
        'padding:3px 0;transform:rotate(-4deg)}' +
        '.gg4d-contract.complete .ct-stamp{display:block}';

    function el(tag, cls, parent) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (parent) parent.appendChild(d);
        return d;
    }

    function ensureCSS(doc) {
        try {
            if (!doc || doc.getElementById(CSS_ID)) return;
            var st = doc.createElement('style');
            st.id = CSS_ID;
            st.textContent = CSS;
            (doc.head || doc.documentElement).appendChild(st);
        } catch (e) { /* ignore */ }
    }

    function normObjectives(list) {
        var out = [];
        try {
            (list || []).forEach(function (o) {
                out.push({
                    id: o.id || o.key || '',
                    desc: o.desc || o.text || o.title || 'Objective',
                    count: (o.count === undefined || o.count === null) ? 0 : (o.count | 0),
                    current: o.current | 0 || 0,
                    done: !!o.done
                });
            });
        } catch (e) { /* ignore */ }
        return out;
    }

    function Contract4D(opts) {
        opts = opts || {};
        this.root = null;
        this.titleEl = null;
        this.listEl = null;
        this.title = '';
        this.objectives = [];
        this.complete = false;
        this.container = opts.container || null;
        this.onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : null;
    }

    Contract4D.prototype.mount = function (container) {
        try {
            if (this.root) return this.root;
            var doc = (container && container.ownerDocument) || document;
            var host = container || this.container || doc.body;
            if (!host || !doc.createElement) return null;
            ensureCSS(doc);
            var root = el('div', 'gg4d-contract', host);
            el('div', 'ct-kicker', root).textContent = '◆ CONTRACT';
            this.titleEl = el('h4', '', root);
            this.titleEl.textContent = this.title || 'No contract';
            this.listEl = el('ul', '', root);
            el('div', 'ct-stamp', root).textContent = '★ MISSION COMPLETE ★';
            this.root = root;
            this.render();
            this.pullCampaign();
            return root;
        } catch (e) { return null; }
    };

    // Pull {title, objectives} from the campaign registry when available.
    Contract4D.prototype.pullCampaign = function () {
        try {
            var C = window.GG4D_Campaign;
            if (!C) return false;
            var cur = null;
            if (typeof C.getCurrent === 'function') cur = C.getCurrent();
            else if (C.current) cur = C.current;
            else if (typeof C.get === 'function' && C.activeId !== undefined) cur = C.get(C.activeId);
            if (!cur) return false;
            this.setMission(cur.title || cur.subtitle || cur.id, cur.objectives);
            return true;
        } catch (e) { return false; }
    };

    Contract4D.prototype.setMission = function (title, objectives) {
        try {
            this.title = String(title || 'Contract');
            this.objectives = normObjectives(objectives);
            this.complete = false;
            this.render();
        } catch (e) { /* ignore */ }
    };

    // Kill event: {id?, kind?} — e.g. {id:'grave_husk_4d'} or {kind:'slay'}.
    // Advances the first incomplete counted objective that matches, else the
    // first incomplete counted slay-like objective, else any incomplete count.
    Contract4D.prototype.onKill = function (evt) {
        try {
            evt = evt || {};
            var key = String(evt.id || evt.kind || evt.type || '').toLowerCase();
            var best = -1;
            var i, o, id;
            for (i = 0; i < this.objectives.length; i++) {
                o = this.objectives[i];
                if (o.done || !(o.count > 0) || o.current >= o.count) continue;
                id = String(o.id || '').toLowerCase();
                if (key && id && (id === key || id.indexOf(key) !== -1 || key.indexOf(id) !== -1)) { best = i; break; }
            }
            if (best === -1) {
                for (i = 0; i < this.objectives.length; i++) {
                    o = this.objectives[i];
                    if (o.done || !(o.count > 0) || o.current >= o.count) continue;
                    id = String(o.id || '').toLowerCase();
                    if (id.indexOf('slay') !== -1 || id.indexOf('kill') !== -1 ||
                        id.indexOf('undead') !== -1 || id.indexOf('eliminate') !== -1) { best = i; break; }
                }
            }
            if (best === -1) {
                for (i = 0; i < this.objectives.length; i++) {
                    o = this.objectives[i];
                    if (!o.done && o.count > 0 && o.current < o.count) { best = i; break; }
                }
            }
            if (best === -1) return false;
            this.objectives[best].current += 1;
            if (this.objectives[best].current >= this.objectives[best].count) {
                this.objectives[best].done = true;
            }
            this.render();
            this.checkComplete();
            return true;
        } catch (e) { return false; }
    };

    // Direct progress set (e.g. seal_echo 0/1 -> 1/1): setProgress('seal_echo', 1).
    Contract4D.prototype.setProgress = function (id, current) {
        try {
            var found = false;
            for (var i = 0; i < this.objectives.length; i++) {
                if (String(this.objectives[i].id) === String(id)) {
                    this.objectives[i].current = Math.max(0, current | 0);
                    if (this.objectives[i].count > 0 && this.objectives[i].current >= this.objectives[i].count) {
                        this.objectives[i].done = true;
                    }
                    found = true;
                }
            }
            if (found) { this.render(); this.checkComplete(); }
            return found;
        } catch (e) { return false; }
    };

    Contract4D.prototype.checkComplete = function () {
        try {
            if (this.complete || !this.objectives.length) return false;
            for (var i = 0; i < this.objectives.length; i++) {
                if (!this.objectives[i].done) return false;
            }
            this.complete = true;
            this.render();
            if (this.onComplete) {
                try { this.onComplete(this.title); } catch (e) { /* ignore */ }
            }
            return true;
        } catch (e) { return false; }
    };

    Contract4D.prototype.reset = function () {
        try {
            for (var i = 0; i < this.objectives.length; i++) {
                this.objectives[i].current = 0;
                this.objectives[i].done = false;
            }
            this.complete = false;
            this.render();
        } catch (e) { /* ignore */ }
    };

    Contract4D.prototype.render = function () {
        try {
            if (!this.root) return;
            if (this.titleEl) this.titleEl.textContent = this.title || 'No contract';
            if (this.listEl) {
                while (this.listEl.firstChild) this.listEl.removeChild(this.listEl.firstChild);
                var doc = this.listEl.ownerDocument || document;
                for (var i = 0; i < this.objectives.length; i++) {
                    (function (o) {
                        var li = doc.createElement('li');
                        if (o.done) li.className = 'done';
                        var mark = o.done ? '✔ ' : '• ';
                        var prog = o.count > 0 ? ' ' + Math.min(o.current, o.count) + '/' + o.count : '';
                        li.textContent = mark + o.desc + prog;
                        this.listEl.appendChild(li);
                    }).call(this, this.objectives[i]);
                }
            }
            if (this.complete) this.root.classList.add('complete');
            else if (this.root.classList) this.root.classList.remove('complete');
        } catch (e) { /* ignore */ }
    };

    Contract4D.prototype.destroy = function () {
        try {
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
        } catch (e) { /* ignore */ }
        this.root = null;
    };

    var singleton = null;
    function get() {
        if (!singleton) singleton = new Contract4D({});
        return singleton;
    }

    try {
        window.GG4D_Contract = {
            Contract: Contract4D,
            mount: function (c) { return get().mount(c); },
            setMission: function (t, o) { return get().setMission(t, o); },
            onKill: function (e) { return get().onKill(e); },
            setProgress: function (id, n) { return get().setProgress(id, n); },
            reset: function () { return get().reset(); },
            pullCampaign: function () { return get().pullCampaign(); },
            isComplete: function () { try { return !!get().complete; } catch (e) { return false; } }
        };
    } catch (e) { /* ignore */ }
})();
