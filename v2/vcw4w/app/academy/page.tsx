import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { MarketingPage } from "@/components/site/marketing-page";

export const metadata: Metadata = {
  title: "4weird Academy - Learn AI Through Play",
  description:
    "4weird Academy teaches AI concepts and capabilities through interactive lessons, experiments, and 35 playable browser games. Decode your future by playing.",
  keywords: ["learn AI", "AI education", "AI lessons through games", "interactive AI experiments"],
  alternates: { canonical: "/academy" },
};
// Fully static marketing CTAs: no cookies/headers/searchParams ('days').
async function CachedAcademyBody() {
  'use cache';
  cacheLife('days');
  return <div className="flex flex-wrap gap-4"><Link href="/games" className="rounded-full bg-cyan-300 px-5 py-2 font-bold text-slate-950">Learn through games</Link><Link href="/vibecodeworker/docs" className="rounded-full border border-white/20 px-5 py-2">Read the playtest manual</Link></div>;
}
export default function Page(){return <MarketingPage title="4weird Academy" intro="Decode your future through interactive lessons, experiments, and games."><Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}><CachedAcademyBody /></Suspense></MarketingPage>}
