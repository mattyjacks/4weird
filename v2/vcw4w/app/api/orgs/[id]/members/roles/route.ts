import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function idFrom(url: string, back: number): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[parts.length - back] ?? "";
}

/**
 * PUT /api/orgs/[id]/members/roles {user_id, roles: ["banker","watcher"]}
 *; assign a preset bundle (1-5 templates) to a member. Different bundles
 * per org; power is the UNION of the legacy single role and every preset.
 * Requires org.members.change_role (Lord/owner/admin…). Returns all keys.
 */
export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const orgId = idFrom(req.url, 3);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  const throttle = rateLimit(`org-roles:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const target = String(input.user_id ?? "");
  const roles = Array.isArray(input.roles) ? input.roles.map((r) => String(r)) : [];
  if (!/^[0-9a-f-]{36}$/i.test(target)) return fail("user_id is required.", 400);
  if (roles.length < 1 || roles.length > 5) return fail("Give 1-5 roles.", 400);
  const { data: result, error } = await supabase.rpc("set_member_roles", { p_org: orgId, p_user: target, p_roles: roles });
  if (error) return rpcFail("api/orgs/members/roles", error, rpcStatus, "Unable to assign roles.");
  return ok({ roles: result ?? [] });
}
