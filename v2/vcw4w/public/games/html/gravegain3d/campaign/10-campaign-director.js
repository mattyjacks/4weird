/* GraveGain3D Campaign — 10 director.
   Wires campaign extras (registered by m01…m10 via 00-campaign-boot.js)
   into the live run: mission-depth redeploy, requisition buffs, campaign
   damage multiplier, themed boss overrides, star ratings, fail banner.
   All patching goes through AAA.wrap (chain-safe). All DOM access guarded.
   Never throws: every hook body is wrapped in try/catch. */
(function () {
    'use strict';

    function getAAA() {
        try {
            return window.GraveGainAAA || null;
        } catch (_) {
            return null;
        }
    }

    function getCampaign() {
        try {
            return window.GraveGainCampaign || null;
        } catch (_) {
            return null;
        }
    }

    function getExtra(missionId) {
        try {
            var c = getCampaign();
            if (c && typeof c.getExtra === 'function') return c.getExtra(missionId);
        } catch (_) { /* ignore */ }
        return null;
    }

    function showBanner(game, text) {
        try {
            if (game && game.combatText && typeof game.combatText.showBanner === 'function') {
                game.combatText.showBanner(text);
            }
        } catch (_) { /* garnish, never fatal */ }
    }

    // ---- Finale multi-phase boss support (M9 Titan + M10 Lucifer). ----
    // Reads the optional bossPhases array (campaign extra first, then the
    // shared mission def — both are backward-compatible optional fields).
    // Endless mode (no currentMission) is always a no-op.
    var PHASE_THRESHOLDS = [0.66, 0.33];

    function missionPhases(mission, extra) {
        try {
            if (extra && Array.isArray(extra.bossPhases) && extra.bossPhases.length >= 2) return extra.bossPhases;
            if (mission && Array.isArray(mission.bossPhases) && mission.bossPhases.length >= 2) return mission.bossPhases;
        } catch (_) { /* ignore */ }
        return null;
    }

    function spawnPhaseAdds(game, count) {
        try {
            var n = Math.floor(Number(count)) || 0;
            if (n <= 0 || !game || !game.player || !game.scene || !game.enemies) return;
            var EnemyEntity = null;
            try { EnemyEntity = window.GraveGainEnemyEntity || null; } catch (_) { EnemyEntity = null; }
            if (!EnemyEntity) return;
            var theme = game.dungeonTheme || (game.currentMission && game.currentMission.dungeonTheme) || 'citadel_darkness';
            var pool = [];
            try {
                if (typeof EnemyEntity.mobsForTheme === 'function') pool = EnemyEntity.mobsForTheme(theme) || [];
            } catch (_) { pool = []; }
            if (!pool.length) return;
            var scaleMult = 1;
            try {
                if (typeof game.getMissionScaleMult === 'function') scaleMult = Number(game.getMissionScaleMult()) || 1;
            } catch (_) { scaleMult = 1; }
            var px = Number(game.player.x) || 0;
            var pz = (game.player.z !== undefined) ? Number(game.player.z) : (Number(game.player.y) || 0);
            for (var i = 0; i < n; i++) {
                try {
                    var mob = pool[Math.floor(Math.random() * pool.length)];
                    if (!mob) continue;
                    var ang = Math.random() * Math.PI * 2;
                    var dist = 140 + Math.random() * 120;
                    var data = {
                        name: mob.name, hp: (Number(mob.hp) || 30) * scaleMult,
                        dmg: mob.dmg, speed: mob.speed, scale: mob.scale,
                        type: mob.type, armored: mob.armored, elite: mob.elite,
                        isBoss: false
                    };
                    var enemy = new EnemyEntity(data,
                        px + Math.cos(ang) * dist, pz + Math.sin(ang) * dist, scaleMult);
                    try { game.scene.add(enemy.group3d); } catch (_) { /* ignore */ }
                    game.enemies.push(enemy);
                } catch (_) { /* one bad add must not break the phase */ }
            }
        } catch (_) { /* adds are garnish */ }
    }

    function fireBossPhase(game, boss, phase, stage) {
        try {
            var name = (phase && phase.name) ? String(phase.name) : ('PHASE ' + (stage + 1));
            if (typeof AAA_REF.announce === 'function') {
                AAA_REF.announce(name, 'the Array shields him — break it!');
            }
        } catch (_) { /* ignore */ }
        try {
            showBanner(game, '🛡️ ' + ((phase && phase.name) ? phase.name : 'BOSS SHIELDS UP') + ' 🛡️');
        } catch (_) { /* ignore */ }
        try {
            if (game && game.audio && typeof game.audio.playSfx === 'function') {
                game.audio.playSfx('boss_roar');
            }
        } catch (_) { /* ignore */ }
        try {
            spawnPhaseAdds(game, phase && phase.adds);
        } catch (_) { /* ignore */ }
        try {
            if (typeof AAA_REF.emit === 'function') {
                AAA_REF.emit('bossPhase', {
                    id: game.currentMission ? game.currentMission.id : null,
                    stage: stage, name: (phase && phase.name) || null
                });
            }
        } catch (_) { /* ignore */ }
    }

    // Late-bound AAA handle for phase helpers (set in boot).
    var AAA_REF = {
        announce: null,
        emit: null
    };

    function checkBossPhases(game) {
        try {
            if (!game || !game.currentMission) return; // endless mode: no-op
            var boss = game.activeBoss || null;
            if (!boss || boss.hp === undefined || boss.maxHp === undefined) return;
            if (game.player && game.player.isDead) return;
            // New boss (or new mission) → restart the phase ladder.
            try {
                if (game._bossPhaseFor !== boss) {
                    game._bossPhaseFor = boss;
                    game._bossPhaseStage = 0;
                }
            } catch (_) { /* ignore */ }
            var mission = game.currentMission;
            var extra = (mission && mission._campaign) ? mission._campaign : null;
            if (!extra) extra = getExtra(mission.id);
            var phases = missionPhases(mission, extra);
            if (!phases) return;
            var maxHp = Number(boss.maxHp) || 0;
            if (maxHp <= 0) return;
            var frac = (Number(boss.hp) || 0) / maxHp;
            var stage = Number(game._bossPhaseStage) || 0;
            // Stage N fires when the boss drops to/below threshold N-1
            // (stage 1 → 66%, stage 2 → 33%).
            while (stage < PHASE_THRESHOLDS.length && stage < phases.length) {
                var threshold = PHASE_THRESHOLDS[stage];
                if (frac <= threshold) {
                    var phaseIndex = Math.min(stage + 1, phases.length - 1);
                    stage += 1;
                    try { game._bossPhaseStage = stage; } catch (_) { /* ignore */ }
                    fireBossPhase(game, boss, phases[phaseIndex], stage);
                } else {
                    break;
                }
            }
        } catch (_) { /* never break the tick */ }
    }

    // ---- M10 epilogue: fanfare → epilogue dialogue → codex → next prompt. ----
    var EPILOGUE_CODEX = ['lucifer_manifesto', 'human_earth_letter', 'gods_necros_speaks'];

    var EPILOGUE_LINES = [
        { speaker: 'Valley Net', text: 'Array cold. Signal dead. For the first time in the war, MoonRock is QUIET — and it is ours.', portrait: '🤖' },
        { speaker: 'President Angel Good', text: 'To every race that bled for this dawn: the Compact holds. MoonRock is SAVED — now we build.', portrait: '🌿' },
        { speaker: 'Guy Young', text: 'Clint, old soldier — rest now. We all rest now. The living remember, and the graves are silent.', portrait: '👨‍🚀' }
    ];

    function ensureEpilogueCodex(mission) {
        try {
            var ids = EPILOGUE_CODEX.slice();
            try {
                var extra = (mission && mission._campaign) ? mission._campaign : getExtra(mission && mission.id);
                var unlocks = (extra && Array.isArray(extra.loreUnlocks)) ? extra.loreUnlocks : [];
                unlocks.forEach(function (id) {
                    try {
                        var key = String(id);
                        if (ids.indexOf(key) === -1) ids.push(key);
                    } catch (_) { /* ignore */ }
                });
            } catch (_) { /* keep the guaranteed three */ }
            // Drop IDs with no lore entry (nearest-valid-key rule: the three
            // guaranteed IDs all exist; extras are verified at content time).
            try {
                if (window.GraveGainLore && typeof window.GraveGainLore.get === 'function') {
                    ids = ids.filter(function (id) {
                        try { return !!window.GraveGainLore.get(id); }
                        catch (_) { return false; }
                    });
                }
            } catch (_) { /* keep unfiltered */ }
            if (!ids.length || !window.localStorage) return;
            var key = 'gravegain_campaign_codex_v1';
            var have = [];
            try {
                var raw = window.localStorage.getItem(key);
                if (raw) have = (JSON.parse(raw) || {}).unlocked || [];
                if (!Array.isArray(have)) have = [];
            } catch (_) { have = []; }
            var set = {};
            have.forEach(function (x) { try { set[String(x)] = true; } catch (_) {} });
            var changed = false;
            ids.forEach(function (id) {
                try {
                    var lid = String(id);
                    if (!set[lid]) { set[lid] = true; changed = true; }
                } catch (_) { /* ignore */ }
            });
            if (changed) {
                try {
                    window.localStorage.setItem(key, JSON.stringify({ unlocked: Object.keys(set) }));
                } catch (_) { /* ignore */ }
            }
        } catch (_) { /* never throw */ }
    }

    function boot(AAA, game) {
        // (a) initRun: redeploy at mission depth + apply requisition buffs.
        try {
            AAA.wrap(game, 'initRun', function (orig, race, classType) {
                var ret;
                try {
                    ret = orig(race, classType);
                } catch (e) {
                    try { console.warn('[Campaign] initRun orig failed', e); } catch (_) {}
                    return undefined;
                }
                try {
                    var mission = game.currentMission;
                    var extra = (mission && mission._campaign) ? mission._campaign : null;
                    if (!extra && mission) extra = getExtra(mission.id);
                    if (mission && extra) {
                        // Core initRun already deploys at mission depth and
                        // applies requisition — backfill only, so buffs and
                        // dungeon builds never run twice (no stacked HP).
                        try {
                            var depth = Number(mission.minFloor);
                            if (isFinite(depth) && depth >= 1 &&
                                game.floorIndex !== Math.floor(depth)) {
                                game.floorIndex = Math.floor(depth);
                                if (typeof game.buildDungeonLayer === 'function') {
                                    game.buildDungeonLayer();
                                }
                            }
                        } catch (_) { /* keep the orig deployment */ }
                        // Requisition: bonus HP (cap +300) + damage multiplier.
                        try {
                            if (game._campaignReqAppliedFor !== mission.id) {
                                var req = extra.requisition || {};
                                var bonusHp = Number(req.bonusHp) || 0;
                                if (bonusHp > 300) bonusHp = 300;
                                if (bonusHp < 0) bonusHp = 0;
                                var dmgMult = Number(req.dmgMult);
                                if (!isFinite(dmgMult) || dmgMult <= 0) dmgMult = 1;
                                game._campaignDmgMult = dmgMult;
                                game._campaignReqAppliedFor = mission.id;
                                if (bonusHp > 0 && game.player) {
                                    game.player.maxHp = (Number(game.player.maxHp) || 0) + bonusHp;
                                    game.player.hp = (Number(game.player.hp) || 0) + bonusHp;
                                }
                            } else if (game._campaignDmgMult === undefined || game._campaignDmgMult === null) {
                                var fallbackMult = Number((extra.requisition || {}).dmgMult);
                                game._campaignDmgMult = (isFinite(fallbackMult) && fallbackMult > 0) ? fallbackMult : 1;
                            }
                        } catch (_) { /* buffs are garnish */ }
                        // Backfill instance fields the core normally sets.
                        try {
                            if (!game.dungeonTheme) {
                                game.dungeonTheme = mission.dungeonTheme || extra.dungeonTheme || null;
                            }
                        } catch (_) { /* ignore */ }
                        try {
                            if (!game._missionStartTime) {
                                game._missionStartTime = Date.now();
                                if (!game._missionDeaths) game._missionDeaths = 0;
                            }
                        } catch (_) { /* ignore */ }
                        // Announce + event.
                        try {
                            if (typeof AAA.announce === 'function') {
                                AAA.announce(
                                    'MISSION ' + mission.id + ': ' + (mission.title || ''),
                                    extra.threat || ''
                                );
                            }
                        } catch (_) { /* ignore */ }
                        try {
                            if (typeof AAA.emit === 'function') AAA.emit('missionStart', { id: mission.id });
                        } catch (_) { /* ignore */ }
                    } else {
                        try { game._campaignDmgMult = 1; } catch (_) {}
                    }
                } catch (_) { /* never break initRun */ }
                return ret;
            });
        } catch (_) { /* ignore */ }

        // (b) applyHitToEnemy: campaign damage multiplier.
        try {
            AAA.wrap(game, 'applyHitToEnemy', function (orig, enemy, baseDmg, dir) {
                try {
                    var mult = 1;
                    if (game.currentMission) {
                        mult = Number(game._campaignDmgMult);
                        if (!isFinite(mult) || mult <= 0) mult = 1;
                    }
                    return orig(enemy, (Number(baseDmg) || 0) * mult, dir);
                } catch (_) {
                    try { return orig(enemy, baseDmg, dir); } catch (_) { return undefined; }
                }
            });
        } catch (_) { /* ignore */ }

        // (c) buildDungeonLayer: themed boss override.
        try {
            AAA.wrap(game, 'buildDungeonLayer', function (orig) {
                var ret;
                try {
                    ret = orig();
                } catch (e) {
                    try { console.warn('[Campaign] buildDungeonLayer orig failed', e); } catch (_) {}
                    return undefined;
                }
                try {
                    var mission = game.currentMission;
                    var extra = (mission && mission._campaign) ? mission._campaign : null;
                    if (!extra && mission) extra = getExtra(mission.id);
                    var display = extra && extra.bossDisplay;
                    var boss = game.activeBoss;
                    // Core buildDungeonLayer already applied bossType /
                    // bossHpMult / bossDisplay and flags the boss — never
                    // multiply HP a second time.
                    if (display && boss && !boss._campaignBossApplied) {
                        try {
                            if (display.name) boss.name = display.name;
                        } catch (_) { /* ignore */ }
                        try {
                            var el = document.getElementById('bossName');
                            if (el && display.name) el.textContent = display.name;
                        } catch (_) { /* DOM may be missing */ }
                        try {
                            var hpMult = Number(extra.bossHpMult);
                            if (isFinite(hpMult) && hpMult > 0 && boss.maxHp) {
                                boss.maxHp = boss.maxHp * hpMult;
                                boss.hp = boss.maxHp;
                            }
                        } catch (_) { /* ignore */ }
                        try {
                            if (display.banner) showBanner(game, display.banner);
                        } catch (_) { /* ignore */ }
                    }
                } catch (_) { /* never break layer builds */ }
                return ret;
            });
        } catch (_) { /* ignore */ }

        // (c2) Finale phase polling: boss hp 66%/33% → announce + adds +
        // heal-shield visual. Endless mode (no currentMission) is a no-op
        // inside checkBossPhases. Missions without bossPhases are untouched.
        try {
            AAA_REF.announce = (typeof AAA.announce === 'function') ? AAA.announce : null;
            AAA_REF.emit = (typeof AAA.emit === 'function') ? AAA.emit : null;
            if (typeof AAA.onTick === 'function') {
                AAA.onTick(function (dt, tickGame) {
                    try { checkBossPhases(tickGame || game); } catch (_) { /* ignore */ }
                });
            }
        } catch (_) { /* ignore */ }

        // (c3) New run → reset phase ladder + epilogue flag (replay-safe).
        try {
            AAA.wrap(game, 'initRun', function (orig) {
                var args = Array.prototype.slice.call(arguments, 1);
                var out;
                try { out = orig.apply(game, args); } catch (e) { out = undefined; }
                try {
                    game._bossPhaseFor = null;
                    game._bossPhaseStage = 0;
                    game._epiloguePlayed = false;
                } catch (_) { /* ignore */ }
                return out;
            });
        } catch (_) { /* ignore */ }

        // (c4) M10 epilogue: mission-complete fanfare → epilogue dialogue
        // queue → codex unlocks → (game-over screen next/replay prompt is
        // injected by 20-campaign-ui). Guarded: endless mode has no
        // currentMission and never enters here.
        try {
            AAA.wrap(game, 'gameOver', function (orig, victory) {
                var rest = Array.prototype.slice.call(arguments, 1);
                try {
                    var m = game.currentMission;
                    if (victory === true && m && Number(m.id) === 10 && !game._epiloguePlayed) {
                        game._epiloguePlayed = true;
                        try {
                            if (typeof AAA.announce === 'function') {
                                AAA.announce('🌅 MOONROCK IS SAVED 🌅', '★★★ CAMPAIGN COMPLETE ★★★');
                            }
                        } catch (_) { /* ignore */ }
                        try { ensureEpilogueCodex(m); } catch (_) { /* ignore */ }
                        try {
                            if (EPILOGUE_LINES.length && typeof game.playDialogueSequence === 'function') {
                                game.playDialogueSequence(EPILOGUE_LINES, function () {
                                    try { orig.apply(game, rest); } catch (_) {}
                                });
                                try {
                                    if (typeof AAA.emit === 'function') AAA.emit('epilogue', { id: 10 });
                                } catch (_) { /* ignore */ }
                                return undefined;
                            }
                        } catch (_) { /* fall through to orig */ }
                    }
                } catch (_) { /* never break gameOver */ }
                try { return orig.apply(game, rest); }
                catch (_) { return undefined; }
            });
        } catch (_) { /* ignore */ }

        // (d) completeMission: star rating. The core runtime passes a
        // time-vs-par + deaths rating — honor it; compute the legacy
        // time + accuracy fallback only when the caller gives no stars.
        // Emits are deduped: the core also emits missionComplete, and the
        // codex/UI listeners are not idempotent announcers.
        try {
            var Engine = window.GraveGainStoryEngine;
            var lastEmit = null;
            if (Engine && typeof Engine.completeMission === 'function') {
                AAA.wrap(Engine, 'completeMission', function (orig, missionId, stars) {
                    var computed;
                    var given = Number(stars);
                    if (isFinite(given) && given >= 1 && given <= 3) {
                        computed = Math.round(given);
                    } else {
                        computed = 3;
                        try {
                            var extra = getExtra(missionId);
                            var st = (AAA && AAA.state) ? AAA.state : {};
                            var shots = Number(st.shots) || 0;
                            var hits = Number(st.hits) || 0;
                            var acc = hits / Math.max(1, shots);
                            var par = extra ? Number(extra.parSeconds) : NaN;
                            if (isFinite(par) && par > 0) {
                                var runStart = Number(st.runStart) || Number(game._missionStartTime) || 0;
                                if (runStart > 0 && (Date.now() - runStart) > par * 1000) computed -= 1;
                            }
                            if (acc < 0.25) computed -= 1;
                            var deaths = Number(game._missionDeaths) || 0;
                            if (deaths > 0) computed -= Math.min(deaths, 2);
                            if (computed < 1) computed = 1;
                            if (computed > 3) computed = 3;
                        } catch (_) {
                            computed = 3;
                        }
                    }
                    try {
                        orig(missionId, computed);
                    } catch (e) {
                        try { console.warn('[Campaign] completeMission orig failed', e); } catch (_) {}
                    }
                    try {
                        if (typeof AAA.emit === 'function') {
                            var now = Date.now();
                            var dup = lastEmit && lastEmit.id === missionId &&
                                lastEmit.stars === computed && (now - lastEmit.t) < 5000;
                            if (!dup) {
                                lastEmit = { id: missionId, stars: computed, t: now };
                                AAA.emit('missionComplete', { id: missionId, stars: computed });
                            }
                        }
                    } catch (_) { /* ignore */ }
                });
            }
        } catch (_) { /* ignore */ }

        // (e) runEnd defeat: fail banner on campaign runs.
        try {
            if (typeof AAA.on === 'function') {
                AAA.on('runEnd', function (data) {
                    try {
                        var defeated = (data && data.victory === false) || data === false;
                        if (!defeated) return;
                        if (!game.currentMission) return;
                        showBanner(game, 'MISSION FAILED — retry from the campaign log');
                    } catch (_) { /* ignore */ }
                });
            }
        } catch (_) { /* ignore */ }
    }

    // Defer everything until the live game instance exists.
    try {
        var AAA = getAAA();
        if (AAA && typeof AAA.ready === 'function') {
            AAA.ready(function (game) {
                try {
                    if (!game) return;
                    boot(AAA, game);
                } catch (e) {
                    try { console.warn('[Campaign] director boot failed', e); } catch (_) {}
                }
            });
        }
    } catch (_) { /* never throw during boot */ }
})();
