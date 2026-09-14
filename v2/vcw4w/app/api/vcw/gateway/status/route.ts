import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";


/**
 * GET /api/vcw/gateway/status; public Hybrid gateway descriptor.
 *
 * Public (no Authentication required): works unconfigured like /api/vcw/health,
 * so integrators can probe gateway availability before wiring keys.
 * Rate limited per IP with Retry-After; unexpected faults route through
 * dbFail so the shape stays honest ({ success:false }, no raw internals).
 */
export async function GET(req: Request) {
  // clientIp() trusts the Vercel edge header first; raw x-forwarded-for is
  // client-spoofable, so it is never used directly as a throttle key.
  const rl = rateLimit(`vcw:gateway:status:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited.", 429, rateLimitHeaders(rl));
  }
  try {
    return ok({
      service: "vcw-gateway",
      mode: "hybrid",
      hosted: {
        selfHostMonthly: "$420/mo",
        markupHostedPct: 15,
        markupEnterprisePct: 9,
      },
      byok: {
        supported: ["runpod", "openai", "fal", "meshy", "custom"],
      },
      legal: {
        credits: "closed-loop, no cash-out",
        law: "NH, USA",
      },
    });
  } catch (error) {
    return dbFail("vcw/gateway/status", error, "Unable to load gateway status.");
  }
}
