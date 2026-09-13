"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Music library gallery (DS-MUS-05 scope: app/music/all only).
 *
 * Sources, in order: seed songs from GET /api/music/list (fail-open to
 * inline seeds coded to the 4W-1 contract), songs saved in localStorage,
 * and a shared ?song= import which is validated then saved.
 *
 * 4W-1 CONTRACT (normative, mirrored from DS-MUS-01 / DS-MUS-06 goals):
 * Song4W = { v: 1, title: string, bpm: 40-240, tracks: Track4W[<=8] }
 * Track4W = { wave: 'square'|'saw'|'tri'|'sine'|'noise', vol?: 0..1,
 *   notes: Note4W[<=512] }
 * Note4W = { t: start beats, n: MIDI 0-127, d: len beats, v?: 0..1 }
 * song JSON <= 8192 bytes.
 * Sfx4W = { v: 1, name, kind: 'raygun'|'death'|'putt'|'coin'|'hit'|
 *   'jump'|'win'|'lose'|'click'|'alarm',
 *   steps: [{ wave, freq, freqEnd, dur, vol, type: 'tone'|'noise' }] }
 * sfx JSON <= 1024 bytes.
 */

type SongWave = "square" | "saw" | "tri" | "sine" | "noise";

type Note4W = { t: number; n: number; d: number; v?: number };

type Track4W = { wave: SongWave; vol?: number; notes: Note4W[] };

type Song4W = { v: 1; title: string; bpm: number; tracks: Track4W[] };

type SfxStep = {
  wave: string;
  freq: number;
  freqEnd: number;
  dur: number;
  vol: number;
  type: "tone" | "noise";
};

type SfxKind =
  | "raygun"
  | "death"
  | "putt"
  | "coin"
  | "hit"
  | "jump"
  | "win"
  | "lose"
  | "click"
  | "alarm";

type Sfx4W = { v: 1; name: string; kind: SfxKind; steps: SfxStep[] };

const SONG_MAX_BYTES = 8192;
const SFX_MAX_BYTES = 1024;
const STORAGE_KEY = "4w-music-library-v1";
const SONG_PARAM = "song";

const SONG_WAVES: ReadonlyArray<SongWave> = [
  "square",
  "saw",
  "tri",
  "sine",
  "noise",
];

const SFX_KINDS: ReadonlyArray<SfxKind> = [
  "raygun",
  "death",
  "putt",
  "coin",
  "hit",
  "jump",
  "win",
  "lose",
  "click",
  "alarm",
];

