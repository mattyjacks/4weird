/**
 * EasyDNC Telephony Compliance, Normalization & Economic Core for 4weird.
 *
 * Rules:
 *  1. 100 Vibe Coins (🪙) = exactly $1.00 USD. Rate per lookup = 2.5 🪙 ($0.025 USD).
 *  2. 25% Platform Cut: 0.625 🪙 ($0.00625 USD) platform compute cut; 75% provider share (1.875 🪙).
 *  3. FTC Telemarketing Sales Rule (TSR, 16 CFR § 310.4(b)(3)(iv)):
 *     Safe Harbor requires list scrubbing at least every 31 days. Weekly (7-day) scrubbing recommended.
 *  4. Real Civil Fines:
 *     - FTC TSR Civil Penalty: Up to $51,744 PER CALL / VIOLATION.
 *     - TCPA Statutory Damages: $500 to $1,500 PER CALL.
 *  5. Strict formula injection defusing (OWASP CSV standard) on all exports.
 */

import { createHash } from "crypto";

export const EASYDNC_API_ENDPOINT = "https://www.easydnc.org/api/check_dnc.php";
export const EASYDNC_COST_PER_CHECK_COINS = 2.50; // 2.5 Vibe Coins ($0.025 USD)
export const EASYDNC_PLATFORM_CUT_PCT = 25; // 25% platform cut

// Statutory legal penalties & time limits
export const FTC_TSR_MAX_FINE_PER_CALL = 51744; // Up to $51,744 per violation
export const TCPA_STATUTORY_FINE_MIN = 500;     // $500 per violation
export const TCPA_STATUTORY_FINE_MAX = 1500;    // $1,500 per willful violation
export const SAFE_HARBOR_DAYS = 31;            // 31-day FTC safe harbor expiration
export const RECOMMENDED_SCRUB_DAYS = 7;       // Weekly scrub recommendation

export interface EasyDncCostCalculation {
  totalNumbers: number;
  grossCoins: number;
  cutCoins: number;
  providerCoins: number;
  grossUsd: string;
  cutUsd: string;
  providerUsd: string;
}

/**
 * Calculates Vibe Coin cost and platform cut for a given number count.
 */
export function calculateEasyDncCost(totalNumbers: number): EasyDncCostCalculation {
  const count = Math.max(0, Math.floor(totalNumbers));
  const grossCoins = Math.round(count * EASYDNC_COST_PER_CHECK_COINS * 100) / 100;
  const cutCoins = Math.round(grossCoins * (EASYDNC_PLATFORM_CUT_PCT / 100) * 100) / 100;
  const providerCoins = Math.round((grossCoins - cutCoins) * 100) / 100;

  return {
    totalNumbers: count,
    grossCoins,
    cutCoins,
    providerCoins,
    grossUsd: (grossCoins / 100).toFixed(2),
    cutUsd: (cutCoins / 100).toFixed(4),
    providerUsd: (providerCoins / 100).toFixed(4),
  };
}

/**
 * Normalizes a raw phone string into a valid 10-digit North American Numbering Plan (NANP) format.
 * Strips all non-digit characters and removes optional leading "1" country code.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw new Error("Phone number must be a non-empty string.");
  }

  const digits = raw.replace(/\D/g, "");

  // If 11 digits and starts with country code 1, strip it
  let clean = digits;
  if (digits.length === 11 && digits.startsWith("1")) {
    clean = digits.substring(1);
  }

  if (clean.length !== 10) {
    throw new Error(`Invalid phone length for "${raw}": expected 10 US digits, got ${clean.length}.`);
  }

  const areaCodeFirst = parseInt(clean[0], 10);
  const exchangeFirst = parseInt(clean[3], 10);

  // NANP rules: area code and central office exchange cannot start with 0 or 1
  if (areaCodeFirst < 2 || exchangeFirst < 2) {
    throw new Error(`Invalid NANP area code or exchange in "${raw}". Area codes and exchanges cannot start with 0 or 1.`);
  }

  return clean;
}

/**
 * Safe CSV cell sanitizer to eliminate spreadsheet formula injection (CVE CSV injection).
 * Defuses `=cmd`, `+`, `-`, `@`, `\t`, `\r`.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  const trimmed = str.trim();

  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  const defused = formulaTriggers.includes(trimmed.charAt(0)) ? `'${trimmed}` : trimmed;

  // Double quotes escaped as per RFC 4180
  return `"${defused.replace(/"/g, '""')}"`;
}

/**
 * Generates an immutable SHA-256 fingerprint for a batch of phone numbers.
 */
export function generateBatchHash(numbers: string[]): string {
  const sorted = [...numbers].sort();
  return createHash("sha256").update(sorted.join("\n")).digest("hex");
}

/**
 * Evaluates whether a phone number's DNC check is currently active under the FTC 31-day Safe Harbor rule.
 */
export function evaluateSafeHarborStatus(checkedAt: string | Date | null | undefined): {
  active: boolean;
  daysElapsed: number;
  daysRemaining: number;
  isExpiringSoon: boolean;
  statusLabel: string;
} {
  if (!checkedAt) {
    return {
      active: false,
      daysElapsed: 999,
      daysRemaining: 0,
      isExpiringSoon: false,
      statusLabel: "Unverified",
    };
  }

  const checkDate = new Date(checkedAt);
  const now = new Date();
  const diffMs = now.getTime() - checkDate.getTime();
  const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, SAFE_HARBOR_DAYS - daysElapsed);
  const active = daysRemaining > 0;
  const isExpiringSoon = active && daysRemaining <= 7;

  let statusLabel = "Clean (Safe Harbor Active)";
  if (!active) {
    statusLabel = "Safe Harbor Expired (>31 Days)";
  } else if (isExpiringSoon) {
    statusLabel = "Expiring Soon (Weekly Re-Scrub Advised)";
  }

  return {
    active,
    daysElapsed,
    daysRemaining,
    isExpiringSoon,
    statusLabel,
  };
}
