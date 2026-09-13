import { NextResponse } from "next/server";
import { canEnterServer, gateReasonFor, isServerAgeBand } from "@/lib/mmo-age";

/**
 * GET /api/mmorpg/gate?playerBand=<kids|teens|adults>&serverBand=<kids|teens|adults>[&game=<slug>]
 * -> { allowed, reason, playerBand, serverBand, game? }
 *
 * Public, cacheable, no session, no Supabase. Pure band comparison from
 * lib/mmo-age.ts (same bands as lib/age-gate.ts). Invalid/missing bands
 * fail CLOSED with 400 + allowed:false. The player band is expected to come
 * from the caller's verified account/kid-session band — this route never
 * reads a date of birth and stores nothing.
 *
 * The optional `game` slug is validated against the same demo allowlist as
 * the sibling servers/rent stubs (emberhold, dreadhollow, gravegain4d,
 * gravegain5d); an unknown game fails CLOSED with 400 + allowed:false.
 * Omitting `game` keeps the legacy band-only verdict (backward compatible).
 */
const DEMO_GAMES = ["emberhold", "dreadhollow", "gravegain4d", "gravegain5d"] as const;

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerBand = searchParams.get("playerBand");
  const serverBand = searchParams.get("serverBand");
  const game = searchParams.get("game");
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
  if (game !== null && game !== "" && !(DEMO_GAMES as readonly string[]).includes(game)) {
    return NextResponse.json(
      {
        allowed: false,
        reason: `Unknown game. Expected one of: ${DEMO_GAMES.join(", ")}.`,
        playerBand,
        serverBand,
        game,
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
      ...(game !== null && game !== "" ? { game } : {}),
    },
    {
      status: 200,
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    },
  );
}
