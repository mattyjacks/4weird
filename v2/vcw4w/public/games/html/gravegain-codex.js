/* GraveGain codex — unified swarm lore registry (E19, v2-native, parity-safe).
 *
 * Lives OUTSIDE parity-locked bundles:
 *   public/games/html/gravegain-codex.js
 * Injected into the generated runtime copies (public/games/<slug>/) by
 * scripts/sync-game-bundles.mjs (wiring lane owns that script — this file
 * never edits gravegain1d/game.js, gravegain2d/**, gravegain3d/**,
 * manifests, or old-v1/).
 *
 * What it does:
 *   - Unifies ALL swarm content into one codex: base + bestiary enemies
 *     (GraveGainBestiary, GraveGainEnemies variants, GraveGainBestiary3D),
 *     loot/arsenal weapons (GraveGainArsenal, GraveGain3DArsenal,
 *     GraveGainArsenal2D1D), NPCs (GraveGainEmergent NPCS/WANDERERS,
 *     GraveGainCharacters), quests (SIDEQUESTS/SIDE_QUESTS,
 *     GraveGainSidequests), events (ACTIVITIES, GraveGainEvents), sectors +
 *     bosses (10-mission saga), and lore (GraveGainLore.database).
 *   - Auto-registers entries by polling for swarm globals (load order is
 *     unknown — every source is optional, every read guarded).
 *   - Unlock-on-encounter: polls live game state (~1Hz, pauses when hidden)
 *     and unlocks bestiary/weapon/sector entries as you meet them. Swarm
 *     files (present or future) can also call
 *     GraveGainCodex.notifyEncounter(id) or dispatch a
 *     'gravegain-codex-unlock' CustomEvent with { id }.
 *   - Persistence: own shared key 'gravegain_codex_swarm_v1' (one key across
 *     all 3 games, so unlocks travel with the player). Best-effort mirrors
 *     into each game's existing persistence (GraveGainCampaign unlock fns
 *     when present; campaign lore store 'gravegain_campaign_codex_v1' is
 *     read, NEVER written). Falls back to plain localStorage; when storage
 *     is blocked the codex keeps working in memory.
 *   - Codex overlay UI: floating 📖 button + `C` key, category tabs,
 *     locked/unlocked states, textContent-only (no innerHTML).
 *   - Age bands: drug-flagged entries are HIDDEN unless
 *     window.GraveGainAgeBands?.isDrugsAllowed() (fallback: mode === 'all').
 *     Same art/text for all bands otherwise; entry copy is teen-clean.
 *
 * Contract: vanilla IIFE, no imports, never throws, idempotent
 * (`if (window.GraveGainCodex) return`), capped (entries/DOM/toasts),
 * throttled polls, pauses when `document.hidden`.
 */
