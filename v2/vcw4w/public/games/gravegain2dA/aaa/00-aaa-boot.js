/* GraveGain2D AAA - 00 boot.
   Namespace, event bus, ready-queue, method-wrap helper, shared ticker.
   2D adaptation of the GraveGain3D presentation layer: no Three.js, all
   overlays are DOM inside #canvasContainer, canvas FX go through the
   game's ParticleSystem. Every other aaa/*.js file builds on
   window.GraveGainAAA defined here. Load this file FIRST. */
(function () {
    'use strict';

    if (window.GraveGainAAA && window.GraveGainAAA.__boot) return;

    const AAA = (window.GraveGainAAA = {
        __boot: true,
        adapt: '2d',
        version: '2.0.0',
        _game: null,
        _readyQueue: [],
        _tickers: [],
        _events: Object.create(null),

        // Shared run state. Individual modules own the fields they update.
        state: {
            runStart: 0, // Date.now() of current run start
            floor: 1,
            shots: 0, // melee swings this run
            hits: 0, // confirmed melee hits this run
            maxCombo: 0,
            streak: 0
        },

        // Run fn(game) as soon as the live GraveGainGame instance exists.
        ready(fn) {
            if (this._game) {
                try { fn(this._game); } catch (e) { console.warn('[AAA]', e); }
                return;
            }
            this._readyQueue.push(fn);
        },

        // Register a per-frame callback: fn(dtSeconds, game).
        onTick(fn) { this._tickers.push(fn); },

        // Tiny pub/sub between AAA modules. Events: runStart, runEnd, floor,
        // hit, kill, streak, combo, hurt, heal, bossIntro, bossDown,
        // missionCard, missionStart, missionComplete.
        on(evt, fn) { (this._events[evt] = this._events[evt] || []).push(fn); },
        emit(evt, data) {
            const list = this._events[evt];
            if (!list) return;
            for (const fn of list) {
                try { fn(data); } catch (e) { console.warn('[AAA]', e); }
            }
        },

        // Chain-safe method patch: wrapper(originalBound, ...args).
        // Multiple AAA modules may wrap the same method; each wraps the last.
        wrap(obj, method, wrapper) {
            if (!obj) return false;
            const current = obj[method];
            if (typeof current !== 'function') return false;
            obj[method] = function (...args) {
                return wrapper.call(this, current.bind(this), ...args);
            };
            return true;
        },

        // Create-or-reuse an overlay element by id.
        mk(id, cls, parent) {
            let el = document.getElementById(id);
            if (el) return el;
            el = document.createElement('div');
            el.id = id;
            if (cls) el.className = cls;
            const host = parent || document.getElementById('canvasContainer') || document.body;
            host.appendChild(el);
            return el;
        },

        container() { return document.getElementById('canvasContainer'); },

        // 2D sound: AudioController.play(name). Pitch arg accepted, ignored.
        sfx(game, name) {
            try {
                if (game && game.audio && typeof game.audio.play === 'function') {
                    game.audio.play(name);
                }
            } catch (_) { /* audio is garnish, never fatal */ }
        },

        // 2D voice: AudioController.speakFallback(text).
        say(game, text) {
            try {
                if (game && game.audio && typeof game.audio.speakFallback === 'function') {
                    game.audio.speakFallback(text);
                }
            } catch (_) { /* TTS is garnish, never fatal */ }
        }
    });

    function drain(game) {
        AAA._game = game;
        const queue = AAA._readyQueue.splice(0);
        for (const fn of queue) {
            try { fn(game); } catch (e) { console.warn('[AAA] module init failed', e); }
        }
    }

    function startLoop() {
        let last = performance.now();
        const frame = (t) => {
            const dt = Math.min((t - last) / 1000, 0.1);
            last = t;
            const game = AAA._game;
            if (game) {
                for (const fn of AAA._tickers.slice()) {
                    try { fn(dt, game); } catch (e) { console.warn('[AAA] tick failed', e); }
                }
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }

    function boot() {
        let tries = 0;
        const timer = setInterval(() => {
            tries += 1;
            if (window.GraveGainGame) {
                clearInterval(timer);
                drain(window.GraveGainGame);
                startLoop();
            } else if (tries >= 80) {
                clearInterval(timer);
                console.warn('[AAA] GraveGainGame not found; presentation layer idle.');
            }
        }, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
