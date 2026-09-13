/**
 * Outscraper search/commerce-data compatibility - handled purely through the API.
 *
 * Official surface mirrored (Google Search + Images + News + Shopping SERP
 * scrapers, Amazon products + reviews, Universal AI-powered web scraper,
 * Yellow Pages directory), PLUS 4weird improvements the native dashboard
 * lacks:
 *   1. Budget-first picks; exact coin quote BEFORE queueing (25% cut
 *      INCLUDED), fail-closed metering.
 *   2. Auto-vault; every finished scrape autosaves to the caller's Weird
 *      Vault scope (personal/team/org) with provenance.
 *   3. Game-ready grounding; SERP/news/shopping rows ship as lore, price,
 *      and reference-art notes per gamejam theme.
 *   4. One-call pipeline; query -> scrape job -> structured rows, tracked as
 *      one outscraper_search_job row with the full trail.
 *   5. Honest unconfigured state; without OUTSCRAPER_API_KEY every call
 *      returns started:false + quote, never faked.
 *
 * Server key: OUTSCRAPER_API_KEY (server-only, never NEXT_PUBLIC_), sent as
 * the X-API-KEY header. Base override: OUTSCRAPER_API_BASE (default
 * https://api.app.outscraper.com).
 * Docs: https://outscraper.com/services/ (REST: /google-search-v2,
 * /google-images, /google-news-v2, /google-shopping, /amazon-products,
 * /amazon-reviews, /universal-scraper, /yellow-pages).
 *
 * Client-safe: constants + quotes render in the browser; key helpers read
 * server env only (browser gets "" -> unconfigured UI).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

const OUTSCRAPER_SEARCH_CUT_FALLBACK_PCT = 25;
export const OUTSCRAPER_SEARCH_CUT_PCT =
  typeof SERVICE_CUT_PCT === "number" && Number.isFinite(SERVICE_CUT_PCT)
    ? SERVICE_CUT_PCT
    : OUTSCRAPER_SEARCH_CUT_FALLBACK_PCT;
export const OUTSCRAPER_SEARCH_API_BASE_DEFAULT = "https://api.app.outscraper.com";

export const OUTSCRAPER_SEARCH_OP_KEYS = [
  "google-search",
  "google-images",
  "google-news",
  "google-shopping",
  "amazon-products",
  "amazon-reviews",
  "universal-scrape",
  "yellow-pages",
] as const;
export type OutscraperSearchOp = (typeof OUTSCRAPER_SEARCH_OP_KEYS)[number];

export function isOutscraperSearchOp(value: unknown): value is OutscraperSearchOp {
  return (
    typeof value === "string" &&
    (OUTSCRAPER_SEARCH_OP_KEYS as readonly string[]).includes(value)
  );
}

export type OutscraperSearchOpDef = {
  op: OutscraperSearchOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Cheapest viable Outscraper task mode (preselected default). */
  mode: string;
  /** Newest viable API path this op calls. */
  api: string;
  needsQuery: boolean;
  needsLocation: boolean;
  /** google-search only: an optional location refines the SERP. */
  locationOptional?: boolean;
};

export const OUTSCRAPER_SEARCH_OPS: OutscraperSearchOpDef[] = [
  {
    op: "google-search",
    name: "Google Search",
    unit: "1k_records",
    coinsPerUnit: 6,
    blurb:
      "Google Search scraper: full SERP rows (query + pages + language) for lore and fact grounding.",
    mode: "serp-query-pages",
    api: "GET /google-search-v2",
    needsQuery: true,
    needsLocation: false,
    locationOptional: true,
  },
  {
    op: "google-images",
    name: "Google Images",
    unit: "1k_records",
    coinsPerUnit: 5,
    blurb:
      "Google Images scraper: reference-art harvest (query + pages) for moodboards and sprite inspiration.",
    mode: "images-query",
    api: "GET /google-images",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "google-news",
    name: "Google News",
    unit: "1k_records",
    coinsPerUnit: 4,
    blurb:
      "Google News scraper: lore and current-events grounding from fresh headlines per query.",
    mode: "news-query",
    api: "GET /google-news-v2",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "google-shopping",
    name: "Google Shopping",
    unit: "1k_records",
    coinsPerUnit: 7,
    blurb:
      "Google Shopping scraper: merch and price intel (offers per query) for in-game economies.",
    mode: "shopping-offers",
    api: "GET /google-shopping",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "amazon-products",
    name: "Amazon Products",
    unit: "1k_records",
    coinsPerUnit: 8,
    blurb:
      "Amazon products scraper: ASIN/query catalog data (titles, prices, ratings) for merch comps.",
    mode: "asin-or-query",
    api: "GET /amazon-products",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "amazon-reviews",
    name: "Amazon Reviews",
    unit: "1k_records",
    coinsPerUnit: 6,
    blurb:
      "Amazon reviews scraper: product sentiment by ASIN/query for tuning merch and copy.",
    mode: "reviews-by-asin",
    api: "GET /amazon-reviews",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "universal-scrape",
    name: "Universal Scrape",
    unit: "page",
    coinsPerUnit: 12,
    blurb:
      "Universal AI-powered web scraper: any URL into structured rows via AI extraction.",
    mode: "ai-extract",
    api: "GET /universal-scraper",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "yellow-pages",
    name: "Yellow Pages",
    unit: "1k_records",
    coinsPerUnit: 3,
    blurb:
      "Yellow Pages scraper: legacy directory leads (query + pages) for retro in-game business lore.",
    mode: "directory-leads",
    api: "GET /yellow-pages",
    needsQuery: true,
    needsLocation: false,
  },
];

