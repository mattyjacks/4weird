import Link from "next/link";

export const DOCS_NAV: { href: string; label: string; blurb: string }[] = [
  { href: "/docs", label: "Docs home", blurb: "Start here" },
  { href: "/docs/about", label: "About 4weird", blurb: "Company, mission, flywheel" },
  { href: "/docs/getting-started", label: "Getting started", blurb: "Account, trial, first day" },
  { href: "/docs/playing-games", label: "Playing games", blurb: "Catalog, play, saves, guests" },
  { href: "/docs/vibe-coins", label: "Vibe Coins", blurb: "Packs, bonuses, checkout" },
  { href: "/docs/clans", label: "Clans", blurb: "Forum, chat, upkeep, XP" },
  { href: "/docs/bots", label: "Bots", blurb: "Bot keys + clan bot API" },
  { href: "/docs/agents-compute", label: "Agents & cloud", blurb: "Rentals, desktops, teams" },
  { href: "/docs/game-ai-buddy", label: "Game AI & Buddy", blurb: "AI features + voice coach" },
  { href: "/docs/vibecodeworker", label: "VibeCodeWorker", blurb: "QA runs, bugs, handoffs" },
  { href: "/docs/privacy-safety", label: "Privacy & safety", blurb: "Rights, moderation, reports" },
  { href: "/docs/faq", label: "FAQ & support", blurb: "Answers + contact" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-5 sm:py-14 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav
            aria-label="Docs navigation"
            className="rounded-2xl border border-border bg-card p-3"
          >
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
              📚 4weird Docs
            </p>
            <ul className="space-y-1">
              {DOCS_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-3 py-2 transition hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