function sizeOf(value: unknown): number {
  try {
    const json = JSON.stringify(value) ?? "";
    if (typeof TextEncoder !== "undefined")
      return new TextEncoder().encode(json).length;
    return json.length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateSong(value: unknown): value is Song4W {
  if (!isRecord(value)) return false;
  if (value.v !== 1) return false;
  if (typeof value.title !== "string") return false;
  const title = value.title.trim();
  if (title.length === 0 || title.length > 120) return false;
  if (!isNum(value.bpm) || value.bpm < 40 || value.bpm > 240) return false;
  if (!Array.isArray(value.tracks)) return false;
  if (value.tracks.length === 0 || value.tracks.length > 8) return false;
  for (const track of value.tracks) {
    if (!isRecord(track)) return false;
    if (
      typeof track.wave !== "string" ||
      !SONG_WAVES.includes(track.wave as SongWave)
    )
      return false;
    if (track.vol !== undefined && (!isNum(track.vol) || track.vol < 0 || track.vol > 1))
      return false;
    if (!Array.isArray(track.notes)) return false;
    if (track.notes.length > 512) return false;
    for (const note of track.notes) {
      if (!isRecord(note)) return false;
      if (!isNum(note.t) || note.t < 0 || note.t > 1024) return false;
      if (!isNum(note.n) || !Number.isInteger(note.n) || note.n < 0 || note.n > 127)
        return false;
      if (!isNum(note.d) || note.d <= 0 || note.d > 256) return false;
      if (note.v !== undefined && (!isNum(note.v) || note.v < 0 || note.v > 1))
        return false;
    }
  }
  return sizeOf(value) <= SONG_MAX_BYTES;
}

function validateSfx(value: unknown): value is Sfx4W {
  if (!isRecord(value)) return false;
  if (value.v !== 1) return false;
  if (typeof value.name !== "string") return false;
  const name = value.name.trim();
  if (name.length === 0 || name.length > 80) return false;
  if (typeof value.kind !== "string" || !SFX_KINDS.includes(value.kind as SfxKind))
    return false;
  if (!Array.isArray(value.steps)) return false;
  if (value.steps.length === 0 || value.steps.length > 8) return false;
  for (const step of value.steps) {
    if (!isRecord(step)) return false;
    if (typeof step.wave !== "string" || step.wave.length === 0) return false;
    if (!isNum(step.freq) || step.freq <= 0 || step.freq > 20000) return false;
    if (!isNum(step.freqEnd) || step.freqEnd <= 0 || step.freqEnd > 20000)
      return false;
    if (!isNum(step.dur) || step.dur <= 0 || step.dur > 4) return false;
    if (!isNum(step.vol) || step.vol < 0 || step.vol > 1) return false;
    if (step.type !== "tone" && step.type !== "noise") return false;
  }
  return sizeOf(value) <= SFX_MAX_BYTES;
}

const FALLBACK_SEED_SONGS: Song4W[] = [
  {
    v: 1,
    title: "Sunny Steps",
    bpm: 112,
    tracks: [
      {
        wave: "square",
        vol: 0.5,
        notes: [
          { t: 0, n: 60, d: 0.5 },
          { t: 0.5, n: 62, d: 0.5 },
          { t: 1, n: 64, d: 0.5 },
          { t: 1.5, n: 67, d: 1 },
          { t: 2.5, n: 64, d: 0.5 },
          { t: 3, n: 67, d: 1 },
        ],
      },
      {
        wave: "tri",
        vol: 0.4,
        notes: [
          { t: 0, n: 48, d: 1 },
          { t: 1, n: 43, d: 1 },
          { t: 2, n: 45, d: 1 },
          { t: 3, n: 43, d: 1 },
        ],
      },
    ],
  },
  {
    v: 1,
    title: "Night Lanterns",
    bpm: 84,
    tracks: [
      {
        wave: "sine",
        vol: 0.5,
        notes: [
          { t: 0, n: 69, d: 1 },
          { t: 1, n: 67, d: 1 },
          { t: 2, n: 64, d: 1 },
          { t: 3, n: 62, d: 1 },
        ],
      },
    ],
  },
];

const FALLBACK_SEED_SFX: Sfx4W[] = [
  {
    v: 1,
    name: "Coin Pickup",
    kind: "coin",
    steps: [
      { wave: "square", freq: 988, freqEnd: 1319, dur: 0.09, vol: 0.5, type: "tone" },
      { wave: "square", freq: 1319, freqEnd: 1760, dur: 0.18, vol: 0.5, type: "tone" },
    ],
  },
  {
    v: 1,
    name: "Small Jump",
    kind: "jump",
    steps: [
      { wave: "sine", freq: 300, freqEnd: 660, dur: 0.18, vol: 0.5, type: "tone" },
    ],
  },
];

const SEED_SFX: Sfx4W[] = FALLBACK_SEED_SFX.filter(validateSfx);

const MINIMAL_SONG_EXAMPLE: Song4W = {
  v: 1,
  title: "First Song",
  bpm: 120,
  tracks: [{ wave: "square", notes: [{ t: 0, n: 60, d: 0.5 }] }],
};

type StoredSong = { song: Song4W; source: "seed" | "saved" | "shared" };

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AC = win.AudioContext ?? win.webkitAudioContext;
    if (!AC) return null;
    return new AC();
  } catch {
    return null;
  }
}