export function outscraperSearchOpByKey(op: OutscraperSearchOp): OutscraperSearchOpDef {
  const found = OUTSCRAPER_SEARCH_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown outscraper-search op: ${op}`);
  return found;
}

/** Short alias for the op lookup. */
export const opByKey = outscraperSearchOpByKey;

export function outscraperSearchSplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round(((gross * OUTSCRAPER_SEARCH_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

export function quoteOutscraperSearch(op: OutscraperSearchOp, qty = 1): number {
  const rate = outscraperSearchOpByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteOutscraperSearchSplit(
  op: OutscraperSearchOp,
  qty = 1,
): {
  gross: number;
  cut: number;
  provider: number;
} {
  return outscraperSearchSplit(quoteOutscraperSearch(op, qty));
}

export const OUTSCRAPER_SEARCH_CUT_NOTE = `Includes ${OUTSCRAPER_SEARCH_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

/** Short alias for the cut note. */
export const CUT_NOTE = OUTSCRAPER_SEARCH_CUT_NOTE;

export function cleanOutscraperSearchQuery(value: unknown): string {
  return String(value ?? "").trim().slice(0, 500);
}

export function cleanOutscraperSearchUrl(value: unknown): string {
  return String(value ?? "").trim().slice(0, 2048);
}

export function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

export function outscraperSearchKey(): string {
  if (typeof process === "undefined") return "";
  return String(process.env.OUTSCRAPER_API_KEY ?? "").trim();
}

export function outscraperSearchApiBase(): string {
  if (typeof process === "undefined") return OUTSCRAPER_SEARCH_API_BASE_DEFAULT;
  const raw = String(process.env.OUTSCRAPER_API_BASE ?? "").trim().replace(/\/+$/, "");
  if (!raw) return OUTSCRAPER_SEARCH_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return OUTSCRAPER_SEARCH_API_BASE_DEFAULT;
    if (u.origin !== "https://api.app.outscraper.com")
      return OUTSCRAPER_SEARCH_API_BASE_DEFAULT;
    return raw;
  } catch {
    return OUTSCRAPER_SEARCH_API_BASE_DEFAULT;
  }
}

export function outscraperSearchConfigured(): boolean {
  return outscraperSearchKey().length > 0;
}

/** Least-privilege scope keys for Outscraper search (run vs read). */
export const OUTSCRAPER_SEARCH_SCOPES = [
  "outscraper-search:run",
  "outscraper-search:read",
] as const;

/** VCW how-to tips attached to every scrape request UI. */
export function outscraperSearchVcwHowto(op: OutscraperSearchOp): string[] {
  const def = outscraperSearchOpByKey(op);
  const tips: string[] = [];
  tips.push(
    `Quote first: ${def.coinsPerUnit} coins per ${def.unit} (25% cut included).`,
  );
  if (def.needsQuery)
    tips.push(
      "A query is required (ASIN for amazon-reviews, any https:// URL for universal-scrape); blank queries never start a job.",
    );
  if (op === "google-search")
    tips.push("Add pages + language, plus an optional location, for deeper SERP coverage.");
  if (op === "universal-scrape")
    tips.push("Paste any https:// URL as the query; the AI returns structured rows per page.");
  if (op === "yellow-pages" || op === "google-images" || op === "google-news")
    tips.push("Add pages to widen coverage; each page batch meters per 1k records.");
  if (!outscraperSearchConfigured())
    tips.push("Set OUTSCRAPER_API_KEY server-side (X-API-KEY header) to start live scrapes.");
  tips.push("Finished rows auto-vault with provenance; cite them in your game zip.");
  return tips;
}
