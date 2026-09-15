"use client";

import { useState } from "react";

const COMMANDS = ["help", "games", "coins", "gpu", "about", "date", "whoami", "goto /games", "history", "clear"];

export function CommandTray() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(cmd);
      window.setTimeout(() => setCopied((c) => (c === cmd ? null : c)), 1200);
    } catch {
      // Clipboard blocked: chips stay visible as a reference list.
    }
  }

  return (
    <div
      aria-label="Command autocomplete tray — tap a chip to copy, then paste at the prompt"
      className="mt-1.5 flex shrink-0 items-center gap-1 overflow-x-auto pb-0.5"
    >
      {COMMANDS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => copy(c)}
          title={`Copy "${c}" then paste at the 4weird$ prompt below`}
          className="shrink-0 rounded-md border border-white/10 bg-white/[.03] px-2 py-1 font-mono text-[10px] text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
        >
          {copied === c ? "copied ✓" : c}
        </button>
      ))}
      <span className="ml-1 shrink-0 text-[10px] text-slate-500">
        tap to copy → paste at 4weird$ (prompt pinned below, autofocused)
      </span>
    </div>
  );
}
