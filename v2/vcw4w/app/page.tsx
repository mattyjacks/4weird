import Link from "next/link";
import { featuredGames } from "@/content/games";

export default function Home() {
  return (
    <div className="bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-24">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
          4weird Games
        </p>
        <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Future Forward Fun
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          A strange, joyful arcade of experiments, simulations, and worlds made for curious people.
          Play 34 browser games, join clans, rent AI agents, and spend Vibe Coins where 100 coins
          always equals exactly $1.00.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
          <Link
            className="rounded-full bg-cyan-300 px-6 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-200"
            href="/games"
          >
            Explore the games
          </Link>
          <Link
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
            href="/pricing"
          >
            See pricing
          </Link>
          <Link
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
            href="/vibecodeworker"
          >
            Meet VibeCodeWorker
          </Link>
        </div>
        <dl className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-4">
          {[
            ["34", "playable games"],
            ["100 = $1.00", "coin promise"],
            ["25%", "max compute cut"],
            ["$420/mo", "self-hosted"],
          ].map(([stat, label]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
              <dt className="text-xl font-black text-cyan-300 sm:text-2xl">{stat}</dt>
              <dd className="mt-1 text-xs text-slate-400 sm:text-sm">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold sm:text-3xl">Featured experiments</h2>
          <Link href="/games" className="text-sm font-semibold text-cyan-300 hover:underline">
            Browse all 34 →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredGames()
            .slice(0, 6)
            .map((game) => (
              <Link
                key={game.slug}
                href={`/games/${game.slug}`}
                className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:border-cyan-300/60 hover:bg-white/[.06]"
              >
                <div className="text-3xl" aria-hidden="true">
                  {game.emoji}
                </div>
                <h3 className="mt-4 font-bold">{game.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{game.description}</p>
              </Link>
            ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Link
            href="/agents"
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-300/15 to-transparent p-6 transition hover:border-cyan-300/50"
          >
            <h3 className="font-bold">🤖 Rent AI agents</h3>
            <p className="mt-2 text-sm text-slate-400">
              Hourly agents with coin escrow. Compute carries a 25% premium, never more.
            </p>
          </Link>
          <Link
            href="/teams"
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-400/15 to-transparent p-6 transition hover:border-violet-300/50"
          >
            <h3 className="font-bold">🚀 UnitUnite workspaces</h3>
            <p className="mt-2 text-sm text-slate-400">
              Teams, projects, messaging, and metered cloud in one workspace.
            </p>
          </Link>
          <Link
            href="/pricing"
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-300/15 to-transparent p-6 transition hover:border-amber-300/50"
          >
            <h3 className="font-bold">💰 Self-host for $420/mo</h3>
            <p className="mt-2 text-sm text-slate-400">
              Bring your own keys and pay just a 15% compute premium. BYOK.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
