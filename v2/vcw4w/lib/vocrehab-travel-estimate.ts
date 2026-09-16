/**
 * VocRehab schedule-juggle travel fallback estimator (SJ travel fallback).
 *
 * Pure module: zero imports, no browser globals, no I/O — safe for client +
 * server. Callers own telemetry and rendering. Strengths-first tone throughout:
 * every estimate is planning information, never a grade or a red error.
 *
 * Known-distance fixtures for tests (great-circle, straight-line miles):
 * - Tacoma home -> hospital ~2 mi (e.g. home 47.2529,-122.4443 to a point
 *   ~0.029 deg latitude north ≈ 2.0 mi by haversineMi).
 * - Short neighborhood hop ~0.5 mi; cross-town drive ~8 mi; regional flight
 *   leg ~600 mi. Tests pin haversineMi and estimateLeg against these shapes.
 */

/** How the week travels between two blocks. */
export type TravelMode = "car" | "walk" | "transit" | "plane";

/** A map point. Accepts common key shapes so callers never have to remap. */
export type TravelCoord =
  | { lat: number; lon: number }
  | { lat: number; lng: number }
  | { latitude: number; longitude: number }
  | readonly [number, number];

export interface TravelLegEstimate {
  minMin: number;
  maxMin: number;
  miles: number;
  estimated: true;
  label: string;
}

export interface EstimateLegOpts {
  /**
   * Drive-to-airport stub for `plane` legs (miles at car speed before the
   * flight + overhead). Defaults to 10 mi. Ignored by other modes.
   */
  driveToAirportMi?: number;
}

const EARTH_RADIUS_MI = 3958.8;

const CAR_MPH = 32;
const WALK_MPH = 3;
const TRANSIT_CAR_FACTOR = 1.6;
const TRANSIT_WAIT_MIN = 12;
const PLANE_MPH = 500;
const PLANE_OVERHEAD_MIN = 90;
const DEFAULT_AIRPORT_DRIVE_MI = 10;

const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
  car: "car",
  walk: "walk",
  transit: "transit",
  plane: "plane",
};

function coordLatLon(c: TravelCoord): { lat: number; lon: number } {
  if (Array.isArray(c)) return { lat: c[0], lon: c[1] };
  const o = c as {
    lat?: number;
    lon?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  if (typeof o.lat === "number") return { lat: o.lat, lon: o.lon ?? o.lng ?? 0 };
  return { lat: o.latitude ?? 0, lon: o.longitude ?? 0 };
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance in miles between two points (haversine).
 * Pure math — no geolocation APIs, no browser globals.
 */
export function haversineMi(a: TravelCoord, b: TravelCoord): number {
  const p1 = coordLatLon(a);
  const p2 = coordLatLon(b);
  const dLat = toRadians(p2.lat - p1.lat);
  const dLon = toRadians(p2.lon - p1.lon);
  const lat1 = toRadians(p1.lat);
  const lat2 = toRadians(p2.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

function baseMinutes(mode: TravelMode, miles: number, opts?: EstimateLegOpts): number {
  const safeMiles = Math.max(0, miles);
  const carMin = (safeMiles / CAR_MPH) * 60;
  switch (mode) {
    case "car":
      return carMin;
    case "walk":
      return (safeMiles / WALK_MPH) * 60;
    case "transit":
      return carMin * TRANSIT_CAR_FACTOR + TRANSIT_WAIT_MIN;
    case "plane": {
      const airportDriveMi = Math.max(0, opts?.driveToAirportMi ?? DEFAULT_AIRPORT_DRIVE_MI);
      const airportDriveMin = (airportDriveMi / CAR_MPH) * 60;
      return airportDriveMin + (safeMiles / PLANE_MPH) * 60 + PLANE_OVERHEAD_MIN;
    }
  }
}

/**
 * Planning range for one leg. Returns whole-minute bounds plus a
 * strengths-first label ("about X–Y min by car (planning estimate)").
 * `estimated` is always true: this is a fallback, never a live route.
 */
export function estimateLeg(mode: TravelMode, miles: number, opts?: EstimateLegOpts): TravelLegEstimate {
  const safeMiles = Math.max(0, miles);
  const base = baseMinutes(mode, safeMiles, opts);
  const minMin = Math.max(1, Math.round(base * 0.85));
  const maxMin = Math.max(minMin + 1, Math.round(base * 1.25));
  const range = formatRange(minMin, maxMin);
  return {
    minMin,
    maxMin,
    miles: safeMiles,
    estimated: true,
    label: `about ${range} by ${TRAVEL_MODE_LABEL[mode]} (planning estimate)`,
  };
}

/** Overload: format an estimate object. */
export function formatRange(est: Pick<TravelLegEstimate, "minMin" | "maxMin">): string;
/** Overload: format explicit minute bounds. */
export function formatRange(minMin: number, maxMin: number): string;
export function formatRange(
  first: Pick<TravelLegEstimate, "minMin" | "maxMin"> | number,
  second?: number,
): string {
  const minMin = typeof first === "number" ? first : first.minMin;
  const maxMin = typeof first === "number" ? (second ?? first) : first.maxMin;
  return `${minMin}–${maxMin} min`;
}
