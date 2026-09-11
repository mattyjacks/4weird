import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{2,60}$/.test(s) ? s : "";
}

// POST /api/projects - GitHub-like project (RPC checks team.projects.create,
// seeds Code-tab README + Issues-tab welcome + default labels).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`project-create:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const teamId = String(input.team_id ?? "");
  const slug = isSlug(input.slug);
  const name = String(input.name ?? "").trim().slice(0, 100);
  const visibility = ["private", "internal", "public"].includes(String(input.visibility))
    ? String(input.visibility)
    : "private";
  if (!/^[0-9a-f-]{36}$/i.test(teamId) || !slug || name.length < 2) {
    return fail("team_id, slug, and name are required.", 400);
  }
  const { data: project, error } = await supabase.rpc("create_project", {
    p_team: teamId,
    p_slug: slug,
    p_name: name,
    p_visibility: visibility,
  });
  if (error) {
    if (/forbidden/i.test(error.message)) return fail("Missing permission: team.projects.create.", 403);
    if (/slug taken/i.test(error.message)) return fail("Slug taken in this team.", 409);
    return fail("Unable to create project.", 500);
  }
  return ok({ project }, 201);
}
