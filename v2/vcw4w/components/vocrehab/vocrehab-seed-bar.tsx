"use client";

import { useState } from "react";

export interface VocrehabSeedBarProps {
  seed: string;
  onSeedChange(next: string): void;
}

const VOCREHAB_SEED_PATTERN = /^VRHB-[A-Z0-9]{6}$/;
const VOCREHAB_SEED_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const VOCREHAB_SEED_BODY_LENGTH = 6;

function vocrehabGenerateSeed(): string {
  let body = "";
  for (let i = 0; i < VOCREHAB_SEED_BODY_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * VOCREHAB_SEED_ALPHABET.length);
    body += VOCREHAB_SEED_ALPHABET[index];
  }
  return `VRHB-${body}`;
}

export default function VocrehabSeedBar({ seed, onSeedChange }: VocrehabSeedBarProps) {
  const [vocrehabInput, setVocrehabInput] = useState("");
  const [vocrehabStatus, setVocrehabStatus] = useState("");

  async function vocrehabHandleCopy(): Promise<void> {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(seed);
        setVocrehabStatus("Seed copied. You can paste it anywhere.");
        return;
      }
      throw new Error("clipboard unavailable");
    } catch {
      if (typeof window !== "undefined" && typeof window.prompt === "function") {
        window.prompt("Copy your practice seed:", seed);
        setVocrehabStatus("Automatic copy is not available here — your seed is shown above so you can copy it by hand.");
      } else {
        setVocrehabStatus("Copy is not available here. Your seed is shown above.");
      }
    }
  }

  function vocrehabHandleLoad(): void {
    const normalized = vocrehabInput.trim().toUpperCase();
    if (VOCREHAB_SEED_PATTERN.test(normalized)) {
      onSeedChange(normalized);
      setVocrehabInput("");
      setVocrehabStatus(`Loaded seed ${normalized}.`);
    } else {
      setVocrehabStatus("That seed doesn't look right. Seeds look like VRHB-ABC123 — check it and try again.");
    }
  }

  function vocrehabHandleShuffle(): void {
    const next = vocrehabGenerateSeed();
    onSeedChange(next);
    setVocrehabInput("");
    setVocrehabStatus(`New seed ${next} ready.`);
  }

  return (
    <section aria-label="Practice seed controls" className="vocrehab-seed-bar space-y-3">
      <p className="vocrehab-seed-current">
        <span className="vocrehab-seed-label">Practice seed: </span>
        <output className="vocrehab-seed-value" aria-label="Current practice seed">
          {seed}
        </output>
      </p>
      <div className="vocrehab-seed-actions flex flex-wrap gap-2">
        <button type="button" onClick={vocrehabHandleCopy} className="vocrehab-seed-copy rounded border px-3 py-1.5 text-sm font-medium">
          Copy
        </button>
        <button type="button" onClick={vocrehabHandleShuffle} className="vocrehab-seed-shuffle rounded border px-3 py-1.5 text-sm font-medium">
          Shuffle
        </button>
      </div>
      <form
        className="vocrehab-seed-form flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          vocrehabHandleLoad();
        }}
      >
        <div className="vocrehab-seed-field space-y-1">
          <label htmlFor="vocrehab-seed-input" className="vocrehab-seed-input-label block text-sm font-medium">
            Load a seed
          </label>
          <input
            id="vocrehab-seed-input"
            type="text"
            value={vocrehabInput}
            onChange={(event) => setVocrehabInput(event.target.value)}
            placeholder="VRHB-ABC123"
            autoComplete="off"
            spellCheck={false}
            className="vocrehab-seed-input rounded border px-3 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="vocrehab-seed-load rounded border px-3 py-1.5 text-sm font-medium">
          Load
        </button>
      </form>
      <p role="status" aria-live="polite" className="vocrehab-seed-status text-sm">
        {vocrehabStatus}
      </p>
    </section>
  );
}
