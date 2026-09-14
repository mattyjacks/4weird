import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { clientIp } from "@/lib/validate";
import {
  cleanMmorpgGameKind,
  resolveMmorpgServerCosts,
  type MmorpgGameKind,
} from "@/lib/mmorpg-economy";

/**
 * Live MMORPG room lobby.
 *
 * GET reads player-hosted rooms from `public.mmorpg_servers` with live
 * seat counts from `public.mmorpg_sessions` (rows where `left_at IS NULL`).
 * POST persists a new room for the signed-in host. There are no seeded,
 * demo, or hardcoded rooms: an empty table returns an empty list and the
 * browser shows "No servers are listed yet — rent one to open the first
 * room." All served fields are public room data (never `host_user_id`).
 */

export type AgeBand = "kids" | "teens" | "adults";

// Catalog slug <-> server dimension. The `game` column CHECK constrains
// values to 1d/2d/3d/4d/5d; the rent form sends catalog slugs, so both
// spellings are accepted and normalized to the dimension for storage.
const DIMENSION_OF_SLUG: Record<string, string> = {
  gravegain1d: "1d",
  gravegain2d: "2d",
  gravegain3d: "3d",
  gravegain4d: "4d",
  gravegain5d: "5d",
  "1d": "1d",
  "2d": "2d",
  "3d": "3d",
  "4d": "4d",
  "5d": "5d",
};

const SLUG_OF_DIMENSION: Record<string, MmorpgGameKind> = {
  "1d": "gravegain1d",
  "2d": "gravegain2d",
  "3d": "gravegain3d",
  "4d": "gravegain4d",
  "5d": "gravegain5d",
};

const ACCEPTED_GAMES = Object.keys(DIMENSION_OF_SLUG).join(", ");

// Live droplet-split pricing (DS-MMOMV-02): one shared $6/mo box for all
// games. Canonical total lives in `@/lib/mmorpg-economy` as
// `MMORPG_DROPLET_TOTAL_PER_MIN_COINS` (DS-MMOMV-06, 800 coins grossed-up
// for the 25% cut inside / 43200 min/mo); not yet landed, so this local
// fallback mirrors it — switch to the lib import when it lands.
const DROPLET_TOTAL_PER_MIN_COINS = 0.02;

function isAgeBand(value: unknown): value is AgeBand {
  return value === "kids" || value === "teens" || value === "adults";
}

type ServerRow = {
  id: string;
  game: string;
  name: string;
  age_band: string;
  host_free: boolean | null;
  cost_per_min: number | null;
  load_per_min: number | null;
  max_players: number;
  created_at?: string;
};

function toApiRow(row: ServerRow, players: number) {
  const dimension = String(row.game ?? "").trim();
  const slug = SLUG_OF_DIMENSION[dimension] ?? cleanMmorpgGameKind(dimension);
  // Droplet-split: the room's per-minute droplet burn is shared across the
  // seated players (full burn shown at 0 seats), floored to 1 centicentcoin
  // (0.01 coin) and rounded to 2dp. Stored cost_per_min/load_per_min are
  // intentionally ignored for display; settlement stays economy-lane owned;
  // no ledger writes on this path.
  const seated =
    Number.isFinite(players) && players > 0 ? Math.floor(players) : 0;
  const raw =
    seated > 0 ? DROPLET_TOTAL_PER_MIN_COINS / seated : DROPLET_TOTAL_PER_MIN_COINS;
  const coinPerMin = Math.round(Math.max(0.01, raw) * 100) / 100;
  return {
    id: row.id,
    game: slug,
    dimension,
    slug,
    title: row.name,
    name: row.name,
    ageBand: row.age_band,
    age_band: row.age_band,
    players,
    maxPlayers: row.max_players,
    max_players: row.max_players,
    coinPerMin,
    costPerMin: coinPerMin,
    hostFree: row.host_free === true,
    host_free: row.host_free === true,
  };
}

