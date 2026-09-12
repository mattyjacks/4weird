/* GraveGain cinematic cutscene engine (v2-native, parity-safe).
 *
 * Lives OUTSIDE the parity-locked bundles:
 *   public/games/html/gravegain-cutscenes.js
 * Requires gravegain-epic-saga.js (saga data) but degrades to the shared
 * mission dialogueBefore/dialogueAfter when the saga is absent. Injected
 * into the generated runtime copies by scripts/sync-game-bundles.mjs.
 * NEVER edit gravegain2d/** or gravegain3d/** — this file only WRAPS the
 * live instance's playDialogueSequence (chain-safe via GraveGainAAA.wrap)
 * and renders its OWN overlay (#ggCine*) inside #canvasContainer.
 *
 * Experience: letterbox bars + themed gradient backdrop + mission
 * titlecard + per-beat portrait/speaker/typewriter text + progress dots
 * + Skip + "Don't show again" (localStorage gravegain_cutscenes_seen_v1).
 * The original dialogue modal still runs afterwards (chain-safe), so
 * endless mode, objectives, rewards, and TTS prompts never break.
 *
 * Contract: vanilla IIFE, never throws, idempotent, no input listeners
 * beyond Skip/Space/Esc on its own overlay, pointer-events:none except
 * buttons, honors prefers-reduced-motion + content-mode kid/teen/all.
 */
