import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  BookOpen,
  Clapperboard,
  Coins,
  Cpu,
  Gamepad2,
  Github,
  HeartHandshake,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

type FooterLink = { href: string; label: string; blurb?: string };
type FooterColumn = {
  label: string;
  icon: React.ReactNode;
  tagline: string;
  links: FooterLink[];
};

const COLUMNS: FooterColumn[] = [
  {
    label: "Play",
    icon: <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />,
    tagline: "Jump in and play — no install, no manual.",
    links: [
      { href: "/", label: "Home" },
      { href: "/games", label: "All 34 Games" },
      { href: "/buddy", label: "Gaming Buddy AI" },
      { href: "/leaderboards", label: "Leaderboards" },
      { href: "/clans", label: "Clans & Clubs" },
      { href: "/lobbies", label: "Game Lobbies" },
      { href: "/spaceships", label: "Spaceships" },
      { href: "/xonotic", label: "Xonotic Arena" },
      { href: "/newgameplus", label: "NewGamePlus" },
      { href: "/submit", label: "Submit a Game" },
      { href: "/vault", label: "Weird Vault" },
    ],
  },
  {
    label: "Create & Cloud",
    icon: <Cpu className="h-3.5 w-3.5" aria-hidden="true" />,
    tagline: "Rent power by the minute — agents, desktops, renders.",
    links: [
      { href: "/agents", label: "AI Agents for Hire" },
      { href: "/runpods", label: "My RunPods" },
      { href: "/swarm", label: "Agent Swarm Chat" },
      { href: "/desktop", label: "Cloud Desktops" },
      { href: "/squads", label: "Squads for Work" },
      { href: "/meshy", label: "Meshy 3D Studio" },
      { href: "/blender", label: "Blender Renders" },
      { href: "/fal", label: "fal.ai Studio (30 tools)" },
      { href: "/web-apps", label: "Web Apps" },
      { href: "/timer", label: "Timer & Work Diary" },
    ],
  },
  {
    label: "VibeCodeWorker",
    icon: <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" />,
    tagline: "Our robot plays your game and files the bug report.",
    links: [
      { href: "/vibecodeworker", label: "Meet the Robot" },
      { href: "/vibecodeworker/overview", label: "Overview" },
      { href: "/vibecodeworker/hub", label: "Workspace Hub" },
      { href: "/vibecodeworker/run", label: "Cloud Run" },
      { href: "/vibecodeworker/full", label: "Full Web Shell" },
      { href: "/vibecodeworker/phone", label: "Remote Phone" },
      { href: "/vibecodeworker/demo", label: "Live Demo" },
      { href: "/vibecodeworker/docs", label: "Manual" },
      { href: "/docs/vibecodeworker", label: "Guide for Makers" },
    ],
  },
  {
    label: "Community",
    icon: <Users className="h-3.5 w-3.5" aria-hidden="true" />,
    tagline: "Clubs, creators, classrooms — bring friends.",
    links: [
      { href: "/bot/setup", label: "Bot Setup" },
      { href: "/bot/bclans", label: "Bot Clans" },
      { href: "/support", label: "Support Creators" },
      { href: "/fundraisers", label: "Fundraisers" },
      { href: "/academy", label: "Academy Lessons" },
      { href: "/tech", label: "Our Technology" },
      { href: "/ads", label: "Advertise" },
      { href: "/pricing", label: "Pricing & Coins" },
    ],
  },
  {
    label: "Guides & Docs",
    icon: <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />,
    tagline: "Plain-English help for every corner of the site.",
    links: [
      { href: "/docs", label: "Docs Hub" },
      { href: "/docs/getting-started", label: "Getting Started" },
      { href: "/docs/playing-games", label: "Playing Games" },
      { href: "/docs/vibe-coins", label: "Vibe Coins Explained" },
      { href: "/docs/about", label: "About 4weird" },
      { href: "/docs/agents-compute", label: "Agents & Compute" },
      { href: "/docs/game-ai-buddy", label: "Game AI Buddy" },
      { href: "/docs/bots", label: "Bots Guide" },
      { href: "/docs/clans", label: "Clans Guide" },
      { href: "/docs/support-launches", label: "Support Launches" },
      { href: "/docs/explore-more", label: "Explore More" },
      { href: "/docs/privacy-safety", label: "Privacy & Safety" },
      { href: "/docs/faq", label: "FAQ" },
    ],
  },
  {
    label: "Trust & Account",
    icon: <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />,
    tagline: "Your money, your data, your rules — kept safe.",
    links: [
      { href: "/pricing", label: "Get Vibe Coins" },
      { href: "/account", label: "My Account" },
      { href: "/my/usage", label: "My Compute Usage" },
      { href: "/my/rights", label: "My Privacy Rights" },
      { href: "/auth/login", label: "Login" },
      { href: "/auth/sign-up", label: "Sign Up Free" },
      { href: "/auth/forgot-password", label: "Reset Password" },
      { href: "/family/login", label: "Family Login" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

const STATS = [
  { icon: <Gamepad2 className="h-4 w-4" aria-hidden="true" />, title: "34 games", text: "in your browser now" },
  { icon: <Coins className="h-4 w-4" aria-hidden="true" />, title: "100 🪙 = $1.00", text: "always, fees included" },
  { icon: <Sparkles className="h-4 w-4" aria-hidden="true" />, title: "100 free coins", text: "for every new player" },
  { icon: <HeartHandshake className="h-4 w-4" aria-hidden="true" />, title: "Creators keep 75%", text: "as on-site credits" },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background dark:border-white/10 dark:bg-slate-950">
      {/* Rainbow hairline + aurora wash */}
      <div
        aria-hidden="true"
        className="h-1 w-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-300"
      />
      <div aria-hidden="true" className="docs-grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div aria-hidden="true" className="docs-orb-a pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl" />
      <div aria-hidden="true" className="docs-orb-b pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6">
        {/* ---- Top: brand story + how it works ---- */}
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr_1fr]">
          <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
            <p className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-lg text-white shadow">
                🎮
              </span>
              4weird<span className="bg-gradient-to-r from-cyan-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-cyan-300 dark:to-fuchsia-300">Games</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Future Forward Fun.</strong> 4weird.com is an
              arcade, clubhouse, and cloud studio in one — 34 browser games, cozy clans, a voice buddy that
              watches your screen and helps you win, plus rentable AI agents, cloud desktops, and 3D render
              power. Your saves, coins, and high scores follow you everywhere.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              New here? Grab <strong className="font-semibold text-foreground">100 free Vibe Coins</strong>,
              pick a game, and play in seconds. No install. No manual. Just fun.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href="/games"
                className="inline-flex items-center gap-1.5 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-black text-white shadow transition hover:-translate-y-0.5 hover:bg-cyan-500 hover:shadow-lg dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
              >
                <Play className="h-4 w-4" aria-hidden="true" /> Play now
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground transition hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground"
              >
                <Coins className="h-4 w-4" aria-hidden="true" /> Get coins
              </Link>
              <a
                href="https://github.com/mattyjacks/4weird"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground"
              >
                <Github className="h-4 w-4" aria-hidden="true" /> GitHub ↗
              </a>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground dark:border-white/10">
              <span className="font-semibold">Theme</span>
              <ThemeSwitcher />
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-600/20 bg-gradient-to-b from-cyan-600/[0.07] to-transparent p-6 dark:border-cyan-300/20 dark:from-cyan-300/10">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              <Rocket className="h-4 w-4" aria-hidden="true" /> Start in 3 steps
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li className="flex gap-3">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-600 text-xs font-black text-white dark:bg-cyan-300 dark:text-slate-950">1</span>
                <span><Link href="/auth/sign-up" className="font-bold text-foreground underline decoration-cyan-500/50 underline-offset-4 hover:decoration-cyan-400">Create a free account</Link> and pocket 100 welcome coins — it takes under a minute.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fuchsia-600 text-xs font-black text-white dark:bg-fuchsia-300 dark:text-slate-950">2</span>
                <span><Link href="/games" className="font-bold text-foreground underline decoration-fuchsia-500/50 underline-offset-4 hover:decoration-fuchsia-400">Pick one of 34 games</Link>, join a <Link href="/clans" className="font-bold text-foreground underline decoration-fuchsia-500/50 underline-offset-4 hover:decoration-fuchsia-400">clan</Link>, or meet your <Link href="/buddy" className="font-bold text-foreground underline decoration-fuchsia-500/50 underline-offset-4 hover:decoration-fuchsia-400">Gaming Buddy</Link>.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500 text-xs font-black text-white dark:bg-amber-300 dark:text-slate-950">3</span>
                <span>Play in your browser, chase the <Link href="/leaderboards" className="font-bold text-foreground underline decoration-amber-500/50 underline-offset-4 hover:decoration-amber-400">leaderboards</Link>, and tip creators on <Link href="/support" className="font-bold text-foreground underline decoration-amber-500/50 underline-offset-4 hover:decoration-amber-400">Support</Link>.</span>
              </li>
            </ol>
            <p className="mt-4 rounded-xl bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground dark:bg-black/40">
              Stuck? Every page is explained in plain English in the{" "}
              <Link href="/docs" className="font-bold text-foreground hover:underline underline-offset-4">Docs Hub</Link>{" "}
              — start with <Link href="/docs/getting-started" className="font-bold text-foreground hover:underline underline-offset-4">Getting Started</Link> or the{" "}
              <Link href="/docs/faq" className="font-bold text-foreground hover:underline underline-offset-4">FAQ</Link>.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-400/[0.09] to-transparent p-6 dark:border-amber-300/25 dark:from-amber-300/10">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              <Coins className="h-4 w-4" aria-hidden="true" /> Vibe Coins, simply
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The whole economy fits in one sentence:{" "}
              <strong className="font-bold text-foreground">100 Vibe Coins (🪙) = exactly $1.00</strong>,
              always. The 25% platform cut is already inside every price — never added on top.
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Spend coins on games, <Link href="/agents" className="font-semibold text-foreground hover:underline underline-offset-4">agents</Link>, <Link href="/desktop" className="font-semibold text-foreground hover:underline underline-offset-4">desktops</Link>, and <Link href="/fal" className="font-semibold text-foreground hover:underline underline-offset-4">art tools</Link>.</li>
              <li>Tip makers on <Link href="/support" className="font-semibold text-foreground hover:underline underline-offset-4">Support</Link> — they keep 75% as on-site credits.</li>
              <li>Coins stay on-site (cloud, credits, gifts). Never cash-out, never withdrawable.</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Link href="/pricing" className="rounded-full bg-amber-500 px-4 py-2 font-black text-white transition hover:-translate-y-0.5 hover:bg-amber-400 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">See pricing</Link>
              <Link href="/docs/vibe-coins" className="rounded-full border border-border px-4 py-2 font-bold text-foreground transition hover:bg-accent">How coins work</Link>
            </div>
          </div>
        </div>

        {/* ---- Stats strip ---- */}
        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.title}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]"
            >
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/15 to-fuchsia-500/15 text-cyan-700 dark:text-cyan-300">
                {s.icon}
              </span>
              <div className="min-w-0">
                <dt className="truncate text-sm font-black text-foreground">{s.title}</dt>
                <dd className="truncate text-xs text-muted-foreground">{s.text}</dd>
              </div>
            </div>
          ))}
        </dl>

        {/* ---- Link columns ---- */}
        <div className="mt-8 grid gap-6 rounded-2xl border border-border bg-card/50 p-6 backdrop-blur sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 dark:border-white/10 dark:bg-white/[0.02]">
          {COLUMNS.map((col) => (
            <nav key={col.label} aria-label={`Footer — ${col.label}`} className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-foreground">
                <span aria-hidden="true" className="text-cyan-600 dark:text-cyan-300">{col.icon}</span>
                {col.label}
              </p>
              <span aria-hidden="true" className="mt-2 block h-0.5 w-8 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{col.tagline}</p>
              <ul className="mt-3 space-y-1.5">
                {col.links.map((link) => (
                  <li key={`${col.label}-${link.href}`}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
                    >
                      <span aria-hidden="true" className="h-px w-0 bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all group-hover:w-3" />
                      <span className="underline-offset-4 group-hover:underline">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ---- Bottom legal bar ---- */}
        <div className="mt-8 border-t border-border pt-6 dark:border-white/10">
          <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            © {new Date().getFullYear()} MattyJacks LLC, all rights reserved · 4weird Games · New Hampshire, USA ·
            100 Vibe Coins (🪙) = exactly $1.00
          </p>
          <p className="mx-auto mt-2 max-w-4xl text-center text-xs leading-relaxed text-muted-foreground/80">
            Play weird games, join cozy clans, hire robot helpers, and rent cloud power — all in your browser.
            Be nice, no cheating, creators raise gifts (not charity, not investment). Coins are on-site fun
            only and can&apos;t be cashed out. Full rules live in the{" "}
            <Link href="/terms" className="font-semibold hover:text-foreground hover:underline underline-offset-4">Terms</Link>,{" "}
            <Link href="/privacy" className="font-semibold hover:text-foreground hover:underline underline-offset-4">Privacy Policy</Link>, and{" "}
            <Link href="/docs" className="font-semibold hover:text-foreground hover:underline underline-offset-4">Docs</Link>.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link href="/terms" className="rounded-full border border-border px-3 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground hover:bg-accent">Terms</Link>
            <Link href="/privacy" className="rounded-full border border-border px-3 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground hover:bg-accent">Privacy</Link>
            <Link href="/my/rights" className="rounded-full border border-border px-3 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground hover:bg-accent">Privacy Rights</Link>
            <Link href="/accessibility" className="rounded-full border border-border px-3 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground hover:bg-accent">Accessibility</Link>
            <Link href="/docs/faq" className="rounded-full border border-border px-3 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground hover:bg-accent">FAQ</Link>
            <Link href="/sitemap.xml" className="rounded-full border border-border px-3 py-1.5 font-semibold text-muted-foreground transition hover:text-foreground hover:bg-accent">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
