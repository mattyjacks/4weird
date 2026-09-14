import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, ok } from "@/lib/api-respond";
import {
  vocrehabDraftCaseNote,
  vocrehabDraftMeasure,
  vocrehabDraftOutreach,
  vocrehabDraftRationale,
} from "@/lib/vocrehab-session-assist";
import { vocrehabRedactPii } from "@/lib/vocrehab-privacy";

const VOCREHAB_TRANSCRIPT_MAX = 20000;
const VOCREHAB_CLIENT_REF_MAX = 64;
const VOCREHAB_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimal local row shape — never import @/types/vocrehab-* here. */
interface VocrehabConsentRow {
  id: string;
  user_id: string;
  client_ref: string;
  purpose: string;
  revoked_at: string | null;
}

function isSource(value: unknown): value is "pasted" | "dictated" {
  return value === "pasted" || value === "dictated";
}

/**
 * GET: counselor's own ambient-session inbox (newest first).
 * RLS scopes every row to the caller's counselor_id; no cross-counselor reads.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in as a counselor to view sessions.", 401);
  }
  const { data, error } = await supabase
    .from("vocrehab_coaching_sessions")
    .select("id,client_ref,consent_id,source,created_at")
    .eq("counselor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return dbFail("vocrehab/pro/sessions", error);
  }
  return ok({ sessions: data ?? [] });
}

/**
 * POST: one transcript in, four draft boxes out. Consent-gated:
 * the caller either passes an unrevoked session-assist consent they own,
 * or attests via checkbox (attested:true) and a consent receipt row is
 * created first. Nothing auto-files, auto-sends, or auto-decides:
 * every generated row lands in status 'draft' for explicit review.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { consent_id, transcript_text, client_ref, source, attested } = (body ??
    {}) as {
    consent_id?: unknown;
    transcript_text?: unknown;
    client_ref?: unknown;
    source?: unknown;
    attested?: unknown;
  };

  if (typeof transcript_text !== "string" || transcript_text.length < 1) {
    return fail("transcript_text is required.", 400);
  }
  if (transcript_text.length > VOCREHAB_TRANSCRIPT_MAX) {
    return fail(
      `transcript_text is capped at ${VOCREHAB_TRANSCRIPT_MAX} characters.`,
      400,
    );
  }
  if (typeof client_ref !== "string" || client_ref.trim().length < 1) {
    return fail("client_ref is required (initials or role label only).", 400);
  }
  if (client_ref.trim().length > VOCREHAB_CLIENT_REF_MAX) {
    return fail("client_ref must be an initials/role label, 64 chars max.", 400);
  }
  const cleanRef = client_ref.trim();
  const cleanSource = isSource(source) ? source : "pasted";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in as a counselor to draft session paperwork.", 401);
  }

  // Resolve or mint the per-session consent receipt (caller's own, unrevoked).
  let consentId: string;
  if (typeof consent_id === "string" && consent_id.length > 0) {
    if (!VOCREHAB_UUID_RE.test(consent_id)) {
      return fail("consent_id must be a UUID.", 400);
    }
    const { data, error } = await supabase
      .from("vocrehab_consents")
      .select("id,user_id,client_ref,purpose,revoked_at")
      .eq("id", consent_id)
      .maybeSingle();
    if (error) {
      return dbFail("vocrehab/pro/sessions", error);
    }
    const consent = data as VocrehabConsentRow | null;
    if (
      !consent ||
      consent.user_id !== user.id ||
      consent.revoked_at !== null ||
      consent.purpose !== "session-assist"
    ) {
      return fail("Consent not found, revoked, or not yours.", 403);
    }
    consentId = consent.id;
  } else {
    if (attested !== true) {
      return fail(
        "Per-session consent is required: pass consent_id or attested:true.",
        400,
      );
    }
    const { data, error } = await supabase
      .from("vocrehab_consents")
      .insert({
        user_id: user.id,
        client_ref: cleanRef,
        purpose: "session-assist",
        note: "Per-session counselor attestation (checkbox). No role column.",
      })
      .select("id")
      .single();
    if (error || !data) {
      return dbFail("vocrehab/pro/sessions", error ?? new Error("no id"));
    }
    consentId = (data as { id: string }).id;
  }

  // PII redact pass BEFORE any draft is built or stored. Raw text is
  // never persisted: no transcript column exists by design.
  const redacted = vocrehabRedactPii(transcript_text);

  const { data: session, error: sessionError } = await supabase
    .from("vocrehab_coaching_sessions")
    .insert({
      counselor_id: user.id,
      client_ref: cleanRef,
      consent_id: consentId,
      source: cleanSource,
    })
    .select("id,created_at")
    .single();
  if (sessionError || !session) {
    return dbFail("vocrehab/pro/sessions", sessionError ?? new Error("no id"));
  }
  const sessionId = (session as { id: string }).id;

  // Deterministic-template drafts from the REDACTED text only.
  // lib/vocrehab-session-assist builders take (transcript, clientRef) and
  // return plain strings (outreach: string | null when no employer hook).
  const note = vocrehabDraftCaseNote(redacted.text, cleanRef);
  const measure = vocrehabDraftMeasure(redacted.text.slice(0, 2000), cleanRef);
  const rationale = vocrehabDraftRationale(
    redacted.text.slice(0, 2000),
    cleanRef,
  );
  const outreach = vocrehabDraftOutreach(redacted.text, cleanRef);

  const noteBody = note;
  const measureBody = measure;
  const rationaleBody = rationale;
  const outreachBody = outreach;
  const { data: noteRow, error: noteError } = await supabase
    .from("vocrehab_case_notes")
    .insert({
      session_id: sessionId,
      counselor_id: user.id,
      body: noteBody,
      status: "draft",
    })
    .select("id")
    .single();
  if (noteError || !noteRow) {
    return dbFail("vocrehab/pro/sessions", noteError ?? new Error("no id"));
  }
  const { data: measureRow, error: measureError } = await supabase
    .from("vocrehab_progress_measures")
    .insert({
      session_id: sessionId,
      counselor_id: user.id,
      client_ref: cleanRef,
      body: measureBody,
      status: "draft",
    })
    .select("id")
    .single();
  if (measureError || !measureRow) {
    return dbFail("vocrehab/pro/sessions", measureError ?? new Error("no id"));
  }
  const { data: rationaleRow, error: rationaleError } = await supabase
    .from("vocrehab_rationalizations")
    .insert({
      session_id: sessionId,
      counselor_id: user.id,
      kind: "SE",
      body: rationaleBody,
      status: "draft",
    })
    .select("id")
    .single();
  if (rationaleError || !rationaleRow) {
    return dbFail(
      "vocrehab/pro/sessions",
      rationaleError ?? new Error("no id"),
    );
  }
  // Fourth box always exists for review; empty body when no employer
  // signal fired (returned as null, copy-only, never sent).
  const { data: outreachRow, error: outreachError } = await supabase
    .from("vocrehab_outreach_drafts")
    .insert({
      counselor_id: user.id,
      employer: "",
      body: outreach ?? "",
      status: "draft",
    })
    .select("id")
    .single();
  if (outreachError || !outreachRow) {
    return dbFail(
      "vocrehab/pro/sessions",
      outreachError ?? new Error("no id"),
    );
  }

  // The "template starting point" banner is embedded in every draft body
  // by the builders; echoed here so review clients can display it verbatim.
  const VOCREHAB_TEMPLATE_BANNER =
    "DRAFT — Template starting point. Review, edit, and approve before any use. Nothing here has been filed, sent, or decided.";

  return ok({
    session_id: sessionId,
    consent_id: consentId,
    client_ref: cleanRef,
    case_note: { id: (noteRow as { id: string }).id, body: note },
    measure: { id: (measureRow as { id: string }).id, body: measure },
    rationale: {
      id: (rationaleRow as { id: string }).id,
      body: rationale,
      banner: VOCREHAB_TEMPLATE_BANNER,
    },
    outreach:
      outreach !== null
        ? { id: (outreachRow as { id: string }).id, body: outreach }
        : null,
    outreach_draft_id: (outreachRow as { id: string }).id,
    redactions_applied: redacted.redactions_applied.length,
    redaction_kinds: redacted.redactions_applied,
  });
}
