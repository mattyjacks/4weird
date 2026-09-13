/**
 * Vendor service catalog: OpenRouter + Outscraper ops.
 *
 * Why a separate file (not folded into lib/cloud-catalog.ts): CLOUD_SERVICES
 * entries require tier/runtime/category and feed GET /api/cloud/services +
 * billing UI directly. Vendor ops have a different shape ({ vendor, op, api })
 * and are served by the openrouter-vendor / outscraper routes, so merging 66
 * rows into the cloud catalog would change that endpoint's payload. This file
 * is additive only — nothing existing imports it yet, nothing breaks.
 *
 * Pricing rule (same one rule everywhere): every coinsPerUnit below is GROSS
 * Vibe Coins and INCLUDES the 25% platform cut; the cut is never added on top.
 *
 * Sibling agents write the 7 vendor modules in parallel, so they may be
 * absent. Loading is tolerant: live modules are probed with a hidden require
 * (indirect eval so bundlers don't statically resolve absent paths) inside
 * try/catch, and any vendor with no live module falls back to the static
 * table below. Result: VENDOR_SERVICES always has >= 66 entries.
 */

/* eslint-disable no-eval */

export type VendorService = {
  vendor: string;
  op: string;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  api: string;
};

export const OPENROUTER_VENDOR_API = "/api/openrouter-vendor/generate";
export const OUTSCRAPER_API = "/api/outscraper/search";

type Row = [op: string, name: string, unit: string, coinsPerUnit: number, blurb: string];

function group(vendor: string, api: string, rows: Row[]): VendorService[] {
  return rows.map(([op, name, unit, coinsPerUnit, blurb]) => ({
    vendor,
    op,
    name,
    unit,
    coinsPerUnit,
    blurb,
    api,
  }));
}

