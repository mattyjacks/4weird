import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

function toCoins(v: unknown): number {
  const n = Math.floor(Number(v ?? 0));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, Number.MAX_SAFE_INTEGER) : NaN;
}

function toProbability(v: unknown): number {
  const n = Math.floor(Number(v ?? 10));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
}

// GET /api/crm/deals?org_id=<uuid>&stage=<stage>
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const params = new URL(req.url).searchParams;
  const orgId = isUuid(params.get("org_id"));
  const stage = String(params.get("stage") ?? "").trim();
  let q = supabase
    .from("crm_deals")
    .select("id,org_id,owner_id,company_id,contact_id,title,value_coins,stage,probability,expected_close,notes,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (orgId) q = q.eq("org_id", orgId);
  if (stage) {
    if (!(STAGES as readonly string[]).includes(stage)) return fail("Invalid stage.", 400);
    q = q.eq("stage", stage);
  }
  const { data: deals, error } = await q;
  if (error) return dbFail("GET /api/crm/deals", error, "Unable to load deals.");
  return ok({ deals: deals ?? [] });
}

// POST /api/crm/deals
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
  const orgId = isUuid(input.org_id);
  const companyId = isUuid(input.company_id) || null;
  const contactId = isUuid(input.contact_id) || null;
  const title = String(input.title ?? "").trim().slice(0, 160);
  const valueCoins = toCoins(input.value_coins);
  const stage = (STAGES as readonly string[]).includes(String(input.stage))
    ? String(input.stage)
    : "lead";
  const probability = input.probability == null ? 10 : toProbability(input.probability);
  const expectedClose = String(input.expected_close ?? "").trim() || null;
  const notes = String(input.notes ?? "").trim().slice(0, 2000) || null;
  if (!orgId || title.length < 1) return fail("org_id and title are required.", 400);
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
      expected_close: expectedClose, notes,
    })
    .select("id,org_id,owner_id,company_id,contact_id,title,value_coins,stage,probability,expected_close,notes,created_at,updated_at")
    .single();
  if (error) return dbFail("POST /api/crm/deals", error, "Unable to create deal.");
  return ok({ deal }, 201);
}

// PATCH /api/crm/deals?id=<uuid> — move stage / update value, probability, notes.
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
  const id = isUuid(new URL(req.url).searchParams.get("id")) || isUuid(input.id);
  if (!id) return fail("Deal id is required.", 400);
  const patch: Record<string, unknown> = {};
  if (input.stage !== undefined) {
    if (!(STAGES as readonly string[]).includes(String(input.stage))) {
      return fail("Invalid stage.", 400);
    }
    patch.stage = String(input.stage);
  }
  if (input.value_coins !== undefined) {
    const v = toCoins(input.value_coins);
    if (Number.isNaN(v)) return fail("value_coins must be a non-negative integer.", 400);
    patch.value_coins = v;
  }
  if (input.probability !== undefined) {
    const p = toProbability(input.probability);
    if (Number.isNaN(p)) return fail("probability must be 0-100.", 400);
    patch.probability = p;
  }
  if (input.title !== undefined) {
    const t = String(input.title).trim().slice(0, 160);
    if (t.length < 1) return fail("title must not be empty.", 400);
    patch.title = t;
  }
  if (input.notes !== undefined) {
    patch.notes = String(input.notes).trim().slice(0, 2000) || null;
  }
  if (Object.keys(patch).length === 0) return fail("Nothing to update.", 400);
  const { data: deal, error } = await supabase
    .from("crm_deals")
    .update(patch)
    .eq("id", id)
    .select("id,org_id,owner_id,company_id,contact_id,title,value_coins,stage,probability,expected_close,notes,created_at,updated_at")
    .single();
  if (error) return dbFail("PATCH /api/crm/deals", error, "Unable to update deal.");
  return ok({ deal });
}
