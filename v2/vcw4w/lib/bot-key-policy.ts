/**
 * Bot API key power-manager policy helpers.
 *
 * CLIENT-SAFE: pure validation + math only. No server imports, so the
 * /bot/setup manager UI can import this directly.
 *
 * Money rule (same as everywhere else on the site): every price includes
 * the 25% platform cut — including log-file storage (see LOG_CUT_PCT and
 * logStorageSplit below).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

// Kept local (not imported from @/lib/bot-auth: that module is server-only
// and must never ship to the browser).
export const BOT_KEY_SCOPES = [
  "clans:read",
  "clans:join",
  "clans:post",
  "clans:comment",
  "clans:report",
  "identity:read",
  "unitunite:read",
  "unitunite:send",
  "code:submit",
  "code:audit",
  "code:review",
  "vault:read",
  "vault:write",
  "vault:share",
  "vault:quarantine",
  "meshy:generate",
  "meshy:read",
  "ai:autosave",
  "ai:read",
] as const;

/** Platform cut INCLUDED in every log-storage charge. Same 25% as everything. */
export const LOG_CUT_PCT = SERVICE_CUT_PCT;

/** 1 Vibe Coin per 100 KiB of stored log bytes, min 0.01 coins per request. */
export const LOG_COINS_PER_BYTE = 1 / 102400;
export const LOG_MIN_COINS = 0.01;
/** Hard cap on stored prompt/output/context text per request (full mode). */
export const LOG_MAX_TEXT_CHARS = 20000;
/** Half mode keeps only this many leading chars as a preview (rest dropped). */
export const LOG_HALF_PREVIEW_CHARS = 500;

export const LOGGING_MODES = ["full", "half", "none"] as const;
export type LoggingMode = (typeof LOGGING_MODES)[number];

export const LOGGING_MODE_META: Record<LoggingMode, { label: string; blurb: string }> = {
  full: {
    label: "Full logging",
    blurb: "Stores prompt, output, context, request + response bodies per call.",
  },
  half: {
    label: "Half logging (default)",
    blurb: "Stores metadata + a short preview. Full prompt/output text is dropped.",
  },
  none: {
    label: "No logging",
    blurb:
      "Compliance minimum only (time, key, route, status, coins, bytes). Nothing viewable, nothing extra stored.",
  },
};

export const IP_MODES = ["disabled", "allowlist", "blocklist"] as const;
export type IpMode = (typeof IP_MODES)[number];

export const MAX_IP_ENTRIES = 50;
export const MAX_USES_CAP = 10_000_000;
export const MAX_BUDGET_COINS = 1_000_000;
export const MAX_EXPIRY_YEARS = 5;

export function isLoggingMode(value: unknown): LoggingMode | "" {
  const v = String(value ?? "").trim().toLowerCase();
  return (LOGGING_MODES as readonly string[]).includes(v) ? (v as LoggingMode) : "";
}

export function isIpMode(value: unknown): IpMode | "" {
  const v = String(value ?? "").trim().toLowerCase();
  return (IP_MODES as readonly string[]).includes(v) ? (v as IpMode) : "";
}

/** Budget in coins: 0 = unlimited. 2dp, 0..1M. */
export function cleanBudgetCoins(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0 || v > MAX_BUDGET_COINS) return -1;
  return Math.round(v * 100) / 100;
}

/** Warn-when-spent percent: 1..100 (default 80). */
export function cleanWarnPct(value: unknown, fallback = 80): number {
  if (value === undefined || value === null || value === "") return fallback;
  const v = Math.floor(Number(value));
  if (!Number.isFinite(v) || v < 1 || v > 100) return -1;
  return v;
}

/** Max uses: 0 = unlimited, 1..10M. */
export function cleanMaxUses(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const v = Math.floor(Number(value));
  if (!Number.isFinite(v) || v < 0 || v > MAX_USES_CAP) return -1;
  return v;
}

/** Expiry ISO string or "" (= never). Must be future, max 5y out. */
export function cleanExpiryIso(value: unknown): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return "";
  const t = Date.parse(String(value));
  if (!Number.isFinite(t)) return null;
  const now = Date.now();
  if (t <= now) return null;
  if (t > now + MAX_EXPIRY_YEARS * 365.25 * 24 * 3600 * 1000) return null;
  return new Date(t).toISOString();
}

/** Low-balance floor in coins (>= 0). The hard-stop guard trips when the
 *  owner's balance falls to floor + (pct% of floor) or below. */
