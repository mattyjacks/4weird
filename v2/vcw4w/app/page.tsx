import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { featuredGames } from "@/content/games";

export default function Home() {
  return <main className="min-h-screen bg-slate-950 text-white"><SiteHeader /><section className="mx-auto max-w-6xl px-5 py-24"><p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">4weird Games</p><h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-7xl">Future Forward Fun</h1><p className="mt-6 max-w-2xl text-lg text-slate-300">A strange, joyful arcade of experiments, simulations, and worlds made for curious people.</p><div className="mt-9 flex gap-4"><Link className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950" href="/games">Explore the games</Link><Link className="rounded-full border border-white/20 px-6 py-3 font-semibold" href="/vibecodeworker">Meet VibeCodeWorker</Link></div></section><section className="mx-auto max-w-6xl px-5 pb-24"><h2 className="mb-6 text-2xl font-bold">Featured experiments</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featuredGames().slice(0, 6).map((game) => <Link key={game.slug} href={`/games/${game.slug}`} className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:border-cyan-300/60"><div className="text-3xl">{game.emoji}</div><h3 className="mt-4 font-bold">{game.title}</h3><p className="mt-2 text-sm text-slate-400">{game.description}</p></Link>)}</div></section><SiteFooter /></main>;
}
