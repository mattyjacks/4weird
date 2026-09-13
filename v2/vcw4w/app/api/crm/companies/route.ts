import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SELECT =
  "id,org_id,owner_id,name,domain,industry,size,website,notes,created_at,updated_at";

const SORTABLE = ["created_at", "updated_at", "name", "domain", "industry"] as const;
type SortKey = (typeof SORTABLE)[number];

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

function cleanStr(v: unknown, cap: number): string {
  return String(v ?? "").trim().slice(0, cap);
}

// GET /api/crm/companies?org_id=<uuid>&q=<text>&industry=<text>
//   &limit=<1..100>&offset=<0..10000>&sort=<field>&order=<asc|desc>
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const params = new URL(req.url).searchParams;
  const orgRaw = String(params.get("org_id") ?? "").trim();
  if (!orgRaw) return fail("org_id is required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  // Membership gate before revealing org companies (RLS re-checks below).
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);

  const rawQ = cleanStr(params.get("q"), 120);
  const industryRaw = cleanStr(params.get("industry"), 80);
  // Strip LIKE wildcards from the single-column industry filter so it can't
  // widen into a wildcard match.
  const industry = industryRaw.replace(/[%_*\\]/g, "").trim().slice(0, 80);
  const limitRaw = Number(params.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 50;
  const offsetRaw = Number(params.get("offset") ?? 0);
  const offset = Number.isFinite(offsetRaw)
    ? Math.min(10000, Math.max(0, Math.floor(offsetRaw)))
    : 0;
  const sortRaw = cleanStr(params.get("sort"), 32);
  if (sortRaw && !(SORTABLE as readonly string[]).includes(sortRaw)) {
    return fail(`Invalid sort. Expected one of: ${SORTABLE.join(", ")}.`, 400);
  }
  const sort: SortKey = sortRaw ? (sortRaw as SortKey) : "created_at";
  const orderRaw = cleanStr(params.get("order"), 8).toLowerCase();
  if (orderRaw && orderRaw !== "asc" && orderRaw !== "desc") {
    return fail("Invalid order. Expected asc or desc.", 400);
  }
  const ascending = orderRaw === "asc";
  // Strip PostgREST `or=` separators (commas, parens), quotes, backslashes,
  // and LIKE wildcards (% _ *) so free text can't break the filter.
  const needle = rawQ.replace(/[%_*,()"'`\\]/g, "").trim().slice(0, 120);
  let q = supabase
    .from("crm_companies")
    .select(SELECT, { count: "exact" })
    .order(sort, { ascending })
    .range(offset, offset + limit - 1);
  q = q.eq("org_id", orgId);
  if (industry) q = q.ilike("industry", industry);
  if (needle) q = q.or(`name.ilike.%${needle}%,domain.ilike.%${needle}%,industry.ilike.%${needle}%`);
  const { data: companies, error, count } = await q;
  if (error) return dbFail("GET /api/crm/companies", error, "Unable to load companies.");
  return ok({
    companies: companies ?? [],
    total: count ?? (companies?.length ?? 0),
    limit,
    offset,
    sort,
    order: ascending ? "asc" : "desc",
  });
}

// POST /api/crm/companies
// Body: { org_id, name, domain?, industry?, size?, website?, notes? }
// Length caps match migration 20261104000000_business_crm.sql:
//   name 1..120, domain <=120, industry <=80, size <=40, website <=200, notes <=2000.
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
  const orgRaw = cleanStr(input.org_id, 36);
  const name = cleanStr(input.name, 120);
  if (!orgRaw || name.length < 1) return fail("org_id and name are required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const domain = cleanStr(input.domain, 120) || null;
  const industry = cleanStr(input.industry, 80) || null;
  const size = cleanStr(input.size, 40) || null;
  const website = cleanStr(input.website, 200) || null;
  const notes = cleanStr(input.notes, 2000) || null;
  const { data: postMembership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!postMembership) return fail("Not a member of this org.", 403);
  const { data: company, error } = await supabase
    .from("crm_companies")
    .insert({ org_id: orgId, owner_id: u.id, name, domain, industry, size, website, notes })
    .select(SELECT)
    .single();
  if (error) return dbFail("POST /api/crm/companies", error, "Unable to create company.");
  return ok({ company }, 201);
}

// PATCH /api/crm/companies
// Body: { id, org_id?, name?, domain?, industry?, size?, website?, notes? }
// Only provided fields are updated; empty string clears a nullable field.
// Caps match the migration: name 1..120, domain <=120, industry <=80,
// size <=40, website <=200, notes <=2000.
export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-company-update:${u.id}`, 60, 60_000);
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
  if (!idRaw) return fail("Company id is required.", 400);
  const id = isUuid(idRaw);
  if (!id) return fail("Invalid company id. Expected a UUID.", 400);
  const orgRaw = String(params.get("org_id") ?? input.org_id ?? "").trim();
  if (!orgRaw) return fail("org_id is required.", 400);
  if (!isUuid(orgRaw)) return fail("Invalid org_id. Expected a UUID.", 400);
  const orgId = isUuid(orgRaw);
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const patch: Record<string, string | null> = {};
  if (input.name !== undefined) {
    const v = cleanStr(input.name, 120);
    if (v.length < 1) return fail("name must not be empty.", 400);
    patch.name = v;
  }
  if (input.domain !== undefined) patch.domain = cleanStr(input.domain, 120) || null;
  if (input.industry !== undefined) patch.industry = cleanStr(input.industry, 80) || null;
  if (input.size !== undefined) patch.size = cleanStr(input.size, 40) || null;
  if (input.website !== undefined) patch.website = cleanStr(input.website, 200) || null;
  if (input.notes !== undefined) patch.notes = cleanStr(input.notes, 2000) || null;
  if (Object.keys(patch).length === 0) return fail("Nothing to update.", 400);
  const query = supabase.from("crm_companies").update(patch).eq("id", id).eq("org_id", orgId);
  const { data: company, error } = await query.select(SELECT).single();
  if (error) return dbFail("PATCH /api/crm/companies", error, "Unable to update company.");
  return ok({ company });
}

// DELETE /api/crm/companies
// Body (or query): { id, org_id }. Both must be UUIDs; caller must be an
// org member; the delete is scoped to (id, org_id).
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-company-delete:${u.id}`, 30, 60_000);
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
  if (!idRaw) return fail("Company id is required.", 400);
  if (!orgRaw) return fail("org_id is required.", 400);
  const id = isUuid(idRaw);
  const orgId = isUuid(orgRaw);
  if (!id) return fail("Invalid company id. Expected a UUID.", 400);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const { data: row, error } = await supabase
    .from("crm_companies")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id")
    .maybeSingle();
  if (error) return dbFail("DELETE /api/crm/companies", error, "Unable to delete company.");
  if (!row) return fail("Company not found.", 404);
  return ok({ deleted: true, id });
}
