/**
 * Age ratings + date-of-birth checks for 4weird Games.
 *
 * Ratings mirror familiar store bands:
 * - Kids   → ages 0–12  (no gate)
 * - Teens  → ages 13–17 (gate only for Kids Mode accounts, at 13+)
 * - Adults → ages 18+   (always gated at 18+; Kids Mode accounts are
 *   blocked outright and can never pass the gate)
 *
 * COMPLIANCE: date of birth is checked purely in memory on the player's
 * own device and is NEVER sent to any API, never written to Supabase, and
 * never persisted anywhere (no localStorage, no cookies). Only the
 * pass/fail outcome for this page load lives in React state. Age itself is
 * never stored either — every check re-derives it from a freshly entered
 * date of birth.
 *
 * CONTENT POLICY: sexual content is not allowed anywhere on 4weird Games.
 * "Adults" here means intense violence / horror themes only — never sexual
 * content, which would be removed, not rated.
 */

export type AgeRating = "kids" | "teens" | "adults";

/** Minimum age (in whole years) a player must be to play each band. */
export const RATING_MIN_AGE: Record<AgeRating, number> = {
  kids: 0,
  teens: 13,
  adults: 18,
};

export const RATING_LABEL: Record<AgeRating, string> = {
  kids: "Kids (0–12)",
  teens: "Teens (13–17)",
  adults: "Adults (18+)",
};

/** The date picker always opens on this date — it is a neutral placeholder. */
export const DEFAULT_DOB_ISO = "1970-04-20";

/** Per-game ratings. Games not listed here default to "kids". */
export const GAME_RATINGS: Record<string, AgeRating> = {
  // Intense violence / horror themes — 18+.
  assassinanimals: "adults",
  gravegain2d: "adults",
  gravegain3d: "adults",
  demolichdom: "adults",
  lastwordszombies: "adults",
  // Cartoon/fantasy combat — 13+.
  battlesharks2: "teens",
  serversavershield: "teens",
  "platform-wars": "teens",
  neoninvaders: "teens",
};

export function getGameRating(slug: string): AgeRating {
  return GAME_RATINGS[slug] ?? "kids";
}

export function requiredAgeFor(rating: AgeRating): number {
  return RATING_MIN_AGE[rating];
}

export type WaitParts = { years: number; months: number; days: number };

export type DobCheck =
  | { ok: true }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "too-young"; wait: WaitParts; eligibleDateISO: string };

function parseDob(dobISO: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dobISO.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Build in UTC noon to dodge DST edges; reject rollover dates (e.g. Feb 30).
  const d = new Date(Date.UTC(year, month - 1, day, 12));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Calendar-accurate difference: from (inclusive) → to (exclusive). Assumes to >= from. */
export function diffYMD(from: Date, to: Date): WaitParts {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  let months = to.getUTCMonth() - from.getUTCMonth();
  let days = to.getUTCDate() - from.getUTCDate();
  if (days < 0) {
    months -= 1;
    // Days in the month before `to`.
    const prevMonth = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 0, 12));
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/**
 * Check a date of birth against a minimum age. Pure function — the input
 * is used only for this call and never stored.
 *
 * @param dobISO date of birth as YYYY-MM-DD
 * @param requiredAge minimum whole-years age (13 or 18)
 * @param now override "today" (UTC) — for tests only; defaults to now
 */
export function checkDob(dobISO: string, requiredAge: number, now?: Date): DobCheck {
  const dob = parseDob(dobISO);
  const today = now ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)) : (() => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
  })();
  if (!dob || dob.getTime() > today.getTime()) return { ok: false, reason: "invalid" };
  const eligible = new Date(dob.getTime());
  eligible.setUTCFullYear(eligible.getUTCFullYear() + requiredAge);
  if (today.getTime() >= eligible.getTime()) return { ok: true };
  return {
    ok: false,
    reason: "too-young",
    wait: diffYMD(today, eligible),
    eligibleDateISO: toISODate(eligible),
  };
}

/** "2 years, 3 months, 4 days" — drops zero parts, keeps at least days. */
export function formatWait(wait: WaitParts): string {
  const parts: string[] = [];
  if (wait.years > 0) parts.push(`${wait.years} year${wait.years === 1 ? "" : "s"}`);
  if (wait.months > 0) parts.push(`${wait.months} month${wait.months === 1 ? "" : "s"}`);
  if (wait.days > 0 || parts.length === 0) parts.push(`${wait.days} day${wait.days === 1 ? "" : "s"}`);
  return parts.join(", ");
}

const KIDS_MODE_KEY = "4weird-kids-mode";

/**
 * Kids Mode is a device + account preference (NOT age data): when on,
 * Adults games are hidden and unplayable, and Teens games need a 13+
 * date-of-birth check. The flag itself carries no birth date and reveals
 * nothing about the player's real age.
 */
export function isKidsMode(): boolean {
  try {
    return window.localStorage.getItem(KIDS_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setKidsMode(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(KIDS_MODE_KEY, "1");
    else window.localStorage.removeItem(KIDS_MODE_KEY);
  } catch {
    /* private mode — the gate still enforces per page load */
  }
}