export function cleanLowBalanceFloor(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0 || v > MAX_BUDGET_COINS) return -1;
  return Math.round(v * 100) / 100;
}

/** Bottom-band percent: 0..100 (default 10). 10 = "stop when the balance is
 *  within the bottom 10% above the floor number". */
export function cleanLowBalancePct(value: unknown, fallback = 10): number {
  if (value === undefined || value === null || value === "") return fallback;
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0 || v > 100) return -1;
  return Math.round(v * 100) / 100;
}

/** Trip line for the hard-stop guard: floor + pct% of floor. */
export function lowBalanceTripLine(floorCoins: number, pct: number): number {
  const f = Math.max(0, floorCoins || 0);
  const p = Math.max(0, Math.min(100, pct || 0));
  return Math.round((f + (f * p) / 100) * 100) / 100;
}

function isIpv4(s: string): boolean {
  const parts = s.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function isIpv6(s: string): boolean {
  if (!/^[0-9a-f:.%]+$/i.test(s)) return false;
  return s.includes(":");
}

/** Single IP / CIDR entry validation. Accepts v4, v6, and v4 CIDR (/8-/32). */
export function cleanIpEntry(value: unknown): string {
  const v = String(value ?? "").trim();
  if (!v || v.length > 64) return "";
  const slash = v.indexOf("/");
  if (slash >= 0) {
    const base = v.slice(0, slash);
    const bits = Number(v.slice(slash + 1));
    if (!isIpv4(base) || !Number.isInteger(bits) || bits < 8 || bits > 32) return "";
    return v;
  }
  if (isIpv4(v) || isIpv6(v)) return v;
  return "";
}

/** Multiline/comma input -> deduped list (max 50). Returns null when invalid. */
export function cleanIpList(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value)
    ? value.map((v) => String(v))
    : String(value).split(/[\s,;]+/);
  const out: string[] = [];
  for (const part of raw) {
    const t = part.trim();
    if (!t) continue;
    const clean = cleanIpEntry(t);
    if (!clean) return null;
    if (!out.includes(clean)) out.push(clean);
    if (out.length > MAX_IP_ENTRIES) return null;
  }
  return out;
}

function ipv4ToInt(ip: string): number | null {
  if (!isIpv4(ip)) return null;
  const p = ip.split(".").map(Number);
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

/** Exact match, or IPv4 CIDR subnet match. IPv6 matches exactly only. */
export function ipMatchesList(ip: string, list: string[]): boolean {
  const needle = ip.trim();
  for (const entry of list) {
    if (entry === needle) return true;
    const slash = entry.indexOf("/");
    if (slash > 0) {
      const base = ipv4ToInt(entry.slice(0, slash));
      const addr = ipv4ToInt(needle);
      const bits = Number(entry.slice(slash + 1));
      if (base === null || addr === null || !Number.isInteger(bits)) continue;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      if ((base & mask) === (addr & mask)) return true;
    }
  }
  return false;
}

/** Allowlist: ip MUST be listed. Blocklist: ip must NOT be listed. */
export function isIpAllowed(ip: string, mode: IpMode, allow: string[], block: string[]): boolean {
  if (mode === "allowlist") return allow.length > 0 && ipMatchesList(ip, allow);
  if (mode === "blocklist") return !ipMatchesList(ip, block);
  return true;
}

/** Subset of BOT_SCOPES (empty/omitted = all scopes). Null when invalid. */
export function cleanScopesSubset(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  const arr = Array.isArray(value) ? value : String(value).split(/[,\s]+/).filter(Boolean);
  const allowed = new Set<string>(BOT_KEY_SCOPES as readonly string[]);
  const out: string[] = [];
  for (const s of arr) {
    const t = String(s).trim();
    if (!t) continue;
    if (!allowed.has(t)) return null;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

/** Log-storage charge for one request (gross, cut INCLUDED at 25%). */
export function logStorageSplit(bytes: number): { gross: number; cut: number; kept: number; bytes: number } {
  const b = Math.max(0, Math.floor(bytes || 0));
  const gross = Math.max(LOG_MIN_COINS, Math.round(b * LOG_COINS_PER_BYTE * 100) / 100);
  const cut = Math.round((gross * LOG_CUT_PCT) / 100 * 100) / 100;
  return { gross, cut, kept: Math.round((gross - cut) * 100) / 100, bytes: b };
}

/** Spend-limit state for meter display: pct of budget consumed. */
export function budgetPct(spent: number, budget: number): number {
  if (!budget || budget <= 0) return 0;
  return Math.min(999, Math.round(((spent || 0) / budget) * 1000) / 10);
}
