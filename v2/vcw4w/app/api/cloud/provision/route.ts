import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { serviceByKey, workspaceQuote } from "@/lib/cloud-catalog";
import { WORKSPACE_COMPUTE_CUT_PCT } from "@/lib/economy";

export const dynamic = "force-dynamic";

// POST /api/cloud/provision; start a pay-as-you-go UnitUnite workspace
// service from the org wallet (RPC checks cloud.provision [+ gpu]).
// Every metered charge includes the 25% per-workspace compute cut
// (WORKSPACE_COMPUTE_CUT_PCT), split per workspace in meter_usage().
// Fund the wallet first with Vibe Coins; provisions are never faked,
// never go negative, and default to the cheapest tier / newest viable runtime.
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`provision:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const orgId = String(input.org_id ?? "");
  const teamId = input.team_id ? String(input.team_id) : null;
  const service = String(input.service ?? "");
  const label = String(input.label ?? "").slice(0, 80);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("org_id is required.", 400);
  if (teamId && !/^[0-9a-f-]{36}$/i.test(teamId)) return fail("Invalid team_id.", 400);
  if (!serviceByKey(service)) return fail("Unknown cloud service.", 400);
  const { data: provision, error } = await supabase.rpc("provision_service", {
    p_org: orgId,
    p_team: teamId,
    p_service: service,
    p_label: label,
  });
  if (error) {
    if (/forbidden|permission/i.test(error.message)) return fail("Missing permission: cloud.provision.", 403);
    if (/team is not in this org/i.test(error.message)) return fail("Team is not in this org.", 400);
    return fail("Unable to provision.", 500);
  }
  const quote = workspaceQuote(service, 1);
  return ok({ provision, cutPct: WORKSPACE_COMPUTE_CUT_PCT, quotePerUnit: quote }, 201);
}
