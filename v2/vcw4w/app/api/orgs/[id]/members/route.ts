import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function idFrom(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  // /api/orgs/[id]/members → the segment before "members".
  const i = parts.lastIndexOf("members");
  return parts[i - 1] ?? "";
}

/**
 * GET /api/orgs/[id]/members — roster with display names, full role sets
 * (legacy + presets), and watcher scopes. Membership-gated via org_roster.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = idFrom(req.url);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  const { data: roster, error } = await supabase.rpc("org_roster", { p_org: orgId });
  if (error) return rpcFail("api/orgs/members", error, rpcStatus, "Unable to load roster.");
  const r = (roster ?? {}) as { members?: unknown; scopes?: unknown };
  return ok({ members: r.members ?? [], scopes: r.scopes ?? [] });
}
