import { dbFail, fail, ok } from "@/lib/api-respond";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/validate";

// POST /api/feedback/[id]/status — admin-only triage status flip.
//
// Auth: admin session (app_metadata role admin, same pattern as the
// [id]/screenshot route). Anything else: 401 anonymous, 403 signed-in
// non-admin.
//
// Body (JSON): { status: "unaddressed" | "addressing" | "addressed",
//   note?: string (<=2000 chars, optional free-form admin note) }.
//
// Writes (service-role only, zero destructive surface beyond the flip):
//   1. feedback_reports: { status } + admin_note (admin_note touched ONLY
//      when a note is provided — absent/blank note leaves it unchanged).
//   2. feedback_events: one append-only audit row per flip, dual-shape
//      (BOTH feedback_id and report_id, plus event/actor/from/to/note/meta)
//      so either migration order wins; pre-convergence admin-shape DBs fall
//      back to the legacy (feedback_id, actor, from/to, note) insert.
//
// Fail-open 503 "feedback store not set up." (STORE_MISSING contract shared
// with POST /api/feedback and [id]/enrich) when the service key is absent,
// the table is missing, or the status column itself is missing — never faked.
// No secrets in code — keys resolve server-side via lib/supabase/service.

const STORE_MISSING = "feedback store not set up.";
const ROUTE = "api/feedback/[id]/status";

const STATUSES = new Set(["unaddressed", "addressing", "addressed"]);
const MAX_NOTE_CHARS = 2000;

function isMissingTable(error: { code?: unknown; message?: unknown }): boolean {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code === "42P01" || // undefined_table
    code === "PGRST205" || // table not in schema cache
    message.includes("feedback_reports") ||
    message.includes("feedback_events") ||
    message.includes("schema cache")
  );
}

function isMissingColumn(error: { code?: unknown; message?: unknown }, names: string[]): boolean {
  const code = String(error?.code ?? "");
  if (code === "42703" || code === "PGRST204") return true;
  const m = String(error?.message ?? "").toLowerCase();
  return (
    (m.includes("column") || m.includes("schema cache")) &&
    names.some((n) => m.includes(n))
  );
}

const EVENT_COLUMNS = [
  "feedback_id",
  "report_id",
  "event",
  "actor",
  "from_status",
  "to_status",
  "note",
  "meta",
];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasServerSupabase()) return fail(STORE_MISSING, 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return fail("Login required.", 401);
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  if (role !== "admin") return fail("Admin access required.", 403);

  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid feedback id.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body.", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail("Invalid request body.", 400);
  }
  const rec = body as Record<string, unknown>;
  const status = typeof rec["status"] === "string" ? rec["status"].trim().toLowerCase() : "";
  if (!STATUSES.has(status)) {
    return fail("Invalid status (unaddressed|addressing|addressed).", 400);
  }
  let note: string | null = null;
  if (rec["note"] !== undefined && rec["note"] !== null) {
    if (typeof rec["note"] !== "string") return fail("Invalid note (string, <=2000 chars).", 400);
    const trimmed = rec["note"].trim();
    if (trimmed.length > MAX_NOTE_CHARS) {
      return fail("Invalid note (string, <=2000 chars).", 400);
    }
    // Blank note = not provided: never wipes an existing admin_note.
    note = trimmed.length > 0 ? trimmed : null;
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail(STORE_MISSING, 503);
  }

  // Current row first: 404 when missing (+ from_status for the audit row).
  const { data: row, error: rowErr } = await svc
    .from("feedback_reports")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (rowErr) {
    if (isMissingTable(rowErr as { code?: unknown; message?: unknown })) {
      return fail(STORE_MISSING, 503);
    }
    if (isMissingColumn(rowErr as { code?: unknown; message?: unknown }, ["status"])) {
      return fail(STORE_MISSING, 503);
    }
    return dbFail(ROUTE, rowErr, "Unable to load feedback.", 500);
  }
  if (!row) return fail("Feedback not found.", 404);
  const prevRaw = (row as { status?: unknown }).status;
  const prev = typeof prevRaw === "string" && STATUSES.has(prevRaw) ? prevRaw : null;

  // The flip: admin_note written ONLY when a note was provided.
  const patch: Record<string, unknown> = { status };
  if (note !== null) patch["admin_note"] = note;
  const { error: upErr } = await svc.from("feedback_reports").update(patch).eq("id", id);
  if (upErr) {
    if (isMissingTable(upErr as { code?: unknown; message?: unknown })) {
      return fail(STORE_MISSING, 503);
    }
    if (
      note !== null &&
      isMissingColumn(upErr as { code?: unknown; message?: unknown }, ["admin_note"])
    ) {
      // Pre-admin-migration DB: the flip still applies; the note survives in
      // the audit event row below instead of failing the triage click.
      const { error: retryErr } = await svc.from("feedback_reports").update({ status }).eq("id", id);
      if (retryErr) {
        if (isMissingTable(retryErr as { code?: unknown; message?: unknown })) {
          return fail(STORE_MISSING, 503);
        }
        return dbFail(ROUTE, retryErr, "Unable to update feedback status.", 500);
      }
    } else if (isMissingColumn(upErr as { code?: unknown; message?: unknown }, ["status"])) {
      return fail(STORE_MISSING, 503);
    } else {
      return dbFail(ROUTE, upErr, "Unable to update feedback status.", 500);
    }
  }

  // Append-only audit (dual-shape: BOTH id links so either schema wins).
  const { error: evErr } = await svc.from("feedback_events").insert({
    feedback_id: id,
    report_id: id,
    event: "status",
    actor: user.id,
    from_status: prev,
    to_status: status,
    note,
    meta: { from: prev, to: status },
  });
  if (evErr) {
    if (isMissingTable(evErr as { code?: unknown; message?: unknown })) {
      return fail(STORE_MISSING, 503);
    }
    if (isMissingColumn(evErr as { code?: unknown; message?: unknown }, EVENT_COLUMNS)) {
      // Pre-convergence admin-shape table (no report_id/event/meta): retry
      // the shipped legacy shape instead of failing the triage click.
      const { error: legacyErr } = await svc.from("feedback_events").insert({
        feedback_id: id,
        actor: user.id,
        from_status: prev,
        to_status: status,
        note,
      });
      if (legacyErr) {
        if (isMissingTable(legacyErr as { code?: unknown; message?: unknown })) {
          return fail(STORE_MISSING, 503);
        }
        return dbFail(ROUTE, legacyErr, "Status saved, but the audit log write failed.", 500);
      }
    } else {
      return dbFail(ROUTE, evErr, "Status saved, but the audit log write failed.", 500);
    }
  }

  return ok({ id, status, ...(note !== null ? { note } : {}) });
}

export function GET() {
  return fail("Method not allowed.", 405);
}
