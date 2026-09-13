/**
 * Outscraper Google-Maps-platform compatibility - handled purely through the API.
 *
 * Official surface mirrored 1:1 (Google Maps search/scraper, place details,
 * reviews, photos, directions, traffic extractor, geocoding, reverse
 * geocoding, newly added businesses, bulk sweep), PLUS 4weird improvements
 * the native dashboard lacks:
 *   1. Budget-first picks; cheapest viable task mode preselected, exact
 *      coin quote BEFORE queueing (25% cut INCLUDED), fail-closed metering.
 *   2. Auto-vault; every finished pull autosaves to the caller's Weird Vault
 *      scope (personal/team/org) with provenance.
 *   3. Game-ready post-checks; location/distance/venue advice per game
 *      runtime (location games want lat/lng + place_id pairs), queued as
 *      follow-up notes.
 *   4. One-call pipeline; query -> search task -> enrich task -> download
 *      URL, tracked as one outscraper_maps_job row with the full trail.
 *   5. Honest unconfigured state; without OUTSCRAPER_API_KEY every call
 *      returns started:false + quote, never faked.
 *
 * Server key: OUTSCRAPER_API_KEY (server-only, never NEXT_PUBLIC_, sent as
 * header X-API-KEY). Base override: OUTSCRAPER_API_BASE (default
 * https://api.app.outscraper.com).
 * Docs: https://outscraper.com/services/ (REST: /maps/search-v2,
 * /maps/reviews-v3, /maps/photos-v2, /maps/directions-v2,
 * /maps/geocode-v2, /maps/reverse-geocode-v2, traffic extractor,
 * newly-added businesses).
 *
 * Client-safe: constants + quotes render in the browser; key helpers read
 * server env only (browser gets "" -> unconfigured UI).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

export const OUTSCRAPER_MAPS_CUT_PCT = SERVICE_CUT_PCT;
export const OUTSCRAPER_API_BASE_DEFAULT = "https://api.app.outscraper.com";

export const OUTSCRAPER_MAPS_OP_KEYS = [
  "maps-search",
  "place-details",
  "maps-reviews-lite",
  "maps-photos",
  "maps-directions",
  "traffic-extractor",
  "geocode",
  "reverse-geocode",
  "new-businesses",
  "maps-search-bulk",
] as const;
export type OutscraperMapsOp = (typeof OUTSCRAPER_MAPS_OP_KEYS)[number];

export function isOutscraperMapsOp(value: unknown): value is OutscraperMapsOp {
  return (
    typeof value === "string" &&
    (OUTSCRAPER_MAPS_OP_KEYS as readonly string[]).includes(value)
  );
}

export type OutscraperMapsOpDef = {
  op: OutscraperMapsOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Cheapest viable Outscraper task mode/params (preselected default). */
  mode: string;
  /** Real Outscraper API path this op calls. */
  api: string;
  needsQuery: boolean;
  needsLocation: boolean;
};

