import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

const MODES = ["car", "walk", "transit", "plane"] as const;
type TravelMode = (typeof MODES)[number];
type Coord = { lat: number; lng: number };

function asCoord(value: unknown): Coord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function haversineMi(a: Coord, b: Coord): number {
  const radius = 3958.8;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const arc = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(arc));
}

function estimate(miles: number, mode: TravelMode) {
  const mph: Record<TravelMode, number> = { car: 32, walk: 3, transit: 20, plane: 500 };
  let base = (miles / mph[mode]) * 60;
  if (mode === "transit") base += 12;
  if (mode === "plane") base += 90;
  const minMin = Math.max(1, Math.round(base * 0.85));
  return {
    minMin,
    maxMin: Math.max(minMin, Math.round(base * 1.2)),
    miles: Math.round(miles * 10) / 10,
    source: "fallback" as const,
    label: "Rough planning estimate (offline) — great for comparing options.",
  };
}

/** Offline-only until the application's eligibility for Google Maps Platform
 * is confirmed for this mixed-age service. No address, coordinate, or derived
 * route data is sent to or cached from Google Maps.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-travel-ip:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return fail("A quick breather, then try again — you're doing great.", 429, rateLimitHeaders(rl));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Send coordinates for your starting point and destination.", 400);
  }
  const input = typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  if (typeof input.mode !== "string" || !MODES.includes(input.mode as TravelMode)) {
    return fail("Pick a travel style — car, walk, transit, or plane.", 400);
  }
  const origin = asCoord(input.origin);
  const dest = asCoord(input.dest);
  if (!origin || !dest) {
    return fail("Address lookup is paused. Enter coordinates for a rough offline estimate.", 422);
  }
  return ok(estimate(haversineMi(origin, dest), input.mode as TravelMode));
}
