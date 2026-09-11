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

function idFrom(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  // /api/unitunite/rooms/[id]/messages → the segment before "messages".
  const i = parts.lastIndexOf("messages");
  return parts[i - 1] ?? "";
}

function statusOf(message: string): number {
  if (/login required/i.test(message)) return 401;
  if (/forbidden/i.test(message)) return 403;
  if (/room not found|team not found/i.test(message)) return 404;
  return rpcStatus(message);
}

function clampLimit(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

/**
 * GET /api/unitunite/rooms/[id]/messages?limit=&before=; read a room.
 * Members/owners auto-join on read so the user always sees their chats.
 * Every message carries is_bot + encoding; clients MUST render bot rows
 * with a [BOT] label and must NOT attempt decrypt on encoding='plain'.
 * Session auth, or `bot4weird_` key + unitunite:read.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const roomId = idFrom(req.url);
  if (!isUuid(roomId)) return fail("Invalid room.", 400);
  const q = new URL(req.url).searchParams;
  const limit = clampLimit(q.get("limit"));
  const before = q.get("before");

  if (extractBotKey(req)) {
    if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
    const throttle = botRateLimit(req, "read");
    if (!throttle.allowed) return fail("Rate limited. Try again shortly.", 429);
    const bot = await resolveBotKey(req);
    if (!bot) return fail(invalidCredentials(), 401);
    if (!keyHasScope(bot, "unitunite:read")) return fail("Key lacks scope: unitunite:read.", 403);
    const db = serviceClient();
    const { data, error } = await db.rpc("agent_room_read", {
      p_user: bot.userId,
      p_room: roomId,
      p_limit: limit,
      p_before: before,
    });
    if (error) {
      const code = String((error as { code?: string }).code ?? "");
      if (code === "P0001" || code === "") return fail(String(error.message ?? "Unable to read room."), statusOf(String(error.message ?? "")));
      return dbFail("api/unitunite/rooms/messages", error, "Unable to read room.");
    }
    return ok({ room: (data as { room?: unknown } | null)?.room ?? null, messages: (data as { messages?: unknown } | null)?.messages ?? [] });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const throttle = rateLimit(`room-read:${data.user.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  const { data: out, error } = await supabase.rpc("read_room_messages", {
    p_room: roomId,
    p_limit: limit,
    p_before: before,
  });
  if (error) return rpcFail("api/unitunite/rooms/messages", error, statusOf, "Unable to read room.");
  const shaped = (out ?? {}) as { room?: unknown; messages?: unknown };
  return ok({ room: shaped.room ?? null, messages: shaped.messages ?? [] });
}

/**
 * POST /api/unitunite/rooms/[id]/messages; send a chat message.
 * Human E2EE send: {ciphertext, session_key_id?, device?}.
 * Agent relay (the antisocial flow): {text, bot_name?, as_bot:true} -
 * stored plaintext, ALWAYS labeled [BOT]. Session users need rooms.send;
 * `bot4weird_` keys need unitunite:send and are ALWAYS labeled [BOT]
 * (text → plain relay, or ciphertext passthrough for key-holding bots).
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const roomId = idFrom(req.url);
  if (!isUuid(roomId)) return fail("Invalid room.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const asBot = input.as_bot === true || typeof input.text === "string";
  const text = typeof input.text === "string" ? input.text : "";
  const botName = String(input.bot_name ?? "").trim().slice(0, 40);
  const ciphertext = typeof input.ciphertext === "string" ? input.ciphertext : "";
  if (asBot && (text.trim().length < 1 || text.length > 4000))
    return fail("Agent text must be 1..4000 characters.", 400);
  if (!asBot && (ciphertext.length < 1 || ciphertext.length > 16000))
    return fail("ciphertext must be 1..16000 characters.", 400);

  if (extractBotKey(req)) {
    if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
    const throttle = botRateLimit(req, "write");
    if (!throttle.allowed) return fail("Rate limited. Try again shortly.", 429);
    const bot = await resolveBotKey(req);
    if (!bot) return fail(invalidCredentials(), 401);
    if (!keyHasScope(bot, "unitunite:send")) return fail("Key lacks scope: unitunite:send.", 403);
    const db = serviceClient();
    const useCipher = !asBot;
    const { data, error } = await db.rpc("agent_room_send", {
      p_user: bot.userId,
      p_room: roomId,
      p_text: useCipher ? ciphertext : text,
      p_bot_name: botName,
      p_encoding: useCipher ? "cipher" : "plain",
      p_session: String(input.session_key_id ?? ""),
      p_device: String(input.device ?? "agent-relay"),
    });
    if (error) {
      const code = String((error as { code?: string }).code ?? "");
      if (code === "P0001" || code === "") return fail(String(error.message ?? "Unable to send."), statusOf(String(error.message ?? "")));
      return dbFail("api/unitunite/rooms/messages", error, "Unable to send.");
    }
    return ok({ id: data, is_bot: true }, 201);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`room-send:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  if (asBot) {
    const { data: id, error } = await supabase.rpc("send_room_packet_as_bot", {
      p_room: roomId,
      p_text: text,
      p_bot_name: botName,
    });
    if (error) return rpcFail("api/unitunite/rooms/messages", error, statusOf, "Unable to send.");
    return ok({ id, is_bot: true }, 201);
  }
  const { data: id, error } = await supabase.rpc("send_room_packet", {
    p_room: roomId,
    p_cipher: ciphertext,
    p_session: String(input.session_key_id ?? ""),
    p_device: String(input.device ?? "unknown"),
  });
  if (error) return rpcFail("api/unitunite/rooms/messages", error, statusOf, "Unable to send.");
  return ok({ id, is_bot: false }, 201);
}

/**
 * DELETE /api/unitunite/rooms/[id]/messages {message_id}; redact a message
 * (rooms.moderate, session users only; bots cannot redact).
 */
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (extractBotKey(req)) return fail("Bots cannot redact messages.", 403);
  const roomId = idFrom(req.url);
  if (!isUuid(roomId)) return fail("Invalid room.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const messageId = String((body as Record<string, unknown> | null)?.message_id ?? "");
  if (!isUuid(messageId)) return fail("message_id is required.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const { error } = await supabase.rpc("redact_room_message", { p_message: messageId });
  if (error) return rpcFail("api/unitunite/rooms/messages", error, statusOf, "Unable to redact.");
  return ok({ redacted: true });
}