export const OUTSCRAPER_MAPS_OPS: OutscraperMapsOpDef[] = [
  {
    op: "maps-search",
    name: "Maps Search",
    unit: "1k_records",
    coinsPerUnit: 8,
    blurb: "Outscraper Google Maps Search: places by query + location, ratings included.",
    mode: "search-v2 limit=100 language=en",
    api: "GET /maps/search-v2",
    needsQuery: true,
    needsLocation: true,
  },
  {
    op: "place-details",
    name: "Place Details",
    unit: "lookup",
    coinsPerUnit: 5,
    blurb: "Outscraper Google Maps Data enrichment: hours, phone, site, rating per place.",
    mode: "search-v2 enrich place_id",
    api: "GET /maps/search-v2",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "maps-reviews-lite",
    name: "Reviews Snapshot",
    unit: "snapshot",
    coinsPerUnit: 4,
    blurb: "Outscraper Google Maps Reviews (lite): rating + review-count snapshot, no full pull.",
    mode: "reviews-v3 reviewsLimit=0 sort=mostRelevant",
    api: "GET /maps/reviews-v3",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "maps-photos",
    name: "Maps Photos",
    unit: "1k_records",
    coinsPerUnit: 6,
    blurb: "Outscraper Google Maps Photos scraper: venue shots for art inspiration.",
    mode: "photos-v2 limit=100",
    api: "GET /maps/photos-v2",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "maps-directions",
    name: "Directions",
    unit: "lookup",
    coinsPerUnit: 3,
    blurb: "Outscraper Google Maps Directions API: distance + duration for location games.",
    mode: "directions-v2 travelMode=driving",
    api: "GET /maps/directions-v2",
    needsQuery: true,
    needsLocation: true,
  },
  {
    op: "traffic-extractor",
    name: "Traffic Extractor",
    unit: "lookup",
    coinsPerUnit: 5,
    blurb: "Outscraper Google Maps Traffic Data Extractor: live busyness snapshot.",
    mode: "traffic-v1 peakHoursOnly=false",
    api: "GET /maps/traffic-v1",
    needsQuery: true,
    needsLocation: true,
  },
  {
    op: "geocode",
    name: "Geocode",
    unit: "lookup",
    coinsPerUnit: 3,
    blurb: "Outscraper Geocoding API: address to lat/lng for map pins.",
    mode: "geocode-v2 language=en",
    api: "GET /maps/geocode-v2",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "reverse-geocode",
    name: "Reverse Geocode",
    unit: "lookup",
    coinsPerUnit: 3,
    blurb: "Outscraper Reverse Geocoding API: lat/lng to address for dropped pins.",
    mode: "reverse-geocode-v2 language=en",
    api: "GET /maps/reverse-geocode-v2",
    needsQuery: true,
    needsLocation: true,
  },
  {
    op: "new-businesses",
    name: "New Businesses",
    unit: "lookup",
    coinsPerUnit: 12,
    blurb: "Outscraper Newly Added Businesses database: fresh-lead radar per area.",
    mode: "new-businesses-v1 radiusKm=10",
    api: "GET /maps/new-businesses-v1",
    needsQuery: true,
    needsLocation: true,
  },
  {
    op: "maps-search-bulk",
    name: "Bulk Maps Sweep",
    unit: "1k_records",
    coinsPerUnit: 10,
    blurb: "Outscraper Google Maps Search bulk: multi-query city-wide lead harvest.",
    mode: "search-v2 bulk queries<=20 limit=100",
    api: "POST /maps/search-v2:batch",
    needsQuery: true,
    needsLocation: true,
  },
];

export function outscraperMapsOpByKey(op: OutscraperMapsOp): OutscraperMapsOpDef {
  const found = OUTSCRAPER_MAPS_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown outscraper-maps op: ${op}`);
  return found;
}

/** Back-compat alias: opByKey. */
export const opByKey = outscraperMapsOpByKey;

export function outscraperMapsSplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round(((gross * OUTSCRAPER_MAPS_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

export function quoteOutscraperMaps(op: OutscraperMapsOp, qty = 1): number {
  const rate = outscraperMapsOpByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteOutscraperMapsSplit(op: OutscraperMapsOp, qty = 1): {
  gross: number;
  cut: number;
  provider: number;
} {
  return outscraperMapsSplit(quoteOutscraperMaps(op, qty));
}

export const OUTSCRAPER_MAPS_CUT_NOTE = `Includes ${OUTSCRAPER_MAPS_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

/** Back-compat alias: CUT_NOTE. */
export const CUT_NOTE = OUTSCRAPER_MAPS_CUT_NOTE;

export function cleanQuery(value: unknown): string {
  return String(value ?? "").trim().slice(0, 500);
}

export function cleanLocation(value: unknown): string {
  return String(value ?? "").trim().slice(0, 500);
}

export function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

export function outscraperMapsKey(): string {
  if (typeof process === "undefined") return "";
  return String(process.env.OUTSCRAPER_API_KEY ?? "").trim();
}

export function outscraperMapsApiBase(): string {
  if (typeof process === "undefined") return OUTSCRAPER_API_BASE_DEFAULT;
  const raw = String(process.env.OUTSCRAPER_API_BASE ?? "").trim().replace(/\/+$/, "");
  if (!raw) return OUTSCRAPER_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return OUTSCRAPER_API_BASE_DEFAULT;
    if (u.origin !== "https://api.app.outscraper.com") return OUTSCRAPER_API_BASE_DEFAULT;
    return raw;
  } catch {
    return OUTSCRAPER_API_BASE_DEFAULT;
  }
}

export function outscraperMapsConfigured(): boolean {
  return outscraperMapsKey().length > 0;
}

/** Least-privilege scope keys for Outscraper Maps (search vs enrich). */
export const OUTSCRAPER_MAPS_SCOPES = ["outscraper-maps:search", "outscraper-maps:read"] as const;

/** Vibe-Code-Worker howto attached to every finished pull. */
export const OUTSCRAPER_MAPS_VCW_HOWTO =
  "VCW howto: set OUTSCRAPER_API_KEY server-side, send X-API-KEY, " +
  "quote with quoteOutscraperMaps(op, qty) before queueing, " +
  "pass query (+ location for maps-search, maps-directions, traffic-extractor, " +
  "reverse-geocode, new-businesses, maps-search-bulk), " +
  "poll the task id, then vault lat/lng + place_id pairs for location games.";