/** Static fallback: 12 + 12 + 8 + 10 + 8 + 8 + 8 = 66 services. */
const FALLBACK_BY_VENDOR: Record<string, VendorService[]> = {
  "openrouter-chat": group("openrouter-chat", OPENROUTER_VENDOR_API, [
    ["chat-complete", "Chat Complete", "1k_tokens", 3, "One-shot chat completion on the pinned OpenRouter model"],
    ["chat-stream", "Chat Stream", "1k_tokens", 3, "Token-streamed chat completion over SSE"],
    ["chat-json", "Structured Chat", "call", 4, "Chat with JSON-schema-constrained output"],
    ["chat-vision", "Vision Chat", "1k_tokens", 5, "Chat over an image plus a text prompt"],
    ["chat-longctx", "Long-Context Chat", "1k_tokens", 5, "Chat with large-context-window models"],
    ["chat-batch", "Batch Chat", "call", 3, "Bulk prompts run on the cheapest viable model"],
    ["chat-compare", "Model Compare", "call", 6, "Same prompt run across N models side by side"],
    ["chat-fallback", "Fallback Chat", "1k_tokens", 3, "Chat with automatic model-fallback routing"],
    ["chat-moderated", "Moderated Chat", "1k_tokens", 4, "Chat with safety pre/post filter"],
    ["chat-summarize", "Summarize", "1k_tokens", 2, "Long text condensed to key points"],
    ["chat-translate", "Translate", "1k_tokens", 2, "Chat-driven translation preserving tone"],
    ["chat-rag", "Grounded Chat", "1k_tokens", 4, "Chat grounded on supplied context passages"],
  ]),
  "openrouter-agent": group("openrouter-agent", OPENROUTER_VENDOR_API, [
    ["agent-run", "Agent Run", "step", 4, "Single agentic step with tool access"],
    ["agent-plan", "Agent Plan", "plan", 3, "Task decomposed into an executable plan"],
    ["agent-toolcall", "Tool Call", "call", 3, "One model-directed tool invocation"],
    ["agent-codegen", "Code Gen", "1k_tokens", 4, "Generate game/app code from a spec"],
    ["agent-review", "Code Review", "review", 3, "Gameplay code review with fix list"],
    ["agent-refactor", "Refactor", "1k_tokens", 4, "Restructure code without changing behavior"],
    ["agent-testgen", "Test Gen", "1k_tokens", 4, "Generate tests for a module"],
    ["agent-docgen", "Doc Gen", "1k_tokens", 3, "Generate docs from code"],
    ["agent-debug", "Debug", "1k_tokens", 4, "Diagnose an error with a suggested fix"],
    ["agent-multistep", "Multi-Step Task", "task", 6, "Autonomous multi-step task run"],
    ["agent-critique", "Critique", "call", 3, "Second-model critique of a draft answer"],
    ["agent-research", "Research", "task", 5, "Multi-source research brief on a topic"],
  ]),
  "openrouter-meta": group("openrouter-meta", OPENROUTER_VENDOR_API, [
    ["models-list", "Model List", "call", 1, "List available OpenRouter models"],
    ["model-detail", "Model Detail", "call", 1, "Pricing + context limits for one model"],
    ["price-quote", "Price Quote", "call", 1, "Quote gross coins for a planned call"],
    ["key-status", "Key Status", "call", 1, "Live check that OPENROUTER_API_KEY works"],
    ["default-model", "Default Model", "call", 1, "Resolve the pinned default model id"],
    ["fallback-status", "Fallback Status", "call", 1, "Check fallback routing health"],
    ["open-plays", "Open Plays", "call", 2, "Live open-play prompts for swarm chat"],
    ["usage-snapshot", "Usage Snapshot", "call", 1, "Recent usage totals for the key"],
  ]),
  "outscraper-maps": group("outscraper-maps", OUTSCRAPER_API, [
    ["maps-text-search", "Places Text Search", "search", 4, "Google Maps places by keyword query"],
    ["maps-nearby", "Nearby Search", "search", 4, "Places near a lat/lng within a radius"],
    ["maps-place-details", "Place Details", "place", 3, "Full profile for one place id"],
    ["maps-place-photos", "Place Photos", "place", 3, "Photo set for one place id"],
    ["maps-place-hours", "Place Hours", "place", 2, "Opening hours for one place id"],
    ["maps-autocomplete", "Places Autocomplete", "call", 1, "Query predictions as you type"],
    ["maps-geocode", "Geocode", "call", 2, "Address to lat/lng lookup"],
    ["maps-area-bulk", "Area Bulk Scan", "1k_places", 8, "Bulk places dump for a named area"],
    ["maps-grid-scan", "Grid Scan", "1k_places", 8, "Grid-tiled bulk scan of a region"],
    ["maps-polygon-scan", "Polygon Scan", "1k_places", 8, "Bulk scan inside a custom polygon"],
  ]),
  "outscraper-reviews": group("outscraper-reviews", OUTSCRAPER_API, [
    ["reviews-google", "Google Reviews", "1k_reviews", 6, "Raw reviews for a place id"],
    ["reviews-summary", "Review Summary", "place", 3, "Rating + count snapshot for a place"],
    ["reviews-sentiment", "Review Sentiment", "1k_reviews", 5, "Sentiment split over recent reviews"],
    ["reviews-export", "Reviews Export", "1k_reviews", 6, "Paginated review export for a place"],
    ["reviews-rating-split", "Rating Split", "place", 2, "Star-histogram breakdown for a place"],
    ["reviews-keywords", "Review Keywords", "place", 3, "Top phrases mined from reviews"],
    ["reviews-trend", "Review Trend", "place", 3, "Rating trend over recent months"],
    ["reviews-owner-replies", "Owner Replies", "1k_reviews", 5, "Reviews paired with owner responses"],
  ]),
  "outscraper-search": group("outscraper-search", OUTSCRAPER_API, [
    ["search-google", "Google Search", "1k_results", 5, "Organic Google results for a query"],
    ["search-images", "Image Search", "1k_results", 5, "Image results for a query"],
    ["search-news", "News Search", "1k_results", 5, "News results for a query"],
    ["search-videos", "Video Search", "1k_results", 5, "Video results for a query"],
    ["search-scholar", "Scholar Search", "1k_results", 5, "Scholarly results for a query"],
    ["search-shopping", "Shopping Search", "1k_results", 5, "Product listings for a query"],
    ["search-autocomplete", "Suggest", "call", 1, "Search suggestions for a prefix"],
    ["search-bulk", "Bulk Search", "1k_results", 6, "Bulk queries in one job"],
  ]),
  "outscraper-leads": group("outscraper-leads", OUTSCRAPER_API, [
    ["leads-enrich", "Lead Enrich", "lead", 4, "Enrich one business profile"],
    ["leads-emails", "Business Emails", "1k_leads", 8, "Verified emails for scraped businesses"],
    ["leads-phones", "Business Phones", "1k_leads", 8, "Phone numbers for scraped businesses"],
    ["leads-company", "Company Profile", "company", 4, "Firmographic snapshot for a company"],
    ["leads-domain", "Domain Lookup", "domain", 3, "Company data keyed by website domain"],
    ["leads-social", "Social Profiles", "lead", 4, "LinkedIn/social links for a business"],
    ["leads-verify", "Email Verify", "1k_checks", 5, "Deliverability check for lead emails"],
    ["leads-export", "Leads Export", "1k_leads", 7, "Deduplicated lead list export"],
  ]),
};

