/**
 * Outscraper lead/enrichment compatibility - handled purely through the API.
 *
 * Real services mirrored from https://outscraper.com/services/ (base
 * https://api.app.outscraper.com, auth header X-API-KEY):
 *   1. emails-scrape   - Emails & Contacts scraper (domain -> emails/phones/socials)
 *   2. domain-contacts - Domain Emails & Contacts API (bulk domain enrichment)
 *   3. email-validate  - Email Address Validator (single address syntax + deliverability)
 *   4. email-clean     - Bulk Email List Cleaning (list hygiene before outreach)
 *   5. phones-enrich   - Phone enrichment from place/contact records
 *   6. b2b-database    - B2B Lead Generation Database (firmographic filters)
 *   7. lead-services   - Done-For-You Lead Generation Services (managed request)
 *   8. crm-export      - local CSV/CRM-shaped export of enriched leads (no API call)
 *
 * EasyDNC composition: `email-validate` checks that an address is real and
 * deliverable; it does NOT check do-not-call registries. Pair it with the
 * existing GET /api/easydnc/check?number=<phone> convention (see
 * v2/vcw4w/app/api/easydnc/check/route.ts) for phone-side DNC screening:
 * validate emails via Outscraper first, then screen any attached phone
 * numbers via /api/easydnc/check before outreach. This module never
 * duplicates the EasyDNC check - it only cleans/validates the email side.
 *
 * Server key: OUTSCRAPER_API_KEY (server-only, never NEXT_PUBLIC_). Base
 * override: OUTSCRAPER_API_BASE (default https://api.app.outscraper.com).
 * Docs: https://outscraper.com/services/ + API docs (X-API-KEY header).
 *
 * Client-safe: constants + quotes render in the browser; key helpers read
 * server env only (browser gets "" -> unconfigured UI).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

export const OUTSCRAPER_LEADS_CUT_PCT =
  typeof SERVICE_CUT_PCT === "number" ? SERVICE_CUT_PCT : 25;
export const OUTSCRAPER_API_BASE_DEFAULT = "https://api.app.outscraper.com";

export const OUTSCRAPER_LEADS_OP_KEYS = [
  "emails-scrape",
  "domain-contacts",
  "email-validate",
  "email-clean",
  "phones-enrich",
  "b2b-database",
  "lead-services",
  "crm-export",
] as const;
export type OutscraperLeadsOp = (typeof OUTSCRAPER_LEADS_OP_KEYS)[number];

export function isOutscraperLeadsOp(value: unknown): value is OutscraperLeadsOp {
  return (
    typeof value === "string" &&
    (OUTSCRAPER_LEADS_OP_KEYS as readonly string[]).includes(value)
  );
}

export type OutscraperLeadsOpDef = {
  op: OutscraperLeadsOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Cheapest viable Outscraper mode (preselected default). */
  mode: string;
  /** Newest viable API path this op calls ("local" = no API call). */
  api: string;
  needsQuery: boolean;
  needsLocation: boolean;
};

export const OUTSCRAPER_LEADS_OPS: OutscraperLeadsOpDef[] = [
  {
    op: "emails-scrape",
    name: "Emails & Contacts Scrape",
    unit: "1k_records",
    coinsPerUnit: 8,
    blurb:
      "Outscraper Emails & Contacts scraper: domain in, emails/phones/socials out.",
    mode: "domains-bulk",
    api: "GET /v3/emails-and-contacts",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "domain-contacts",
    name: "Domain Contacts Enrich",
    unit: "1k_records",
    coinsPerUnit: 10,
    blurb:
      "Outscraper Domain Emails & Contacts API: bulk domain enrichment per company.",
    mode: "domain-batch",
    api: "GET /v3/domain-emails-and-contacts",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "email-validate",
    name: "Email Validate",
    unit: "email",
    coinsPerUnit: 2,
    blurb:
      "Outscraper Email Address Validator: single-address deliverability check; pair with /api/easydnc/check for phone DNC.",
    mode: "single-check",
    api: "GET /v3/email-validator",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "email-clean",
    name: "Email List Clean",
    unit: "list",
    coinsPerUnit: 12,
    blurb:
      "Outscraper Bulk Email List Cleaning: list hygiene pass before outreach.",
    mode: "bulk-clean",
    api: "POST /v3/bulk-email-clean",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "phones-enrich",
    name: "Phones Enrich",
    unit: "1k_records",
    coinsPerUnit: 6,
    blurb:
      "Outscraper phone enrichment: fresh numbers from place/contact records.",
    mode: "phones-bulk",
    api: "GET /v3/phone-enrichment",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "b2b-database",
    name: "B2B Database Search",
    unit: "1k_records",
    coinsPerUnit: 9,
    blurb:
      "Outscraper B2B Lead Generation Database: firmographic-filtered company leads.",
    mode: "firmographic-filters",
    api: "GET /v3/b2b-search",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "lead-services",
    name: "Managed Lead Services",
    unit: "list",
    coinsPerUnit: 12,
    blurb:
      "Outscraper Done-For-You Lead Generation Services: managed request, delivered lead list.",
    mode: "managed-request",
    api: "POST /v3/lead-services-request",
    needsQuery: true,
    needsLocation: false,
  },
  {
    op: "crm-export",
    name: "CRM Export",
    unit: "export",
    coinsPerUnit: 3,
    blurb:
      "Local CSV/CRM-shaped export of enriched leads; no Outscraper API call.",
    mode: "csv-shape",
    api: "local",
    needsQuery: true,
    needsLocation: false,
  },
];

