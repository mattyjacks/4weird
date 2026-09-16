/**
 * VocRehab schedule-juggle travel fallback estimator tests (DS-SJ-16).
 *
 * Plain node:test + node:assert/strict — the repo has no vitest/jest
 * runner, so these stay dependency-free. Run from `v2/vcw4w` with:
 *   node --experimental-strip-types --test lib/__tests__/vocrehab-travel-estimate.test.ts
 *
 * Pins haversineMi + estimateLeg against the known Tacoma shapes from
 * the module docs. Strengths-first: estimates are planning information,
 * never a grade, never a red error.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estimateLeg,
  formatRange,
  haversineMi,
} from "../vocrehab-travel-estimate.js";

/** Tacoma home from the module docs. */
const TACOMA_HOME = { lat: 47.2529, lon: -122.4443 };
/** ~0.029 deg latitude north of home — the documented ~2 mi hospital hop. */
const TACOMA_HOSPITAL = { lat: 47.2819, lon: -122.4443 };

test("haversineMi: Tacoma home -> hospital is ~2 mi (within 1-3 mi)", () => {
  const miles = haversineMi(TACOMA_HOME, TACOMA_HOSPITAL);
  assert.ok(miles > 1 && miles < 3, `expected 1-3 mi, got ${miles}`);
  assert.ok(Math.abs(miles - 2.0) < 0.3, `expected ~2.0 mi, got ${miles}`);
});

test("haversineMi: same point is zero and pairs are symmetric", () => {
  assert.equal(haversineMi(TACOMA_HOME, TACOMA_HOME), 0);
  assert.equal(
    haversineMi(TACOMA_HOME, TACOMA_HOSPITAL),
    haversineMi(TACOMA_HOSPITAL, TACOMA_HOME),
  );
});

test("haversineMi: accepts tuple + latitude/longitude key shapes", () => {
  const viaObject = haversineMi(TACOMA_HOME, TACOMA_HOSPITAL);
  const viaTuple = haversineMi(
    [47.2529, -122.4443],
    [47.2819, -122.4443],
  );
  const viaLongNames = haversineMi(
    { latitude: 47.2529, longitude: -122.4443 },
    { latitude: 47.2819, longitude: -122.4443 },
  );
  assert.ok(Math.abs(viaTuple - viaObject) < 1e-9);
  assert.ok(Math.abs(viaLongNames - viaObject) < 1e-9);
});

test("haversineMi: known shapes scale sanely", () => {
  // One degree of latitude ≈ 69 mi.
  const oneDeg = haversineMi({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
  assert.ok(oneDeg > 68 && oneDeg < 70, `got ${oneDeg}`);
  // Short neighborhood hop stays well under a mile.
  const hop = haversineMi(TACOMA_HOME, { lat: 47.26, lon: -122.4443 });
  assert.ok(hop > 0.3 && hop < 0.7, `got ${hop}`);
});

test("estimateLeg: car range is sane for the ~2 mi hospital hop", () => {
  const miles = haversineMi(TACOMA_HOME, TACOMA_HOSPITAL);
  const leg = estimateLeg("car", miles);
  assert.equal(leg.estimated, true);
  assert.equal(leg.miles, miles);
  assert.ok(leg.minMin >= 1, `minMin ${leg.minMin}`);
  assert.ok(leg.maxMin > leg.minMin, `range ${leg.minMin}-${leg.maxMin}`);
  assert.ok(leg.minMin <= 10 && leg.maxMin <= 15, `range ${leg.minMin}-${leg.maxMin}`);
  assert.ok(leg.label.includes("car"));
  assert.ok(leg.label.includes("planning estimate"));
});

test("estimateLeg: slower modes plan longer than car for the same miles", () => {
  const car = estimateLeg("car", 2);
  const walk = estimateLeg("walk", 2);
  const transit = estimateLeg("transit", 2);
  assert.ok(walk.minMin > car.maxMin, `walk ${walk.minMin} vs car ${car.maxMin}`);
  assert.ok(transit.minMin > car.minMin, `transit ${transit.minMin} vs car ${car.minMin}`);
});

test("estimateLeg: plane overhead dominates short hops, pays off long-haul", () => {
  const shortPlane = estimateLeg("plane", 2);
  const shortCar = estimateLeg("car", 2);
  assert.ok(shortPlane.minMin > shortCar.maxMin);
  const longPlane = estimateLeg("plane", 600);
  const longCar = estimateLeg("car", 600);
  assert.ok(longPlane.maxMin < longCar.minMin);
});

test("estimateLeg: negative miles clamp kindly to zero", () => {
  const leg = estimateLeg("car", -5);
  assert.equal(leg.miles, 0);
  assert.ok(leg.minMin >= 1);
  assert.ok(leg.maxMin > leg.minMin);
});

test("formatRange: object and explicit-bounds overloads agree", () => {
  assert.equal(formatRange(3, 5), "3–5 min");
  assert.equal(formatRange({ minMin: 3, maxMin: 5 }), "3–5 min");
  const leg = estimateLeg("car", 2);
  assert.equal(formatRange(leg), `${leg.minMin}–${leg.maxMin} min`);
});