export async function GET(req: Request) {
  if (!hasServerSupabase()) {
    // Honest empty: no backend configured, so no rooms exist to list.
    // Never synthesize demo rooms here.
    return ok({ servers: [], unconfigured: true });
  }
  const { searchParams } = new URL(req.url);
  const gameParam = (searchParams.get("game") ?? "").trim().toLowerCase();
  const dimensionFilter = gameParam ? DIMENSION_OF_SLUG[gameParam] : undefined;
  if (gameParam && !dimensionFilter) {
    return ok({ servers: [] });
  }

  // Public listing must work for guests too (RLS grants servers SELECT to
  // authenticated only), so read through the service client and select
  // public columns exclusively — host_user_id never leaves the server.
  let reader;
  try {
    reader = serviceClient();
  } catch {
    reader = await createClient();
  }
  let query = reader
    .from("mmorpg_servers")
    .select(
      "id, game, name, age_band, host_free, cost_per_min, load_per_min, max_players, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (dimensionFilter) {
    query = query.eq("game", dimensionFilter);
  }
  const { data: servers, error } = await query;
  if (error) {
    return dbFail("mmo/servers GET", error, "Room list is unavailable right now. Try Refresh shortly.");
  }
  const rows = (Array.isArray(servers) ? servers : []) as ServerRow[];
  const ids = rows.map((r) => r.id).filter(Boolean);

  // Live seats: one session row per seated player while left_at IS NULL.
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: sessions, error: sessionError } = await reader
      .from("mmorpg_sessions")
      .select("server_id")
      .in("server_id", ids)
      .is("left_at", null)
      .limit(5000);
    if (sessionError) {
      return dbFail("mmo/servers GET", sessionError, "Room list is unavailable right now. Try Refresh shortly.");
    }
    for (const s of (Array.isArray(sessions) ? sessions : []) as Array<{ server_id?: unknown }>) {
      const sid = typeof s.server_id === "string" ? s.server_id : "";
      if (sid) counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
  }
  return ok({ servers: rows.map((r) => toApiRow(r, counts.get(r.id) ?? 0)) });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) {
    return fail("Server hosting is not configured yet. No room was created, no coins moved.", 503);
  }
  const throttle = rateLimit(`mmorpg-servers:${clientIp(req)}`, 10);
  if (!throttle.allowed) {
    return fail("Please wait before creating another room.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return fail("Login required to host a room.", 401);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Request body must be valid JSON.", 400);
  }
  const { game, ageBand, name, maxPlayers, hostFree } = (body ?? {}) as Record<
    string,
    unknown
  >;

  const slug = typeof game === "string" ? game.trim().toLowerCase() : "";
  const dimension = DIMENSION_OF_SLUG[slug];
  if (!dimension) {
    return fail(`Unknown game. Expected one of: ${ACCEPTED_GAMES}.`, 400);
  }
  if (!isAgeBand(ageBand)) {
    return fail("ageBand must be one of: kids, teens, adults.", 400);
  }
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return fail("name, when provided, must be a non-empty string.", 400);
  }
  if (
    maxPlayers !== undefined &&
    (typeof maxPlayers !== "number" ||
      !Number.isInteger(maxPlayers) ||
      maxPlayers < 2 ||
      maxPlayers > 500)
  ) {
    return fail("maxPlayers, when provided, must be an integer between 2 and 500.", 400);
  }

  // Rate card from the economy lane (cut INCLUDED, never on top): kids
  // rooms are always subsidized to 0; other bands quote this dimension's
  // per-player load rate. Settlement stays economy-lane owned — this route
  // only stores the quoted per-minute figures on the room row.
  const kind = SLUG_OF_DIMENSION[dimension] ?? cleanMmorpgGameKind(slug);
  const costs = resolveMmorpgServerCosts(kind);
  const roomName =
    typeof name === "string" && name.trim() !== ""
      ? name.trim().slice(0, 80)
      : `${slug} room (${ageBand})`;

  // Host-owned insert through the user client so RLS
  // (host_user_id = auth.uid()) enforces ownership server-side.
  const { data: inserted, error } = await supabase
    .from("mmorpg_servers")
    .insert({
      game: dimension,
      name: roomName,
      age_band: ageBand,
      host_user_id: user.id,
      host_free: hostFree === true || ageBand === "kids",
      cost_per_min: ageBand === "kids" ? 0 : costs.loadPerPlayerPerMin,
      load_per_min: costs.loadPerPlayerPerMin,
      rental_per_hour: costs.rentalPerHour,
      max_players: typeof maxPlayers === "number" ? maxPlayers : 50,
    })
    .select(
      "id, game, name, age_band, host_free, cost_per_min, load_per_min, max_players, created_at",
    )
    .single();
  if (error || !inserted) {
    return dbFail("mmo/servers POST", error, "Room could not be created. No coins moved.");
  }
  const row = inserted as ServerRow;
  return ok({ server: toApiRow(row, 0), persisted: true }, 201);
}
