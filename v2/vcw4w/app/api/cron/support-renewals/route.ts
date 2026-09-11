import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET|POST /api/cron/support-renewals — renew due support subscriptions.
// Fired by Vercel Cron daily (see vercel.json). CRON_SECRET-gated; the
// renew_support_subscriptions() RPC is service_role-only, so supporters are
// never charged by client-reachable code. Short on coins → past_due, never
// a negative balance.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const url = new URL(req.url);
  const query = url.searchParams.get("secret") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return query === secret || bearer === secret;
}

async function tick() {
  const db = serviceClient();
  const { data, error } = await db.rpc("renew_support_subscriptions", {});
  if (error) {
    console.error("[cron/support-renewals]", error.code ?? error.message);
    return fail("Renewal tick failed.", 500);
  }
  return ok({ tick: data, at: new Date().toISOString() });
}

export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}

export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!authorized(req)) return fail("Unauthorized.", 401);
  return tick();
}
