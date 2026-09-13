/**
 * Outscraper review-intelligence - FULL featured, handled purely through the API.
 *
 * Official surface mirrored 1:1 (Google Maps reviews, Google Play reviews,
 * Trustpilot, Tripadvisor, Google Shopping reviews, YouTube comments), PLUS
 * 4weird improvements the native dashboard lacks:
 *   1. Budget-first picks; cheapest viable pull mode preselected, exact
 *      coin quote BEFORE queueing (25% cut INCLUDED), fail-closed metering.
 *   2. Auto-vault; every finished pull/rollup autosaves to the caller's
 *      Weird Vault scope (personal/team/org) with provenance.
 *   3. Game-ready signal; ratings rollup + trailer-sentiment notes per game
 *      (store trust, competitor review mining, ORM alerts), queued as
 *      follow-up notes.
 *   4. One-call pipeline; query -> pull task -> rollup/watch report,
 *      tracked as one outscraper_reviews_job row with the full trail.
 *   5. Honest unconfigured state; without OUTSCRAPER_API_KEY every call
 *      returns started:false + quote, never faked.
 *
 * Server key: OUTSCRAPER_API_KEY (server-only, never NEXT_PUBLIC_, sent as
 * X-API-KEY header). Base override: OUTSCRAPER_API_BASE (default
 * https://api.app.outscraper.com).
 * Docs: https://outscraper.com/services/ (REST: /maps/reviews-v3,
 * /apps/google-play-reviews, /trustpilot/reviews, /tripadvisor/reviews-v2,
 * /shopping/google/reviews, /youtube/comments).
 *
 * Client-safe: constants + quotes render in the browser; key helpers read
 * server env only (browser gets "" -> unconfigured UI).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

export const OUTSCRAPER_REVIEWS_CUT_PCT = SERVICE_CUT_PCT ?? 25;
export const OUTSCRAPER_REVIEWS_API_BASE_DEFAULT =
  "https://api.app.outscraper.com";

export const OUTSCRAPER_REVIEWS_OP_KEYS = [
  "maps-reviews",
  "play-reviews",
  "trustpilot",
  "tripadvisor",
  "shopping-reviews",
  "youtube-comments",
  "sentiment-rollup",
  "review-monitor",
] as const;
export type OutscraperReviewsOp =
  (typeof OUTSCRAPER_REVIEWS_OP_KEYS)[number];

export function isOutscraperReviewsOp(
  value: unknown,
): value is OutscraperReviewsOp {
  return (
    typeof value === "string" &&
    (OUTSCRAPER_REVIEWS_OP_KEYS as readonly string[]).includes(value)
  );
}

export type OutscraperReviewsOpDef = {
  op: OutscraperReviewsOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Cheapest viable Outscraper pull mode (preselected default). */
  mode: string;
  /** Newest viable API path this op calls. */
  api: string;
  needsQuery: boolean;
  needsLocation: boolean;
};

export const OUTSCRAPER_REVIEWS_OPS: OutscraperReviewsOpDef[] = [
  {
    op: "maps-reviews",
    name: "Maps Reviews",
    unit: "1k_records",
    coinsPerUnit: 8,
    blurb:
      "Google Maps reviews scraper: full review pull with sort + cutoff for store buzz.",
    mode: "full-pull",
    api: "GET /maps/reviews-v3",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "play-reviews",
    name: "Play Reviews",
    unit: "1k_records",
    coinsPerUnit: 6,
    blurb:
      "Google Play reviews scraper: mine competitor game reviews for feature gaps.",
    mode: "competitor-mine",
    api: "GET /apps/google-play-reviews",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "trustpilot",
    name: "Trustpilot",
    unit: "1k_records",
    coinsPerUnit: 5,
    blurb:
      "Trustpilot scraper: store and brand trust signal for your game studio.",
    mode: "trust-signal",
    api: "GET /trustpilot/reviews",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "tripadvisor",
    name: "Tripadvisor",
    unit: "1k_records",
    coinsPerUnit: 5,
    blurb:
      "Tripadvisor reviews scraper: venue intel for location-based games.",
    mode: "venue-intel",
    api: "GET /tripadvisor/reviews-v2",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "shopping-reviews",
    name: "Shopping Reviews",
    unit: "1k_records",
    coinsPerUnit: 4,
    blurb:
      "Google Shopping reviews scraper: product sentiment for merch and tie-ins.",
    mode: "product-sentiment",
    api: "GET /shopping/google/reviews",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "youtube-comments",
    name: "YouTube Comments",
    unit: "1k_records",
    coinsPerUnit: 3,
    blurb:
      "YouTube comments scraper: trailer sentiment mining straight from the hype.",
    mode: "trailer-sentiment",
    api: "GET /youtube/comments",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "sentiment-rollup",
    name: "Sentiment Rollup",
    unit: "report",
    coinsPerUnit: 12,
    blurb:
      "Cross-source rating rollup computed locally from prior Outscraper pulls; no API call.",
    mode: "local-rollup",
    api: "local (no API call)",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "review-monitor",
    name: "Review Monitor",
    unit: "watch",
    coinsPerUnit: 7,
    blurb:
      "Cutoff-based new-review watch: only-recent poll of Maps reviews for ORM alerts.",
    mode: "recent-watch",
    api: "GET /maps/reviews-v3?cutoff",
    needsQuery: true,
    needsLocation: false,
  },
];

