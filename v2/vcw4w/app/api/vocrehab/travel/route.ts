import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

const MODES = ["car", "walk", "transit", "plane"] as const;
type TravelMode = (typeof MODES)[number];

type Coord = { lat: number; lng: number };
type TravelResult = {
  minMin: number;
  maxMin: number;
  miles: number;
  source: "maps" | "fallback";
  label: string;
};

const CACHE_MAX = 300;
const cache = new Map<string, TravelResult>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asCoord(value: unknown): Coord | null {
  if (!isPlainObject(value)) return null;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function asAddress(value: unknown): string | null {
  if (!isPlainObject(value)) return null;
  const { address } = value as { address?: unknown };
  if (typeof address !== "string") return null;
  const trimmed = address.trim().slice(0, 200);
  return trimmed.length > 0 ? trimmed : null;
}

// Haversine fallback, kept inline + dependency-free so this route stands
// alone (lane rule: do not import the SJ-05 travel-estimate lib here).
function haversineMi(a: Coord, b: Coord): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fallbackLeg(miles: number, mode: TravelMode): TravelResult {
  const MPH: Record<TravelMode, number> = { car: 32, walk: 3, transit: 20, plane: 500 };
  let base = (miles / MPH[mode]) * 60;
  if (mode === "transit") base += 12;
  if (mode === "plane") base += 90;
  const minMin = Math.max(1, Math.round(base * 0.85));
  const maxMin = Math.max(minMin, Math.round(base * 1.2));
  return {
    minMin,
    maxMin,
    miles: Math.round(miles * 10) / 10,
    source: "fallback",
    label: "Rough planning estimate (offline) — great for comparing options.",
  };
}

function cacheKey(origin: string, dest: string, mode: TravelMode): string {
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  return `${hourBucket}|${mode}|${origin}→${dest}`;
}

function cacheSet(key: string, value: TravelResult): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value);
}

async function geocode(address: string, key: string, signal: AbortSignal): Promise<Coord | null> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}` +
    `&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{ geometry?: { location?: { lat?: unknown; lng?: unknown } } }>;
    status?: string;
  };
  const loc = data.results?.[0]?.geometry?.location;
  if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") return null;
  return { lat: loc.lat, lng: loc.lng };
}

export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-travel-ip:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return fail("A quick breather, then try again — you're doing great.", 429, rateLimitHeaders(rl));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Send your starting point and destination and we'll map the trip.", 400);
  }
  const input = isPlainObject(body) ? body : {};

  const mode = input.mode;
  if (typeof mode !== "string" || !MODES.includes(mode as TravelMode)) {
    return fail("Pick a travel style — car, walk, transit, or plane — and we'll estimate it.", 400);
  }
  const travelMode = mode as TravelMode;

  const originCoord = asCoord(input.origin);
  const destCoord = asCoord(input.dest);
  const originAddr = originCoord ? null : asAddress(input.origin);
  const destAddr = destCoord ? null : asAddress(input.dest);
  if (!originCoord && !originAddr) {
    return fail("Tell us where you're starting from — a map pin or an address both work.", 400);
  }
  if (!destCoord && !destAddr) {
    return fail("Tell us where you're headed — a map pin or an address both work.", 400);
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  const needsGeocode = !originCoord || !destCoord;

  // Offline path: key missing, geocode impossible, or plane trips (no road
  // route to look up). Strengths-first: still answer with an honest label.
  if (!key || travelMode === "plane") {
    if (needsGeocode && !key) {
      return fail(
        "Add map pins for both ends and we'll estimate travel time — addresses need the live map, which is resting.",
        422,
      );
    }
    if (originCoord && destCoord) {
      const miles = haversineMi(originCoord, destCoord);
      return ok({ ...fallbackLeg(miles, travelMode) });
    }
    return fail("Add map pins for both ends and we'll estimate travel time.", 422);
  }

  const originKey = originCoord ? `${originCoord.lat},${originCoord.lng}` : `addr:${originAddr}`;
  const destKey = destCoord ? `${destCoord.lat},${destCoord.lng}` : `addr:${destAddr}`;
  const cKey = cacheKey(originKey, destKey, travelMode);
  const cached = cache.get(cKey);
  if (cached) return ok({ ...cached });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let from = originCoord;
    let to = destCoord;
    if (!from && originAddr) from = await geocode(originAddr, key, controller.signal);
    if (!to && destAddr) to = await geocode(destAddr, key, controller.signal);
    if (!from || !to) {
      if (originCoord && destCoord) {
        const miles = haversineMi(originCoord, destCoord);
        const fb = fallbackLeg(miles, travelMode);
        cacheSet(cKey, fb);
        return ok({ ...fb });
      }
      return fail("We couldn't find that address — double-check the spelling and try again.", 422);
    }

    const gMode = travelMode === "car" ? "driving" : travelMode === "walk" ? "walking" : "transit";
    let dmUrl =
      "https://maps.googleapis.com/maps/api/distancematrix/json" +
      `?origins=${from.lat},${from.lng}&destinations=${to.lat},${to.lng}` +
      `&mode=${gMode}&units=imperial&key=${encodeURIComponent(key)}`;
    if (typeof input.departAt === "string" || typeof input.departAt === "number") {
      const t = new Date(input.departAt).getTime();
      if (Number.isFinite(t)) dmUrl += `&departure_time=${Math.floor(t / 1000)}`;
    }
    const res = await fetch(dmUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`maps status ${res.status}`);
    const data = (await res.json()) as {
      rows?: Array<{
        elements?: Array<{
          status?: string;
          duration?: { value?: number };
          duration_in_traffic?: { value?: number };
          distance?: { value?: number };
        }>;
      }>;
    };
    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") throw new Error(`maps element ${el?.status ?? "empty"}`);
    const seconds = el.duration_in_traffic?.value ?? el.duration?.value;
    const meters = el.distance?.value;
    if (typeof seconds !== "number" || typeof meters !== "number") throw new Error("maps shape");
    const miles = meters / 1609.344;
    const baseMin = seconds / 60;
    const result: TravelResult = {
      minMin: Math.max(1, Math.round(baseMin * 0.9)),
      maxMin: Math.max(1, Math.round(baseMin * 1.25)),
      miles: Math.round(miles * 10) / 10,
      source: "maps",
      label: "Live route estimate — a solid starting point for your plan.",
    };
    cacheSet(cKey, result);
    return ok({ ...result });
  } catch (err) {
    // Never log addresses or keys — mode + a short error tag only.
    console.error("[api] vocrehab/travel maps error", {
      mode: travelMode,
      detail: String(err instanceof Error ? err.message : err).slice(0, 80),
    });
    if (originCoord && destCoord) {
      const miles = haversineMi(originCoord, destCoord);
      const fb = fallbackLeg(miles, travelMode);
      cacheSet(cKey, fb);
      return ok({ ...fb });
    }
    return fail("The live map is resting — add map pins for both ends for an offline estimate.", 503);
  } finally {
    clearTimeout(timeout);
  }
}
