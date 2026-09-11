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

function isUuid(v: unknown): string {
  const s = String(v ?? "");
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

/**
 * GET /api/orgs/[id]/watch — watch scopes in this org (members can read).
 * PUT /api/orgs/[id]/watch {watcher_id, targets: [userIds]} — scope a
 * watcher to certain members (empty targets = whole org). Requires
 * org.members.change_role.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = idFrom(req.url, 2);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  const { data: scopes, error } = await supabase.from("org_watch_scopes").select("*").eq("org_id", orgId).limit(500);
  if (error) return fail("Unable to load watch scopes.", 500);
  return ok({ scopes: scopes ?? [] });
}

export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const orgId = idFrom(req.url, 2);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  const throttle = rateLimit(`org-watch:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const watcher = isUuid(input.watcher_id);
  const targets = Array.isArray(input.targets) ? input.targets.map((t) => String(t)).filter((t) => /^[0-9a-f-]{36}$/i.test(t)) : null;
  if (!watcher || targets === null) return fail("watcher_id and targets[] are required.", 400);
  if (targets.length > 100) return fail("At most 100 watch targets.", 400);
  const { data: count, error } = await supabase.rpc("set_watch_scope", { p_org: orgId, p_watcher: watcher, p_targets: targets });
  if (error) return rpcFail("api/orgs/watch", error, rpcStatus, "Unable to set watch scope.");
  return ok({ targets: Number(count ?? 0) });
}
