/* GraveGain3D Campaign - 20 campaign UI.
   Progress header + selected-mission briefing panel on the story
   screen, mission auto-preselect, NEXT-mission button on the game-over
   screen, and a MISSION COMPLETE announcement.
   Patches only via AAA.wrap (chain-safe with core + teammates).
   Everything guarded; never throws. */
(function () {
    'use strict';

    var AAA = window.GraveGainAAA;
    if (!AAA || typeof AAA.ready !== 'function') return;

    function esc(s) {
        return String(s === undefined || s === null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

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
        } catch (_) { return '-'; }
    }

    function fmtDuration(ms) {
        try {
            var s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
            var h = Math.floor(s / 3600);
            var m = Math.floor((s % 3600) / 60);
            var r = s % 60;
            var mm = (h > 0 ? String(m).padStart(2, '0') : String(m)) + ':' + String(r).padStart(2, '0');
            return h > 0 ? h + ':' + mm : mm;
        } catch (_) { return '-'; }
    }

    function missionStars(id) {
        try {
            var se = storyEngine();
            if (se && typeof se.getProgress === 'function') {
                var p = se.getProgress() || {};
                var stars = p.stars || {};
                var n = Number(stars[id] !== undefined ? stars[id] : stars[String(id)]) || 0;
                if (n >= 1 && n <= 3) return n;
            }
        } catch (_) { /* ignore */ }
        return 0;
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
            el.textContent = 'CAMPAIGN - ' + p.done + '/10 COMPLETE · ★' + p.stars + ' STARS';
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
                    var hub = game.hubController;
                    if (hub && typeof hub.renderStoryMissionsList === 'function') {
                        hub.renderStoryMissionsList();
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

    // Victory debrief card: stars, clear time, kills, rewards for every
    // mission; the M10 finale gets the epilogue variant ("MoonRock is
    // SAVED" + campaign totals + replay button). Idempotent per game-over.
    function injectVictoryCard(game, content) {
        try {
            if (!game || !content) return;
            var cur = game.currentMission || null;
            if (!cur) return; // endless mode: no debrief card
            var curId = Number(cur.id) || 0;
            if (!curId) return;
            // Stale card from a previous run → rebuild (run-stamped).
            try {
                var stale = document.getElementById('campVictoryCard');
                if (stale) {
                    var runStamp = String(game._missionStartTime || '');
                    if (stale.getAttribute('data-run') !== runStamp ||
                        stale.getAttribute('data-mid') !== String(curId)) {
                        stale.remove();
                        var staleReplay = document.getElementById('campReplayBtn');
                        if (staleReplay) staleReplay.remove();
                        var staleNext = document.getElementById('campNextBtn');
                        if (staleNext) staleNext.remove();
                    } else {
                        return;
                    }
                }
            } catch (_) { /* ignore */ }
            if (document.getElementById('campVictoryCard')) return;
            var stars = missionStars(curId);
            var elapsed = 0;
            try {
                if (Number(game._missionStartTime) > 0) elapsed = Date.now() - Number(game._missionStartTime);
            } catch (_) { elapsed = 0; }
            var kills = 0;
            try { kills = Number(game.kills) || 0; } catch (_) { kills = 0; }
            var gold = 0, uusd = 0;
            try {
                gold = Math.floor(Number(cur.rewardGold)) || 0;
                uusd = Math.floor(Number(cur.rewardUusd)) || 0;
            } catch (_) { /* ignore */ }
            var card = document.createElement('div');
            card.id = 'campVictoryCard';
            card.className = 'camp-victory-card' + (curId >= 10 ? ' camp-epilogue' : '');
            try {
                card.setAttribute('data-mid', String(curId));
                card.setAttribute('data-run', String(game._missionStartTime || ''));
            } catch (_) { /* ignore */ }
            var html = '';
            if (curId >= 10) {
                var p = progress();
                html += '<div class="camp-epi-title">🌅 MOONROCK IS SAVED 🌅</div>';
                html += '<div class="camp-epi-sub">The Necromantic Array is silent. The four races are free.</div>';
                html += '<div class="camp-stars">' + (stars > 0 ? esc('★'.repeat(stars) + '☆'.repeat(3 - stars)) : '★☆☆') + '</div>';
                html += '<div class="camp-meta">';
                html += '<div class="camp-meta-row"><span>Final time</span><strong>' + esc(fmtDuration(elapsed)) + '</strong></div>';
                html += '<div class="camp-meta-row"><span>Kills (run)</span><strong>' + esc(kills) + '</strong></div>';
                html += '<div class="camp-meta-row"><span>Spoils</span><strong>+' + esc(gold) + 'g | +' + esc(uusd) + '$</strong></div>';
                html += '<div class="camp-meta-row"><span>Campaign</span><strong>' + esc(p.done) + '/10 · ★' + esc(p.stars) + '</strong></div>';
                html += '</div>';
                html += '<div class="camp-epi-line">“Clint, old soldier - rest now. The graves are silent.” - Guy Young</div>';
            } else {
                html += '<div class="camp-vict-title">🏆 MISSION ' + esc(curId) + ' COMPLETE 🏆</div>';
                html += '<div class="camp-stars">' + (stars > 0 ? esc('★'.repeat(stars) + '☆'.repeat(3 - stars)) : '★☆☆') + '</div>';
                html += '<div class="camp-meta">';
                html += '<div class="camp-meta-row"><span>Clear time</span><strong>' + esc(fmtDuration(elapsed)) + '</strong></div>';
                html += '<div class="camp-meta-row"><span>Kills (run)</span><strong>' + esc(kills) + '</strong></div>';
                html += '<div class="camp-meta-row"><span>Rewards</span><strong>+' + esc(gold) + 'g | +' + esc(uusd) + '$</strong></div>';
                html += '</div>';
            }
            card.innerHTML = html;
            if (content.firstChild) content.insertBefore(card, content.firstChild);
            else content.appendChild(card);
            // Finale replay button: queue M10 again from the story screen.
            if (curId >= 10 && !document.getElementById('campReplayBtn')) {
                try {
                    var replay = document.createElement('button');
                    replay.id = 'campReplayBtn';
                    replay.className = 'btn-game btn-secondary';
                    replay.textContent = '↻ REPLAY THE FINALE (M10)';
                    replay.addEventListener('click', function () {
                        try {
                            var c = document.getElementById('campVictoryCard');
                            if (c) c.remove();
                        } catch (_) { /* ignore */ }
                        try { replay.remove(); } catch (_) { /* ignore */ }
                        try {
                            var nb = document.getElementById('campNextBtn');
                            if (nb) nb.remove();
                        } catch (_) { /* ignore */ }
                        try { game.selectedStoryMissionId = 10; } catch (_) { /* ignore */ }
                        try {
                            showScreen('storyMissionScreen');
                            var hub = game.hubController;
                            if (hub && typeof hub.renderStoryMissionsList === 'function') {
                                hub.renderStoryMissionsList();
                            }
                        } catch (_) { /* ignore */ }
                    });
                    var goToMenu = document.getElementById('btnGoToMenu');
                    if (goToMenu && goToMenu.parentNode === content) content.insertBefore(replay, goToMenu);
                    else content.appendChild(replay);
                } catch (_) { /* replay is garnish */ }
            }
        } catch (_) { /* never throw */ }
    }

    function injectNextButton(game) {
        try {
            var screen = document.getElementById('gameOverScreen');
            if (!screen) return;
            var content = screen.querySelector('.menu-content');
            if (!content) return;
            injectVictoryCard(game, content);
            if (document.getElementById('campNextBtn')) return;
            var cur = game.currentMission || {};
            var curId = Number(cur.id) || 0;
            if (!curId) return;
            var btn = document.createElement('button');
            btn.id = 'campNextBtn';
            btn.className = 'btn-game btn-primary';
            if (curId >= 10) {
                btn.textContent = '★ CAMPAIGN COMPLETE - VIEW LOG';
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
                btn.textContent = 'NEXT: MISSION ' + nextId + ' - ' + String(nextTitle).toUpperCase();
                btn.addEventListener('click', function () {
                    try { btn.remove(); } catch (_) { /* ignore */ }
                    try {
                        if (isUnlocked(nextId)) game.selectedStoryMissionId = nextId;
                    } catch (_) { /* ignore */ }
                    try {
                        showScreen('storyMissionScreen');
                        var hub = game.hubController;
                        if (hub && typeof hub.renderStoryMissionsList === 'function') {
                            hub.renderStoryMissionsList();
                        }
                    } catch (_) { /* ignore */ }
                });
            }
            var goToMenu = document.getElementById('btnGoToMenu');
            if (goToMenu && goToMenu.parentNode === content) content.insertBefore(btn, goToMenu);
            else content.appendChild(btn);
        } catch (_) { /* never throw */ }
    }

    AAA.ready(function (game) {
        if (!game) return;

        try {
            var hub = game.hubController;
            if (hub) {
                AAA.wrap(hub, 'renderStoryMissionsList', function (orig) {
                    var out;
                    try { out = orig(); } catch (e) { out = undefined; }
                    try {
                        refreshProgress();
                        refreshBriefing(game);
                        maybePreselect(game);
                    } catch (_) { /* garnish only */ }
                    return out;
                });
            }
        } catch (_) { /* ignore */ }

        try {
            AAA.wrap(game, 'gameOver', function (orig, victory) {
                var rest = Array.prototype.slice.call(arguments, 2);
                var out;
                try { out = orig.apply(this, [victory].concat(rest)); }
                catch (e) { out = undefined; }
                try {
                    if (victory && game.currentMission && game.currentMission.completed === true) {
                        injectNextButton(game);
                    }
                } catch (_) { /* garnish only */ }
                return out;
            });
        } catch (_) { /* ignore */ }

        try {
            AAA.on('missionComplete', function (data) {
                try {
                    if (typeof AAA.announce !== 'function') return;
                    var stars = (data && Number(data.stars)) || 0;
                    AAA.announce('MISSION COMPLETE', stars > 0 ? '★'.repeat(Math.min(stars, 3)) : '');
                } catch (_) { /* ignore */ }
            });
        } catch (_) { /* ignore */ }
    });
})();
