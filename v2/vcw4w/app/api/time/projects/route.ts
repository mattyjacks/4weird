import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
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

  return ok({
    projects: (projects ?? []).map((p: any) => ({
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
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const u = auth?.user;
  if (!u) return fail("Login required.", 401);

  const throttle = rateLimit(`timer-proj-create:${u.id}`, 20, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const { name, color = "#3b82f6", ghostRate = 0, budgetHours, isBillable = true, orgId, clientId } = body || {};

  const cleanName = String(name || "").trim().slice(0, 100);
  if (!cleanName) return fail("Project name is required (1-100 chars).", 400);

  const rate = Math.max(Number(ghostRate) || 0, 0);

  const { data: project, error } = await supabase
    .from("timer_projects")
    .insert({
      user_id: u.id,
      name: cleanName,
      color: String(color).slice(0, 7),
      ghost_rate: rate,
      budget_hours: budgetHours ? Number(budgetHours) : null,
      is_billable: !!isBillable,
      org_id: orgId || null,
      client_id: clientId || null,
    })
    .select()
    .single();

  if (error) return dbFail("POST /api/time/projects", error, "Failed to create timer project.");

  return ok({ project }, 201);
}
