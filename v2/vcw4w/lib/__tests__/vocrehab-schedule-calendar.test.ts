/**
 * VocRehab schedule-juggle calendar engine tests (DS-SJ-16).
 *
 * Plain node:test + node:assert/strict — the repo has no vitest/jest
 * runner, so these stay dependency-free. Run from `v2/vcw4w` with:
 *   node --experimental-strip-types --test lib/__tests__/vocrehab-schedule-calendar.test.ts
 *
 * Strengths-first: every assertion is planning information about the
 * calendar helpers — never a grade, never a red error.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  buildMonthGrid,
  daysInMonth,
  isInRange,
  minutesToLabel,
  monthDiff,
  snapToHalfHour,
  toDayId,
} from "../vocrehab-schedule-calendar.js";

test("daysInMonth: leap February 2024 has 29 days", () => {
  assert.equal(daysInMonth(2024, 1), 29);
});

test("daysInMonth: common February 2023 has 28 days", () => {
  assert.equal(daysInMonth(2023, 1), 28);
});

test("daysInMonth: 30/31-day months resolve", () => {
  assert.equal(daysInMonth(2024, 0), 31);
  assert.equal(daysInMonth(2024, 3), 30);
  assert.equal(daysInMonth(2023, 11), 31);
});

test("toDayId: zero-pads month and day", () => {
  assert.equal(toDayId(2024, 0, 5), "2024-01-05");
  assert.equal(toDayId(2024, 10, 15), "2024-11-15");
});

test("buildMonthGrid: Monday-start month has no leading blanks (Jan 2024)", () => {
  // 2024-01-01 was a Monday.
  const weeks = buildMonthGrid(2024, 0);
  assert.equal(weeks[0][0].day, 1);
  assert.equal(weeks[0][0].dayId, "2024-01-01");
  assert.equal(weeks[0][0].inMonth, true);
});

test("buildMonthGrid: Thursday-start leap February pads Mon-Wed (Feb 2024)", () => {
  // 2024-02-01 was a Thursday -> 3 Monday-first leading blanks.
  const weeks = buildMonthGrid(2024, 1);
  const first = weeks[0];
  assert.deepEqual(
    first.slice(0, 3).map((c) => c.day),
    [null, null, null],
  );
  assert.deepEqual(
    first.slice(0, 3).map((c) => c.inMonth),
    [false, false, false],
  );
  assert.equal(first[3].day, 1);
  assert.equal(first[3].dayId, "2024-02-01");
});

test("buildMonthGrid: Sunday-start month pads six blanks (Sep 2024)", () => {
  // 2024-09-01 was a Sunday -> Monday-first offset 6.
  const weeks = buildMonthGrid(2024, 8);
  assert.deepEqual(
    weeks[0].slice(0, 6).map((c) => c.day),
    [null, null, null, null, null, null],
  );
  assert.equal(weeks[0][6].day, 1);
});

test("buildMonthGrid: every week has 7 cells and in-month days are sequential", () => {
  for (const [year, monthIndex] of [
    [2024, 1],
    [2023, 1],
    [2024, 8],
  ] as const) {
    const weeks = buildMonthGrid(year, monthIndex);
    for (const week of weeks) assert.equal(week.length, 7);
    const inMonth = weeks.flat().filter((c) => c.inMonth);
    assert.equal(inMonth.length, daysInMonth(year, monthIndex));
    assert.deepEqual(
      inMonth.map((c) => c.day),
      Array.from({ length: daysInMonth(year, monthIndex) }, (_, i) => i + 1),
    );
  }
});

test("addMonths: wraps across year boundaries", () => {
  assert.deepEqual(addMonths(2023, 11, 1), { year: 2024, monthIndex: 0 });
  assert.deepEqual(addMonths(2024, 0, -1), { year: 2023, monthIndex: 11 });
  assert.deepEqual(addMonths(2024, 5, 7), { year: 2025, monthIndex: 0 });
  assert.deepEqual(addMonths(2024, 5, -6), { year: 2023, monthIndex: 11 });
  assert.deepEqual(addMonths(2024, 2, 12), { year: 2025, monthIndex: 2 });
  assert.deepEqual(addMonths(2024, 2, 0), { year: 2024, monthIndex: 2 });
});

test("monthDiff/isInRange: picker window is one back through three ahead", () => {
  assert.equal(monthDiff(2024, 3, 2024, 0), 3);
  assert.equal(monthDiff(2023, 11, 2024, 0), -1);
  assert.equal(isInRange(2024, 0, 2024, 0), true);
  assert.equal(isInRange(2023, 11, 2024, 0), true);
  assert.equal(isInRange(2024, 3, 2024, 0), true);
  assert.equal(isInRange(2023, 10, 2024, 0), false);
  assert.equal(isInRange(2024, 4, 2024, 0), false);
});

test("snapToHalfHour: rounds to :00 / :30", () => {
  assert.equal(snapToHalfHour(0), 0);
  assert.equal(snapToHalfHour(14), 0);
  assert.equal(snapToHalfHour(15), 30);
  assert.equal(snapToHalfHour(29), 30);
  assert.equal(snapToHalfHour(44), 30);
  assert.equal(snapToHalfHour(45), 60);
  assert.equal(snapToHalfHour(60), 60);
  assert.equal(snapToHalfHour(75), 90);
});

test("snapToHalfHour: clamps kindly instead of erroring", () => {
  assert.equal(snapToHalfHour(-30), 0);
  assert.equal(snapToHalfHour(1500), 1440);
});

test("minutesToLabel: friendly 12-hour clock text", () => {
  assert.equal(minutesToLabel(0), "12:00 AM");
  assert.equal(minutesToLabel(540), "9:00 AM");
  assert.equal(minutesToLabel(810), "1:30 PM");
  assert.equal(minutesToLabel(1439), "11:59 PM");
});
