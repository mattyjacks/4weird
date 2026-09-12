import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const STATUSES = ["lead", "active", "inactive"] as const;

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

// GET /api/crm/contacts?org_id=<uuid>&company_id=<uuid>
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const params = new URL(req.url).searchParams;
  const orgId = isUuid(params.get("org_id"));
  const companyId = isUuid(params.get("company_id"));
  let q = supabase
    .from("crm_contacts")
    .select("id,org_id,owner_id,company_id,full_name,email,phone,title,status,notes,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (orgId) q = q.eq("org_id", orgId);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: contacts, error } = await q;
  if (error) return dbFail("GET /api/crm/contacts", error, "Unable to load contacts.");
  return ok({ contacts: contacts ?? [] });
}

// POST /api/crm/contacts
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-contact-create:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const orgId = isUuid(input.org_id);
  const companyId = isUuid(input.company_id) || null;
  const fullName = String(input.full_name ?? "").trim().slice(0, 120);
  const email = String(input.email ?? "").trim().slice(0, 160) || null;
  const phone = String(input.phone ?? "").trim().slice(0, 40) || null;
  const title = String(input.title ?? "").trim().slice(0, 120) || null;
  const status = STATUSES.includes(String(input.status) as (typeof STATUSES)[number])
    ? String(input.status)
    : "lead";
  const notes = String(input.notes ?? "").trim().slice(0, 2000) || null;
  if (!orgId || fullName.length < 1) return fail("org_id and full_name are required.", 400);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Invalid email.", 400);
  const { data: contact, error } = await supabase
    .from("crm_contacts")
    .insert({ org_id: orgId, owner_id: u.id, company_id: companyId, full_name: fullName, email, phone, title, status, notes })
    .select("id,org_id,owner_id,company_id,full_name,email,phone,title,status,notes,created_at,updated_at")
    .single();
  if (error) return dbFail("POST /api/crm/contacts", error, "Unable to create contact.");
  return ok({ contact }, 201);
}
