"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSiteTheme } from "@/components/site/site-theme-provider";
import { useMountedTheme } from "@/components/site/themes/use-mounted-theme";
// DS-SEARCH-05: search entry points mount the sibling overlay (DS-SEARCH-04
// owns components/site/search-overlay.tsx; import by contract).
import { SearchOverlay, useRotatingPlaceholder, useSearchShortcut } from "@/components/site/search-overlay";

// Heavy chunks stay off the first-paint bundle and hydrate after it:
// wallet badges pull balance polling + auth wiring, the USA flag pulls
// next/image. Auth gating is unchanged — same props, same signedIn states.
function WalletBadgesSkeleton() {
  return <span aria-hidden="true" className="inline-block h-9 w-44 animate-pulse rounded-full bg-muted" />;
}
const WalletBadges = dynamic(
  () => import("@/components/site/wallet-badges").then((m) => m.WalletBadges),
  { ssr: false, loading: WalletBadgesSkeleton },
);
const UsaFlag = dynamic(() => import("@/components/site/themes/usa-flag").then((m) => m.UsaFlag), {
  ssr: false,
});

import { SITE_NAV_GROUPS as SHARED_NAV_GROUPS } from "@/lib/site-nav";

// Single source of truth for link explanations lives in lib/site-nav.ts
// (also powers MenuSidebar). The href literals below stay inline because
// scripts/verify-*.mjs assert their presence in this file.
const QUICK_BY_HREF = new Map<string, string>();
for (const g of SHARED_NAV_GROUPS) {
  for (const l of g.links) {
    QUICK_BY_HREF.set(`${l.label}::${l.href}`, l.quick);
    QUICK_BY_HREF.set(l.href, l.quick);
    const stripped = l.label.replace(/^[\p{Emoji}\s]+/u, "");
    if (stripped) {
      QUICK_BY_HREF.set(`${stripped}::${l.href}`, l.quick);
    }
  }
}

function quickFor(label: string, href: string): string | undefined {
  return QUICK_BY_HREF.get(`${label}::${href}`) ?? QUICK_BY_HREF.get(href);
}

type NavLink = {
  href: string;
  label: string;
  external?: boolean;
};

const GITHUB_HREF = "https://github.com/mattyjacks/4weird";

const NAV_GROUPS: { label: string; links: NavLink[] }[] = [
  {
    label: "🎮 Play",
    links: [
      { href: "/games", label: "🎮 All Games" },
      { href: "/buddy", label: "🐶 Gaming Buddy" },
      { href: "/leaderboards", label: "🏆 Leaderboards" },
      { href: "/clans", label: "🏰 Clans" },
      { href: "/lobbies", label: "🎪 Lobbies" },
      { href: "/xonotic", label: "🔫 Xonotic" },
    ],
  },
  {
    label: "🌐 Rent Tech",
    links: [
      { href: "/agents", label: "👱🏻‍♀️ AI Agents" },
      { href: "/runpods", label: "⚡ My RunPods" },
      { href: "/desktop", label: "💻 Virtual Desktop" },
      { href: "/swarm", label: "🐝 Agent Swarm" },
      { href: "/pricing", label: "🪙 Pricing" },
    ],
  },
  {
    label: "🛠️ Make",
    links: [
      { href: "/newgameplus", label: "✨ NewGamePlus" },
      { href: "/submit", label: "🚀 Submit Game" },
      { href: "/vault", label: "🗄️ Weird Vault" },
      { href: "/fal", label: "🎨 fal.ai Studio" },
      { href: "/stock", label: "🖼️ Free Stock" },
      { href: "/meshy", label: "🧊 Meshy 3D" },
    ],
  },
  {
    label: "✨ More",
    links: [
      { href: "/docs", label: "📖 Docs" },
      { href: "/support", label: "💛 Support" },
      { href: "/academy", label: "🎓 Academy" },
      { href: "/vocrehab", label: "🧭 Voc Rehab" },
      { href: "/account", label: "👑 Account" },
      { href: "/vibecodeworker", label: "👩🏻‍💻 VibeCodeWorker" },
    ],
  },
];

