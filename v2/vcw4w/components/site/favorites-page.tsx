"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { FAVORABLE_LINKS, favMetaFor, normalizeFavHref, useFavorites } from "@/lib/favorites";
import { FavoriteToggle } from "@/components/site/favorite-toggle";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

/**
 * /favorites page body: your starred pages + the full directory to star from.
 * Favorites live in localStorage on this device (no account needed).
 */
export function FavoritesPage() {
  const { favorites, hydrated, toggle, clear, isFav, notice } = useFavorites();
  const [query, setQuery] = useState("");
  const starredHeadingRef = useRef<HTMLHeadingElement>(null);
  const starredListRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  const starred = useMemo(() => favorites.map(favMetaFor), [favorites]);

  const directory = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAVORABLE_LINKS;
    return FAVORABLE_LINKS.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.quick.toLowerCase().includes(q) ||
        l.href.toLowerCase().includes(q),
    );
  }, [query]);

  /** Un-star from the starred list, keeping keyboard focus in the list. */
  const handleStarredRemove = (href: string) => {
    const key = normalizeFavHref(href);
    const idx = starred.findIndex((l) => normalizeFavHref(l.href) === key);
    toggle(key);
    requestAnimationFrame(() => {
      const buttons = starredListRef.current?.querySelectorAll<HTMLButtonElement>("button[aria-pressed]");
      const next = buttons?.[Math.min(Math.max(idx, 0), (buttons?.length ?? 1) - 1)];
      if (next) next.focus();
      else starredHeadingRef.current?.focus();
    });
  };

  /** Clear-all unmounts its own button: move focus to the filter input. */
  const handleClear = () => {
    clear();
    requestAnimationFrame(() => filterRef.current?.focus());
  };

  return (
    <div className="space-y-8">
      {/* Starred list */}
      <section aria-label="Your favorite pages">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 ref={starredHeadingRef} tabIndex={-1} className="flex items-center gap-1.5 text-lg font-black outline-none">
            <span aria-hidden="true">★</span> Your favorites · {hydrated ? favorites.length : "…"}
            <InfoTip
              text="Starred pages live only in this browser (localStorage), so they work signed-out too. Clearing site data removes them. Stars also pin to the top of the Menu sidebar."
              label="About your favorites"
            />
          </h2>
          {favorites.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full border border-border px-4 py-1.5 text-xs font-bold transition hover:bg-accent"
            >
              Clear all
            </button>
          )}
        </div>
        {!hydrated ? (
          <p role="status" className="mt-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading your favorites…
          </p>
        ) : starred.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            No favorites yet. Press the <span aria-hidden="true">☆</span> star in the Menu sidebar (left) or in
            the directory below — starred pages show up here and stay pinned in the
            sidebar. Saved on this device, no account needed.
          </p>
        ) : (
          <ul ref={starredListRef} className="mt-3 grid gap-3 sm:grid-cols-2">
            {starred.map((link) => (
              <li
                key={`starred-${link.href}-${link.label}`}
                className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <Link href={link.href} className="font-bold hover:underline">
                    <span aria-hidden="true" className="mr-1 text-amber-500">★</span>
                    {link.label}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{link.quick}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground/70">{link.href}</p>
                </div>
                <FavoriteToggle href={link.href} label={link.label} favorited onToggle={handleStarredRemove} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: your favorites also stay pinned at the top of the Menu sidebar (☰, top-left) for one-click jumps.
        </p>
        {/* Polite announcement for screen readers on star/unstar/clear. */}
        {notice && (
          <span key={notice.seq} role="status" className="sr-only">
            {notice.href === ""
              ? "Favorites cleared."
              : notice.added
                ? `Added ${notice.label} to favorites. ${notice.count} favorite${notice.count === 1 ? "" : "s"}.`
                : `Removed ${notice.label} from favorites. ${notice.count} favorite${notice.count === 1 ? "" : "s"}.`}
          </span>
        )}
      </section>

      {/* Full directory to star from */}
      <section aria-label="All pages you can favorite">
        <h2 className="flex items-center gap-1.5 text-lg font-black"><span aria-hidden="true">☆</span> Star a page · {directory.length}
          <InfoTip
            text="Every internal page in the Menu sidebar can be starred. External links like GitHub can't. Use the filter to find pages fast."
            label="About starring pages"
          />
        </h2>
        <label htmlFor="favorites-filter" className="sr-only">Filter pages</label>
        <input
          ref={filterRef}
          id="favorites-filter"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter… try “gpu”, “coins”, “bot”"
          className="mt-3 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-amber-500 focus:bg-background focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
        />
        {directory.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No pages match “{query}”.{" "}
            <button type="button" className="font-bold underline underline-offset-4" onClick={() => setQuery("")}>
              Clear
            </button>
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {directory.map((link) => {
              const fav = isFav(link.href);
              return (
                <li
                  key={`dir-${link.href}-${link.label}`}
                  className={cn(
                    "flex items-start gap-2 rounded-2xl border border-border bg-card p-4 transition",
                    fav && "border-amber-500/30",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <Link href={link.href} className="font-bold hover:underline">
                      {fav && (
                        <span aria-hidden="true" className="mr-1 text-amber-500">★</span>
                      )}
                      {link.label}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{link.quick}</p>
                  </div>
                  <FavoriteToggle href={link.href} label={link.label} favorited={fav} onToggle={toggle} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
