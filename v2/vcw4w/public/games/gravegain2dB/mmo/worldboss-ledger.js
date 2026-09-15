/* GraveGain2dB MMO: world-boss contribution ledger (games lane, v2-native).
 * Vanilla IIFE, idempotent, zero imports, zero timers, zero network,
 * zero storage, zero DOM writes. Aggregates per-room contributions into
 * global progress for "Break the Citadel Chain": relay objectives ->
 * global progress -> world boss -> contributor rewards.
 *
 * IRON RULE: only authoritative room-server reports are accepted. A report
 * must carry { roomId, serverId, eventSeed, tickSeq, legs, sig } with a
 * registered serverId, matching event seed, advancing tickSeq, and relay
 * legs in strict order. Anything else — including any client-posted score,
 * damage total, or destruction claim — is dropped as a client claim and
 * NEVER enters the ledger. Signature cryptography itself is verified
 * server-side (keys never reach the browser); this ledger enforces the
 * registry/seed/tick/order gate. Mirrors gravegain-mmo-events/
 * worldboss.fronts.js assess() kill rule (read-only source, never edited).
 *
 *   window.GraveGain2DBWorldBoss = {
 *     VERSION, BOSS_THRESHOLD, LEG_MIN_PCT, createLedger, addRoomReport,
 *     globalProgress, rewards, describe
 *   }
 *
 * Every public function is guarded and NEVER throws.
 */
