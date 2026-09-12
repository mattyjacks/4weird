import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const STATUSES = ["lead", "active", "inactive"] as const;
type Status = (typeof STATUSES)[number];

const SELECT =
  "id,org_id,owner_id,company_id,full_name,email,phone,title,status,notes,created_at,updated_at";

const SORTABLE = ["created_at", "updated_at", "full_name", "email", "status", "title"] as const;
type SortKey = (typeof SORTABLE)[number];

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

function cleanStr(v: unknown, cap: number): string {
  return String(v ?? "").trim().slice(0, cap);
}

function validEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function parseStatus(v: unknown): Status | "" {
  const s = String(v ?? "").trim();
  return (STATUSES as readonly string[]).includes(s) ? (s as Status) : "";
}

// GET /api/crm/contacts?org_id=<uuid>&company_id=<uuid>&status=<lead|active|inactive>
//   &q=<search>&limit=<1..200>&offset=<0..>&sort=<field>&order=<asc|desc>
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const params = new URL(req.url).searchParams;
  const orgId = isUuid(params.get("org_id"));
  const companyId = isUuid(params.get("company_id"));
  const status = parseStatus(params.get("status"));
  const q = cleanStr(params.get("q"), 120);

  const limitRaw = Number(params.get("limit") ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 100;
  const offsetRaw = Number(params.get("offset") ?? 0);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

  const sortRaw = cleanStr(params.get("sort"), 32);
  const sort: SortKey = (SORTABLE as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortKey)
    : "created_at";
  const orderRaw = cleanStr(params.get("order"), 8).toLowerCase();
  const ascending = orderRaw === "asc";

  let query = supabase.from("crm_contacts").select(SELECT, { count: "exact" }).order(sort, { ascending });
  if (orgId) query = query.eq("org_id", orgId);
  if (companyId) query = query.eq("company_id", companyId);
  if (status) query = query.eq("status", status);
  if (q) {
    // Escape %, _, and commas (OR separator) for the PostgREST filter.
    const esc = q.replace(/[%_,]/g, (m) => `\\${m}`);
    query = query.or(
      `full_name.ilike.*${esc}*,email.ilike.*${esc}*,phone.ilike.*${esc}*,title.ilike.*${esc}*`,
    );
  }
  query = query.range(offset, offset + limit - 1);
  const { data: contacts, error, count } = await query;
  if (error) return dbFail("GET /api/crm/contacts", error, "Unable to load contacts.");
  return ok({ contacts: contacts ?? [], total: count ?? (contacts?.length ?? 0), limit, offset, sort, order: ascending ? "asc" : "desc" });
}

// POST /api/crm/contacts
// Body: { org_id, full_name (or legacy `name` alias), email?, phone?, title?, status?, notes?, company_id? }
// Length caps match migration 20261104000000_business_crm.sql:
//   full_name 1..120, email <=160, phone <=40, title <=120, notes <=2000.
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
  // Accept legacy `name` alias from older workspace forms.
  const fullName = cleanStr(input.full_name ?? input.name, 120);
  const email = cleanStr(input.email, 160) || null;
  const phone = cleanStr(input.phone, 40) || null;
  const title = cleanStr(input.title, 120) || null;
  const statusRaw = cleanStr(input.status, 20);
  const status: Status = (STATUSES as readonly string[]).includes(statusRaw) ? (statusRaw as Status) : "lead";
  const notes = cleanStr(input.notes, 2000) || null;
  if (!orgId || fullName.length < 1) return fail("org_id and full_name are required.", 400);
  if (email && !validEmail(email)) return fail("Invalid email.", 400);
  const { data: contact, error } = await supabase
    .from("crm_contacts")
    .insert({ org_id: orgId, owner_id: u.id, company_id: companyId, full_name: fullName, email, phone, title, status, notes })
    .select(SELECT)
    .single();
  if (error) return dbFail("POST /api/crm/contacts", error, "Unable to create contact.");
  return ok({ contact }, 201);
}

// PATCH /api/crm/contacts
// Body: { id, org_id?, full_name? (alias: name), email?, phone?, title?, status?, notes?, company_id? }
// Only provided fields are updated; empty string clears a nullable field.
// Caps match the migration: full_name 1..120, email <=160, phone <=40, title <=120, notes <=2000.
export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-contact-update:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const id = isUuid(input.id);
  const orgId = isUuid(input.org_id);
  if (!id) return fail("id is required.", 400);

  const patch: Record<string, string | null> = {};
  if (input.full_name !== undefined || input.name !== undefined) {
    const v = cleanStr(input.full_name ?? input.name, 120);
    if (v.length < 1) return fail("full_name must not be empty.", 400);
    patch.full_name = v;
  }
  if (input.email !== undefined) {
    const v = cleanStr(input.email, 160) || null;
    if (v && !validEmail(v)) return fail("Invalid email.", 400);
    patch.email = v;
  }
  if (input.phone !== undefined) patch.phone = cleanStr(input.phone, 40) || null;
  if (input.title !== undefined) patch.title = cleanStr(input.title, 120) || null;
  if (input.status !== undefined) {
    const v = cleanStr(input.status, 20);
    if (!(STATUSES as readonly string[]).includes(v)) return fail("Invalid status.", 400);
    patch.status = v;
  }
  if (input.notes !== undefined) patch.notes = cleanStr(input.notes, 2000) || null;
  if (input.company_id !== undefined) patch.company_id = isUuid(input.company_id) || null;
  if (Object.keys(patch).length === 0) return fail("Nothing to update.", 400);

  let query = supabase.from("crm_contacts").update(patch).eq("id", id);
  if (orgId) query = query.eq("org_id", orgId);
  const { data: contact, error } = await query.select(SELECT).single();
  if (error) return dbFail("PATCH /api/crm/contacts", error, "Unable to update contact.");
  return ok({ contact });
}

// DELETE /api/crm/contacts
// Body (or query): { id, org_id }. Both must be UUIDs; caller must be an
// org member; the delete is scoped to (id, org_id).
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-contact-delete:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const params = new URL(req.url).searchParams;
  const idRaw = String(params.get("id") ?? input.id ?? "").trim();
  const orgRaw = String(params.get("org_id") ?? input.org_id ?? "").trim();
  if (!idRaw) return fail("Contact id is required.", 400);
  if (!orgRaw) return fail("org_id is required.", 400);
  const id = isUuid(idRaw);
  const orgId = isUuid(orgRaw);
  if (!id) return fail("Invalid contact id. Expected a UUID.", 400);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const { data: row, error } = await supabase
    .from("crm_contacts")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id")
    .maybeSingle();
  if (error) return dbFail("DELETE /api/crm/contacts", error, "Unable to delete contact.");
  if (!row) return fail("Contact not found.", 404);
  return ok({ deleted: true, id });
}
