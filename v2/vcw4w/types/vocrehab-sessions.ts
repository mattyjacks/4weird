// types/vocrehab-sessions.ts — VocRehab pro ambient-assist shared shapes (DS-VOCREHAB-06).
// Vocrehab-prefixed interfaces only. No I/O, no secrets.

export type VocrehabConsentPurpose =
  | "session-assist"
  | "roleplay-save"
  | "data-export"
  | "course-sync";

export type VocrehabDraftStatus = "draft" | "approved" | "edited" | "discarded";

export type VocrehabApproveDecision = "approved" | "edited" | "discarded";

export type VocrehabDraftKind = "case_note" | "measure" | "rationale" | "outreach";

// Short allowlist names accepted by POST /api/vocrehab/pro/approve.
// The route maps these to the vocrehab_* tables owned by the infra lane.
export type VocrehabApproveTable =
  | "case_notes"
  | "progress_measures"
  | "rationalizations"
  | "outreach_drafts";

export interface VocrehabRedactionResult {
  text: string;
  redactions_applied: string[];
}

export interface VocrehabSessionDraftSet {
  case_note_draft: string;
  measure_draft: string;
  rationale_draft: string;
  outreach_draft_or_null: string | null;
  redactions_applied: string[];
}

// One approvable draft box on the session review dashboard.
export interface VocrehabReviewDraft {
  kind: VocrehabDraftKind;
  table: VocrehabApproveTable;
  id: string;
  body: string;
  status: VocrehabDraftStatus;
}

export interface VocrehabAuditEntry {
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface VocrehabInboxPayload {
  consent_id: string;
  transcript_text: string;
  client_ref: string;
  source?: "pasted" | "dictated";
}

export interface VocrehabApprovePayload {
  table: VocrehabApproveTable;
  id: string;
  body?: string;
  decision: VocrehabApproveDecision;
}

export interface VocrehabOutreachPayload {
  employer: string;
  kind: string;
  details: string;
}
