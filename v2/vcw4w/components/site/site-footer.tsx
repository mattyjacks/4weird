import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

const COLUMNS = [
  {
    label: "Play",
    links: [
      { href: "/games", label: "Games" },
      { href: "/buddy", label: "Gaming Buddy" },
      { href: "/leaderboards", label: "Leaderboards" },
      { href: "/clans", label: "Clans" },
      { href: "/lobbies", label: "Lobbies" },
    ],
  },
  {
    label: "Build",
    links: [
      { href: "/agents", label: "AI Agents" },
      { href: "/desktop", label: "Virtual Desktop" },
      { href: "/teams", label: "UnitUnite" },
      { href: "/vibecodeworker", label: "VibeCodeWorker" },
      { href: "/web-apps", label: "Web Apps" },
    ],
  },
  {
    label: "Explore",
    links: [
      { href: "/spaceships", label: "Spaceships" },
      { href: "/academy", label: "Academy" },
      { href: "/tech", label: "Technology" },
      { href: "/pricing", label: "Pricing" },
      { href: "/docs", label: "Docs" },
    ],
  },
  {
    label: "Trust",
    links: [
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/my/rights", label: "My Privacy Rights" },
      { href: "/my/usage/", label: "My Compute Usage" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-10 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 text-left sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <p className="text-base font-black text-foreground">
            🎮 4weird<span className="text-cyan-600 dark:text-cyan-300">Games</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Future Forward Fun — cloud computing that funds AI-built arcade experiments, agents, and team cloud.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span>Theme</span>
            <ThemeSwitcher />
          </div>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.label} aria-label={`Footer — ${col.label}`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">{col.label}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground hover:underline underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-border pt-5 text-center text-xs dark:border-white/10 sm:text-sm">
        © 2026 MattyJacks LLC · 4weird Games · New Hampshire, USA · 100 Vibe Coins (🪙) = exactly $1.00
      </p>
    </footer>
  );
}
