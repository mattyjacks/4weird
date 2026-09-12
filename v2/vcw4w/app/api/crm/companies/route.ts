import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

// GET /api/crm/companies?org_id=<uuid>
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const orgId = isUuid(new URL(req.url).searchParams.get("org_id"));
  let q = supabase
    .from("crm_companies")
    .select("id,org_id,owner_id,name,domain,industry,size,website,notes,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (orgId) q = q.eq("org_id", orgId);
  const { data: companies, error } = await q;
  if (error) return dbFail("GET /api/crm/companies", error, "Unable to load companies.");
  return ok({ companies: companies ?? [] });
}

// POST /api/crm/companies
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-company-create:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const orgId = isUuid(input.org_id);
  const name = String(input.name ?? "").trim().slice(0, 120);
  const domain = String(input.domain ?? "").trim().slice(0, 120) || null;
  const industry = String(input.industry ?? "").trim().slice(0, 80) || null;
  const size = String(input.size ?? "").trim().slice(0, 40) || null;
  const website = String(input.website ?? "").trim().slice(0, 200) || null;
  const notes = String(input.notes ?? "").trim().slice(0, 2000) || null;
  if (!orgId || name.length < 1) return fail("org_id and name are required.", 400);
  const { data: company, error } = await supabase
    .from("crm_companies")
    .insert({ org_id: orgId, owner_id: u.id, name, domain, industry, size, website, notes })
    .select("id,org_id,owner_id,name,domain,industry,size,website,notes,created_at,updated_at")
    .single();
  if (error) return dbFail("POST /api/crm/companies", error, "Unable to create company.");
  return ok({ company }, 201);
}
