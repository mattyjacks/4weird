import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import {
  botRateLimit,
  extractBotKey,
  hasBotAuth,
  invalidCredentials,
  keyHasScope,
  resolveBotKey,
} from "@/lib/bot-auth";

export const dynamic = "force-dynamic";

function statusOf(message: string): number {
  if (/login required/i.test(message)) return 401;
  if (/forbidden/i.test(message)) return 403;
  if (/not found/i.test(message)) return 404;
  return rpcStatus(message);
}

function isSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{2,60}$/.test(s) ? s : "";
}

/**
 * GET /api/unitunite/rooms?team=<uuid>; list a team's rooms with message
 * and [BOT] counts. Session auth, or `bot4weird_` key + unitunite:read.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const team = new URL(req.url).searchParams.get("team") ?? "";
  if (!isUuid(team)) return fail("team is required.", 400);

  if (extractBotKey(req)) {
    if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
    const throttle = botRateLimit(req, "read");
    if (!throttle.allowed) return fail("Rate limited. Try again shortly.", 429);
    const bot = await resolveBotKey(req);
    if (!bot) return fail(invalidCredentials(), 401);
    if (!keyHasScope(bot, "unitunite:read")) return fail("Key lacks scope: unitunite:read.", 403);
    const db = serviceClient();
    const { data, error } = await db.rpc("agent_list_rooms", { p_user: bot.userId, p_team: team });
    if (error) {
      const code = String((error as { code?: string }).code ?? "");
      if (code === "P0001" || code === "") return fail(String(error.message ?? "Unable to load rooms."), statusOf(String(error.message ?? "")));
      return dbFail("api/unitunite/rooms", error, "Unable to load rooms.");
    }
    return ok({ rooms: data ?? [] });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const throttle = rateLimit(`rooms:list:${data.user.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { data: rooms, error } = await supabase.rpc("list_unitunite_rooms", { p_team: team });
  if (error) return rpcFail("api/unitunite/rooms", error, statusOf, "Unable to load rooms.");
  return ok({ rooms: rooms ?? [] });
}

/**
 * POST /api/unitunite/rooms {team_id, slug, name}; open a room.
 * Session users need team.rooms.create; agents (bot key + unitunite:send)
 * may open rooms for their linked human too.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const teamId = String(input.team_id ?? "");
  const slug = isSlug(input.slug);
  const name = String(input.name ?? "").trim().slice(0, 80);
  if (!isUuid(teamId)) return fail("team_id is required.", 400);
  if (!slug || name.length < 2) return fail("slug (a-z0-9-, 2-60) and name (2-80) are required.", 400);

  if (extractBotKey(req)) {
    if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
    const throttle = botRateLimit(req, "write");
    if (!throttle.allowed) return fail("Rate limited. Try again shortly.", 429);
    const bot = await resolveBotKey(req);
    if (!bot) return fail(invalidCredentials(), 401);
    if (!keyHasScope(bot, "unitunite:send")) return fail("Key lacks scope: unitunite:send.", 403);
    const db = serviceClient();
    const { data, error } = await db.rpc("agent_room_create", {
      p_user: bot.userId,
      p_team: teamId,
      p_slug: slug,
      p_name: name,
    });
    if (error) {
      const code = String((error as { code?: string }).code ?? "");
      if (code === "P0001" || code === "") return fail(String(error.message ?? "Unable to create room."), statusOf(String(error.message ?? "")));
      return dbFail("api/unitunite/rooms", error, "Unable to create room.");
    }
    return ok({ room: data }, 201);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`room-create:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { data: room, error } = await supabase.rpc("create_room", {
    p_team: teamId,
    p_slug: slug,
    p_name: name,
  });
  if (error) {
    if (/forbidden/i.test(error.message)) return fail("Missing permission: team.rooms.create.", 403);
    if (/slug taken/i.test(error.message)) return fail("Slug taken in this team.", 409);
    return rpcFail("api/unitunite/rooms", error, statusOf, "Unable to create room.");
  }
  return ok({ room }, 201);
}
