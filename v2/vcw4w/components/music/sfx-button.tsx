"use client";

import { useMemo, useState } from "react";
import {
  MAX_SFX_BYTES,
  sizeOf,
  validateSfx,
} from "@/lib/music/format-4w";
import type { Sfx4W } from "@/lib/music/format-4w";
import { playSfx } from "@/lib/music/synth-4w";

export interface SfxButtonProps {
  sfx: Sfx4W;
  label?: string;
}

type SfxStatus = "idle" | "playing" | "error";

export function SfxButton({ sfx, label }: SfxButtonProps): React.JSX.Element {
  const [status, setStatus] = useState<SfxStatus>("idle");
  const [message, setMessage] = useState("");

  const check = useMemo(() => {
    try {
      return validateSfx(sfx);
    } catch {
      return { ok: false, errors: ["sfx: validation crashed (fail-open)"] };
    }
  }, [sfx]);

  const bytes = useMemo(() => {
    try {
      return sizeOf(sfx);
    } catch {
      return -1;
    }
  }, [sfx]);

  function onPlay(): void {
    if (!check.ok) {
      setStatus("error");
      setMessage(check.errors[0] ?? "Invalid SFX.");
      return;
    }
    try {
      const started = playSfx(sfx);
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

  const name =
    typeof sfx?.name === "string" && sfx.name !== "" ? sfx.name : "Untitled SFX";
  const kind = typeof sfx?.kind === "string" ? sfx.kind : "unknown";
  const steps = Array.isArray(sfx?.steps) ? sfx.steps.length : 0;
  const text = typeof label === "string" && label !== "" ? label : `Play ${name}`;

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={onPlay}
          disabled={!check.ok}
          aria-label={text}
          title={
            check.ok
              ? `${name} (${kind}, ${steps} ${steps === 1 ? "step" : "steps"}${bytes >= 0 ? `, ${bytes} / ${MAX_SFX_BYTES} bytes` : ""})`
              : `Invalid SFX: ${check.errors[0] ?? "unknown reason"}`
          }
          className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          {text}
        </button>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
          {kind}
        </span>
      </span>
      <span aria-live="polite" className="text-xs text-slate-400">
        {status === "playing"
          ? `Played "${name}".`
          : status === "error"
            ? message
            : ""}
      </span>
    </span>
  );
}
