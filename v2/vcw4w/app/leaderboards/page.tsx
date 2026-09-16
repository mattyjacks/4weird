import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LeaderboardBrowser } from "@/components/games/leaderboard-browser";

export const metadata: Metadata = {
  title: "Leaderboards - Top Players",
  description: "Top players across 4weird Games: per-game kills, actions, and play-time from aggregate telemetry. Set a public handle to appear by name.",
  keywords: ["game leaderboards", "top players", "arcade high scores"],
  alternates: { canonical: "/leaderboards" },
};

export default function LeaderboardsPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      {/* Compact 40px toolbar: title + context inline; Game/metric/timeframe controls live in the browser below */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-10 max-w-5xl items-center gap-3 px-4">
          <h1 className="shrink-0 text-base font-black">Leaderboards</h1>
          <p className="hidden truncate text-xs text-slate-400 md:block">
            Best runs on the station, ranked from aggregate play · set a public handle to appear by name
          </p>
          <Link
            href="/games"
            className="ml-auto shrink-0 rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-200"
          >
            Launch Game →
          </Link>
        </div>
      </div>
      <section className="mx-auto max-w-5xl px-4 py-3">
        <p className="text-xs text-slate-400 md:hidden">
          Best runs on the station, ranked from aggregate play. Set a public handle to appear by name.
        </p>
        <div className="mt-2 md:mt-0">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading leaderboard…</p>}>
            <LeaderboardBrowser />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
