"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SITE_NAV_GROUPS } from "@/lib/site-nav";
import { favMetaFor, normalizeFavHref, useFavorites } from "@/lib/favorites";
import { FavoriteToggle } from "@/components/site/favorite-toggle";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

const OPEN_KEY = "fw-sidebar-open";
const QUICK_KEY = "fw-sidebar-quickinfo";

function isActive(pathname: string, href: string) {
  if (/^https?:\/\//.test(href)) return false;
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
  const path = norm(pathname);
  const target = norm(href);
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}

/**
 * Global Menu Sidebar: desktop-left drawer + mobile drawer.
 * - Hidden by default; a pill re-opens it (top-left on desktop,
 *   thumb-reachable bottom-left floating button on mobile so the sticky
 *   header can never cover it).
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

  /**
   * Un-star from the pinned list, then keep keyboard focus inside the
   * panel: next/previous remaining star, else the Favorites heading.
   * (Removing unmounts the focused button, which would drop focus to body.)
   */
  const handleFavRemove = (href: string) => {
    const key = normalizeFavHref(href);
    const idx = favoriteLinks.findIndex((l) => normalizeFavHref(l.href) === key);
    toggle(key);
    requestAnimationFrame(() => {
      const buttons = favListRef.current?.querySelectorAll<HTMLButtonElement>("button[aria-pressed]");
      const next = buttons?.[Math.min(Math.max(idx, 0), (buttons?.length ?? 1) - 1)];
      if (next) next.focus();
      else favsHeadingRef.current?.focus();
    });
  };

  // Restore prefs (closed by default = cleaner interface).
  useEffect(() => {
    try {
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

  // Return focus to the ☰ Menu reveal pill whenever the drawer closes,
  // so keyboard users don't lose their place when the panel unmounts.
  useEffect(() => {
    if (prevOpenRef.current && !open && hydrated) {
      pillRef.current?.focus({ preventScroll: true });
    }
    prevOpenRef.current = open;
  }, [open, hydrated]);

  // Close drawer on navigation (mobile only; desktop stays docked).
  useEffect(() => {
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
      {/* Reveal pill when hidden: top-left on desktop, floating bottom-left
          thumb button on mobile (top-anchored pills can hide under the taller
          sticky mobile header, so mobile gets a bottom FAB instead). */}
      {!open && (
        <button
          ref={pillRef}
          type="button"
          onClick={(event) => {
            // event.detail === 0 means keyboard-activated: only then steal focus on open.
            keyboardOpenRef.current = event.detail === 0;
            setOpen(true);
          }}
          aria-label="Open menu sidebar"
          aria-expanded={false}
          aria-controls={panelId}
          title="Open menu - every link explained"
          className="fixed bottom-4 left-4 top-auto z-40 inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-2 truncate rounded-full border border-border bg-background/90 py-2 pl-3 pr-4 text-sm font-black shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:bg-accent lg:bottom-auto lg:left-3 lg:top-[4.25rem]"
        >
          <span aria-hidden="true" className="shrink-0 text-base leading-none">☰</span>
          <span className="truncate">Menu</span>
          <span aria-hidden="true" className="shrink-0 rounded-full bg-cyan-600/15 px-1.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
            {totalLinks}
          </span>
        </button>
      )}

      {/* Mobile backdrop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Drawer */}
      <aside
        id={panelId}
        aria-label="Site menu with link explanations"
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
            <p className="truncate text-sm font-black">Menu</p>
            <p className="truncate text-xs text-muted-foreground">Every link, explained.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Hide menu sidebar"
            title="Hide sidebar (it stays one click away, top-left)"
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm font-bold transition hover:bg-accent"
          >
            <span aria-hidden="true">⟨⟩</span> Hide
          </button>
        </div>

        {/* Search - UX trick: filter 30+ links live */}
        <div className="border-b border-border px-3 py-2 dark:border-white/10">
          <label htmlFor={`${panelId}-search`} className="sr-only">Filter menu links</label>
          <input
            ref={searchRef}
            id={`${panelId}-search`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter… try “gpu”, “coins”, “bot”"
            className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-cyan-500 focus:bg-background focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1"
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
              className="text-xs font-bold text-cyan-600 hover:underline dark:text-cyan-300"
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
              {favoriteLinks.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li
                    key={`fav-${link.href}-${link.label}`}
                    className={cn("flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-accent", active && "bg-amber-500/10")}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      title={`${link.label} - ${link.quick}`}
                      className="min-w-0 flex-1 truncate text-sm font-semibold"
                    >
                      <span aria-hidden="true" className="mr-1 text-amber-500">★</span>
                      {link.label}
                      {active && <span aria-hidden="true"> ●</span>}
                    </Link>
                    <FavoriteToggle href={link.href} label={link.label} favorited={isFav(link.href)} onToggle={handleFavRemove} />
                  </li>
                );
              })}
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
              No links match “{query}”. <button type="button" className="font-bold underline underline-offset-4" onClick={() => setQuery("")}>Clear</button>
            </p>
          )}
          {filtered.map((group, gi) => (
            <details key={group.label} open={gi === 0 || query.trim().length > 0} className="ui-details mb-2">
              <summary className="ui-details-summary">
                <span aria-hidden="true" className="ui-details-caret">▾</span>
                <span className="ui-details-label">{group.label} · {group.links.length}</span>
                {quick && <span className="hidden truncate text-[11px] font-normal text-muted-foreground sm:block">{group.tagline}</span>}
              </summary>
              <ul className="ui-details-body space-y-0.5">
                {group.links.map((link) => {
                  const active = isActive(pathname, link.href);
                  const body = (
                    <>
                      <span className={cn("font-semibold", active && "text-cyan-700 dark:text-cyan-300")}>
                        {link.label}
                        {link.external && <span aria-hidden="true"> ↗</span>}
                        {active && <span aria-hidden="true"> ●</span>}
                      </span>
                      {quick && (
                        <span className="block text-xs font-normal leading-snug text-muted-foreground">{link.quick}</span>
                      )}
                    </>
                  );
                  return (
                    <li key={`${group.label}-${link.href}-${link.label}`} className={cn("rounded-lg px-2 py-1.5 transition hover:bg-accent", active && "bg-cyan-600/10")}>
                      <span className="flex items-start justify-between gap-1.5">
                        <span className="min-w-0 flex-1">
                          {link.external ? (
                            <a href={link.href} target="_blank" rel="noreferrer noopener" title={`${link.label} - ${link.quick}`} className="block">
                              {body}
                            </a>
                          ) : (
                            <Link href={link.href} aria-current={active ? "page" : undefined} title={`${link.label} - ${link.quick}`} className="block">
                              {body}
                            </Link>
                          )}
                        </span>
                        <InfoTip text={link.detail} label={`About ${link.label}`} />
                        {!link.external && (
                          <FavoriteToggle
                            href={link.href}
                            label={link.label}
                            favorited={isFav(link.href)}
                            onToggle={toggle}
                          />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
          <p className="px-2 pb-1 pt-2 text-[11px] leading-snug text-muted-foreground">
            Tip: <kbd className="rounded border border-border px-1">Esc</kbd> hides this panel. Your choice is remembered on this device.
          </p>
        </nav>

        {/* Footer: Toggle Quick Info + hide */}
        <div className="border-t border-border px-3 py-2.5 dark:border-white/10">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <span className="text-xs font-bold">Quick info <span className="font-normal text-muted-foreground">{quick ? "on" : "off"}</span></span>
            <button
              type="button"
              role="switch"
              aria-checked={quick}
              aria-label="Toggle quick info descriptions"
              onClick={() => setQuick((v) => !v)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition",
                quick ? "bg-cyan-600 dark:bg-cyan-300" : "bg-muted-foreground/30",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  quick ? "left-[1.375rem]" : "left-0.5",
                )}
              />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => searchRef.current?.focus()}
              className="flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-accent"
            >
              Find a link
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold transition hover:bg-accent"
            >
              Hide sidebar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
