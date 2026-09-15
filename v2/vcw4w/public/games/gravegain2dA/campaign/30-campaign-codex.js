/* GraveGain2D Campaign - 30 codex unlocks.
   Persists mission lore unlocks to localStorage, shows CODEX UNLOCKED
   toasts, and badges newly-unlocked lore entries with a NEW pill in
   the lore list.
   Mirrors gravegain3d/campaign/30-campaign-codex.js, adapted for 2D:
   - No AAA bus: hooks the shared GraveGainStoryEngine.completeMission
     statically (chain-safe - captures the current function, so it
     chains with the director's star-rating wrapper) and patches the
     live window.GraveGainGame instance's renderLoreList.
   - 2D lore buttons call viewLoreEntry('id') (see game.js
     renderLoreList); badge parsing matches that shape.
   Store key is shared with 3D so unlocks carry across both games.
   Everything guarded; never throws. */
(function () {
    'use strict';

    var STORE_KEY = 'gravegain_campaign_codex_v1';
    var ENGINE_FLAG = '__gg2dCodexWrapped';
    var INSTANCE_FLAG = '__gg2dCodexUiPatched';
    var MAX_TOASTS = 3;
    var TOAST_MS = 4000;

    function loadStore() {
        try {
            var raw = window.localStorage.getItem(STORE_KEY);
            if (!raw) return { unlocked: [] };
            var parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.unlocked)) return { unlocked: [] };
            return { unlocked: parsed.unlocked.filter(function (id) { return typeof id === 'string'; }) };
        } catch (_) {
            return { unlocked: [] };
        }
    }

    function saveStore(ids) {
        try {
            window.localStorage.setItem(STORE_KEY, JSON.stringify({ unlocked: ids }));
            return true;
        } catch (_) {
            return false;
        }
    }

    function unlockedSet() {
        var store = loadStore();
        var set = {};
        store.unlocked.forEach(function (id) { set[id] = true; });
        return set;
    }

    // Extend the existing registry in place - never replace it.
    try {
        var Camp = window.GraveGainCampaign || (window.GraveGainCampaign = {});
        Camp.getUnlockedLore = function () {
            try { return loadStore().unlocked.slice(); }
            catch (_) { return []; }
        };
        Camp.isLoreUnlocked = function (id) {
            try {
                if (id === undefined || id === null) return false;
                return !!unlockedSet()[String(id)];
            } catch (_) { return false; }
        };
    } catch (_) { /* ignore */ }

    function loreTitle(id) {
        try {
            if (window.GraveGainLore && typeof window.GraveGainLore.get === 'function') {
                var entry = window.GraveGainLore.get(id);
                if (entry && entry.title) return entry.title;
            }
        } catch (_) { /* ignore */ }
        return String(id);
    }

    function ensureToastHost() {
        try {
            var host = document.getElementById('campCodexToast');
            if (host) return host;
            host = document.createElement('div');
            host.id = 'campCodexToast';
            document.body.appendChild(host);
            return host;
        } catch (_) {
            return null;
        }
    }

    function showUnlockToasts(newIds) {
        try {
            if (!newIds || !newIds.length) return;
            var host = ensureToastHost();
            if (!host) return;
            newIds.forEach(function (id) {
                try {
                    // Cap the visible stack: drop the oldest first.
                    while (host.querySelectorAll('.camp-codex-toast').length >= MAX_TOASTS) {
                        var oldest = host.querySelector('.camp-codex-toast');
                        if (!oldest) break;
                        oldest.remove();
                    }
                    var toast = document.createElement('div');
                    toast.className = 'camp-codex-toast';
                    var label = document.createElement('span');
                    label.textContent = '📖 CODEX UNLOCKED: ' + loreTitle(id);
                    toast.appendChild(label);
                    host.appendChild(toast);
                    setTimeout(function () {
                        try { toast.remove(); } catch (_) { /* ignore */ }
                    }, TOAST_MS);
                } catch (_) { /* one bad toast must not break the rest */ }
            });
        } catch (_) { /* never throw */ }
    }

    function extraFor(id) {
        try {
            var camp = window.GraveGainCampaign;
            if (camp && typeof camp.getExtra === 'function') return camp.getExtra(id) || null;
        } catch (_) { /* ignore */ }
        return null;
    }

    function grantUnlocks(missionId) {
        try {
            if (missionId === undefined || missionId === null) return;
            var ex = extraFor(missionId);
            var unlocks = (ex && Array.isArray(ex.loreUnlocks)) ? ex.loreUnlocks : [];
            if (!unlocks.length) return;
            var store = loadStore();
            var have = {};
            store.unlocked.forEach(function (x) { have[x] = true; });
            var fresh = [];
            unlocks.forEach(function (lid) {
                try {
                    var key = String(lid);
                    if (!have[key]) {
                        have[key] = true;
                        store.unlocked.push(key);
                        fresh.push(key);
                    }
                } catch (_) { /* ignore */ }
            });
            if (!fresh.length) return;
            saveStore(store.unlocked);
            showUnlockToasts(fresh);
        } catch (_) { /* never throw */ }
    }

    function loreIdFromOnclick(onclick) {
        try {
            if (typeof onclick !== 'string') return null;
            // 2D shape: window.GraveGainGame.viewLoreEntry('some_id')
            var m = onclick.match(/viewLoreEntry\(['"]([^'"]+)['"]\)/);
            return m ? m[1] : null;
        } catch (_) {
            return null;
        }
    }

    // Hook mission completion: chain outside any existing wrapper (the
    // director's star-rating wrapper when present).
    function hookEngine() {
        try {
            var Engine = window.GraveGainStoryEngine;
            if (!Engine || typeof Engine.completeMission !== 'function') return false;
            if (Engine[ENGINE_FLAG]) return true;
            var inner = Engine.completeMission.bind(Engine);
            var wrapped = function (missionId, stars) {
                try {
                    inner(missionId, stars);
                } catch (e) {
                    try { console.warn('[Campaign2D] codex completeMission inner failed', e); } catch (_) {}
                }
                try {
                    grantUnlocks(missionId);
                } catch (_) { /* garnish only */ }
            };
            try { wrapped[ENGINE_FLAG] = true; } catch (_) { /* ignore */ }
            Engine.completeMission = wrapped;
            return true;
        } catch (_) {
            return false;
        }
    }

    function patchLoreList(game) {
        try {
            if (!game || typeof game.renderLoreList !== 'function') return;
            var bag = game[INSTANCE_FLAG];
            if (bag && bag.renderLoreList) return;
            var orig = game.renderLoreList.bind(game);
            game.renderLoreList = function () {
                var out;
                try { out = orig(); } catch (e) { out = undefined; }
                try {
                    var listEl = document.getElementById('loreList');
                    if (listEl) {
                        var set = unlockedSet();
                        var buttons = listEl.querySelectorAll('button[onclick]');
                        buttons.forEach(function (btn) {
                            try {
                                if (btn.querySelector('.camp-new-badge')) return;
                                var lid = loreIdFromOnclick(btn.getAttribute('onclick'));
                                if (lid && set[lid]) {
                                    var badge = document.createElement('span');
                                    badge.className = 'camp-new-badge';
                                    badge.textContent = 'NEW';
                                    btn.appendChild(badge);
                                }
                            } catch (_) { /* keep going */ }
                        });
                    }
                } catch (_) { /* garnish only */ }
                return out;
            };
            try {
                var fresh = game[INSTANCE_FLAG];
                if (!fresh || typeof fresh !== 'object') {
                    fresh = {};
                    game[INSTANCE_FLAG] = fresh;
                }
                fresh.renderLoreList = true;
            } catch (_) { /* ignore */ }
        } catch (_) { /* ignore */ }
    }

    function waitForGame() {
        try {
            var game = window.GraveGainGame || null;
            if (game && typeof game.renderLoreList === 'function') {
                try { patchLoreList(game); } catch (_) { /* ignore */ }
                return;
            }
        } catch (_) { /* keep polling */ }
        try {
            var tries = 0;
            var timer = setInterval(function () {
                tries += 1;
                try {
                    var g = window.GraveGainGame || null;
                    if (g && typeof g.renderLoreList === 'function') {
                        clearInterval(timer);
                        try { patchLoreList(g); } catch (_) { /* ignore */ }
                    } else if (tries >= 200) {
                        clearInterval(timer);
                    }
                } catch (_) { /* keep polling */ }
            }, 250);
        } catch (_) { /* never throw during boot */ }
    }

    try {
        // Engine exists from the shared synchronous script; hook now and
        // re-try on DOMContentLoaded in case ordering shifts.
        if (!hookEngine()) {
            try {
                if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
                    document.addEventListener('DOMContentLoaded', function () { hookEngine(); });
                }
            } catch (_) { /* ignore */ }
        }
    } catch (_) { /* never throw during boot */ }

    try {
        waitForGame();
    } catch (_) { /* never throw during boot */ }
})();
