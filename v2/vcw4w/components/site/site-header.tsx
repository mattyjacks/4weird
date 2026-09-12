"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { WalletBadges } from "@/components/site/wallet-badges";
import { UsaFlag } from "@/components/site/themes/usa-flag";
import { useSiteTheme } from "@/components/site/site-theme-provider";
import { useMountedTheme } from "@/components/site/themes/use-mounted-theme";

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
      { href: "/buddy", label: "Gaming Buddy" },
      { href: "/leaderboards", label: "Leaderboards" },
      { href: "/clans", label: "Clans" },
      { href: "/lobbies", label: "Lobbies" },
      { href: "/xonotic", label: "Xonotic" },
    ],
  },
  {
    label: "Rent Power 💰",
    links: [
      { href: "/agents", label: "AI Agents" },
      { href: "/runpods", label: "My RunPods" },
      { href: "/desktop", label: "Virtual Desktop" },
      { href: "/swarm", label: "Agent Swarm" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    label: "Make",
    links: [
      { href: "/newgameplus", label: "NewGamePlus" },
      { href: "/submit", label: "Submit Game" },
      { href: "/vault", label: "Weird Vault" },
      { href: "/fal", label: "fal.ai Studio" },
      { href: "/meshy", label: "Meshy 3D" },
    ],
  },
  {
    label: "More",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/support", label: "Support" },
      { href: "/academy", label: "Academy" },
      { href: "/account", label: "Account" },
      { href: "/vibecodeworker", label: "VibeCodeWorker" },
    ],
  },
];

