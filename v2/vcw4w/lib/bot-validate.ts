/**
 * Local validation helpers for the bot platform. Supplements @/lib/validate
 * (isSlug, isUuid, clampLimit, clientIp) without touching it.
 */

import { isSlug } from "@/lib/validate";

export { isSlug };

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

export const REPORT_TARGETS = ["clan", "post", "comment"] as const;
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
