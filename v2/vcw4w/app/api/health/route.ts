import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { hasServerSupabase, supabaseServiceRoleKey } from "@/lib/supabase/service";
import { clientIp } from "@/lib/validate";


export async function GET(req: Request) {
  const ipThrottle = rateLimit(`health-ip:${clientIp(req)}`, 60, 60_000);
  if (!ipThrottle.allowed) return fail("Rate limited.", 429);
  return ok({
    service: "4weird-auth",
    time: new Date().toISOString(),
    // Deployment marker: proves WHICH build is live. Env changes only take
    // effect on a new deployment — compare commit before/after redeploy.
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    // Store-config presence (booleans only, never values): proves the
    // redeploy picked up the Supabase env. serviceKey false → the feedback
    // 503 persists no matter what the DB holds. (The 503 itself already
    // discloses this, so the booleans leak nothing new.)
    store: {
      url: hasServerSupabase(),
      serviceKey: Boolean(supabaseServiceRoleKey()),
    },
  });
}