(function () {
    'use strict';
    if (window.GraveGainCutscenes) return;

    var VERSION = '1.0.0';
    var SEEN_KEY = 'gravegain_cutscenes_seen_v1';
    var TYPE_MS = 18;
    var HOOK_RETRIES = 40;

    var state = { enabled: true, playing: false, seen: {} };

    function loadSeen() {
        try {
            var raw = window.localStorage.getItem(SEEN_KEY);
            if (raw) {
                var p = JSON.parse(raw);
                if (p && typeof p === 'object') state.seen = p;
            }
        } catch (e) { /* ignore */ }
    }

    function saveSeen() {
        try {
            window.localStorage.setItem(SEEN_KEY, JSON.stringify(state.seen));
        } catch (e) { /* quota / access denied */ }
    }

    function seenKey(id, phase) { return 'm' + id + ':' + phase; }

    function hasSeen(id, phase) {
        try { return !!state.seen[seenKey(id, phase)]; } catch (e) { return false; }
    }

    function markSeen(id, phase) {
        try {
            state.seen[seenKey(id, phase)] = 1;
            saveSeen();
        } catch (e) { /* ignore */ }
    }

    function reducedMotion() {
        try {
            return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) { return false; }
    }

    function getAAA() {
        try { return window.GraveGainAAA || null; } catch (e) { return null; }
    }

    function currentMissionOf(game) {
        try {
            if (game && game.currentMission && game.currentMission.id) return game.currentMission;
        } catch (e) { /* ignore */ }
        try {
            if (game && game.selectedStoryMissionId) {
                var m = window.GraveGainStoryEngine && window.GraveGainStoryEngine.getMission
                    ? window.GraveGainStoryEngine.getMission(game.selectedStoryMissionId) : null;
                if (m) return m;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    // Resolve cinematic beats: epic saga first, shared-mission dialogue as
    // fallback. Saga text is already mode+flavor resolved; fallback dialogue
    // lines are used verbatim (they are teen-clean canon).
    function beatsFor(mission, phase, opts) {
        try {
            if (window.GraveGainEpicSaga && typeof window.GraveGainEpicSaga.getBeats === 'function') {
                var beats = window.GraveGainEpicSaga.getBeats(mission.id, phase, opts);
                if (beats && beats.length) return beats;
            }
        } catch (e) { /* fall through */ }
        try {
            var list = phase === 'outro' ? mission.dialogueAfter : mission.dialogueBefore;
            var out = [];
            for (var i = 0; i < (list || []).length; i++) {
                out.push({
                    speaker: String(list[i].speaker || 'Valley Net'),
                    portrait: String(list[i].portrait || '🤖'),
                    text: String(list[i].text || ''),
                    stage: '',
                    vox: false
                });
            }
            return out;
        } catch (e) { return []; }
    }

    function titlecardFor(mission) {
        try {
            if (window.GraveGainEpicSaga && typeof window.GraveGainEpicSaga.getTitlecard === 'function') {
                var t = window.GraveGainEpicSaga.getTitlecard(mission.id);
                if (t) return t;
            }
        } catch (e) { /* ignore */ }
        try {
            return { title: String(mission.title || 'GRAVEGAIN'), subtitle: String(mission.subtitle || mission.location || '') };
        } catch (e) { return { title: 'GRAVEGAIN', subtitle: '' }; }
    }

    var THEME_GRADIENTS = {
        metallic_ship: 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #0b0f1a 55%, #000 100%)',
        elven_grove: 'radial-gradient(ellipse at 50% 30%, #064e3b 0%, #02120d 55%, #000 100%)',
        dwarven_vault: 'radial-gradient(ellipse at 50% 30%, #7c2d12 0%, #1c0a02 55%, #000 100%)',
        orc_wastes: 'radial-gradient(ellipse at 50% 30%, #7f1d1d 0%, #1c0505 55%, #000 100%)',
        toxic_catacombs: 'radial-gradient(ellipse at 50% 30%, #3f6212 0%, #0c1202 55%, #000 100%)',
        stone_crypt: 'radial-gradient(ellipse at 50% 30%, #334155 0%, #0a0e14 55%, #000 100%)',
        citadel_darkness: 'radial-gradient(ellipse at 50% 30%, #4c1d95 0%, #0d021c 55%, #000 100%)'
    };

    function ensureOverlay() {
        try {
            var container = document.getElementById('canvasContainer');
            if (!container) return null;
            var root = document.getElementById('ggCineRoot');
            if (root) return root;
            root = document.createElement('div');
            root.id = 'ggCineRoot';
            root.setAttribute('aria-label', 'Mission cutscene');
            root.style.cssText = 'position:absolute;inset:0;z-index:5000;display:none;overflow:hidden;' +
                'pointer-events:none;font-family:Outfit,Inter,sans-serif;';
            var st = document.createElement('style');
            st.id = 'ggCineStyle';
            st.textContent = '#ggCineRoot.gg-open{display:block}' +
                '.gg-bar{position:absolute;left:0;right:0;height:9%;background:#000;z-index:2;transition:transform .6s ease}' +
                '.gg-bar.top{top:0;transform:translateY(-101%)}.gg-bar.bot{bottom:0;transform:translateY(101%)}' +
                '#ggCineRoot.gg-open .gg-bar.top{transform:translateY(0)}' +
                '#ggCineRoot.gg-open .gg-bar.bot{transform:translateY(0)}' +
                '.gg-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12% 6%;box-sizing:border-box}' +
                '.gg-card{max-width:640px;width:100%;background:rgba(5,5,12,.82);border:1px solid rgba(168,85,247,.55);' +
                'border-radius:12px;padding:18px 20px;box-shadow:0 0 40px rgba(124,58,237,.35);pointer-events:none}' +
                '.gg-title{font-family:Orbitron,sans-serif;color:#fbbf24;letter-spacing:.12em;font-size:.8rem;margin:0 0 10px}' +
                '.gg-sub{font-family:Orbitron,sans-serif;color:#a5b4fc;font-size:.7rem;margin:-6px 0 12px}' +
                '.gg-speaker{color:#fbbf24;font-family:Orbitron,sans-serif;font-size:1rem;margin:0 0 6px}' +
                '.gg-text{color:#fff;font-size:.95rem;line-height:1.55;min-height:72px;margin:0;white-space:pre-line}' +
                '.gg-stage-dir{color:#94a3b8;font-size:.75rem;font-style:italic;margin:6px 0 0}' +
                '.gg-dots{display:flex;gap:6px;margin-top:12px}' +
                '.gg-dot{width:8px;height:8px;border-radius:50%;background:#475569}' +
                '.gg-dot.on{background:#a855f7;box-shadow:0 0 8px #a855f7}' +
                '.gg-btns{position:absolute;right:14px;bottom:calc(9% + 12px);display:flex;gap:8px;z-index:3;pointer-events:auto}' +
                '.gg-btn{background:rgba(10,10,20,.85);border:1px solid #a855f7;color:#fff;border-radius:8px;' +
                'padding:8px 14px;font-size:.8rem;cursor:pointer;font-family:Orbitron,sans-serif}' +
                '.gg-btn:hover{background:#7c3aed}';
            root.appendChild(st);
            var bg = document.createElement('div');
            bg.id = 'ggCineBg';
            bg.style.cssText = 'position:absolute;inset:0;z-index:0;';
            root.appendChild(bg);
            var top = document.createElement('div'); top.className = 'gg-bar top'; root.appendChild(top);
            var bot = document.createElement('div'); bot.className = 'gg-bar bot'; root.appendChild(bot);
            var stage = document.createElement('div'); stage.className = 'gg-stage';
            var card = document.createElement('div'); card.className = 'gg-card';
            var title = document.createElement('p'); title.className = 'gg-title'; title.id = 'ggCineTitle';
            var sub = document.createElement('p'); sub.className = 'gg-sub'; sub.id = 'ggCineSub';
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:14px;align-items:flex-start;';
            var portrait = document.createElement('div');
            portrait.id = 'ggCinePortrait';
            portrait.style.cssText = 'font-size:2.6rem;line-height:1;background:rgba(0,0,0,.5);' +
                'padding:8px;border-radius:10px;border:1px solid rgba(148,163,184,.35);';
            var body = document.createElement('div'); body.style.cssText = 'flex:1;min-width:0;';
            var speaker = document.createElement('h3'); speaker.className = 'gg-speaker'; speaker.id = 'ggCineSpeaker';
            var text = document.createElement('p'); text.className = 'gg-text'; text.id = 'ggCineText';
            var dir = document.createElement('p'); dir.className = 'gg-stage-dir'; dir.id = 'ggCineDir';
            var dots = document.createElement('div'); dots.className = 'gg-dots'; dots.id = 'ggCineDots';
            body.appendChild(speaker); body.appendChild(text); body.appendChild(dir); body.appendChild(dots);
            row.appendChild(portrait); row.appendChild(body);
            card.appendChild(title); card.appendChild(sub); card.appendChild(row);
            stage.appendChild(card);
            root.appendChild(stage);
            var btns = document.createElement('div'); btns.className = 'gg-btns';
            var hide = document.createElement('button'); hide.className = 'gg-btn'; hide.id = 'ggCineHide';
            hide.textContent = "Don't show again";
            var skip = document.createElement('button'); skip.className = 'gg-btn'; skip.id = 'ggCineSkip';
            skip.textContent = 'Skip »';
            btns.appendChild(hide); btns.appendChild(skip);
            root.appendChild(btns);
            container.appendChild(root);
            return root;
        } catch (e) { return null; }
    }

    function setText(el, s) {
        try { el.textContent = String(s == null ? '' : s); } catch (e) { /* ignore */ }
    }

    // Typewriter with click/keyboard fast-forward. Returns a finish() that
    // completes instantly (used by Skip). Never throws, respects reduced
    // motion (instant full text).
    function typewrite(el, full, onDone) {
        var done = false;
        var timer = null;
        function finish() {
            if (done) return;
            done = true;
            try { if (timer) clearTimeout(timer); } catch (e) { /* ignore */ }
            setText(el, full);
            try { if (typeof onDone === 'function') onDone(); } catch (e) { /* ignore */ }
        }
        try {
            if (reducedMotion()) { finish(); return finish; }
            var i = 0;
            setText(el, '');
            (function tick() {
                if (done) return;
                try {
                    i += 2;
                    setText(el, String(full).slice(0, i));
                    if (i >= String(full).length) { finish(); return; }
                    timer = setTimeout(tick, TYPE_MS);
                } catch (e) { finish(); }
            })();
        } catch (e) { finish(); }
        return finish;
    }

    function speakLine(game, speakerName, text) {
        try {
            var audio = game && game.audio;
            if (!audio) return;
            if (typeof audio.speak === 'function') { audio.speak(speakerName, text); return; }
            if (typeof audio.speakFallback === 'function') { audio.speakFallback(text); return; }
        } catch (e) { /* TTS is garnish */ }
    }

    // Play beats for (mission, phase). Always calls done() exactly once,
    // even when the overlay cannot render (headless/bot harness).
    function play(mission, phase, game, done) {
        function finish() {
            state.playing = false;
            try {
                var root = document.getElementById('ggCineRoot');
                if (root) root.className = '';
                if (root) root.style.display = 'none';
            } catch (e) { /* ignore */ }
            try { if (typeof done === 'function') done(); } catch (e) { /* ignore */ }
        }
        try {
            if (!state.enabled || !mission || !mission.id) { finish(); return; }
            if (hasSeen(mission.id, phase)) { finish(); return; }
            var beats = beatsFor(mission, phase, { slug: slugNow() });
            if (!beats.length) { finish(); return; }
            var root = ensureOverlay();
            if (!root) { finish(); return; }
            state.playing = true;
            var titlecard = titlecardFor(mission);
            var bg = document.getElementById('ggCineBg');
            try {
                var grad = THEME_GRADIENTS[mission.dungeonTheme] || THEME_GRADIENTS.citadel_darkness;
                if (bg) bg.style.background = grad;
            } catch (e) { /* ignore */ }
            setText(document.getElementById('ggCineTitle'), titlecard.title);
            setText(document.getElementById('ggCineSub'), titlecard.subtitle);
            root.style.display = 'block';
            // Force reflow so the letterbox transition runs.
            try { void root.offsetWidth; } catch (e) { /* ignore */ }
            root.className = 'gg-open';
            var dots = document.getElementById('ggCineDots');
            try {
                dots.innerHTML = '';
                for (var d = 0; d < beats.length; d++) {
                    var dot = document.createElement('span');
                    dot.className = 'gg-dot' + (d === 0 ? ' on' : '');
                    dots.appendChild(dot);
                }
            } catch (e) { /* ignore */ }

            var idx = 0;
            var finishBeat = null;
            var cancelled = false;

            function cleanupKeys() {
                try { document.removeEventListener('keydown', onKey, true); } catch (e) { /* ignore */ }
                try {
                    var sk = document.getElementById('ggCineSkip');
                    var hd = document.getElementById('ggCineHide');
                    var tx = document.getElementById('ggCineText');
                    if (sk) sk.onclick = null;
                    if (hd) hd.onclick = null;
                    if (tx) tx.onclick = null;
                } catch (e) { /* ignore */ }
            }

            function endAll(mark) {
                if (cancelled) return;
                cancelled = true;
                cleanupKeys();
                try {
                    if (mark) markSeen(mission.id, phase);
                    else {
                        // Skipped mid-way counts as seen so replays stay fast;
                        // the player can re-enable via "Don't show again" off.
                        markSeen(mission.id, phase);
                    }
                } catch (e) { /* ignore */ }
                finish();
            }

            function onKey(ev) {
                try {
                    if (!state.playing || cancelled) return;
                    var k = ev && ev.key;
                    if (k === 'Escape') { ev.stopPropagation(); endAll(true); }
                    else if (k === ' ' || k === 'Enter') {
                        ev.preventDefault(); ev.stopPropagation();
                        advance();
                    }
                } catch (e) { /* ignore */ }
            }

            function advance() {
                try {
                    if (cancelled) return;
                    if (finishBeat) { finishBeat(); finishBeat = null; return; }
                    next();
                } catch (e) { next(); }
            }

            function next() {
                try {
                    if (cancelled) return;
                    if (idx >= beats.length) { endAll(true); return; }
                    var b = beats[idx];
                    setText(document.getElementById('ggCineSpeaker'),
                        (b.vox ? '📡 ' : '') + b.speaker);
                    setText(document.getElementById('ggCinePortrait'), b.portrait);
                    setText(document.getElementById('ggCineDir'), b.stage || '');
                    try {
                        var kids = dots ? dots.children : [];
                        for (var k = 0; k < kids.length; k++) {
                            kids[k].className = 'gg-dot' + (k <= idx ? ' on' : '');
                        }
                    } catch (e) { /* ignore */ }
                    speakLine(game, b.speaker, b.text);
                    var el = document.getElementById('ggCineText');
                    idx += 1;
                    finishBeat = typewrite(el, b.text, function () { finishBeat = null; });
                    // Auto-advance shortly after the line completes is NOT
                    // done — the player advances with Skip/Space/click.
                } catch (e) { endAll(false); }
            }

            try {
                document.addEventListener('keydown', onKey, true);
                var skipBtn = document.getElementById('ggCineSkip');
                // Skip doubles as Next: first press completes the typewriter,
                // second press advances. Esc finishes everything.
                if (skipBtn) skipBtn.onclick = function () { advance(); };
                var hideBtn = document.getElementById('ggCineHide');
                if (hideBtn) hideBtn.onclick = function () { endAll(true); };
                var textEl = document.getElementById('ggCineText');
                if (textEl) textEl.onclick = function () { advance(); };
                // Long-press safety: Esc hint inside the skip button.
                if (skipBtn) skipBtn.title = 'Next line (Space) · hold Esc to finish';
            } catch (e) { /* ignore */ }
            next();
        } catch (e) {
            try { finish(); } catch (ignored) { /* ignore */ }
        }
    }

    function slugNow() {
        try {
            var m = window.location.pathname.match(/\/games\/([^/]+)\//);
            if (m) return m[1];
        } catch (e) { /* ignore */ }
        return 'gravegain2d';
    }

    // Wrap the live instance: intro plays before the original dialogue
    // modal, outro plays after objectives complete but the original outro
    // modal still runs (chain-safe, original always invoked).
    function hookGame(game) {
        try {
            if (!game || game.__ggCineHooked) return;
            game.__ggCineHooked = true;
            var aaa = getAAA();
            function wrap(obj, method, fn) {
                try {
                    if (!obj || typeof obj[method] !== 'function' || obj['__ggCine_' + method]) return;
                    obj['__ggCine_' + method] = true;
                    if (aaa && typeof aaa.wrap === 'function') {
                        aaa.wrap(obj, method, fn);
                    } else {
                        var orig = obj[method];
                        obj[method] = function () {
                            var self = this, args = arguments;
                            return fn.call(self, function () { return orig.apply(self, args); }, args);
                        };
                    }
                } catch (e) { /* ignore */ }
            }
            // Intro: the dialogue target differs per game — 2D exposes
            // playDialogueSequence on the game, 3D on hubController.
            var target2d = (game && typeof game.playDialogueSequence === 'function') ? game : null;
            var hub = game && game.hubController ? game.hubController : null;
            var target3d = (hub && typeof hub.playDialogueSequence === 'function') ? hub : null;
            var target = target2d || target3d;
            if (target) {
                wrap(target, 'playDialogueSequence', function (orig, args) {
                    try {
                        var list = args && args[0];
                        var cb = args && args[1];
                        var mission = currentMissionOf(game);
                        // Only cinematicize mission dialogue (non-empty list +
                        // active mission). Endless-mode flavor lines pass through.
                        if (!mission || !list || !list.length) return orig();
                        var isOutro = false;
                        try {
                            var after = mission.dialogueAfter || [];
                            isOutro = after === list || (after.length && list.length &&
                                String(list[0].text || '') === String(after[0].text || '') &&
                                list.length <= after.length + 2);
                        } catch (e) { isOutro = false; }
                        var phase = isOutro ? 'outro' : 'intro';
                        play(mission, phase, game, function () {
                            try { orig(); } catch (e) { try { cb(); } catch (ignored) { /* ignore */ } }
                        });
                        return undefined;
                    } catch (e) {
                        try { return orig(); } catch (ignored) { return undefined; }
                    }
                });
            }
        } catch (e) { /* never break the game */ }
    }

    function boot() {
        try {
            loadSeen();
            var tries = 0;
            (function poll() {
                try {
                    tries += 1;
                    var aaa = getAAA();
                    var hooked = false;
                    if (aaa && typeof aaa.ready === 'function') {
                        try {
                            aaa.ready(function (game) { hookGame(game); });
                            hooked = true;
                        } catch (e) { hooked = false; }
                    }
                    // Direct fallback: the live instance may exist without AAA.
                    try {
                        if (window.GraveGainGame && !window.GraveGainGame.__ggCineHooked &&
                            (window.GraveGainGame.playDialogueSequence || window.GraveGainGame.currentMission)) {
                            hookGame(window.GraveGainGame);
                            hooked = true;
                        }
                    } catch (e) { /* ignore */ }
                    if (!hooked && tries < HOOK_RETRIES) setTimeout(poll, 500);
                } catch (e) { /* ignore */ }
            })();
        } catch (e) { /* ignore */ }
    }

    try {
        window.GraveGainCutscenes = {
            VERSION: VERSION,
            play: function (mission, phase, game, done) {
                try {
                    if (mission && typeof mission === 'number' && window.GraveGainStoryEngine) {
                        mission = window.GraveGainStoryEngine.getMission(mission) || mission;
                    }
                    play(mission, phase, game, done);
                } catch (e) { try { done(); } catch (ignored) { /* ignore */ } }
            },
            skip: function () {
                try {
                    var sk = document.getElementById('ggCineSkip');
                    if (sk && typeof sk.onclick === 'function') sk.onclick();
                } catch (e) { /* ignore */ }
            },
            isPlaying: function () { return !!state.playing; },
            setEnabled: function (on) { state.enabled = !!on; },
            getEnabled: function () { return !!state.enabled; },
            hasSeen: hasSeen,
            markSeen: markSeen
        };
    } catch (e) { /* window unwritable */ }

    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }
    } catch (e) {
        try { boot(); } catch (ignored) { /* ignore */ }
    }
})();
