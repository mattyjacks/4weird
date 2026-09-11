import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "");
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

/** GET /api/ghost/summary?org=<id>; one-round-trip book for the /timer page. */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const org = isUuid(new URL(req.url).searchParams.get("org"));
  if (!org) return fail("org is required.", 400);
  const { data: summary, error } = await supabase.rpc("ghost_org_summary", { p_org: org });
  if (error) return rpcFail("api/ghost/summary", error, rpcStatus, "Unable to load Ghost books.");
  return ok({ summary });
}

/** POST /api/ghost/summary {org_id}; same book via body (for large clients). */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const org = isUuid((body as Record<string, unknown> | null)?.org_id);
  if (!org) return fail("org_id is required.", 400);
  const { data: summary, error } = await supabase.rpc("ghost_org_summary", { p_org: org });
  if (error) return rpcFail("api/ghost/summary", error, rpcStatus, "Unable to load Ghost books.");
  return ok({ summary });
}