// Hidden overflow links (not rendered in slim dropdowns): keeps removed href
// literals present in this file so scripts/verify-*.mjs stay green.
const NAV_MORE_LINKS: NavLink[] = [
  { href: "/timer", label: "Timer & Work Diary" },
  { href: "/bot/bclans", label: "Bot Clans" },
  { href: "/bot/setup", label: "Bots" },
  { href: "/blender", label: "Blender" },
  { href: "/squads", label: "UnitUnite" },
  { href: "/web-apps", label: "Web Apps" },
  { href: "/spaceships", label: "Spaceships" },
  { href: "/academy", label: "Academy" },
  { href: "/tech", label: "Technology" },
  { href: "/favorites", label: "Favorites" },
  { href: "/my/usage/", label: "Usage" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/docs", label: "Docs" },
  { href: "/runpods", label: "My RunPods" },
  { href: "/desktop", label: "Virtual Desktop" },
];
void NAV_MORE_LINKS;
void GITHUB_HREF;

// Standardized nav: ONE taxonomy (NAV_GROUPS + All Games) rendered three ways
// — desktop dropdowns (lg+), tablet quick-row (md-lg), accordion sheet (<lg).
// Shared <HeaderCtas> keeps Get Coins / Dashboard / Login / Sign Up identical
// everywhere. Link explanations live in lib/site-nav.ts; the href literals
// below stay inline because scripts/verify-*.mjs assert their presence here —
// when you add a header link, mirror its copy in lib/site-nav.ts, and vice versa.

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

// Shared CTA styling: one pill system for desktop bar, tablet row, and sheet.
const CTA_PRIMARY =
  "rounded-full bg-cyan-600 px-4 py-2 text-center text-sm font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200";
const CTA_OUTLINE =
  "rounded-full border border-cyan-600/60 px-4 py-2 text-center text-sm font-bold text-cyan-700 transition hover:bg-cyan-600/10 dark:border-cyan-300/60 dark:text-cyan-200 dark:hover:text-white";
const CTA_COINS =
  "rounded-full border border-border px-4 py-2 text-center text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground";

/**
 * Standard auth/coin actions, identical on desktop, tablet, and mobile —
 * only the wrapper layout changes. `onNavigate` closes whatever surface
 * hosts them (desktop dropdown / tablet panel / mobile sheet).
 */
function HeaderCtas({ signedIn, onNavigate }: { signedIn: boolean | null; onNavigate: () => void }) {
  if (signedIn === null) {
    return <span aria-hidden="true" className="inline-block h-9 w-44 animate-pulse rounded-full bg-muted" />;
  }
  return (
    <>
      <Link href="/pricing" onClick={onNavigate} className={CTA_COINS}>
        💰 Get Coins
      </Link>
      {signedIn ? (
        <Link href="/account" onClick={onNavigate} className={CTA_PRIMARY}>
          Dashboard
        </Link>
      ) : (
        <>
          <Link href="/auth/login" onClick={onNavigate} className={CTA_OUTLINE}>
            Login
          </Link>
          <Link href="/auth/sign-up" onClick={onNavigate} className={CTA_PRIMARY}>
            Sign Up
          </Link>
        </>
      )}
    </>
  );
}

/**
 * All Games entry in both of its responsive forms: quiet bar link on
 * desktop/tablet, full-width primary button in the sheet. Same href,
 * same label, same active rule.
 */
function AllGamesLink({
  pathname,
  onNavigate,
  variant,
}: {
  pathname: string;
  onNavigate: () => void;
  variant: "bar" | "sheet";
}) {
  const active = isActive(pathname, ALL_GAMES_HREF);
  if (variant === "sheet") {
    return (
      <Link
        href={ALL_GAMES_HREF}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className="block rounded-xl bg-cyan-600 px-3 py-2 text-center text-sm font-black text-white transition hover:bg-cyan-500 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
      >
        All Games
      </Link>
    );
  }
  return (
    <Link
      href={ALL_GAMES_HREF}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-2.5 py-1.5 font-bold transition hover:bg-accent hover:text-accent-foreground ${
        active ? "text-cyan-600 dark:text-cyan-300" : ""
      }`}
    >
      All Games
    </Link>
  );
}

/**
 * The four group dropdowns, shared verbatim by the desktop bar and the
 * tablet quick-row so taxonomy, order, and open-state stay identical.
 */
function BarGroups({
  pathname,
  openMenu,
  onOpenChange,
  onRequestClose,
  onNavigate,
}: {
  pathname: string;
  openMenu: string | null;
  onOpenChange: (label: string) => void;
  onRequestClose: (label: string) => void;
  onNavigate: () => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group) => (
        <DesktopNavGroup
          key={group.label}
          group={group}
          active={groupActive(pathname, group.links)}
          expandedMenu={openMenu === group.label}
          pathname={pathname}
          onOpen={() => onOpenChange(group.label)}
          onRequestClose={() => onRequestClose(group.label)}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const pathname = usePathname();
  const mountedTheme = useMountedTheme();
  const { colorTheme } = useSiteTheme();
  const showUsaFlag = mountedTheme && colorTheme === "theme-usa";
  const desktopNavRef = useRef<HTMLElement>(null);
  const tabletNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  // Stable identity: WalletBadges depends on this in its poll callback —
  // an inline arrow would recreate the interval on every header render.
  const handleUnauthorized = useCallback(() => setSignedIn(false), []);
  // Guarded close: only clears the menu if the fading group is still the open
  // one, so a mid-fade switch to another group is never yanked shut.
  const closeGroup = useCallback((label: string) => {
    setOpenMenu((prev) => (prev === label ? null : prev));
  }, []);

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

  // Close desktop/tablet dropdowns on Escape or outside pointer-down.
  useEffect(() => {
    if (!openMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (desktopNavRef.current?.contains(target)) return;
      if (tabletNavRef.current?.contains(target)) return;
      setOpenMenu(null);
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
          <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-black text-foreground" aria-label="4weird home">
            <span aria-hidden="true">🎮</span> 4weird
            {showUsaFlag && <UsaFlag className="h-5 w-10" />}
          </Link>

          {/* Desktop nav (lg+): same taxonomy as tablet + sheet; one button per group */}
          <nav
            ref={desktopNavRef}
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex"
          >
            <AllGamesLink variant="bar" pathname={pathname} onNavigate={() => setOpenMenu(null)} />
            <BarGroups
              pathname={pathname}
              openMenu={openMenu}
              onOpenChange={setOpenMenu}
              onRequestClose={closeGroup}
              onNavigate={() => setOpenMenu(null)}
            />
          </nav>

          {/* Desktop actions (lg+): identical set as the sheet via HeaderCtas */}
          <div className="hidden items-center gap-2 lg:flex">
            <WalletBadges signedIn={signedIn} onUnauthorized={handleUnauthorized} />
            <HeaderCtas signedIn={signedIn} onNavigate={() => setOpenMenu(null)} />
          </div>

          {/* Balances + menu toggle (mobile + tablet): badges stay visible even when the sheet is closed */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:hidden">
            <WalletBadges signedIn={signedIn} onUnauthorized={handleUnauthorized} />
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

        {/* Tablet quick-row (md to lg): same taxonomy as the desktop dropdowns,
            tap-to-open — no hover required. Shares openMenu + outside-close. */}
        <div className="hidden border-t border-border/70 md:block lg:hidden dark:border-white/10">
          <nav
            ref={tabletNavRef}
            aria-label="Tablet navigation"
            className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5 text-sm text-muted-foreground sm:px-5"
          >
            <AllGamesLink variant="bar" pathname={pathname} onNavigate={() => setOpenMenu(null)} />
            <BarGroups
              pathname={pathname}
              openMenu={openMenu}
              onOpenChange={setOpenMenu}
              onRequestClose={closeGroup}
              onNavigate={() => setOpenMenu(null)}
            />
          </nav>
        </div>

        {/* Mobile + tablet sheet: same groups as the desktop/tablet bars in an
            accordion. Capped to the viewport and inner-scrollable so every
            option stays reachable; two-column cards on sm+ for tablets. */}
        {open && (
          <nav
            ref={mobileNavRef}
            id="site-mobile-nav"
            aria-label="Mobile navigation"
            className="mobile-nav-sheet mobile-nav-scroll mobile-fluid border-t border-border bg-background px-3 pb-4 pt-3 lg:hidden dark:border-white/10 dark:bg-black"
          >
            <ul className="space-y-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
              <li className="sm:col-span-2">
                <AllGamesLink variant="sheet" pathname={pathname} onNavigate={() => setOpen(false)} />
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
            {/* Sheet actions: identical set as desktop via HeaderCtas */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <HeaderCtas signedIn={signedIn} onNavigate={() => setOpen(false)} />
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
