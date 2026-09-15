import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { clientIp, clampLimit, isSlug, isUuid } from "@/lib/validate";
import { dbFail, fail, isMissingSchemaError, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  MMO_CAP_MAX,
  MMO_CAP_MIN,
  MMO_DEAD_AFTER_MS,
  cleanAgeBand,
  cleanCap,
  cleanGameSlug,
  cleanRoomId,
  normalizeServerSummary,
  realtimeHintsFor,
} from "@/lib/mmo-presence";

/**
 * MMO server registry (DS-MMO-09). REST is the source of truth; Supabase
 * Realtime Presence + Broadcast carry ephemeral 10-20 Hz state per room
 * (see `lib/mmo-presence.ts`); every response carries the channel hints.
 *
 * Expected `mmo_servers` contract (DS-MMO-10 owns the migration — align it
 * here): id uuid pk, game text, room text, host_user_id uuid, cap int
 * (2..256), age_band text, status text (`live`|`draining`|`dead`),
 * heartbeat_token_hash text (sha256 hex), tick_seq bigint default 0,
 * player_count int default 0, last_heartbeat_at timestamptz,
 * created_at/updated_at timestamptz.
 *
 * - GET: list `live` + `draining` servers (+ opportunistic dead-sweep).
 * - POST: register a server (login required; returns the raw heartbeat
 *   bearer token ONCE — it is stored hashed and never readable again).
 * - PATCH: drain a server (host only; `live` -> `draining`).
 */

const REGISTER_PER_USER = 6;
const REGISTER_PER_IP = 20;

function tokenHash(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Best-effort dead-sweeper: stale `live` rows -> `dead`. Never throws. */
async function sweepDead(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - MMO_DEAD_AFTER_MS).toISOString();
    const { data, error } = await supabase
      .from("mmo_servers")
      .update({ status: "dead" })
      .lt("last_heartbeat_at", cutoff)
      .eq("status", "live")
      .select("id");
    if (error || !Array.isArray(data)) return 0;
    return data.length;
  } catch {
    return 0;
  }
}

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const ip = clientIp(req);
  const throttle = rateLimit(`mmo-servers-list:${ip}`, 60);
  if (!throttle.allowed) return fail("Too many requests. Try again shortly.", 429, rateLimitHeaders(throttle));

  const url = new URL(req.url);
  const game = isSlug(url.searchParams.get("game") ?? "");
  const limit = clampLimit(url.searchParams.get("limit") ?? "", 25, 50);

  const supabase = await createClient();
  let query = supabase
    .from("mmo_servers")
    .select("id,game,room,status,player_count,cap")
    .in("status", ["live", "draining"])
    .order("player_count", { ascending: false })
    .limit(limit);
  if (game) query = query.eq("game", game);
  const { data, error } = await query;
  if (error) {
    // Fail-open on missing table (migration not yet applied): empty server
    // list, not a 500 that blanks the server browser. (DS-PAGEFIX-07)
    if (isMissingSchemaError(error)) {
      console.error("[api] mmo-servers-list mmo_servers table missing, returning empty list", {
        code: String((error as { code?: unknown }).code ?? "").slice(0, 16),
      });
      return ok({
        servers: [],
        swept: 0,
        unavailable: true,
        realtime: realtimeHintsFor(game || "4weird", "lobby"),
      });
    }
    return dbFail("mmo-servers-list", error);
  }

  const servers = (Array.isArray(data) ? data : [])
    .map((entry) => normalizeServerSummary(entry))
    .filter((row): row is NonNullable<typeof row> => row !== null);
  const swept = await sweepDead(supabase);
  return ok({
    servers,
    swept,
    realtime: realtimeHintsFor(game || "4weird", "lobby"),
  });
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);

  const userThrottle = rateLimit(`mmo-servers-register:${u.id}`, REGISTER_PER_USER);
  if (!userThrottle.allowed) {
    return fail("Too many server registrations. Try again shortly.", 429, rateLimitHeaders(userThrottle));
  }
  const ipThrottle = rateLimit(`mmo-servers-register-ip:${clientIp(req)}`, REGISTER_PER_IP);
  if (!ipThrottle.allowed) {
    return fail("Too many server registrations. Try again shortly.", 429, rateLimitHeaders(ipThrottle));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const row = (body ?? {}) as Record<string, unknown>;
  const game = cleanGameSlug(row.game);
  if (!game) return fail("Invalid game.", 400);
  const room = cleanRoomId(row.room);
  const cap = cleanCap(row.cap ?? MMO_CAP_MIN);
  if (cap < MMO_CAP_MIN || cap > MMO_CAP_MAX) return fail("Invalid cap.", 400);
  const ageBand = cleanAgeBand(row.age_band);

  const rawToken = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const { data: created, error } = await supabase
    .from("mmo_servers")
    .insert({
      game,
      room,
      host_user_id: u.id,
      cap,
      age_band: ageBand,
      status: "live",
      heartbeat_token_hash: tokenHash(rawToken),
      tick_seq: 0,
      player_count: 0,
      last_heartbeat_at: now,
    })
    .select("id,game,room,status,player_count,cap")
    .single();
  if (error || !created) return dbFail("mmo-servers-register", error);

  const server = normalizeServerSummary(created);
  if (!server) return fail("Unable to register server.", 500);
  return ok(
    {
      server,
      // Shown ONCE: only the hash is stored; rotation means re-register.
      heartbeat_token: rawToken,
      realtime: realtimeHintsFor(game, room),
    },
    201,
  );
}

export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`mmo-servers-drain:${u.id}`, 30);
  if (!throttle.allowed) return fail("Too many requests. Try again shortly.", 429, rateLimitHeaders(throttle));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const row = (body ?? {}) as Record<string, unknown>;
  const serverId = typeof row.server_id === "string" && isUuid(row.server_id) ? row.server_id : "";
  if (!serverId) return fail("Invalid server.", 400);
  if (row.op !== "drain") return fail("Invalid op.", 400);

  const { data: existing, error: readError } = await supabase
    .from("mmo_servers")
    .select("id,game,room,status,player_count,cap,host_user_id")
    .eq("id", serverId)
    .single();
  if (readError || !existing) return dbFail("mmo-servers-drain", readError);
  const hostId = (existing as Record<string, unknown>).host_user_id;
  if (hostId !== u.id) return fail("Only the host can drain this server.", 403);

  const { data: updated, error: writeError } = await supabase
    .from("mmo_servers")
    .update({ status: "draining" })
    .eq("id", serverId)
    .eq("status", "live")
    .select("id,game,room,status,player_count,cap")
    .single();
  if (writeError || !updated) return dbFail("mmo-servers-drain", writeError);
  const server = normalizeServerSummary(updated);
  if (!server) return fail("Unable to drain server.", 500);
  const game = typeof (updated as Record<string, unknown>).game === "string"
    ? String((updated as Record<string, unknown>).game)
    : "4weird";
  return ok({ server, realtime: realtimeHintsFor(game, server.room) });
}
