/**
 * VocRehab Schedule Juggle — real monthly calendar engine (DS-SJ-01).
 *
 * Purpose: pure month-grid + day-id + 30-minute snap helpers for
 *   `app/vocrehab/play/schedule-juggle`. Practice-first: every helper is
 *   total, timezone-free date math — no surprises, no red errors, just
 *   planning information the UI can present strengths-first.
 *
 * Zero-coupling note: pure data + pure functions, zero imports, zero I/O,
 *   safe for client + server. No browser globals (`Date` math only — the
 *   standard library, not the DOM). Nothing here imports other SJ files.
 */

/** Day identifier in `YYYY-MM-DD` form (month and day zero-padded). */
export type CalendarDayId = string;

/** One cell of the month grid. Blank padding cells carry `day: null`. */
export interface ScheduleCalendarCell {
  /** `YYYY-MM-DD` for real days, `null` for leading/trailing padding. */
  readonly dayId: CalendarDayId | null;
  /** Day-of-month (1-based) for real days, `null` for padding. */
  readonly day: number | null;
  /** True when this cell belongs to the requested month. */
  readonly inMonth: boolean;
}

/** Year + zero-based month (`0 = January`) pair. */
export interface MonthParts {
  readonly year: number;
  readonly monthIndex: number;
}

/** Furthest back the picker may travel (months before the starting month). */
export const SCHEDULE_CALENDAR_MIN_OFFSET = -1;

/** Furthest forward the picker may travel (months after the starting month). */
export const SCHEDULE_CALENDAR_MAX_OFFSET = 3;

/** Minutes in a day — the top of the half-hour snap range. */
const MINUTES_PER_DAY = 24 * 60;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

/** Build the `YYYY-MM-DD` id for a calendar date. Month is zero-based. */
export function toDayId(year: number, monthIndex: number, day: number): CalendarDayId {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

/** Days in a month (zero-based month). Leap-year February resolves to 29. */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Monday-first month grid: rows of exactly 7 cells, starting on Monday.
 * Leading blanks (and trailing blanks padding the final week) are
 * `{ dayId: null, day: null, inMonth: false }` cells. February and leap
 * years fall out of `daysInMonth` — nothing special-cased.
 */
export function buildMonthGrid(year: number, monthIndex: number): ScheduleCalendarCell[][] {
  const totalDays = daysInMonth(year, monthIndex);
  // JS: 0 = Sunday … 6 = Saturday. Monday-first offset: Monday -> 0 … Sunday -> 6.
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const weeks: ScheduleCalendarCell[][] = [];
  let week: ScheduleCalendarCell[] = [];

  for (let i = 0; i < leadingBlanks; i += 1) {
    week.push({ dayId: null, day: null, inMonth: false });
  }
  for (let day = 1; day <= totalDays; day += 1) {
    week.push({ dayId: toDayId(year, monthIndex, day), day, inMonth: true });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) {
      week.push({ dayId: null, day: null, inMonth: false });
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * The starting month — the month containing today. Takes an optional `now`
 * (defaulting to the current moment) so previews and tests can pin the date
 * without touching the clock.
 */
export function getInitialMonthParts(now: Date = new Date()): MonthParts {
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

/** Shift a month by `delta` months (negative travels back), normalized. */
export function addMonths(year: number, monthIndex: number, delta: number): MonthParts {
  const total = year * 12 + monthIndex + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonthIndex = total - nextYear * 12;
  return { year: nextYear, monthIndex: nextMonthIndex };
}

/** Whole-month distance from a base month (negative = earlier). */
export function monthDiff(year: number, monthIndex: number, baseYear: number, baseMonthIndex: number): number {
  return (year - baseYear) * 12 + (monthIndex - baseMonthIndex);
}

/**
 * True when a month sits inside the travel window around the starting month:
 * one month back through three months ahead (`-1`/`+3` cap).
 */
export function isInRange(
  year: number,
  monthIndex: number,
  baseYear: number,
  baseMonthIndex: number,
): boolean {
  const diff = monthDiff(year, monthIndex, baseYear, baseMonthIndex);
  return diff >= SCHEDULE_CALENDAR_MIN_OFFSET && diff <= SCHEDULE_CALENDAR_MAX_OFFSET;
}

/**
 * Snap minutes-since-midnight to the nearest half hour (`:00` / `:30`).
 * Out-of-range input is kindly clamped to the day first — planning info
 * stays usable, never an error.
 */
export function snapToHalfHour(minutes: number): number {
  const clamped = Math.min(Math.max(minutes, 0), MINUTES_PER_DAY);
  return Math.round(clamped / 30) * 30;
}

/**
 * Friendly 12-hour label for minutes-since-midnight, e.g. `9:00 AM`,
 * `1:30 PM`. Strengths-first copy stays in the UI layer; this is just the
 * readable clock text it builds on.
 */
export function minutesToLabel(minutes: number): string {
  const total = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hour24 = Math.floor(total / 60);
  const mins = total % 60;
  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${pad2(mins)} ${suffix}`;
}