export function opByKey(op: OutscraperLeadsOp): OutscraperLeadsOpDef {
  const found = OUTSCRAPER_LEADS_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown outscraper-leads op: ${op}`);
  return found;
}

export function outscraperLeadsSplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut =
    Math.round(((gross * OUTSCRAPER_LEADS_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

export function quoteOutscraperLeads(op: OutscraperLeadsOp, qty = 1): number {
  const rate = opByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteOutscraperLeadsSplit(
  op: OutscraperLeadsOp,
  qty = 1,
): {
  gross: number;
  cut: number;
  provider: number;
} {
  return outscraperLeadsSplit(quoteOutscraperLeads(op, qty));
}

export const OUTSCRAPER_LEADS_CUT_NOTE = `Includes ${OUTSCRAPER_LEADS_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

/** Normalize a domain for scrape/enrich ops: lowercase, strip scheme/path. */
export function cleanDomain(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  const host = raw
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .split(/[\s/?#]/)[0]
    .replace(/^www\./, "");
  return host.slice(0, 253);
}

/** True when the value looks like a usable domain for Outscraper ops. */
export function isValidDomain(value: unknown): boolean {
  const d = cleanDomain(value);
  if (!d || d.length < 3 || d.length > 253) return false;
  if (!d.includes(".")) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d);
}

/** Normalize an email for validate/clean ops: lowercase, trim, length-cap. */
export function cleanEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 320);
}

export function outscraperLeadsKey(): string {
  if (typeof process === "undefined") return "";
  return String(process.env.OUTSCRAPER_API_KEY ?? "").trim();
}

export function outscraperLeadsBase(): string {
  if (typeof process === "undefined") return OUTSCRAPER_API_BASE_DEFAULT;
  const raw = String(process.env.OUTSCRAPER_API_BASE ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!raw) return OUTSCRAPER_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return OUTSCRAPER_API_BASE_DEFAULT;
    if (u.origin !== "https://api.app.outscraper.com")
      return OUTSCRAPER_API_BASE_DEFAULT;
    return raw;
  } catch {
    return OUTSCRAPER_API_BASE_DEFAULT;
  }
}

export function outscraperLeadsConfigured(): boolean {
  return outscraperLeadsKey().length > 0;
}

/** Least-privilege scope keys for Outscraper leads (enrich vs export). */
export const OUTSCRAPER_LEADS_SCOPES = [
  "outscraper:enrich",
  "outscraper:export",
] as const;

/** VCW outreach howto attached to every finished lead job. */
export function outscraperLeadsVcwHowto(input: {
  op?: OutscraperLeadsOp;
  count?: number;
}): string[] {
  const tips: string[] = [];
  tips.push("Validate emails (email-validate) before any outreach send.");
  tips.push(
    "Screen attached phone numbers via GET /api/easydnc/check?number=<phone> - EasyDNC owns DNC, this module owns email hygiene.",
  );
  if (input.op === "crm-export")
    tips.push("Re-import the CSV to /vcw to attach leads to a campaign.");
  const count = Number(input.count ?? 0);
  if (count > 1000)
    tips.push("Over 1k records; run email-clean before exporting to the CRM.");
  tips.push("Review quotes on /vcw before queueing the next enrichment batch.");
  return tips;
}
