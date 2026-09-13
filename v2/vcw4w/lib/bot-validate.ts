/**
 * Local validation helpers for the bot platform. Supplements @/lib/validate
 * (isSlug, isUuid, clampLimit, clientIp) without touching it.
 */

import { isSlug } from "@/lib/validate";

export { isSlug };

/**
 * Clan slug normalizer for the bot bclans API. Clan slugs are stored
 * lowercase (see the create_clan RPC), and the human clan routes lowercase
 * before validating; so `Game-Dev` must resolve the same as `game-dev`
 * instead of failing with a 400. Returns "" when invalid.
 */
export function botClanSlug(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,64}$/.test(v) ? v : "";
}

export function isBotUsername(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9_]{3,24}$/.test(v) ? v : "";
}

export function cleanKeyLabel(value: unknown): string {
  const v = String(value ?? "").trim().slice(0, 40);
  return v.length >= 1 ? v : "";
}

export function cleanPostTitle(value: unknown): string {
  const v = String(value ?? "").trim().slice(0, 120);
  return v.length >= 1 ? v : "";
}

export function cleanPostBody(value: unknown): string {
  const v = String(value ?? "").trim().slice(0, 5000);
  return v.length >= 1 ? v : "";
}

export function cleanCommentBody(value: unknown): string {
  const v = String(value ?? "").trim().slice(0, 2000);
  return v.length >= 1 ? v : "";
}

export function cleanReportDetails(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const v = String(value).trim().slice(0, 1000);
  return v;
}

export function isImageUrl(value: unknown): boolean {
  const v = String(value ?? "").trim();
  if (v.length < 8 || v.length > 2048) return false;
  if (/\s/.test(v)) return false;
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v);
}

/**
 * Bot-posted images must be clan-images URLs issued by our own upload route
 * (same rule as the human clan UI). Rendered in <img> tags, an arbitrary
 * external URL would be a tracking beacon; javascript:/data: never passes.
 */
export function isOwnClanImageUrl(value: unknown, supabaseBase: string): boolean {
  const u = String(value ?? "").trim();
  if (!u || u.length > 2000) return false;
  // https only: http would allow mixed-content + beacon injection.
  if (!u.startsWith("https://")) return false;
  const base = (supabaseBase ?? "").trim();
  // Fail closed when the base URL is unconfigured; regex-only fallback on
  // any host previously accepted http://evil.com/.../clan-images/...
  if (!base) return false;
  try {
    const parsed = new URL(u);
    const baseHost = new URL(base).host;
    if (!baseHost || parsed.host !== baseHost) return false;
    // Pathname only (never pathname + search): a query string must not be
    // able to smuggle the bucket marker in (?x=/storage/v1/.../clan-images/).
    const p = parsed.pathname;
    return (
      p.startsWith("/storage/v1/object/public/clan-images/") ||
      p.startsWith("/storage/v1/object/clan-images/")
    );
  } catch {
    return false;
  }
}

export const REPORT_TARGETS = ["clan", "post", "comment", "image"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export function isReportTarget(value: unknown): value is ReportTarget {
  return (REPORT_TARGETS as readonly string[]).includes(String(value ?? ""));
}

export const REPORT_CATEGORIES = [
  "spam",
  "harassment",
  "nsfw",
  "cheating",
  "copyright",
  "csam",
  "other",
] as const;

export function isReportCategory(value: unknown): boolean {
  return (REPORT_CATEGORIES as readonly string[]).includes(String(value ?? ""));
}

export function cleanTargetId(value: unknown): string {
  const v = String(value ?? "").trim().slice(0, 256);
  return v.length >= 1 ? v : "";
}

/**
 * Basic automated moderation (there is no @/lib/moderation module, so bot
 * content is triaged here): returns true when a post should land in
 * `pending` for human review instead of going straight to `published`.
 */
export function looksSpammy(title: string, body: string): boolean {
  const text = `${title}\n${body}`;
  const urls = text.match(/https?:\/\//gi) ?? [];
  if (urls.length > 2) return true;
  if (/(.)\1{9,}/.test(text)) return true; // e.g. "aaaaaaa…"
  if (text.length > 200 && text === text.toUpperCase() && /[A-Z]{4,}/.test(text)) return true;
  if (/free\s+(coins|money|crypto|v-?bucks)|click\s+here|earn\s+\$\$\$/i.test(text)) return true;
  return false;
}
