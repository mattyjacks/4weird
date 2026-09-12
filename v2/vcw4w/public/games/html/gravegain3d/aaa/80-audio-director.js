/* GraveGain3D AAA — 80 audio director.
   Adaptive music intensity: the ambient bed swells in combat and settles
   while exploring. Voice lines are rationed to moments that earn them —
   godlike streaks and warden slays — so TTS never talks over the game. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const COMBAT_VOLUME = 0.5;
    const EXPLORE_VOLUME = 0.22;
    const LERP = 0.06;
    const AWARE_RADIUS = 350;

    // v3.0.0 campaign: per-mission dungeonTheme base beds. Only the
    // SoundEngine musicVolume scalar is driven — no new audio assets.
    // citadel_darkness runs hot (dread bed); elven_grove stays ambient.
    const THEME_BASE = {
        elven_grove: 0.16,
        stone_crypt: 0.20,
        metallic_ship: 0.22,
        dwarven_vault: 0.24,
        toxic_catacombs: 0.26,
        orc_wastes: 0.30,
        citadel_darkness: 0.32
    };
    const BOSS_FLOOR = 0.55;
    const CITADEL_BOSS_FLOOR = 0.65;

    function themeOf(game) {
        try {
            const m = game && game.currentMission;
            if (m && typeof m.dungeonTheme === 'string') return m.dungeonTheme;
        } catch (_) { /* ignore */ }
        return null;
    }

    function sting(game, type, pitch) {
        try {
            const audio = game && game.audio;
            if (audio && typeof audio.playSfx === 'function') audio.playSfx(type, pitch || 1.0);
        } catch (_) { /* garnish, never fatal */ }
    }

    AAA.ready((game) => {
        let acc = 0;

        AAA.onTick((dt, game) => {
            acc += dt;
            if (acc < 0.5) return;
            acc = 0;

            const audio = game.audio;
            if (!audio || typeof audio.musicVolume !== 'number') return;
            if (game.isPaused || !game.player || game.player.isDead) return;

            let danger = 0;
            try {
                const p = game.player;
                for (const e of game.enemies || []) {
                    if (e.hp !== undefined && e.hp <= 0) continue;
                    if (Math.hypot((e.x || 0) - p.x, (e.y || 0) - p.y) < AWARE_RADIUS) danger += 1;
                }
                if (game.activeBoss) danger += 2;
            } catch (_) { danger = 0; }

            let target = danger > 0 ? COMBAT_VOLUME : EXPLORE_VOLUME;
            // Campaign theme bed: explore volume follows the dungeon theme.
            try {
                const theme = themeOf(game);
                if (theme && THEME_BASE[theme] !== undefined) {
                    const bed = THEME_BASE[theme];
                    if (danger > 0) {
                        // Combat swells from the theme bed toward the combat peak.
                        target = Math.max(target, Math.min(COMBAT_VOLUME, bed + 0.18));
                    } else {
                        target = bed;
                    }
                    // Boss presence overrides: citadel_darkness + boss = intense.
                    if (game.activeBoss) {
                        target = theme === 'citadel_darkness'
                            ? Math.max(target, CITADEL_BOSS_FLOOR)
                            : Math.max(target, BOSS_FLOOR);
                    }
                    // elven_grove stays ambient even in combat: cap the swell.
                    if (theme === 'elven_grove' && !game.activeBoss) {
                        target = Math.min(target, 0.34);
                    }
                } else if (game.activeBoss) {
                    target = Math.max(target, BOSS_FLOOR);
                }
            } catch (_) { /* keep the danger-based target */ }
            if (game.player.maxHp > 0 && game.player.hp / game.player.maxHp < 0.32) {
                target = Math.min(0.65, target + 0.12); // low HP: the mix leans in
            }
            audio.musicVolume += (target - audio.musicVolume) * LERP;
        });

        AAA.on('streak', ({ n, main }) => {
            if (n === 5) AAA.say(game, 'Rampage!');
            else if (n >= 8 && main) AAA.say(game, 'Godlike!');
        });

        AAA.on('bossDown', () => AAA.say(game, 'Warden destroyed. Well done.'));
        AAA.on('bossDown', () => { sting(game, 'boss_roar'); sting(game, 'explode'); });

        AAA.on('missionStart', () => { sting(game, 'spell', 0.9); });
        AAA.on('missionComplete', () => { sting(game, 'levelup'); });
    });
})();
