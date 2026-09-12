"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SITE_NAV_GROUPS, type SiteNavLink } from "@/lib/site-nav";

export const FAVORITES_KEY = "fw-favorites-v1";
/** Same-tab broadcast: `storage` events never fire in the tab that wrote. */
export const FAVORITES_EVENT = "fw-favorites-changed";
const MAX_FAVORITES = 50;

/** Trailing-slash-insensitive normalizer ("/my/usage/" === "/my/usage"). */
export function normalizeFavHref(href: string): string {
  if (href.length > 1) return href.replace(/\/+$/, "");
  return href;
}

/** Only internal page paths can be favorited (no externals, no empty). */
export function isFavoritableHref(href: string): boolean {
  if (typeof href !== "string" || href.length === 0) return false;
  if (!href.startsWith("/")) return false;
  if (/^https?:\/\//.test(href)) return false;
  return true;
}

/** Deduplicated directory of every favoritable internal page (href wins). */
export const FAVORABLE_LINKS: SiteNavLink[] = (() => {
  const seen = new Set<string>();
  const out: SiteNavLink[] = [
    { href: "/", label: "Home", quick: "Start here — cloud, arcade, and docs.", detail: "The 4weird homepage: cloud services, featured games, and the full site directory." },
    { href: "/favorites", label: "Favorites", quick: "Your starred pages, in one place.", detail: "Every page you starred, saved on this device. Add or remove stars anytime." },
  ];
  for (const group of SITE_NAV_GROUPS) {
    for (const link of group.links) {
      if (link.external || !isFavoritableHref(link.href)) continue;
      const key = normalizeFavHref(link.href);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(link);
    }
  }
  return out;
})();

const FAV_META = new Map<string, SiteNavLink>();
for (const link of FAVORABLE_LINKS) {
  const key = normalizeFavHref(link.href);
  if (!FAV_META.has(key)) FAV_META.set(key, link);
}

/** Look up directory metadata for a favorited href (falls back to the href itself). */
export function favMetaFor(href: string): SiteNavLink {
  const key = normalizeFavHref(href);
  return (
    FAV_META.get(key) ?? {
      href: key,
      label: key === "/" ? "Home" : key,
      quick: "A page on 4weird.",
      detail: "A page on 4weird.",
    }
  );
}

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cleaned = parsed
      .filter((v): v is string => typeof v === "string" && isFavoritableHref(v))
      .map(normalizeFavHref);
    return [...new Set(cleaned)].slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

function writeStored(favs: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs.slice(0, MAX_FAVORITES)));
  } catch {
    /* private mode — favorites just don't persist */
  }
}

function broadcast() {
  try {
    window.dispatchEvent(new CustomEvent<string[]>(FAVORITES_EVENT));
  } catch {
    /* non-DOM environment — nothing to notify */
  }
}

export type FavoritesNotice = {
  href: string;
  label: string;
  added: boolean;
  count: number;
  /** Bumps every toggle/clear so repeat actions re-announce. */
  seq: number;
};

/**
 * Device-local favorites (works signed-out; no account, no DB).
 * Syncs across hooks in this tab via `fw-favorites-changed` and across
 * tabs via the `storage` event. `notice` feeds a polite live region.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<FavoritesNotice | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    setFavorites(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const resync = () => setFavorites(readStored());
    const onStorage = (e: StorageEvent) => {
      // key === null means localStorage.clear() — resync too.
      if (e.key === null || e.key === FAVORITES_KEY) resync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(FAVORITES_EVENT, resync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FAVORITES_EVENT, resync);
    };
  }, []);

  const toggle = useCallback((href: string) => {
    if (!isFavoritableHref(href)) return;
    const key = normalizeFavHref(href);
    const current = readStored();
    const added = !current.includes(key);
    const next = (added ? [key, ...current] : current.filter((h) => h !== key)).slice(0, MAX_FAVORITES);
    writeStored(next);
    setFavorites(next);
    const label = favMetaFor(key).label;
    seqRef.current += 1;
    setNotice({ href: key, label, added, count: next.length, seq: seqRef.current });
    broadcast();
  }, []);

  const clear = useCallback(() => {
    writeStored([]);
    setFavorites([]);
    seqRef.current += 1;
    setNotice({ href: "", label: "", added: false, count: 0, seq: seqRef.current });
    broadcast();
  }, []);

  const isFav = useCallback((href: string) => favorites.includes(normalizeFavHref(href)), [favorites]);

  return { favorites, hydrated, toggle, clear, isFav, notice };
}
