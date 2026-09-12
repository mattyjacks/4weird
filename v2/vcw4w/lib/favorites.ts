"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_NAV_GROUPS, type SiteNavLink } from "@/lib/site-nav";

export const FAVORITES_KEY = "fw-favorites-v1";
const MAX_FAVORITES = 50;

/** Trailing-slash-insensitive normalizer ("/my/usage/" === "/my/usage"). */
export function normalizeFavHref(href: string): string {
  if (href.length > 1) return href.replace(/\/$/, "");
  return href;
}

/** Deduplicated directory of every favoritable internal page. */
export const FAVORABLE_LINKS: SiteNavLink[] = (() => {
  const seen = new Set<string>();
  const out: SiteNavLink[] = [
    { href: "/", label: "Home", quick: "Start here — cloud, arcade, and docs.", detail: "The 4weird homepage: cloud services, featured games, and the full site directory." },
    { href: "/favorites", label: "Favorites", quick: "Your starred pages, in one place.", detail: "Every page you starred, saved on this device. Add or remove stars anytime." },
  ];
  for (const group of SITE_NAV_GROUPS) {
    for (const link of group.links) {
      if (link.external) continue;
      const key = normalizeFavHref(link.href);
      if (seen.has(`${key}::${link.label}`)) continue;
      seen.add(`${key}::${link.label}`);
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
      .filter((v): v is string => typeof v === "string" && v.startsWith("/") && !/^https?:\/\//.test(v))
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

/**
 * Device-local favorites (works signed-out; no account, no DB).
 * Syncs across tabs via the `storage` event.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFavorites(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY) setFavorites(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((href: string) => {
    const key = normalizeFavHref(href);
    setFavorites((prev) => {
      const next = prev.includes(key)
        ? prev.filter((h) => h !== key)
        : [key, ...prev].slice(0, MAX_FAVORITES);
      writeStored(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setFavorites([]);
    writeStored([]);
  }, []);

  const isFav = useCallback((href: string) => favorites.includes(normalizeFavHref(href)), [favorites]);

  return { favorites, hydrated, toggle, clear, isFav };
}
