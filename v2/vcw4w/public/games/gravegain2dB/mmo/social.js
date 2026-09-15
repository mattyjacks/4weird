/* GraveGain2dB MMO: hub social hooks (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Browser display helpers for hub presence,
 * party/lobby codes, friends, chat, emoji emotes, announcements, and
 * season/codex hooks. Presence/chat/emotes here are DISPLAY ONLY — they
 * grant no progress and mint no rewards (see IRON RULE in lib file and
 * worldboss-ledger.js). Lobby codes admit to parties; room servers admit
 * to progress. Mirrors gravegain-mmorpg-net.js sanitize style (read-only
 * source, never edited).
 *
 *   window.GraveGain2DBSocial = {
 *     VERSION, EMOTES, sanitizeChat, emoteGlyph, isLobbyCode,
 *     partyCanJoin, announce, describe
 *   }
 *
 * Every public function is guarded and NEVER throws.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var PARTY_MAX = 4;
    var CHAT_MAX = 140;
    var EMOTES = {
        wave: '👋', gg: '🎉', rip: '🪦', lantern: '🏮',
        cheer: '🙌', sweat: '😅', skull: '💀', heart: '💜',
        run: '💨', trap: '🪤', crown: '👑', hush: '🤫'
    };
    var LOBBY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGain2DBSocial) return;

    function cleanPlayer(v) {
        try {
            var s = String(v == null ? '' : v).trim();
            if (!s || s.length > 32) return '';
            if (!/^[A-Za-z0-9_-]+$/.test(s)) return '';
            return s;
        } catch (e) { /* ignore */ }
        return '';
    }

    function isLobbyCode(v) {
        try {
            var s = String(v == null ? '' : v).trim().toUpperCase();
            if (s.length !== 6) return false;
            for (var i = 0; i < s.length; i++) {
                if (LOBBY_ALPHABET.indexOf(s.charAt(i)) < 0) return false;
            }
            return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    /* Sanitize one chat message (ASCII printable, capped, emote allowlisted). */
    function sanitizeChat(entry) {
        try {
            if (!entry || typeof entry !== 'object') return null;
            var from = cleanPlayer(entry.from != null ? entry.from : entry.playerId);
            if (!from) return null;
            var text = '';
            try {
                var raw = String(entry.text == null ? '' : entry.text);
                for (var i = 0; i < raw.length && text.length < CHAT_MAX; i++) {
                    var c = raw.charCodeAt(i);
                    if (c >= 32 && c < 127) text += raw.charAt(i);
                }
            } catch (e) { text = ''; }
            if (!text) return null;
            var emote = '';
            try {
                var key = String(entry.emote == null ? '' : entry.emote);
                if (EMOTES[key]) emote = key;
            } catch (e) { emote = ''; }
            return { from: from, text: text, emote: emote };
        } catch (e) { /* ignore */ }
        return null;
    }

    function emoteGlyph(id) {
        try {
            var key = String(id == null ? '' : id);
            return EMOTES[key] || '';
        } catch (e) { /* ignore */ }
        return '';
    }

    /* Party admission check (capacity/duplicates only — not progress). */
    function partyCanJoin(party, playerId) {
        try {
            if (!party || typeof party !== 'object') return false;
            var id = cleanPlayer(playerId);
            if (!id) return false;
            var members = party.memberIds instanceof Array ? party.memberIds : [];
            for (var i = 0; i < members.length; i++) {
                if (members[i] === id) return true;
            }
            return members.length < PARTY_MAX;
        } catch (e) { /* ignore */ }
        return false;
    }

    /* One-line hub banner from verified progress (relay/boss/claimed/idle). */
    function announce(progress) {
        try {
            if (!progress || typeof progress !== 'object') {
                return '⏳ The Citadel Chain holds… join a breach room to forge the first link.';
            }
            var pct = 0;
            try {
                pct = Math.max(0, Math.min(100, Math.floor(Number(progress.relayPct))));
            } catch (e) { pct = 0; }
            if (progress.phase === 'claimed') return '🎉 Citadel claimed. Contributors honored.';
            if (progress.phase === 'boss') return '🔥 CHAIN BROKEN — the World Boss wakes! Damage counts toward the kill.';
            if (progress.phase === 'relay') return '⏳ Break the Citadel Chain — ' + pct + '% forged.';
            return '⏳ The Citadel Chain holds… join a breach room to forge the first link.';
        } catch (e) { /* ignore */ }
        return 'Citadel breach event.';
    }

    function describe(input) {
        try {
            if (typeof input === 'string' && input) return announce({ phase: 'relay', relayPct: 0 }) + ' [' + input + ']';
            if (input && typeof input === 'object') return announce(input);
            return 'GraveGain2dB hub: presence, parties, chat, breach events.';
        } catch (e) { /* ignore */ }
        return 'GraveGain2dB hub.';
    }

    win.GraveGain2DBSocial = {
        VERSION: VERSION,
        EMOTES: EMOTES,
        sanitizeChat: sanitizeChat,
        emoteGlyph: emoteGlyph,
        isLobbyCode: isLobbyCode,
        partyCanJoin: partyCanJoin,
        announce: announce,
        describe: describe
    };
})();
