/* =========================================================================
 * GraveGain3D - Virtual Bot Mouse + Bot Input API
 * -------------------------------------------------------------------------
 * 1. Story-data fallback: the game must boot as a complete solo copy even
 *    when ../gravegain_shared_missions.js fails to load (offline/file://).
 * 2. window.GraveGainBotCursor: visible virtual mouse on the test window.
 *    A robot emoji rides OVER the pointer arrow whenever the bot is in
 *    control, glides to every target, and flashes on click.
 * 3. window.GraveGainBotInput: programmatic input the bot drives instead of
 *    synthetic DOM events (which pointer-lock swallows). All bot control
 *    logic - menus, movement, aiming, attacks, blocks - routes through here.
 * ========================================================================= */
(function () {
    'use strict';

    // ----------------------------------------------------------------------
    // 1. Solo-copy story fallback (complete-game guarantee)
    // ----------------------------------------------------------------------
    if (!Array.isArray(window.GraveGainStoryMissions)) {
        window.GraveGainStoryMissions = [];
    }
    if (!window.GraveGainStoryEngine) {
        const _stars = {};
        window.GraveGainStoryEngine = {
            isUnlocked: function () { return true; },
            getProgress: function () { return { stars: _stars }; },
            getMission: function () { return null; },
            completeMission: function (id, s) { _stars[id] = Math.max(_stars[id] || 0, s || 1); },
            resetProgress: function () { Object.keys(_stars).forEach(k => delete _stars[k]); }
        };
    }

    // ----------------------------------------------------------------------
    // 2. Visible virtual mouse (robot emoji over the pointer)
    // ----------------------------------------------------------------------
    var CURSOR_ID = 'vibe-bot-cursor';
    var botControl = false;    // true while the bot drives (worker sets this)
    var humanOverride = false; // a real human just touched input: yield
    var cursorEl = null;
    var cursorLabelEl = null;
    var hideTimer = null;

    function nx_to_px(nx) { return Math.round((nx / 1000) * window.innerWidth); }
    function ny_to_py(ny) { return Math.round((ny / 1000) * window.innerHeight); }

    function ensureCursor() {
        if (cursorEl && document.body.contains(cursorEl)) return cursorEl;
        cursorEl = document.createElement('div');
        cursorEl.id = CURSOR_ID;
        cursorEl.setAttribute('aria-hidden', 'true');
        cursorEl.innerHTML =
            '<div class="vibe-bot-badge">🤖</div>' +
            '<div class="vibe-bot-pointer">➤</div>' +
            '<div class="vibe-bot-label" id="vibe-bot-cursor-label"></div>';
        var css = document.createElement('style');
        css.id = CURSOR_ID + '-style';
        css.textContent =
            '#' + CURSOR_ID + '{position:fixed;left:0;top:0;z-index:999999;pointer-events:none;' +
            'transition:left 0.18s ease-out,top 0.18s ease-out,opacity 0.25s;opacity:0;}' +
            '#' + CURSOR_ID + '.on{opacity:1;}' +
            '#' + CURSOR_ID + ' .vibe-bot-badge{position:absolute;left:-9px;top:-30px;font-size:22px;' +
            'line-height:1;filter:drop-shadow(0 0 6px rgba(168,85,247,0.9));}' +
            '#' + CURSOR_ID + ' .vibe-bot-pointer{position:absolute;left:0;top:0;font-size:20px;color:#c084fc;' +
            'transform:rotate(-8deg);text-shadow:0 0 8px rgba(168,85,247,1);}' +
            '#' + CURSOR_ID + ' .vibe-bot-label{position:absolute;left:20px;top:-26px;white-space:nowrap;' +
            'font:600 11px/1.4 monospace,sans-serif;color:#e9d5ff;background:rgba(24,10,46,0.85);' +
            'border:1px solid rgba(168,85,247,0.6);border-radius:6px;padding:2px 7px;}' +
            '.vibe-bot-flash{position:fixed;z-index:999998;pointer-events:none;width:14px;height:14px;' +
            'margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #c084fc;opacity:0.95;' +
            'transition:transform 0.3s ease-out,opacity 0.3s;}' +
            '.vibe-bot-flash.go{transform:scale(3.2);opacity:0;}';
        document.head.appendChild(css);
        document.body.appendChild(cursorEl);
        cursorLabelEl = cursorEl.querySelector('#vibe-bot-cursor-label');
        return cursorEl;
    }

    function refreshVisibility() {
        var el = ensureCursor();
        var show = botControl && !humanOverride;
        el.classList.toggle('on', show);
    }

    function moveCursor(nx, ny, label) {
        var el = ensureCursor();
        humanOverride = false;
        el.style.left = nx_to_px(nx) + 'px';
        el.style.top = ny_to_py(ny) + 'px';
        if (typeof label === 'string' && cursorLabelEl) cursorLabelEl.textContent = label;
        refreshVisibility();
        // Keep the cursor up while the bot is active; fade 6s after last move.
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function () {
            if (cursorEl) cursorEl.classList.remove('on');
        }, 6000);
        if (botControl && !humanOverride && cursorEl) cursorEl.classList.add('on');
    }

    function clickFlash(nx, ny) {
        var ring = document.createElement('div');
        ring.className = 'vibe-bot-flash';
        ring.style.left = nx_to_px(nx) + 'px';
        ring.style.top = ny_to_py(ny) + 'px';
        document.body.appendChild(ring);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { ring.classList.add('go'); });
        });
        setTimeout(function () { ring.remove(); }, 350);
    }

    // A real human grabbing input yields the cursor until the bot acts again.
    window.addEventListener('mousedown', function (e) {
        if (e.isTrusted) { humanOverride = true; refreshVisibility(); }
    }, true);
    window.addEventListener('keydown', function (e) {
        if (e.isTrusted) { humanOverride = true; refreshVisibility(); }
    }, true);

    window.GraveGainBotCursor = {
        ensure: ensureCursor,
        move: moveCursor,
        flash: clickFlash,
        label: function (t) { ensureCursor(); if (cursorLabelEl) cursorLabelEl.textContent = t; refreshVisibility(); },
        setBotControl: function (on) { botControl = !!on; if (botControl) humanOverride = false; refreshVisibility(); },
        isBotControl: function () { return botControl; },
        hide: function () { botControl = false; refreshVisibility(); }
    };

    // ----------------------------------------------------------------------
    // 3. Bot input API - every bot control path routes through here
    // ----------------------------------------------------------------------
    function game() { return window.GraveGainGame || null; }
    function inputOf(g) { return (g && g.input) ? g.input : null; }
    function playerAlive(g) {
        return !!(g && g.player && !g.player.isDead && !g.isPaused &&
            document.getElementById('gameMain') &&
            !document.getElementById('gameMain').classList.contains('hidden'));
    }

    var BotInput = {
        isBotControl: function () { return botControl; },
        setBotControl: function (on) { window.GraveGainBotCursor.setBotControl(on); },

        // Glide the visible mouse. Label describes what the bot is doing.
        move: function (nx, ny, label) {
            moveCursor(nx, ny, label || 'bot');
            return { x: nx_to_px(nx), y: ny_to_py(ny) };
        },

        // Rotate the first-person view directly (bypasses pointer-lock).
        look: function (dx, dy) {
            var g = game();
            if (!g || !g.player) return false;
            var sens = (g.input && g.input.lookSensitivity) || 0.0022;
            // dx/dy are in normalized screen units (-500..500); scale to rad.
            g.player.yaw -= (dx / 500) * sens * 220;
            var pitchDy = (g.input && g.input.invertY) ? -dy : dy;
            g.player.pitch = Math.max(-Math.PI / 2.3,
                Math.min(Math.PI / 2.3, g.player.pitch - (pitchDy / 500) * sens * 220));
            return true;
        },

        // Aim at a normalized screen point (0-1000): offset from canvas
        // center becomes yaw/pitch. This is how canvas clicks steer aim.
        lookToward: function (nx, ny) {
            return this.look(nx - 500, ny - 500);
        },

        attack: function () {
            var g = game();
            if (!playerAlive(g)) return false;
            var inp = inputOf(g);
            if (inp) inp.mouse.click = true; // polled next frame -> triggerMeleeAttack
            return true;
        },

        block: function (on) {
            var g = game();
            var inp = inputOf(g);
            if (!g || !inp) return false;
            inp.mouse.isBlocking = on !== false;
            inp.mouse.rightClick = on !== false;
            return true;
        },

        press: function (code, holdMs) {
            var g = game();
            var inp = inputOf(g);
            if (!g || !inp) return false;
            if (code === 'KeyQ') { g.usePotion(); return true; }
            if (code === 'KeyF') {
                if (g.player) g.player.triggerAbility();
                return true;
            }
            inp.keys[code] = true;
            setTimeout(function () { inp.keys[code] = false; }, holdMs || 220);
            return true;
        },

        // Project the nearest living enemy to normalized VIEWPORT coords
        // (0-1000, the same space bot actions use). NDC is mapped through
        // the canvas rect because the canvas rarely fills the whole page
        // (template chrome/margins) - raw NDC would miss the canvas.
        projectEnemy: function () {
            var g = game();
            if (!playerAlive(g) || !g.camera3d || !window.THREE) return null;
            var canvas = document.getElementById('gameCanvas');
            var rect = canvas ? canvas.getBoundingClientRect() : null;
            var best = null;
            var v = new window.THREE.Vector3();
            (g.enemies || []).forEach(function (e) {
                if (!e || e.hp <= 0) return;
                v.set(e.x, 18, e.y).project(g.camera3d);
                if (v.z > 1) return; // behind camera
                var px = rect ? rect.left + (v.x * 0.5 + 0.5) * rect.width
                              : (v.x * 0.5 + 0.5) * window.innerWidth;
                var py = rect ? rect.top + (-v.y * 0.5 + 0.5) * rect.height
                              : (-v.y * 0.5 + 0.5) * window.innerHeight;
                var sx = Math.round(px / window.innerWidth * 1000);
                var sy = Math.round(py / window.innerHeight * 1000);
                var dist = Math.hypot(e.x - g.player.x, e.y - g.player.y);
                if (!best || dist < best.dist) {
                    best = { name: e.name, dist: dist, x: sx, y: sy,
                             onScreen: sx >= 0 && sx <= 1000 && sy >= 0 && sy <= 1000 };
                }
            });
            return best;
        },

        // Unified bot click: visible cursor glides there, then -
        //   canvas  -> aim at the point + attack (3D combat, no pointer lock)
        //   UI      -> dispatch press on the element (menus, buttons, perks)
        click: function (nx, ny, label) {
            var g = game();
            moveCursor(nx, ny, label || 'click');
            clickFlash(nx, ny);
            var px = nx_to_px(nx), py = ny_to_py(ny);
            var el = document.elementFromPoint(px, py);
            var canvas = document.getElementById('gameCanvas');
            if ((el === canvas || (canvas && canvas.contains(el))) && playerAlive(g)) {
                this.lookToward(nx, ny);
                return this.attack() ? ('Bot aim+attack at ' + px + ',' + py) : 'Bot attack refused';
            }
            if (el) {
                try { el.focus && el.focus(); } catch (_) {}
                var opts = { bubbles: true, cancelable: true, clientX: px, clientY: py };
                el.dispatchEvent(new MouseEvent('mousedown', opts));
                el.dispatchEvent(new MouseEvent('click', opts));
                el.dispatchEvent(new MouseEvent('mouseup', opts));
                return 'Bot clicked ' + el.tagName + ' at ' + px + ',' + py;
            }
            return 'Bot click: no element at ' + px + ',' + py;
        }
    };

    window.GraveGainBotInput = BotInput;
})();
