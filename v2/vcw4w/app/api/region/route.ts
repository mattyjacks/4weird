import { NextResponse } from "next/server";
import { resolveRegionFromHeaders } from "@/lib/monetization-policy";

/**
 * GET /api/region — IP-based region lookup.
 *
 * Reads CDN geo headers (Vercel `x-vercel-ip-country`, Cloudflare
 * `cf-ipcountry`) set from the visitor IP. Never uses GPS. Unknown country
 * fails closed to EU-strict, matching checkChargeLegality.
 */
export async function GET(request: Request) {
  const region = resolveRegionFromHeaders(request.headers);
  return NextResponse.json(
    { country: region.country, region: region.region, class: region.class },
    { headers: { "cache-control": "no-store" } },
  );
}