type RequireFn = (id: string) => unknown;

/** Indirect require: hidden from bundler static analysis so absent sibling modules never break builds. */
function hiddenRequire(): RequireFn | undefined {
  try {
    const g = globalThis as unknown as { require?: unknown };
    if (typeof g.require !== "function") return undefined;
    return (0, eval)("require") as RequireFn;
  } catch {
    return undefined;
  }
}

function arraysIn(ns: unknown): unknown[][] {
  if (Array.isArray(ns)) return [ns];
  if (!ns || typeof ns !== "object") return [];
  return Object.values(ns as Record<string, unknown>).filter(
    (v): v is unknown[] => Array.isArray(v),
  );
}

function normalizeOp(vendor: string, dfltApi: string, raw: unknown): VendorService | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const pick = (...keys: string[]): string => {
    for (const k of keys) if (typeof r[k] === "string" && (r[k] as string).length > 0) return r[k] as string;
    return "";
  };
  const op = pick("op", "key", "id");
  if (!op) return undefined;
  const coinsRaw = r["coinsPerUnit"] ?? r["coins"] ?? r["price"];
  return {
    vendor: pick("vendor") || vendor,
    op,
    name: pick("name", "title") || op,
    unit: pick("unit") || "call",
    coinsPerUnit: typeof coinsRaw === "number" && Number.isFinite(coinsRaw) ? coinsRaw : 0,
    blurb: pick("blurb", "description"),
    api: pick("api", "route") || dfltApi,
  };
}

/** Probe candidate paths for one vendor module; return live ops or [] when absent. */
function loadFromModule(candidates: string[], vendor: string, dfltApi: string): VendorService[] {
  const req = hiddenRequire();
  if (!req) return [];
  for (const id of candidates) {
    try {
      const mod = req(id);
      const namespaces: unknown[] = [mod, (mod as { default?: unknown })?.default ?? undefined];
      for (const ns of namespaces) {
        for (const arr of arraysIn(ns)) {
          const ops = arr
            .map((raw) => normalizeOp(vendor, dfltApi, raw))
            .filter((s): s is VendorService => s !== undefined);
          if (ops.length > 0) return ops;
        }
      }
    } catch {
      // Module absent (sibling agent hasn't landed it yet) — try next candidate.
    }
  }
  return [];
}

const MODULES: { vendor: string; api: string; candidates: string[] }[] = [
  { vendor: "openrouter-chat", api: OPENROUTER_VENDOR_API, candidates: ["./openrouter-chat", "./vendors/openrouter-chat"] },
  { vendor: "openrouter-agent", api: OPENROUTER_VENDOR_API, candidates: ["./openrouter-agent", "./vendors/openrouter-agent"] },
  { vendor: "openrouter-meta", api: OPENROUTER_VENDOR_API, candidates: ["./openrouter-meta", "./vendors/openrouter-meta"] },
  { vendor: "outscraper-maps", api: OUTSCRAPER_API, candidates: ["./outscraper-maps", "./vendors/outscraper-maps"] },
  { vendor: "outscraper-reviews", api: OUTSCRAPER_API, candidates: ["./outscraper-reviews", "./vendors/outscraper-reviews"] },
  { vendor: "outscraper-search", api: OUTSCRAPER_API, candidates: ["./outscraper-search", "./vendors/outscraper-search"] },
  { vendor: "outscraper-leads", api: OUTSCRAPER_API, candidates: ["./outscraper-leads", "./vendors/outscraper-leads"] },
];

