import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

// Auto-default win probability per stage when the caller omits it.
const STAGE_DEFAULT_PROBABILITY: Record<string, number> = {
  lead: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};

// Short lost-reason codes surfaced in the pipeline UI dropdown; short free
// text also passes through (capped to the column width).
const LOST_REASONS = ["price", "timing", "competitor", "fit", "ghosted", "other"] as const;

const SELECT =
  "id,org_id,owner_id,company_id,contact_id,title,value_coins,stage,probability,expected_close,lost_reason,notes,created_at,updated_at";

const SORTABLE = [
  "created_at",
  "updated_at",
  "title",
  "value_coins",
  "stage",
  "probability",
  "expected_close",
] as const;
type SortKey = (typeof SORTABLE)[number];

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

function cleanStr(v: unknown, cap: number): string {
  return String(v ?? "").trim().slice(0, cap);
}

function toCoins(v: unknown): number {
  const n = Math.floor(Number(v ?? 0));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, Number.MAX_SAFE_INTEGER) : NaN;
}

function toProbability(v: unknown): number {
  const n = Math.floor(Number(v ?? 10));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
}

// lost_reason passthrough: null/"" clears; known codes normalize to
// lowercase; other short text passes through capped at 120 chars.
function toLostReason(v: unknown): string | null {
  const s = cleanStr(v, 120);
  if (!s) return null;
  if ((LOST_REASONS as readonly string[]).includes(s.toLowerCase())) return s.toLowerCase();
  return s;
}

// GET /api/crm/deals?org_id=<uuid>&stage=<stage>&q=<text>
//   &limit=<1..100>&offset=<0..>&sort=<field>&order=<asc|desc>
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
  // Membership gate before revealing org deals (RLS re-checks below).
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const stageRaw = String(params.get("stage") ?? "").trim();
  if (stageRaw && !(STAGES as readonly string[]).includes(stageRaw)) {
    return fail(`Invalid stage. Expected one of: ${STAGES.join(", ")}.`, 400);
  }
  const rawQ = cleanStr(params.get("q"), 120);
  const limitRaw = Number(params.get("limit") ?? 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 50;
  const offsetRaw = Number(params.get("offset") ?? 0);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
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
  // Strip PostgREST `or=` separators / wildcards so free text can't break the filter.
  const needle = rawQ.replace(/[%_(),]/g, "").trim().slice(0, 120);
  let q = supabase
    .from("crm_deals")
    .select(SELECT, { count: "exact" })
    .order(sort, { ascending })
    .range(offset, offset + limit - 1);
  q = q.eq("org_id", orgId);
  if (stageRaw) q = q.eq("stage", stageRaw);
  if (needle) q = q.or(`title.ilike.%${needle}%,notes.ilike.%${needle}%`);
  const { data: deals, error, count } = await q;
  if (error) return dbFail("GET /api/crm/deals", error, "Unable to load deals.");
  return ok({
    deals: deals ?? [],
    total: count ?? (deals?.length ?? 0),
    limit,
    offset,
    sort,
    order: ascending ? "asc" : "desc",
  });
}

