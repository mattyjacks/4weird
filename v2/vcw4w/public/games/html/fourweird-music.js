/* fourweird-music.js - vanilla 4W-1 music/SFX bridge for ALL 4weird HTML games.
 *
 * Zero dependencies, no assets, oscillator (+buffered noise) + gain only.
 * Lazy AudioContext (created on first play call, resumed if suspended).
 * IIFE, idempotent window.FourWeirdMusic guard, fail-open, never throws.
 * ASCII-only. 4W-1 contract (see DS-MUS-01):
 *   Song4W = { v:1, title:string, bpm:40-240, tracks:Track4W[<=8] }
 *   Track4W = { wave:'square'|'saw'|'tri'|'sine'|'noise', vol?:0..1,
 *               notes:Note4W[<=512] }
 *   Note4W = { t:start beats, n:MIDI 0-127, d:len beats, v?:0..1 }
 *   song JSON <= 8192 bytes.
 *   Sfx4W = { v:1, name, kind:'raygun'|'death'|'putt'|'coin'|'hit'|'jump'|
 *             'win'|'lose'|'click'|'alarm',
 *             steps:[{ wave, freq, freqEnd, dur, vol, type:'tone'|'noise' }] }
 *   sfx JSON <= 1024 bytes.
 *
 * Usage (absolute /games/html/ reference only; mirrors fourweird-workers.js):
 *   <script src="/games/html/fourweird-music.js"></script>
 *   var M = window.FourweirdMusic;   // canonical (alias: window.FourWeirdMusic)
 *   M.playSong(song);                // direct Song4W object; invalid -> silent false
 *   M.playSong({ $music: 1, song: song }); // inline $music:1 wrapper, unwrapped
 *   M.playSong('/music/seeds/xxx.json');  // seed URL, fetch fail-open -> silent false
 *   M.playSongJson(jsonText);    // standalone parser: string -> song -> play
 *   M.stopSong();                // (alias: M.stop())
 *   M.playSfx('raygun');         // baked kind name, Sfx4W object, or Sfx4W JSON text
 *   M.playSfxJson(jsonText);
 *   M.setVolumes({ master:0.8, music:0.5, sfx:0.8 });
 *   M.setMuted(true);
 *
 * Pattern mirrors (read-only reference, not imported):
 *   gravegain1d/game.js beep/sfx (lazy AC, osc+gain, try/catch garnish)
 *   gravegain3d/audio/sound-engine.js (initCtx/playSfx/volumes shape)
 */
