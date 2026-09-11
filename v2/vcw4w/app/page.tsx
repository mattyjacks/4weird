import Link from "next/link";
import { getGame } from "@/content/games";

// Curated homepage lineup — exactly 6. Full catalog lives on /games.
const FEATURED_SLUGS = [
  "overtake",
  "lastwordszombies",
  "gravegain3d",
  "serversavershield",
  "assassinanimals",
  "battlesharks2",
] as const;

const featuredSix = FEATURED_SLUGS.map((slug) => getGame(slug)!).filter(Boolean);

export default function Home() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero — cloud-first, badass */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/15 via-violet-500/10 to-transparent dark:from-cyan-400/10 dark:via-violet-400/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:44px_44px] text-border [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-300 sm:text-xs">
            <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            4weird Cloud — live GPUs on demand
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Raw cloud power.
            <br />
            <span className="bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              Zero setup.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-xl">
            Spin up real GPUs, virtual desktops, and AI agents in seconds — test
            software, automate the boring work, render, train, ship. The arcade
            below is proof of what this cloud can build.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              className="rounded-full bg-cyan-600 px-7 py-3.5 text-center font-bold text-white shadow-lg shadow-cyan-600/30 transition hover:-translate-y-0.5 hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:shadow-cyan-300/20 dark:hover:bg-cyan-200"
              href="/agents"
            >
              ▸ Rent cloud compute
            </Link>
            <Link
              className="rounded-full border border-border bg-card px-7 py-3.5 text-center font-semibold transition hover:-translate-y-0.5 hover:border-cyan-500/60"
              href="/desktop"
            >
              🖥️ Get a Virtual Desktop
            </Link>
            <Link
              className="rounded-full border border-border px-7 py-3.5 text-center font-semibold text-muted-foreground transition hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground"
              href="/games"
            >
              Play the arcade
            </Link>
          </div>
          {/* Terminal strip */}
          <div className="mt-10 max-w-2xl overflow-hidden rounded-2xl border border-border bg-black/90 shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="ml-2 font-mono text-[11px] text-white/40">4weird — cloud terminal</span>
            </div>
            <p className="px-4 py-3.5 font-mono text-xs leading-relaxed text-emerald-300 sm:text-sm">
              $ 4weird spin gpu --fastest --per-second
              <br />
              <span className="text-white/70">✓ RTX 4090 live → your browser in ~60s</span>
              <br />
              $ 4weird test ./my-app --autoplay
              <br />
              <span className="text-white/70">✓ VibeCodeWorker found 0 bugs. Ship it.</span>
            </p>
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Per-second billing", "GPUs, desktops, agents"],
              ["Real RunPod iron", "never faked, live status"],
              ["100 🪙 = $1.00", "one coin, every surface"],
              ["34 arcade games", "proof of the platform"],
            ].map(([stat, label]) => (
              <div key={label} className="rounded-2xl border border-border bg-card/80 p-4 backdrop-blur">
                <dt className="text-lg font-black text-cyan-600 dark:text-cyan-300 sm:text-xl">{stat}</dt>
                <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Cloud — the main event */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Cloud computing services">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
              The cloud
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Computers that go brrr.
            </h2>
          </div>
          <Link href="/vibecodeworker" className="text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-300">
            Meet VibeCodeWorker →
          </Link>
        </div>
        <p className="mt-3 max-w-3xl text-muted-foreground sm:text-lg">
          No datacenter degree required. Pick a machine, point it at your work,
          pay only for the seconds it runs.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/agents"
            className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <p className="text-3xl" aria-hidden="true">🤖</p>
            <h3 className="mt-3 text-lg font-bold">AI agents by the hour</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              OpenClaw-style agents on real RunPod / DigitalOcean compute. Coin
              escrow, per-second metering. Book time, watch it work.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-300">/agents →</p>
          </Link>
          <Link
            href="/desktop"
            className="group rounded-2xl border-2 border-cyan-500/50 bg-card p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/20"
          >
            <p className="text-3xl" aria-hidden="true">🖥️</p>
            <h3 className="mt-3 text-lg font-bold">Virtual Desktop in your browser</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A real computer, right now: CPU Ubuntu box or GPU graphical
              workstation. Live pods, per-second billing, reachable in a click.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-300">/desktop →</p>
          </Link>
          <Link
            href="/vibecodeworker"
            className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <p className="text-3xl" aria-hidden="true">⚙️</p>
            <h3 className="mt-3 text-lg font-bold">VibeCodeWorker testing</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The fastest way to test software: evidence-driven QA, playtest
              hubs, autoplay that plays your game for you. Breaks? You get proof.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-300">/vibecodeworker →</p>
          </Link>
          <Link
            href="/teams"
            className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-violet-500/60 hover:shadow-xl hover:shadow-violet-500/10"
          >
            <p className="text-3xl" aria-hidden="true">🚀</p>
            <h3 className="mt-3 text-lg font-bold">UnitUnite team workspaces</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Teams, projects, messaging, and metered cloud — GPU pods,
              serverless, storage, DB, queues — in one workspace.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-violet-600 dark:text-violet-300">/teams →</p>
          </Link>
          <Link
            href="/blender"
            className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-500/10"
          >
            <p className="text-3xl" aria-hidden="true">🎬</p>
            <h3 className="mt-3 text-lg font-bold">Blender renders on RTX 4090</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Drop a .blend file, get an mp4 back. Pinned 4090 worker, no
              install, billing ends when the render exits.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-orange-600 dark:text-orange-300">/blender →</p>
          </Link>
          <Link
            href="/buddy"
            className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10"
          >
            <p className="text-3xl" aria-hidden="true">🎙️</p>
            <h3 className="mt-3 text-lg font-bold">Game AI + Gaming Buddy</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dialogue bots, AI directors, and a 9-voice Buddy that reads the
              screen and coaches you live.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">/buddy →</p>
          </Link>
        </div>
      </section>

      {/* Games — exactly 6 */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Featured games">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-600 dark:text-fuchsia-300">
              The arcade
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              Six ways to waste time beautifully.
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground sm:text-lg">
              Hand-picked experiments built with AI on this very cloud. Every
              play supports the makers — the full catalog of 34 lives on{" "}
              <Link href="/games" className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300">
                /games
              </Link>
              .
            </p>
          </div>
          <Link href="/games" className="text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-300">
            Browse all 34 →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredSix.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-fuchsia-500/60 hover:shadow-xl hover:shadow-fuchsia-500/10"
            >
              <div className="text-4xl transition group-hover:scale-110" aria-hidden="true">
                {game.emoji}
              </div>
              <h3 className="mt-4 text-lg font-bold">{game.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{game.description}</p>
              <p className="mt-3 font-mono text-xs font-bold text-fuchsia-600 dark:text-fuchsia-300">
                PLAY →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Flywheel — short, no econ spam */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="How 4weird works">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
            The flywheel
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-black sm:text-4xl">
            Compute funds play. Play funds compute.
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-2xl" aria-hidden="true">☁️</p>
              <h3 className="mt-2 font-bold">1. You rent cloud</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Agents, desktops, testing, team workspaces — metered, escrowed,
                itemized on <Link href="/my/usage/" className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300">/my/usage/</Link>.
              </p>
            </div>
            <div>
              <p className="text-2xl" aria-hidden="true">🎮</p>
              <h3 className="mt-2 font-bold">2. Players meet AI through games</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                AI-built arcade games introduce AI ideas to curious people who
                just came to play.
              </p>
            </div>
            <div>
              <p className="text-2xl" aria-hidden="true">🪙</p>
              <h3 className="mt-2 font-bold">3. Coins flow to creators</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Developers set their own rates and earn while they build — the
                arcade grows itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Single clear pricing promise */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Pricing promise">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-r from-cyan-600 to-violet-600 p-6 text-white sm:p-10 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black sm:text-3xl">One coin. One promise.</h2>
            <p className="mt-2 text-white/85 sm:text-lg">
              <strong>100 🪙 = exactly $1.00.</strong> Every price already
              includes our 25% platform cut — never added on top. The rest goes
              to the providers and makers doing the work.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/pricing"
              className="rounded-full bg-white px-6 py-3 text-center font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white/90"
            >
              See pricing
            </Link>
            <Link
              href="/teams"
              className="rounded-full border border-white/40 px-6 py-3 text-center font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              See team cloud
            </Link>
          </div>
        </div>
      </section>

      {/* Site directory — every menu + submenu topic lives here too */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Explore everything on 4weird">
        <h2 className="text-2xl font-bold sm:text-3xl">Everything on 4weird, on one page</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Every menu and submenu — Play, Build, Explore, Account — starts here.
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
                <p className="mt-1 text-sm text-muted-foreground">Screen-aware 9-voice coach on every play page.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/leaderboards" className="font-bold hover:underline">🏆 Leaderboards</Link>
                <p className="mt-1 text-sm text-muted-foreground">Per-game kills, actions, and play-time.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/clans" className="font-bold hover:underline">👾 Clans</Link>
                <p className="mt-1 text-sm text-muted-foreground">Human, shared, and bot-native clans with chat, forums, and XP.</p>
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
                <p className="mt-1 text-sm text-muted-foreground">Rent hourly agents on RunPod / DigitalOcean, billed per second.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/desktop" className="font-bold hover:underline">🖥️ Virtual Desktop</Link>
                <p className="mt-1 text-sm text-muted-foreground">A real RunPod desktop in your browser, per second.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/teams" className="font-bold hover:underline">🚀 UnitUnite</Link>
                <p className="mt-1 text-sm text-muted-foreground">Team workspaces with metered GPU/serverless/storage cloud.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/vibecodeworker" className="font-bold hover:underline">⚙️ VibeCodeWorker</Link>
                <p className="mt-1 text-sm text-muted-foreground">Evidence-driven QA and autoplay that plays games for you.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/blender" className="font-bold hover:underline">🎬 Blender Renders</Link>
                <p className="mt-1 text-sm text-muted-foreground">4090-backed .blend → mp4, no install needed.</p>
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
                <p className="mt-1 text-sm text-muted-foreground">Vibe Coin packs and the 100 🪙 = $1.00 promise, platform cut inside every price.</p>
              </li>
            </ul>
          </nav>
          <nav aria-label="Homepage — Account">
            <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">Account</h3>
            <ul className="mt-3 space-y-3">
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/bot/setup" className="font-bold hover:underline">🤖 Bots</Link>
                <p className="mt-1 text-sm text-muted-foreground">Issue bot keys and act across shared and bot-native clans.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/account" className="font-bold hover:underline">👤 Account</Link>
                <p className="mt-1 text-sm text-muted-foreground">Dashboard, daily 🪙 claim, referrals, and checkout.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/my/usage/" className="font-bold hover:underline">📊 Usage</Link>
                <p className="mt-1 text-sm text-muted-foreground">Every cent itemized: cloud, game AI, rentals, RunPod mirror.</p>
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
    </div>
  );
}
