/* GraveGain2D Campaign — 20 campaign UI.
   Progress header + selected-mission briefing panel on the story
   screen, mission auto-preselect, and a NEXT-mission button on the
   game-over screen.
   Mirrors gravegain3d/campaign/20-campaign-ui.js, adapted for 2D:
   - No AAA bus: patches the live window.GraveGainGame instance
     (own-property shadowing) once it exists.
   - 2D story screen ids: storyMissionScreen / storyMissionsGrid /
     gameOverScreen / btnGoToMenu / mainMenuScreen / charSelectScreen /
     gameMain; 2D lore buttons call viewLoreEntry('id').
   Everything guarded; never throws. */
(function () {
    'use strict';

    var INSTANCE_FLAG = '__gg2dCampaignUiPatched';

    function campaign() {
        try { return window.GraveGainCampaign || null; } catch (_) { return null; }
    }

    function storyEngine() {
        try { return window.GraveGainStoryEngine || null; } catch (_) { return null; }
    }

    function allMissions() {
        try {
            var se = storyEngine();
            if (se && typeof se.getAllMissions === 'function') {
                var all = se.getAllMissions();
                if (Array.isArray(all) && all.length) return all;
            }
        } catch (_) { /* fall through */ }
        try {
            if (Array.isArray(window.GraveGainStoryMissions) && window.GraveGainStoryMissions.length) {
                return window.GraveGainStoryMissions;
            }
        } catch (_) { /* ignore */ }
        return [];
    }

    function missionDef(id) {
        var camp = campaign();
        try {
            if (camp && typeof camp.getMissionDef === 'function') {
                var m = camp.getMissionDef(id);
                if (m) return m;
            }
        } catch (_) { /* fall through */ }
        try {
            var se = storyEngine();
            if (se && typeof se.getMission === 'function') {
                var sm = se.getMission(id);
                if (sm) return sm;
            }
        } catch (_) { /* fall through */ }
        var list = allMissions();
        for (var i = 0; i < list.length; i++) {
            try {
                if (list[i] && (list[i].id === id || list[i].id === Number(id))) return list[i];
            } catch (_) { /* ignore */ }
        }
        return null;
    }

    function extraFor(id) {
        try {
            var camp = campaign();
            if (camp && typeof camp.getExtra === 'function') return camp.getExtra(id) || null;
        } catch (_) { /* ignore */ }
        return null;
    }

    function esc(s) {
        return String(s === undefined || s === null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function isUnlocked(id) {
        try {
            var se = storyEngine();
            if (se && typeof se.isUnlocked === 'function') return !!se.isUnlocked(id);
        } catch (_) { /* ignore */ }
        return true;
    }

    function progress() {
        try {
            var se = storyEngine();
            if (se && typeof se.getProgress === 'function') {
                var p = se.getProgress() || {};
                var stars = p.stars || {};
                var done = Array.isArray(p.completedMissions)
                    ? p.completedMissions.length
                    : Object.keys(stars).filter(function (k) { return (stars[k] || 0) > 0; }).length;
                var total = 0;
                Object.keys(stars).forEach(function (k) { total += (Number(stars[k]) || 0); });
                return { done: done, stars: total };
            }
        } catch (_) { /* ignore */ }
        return { done: 0, stars: 0 };
    }

    function fmtPar(seconds) {
        try {
            var s = Math.max(0, Math.floor(Number(seconds) || 0));
            return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        } catch (_) { return '—'; }
    }

    function refreshProgress() {
        try {
            var screen = document.getElementById('storyMissionScreen');
            if (!screen) return;
            var panel = screen.querySelector('.menu-content');
            if (!panel) return;
            var el = document.getElementById('campProgress');
            if (!el) {
                el = document.createElement('div');
                el.id = 'campProgress';
                if (panel.firstChild) panel.insertBefore(el, panel.firstChild);
                else panel.appendChild(el);
            }
            var p = progress();
            el.textContent = 'CAMPAIGN — ' + p.done + '/10 COMPLETE · ★' + p.stars + ' STARS';
        } catch (_) { /* never throw */ }
    }

    function refreshBriefing(game) {
        try {
            var grid = document.getElementById('storyMissionsGrid');
            if (!grid || !grid.parentNode) return;
            var el = document.getElementById('campBriefing');
            if (!el) {
                el = document.createElement('div');
                el.id = 'campBriefing';
                grid.parentNode.insertBefore(el, grid.nextSibling);
            }
            var selId = game ? game.selectedStoryMissionId : null;
            if (selId === undefined || selId === null || selId === '') {
                el.innerHTML = '<div class="camp-brief-empty">Select a mission above to view its briefing.</div>';
                return;
            }
            var m = missionDef(selId);
            if (!m) {
                el.innerHTML = '<div class="camp-brief-empty">Briefing unavailable for this mission.</div>';
                return;
            }
            var ex = extraFor(selId) || {};
            var html = '';
            html += '<div class="camp-brief-title">' + esc(m.title || ('Mission ' + selId)) + '</div>';
            if (m.subtitle) html += '<div class="camp-brief-sub">' + esc(m.subtitle) + '</div>';
            if (ex.briefing) html += '<p class="camp-brief-text">' + esc(ex.briefing) + '</p>';
            if (ex.threat) html += '<div class="camp-threat">⚠ ' + esc(ex.threat) + '</div>';
            var objs = Array.isArray(m.objectives) ? m.objectives : [];
            if (objs.length) {
                html += '<div class="camp-obj-list">';
                objs.forEach(function (o) {
                    if (!o) return;
                    var d = o.desc || o.id || 'Objective';
                    var c = (o.count !== undefined && o.count !== null) ? ' ×' + o.count : '';
                    html += '<div class="camp-obj"><span>' + esc(d) + '</span><span>' + esc(c) + '</span></div>';
                });
                html += '</div>';
            }
            var bossName = (ex.bossDisplay && ex.bossDisplay.name) || m.bossType || null;
            html += '<div class="camp-meta">';
            if (bossName) html += '<div class="camp-meta-row"><span>Boss</span><strong>' + esc(bossName) + '</strong></div>';
            if (m.minFloor !== undefined && m.minFloor !== null) {
                html += '<div class="camp-meta-row"><span>Depth</span><strong>Floor ' + esc(m.minFloor) + '</strong></div>';
            }
            if (ex.parSeconds) html += '<div class="camp-meta-row"><span>Par time</span><strong>' + esc(fmtPar(ex.parSeconds)) + '</strong></div>';
            var gold = m.rewardGold, uusd = m.rewardUusd;
            if (gold !== undefined || uusd !== undefined) {
                html += '<div class="camp-meta-row"><span>Rewards</span><strong>+' + esc(gold || 0) + 'g | +' + esc(uusd || 0) + '$</strong></div>';
            }
            html += '</div>';
            el.innerHTML = html;
        } catch (_) { /* never throw */ }
    }

    // Recursion guard: preselect triggers a re-render, which is wrapped.
    var preselecting = false;

    function maybePreselect(game) {
        if (preselecting) return;
        try {
            if (!game) return;
            if (game.selectedStoryMissionId !== undefined &&
                game.selectedStoryMissionId !== null &&
                game.selectedStoryMissionId !== '') return;
            var list = allMissions();
            if (!list.length) return;
            var se = storyEngine();
            var doneSet = {};
            try {
                var p = se && typeof se.getProgress === 'function' ? se.getProgress() : null;
                if (p && Array.isArray(p.completedMissions)) {
                    p.completedMissions.forEach(function (id) { doneSet[String(id)] = true; });
                } else if (p && p.stars) {
                    Object.keys(p.stars).forEach(function (k) {
                        if ((p.stars[k] || 0) > 0) doneSet[String(k)] = true;
                    });
                }
            } catch (_) { /* ignore */ }
            for (var i = 0; i < list.length; i++) {
                var m = list[i];
                if (!m) continue;
                if (doneSet[String(m.id)]) continue;
                if (!isUnlocked(m.id)) continue;
                preselecting = true;
                try {
                    game.selectedStoryMissionId = m.id;
                    if (typeof game.renderStoryMissionsList === 'function') {
                        game.renderStoryMissionsList();
                    }
                } finally {
                    preselecting = false;
                }
                return;
            }
        } catch (_) { /* never throw */ }
    }

    function showScreen(idToShow) {
        ['storyMissionScreen', 'gameOverScreen', 'mainMenuScreen', 'charSelectScreen', 'gameMain'].forEach(function (id) {
            try {
                var el = document.getElementById(id);
                if (!el) return;
                if (id === idToShow) el.classList.remove('hidden');
                else if (id === 'gameMain') el.classList.add('hidden');
                else el.classList.add('hidden');
            } catch (_) { /* ignore */ }
        });
    }

    function injectNextButton(game) {
        try {
            var screen = document.getElementById('gameOverScreen');
            if (!screen) return;
            var content = screen.querySelector('.menu-content');
            if (!content) return;
            // Drop a stale button from a previous run before injecting.
            try {
                var stale = document.getElementById('campNextBtn');
                if (stale) stale.remove();
            } catch (_) { /* ignore */ }
            var cur = game.currentMission || {};
            var curId = Number(cur.id) || 0;
            if (!curId) return;
            var btn = document.createElement('button');
            btn.id = 'campNextBtn';
            btn.className = 'btn-game btn-primary';
            if (curId >= 10) {
                btn.textContent = '★ CAMPAIGN COMPLETE — VIEW LOG';
                btn.addEventListener('click', function () {
                    try { btn.remove(); } catch (_) { /* ignore */ }
                    try {
                        screen.classList.add('hidden');
                        var menu = document.getElementById('mainMenuScreen');
                        if (menu) menu.classList.remove('hidden');
                    } catch (_) { /* ignore */ }
                });
            } else {
                var nextId = curId + 1;
                var nextDef = missionDef(nextId);
                var nextTitle = (nextDef && nextDef.title) ? nextDef.title : ('MISSION ' + nextId);
                btn.textContent = 'NEXT: MISSION ' + nextId + ' — ' + String(nextTitle).toUpperCase();
                btn.addEventListener('click', function () {
                    try { btn.remove(); } catch (_) { /* ignore */ }
                    try {
                        if (isUnlocked(nextId)) game.selectedStoryMissionId = nextId;
                    } catch (_) { /* ignore */ }
                    try {
                        showScreen('storyMissionScreen');
                        if (typeof game.renderStoryMissionsList === 'function') {
                            game.renderStoryMissionsList();
                        }
                    } catch (_) { /* ignore */ }
                });
            }
            var goToMenu = document.getElementById('btnGoToMenu');
            if (goToMenu && goToMenu.parentNode === content) content.insertBefore(btn, goToMenu);
            else content.appendChild(btn);
        } catch (_) { /* never throw */ }
    }

    function alreadyPatched(game, name) {
        try {
            var bag = game[INSTANCE_FLAG];
            return !!(bag && bag[name]);
        } catch (_) {
            return false;
        }
    }

    function markPatched(game, name) {
        try {
            var bag = game[INSTANCE_FLAG];
            if (!bag || typeof bag !== 'object') {
                bag = {};
                game[INSTANCE_FLAG] = bag;
            }
            bag[name] = true;
        } catch (_) { /* ignore */ }
    }

    function boot(game) {
        try {
            if (!alreadyPatched(game, 'renderStoryMissionsList') &&
                typeof game.renderStoryMissionsList === 'function') {
                var origList = game.renderStoryMissionsList.bind(game);
                game.renderStoryMissionsList = function () {
                    var out;
                    try { out = origList(); } catch (e) { out = undefined; }
                    try {
                        refreshProgress();
                        refreshBriefing(game);
                        maybePreselect(game);
                    } catch (_) { /* garnish only */ }
                    return out;
                };
                markPatched(game, 'renderStoryMissionsList');
            }
        } catch (_) { /* ignore */ }

        try {
            if (!alreadyPatched(game, 'gameOver_ui') && typeof game.gameOver === 'function') {
                var prev = game.gameOver.bind(game);
                game.gameOver = function (victory) {
                    var rest = Array.prototype.slice.call(arguments, 1);
                    var out;
                    try { out = prev.apply(null, [victory].concat(rest)); }
                    catch (e) { out = undefined; }
                    try {
                        if (victory && game.currentMission && game.currentMission.completed === true) {
                            injectNextButton(game);
                        }
                    } catch (_) { /* garnish only */ }
                    return out;
                };
                markPatched(game, 'gameOver_ui');
            }
        } catch (_) { /* ignore */ }
    }

    // NOTE: the director also wraps game.gameOver (fail banner). Both
    // wrappers chain: whichever applied first becomes the inner call of
    // the other, since each binds the then-current function.
    function waitForGame() {
        try {
            var game = window.GraveGainGame || null;
            if (game && typeof game.renderStoryMissionsList === 'function') {
                try { boot(game); } catch (_) { /* ignore */ }
                return;
            }
        } catch (_) { /* keep polling */ }
        try {
            var tries = 0;
            var timer = setInterval(function () {
                tries += 1;
                try {
                    var g = window.GraveGainGame || null;
                    if (g && typeof g.renderStoryMissionsList === 'function') {
                        clearInterval(timer);
                        try { boot(g); } catch (_) { /* ignore */ }
                    } else if (tries >= 200) {
                        clearInterval(timer);
                    }
                } catch (_) { /* keep polling */ }
            }, 250);
        } catch (_) { /* never throw during boot */ }
    }

    try {
        waitForGame();
    } catch (_) { /* never throw during boot */ }
})();
