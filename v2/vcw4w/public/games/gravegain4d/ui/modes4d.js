(function () {
    'use strict';
    if (window.GG4D_ModeUI) return;

    // GraveGain4D — ui/modes4d: mode switcher data + keyboard 1/2/3 + HUD pill.
    // Makes no assumptions about GG4D_HUD internals: the pill is our own
    // element (mount() into any container), and the label is always readable
    // via window.GG4D_ModeUI.getLabel() / .current. No fullscreen/dblclick code.
    // Never throws; idempotent (safe to include twice).

    var CSS_ID = 'gg4d-modeui-style';
    var CSS =
        '.gg4d-modepill{display:inline-flex;align-items:center;gap:6px;' +
        'padding:2px 10px;border:1px solid #7d6cf0;border-radius:12px;' +
        'background:rgba(0,0,0,.55);color:#e8e6df;font-size:12px;' +
        'font-family:system-ui,sans-serif;pointer-events:none;white-space:nowrap}' +
        '.gg4d-modepill .dot{width:8px;height:8px;border-radius:50%;background:#58d68d}' +
        '.gg4d-modepill[data-mode="chrono"] .dot{background:#f9e79f}' +
        '.gg4d-modepill[data-mode="turnbased"] .dot{background:#b9aaff}' +
        '.gg4d-modeswitch{display:flex;gap:6px;pointer-events:auto}' +
        '.gg4d-modeswitch button{cursor:pointer;background:rgba(0,0,0,.55);' +
        'color:#e8e6df;border:1px solid #666;border-radius:4px;font-size:12px;' +
        'font-family:system-ui,sans-serif;padding:4px 8px}' +
        '.gg4d-modeswitch button[aria-pressed="true"]{border-color:#b9aaff;background:rgba(125,108,240,.35)}';

    // Mode switcher data: id, keyboard binding, label, icon, hint.
    var MODES = [
        { id: 'realtime', key: '1', code: 'Digit1', label: 'Realtime', icon: '⚡', hint: 'Press 1 — world runs at full speed.' },
        { id: 'chrono', key: '2', code: 'Digit2', label: 'Chrono-Lock', icon: '⏳', hint: 'Press 2 — move/putt/charge at full speed, still = 8% crawl.' },
        { id: 'turnbased', key: '3', code: 'Digit3', label: 'Turn-Based', icon: '🎲', hint: 'Press 3 — you act (move/putt/ability), then enemies step 0.5s.' }
    ];

    // Keyboard binding notes (also the live map used by attachKeys):
    // Digit1 -> realtime, Digit2 -> chrono, Digit3 -> turnbased.
    // Numpad1..3 mirror the same modes. F and double-click are untouched.
    var KEYMAP = {
        Digit1: 'realtime', Digit2: 'chrono', Digit3: 'turnbased',
        Numpad1: 'realtime', Numpad2: 'chrono', Numpad3: 'turnbased'
    };

    function modes() {
        try {
            if (window.GG4D_Modes) return window.GG4D_Modes;
        } catch (e) { /* ignore */ }
        return null;
    }

    function currentMode() {
        try {
            var M = modes();
            if (M && typeof M.getMode === 'function') {
                var m = M.getMode();
                if (m === 'realtime' || m === 'chrono' || m === 'turnbased') return m;
            }
        } catch (e) { /* ignore */ }
        return 'realtime';
    }

    function metaFor(id) {
        for (var i = 0; i < MODES.length; i += 1) {
            if (MODES[i].id === id) return MODES[i];
        }
        return MODES[0];
    }

    function ensureCss() {
        try {
            if (typeof document === 'undefined') return;
            if (document.getElementById(CSS_ID)) return;
            var st = document.createElement('style');
            st.id = CSS_ID;
            st.textContent = CSS;
            (document.head || document.documentElement).appendChild(st);
        } catch (e) { /* ignore */ }
    }

    // ---- HUD pill state (own element; HUD-agnostic) ----

    var pill = null;
    var switcher = null;
    var mountedAt = null;

    function renderPill() {
        try {
            if (!pill) return;
            var m = metaFor(currentMode());
            pill.setAttribute('data-mode', m.id);
            pill.title = m.hint;
            var dot = pill.querySelector('[data-dot]');
            var txt = pill.querySelector('[data-label]');
            if (txt) txt.textContent = m.icon + ' ' + m.label;
            else if (!dot) pill.textContent = m.icon + ' ' + m.label;
            // Keep switcher pressed-state in sync when present.
            try {
                if (switcher) {
                    var btns = switcher.querySelectorAll('button[data-mode]');
                    for (var i = 0; i < btns.length; i += 1) {
                        btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-mode') === m.id ? 'true' : 'false');
                    }
                }
            } catch (e) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    function buildPill() {
        try {
            ensureCss();
            if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
            var d = document.createElement('span');
            d.className = 'gg4d-modepill';
            var dot = document.createElement('span');
            dot.className = 'dot';
            dot.setAttribute('data-dot', '1');
            var txt = document.createElement('span');
            txt.setAttribute('data-label', '1');
            d.appendChild(dot);
            d.appendChild(txt);
            return d;
        } catch (e) { return null; }
    }

    function buildSwitcher() {
        try {
            ensureCss();
            if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
            var wrap = document.createElement('div');
            wrap.className = 'gg4d-modeswitch';
            for (var i = 0; i < MODES.length; i += 1) {
                (function (meta) {
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.setAttribute('data-mode', meta.id);
                    b.title = meta.hint;
                    b.textContent = meta.icon + ' ' + meta.label + ' (' + meta.key + ')';
                    b.addEventListener('click', function () {
                        try { api.setMode(meta.id); } catch (e) { /* ignore */ }
                    });
                    wrap.appendChild(b);
                })(MODES[i]);
            }
            return wrap;
        } catch (e) { return null; }
    }

    var _onModeChange = null;
    var _onKeyDown = null;
    var keysAttached = false;

    function onModeChange() {
        try { renderPill(); } catch (e) { /* ignore */ }
    }

    function onKeyDown(ev) {
        try {
            if (!ev || ev.defaultPrevented) return;
            // Ignore when typing in a field.
            try {
                var t = ev.target;
                if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            } catch (e) { /* ignore */ }
            var mode = ev.code && KEYMAP[ev.code] ? KEYMAP[ev.code] : null;
            if (!mode && ev.key && ['1', '2', '3'].indexOf(ev.key) !== -1) {
                mode = ev.key === '1' ? 'realtime' : (ev.key === '2' ? 'chrono' : 'turnbased');
            }
            if (!mode) return;
            if (typeof api.setMode === 'function') api.setMode(mode);
        } catch (e) { /* ignore */ }
    }

    var api = {
        MODES: MODES.map(function (m) { return { id: m.id, key: m.key, code: m.code, label: m.label, icon: m.icon, hint: m.hint }; }),
        KEYMAP: Object.assign({}, KEYMAP),
        current: 'realtime',
        getLabel: function () {
            try { return metaFor(currentMode()).label; } catch (e) { return 'Realtime'; }
        },
        getHint: function (id) {
            try { return metaFor(id || currentMode()).hint; } catch (e) { return ''; }
        },
        getMode: function () { return currentMode(); },
        setMode: function (id) {
            try {
                var M = modes();
                var ok = M && typeof M.setMode === 'function' ? M.setMode(id) : (id === currentMode());
                try { api.current = currentMode(); } catch (e) { /* ignore */ }
                renderPill();
                return !!ok;
            } catch (e) { return false; }
        },
        // Pill state without touching HUD internals: { mode, label, text }.
        getPill: function () {
            try {
                var m = metaFor(currentMode());
                return { mode: m.id, label: m.label, text: m.icon + ' ' + m.label };
            } catch (e) { return { mode: 'realtime', label: 'Realtime', text: 'Realtime' }; }
        },
        mount: function (container, opts) {
            try {
                ensureCss();
                var host = null;
                try {
                    if (typeof container === 'string') host = document.querySelector(container);
                    else if (container && container.appendChild) host = container;
                } catch (e) { host = null; }
                if (!host) return null;
                if (!pill) pill = buildPill();
                if (pill && pill.parentNode !== host) host.appendChild(pill);
                try {
                    if (opts && opts.switcher) {
                        if (!switcher) switcher = buildSwitcher();
                        if (switcher && switcher.parentNode !== host) host.appendChild(switcher);
                    }
                } catch (e) { /* switcher optional */ }
                mountedAt = host;
                try { api.current = currentMode(); } catch (e) { /* ignore */ }
                renderPill();
                return pill;
            } catch (e) { return null; }
        },
        update: function () {
            try { api.current = currentMode(); } catch (e) { /* ignore */ }
            renderPill();
            return api.getPill();
        },
        attachKeys: function () {
            try {
                if (keysAttached || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return false;
                _onKeyDown = onKeyDown;
                window.addEventListener('keydown', _onKeyDown);
                keysAttached = true;
                return true;
            } catch (e) { return false; }
        },
        detachKeys: function () {
            try {
                if (!keysAttached) return true;
                if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function' && _onKeyDown) {
                    window.removeEventListener('keydown', _onKeyDown);
                }
                _onKeyDown = null;
                keysAttached = false;
                return true;
            } catch (e) { return false; }
        },
        destroy: function () {
            try { api.detachKeys(); } catch (e) { /* ignore */ }
            try {
                if (_onModeChange && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                    window.removeEventListener('gg4d-mode-change', _onModeChange);
                }
            } catch (e) { /* ignore */ }
            _onModeChange = null;
            try { if (pill && pill.parentNode) pill.parentNode.removeChild(pill); } catch (e) { /* ignore */ }
            try { if (switcher && switcher.parentNode) switcher.parentNode.removeChild(switcher); } catch (e) { /* ignore */ }
            pill = null; switcher = null; mountedAt = null;
        }
    };

    try {
        api.current = currentMode();
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            _onModeChange = onModeChange;
            window.addEventListener('gg4d-mode-change', _onModeChange);
        }
    } catch (e) { /* ignore */ }

    try { window.GG4D_ModeUI = api; } catch (e) { /* ignore */ }
})();
