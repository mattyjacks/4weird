"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MusicInst, MusicSong, MusicTrack } from "@/lib/music-format";
import { validateMusic } from "@/lib/music-format";
import { getAudioContext, playSong, renderSongWav } from "@/lib/music-synth";
import { SfxLab } from "@/components/music/sfx-lab";
import { StepSequencer } from "@/components/music/step-sequencer";

const STORAGE_KEY = "4weird-music:mine";
const STEPS = 16;
const MIN_BPM = 40;
const MAX_BPM = 240;

/**
 * The 8 `$music:1` instruments (4 leads + 4 drums). `inst` is a free string
 * in the contract; `wave` carries the oscillator. Drums map to square here —
 * the synth voices kick/snare/hat/noise by instrument name.
 */
const INSTRUMENTS = [
  "square",
  "triangle",
  "sawtooth",
  "sine",
  "noise",
  "kick",
  "snare",
  "hat",
] as const;

type EditableNote = { t: number; n: number; d: number; v?: number };
type EditableTrack = { id: string; inst: string; notes: EditableNote[] };

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Fail open to the counter fallback below.
  }
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

function defaultTracks(): EditableTrack[] {
  return [
    {
      id: newId("track"),
      inst: "square",
      notes: [
        { t: 0, n: 60, d: 1 },
        { t: 4, n: 64, d: 1 },
        { t: 8, n: 67, d: 1 },
        { t: 12, n: 64, d: 1 },
      ],
    },
    {
      id: newId("track"),
      inst: "kick",
      notes: [
        { t: 0, n: 36, d: 1 },
        { t: 4, n: 36, d: 1 },
        { t: 8, n: 36, d: 1 },
        { t: 12, n: 36, d: 1 },
      ],
    },
  ];
}

function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 120;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value) || 120));
}

/** Canonical `$music:1` guard via music-01's validator (never throws). */
function isStoredSong(value: unknown): value is MusicSong {
  try {
    const result = validateMusic(value);
    return result.ok && result.kind === "song";
  } catch {
    return false;
  }
}

/**
 * Read a tempo from a stored/shared payload. Canonical field is uppercase
 * `BPM` per `@/lib/music-format`; lowercase `bpm` is tolerated.
 */
function readBpm(value: unknown): number {
  if (typeof value === "object" && value !== null) {
    const rec = value as Record<string, unknown>;
    const raw = rec["BPM"] ?? rec["bpm"];
    if (typeof raw === "number") return clampBpm(raw);
  }
  return 120;
}

/** Unicode-safe base64 encode for the `?song=` share link. Fail-open. */
function encodeSongParam(song: MusicSong): string | null {
  try {
    const json = JSON.stringify(song);
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin);
  } catch {
    return null;
  }
}

