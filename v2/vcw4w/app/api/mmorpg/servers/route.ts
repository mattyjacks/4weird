import { NextResponse } from "next/server";

/**
 * MMORPG demo servers (web lane catch-all, foundation stub).
 *
 * In-memory demo list only — no database reads or writes. When the
 * migration tables land (TODO: `mmorpg_servers` + `mmorpg_sessions`),
 * replace DEMO_SERVERS with a Supabase read and persist POST creates.
 * No secrets here: all fields are public demo data.
 */

export type AgeBand = "kids" | "teens" | "adults";

export type DemoServer = {
  id: string;
  game: string;
  name: string;
  ageBand: AgeBand;
  costPerMin: number;
  hostFree: boolean;
  players: number;
  maxPlayers: number;
  region: string;
};

const DEMO_SERVERS: DemoServer[] = [
  {
    id: "emberhold-kids-1",
    game: "emberhold",
    name: "Emberhold Meadow (Kids)",
    ageBand: "kids",
    costPerMin: 0,
    hostFree: true,
    players: 12,
    maxPlayers: 50,
    region: "us-east",
  },
  {
    id: "emberhold-teens-1",
    game: "emberhold",
    name: "Emberhold Crossing (Teens)",
    ageBand: "teens",
    costPerMin: 2,
    hostFree: false,
    players: 34,
    maxPlayers: 100,
    region: "us-east",
  },
  {
    id: "emberhold-adults-1",
    game: "emberhold",
    name: "Emberhold Forge (Adults)",
    ageBand: "adults",
    costPerMin: 5,
    hostFree: false,
    players: 87,
    maxPlayers: 200,
    region: "eu-west",
  },
  {
    id: "dreadhollow-teens-1",
    game: "dreadhollow",
    name: "Dreadhollow Gate (Teens)",
    ageBand: "teens",
    costPerMin: 3,
    hostFree: false,
    players: 21,
    maxPlayers: 80,
    region: "us-west",
  },
];

const DEMO_GAMES = ["emberhold", "dreadhollow"] as const;

// Minimum player band per demo game (in-memory age check for POST create).
// Order: kids < teens < adults.
const GAME_MIN_BAND: Record<string, AgeBand> = {
  emberhold: "kids",
  dreadhollow: "teens",
};

const BAND_RANK: Record<AgeBand, number> = { kids: 0, teens: 1, adults: 2 };

const noStore = { "Cache-Control": "private, no-store" };

function isAgeBand(value: unknown): value is AgeBand {
  return value === "kids" || value === "teens" || value === "adults";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  const rows =
    game == null || game === ""
      ? DEMO_SERVERS
      : DEMO_SERVERS.filter((s) => s.game === game);
  return NextResponse.json(
    { success: true, servers: rows, stub: true },
    { status: 200, headers: noStore },
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400, headers: noStore },
    );
  }
  const { game, ageBand, name, maxPlayers } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof game !== "string" || !(DEMO_GAMES as readonly string[]).includes(game)) {
    return NextResponse.json(
      {
        success: false,
        error: `Unknown game. Expected one of: ${DEMO_GAMES.join(", ")}.`,
      },
      { status: 400, headers: noStore },
    );
  }
  if (!isAgeBand(ageBand)) {
    return NextResponse.json(
      { success: false, error: "ageBand must be one of: kids, teens, adults." },
      { status: 400, headers: noStore },
    );
  }

  // In-memory age check: the requested band must clear the game's floor
  // (e.g. dreadhollow is teens+; a kids room for it is rejected).
  const min = GAME_MIN_BAND[game] ?? "kids";
  if (BAND_RANK[ageBand] < BAND_RANK[min]) {
    return NextResponse.json(
      {
        success: false,
        error: `Game "${game}" requires a ${min}+ room; "${ageBand}" is below the minimum band.`,
      },
      { status: 403, headers: noStore },
    );
  }

  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return NextResponse.json(
      { success: false, error: "name, when provided, must be a non-empty string." },
      { status: 400, headers: noStore },
    );
  }
  if (
    maxPlayers !== undefined &&
    (typeof maxPlayers !== "number" ||
      !Number.isInteger(maxPlayers) ||
      maxPlayers < 2 ||
      maxPlayers > 500)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "maxPlayers, when provided, must be an integer between 2 and 500.",
      },
      { status: 400, headers: noStore },
    );
  }

  // Stub create: no DB write. TODO(migration): insert into `mmorpg_servers`
  // (columns: game, name, age_band, max_players, host_free, cost_per_min)
  // and return the persisted row instead of this ephemeral object.
  const server: DemoServer = {
    id: `${game}-${ageBand}-${Date.now().toString(36)}`,
    game,
    name:
      typeof name === "string" && name.trim() !== ""
        ? name.trim().slice(0, 80)
        : `${game} room (${ageBand})`,
    ageBand,
    costPerMin: ageBand === "kids" ? 0 : ageBand === "teens" ? 2 : 5,
    hostFree: ageBand === "kids",
    players: 0,
    maxPlayers: typeof maxPlayers === "number" ? maxPlayers : 50,
    region: "us-east",
  };
  return NextResponse.json(
    { success: true, server, persisted: false, stub: true },
    { status: 201, headers: noStore },
  );
}
