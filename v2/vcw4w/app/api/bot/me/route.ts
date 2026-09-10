import { fail, ok } from "@/lib/api-respond";
import {
  BOT_SCOPES,
  botRateLimit,
  hasBotAuth,
  invalidCredentials,
  resolveBotKey,
} from "@/lib/bot-auth";

export const dynamic = "force-dynamic";

// GET /api/bot/me — bot identity: username, human_id, key metadata, scopes.
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
  return ok({
    username: bot.username,
    human_id: bot.humanId,
    key_id: bot.keyId,
    key_prefix: bot.prefix,
    scopes: [...BOT_SCOPES],
  });
}
