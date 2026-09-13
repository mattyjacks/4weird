import type { Metadata } from "next";
import Link from "next/link";
import { TimerProClient } from "./pro-client";

export const metadata: Metadata = {
  title: "Pro Time Tracker | 4weird Timer",
  description:
    "Drift-free professional work clock with project rates, weekly reports, and 1-click invoice memoranda. 100 Vibe Coins = $1.",
  alternates: { canonical: "/timer/pro" },
};

export const dynamic = "force-dynamic";

export default function TimerProPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl space-y-6 px-5 py-10 sm:py-16">
        <Link className="text-sm text-cyan-300 hover:underline" href="/timer">
          ← Ghost Timer
        </Link>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
            4weird // squad tooling
          </p>
          <h1 className="mt-2 text-4xl font-black">⏱ Pro Time Tracker</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            A drift-free work clock (anchored to <code>performance.now()</code>, so
            minimized tabs never lose seconds), project rates, a weekly report, and CSV
            export that feeds invoice memoranda at 100 🪙 = $1.
          </p>
        </div>
        <TimerProClient />
      </section>
    </main>
  );
}
