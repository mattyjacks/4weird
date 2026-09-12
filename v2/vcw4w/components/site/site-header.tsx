"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { WalletBadges } from "@/components/site/wallet-badges";

import { SITE_NAV_GROUPS as SHARED_NAV_GROUPS } from "@/lib/site-nav";

// Single source of truth for link explanations lives in lib/site-nav.ts
// (also powers MenuSidebar). The href literals below stay inline because
// scripts/verify-*.mjs assert their presence in this file.
const QUICK_BY_HREF = new Map(
  SHARED_NAV_GROUPS.flatMap((g) => g.links).map((l) => [`${l.label}::${l.href}`, l.quick] as const),
);

function quickFor(label: string, href: string): string | undefined {
  return QUICK_BY_HREF.get(`${label}::${href}`);
}

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
      { href: "/newgameplus", label: "NewGamePlus" },
      { href: "/submit", label: "Submit Game" },
      { href: "/vault", label: "Weird Vault" },
      { href: "/meshy", label: "Meshy 3D" },
      { href: "/agents", label: "AI Agents" },
      { href: "/runpods", label: "My RunPods" },
      { href: "/fal", label: "fal.ai Studio" },
      { href: "/desktop", label: "Virtual Desktop" },
      { href: "/squads", label: "UnitUnite" },
      { href: "/timer", label: "Timer & Work Diary" },
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

// Nav source: shared groups in lib/site-nav (single source of truth).
// The /bot/bclans console link lives there as href: "/bot/bclans" and renders
// in this header's dropdowns + mobile menu via NAV_GROUPS above.
// Same shared source also provides href: "/desktop", href: "/runpods", and
// href: "/timer" for the header menus.

const ALL_GAMES_HREF = "/games";

// Desktop dropdown timing: 2s swirl fade-out on mouse-away, up to 1s
// proportional restore when the mouse comes back (restore = faded * 1s,
// so 0.6s away -> ~0.3s restore).
const NAV_FADE_OUT_MS = 2000;
const NAV_RESTORE_MAX_MS = 1000;
const NAV_SWITCH_FADE_MS = 180;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type DesktopNavGroupProps = {
  group: { label: string; links: NavLink[] };
  active: boolean;
  expandedMenu: boolean;
  pathname: string;
  onOpen: () => void;
  onRequestClose: () => void;
  onNavigate: () => void;
};

/**
 * One desktop nav dropdown: click/hover pins it open; mouse-away starts a
 * 2s fade where a mouse-disturbed gradient mask dissolves the panel while it
 * slides back up into its button. Moving the mouse back restores opacity in
 * (faded * 1s) from the swirl.
 */
