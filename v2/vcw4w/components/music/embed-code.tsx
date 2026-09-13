"use client";

import { useMemo, useState } from "react";
import {
  MAX_SFX_BYTES,
  MAX_SONG_BYTES,
  encodeSfx,
  encodeSong,
  sizeOf,
  validateSfx,
  validateSong,
} from "@/lib/music/format-4w";
import type { Sfx4W, Song4W } from "@/lib/music/format-4w";

export interface EmbedCodeProps {
  song?: Song4W;
  sfx?: Sfx4W;
  sharePath?: string;
}

function toBase64Ascii(input: string): string {
  try {
    if (typeof window !== "undefined" && typeof window.btoa === "function") {
      return window.btoa(input);
    }
    const buf = (
      globalThis as unknown as {
        Buffer?: { from(s: string, e: string): { toString(e: string): string } };
      }
    ).Buffer;
    if (buf) return buf.from(input, "utf8").toString("base64");
    return "";
  } catch {
    return "";
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

function downloadJson(filename: string, json: string): boolean {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return false;
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * EmbedCode: copyable canonical 4W-1 JSON + byte budget meter + share link.
 * Exactly one of song/sfx must be a valid payload; otherwise a diagnostic
 * is shown and actions are disabled (fail-closed display, fail-open runtime).
 */
export function EmbedCode({ song, sfx, sharePath }: EmbedCodeProps): React.JSX.Element {
  const [status, setStatus] = useState("");

  const model = useMemo(() => {
    try {
      if (song !== undefined && sfx !== undefined) {
        return {
          kind: "error" as const,
          label: "Embed",
          json: "",
          bytes: -1,
          budget: MAX_SONG_BYTES,
          errors: ["embed: pass exactly one of song/sfx, not both"],
        };
      }
      if (song !== undefined) {
        const check = validateSong(song);
        let json = "";
        try {
          json = check.ok ? encodeSong(song) : JSON.stringify(song);
        } catch {
          json = "";
        }
        return {
          kind: "song" as const,
          label:
            typeof song?.title === "string" && song.title !== ""
              ? song.title
              : "Untitled",
          json,
          bytes: sizeOf(song),
          budget: MAX_SONG_BYTES,
          errors: check.errors,
        };
      }
      if (sfx !== undefined) {
        const check = validateSfx(sfx);
        let json = "";
        try {
          json = check.ok ? encodeSfx(sfx) : JSON.stringify(sfx);
        } catch {
          json = "";
        }
        return {
          kind: "sfx" as const,
          label:
            typeof sfx?.name === "string" && sfx.name !== "" ? sfx.name : "Untitled SFX",
          json,
          bytes: sizeOf(sfx),
          budget: MAX_SFX_BYTES,
          errors: check.errors,
        };
      }
      return {
        kind: "error" as const,
        label: "Embed",
        json: "",
        bytes: -1,
        budget: MAX_SONG_BYTES,
        errors: ["embed: pass song or sfx"],
      };
    } catch {
      return {
        kind: "error" as const,
        label: "Embed",
        json: "",
        bytes: -1,
        budget: MAX_SONG_BYTES,
        errors: ["embed: failed to encode (fail-open)"],
      };
    }
  }, [song, sfx]);

  const valid = model.errors.length === 0 && model.json !== "";
  const overBudget = model.bytes >= 0 && model.bytes > model.budget;

  const shareLink = useMemo(() => {
    try {
      if (!valid || model.json === "") return "";
      const b64 = toBase64Ascii(model.json);
      if (b64 === "") return "";
      const base = typeof sharePath === "string" && sharePath !== "" ? sharePath : "/music/maker";
      const param = model.kind === "sfx" ? "sfx" : "song";
      const encoded = encodeURIComponent(b64);
      return `${base}?${param}=${encoded}`;
    } catch {
      return "";
    }
  }, [valid, model.json, model.kind, sharePath]);

  async function onCopy(): Promise<void> {
    if (!valid) return;
    const ok = await copyText(model.json);
    setStatus(ok ? "Copied canonical JSON." : "Copy failed in this browser.");
  }

  function onDownload(): void {
    if (!valid) return;
    const safe = model.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const name = model.kind === "sfx" ? `${safe || "sfx"}.sfx.json` : `${safe || "song"}.song.json`;
    const ok = downloadJson(name, model.json);
    setStatus(ok ? "Downloaded JSON." : "Download failed in this browser.");
  }

  async function onCopyLink(): Promise<void> {
    if (shareLink === "") return;
    const ok = await copyText(shareLink);
    setStatus(ok ? "Copied share link." : "Copy failed in this browser.");
  }

  return (
    <section
      aria-label={`Embed code: ${model.label}`}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4"
    >
      <div>
        <h3 className="text-base font-bold text-white">{model.label}</h3>
        <p className="mt-1 text-xs text-slate-400">
          {model.bytes >= 0
            ? `${model.bytes} / ${model.budget} bytes${overBudget ? " (OVER BUDGET)" : ""}`
            : "size unknown"}
        </p>
      </div>

      {!valid ? (
        <p role="alert" className="text-xs text-red-300">
          Invalid payload: {model.errors[0] ?? "unknown reason"}
        </p>
      ) : null}

      {model.json !== "" ? (
        <pre
          aria-label="Canonical 4W-1 JSON"
          className="max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-relaxed text-slate-200"
        >
          {model.json}
        </pre>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onCopy()}
          disabled={!valid}
          aria-label="Copy canonical JSON"
          className="rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
        >
          Copy JSON
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={!valid}
          aria-label="Download JSON"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          Download
        </button>
        <button
          type="button"
          onClick={() => void onCopyLink()}
          disabled={!valid || shareLink === ""}
          aria-label="Copy share link"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          Copy share link
        </button>
      </div>

      {shareLink !== "" ? (
        <p className="break-all text-xs text-slate-400">{shareLink}</p>
      ) : null}

      <p aria-live="polite" className="text-xs text-slate-400">
        {status}
      </p>
    </section>
  );
}
