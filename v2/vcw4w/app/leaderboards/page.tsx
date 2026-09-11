import type { Metadata } from "next";
import { LeaderboardBrowser } from "@/components/games/leaderboard-browser";

export const metadata: Metadata = {
  title: "Leaderboards - Top Players",
  description: "Top players across 4weird Games: per-game kills, actions, and play-time from aggregate telemetry. Set a public handle to appear by name.",
  keywords: ["game leaderboards", "top players", "arcade high scores"],
  alternates: { canonical: "/leaderboards" },
};

export default function LeaderboardsPage() {
  return <main className="min-h-screen bg-slate-950 text-white"><section className="mx-auto max-w-4xl px-5 py-16"><h1 className="text-4xl font-black">Leaderboards</h1><p className="mt-3 text-slate-300">The best runs on the station, ranked from aggregate play. Set a public handle in your account to appear by name.</p><div className="mt-8"><LeaderboardBrowser /></div></section></main>;
}