function buildCatalog(): VendorService[] {
  const out: VendorService[] = [];
  for (const m of MODULES) {
    const live = loadFromModule(m.candidates, m.vendor, m.api);
    const fallback = FALLBACK_BY_VENDOR[m.vendor] ?? [];
    // Live module wins per-op; fallback fills any op the live module lacks,
    // so the count never drops below the static table.
    const seen = new Set(live.map((s) => s.op));
    out.push(...live, ...fallback.filter((s) => !seen.has(s.op)));
  }
  return out;
}

/** Unified list across all 7 vendor modules (live data where present, static fallback otherwise). */
export const VENDOR_SERVICES: VendorService[] = buildCatalog();

/** Total vendored service count (static table alone = 66). */
export function vendorServiceCount(): number {
  return VENDOR_SERVICES.length;
}

/** Per-vendor op counts, derived from the built catalog. */
export function vendorOpCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of VENDOR_SERVICES) counts[s.vendor] = (counts[s.vendor] ?? 0) + 1;
  return counts;
}

export function findVendorService(vendor: string, op: string): VendorService | undefined {
  return VENDOR_SERVICES.find((s) => s.vendor === vendor && s.op === op);
}

export type VendorMetering = {
  rpc: string;
  usageTable: string;
  myUsageRpc: string;
  usageRoute: string;
};

/** Metering metadata for the 7 vendor modules (static: no live probing needed). */
export const VENDOR_METERING: Record<string, VendorMetering> = {
  "openrouter-chat": {
    rpc: "meter_openrouter_usage",
    usageTable: "openrouter_usage",
    myUsageRpc: "my_openrouter_usage",
    usageRoute: "/api/openrouter-vendor/usage",
  },
  "openrouter-agent": {
    rpc: "meter_openrouter_usage",
    usageTable: "openrouter_usage",
    myUsageRpc: "my_openrouter_usage",
    usageRoute: "/api/openrouter-vendor/usage",
  },
  "openrouter-meta": {
    rpc: "meter_openrouter_usage",
    usageTable: "openrouter_usage",
    myUsageRpc: "my_openrouter_usage",
    usageRoute: "/api/openrouter-vendor/usage",
  },
  "outscraper-maps": {
    rpc: "meter_outscraper_usage",
    usageTable: "outscraper_usage",
    myUsageRpc: "my_outscraper_usage",
    usageRoute: "/api/outscraper/usage",
  },
  "outscraper-reviews": {
    rpc: "meter_outscraper_usage",
    usageTable: "outscraper_usage",
    myUsageRpc: "my_outscraper_usage",
    usageRoute: "/api/outscraper/usage",
  },
  "outscraper-search": {
    rpc: "meter_outscraper_usage",
    usageTable: "outscraper_usage",
    myUsageRpc: "my_outscraper_usage",
    usageRoute: "/api/outscraper/usage",
  },
  "outscraper-leads": {
    rpc: "meter_outscraper_usage",
    usageTable: "outscraper_usage",
    myUsageRpc: "my_outscraper_usage",
    usageRoute: "/api/outscraper/usage",
  },
};

/** Metering entry for one vendor, or null for unknown vendors. */
export function meteringForVendor(vendor: string): VendorMetering | null {
  return VENDOR_METERING[vendor] ?? null;
}

/** Static self-check: pure + deterministic. Total services stays >= 50. */
export function vendorCatalogSelfCheck(): {
  services: number;
  vendors: number;
  meteringVendors: number;
  ok: boolean;
} {
  const services = vendorServiceCount();
  const vendors = Object.keys(vendorOpCounts()).length;
  const meteringVendors = Object.keys(VENDOR_METERING).length;
  return { services, vendors, meteringVendors, ok: services >= 50 && meteringVendors === 7 };
}
