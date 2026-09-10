"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const GITHUB_HREF = "https://github.com/mattyjacks/4weird";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupActive(pathname: string, links: { href: string }[]) {
  return links.some((link) => isActive(pathname, link.href));
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const desktopNavRef = useRef<HTMLElement>(null);

  // Close the desktop dropdown on route change.
  useEffect(() => {
    setOpenMenu(null);
    setOpen(false);
  }, [pathname]);

  // Default the mobile accordion to the group holding the current page.
  useEffect(() => {
    const current = NAV_GROUPS.find((g) => groupActive(pathname, g.links));
    setExpanded((prev) => prev ?? current?.label ?? "Play");
  }, [pathname]);

  // Close the desktop dropdown on Escape or outside pointer-down.
  useEffect(() => {
    if (!openMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (desktopNavRef.current && !desktopNavRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openMenu]);

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

          {/* Desktop nav: 2-level — one button per group, links in a dropdown */}
          <nav
            ref={desktopNavRef}
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-sm text-slate-300 lg:flex"
            onMouseLeave={() => setOpenMenu(null)}
          >
            {NAV_GROUPS.map((group) => {
              const active = groupActive(pathname, group.links);
              const expandedMenu = openMenu === group.label;
              return (
                <div key={group.label} className="relative" onMouseEnter={() => setOpenMenu(group.label)}>
                  <button
                    type="button"
                    aria-expanded={expandedMenu}
                    aria-haspopup="true"
                    aria-current={active && !expandedMenu ? "page" : undefined}
                    onClick={() => setOpenMenu(expandedMenu ? null : group.label)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-2 font-semibold transition hover:bg-white/10 hover:text-white ${
                      active ? "text-cyan-300" : ""
                    }`}
                  >
                    {group.label}
                    <span aria-hidden="true" className={`text-xs transition-transform ${expandedMenu ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                  </button>
                  {expandedMenu && (
                    <div className="absolute left-0 top-full z-50 min-w-52 pt-1">
                      <ul className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 py-1 shadow-xl shadow-black/50 backdrop-blur">
                        {group.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              aria-current={isActive(pathname, link.href) ? "page" : undefined}
                              onClick={() => setOpenMenu(null)}
                              className={`block whitespace-nowrap px-4 py-2.5 transition hover:bg-white/10 hover:text-white ${
                                isActive(pathname, link.href) ? "font-bold text-cyan-300" : ""
                              }`}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
            <a
              href={GITHUB_HREF}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-2 font-semibold transition hover:bg-white/10 hover:text-white"
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

        {/* Mobile nav: 2-level accordion — one tap expands a group */}
        {open && (
          <nav
            id="site-mobile-nav"
            aria-label="Mobile navigation"
            className="border-t border-white/10 bg-black px-4 pb-6 pt-4 lg:hidden"
          >
            <ul className="space-y-1">
              {NAV_GROUPS.map((group) => {
                const active = groupActive(pathname, group.links);
                const isExpanded = expanded === group.label;
                return (
                  <li key={group.label} className="overflow-hidden rounded-xl border border-white/10">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`mobile-group-${group.label}`}
                      onClick={() => setExpanded(isExpanded ? null : group.label)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-base font-bold transition hover:bg-white/5 ${
                        active ? "text-cyan-300" : "text-white"
                      }`}
                    >
                      {group.label}
                      <span aria-hidden="true" className={`text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {isExpanded && (
                      <ul id={`mobile-group-${group.label}`} className="border-t border-white/10 bg-white/[.02] py-1">
                        {group.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={() => setOpen(false)}
                              aria-current={isActive(pathname, link.href) ? "page" : undefined}
                              className={`block px-6 py-2.5 text-[15px] font-semibold transition hover:bg-white/10 hover:text-white ${
                                isActive(pathname, link.href) ? "text-cyan-300" : "text-slate-200"
                              }`}
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
              <li>
                <a
                  href={GITHUB_HREF}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-white/10 px-4 py-3 text-base font-bold text-white transition hover:bg-white/5"
                >
                  GitHub
                </a>
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="rounded-full bg-cyan-300 px-5 py-3 text-center font-bold text-slate-950"
              >
                Get Coins — 100 = $1.00
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
