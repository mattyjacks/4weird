import { fail, ok } from "@/lib/api-respond";
import { botRateLimit, hasBotAuth, invalidCredentials, keyHasScope, resolveBotKey } from "@/lib/bot-auth";
import { checkVendorEligibility, type AgeRestrictedVendor } from "@/lib/vendor-eligibility";
import { serviceClient } from "@/lib/supabase/service";

const VENDORS: readonly AgeRestrictedVendor[] = [
  "openrouter", "fal", "runpod", "gemini-api", "elevenlabs", "shopify-checkout", "easydnc",
  "outscraper", "digitalocean", "meshy", "openai", "bouncer", "pexels", "deepseek", "meta-api", "opencode",
];

/** Bot-key eligibility check for first-party desktop clients. The desktop app
 * sends only its 4weird identity key here; provider API keys and prompts stay
 * on-device. Unknown/unreadable age fails closed.
 */
export async function GET(req: Request) {
  if (!hasBotAuth()) return fail("Bot service is not configured.", 503);
  const throttle = botRateLimit(req, "read");
  if (!throttle.allowed) return fail("Rate limited. Try again shortly.", 429, { "Retry-After": String(throttle.retryAfter) });
  const bot = await resolveBotKey(req);
  if (!bot) return fail(invalidCredentials(), 401);
  if (!keyHasScope(bot, "identity:read")) return fail("Key lacks scope: identity:read.", 403);
  const vendor = new URL(req.url).searchParams.get("vendor") as AgeRestrictedVendor | null;
  if (!vendor || !VENDORS.includes(vendor)) return fail(`Unsupported vendor. Use one of: ${VENDORS.join(", ")}.`, 400);
  try {
    const { data, error } = await serviceClient().from("profiles").select("age_band").eq("id", bot.userId).maybeSingle();
    if (error || !data) return fail("Unable to verify account age for this provider.", 503);
    const eligibility = checkVendorEligibility(vendor, data.age_band);
    if (!eligibility.allowed) return fail(eligibility.reason, 403);
    return ok({ allowed: true, vendor });
  } catch {
    return fail("Unable to verify account age for this provider.", 503);
  }
}
