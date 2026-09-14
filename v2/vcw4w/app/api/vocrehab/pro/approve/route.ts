import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { vocrehabAuditCopy } from "@/lib/vocrehab-privacy";

const VOCREHAB_TABLES = [
  "vocrehab_case_notes",
  "vocrehab_progress_measures",
  "vocrehab_rationalizations",
  "vocrehab_outreach_drafts",
] as const;

type VocrehabApprovableTable = (typeof VOCREHAB_TABLES)[number];

const VOCREHAB_DECISIONS = ["approved", "edited", "discarded"] as const;

type VocrehabDecision = (typeof VOCREHAB_DECISIONS)[number];

const VOCREHAB_BODY_MAX = 20000;
const VOCREHAB_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTable(value: unknown): value is VocrehabApprovableTable {
  return (
    typeof value === "string" &&
    (VOCREHAB_TABLES as readonly string[]).includes(value)
  );
}

function isDecision(value: unknown): value is VocrehabDecision {
  return (
    typeof value === "string" &&
    (VOCREHAB_DECISIONS as readonly string[]).includes(value)
  );
}

/** Minimal local row shape — never import @/types/vocrehab-* here. */
interface VocrehabOwnedDraft {
  id: string;
  counselor_id: string;
  status: string;
}

/**
 * POST: counselor review transition on one draft row.
 * Allowlisted tables only; own-counselor only (explicit ownership check
 * on top of RLS). Every transition is audit-reported in the response
 * and timestamped via updated_at/created_at for the dashboard audit strip.
 * Nothing here files to a system of record or sends anything anywhere.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { table, id, body: editedBody, decision } = (body ?? {}) as {
    table?: unknown;
    id?: unknown;
    body?: unknown;
    decision?: unknown;
  };

  if (!isTable(table)) {
    return fail(
      "table must be one of: vocrehab_case_notes, vocrehab_progress_measures, vocrehab_rationalizations, vocrehab_outreach_drafts.",
      400,
    );
  }
  if (typeof id !== "string" || !VOCREHAB_UUID_RE.test(id)) {
    return fail("id must be a UUID.", 400);
  }
  if (!isDecision(decision)) {
    return fail("decision must be approved, edited, or discarded.", 400);
  }
  if (decision === "edited") {
    if (typeof editedBody !== "string" || editedBody.trim().length < 1) {
      return fail("Edited drafts require a non-empty body.", 400);
    }
    if (editedBody.length > VOCREHAB_BODY_MAX) {
      return fail(
        `Edited body is capped at ${VOCREHAB_BODY_MAX} characters.`,
        400,
      );
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in as a counselor to review drafts.", 401);
  }

  const { data: existing, error: readError } = await supabase
    .from(table)
    .select("id,counselor_id,status")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    return dbFail("vocrehab/pro/approve", readError);
  }
  const row = existing as VocrehabOwnedDraft | null;
  if (!row) {
    return fail("Draft not found.", 404);
  }
  if (row.counselor_id !== user.id) {
    return fail("Draft not found.", 403);
  }

  // Outreach rows use the copied/discarded vocabulary (copy-only, never
  // sent); all other drafts use approved/discarded.
  const nextStatus =
    decision === "discarded"
      ? "discarded"
      : table === "vocrehab_outreach_drafts"
        ? "copied"
        : "approved";

  const patch: Record<string, string> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };
  if (decision === "edited" && typeof editedBody === "string") {
    patch.body = editedBody;
  }
  const { error: writeError } = await supabase
    .from(table)
    .update(patch)
    .eq("id", id);
  if (writeError) {
    return dbFail("vocrehab/pro/approve", writeError);
  }

  return ok({
    table,
    id,
    decision,
    status: nextStatus,
    audit: vocrehabAuditCopy(decision),
  });
}
