"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { SITE_NAV_GROUPS } from "@/lib/site-nav";
import { favMetaFor, useFavorites } from "@/lib/favorites";
import { FavoriteToggle } from "@/components/site/favorite-toggle";
import { cn } from "@/lib/utils";

const OPEN_KEY = "fw-sidebar-open";
const QUICK_KEY = "fw-sidebar-quickinfo";

// Demo quick-links (DS-MOB-01): same four beats as the header sheet so a
// phone demo reaches Play / Music / Servers / Rent in two taps (pill +
// shortcut). Hrefs mirror lib/site-nav.ts literals. Fail-open: plain Links.
const DEMO_SIDEBAR_LINKS = [
  { href: "/games", label: "🎮 Play" },
  { href: "/music/maker", label: "🎹 Music Maker" },
  { href: "/games/servers", label: "🌐 Servers" },
  { href: "/games/servers/rent", label: "🖥️ Rent a Room" },
];

// (?) detail popovers (portal + viewport-clamping measure math) stay off the
// first-paint bundle; a same-size placeholder holds layout until they hydrate.
function InfoTipSkeleton() {
  return (
    <span
      aria-hidden="true"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-base leading-none text-muted-foreground"
    >
      ?
    </span>
  );
}
const InfoTip = dynamic(() => import("@/components/ui/info-tip").then((m) => m.InfoTip), {
  ssr: false,
  loading: InfoTipSkeleton,
});