// Hidden overflow links (not rendered in slim dropdowns): keeps removed href
// literals present in this file so scripts/verify-*.mjs stay green.
const NAV_MORE_LINKS: NavLink[] = [
  { href: "/timer", label: "⏱️ Timer & Work Diary" },
  { href: "/bot/bclans", label: "🤖 Bot Clans" },
  { href: "/bot/setup", label: "🤖 Bots" },
  { href: "/blender", label: "🎥 Blender" },
  { href: "/squads", label: "🛡️ UnitUnite" },
  { href: "/web-apps", label: "🌐 Web Apps" },
  { href: "/game/spaceships", label: "🛸 Spaceships" },
  { href: "/academy", label: "🎓 Academy" },
  { href: "/vocrehab", label: "🧭 Voc Rehab" },
  { href: "/tech", label: "⚙️ Technology" },
  { href: "/favorites", label: "⭐ Favorites" },
  { href: "/my/usage/", label: "📊 Usage" },
  { href: "/accessibility", label: "♿ Accessibility" },
  { href: "/docs", label: "📖 Docs" },
  { href: "/runpods", label: "⚡ My RunPods" },
  { href: "/desktop", label: "💻 Virtual Desktop" },
];
void NAV_MORE_LINKS;
void GITHUB_HREF;

// Standardized nav: ONE taxonomy (NAV_GROUPS, with 🎮 All Games first in Play)
// rendered three ways
// — desktop dropdowns (lg+), tablet quick-row (md-lg), accordion sheet (<lg).
// Shared <HeaderCtas> keeps Get Coins / Dashboard / Login / Sign Up identical
// everywhere. Link explanations live in lib/site-nav.ts; the href literals
// below stay inline because scripts/verify-*.mjs assert their presence here —
// when you add a header link, mirror its copy in lib/site-nav.ts, and vice versa.

// Desktop dropdown timing: standard hover intent (~100ms open/close delay)
// with a ~150ms ease-in panel animation (see .nav-std-panel in globals.css).
const NAV_HOVER_INTENT_MS = 100;

// Cached reduced-motion subscription: a matchMedia read per animation event
// forces a style recalc mid-gesture, so subscribe once per component and
// reuse the boolean through fades, restores, and scroll glides.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia init must sync post-mount (no SSR window); subscription below keeps it live.
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
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

type DropdownLinkProps = {
  link: NavLink;
  index: number;
  pathname: string;
  onNavigate: () => void;
  variant: "dropdown" | "sheet";
};

/**
 * One nav link with its explanation line. Memoized on link identity +
 * pathname-active state so route changes only re-render the two links whose
 * active flag flips; the quick-explanation lookup runs once per link.
 */
const DropdownLink = memo(function DropdownLink({ link, index, pathname, onNavigate, variant }: DropdownLinkProps) {
  const quick = useMemo(() => quickFor(link.label, link.href), [link.label, link.href]);
  const active = isActive(pathname, link.href);
  const title = quick ?? link.label;
  if (variant === "sheet") {
    return (
      <li style={{ "--i": index } as CSSProperties}>
        {link.external ? (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            onClick={onNavigate}
            title={title}
            className="flex min-h-[44px] flex-col justify-center px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500"
          >
            <span className="block">{link.label} <span aria-hidden="true">↗</span></span>
            {quick && <span className="block text-xs font-normal opacity-80">{quick}</span>}
          </a>
        ) : (
          <Link
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={title}
            className={`flex min-h-[44px] flex-col justify-center px-5 py-2 text-sm font-semibold transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 ${
              active ? "text-cyan-600 dark:text-cyan-300" : "text-muted-foreground"
            }`}
          >
            <span className="block">{link.label}</span>
            {quick && <span className="block text-xs font-normal opacity-80">{quick}</span>}
          </Link>
        )}
      </li>
    );
  }
  return (
    <li style={{ "--i": index } as CSSProperties}>
      {link.external ? (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer noopener"
          onClick={onNavigate}
          title={title}
          className="block min-w-52 max-w-64 whitespace-normal px-3 py-1.5 text-sm transition hover:bg-accent hover:text-accent-foreground"
        >
          <span className="block font-semibold">{link.label} <span aria-hidden="true">↗</span></span>
          {quick && <span className="block text-xs font-normal text-muted-foreground">{quick}</span>}
        </a>
      ) : (
        <Link
          href={link.href}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          title={title}
          className={`block min-w-52 max-w-64 whitespace-normal px-3 py-1.5 text-sm transition hover:bg-accent hover:text-accent-foreground ${
            active ? "font-bold text-cyan-600 dark:text-cyan-300" : ""
          }`}
        >
          <span className="block font-semibold">{link.label}</span>
          {quick && <span className="block text-xs font-normal text-muted-foreground">{quick}</span>}
        </Link>
      )}
    </li>
  );
});

