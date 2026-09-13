(function () {
    'use strict';

    // =========================================================================
    // GRAVEGAIN4D - CODEX READER (codex4d.js)
    // Data-binding for the hub lore tab: list / filter / read / unlock over
    // window.GraveGain4DLore entries. Unlocks persist under the gravegain4d
    // key family. Optional bindHubTab(rootEl) renders a vanilla-DOM reader
    // (list + filter + entry view) into a hub container. Never throws:
    // every public method is guarded and returns a safe fallback.
    // =========================================================================

    var CODEX_KEY = 'gravegain4d_codex_v1';

    // Mission -> lore unlocks (canon IDs from lore4d.js + 4D appendix IDs).
    var MISSION_UNLOCKS = {
        1: ['world_atlas', 'goblin_brave_nix', '4d_time_fracture'],
        2: ['elven_chronicle', '4d_ana_kata'],
        3: ['dwarf_deep_forge', '4d_ana_kata'],
        4: ['orc_regeneration', 'goblin_territory'],
        5: ['world_farstar', 'gods_mercenary'],
        6: ['necro_report', 'undead_field_guide'],
        7: ['human_clint_oldman', '4d_alternates'],
        8: ['human_mercenary_doctrine', '4d_time_fracture'],
        9: ['gods_necros_speaks', 'necro_broadcast', '4d_fold_vectors'],
        10: ['lucifer_journal_1', 'lucifer_manifesto', '4d_tesseract_sanctum', '4d_alternates']
    };
    // All unlock ids above exist in the lore4d.js canon map.

    function loreEntries() {
        try {
            if (typeof window !== 'undefined' && window.GraveGain4DLore) {
                var L = window.GraveGain4DLore;
                if (L.entries && typeof L.entries === 'object') return L.entries;
                if (typeof L.list === 'function') {
                    var out = {};
                    var arr = L.list() || [];
                    for (var i = 0; i < arr.length; i++) {
                        if (arr[i] && arr[i].id) out[arr[i].id] = arr[i];
                    }
                    return out;
                }
            }
        } catch (_) { /* fall through */ }
        return {};
    }

    function loadUnlocked() {
        try {
            if (typeof localStorage === 'undefined') return {};
            var raw = localStorage.getItem(CODEX_KEY);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch (_) { /* fall through */ }
        return {};
    }

    function persistUnlocked(map) {
        try {
            if (typeof localStorage === 'undefined') return false;
            localStorage.setItem(CODEX_KEY, JSON.stringify(map || {}));
            return true;
        } catch (_) {
            return false;
        }
    }

    function categoryOf(entry) {
        try {
            if (entry && entry.category) return String(entry.category);
        } catch (_) { /* ignore */ }
        return 'unknown';
    }

    var Codex = {
        CODEX_KEY: CODEX_KEY,

        // All entries as an array, sorted by id for a stable hub list.
        list: function () {
            try {
                var entries = loreEntries();
                var arr = Object.keys(entries).map(function (k) { return entries[k]; });
                arr.sort(function (a, b) {
                    try {
                        var ai = (a && a.id) || '', bi = (b && b.id) || '';
                        return ai < bi ? -1 : (ai > bi ? 1 : 0);
                    } catch (_) { return 0; }
                });
                return arr;
            } catch (_) {
                return [];
            }
        },

        // Filtered list: { category, query, unlockedOnly } - all optional.
        filter: function (opts) {
            try {
                var o = opts || {};
                var unlocked = loadUnlocked();
                return Codex.list().filter(function (e) {
                    try {
                        if (o.category && categoryOf(e) !== String(o.category)) return false;
                        if (o.unlockedOnly && !unlocked[e.id]) return false;
                        if (o.query) {
                            var q = String(o.query).toLowerCase();
                            var hay = ((e.title || '') + ' ' + (e.content || '') + ' ' + (e.id || '')).toLowerCase();
                            if (hay.indexOf(q) === -1) return false;
                        }
                        return true;
                    } catch (_) {
                        return false;
                    }
                });
            } catch (_) {
                return [];
            }
        },

        categories: function () {
            try {
                var seen = {};
                Codex.list().forEach(function (e) { seen[categoryOf(e)] = true; });
                return Object.keys(seen).sort();
            } catch (_) {
                return [];
            }
        },

        // Full entry + unlock state + 4D appendix for the reader view.
        read: function (id) {
            try {
                var entries = loreEntries();
                var e = entries[id] || null;
                if (!e) return null;
                var unlocked = loadUnlocked();
                return {
                    entry: e,
                    unlocked: !!unlocked[id],
                    appendix4d: e.appendix4d || null
                };
            } catch (_) {
                return null;
            }
        },

        isUnlocked: function (id) {
            try {
                return !!loadUnlocked()[id];
            } catch (_) {
                return false;
            }
        },

        unlock: function (id) {
            try {
                var entries = loreEntries();
                if (!entries[id]) return false;
                var map = loadUnlocked();
                if (map[id]) return true;
                map[id] = true;
                persistUnlocked(map);
                return true;
            } catch (_) {
                return false;
            }
        },

        // Grant a mission's lore rewards; returns the ids actually granted.
        unlockForMission: function (missionId) {
            try {
                var ids = MISSION_UNLOCKS[String(Number(missionId))] || MISSION_UNLOCKS[String(missionId)] || [];
                var granted = [];
                for (var i = 0; i < ids.length; i++) {
                    try {
                        if (Codex.unlock(ids[i])) granted.push(ids[i]);
                    } catch (_) { /* keep going */ }
                }
                return granted;
            } catch (_) {
                return [];
            }
        },

        unlockedIds: function () {
            try { return Object.keys(loadUnlocked()); } catch (_) { return []; }
        },

        // Vanilla-DOM data-binding for the hub lore tab. Builds a filter row
        // (category select + search + unlocked-only toggle), an entry list,
        // and a reader pane. Re-runnable against the same root.
        bindHubTab: function (rootEl) {
            try {
                var root = rootEl || (typeof document !== 'undefined' ? document.getElementById('g4d-codex') : null);
                if (!root || typeof document === 'undefined') return false;
                while (root.firstChild) root.removeChild(root.firstChild);

                var state = { category: '', query: '', unlockedOnly: false, selected: null };

                var bar = document.createElement('div');
                bar.className = 'g4d-codex-bar';

                var sel = document.createElement('select');
                sel.className = 'g4d-codex-filter';
                var optAll = document.createElement('option');
                optAll.value = '';
                optAll.textContent = 'All categories';
                sel.appendChild(optAll);
                Codex.categories().forEach(function (c) {
                    var o = document.createElement('option');
                    o.value = c;
                    o.textContent = c;
                    sel.appendChild(o);
                });
                sel.addEventListener('change', function () { state.category = sel.value; renderList(); });

                var search = document.createElement('input');
                search.className = 'g4d-codex-search';
                search.type = 'search';
                search.placeholder = 'Filter the codex...';
                search.addEventListener('input', function () { state.query = search.value; renderList(); });

                var toggle = document.createElement('label');
                toggle.className = 'g4d-codex-toggle';
                var box = document.createElement('input');
                box.type = 'checkbox';
                box.addEventListener('change', function () { state.unlockedOnly = !!box.checked; renderList(); });
                toggle.appendChild(box);
                toggle.appendChild(document.createTextNode(' Unlocked only'));

                bar.appendChild(sel);
                bar.appendChild(search);
                bar.appendChild(toggle);

                var listEl = document.createElement('ul');
                listEl.className = 'g4d-codex-list';
                var viewEl = document.createElement('article');
                viewEl.className = 'g4d-codex-view';

                function renderList() {
                    try {
                        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
                        var items = Codex.filter(state);
                        if (!items.length) {
                            var empty = document.createElement('li');
                            empty.className = 'g4d-codex-empty';
                            empty.textContent = 'No entries match this filter.';
                            listEl.appendChild(empty);
                        }
                        items.forEach(function (e) {
                            var li = document.createElement('li');
                            li.className = 'g4d-codex-item' + (Codex.isUnlocked(e.id) ? ' is-unlocked' : ' is-locked');
                            var b = document.createElement('button');
                            b.type = 'button';
                            b.textContent = (e.title || e.id) + (Codex.isUnlocked(e.id) ? '' : ' 🔒');
                            b.addEventListener('click', function () { renderEntry(e.id); });
                            li.appendChild(b);
                            listEl.appendChild(li);
                        });
                    } catch (_) { /* never throw into hub */ }
                }

                function renderEntry(id) {
                    try {
                        while (viewEl.firstChild) viewEl.removeChild(viewEl.firstChild);
                        var data = Codex.read(id);
                        if (!data) return;
                        state.selected = id;
                        var h = document.createElement('h3');
                        h.className = 'g4d-codex-title';
                        h.textContent = data.entry.title || id;
                        var meta = document.createElement('p');
                        meta.className = 'g4d-codex-meta';
                        meta.textContent = categoryOf(data.entry) + (data.entry.speaker ? ' · ' + data.entry.speaker : '');
                        var body = document.createElement('p');
                        body.className = 'g4d-codex-body';
                        body.textContent = data.unlocked ? (data.entry.content || '') : 'Undiscovered. Clear its mission to unlock this page.';
                        viewEl.appendChild(h);
                        viewEl.appendChild(meta);
                        viewEl.appendChild(body);
                        if (data.appendix4d && data.unlocked) {
                            var ap = document.createElement('p');
                            ap.className = 'g4d-codex-appendix';
                            ap.textContent = data.appendix4d;
                            viewEl.appendChild(ap);
                        }
                    } catch (_) { /* never throw into hub */ }
                }

                root.appendChild(bar);
                root.appendChild(listEl);
                root.appendChild(viewEl);
                renderList();
                return true;
            } catch (_) {
                return false;
            }
        }
    };

    try {
        if (typeof window !== 'undefined') window.GraveGain4DCodex = Codex;
    } catch (_) { /* ignore */ }
})();