function isActive(pathname: string, href: string) {
  if (/^https?:\/\//.test(href)) return false;
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
  const path = norm(pathname);
  const target = norm(href);
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}

type SidebarNavLink = (typeof SITE_NAV_GROUPS)[number]["links"][number];
type SidebarNavGroup = (typeof SITE_NAV_GROUPS)[number];

/**
 * One favorites row: star link + remove toggle. Memoized so toggling one
 * star or typing in the filter only re-renders rows whose output changes.
 */
const FavoriteRow = memo(function FavoriteRow({
  link,
  active,
  favorited,
  onToggle,
}: {
  link: SidebarNavLink;
  active: boolean;
  favorited: boolean;
  onToggle: (href: string) => void;
}) {
  return (
    <li
      className={cn("flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-accent", active && "bg-amber-500/10")}
    >
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        title={`${link.label} - ${link.quick}`}
        className="min-w-0 flex-1 truncate text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-lg:flex max-lg:min-h-[44px] max-lg:items-center"
      >
        <span aria-hidden="true" className="mr-1 text-amber-500">★</span>
        {link.label}
        {active && <span aria-hidden="true"> ●</span>}
      </Link>
      <FavoriteToggle href={link.href} label={link.label} favorited={favorited} onToggle={onToggle} />
    </li>
  );
});

/**
 * One directory link row: label + optional quick line + (?) detail popover +
 * star toggle. Memoized on link identity + active/visible flags.
 */
const SidebarLinkRow = memo(function SidebarLinkRow({
  link,
  pathname,
  showQuick,
  favorited,
  onToggleFavorite,
}: {
  link: SidebarNavLink;
  pathname: string;
  showQuick: boolean;
  favorited: boolean;
  onToggleFavorite: (href: string) => void;
}) {
  const active = isActive(pathname, link.href);
  return (
    <li className={cn("rounded-lg px-2 py-1.5 transition hover:bg-accent", active && "bg-cyan-600/10")}>
      <span className="flex items-start justify-between gap-1.5">
        <span className="min-w-0 flex-1">
          {link.external ? (
            <a href={link.href} target="_blank" rel="noreferrer noopener" title={`${link.label} - ${link.quick}`} className="flex flex-col justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-lg:min-h-[44px] max-lg:py-2">
              <span className={cn("font-semibold", active && "text-cyan-700 dark:text-cyan-300")}>
                {link.label}
                <span aria-hidden="true"> ↗</span>
                {active && <span aria-hidden="true"> ●</span>}
              </span>
              {showQuick && (
                <span className="block text-xs font-normal leading-snug text-muted-foreground">{link.quick}</span>
              )}
            </a>
          ) : (
            <Link href={link.href} aria-current={active ? "page" : undefined} title={`${link.label} - ${link.quick}`} className="flex flex-col justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-lg:min-h-[44px] max-lg:py-2">
              <span className={cn("font-semibold", active && "text-cyan-700 dark:text-cyan-300")}>
                {link.label}
                {active && <span aria-hidden="true"> ●</span>}
              </span>
              {showQuick && (
                <span className="block text-xs font-normal leading-snug text-muted-foreground">{link.quick}</span>
              )}
            </Link>
          )}
        </span>
        <InfoTip text={link.detail} label={`About ${link.label}`} />
        {!link.external && (
          <FavoriteToggle
            href={link.href}
            label={link.label}
            favorited={favorited}
            onToggle={onToggleFavorite}
          />
        )}
      </span>
    </li>
  );
});

/**
 * One collapsible nav group. Memoized: `filtered` is memoized upstream, so a
 * group only re-renders when its own links, the pathname, or the quick flag
 * changes — not when a sibling group or the favorites section updates.
 */
const SidebarGroup = memo(function SidebarGroup({
  group,
  defaultOpen,
  pathname,
  showQuick,
  isFav,
  onToggleFavorite,
}: {
  group: SidebarNavGroup;
  defaultOpen: boolean;
  pathname: string;
  showQuick: boolean;
  isFav: (href: string) => boolean;
  onToggleFavorite: (href: string) => void;
}) {
  return (
    <details open={defaultOpen} className="ui-details mb-2">
      <summary className="ui-details-summary max-lg:min-h-[44px]">
        <span aria-hidden="true" className="ui-details-caret">▾</span>
        <span className="ui-details-label">{group.label} · {group.links.length}</span>
        {showQuick && <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:block">{group.tagline}</span>}
      </summary>
      <ul className="ui-details-body space-y-0.5">
        {group.links.map((link) => (
          <SidebarLinkRow
            key={`${group.label}-${link.href}-${link.label}`}
            link={link}
            pathname={pathname}
            showQuick={showQuick}
            favorited={isFav(link.href)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </ul>
    </details>
  );
});

/**
 * Global Menu 2 Sidebar: desktop-left drawer + mobile drawer (separate from
 * the header's mobile Menu 1 sheet).
 * - Hidden by default; a pill re-opens it (top-left on desktop,
 *   thumb-reachable bottom-left floating button on mobile).
 * - Every link carries a 1-line "quick info" + (?) detail popover.
 * - "Quick info" toggle at the bottom hides/shows all extra text.
 * - Search filters links live; Escape closes; backdrop closes on mobile.
 */
export function MenuSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(true);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // True when the drawer was opened via keyboard (click event.detail === 0),
  // so focus is only stolen for keyboard users, never mouse users.
  const keyboardOpenRef = useRef(false);
  const prevOpenRef = useRef(false);
  const panelId = useId();
  const { favorites, hydrated: favsHydrated, toggle, isFav, notice } = useFavorites();
  const favsHeadingRef = useRef<HTMLParagraphElement>(null);
  const favListRef = useRef<HTMLUListElement>(null);

  // Stable callbacks: inline arrows would defeat memo on the rows above.
  // Removing the last visible favorite moves focus to the section heading
  // instead of dropping keyboard/screen-reader users into the void.
  const handleFavRemove = useCallback(
    (href: string) => {
      toggle(href);
      window.setTimeout(() => {
        if (favListRef.current && favListRef.current.childElementCount === 0) {
          favsHeadingRef.current?.focus({ preventScroll: true });
        }
      }, 0);
    },
    [toggle],
  );
  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);
  const clearQuery = useCallback(() => setQuery(""), []);
  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  const hideSidebar = useCallback(() => setOpen(false), []);
  const toggleQuick = useCallback(() => setQuick((v) => !v), []);
  const openSidebar = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    // event.detail === 0 means keyboard-activated: only then steal focus on open.
    keyboardOpenRef.current = event.detail === 0;
    setOpen(true);
  }, []);

  // Restore prefs (closed by default = cleaner interface).
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage restore must run post-hydration to avoid an SSR mismatch; single mount sync is intentional.
      if (localStorage.getItem(OPEN_KEY) === "1") setOpen(true);
      if (localStorage.getItem(QUICK_KEY) === "0") setQuick(false);
    } catch {
      /* private mode - defaults stand */
    }
    setHydrated(true);
    // Mirror site-header's matchMedia pattern: track reduced-motion live.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(QUICK_KEY, quick ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [quick, hydrated]);

  // FeedbackBar bridge (layout lane): the bar's Menu 2 button dispatches
  // "fw:open-menu2" — open the existing drawer, no duplicate nav tree.
  // Mouse users keep pointer context (no focus steal); keyboard users land
  // on the drawer via the existing Escape/backdrop + pill focus paths.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("fw:open-menu2", onOpen);
    return () => window.removeEventListener("fw:open-menu2", onOpen);
  }, []);

  // Shift desktop content + footer so the drawer docks instead of covering.
  useEffect(() => {
    const main = document.getElementById("main-content");
    const footer = document.getElementById("site-footer");
    const apply = () => {
      if (!main && !footer) return;
      const desktop = window.innerWidth >= 1024;
      const margin = open && desktop ? "21rem" : "";
      const transition = reducedMotion ? "none" : "margin-left 0.22s ease";
      for (const el of [main, footer]) {
        if (!el) continue;
        el.style.transition = transition;
        el.style.marginLeft = margin;
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [open, reducedMotion]);

  // Escape closes; lock body scroll on mobile while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    const mq = window.matchMedia("(max-width: 1023px)");
    if (mq.matches) document.body.style.overflow = "hidden";
    // Focus the panel, but only when a keyboard user opened it - mouse
    // users keep their pointer context (event.detail === 0 means keyboard).
    if (keyboardOpenRef.current) {
      closeRef.current?.focus({ preventScroll: true });
    }
    keyboardOpenRef.current = false;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open ]);

  // Return focus to the ☰ menu 2 reveal pill whenever the drawer closes,
  // so keyboard users don't lose their place when the panel unmounts.
  useEffect(() => {
    if (prevOpenRef.current && !open && hydrated) {
      pillRef.current?.focus({ preventScroll: true });
    }
    prevOpenRef.current = open;
  }, [open, hydrated]);

  // Close drawer on navigation (mobile only; desktop stays docked).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- route-driven close syncs the drawer with the nav system (external source); no render-phase alternative.
    if (typeof window !== "undefined" && window.innerWidth < 1024) setOpen(false);
  }, [pathname]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SITE_NAV_GROUPS;
    return SITE_NAV_GROUPS.map((g) => ({
      ...g,
      links: g.links.filter(
        (l) =>
          l.label.toLowerCase().includes(q) ||
          l.quick.toLowerCase().includes(q) ||
          l.href.toLowerCase().includes(q),
      ),
    })).filter((g) => g.links.length > 0);
  }, [query]);

  const totalLinks = useMemo(
    () => SITE_NAV_GROUPS.reduce((n, g) => n + g.links.length, 0),
    [],
  );

  const favoriteLinks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const metas = favorites.map(favMetaFor);
    if (!q) return metas;
    return metas.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.quick.toLowerCase().includes(q) ||
        l.href.toLowerCase().includes(q),
    );
  }, [favorites, query]);

  return (
    <>
      {/* Reveal pill when hidden: stick-to-screen pill pinned to the top of
          the left side, just below the header (header is min-h-14, so top-16
          clears it on every breakpoint). */}
      {!open && (
        <button
          ref={pillRef}
          type="button"
          onClick={openSidebar}
          aria-label="Open menu 2 sidebar"
          aria-expanded={false}
          aria-controls={panelId}
          title="Open menu 2 - every link explained"
          className="fixed left-3 top-16 z-40 inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-2 truncate rounded-full border border-border bg-background/90 py-2 pl-3 pr-4 text-sm font-black shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 max-lg:min-h-[44px]"
        >
          <span aria-hidden="true" className="shrink-0 text-base leading-none">☰</span>
          <span className="truncate">menu 2</span>
          <span aria-hidden="true" className="shrink-0 rounded-full bg-cyan-600/15 px-1.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
            {totalLinks}
          </span>
        </button>
      )}

      {/* Mobile backdrop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={hideSidebar}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Drawer */}
      <aside
        id={panelId}
        aria-label="Site menu 2 with link explanations"
        aria-hidden={!open}
        className={cn(
          "fixed bottom-0 left-0 top-14 z-50 flex w-[21rem] max-w-[86vw] flex-col border-r border-border bg-background/95 shadow-2xl backdrop-blur motion-reduce:transition-none",
          reducedMotion ? "transition-none" : "transition-transform duration-200",
          "dark:border-white/10 dark:bg-slate-950/95",
          // invisible (visibility:hidden) drops the closed drawer from the tab
          // order; visibility flips instantly so the slide-in still animates.
          open ? "translate-x-0" : "invisible pointer-events-none -translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 dark:border-white/10">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-base text-white">🎮</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">menu 2</p>
            <p className="truncate text-xs text-muted-foreground">Every link, explained.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={hideSidebar}
            aria-label="Hide menu sidebar"
            title="Hide sidebar (it stays one click away, top-left)"
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm font-bold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-lg:min-h-[44px] max-lg:px-3"
          >
            <span aria-hidden="true">⟨⟩</span> Hide
          </button>
        </div>

        {/* Demo shortcuts (DS-MOB-01): four demo beats, two taps from anywhere
            (pill + shortcut). Mobile-only (lg:hidden) — desktop dock untouched.
            Auto-closes on navigation via the existing mobile pathname effect. */}
        <nav aria-label="Demo quick links" className="border-b border-border px-3 py-2 lg:hidden dark:border-white/10">
          <p className="mb-1.5 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            ⚡ Demo shortcuts
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {DEMO_SIDEBAR_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-[13px] font-bold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                      active && "border-cyan-600/60 text-cyan-700 dark:border-cyan-300/60 dark:text-cyan-200",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Search - UX trick: filter 30+ links live */}
        <div className="border-b border-border px-3 py-2 dark:border-white/10">
          <label htmlFor={`${panelId}-search`} className="sr-only">Filter menu links</label>
          <input
            ref={searchRef}
            id={`${panelId}-search`}
            value={query}
            onChange={handleQueryChange}
            placeholder="Filter… try “gpu”, “coins”, “bot”"
            className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-cyan-500 focus:bg-background focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 max-lg:min-h-[44px]"
          />
        </div>

        {/* Favorites - your starred pages, always one click away */}
        <div className="border-b border-border px-3 py-2 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <p ref={favsHeadingRef} tabIndex={-1} className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 outline-none dark:text-amber-300">
              <span aria-hidden="true">★</span> Favorites · {favsHydrated ? favorites.length : "…"}
            </p>
            <Link
              href="/favorites"
              title="Open your favorites page"
              className="inline-flex items-center rounded-lg text-xs font-bold text-cyan-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300 max-lg:min-h-[44px] max-lg:px-2"
            >
              Open page →
            </Link>
          </div>
          {favoriteLinks.length === 0 ? (
            <p className="mt-1.5 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-snug text-muted-foreground">
              {!favsHydrated
                ? "Loading your favorites…"
                : favorites.length === 0
                  ? <>No favorites yet — select the <span aria-hidden="true">☆</span> star on any link to pin it here.</>
                  : `No favorites match “${query}”.`}
            </p>
          ) : (
            <ul ref={favListRef} className="mt-1.5 space-y-0.5">
              {favoriteLinks.map((link) => (
                <FavoriteRow
                  key={`fav-${link.href}-${link.label}`}
                  link={link}
                  active={isActive(pathname, link.href)}
                  favorited={isFav(link.href)}
                  onToggle={handleFavRemove}
                />
              ))}
            </ul>
          )}
          {/* Polite announcement for screen readers on star/unstar. */}
          {notice && (
            <span key={notice.seq} role="status" className="sr-only">
              {notice.href === ""
                ? "Favorites cleared."
                : notice.added
                  ? `Added ${notice.label} to favorites. ${notice.count} favorite${notice.count === 1 ? "" : "s"}.`
                  : `Removed ${notice.label} from favorites. ${notice.count} favorite${notice.count === 1 ? "" : "s"}.`}
            </span>
          )}
        </div>

        {/* Links */}
        <nav aria-label="All site links" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 [-webkit-overflow-scrolling:touch]">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No links match “{query}”. <button type="button" className="rounded-lg font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-lg:inline-block max-lg:min-h-[44px] max-lg:px-3" onClick={clearQuery}>Clear</button>
            </p>
          )}
          {filtered.map((group, gi) => (
            <SidebarGroup
              key={group.label}
              group={group}
              defaultOpen={gi === 0 || query.trim().length > 0}
              pathname={pathname}
              showQuick={quick}
              isFav={isFav}
              onToggleFavorite={toggle}
            />
          ))}
          <p className="px-2 pb-1 pt-2 text-[11px] leading-snug text-muted-foreground">
            Tip: <kbd className="rounded border border-border px-1">Esc</kbd> hides this panel. Your choice is remembered on this device.
          </p>
        </nav>

        {/* Footer: Toggle Quick Info + hide (safe-area pad for home-bar phones;
            inline style with env() fallback: unsupported browsers drop the
            declaration and keep the py-2.5 class = fail-open). */}
        <div
          className="border-t border-border px-3 py-2.5 dark:border-white/10"
          style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0.625rem))" }}
        >
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <span className="text-xs font-bold">Quick info <span className="font-normal text-muted-foreground">{quick ? "on" : "off"}</span></span>
            <button
              type="button"
              role="switch"
              aria-checked={quick}
              aria-label="Toggle quick info descriptions"
              onClick={toggleQuick}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 max-lg:h-8 max-lg:w-[3.75rem]",
                quick ? "bg-cyan-600 dark:bg-cyan-300" : "bg-muted-foreground/30",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all max-lg:top-1 max-lg:h-6 max-lg:w-6",
                  quick ? "left-[1.375rem] max-lg:left-[2.125rem]" : "left-0.5 max-lg:left-1",
                )}
              />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={focusSearch}
              className="flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-lg:min-h-[44px] max-lg:py-2"
            >
              Find a link
            </button>
            <button
              type="button"
              onClick={hideSidebar}
              className="flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 max-lg:min-h-[44px] max-lg:py-2"
            >
              Hide sidebar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