(function () {
    'use strict';
    if (window.GraveGainCodex) return; // idempotent under double-injection

    var VERSION = '1.0.0';
    var OWN_KEY = 'gravegain_codex_swarm_v1';
    var CAMPAIGN_KEY = 'gravegain_campaign_codex_v1';
    var MAX_ENTRIES = 600;
    var MAX_UNLOCKED = 600;
    var MAX_ROWS = 200;
    var MAX_TOASTS = 3;
    var TOAST_MS = 3500;

    /* ---------- tiny safe helpers ---------- */

    function str(v, dflt) {
        try {
            if (v === undefined || v === null) return dflt;
            var s = String(v);
            return s ? s : dflt;
        } catch (_) { return dflt; }
    }

    function norm(v) {
        try { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
        catch (_) { return ''; }
    }

    function isArr(v) {
        try { return Array.isArray(v); } catch (_) { return false; }
    }

    function each(arr, fn) {
        try {
            if (!isArr(arr)) return;
            for (var i = 0; i < arr.length; i++) {
                try { fn(arr[i], i); } catch (_) { /* one bad row must not break the rest */ }
            }
        } catch (_) { /* ignore */ }
    }

    function safeStoreGet(key) {
        try {
            if (!window.localStorage) return null;
            return window.localStorage.getItem(key);
        } catch (_) { return null; }
    }

    function safeStoreSet(key, json) {
        try {
            if (!window.localStorage) return false;
            window.localStorage.setItem(key, json);
            return true;
        } catch (_) { return false; } // private mode / quota: memory fallback
    }

    function safeParse(raw) {
        try {
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (_) { return null; }
    }

    /* ---------- age bands (fail-closed: unknown behaves as teen) ---------- */

    var DRUG_RE = /mushroom|shroom|psilocybin|mycelium|cannabis|hemp|opium|moonshine|smokeleaf|mana\s*potion|health\s*potion|healing\s*potion|\bbrewery\b/i;

    function resolveMode() {
        try {
            var q = null;
            try {
                q = new URLSearchParams(window.location.search).get('content');
            } catch (_) { q = null; }
            if (q === 'kid' || q === 'teen' || q === 'all') return q;
            var slugs = ['gravegain3d', 'gravegain2d', 'gravegain1d'];
            for (var i = 0; i < slugs.length; i++) {
                try {
                    var v = window.localStorage.getItem('4weird-content-mode:' + slugs[i]);
                    if (v === 'kid' || v === 'teen' || v === 'all') return v;
                } catch (_) { /* ignore */ }
            }
            try {
                var leg = window.localStorage.getItem('FourweirdContentMode');
                if (leg) {
                    try {
                        var p = JSON.parse(leg);
                        if (p && (p.mode === 'kid' || p.mode === 'teen' || p.mode === 'all')) return p.mode;
                    } catch (_) {
                        if (leg === 'kid' || leg === 'teen' || leg === 'all') return leg;
                    }
                }
            } catch (_) { /* ignore */ }
            try {
                if (window.FourweirdContentMode && window.FourweirdContentMode.mode) {
                    var m = String(window.FourweirdContentMode.mode).toLowerCase();
                    if (m === 'kid' || m === 'teen' || m === 'all') return m;
                }
            } catch (_) { /* ignore */ }
            try {
                var ab = window.GraveGainAgeBands;
                if (ab && typeof ab.getMode === 'function') {
                    var gm = String(ab.getMode()).toLowerCase();
                    if (gm === 'kid' || gm === 'teen' || gm === 'all') return gm;
                }
            } catch (_) { /* ignore */ }
        } catch (_) { /* ignore */ }
        return 'teen';
    }

    function isDrugsAllowed() {
        try {
            var ab = window.GraveGainAgeBands;
            if (ab && typeof ab.isDrugsAllowed === 'function') {
                try { return !!ab.isDrugsAllowed(); } catch (_) { /* fall through */ }
            }
            return resolveMode() === 'all';
        } catch (_) { return false; }
    }

    /* ---------- entry registry ---------- */

    var entries = {}; // id -> { id, kind, name, icon, text, hint, drugs, source, keys }
    var entryCount = 0;
    var pending = {}; // encounter ids seen before their entry registered
    var unlocked = {}; // swarm unlocks (own store)
    var scanDone = {}; // per-source flags so rescan is cheap once stable

    function addEntry(id, kind, name, icon, text, hint, drugs, source, keys) {
        try {
            id = str(id, '');
            if (!id || entries[id] || entryCount >= MAX_ENTRIES) return null;
            var blob = str(name, '') + ' ' + str(text, '');
            var e = {
                id: id,
                kind: str(kind, 'lore') || 'lore',
                name: str(name, id) || id,
                icon: str(icon, '📖') || '📖',
                text: str(text, 'The chroniclers have not finished this page.') || 'The chroniclers have not finished this page.',
                hint: str(hint, '') || '',
                drugs: !!drugs || DRUG_RE.test(blob),
                source: str(source, 'codex') || 'codex',
                keys: {}
            };
            try {
                e.keys[norm(id)] = true;
                var short = id.split(':').pop();
                e.keys[norm(short)] = true;
                if (isArr(keys)) {
                    for (var i = 0; i < keys.length; i++) {
                        var k = norm(keys[i]);
                        if (k) e.keys[k] = true;
                    }
                }
            } catch (_) { /* ignore */ }
            entries[id] = e;
            entryCount++;
            if (pending[id]) {
                try { delete pending[id]; } catch (_) { /* ignore */ }
            }
            return e;
        } catch (_) { return null; }
    }

    function findEnemyId(candidate) {
        try {
            var n = norm(candidate);
            if (!n) return null;
            for (var id in entries) {
                try {
                    var e = entries[id];
                    if (e.kind !== 'enemy' && e.kind !== 'boss') continue;
                    if (e.keys[n]) return id;
                } catch (_) { /* ignore */ }
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    function findWeaponId(candidate) {
        try {
            var n = norm(candidate);
            if (!n) return null;
            for (var id in entries) {
                try {
                    var e = entries[id];
                    if (e.kind !== 'weapon') continue;
                    if (e.keys[n]) return id;
                } catch (_) { /* ignore */ }
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    /* ---------- persistence (own key + best-effort game mirrors) ---------- */

    function loadOwn() {
        try {
            var p = safeParse(safeStoreGet(OWN_KEY));
            if (p && isArr(p.unlocked)) {
                for (var i = 0; i < p.unlocked.length && i < MAX_UNLOCKED * 2; i++) {
                    if (typeof p.unlocked[i] === 'string') unlocked[p.unlocked[i]] = true;
                }
            }
        } catch (_) { /* memory fallback */ }
    }

    function saveOwn() {
        try {
            var list = [];
            for (var id in unlocked) {
                if (unlocked[id]) list.push(id);
                if (list.length >= MAX_UNLOCKED) break;
            }
            safeStoreSet(OWN_KEY, JSON.stringify({ v: 1, unlocked: list }));
        } catch (_) { /* ignore */ }
    }

    function readCampaignUnlocks() {
        // Read-only view of the campaign codex (owned by 30-campaign-codex.js).
        // This NEVER writes — the campaign key stays authoritative there.
        var out = {};
        try {
            var camp = window.GraveGainCampaign;
            if (camp && typeof camp.getUnlockedLore === 'function') {
                var arr = camp.getUnlockedLore();
                if (isArr(arr)) {
                    for (var i = 0; i < arr.length; i++) {
                        if (typeof arr[i] === 'string') out[arr[i]] = true;
                    }
                    return out;
                }
            }
        } catch (_) { /* fall through to raw read */ }
        try {
            var p = safeParse(safeStoreGet(CAMPAIGN_KEY));
            if (p && isArr(p.unlocked)) {
                for (var j = 0; j < p.unlocked.length; j++) {
                    if (typeof p.unlocked[j] === 'string') out[p.unlocked[j]] = true;
                }
            }
        } catch (_) { /* ignore */ }
        return out;
    }

    function mirrorToGame(id, kind) {
        // Best-effort: hand the unlock to each game's existing persistence
        // when it offers a write path. Never touches raw store keys here.
        try {
            var camp = window.GraveGainCampaign;
            if (camp) {
                var fns = ['unlockLore', 'grantLore', 'addLoreUnlock', 'unlockCodex'];
                for (var i = 0; i < fns.length; i++) {
                    try {
                        if (typeof camp[fns[i]] === 'function') {
                            camp[fns[i]](id);
                            break;
                        }
                    } catch (_) { /* try next */ }
                }
            }
        } catch (_) { /* mirror is best-effort only */ }
        try {
            var sys = window.GraveGainSaveSystem;
            if (sys && typeof sys.recordCodex === 'function') sys.recordCodex(id, kind);
        } catch (_) { /* ignore */ }
    }

    function isUnlocked(id) {
        try {
            if (!id) return false;
            if (unlocked[id]) return true;
            var camp = readCampaignUnlocks();
            if (camp[id]) return true;
            var e = entries[id];
            if (e && e.kind === 'lore' && camp['lore:' + id]) return true;
            return false;
        } catch (_) { return false; }
    }

    function unlock(id, opts) {
        try {
            id = str(id, '');
            if (!id) return false;
            if (unlocked[id]) return true;
            if (!entries[id]) {
                // Entry not registered yet (load order) — remember it.
                try { pending[id] = true; } catch (_) { /* ignore */ }
                return false;
            }
            unlocked[id] = true;
            saveOwn();
            try { mirrorToGame(id, entries[id].kind); } catch (_) { /* ignore */ }
            var silent = !!(opts && opts.silent);
            if (!silent) {
                try { toastUnlock(entries[id]); } catch (_) { /* ignore */ }
                try { scheduleRender(); } catch (_) { /* ignore */ }
            }
            return true;
        } catch (_) { return false; }
    }

    function notifyEncounter(raw) {
        try {
            if (raw === undefined || raw === null) return false;
            var id = null;
            if (typeof raw === 'string') {
                id = raw;
                if (!entries[id]) id = findEnemyId(raw) || findWeaponId(raw);
            } else if (typeof raw === 'object') {
                var cands = [raw.id, raw._variant, raw.variant, raw.type, raw.kind, raw.enemyId, raw.weaponId, raw.questId, raw.npcId, raw.eventId];
                for (var i = 0; i < cands.length; i++) {
                    if (typeof cands[i] !== 'string' || !cands[i]) continue;
                    if (entries[cands[i]]) { id = cands[i]; break; }
                    var f = findEnemyId(cands[i]) || findWeaponId(cands[i]);
                    if (f) { id = f; break; }
                }
            }
            if (!id) return false;
            return unlock(id);
        } catch (_) { return false; }
    }

    /* ---------- seed: base roster + saga sectors/bosses (canon) ---------- */

    function seedBase() {
        if (scanDone.seed) return;
        scanDone.seed = true;
        var base = [
            ['enemy:shambler', 'Risen Shambler', '🧟', 'The first thing every recruit meets: a colonist who breathed MoonRock air without a helmet. Slow, moaning, and tragically persistent. Aim for the head and say a kind word.'],
            ['enemy:swarm', 'Skull Swarm', '💀', 'Teeth with ambition. Individually harmless, collectively a bad afternoon. The Array herds them like sheepdogs herd sheep — except the sheep bite.'],
            ['enemy:brute', 'Zed Brute', '👹', 'What happens when a Dwarven forge-hand rises with all his muscle memory intact. Hits like a cave-in. Do not let it hug you.'],
            ['enemy:necro', 'Array Necromancer', '🧙', 'A fallen spellcaster still wired to the Necromatic Array. It does not cast at you — it recites you, and the Array fills in the blanks.']
        ];
        each(base, function (b) {
            addEntry(b[0], 'enemy', b[1], b[2], b[3], 'Starter bestiary — the Compact knew these first.', false, 'base', [b[0].split(':')[1]]);
        });
        var sectors = [
            ['sector:m1', 'sector', 'Colony LZ — Sector Alpha', '🚀', 'Where LuckyStarShip set down and where James Wright drew his first posthumous breath. The LZ flag still flies. The burial detail still marches. Put them to rest.'],
            ['sector:m2', 'sector', 'Elven Groves — Forest Vaults', '🌳', 'Bioluminescent canopy over bleeding roots. The Mother Tree remembers every name carved into her — including the ones that came back.'],
            ['sector:m3', 'sector', 'Dwarven Vaults — Deep Mines', '⛏️', 'Sparkite seams and forge-fires gone cold. The Deep Forge built the Compact\'s steel; the Array wants its fuel. Mind the dark. The dark minds you.'],
            ['sector:m4', 'sector', 'Orc Wastes — Crimson Redoubts', '🏜️', 'Red sand, red sun through Giantess-light, redder tempers. Groknak\'s gate has never fallen to the living. The risen are testing that record.'],
            ['sector:m5', 'sector', 'Comms Relay 09 — The Shallows', '📡', 'Valley Net uplink half-drowned in static. Re-align the dish and the jamming lifts; fail, and Hades keeps whispering into every helmet radio.'],
            ['sector:m6', 'sector', 'Botany Core — Alchemical Catacombs', '🌿', 'President Good\'s gardens, poisoned from the roots up. The Chem-Golem breathes what the colony breathes. Purge the vats or wear the consequence.'],
            ['sector:m7', 'sector', 'Colonial Crypt of Honor', '⚰️', 'Clint Oldman lies here — the man time broke and the Array refused to bury. Guy Young\'s paradox sleeps beside him. Grant them both the quiet they earned.'],
            ['sector:m8', 'sector', 'Highland Peak Observatory', '🔭', 'The highest lens on MoonRock, aimed at the Citadel. Paint the target true and the kinetic strike does the rest. MERCENARY is watching through this glass. Probably.'],
            ['sector:m9', 'sector', 'The Citadel Perimeter', '🏰', 'The Array\'s front door, guarded by a Titan that used to be a maintenance frame. All four races breach together, or not at all. The Compact holds here.'],
            ['sector:m10', 'sector', 'Sanctum Core — Lucifer\'s Shadow', '🌑', 'Two hundred years of solitude distilled into one man who refuses to die. End the Consciousness Overlord, kill the Array, and make the peace stick.']
        ];
        each(sectors, function (s) {
            addEntry(s[0], s[1], s[2], s[3], s[4], 'Epic saga sector — unlocked by reaching its mission.', false, 'saga', [s[0], s[0].split(':')[1], 'm' + s[0].slice(-1)]);
        });
        var bosses = [
            ['boss:m1', 'Goblin Zed Leader', '👺', 'Big for a goblin, which is to say knee-high and furious. Leads the LZ burial detail in nightly rock-throwing drills. Still dodges like it remembers being alive.'],
            ['boss:m2', 'Elven Necromancer', '🧝', 'A fallen seer anchored to the Mother Tree\'s wounds. She weeps violet light and raises everything the grove ever buried. Aelindra will not speak her name.'],
            ['boss:m3', 'Dwarven Zed High Thane', '🧔', 'Crowned in sparkite, seated on a throne of his own forge. He taxes the living in blood and pays the Array in souls. The mines echo when he stands.'],
            ['boss:m4', 'Huge Orc Zed Berserker', '🧌', 'Groknak\'s own blood, risen mid-war-cry. Twice the orc, half the mercy, all of the momentum. The redoubts shake when it charges. So do veteran knees.'],
            ['boss:m5', 'Corrupted Drone Array', '🛸', 'Valley Net hardware with Hades\' voice in its rotors. It jams, it spies, it dive-bombs. Arty Fisher built half of it and apologizes for all of it.'],
            ['boss:m6', 'Toxic Chem-Golem', '🧪', 'Fertilizer, fungicide, and one very unlucky botanist, animated by Good\'s poisoned vats. It sweats burning rain. Do not breathe near it. Do not be near it.'],
            ['boss:m7', 'Reanimated Patriarch Clint', '🎩', 'Time broke him; the Array rebuilt him wrong. He tips his hat before every killing blow — manners outlive the man. Lay the paradox down gently.'],
            ['boss:m8', 'Bone Goliath Warlord', '🦴', 'A siege engine of fused skeletons with a general\'s instincts. It read the Compact\'s battle plans in the marrow of fallen scouts. Hit the joints, then the crown.'],
            ['boss:m9', 'Necro-Array Titan', '🤖', 'The Citadel\'s doorkeeper: a maintenance colossus rewired into a god\'s knocker. Every plate hums at 03:47 — the exact minute of the NecroGenesis.'],
            ['boss:m10', 'Dr. Lucifer Hades', '😈', 'Chief consciousness researcher. Two centuries awake. Conqueror of death, author of the Array, and the reason every helmet stays sealed. End him, and MoonRock exhales.']
        ];
        each(bosses, function (b) {
            addEntry(b[0], 'boss', b[1], b[2], b[3], 'Gate boss — unlocked by facing it down.', false, 'saga', [b[0], b[1]]);
        });
    }

    /* ---------- auto-register from swarm globals ---------- */

    function pickList(mod, names) {
        try {
            if (!mod) return null;
            for (var i = 0; i < names.length; i++) {
                try {
                    var v = mod[names[i]];
                    if (isArr(v) && v.length) return v;
                } catch (_) { /* try next */ }
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    function itemStr(o, names, dflt) {
        try {
            for (var i = 0; i < names.length; i++) {
                var v = o[names[i]];
                if (v !== undefined && v !== null && String(v) !== '') return String(v);
            }
        } catch (_) { /* ignore */ }
        return dflt;
    }

    function scanBestiary() {
        if (scanDone.bestiary) return;
        try {
            var b = window.GraveGainBestiary;
            var list = pickList(b, ['ENEMIES', 'enemies', 'list']);
            if (!list) return;
            each(list, function (o) {
                if (!o) return;
                var id = itemStr(o, ['id'], '');
                if (!id) return;
                var tier = itemStr(o, ['tier', 'rarity'], 'minion');
                var beh = itemStr(o, ['behavior'], '');
                var flavor = itemStr(o, ['flavor2d', 'flavor', 'blurb'], '');
                var stats = 'HP ' + itemStr(o, ['hp'], '?') + ' · ATK ' + itemStr(o, ['atk'], '?');
                addEntry('enemy:' + id, 'enemy',
                    itemStr(o, ['name'], id),
                    itemStr(o, ['emoji', 'icon'], '🧟'),
                    'Compact field file, ' + tier + '-class' + (beh ? ', ' + beh + '-pattern' : '') + '. ' + stats + '.' + (flavor ? ' ' + flavor + '.' : ' The scouts sketched it between screams.'),
                    'Bestiary file — unlocked on first encounter.', false, 'bestiary',
                    [id, o.name]);
            });
            scanDone.bestiary = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanEnemyVariants() {
        if (scanDone.variants) return;
        try {
            var mods = [window.GraveGainEnemies, window.GraveGainBestiary3D];
            var found = false;
            each(mods, function (mod) {
                var list = pickList(mod, ['VARIANTS', 'variants']);
                if (!list) return;
                found = true;
                each(list, function (o) {
                    if (!o) return;
                    var id = itemStr(o, ['id'], '');
                    if (!id) return;
                    var beh = itemStr(o, ['behavior'], 'lurker');
                    var threat = itemStr(o, ['threat', 'tier'], '?');
                    addEntry('svariant:' + id, 'enemy',
                        itemStr(o, ['name'], id),
                        itemStr(o, ['emoji', 'icon'], '👹'),
                        'Swarm variant, threat ' + threat + ', ' + beh + '-pattern. The Array keeps iterating; the Compact keeps taking notes in the margins, in pencil, while running.',
                        'Endless-dungeon variant — unlocked on first encounter.', false, 'swarm',
                        [id, o.name]);
                });
            });
            if (found) scanDone.variants = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanBossPhases() {
        if (scanDone.phases) return;
        try {
            var mod = window.GraveGainEnemies;
            var list = pickList(mod, ['BOSS_PHASES', 'bossPhases', 'BOSSES', 'bosses']);
            if (!list) return;
            each(list, function (o) {
                if (!o) return;
                var id = (typeof o === 'string') ? o : itemStr(o, ['id'], '');
                if (!id) return;
                addEntry('bossphase:' + norm(id), 'boss',
                    (typeof o === 'string') ? o : itemStr(o, ['name', 'title'], id),
                    (typeof o === 'string') ? '👑' : itemStr(o, ['emoji', 'icon'], '👑'),
                    itemStr(o, ['note', 'text', 'desc'], 'When the gate bosses bleed, they change. The chroniclers logged the phases so the next squad knows when to run.'),
                    'Boss-phase note — unlocked by reaching the phase.', false, 'swarm', [id]);
            });
            scanDone.phases = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanArsenal() {
        if (scanDone.arsenal) return;
        try {
            var mods = [window.GraveGainArsenal, window.GraveGain3DArsenal, window.GraveGainArsenal2D1D];
            var found = false;
            each(mods, function (mod) {
                var list = pickList(mod, ['WEAPONS', 'weapons', 'arsenal', 'loot']);
                if (!list) return;
                found = true;
                each(list, function (o) {
                    if (!o) return;
                    var id = itemStr(o, ['id'], '');
                    if (!id) return;
                    var kind = itemStr(o, ['kind'], 'melee');
                    var rar = itemStr(o, ['rarity'], 'common');
                    var blurb = itemStr(o, ['blurb', 'desc', 'flavor'], '');
                    addEntry('weapon:' + id, 'weapon',
                        itemStr(o, ['name'], id),
                        itemStr(o, ['emoji', 'icon'], '⚔️'),
                        rar + ' ' + kind + ' of the Compact armory.' + (blurb ? ' ' + blurb : ' Quartermaster-approved, zombie-tested.'),
                        'Armory file — unlocked on first pickup.', false, 'arsenal',
                        [id, o.name]);
                });
            });
            if (found) scanDone.arsenal = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanQuests() {
        if (scanDone.quests) return;
        try {
            var mods = [window.GraveGainEmergent, window.GraveGainSidequests];
            var found = false;
            each(mods, function (mod) {
                var list = pickList(mod, ['SIDEQUESTS', 'SIDE_QUESTS', 'QUESTS', 'quests', 'list']);
                if (!list) return;
                found = true;
                each(list, function (o) {
                    if (!o) return;
                    var id = itemStr(o, ['id'], '');
                    if (!id) return;
                    var obj = itemStr(o, ['objective', 'text', 'desc'], '');
                    var twist = itemStr(o, ['twist'], '');
                    var drugs = !!(o.drugsAdultOnly || o.drugs);
                    addEntry('quest:' + id, 'quest',
                        itemStr(o, ['title', 'name'], id),
                        itemStr(o, ['emoji', 'icon'], '📜'),
                        (obj ? obj + ' ' : 'A side contract pinned to the SafeSpace board. ') + (twist ? 'Rumor says: ' + twist : 'The reward board never lies. Mostly.'),
                        'Posted by ' + itemStr(o, ['giver', 'from'], ' persons unknown') + ' · reward: ' + itemStr(o, ['reward'], 'gratitude'),
                        drugs, 'quests', [id, o.title]);
                });
            });
            if (found) scanDone.quests = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanEvents() {
        if (scanDone.events) return;
        try {
            var mods = [window.GraveGainEmergent, window.GraveGainEvents];
            var found = false;
            each(mods, function (mod) {
                var list = pickList(mod, ['ACTIVITIES', 'activities', 'EVENTS', 'events', 'list']);
                if (!list) return;
                found = true;
                each(list, function (o) {
                    if (!o) return;
                    var id = (typeof o === 'string') ? norm(o) : itemStr(o, ['id'], '');
                    if (!id) return;
                    var drugs = !!(o.drugsAdultOnly || o.drugs);
                    addEntry('event:' + id, 'event',
                        (typeof o === 'string') ? o : itemStr(o, ['title', 'name'], id),
                        (typeof o === 'string') ? '🎲' : itemStr(o, ['emoji', 'icon'], '🎲'),
                        (typeof o === 'string') ? 'A dungeon occurrence logged by survivors. Conditions vary; outcomes always memorable.' : itemStr(o, ['text', 'desc', 'objective'], 'A dungeon occurrence logged by survivors.'),
                        'Endless-dungeon event — unlocked on first witness.', drugs, 'events', [id]);
                });
            });
            if (found) scanDone.events = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanNpcs() {
        if (scanDone.npcs) return;
        try {
            var mods = [window.GraveGainEmergent, window.GraveGainCharacters];
            var found = false;
            each(mods, function (mod) {
                var list = pickList(mod, ['NPCS', 'npcs', 'WANDERERS', 'wanderers', 'CHARACTERS', 'characters', 'list']);
                if (!list) return;
                found = true;
                each(list, function (o) {
                    if (!o) return;
                    var id = itemStr(o, ['id'], '');
                    if (!id) return;
                    addEntry('npc:' + id, 'npc',
                        itemStr(o, ['name', 'title'], id),
                        itemStr(o, ['emoji', 'icon'], '🧍'),
                        itemStr(o, ['bio', 'desc', 'text'], 'A wanderer of the MoonRock wilds. Remembers your kills, your gold, and — unsettlingly — your name from a past run.'),
                        'Wanderer file — unlocked on first meeting.', false, 'npcs', [id, o.name]);
                });
            });
            if (found) scanDone.npcs = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanLore() {
        if (scanDone.lore) return;
        try {
            var db = null;
            try {
                if (window.GraveGainLore) {
                    if (typeof window.GraveGainLore.getAll === 'function') db = window.GraveGainLore.getAll();
                    else if (window.GraveGainLore.database) db = window.GraveGainLore.database;
                    else if (typeof window.GraveGainLore === 'object') db = window.GraveGainLore;
                }
                if (!db && window.LoreDatabase && typeof window.LoreDatabase === 'object') db = window.LoreDatabase;
            } catch (_) { db = null; }
            if (!db) return;
            var ids = [];
            try { ids = Object.keys(db); } catch (_) { return; }
            if (!ids.length) return;
            each(ids, function (lid) {
                try {
                    var o = db[lid];
                    if (!o) return;
                    var title = (typeof o === 'string') ? lid : itemStr(o, ['title'], lid);
                    var raw = (typeof o === 'string') ? o : itemStr(o, ['content', 'text'], '');
                    var excerpt = raw.length > 300 ? raw.slice(0, 300) + '…' : raw;
                    addEntry('lore:' + lid, 'lore', title, '📖',
                        excerpt || 'A sealed record of the MoonRock colony, awaiting its reader.',
                        'Colony archive (' + itemStr(o, ['category', 'type'], 'record') + ', ' + itemStr(o, ['rarity'], 'common') + ') — unlocked through missions.',
                        false, 'archive', [lid, title]);
                } catch (_) { /* ignore one bad lore row */ }
            });
            scanDone.lore = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanSaga() {
        if (scanDone.saga) return;
        try {
            var mod = window.GraveGainEpicSaga;
            if (!mod) return;
            var missions = pickList(mod, ['MISSIONS', 'missions', 'SAGA', 'saga']);
            var locks = pickList(mod, ['LORE_UNLOCKS', 'loreUnlocks']);
            if (missions) {
                each(missions, function (m) {
                    if (!m || typeof m !== 'object') return;
                    var mid = m.id;
                    if (mid === undefined || mid === null) return;
                    addEntry('saga:m' + mid, 'saga',
                        itemStr(m, ['title'], 'Mission ' + mid),
                        '🎬',
                        itemStr(m, ['logline', 'subtitle'], 'An epic beat of the MoonRock saga.') + ' — ' + itemStr(m, ['location', 'boss'], ''),
                        'Epic saga beat — unlocked by completing its mission.', false, 'saga', ['m' + mid, String(mid)]);
                });
            }
            if (locks) {
                each(locks, function (lid) {
                    if (typeof lid === 'string' && lid && !entries['lore:' + lid]) {
                        addEntry('lore:' + lid, 'lore', lid, '📖',
                            'A sealed record of the MoonRock colony, referenced by the epic saga. Finish its mission to unseal it.',
                            'Saga-linked archive — unlocked through missions.', false, 'archive', [lid]);
                    }
                });
            }
            if (missions || locks) scanDone.saga = true;
        } catch (_) { /* retry next rescan */ }
    }

    function scanEndless() {
        // E16/E17/E18 lanes are still open — probe their future globals so
        // sectors register the moment those lanes land. All optional.
        try {
            var mods = [window.GraveGainEndless1D, window.GraveGainEndless2D, window.GraveGainEndless3D,
                window.GraveGainDrift, window.GraveGainEndless];
            var foundAny = false;
            each(mods, function (mod) {
                var list = pickList(mod, ['SECTORS', 'sectors', 'zones', 'ZONES', 'floors', 'FLOORS']);
                if (!list) return;
                foundAny = true;
                each(list, function (o) {
                    if (!o) return;
                    var id = (typeof o === 'string') ? norm(o) : itemStr(o, ['id'], '');
                    if (!id) return;
                    addEntry('endless:' + id, 'sector',
                        (typeof o === 'string') ? o : itemStr(o, ['name', 'title'], id),
                        (typeof o === 'string') ? '🌀' : itemStr(o, ['emoji', 'icon'], '🌀'),
                        (typeof o === 'string') ? 'An endless-dungeon depth logged by the delvers who came back.' : itemStr(o, ['desc', 'text'], 'An endless-dungeon depth logged by the delvers who came back.'),
                        'Endless depth — unlocked on first descent.', false, 'endless', [id]);
                });
            });
            if (foundAny) scanDone.endless = true;
        } catch (_) { /* ignore */ }
    }

    function rescan() {
        try {
            seedBase();
            scanBestiary();
            scanEnemyVariants();
            scanBossPhases();
            scanArsenal();
            scanQuests();
            scanEvents();
            scanNpcs();
            scanLore();
            scanSaga();
            scanEndless();
            // Apply encounters that arrived before their entries existed.
            try {
                for (var id in pending) {
                    if (entries[id]) {
                        try { delete pending[id]; } catch (_) { /* ignore */ }
                        unlock(id, { silent: true });
                    }
                }
            } catch (_) { /* ignore */ }
        } catch (_) { /* never throw */ }
    }

    /* ---------- unlock-on-encounter live probes ---------- */

    function collectEnemyNames() {
        var out = [];
        try {
            var games = [];
            try {
                if (window.GraveGainGame) games.push(window.GraveGainGame);
                if (window.GraveGain1D && window.GraveGain1D !== window.GraveGainGame) games.push(window.GraveGain1D);
            } catch (_) { /* ignore */ }
            each(games, function (g) {
                try {
                    var list = g.enemies || g.foes || g.mobs;
                    if (!isArr(list)) return;
                    for (var i = 0; i < list.length && i < 60; i++) {
                        try {
                            var e = list[i];
                            if (!e) continue;
                            if (typeof e === 'string') { out.push(e); continue; }
                            var c = e._variant || e.variant || e.variantId || e.type || e.kind || e.id || e.name;
                            if (typeof c === 'string' && c) out.push(c);
                        } catch (_) { /* ignore one bad enemy */ }
                    }
                } catch (_) { /* ignore */ }
            });
        } catch (_) { /* ignore */ }
        return out;
    }

    function collectWeaponIds() {
        var out = [];
        try {
            var games = [];
            try {
                if (window.GraveGainGame) games.push(window.GraveGainGame);
                if (window.GraveGain1D && window.GraveGain1D !== window.GraveGainGame) games.push(window.GraveGain1D);
            } catch (_) { /* ignore */ }
            each(games, function (g) {
                try {
                    var cands = [];
                    try {
                        if (g.player && g.player.weapon) cands.push(g.player.weapon);
                        if (g.weapon) cands.push(g.weapon);
                        if (isArr(g.inventory)) cands = cands.concat(g.inventory.slice(0, 20));
                        if (isArr(g.loot)) cands = cands.concat(g.loot.slice(0, 20));
                    } catch (_) { /* ignore */ }
                    each(cands, function (c) {
                        try {
                            if (!c) return;
                            if (typeof c === 'string') { out.push(c); return; }
                            var id = c.id || c.weaponId || c.name;
                            if (typeof id === 'string' && id) out.push(id);
                        } catch (_) { /* ignore */ }
                    });
                } catch (_) { /* ignore */ }
            });
        } catch (_) { /* ignore */ }
        return out;
    }

    function collectMissionIds() {
        var out = [];
        try {
            var games = [];
            try {
                if (window.GraveGainGame) games.push(window.GraveGainGame);
                if (window.GraveGain1D && window.GraveGain1D !== window.GraveGainGame) games.push(window.GraveGain1D);
            } catch (_) { /* ignore */ }
            each(games, function (g) {
                try {
                    var m = g.mission || g.missionId || g.missionIndex || g.level || g.stage;
                    if (typeof m === 'number' && isFinite(m)) out.push('m' + m);
                    else if (typeof m === 'string' && m) out.push(m);
                    else if (m && typeof m === 'object' && m.id !== undefined) out.push(String(m.id));
                } catch (_) { /* ignore */ }
            });
            // Story-engine star map marks completed missions — read-only.
            try {
                var sys = window.GraveGainSaveSystem;
                if (sys && typeof sys.readStoryProgress === 'function') {
                    var prog = sys.readStoryProgress();
                    if (prog && prog.stars && typeof prog.stars === 'object') {
                        for (var k in prog.stars) {
                            try { out.push(String(k)); } catch (_) { /* ignore */ }
                        }
                    }
                }
            } catch (_) { /* ignore */ }
        } catch (_) { /* ignore */ }
        return out;
    }

    function encounterTick() {
        try {
            if (typeof document !== 'undefined' && document.hidden) return;
            var changed = false;
            each(collectEnemyNames(), function (n) {
                try {
                    var id = findEnemyId(n);
                    if (id && !unlocked[id]) { if (unlock(id, { silent: true })) changed = true; }
                } catch (_) { /* ignore */ }
            });
            each(collectWeaponIds(), function (w) {
                try {
                    var id = findWeaponId(w);
                    if (id && !unlocked[id]) { if (unlock(id, { silent: true })) changed = true; }
                } catch (_) { /* ignore */ }
            });
            each(collectMissionIds(), function (m) {
                try {
                    var n = norm(m);
                    var num = n.replace(/[^0-9]/g, '');
                    var cands = ['sector:' + n, 'sector:m' + num, 'boss:' + n, 'boss:m' + num, 'saga:' + n, 'saga:m' + num];
                    for (var i = 0; i < cands.length; i++) {
                        if (entries[cands[i]] && !unlocked[cands[i]]) {
                            if (unlock(cands[i], { silent: true })) changed = true;
                        }
                    }
                } catch (_) { /* ignore */ }
            });
            if (changed) { try { scheduleRender(); } catch (_) { /* ignore */ } }
        } catch (_) { /* never throw */ }
    }

    /* ---------- overlay UI (textContent-only) ---------- */

    var ui = null;
    var uiTab = 'all';
    var renderQueued = false;

    var TABS = ['all', 'enemy', 'boss', 'weapon', 'npc', 'quest', 'event', 'sector', 'saga', 'lore'];

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined && text !== null) n.textContent = text;
        return n;
    }

    function ensureUI() {
        try {
            if (ui) return ui;
            if (typeof document === 'undefined' || !document.body) return null;
            var btn = el('button', 'gg-codex-btn', '📖 Codex');
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Open GraveGain codex');
            try {
                btn.addEventListener('click', function () { try { toggle(); } catch (_) { /* ignore */ } });
            } catch (_) { /* ignore */ }
            var panel = el('div', 'gg-codex-panel gg-codex-hidden');
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-label', 'GraveGain codex');
            var head = el('div', 'gg-codex-head');
            var title = el('strong', 'gg-codex-title', '📖 GraveGain Codex');
            var count = el('span', 'gg-codex-count', '');
            var close = el('button', 'gg-codex-close', '✕');
            close.type = 'button';
            close.setAttribute('aria-label', 'Close codex');
            try {
                close.addEventListener('click', function () { try { closePanel(); } catch (_) { /* ignore */ } });
            } catch (_) { /* ignore */ }
            head.appendChild(title);
            head.appendChild(count);
            head.appendChild(close);
            var tabs = el('div', 'gg-codex-tabs');
            each(TABS, function (t) {
                var b = el('button', 'gg-codex-tab' + (t === uiTab ? ' gg-codex-tab-on' : ''), t);
                b.type = 'button';
                b.setAttribute('data-tab', t);
                try {
                    b.addEventListener('click', function () {
                        try { uiTab = t; render(); } catch (_) { /* ignore */ }
                    });
                } catch (_) { /* ignore */ }
                tabs.appendChild(b);
            });
            var list = el('div', 'gg-codex-list');
            var foot = el('div', 'gg-codex-foot', '');
            panel.appendChild(head);
            panel.appendChild(tabs);
            panel.appendChild(list);
            panel.appendChild(foot);
            var style = document.getElementById('gg-codex-style');
            if (!style) {
                style = document.createElement('style');
                style.id = 'gg-codex-style';
                style.textContent = '.gg-codex-btn{position:fixed;right:12px;bottom:12px;z-index:99990;opacity:.92;cursor:pointer;padding:6px 10px;border-radius:10px;border:1px solid #6b7280;background:#111827;color:#f9fafb;font-size:13px;pointer-events:auto}' +
                    '.gg-codex-panel{position:fixed;right:12px;bottom:52px;width:min(360px,92vw);max-height:min(70vh,560px);display:flex;flex-direction:column;z-index:99991;background:#0f172a;color:#e2e8f0;border:1px solid #475569;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5);pointer-events:auto;font-size:13px}' +
                    '.gg-codex-hidden{display:none}' +
                    '.gg-codex-head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #334155}' +
                    '.gg-codex-title{flex:1}' +
                    '.gg-codex-count{opacity:.7;font-size:12px}' +
                    '.gg-codex-close{cursor:pointer;background:none;border:none;color:#e2e8f0;font-size:14px}' +
                    '.gg-codex-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-bottom:1px solid #334155}' +
                    '.gg-codex-tab{cursor:pointer;background:#1e293b;border:1px solid #334155;color:#cbd5e1;border-radius:8px;padding:2px 8px;font-size:12px}' +
                    '.gg-codex-tab-on{background:#7c3aed;border-color:#7c3aed;color:#fff}' +
                    '.gg-codex-list{overflow-y:auto;padding:6px 8px;display:flex;flex-direction:column;gap:6px}' +
                    '.gg-codex-row{display:flex;gap:8px;align-items:flex-start;background:#1e293b;border:1px solid #334155;border-radius:8px;padding:6px 8px}' +
                    '.gg-codex-icon{font-size:18px;line-height:1.2}' +
                    '.gg-codex-name{font-weight:700}' +
                    '.gg-codex-kind{opacity:.6;font-size:11px;margin-left:6px}' +
                    '.gg-codex-text{opacity:.9;margin-top:2px}' +
                    '.gg-codex-hint{opacity:.6;font-size:11px;margin-top:2px}' +
                    '.gg-codex-locked{opacity:.55}' +
                    '.gg-codex-foot{padding:6px 10px;border-top:1px solid #334155;font-size:11px;opacity:.7}' +
                    '.gg-codex-toast-host{position:fixed;left:50%;transform:translateX(-50%);bottom:64px;z-index:99992;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}' +
                    '.gg-codex-toast{background:#111827;color:#f9fafb;border:1px solid #7c3aed;border-radius:10px;padding:6px 12px;font-size:13px}';
                try { document.head.appendChild(style); } catch (_) { /* ignore */ }
            }
            try { document.body.appendChild(btn); } catch (_) { /* ignore */ }
            try { document.body.appendChild(panel); } catch (_) { /* ignore */ }
            ui = { btn: btn, panel: panel, tabs: tabs, list: list, foot: foot, count: count };
            return ui;
        } catch (_) { return null; }
    }

    function visibleEntries() {
        var out = [];
        try {
            var allowed = isDrugsAllowed();
            for (var id in entries) {
                try {
                    var e = entries[id];
                    if (!e) continue;
                    if (e.drugs && !allowed) continue; // age-band safe: hidden, not leaked
                    if (uiTab !== 'all' && e.kind !== uiTab) continue;
                    out.push(e);
                } catch (_) { /* ignore */ }
            }
            out.sort(function (a, b) {
                try {
                    var au = isUnlocked(a.id) ? 0 : 1;
                    var bu = isUnlocked(b.id) ? 0 : 1;
                    if (au !== bu) return au - bu;
                    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
                    return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
                } catch (_) { return 0; }
            });
        } catch (_) { /* ignore */ }
        return out;
    }

    function render() {
        try {
            var root = ensureUI();
            if (!root) return;
            try {
                var tabs = root.tabs.querySelectorAll('.gg-codex-tab');
                for (var ti = 0; ti < tabs.length; ti++) {
                    try {
                        var on = tabs[ti].getAttribute('data-tab') === uiTab;
                        tabs[ti].className = 'gg-codex-tab' + (on ? ' gg-codex-tab-on' : '');
                    } catch (_) { /* ignore */ }
                }
            } catch (_) { /* ignore */ }
            var list = visibleEntries();
            var un = 0;
            try {
                for (var ci = 0; ci < list.length; ci++) {
                    if (isUnlocked(list[ci].id)) un++;
                }
            } catch (_) { /* ignore */ }
            try { root.count.textContent = un + ' / ' + list.length + ' unsealed'; } catch (_) { /* ignore */ }
            try {
                while (root.list.firstChild) root.list.removeChild(root.list.firstChild);
            } catch (_) { /* ignore */ }
            var shown = 0;
            for (var i = 0; i < list.length && shown < MAX_ROWS; i++) {
                try {
                    var e = list[i];
                    var open = isUnlocked(e.id);
                    var row = el('div', 'gg-codex-row' + (open ? '' : ' gg-codex-locked'));
                    var icon = el('span', 'gg-codex-icon', open ? e.icon : '❔');
                    var body = el('div', 'gg-codex-body');
                    var nm = el('div', 'gg-codex-name', open ? e.name : '???');
                    var kind = el('span', 'gg-codex-kind', e.kind);
                    nm.appendChild(kind);
                    body.appendChild(nm);
                    if (open) {
                        body.appendChild(el('div', 'gg-codex-text', e.text));
                        if (e.hint) body.appendChild(el('div', 'gg-codex-hint', e.hint));
                    } else {
                        var lockedMsg = (e.kind === 'lore' || e.kind === 'saga')
                            ? 'Sealed — finish missions to unseal this record.'
                            : 'Undiscovered — meet it in the wilds of MoonRock.';
                        body.appendChild(el('div', 'gg-codex-text', lockedMsg));
                    }
                    row.appendChild(icon);
                    row.appendChild(body);
                    root.list.appendChild(row);
                    shown++;
                } catch (_) { /* ignore one bad row */ }
            }
            try {
                root.foot.textContent = list.length > shown
                    ? 'Showing ' + shown + ' of ' + list.length + ' — encounter more to fill the codex.'
                    : 'The Compact chroniclers thank you for reading. ' + list.length + ' records.';
            } catch (_) { /* ignore */ }
        } catch (_) { /* never throw */ }
    }

    function scheduleRender() {
        try {
            if (renderQueued) return;
            renderQueued = true;
            setTimeout(function () {
                renderQueued = false;
                try {
                    if (ui && !ui.panel.classList.contains('gg-codex-hidden')) render();
                } catch (_) { /* ignore */ }
            }, 300);
        } catch (_) { /* ignore */ }
    }

    function toastUnlock(e) {
        try {
            if (typeof document === 'undefined' || !document.body) return;
            var host = document.getElementById('gg-codex-toasts');
            if (!host) {
                host = document.createElement('div');
                host.id = 'gg-codex-toasts';
                host.className = 'gg-codex-toast-host';
                try { document.body.appendChild(host); } catch (_) { return; }
            }
            try {
                while (host.querySelectorAll('.gg-codex-toast').length >= MAX_TOASTS) {
                    var oldest = host.querySelector('.gg-codex-toast');
                    if (!oldest) break;
                    oldest.remove();
                }
            } catch (_) { /* ignore */ }
            var t = document.createElement('div');
            t.className = 'gg-codex-toast';
            t.textContent = '📖 Codex unsealed: ' + e.name;
            host.appendChild(t);
            setTimeout(function () { try { t.remove(); } catch (_) { /* ignore */ } }, TOAST_MS);
        } catch (_) { /* never throw */ }
    }

    function openPanel() {
        try {
            var root = ensureUI();
            if (!root) return;
            try { rescan(); } catch (_) { /* ignore */ }
            try { render(); } catch (_) { /* ignore */ }
            try { root.panel.classList.remove('gg-codex-hidden'); } catch (_) { /* ignore */ }
        } catch (_) { /* ignore */ }
    }

    function closePanel() {
        try {
            if (ui) ui.panel.classList.add('gg-codex-hidden');
        } catch (_) { /* ignore */ }
    }

    function toggle() {
        try {
            var root = ensureUI();
            if (!root) return;
            try {
                if (root.panel.classList.contains('gg-codex-hidden')) openPanel();
                else closePanel();
            } catch (_) { /* ignore */ }
        } catch (_) { /* ignore */ }
    }

    /* ---------- boot ---------- */

    loadOwn();

    var api = {
        VERSION: VERSION,
        entries: entries,
        unlock: unlock,
        isUnlocked: isUnlocked,
        notifyEncounter: notifyEncounter,
        rescan: rescan,
        open: openPanel,
        close: closePanel,
        toggle: toggle,
        list: function () {
            try {
                var out = [];
                for (var id in entries) out.push(entries[id]);
                return out;
            } catch (_) { return []; }
        },
        count: function () {
            try {
                var total = 0, un = 0;
                for (var id in entries) {
                    total++;
                    if (isUnlocked(id)) un++;
                }
                return { unlocked: un, total: total };
            } catch (_) { return { unlocked: 0, total: 0 }; }
        }
    };
    window.GraveGainCodex = api;

    try {
        window.GraveGainMods = window.GraveGainMods || [];
        window.GraveGainMods.push({ name: 'gravegain-codex', version: VERSION, init: function () { try { rescan(); } catch (_) { /* ignore */ } } });
    } catch (_) { /* registry optional */ }

    // Swarm files can announce encounters without a hard dependency.
    try {
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('gravegain-codex-unlock', function (ev) {
                try {
                    var d = ev && ev.detail;
                    if (typeof d === 'string') notifyEncounter(d);
                    else if (d && typeof d.id === 'string') notifyEncounter(d.id);
                    else notifyEncounter(d);
                } catch (_) { /* ignore */ }
            });
            window.addEventListener('fourweird-content-mode', function () {
                try { scheduleRender(); } catch (_) { /* ignore */ }
            });
            window.addEventListener('keydown', function (ev) {
                try {
                    if (!ev || ev.key !== 'c' && ev.key !== 'C') return;
                    var t = ev.target;
                    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
                    toggle();
                } catch (_) { /* ignore */ }
            });
        }
    } catch (_) { /* listeners optional */ }

    try { rescan(); } catch (_) { /* ignore */ }

    try {
        // Registration poll: catch swarm globals that load after us.
        var ticks = 0;
        var regTimer = setInterval(function () {
            try {
                ticks++;
                if (typeof document !== 'undefined' && document.hidden) return;
                rescan();
                if (ticks > 40) { try { clearInterval(regTimer); } catch (_) { /* ignore */ } }
            } catch (_) { /* never throw */ }
        }, 2000);
        // Encounter poll: unlock-on-encounter tracking.
        setInterval(function () {
            try { encounterTick(); } catch (_) { /* never throw */ }
        }, 1000);
    } catch (_) { /* timers optional */ }
})();
