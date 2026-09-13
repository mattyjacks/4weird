"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_SONG_BYTES,
  sizeOf,
  validateSong,
} from "@/lib/music/format-4w";
import type { Song4W } from "@/lib/music/format-4w";
import { playSong, stopSong } from "@/lib/music/synth-4w";

export interface SongCardProps {
  song: Song4W;
  compact?: boolean;
}

export interface SongGridProps {
  initial?: unknown[];
  limit?: number;
}

type PreviewStatus = "idle" | "playing" | "error";

function countNotes(song: Song4W): number {
  try {
    let total = 0;
    for (const track of song.tracks) total += track.notes.length;
    return total;
  } catch {
    return 0;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("clipboard unavailable");
  } catch {
    try {
      if (typeof document === "undefined") return false;
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function SongCard({ song, compact }: SongCardProps): React.JSX.Element {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [copied, setCopied] = useState(false);
  const stopRef = useRef(false);

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

  useEffect(() => {
    stopRef.current = false;
    return () => {
      stopRef.current = true;
      try {
        stopSong();
      } catch {
        /* ignore on unmount */
      }
    };
  }, []);

  const onPreview = useCallback(() => {
    if (!check.ok) {
      setStatus("error");
      return;
    }
    try {
      stopSong();
      const started = playSong(song);
      setStatus(started ? "playing" : "error");
    } catch {
      setStatus("error");
    }
  }, [check.ok, song]);

  const onStop = useCallback(() => {
    try {
      stopSong();
    } catch {
      /* fail-open */
    }
    setStatus("idle");
  }, []);

  const onCopy = useCallback(() => {
    let json = "";
    try {
      json = JSON.stringify(song, null, 2);
    } catch {
      setCopied(false);
      return;
    }
    void copyText(json).then((ok) => {
      if (!stopRef.current) setCopied(ok);
    });
  }, [song]);

  const title =
    typeof song?.title === "string" && song.title !== "" ? song.title : "Untitled";
  const bpm = typeof song?.bpm === "number" ? song.bpm : 0;
  const tracks = Array.isArray(song?.tracks) ? song.tracks.length : 0;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-200">
          Song
        </span>
        {bpm > 0 ? (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
            {bpm} BPM
          </span>
        ) : null}
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      {compact ? null : (
        <p className="text-xs text-slate-400">
          {tracks} {tracks === 1 ? "track" : "tracks"} | {notes}{" "}
          {notes === 1 ? "note" : "notes"} |{" "}
          {bytes >= 0 ? `${bytes} / ${MAX_SONG_BYTES} bytes` : "size unknown"}
        </p>
      )}
      {!check.ok ? (
        <p role="alert" className="text-xs text-red-300">
          Invalid song: {check.errors[0] ?? "unknown reason"}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {status === "playing" ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={`Stop preview of ${title}`}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={onPreview}
            disabled={!check.ok}
            aria-label={`Preview ${title}`}
            className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            Preview
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${title} JSON`}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white"
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <p role="status" className="text-xs text-slate-400">
        {status === "error" && check.ok
          ? "Preview unavailable in this browser. "
          : null}
        {status === "playing" ? `Playing "${title}". ` : null}
        {bytes >= 0 ? `${bytes} bytes` : "size unknown"}
      </p>
    </article>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function LegacyCard({ item }: { item: unknown }): React.JSX.Element {
  let title = "Untitled loop";
  let kind = "loop";
  try {
    if (isRecord(item)) {
      if (typeof item.title === "string" && item.title !== "") title = item.title;
      if (typeof item.kind === "string" && item.kind !== "") kind = item.kind;
      if (typeof item.name === "string" && item.name !== "") title = item.name;
    }
  } catch {
    /* fail-open: keep defaults */
  }
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          {kind}
        </span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
          legacy format
        </span>
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-xs text-slate-400">
        Legacy $music:1 loop (pre-4W-1). Plays in the maker; 4W-1 transcription
        in progress.
      </p>
    </article>
  );
}

/**
 * SongGrid: tolerant 4W-1 grid for the /music and /music/all library pages.
 * Accepts unknown items (legacy $music:1 seeds included): valid 4W-1 songs
 * render as SongCard, anything else renders as a fail-open legacy card.
 */
export function SongGrid({ initial, limit }: SongGridProps): React.JSX.Element {
  const items = useMemo(() => {
    try {
      const list = Array.isArray(initial) ? initial : [];
      const n = typeof limit === "number" && limit >= 0 ? limit : list.length;
      return list.slice(0, n);
    } catch {
      return [];
    }
  }, [initial, limit]);

  if (items.length === 0) {
    return (
      <p
        role="status"
        className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
      >
        No songs yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        let valid = false;
        try {
          valid = validateSong(item).ok;
        } catch {
          valid = false;
        }
        if (valid) {
          return <SongCard key={index} song={item as Song4W} />;
        }
        return <LegacyCard key={index} item={item} />;
      })}
    </div>
  );
}