// POST /api/crm/deals
// Body: { org_id, title, value_coins (alias: amount_coins), stage?, probability?,
//   expected_close? (alias: expected_close_date), lost_reason?, company_id?,
//   contact_id?, notes? }
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-deal-create:${u.id}`, 30, 60_000);
  if (!throttle.allowed) return fail("Too many requests.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const orgRaw = cleanStr(input.org_id, 36);
  const title = cleanStr(input.title, 160);
  if (!orgRaw || title.length < 1) return fail("org_id and title are required.", 400);
  const orgId = isUuid(orgRaw);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const companyRaw = cleanStr(input.company_id, 36);
  if (companyRaw && !isUuid(companyRaw)) return fail("Invalid company_id. Expected a UUID.", 400);
  const contactRaw = cleanStr(input.contact_id, 36);
  if (contactRaw && !isUuid(contactRaw)) return fail("Invalid contact_id. Expected a UUID.", 400);
  const companyId = isUuid(companyRaw) || null;
  const contactId = isUuid(contactRaw) || null;
  // Accept amount_coins alias from the workspace form.
  const valueCoins = toCoins(input.value_coins ?? input.amount_coins);
  const stageRaw = cleanStr(input.stage, 20);
  if (stageRaw && !(STAGES as readonly string[]).includes(stageRaw)) {
    return fail(`Invalid stage. Expected one of: ${STAGES.join(", ")}.`, 400);
  }
  const stage = stageRaw || "lead";
  const probability =
    input.probability == null
      ? (STAGE_DEFAULT_PROBABILITY[stage] ?? 10)
      : toProbability(input.probability);
  // Accept expected_close_date alias from the workspace quick-edit form.
  const expectedClose = cleanStr(input.expected_close ?? input.expected_close_date, 10) || null;
  const lostReason = toLostReason(input.lost_reason);
  const notes = cleanStr(input.notes, 2000) || null;
  if (Number.isNaN(valueCoins)) return fail("value_coins must be a non-negative integer.", 400);
  if (Number.isNaN(probability)) return fail("probability must be 0-100.", 400);
  if (expectedClose && !/^\d{4}-\d{2}-\d{2}$/.test(expectedClose)) {
    return fail("expected_close must be YYYY-MM-DD.", 400);
  }
  const { data: deal, error } = await supabase
    .from("crm_deals")
    .insert({
      org_id: orgId, owner_id: u.id, company_id: companyId, contact_id: contactId,
      title, value_coins: valueCoins, stage, probability,
      expected_close: expectedClose, lost_reason: lostReason, notes,
    })
    .select(SELECT)
    .single();
  if (error) return dbFail("POST /api/crm/deals", error, "Unable to create deal.");
  return ok({ deal }, 201);
}

// PATCH /api/crm/deals?id=<uuid> — move stage / update value, probability,
// expected_close, lost_reason, notes, contact/company links. A stage move
// without an explicit probability applies the stage auto-default; leaving
// lost clears a stale lost reason unless a new one is given.
// Accepts id + optional org_id from the query string or body; when org_id is
// given the caller must be an org member and the update is scoped to that org.
export async function PATCH(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-deal-patch:${u.id}`, 60, 60_000);
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
  if (!idRaw) return fail("Deal id is required.", 400);
  const id = isUuid(idRaw);
  if (!id) return fail("Invalid deal id. Expected a UUID.", 400);
  const orgRaw = String(params.get("org_id") ?? input.org_id ?? "").trim();
  if (orgRaw && !isUuid(orgRaw)) return fail("Invalid org_id. Expected a UUID.", 400);
  const orgId = isUuid(orgRaw);
  if (orgId) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("org_id", orgId)
      .eq("user_id", u.id)
      .maybeSingle();
    if (!membership) return fail("Not a member of this org.", 403);
  }
  const patch: Record<string, unknown> = {};
  if (input.stage !== undefined) {
    const s = cleanStr(input.stage, 20);
    if (!(STAGES as readonly string[]).includes(s)) {
      return fail(`Invalid stage. Expected one of: ${STAGES.join(", ")}.`, 400);
    }
    patch.stage = s;
    // Auto-default probability on stage moves unless caller overrides.
    if (input.probability === undefined) {
      patch.probability = STAGE_DEFAULT_PROBABILITY[s] ?? 10;
    }
    // Leaving lost clears a stale lost reason unless a new one is given.
    if (s !== "lost" && input.lost_reason === undefined) {
      patch.lost_reason = null;
    }
  }
  const rawCoins = input.value_coins !== undefined ? input.value_coins : input.amount_coins;
  if (rawCoins !== undefined) {
    const v = toCoins(rawCoins);
    if (Number.isNaN(v)) return fail("value_coins must be a non-negative integer.", 400);
    patch.value_coins = v;
  }
  if (input.probability !== undefined) {
    const p = toProbability(input.probability);
    if (Number.isNaN(p)) return fail("probability must be 0-100.", 400);
    patch.probability = p;
  }
  if (input.title !== undefined) {
    const t = cleanStr(input.title, 160);
    if (t.length < 1) return fail("title must not be empty.", 400);
    patch.title = t;
  }
  if (input.notes !== undefined) {
    patch.notes = cleanStr(input.notes, 2000) || null;
  }
  if (input.expected_close !== undefined || input.expected_close_date !== undefined) {
    const v = cleanStr(input.expected_close ?? input.expected_close_date, 10) || null;
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return fail("expected_close must be YYYY-MM-DD.", 400);
    }
    patch.expected_close = v;
  }
  if (input.lost_reason !== undefined) {
    patch.lost_reason = toLostReason(input.lost_reason);
  }
  if (input.contact_id !== undefined) {
    const raw = cleanStr(input.contact_id, 36);
    if (raw && !isUuid(raw)) return fail("Invalid contact_id. Expected a UUID.", 400);
    patch.contact_id = isUuid(raw) || null;
  }
  if (input.company_id !== undefined) {
    const raw = cleanStr(input.company_id, 36);
    if (raw && !isUuid(raw)) return fail("Invalid company_id. Expected a UUID.", 400);
    patch.company_id = isUuid(raw) || null;
  }
  if (Object.keys(patch).length === 0) return fail("Nothing to update.", 400);
  let uq = supabase.from("crm_deals").update(patch).eq("id", id);
  if (orgId) uq = uq.eq("org_id", orgId);
  const { data: deal, error } = await uq.select(SELECT).single();
  if (error) return dbFail("PATCH /api/crm/deals", error, "Unable to update deal.");
  return ok({ deal });
}

// DELETE /api/crm/deals
// Body (or query): { id, org_id }. Both must be UUIDs; caller must be an
// org member; the delete is scoped to (id, org_id).
export async function DELETE(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  if (!u) return fail("Login required.", 401);
  const throttle = rateLimit(`crm-deal-delete:${u.id}`, 30, 60_000);
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
  if (!idRaw) return fail("Deal id is required.", 400);
  if (!orgRaw) return fail("org_id is required.", 400);
  const id = isUuid(idRaw);
  const orgId = isUuid(orgRaw);
  if (!id) return fail("Invalid deal id. Expected a UUID.", 400);
  if (!orgId) return fail("Invalid org_id. Expected a UUID.", 400);
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", u.id)
    .maybeSingle();
  if (!membership) return fail("Not a member of this org.", 403);
  const { data: row, error } = await supabase
    .from("crm_deals")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id")
    .maybeSingle();
  if (error) return dbFail("DELETE /api/crm/deals", error, "Unable to delete deal.");
  if (!row) return fail("Deal not found.", 404);
  return ok({ deleted: true, id });
}