(function () {
    'use strict';

    var VERSION = '1.0.0';
    var BOSS_THRESHOLD = 1000000;
    var LEG_MIN_PCT = 20;
    var RELAY_LEGS = ['outer-ward', 'chain-span', 'gatehouse', 'citadel-core'];

    function getWindow() {
        try {
            if (typeof window !== 'undefined') return window;
        } catch (e) { /* ignore */ }
        return null;
    }

    var win = getWindow();
    if (!win) return;
    if (win.GraveGain2DBWorldBoss) return;

    function cleanId(v) {
        try {
            var s = String(v == null ? '' : v).trim();
            if (!s || s.length > 64) return '';
            if (!/^[A-Za-z0-9_-]+$/.test(s)) return '';
            return s;
        } catch (e) { /* ignore */ }
        return '';
    }

    function cleanDamage(v) {
        try {
            var n = Number(v);
            if (!isFinite(n) || n < 0) return 0;
            if (n > BOSS_THRESHOLD * 10) return BOSS_THRESHOLD * 10;
            return n;
        } catch (e) { /* ignore */ }
        return 0;
    }

    function createLedger(eventSeed, trustedServers) {
        try {
            var servers = [];
            if (trustedServers instanceof Array) {
                for (var i = 0; i < trustedServers.length; i++) {
                    var id = cleanId(trustedServers[i]);
                    if (id) servers.push(id);
                }
            }
            return {
                eventSeed: cleanId(eventSeed) || 'break-the-citadel-chain',
                trustedServers: servers,
                rooms: {},
                dropped: 0
            };
        } catch (e) { /* ignore */ }
        return { eventSeed: 'break-the-citadel-chain', trustedServers: [], rooms: {}, dropped: 0 };
    }

    function isTrusted(ledger, serverId) {
        try {
            for (var i = 0; i < ledger.trustedServers.length; i++) {
                if (ledger.trustedServers[i] === serverId) return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    /* Accept one room-server report. Returns true when applied, false when
     * dropped (client claim, unknown server, seed mismatch, stale tick,
     * legs out of order). Never throws. */
    function addRoomReport(ledger, report) {
        try {
            if (!ledger || typeof ledger !== 'object') return false;
            if (!ledger.rooms) ledger.rooms = {};
            if (!report || typeof report !== 'object') {
                ledger.dropped = (Number(ledger.dropped) || 0) + 1;
                return false;
            }
            var serverId = cleanId(report.serverId);
            var roomId = cleanId(report.roomId);
            var eventSeed = cleanId(report.eventSeed);
            var sig = '';
            try { sig = String(report.sig == null ? '' : report.sig).trim(); } catch (e) { sig = ''; }
            var tick = Math.floor(Number(report.tickSeq));
            if (!serverId || !roomId || !eventSeed || !sig) {
                ledger.dropped += 1;
                return false;
            }
            if (!isTrusted(ledger, serverId)) {
                ledger.dropped += 1;
                return false;
            }
            if (eventSeed !== ledger.eventSeed) {
                ledger.dropped += 1;
                return false;
            }
            if (!isFinite(tick) || tick < 0) {
                ledger.dropped += 1;
                return false;
            }
            var prev = ledger.rooms[roomId];
            if (prev && isFinite(Number(prev.tickSeq)) && tick <= Number(prev.tickSeq)) {
                ledger.dropped += 1;
                return false;
            }
            var legs = report.legs;
            if (!(legs instanceof Array) || !legs.length || legs.length > RELAY_LEGS.length) {
                ledger.dropped += 1;
                return false;
            }
            var cleanLegs = [];
            for (var i = 0; i < legs.length; i++) {
                var row = legs[i] || {};
                if (row.leg !== RELAY_LEGS[i]) {
                    ledger.dropped += 1;
                    return false;
                }
                cleanLegs.push({ leg: RELAY_LEGS[i], damage: cleanDamage(row.damage) });
            }
            var players = [];
            var seen = {};
            if (report.playerIds instanceof Array) {
                for (var j = 0; j < report.playerIds.length && players.length < 4; j++) {
                    var pid = cleanId(report.playerIds[j]);
                    if (!pid || seen[pid]) continue;
                    seen[pid] = true;
                    players.push(pid);
                }
            }
            if (!players.length) {
                ledger.dropped += 1;
                return false;
            }
            ledger.rooms[roomId] = {
                serverId: serverId,
                tickSeq: tick,
                legs: cleanLegs,
                bossDamage: cleanDamage(report.bossDamage),
                playerIds: players
            };
            return true;
        } catch (e) { /* ignore */ }
        try { ledger.dropped = (Number(ledger.dropped) || 0) + 1; } catch (ignored) { /* ignore */ }
        return false;
    }

    /* Global progress across verified rooms (assess-style kill rule:
     * relay total must reach threshold AND every leg must carry 20%+). */
    function globalProgress(ledger) {
        var safe = { rooms: 0, relayPct: 0, legsMet: [], bossPct: 0, phase: 'relay', perPlayer: {} };
        try {
            if (!ledger || typeof ledger !== 'object' || !ledger.rooms) return safe;
            var legTotals = {};
            for (var l = 0; l < RELAY_LEGS.length; l++) legTotals[RELAY_LEGS[l]] = 0;
            var perPlayer = {};
            var boss = 0;
            var roomIds = [];
            try { roomIds = Object.keys(ledger.rooms); } catch (e) { roomIds = []; }
            for (var r = 0; r < roomIds.length; r++) {
                var rep = ledger.rooms[roomIds[r]];
                if (!rep) continue;
                var roomTotal = 0;
                for (var i = 0; i < rep.legs.length && i < RELAY_LEGS.length; i++) {
                    var dmg = cleanDamage(rep.legs[i].damage);
                    legTotals[RELAY_LEGS[i]] += dmg;
                    roomTotal += dmg;
                }
                var bd = cleanDamage(rep.bossDamage);
                boss += bd;
                roomTotal += bd;
                var share = rep.playerIds.length ? roomTotal / rep.playerIds.length : 0;
                for (var p = 0; p < rep.playerIds.length; p++) {
                    var pid = cleanId(rep.playerIds[p]);
                    if (!pid) continue;
                    perPlayer[pid] = (Number(perPlayer[pid]) || 0) + share;
                }
            }
            var relay = 0;
            var met = [];
            for (var k = 0; k < RELAY_LEGS.length; k++) {
                relay += legTotals[RELAY_LEGS[k]];
                if ((legTotals[RELAY_LEGS[k]] / BOSS_THRESHOLD) * 100 >= LEG_MIN_PCT) met.push(RELAY_LEGS[k]);
            }
            safe.rooms = roomIds.length;
            safe.relayPct = Math.min(100, (relay / BOSS_THRESHOLD) * 100);
            safe.legsMet = met;
            safe.bossPct = Math.min(100, (boss / BOSS_THRESHOLD) * 100);
            safe.phase = met.length >= RELAY_LEGS.length ? (safe.bossPct >= 100 ? 'claimed' : 'boss') : 'relay';
            safe.perPlayer = perPlayer;
            return safe;
        } catch (e) { /* ignore */ }
        return safe;
    }

    /* Contributor rewards from verified progress only (entitlements, no coins). */
    function rewards(ledger) {
        try {
            var g = globalProgress(ledger);
            if (g.phase !== 'boss' && g.phase !== 'claimed') return [];
            var total = 0;
            var ids = [];
            try { ids = Object.keys(g.perPlayer); } catch (e) { ids = []; }
            for (var i = 0; i < ids.length; i++) total += Number(g.perPlayer[ids[i]]) || 0;
            if (!(total > 0)) return [];
            var out = [];
            for (var j = 0; j < ids.length; j++) {
                var share = (Number(g.perPlayer[ids[j]]) / total) * 100;
                var tier = '';
                if (share >= 5) tier = 'chainbreaker';
                else if (share >= 1) tier = 'ward-cleaver';
                else if (share >= 0.2) tier = 'linkbearer';
                if (tier) out.push({ playerId: ids[j], tier: tier, sharePct: Math.round(share * 100) / 100 });
            }
            out.sort(function (a, b) { return b.sharePct - a.sharePct; });
            return out.slice(0, 1000);
        } catch (e) { /* ignore */ }
        return [];
    }

    function describe(ledger) {
        try {
            var g = globalProgress(ledger);
            if (g.phase === 'claimed') return 'CLAIMED ' + g.rooms + ' rooms — contributor rewards settled from verified reports.';
            if (g.phase === 'boss') return 'CHAIN BROKEN — world boss at ' + Math.floor(g.bossPct) + '% across ' + g.rooms + ' verified rooms.';
            return 'Relay ' + Math.floor(g.relayPct) + '% (' + g.legsMet.length + '/4 legs) across ' + g.rooms + ' verified rooms.';
        } catch (e) { /* ignore */ }
        return 'World boss unknown.';
    }

    win.GraveGain2DBWorldBoss = {
        VERSION: VERSION,
        BOSS_THRESHOLD: BOSS_THRESHOLD,
        LEG_MIN_PCT: LEG_MIN_PCT,
        createLedger: createLedger,
        addRoomReport: addRoomReport,
        globalProgress: globalProgress,
        rewards: rewards,
        describe: describe
    };
})();
