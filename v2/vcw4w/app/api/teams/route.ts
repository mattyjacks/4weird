import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isSlug(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{2,40}$/.test(s) ? s : "";
}

function isUuid(v: unknown): string {
  const s = String(v ?? "");
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

// GET /api/teams?org=<id> — workspaces visible to me (RLS enforces perms).
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const org = new URL(req.url).searchParams.get("org") ?? "";
  let query = supabase.from("teams").select("id,org_id,slug,name,visibility,created_at").order("created_at", { ascending: false }).limit(100);
  if (isUuid(org)) query = query.eq("org_id", org);
  const { data: teams, error } = await query;
  if (error) return fail("Unable to load teams.", 500);
  return ok({ teams: teams ?? [] });
}

// POST /api/teams — create a workspace (RPC checks org.teams.create).
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`team-create:${u.id}`, 10, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const orgId = isUuid(input.org_id);
  const slug = isSlug(input.slug);
  const name = String(input.name ?? "").trim().slice(0, 80);
  if (!orgId || !slug || name.length < 2) return fail("org_id, slug, and name are required.", 400);
  const { data: team, error } = await supabase.rpc("create_team", {
    p_org: orgId,
    p_slug: slug,
    p_name: name,
  });
  if (error) {
    if (/forbidden/i.test(error.message)) return fail("Missing permission: org.teams.create.", 403);
    if (/slug taken/i.test(error.message)) return fail("Slug taken in this org.", 409);
    return fail("Unable to create team.", 500);
  }
  return ok({ team }, 201);
}