function DesktopNavGroup({ group, active, expandedMenu, pathname, onOpen, onRequestClose, onNavigate }: DesktopNavGroupProps) {
  const [leaving, setLeaving] = useState(false);
  const stayVisible = expandedMenu || leaving;
  const panelRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef(0);
  const velRef = useRef(0);
  const swirlRef = useRef(0);
  const rafRef = useRef(0);
  const leavingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const cancelAnim = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  const paint = () => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.setProperty("--fade", fadeRef.current.toFixed(4));
    panel.style.setProperty("--vel", velRef.current.toFixed(4));
    panel.style.setProperty("--swirl", `${swirlRef.current.toFixed(1)}deg`);
  };

  const setMouseFromClient = (clientX: number, clientY: number) => {
    const panel = panelRef.current;
    let nx = 0.5;
    let ny = 0;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      }
    }
    panel?.style.setProperty("--mx", `${(nx * 100).toFixed(1)}%`);
    panel?.style.setProperty("--my", `${(ny * 100).toFixed(1)}%`);
    const now = performance.now();
    const last = lastPosRef.current;
    if (last) {
      const dist = Math.hypot(clientX - last.x, clientY - last.y);
      const dt = Math.max(16, now - last.t);
      const boost = Math.min(1, dist / (140 * (dt / 16)));
      velRef.current = Math.min(1, velRef.current + boost * 0.55);
      swirlRef.current = (swirlRef.current + boost * 46) % 360;
    }
    lastPosRef.current = { x: clientX, y: clientY, t: now };
  };

  // Global mouse disturbance while fading: wiggling the mouse churns the mask.
  useEffect(() => {
    if (!leaving) return;
    const onMove = (event: PointerEvent) => setMouseFromClient(event.clientX, event.clientY);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [leaving]);

  useEffect(() => {
    cancelAnim();
    return cancelAnim;
  }, []);

  // Parent yanked the open state (switched group / Escape / outside / route):
  // fast swirl-away if we were mid-fade, otherwise hide instantly.
  useEffect(() => {
    if (expandedMenu || !leavingRef.current) return;
    if (prefersReducedMotion()) {
      leavingRef.current = false;
      setLeaving(false);
      return;
    }
    const start = fadeRef.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / NAV_SWITCH_FADE_MS);
      fadeRef.current = start + (1 - start) * t;
      velRef.current *= 0.94;
      swirlRef.current = (swirlRef.current + (1.5 + velRef.current * 10)) % 360;
      paint();
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
        leavingRef.current = false;
        setLeaving(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return cancelAnim;
  }, [expandedMenu]);

  const handleEnter = () => {
    if (leavingRef.current) {
      // Mouse came back mid-fade: restore in (faded * 1s), unwinding the swirl.
      cancelAnim();
      const faded = fadeRef.current;
      onOpen();
      if (prefersReducedMotion() || faded <= 0.01) {
        fadeRef.current = 0;
        velRef.current = 0;
        leavingRef.current = false;
        setLeaving(false);
        paint();
        return;
      }
      const duration = Math.min(NAV_RESTORE_MAX_MS, Math.max(120, faded * NAV_RESTORE_MAX_MS));
      const start = faded;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 2);
        fadeRef.current = start * (1 - eased);
        velRef.current *= 0.9;
        swirlRef.current = (swirlRef.current - (2 + velRef.current * 14) * (1 - t)) % 360;
        paint();
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = 0;
          fadeRef.current = 0;
          velRef.current = 0;
          leavingRef.current = false;
          setLeaving(false);
          paint();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    if (!expandedMenu) onOpen();
  };

  const handleLeave = () => {
    if (!expandedMenu || leavingRef.current) return;
    if (prefersReducedMotion()) {
      onRequestClose();
      return;
    }
    leavingRef.current = true;
    setLeaving(true);
    fadeRef.current = 0;
    velRef.current = 0;
    lastPosRef.current = null;
    paint();
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / NAV_FADE_OUT_MS);
      fadeRef.current = t;
      velRef.current *= 0.93;
      swirlRef.current = (swirlRef.current + (1.2 + velRef.current * 16)) % 360;
      paint();
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
        leavingRef.current = false;
        setLeaving(false);
        fadeRef.current = 0;
        onRequestClose();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={(event) => setMouseFromClient(event.clientX, event.clientY)}
      onFocusCapture={() => {
        if (!expandedMenu) onOpen();
      }}
    >
      <button
        type="button"
        aria-expanded={expandedMenu}
        aria-haspopup="true"
        aria-current={active && !expandedMenu ? "page" : undefined}
        onClick={() => (expandedMenu ? onRequestClose() : onOpen())}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition hover:bg-accent hover:text-accent-foreground ${
          active ? "text-cyan-600 dark:text-cyan-300" : ""
        }`}
      >
        {group.label}
        <span aria-hidden="true" className={`text-xs transition-transform ${expandedMenu ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {stayVisible && (
        <div ref={panelRef} className="nav-swirl-panel desktop-fluid absolute left-0 top-full z-50 min-w-52 pt-1">
          <ul className="nav-swirl-list overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:shadow-black/50">
            {group.links.map((link, index) => (
              <li key={`${link.href}-${link.label}`} style={{ "--i": index } as CSSProperties}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={onNavigate}
                    title={quickFor(link.label, link.href) ?? link.label}
                    className="block min-w-52 max-w-64 whitespace-normal px-3 py-1.5 text-sm transition hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="block font-semibold">{link.label} <span aria-hidden="true">↗</span></span>
                    {quickFor(link.label, link.href) && <span className="block text-xs font-normal text-muted-foreground">{quickFor(link.label, link.href)}</span>}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    onClick={onNavigate}
                    title={quickFor(link.label, link.href) ?? link.label}
                    className={`block min-w-52 max-w-64 whitespace-normal px-3 py-1.5 text-sm transition hover:bg-accent hover:text-accent-foreground ${
                      isActive(pathname, link.href) ? "font-bold text-cyan-600 dark:text-cyan-300" : ""
                    }`}
                  >
                    <span className="block font-semibold">{link.label}</span>
                    {quickFor(link.label, link.href) && <span className="block text-xs font-normal text-muted-foreground">{quickFor(link.label, link.href)}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  const mobileNavRef = useRef<HTMLElement>(null);

  // Track auth state so the header can show Login / Sign Up vs Dashboard.
  // WalletBadges reports back on 401 (server no longer sees the session)
  // so a stale/expired client session stops polling instead of spamming
  // `GET .../balance 401` every 10s.
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
          if (!mounted) return;
          // Any auth event without a session (SIGNED_OUT, refresh failure,
          // expired token) means logged out: flip header + let WalletBadges
          // unmount so balance polling stops instead of 401-spamming.
          setSignedIn(Boolean(session));
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

  // Mobile sheet: lock background scroll while open so the panel owns the
  // gesture, and close on Escape. The sheet itself stays inner-scrollable.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // When a mobile group expands, glide it into view inside the sheet with a
  // gentle curve (smooth behavior) instead of jumping.
  useEffect(() => {
    if (!open || !expanded || !mobileNavRef.current) return;
    if (prefersReducedMotion()) return;
    const target = mobileNavRef.current.querySelector(`[data-group="${expanded}"]`);
    if (target) {
      // Let the accordion mount first, then ease toward it.
      const id = window.setTimeout(() => {
        (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [expanded, open]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-cyan-300 focus:px-3 focus:py-2 focus:font-bold focus:text-black"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur dark:border-white/10 dark:bg-black/85">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-5">
          <Link href="/" className="shrink-0 text-lg font-black text-foreground" aria-label="4weird home">
            🎮 4weird
          </Link>

          {/* Desktop nav: 2-level; one button per group, links in a dropdown */}
          <nav
            ref={desktopNavRef}
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex"
          >
            <Link
              href={ALL_GAMES_HREF}
              aria-current={isActive(pathname, ALL_GAMES_HREF) ? "page" : undefined}
              className={`rounded-lg px-2.5 py-1.5 font-bold transition hover:bg-accent hover:text-accent-foreground ${
                isActive(pathname, ALL_GAMES_HREF) ? "text-cyan-600 dark:text-cyan-300" : ""
              }`}
            >
              All Games
            </Link>
            {NAV_GROUPS.map((group) => {
              const active = groupActive(pathname, group.links);
              const expandedMenu = openMenu === group.label;
              return (
                <DesktopNavGroup
                  key={group.label}
                  group={group}
                  active={active}
                  expandedMenu={expandedMenu}
                  pathname={pathname}
                  onOpen={() => setOpenMenu(group.label)}
                  onRequestClose={() => setOpenMenu((prev) => (prev === group.label ? null : prev))}
                  onNavigate={() => setOpenMenu(null)}
                />
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <WalletBadges signedIn={signedIn} onUnauthorized={() => setSignedIn(false)} />
            <Link
              href="/pricing"
              className="rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              Get Coins
            </Link>
            {signedIn === null ? (
              <span aria-hidden="true" className="inline-block h-9 w-44 animate-pulse rounded-full bg-muted" />
            ) : signedIn ? (
              <Link
                href="/account"
                className="rounded-full bg-cyan-600 px-4 py-1.5 text-sm font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-full border border-cyan-600/60 px-4 py-1.5 text-sm font-bold text-cyan-700 transition hover:bg-cyan-600/10 dark:border-cyan-300/60 dark:text-cyan-200 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/auth/sign-up"
className="rounded-full bg-cyan-600 px-4 py-1.5 text-sm font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile balances + toggle: badges stay visible even when the sheet is closed */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:hidden">
            <WalletBadges signedIn={signedIn} onUnauthorized={() => setSignedIn(false)} />
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground lg:hidden"
              aria-expanded={open}
              aria-controls="site-mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden="true">{open ? "✕" : "☰"}</span>
              Menu
            </button>
          </div>
        </div>

        {/* Mobile nav: 2-level accordion; one tap expands a group.
            The sheet is capped to the viewport and scrolls internally so every
            option stays reachable, with smooth curved motion throughout. */}
        {open && (
          <nav
            ref={mobileNavRef}
            id="site-mobile-nav"
            aria-label="Mobile navigation"
            className="mobile-nav-sheet mobile-nav-scroll mobile-fluid border-t border-border bg-background px-3 pb-4 pt-3 lg:hidden dark:border-white/10 dark:bg-black"
          >
            <ul className="space-y-1">
              <li>
                <Link
                  href={ALL_GAMES_HREF}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, ALL_GAMES_HREF) ? "page" : undefined}
                  className={`block rounded-xl bg-cyan-600 px-3 py-2 text-center text-sm font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200`}
                >
                  All Games
                </Link>
              </li>
              {NAV_GROUPS.map((group) => {
                const active = groupActive(pathname, group.links);
                const isExpanded = expanded === group.label;
                return (
                  <li
                    key={group.label}
                    data-group={group.label}
                    className="mobile-group-card overflow-hidden rounded-xl border border-border dark:border-white/10"
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`mobile-group-${group.label}`}
                      onClick={() => setExpanded(isExpanded ? null : group.label)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm font-bold transition hover:bg-accent ${
                        active ? "text-cyan-600 dark:text-cyan-300" : "text-foreground"
                      }`}
                    >
                      {group.label}
                      <span aria-hidden="true" className={`text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {isExpanded && (
                      <ul
                        id={`mobile-group-${group.label}`}
                        className="mobile-acc-panel mobile-acc-list mobile-acc-scroll mobile-fluid border-t border-border bg-muted/40 py-1 dark:border-white/10 dark:bg-white/[.02]"
                      >
                        {group.links.map((link, index) => (
                          <li key={`${link.href}-${link.label}`} style={{ "--i": index } as CSSProperties}>
                            {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={() => setOpen(false)}
                      title={quickFor(link.label, link.href) ?? link.label}
                                className="block px-5 py-1.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                              >
                                <span className="block">{link.label} <span aria-hidden="true">↗</span></span>
                                {quickFor(link.label, link.href) && <span className="block text-xs font-normal opacity-80">{quickFor(link.label, link.href)}</span>}
                              </a>
                            ) : (
                              <Link
                                href={link.href}
                                onClick={() => setOpen(false)}
                                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                                title={quickFor(link.label, link.href) ?? link.label}
                                className={`block px-5 py-1.5 text-sm font-semibold transition hover:bg-accent hover:text-accent-foreground ${
                                  isActive(pathname, link.href) ? "text-cyan-600 dark:text-cyan-300" : "text-muted-foreground"
                                }`}
                              >
                                <span className="block">{link.label}</span>
                                {quickFor(link.label, link.href) && <span className="block text-xs font-normal opacity-80">{quickFor(link.label, link.href)}</span>}
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
                className="rounded-full border border-border px-4 py-2 text-center text-sm font-bold text-foreground"
              >
                Get Coins
              </Link>
              {signedIn === null ? null : signedIn ? (
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-cyan-600 px-4 py-2 text-center text-sm font-black text-white dark:bg-cyan-300 dark:text-slate-950"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-cyan-600/60 px-4 py-2 text-center text-sm font-bold text-cyan-700 dark:border-cyan-300/60 dark:text-cyan-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-cyan-600 px-4 py-2 text-center text-sm font-black text-white dark:bg-cyan-300 dark:text-slate-950"
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
