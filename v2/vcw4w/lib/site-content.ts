/**
 * Web-shell static content fetchers for Cache Components (Next 16.3).
 *
 * Every pure async server fetcher here opens with `'use cache'` + an
 * explicit `cacheLife()` profile + `cacheTag()` so on-demand invalidation
 * (see `lib/cache-config.ts` + `POST /api/site-cache`) can refresh it.
 *
 * Rules (per node_modules/next/dist/docs/.../directives/use-cache.md):
 * - Server-only, static data. NEVER per-user data, NEVER cookies()/headers().
 * - NEVER import this module from a client component ('use client' +
 *   `'use cache'` in one file is illegal). Call on the server and pass
 *   results down as props.
 * - Tags are content-domain tags (one tag per domain, shared by every
 *   fetcher/component rendering that domain) so a single invalidation
 *   refreshes the whole domain. The registry below is the contract the
 *   invalidators enforce via `isSiteCacheTag()`.
 */

import { cacheLife, cacheTag } from "next/cache";
import { DOCS_DATA, type DocEntry } from "@/components/docs/docs-data";
import { COIN_PACKS, COIN_TRIAL, FACTS } from "@/lib/seo";

/**
 * Web-lane cache-tag registry. Pre-existing web tags (defined in
 * `lib/cache.ts`, `components/site/site-footer-cached.tsx`,
 * `components/business/business-crosslinks.tsx`,
 * `components/tools/tool-shell.tsx`, `app/tools/page.tsx`) are listed here
 * so there is exactly one source of truth; their `cacheTag()` call sites
 * stay where they are.
 */
export const SITE_CACHE_TAGS = [
  "site-nav",
  "cloud-catalog",
  "static-docs",
  "site-footer",
  "business-crosslinks",
  "tools",
  "docs-hub",
  "site-facts",
  "site-home",
  "site-legal",
] as const;

export type SiteCacheTag = (typeof SITE_CACHE_TAGS)[number];

export function isSiteCacheTag(tag: unknown): tag is SiteCacheTag {
  return (
    typeof tag === "string" &&
    (SITE_CACHE_TAGS as readonly string[]).includes(tag)
  );
}

export type DocsHubEntry = DocEntry;

/**
 * Docs-hub guide cards (everything under /docs except the hub itself).
 * Static catalog data only — per-guide read progress lives in the client
 * (`useDocsProgress`, localStorage) and is never cached.
 */
export async function getDocsHub(): Promise<DocsHubEntry[]> {
  "use cache";
  cacheLife("days");
  cacheTag("docs-hub");
  // JSON round-trip guarantees plain serializable output for the cache.
  return JSON.parse(
    JSON.stringify(DOCS_DATA.filter((d) => d.href !== "/docs")),
  ) as DocsHubEntry[];
}

export type ToolCatalogEntry = {
  href: string;
  name: string;
  blurb: string;
};

/**
 * Free-tools catalog for the /tools hub. Single source of truth for the
 * hub page (which keeps its own page-level `use cache` scope); the tools
 * themselves run 100% on-device, so `hours` is plenty fresh.
 */
export async function getToolsCatalog(): Promise<ToolCatalogEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tools");
  return [
    {
      href: "/tools/seo",
      name: "🔍 SEO Analyzer",
      blurb:
        "SERP simulator, social card preview, and heuristic checklist for any page.",
    },
    {
      href: "/tools/image",
      name: "🎨 Image Optimizer",
      blurb:
        "Resize, compress to WebP/JPEG/PNG, and strip EXIF — 100% in your browser.",
    },
    {
      href: "/tools/writing",
      name: "✍️ Writing Tools",
      blurb:
        "Game title generator and marketing pitch copywriter for your next launch.",
    },
    {
      href: "/tools/counter",
      name: "⏱️ Counter Tools",
      blurb:
        "Words, characters, sentences, paragraphs, reading and speaking time — live.",
    },
  ];
}

export type SiteFacts = {
  coinPeg: string;
  platformCut: string;
  trialCoins: number;
  packs: Array<{ coins: number; usd: number; label: string }>;
};

/**
 * Canonical money facts snapshot (mirrors `lib/seo.ts` FACTS / packs).
 * Prose across marketing pages must quote these verbatim; caching them
 * under `site-facts` keeps every surface consistent between deploys.
 */
export async function getSiteFacts(): Promise<SiteFacts> {
  "use cache";
  cacheLife("days");
  cacheTag("site-facts");
  return JSON.parse(
    JSON.stringify({
      coinPeg: FACTS.coinPeg,
      platformCut: FACTS.platformCut,
      trialCoins: COIN_TRIAL.coins,
      packs: COIN_PACKS.map((p) => ({
        coins: p.coins,
        usd: p.usd,
        label: p.label,
      })),
    }),
  ) as SiteFacts;
}
