/* AssassinAnimals FX — 00 boot.
   Shared namespace, safe DOM helpers, event bus. All modules guard DOM,
   never throw, and stay mobile-safe. Adapted from gravegain3d/aaa patterns
   (boot/registry idea) without Three.js. */
(function () {
    'use strict';
    if (window.AssassinFX) return;
    var FX = {
        version: '2.0.0',
        mods: {},
        game: function () { try { return window.AssassinGame || null; } catch (e) { return null; } },
        state: function () { var g = FX.game(); return g ? g.state : null; },
        audio: function () { var g = FX.game(); return g ? g.audio : null; },
        on: function (name, fn) {
            try { window.addEventListener('assassin:' + name, function (e) { try { fn(e.detail || {}); } catch (err) {} }); } catch (e) {}
        },
        el: function (id) { try { return document.getElementById(id); } catch (e) { return null; } },
        mk: function (id, cls, parent) {
            try {
                var ex = document.getElementById(id);
                if (ex) return ex;
                var d = document.createElement('div');
                d.id = id; d.className = cls;
                (parent || document.body).appendChild(d);
                return d;
            } catch (e) { return null; }
        },
        viewport: function () {
            try { return document.getElementById('viewportContainer') || document.getElementById('gameMain') || document.body; }
            catch (e) { return document.body; }
        },
        clamp: function (v, a, b) { return Math.max(a, Math.min(b, v)); }
    };
    window.AssassinFX = FX;
})();
