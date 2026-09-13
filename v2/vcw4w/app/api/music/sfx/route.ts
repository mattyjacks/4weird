// GET /api/music/sfx: machine-readable SFX list + contract.
// Fail-open to empty list when seeds are absent mid-flight. 400s never 500s.

import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp, getCatalog, CONTRACT } from "../_lib";

const SFX_LIMIT = 60;

export async function GET(req: Request) {
  try {
    const rl = rateLimit("music-sfx:" + clientIp(req), SFX_LIMIT);
    if (!rl.allowed) {
      return fail("Rate limited. Try again shortly.", 429, rateLimitHeaders(rl));
    }
    const { sfx, source } = await getCatalog();
    return ok({ sfx, contract: CONTRACT.sfx, source });
  } catch {
    return fail("Invalid sfx request.", 400);
  }
}
