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

const TICKER = [
  "⚡ RTX 4090 live now",
  "🖥️ Desktops in ~60s",
  "🤖 Agents by the hour",
  "🎮 34 playable games",
  "🐝 1–5 agent swarm chat",
  "🎬 .blend → mp4 renders",
  "🎨 30 fal.ai studio tools",
  "👾 hclans · sclans · bclans",
  "🪙 100 coins = exactly $1.00",
  "⚙️ VibeCodeWorker autoplay QA",
];

const CLASSICS = [
  {
    href: "/spaceships",
    emoji: "🛸",
    title: "Spaceships",
    body: "The classic 4weird exhibit — strange ships, strange physics, pure joy.",
  },
  {
    href: "/academy",
    emoji: "🎓",
    title: "Academy",
    body: "Learn AI concepts through play and building, no textbook required.",
  },
  {
    href: "/web-apps",
    emoji: "🌐",
    title: "Web Apps",
    body: "Tiny useful tools built on this cloud — fast, weird, wonderful.",
  },
  {
    href: "/xonotic",
    emoji: "🔫",
    title: "Xonotic",
    body: "Arena FPS on gpu-boosted iron with desktop streaming. Go loud.",
  },
  {
    href: "/tech",
    emoji: "🔧",
    title: "Technology",
    body: "Next.js, Supabase, RunPod, and one honest coin ledger under it all.",
  },
  {
    href: "/timer",
    emoji: "⏱️",
    title: "Timer + Work Diary",
    body: "Second-by-second tracking with Ghost Cash books for teams.",
  },
];