export function GalleryClient() {
  const searchParams = useSearchParams();
  const [seedSongs, setSeedSongs] = useState<Song4W[]>(FALLBACK_SEED_SONGS);
  const [savedSongs, setSavedSongs] = useState<Song4W[]>([]);
  const [notice, setNotice] = useState<string>("");
  const [playingTitle, setPlayingTitle] = useState<string>("");
  const [playingSfx, setPlayingSfx] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string>("");
  const audioRef = useRef<AudioContext | null>(null);
  const importedRef = useRef<string>("");

  const stopPlayback = useCallback(() => {
    try {
      const ctx = audioRef.current;
      audioRef.current = null;
      if (ctx) void ctx.close().catch(() => undefined);
    } catch {
      // Fail-open: stopping sound never breaks the page.
    }
    setPlayingTitle("");
    setPlayingSfx("");
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  // Seed songs: GET /api/music/list, fail-open to inline seeds.
  useEffect(() => {
    let cancelled = false;
    async function loadSeeds() {
      try {
        const res = await fetch("/api/music/list", { method: "GET" });
        if (!res.ok) return;
        const data: unknown = await res.json();
        const list: unknown = isRecord(data) && Array.isArray(data.songs)
          ? data.songs
          : Array.isArray(data)
            ? data
            : [];
        if (!Array.isArray(list) || list.length === 0) return;
        const valid = list.filter(validateSong).slice(0, 24);
        if (!cancelled && valid.length > 0) setSeedSongs(valid);
      } catch {
        // Fail-open: keep inline fallback seeds.
      }
    }
    void loadSeeds();
    return () => {
      cancelled = true;
    };
  }, []);

  // Saved songs from localStorage (SSR-safe: deferred to a microtask so
  // the render stays SSR-identical and no setState runs synchronously in
  // the effect).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        if (typeof window === "undefined") return;
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        setSavedSongs(parsed.filter(validateSong).slice(0, 64));
      } catch {
        // Fail-open: start with no saved songs.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSaved = useCallback((songs: Song4W[]) => {
    setSavedSongs(songs);
    try {
      if (typeof window !== "undefined")
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    } catch {
      // Fail-open: memory state still works for this visit.
    }
  }, []);

  // ?song= import: validate, then save once per param value. Deferred to
  // a microtask so no setState runs synchronously in the effect.
  useEffect(() => {
    const param = searchParams.get(SONG_PARAM);
    if (!param || importedRef.current === param) return;
    importedRef.current = param;
    queueMicrotask(() => {
      let candidate: unknown = null;
      try {
        candidate = JSON.parse(decodeURIComponent(param));
      } catch {
        try {
          candidate = JSON.parse(param);
        } catch {
          setNotice("That shared song link could not be read, showing the library instead.");
          return;
        }
      }
      if (!validateSong(candidate)) {
        setNotice("That shared song was not a valid 4W-1 song, showing the library instead.");
        return;
      }
      const shared: Song4W = candidate;
      let prev: Song4W[] = [];
      try {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          const parsed: unknown = raw ? JSON.parse(raw) : [];
          if (Array.isArray(parsed)) prev = parsed.filter(validateSong);
        }
      } catch {
        // Fail-open: treat as empty.
      }
      const json = JSON.stringify(shared);
      if (prev.some((s) => JSON.stringify(s) === json)) {
        setSavedSongs(prev);
        setNotice("Shared song already in your saved songs: " + shared.title);
        return;
      }
      const next = [shared, ...prev].slice(0, 64);
      persistSaved(next);
      setNotice("Shared song saved: " + shared.title);
      try {
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete(SONG_PARAM);
          window.history.replaceState(null, "", url.toString());
        }
      } catch {
        // Fail-open.
      }
    });
  }, [searchParams, persistSaved]);

  const songs: StoredSong[] = useMemo(
    () => [
      ...seedSongs.map((song) => ({ song, source: "seed" as const })),
      ...savedSongs.map((song) => ({ song, source: "saved" as const })),
    ],
    [seedSongs, savedSongs],
  );

  const playSong = useCallback(
    (song: Song4W) => {
      stopPlayback();
      const ctx = getAudioContext();
      if (!ctx) {
        setNotice("Audio is not available in this browser.");
        return;
      }
      audioRef.current = ctx;
      setPlayingTitle(song.title);
      try {
        const spb = 60 / song.bpm;
        const t0 = ctx.currentTime + 0.08;
        for (const track of song.tracks) {
          const trackVol = track.vol ?? 0.6;
          for (const note of track.notes) {
            const start = t0 + note.t * spb;
            const dur = Math.min(Math.max(note.d * spb, 0.05), 4);
            const vol = Math.min(Math.max((note.v ?? 1) * trackVol, 0.001), 1);
            const out = ctx.createGain();
            out.gain.setValueAtTime(0.0001, start);
            out.gain.exponentialRampToValueAtTime(Math.max(vol, 0.001), start + 0.02);
            out.gain.exponentialRampToValueAtTime(0.0001, start + dur);
            out.connect(ctx.destination);
            if (track.wave === "noise") {
              const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
              const buf = ctx.createBuffer(1, len, ctx.sampleRate);
              const data = buf.getChannelData(0);
              for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
              const src = ctx.createBufferSource();
              src.buffer = buf;
              src.connect(out);
              src.start(start);
              src.stop(start + dur);
            } else {
              const osc = ctx.createOscillator();
              osc.type =
                track.wave === "tri" ? "triangle" : track.wave === "saw" ? "sawtooth" : track.wave;
              osc.frequency.setValueAtTime(
                Math.min(Math.max(midiToFreq(note.n), 1), 12000),
                start,
              );
              osc.connect(out);
              osc.start(start);
              osc.stop(start + dur + 0.05);
            }
          }
        }
      } catch {
        setNotice("Could not play that song in this browser.");
        stopPlayback();
      }
    },
    [stopPlayback],
  );

  const playSfx = useCallback(
    (sfx: Sfx4W) => {
      stopPlayback();
      const ctx = getAudioContext();
      if (!ctx) {
        setNotice("Audio is not available in this browser.");
        return;
      }
      audioRef.current = ctx;
      setPlayingSfx(sfx.name);
      try {
        let start = ctx.currentTime + 0.05;
        for (const step of sfx.steps) {
          const dur = Math.min(Math.max(step.dur, 0.03), 2);
          const out = ctx.createGain();
          out.gain.setValueAtTime(0.0001, start);
          out.gain.exponentialRampToValueAtTime(Math.max(step.vol, 0.001), start + 0.015);
          out.gain.exponentialRampToValueAtTime(0.0001, start + dur);
          out.connect(ctx.destination);
          if (step.type === "noise") {
            const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(out);
            src.start(start);
            src.stop(start + dur);
          } else {
            const osc = ctx.createOscillator();
            osc.type = "square";
            osc.frequency.setValueAtTime(Math.max(step.freq, 1), start);
            osc.frequency.exponentialRampToValueAtTime(Math.max(step.freqEnd, 1), start + dur);
            osc.connect(out);
            osc.start(start);
            osc.stop(start + dur + 0.03);
          }
          start += dur + 0.02;
        }
      } catch {
        setNotice("Could not play that sound in this browser.");
        stopPlayback();
      }
    },
    [stopPlayback],
  );

  const copyJson = useCallback(async (key: string, value: unknown) => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        setNotice("Copy is not available in this browser.");
        return;
      }
      await navigator.clipboard.writeText(JSON.stringify(value));
      setCopiedKey(key);
      setNotice("Copied JSON for: " + key);
    } catch {
      setNotice("Copy failed in this browser.");
    }
  }, []);

  const deleteSaved = useCallback(
    (title: string) => {
      persistSaved(savedSongs.filter((s) => s.title !== title));
      setNotice("Removed saved song: " + title);
    },
    [persistSaved, savedSongs],
  );

  return (
    <div className="space-y-8">
      {notice ? (
        <p role="status" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm text-cyan-100">
          {notice}
        </p>
      ) : null}

      <section aria-label="Song library">
        <h2 className="text-xl font-extrabold">Library</h2>
        <p className="mt-1 text-sm text-slate-400">
          {songs.length} songs: {seedSongs.length} seeds, {savedSongs.length} saved in this browser.
        </p>
        {songs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
            No songs yet. Songs you make will appear here after you save them.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {songs.map(({ song, source }, index) => {
              const json = JSON.stringify(song);
              const key = song.title + "-" + index;
              const isPlaying = playingTitle === song.title;
              const remixHref =
                "/music/maker?song=" + encodeURIComponent(JSON.stringify(song));
              return (
                <li
                  key={key}
                  className="rounded-xl border border-white/10 bg-white/[.03] p-4"
                >
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    {source === "seed" ? "Seed song" : "Saved song"}
                  </p>
                  <h3 className="mt-1 text-lg font-bold">{song.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {song.bpm} BPM - {song.tracks.length} tracks - {sizeOf(song)} bytes
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isPlaying ? (
                      <button
                        type="button"
                        onClick={stopPlayback}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => playSong(song)}
                        className="rounded-lg bg-cyan-300 px-3 py-1.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
                      >
                        Play
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyJson(song.title, song)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
                    >
                      {copiedKey === song.title ? "Copied" : "Copy JSON"}
                    </button>
                    <a
                      href={remixHref}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
                    >
                      Remix in maker
                    </a>
                    {source === "saved" ? (
                      <button
                        type="button"
                        onClick={() => deleteSaved(song.title)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-slate-500">
                      View JSON ({json.length} chars)
                    </summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">
                      {json}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Sound effects">
        <h2 className="text-xl font-extrabold">Sound effects</h2>
        <p className="mt-1 text-sm text-slate-400">
          Short one-shot sounds for games. Each is 1024 bytes or less.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {SEED_SFX.map((sfx) => {
            const isPlaying = playingSfx === sfx.name;
            return (
              <li
                key={sfx.name}
                className="rounded-xl border border-white/10 bg-white/[.03] p-4"
              >
                <h3 className="text-lg font-bold">{sfx.name}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {sfx.kind} - {sfx.steps.length} steps - {sizeOf(sfx)} bytes
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isPlaying ? (
                    <button
                      type="button"
                      onClick={stopPlayback}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => playSfx(sfx)}
                      className="rounded-lg bg-cyan-300 px-3 py-1.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
                    >
                      Play
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void copyJson(sfx.name, sfx)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10"
                  >
                    {copiedKey === sfx.name ? "Copied" : "Copy JSON"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Bot contract" className="rounded-xl border border-white/10 bg-white/[.03] p-4">
        <h2 className="text-xl font-extrabold">For bots</h2>
        <p className="mt-1 text-sm text-slate-400">
          Machine-readable song list: GET /api/music/list (also served at /api/music).
          Submit and share songs as Song4W JSON, 8192 bytes or less.
        </p>
        <p className="mt-3 text-sm">
          <a href="/api/music/list" className="underline hover:text-cyan-200">
            GET /api/music/list
          </a>
          <span className="text-slate-500"> - </span>
          <a href="/api/music" className="underline hover:text-cyan-200">
            GET /api/music
          </a>
        </p>
        <pre className="mt-3 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">
          {JSON.stringify(MINIMAL_SONG_EXAMPLE)}
        </pre>
      </section>
    </div>
  );
}
