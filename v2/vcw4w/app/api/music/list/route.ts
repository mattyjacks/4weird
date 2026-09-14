import { fail, ok } from "@/lib/api-respond";
import { botRateLimit } from "@/lib/bot-auth";
import { CONTRACT, getCatalog } from "../_lib";

// GET /api/music/list — same public 4W-1 seed registry as GET
// /api/music (content/music sidecars + SFX, fail-open to empty),
// under the path the gallery client links to. Public, throttled
// bot read, no credential. 400s never 500s.
export async function GET(req: Request) {
  try {
    const throttle = botRateLimit(req, "read");
    if (!throttle.allowed) {
      return fail("Rate limited. Try again shortly.", 429, {
        "Retry-After": String(throttle.retryAfter),
      });
    }
    const { songs, sfx, source } = await getCatalog();
    return ok({ songs, sfx, contract: CONTRACT, source });
  } catch {
    return fail("Invalid music list request.", 400);
  }
}
