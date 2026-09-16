import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolShell } from "@/components/tools/tool-shell";
import { CounterTools } from "@/components/tools/counter-tools";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/counter" },
  title: "Counter Tools | Free Tools | 4weird Games",
  description:
    "Free counter tools: live word, character, sentence, and paragraph counts plus reading and speaking time. Runs in your browser, no signup.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Free tool · Counter"
      title="Counter Tools"
      blurb="Paste quest text, lore, patch notes, or essays — counts, reading time, and speaking time update live as you type."
    >
      {/* LAYOUT-ONLY (UXPASS p54): compact workbench wrapper; editor 65% | sticky metrics 35% + top ribbon live in CounterTools. */}
      <div className="grid min-w-0 gap-3">
        <Suspense
          fallback={
            <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm text-slate-400">
              Loading counter tools…
            </p>
          }
        >
          <CounterTools />
        </Suspense>
      </div>
    </ToolShell>
  );
}
