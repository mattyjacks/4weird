import type { Metadata } from "next";
import { Suspense } from "react";
import { GhostTimer } from "@/components/ghost/ghost-timer";
import { BusinessCrosslinks } from "@/components/business/business-crosslinks";

export const metadata: Metadata = {
  title: "Ghost Timer - Who Owes Whom",
  description: "Org work clock with second-precision tracking and hypothetical Ghost (👻) IOUs. Not money, no value; a ruler for debts.",
};

// NOTE: no 'use cache' here — per-user clock/session state streams in
// Suspense; static shell (title/copy/crosslinks) prerenders.
export default function TimerPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl gap-3 px-4 py-3">
        {/* Compact inline title bar: Ghost timer widget sits directly below at y:64 */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <h1 className="text-lg font-black">⏱️ Timer + 👻 Ghost</h1>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
            4WEIRD // ORG TOOLING
          </span>
          <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 xl:block">
            Second-precision org clock; Ghost has no legal value — a ruler for debts.
          </p>
          {/* 8 org tool shortcuts → compact header drawer */}
          <details className="relative">
            <summary className="h-10 cursor-pointer list-none items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-slate-200 hover:border-cyan-300/40 [&::-webkit-details-marker]:hidden">
              🧰 Tools
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-80 rounded-xl border border-white/10 bg-slate-900 p-3.5 shadow-xl">
              <BusinessCrosslinks exclude={["/timer"]} />
              <p className="mt-2 text-[11px] leading-snug text-slate-500">
                Contracts: <b>/business/contracts</b> · clients: CRM · proof: Vault · diary: CSV export.
              </p>
            </div>
          </details>
        </header>
        {/* Hero timer widget first — single-row toolbar + metric ribbon live inside GhostTimer (untouched) */}
        <div className="mt-3">
          <Suspense fallback={<p className="rounded-xl border border-white/10 bg-white/[.04] p-3.5 text-center text-sm text-slate-400">Loading timer…</p>}>
            <GhostTimer />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
