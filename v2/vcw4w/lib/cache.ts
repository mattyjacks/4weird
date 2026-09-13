/**
 * Cache Components foundation: cached async data fetchers for `use cache`.
 *
 * Rules (per Next 16.3 `use cache` docs):
 * - Server-only, static data. NEVER per-user data, NEVER cookies()/headers().
 * - Each function opens with `'use cache'` + an explicit `cacheLife()` profile
 *   + `cacheTag()` where on-demand invalidation makes sense.
 * - NEVER imported from client components with the intent to run them on the
 *   client; call on the server and pass results down as props. (`'use client'`
 *   + `'use cache'` in one file is illegal, so this module stays server-side.)
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { CLOUD_SERVICES, type CloudService } from "@/lib/cloud-catalog";
import {
  GITHUB_HREF,
  SITE_NAV_GROUPS,
  type SiteNavGroup,
} from "@/lib/site-nav";

/** Static nav groups for header/sidebar/footer chrome. Static source of truth. */
export async function getSiteNav(): Promise<SiteNavGroup[]> {
  "use cache";
  cacheLife("days");
  cacheTag("site-nav");
  // JSON round-trip guarantees plain serializable output for the cache.
  return JSON.parse(JSON.stringify(SITE_NAV_GROUPS)) as SiteNavGroup[];
}

export type CatalogSnapshotEntry = Pick<
  CloudService,
  "key" | "name" | "unit" | "coinsPerUnit" | "category" | "tier"
>;

/** Cheapest-tier snapshot of the static cloud catalog (prices in Vibe Coins). */
export async function getCatalogSnapshot(): Promise<CatalogSnapshotEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("cloud-catalog");
  return CLOUD_SERVICES.map((s) => ({
    key: s.key,
    name: s.name,
    unit: s.unit,
    coinsPerUnit: s.coinsPerUnit,
    category: s.category,
    tier: s.tier,
  }));
}

export type StaticDocEntry = {
  /** Route segment under /docs, e.g. "getting-started". */
  slug: string;
  /** Human label derived from the segment. */
  label: string;
  href: string;
};

/**
 * List of static doc sections (subdirectories of app/docs).
 * Local static data only — no user data, no request APIs.
 */
export async function getStaticDocsList(): Promise<StaticDocEntry[]> {
  "use cache";
  cacheLife("days");
  cacheTag("static-docs");
  let slugs: string[];
  try {
    const entries = await readdir(path.join(process.cwd(), "app", "docs"), {
      withFileTypes: true,
    });
    slugs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    // Docs dir unreadable (e.g. minimal checkout): degrade to the GitHub
    // link rather than crashing the prerendered shell.
    return [{ slug: "github", label: "GitHub", href: GITHUB_HREF }];
  }
  return slugs.map((slug) => ({
    slug,
    label: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    href: `/docs/${slug}`,
  }));
}
