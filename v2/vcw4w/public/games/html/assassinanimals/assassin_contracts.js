/**
 * AssassinAnimals - Contract Pack (Agent C systems upgrade)
 * Standalone: no dependency on game.js internals. game.js reads this via window hook if present.
 * Persistence keys:
 *  - assassinanimals_contracts_v1 : per-contract best rank + completions
 *  - assassinanimals_save_v1      : handled in game.js (run best, settings)
 */
(function () {
    'use strict';

    var STORE_KEY = 'assassinanimals_contracts_v1';

    // rank order for best-rank tracking (higher index = better)
    var RANK_ORDER = ['NONE', 'BRONZE', 'SILVER', 'GOLD', 'SILENT_ASSASSIN', 'GHOST', 'PHANTOM'];

    // 12+ hand-authored contracts across floors.
    // constraint types (checked by game.js, all optional):
    //  operative: required operative id | pacifyOnly | noAlarms | noKills(non-target) |
    //  timeLimitSec | vipWeapon ("takedown"|"any") | mustStayDisguisedPct (0-1, advisory)
    var CONTRACTS = [
        {
            id: 'c01_first_blood',
            name: 'First Blood',
            floor: 1, operative: 'panther',
            briefing: 'VIP scientist on Floor 1. Your Panther claws are the instrument. Any method, just confirm the kill and reach the elevator.',
            rewardDNA: 8, scoreMult: 1.1,
            rules: { vipWeapon: 'any' }
        },
        {
            id: 'c02_quiet_room',
            name: 'Quiet Room',
            floor: 1, operative: 'any',
            briefing: 'Pacify-only sanction. No kills. Subdue the VIP with silent takedowns or tranq darts and exfiltrate.',
            rewardDNA: 12, scoreMult: 1.25,
            rules: { pacifyOnly: true }
        },
        {
            id: 'c03_ghost_protocol',
            name: 'Ghost Protocol',
            floor: 2, operative: 'any',
            briefing: 'Zero alarms. If a single siren sounds the contract is void. Move slow, use cover, loop cameras first.',
            rewardDNA: 14, scoreMult: 1.4,
            rules: { noAlarms: true }
        },
        {
            id: 'c04_venom_directive',
            name: 'Venom Directive',
            floor: 2, operative: 'cobra',
            briefing: 'Cobra-only work. The client wants a neurotoxin signature on the VIP. Poison or acid-cloud confirmation required.',
            rewardDNA: 14, scoreMult: 1.35,
            rules: { vipWeapon: 'any' }
        },
        {
            id: 'c05_smash_and_grab',
            name: 'Smash and Grab',
            floor: 3, operative: 'gorilla',
            briefing: 'Heavy approach authorized. Gorilla operative, Floor 3. Collateral accepted but alarms will halve the fee.',
            rewardDNA: 10, scoreMult: 1.15,
            rules: {}
        },
        {
            id: 'c06_eyes_in_sky',
            name: 'Eyes in the Sky',
            floor: 3, operative: 'hawk',
            briefing: 'Recon sanction: ping every patrol with Sensor Recon at least once, then eliminate the VIP. No-knockout bonus applies.',
            rewardDNA: 14, scoreMult: 1.3,
            rules: { requireReconPing: true }
        },
        {
            id: 'c07_time_trial_sprint',
            name: '90-Second Sprint',
            floor: 2, operative: 'any',
            briefing: 'Time trial. VIP down and elevator reached in under 90 seconds for full fee. Speed mutations recommended.',
            rewardDNA: 16, scoreMult: 1.5,
            rules: { timeLimitSec: 90 }
        },
        {
            id: 'c08_master_of_disguise',
            name: 'Master of Disguise',
            floor: 4, operative: 'octopus',
            briefing: 'Octopus infiltration. Steal a uniform and stay disguised: VIP must never see your true face. Hack a terminal for the keycard.',
            rewardDNA: 18, scoreMult: 1.5,
            rules: { requireHack: true }
        },
        {
            id: 'c09_burrow_job',
            name: 'The Burrow Job',
            floor: 4, operative: 'badger',
            briefing: 'Badger-only. Elites now patrol below (Shielded Enforcers, Drones). Burrow under them, confirm VIP, exfiltrate alive.',
            rewardDNA: 18, scoreMult: 1.45,
            rules: {}
        },
        {
            id: 'c10_saboteur',
            name: 'Saboteur Prime',
            floor: 5, operative: 'beaver',
            briefing: 'Sabotage run. Deploy the Decoy Drone tactic (Noise Decoy gadget counts too) and disable 2 laser barriers by contact or slam.',
            rewardDNA: 20, scoreMult: 1.5,
            rules: { requireDecoyUse: true }
        },
        {
            id: 'c11_juggernaut',
            name: 'Juggernaut Run',
            floor: 5, operative: 'rhino',
            briefing: 'Rhino demolition. Floor 5+ elites are shielded frontally - flank or charge through. No stealth bonus expected; survive.',
            rewardDNA: 16, scoreMult: 1.3,
            rules: {}
        },
        {
            id: 'c12_phantom_floor',
            name: 'Phantom Floor',
            floor: 6, operative: 'any',
            briefing: 'Phantom-tier sanction on Floor 6: VIP only, no knockouts of any other guard, no alarms, all bodies hidden. Fee is triple on Phantom.',
            rewardDNA: 30, scoreMult: 2.0,
            rules: { noAlarms: true, vipOnlyKills: true }
        },
        {
            id: 'c13_kangaroo_courier',
            name: 'Courier Intercept',
            floor: 3, operative: 'kangaroo',
            briefing: 'Courier intercept: pickpocket the VIP keycard (sneak behind, hold E) instead of killing. Lethal force voids the fee.',
            rewardDNA: 18, scoreMult: 1.6,
            rules: { pacifyOnly: true, requirePickpocket: true }
        }
    ];

    function loadStore() {
        try {
            var raw = localStorage.getItem(STORE_KEY);
            if (!raw) return { best: {}, completions: {} };
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return { best: {}, completions: {} };
            parsed.best = parsed.best || {};
            parsed.completions = parsed.completions || {};
            return parsed;
        } catch (e) { return { best: {}, completions: {} }; }
    }

    function saveStore(s) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
    }

    function rankBeats(a, b) {
        return RANK_ORDER.indexOf(a) > RANK_ORDER.indexOf(b);
    }

    var api = {
        version: 1,
        storeKey: STORE_KEY,
        rankOrder: RANK_ORDER.slice(),
        contracts: CONTRACTS,
        activeId: null,
        list: function () { return CONTRACTS.slice(); },
        get: function (id) {
            for (var i = 0; i < CONTRACTS.length; i++) {
                if (CONTRACTS[i].id === id) return CONTRACTS[i];
            }
            return null;
        },
        getActive: function () {
            return this.activeId ? this.get(this.activeId) : null;
        },
        setActive: function (id) {
            try {
                if (id && !this.get(id)) return false;
                this.activeId = id || null;
                return true;
            } catch (e) { return false; }
        },
        getProgress: function () {
            try { return loadStore(); } catch (e) { return { best: {}, completions: {} }; }
        },
        getBest: function (id) {
            try {
                var s = loadStore();
                return s.best[id] || 'NONE';
            } catch (e) { return 'NONE'; }
        },
        /**
         * Record a contract result. rank must be in RANK_ORDER.
         * Returns true if this was a new best.
         */
        recordResult: function (id, rank, meta) {
            try {
                if (!id || RANK_ORDER.indexOf(rank) < 0) return false;
                var s = loadStore();
                var prev = s.best[id] || 'NONE';
                s.completions[id] = (s.completions[id] || 0) + 1;
                var isBest = rankBeats(rank, prev);
                if (isBest) s.best[id] = rank;
                try {
                    s.last = { id: id, rank: rank, at: Date.now(), meta: meta || null };
                } catch (e2) {}
                saveStore(s);
                return isBest;
            } catch (e) { return false; }
        },
        clear: function () {
            try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        }
    };

    try {
        window.AssassinContracts = api;
    } catch (e) {}
})();
