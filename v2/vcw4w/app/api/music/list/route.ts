import { fail, ok } from "@/lib/api-respond";
import { botRateLimit } from "@/lib/bot-auth";
import { buildMusicRegistry } from "@/lib/music-api";

// GET /api/music/list — same public `$music:1` seed registry as GET
// /api/music, under the path the gallery client links to. Public, throttled
// bot read, no credential (same as /api/music). Added by the music-swarm
// integrator so the /music/all gallery link never 404s.
export async function GET(req: Request) {
  const throttle = botRateLimit(req, "read");
  if (!throttle.allowed) {
    return fail("Rate limited. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }
  const registry = buildMusicRegistry();
  return ok({
    format: registry.format,
    songs: registry.songs,
    sfx: registry.sfx,
    contract: registry.contract,
  });
}
