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
      <section className="mx-auto max-w-6xl gap-2 px-4 py-2">
        {/* Compact inline title bar: Ghost timer widget sits directly below at y:64 */}
        <header className="sticky top-14 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur">
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
        {/* Docked timer console + embedded shift ledger (layout frame only; toolbar,
            ledger table, and CSV export wiring live inside GhostTimer — untouched) */}
        <div className="mt-2" id="shift-ledger">
          <Suspense fallback={<p className="rounded-xl border border-white/10 bg-white/[.04] p-3.5 text-center text-sm text-slate-400">Loading timer…</p>}>
            <GhostTimer />
          </Suspense>
        </div>
        {/* Utility strip replaces generic marketing footers (intentionally no promo blocks):
            summary stats + CSV/invoice actions live per-row inside the ledger above. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[11px] text-slate-400">
          <span>Shift ledger docked above — no scrolling past promo blocks.</span>
          <span aria-hidden="true">·</span>
          <span title="Per-shift durations, activity %, and who-owes-whom balances render live in the ledger above">
            📊 Summary stats live in ledger
          </span>
          <span aria-hidden="true">·</span>
          <a
            href="#shift-ledger"
            title="Jump to the shift ledger — work-diary CSV exports from the Open timers card"
            className="font-semibold text-cyan-300 hover:text-cyan-200"
          >
            📥 Export CSV ↓
          </a>
          <span aria-hidden="true">·</span>
          <span>Work-diary CSV + Invoice actions ride with each ledger row.</span>
          <span aria-hidden="true">·</span>
          <a href="/timer/pro" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Pro tracker →
          </a>
        </div>
      </section>
    </main>
  );
}
