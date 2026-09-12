/* GraveGain2D Campaign — 10 director.
   Wires campaign extras (registered by m01…m10 via 00-campaign-boot.js)
   into the live 2D run: mission-depth redeploy, requisition buffs,
   campaign damage multiplier, themed boss overrides, star ratings,
   fail banner.
   Mirrors gravegain3d/campaign/10-campaign-director.js, adapted for 2D:
   - 2D has no AAA bus and game.js is a closed IIFE, so this patches the
     live window.GraveGainGame INSTANCE (own-property shadowing — the
     prototype is untouched and endless mode is unaffected).
   - 2D rebuild function is buildDungeonLayer (same name as 3D).
   - 2D damage hooks are triggerMeleeSwing (fixed 8 melee) and
     dealAoEDamage(x, y, radius, dmg) (abilities); melee bonus damage is
     applied as a guarded post-pass in the same arc.
   - 2D player HP API is player.maxHp / player.hp.
   - 2D has no combatText.showBanner / boss bar: banners render into a
     lightweight #campBanner div (styled by campaign/css).
   Every hook body is wrapped in try/catch and feature-detects before
   touching anything. Never throws. */
(function () {
    'use strict';

    var INSTANCE_FLAG = '__gg2dCampaignPatched';
    var ENGINE_FLAG = '__gg2dStarsWrapped';
    var MELEE_BASE_DMG = 8;
    var MAX_BONUS_HP = 300;

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

    function extraForRun(game) {
        try {
            var mission = game ? game.currentMission : null;
            if (!mission) return null;
            if (mission._campaign) return mission._campaign;
            return getExtra(mission.id);
        } catch (_) {
            return null;
        }
    }

    function damageMult(game) {
        try {
            if (!game || !game.currentMission) return 1;
            var m = Number(game._campaignDmgMult);
            if (!isFinite(m) || m <= 0) return 1;
            return m;
        } catch (_) {
            return 1;
        }
    }

    function ensureBanner() {
        try {
            var el = document.getElementById('campBanner');
            if (el) return el;
            el = document.createElement('div');
            el.id = 'campBanner';
            el.className = 'hidden';
            document.body.appendChild(el);
            return el;
        } catch (_) {
            return null;
        }
    }

    var bannerTimer = null;

    function showBanner(text) {
        try {
            if (!text) return;
            var el = ensureBanner();
            if (!el) return;
            el.textContent = String(text);
            el.classList.remove('hidden');
            try {
                if (bannerTimer) clearTimeout(bannerTimer);
            } catch (_) { /* ignore */ }
            try {
                bannerTimer = setTimeout(function () {
                    try { el.classList.add('hidden'); } catch (_) { /* ignore */ }
                }, 4500);
            } catch (_) { /* ignore */ }
        } catch (_) { /* garnish, never fatal */ }
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

    // Shadow an instance method with a guarded wrapper. The wrapper
    // receives (boundOrig, argsArray). Any throw inside handler falls
    // back to the original call so the game can never break.
    function wrapInstance(game, name, handler) {
        try {
            if (!game || alreadyPatched(game, name)) return false;
            var orig = game[name];
            if (typeof orig !== 'function') return false;
            var bound = orig.bind(game);
            game[name] = function () {
                var args = Array.prototype.slice.call(arguments);
                try {
                    return handler.call(this, bound, args);
                } catch (_) {
                    try {
                        return bound.apply(null, args);
                    } catch (_) {
                        return undefined;
                    }
                }
            };
            markPatched(game, name);
            return true;
        } catch (_) {
            return false;
        }
    }

    function applyRequisition(game, extra) {
        try {
            var req = (extra && extra.requisition) || {};
            var bonusHp = Number(req.bonusHp) || 0;
            if (bonusHp > MAX_BONUS_HP) bonusHp = MAX_BONUS_HP;
            if (bonusHp < 0) bonusHp = 0;
            var dmgMult = Number(req.dmgMult);
            if (!isFinite(dmgMult) || dmgMult <= 0) dmgMult = 1;
            try { game._campaignDmgMult = dmgMult; } catch (_) { /* ignore */ }
            // 2D API: player.maxHp / player.hp (fresh PlayerEntity per
            // initRun, so no double-apply across restarts).
            if (bonusHp > 0 && game.player) {
                try {
                    game.player.maxHp = (Number(game.player.maxHp) || 0) + bonusHp;
                    game.player.hp = (Number(game.player.hp) || 0) + bonusHp;
                } catch (_) { /* ignore */ }
            }
            // Reset per-run accuracy + timing stats for the star rating.
            try {
                game._campaignShots = 0;
                game._campaignHits = 0;
                game._campaignRunStart = Date.now();
            } catch (_) { /* ignore */ }
            if (typeof game.updateHUD === 'function') {
                try { game.updateHUD(); } catch (_) { /* ignore */ }
            }
        } catch (_) { /* buffs are garnish */ }
    }

    function boot(game) {
        // (a) initRun: redeploy at mission depth + apply requisition buffs.
        try {
            wrapInstance(game, 'initRun', function (orig, args) {
                var ret;
                try {
                    ret = orig.apply(null, args);
                } catch (e) {
                    try { console.warn('[Campaign2D] initRun orig failed', e); } catch (_) {}
                    return undefined;
                }
                try {
                    var mission = game.currentMission;
                    var extra = (mission && mission._campaign) ? mission._campaign : null;
                    if (!extra && mission) extra = getExtra(mission.id);
                    // Keep the clone self-describing for later hooks.
                    if (mission && extra && !mission._campaign) {
                        try { mission._campaign = extra; } catch (_) { /* ignore */ }
                    }
                    if (mission && extra) {
                        // Redeploy at mission depth (2D rebuild fn).
                        try {
                            var depth = Number(mission.minFloor);
                            if (isFinite(depth) && depth >= 1) {
                                game.floorIndex = Math.floor(depth);
                                if (typeof game.buildDungeonLayer === 'function') {
                                    game.buildDungeonLayer();
                                }
                            }
                        } catch (_) { /* keep the orig deployment */ }
                        applyRequisition(game, extra);
                        try {
                            var label = 'MISSION ' + mission.id + ': ' + (mission.title || '');
                            var threat = extra.threat || '';
                            showBanner(threat ? (label + ' — ' + threat) : label);
                        } catch (_) { /* ignore */ }
                    } else {
                        try { game._campaignDmgMult = 1; } catch (_) { /* ignore */ }
                    }
                } catch (_) { /* never break initRun */ }
                return ret;
            });
        } catch (_) { /* ignore */ }

        // (b) triggerMeleeSwing: accuracy stats + campaign damage bonus.
        // 2D melee damage is a hardcoded 8 inside the method, so the
        // multiplier is applied as a guarded post-pass over the same arc.
        try {
            wrapInstance(game, 'triggerMeleeSwing', function (orig, args) {
                var hits = 0;
                try {
                    if (game.currentMission) {
                        game._campaignShots = (Number(game._campaignShots) || 0) + 1;
                    }
                } catch (_) { /* ignore */ }
                try {
                    hits = orig.apply(null, args);
                } catch (_) {
                    hits = 0;
                }
                try {
                    if (game.currentMission) {
                        game._campaignHits = (Number(game._campaignHits) || 0) + (Number(hits) || 0);
                    }
                } catch (_) { /* ignore */ }
                try {
                    var mult = damageMult(game);
                    if (mult > 1 && (Number(hits) || 0) > 0 && game.player && Array.isArray(game.enemies)) {
                        var bonus = MELEE_BASE_DMG * (mult - 1);
                        var angle = game.player.angle;
                        var px = game.player.x;
                        var py = game.player.y;
                        var sweepRadius = 65;
                        var arc = (Math.PI * 120) / 360;
                        game.enemies.forEach(function (e) {
                            try {
                                if (!e || e.hp <= 0) return;
                                var dx = e.x - px;
                                var dy = e.y - py;
                                if (Math.hypot(dx, dy) > sweepRadius) return;
                                var targetAngle = Math.atan2(dy, dx);
                                var diff = Math.abs(angle - targetAngle);
                                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                                if (diff <= arc) e.hp -= bonus;
                            } catch (_) { /* one bad enemy must not break the rest */ }
                        });
                    }
                } catch (_) { /* bonus is garnish; base damage already applied */ }
                return hits;
            });
        } catch (_) { /* ignore */ }

        // (c) dealAoEDamage: campaign damage multiplier (clean hook — dmg
        // is a parameter). Covers ELF nature burst / ORC rage burst.
        try {
            wrapInstance(game, 'dealAoEDamage', function (orig, args) {
                try {
                    var mult = damageMult(game);
                    if (mult !== 1 && args.length >= 4) {
                        var scaled = args.slice();
                        scaled[3] = (Number(scaled[3]) || 0) * mult;
                        return orig.apply(null, scaled);
                    }
                } catch (_) { /* fall through to orig args */ }
                try {
                    return orig.apply(null, args);
                } catch (_) {
                    return undefined;
                }
            });
        } catch (_) { /* ignore */ }

        // (d) buildDungeonLayer: themed boss override (rename + HP
        // multiplier + banner). 2D spawns a generic boss-type enemy via
        // populateMissionTargets; the override runs post-build.
        try {
            wrapInstance(game, 'buildDungeonLayer', function (orig, args) {
                var ret;
                try {
                    ret = orig.apply(null, args);
                } catch (e) {
                    try { console.warn('[Campaign2D] buildDungeonLayer orig failed', e); } catch (_) {}
                    return undefined;
                }
                try {
                    var extra = extraForRun(game);
                    var display = extra && extra.bossDisplay;
                    if (display && Array.isArray(game.enemies)) {
                        game.enemies.forEach(function (boss) {
                            try {
                                if (!boss || boss.type !== 'boss') return;
                                if (display.name) boss.name = display.name;
                                var hpMult = Number(extra.bossHpMult);
                                if (isFinite(hpMult) && hpMult > 0 && boss.maxHp) {
                                    boss.maxHp = boss.maxHp * hpMult;
                                    boss.hp = boss.maxHp;
                                }
                            } catch (_) { /* keep going */ }
                        });
                        if (display.banner) showBanner(display.banner);
                    }
                } catch (_) { /* never break layer builds */ }
                return ret;
            });
        } catch (_) { /* ignore */ }

        // (e) gameOver: fail banner on campaign defeats.
        try {
            wrapInstance(game, 'gameOver', function (orig, args) {
                var ret;
                try {
                    ret = orig.apply(null, args);
                } catch (e) {
                    try { console.warn('[Campaign2D] gameOver orig failed', e); } catch (_) {}
                    return undefined;
                }
                try {
                    var victory = args.length > 0 ? args[0] : false;
                    if (victory === false && game.currentMission) {
                        showBanner('MISSION FAILED — retry from the campaign log');
                    }
                } catch (_) { /* garnish only */ }
                return ret;
            });
        } catch (_) { /* ignore */ }

        // (f) completeMission: star rating from time + accuracy.
        // Wraps the shared engine statically (chain-safe: captures the
        // current function so the codex wrapper applied later chains).
        try {
            var Engine = window.GraveGainStoryEngine;
            if (Engine && typeof Engine.completeMission === 'function' && !Engine[ENGINE_FLAG]) {
                var engineOrig = Engine.completeMission.bind(Engine);
                var wrapped = function (missionId, stars) {
                    var computed = 3;
                    try {
                        var extra = getExtra(missionId);
                        var g = null;
                        try { g = window.GraveGainGame || null; } catch (_) { g = null; }
                        var shots = g ? (Number(g._campaignShots) || 0) : 0;
                        var hits = g ? (Number(g._campaignHits) || 0) : 0;
                        var acc = hits / Math.max(1, shots);
                        var par = extra ? Number(extra.parSeconds) : NaN;
                        if (isFinite(par) && par > 0 && g) {
                            var runStart = Number(g._campaignRunStart) || Number(g.sessionStart) || 0;
                            if (runStart > 0 && (Date.now() - runStart) > par * 1000) computed -= 1;
                        }
                        if (shots > 0 && acc < 0.25) computed -= 1;
                        if (computed < 1) computed = 1;
                        if (computed > 3) computed = 3;
                    } catch (_) {
                        computed = 3;
                    }
                    try {
                        void stars; // caller-supplied stars are superseded by the campaign rating
                        engineOrig(missionId, computed);
                    } catch (e) {
                        try { console.warn('[Campaign2D] completeMission orig failed', e); } catch (_) {}
                    }
                    try {
                        if (computed > 0) showBanner('MISSION COMPLETE ' + '★'.repeat(Math.min(computed, 3)));
                    } catch (_) { /* ignore */ }
                };
                try { wrapped[ENGINE_FLAG] = true; } catch (_) { /* ignore */ }
                Engine.completeMission = wrapped;
            }
        } catch (_) { /* ignore */ }
    }

    // 2D game.js builds the live instance on DOMContentLoaded; patch as
    // soon as it exists (poll briefly — never throw, never busy-loop).
    function waitForGame() {
        try {
            var game = window.GraveGainGame || null;
            if (game && typeof game.initRun === 'function') {
                try {
                    boot(game);
                } catch (e) {
                    try { console.warn('[Campaign2D] director boot failed', e); } catch (_) {}
                }
                return;
            }
        } catch (_) { /* keep polling */ }
        try {
            var tries = 0;
            var timer = setInterval(function () {
                tries += 1;
                try {
                    var g = window.GraveGainGame || null;
                    if (g && typeof g.initRun === 'function') {
                        clearInterval(timer);
                        try {
                            boot(g);
                        } catch (e) {
                            try { console.warn('[Campaign2D] director boot failed', e); } catch (_) {}
                        }
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
