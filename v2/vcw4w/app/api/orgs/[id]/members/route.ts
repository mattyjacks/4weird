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
 * GET /api/orgs/[id]/members; roster with display names, full role sets
 * (legacy + presets), and watcher scopes. Membership-gated via org_roster.
 *
 * Big-org read path: ?paged=1&limit=&cursor=&cursor_id=&q= serves the
 * keyset-paginated org_roster_page (limit clamped 1..100, newest-last)
 * with an O(1) cached total — this is how 8,000-member orgs stay fast.
 * Without ?paged, the legacy full roster (up to 500) is returned.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = idFrom(req.url);
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return fail("Invalid org.", 400);
  const url = new URL(req.url);
  if (url.searchParams.get("paged")) {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 25) || 25));
    const rawCursor = url.searchParams.get("cursor") ?? "";
    const rawCursorId = url.searchParams.get("cursor_id") ?? "";
    // Keyset cursors travel as a pair; a half cursor would match nothing.
    const cursorOk = rawCursor !== "" && !Number.isNaN(Date.parse(rawCursor));
    const cursorIdOk = /^[0-9a-f-]{36}$/i.test(rawCursorId);
    const q = (url.searchParams.get("q") ?? "").slice(0, 40);
    const { data: page, error } = await supabase.rpc("org_roster_page", {
      p_org: orgId,
      p_limit: limit,
      p_cursor: cursorOk && cursorIdOk ? rawCursor : null,
      p_cursor_id: cursorOk && cursorIdOk ? rawCursorId : null,
      p_search: q,
    });
    if (error) return rpcFail("api/orgs/members", error, rpcStatus, "Unable to load roster.");
    const p = (page ?? {}) as { members?: Array<{ joined_at: string; id: string }>; total?: number; scopes?: unknown };
    const members = Array.isArray(p.members) ? p.members : [];
    // The page RPC fetches limit+1 rows to detect the next page; trim here
    // and hand the caller the keyset cursor for it.
    const hasMore = members.length > limit;
    const rows = hasMore ? members.slice(0, limit) : members;
    const last = rows[rows.length - 1];
    return ok({
      members: rows,
      total: Number(p.total) || 0,
      scopes: Array.isArray(p.scopes) ? p.scopes : [],
      has_more: hasMore,
      next_cursor: hasMore && last ? last.joined_at : null,
      next_cursor_id: hasMore && last ? last.id : null,
    });
  }
  const { data: roster, error } = await supabase.rpc("org_roster", { p_org: orgId });
  if (error) return rpcFail("api/orgs/members", error, rpcStatus, "Unable to load roster.");
  const r = (roster ?? {}) as { members?: unknown; scopes?: unknown };
  return ok({ members: r.members ?? [], scopes: r.scopes ?? [] });
}
