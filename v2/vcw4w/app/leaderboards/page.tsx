import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { LeaderboardBrowser } from "@/components/games/leaderboard-browser";

export const metadata: Metadata = { title: "Leaderboards", description: "Top players across 4weird Games — handles and totals only." };

export default function LeaderboardsPage() {
  return <main id="main-content" className="min-h-screen bg-slate-950 text-white"><SiteHeader /><section className="mx-auto max-w-4xl px-5 py-16"><h1 className="text-4xl font-black">Leaderboards</h1><p className="mt-3 text-slate-300">The best runs on the station, ranked from aggregate play. Set a public handle in your account to appear by name.</p><div className="mt-8"><LeaderboardBrowser /></div></section></main>;
}
