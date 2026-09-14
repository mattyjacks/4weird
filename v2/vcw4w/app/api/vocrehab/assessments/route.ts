import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, ok } from "@/lib/api-respond";

const VOCREHAB_ASSESSMENT_KINDS = ["ipe", "barrier", "readiness", "goals", "remote"] as const;
const VOCREHAB_LIST_CAP = 50;
const VOCREHAB_JSON_CAP = 20 * 1024;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonSize(value: unknown): number {
  try {
    return JSON.stringify(value ?? {}).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in to view assessments.", 401);
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  let query = supabase
    .from("vocrehab_assessments")
    .select("id,kind,payload,profile,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(VOCREHAB_LIST_CAP);
  if (kind !== null && kind !== "") {
    if (!VOCREHAB_ASSESSMENT_KINDS.includes(kind as (typeof VOCREHAB_ASSESSMENT_KINDS)[number])) {
      return fail("kind must be one of ipe, barrier, readiness, goals, remote.", 400);
    }
    query = query.eq("kind", kind);
  }
  const { data, error } = await query;
  if (error) {
    return dbFail("vocrehab/assessments", error);
  }
  return ok({ assessments: data ?? [] });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { kind, payload, profile } = (isPlainObject(body) ? body : {}) as {
    kind?: unknown;
    payload?: unknown;
    profile?: unknown;
  };

  if (typeof kind !== "string" || !VOCREHAB_ASSESSMENT_KINDS.includes(kind as (typeof VOCREHAB_ASSESSMENT_KINDS)[number])) {
    return fail("kind must be one of ipe, barrier, readiness, goals, remote.", 400);
  }
  const cleanPayload = isPlainObject(payload) ? payload : {};
  const cleanProfile = isPlainObject(profile) ? profile : {};
  if (jsonSize(cleanPayload) > VOCREHAB_JSON_CAP || jsonSize(cleanProfile) > VOCREHAB_JSON_CAP) {
    return fail("Assessment data is too large. Shorten text fields and try again.", 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in to save assessments.", 401);
  }

  const { data, error } = await supabase
    .from("vocrehab_assessments")
    .insert({ user_id: user.id, kind, payload: cleanPayload, profile: cleanProfile })
    .select("id")
    .single();
  if (error || !data) {
    return dbFail("vocrehab/assessments", error);
  }
  return ok({ id: (data as { id: string }).id });
}
