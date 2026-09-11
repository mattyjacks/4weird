import type { Metadata } from "next";
import { GhostTimer } from "@/components/ghost/ghost-timer";

export const metadata: Metadata = {
  title: "Ghost Timer — Who Owes Whom",
  description: "Org work clock with second-precision tracking and hypothetical Ghost Cash (👻💵) IOUs. Not money, no value — a ruler for debts.",
};

export default function TimerPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
        <p className="text-sm font-bold tracking-widest text-cyan-300">4WEIRD // ORG TOOLING</p>
        <h1 className="mt-2 text-4xl font-black">⏱️ Timer + 👻💵 Ghost Cash</h1>
        <p className="mt-3 text-slate-300">
          Clock org work to the second, prove presence with activity beats, and settle up in Ghost Cash — a
          centrally-controlled hypothetical unit with <b>no legal value</b>: it measures debts, stores nothing, buys
          nothing.
        </p>
        <div className="mt-8">
          <GhostTimer />
        </div>
      </section>
    </main>
  );
}
