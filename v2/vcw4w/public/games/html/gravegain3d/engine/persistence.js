(function () {
    'use strict';

    // SAVE_KEY strings are frozen contracts — never rename them. The shared
    // story engine owns 'gravegain_shared_story_progress_v1' and the codex
    // owns 'gravegain_campaign_codex_v1'; this module only ever touches its
    // own GraveGain3D_* keys so story progress, lore unlocks, stars, and
    // settings always survive a save.
    var SAVE_KEY = 'GraveGain3D_Save_V2';
    var SETTINGS_KEY = 'GraveGain3D_Settings_V1';

    function safeParse(raw, fallback) {
        if (raw === undefined || raw === null) return fallback;
        try { return JSON.parse(raw); }
        catch (_) { return fallback; }
    }

    function safeStringify(value) {
        try { return JSON.stringify(value); }
        catch (_) { return null; }
    }

    // Quota-guarded write: returns true on success, false when storage is
    // blocked (private mode) or over quota. Never throws.
    function safeSet(key, json) {
        try {
            localStorage.setItem(key, json);
            return true;
        } catch (e) {
            try {
                var name = e && e.name;
                if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn('[GraveGainSave] localStorage quota exceeded for ' + key);
                    }
                }
            } catch (_) { /* ignore */ }
            return false;
        }
    }

    function safeGet(key) {
        try { return localStorage.getItem(key); }
        catch (_) { return null; }
    }

    function readAudioSettings(game) {
        try {
            var a = game && game.audio;
            if (!a) return null;
            var out = {};
            if (typeof a.masterVolume === 'number') out.masterVolume = a.masterVolume;
            if (typeof a.musicVolume === 'number') out.musicVolume = a.musicVolume;
            if (typeof a.sfxVolume === 'number') out.sfxVolume = a.sfxVolume;
            return Object.keys(out).length ? out : null;
        } catch (_) { return null; }
    }

    class GraveGainSaveSystem {
        static save(game) {
            try {
                var payload = {
                    gold: game.gold,
                    uusd: game.uusd,
                    quartersLevel: game.quartersLevel,
                    armoryRanks: game.armoryRanks,
                    botanyCrops: game.botanyCrops,
                    difficulty: game.difficulty
                };
                // Persist audio/difficulty settings alongside the run state so
                // a reload restores the player's mix. Kept inside our own key.
                var audio = readAudioSettings(game);
                if (audio) payload.settings = audio;
                // Snapshot lore unlocks when the codex exposes them (read-only
                // copy — the codex key remains the authority, never overwritten).
                try {
                    var camp = window.GraveGainCampaign;
                    if (camp && typeof camp.getUnlockedLore === 'function') {
                        var lore = camp.getUnlockedLore();
                        if (Array.isArray(lore)) payload.loreUnlocks = lore.slice(0, 200);
                    }
                } catch (_) { /* snapshot is best-effort */ }
                // Snapshot star ratings read-only (story engine key is authority).
                try {
                    var eng = window.GraveGainStoryEngine;
                    if (eng && typeof eng.getProgress === 'function') {
                        var prog = eng.getProgress();
                        if (prog && prog.stars && typeof prog.stars === 'object') {
                            payload.stars = JSON.parse(JSON.stringify(prog.stars));
                        }
                    }
                } catch (_) { /* snapshot is best-effort */ }
                var json = safeStringify(payload);
                if (json !== null) safeSet(SAVE_KEY, json);
            } catch (_) { /* blocked storage (private mode) must not crash game over/save paths */ }
        }

        static load() {
            var data = safeGet(SAVE_KEY);
            return safeParse(data, null);
        }

        // Namespaced settings store (audio mix + difficulty). Separate key so
        // settings survive even if the main save is reset.
        static saveSettings(settings) {
            try {
                var json = safeStringify(settings || {});
                if (json === null) return false;
                return safeSet(SETTINGS_KEY, json);
            } catch (_) { return false; }
        }

        static loadSettings() {
            return safeParse(safeGet(SETTINGS_KEY), null);
        }

        // Read-only views of sibling stores. These NEVER write, so story
        // progress, codex lore, and stars cannot be clobbered from here.
        static readStoryProgress() {
            try {
                var eng = window.GraveGainStoryEngine;
                if (eng && typeof eng.getProgress === 'function') return eng.getProgress();
                return safeParse(safeGet('gravegain_shared_story_progress_v1'), null);
            } catch (_) { return null; }
        }

        static readCodexUnlocks() {
            try {
                var camp = window.GraveGainCampaign;
                if (camp && typeof camp.getUnlockedLore === 'function') return camp.getUnlockedLore();
                var parsed = safeParse(safeGet('gravegain_campaign_codex_v1'), null);
                if (parsed && Array.isArray(parsed.unlocked)) return parsed.unlocked.slice();
                return [];
            } catch (_) { return []; }
        }
    }

    GraveGainSaveSystem.SAVE_KEY = SAVE_KEY;
    GraveGainSaveSystem.SETTINGS_KEY = SETTINGS_KEY;

    window.GraveGainSaveSystem = GraveGainSaveSystem;
})();
