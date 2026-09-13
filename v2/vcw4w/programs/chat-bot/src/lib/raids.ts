/**
 * Pure raid-schedule helpers (STUB-free, zero deps).
 *
 * Complements `src/lib/ledger.ts` (coin-ledger reads) with time-only
 * raid scheduling math. No I/O, no chat API, no database access.
 * All helpers are fail-open: garbage input yields safe defaults
 * (never throws).
 */

export interface RaidSchedule {
  raidId: string;
  clanId: string;
  startsAtMs: number;
  durationMinutes: number;
}

/**
 * Milliseconds until `startsAtMs` from `nowMs` (clamped at 0, never negative).
 * `isLive` is true when the start time has been reached or input is garbage
 * (fail-open to LIVE so callers show "LIVE" instead of a bogus countdown).
 */
export function nextRaidIn(
  startsAtMs: number,
  nowMs: number = Date.now(),
): { startsInMs: number; isLive: boolean } {
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(nowMs)) {
    return { startsInMs: 0, isLive: true };
  }
  const diff = startsAtMs - nowMs;
  if (diff <= 0) {
    return { startsInMs: 0, isLive: true };
  }
  return { startsInMs: diff, isLive: false };
}

/**
 * End timestamp (ms) for a schedule. Fail-open: garbage input yields 0.
 */
export function raidEndMs(s: RaidSchedule): number {
  if (typeof s !== "object" || s === null) {
    return 0;
  }
  const startsAtMs = (s as RaidSchedule).startsAtMs;
  const durationMinutes = (s as RaidSchedule).durationMinutes;
  if (!Number.isFinite(startsAtMs) || !Number.isFinite(durationMinutes)) {
    return 0;
  }
  return startsAtMs + durationMinutes * 60_000;
}

/**
 * Format a countdown: "2h 14m" style, "LIVE" when 0.
 * Fail-open: non-finite or non-positive input yields "LIVE".
 */
export function formatRaidCountdown(startsInMs: number): string {
  if (!Number.isFinite(startsInMs) || startsInMs <= 0) {
    return "LIVE";
  }
  const totalSeconds = Math.floor(startsInMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Validate a schedule. Returns error strings (empty = valid).
 * Never throws: null/garbage yields a single descriptive error.
 */
export function validateRaidSchedule(s: RaidSchedule): string[] {
  if (typeof s !== "object" || s === null) {
    return ["schedule must be an object"];
  }
  const errors: string[] = [];
  if (typeof s.raidId !== "string" || s.raidId.trim().length === 0) {
    errors.push("raidId must be a non-blank string");
  }
  if (typeof s.clanId !== "string" || s.clanId.trim().length === 0) {
    errors.push("clanId must be a non-blank string");
  }
  if (!Number.isFinite(s.startsAtMs)) {
    errors.push("startsAtMs must be a finite timestamp in ms");
  }
  if (!Number.isFinite(s.durationMinutes) || s.durationMinutes <= 0) {
    errors.push("durationMinutes must be a positive number");
  }
  return errors;
}
