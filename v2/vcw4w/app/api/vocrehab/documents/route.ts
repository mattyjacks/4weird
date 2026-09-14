import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import type { VocrehabDocumentKind } from "@/types/vocrehab-documents";

// Own-only rehearsal/document storage mirroring the vocrehab_documents table
// (kind check constraint, jsonb body). Guests get a friendly 401; every
// read/write is scoped to the signed-in user's own rows. Nothing here accepts
// audio; body is a JSON object capped at 20KB serialized.
const KINDS: readonly VocrehabDocumentKind[] = [
  "prep",
  "pivot",
  "script",
  "resume",
  "decision-onepager",
];

const MAX_LIST = 50;
const MAX_TITLE = 200;
const MAX_BODY_BYTES = 20 * 1024;

function isKind(value: unknown): value is VocrehabDocumentKind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(req: Request) {
  const rl = rateLimit(`vocrehab-documents:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited. Wait a bit and try again.", 429, rateLimitHeaders(rl));
  }

  const kindParam = new URL(req.url).searchParams.get("kind");
  if (kindParam !== null && !isKind(kindParam)) {
    return fail(`kind must be one of: ${KINDS.join(", ")}.`, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in to view your saved VocRehab documents.", 401);
  }

  let query = supabase
    .from("vocrehab_documents")
    .select("id,kind,title,body,created_at,updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_LIST);
  if (kindParam !== null) {
    query = query.eq("kind", kindParam);
  }
  const { data, error } = await query;
  if (error) {
    return dbFail("vocrehab/documents", error);
  }
  return ok({ documents: data ?? [] });
}

export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-documents:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited. Wait a bit and try again.", 429, rateLimitHeaders(rl));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { kind, title, body: docBody } = (body ?? {}) as {
    kind?: unknown;
    title?: unknown;
    body?: unknown;
  };

  if (!isKind(kind)) {
    return fail(`kind must be one of: ${KINDS.join(", ")}.`, 400);
  }
  if (typeof title !== "string" || title.trim().length < 1 || title.length > MAX_TITLE) {
    return fail(`title must be 1..${MAX_TITLE} characters.`, 400);
  }
  if (!isJsonObject(docBody)) {
    return fail("body must be a JSON object.", 400);
  }
  if (new TextEncoder().encode(JSON.stringify(docBody)).length > MAX_BODY_BYTES) {
    return fail("body must be 20KB or less.", 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in to save VocRehab documents.", 401);
  }

  const { data, error } = await supabase
    .from("vocrehab_documents")
    .insert({ user_id: user.id, kind, title: title.trim(), body: docBody })
    .select("id,kind,title,body,created_at,updated_at")
    .single();
  if (error) {
    return dbFail("vocrehab/documents", error);
  }
  return ok({ saved: true, document: data });
}