export function opByKey(op: OutscraperReviewsOp): OutscraperReviewsOpDef {
  const found = OUTSCRAPER_REVIEWS_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown outscraper-reviews op: ${op}`);
  return found;
}

export function outscraperReviewsSplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut =
    Math.round(((gross * OUTSCRAPER_REVIEWS_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

export function quoteOutscraperReviews(
  op: OutscraperReviewsOp,
  qty = 1,
): number {
  const rate = opByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteOutscraperReviewsSplit(
  op: OutscraperReviewsOp,
  qty = 1,
): { gross: number; cut: number; provider: number } {
  return outscraperReviewsSplit(quoteOutscraperReviews(op, qty));
}

export const OUTSCRAPER_REVIEWS_CUT_NOTE = `Includes ${OUTSCRAPER_REVIEWS_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

export const OUTSCRAPER_REVIEWS_CUT_PCT_FALLBACK = 25;

export function cleanOutscraperReviewsQuery(value: unknown): string {
  return String(value ?? "").trim().slice(0, 500);
}

export function cleanOutscraperReviewsCutoff(value: unknown): string {
  const v = String(value ?? "").trim().slice(0, 32);
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v;
  if (/^\d+$/.test(v)) return v;
  return "";
}

export function outscraperReviewsKey(): string {
  if (typeof process === "undefined") return "";
  return String(process.env.OUTSCRAPER_API_KEY ?? "").trim();
}

export function outscraperReviewsBase(): string {
  if (typeof process === "undefined")
    return OUTSCRAPER_REVIEWS_API_BASE_DEFAULT;
  const raw = String(process.env.OUTSCRAPER_API_BASE ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!raw) return OUTSCRAPER_REVIEWS_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return OUTSCRAPER_REVIEWS_API_BASE_DEFAULT;
    if (u.origin !== "https://api.app.outscraper.com")
      return OUTSCRAPER_REVIEWS_API_BASE_DEFAULT;
    return raw;
  } catch {
    return OUTSCRAPER_REVIEWS_API_BASE_DEFAULT;
  }
}

export function outscraperReviewsConfigured(): boolean {
  return outscraperReviewsKey().length > 0;
}

/** VCW howto lines rendered next to every Outscraper review quote. */
export function outscraperReviewsHowto(op: OutscraperReviewsOp): string[] {
  const def = opByKey(op);
  if (def.op === "sentiment-rollup") {
    return [
      "Run one or more pulls first, then roll up ratings locally on /reviews.",
      "Rollup is computed from vaulted pulls; it makes no Outscraper API call.",
      "Quote on /reviews before queueing; without OUTSCRAPER_API_KEY pulls stay unconfigured.",
    ];
  }
  if (def.op === "review-monitor") {
    return [
      "Set a cutoff date so only newer reviews are polled on /reviews.",
      "Re-poll the same query to catch ORM alerts without re-paying a full pull.",
      "Quote on /reviews before queueing; without OUTSCRAPER_API_KEY you get quote only.",
    ];
  }
  return [
    `Paste a query (URL or place/app/shop/video) on /reviews; mode ${def.mode} via ${def.api}.`,
    "Sort + cutoff keep the pull cheap; quote first, vaulted after it finishes.",
    "Quote on /reviews before queueing; without OUTSCRAPER_API_KEY you get quote only.",
  ];
}
