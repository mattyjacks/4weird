(function () {
    'use strict';

    // GraveGain4D LuckyStarShip hub loop — Return-to-Starship flow:
    //   heal to full, bank gold -> KillCredits -> $UUSD exchange,
    //   repair modules (cost), mission select terminal (10 missions,
    //   lock/unlock + par/stars), Q-juice refill.
    // All state JSON-serializable under state.hub (see createHubState /
    // serializeHub / deserializeHub). Never assumes other files exist:
    // every cross-module read (Quarters/Crops/Economy, game root, #hub DOM)
    // is guarded with fallbacks. No fullscreen / dblclick code.

    const MISSIONS = [
        { id: 'm01', name: 'LZ Crash Site', par: 3 },
        { id: 'm02', name: 'Elven Groves', par: 4 },
        { id: 'm03', name: 'Dwarven Vaults', par: 4 },
        { id: 'm04', name: 'Orc Wastes', par: 5 },
        { id: 'm05', name: 'Relay Uplink', par: 4 },
        { id: 'm06', name: 'Catacombs', par: 3 },
        { id: 'm07', name: 'Sunken Tomb', par: 4 },
        { id: 'm08', name: 'Observatory', par: 5 },
        { id: 'm09', name: 'The Gate', par: 5 },
        { id: 'm10', name: 'Lucifer', par: 5 }
    ];

    const MODULES_DEFAULT = [
        { id: 'hull', name: 'Hull Plating', hp: 100, maxHp: 100, costPerHpUusd: 2 },
        { id: 'engine', name: 'W-Drive Engine', hp: 100, maxHp: 100, costPerHpUusd: 3 },
        { id: 'medbay', name: 'Medbay Array', hp: 100, maxHp: 100, costPerHpUusd: 2 }
    ];

    const QJUICE_DEFAULT = { current: 3, max: 5, refillCostUusd: 50 };

    const FALLBACK_RATES = {
        goldToKillCredits: 50,
        killCreditsToGold: 40,
        goldToUusd: 200,
        uusdToGold: 180,
        killCreditsToUusd: 4,
        uusdToKillCredits: 3
    };

    function rates() {
        try {
            const E = window.GG4D_Economy;
            if (E && E.ExchangeRates && typeof E.ExchangeRates === 'object') {
                const r = {};
                for (const k of Object.keys(FALLBACK_RATES)) {
                    const v = Number(E.ExchangeRates[k]);
                    r[k] = isFinite(v) && v > 0 ? v : FALLBACK_RATES[k];
                }
                return r;
            }
        } catch (e) { /* use fallback */ }
        return { ...FALLBACK_RATES };
    }

    function quartersLevelOf(root) {
        try {
            const Q = window.GG4D_Quarters;
            const lv = root && root.hub && root.hub.quarters && root.hub.quarters.level;
            if (Q && typeof Q.deserialize === 'function') return Q.deserialize({ level: lv }).level;
        } catch (e) { /* fall through */ }
        const lv = Number(root && root.hub && root.hub.quarters && root.hub.quarters.level);
        return isFinite(lv) ? Math.max(1, Math.min(6, Math.floor(lv))) : 1;
    }

    // ---- State (JSON-serializable; lives at root.hub) ----

    function createHubState() {
        return {
            quarters: { level: 1 },
            crops: { plots: [] },
            missions: {}, // id -> { stars, best }
            modules: MODULES_DEFAULT.map((m) => ({ ...m })),
            qjuice: { ...QJUICE_DEFAULT },
            lastReturnAt: 0
        };
    }

    function serializeHub(hub) {
        const h = (hub && typeof hub === 'object') ? hub : {};
        let quarters = { level: 1 };
        let crops = { plots: [] };
        try {
            if (window.GG4D_Quarters && typeof window.GG4D_Quarters.serialize === 'function') {
                quarters = window.GG4D_Quarters.serialize(h.quarters);
            } else if (h.quarters && isFinite(Number(h.quarters.level))) {
                quarters = { level: Math.max(1, Math.min(6, Math.floor(Number(h.quarters.level)))) };
            }
        } catch (e) { quarters = { level: 1 }; }
        try {
            if (window.GG4D_Crops && typeof window.GG4D_Crops.serialize === 'function') {
                crops = window.GG4D_Crops.serialize(h.crops);
            }
        } catch (e) { crops = { plots: [] }; }
        const missions = {};
        if (h.missions && typeof h.missions === 'object') {
            for (const m of MISSIONS) {
                const entry = h.missions[m.id];
                if (entry && typeof entry === 'object') {
                    const stars = Math.max(0, Math.min(3, Math.floor(Number(entry.stars)) || 0));
                    const best = entry.best == null ? null : Math.max(0, Math.floor(Number(entry.best)) || 0);
                    if (stars > 0 || best != null) missions[m.id] = { stars, best };
                }
            }
        }
        const modules = Array.isArray(h.modules) && h.modules.length
            ? h.modules.filter((m) => m && typeof m.id === 'string').slice(0, 8).map((m) => ({
                id: String(m.id).slice(0, 32),
                name: String(m.name != null ? m.name : m.id).slice(0, 64),
                hp: Math.max(0, Math.floor(Number(m.hp) || 0)),
                maxHp: Math.max(1, Math.floor(Number(m.maxHp) || 100)),
                costPerHpUusd: Math.max(0, Number(m.costPerHpUusd) || 0)
            }))
            : MODULES_DEFAULT.map((m) => ({ ...m }));
        const q = (h.qjuice && typeof h.qjuice === 'object') ? h.qjuice : {};
        const qjuice = {
            current: Math.max(0, Math.floor(Number(q.current) || 0)),
            max: Math.max(1, Math.floor(Number(q.max) || QJUICE_DEFAULT.max)),
            refillCostUusd: Math.max(0, Number(q.refillCostUusd) || 0)
        };
        qjuice.current = Math.min(qjuice.current, qjuice.max);
        return {
            quarters: quarters,
            crops: crops,
            missions: missions,
            modules: modules,
            qjuice: qjuice,
            lastReturnAt: Math.max(0, Number(h.lastReturnAt) || 0)
        };
    }

    function deserializeHub(data) {
        if (!data || typeof data !== 'object') return createHubState();
        return serializeHub(data);
    }

    // Root-state helpers. The hub never assumes a file layout: it works on
    // any object with optional { player, wallet, hub } and can locate a live
    // root on window when no explicit state is passed.
    function findGameRoot() {
        try {
            return window.GraveGain4D || window.GraveGainGame || window.GG4D || null;
        } catch (e) { return null; }
    }

    function playerOf(root) {
        if (!root || typeof root !== 'object') return null;
        if (root.player && typeof root.player === 'object') return root.player;
        // Flat player shape (hp/maxHp directly on root) is also accepted.
        if (root.hp != null || root.maxHp != null) return root;
        return null;
    }

    function walletOf(root) {
        if (!root || typeof root !== 'object') return null;
        if (root.wallet && typeof root.wallet === 'object') return root.wallet;
        // Flat currency shape is also accepted (acts as the wallet).
        if (root.gold != null || root.uusd != null || root.killCredits != null) return root;
        return null;
    }

    function ensureHub(root) {
        if (!root || typeof root !== 'object') return createHubState();
        if (!root.hub || typeof root.hub !== 'object') root.hub = createHubState();
        else root.hub = deserializeHub(root.hub);
        if (!walletOf(root)) root.wallet = { gold: 0, killCredits: 0, uusd: 0 };
        const w = walletOf(root);
        for (const k of ['gold', 'killCredits', 'uusd']) {
            if (!isFinite(Number(w[k])) || Number(w[k]) < 0) w[k] = 0;
        }
        return root.hub;
    }

    // ---- Hub actions (each returns a result object; never throws) ----

    function heal(root) {
        try {
            const p = playerOf(root);
            if (!p) return { ok: false, reason: 'no-player' };
            p.hp = Number(p.maxHp) || 0;
            return { ok: true, hp: p.hp };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    // Bank chain: gold -> KillCredits -> $UUSD at economy rates.
    // `amount` is in units of the source currency; whole-unit output only.
    function bankGoldToKillCredits(root, goldAmount) {
        try {
            const w = walletOf(root);
            if (!w) return { ok: false, reason: 'no-wallet' };
            const r = rates();
            const spend = Math.max(0, Math.floor(Number(goldAmount) || 0));
            if (spend < r.goldToKillCredits) return { ok: false, reason: 'amount-below-rate' };
            if ((Number(w.gold) || 0) < spend) return { ok: false, reason: 'insufficient-gold' };
            const out = Math.floor(spend / r.goldToKillCredits);
            w.gold -= out * r.goldToKillCredits;
            w.killCredits = (Number(w.killCredits) || 0) + out;
            return { ok: true, spentGold: out * r.goldToKillCredits, receivedKillCredits: out };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    function bankKillCreditsToUusd(root, kcAmount) {
        try {
            const w = walletOf(root);
            if (!w) return { ok: false, reason: 'no-wallet' };
            const r = rates();
            const spend = Math.max(0, Math.floor(Number(kcAmount) || 0));
            if (spend < r.killCreditsToUusd) return { ok: false, reason: 'amount-below-rate' };
            if ((Number(w.killCredits) || 0) < spend) return { ok: false, reason: 'insufficient-killcredits' };
            const out = Math.floor(spend / r.killCreditsToUusd);
            w.killCredits -= out * r.killCreditsToUusd;
            w.uusd = (Number(w.uusd) || 0) + out;
            return { ok: true, spentKillCredits: out * r.killCreditsToUusd, receivedUusd: out };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    function bankGoldToUusd(root, goldAmount) {
        try {
            const w = walletOf(root);
            if (!w) return { ok: false, reason: 'no-wallet' };
            const r = rates();
            const spend = Math.max(0, Math.floor(Number(goldAmount) || 0));
            if (spend < r.goldToUusd) return { ok: false, reason: 'amount-below-rate' };
            if ((Number(w.gold) || 0) < spend) return { ok: false, reason: 'insufficient-gold' };
            const out = Math.floor(spend / r.goldToUusd);
            w.gold -= out * r.goldToUusd;
            w.uusd = (Number(w.uusd) || 0) + out;
            return { ok: true, spentGold: out * r.goldToUusd, receivedUusd: out };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    function repairModule(root, moduleId) {
        try {
            const hub = ensureHub(root);
            const w = walletOf(root);
            const mod = hub.modules.find((m) => m.id === moduleId);
            if (!mod) return { ok: false, reason: 'unknown-module' };
            const missing = Math.max(0, mod.maxHp - mod.hp);
            if (missing <= 0) return { ok: false, reason: 'already-full' };
            const cost = missing * mod.costPerHpUusd;
            if ((Number(w.uusd) || 0) < cost) return { ok: false, reason: 'insufficient-uusd', cost };
            w.uusd -= cost;
            mod.hp = mod.maxHp;
            return { ok: true, moduleId, cost, hp: mod.hp };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    function repairAll(root) {
        try {
            const hub = ensureHub(root);
            const w = walletOf(root);
            let cost = 0;
            for (const mod of hub.modules) cost += Math.max(0, mod.maxHp - mod.hp) * mod.costPerHpUusd;
            if (cost <= 0) return { ok: false, reason: 'already-full' };
            if ((Number(w.uusd) || 0) < cost) return { ok: false, reason: 'insufficient-uusd', cost };
            w.uusd -= cost;
            for (const mod of hub.modules) mod.hp = mod.maxHp;
            return { ok: true, cost };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    function refillQJuice(root) {
        try {
            const hub = ensureHub(root);
            const w = walletOf(root);
            const missing = Math.max(0, hub.qjuice.max - hub.qjuice.current);
            if (missing <= 0) return { ok: false, reason: 'already-full' };
            const cost = hub.qjuice.refillCostUusd;
            if ((Number(w.uusd) || 0) < cost) return { ok: false, reason: 'insufficient-uusd', cost };
            w.uusd -= cost;
            hub.qjuice.current = hub.qjuice.max;
            return { ok: true, cost, qjuice: hub.qjuice.current };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    // ---- Mission select terminal ----

    function missionEntry(hub, id) {
        const e = hub && hub.missions && hub.missions[id];
        return {
            stars: (e && Math.max(0, Math.min(3, Math.floor(Number(e.stars)) || 0))) || 0,
            best: (e && e.best != null ? Math.max(0, Math.floor(Number(e.best)) || 0) : null)
        };
    }

    function isUnlocked(hub, index) {
        if (index <= 0) return true;
        const prev = missionEntry(hub, MISSIONS[index - 1].id);
        return prev.stars > 0;
    }

    function listMissions(root) {
        const hub = ensureHub(root);
        return MISSIONS.map((m, i) => {
            const e = missionEntry(hub, m.id);
            return {
                id: m.id, name: m.name, par: m.par,
                unlocked: isUnlocked(hub, i),
                stars: e.stars, best: e.best
            };
        });
    }

    function selectMission(root, missionId) {
        const hub = ensureHub(root);
        const idx = MISSIONS.findIndex((m) => m.id === missionId);
        if (idx < 0) return { ok: false, reason: 'unknown-mission' };
        if (!isUnlocked(hub, idx)) return { ok: false, reason: 'locked' };
        try {
            if (root && typeof root === 'object') root.missionId = missionId;
        } catch (e) { /* mission select still succeeds */ }
        return { ok: true, missionId, par: MISSIONS[idx].par };
    }

    function starsFor(par, strokes) {
        const s = Math.max(0, Math.floor(Number(strokes)));
        if (s <= par) return 3;
        if (s <= par + 2) return 2;
        return 1;
    }

    function completeMission(root, missionId, strokes) {
        const hub = ensureHub(root);
        const idx = MISSIONS.findIndex((m) => m.id === missionId);
        if (idx < 0) return { ok: false, reason: 'unknown-mission' };
        const s = Math.max(0, Math.floor(Number(strokes) || 0));
        const stars = starsFor(MISSIONS[idx].par, s);
        const prev = missionEntry(hub, missionId);
        hub.missions[missionId] = {
            stars: Math.max(prev.stars, stars),
            best: prev.best == null ? s : Math.min(prev.best, s)
        };
        return { ok: true, missionId, stars, best: hub.missions[missionId].best };
    }

    // ---- Return-to-Starship flow ----
    // Heals to full, sweeps ready crops (elapsed-time growth) into the
    // wallet, stamps lastReturnAt. Banking / repair / refill / mission
    // select stay explicit hub actions (below) so the flow never spends
    // currency on its own.

    function returnToStarship(root, now) {
        try {
            const hub = ensureHub(root);
            const t = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
            const healed = heal(root);
            let harvest = { ok: true, count: 0, gold: 0, seeds: [] };
            try {
                if (window.GG4D_Crops && typeof window.GG4D_Crops.harvestAll === 'function') {
                    harvest = window.GG4D_Crops.harvestAll(hub.crops, walletOf(root), t);
                }
            } catch (e) { harvest = { ok: false, reason: 'harvest-error', count: 0, gold: 0, seeds: [] }; }
            hub.lastReturnAt = t;
            try {
                if (root && typeof root === 'object' && typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('gravegain4d:hub', JSON.stringify(serializeHub(hub)));
                }
            } catch (e) { /* storage unavailable; state still live */ }
            return { ok: true, healed, harvest, lastReturnAt: t };
        } catch (e) { return { ok: false, reason: 'error' }; }
    }

    // ---- DOM: hook into existing #hub if present, else body panel ----

    function hubMount() {
        try {
            const existing = document.getElementById('hub');
            if (existing) return existing;
            let panel = document.getElementById('gg4d-hub-panel');
            if (panel) return panel;
            panel = document.createElement('div');
            panel.id = 'gg4d-hub-panel';
            panel.setAttribute('style', [
                'position:fixed', 'right:12px', 'bottom:12px', 'z-index:50',
                'max-width:min(420px,calc(100vw - 24px))', 'max-height:min(70vh,640px)',
                'overflow:auto', 'padding:14px 16px', 'border-radius:10px',
                'background:rgba(8,10,24,0.92)', 'border:1px solid #4c5bd5',
                'color:#e8ecff', 'font:13px/1.5 system-ui,sans-serif'
            ].join(';'));
            document.body.appendChild(panel);
            return panel;
        } catch (e) { return null; }
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function starStr(n) {
        let out = '';
        for (let i = 0; i < 3; i += 1) out += i < n ? '★' : '☆';
        return out;
    }

    function render(root) {
        const mount = hubMount();
        if (!mount) return false;
        const state = root || findGameRoot() || {};
        const hub = ensureHub(state);
        const p = playerOf(state) || {};
        const w = walletOf(state) || { gold: 0, killCredits: 0, uusd: 0 };
        const lv = quartersLevelOf(state);
        let cap = { space: 0, slots: 0 };
        try {
            if (window.GG4D_Quarters && typeof window.GG4D_Quarters.describe === 'function') {
                const d = window.GG4D_Quarters.describe(lv);
                cap = { space: d.capacity, slots: d.slots };
            } else if (window.GG4D_Crops && typeof window.GG4D_Crops.capacityInfo === 'function') {
                cap = window.GG4D_Crops.capacityInfo(lv);
            }
        } catch (e) { /* show zeros */ }
        const missions = listMissions(state);
        const modules = hub.modules.map((m) =>
            '<div>🔧 ' + esc(m.name) + ': ' + m.hp + '/' + m.maxHp +
            ' <button data-gg4d-act="repair" data-id="' + esc(m.id) + '">Repair</button></div>'
        ).join('');
        const missionRows = missions.map((m) =>
            '<div>' + (m.unlocked ? '🟢' : '🔒') + ' ' + esc(m.name) +
            ' (par ' + m.par + ') ' + starStr(m.stars) +
            (m.unlocked ? ' <button data-gg4d-act="mission" data-id="' + esc(m.id) + '">Launch</button>' : '') +
            '</div>'
        ).join('');
        mount.innerHTML =
            '<h3 style="margin:0 0 8px">🚀 LuckyStarShip Hub</h3>' +
            '<div>❤️ Hull/HP: ' + esc(p.hp) + ' / ' + esc(p.maxHp) +
            ' <button data-gg4d-act="heal">Heal to full</button></div>' +
            '<div>🪙 Gold: ' + esc(w.gold) + ' · 🎫 KillCredits: ' + esc(w.killCredits) +
            ' · 💵 $UUSD: ' + esc(w.uusd) + '</div>' +
            '<div style="margin:6px 0">' +
            ' <button data-gg4d-act="bank-gkc">Gold→KillCredits</button>' +
            ' <button data-gg4d-act="bank-kcu">KillCredits→$UUSD</button>' +
            ' <button data-gg4d-act="bank-gu">Gold→$UUSD</button></div>' +
            '<div>🏠 Quarters Lv ' + lv + ' (' + cap.space + ' space, ' + cap.slots + ' crop slots)</div>' +
            '<div>🧃 Q-juice: ' + hub.qjuice.current + '/' + hub.qjuice.max +
            ' <button data-gg4d-act="qjuice">Refill (' + hub.qjuice.refillCostUusd + ' $UUSD)</button></div>' +
            '<div style="margin:6px 0">' + modules +
            ' <button data-gg4d-act="repair-all">Repair all</button></div>' +
            '<div><strong>Mission terminal</strong>' + missionRows + '</div>' +
            '<div style="margin-top:6px"><button data-gg4d-act="return">Return to Starship</button></div>';
        try {
            mount.querySelectorAll('[data-gg4d-act]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const act = btn.getAttribute('data-gg4d-act');
                    const id = btn.getAttribute('data-id');
                    handlePanelAction(state, act, id);
                    render(state);
                });
            });
        } catch (e) { /* static render still stands */ }
        return true;
    }

    function handlePanelAction(state, act, id) {
        try {
            const r = rates();
            if (act === 'heal') heal(state);
            else if (act === 'bank-gkc') bankGoldToKillCredits(state, r.goldToKillCredits);
            else if (act === 'bank-kcu') bankKillCreditsToUusd(state, r.killCreditsToUusd);
            else if (act === 'bank-gu') bankGoldToUusd(state, r.goldToUusd);
            else if (act === 'repair') repairModule(state, id);
            else if (act === 'repair-all') repairAll(state);
            else if (act === 'qjuice') refillQJuice(state);
            else if (act === 'mission') selectMission(state, id);
            else if (act === 'return') returnToStarship(state);
        } catch (e) { /* panel actions are best-effort */ }
    }

    window.GG4D_Hub = {
        MISSIONS: MISSIONS.map((m) => ({ ...m })),
        createHubState,
        serializeHub,
        deserializeHub,
        ensureHub,
        findGameRoot,
        heal,
        bankGoldToKillCredits,
        bankKillCreditsToUusd,
        bankGoldToUusd,
        repairModule,
        repairAll,
        refillQJuice,
        listMissions,
        selectMission,
        completeMission,
        starsFor,
        returnToStarship,
        render
    };
})();
