import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const KINDS = ["note", "call", "email", "meeting", "task"] as const;

const SELECT =
  "id,org_id,owner_id,deal_id,contact_id,company_id,kind,body,due_at,done,created_at,updated_at";

const SORTABLE = ["created_at", "updated_at", "due_at", "kind"] as const;
type SortKey = (typeof SORTABLE)[number];

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

function cleanStr(v: unknown, cap: number): string {
  return String(v ?? "").trim().slice(0, cap);
}

// GET /api/crm/activities?org_id=<uuid>&deal_id=<uuid>&contact_id=<uuid>&company_id=<uuid>
//   &kind=<kind>&done=true|false&open=true&overdue=1&q=<text>
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
  // Membership gate before revealing org activities (RLS re-checks below).
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  for (const key of ["deal_id", "contact_id", "company_id"] as const) {
    const raw = String(params.get(key) ?? "").trim();
    if (raw && !isUuid(raw)) return fail(`Invalid ${key}. Expected a UUID.`, 400);
  }
  const dealId = isUuid(params.get("deal_id"));
  const contactId = isUuid(params.get("contact_id"));
  const companyId = isUuid(params.get("company_id"));
  const kindParam = String(params.get("kind") ?? "").trim();
  if (kindParam && !(KINDS as readonly string[]).includes(kindParam)) {
    return fail(`Invalid kind. Expected one of: ${KINDS.join(", ")}.`, 400);
  }
  const openOnly = params.get("open") === "true";
  const doneParam = String(params.get("done") ?? "").trim().toLowerCase();
  if (doneParam && doneParam !== "true" && doneParam !== "false") {
    return fail("done must be true or false.", 400);
  }
  const overdueOnly = params.get("overdue") === "1" || String(params.get("overdue") ?? "").toLowerCase() === "true";
  const rawQ = cleanStr(params.get("q"), 120);
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
    .from("crm_activities")
    .select(SELECT, { count: "exact" })
    .order(sort, { ascending })
    .range(offset, offset + limit - 1);
  q = q.eq("org_id", orgId);
  if (dealId) q = q.eq("deal_id", dealId);
  if (contactId) q = q.eq("contact_id", contactId);
  if (companyId) q = q.eq("company_id", companyId);
  if (kindParam) q = q.eq("kind", kindParam);
  if (openOnly) q = q.eq("done", false);
  if (doneParam) q = q.eq("done", doneParam === "true");
  if (overdueOnly) q = q.eq("done", false).lt("due_at", new Date().toISOString());
  if (needle) q = q.ilike("body", `%${needle}%`);
  const { data: activities, error, count } = await q;
  if (error) return dbFail("GET /api/crm/activities", error, "Unable to load activities.");
  return ok({
    activities: activities ?? [],
    total: count ?? (activities?.length ?? 0),
    limit,
    offset,
    sort,
    order: ascending ? "asc" : "desc",
  });
}

// POST /api/crm/activities
// Body: { org_id, kind?, body (alias: title)?, due_at?, deal_id?, contact_id?, company_id? }
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-activity-create:${u.id}`, 60, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const orgRaw = cleanStr(input.org_id, 36);
  if (!orgRaw) return fail("org_id is required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const kindRaw = cleanStr(input.kind, 20);
  if (kindRaw && !(KINDS as readonly string[]).includes(kindRaw)) {
    return fail(`Invalid kind. Expected one of: ${KINDS.join(", ")}.`, 400);
  }
  const kind = kindRaw || "note";
  // Accept `title` alias from the workspace form.
  const activityBody = cleanStr(input.body ?? input.title, 2000);
  if (activityBody.length < 1) return fail("body is required.", 400);
  const dueAt = cleanStr(input.due_at, 64) || null;
  if (dueAt && Number.isNaN(Date.parse(dueAt))) return fail("due_at must be a valid timestamp.", 400);
  for (const key of ["deal_id", "contact_id", "company_id"] as const) {
    const raw = cleanStr(input[key], 36);
    if (raw && !isUuid(raw)) return fail(`Invalid ${key}. Expected a UUID.`, 400);
  }
  const { data: postMembership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!postMembership) return fail("Not a member of this org.", 403);
  const { data: activity, error } = await supabase
    .from("crm_activities")
    .insert({
      org_id: orgId,
      owner_id: u.id,
      deal_id: isUuid(input.deal_id) || null,
      contact_id: isUuid(input.contact_id) || null,
      company_id: isUuid(input.company_id) || null,
      kind,
      body: activityBody,
      due_at: dueAt,
      done: false,
    })
    .select(SELECT)
    .single();
  if (error) return dbFail("POST /api/crm/activities", error, "Unable to create activity.");
  return ok({ activity }, 201);
}

// PATCH /api/crm/activities?id=<uuid> — mark done / reopen / edit body, kind,
// due_at, and deal/contact/company links. Accepts id + optional org_id from the
// query string or body; when org_id is given the caller must be an org member
// and the update is scoped to that org.
export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-activity-patch:${u.id}`, 60, 60_000);
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
  if (!idRaw) return fail("Activity id is required.", 400);
  const id = isUuid(idRaw);
  if (!id) return fail("Invalid activity id. Expected a UUID.", 400);
  const patch: Record<string, unknown> = {};
  if (input.done !== undefined) {
    if (typeof input.done !== "boolean") return fail("done must be boolean.", 400);
    patch.done = input.done;
  }
  const rawBody = input.body !== undefined ? input.body : input.title;
  if (rawBody !== undefined) {
    const b = cleanStr(rawBody, 2000);
    if (b.length < 1) return fail("body must not be empty.", 400);
    patch.body = b;
  }
  if (input.kind !== undefined) {
    const k = cleanStr(input.kind, 20);
    if (!(KINDS as readonly string[]).includes(k)) {
      return fail(`Invalid kind. Expected one of: ${KINDS.join(", ")}.`, 400);
    }
    patch.kind = k;
  }
  if (input.due_at !== undefined) {
    const v = cleanStr(input.due_at, 64) || null;
    if (v && Number.isNaN(Date.parse(v))) return fail("due_at must be a valid timestamp.", 400);
    patch.due_at = v;
  }
  for (const key of ["deal_id", "contact_id", "company_id"] as const) {
    if (input[key] !== undefined) {
      const raw = cleanStr(input[key], 36);
      if (raw && !isUuid(raw)) return fail(`Invalid ${key}. Expected a UUID.`, 400);
      patch[key] = raw || null;
    }
  }
  if (Object.keys(patch).length === 0) return fail("Nothing to update.", 400);
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
  const uq = supabase.from("crm_activities").update(patch).eq("id", id).eq("org_id", orgId);
  const { data: activity, error } = await uq.select(SELECT).single();
  if (error) return dbFail("PATCH /api/crm/activities", error, "Unable to update activity.");
  return ok({ activity });
}

// DELETE /api/crm/activities?id=<uuid>&org_id=<uuid> (or body { id, org_id })
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-activity-delete:${u.id}`, 30, 60_000);
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
  if (!idRaw) return fail("Activity id is required.", 400);
  const id = isUuid(idRaw);
  if (!id) return fail("Invalid activity id. Expected a UUID.", 400);
  const orgRaw = String(params.get("org_id") ?? input.org_id ?? "").trim();
  if (!orgRaw) return fail("org_id is required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const { data: row, error } = await supabase
    .from("crm_activities")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id")
    .maybeSingle();
  if (error) return dbFail("DELETE /api/crm/activities", error, "Unable to delete activity.");
  if (!row) return fail("Activity not found.", 404);
  return ok({ deleted: true, id });
}
