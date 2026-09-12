/* GraveGain2D AAA — 80 audio director.
   2D adaptation: extends (never replaces) the existing AudioController.
   The 2D controller has play(name) + speakFallback(text) and no music bed,
   so intensity is expressed three ways: (1) a gain scalar applied around
   every play() call — combat hits harder, exploration sits back, boss
   fights run hot; (2) a low-HP heartbeat thump on a timer; (3) rationed
   voice lines (rampage / godlike / boss slay / victory / defeat) plus
   victory/defeat stinger sequences built from existing SFX names. */
(function () {
    'use strict';

    const AAA = window.GraveGainAAA;
    if (!AAA) return;

    const AWARE_RADIUS = 380;
    const HEARTBEAT_MS = 1100;

    const GAIN = { explore: 0.7, combat: 1.0, boss: 1.2 };
    AAA._audioGain = GAIN.explore;
    AAA._audioMood = 'explore';

    function sting(game, type) {
        try {
            const audio = game && game.audio;
            if (audio && typeof audio.play === 'function') audio.play(type);
        } catch (_) { /* garnish, never fatal */ }
    }

    AAA.ready((game) => {
        // Extend the prototype once: scale masterVolume for the duration of
        // each play() call, restoring it afterwards. Chain-safe with any
        // other wrapper — we call through to whatever is current.
        try {
            const proto = game.audio && Object.getPrototypeOf(game.audio);
            if (proto && typeof proto.play === 'function' && !proto.__aaaGainWrapped) {
                const prev = proto.play;
                proto.__aaaGainWrapped = true;
                proto.play = function (name) {
                    const g = (window.GraveGainAAA && window.GraveGainAAA._audioGain) || 1;
                    if (g === 1) return prev.call(this, name);
                    const m = this.masterVolume;
                    this.masterVolume = Math.max(0, Math.min(1, m * g));
                    try {
                        return prev.call(this, name);
                    } finally {
                        this.masterVolume = m;
                    }
                };
            }
        } catch (_) { /* extension is garnish */ }

        let acc = 0;
        let heartbeatAt = 0;

        AAA.onTick((dt, game) => {
            acc += dt;
            if (acc < 0.5) return;
            acc = 0;

            const audio = game.audio;
            if (!audio || !game.player || game.player.isDead) return;
            if (game.loop && game.loop.isPaused) return;

            let danger = 0;
            let bossNear = false;
            try {
                const p = game.player;
                for (const e of game.enemies || []) {
                    if (e.hp !== undefined && e.hp <= 0) continue;
                    if (e.type === 'boss') bossNear = true;
                    if (Math.hypot((e.x || 0) - p.x, (e.y || 0) - p.y) < AWARE_RADIUS) danger += 1;
                }
            } catch (_) { danger = 0; }

            const lowHp = game.player.maxHp > 0 && game.player.hp / game.player.maxHp < 0.32;
            const mood = bossNear ? 'boss' : (danger > 0 ? 'combat' : 'explore');
            AAA._audioMood = mood;
            AAA._audioGain = lowHp && mood === 'explore' ? 0.9 : GAIN[mood];

            // Low-HP heartbeat: a low thump on a steady timer.
            if (lowHp) {
                const now = Date.now();
                if (now - heartbeatAt > HEARTBEAT_MS) {
                    heartbeatAt = now;
                    sting(game, 'block');
                }
            }
        });

        // Rationed voice: only moments that earn it, so TTS never talks
        // over the game.
        AAA.on('streak', ({ n, main }) => {
            if (n === 5) AAA.say(game, 'Rampage!');
            else if (n >= 8 && main) AAA.say(game, 'Godlike!');
        });

        AAA.on('bossDown', () => AAA.say(game, 'Warden destroyed. Well done.'));
        AAA.on('bossDown', () => { sting(game, 'ability'); setTimeout(() => sting(game, 'loot'), 300); });

        AAA.on('missionStart', () => { sting(game, 'ability'); });
        AAA.on('missionComplete', () => { sting(game, 'loot'); });

        AAA.on('runEnd', ({ victory }) => {
            if (victory) {
                AAA.say(game, 'Run completed. The depths yield.');
                sting(game, 'loot');
                setTimeout(() => sting(game, 'ability'), 250);
                setTimeout(() => sting(game, 'loot'), 500);
            } else {
                AAA.say(game, 'Run terminated.');
                sting(game, 'hit');
                setTimeout(() => sting(game, 'hit'), 350);
            }
        });
    });
})();
