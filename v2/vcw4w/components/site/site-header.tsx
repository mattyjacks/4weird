"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavLink = {
  href: string;
  label: string;
  external?: boolean;
};

const GITHUB_HREF = "https://github.com/mattyjacks/4weird";

const NAV_GROUPS: { label: string; links: NavLink[] }[] = [
  {
    label: "Play",
    links: [
      { href: "/games", label: "All Games" },
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
      { href: "/docs", label: "Docs" },
      { href: GITHUB_HREF, label: "GitHub", external: true },
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
    label: "Account",
    links: [
      { href: "/bot/setup", label: "Bots" },
      { href: "/bot/bclans", label: "Bot Clans" },
      { href: "/account", label: "Account" },
      { href: "/my/usage/", label: "Usage" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

const ALL_GAMES_HREF = "/games";

function isActive(pathname: string, href: string) {
  // External links are never "active".
  if (/^https?:\/\//.test(href)) return false;
  // Trailing-slash-insensitive: "/my/usage" and "/my/usage/" are the same page.
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
  const path = norm(pathname);
  const target = norm(href);
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}

function groupActive(pathname: string, links: { href: string }[]) {
  return links.some((link) => isActive(pathname, link.href));
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const pathname = usePathname();
  const desktopNavRef = useRef<HTMLElement>(null);

  // Track auth state so the header can show Login / Sign Up vs Dashboard.
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (mounted) setSignedIn(Boolean(data.session));
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) setSignedIn(Boolean(session));
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch {
        if (mounted) setSignedIn(false);
      }
    })();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

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
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur dark:border-white/10 dark:bg-black/85">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link href="/" className="shrink-0 text-lg font-black text-foreground" aria-label="4weird home">
            🎮 4weird
          </Link>

          {/* Desktop nav: 2-level — one button per group, links in a dropdown */}
          <nav
            ref={desktopNavRef}
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex"
            onMouseLeave={() => setOpenMenu(null)}
          >
            <Link
              href={ALL_GAMES_HREF}
              aria-current={isActive(pathname, ALL_GAMES_HREF) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 font-bold transition hover:bg-accent hover:text-accent-foreground ${
                isActive(pathname, ALL_GAMES_HREF) ? "text-cyan-600 dark:text-cyan-300" : ""
              }`}
            >
              All Games
            </Link>
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
                    className={`flex items-center gap-1 rounded-lg px-3 py-2 font-semibold transition hover:bg-accent hover:text-accent-foreground ${
                      active ? "text-cyan-600 dark:text-cyan-300" : ""
                    }`}
                  >
                    {group.label}
                    <span aria-hidden="true" className={`text-xs transition-transform ${expandedMenu ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                  </button>
                  {expandedMenu && (
                    <div className="absolute left-0 top-full z-50 min-w-52 pt-1">
                      <ul className="overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-black/50">
                        {group.links.map((link) => (
                          <li key={link.href}>
                            {link.external ? (
                              <a
                                href={link.href}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenMenu(null)}
                                className="block whitespace-nowrap px-4 py-2.5 transition hover:bg-accent hover:text-accent-foreground"
                              >
                                {link.label} <span aria-hidden="true">↗</span>
                              </a>
                            ) : (
                              <Link
                                href={link.href}
                                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                                onClick={() => setOpenMenu(null)}
                                className={`block whitespace-nowrap px-4 py-2.5 transition hover:bg-accent hover:text-accent-foreground ${
                                  isActive(pathname, link.href) ? "font-bold text-cyan-600 dark:text-cyan-300" : ""
                                }`}
                              >
                                {link.label}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/pricing"
              className="rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              Get Coins
            </Link>
            {signedIn === null ? (
              <span aria-hidden="true" className="inline-block h-9 w-44 animate-pulse rounded-full bg-muted" />
            ) : signedIn ? (
              <Link
                href="/account"
                className="rounded-full bg-cyan-600 px-5 py-2 text-sm font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-full border border-cyan-600/60 px-5 py-2 text-sm font-bold text-cyan-700 transition hover:bg-cyan-600/10 dark:border-cyan-300/60 dark:text-cyan-200 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-full bg-cyan-600 px-5 py-2 text-sm font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground lg:hidden"
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
            className="border-t border-border bg-background px-4 pb-6 pt-4 lg:hidden dark:border-white/10 dark:bg-black"
          >
            <ul className="space-y-1">
              <li>
                <Link
                  href={ALL_GAMES_HREF}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, ALL_GAMES_HREF) ? "page" : undefined}
                  className={`block rounded-xl bg-cyan-600 px-4 py-3 text-center text-base font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200`}
                >
                  All Games
                </Link>
              </li>
              {NAV_GROUPS.map((group) => {
                const active = groupActive(pathname, group.links);
                const isExpanded = expanded === group.label;
                return (
                  <li key={group.label} className="overflow-hidden rounded-xl border border-border dark:border-white/10">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`mobile-group-${group.label}`}
                      onClick={() => setExpanded(isExpanded ? null : group.label)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-base font-bold transition hover:bg-accent ${
                        active ? "text-cyan-600 dark:text-cyan-300" : "text-foreground"
                      }`}
                    >
                      {group.label}
                      <span aria-hidden="true" className={`text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {isExpanded && (
                      <ul id={`mobile-group-${group.label}`} className="border-t border-border bg-muted/40 py-1 dark:border-white/10 dark:bg-white/[.02]">
                        {group.links.map((link) => (
                          <li key={link.href}>
                            {link.external ? (
                              <a
                                href={link.href}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpen(false)}
                                className="block px-6 py-2.5 text-[15px] font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                              >
                                {link.label} <span aria-hidden="true">↗</span>
                              </a>
                            ) : (
                              <Link
                                href={link.href}
                                onClick={() => setOpen(false)}
                                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                                className={`block px-6 py-2.5 text-[15px] font-semibold transition hover:bg-accent hover:text-accent-foreground ${
                                  isActive(pathname, link.href) ? "text-cyan-600 dark:text-cyan-300" : "text-muted-foreground"
                                }`}
                              >
                                {link.label}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border px-5 py-3 text-center font-bold text-foreground"
              >
                Get Coins
              </Link>
              {signedIn === null ? null : signedIn ? (
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-cyan-600 px-5 py-3 text-center font-black text-white dark:bg-cyan-300 dark:text-slate-950"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-cyan-600/60 px-5 py-3 text-center font-bold text-cyan-700 dark:border-cyan-300/60 dark:text-cyan-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-cyan-600 px-5 py-3 text-center font-black text-white dark:bg-cyan-300 dark:text-slate-950"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