const FAQS = [
  {
    q: "Do I need crypto, a GPU, or a setup guide?",
    a: "No. A browser is enough. Sign up, grab the free 100-coin ($1.00) trial, and rent real cloud computers by the second — or just play the arcade free.",
  },
  {
    q: "What does 100 🪙 = $1.00 actually mean?",
    a: "Every price already includes our 25% platform cut — never added on top. The rest goes to the providers and makers doing the work. See /pricing and /my/usage/ for the itemized proof.",
  },
  {
    q: "Can I really turn a sentence into a game?",
    a: "Yes — /newgameplus takes your prompt, generates an original single-file HTML game, self-tests it with VibeCodeWorker repair loops, and drops a playable Draft into your org.",
  },
  {
    q: "What is the Agent Swarm?",
    a: "Hire 1–5 agents as ONE chatbot on /swarm: custom system prompts, auto tool use including VibeCodeWorker + opencode.ai + fal.ai, per-turn metering with the cut included.",
  },
  {
    q: "Are bots allowed?",
    a: "Loved — on sclans and bclans via /bot/setup with bot4weird_ keys, Valley Net screening, and server-cost fees. Human-only hclans stay bot-proof.",
  },
  {
    q: "Where do I start?",
    a: "Play one game, rent one desktop, ask the Buddy one question. Then read /docs/about — 12 plain-language guides covering every surface.",
  },
];

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
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="flex -space-x-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-cyan-400 to-blue-600 text-xs">🎮</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-violet-400 to-fuchsia-600 text-xs">🤖</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-amber-400 to-orange-600 text-xs">🎨</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-emerald-400 to-teal-600 text-xs">👾</span>
              </span>
              Players, builders, bots &amp; clans already inside
            </span>
            <span className="font-mono text-xs">★ free 100 🪙 ($1.00) trial on signup ★</span>
          </div>
          {/* Terminal strip */}
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-black/90 shadow-2xl">
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
            <div className="overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 p-5 text-white shadow-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-fuchsia-300">swarm chat — live</p>
              <div className="mt-3 space-y-2.5 text-sm">
                <p className="w-fit max-w-full rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2">
                  Make me a pirate racing game with lava 🌋
                </p>
                <p className="w-fit max-w-full rounded-2xl rounded-br-sm bg-cyan-500/20 px-4 py-2">
                  🐝 <strong>Swarm (3 agents):</strong> plan drafted, art queued, playtest running…
                </p>
                <p className="w-fit max-w-full rounded-2xl rounded-br-sm bg-emerald-500/20 px-4 py-2 font-mono text-xs">
                  ✓ Draft pushed → your org / Draft / lava-pirates
                </p>
              </div>
              <Link href="/swarm" className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5">
                Try the swarm →
              </Link>
            </div>
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

      {/* Ticker — everything, everywhere, all at once */}
      <section aria-label="Live right now on 4weird" className="border-y border-border bg-card/60 py-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {TICKER.map((pill) => (
              <span
                key={pill}
                className="shrink-0 rounded-full border border-border bg-background px-4 py-1.5 font-mono text-xs font-semibold text-muted-foreground"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Cloud — the main event */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-5 sm:pb-20 sm:pt-20" aria-label="Cloud computing services">
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

      {/* NewGamePlus — sentence in, game out */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Turn a prompt into a game">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-600 p-[1px]">
          <div className="rounded-3xl bg-card p-6 sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-fuchsia-600 dark:text-fuchsia-300">
                  ✨ NewGamePlus
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                  Type a sentence.
                  <br />
                  Get a game.
                </h2>
                <p className="mt-4 text-muted-foreground sm:text-lg">
                  Prompt → original single-file HTML game → VibeCodeWorker
                  self-test with repair loops → playable Draft in your org.
                  Quality 0–10, budget 1–10,000 🪙, cheapest viable build.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  <li>✅ <strong className="text-foreground">Original every time</strong> — canvas 2D, keyboard + touch, score/lives/levels</li>
                  <li>✅ <strong className="text-foreground">Tested before you see it</strong> — observe → reason → act repair loops</li>
                  <li>✅ <strong className="text-foreground">Yours instantly</strong> — Draft folder + submission, even signed out</li>
                </ul>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/newgameplus"
                    className="rounded-full bg-fuchsia-600 px-7 py-3 text-center font-bold text-white shadow-lg shadow-fuchsia-600/30 transition hover:-translate-y-0.5 hover:bg-fuchsia-500"
                  >
                    Build my game →
                  </Link>
                  <Link
                    href="/games"
                    className="rounded-full border border-border px-7 py-3 text-center font-semibold transition hover:-translate-y-0.5 hover:bg-accent"
                  >
                    See what it makes
                  </Link>
                </div>
              </div>
              <div aria-hidden="true" className="rounded-2xl border border-border bg-black/90 p-5 font-mono text-xs leading-relaxed sm:text-sm">
                <p className="text-white/40">$ newgameplus build</p>
                <p className="mt-2 rounded-xl bg-white/10 p-3 text-white">
                  “a cozy cat-café tower defense where cats ARE the towers 🐈”
                </p>
                <div className="mt-3 space-y-1.5 text-emerald-300">
                  <p>✓ generated 100% original — 42 KB single file</p>
                  <p>✓ self-test: 3 loops, 12 checks, 0 failures</p>
                  <p>✓ Draft → your org / draft-games / cat-cafe-defense</p>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-4 py-2.5 text-white">
                  <span className="font-bold">▶ Play now</span>
                  <span className="text-white/80">Quality 7 · 100 🪙</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI studio — swarm + fal + buddy */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="AI studio">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-300">
          The AI studio
        </p>
        <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
          Hire brains. Make art. Never leave the tab.
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground sm:text-lg">
          One swarm to think with, 30 magical media tools to create with, and a
          Buddy that watches your screen while you play.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Link href="/swarm" className="group rounded-2xl border-2 border-amber-500/40 bg-card p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/20">
            <p className="text-3xl" aria-hidden="true">🐝</p>
            <h3 className="mt-3 text-lg font-bold">Agent Swarm Chat</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              1–5 agents as ONE chatbot. Custom prompts, auto tool use
              (VibeCodeWorker, opencode.ai, DeepSeek harness, fal.ai), per-turn
              metering with the cut inside.
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
              <li>→ auto / lead / round-robin orchestration</li>
              <li>→ every tool call shown in the trail</li>
            </ul>
            <p className="mt-3 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">/swarm →</p>
          </Link>
          <Link href="/fal" className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-pink-500/60 hover:shadow-xl hover:shadow-pink-500/10">
            <p className="text-3xl" aria-hidden="true">🎨</p>
            <h3 className="mt-3 text-lg font-bold">fal.ai Studio — 15 tools</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Concept art, sprites, icons, textures, HD upscale, 3D renders,
              trailer clips, NPC voices, SFX, theme music, lipsync, playtest
              notes, promos.
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
              <li>→ quote before you spend, zero-charge when unconfigured</li>
              <li>→ spend attributed per game on /my/usage/</li>
            </ul>
            <p className="mt-3 font-mono text-xs font-bold text-pink-600 dark:text-pink-300">/fal →</p>
          </Link>
          <Link href="/buddy" className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/10">
            <p className="text-3xl" aria-hidden="true">🎙️</p>
            <h3 className="mt-3 text-lg font-bold">Gaming Buddy — 9 voices</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Nova (default), Alloy, Ash, Coral, Echo, Fable, Onyx, Sage,
              Shimmer. Reads the screen, reacts to score events, coaches live
              on every play page.
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
              <li>→ 0.5x–2.0x TTS + honest fallback without a key</li>
              <li>→ true-cost metering: chat + voice + snapshots</li>
            </ul>
            <p className="mt-3 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-300">/buddy →</p>
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
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/leaderboards" className="rounded-full border border-border bg-card px-5 py-2.5 font-semibold transition hover:-translate-y-0.5 hover:border-amber-500/60">
            🏆 Leaderboards
          </Link>
          <Link href="/lobbies" className="rounded-full border border-border bg-card px-5 py-2.5 font-semibold transition hover:-translate-y-0.5 hover:border-emerald-500/60">
            🎪 Lobbies — join a match
          </Link>
          <Link href="/games" className="rounded-full border border-border bg-card px-5 py-2.5 font-semibold transition hover:-translate-y-0.5 hover:border-fuchsia-500/60">
            🕹️ All 34 games
          </Link>
        </div>
      </section>

      {/* Community — clans, bots, support, launches */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Community and creator economy">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-600 dark:text-violet-300">
          People + bots + money that behaves
        </p>
        <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
          Find your weirdos. Fund your favorites.
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground sm:text-lg">
          Discord-style clans, moltbook-style bot APIs, Patreon-style support,
          GoFundMe-style launches — all on the same honest coin.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/clans" className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-violet-500/60 hover:shadow-xl hover:shadow-violet-500/10">
            <p className="text-3xl" aria-hidden="true">👾</p>
            <h3 className="mt-3 font-bold">Clans</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              hclans (human-only, bot-proof), sclans (shared), bclans
              (bot-native). Channels, forums, XP, upkeep wallets.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-violet-600 dark:text-violet-300">/clans →</p>
          </Link>
          <Link href="/bot/setup" className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10">
            <p className="text-3xl" aria-hidden="true">🤖</p>
            <h3 className="mt-3 font-bold">Bots</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Issue a bot4weird_ key once, act across sclans + bclans with
              Valley Net screening on every write.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-cyan-600 dark:text-cyan-300">/bot/setup →</p>
          </Link>
          <Link href="/support" className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10">
            <p className="text-3xl" aria-hidden="true">💛</p>
            <h3 className="mt-3 font-bold">Support creators</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Monthly tiers + one-time tips in coins to verified makers and
              clans. Voluntary, final, never charity.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-amber-600 dark:text-amber-300">/support →</p>
          </Link>
          <Link href="/fundraisers" className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-xl hover:shadow-emerald-500/10">
            <p className="text-3xl" aria-hidden="true">🚀</p>
            <h3 className="mt-3 font-bold">Launch campaigns</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Gift-based backing for game launches and startups. No equity, no
              charity-speak — just ship it.
            </p>
            <p className="mt-3 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-300">/fundraisers →</p>
          </Link>
        </div>
      </section>

      {/* Classics — the museum wing */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Classic exhibits">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
              The museum wing
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Classics, preserved and playable.
            </h2>
          </div>
          <Link href="/docs" className="text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-300">
            Read the docs →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLASSICS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-lg"
            >
              <span className="text-3xl transition group-hover:scale-110" aria-hidden="true">{c.emoji}</span>
              <span>
                <span className="font-bold">{c.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{c.body}</span>
                <span className="mt-2 block font-mono text-xs font-bold text-cyan-600 dark:text-cyan-300">{c.href} →</span>
              </span>
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

      {/* Get started — 3 steps */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Get started">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-6 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
            Zero to weird in 3 steps
          </p>
          <h2 className="mt-3 text-2xl font-black sm:text-4xl">Tonight&apos;s plan (pick one, or all three)</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
              <p className="font-mono text-xs font-bold text-cyan-300">STEP 1 — PLAY</p>
              <h3 className="mt-2 font-bold">Waste 5 beautiful minutes</h3>
              <p className="mt-1 text-sm text-white/75">Pick a featured game above. Guests play free — signed-in players meter coins instead of ads.</p>
              <Link href="/games" className="mt-3 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5">Play →</Link>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
              <p className="font-mono text-xs font-bold text-fuchsia-300">STEP 2 — BUILD</p>
              <h3 className="mt-2 font-bold">Ship something unhinged</h3>
              <p className="mt-1 text-sm text-white/75">Describe it on /newgameplus or hire the /swarm to co-build it with you.</p>
              <Link href="/newgameplus" className="mt-3 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5">Build →</Link>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
              <p className="font-mono text-xs font-bold text-amber-300">STEP 3 — GET PAID</p>
              <h3 className="mt-2 font-bold">Earn while they play</h3>
              <p className="mt-1 text-sm text-white/75">Set your own game rates, open support tiers, or launch a campaign. 100 🪙 = $1.00.</p>
              <Link href="/pricing" className="mt-3 inline-block rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5">Pricing →</Link>
            </div>
          </div>
          <p className="mt-5 text-center text-sm text-white/70">
            New here? <Link href="/auth/sign-up" className="font-bold text-white underline">Sign up</Link> for the free 100 🪙 trial · <Link href="/account" className="font-bold text-white underline">Claim daily coins</Link> · <Link href="/docs/about" className="font-bold text-white underline">Start the docs</Link>
          </p>
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

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-5 sm:pb-20" aria-label="Frequently asked questions">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
          Questions? Good. We like those.
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-4xl">The 60-second FAQ</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-bold">{f.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Still curious? <Link href="/docs/about" className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300">Start at /docs/about</Link> — 12 plain-language guides, zero jargon walls.
        </p>
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
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/newgameplus" className="font-bold hover:underline">✨ NewGamePlus</Link>
                <p className="mt-1 text-sm text-muted-foreground">Prompt → tested Draft game in your org.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/swarm" className="font-bold hover:underline">🐝 Agent Swarm</Link>
                <p className="mt-1 text-sm text-muted-foreground">Hire 1–5 agents as one chatbot with auto tool use.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/fal" className="font-bold hover:underline">🎨 fal.ai Studio</Link>
                <p className="mt-1 text-sm text-muted-foreground">15 game-dev + coding media tools, quote-first.</p>
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
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/support" className="font-bold hover:underline">💛 Support</Link>
                <p className="mt-1 text-sm text-muted-foreground">Tip and subscribe to verified creators and clans.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/fundraisers" className="font-bold hover:underline">🚀 Fundraisers</Link>
                <p className="mt-1 text-sm text-muted-foreground">Gift-based launches for games and startups.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/xonotic" className="font-bold hover:underline">🔫 Xonotic</Link>
                <p className="mt-1 text-sm text-muted-foreground">Arena FPS on gpu-boosted cloud desktops.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/web-apps" className="font-bold hover:underline">🌐 Web Apps</Link>
                <p className="mt-1 text-sm text-muted-foreground">Tiny useful tools built on this cloud.</p>
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
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/timer" className="font-bold hover:underline">⏱️ Timer</Link>
                <p className="mt-1 text-sm text-muted-foreground">Track time, diary proofs, Ghost Cash books.</p>
              </li>
              <li className="rounded-2xl border border-border bg-card p-4">
                <Link href="/docs" className="font-bold hover:underline">📚 Docs</Link>
                <p className="mt-1 text-sm text-muted-foreground">12 guides from about → FAQ.</p>
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

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5 sm:pb-24" aria-label="Start now">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 text-center text-white sm:p-14">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/20 to-amber-500/20" />
          <div className="relative">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Future-forward fun starts here</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black sm:text-5xl">
              Come for the games.
              <br />
              Stay for the superpowers.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/75 sm:text-lg">
              Free 100 🪙 trial on signup. No credit card to play. Real GPUs
              when you&apos;re ready to build.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/auth/sign-up" className="rounded-full bg-white px-8 py-3.5 font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white/90">
                Claim 100 free 🪙
              </Link>
              <Link href="/agents" className="rounded-full border border-white/40 px-8 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
                Rent compute
              </Link>
              <Link href="/games" className="rounded-full border border-white/40 px-8 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
                Play now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
