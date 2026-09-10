"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_GROUPS = [
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
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/bot/setup", label: "Bots" },
      { href: "/account", label: "Account" },
      { href: "/my/usage/", label: "Usage" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

const ALL_LINKS = NAV_GROUPS.flatMap((g) => g.links);

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-cyan-300 focus:px-3 focus:py-2 focus:font-bold focus:text-black"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link href="/" className="shrink-0 text-lg font-black text-white" aria-label="4weird Games home">
            🎮 4weird<span className="text-cyan-300">Games</span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary navigation" className="hidden items-center gap-x-4 gap-y-2 text-sm text-slate-300 lg:flex">
            {ALL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={`rounded px-1 py-1 transition hover:text-white ${
                  isActive(pathname, link.href) ? "font-bold text-cyan-300" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/mattyjacks/4weird"
              target="_blank"
              rel="noreferrer"
              className="rounded px-1 py-1 transition hover:text-white"
            >
              GitHub
            </a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/pricing"
              className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Get Coins
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-bold text-white lg:hidden"
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
            Menu
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <nav
            id="site-mobile-nav"
            aria-label="Mobile navigation"
            className="border-t border-white/10 bg-black px-4 pb-6 pt-4 lg:hidden"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{group.label}</p>
                  <ul className="mt-2 space-y-1">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          aria-current={isActive(pathname, link.href) ? "page" : undefined}
                          className={`block rounded-lg px-3 py-2.5 text-base font-semibold transition hover:bg-white/10 hover:text-white ${
                            isActive(pathname, link.href) ? "bg-white/10 text-cyan-300" : "text-slate-200"
                          }`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="rounded-full bg-cyan-300 px-5 py-3 text-center font-bold text-slate-950"
              >
                Get Coins — 100 = $1.00
              </Link>
              <a
                href="https://github.com/mattyjacks/4weird"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-5 py-3 text-center font-semibold text-white"
              >
                GitHub
              </a>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