(function () {
    'use strict';

    try {
        if (typeof window === 'undefined') return;
        if (window.FourWeirdMusic) return;

        var SONG_MAX_BYTES = 8192;
        var SFX_MAX_BYTES = 1024;
        var MAX_TRACKS = 8;
        var MAX_NOTES = 512;
        var SONG_WAVES = { square: 1, saw: 1, tri: 1, sine: 1, noise: 1 };
        var SFX_KINDS = {
            raygun: 1, death: 1, putt: 1, coin: 1, hit: 1,
            jump: 1, win: 1, lose: 1, click: 1, alarm: 1
        };
        var STEP_TYPES = { tone: 1, noise: 1 };

        var AC = null;
        var MUTED = false;
        var masterVolume = 0.8;
        var musicVolume = 0.5;
        var sfxVolume = 0.8;

        var songNodes = [];
        var songTimers = [];
        var loopTimer = null;
        var currentSong = null;
        var currentOpts = null;

        function clampNum(x, lo, hi, def) {
            try {
                if (typeof x !== 'number' || !isFinite(x)) return def;
                if (x < lo) return lo;
                if (x > hi) return hi;
                return x;
            } catch (e) { return def; }
        }

        function isStr(x) {
            try { return typeof x === 'string' && x.length > 0; } catch (e) { return false; }
        }

        function jsonSize(x) {
            try { return JSON.stringify(x).length; } catch (e) { return 1e9; }
        }

        /* Lazy AudioContext: same hook shape as sound-engine initCtx. */
        function initCtx() {
            try {
                if (AC) {
                    try { if (AC.state === 'suspended') AC.resume(); } catch (e) {}
                    return AC;
                }
                var Ctor = window.AudioContext || window.webkitAudioContext;
                if (!Ctor) return null;
                AC = new Ctor();
                try { if (AC.state === 'suspended') AC.resume(); } catch (e) {}
                return AC;
            } catch (e) { return null; }
        }

        function midi2freq(n) {
            try { return 440 * Math.pow(2, (n - 69) / 12); } catch (e) { return 440; }
        }

        function mapWave(w) {
            try {
                if (w === 'saw') return 'sawtooth';
                if (w === 'tri') return 'triangle';
                if (w === 'sine') return 'sine';
                return 'square';
            } catch (e) { return 'square'; }
        }

        function validateNote(nt) {
            try {
                if (!nt || typeof nt !== 'object') return false;
                if (typeof nt.t !== 'number' || !isFinite(nt.t) || nt.t < 0 || nt.t > 1e6) return false;
                if (typeof nt.n !== 'number' || Math.floor(nt.n) !== nt.n || nt.n < 0 || nt.n > 127) return false;
                if (typeof nt.d !== 'number' || !isFinite(nt.d) || nt.d <= 0 || nt.d > 1e6) return false;
                if (nt.v !== undefined && (typeof nt.v !== 'number' || nt.v < 0 || nt.v > 1)) return false;
                return true;
            } catch (e) { return false; }
        }

        function validateTrack(tr) {
            try {
                if (!tr || typeof tr !== 'object') return false;
                if (!SONG_WAVES[tr.wave]) return false;
                if (tr.vol !== undefined && (typeof tr.vol !== 'number' || tr.vol < 0 || tr.vol > 1)) return false;
                if (!Array.isArray(tr.notes) || tr.notes.length > MAX_NOTES) return false;
                for (var i = 0; i < tr.notes.length; i++) {
                    if (!validateNote(tr.notes[i])) return false;
                }
                return true;
            } catch (e) { return false; }
        }

        /* Fail-closed allow-list validation, budgeted sizes; invalid -> false. */
        function validateSong(song) {
            try {
                if (!song || typeof song !== 'object' || Array.isArray(song)) return false;
                if (song.v !== 1) return false;
                if (!isStr(song.title)) return false;
                if (typeof song.bpm !== 'number' || song.bpm < 40 || song.bpm > 240) return false;
                if (!Array.isArray(song.tracks) || song.tracks.length < 1 || song.tracks.length > MAX_TRACKS) return false;
                for (var i = 0; i < song.tracks.length; i++) {
                    if (!validateTrack(song.tracks[i])) return false;
                }
                if (jsonSize(song) > SONG_MAX_BYTES) return false;
                return true;
            } catch (e) { return false; }
        }

        function validateStep(st) {
            try {
                if (!st || typeof st !== 'object') return false;
                if (st.type !== undefined && !STEP_TYPES[st.type]) return false;
                if (st.wave !== undefined && typeof st.wave !== 'string') return false;
                if (typeof st.freq !== 'number' || !isFinite(st.freq) || st.freq < 20 || st.freq > 8000) return false;
                if (st.freqEnd !== undefined && (typeof st.freqEnd !== 'number' || !isFinite(st.freqEnd) || st.freqEnd < 20 || st.freqEnd > 8000)) return false;
                if (typeof st.dur !== 'number' || !isFinite(st.dur) || st.dur <= 0 || st.dur > 2) return false;
                if (typeof st.vol !== 'number' || st.vol < 0 || st.vol > 1) return false;
                return true;
            } catch (e) { return false; }
        }

        function validateSfx(sfx) {
            try {
                if (!sfx || typeof sfx !== 'object' || Array.isArray(sfx)) return false;
                if (sfx.v !== 1) return false;
                if (!isStr(sfx.name)) return false;
                if (!SFX_KINDS[sfx.kind]) return false;
                if (!Array.isArray(sfx.steps) || sfx.steps.length < 1 || sfx.steps.length > 16) return false;
                for (var i = 0; i < sfx.steps.length; i++) {
                    if (!validateStep(sfx.steps[i])) return false;
                }
                if (jsonSize(sfx) > SFX_MAX_BYTES) return false;
                return true;
            } catch (e) { return false; }
        }

        /* Standalone parser: string -> object (null on any failure). */
        function parseSongJson(text) {
            try {
                if (typeof text !== 'string') return null;
                if (text.length > SONG_MAX_BYTES + 64) return null;
                var o = JSON.parse(text);
                return validateSong(o) ? o : null;
            } catch (e) { return null; }
        }

        function parseSfxJson(text) {
            try {
                if (typeof text !== 'string') return null;
                if (text.length > SFX_MAX_BYTES + 64) return null;
                var o = JSON.parse(text);
                return validateSfx(o) ? o : null;
            } catch (e) { return null; }
        }

        /* DS-MUSIC-08: unwrap inline $music:1 envelopes; pass anything else through. */
        function unwrapMusic(v) {
            try {
                if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
                if (v.$music === 1 && v.song && typeof v.song === 'object') return v.song;
                if (v.song && typeof v.song === 'object' && v.$music !== undefined) return v.song;
                return v;
            } catch (e) { return v; }
        }

        /* DS-MUSIC-08: seed/JSON URL test (relative /music/seeds/ or absolute URL). */
        function isMusicUrl(s) {
            try {
                if (typeof s !== 'string' || !s.length) return false;
                if (/^\/music\/seeds\//.test(s)) return true;
                if (/^https?:\/\//.test(s)) return true;
                if (/\.json($|\?)/.test(s)) return true;
                return false;
            } catch (e) { return false; }
        }

        /* Mirror of gravegain1d beep(): osc+gain garnish, never throws. */
        function beep(freq, dur, type, vol) {
            try {
                if (MUTED) return false;
                var ctx = initCtx();
                if (!ctx) return false;
                var o = ctx.createOscillator();
                var g = ctx.createGain();
                o.type = type || 'square';
                o.frequency.value = freq;
                g.gain.value = vol || 0.05;
                o.connect(g);
                g.connect(ctx.destination);
                o.start();
                var d = dur || 80;
                setTimeout(function () { try { o.stop(); } catch (e) {} }, d);
                return true;
            } catch (e) { return false; }
        }

        function noiseBurst(ctx, dest, durSec, vol) {
            try {
                var len = Math.max(1, Math.floor(ctx.sampleRate * durSec));
                var buf = ctx.createBuffer(1, len, ctx.sampleRate);
                var data = buf.getChannelData(0);
                for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
                var src = ctx.createBufferSource();
                src.buffer = buf;
                var g = ctx.createGain();
                var t = ctx.currentTime;
                g.gain.setValueAtTime(Math.max(0.0001, vol), t);
                g.gain.exponentialRampToValueAtTime(0.0001, t + durSec);
                src.connect(g);
                g.connect(dest);
                src.start(t);
                src.stop(t + durSec);
                return { src: src, gain: g };
            } catch (e) { return null; }
        }

        function toneAt(ctx, dest, wave, freq, freqEnd, at, durSec, vol) {
            try {
                var o = ctx.createOscillator();
                var g = ctx.createGain();
                o.type = mapWave(wave);
                o.frequency.setValueAtTime(Math.max(20, freq), at);
                if (freqEnd && freqEnd !== freq) {
                    try { o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), at + durSec); } catch (e) {}
                }
                g.gain.setValueAtTime(Math.max(0.0001, vol), at);
                try { g.gain.exponentialRampToValueAtTime(0.0001, at + durSec); } catch (e) {}
                o.connect(g);
                g.connect(dest);
                o.start(at);
                o.stop(at + durSec + 0.02);
                songNodes.push(o);
                return o;
            } catch (e) { return null; }
        }

        function clearSongTimers() {
            try {
                for (var i = 0; i < songTimers.length; i++) {
                    try { clearTimeout(songTimers[i]); } catch (e) {}
                }
                songTimers = [];
                if (loopTimer) { try { clearTimeout(loopTimer); } catch (e) {} loopTimer = null; }
            } catch (e) {}
        }

        function stopAllNodes() {
            try {
                for (var i = 0; i < songNodes.length; i++) {
                    try { songNodes[i].stop(); } catch (e) {}
                    try { songNodes[i].disconnect(); } catch (e) {}
                }
                songNodes = [];
            } catch (e) { songNodes = []; }
        }

        function stopSong() {
            try {
                clearSongTimers();
                stopAllNodes();
                currentSong = null;
                return true;
            } catch (e) { return false; }
        }

        function songLengthSec(song) {
            try {
                var spb = 60 / song.bpm;
                var end = 0;
                for (var i = 0; i < song.tracks.length; i++) {
                    var notes = song.tracks[i].notes;
                    for (var j = 0; j < notes.length; j++) {
                        var stop = (notes[j].t + notes[j].d) * spb;
                        if (stop > end) end = stop;
                    }
                }
                return end;
            } catch (e) { return 0; }
        }

        function scheduleSong(song, opts) {
            try {
                var ctx = initCtx();
                if (!ctx) return false;
                var spb = 60 / song.bpm;
                var t0 = ctx.currentTime + 0.06;
                var mvol = masterVolume * musicVolume;
                if (MUTED || mvol <= 0.001) { currentSong = song; return true; }
                for (var i = 0; i < song.tracks.length; i++) {
                    var tr = song.tracks[i];
                    var tvol = (tr.vol === undefined ? 0.5 : tr.vol) * mvol;
                    for (var j = 0; j < tr.notes.length; j++) {
                        var nt = tr.notes[j];
                        var at = t0 + nt.t * spb;
                        var dur = Math.max(0.03, Math.min(8, nt.d * spb));
                        var v = (nt.v === undefined ? 1 : nt.v) * tvol * 0.25;
                        v = clampNum(v, 0.0001, 0.5, 0.05);
                        if (tr.wave === 'noise') {
                            (function (a, d, vv) {
                                var id = setTimeout(function () {
                                    try {
                                        if (MUTED) return;
                                        noiseBurst(ctx, ctx.destination, Math.min(1, d), vv);
                                    } catch (e) {}
                                }, Math.max(0, (a - ctx.currentTime) * 1000));
                                songTimers.push(id);
                            })(at, dur, v);
                        } else {
                            toneAt(ctx, ctx.destination, tr.wave, midi2freq(nt.n), 0, at, dur, v);
                        }
                    }
                }
                return true;
            } catch (e) { return false; }
        }

        /* Baked SFX fixtures (all valid Sfx4W, each well under 1024 bytes). */
        var BAKED = {};
        try {
            BAKED.raygun = { v: 1, name: 'raygun', kind: 'raygun', steps: [
                { wave: 'saw', freq: 1800, freqEnd: 220, dur: 0.18, vol: 0.5, type: 'tone' },
                { wave: 'square', freq: 900, freqEnd: 1400, dur: 0.08, vol: 0.3, type: 'tone' }
            ] };
            BAKED.death = { v: 1, name: 'death', kind: 'death', steps: [
                { wave: 'saw', freq: 400, freqEnd: 120, dur: 0.2, vol: 0.5, type: 'tone' },
                { wave: 'saw', freq: 300, freqEnd: 80, dur: 0.25, vol: 0.5, type: 'tone' },
                { wave: 'sine', freq: 150, freqEnd: 40, dur: 0.35, vol: 0.5, type: 'tone' }
            ] };
            BAKED.putt = { v: 1, name: 'putt', kind: 'putt', steps: [
                { wave: 'sine', freq: 220, freqEnd: 330, dur: 0.09, vol: 0.5, type: 'tone' }
            ] };
            BAKED.coin = { v: 1, name: 'coin', kind: 'coin', steps: [
                { wave: 'square', freq: 988, freqEnd: 988, dur: 0.07, vol: 0.35, type: 'tone' },
                { wave: 'square', freq: 1319, freqEnd: 1319, dur: 0.18, vol: 0.35, type: 'tone' }
            ] };
            BAKED.hit = { v: 1, name: 'hit', kind: 'hit', steps: [
                { wave: 'saw', freq: 220, freqEnd: 60, dur: 0.12, vol: 0.5, type: 'tone' }
            ] };
            BAKED.jump = { v: 1, name: 'jump', kind: 'jump', steps: [
                { wave: 'square', freq: 300, freqEnd: 700, dur: 0.14, vol: 0.4, type: 'tone' }
            ] };
            BAKED.win = { v: 1, name: 'win', kind: 'win', steps: [
                { wave: 'square', freq: 523, freqEnd: 523, dur: 0.12, vol: 0.4, type: 'tone' },
                { wave: 'square', freq: 659, freqEnd: 659, dur: 0.12, vol: 0.4, type: 'tone' },
                { wave: 'square', freq: 784, freqEnd: 784, dur: 0.2, vol: 0.4, type: 'tone' }
            ] };
            BAKED.lose = { v: 1, name: 'lose', kind: 'lose', steps: [
                { wave: 'saw', freq: 330, freqEnd: 330, dur: 0.15, vol: 0.4, type: 'tone' },
                { wave: 'saw', freq: 247, freqEnd: 247, dur: 0.15, vol: 0.4, type: 'tone' },
                { wave: 'saw', freq: 165, freqEnd: 165, dur: 0.3, vol: 0.4, type: 'tone' }
            ] };
            BAKED.click = { v: 1, name: 'click', kind: 'click', steps: [
                { wave: 'square', freq: 660, freqEnd: 660, dur: 0.05, vol: 0.3, type: 'tone' }
            ] };
            BAKED.alarm = { v: 1, name: 'alarm', kind: 'alarm', steps: [
                { wave: 'square', freq: 880, freqEnd: 880, dur: 0.12, vol: 0.4, type: 'tone' },
                { wave: 'square', freq: 660, freqEnd: 660, dur: 0.12, vol: 0.4, type: 'tone' },
                { wave: 'square', freq: 880, freqEnd: 880, dur: 0.12, vol: 0.4, type: 'tone' }
            ] };
        } catch (e) {}

        function playSteps(sfx) {
            try {
                if (MUTED) return false;
                var ctx = initCtx();
                if (!ctx) return false;
                var mvol = masterVolume * sfxVolume;
                if (mvol <= 0.001) return true;
                var t = ctx.currentTime + 0.01;
                var cursor = 0;
                for (var i = 0; i < sfx.steps.length; i++) {
                    (function (st, off) {
                        var id = setTimeout(function () {
                            try {
                                if (MUTED) return;
                                var c2 = initCtx();
                                if (!c2) return;
                                var v = clampNum(st.vol, 0, 1, 0.4) * mvol * 0.6;
                                if (st.type === 'noise') {
                                    noiseBurst(c2, c2.destination, st.dur, v);
                                } else {
                                    var o = c2.createOscillator();
                                    var g = c2.createGain();
                                    o.type = mapWave(st.wave || 'square');
                                    var now = c2.currentTime;
                                    o.frequency.setValueAtTime(st.freq, now);
                                    if (st.freqEnd && st.freqEnd !== st.freq) {
                                        try { o.frequency.exponentialRampToValueAtTime(st.freqEnd, now + st.dur); } catch (e) {}
                                    }
                                    g.gain.setValueAtTime(Math.max(0.0001, v), now);
                                    try { g.gain.exponentialRampToValueAtTime(0.0001, now + st.dur); } catch (e) {}
                                    o.connect(g);
                                    g.connect(c2.destination);
                                    o.start(now);
                                    o.stop(now + st.dur + 0.02);
                                }
                            } catch (e) {}
                        }, Math.round(off * 1000));
                        songTimers.push(id);
                    })(sfx.steps[i], cursor);
                    cursor += sfx.steps[i].dur + 0.02;
                }
                return true;
            } catch (e) { return false; }
        }

        /* Same playSfx hook shape as sound-engine: playSfx(type), fail-open. */
        function playSfx(sfxOrKind) {
            try {
                if (typeof sfxOrKind === 'string') {
                    var b = BAKED[sfxOrKind];
                    if (b) return playSteps(b);
                    // DS-MUSIC-08: accept Sfx4W JSON text (recipeJson); unparsable -> silent false.
                    var parsed = parseSfxJson(sfxOrKind);
                    if (parsed) return playSteps(parsed);
                    return false;
                }
                if (!validateSfx(unwrapMusic(sfxOrKind))) return false;
                return playSteps(unwrapMusic(sfxOrKind));
            } catch (e) { return false; }
        }

        function playSfxJson(text) {
            try {
                var o = parseSfxJson(text);
                if (!o) return false;
                return playSteps(o);
            } catch (e) { return false; }
        }

        function playSong(song, opts) {
            try {
                // DS-MUSIC-08: seed/JSON URL -> fetch fail-open (never throws, silent false).
                if (typeof song === 'string' && isMusicUrl(song)) {
                    try {
                        if (typeof fetch !== 'function') return false;
                        var url = song;
                        var urlOpts = opts || null;
                        fetch(url).then(function (r) {
                            try {
                                if (!r || !r.ok) return null;
                                return r.json();
                            } catch (e) { return null; }
                        }).then(function (j) {
                            try { if (j) playSong(unwrapMusic(j), urlOpts); } catch (e) {}
                        }).catch(function () {});
                        return true;
                    } catch (e) { return false; }
                }
                // DS-MUSIC-08: raw JSON text falls through to the standalone parser.
                if (typeof song === 'string') return playSongJson(song, opts);
                song = unwrapMusic(song);
                if (!validateSong(song)) return false;
                stopSong();
                currentSong = song;
                currentOpts = opts || null;
                var loop = !!(opts && opts.loop);
                var ok = scheduleSong(song, opts);
                if (ok && loop) {
                    var len = songLengthSec(song);
                    (function again() {
                        try {
                            loopTimer = setTimeout(function () {
                                try {
                                    if (!currentSong) return;
                                    stopAllNodes();
                                    clearSongTimers();
                                    scheduleSong(currentSong, currentOpts);
                                    again();
                                } catch (e) {}
                            }, Math.max(250, Math.round((len + 0.15) * 1000)));
                        } catch (e) {}
                    })();
                }
                return ok;
            } catch (e) { return false; }
        }

        function playSongJson(text, opts) {
            try {
                var o = parseSongJson(text);
                if (!o) return false;
                return playSong(o, opts);
            } catch (e) { return false; }
        }

        function setVolumes(v) {
            try {
                if (!v || typeof v !== 'object') return false;
                if (v.master !== undefined) masterVolume = clampNum(v.master, 0, 1, masterVolume);
                if (v.music !== undefined) musicVolume = clampNum(v.music, 0, 1, musicVolume);
                if (v.sfx !== undefined) sfxVolume = clampNum(v.sfx, 0, 1, sfxVolume);
                return true;
            } catch (e) { return false; }
        }

        function setMuted(m) {
            try {
                MUTED = !!m;
                if (MUTED) stopSong();
                return true;
            } catch (e) { return false; }
        }

        function getState() {
            try {
                return {
                    muted: MUTED,
                    master: masterVolume,
                    music: musicVolume,
                    sfx: sfxVolume,
                    playing: !!currentSong
                };
            } catch (e) { return { muted: false, playing: false }; }
        }

        window.FourWeirdMusic = {
            version: 1,
            playSong: playSong,
            playSongJson: playSongJson,
            stopSong: stopSong,
            stop: stopSong, // DS-MUSIC-08 alias: window.FourweirdMusic.stop()
            playSfx: playSfx,
            playSfxJson: playSfxJson,
            beep: beep,
            validateSong: validateSong,
            validateSfx: validateSfx,
            parseSongJson: parseSongJson,
            parseSfxJson: parseSfxJson,
            setVolumes: setVolumes,
            setMuted: setMuted,
            getState: getState,
            bakedKinds: function () {
                try { return Object.keys(BAKED); } catch (e) { return []; }
            }
        };
        // DS-MUSIC-08 contract alias: window.FourweirdMusic -> same object (idempotent).
        try { window.FourweirdMusic = window.FourWeirdMusic; } catch (e) {}
    } catch (e) {
        try { if (typeof window !== 'undefined' && !window.FourWeirdMusic) window.FourWeirdMusic = null; } catch (e2) {}
    }
})();
