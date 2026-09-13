"use client";

import { useState } from "react";
import { DICTATE_AI_STUBS, type DictateAiStubId } from "@/types/dictate-pic";

interface DictateAiStubsProps {
  onStubAction: (id: DictateAiStubId) => string;
}

/**
 * AI tool stubs (§3.2: AI Inpainting Brush, AI Background Remover,
 * AI Upscaler x4, Slice Spritesheet). WAVE-3 STUB PANEL — every action is
 * a clearly-marked no-op with fail-open messaging. No fetch, no backend,
 * no API route is called from here. When a backend lands, `futureRoute`
 * (see `types/dictate-pic.ts`) is the contract to wire.
 */
export function DictateAiStubs({ onStubAction }: DictateAiStubsProps) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section
      aria-label="AI tools (stubs, no backend)"
      className="flex w-64 flex-col gap-2 rounded-xl border border-dashed border-amber-700/60 bg-slate-900 p-3"
    >
      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
        AI Tools · STUB
      </h2>
      <p className="text-[10px] leading-snug text-slate-400">
        No backend wired in Wave 3 — actions explain themselves and emit an
        interop event instead of calling a model.
      </p>

      {DICTATE_AI_STUBS.map((stub) => (
        <div
          key={stub.id}
          className="rounded-lg border border-slate-700 bg-slate-950 p-2"
        >
          <p className="text-xs font-bold text-slate-200">{stub.title}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
            {stub.blurb}
          </p>
          <button
            type="button"
            onClick={() => setNotice(onStubAction(stub.id))}
            className="mt-1.5 w-full rounded bg-slate-800 px-1 py-1 text-[11px] font-bold text-amber-200 hover:bg-slate-700"
          >
            Try (stub)
          </button>
        </div>
      ))}

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-2 text-[11px] leading-snug text-amber-200"
        >
          {notice}
        </p>
      )}
    </section>
  );
}
