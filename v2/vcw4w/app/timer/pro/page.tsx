import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TimerProClient } from "./pro-client";

export const metadata: Metadata = {
  title: "Pro Time Tracker | 4weird Timer",
  description:
    "Drift-free professional work clock with project rates, weekly reports, and 1-click invoice memoranda. 100 Vibe Coins = $1.",
  alternates: { canonical: "/timer/pro" },
};


// NOTE: no 'use cache' here — per-user clock entries stream in Suspense;
// static shell (title/copy) prerenders.
export default function TimerProPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl gap-3 px-4 py-3">
        {/* Inline back navigation + compact title bar (no dedicated banner row) */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <Link className="text-xs font-bold text-cyan-300 hover:underline" href="/timer">
            ← Ghost Timer
          </Link>
          <h1 className="text-lg font-black">⏱ Pro Time Tracker</h1>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
            SQUAD TOOLING
          </span>
          <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-400 xl:block">
            Drift-free clock (<code>performance.now()</code>) · CSV feeds invoices at 100 🪙 = $1.
          </p>
        </header>
        <div className="mt-3">
          <Suspense fallback={<p className="rounded-xl border border-white/10 bg-white/[.04] p-3.5 text-center text-sm text-slate-400">Loading pro tracker…</p>}>
            <TimerProClient />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
