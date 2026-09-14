import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";

// Optional metered TTS passthrough (Wave 2): mirrors buddy/tts rate limits.
// The interview room defaults to free on-device speechSynthesis ($0/0 coins);
// this route exists for a future server-TTS leg. No key configured today, so
// it answers { fallback: true } and the client uses local speech instead.
export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-speak:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited. Wait a bit and try again.", 429, rateLimitHeaders(rl));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { text } = (body ?? {}) as { text?: unknown };
  if (typeof text !== "string" || text.trim().length < 1 || text.length > 600) {
    return fail("text must be 1..600 characters.", 400);
  }
  return ok({ fallback: true, chars: text.trim().length });
}
