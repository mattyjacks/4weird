import { fail, ok } from "@/lib/api-respond";
import {
  BOT_SCOPES,
  botRateLimit,
  hasBotAuth,
  invalidCredentials,
  keyHasScope,
  resolveBotKey,
} from "@/lib/bot-auth";
import { logBotKeyRequest } from "@/lib/bot-log";
import { clientIp } from "@/lib/validate";

export const dynamic = "force-dynamic";

// GET /api/bot/me; bot identity: username, human_id, key metadata, scopes.
// No secrets are ever returned. Scope: identity:read.
export async function GET(req: Request) {
  if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
  const throttle = botRateLimit(req, "read");
  if (!throttle.allowed) {
    return fail("Rate limited. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const bot = await resolveBotKey(req);
  if (!bot) return fail(invalidCredentials(), 401);
  if (!keyHasScope(bot, "identity:read")) return fail("Key lacks scope: identity:read.", 403);
  void logBotKeyRequest({
    keyId: bot.keyId,
    userId: bot.userId,
    method: "GET",
    path: "/api/bot/me",
    status: 200,
    ip: clientIp(req),
    loggingMode: bot.loggingMode,
  });
  return ok({
    username: bot.username,
    human_id: bot.humanId,
    key_id: bot.keyId,
    key_prefix: bot.prefix,
    scopes: [...BOT_SCOPES],
  });
}
