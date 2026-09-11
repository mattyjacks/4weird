import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/time/projects - List projects (personal and org)
export async function GET() {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const { data: projects, error } = await supabase
    .from("timer_projects")
    .select(`
      id,
      name,
      color,
      ghost_rate,
      budget_hours,
      is_billable,
      is_archived,
      org_id,
      team_id,
      client_id,
      created_at,
      updated_at,
      org:orgs(id, slug, name),
      client:profiles!timer_projects_client_id_fkey(id, username, display_name)
    `)
    .order("name", { ascending: true });

  if (error) return dbFail("GET /api/time/projects", error, "Failed to load timer projects.");

  type ProjectRow = {
    id: string;
    name: string;
    color: string | null;
    ghost_rate: number | string | null;
    budget_hours: number | string | null;
    is_billable: boolean;
    is_archived: boolean;
    org_id: string | null;
    team_id: string | null;
    client_id: string | null;
    org: { id: string; slug: string; name: string } | null;
    client: { id: string; username: string; display_name: string | null } | null;
    created_at: string;
    updated_at: string;
  };

  return ok({
    projects: ((projects ?? []) as unknown as ProjectRow[]).map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      ghostRate: Number(p.ghost_rate || 0),
      budgetHours: p.budget_hours ? Number(p.budget_hours) : null,
      isBillable: p.is_billable,
      isArchived: p.is_archived,
      orgId: p.org_id,
      teamId: p.team_id,
      clientId: p.client_id,
      org: p.org ? { id: p.org.id, slug: p.org.slug, name: p.org.name } : null,
      client: p.client ? { id: p.client.id, username: p.client.username, displayName: p.client.display_name } : null,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
  });
}

// POST /api/time/projects - Create a timer project with Ghost Cash rate
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const throttle = rateLimit(`timer-proj-create:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { name, color = "#3b82f6", ghostRate = 0, budgetHours, isBillable = true, orgId, clientId } = body ?? {};

  const cleanName = String(name || "").trim().slice(0, 100);
  if (!cleanName) return fail("Project name is required (1-100 chars).", 400);

  const rate = Math.max(Number(ghostRate as number | string) || 0, 0);

  const { data: project, error } = await supabase
    .from("timer_projects")
    .insert({
      user_id: u.id,
      name: cleanName,
      color: String(color).slice(0, 7),
      ghost_rate: rate,
      budget_hours: budgetHours ? Number(budgetHours as number | string) : null,
      is_billable: Boolean(isBillable),
      org_id: orgId ? String(orgId) : null,
      client_id: clientId ? String(clientId) : null,
    })
    .select()
    .single();

  if (error) return dbFail("POST /api/time/projects", error, "Failed to create timer project.");

  return ok({ project }, 201);
}
