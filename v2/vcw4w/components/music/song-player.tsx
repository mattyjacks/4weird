"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MAX_SONG_BYTES,
  sizeOf,
  validateSong,
} from "@/lib/music/format-4w";
import type { Song4W } from "@/lib/music/format-4w";
import {
  isMuted,
  pauseSong,
  playSong,
  resumeSong,
  setMuted,
  stopSong,
} from "@/lib/music/synth-4w";

export interface SongPlayerProps {
  song: Song4W;
  loop?: boolean;
}

type PlayerStatus = "idle" | "playing" | "paused" | "error";

function countNotes(song: Song4W): number {
  try {
    let total = 0;
    for (const track of song.tracks) total += track.notes.length;
    return total;
  } catch {
    return 0;
  }
}

function songLengthBeats(song: Song4W): number {
  try {
    let end = 0;
    for (const track of song.tracks) {
      for (const note of track.notes) {
        const noteEnd = note.t + note.d;
        if (noteEnd > end) end = noteEnd;
      }
    }
    return end;
  } catch {
    return 0;
  }
}

export function SongPlayer({ song, loop }: SongPlayerProps): React.JSX.Element {
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [message, setMessage] = useState("");
  const [muted, setMutedState] = useState<boolean>(() => {
    try {
      return isMuted();
    } catch {
      return false;
    }
  });

  const check = useMemo(() => {
    try {
      return validateSong(song);
    } catch {
      return { ok: false, errors: ["song: validation crashed (fail-open)"] };
    }
  }, [song]);

  const bytes = useMemo(() => {
    try {
      return sizeOf(song);
    } catch {
      return -1;
    }
  }, [song]);

  const notes = useMemo(() => countNotes(song), [song]);
  const beats = useMemo(() => songLengthBeats(song), [song]);

  useEffect(() => {
    return () => {
      try {
        stopSong();
      } catch {
        /* ignore on unmount */
      }
    };
  }, []);

  function onPlay(): void {
    if (!check.ok) {
      setStatus("error");
      setMessage(check.errors[0] ?? "Invalid song.");
      return;
    }
    try {
      stopSong();
      const started = playSong(song, { loop: loop ?? false });
      if (started) {
        setStatus("playing");
        setMessage("");
      } else {
        setStatus("error");
        setMessage("Audio unavailable in this browser (fail-open).");
      }
    } catch {
      setStatus("error");
      setMessage("Playback failed (fail-open).");
    }
  }

  function onPause(): void {
    try {
      pauseSong();
      setStatus("paused");
    } catch {
      /* fail-open */
    }
  }

  function onResume(): void {
    try {
      const ok = resumeSong();
      setStatus(ok ? "playing" : "paused");
    } catch {
      /* fail-open */
    }
  }

  function onStop(): void {
    try {
      stopSong();
    } catch {
      /* fail-open */
    }
    setStatus("idle");
  }

  function onToggleMute(): void {
    try {
      const next = !muted;
      setMuted(next);
      setMutedState(next);
    } catch {
      /* fail-open */
    }
  }

  const title =
    typeof song?.title === "string" && song.title !== "" ? song.title : "Untitled";
  const bpm = typeof song?.bpm === "number" ? song.bpm : 0;
  const tracks = Array.isArray(song?.tracks) ? song.tracks.length : 0;

  return (
    <section
      aria-label={`Song player: ${title}`}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4"
    >
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {bpm > 0 ? `${bpm} BPM` : "BPM unknown"} | {tracks}{" "}
          {tracks === 1 ? "track" : "tracks"} | {notes}{" "}
          {notes === 1 ? "note" : "notes"} | {beats} beats
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {bytes >= 0 ? `${bytes} / ${MAX_SONG_BYTES} bytes` : "size unknown"}
        </p>
      </div>

      {!check.ok ? (
        <p role="alert" className="text-xs text-red-300">
          Invalid song: {check.errors[0] ?? "unknown reason"}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {status === "playing" ? (
          <button
            type="button"
            onClick={onPause}
            aria-label={`Pause ${title}`}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Pause
          </button>
        ) : status === "paused" ? (
          <button
            type="button"
            onClick={onResume}
            aria-label={`Resume ${title}`}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            disabled={!check.ok}
            aria-label={`Play ${title}`}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            Play
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          disabled={status === "idle"}
          aria-label={`Stop ${title}`}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Unmute" : "Mute"}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>

      <p aria-live="polite" className="text-xs text-slate-400">
        {status === "playing"
          ? `Playing "${title}".`
          : status === "paused"
            ? `Paused "${title}".`
            : status === "error"
              ? message
              : ""}
      </p>
    </section>
  );
}