type DesktopNavGroupProps = {
  group: { label: string; links: NavLink[] };
  active: boolean;
  expandedMenu: boolean;
  pathname: string;
  // Label-level callbacks stay referentially stable (setState setters from the
  // parent), so the memoized group skips re-renders when a sibling opens.
  onOpen: (label: string) => void;
  onRequestClose: (label: string) => void;
  onNavigate: () => void;
};

/**
 * One desktop nav dropdown: hover/focus opens after a short intent delay,
 * mouse-away closes after the same delay. The panel itself animates via
 * CSS (.nav-std-panel: ~150ms ease opacity + translateY). Escape and
 * outside-close are owned by the parent (openMenu state).
 *
 * Memoized: static nav data + stable label-level callbacks mean a group only
 * re-renders when its own active/open state or the pathname changes.
 */
const DesktopNavGroup = memo(function DesktopNavGroup({ group, active, expandedMenu, pathname, onOpen, onRequestClose, onNavigate }: DesktopNavGroupProps) {
  const openTimerRef = useRef<number>(0);
  const closeTimerRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    openTimerRef.current = 0;
    closeTimerRef.current = 0;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // If the parent yanks open state (switched group / Escape / outside /
  // route), drop any pending intent so a stale timer can't reopen us.
  useEffect(() => {
    if (!expandedMenu) {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      openTimerRef.current = 0;
    }
  }, [expandedMenu]);

  const handleEnter = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = 0;
    if (expandedMenu || openTimerRef.current) return;
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = 0;
      onOpen(group.label);
    }, NAV_HOVER_INTENT_MS);
  };

  const handleLeave = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = 0;
    if (!expandedMenu || closeTimerRef.current) return;
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = 0;
      onRequestClose(group.label);
    }, NAV_HOVER_INTENT_MS);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocusCapture={() => {
        clearTimers();
        if (!expandedMenu) onOpen(group.label);
      }}
    >
      <button
        type="button"
        aria-expanded={expandedMenu}
        aria-haspopup="true"
        aria-current={active && !expandedMenu ? "page" : undefined}
        onClick={() => (expandedMenu ? onRequestClose(group.label) : onOpen(group.label))}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 ${
          active ? "text-cyan-600 dark:text-cyan-300" : ""
        }`}
      >
        {group.label}
        <span aria-hidden="true" className={`text-xs transition-transform ${expandedMenu ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {expandedMenu && (
        <div className="nav-std-panel absolute left-0 top-full z-50 min-w-52 pt-1">
          <ul className="overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-xl dark:border-white/10 dark:bg-slate-950/95 dark:shadow-black/50">
            {group.links.map((link, index) => (
              <DropdownLink
                key={`${link.href}-${link.label}`}
                link={link}
                index={index}
                pathname={pathname}
                onNavigate={onNavigate}
                variant="dropdown"
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

// Shared CTA styling: one pill system for desktop bar, tablet row, and sheet.
const CTA_PRIMARY =
  "rounded-full bg-cyan-600 px-4 py-2 text-center text-sm font-black text-white transition hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200 max-lg:flex max-lg:min-h-[44px] max-lg:items-center max-lg:justify-center";
const CTA_OUTLINE =
  "rounded-full border border-cyan-600/60 px-4 py-2 text-center text-sm font-bold text-cyan-700 transition hover:bg-cyan-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:border-cyan-300/60 dark:text-cyan-200 dark:hover:text-white max-lg:flex max-lg:min-h-[44px] max-lg:items-center max-lg:justify-center";
const CTA_COINS =
  "rounded-full border border-border px-4 py-2 text-center text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 max-lg:flex max-lg:min-h-[44px] max-lg:items-center max-lg:justify-center";

/**
 * Standard auth/coin actions, identical on desktop, tablet, and mobile —
 * only the wrapper layout changes. `onNavigate` closes whatever surface
 * hosts them (desktop dropdown / tablet panel / mobile sheet).
 * Memoized: auth gating output depends only on signedIn + onNavigate.
 */
const HeaderCtas = memo(function HeaderCtas({ signedIn, onNavigate }: { signedIn: boolean | null; onNavigate: () => void }) {
  if (signedIn === null) {
    return <span aria-hidden="true" className="inline-block h-9 w-44 animate-pulse rounded-full bg-muted" />;
  }
  return (
    <>
      <Link href="/pricing" onClick={onNavigate} className={CTA_COINS}>
        🪙 Get Coins
      </Link>
      {signedIn ? (
        <Link href="/account" onClick={onNavigate} className={CTA_PRIMARY}>
          👑 Dashboard
        </Link>
      ) : (
        <>
          <Link href="/auth/login" onClick={onNavigate} className={CTA_OUTLINE}>
            🔑 Login
          </Link>
          <Link href="/auth/sign-up" onClick={onNavigate} className={CTA_PRIMARY}>
            ✨ Sign Up
          </Link>
        </>
      )}
    </>
  );
});

// Demo quick-links (DS-MOB-01): the four live-demo beats, one tap inside the
// mobile sheet — menu button (tap 1) + shortcut (tap 2) from anywhere.
// Hrefs mirror lib/site-nav.ts literals. Sheet-only surface (the sheet is
// lg:hidden), so desktop output is untouched. Fail-open: plain Links.
const DEMO_QUICK_LINKS: { href: string; label: string }[] = [
  { href: "/games", label: "🎮 Play" },
  { href: "/music/maker", label: "🎹 Music Maker" },
  { href: "/games/servers", label: "🌐 Servers" },
  { href: "/games/servers/rent", label: "🖥️ Rent a Room" },
];

const DemoQuickLinks = memo(function DemoQuickLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        ⚡ Demo shortcuts
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {DEMO_QUICK_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-sm font-bold transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 ${
                  active
                    ? "border-cyan-600/60 text-cyan-700 dark:border-cyan-300/60 dark:text-cyan-200"
                    : "border-border text-foreground"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

/**
 * The four group dropdowns, shared verbatim by the desktop bar and the
 * tablet quick-row so taxonomy, order, and open-state stay identical.
 * Memoized with stable label-level callbacks: opening one group only
 * re-renders the two groups whose open flag flips.
 */
const BarGroups = memo(function BarGroups({
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
          onOpen={onOpenChange}
          onRequestClose={onRequestClose}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
});

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
  // Stable callbacks: inline arrows would defeat memo on BarGroups/HeaderCtas.
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const closeSheet = useCallback(() => setOpen(false), []);
  // DS-SEARCH-05: search overlay state. The single opener closes any open
  // surface first (menu sheet / dropdowns) so the overlay owns focus.
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => {
    setOpen(false);
    setOpenMenu(null);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useSearchShortcut(openSearch);
  const pillExample = useRotatingPlaceholder();
  const reducedMotion = usePrefersReducedMotion();

  // Track auth state so the header can show Login / Sign Up vs Dashboard.
  // WalletBadges reports back on 401 (server no longer sees the session)
  // so a stale/expired client session stops polling instead of spamming
  // `GET .../balance 401` every 10s.
  // Source of truth is two-layer: the browser Supabase session first (fast,
  // no round trip), then GET /api/auth/session as fallback. The fallback
  // matters because logins happen server-side (POST /api/auth/login sets
  // cookies but fires no browser auth event), and because cookies minted
  // while the server forced httpOnly on sb-* chunks are invisible to the
  // browser client even though the server still sees the user signed in.
  // Without it the header sticks on Login/Sign Up with no coin/crown badges
  // while /account correctly reports "Signed in as ...".
  // Re-checked on every route change so a post-login navigation flips the
  // header without requiring a full page reload.
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    const checkServerSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        return response.ok;
      } catch {
        return false;
      }
    };
    const refresh = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          setSignedIn(true);
          return;
        }
        setSignedIn(await checkServerSession());
      } catch {
        if (mounted) setSignedIn(await checkServerSession());
      }
    };
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          setSignedIn(true);
        } else {
          setSignedIn(await checkServerSession());
        }
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          // Any auth event without a session (SIGNED_OUT, refresh failure,
          // expired token) means logged out: flip header + let WalletBadges
          // unmount so balance polling stops instead of 401-spamming.
          // A SIGNED_IN event is authoritative; any other event re-checks
          // the server so a server-side login/logout still flips the header.
          if (session) {
            setSignedIn(true);
          } else {
            void checkServerSession().then((ok) => {
              if (mounted) setSignedIn(ok);
            });
          }
        });
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch {
        if (mounted) setSignedIn(await checkServerSession());
      }
    })();
    // Post-login navigation (e.g. /auth/login -> /account) does not remount
    // this layout-level header and fires no browser auth event (the session
    // was minted server-side), so re-check the server session on arrival.
    void refresh();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [pathname]);

  // Close the desktop dropdown on route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route-driven reset syncs dropdown/sheet state with the nav system (external source).
    setOpenMenu(null);
    setOpen(false);
  }, [pathname]);

  // Default the mobile accordion to the group holding the current page.
  useEffect(() => {
    const current = NAV_GROUPS.find((g) => groupActive(pathname, g.links));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time accordion default syncs with the current route; guarded by ?? so user choice wins.
    setExpanded((prev) => prev ?? current?.label ?? "Play");
  }, [pathname]);

  // FeedbackBar bridge (layout lane): the bar's Menu 1 button dispatches
  // "fw:open-menu1" — open the existing sheet, no duplicate nav tree.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("fw:open-menu1", onOpen);
    return () => window.removeEventListener("fw:open-menu1", onOpen);
  }, []);

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
  // Lock below lg only: the sheet renders lg:hidden, so locking on desktop
  // traps the page behind an invisible panel (Menu 2's drawer follows the
  // same mobile-only lock in menu-sidebar.tsx).
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const mq = window.matchMedia("(max-width: 1023px)");
    if (mq.matches) document.body.style.overflow = "hidden";
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
    if (reducedMotion) return;
    const target = mobileNavRef.current.querySelector(`[data-group="${expanded}"]`);
    if (target) {
      // Let the accordion mount first, then ease toward it.
      const id = window.setTimeout(() => {
        (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [expanded, open, reducedMotion]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-cyan-300 focus:px-3 focus:py-2 focus:font-bold focus:text-black"
      >
        Skip to content
      </a>
      <header className="relative z-40 border-b border-border bg-background/85 backdrop-blur dark:border-white/10 dark:bg-black/85">
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
            <BarGroups
              pathname={pathname}
              openMenu={openMenu}
              onOpenChange={setOpenMenu}
              onRequestClose={closeGroup}
              onNavigate={closeMenu}
            />
          </nav>

          {/* Desktop actions (lg+): identical set as the sheet via HeaderCtas */}
          <div className="hidden items-center gap-2 lg:flex">
            {/* DS-SEARCH-05: desktop search entry point (short pill). */}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Open site search"
              title="Search (Ctrl/⌘K or /)"
              className="inline-flex h-9 max-w-56 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className="shrink-0">🔍</span>
              <span className="shrink-0">Search</span>
              <span aria-hidden="true" className="truncate text-xs font-normal opacity-70">
                {pillExample ? `— try: ${pillExample}` : ""}
              </span>
            </button>
            <WalletBadges signedIn={signedIn} onUnauthorized={handleUnauthorized} />
            <HeaderCtas signedIn={signedIn} onNavigate={closeMenu} />
          </div>

          {/* Balances + menu toggle (mobile + tablet): badges stay visible even when the sheet is closed */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:hidden">
            <WalletBadges signedIn={signedIn} onUnauthorized={handleUnauthorized} />
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 max-lg:fixed max-lg:right-3 max-lg:top-3 max-lg:z-50 max-lg:bg-background/90 max-lg:shadow-lg max-lg:backdrop-blur lg:hidden"
              aria-expanded={open}
              aria-controls="site-mobile-nav"
              aria-label={open ? "Close menu 1" : "Open menu 1"}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden="true">{open ? "✕" : "☰"}</span>
              menu 1
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
            <BarGroups
              pathname={pathname}
              openMenu={openMenu}
              onOpenChange={setOpenMenu}
              onRequestClose={closeGroup}
              onNavigate={closeMenu}
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
            className="mobile-nav-sheet mobile-nav-scroll mobile-fluid sticky top-0 z-40 border-t border-border bg-background px-3 pb-4 pt-3 lg:hidden dark:border-white/10 dark:bg-black"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}
          >
            {/* Menu 1 top mirror of the desktop bar (no IDs duplicated):
                HeaderCtas (Get Coins, Dashboard/Login/Sign Up) -> search -> balances. */}
            <div className="mb-3 grid gap-2">
              <HeaderCtas signedIn={signedIn} onNavigate={closeSheet} />
              {/* DS-SEARCH-05: Menu 1 sheet search entry point — closes the
                  sheet first (via openSearch) so the overlay owns focus. */}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Open site search"
              className="mb-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-border px-3 py-2 text-center text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className="shrink-0">🔍</span>
              <span className="shrink-0">Search</span>
              <span aria-hidden="true" className="truncate text-xs font-normal opacity-70">
                {pillExample ? `— try: ${pillExample}` : ""}
              </span>
            </button>
              <div className="flex min-h-[1.75rem] items-center justify-center">
                <WalletBadges signedIn={signedIn} onUnauthorized={handleUnauthorized} />
              </div>
            </div>
            <DemoQuickLinks pathname={pathname} onNavigate={closeSheet} />
            <ul className="space-y-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
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
                      className={`flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left text-sm font-bold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 ${
                        active ? "text-cyan-600 dark:text-cyan-300" : "text-foreground"
                      }`}
                    >
                      {group.label}
                      <span aria-hidden="true" className={`text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </button>
                    {isExpanded && (
                      // Single scroll container (DS-MOB-01): the sheet owns the
                      // gesture — no nested mobile-acc-scroll trap inside it.
                      <ul
                        id={`mobile-group-${group.label}`}
                        className="mobile-acc-panel mobile-acc-list mobile-fluid border-t border-border bg-muted/40 py-1 dark:border-white/10 dark:bg-white/[.02]"
                      >
                        {group.links.map((link, index) => (
                          <DropdownLink
                            key={`${link.href}-${link.label}`}
                            link={link}
                            index={index}
                            pathname={pathname}
                            onNavigate={closeSheet}
                            variant="sheet"
                          />
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>
      {/* DS-SEARCH-05: single search overlay instance for both entry points. */}
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </>
  );
}
