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
// Fully static marketing content: no cookies/headers/searchParams ('days').
const TRACKS = [
  { title: "Game Dev & WebGL", desc: "Godot & HTML5", done: "0/5 Completed", pct: "0%", tags: ["Godot", "WebGL", "HTML5"] },
  { title: "AI Agents & Swarm", desc: "Orchestration", done: "0/5 Completed", pct: "0%", tags: ["Agents", "Swarm", "Prompts"] },
  { title: "Decentralized Compute", desc: "Tokenomics", done: "0/5 Completed", pct: "0%", tags: ["Compute", "Coins", "P2P"] },
];
async function CachedAcademyBody() {
  'use cache';
  cacheLife('days');
  return <div className="space-y-4"><p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-widest text-muted-foreground"><span>14 Free Courses</span><span aria-hidden="true">|</span><span>3 Tracks</span><span aria-hidden="true">|</span><span>Earn Vibe Badges</span></p><div className="grid gap-2.5 md:grid-cols-3 md:gap-3.5">{TRACKS.map((t) => (<article key={t.title} className="rounded-2xl border border-white/10 bg-white/[.04] p-3.5 md:p-4"><h2 className="text-base font-bold">{t.title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={5} aria-label={`${t.title} progress`}><div className="h-full rounded-full bg-cyan-300" style={{ width: t.pct }} /></div><p className="mt-1 text-[11px] text-muted-foreground">{t.done}</p><p className="mt-1.5 flex flex-wrap gap-1">{t.tags.map((tag) => (<span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px]">{tag}</span>))}</p><Link href="/games" className="mt-2 inline-block text-sm font-semibold text-cyan-300">Start Module →</Link></article>))}</div><div className="flex flex-wrap gap-4"><Link href="/games" className="rounded-full bg-cyan-300 px-5 py-2 font-bold text-slate-950">Learn through games</Link><Link href="/vibecodeworker/docs" className="rounded-full border border-white/20 px-5 py-2">Read the playtest manual</Link></div></div>;
}
export default function Page(){return <MarketingPage title="4weird Academy" intro="Decode your future through interactive lessons, experiments, and games."><Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}><CachedAcademyBody /></Suspense></MarketingPage>}
