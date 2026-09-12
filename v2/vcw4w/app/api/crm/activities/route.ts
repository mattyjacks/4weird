import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const KINDS = ["note", "call", "email", "meeting", "task"] as const;

function isUuid(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s : "";
}

// GET /api/crm/activities?org_id=<uuid>&deal_id=<uuid>&open=true
export async function GET(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return fail("Login required.", 401);
  const params = new URL(req.url).searchParams;
  const orgId = isUuid(params.get("org_id"));
  const dealId = isUuid(params.get("deal_id"));
  const openOnly = params.get("open") === "true";
  let q = supabase
    .from("crm_activities")
    .select("id,org_id,owner_id,deal_id,contact_id,company_id,kind,body,due_at,done,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (orgId) q = q.eq("org_id", orgId);
  if (dealId) q = q.eq("deal_id", dealId);
  if (openOnly) q = q.eq("done", false);
  const { data: activities, error } = await q;
  if (error) return dbFail("GET /api/crm/activities", error, "Unable to load activities.");
  return ok({ activities: activities ?? [] });
}

// POST /api/crm/activities
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
  const orgId = isUuid(input.org_id);
  const kind = (KINDS as readonly string[]).includes(String(input.kind))
    ? String(input.kind)
    : "note";
  const activityBody = String(input.body ?? "").trim().slice(0, 2000);
  const dueAt = String(input.due_at ?? "").trim() || null;
  if (!orgId) return fail("org_id is required.", 400);
  if (activityBody.length < 1) return fail("body is required.", 400);
  if (dueAt && Number.isNaN(Date.parse(dueAt))) return fail("due_at must be a valid timestamp.", 400);
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
    .select("id,org_id,owner_id,deal_id,contact_id,company_id,kind,body,due_at,done,created_at,updated_at")
    .single();
  if (error) return dbFail("POST /api/crm/activities", error, "Unable to create activity.");
  return ok({ activity }, 201);
}

// PATCH /api/crm/activities?id=<uuid> — mark done / reopen / edit body.
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
  const id = isUuid(new URL(req.url).searchParams.get("id")) || isUuid(input.id);
  if (!id) return fail("Activity id is required.", 400);
  const patch: Record<string, unknown> = {};
  if (input.done !== undefined) {
    if (typeof input.done !== "boolean") return fail("done must be boolean.", 400);
    patch.done = input.done;
  }
  if (input.body !== undefined) {
    const b = String(input.body).trim().slice(0, 2000);
    if (b.length < 1) return fail("body must not be empty.", 400);
    patch.body = b;
  }
  if (Object.keys(patch).length === 0) return fail("Nothing to update.", 400);
  const { data: activity, error } = await supabase
    .from("crm_activities")
    .update(patch)
    .eq("id", id)
    .select("id,org_id,owner_id,deal_id,contact_id,company_id,kind,body,due_at,done,created_at,updated_at")
    .single();
  if (error) return dbFail("PATCH /api/crm/activities", error, "Unable to update activity.");
  return ok({ activity });
}
