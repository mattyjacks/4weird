import { NextResponse } from "next/server";
import { canEnterServer, gateReasonFor, isServerAgeBand } from "@/lib/mmo-age";

/**
 * GET /api/mmorpg/gate?playerBand=<kids|teens|adults>&serverBand=<kids|teens|adults>
 * -> { allowed, reason, playerBand, serverBand }
 *
 * Public, cacheable, no session, no Supabase. Pure band comparison from
 * lib/mmo-age.ts (same bands as lib/age-gate.ts). Invalid/missing bands
 * fail CLOSED with 400 + allowed:false. The player band is expected to come
 * from the caller's verified account/kid-session band — this route never
 * reads a date of birth and stores nothing.
 */
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerBand = searchParams.get("playerBand");
  const serverBand = searchParams.get("serverBand");
  if (!isServerAgeBand(playerBand) || !isServerAgeBand(serverBand)) {
    return NextResponse.json(
      {
        allowed: false,
        reason: "playerBand and serverBand must each be exactly one of kids|teens|adults.",
        playerBand,
        serverBand,
      },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      allowed: canEnterServer(playerBand, serverBand),
      reason: gateReasonFor(playerBand, serverBand),
      playerBand,
      serverBand,
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    },
  );
}