/** Decode a `?song=` share param back to an unknown payload. Fail-open. */
function decodeSongParam(param: string): unknown | null {
  try {
    const bin = atob(param);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

/** Contract velocity is an integer 0-127; anything else is dropped. */
function normalizeStoredVelocity(v: unknown): number | undefined {
  if (
    typeof v !== "number" ||
    !Number.isInteger(v) ||
    v < 0 ||
    v > 127
  ) {
    return undefined;
  }
  return v;
}

function toEditableTracks(song: MusicSong): EditableTrack[] {
  const tracks = song.tracks
    .filter(
      (track): track is MusicTrack =>
        typeof track === "object" &&
        track !== null &&
        Array.isArray((track as { notes?: unknown }).notes),
    )
    .map((track) => ({
      id: newId("track"),
      inst: String(track.inst ?? "square"),
      notes: track.notes
        .filter(
          (note) =>
            typeof note === "object" &&
            note !== null &&
            typeof (note as { t?: unknown }).t === "number" &&
            typeof (note as { n?: unknown }).n === "number",
        )
        .map((note) => {
          const v = normalizeStoredVelocity(note.v);
          return {
            t: note.t,
            n: note.n,
            d: typeof note.d === "number" ? note.d : 1,
            ...(v === undefined ? {} : { v }),
          };
        }),
    }));
  return tracks.length > 0 ? tracks : defaultTracks();
}

/**
 * Client maker suite: track list (add/remove + instrument picker), BPM
 * slider, per-track 16-step sequencers, transport (play/stop via
 * `@/lib/music-synth`), title input, localStorage save, JSON download,
 * copy-JSON, copy-link (`?song=` share URL), and WAV export. All browser
 * APIs run inside handlers or effects; every failure path degrades to a
 * status message, never a crash. Embeds music-04's `SfxLab`.
 */
export function MakerShell() {
  const [title, setTitle] = useState("My first song");
  const [bpm, setBpm] = useState(120);
  const [tracks, setTracks] = useState<EditableTrack[]>(defaultTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const stopRef = useRef<{ stop: () => void } | null>(null);

  // Hydrate: a `?song=` share link wins, then the most recent localStorage
  // save. Effect-only so SSR never touches browser APIs; failures fall back
  // to the starter song above.
  /* eslint-disable react-hooks/set-state-in-effect -- share-link/localStorage
     restore must run post-hydration to avoid an SSR mismatch;
     single mount sync is intentional. */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get("song");
      if (shared) {
        const song = decodeSongParam(shared);
        if (isStoredSong(song)) {
          setTitle(song.title);
          setBpm(readBpm(song));
          setTracks(toEditableTracks(song));
          setStatus("Loaded a shared song from the link.");
          return;
        }
      }
    } catch {
      // Fail open to localStorage below.
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      const songs = Array.isArray(parsed) ? parsed : [parsed];
      const song = songs.find(isStoredSong);
      if (!song) return;
      setTitle(song.title);
      setBpm(readBpm(song));
      setTracks(toEditableTracks(song));
      setStatus("Loaded your most recent saved song.");
    } catch {
      // Fail open: keep the starter song.
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Stop playback when the shell unmounts.
  useEffect(() => {
    return () => {
      try {
        stopRef.current?.stop();
      } catch {
        // Fail open on teardown.
      }
      stopRef.current = null;
    };
  }, []);

  const buildSong = useCallback((): MusicSong => {
    return {
      format: "$music:1",
      kind: "song",
      title: title.trim() === "" ? "Untitled" : title.trim(),
      BPM: clampBpm(bpm),
      stepsPerBeat: 4,
      tracks: tracks.map((track) => ({
        inst: track.inst as MusicInst,
        notes: track.notes.map((note) => ({ ...note })),
      })),
    };
  }, [title, bpm, tracks]);

  const stopPlayback = useCallback(() => {
    try {
      stopRef.current?.stop();
    } catch {
      // Fail open: still update state below.
    }
    stopRef.current = null;
    setIsPlaying(false);
  }, []);

  const handlePlay = useCallback(() => {
    try {
      stopRef.current?.stop();
    } catch {
      // Ignore a stale handle; a fresh one is created below.
    }
    stopRef.current = null;
    try {
      // Unlock/resume the shared context inside the click gesture, then play.
      getAudioContext();
      const handle = playSong(buildSong(), { loop: true });
      stopRef.current = handle;
      setIsPlaying(true);
      setStatus(null);
    } catch {
      setIsPlaying(false);
      setStatus("Playback is unavailable in this browser (no WebAudio).");
    }
  }, [buildSong]);

  const handleToggleNote = useCallback(
    (trackId: string, step: number, midi: number) => {
      setTracks((prev) =>
        prev.map((track) => {
          if (track.id !== trackId) return track;
          const exists = track.notes.some(
            (note) => note.t === step && note.n === midi,
          );
          return {
            ...track,
            notes: exists
              ? track.notes.filter(
                  (note) => !(note.t === step && note.n === midi),
                )
              : [...track.notes, { t: step, n: midi, d: 1 }],
          };
        }),
      );
    },
    [],
  );

  const handleAddTrack = useCallback(() => {
    setTracks((prev) => [
      ...prev,
      { id: newId("track"), inst: "square", notes: [] },
    ]);
  }, []);

  const handleRemoveTrack = useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((track) => track.id !== trackId));
  }, []);

  const handleInstrumentChange = useCallback(
    (trackId: string, inst: string) => {
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId ? { ...track, inst } : track,
        ),
      );
    },
    [],
  );

  const handleSave = useCallback(() => {
    try {
      const song = buildSong();
      const check = validateMusic(song);
      if (!check.ok) {
        setStatus(
          `Not saved: song is invalid (${check.errors[0] ?? "unknown error"}).`,
        );
        return;
      }
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const songs = (Array.isArray(parsed) ? parsed : []).filter(isStoredSong);
      const rest = songs.filter((entry) => entry.title !== song.title);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...rest, song]),
      );
      setStatus(`Saved “${song.title}” to this browser.`);
    } catch {
      setStatus("Could not save: browser storage is unavailable.");
    }
  }, [buildSong]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadJson = useCallback(() => {
    try {
      const song = buildSong();
      const check = validateMusic(song);
      if (!check.ok) {
        setStatus(
          `Not downloaded: song is invalid (${check.errors[0] ?? "unknown error"}).`,
        );
        return;
      }
      const safe = song.title.replace(/[^\w\- ]+/g, "").trim() || "song";
      downloadBlob(
        new Blob([JSON.stringify(song, null, 2)], {
          type: "application/json",
        }),
        `${safe}.music.json`,
      );
      setStatus(`Downloaded “${song.title}” as JSON.`);
    } catch {
      setStatus("Download failed in this browser.");
    }
  }, [buildSong]);

  const copyText = async (text: string): Promise<boolean> => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error("no-clipboard");
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleCopyJson = useCallback(async () => {
    const ok = await copyText(JSON.stringify(buildSong()));
    setStatus(
      ok ? "Song JSON copied to the clipboard." : "Copy failed: clipboard is unavailable.",
    );
  }, [buildSong]);

  const handleCopyLink = useCallback(async () => {
    try {
      const song = buildSong();
      const check = validateMusic(song);
      if (!check.ok) {
        setStatus(
          `No link: song is invalid (${check.errors[0] ?? "unknown error"}).`,
        );
        return;
      }
      const param = encodeSongParam(song);
      if (!param) {
        setStatus("Copy failed: could not encode the song.");
        return;
      }
      const url = `${window.location.origin}${window.location.pathname}?song=${encodeURIComponent(param)}`;
      const ok = await copyText(url);
      setStatus(
        ok
          ? "Share link copied — opening it loads this song."
          : "Copy failed: clipboard is unavailable.",
      );
    } catch {
      setStatus("Copy failed: clipboard is unavailable.");
    }
  }, [buildSong]);

  const handleExportWav = useCallback(async () => {
    setIsBusy(true);
    try {
      const blob = await renderSongWav(buildSong());
      const safe =
        buildSong().title.replace(/[^\w\- ]+/g, "").trim() || "song";
      downloadBlob(blob, `${safe}.wav`);
      setStatus("Exported a WAV of your song.");
    } catch {
      setStatus("WAV export is unavailable in this browser.");
    } finally {
      setIsBusy(false);
    }
  }, [buildSong]);

  return (
    <div className="space-y-8">
      <section
        aria-label="Song settings"
        className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-bold text-slate-200">
            Song title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-base font-normal text-white placeholder:text-slate-500"
              placeholder="Name your song"
            />
          </label>
          <label className="text-sm font-bold text-slate-200 sm:w-64">
            Tempo: {bpm} BPM
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
              className="mt-2 w-full accent-cyan-300"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {isPlaying ? (
            <button
              type="button"
              onClick={stopPlayback}
              className="rounded-xl bg-rose-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-rose-300"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlay}
              disabled={tracks.length === 0}
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Play (loop)
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-bold text-white hover:bg-white/[.12]"
          >
            Save to browser
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-bold text-white hover:bg-white/[.12]"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-bold text-white hover:bg-white/[.12]"
          >
            Copy JSON
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-bold text-white hover:bg-white/[.12]"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={handleExportWav}
            disabled={isBusy || tracks.length === 0}
            className="rounded-xl border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-bold text-white hover:bg-white/[.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isBusy ? "Rendering…" : "Export WAV"}
          </button>
        </div>
        {status ? (
          <p role="status" className="mt-3 text-sm text-slate-300">
            {status}
          </p>
        ) : null}
      </section>

      <section aria-label="Tracks" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white">
            Tracks ({tracks.length})
          </h2>
          <button
            type="button"
            onClick={handleAddTrack}
            className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
          >
            Add track
          </button>
        </div>
        {tracks.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
            No tracks yet — add one to start sequencing.
          </p>
        ) : null}
        {tracks.map((track, index) => (
          <article
            key={track.id}
            aria-label={`Track ${index + 1}`}
            className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5"
          >
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
                Track {index + 1} · {track.notes.length}{" "}
                {track.notes.length === 1 ? "note" : "notes"}
              </h3>
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <label className="text-xs font-bold text-slate-400">
                  Instrument{" "}
                  <select
                    value={
                      INSTRUMENTS.includes(
                        track.inst as (typeof INSTRUMENTS)[number],
                      )
                        ? track.inst
                        : "square"
                    }
                    onChange={(event) =>
                      handleInstrumentChange(track.id, event.target.value)
                    }
                    className="ml-1 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-sm font-normal text-white"
                  >
                    {INSTRUMENTS.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveTrack(track.id)}
                  aria-label={`Remove track ${index + 1}`}
                  className="rounded-lg border border-rose-300/30 px-3 py-1 text-xs font-bold text-rose-200 hover:bg-rose-400/10"
                >
                  Remove
                </button>
              </div>
            </div>
            <StepSequencer
              notes={track.notes}
              steps={STEPS}
              onToggle={(step, midi) => handleToggleNote(track.id, step, midi)}
            />
          </article>
        ))}
      </section>

      <section
        aria-label="Sound effects lab"
        className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-6"
      >
        <h2 className="text-xl font-black text-white">SFX lab</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Design one-shot rayguns, jumps, and explosions to pair with your
          song.
        </p>
        <div className="mt-4">
          <SfxLab />
        </div>
      </section>
    </div>
  );
}
