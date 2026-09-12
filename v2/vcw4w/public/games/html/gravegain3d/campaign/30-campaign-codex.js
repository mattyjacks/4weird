/* GraveGain3D Campaign — 30 codex unlocks.
   Persists mission lore unlocks to localStorage, shows CODEX UNLOCKED
   toasts, announces the update, and badges newly-unlocked lore entries
   with a NEW pill in the lore list.
   Patches only via AAA.wrap (chain-safe). Everything guarded. */
(function () {
    'use strict';

    var AAA = window.GraveGainAAA;
    if (!AAA || typeof AAA.ready !== 'function') return;

    var STORE_KEY = 'gravegain_campaign_codex_v1';
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

    // Extend the existing registry in place — never replace it.
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

    // M10 finale guarantee: these three entries must unlock on Lucifer's
    // fall even if a mission pack omits them. All three exist in lore.js
    // (verified: lucifer_manifesto, human_earth_letter, gods_necros_speaks).
    var EPILOGUE_CODEX = ['lucifer_manifesto', 'human_earth_letter', 'gods_necros_speaks'];

    // Nearest-valid-key replacements for lore IDs that no longer exist.
    // (Empty today — every shipped loreUnlocks ID was verified against
    // lore.js — but the mechanism stays so one bad ID can't void a batch.)
    var LORE_FALLBACK = {
        // Example shape: 'removed_id': 'lucifer_manifesto'
    };

    function loreExists(id) {
        try {
            if (window.GraveGainLore && typeof window.GraveGainLore.get === 'function') {
                return !!window.GraveGainLore.get(id);
            }
        } catch (_) { /* ignore */ }
        return true; // lore registry absent → keep, core revalidates later
    }

    function resolveLoreId(id) {
        try {
            var key = String(id);
            if (loreExists(key)) return key;
            var fb = LORE_FALLBACK[key];
            if (fb && loreExists(fb)) return fb;
        } catch (_) { /* ignore */ }
        return null;
    }

    function loreIdFromOnclick(onclick) {
        try {
            if (typeof onclick !== 'string') return null;
            var m = onclick.match(/viewLoreEntry\(['"]([^'"]+)['"]\)/);
            return m ? m[1] : null;
        } catch (_) {
            return null;
        }
    }

    AAA.ready(function (game) {
        if (!game) return;

        try {
            AAA.on('missionComplete', function (data) {
                try {
                    var id = data ? data.id : null;
                    if (id === undefined || id === null) return;
                    var ex = extraFor(id);
                    var unlocks = (ex && Array.isArray(ex.loreUnlocks)) ? ex.loreUnlocks.slice() : [];
                    // Finale guarantee: M10 always unlocks the epilogue trio.
                    try {
                        if (Number(id) === 10) {
                            EPILOGUE_CODEX.forEach(function (lid) {
                                if (unlocks.indexOf(lid) === -1) unlocks.push(lid);
                            });
                        }
                    } catch (_) { /* ignore */ }
                    // Validate: drop unknown IDs (via nearest-valid fallback).
                    try {
                        var resolved = [];
                        unlocks.forEach(function (lid) {
                            try {
                                var r = resolveLoreId(lid);
                                if (r && resolved.indexOf(r) === -1) resolved.push(r);
                            } catch (_) { /* ignore */ }
                        });
                        unlocks = resolved;
                    } catch (_) { /* keep unfiltered */ }
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
                    try {
                        if (typeof AAA.announce === 'function') {
                            AAA.announce('CODEX UPDATED', fresh.length + ' new ' + (fresh.length === 1 ? 'entry' : 'entries'));
                        }
                    } catch (_) { /* ignore */ }
                } catch (_) { /* never throw */ }
            });
        } catch (_) { /* ignore */ }

        try {
            var hub = game.hubController;
            if (hub) {
                AAA.wrap(hub, 'renderLoreList', function (orig) {
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
                });
            }
        } catch (_) { /* ignore */ }
    });
})();
