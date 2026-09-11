import Link from "next/link";
import { featuredGames } from "@/content/games";

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero — cloud funds games, games bring people */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-24">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300 sm:text-sm">
          4weird Cloud + Games
        </p>
        <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Rent incredible computers. Fund incredible games.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          4weird sells simple, metered cloud computing — GPU and CPU time, AI agents, team
          workspaces, automated testing — and uses it to fund awesome games being created with AI.
          Those games bring people to the site, introduce AI concepts and capabilities through play,
          and send 🪙 Vibe Coins straight back to the creators.
        </p>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          One coin economy keeps it honest: <strong className="text-foreground">100 🪙 = exactly $1.00</strong>,
          and every cloud price already includes our <strong className="text-foreground">25% cut — never added on top</strong>.
          The other 75% goes to the providers and game makers doing the work.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
          <Link
            className="rounded-full bg-cyan-600 px-6 py-3 text-center font-bold text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
            href="/agents"
          >
            Rent cloud compute
          </Link>
          <Link
            className="rounded-full border border-border px-6 py-3 text-center font-semibold transition hover:bg-accent hover:text-accent-foreground"
            href="/games"
          >
            Play the games
          </Link>
          <Link
            className="rounded-full border border-border px-6 py-3 text-center font-semibold transition hover:bg-accent hover:text-accent-foreground"
            href="/pricing"
          >
            See pricing
          </Link>
        </div>
        <dl className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-4">
          {[
            ["100 🪙 = $1.00", "one coin promise, always"],
            ["25% cut", "included in every cloud price"],
            ["75% to makers", "providers & game creators"],
            ["34 games", "that teach AI by playing"],
          ].map(([stat, label]) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <dt className="text-xl font-black text-cyan-600 dark:text-cyan-300 sm:text-2xl">{stat}</dt>
              <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Flywheel */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="How 4weird works">
        <h2 className="text-2xl font-bold sm:text-3xl">The flywheel: compute funds play, play funds compute</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          It started with games. It expanded from there — because every game needs servers, AI,
          testing, and automation, and every developer needs the same. So we sell the cloud we
          already run, and every 🪙 spent keeps the arcade growing.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-2xl" aria-hidden="true">☁️</p>
            <h3 className="mt-3 font-bold">1. You rent cloud</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Test software, automate everything, run AI agents, or spin up team workspaces.
              Metered by the hour or second, escrowed in 🪙, settled transparently — one gross
              price, 25% platform / 75% provider.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-2xl" aria-hidden="true">🎮</p>
            <h3 className="mt-3 font-bold">2. Players discover AI through games</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI-built arcade games — dialogue bots, AI directors, voice acting, GPU-powered
              battles — introduce AI concepts and capabilities to curious people who just came
              to play.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-2xl" aria-hidden="true">🪙</p>
            <h3 className="mt-3 font-bold">3. Coins support the creators</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Every 🪙 spent on game time, game AI, and cloud flows back through the same split.
              Developers set their own rates, players see every cent on{" "}
              <Link href="/my/usage/" className="font-semibold text-cyan-600 underline-offset-4 hover:underline dark:text-cyan-300">
                /my/usage/
              </Link>
              , and makers earn while they build.
            </p>
          </div>
        </div>
      </section>

      {/* Cloud pitch */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Cloud computing services">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold sm:text-3xl">The easiest way to test software or automate everything</h2>
          <Link href="/vibecodeworker" className="text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-300">
            Meet VibeCodeWorker →
          </Link>
        </div>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          No datacenter degree required. Point VibeCodeWorker at your app and it watches, reasons,
          and acts — playtesting, debugging, and automating boring work on real cloud machines.
          We do incredible computer things so you can skip the setup and get to the result.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/agents"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-cyan-500/60 dark:hover:border-cyan-300/50"
          >
            <h3 className="font-bold">🤖 Rent AI agents by the hour</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              OpenClaw-style agents on real RunPod / DigitalOcean compute. Coin escrow, per-second
              metering, 25% cut included. Book time, watch it work, pay only for what ran.
            </p>
          </Link>
          <Link
            href="/vibecodeworker"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-cyan-500/60 dark:hover:border-cyan-300/50"
          >
            <h3 className="font-bold">⚙️ VibeCodeWorker testing</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The fastest way to test software: evidence-driven QA, playtest hubs, autoplay that
              plays your game for you, and full run histories. If it breaks, you get proof.
            </p>
          </Link>
          <Link
            href="/teams"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-violet-500/60 dark:hover:border-violet-300/50"
          >
            <h3 className="font-bold">🚀 UnitUnite workspaces</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Teams, projects, messaging, and metered cloud (GPU pods, serverless, storage, DB,
              queues) in one workspace — same 🪙, same 25% cut, same usage ledger.
            </p>
          </Link>
          <Link
            href="/buddy"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-amber-500/60 dark:hover:border-amber-300/50"
          >
            <h3 className="font-bold">🎙️ Game AI + Gaming Buddy</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dialogue bots, AI directors, and a 9-voice Buddy that reads the screen and coaches
              you live — all metered per token, character, or GPU minute with the 25% cut included.
            </p>
          </Link>
        </div>
      </section>

      {/* Investor band */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Why this model works">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
            Built to last
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-black sm:text-4xl">
            One coin economy. Real infrastructure. Aligned incentives.
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ul className="space-y-3 text-sm text-muted-foreground sm:text-base">
              <li className="flex gap-2"><span aria-hidden="true" className="font-bold text-cyan-600 dark:text-cyan-300">✓</span><span><strong className="text-foreground">Cloud pays for creativity.</strong> Every 🪙 of compute margin funds new AI-built games — no separate fundraising treadmill for content.</span></li>
              <li className="flex gap-2"><span aria-hidden="true" className="font-bold text-cyan-600 dark:text-cyan-300">✓</span><span><strong className="text-foreground">Games lower acquisition cost.</strong> Free-to-try play with skippable guest ads brings curious people in; the coin economy and daily 🪙 bonus turn visitors into cloud customers.</span></li>
              <li className="flex gap-2"><span aria-hidden="true" className="font-bold text-cyan-600 dark:text-cyan-300">✓</span><span><strong className="text-foreground">Transparent unit economics.</strong> 100 🪙 = $1.00, 25% platform / 75% provider on every meter, every cent itemized — verifiable in code and on /my/usage/.</span></li>
            </ul>
            <ul className="space-y-3 text-sm text-muted-foreground sm:text-base">
              <li className="flex gap-2"><span aria-hidden="true" className="font-bold text-cyan-600 dark:text-cyan-300">✓</span><span><strong className="text-foreground">Real providers, no theater.</strong> RunPod and DigitalOcean APIs under the hood, live billing mirrors, never faked provisioning.</span></li>
              <li className="flex gap-2"><span aria-hidden="true" className="font-bold text-cyan-600 dark:text-cyan-300">✓</span><span><strong className="text-foreground">Creators stay because they earn.</strong> Developers set game rates and keep 75% of every 🪙 their work earns — the arcade grows itself.</span></li>
              <li className="flex gap-2"><span aria-hidden="true" className="font-bold text-cyan-600 dark:text-cyan-300">✓</span><span><strong className="text-foreground">Automation is the wedge.</strong> Testing software and automating everything are jobs every team pays for — games are how the world meets the platform.</span></li>
            </ul>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/pricing"
              className="rounded-full bg-cyan-600 px-6 py-3 text-center font-bold text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
            >
              Read the pricing model
            </Link>
            <Link
              href="/teams"
              className="rounded-full border border-border px-6 py-3 text-center font-semibold transition hover:bg-accent hover:text-accent-foreground"
            >
              See team cloud
            </Link>
            <Link
              href="/games"
              className="rounded-full border border-border px-6 py-3 text-center font-semibold transition hover:bg-accent hover:text-accent-foreground"
            >
              Play what the cloud built
            </Link>
          </div>
        </div>
      </section>

      {/* Games */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Featured experiments</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Every play supports the makers: game time meters in 🪙 with the 25% cut included,
              and 75% flows to the creators and providers behind the game.
            </p>
          </div>
          <Link href="/games" className="text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-300">
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
                className="rounded-2xl border border-border bg-card p-5 transition hover:border-cyan-500/60 dark:hover:border-cyan-300/60"
              >
                <div className="text-3xl" aria-hidden="true">
                  {game.emoji}
                </div>
                <h3 className="mt-4 font-bold">{game.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{game.description}</p>
              </Link>
            ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Link
            href="/agents"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-cyan-500/50 dark:hover:border-cyan-300/50"
          >
            <h3 className="font-bold">🤖 Rent AI agents</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Hourly agents with 🪙 escrow. Compute carries a 25% cut, included — never more.
            </p>
          </Link>
          <Link
            href="/teams"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-violet-500/50 dark:hover:border-violet-300/50"
          >
            <h3 className="font-bold">🚀 UnitUnite workspaces</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Teams, projects, messaging, and metered cloud in one workspace.
            </p>
          </Link>
          <Link
            href="/pricing"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-amber-500/50 dark:hover:border-amber-300/50"
          >
            <h3 className="font-bold">🪙 Vibe Coins, explained</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              100 🪙 = $1.00. Packs from 500 🪙, free 100 🪙 trial, daily bonuses — 25% cut always inside the price.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
