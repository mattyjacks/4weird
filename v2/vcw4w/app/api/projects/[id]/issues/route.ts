import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/projects/:id/issues - Issues tab list (RLS needs project.issues.view).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid project.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const { data: issues, error } = await supabase
    .from("project_issues")
    .select("id,number,title,state,author_id,assignee_id,created_at,updated_at")
    .eq("project_id", id)
    .order("number", { ascending: false })
    .limit(100);
  if (error) return fail("Unable to load issues (missing project.issues.view?).", 403);
  return ok({ issues: issues ?? [] });
}

// POST /api/projects/:id/issues; open an issue (RPC checks project.issues.create).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid project.", 400);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`issue-open:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const title = String(input.title ?? "").trim().slice(0, 200);
  const issueBody = String(input.body ?? "").slice(0, 20000);
  if (!title) return fail("Title is required.", 400);
  const { data: issue, error } = await supabase.rpc("open_issue", {
    p_project: id,
    p_title: title,
    p_body: issueBody,
  });
  if (error) {
    if (/forbidden/i.test(error.message)) return fail("Missing permission: project.issues.create.", 403);
    return fail("Unable to open issue.", 500);
  }
  return ok({ issue }, 201);
}
