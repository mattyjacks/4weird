(function (global) {
    'use strict';
    // GraveGain4DPersistence — namespaced gravegain4d_* localStorage.
    // Mirrors GraveGainSaveSystem guards: quota-safe writes, never throws.
    var KEYS = {
        PROGRESS: 'gravegain4d_progress_v1',
        SETTINGS: 'gravegain4d_settings_v1',
        HUB: 'gravegain4d_hub_v1',
        SEEDS: 'gravegain4d_dreamseeds_v1'
    };
    function safeParse(raw, fallback) {
        if (raw === undefined || raw === null) return fallback;
        try { return JSON.parse(raw); } catch (_) { return fallback; }
    }
    function safeStringify(value) {
        try { return JSON.stringify(value); } catch (_) { return null; }
    }
    function safeSet(key, json) {
        try {
            localStorage.setItem(key, json);
            return true;
        } catch (e) {
            try {
                var name = e && e.name;
                if ((name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                    typeof console !== 'undefined' && console.warn) {
                    console.warn('[GraveGain4D] localStorage quota exceeded for ' + key);
                }
            } catch (_) { /* ignore */ }
            return false;
        }
    }
    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }
    function saveKey(key, value) {
        try {
            var json = safeStringify(value == null ? {} : value);
            if (json === null) return false;
            return safeSet(key, json);
        } catch (_) { return false; }
    }
    function loadKey(key, fallback) {
        try { return safeParse(safeGet(key), (fallback === undefined) ? null : fallback); }
        catch (_) { return (fallback === undefined) ? null : fallback; }
    }
    var api = {
        VERSION: '1.0.0',
        KEYS: KEYS,
        saveProgress: function (v) { return saveKey(KEYS.PROGRESS, v); },
        loadProgress: function () { return loadKey(KEYS.PROGRESS, null); },
        saveSettings: function (v) { return saveKey(KEYS.SETTINGS, v); },
        loadSettings: function () { return loadKey(KEYS.SETTINGS, null); },
        saveHub: function (v) { return saveKey(KEYS.HUB, v); },
        loadHub: function () { return loadKey(KEYS.HUB, null); },
        saveDreamSeeds: function (v) { return saveKey(KEYS.SEEDS, v); },
        loadDreamSeeds: function () { return loadKey(KEYS.SEEDS, []); },
        clear: function (which) {
            try {
                var targets;
                if (which === 'progress') targets = [KEYS.PROGRESS];
                else if (which === 'settings') targets = [KEYS.SETTINGS];
                else if (which === 'hub') targets = [KEYS.HUB];
                else if (which === 'seeds') targets = [KEYS.SEEDS];
                else targets = [KEYS.PROGRESS, KEYS.SETTINGS, KEYS.HUB, KEYS.SEEDS];
                for (var i = 0; i < targets.length; i++) {
                    try { localStorage.removeItem(targets[i]); } catch (_) { /* ignore */ }
                }
                return true;
            } catch (_) { return false; }
        }
    };
    try {
        if (global && !global.GraveGain4DPersistence) global.GraveGain4DPersistence = api;
    } catch (_) { /* fail-open */ }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
