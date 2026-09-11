import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

function idFrom(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  // /api/orgs/[id]/invites → the segment before "invites".
  const i = parts.lastIndexOf("invites");
  return parts[i - 1] ?? "";
}

function statusOf(message: string): number {
  if (/forbidden/i.test(message)) return 403;
  return rpcStatus(message);
}

/**
 * GET /api/orgs/[id]/invites; list shareable invite links (inviters only).
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = idFrom(req.url);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  const { data: invites, error } = await supabase.rpc("list_org_invites", { p_org: orgId });
  if (error) return rpcFail("api/orgs/invites", error, statusOf, "Unable to load invites.");
  return ok({ invites: invites ?? [] });
}

/**
 * POST /api/orgs/[id]/invites {role_key?, max_uses?, expires_at?, label?}
 *; create a shareable invite link with customized usage cap + expiry.
 * max_uses null = unlimited (1..10000 otherwise); expires_at null = never.
 * Creating the first link initializes an uninitialized default org.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const orgId = idFrom(req.url);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  const throttle = rateLimit(`org-invite:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const role = String(input.role_key ?? input.role ?? "viewer").trim().toLowerCase().slice(0, 32) || "viewer";
  const maxUses =
    input.max_uses === null || input.max_uses === undefined || input.max_uses === ""
      ? null
      : Number(input.max_uses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10000))
    return fail("max_uses must be 1..10000 or null for unlimited.", 400);
  let expiresAt: string | null = null;
  if (input.expires_at !== null && input.expires_at !== undefined && input.expires_at !== "") {
    const t = new Date(String(input.expires_at));
    if (Number.isNaN(t.getTime())) return fail("Invalid expires_at.", 400);
    if (t.getTime() <= Date.now()) return fail("Expiry must be in the future.", 400);
    expiresAt = t.toISOString();
  }
  const label = String(input.label ?? "").trim().slice(0, 60);
  const { data: invite, error } = await supabase.rpc("create_org_invite_link", {
    p_org: orgId,
    p_role: role,
    p_max_uses: maxUses,
    p_expires_at: expiresAt,
    p_label: label,
    p_custom: null,
  });
  if (error) return rpcFail("api/orgs/invites", error, statusOf, "Unable to create invite.");
  return ok({ invite }, 201);
}

/**
 * DELETE /api/orgs/[id]/invites {invite_id}; revoke a link (token stops
 * working; past uses stay on the audit trail).
 */
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = idFrom(req.url);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const inviteId = String((body as Record<string, unknown> | null)?.invite_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return fail("invite_id is required.", 400);
  const { error } = await supabase.rpc("revoke_org_invite", { p_invite: inviteId });
  if (error) return rpcFail("api/orgs/invites", error, statusOf, "Unable to revoke invite.");
  return ok({ revoked: true });
}
