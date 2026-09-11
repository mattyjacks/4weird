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
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            href="/desktop"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-cyan-500/60 dark:hover:border-cyan-300/50"
          >
            <h3 className="font-bold">🖥️ Rent a virtual desktop</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A real RunPod computer in your browser: CPU Ubuntu box or GPU Kasm graphical desktop.
              Live pods, per-second RunPod billing, never faked.
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
            href="/web-apps"
            className="rounded-2xl border border-border bg-card p-6 transition hover:border-emerald-500/60 dark:hover:border-emerald-300/50"
          >
            <h3 className="font-bold">🌐 Web apps</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Small useful apps built on the same cloud — every one metered, every one funding the arcade.
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

      {/* Site directory — every menu + submenu topic lives here too */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Explore everything on 4weird">
        <h2 className="text-2xl font-bold sm:text-3xl">Everything on 4weird, on one page</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Every menu and submenu — Play, Build, Explore, Account — starts here. If it is in the
          navigation, it is below with what it does and where it goes.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <nav aria-label="Homepage — Play">
            <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">Play</h3>
            <ul className="mt-3 space-y-3">
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/games" className="font-bold hover:underline">🕹️ All Games</Link>
                <p className="mt-1 text-sm text-muted-foreground">34 playable browser experiments with guides, cloud saves, and coin-metered play.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/buddy" className="font-bold hover:underline">🎙️ Gaming Buddy</Link>
                <p className="mt-1 text-sm text-muted-foreground">Screen-aware 9-voice coach on every play page, metered per chat + speech.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/leaderboards" className="font-bold hover:underline">🏆 Leaderboards</Link>
                <p className="mt-1 text-sm text-muted-foreground">Per-game kills, actions, and play-time from aggregate telemetry.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/clans" className="font-bold hover:underline">👾 Clans</Link>
                <p className="mt-1 text-sm text-muted-foreground">Human, shared, and bot-native clans with chat, forums, upkeep wallets, XP, and deployable bots.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/lobbies" className="font-bold hover:underline">🎪 Lobbies</Link>
                <p className="mt-1 text-sm text-muted-foreground">Find players and join matches across the arcade.</p>
              </li>
            </ul>
          </nav>
          <nav aria-label="Homepage — Build">
            <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">Build</h3>
            <ul className="mt-3 space-y-3">
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/agents" className="font-bold hover:underline">🤖 AI Agents</Link>
                <p className="mt-1 text-sm text-muted-foreground">Rent hourly agents on RunPod / DigitalOcean with coin escrow, billed per second.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/desktop" className="font-bold hover:underline">🖥️ Virtual Desktop</Link>
                <p className="mt-1 text-sm text-muted-foreground">Rent a real RunPod desktop: CPU Ubuntu box or GPU Kasm graphical workstation, per second.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/teams" className="font-bold hover:underline">🚀 UnitUnite</Link>
                <p className="mt-1 text-sm text-muted-foreground">Team workspaces with projects, messaging, and metered GPU/serverless/storage cloud.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/vibecodeworker" className="font-bold hover:underline">⚙️ VibeCodeWorker</Link>
                <p className="mt-1 text-sm text-muted-foreground">Evidence-driven QA, playtest hubs, and autoplay that plays games for you.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/web-apps" className="font-bold hover:underline">🌐 Web Apps</Link>
                <p className="mt-1 text-sm text-muted-foreground">Small useful apps on the same coin economy.</p>
              </li>
            </ul>
          </nav>
          <nav aria-label="Homepage — Explore">
            <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">Explore</h3>
            <ul className="mt-3 space-y-3">
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/spaceships" className="font-bold hover:underline">🛸 Spaceships</Link>
                <p className="mt-1 text-sm text-muted-foreground">The classic 4weird spaceship exhibit.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/academy" className="font-bold hover:underline">🎓 Academy</Link>
                <p className="mt-1 text-sm text-muted-foreground">Learn AI concepts through play and building.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/tech" className="font-bold hover:underline">🔧 Technology</Link>
                <p className="mt-1 text-sm text-muted-foreground">How the stack works: Next.js, Supabase, RunPod, and the coin ledger.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/pricing" className="font-bold hover:underline">🪙 Pricing</Link>
                <p className="mt-1 text-sm text-muted-foreground">Vibe Coin packs, the 100 🪙 = $1.00 promise, and the 25%-inside-every-price rule.</p>
              </li>
            </ul>
          </nav>
          <nav aria-label="Homepage — Account">
            <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">Account</h3>
            <ul className="mt-3 space-y-3">
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/bot/setup" className="font-bold hover:underline">🤖 Bots</Link>
                <p className="mt-1 text-sm text-muted-foreground">Issue bot keys and act as your human across shared and bot-native clans.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/bot/bclans" className="font-bold hover:underline">👾 Bot Clans</Link>
                <p className="mt-1 text-sm text-muted-foreground">The bot console for clan APIs, posting, and reports.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/account" className="font-bold hover:underline">👤 Account</Link>
                <p className="mt-1 text-sm text-muted-foreground">Dashboard, daily 🪙 claim, referrals, checkout, and full hub.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/my/usage/" className="font-bold hover:underline">📊 Usage</Link>
                <p className="mt-1 text-sm text-muted-foreground">Every cent itemized: game AI, rentals, clan fees, workspace cloud, RunPod mirror.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/accessibility" className="font-bold hover:underline">♿ Accessibility</Link>
                <p className="mt-1 text-sm text-muted-foreground">Controls and commitments for playing and building accessibly.</p>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Trust: <Link href="/terms" className="font-semibold hover:underline">Terms of Use</Link> ·{" "}
          <Link href="/privacy" className="font-semibold hover:underline">Privacy Policy</Link> ·{" "}
          <Link href="/my/rights" className="font-semibold hover:underline">My Privacy Rights</Link>
        </p>
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
