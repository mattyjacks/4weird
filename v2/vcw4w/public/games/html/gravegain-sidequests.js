(function () {
    'use strict';

    // E11 — endless-mode side-quest engine for all 3 GraveGain games.
    // Vanilla IIFE, idempotent, no imports. Polls for game globals and
    // degrades gracefully when no game runtime is present.
    if (window.GraveGainSidequests) return;

    var VERSION = '1.0.0';
    var STORE_KEY = 'gravegain_sidequests_v1';
    var MAX_ACTIVE = 3;

    // Floor/theme names skimmed from gravegain_shared_missions.js
    // (dungeonTheme: metallic_ship | elven_grove | dwarven_vault) plus
    // generic endless-depth themes so quests fit any of the 3 games.
    var THEMES = ['metallic_ship', 'elven_grove', 'dwarven_vault', 'crypt', 'ossuary'];

    // --- age-band gate (fail closed: no drug content unless allowed) ---
    function drugsAllowed() {
        try {
            var ab = window.GraveGainAgeBands;
            if (ab && typeof ab.isDrugsAllowed === 'function') return !!ab.isDrugsAllowed();
        } catch (_) { /* fail closed */ }
        return false;
    }

    // --- 8 core templates (all age-safe) + 1 gated extra ---
    // progress kinds: kills | floors | pickups | gold | bossKills | noKillFloors | timedFloors
    var TEMPLATES = [
        { id: 'bounty-hunt', name: 'Bounty Hunt', emoji: '🎯',
          giver: 'Grim Bailiff', desc: 'Slay {n} undead threats.',
          kind: 'kills', target: 15, rewardGold: 150 },
        { id: 'escort-ghost', name: 'Escort Ghost', emoji: '👻',
          giver: 'Lantern Widow', desc: 'Guide the lost ghost down {n} floor(s). Descend while the quest is active.',
          kind: 'floors', target: 2, rewardGold: 200 },
        { id: 'relic-recovery', name: 'Relic Recovery', emoji: '🏺',
          giver: 'Rust Archivist', desc: 'Recover {n} grave relics (pickups).',
          kind: 'pickups', target: 5, rewardGold: 180 },
        { id: 'wave-defense', name: 'Wave Defense', emoji: '🛡️',
          giver: 'Gate Sergeant', desc: 'Hold the line: slay {n} enemies without leaving this floor.',
          kind: 'waveKills', target: 20, rewardGold: 220 },
        { id: 'pacifist-floor', name: 'Pacifist Floor', emoji: '🕊️',
          giver: 'Silent Monk', desc: 'Descend {n} floor(s) while slaying at most {cap} foes per floor.',
          kind: 'noKillFloors', target: 1, cap: 3, rewardGold: 250 },
        { id: 'speed-descent', name: 'Speed Descent', emoji: '⏱️',
          giver: 'Relay Runner', desc: 'Plunge {n} floor(s) within {time}s of accepting.',
          kind: 'timedFloors', target: 2, time: 180, rewardGold: 260 },
        { id: 'merchant-errand', name: 'Merchant Errand', emoji: '🪙',
          giver: 'Copper Peddler', desc: 'Bring back {n} gold from the depths.',
          kind: 'gold', target: 300, rewardGold: 120 },
        { id: 'cursed-shrine', name: 'Cursed Shrine', emoji: '⛩️',
          giver: 'Ashen Priest', desc: 'Shatter the shrine guardian: defeat {n} boss or elite foe(s).',
          kind: 'bossKills', target: 1, rewardGold: 400 },
        // Gated 9th: only ever offered when the age-band director allows drugs.
        { id: 'herbalist-errand', name: 'Herbalist Errand', emoji: '🌿',
          giver: 'Veiled Herbalist', desc: 'Gather {n} rare moonherbs for the infirmary poultice.',
          kind: 'pickups', target: 4, rewardGold: 200, adultsOnly: true }
    ];

    function offeredTemplates() {
        var allow = drugsAllowed();
        return TEMPLATES.filter(function (t) { return !t.adultsOnly || allow; });
    }

    // --- quest instances ---
    var seq = 0;
    var active = [];    // { uid, templateId, name, emoji, giver, theme, desc, kind, target, cap, time, start, progress, done, rewardGold, rewardClaimed }
    var completed = []; // history of turned-in quest uids/names

    function pickTheme() {
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    }

    function scaleTarget(t, depthFloor) {
        var f = Math.max(0, depthFloor | 0);
        if (t.kind === 'kills' || t.kind === 'waveKills') return t.target + f * 2;
        if (t.kind === 'gold') return t.target + f * 25;
        return t.target;
    }

    function offerQuest(templateId) {
        var pool = offeredTemplates();
        var t = null;
        if (templateId) {
            for (var i = 0; i < pool.length; i++) if (pool[i].id === templateId) t = pool[i];
            if (!t) return null; // unknown or age-gated id
        } else {
            if (!pool.length) return null;
            t = pool[Math.floor(Math.random() * pool.length)];
        }
        if (active.length >= MAX_ACTIVE) return null;
        var snap = readSnapshot();
        var target = scaleTarget(t, snap.floor);
        seq += 1;
        var q = {
            uid: 'sq-' + Date.now().toString(36) + '-' + (seq),
            templateId: t.id, name: t.name, emoji: t.emoji, giver: t.giver,
            theme: pickTheme(),
            desc: t.desc.replace('{n}', String(target))
                .replace('{cap}', String(t.cap || 0))
                .replace('{time}', String(t.time || 0)),
            kind: t.kind, target: target, cap: t.cap || 0, time: t.time || 0,
            start: snapshotCounters(),
            floorAtAccept: snap.floor,
            timeAtAccept: Date.now(),
            progress: 0, done: false,
            rewardGold: t.rewardGold + snap.floor * 10,
            rewardClaimed: false
        };
        active.push(q);
        persist();
        renderLog();
        return q;
    }

    // --- game-global polling (all 3 games, degrade gracefully) ---
    function gameObj() {
        return window.GraveGainGame || window.GraveGain3D ||
            window.GraveGain2D || window.GraveGain1D || null;
    }

    function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

    function snapshotCounters() {
        var g = gameObj();
        if (!g) return { kills: 0, floor: 0, pickups: 0, gold: 0, bossKills: 0 };
        var p = g.player || g.state || g;
        return {
            kills: num(g.kills != null ? g.kills : p.kills),
            floor: num(g.floor != null ? g.floor : (g.depth != null ? g.depth : p.floor)),
            pickups: num(g.pickups != null ? g.pickups : (g.relics != null ? g.relics : p.pickups)),
            gold: num(g.gold != null ? g.gold : p.gold),
            bossKills: num(g.bossKills != null ? g.bossKills : (g.bosses != null ? g.bosses : p.bossKills))
        };
    }

    function readSnapshot() {
        var c = snapshotCounters();
        return { floor: c.floor, live: !!gameObj() };
    }

    function updateProgress() {
        if (!active.length) return;
        var now = snapshotCounters();
        var changed = false;
        for (var i = 0; i < active.length; i++) {
            var q = active[i];
            if (q.done) continue;
            var dKills = Math.max(0, now.kills - q.start.kills);
            var dFloors = Math.max(0, now.floor - q.floorAtAccept);
            var dPickups = Math.max(0, now.pickups - q.start.pickups);
            var dGold = Math.max(0, now.gold - q.start.gold);
            var dBoss = Math.max(0, now.bossKills - q.start.bossKills);
            var p = 0;
            switch (q.kind) {
                case 'kills': p = dKills; break;
                case 'floors': p = dFloors; break;
                case 'pickups': p = dPickups; break;
                case 'gold': p = dGold; break;
                case 'bossKills': p = dBoss; break;
                case 'waveKills':
                    // same-floor kills only: reset if the floor moved
                    p = (now.floor === q.floorAtAccept) ? dKills : 0;
                    break;
                case 'noKillFloors':
                    // complete when descended with few kills; fail-safe: track floors only
                    p = (dKills <= (q.cap * Math.max(1, dFloors))) ? dFloors : 0;
                    break;
                case 'timedFloors': {
                    var elapsed = (Date.now() - q.timeAtAccept) / 1000;
                    p = (elapsed <= q.time) ? dFloors : 0;
                    if (elapsed > q.time && dFloors < q.target) {
                        // timed out: keep at 0 so the log shows expired, not stuck
                        p = 0;
                    }
                    break;
                }
                default: p = 0;
            }
            q.progress = Math.min(q.target, p);
            if (q.progress >= q.target) { q.done = true; }
            changed = true;
        }
        if (changed) { persist(); renderLog(); }
    }

    // --- rewards: window.GraveGainLoot when present, else gold fallback ---
    function grantReward(q) {
        if (q.rewardClaimed) return { ok: false, reason: 'already-claimed' };
        var amount = q.rewardGold;
        // 1) prefer the E14 loot pipeline when it exists
        try {
            var loot = window.GraveGainLoot;
            if (loot) {
                if (typeof loot.grant === 'function') { loot.grant({ gold: amount, source: 'sidequest:' + q.templateId }); }
                else if (typeof loot.give === 'function') { loot.give({ gold: amount, source: 'sidequest:' + q.templateId }); }
                else if (typeof loot.add === 'function') { loot.add({ gold: amount }); }
                else if (typeof loot.reward === 'function') { loot.reward(amount, 'sidequest:' + q.templateId); }
                else { throw new Error('no-grant-method'); }
                q.rewardClaimed = true;
                persist(); renderLog();
                return { ok: true, via: 'GraveGainLoot', gold: amount };
            }
        } catch (_) { /* fall through to gold fallback */ }
        // 2) gold fallback: best-effort credit onto live game globals
        try {
            var g = gameObj();
            if (g) {
                var p = g.player || g.state || null;
                if (p && p.gold != null) p.gold = num(p.gold) + amount;
                else if (g.gold != null) g.gold = num(g.gold) + amount;
                else if (p) p.gold = amount;
                else g.sidequestGold = num(g.sidequestGold) + amount;
            }
        } catch (_) { /* record-only */ }
        q.rewardClaimed = true;
        q.rewardVia = 'gold-fallback';
        persist(); renderLog();
        return { ok: true, via: 'gold-fallback', gold: amount };
    }

    function turnIn(uid) {
        for (var i = 0; i < active.length; i++) {
            if (active[i].uid === uid && active[i].done) {
                var q = active[i];
                var res = grantReward(q);
                if (res.ok) {
                    active.splice(i, 1);
                    completed.push({ uid: q.uid, name: q.name, gold: res.gold, via: res.via });
                    persist(); renderLog();
                }
                return res;
            }
        }
        return { ok: false, reason: 'not-ready' };
    }

    function abandonQuest(uid) {
        for (var i = 0; i < active.length; i++) {
            if (active[i].uid === uid) {
                active.splice(i, 1);
                persist(); renderLog();
                return true;
            }
        }
        return false;
    }

    // --- quest-giver hooks (for NPC/dialogue lanes to call into) ---
    function getGivers() {
        var seen = {};
        var givers = [];
        offeredTemplates().forEach(function (t) {
            if (!seen[t.giver]) { seen[t.giver] = true; givers.push({ name: t.giver, questId: t.id, quest: t.name, emoji: t.emoji }); }
        });
        return givers;
    }

    // --- persistence (best-effort, never throws) ---
    function persist() {
        try {
            window.localStorage.setItem(STORE_KEY, JSON.stringify({ active: active, completed: completed.slice(-20) }));
        } catch (_) { /* storage unavailable: stay in-memory */ }
    }

    function restore() {
        try {
            var raw = window.localStorage.getItem(STORE_KEY);
            if (!raw) return;
            var data = JSON.parse(raw);
            if (data && Array.isArray(data.active)) {
                // resume unclaimed quests only, capped
                active = data.active.filter(function (q) { return q && !q.rewardClaimed; }).slice(0, MAX_ACTIVE);
            }
            if (data && Array.isArray(data.completed)) completed = data.completed;
        } catch (_) { /* start fresh */ }
    }

    // --- quest-log overlay UI ---
    var logEl = null;
    var listEl = null;
    var statusEl = null;

    function el(tag, cls, text) {
        var d = document.createElement(tag);
        if (cls) d.className = cls;
        if (text != null) d.textContent = text;
        return d;
    }

    function buildLog() {
        if (logEl || !document.body) return;
        logEl = el('div', 'ggsq-log');
        logEl.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:99990;pointer-events:auto;' +
            'font:12px/1.4 system-ui,sans-serif;color:#e8e0d0;max-width:280px;';
        var btn = el('button', 'ggsq-toggle', '📜 Quests (0)');
        btn.style.cssText = 'pointer-events:auto;cursor:pointer;background:#2a2135;color:#e8e0d0;' +
            'border:1px solid #6b5b8a;border-radius:6px;padding:4px 8px;';
        btn.addEventListener('click', toggleLog);
        logEl.appendChild(btn);
        var panel = el('div', 'ggsq-panel');
        panel.style.cssText = 'display:none;background:rgba(20,14,28,.94);border:1px solid #6b5b8a;' +
            'border-radius:8px;padding:8px;margin-top:6px;max-height:320px;overflow:auto;';
        statusEl = el('div', 'ggsq-status', 'Waiting for game…');
        statusEl.style.cssText = 'opacity:.75;margin-bottom:6px;';
        listEl = el('div', 'ggsq-list');
        var more = el('button', 'ggsq-more', '＋ New quest');
        more.style.cssText = 'cursor:pointer;background:#3a2f4d;color:#e8e0d0;border:1px solid #6b5b8a;border-radius:6px;padding:3px 8px;margin-top:6px;';
        more.addEventListener('click', function () {
            var q = offerQuest();
            if (!q && active.length >= MAX_ACTIVE) flashStatus('Log full (max ' + MAX_ACTIVE + ') — turn one in first.');
            else if (!q) flashStatus('No quests available right now.');
        });
        panel.appendChild(statusEl);
        panel.appendChild(listEl);
        panel.appendChild(more);
        logEl.appendChild(panel);
        logEl._btn = btn;
        logEl._panel = panel;
        document.body.appendChild(logEl);
    }

    function flashStatus(msg) {
        if (statusEl) statusEl.textContent = msg;
    }

    function toggleLog() {
        if (!logEl) return;
        var p = logEl._panel;
        p.style.display = (p.style.display === 'none') ? 'block' : 'none';
        renderLog();
    }

    function renderLog() {
        if (!logEl) return;
        logEl._btn.textContent = '📜 Quests (' + active.length + ')';
        var live = !!gameObj();
        statusEl.textContent = live ? (active.length ? 'Active quests:' : 'No active quests — take one below.') : 'Waiting for game… progress resumes when a GraveGain runtime loads.';
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        if (!active.length) {
            listEl.appendChild(el('div', 'ggsq-empty', 'The dead are quiet. For now.'));
            return;
        }
        active.forEach(function (q) {
            var row = el('div', 'ggsq-row');
            row.style.cssText = 'border-top:1px solid #4a3f5e;padding:6px 0;';
            row.appendChild(el('div', 'ggsq-title', q.emoji + ' ' + q.name));
            row.appendChild(el('div', 'ggsq-giver', '— ' + q.giver + ' · ' + q.theme));
            row.appendChild(el('div', 'ggsq-desc', q.desc));
            row.appendChild(el('div', 'ggsq-prog', 'Progress: ' + q.progress + ' / ' + q.target + (q.done ? ' ✔ DONE' : '')));
            var btns = el('div', 'ggsq-btns');
            if (q.done) {
                var claim = el('button', 'ggsq-claim', 'Claim +' + q.rewardGold + 'g');
                claim.style.cssText = 'cursor:pointer;background:#4d7a3a;color:#fff;border:none;border-radius:5px;padding:3px 8px;margin-right:6px;';
                (function (uid) {
                    claim.addEventListener('click', function () { turnIn(uid); });
                })(q.uid);
                btns.appendChild(claim);
            }
            var drop = el('button', 'ggsq-abandon', 'Abandon');
            drop.style.cssText = 'cursor:pointer;background:transparent;color:#a99;border:1px solid #644;border-radius:5px;padding:3px 8px;';
            (function (uid) {
                drop.addEventListener('click', function () { abandonQuest(uid); });
            })(q.uid);
            btns.appendChild(drop);
            row.appendChild(btns);
            listEl.appendChild(row);
        });
    }

    // --- boot: restore, build UI when DOM ready, poll globals ---
    function init() {
        restore();
        var boot = function () {
            try { buildLog(); renderLog(); } catch (_) { /* DOM-less runtime: logic API still works */ }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
        // poll: progress ticks + auto-offer a first quest once a game appears
        var firstOffered = active.length > 0;
        setInterval(function () {
            try {
                updateProgress();
                if (!firstOffered && gameObj()) {
                    firstOffered = true;
                    if (!active.length) offerQuest();
                    else renderLog();
                } else if (logEl && (window.__ggsqTick = (window.__ggsqTick || 0) + 1) % 5 === 0) {
                    renderLog(); // refresh waiting/live status line
                }
            } catch (_) { /* never break the host game loop */ }
        }, 1000);
        if (typeof window.__ggsqTick !== 'number') { try { window.__ggsqTick = 0; } catch (_) {} }
    }

    window.GraveGainSidequests = {
        VERSION: VERSION,
        TEMPLATES: TEMPLATES,
        offeredTemplates: offeredTemplates,
        offerQuest: offerQuest,
        acceptQuest: offerQuest,
        abandonQuest: abandonQuest,
        turnIn: turnIn,
        claimReward: turnIn,
        toggleLog: toggleLog,
        getGivers: getGivers,
        getActive: function () { return active.slice(); },
        getCompleted: function () { return completed.slice(); },
        isDrugsAllowed: drugsAllowed
    };

    window.GraveGainMods = window.GraveGainMods || [];
    window.GraveGainMods.push({ name: 'gravegain-sidequests', version: VERSION, init: init });

    init();
})();
