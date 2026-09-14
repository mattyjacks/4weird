"use client";

import { useState } from "react";

export interface VocrehabSeedControlsProps {
  seed: string;
  mode: "random" | "seeded";
  onNewRandom: () => void;
  onUseSeed: (seed: string) => void;
}

export default function VocrehabSeedControls({
  seed,
  mode,
  onNewRandom,
  onUseSeed,
}: VocrehabSeedControlsProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(seed);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = seed;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } else {
        return;
      }
      setCopied(true);
      setError(null);
    } catch {
      setCopied(false);
      setError("Copy failed — long-press the seed to copy it manually.");
    }
  };

  const handleUseSeed = () => {
    const normalized = draft.trim().toUpperCase();
    if (!/^VR-[A-Z0-9]{6}$/.test(normalized)) {
      setError("Enter a seed like VR-ABC123.");
      return;
    }
    setError(null);
    onUseSeed(normalized);
  };

  return (
    <section
      aria-label="Practice seed controls"
      className="rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-label="Practice seed"
          className="rounded-xl border px-2 py-1 font-mono text-sm"
        >
          {seed}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy practice seed"
          className="rounded-xl border px-3 py-1 text-sm"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onNewRandom}
          aria-label="Start a new random mix"
          className="rounded-xl border px-3 py-1 text-sm"
        >
          New random
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="vocrehab-seed-input" className="text-sm">
          Set seed
        </label>
        <input
          id="vocrehab-seed-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          placeholder="VR-XXXXXX"
          aria-label="Set practice seed"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "vocrehab-seed-error" : undefined}
          autoComplete="off"
          spellCheck={false}
          className="rounded-xl border px-2 py-1 font-mono text-sm uppercase"
        />
        <button
          type="button"
          onClick={handleUseSeed}
          aria-label="Use entered seed"
          className="rounded-xl border px-3 py-1 text-sm"
        >
          Use
        </button>
      </div>

      {error ? (
        <p id="vocrehab-seed-error" role="alert" className="mt-2 text-sm">
          {error}
        </p>
      ) : null}

      {mode === "random" ? (
        <p className="mt-2 text-sm">
          Every load is a fresh mix unless a seed is set.
        </p>
      ) : null}
    </section>
  );
}
