import { NextResponse } from "next/server";

/**
 * MMORPG join gate (web lane catch-all, foundation stub).
 *
 * POST { serverId, playerBand } -> { allowed, reason }.
 * Entry rule (adults > teens > kids): adults rooms admit everyone,
 * teens rooms admit kids + teens, kids rooms admit kids only.
 *
 * Server bands are an in-memory mirror of the demo ids served by
 * `app/api/mmorpg/servers/route.ts` — no database reads or writes.
 * TODO(migration): read the room's age_band from `mmorpg_servers`
 * (and write a row to `mmorpg_sessions` on allowed joins) instead.
 * No secrets here: verdicts only.
 */

type AgeBand = "kids" | "teens" | "adults";

// Demo mirror of servers/route.ts ids -> room age band.
const DEMO_SERVER_BANDS: Record<string, AgeBand> = {
  "emberhold-kids-1": "kids",
  "emberhold-teens-1": "teens",
  "emberhold-adults-1": "adults",
  "dreadhollow-teens-1": "teens",
  "gravegain4d-teens-1": "teens",
  "gravegain5d-adults-1": "adults",
};

// Room band -> player bands allowed in.
const ENTRY: Record<AgeBand, AgeBand[]> = {
  kids: ["kids"],
  teens: ["kids", "teens"],
  adults: ["kids", "teens", "adults"],
};

const noStore = { "Cache-Control": "private, no-store" };

function isAgeBand(value: unknown): value is AgeBand {
  return value === "kids" || value === "teens" || value === "adults";
}

function deny(reason: string, status: 400 | 403) {
  return NextResponse.json(
    { success: false, allowed: false, reason },
    { status, headers: noStore },
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return deny("Request body must be valid JSON.", 400);
  }
  const { serverId, playerBand } = (body ?? {}) as Record<string, unknown>;

  if (typeof serverId !== "string" || serverId.trim() === "") {
    return deny("serverId must be a non-empty string.", 400);
  }
  if (!isAgeBand(playerBand)) {
    return deny("playerBand must be one of: kids, teens, adults.", 400);
  }

  const room = DEMO_SERVER_BANDS[serverId];
  if (room === undefined) {
    return deny(`Unknown serverId "${serverId.slice(0, 80)}".`, 400);
  }

  if (!ENTRY[room].includes(playerBand)) {
    const who =
      room === "kids"
        ? "kids only"
        : room === "teens"
          ? "kids and teens"
          : "everyone";
    return deny(
      `Room "${serverId}" is ${room}-band (admits ${who}); ${playerBand} players cannot join.`,
      403,
    );
  }

  return NextResponse.json(
    {
      success: true,
      allowed: true,
      serverId,
      reason: `Welcome: ${playerBand} players may join this ${room}-band room.`,
    },
    { status: 200, headers: noStore },
  );
}
