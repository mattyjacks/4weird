import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

const COLUMNS = [
  {
    label: "Play",
    links: [
      { href: "/", label: "Home" },
      { href: "/games", label: "Games" },
      { href: "/buddy", label: "Gaming Buddy" },
      { href: "/leaderboards", label: "Leaderboards" },
      { href: "/clans", label: "Clans" },
      { href: "/lobbies", label: "Lobbies" },
      { href: "/spaceships", label: "Spaceships" },
      { href: "/xonotic", label: "Xonotic" },
      { href: "/newgameplus", label: "New Game+" },
    ],
  },
  {
    label: "Build",
    links: [
      { href: "/agents", label: "AI Agents" },
      { href: "/runpods", label: "My RunPods" },
      { href: "/swarm", label: "Swarm" },
      { href: "/desktop", label: "Virtual Desktop" },
      { href: "/squads", label: "UnitUnite" },
      { href: "/vibecodeworker", label: "VibeCodeWorker" },
      { href: "/web-apps", label: "Web Apps" },
      { href: "/blender", label: "Blender Studio" },
      { href: "/fal", label: "fal.ai Studio" },
      { href: "/timer", label: "Timer & Work Diary" },
    ],
  },
  {
    label: "VibeCodeWorker",
    links: [
      { href: "/vibecodeworker/overview", label: "Overview" },
      { href: "/vibecodeworker/hub", label: "Workspace Hub" },
      { href: "/vibecodeworker/run", label: "Cloud Run" },
      { href: "/vibecodeworker/full", label: "Full Web" },
      { href: "/vibecodeworker/phone", label: "Remote Phone" },
      { href: "/vibecodeworker/docs", label: "Manual" },
      { href: "/vibecodeworker/demo", label: "Demo" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/bot/setup", label: "Bot Setup" },
      { href: "/bot/bclans", label: "Bot Clans" },
      { href: "/support", label: "Support" },
      { href: "/fundraisers", label: "Fundraisers" },
      { href: "/ads", label: "Ads" },
      { href: "/academy", label: "Academy" },
      { href: "/tech", label: "Technology" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    label: "Docs",
    links: [
      { href: "/docs", label: "Docs Hub" },
      { href: "/docs/about", label: "About" },
      { href: "/docs/getting-started", label: "Getting Started" },
      { href: "/docs/playing-games", label: "Playing Games" },
      { href: "/docs/vibe-coins", label: "Vibe Coins" },
      { href: "/docs/faq", label: "FAQ" },
      { href: "/docs/explore-more", label: "Explore More" },
      { href: "/docs/agents-compute", label: "Agents Compute" },
      { href: "/docs/game-ai-buddy", label: "Game AI Buddy" },
      { href: "/docs/bots", label: "Bots Guide" },
      { href: "/docs/clans", label: "Clans Guide" },
      { href: "/docs/support-launches", label: "Support Launches" },
      { href: "/docs/vibecodeworker", label: "VibeCodeWorker Guide" },
      { href: "/docs/privacy-safety", label: "Privacy & Safety" },
    ],
  },
  {
    label: "Trust",
    links: [
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/my/rights", label: "My Privacy Rights" },
      { href: "/my/usage", label: "My Compute Usage" },
      { href: "/accessibility", label: "Accessibility" },
      { href: "/account", label: "Account" },
      { href: "/auth/login", label: "Login" },
      { href: "/auth/sign-up", label: "Sign Up" },
      { href: "/family/login", label: "Family Login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-10 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 text-left sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="lg:col-span-1">
          <p className="text-base font-black text-foreground">
            🎮 4weird<span className="text-cyan-600 dark:text-cyan-300">Games</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Future Forward Fun; cloud computing that funds AI-built arcade experiments, agents, and squad cloud.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span>Theme</span>
            <ThemeSwitcher />
          </div>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.label} aria-label={`Footer - ${col.label}`}>
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
        © {new Date().getFullYear()} MattyJacks LLC, all rights reserved
      </p>
      <p className="mx-auto mt-2 max-w-6xl text-center text-xs text-muted-foreground/80">
        4weird Games · New Hampshire, USA · 100 Vibe Coins (🪙) = exactly $1.00
      </p>
    </footer>
  );
}
