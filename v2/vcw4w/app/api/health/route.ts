import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";


export async function GET(req: Request) {
  const ipThrottle = rateLimit(`health-ip:${clientIp(req)}`, 60, 60_000);
  if (!ipThrottle.allowed) return fail("Rate limited.", 429);
  return ok({ service: "4weird-auth", time: new Date().toISOString() });
}
