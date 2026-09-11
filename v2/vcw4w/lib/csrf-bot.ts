import { sameOrigin } from "./csrf";
import { resolveBotKey } from "./bot-auth";

/**
 * CSRF-or-credential gate for routes that accept BOTH cookie sessions and
 * `bot4weird_` keys. Browsers prove same-origin (Origin/Referer host ===
 * Host); bots prove a VALID key (a present-but-unknown/revoked/expired key
 * is not enough). Either success opens the gate; both missing fails closed.
 *
 * Why this exists instead of plain sameOrigin(): curl-style bots send no
 * Origin/Referer, so an unconditional check 403s every documented bot call
 * (see public/bot/skill.md). Why not rely on the central proxy gate alone:
 * it exempts on secret-header PRESENCE, while this resolves the key against
 * the database (revocation/expiry/scopes enforced), strictly stronger.
 *
 * Kept OUT of lib/csrf.ts on purpose: proxy.ts (edge-safe) imports csrf.ts,
 * and this module pulls the service-role bot-auth chain (node:crypto,
 * Supabase service client) which must never enter that bundle. Routes run
 * in Node and already import bot-auth; they should import this helper.
 */
export async function sameOriginOrBotKey(req: Request): Promise<boolean> {
  if (sameOrigin(req)) return true;
  try {
    return (await resolveBotKey(req).catch(() => null)) !== null;
  } catch {
    return false;
  }
}
