import { dbFail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/vcw/gateway/status; public Hybrid gateway descriptor.
 *
 * Public (no Authentication required): works unconfigured like /api/vcw/health,
 * so integrators can probe gateway availability before wiring keys.
 * Rate limited per IP; DB errors (none expected on this static payload)
 * route through dbFail so the shape stays honest if a future check queries.
 */
export async function GET(req: Request) {
  const rl = rateLimit(`vcw:gateway:status:${req.headers.get("x-forwarded-for") ?? "anon"}`, 60, 60_000);
  if (!rl.allowed) {
    return dbFail("vcw/gateway/status", { code: "429" }, "Rate limited.");
  }
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
}
