// lib/vocrehab-privacy.ts — VocRehab pro privacy primitives (DS-VOCREHAB-06).
// Pure functions only: consent wording, PII redaction, audit copy. Zero I/O.
// No audio handling, no network, no storage, no secrets.

import type {
  VocrehabConsentPurpose,
  VocrehabRedactionResult,
} from "@/types/vocrehab-sessions";

export function vocrehabConsentText(purpose: VocrehabConsentPurpose): string {
  switch (purpose) {
    case "session-assist":
      return (
        "Session-assist consent: the client agreed that the counselor may paste or " +
        "dictate session notes into VocRehab Pro to generate draft paperwork. " +
        "Outputs are DRAFTS ONLY — a counselor must review, edit, and approve each " +
        "one before any use. Nothing is auto-filed, auto-sent, or auto-decided. " +
        "The client may revoke this consent at any time; revoked consent blocks " +
        "new draft generation."
      );
    case "roleplay-save":
      return (
        "Roleplay-save consent: the client agreed that rehearsal roleplay turns may " +
        "be saved to their VocRehab record. Drafts only; nothing is shared outside " +
        "the record without a separate approval."
      );
    case "data-export":
      return (
        "Data-export consent: the client agreed that their own VocRehab data may be " +
        "exported for them. Exports are logged and contain only that client's own rows."
      );
    case "course-sync":
      return (
        "Course-sync consent: the client agreed that course progress may sync to " +
        "their VocRehab record. Progress only — no session content is synced."
      );
  }
}

type VocrehabRedactRule = { kind: string; pattern: RegExp };

// Ordered email-first so redact markers never re-match later rules.
// Deliberately NO bare 4-digit rule: plain years like "Room 2026" must survive.
const VOCREHAB_REDACT_RULES: VocrehabRedactRule[] = [
  { kind: "email", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: "dob", pattern: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g },
  {
    kind: "phone",
    pattern: /\b(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/g,
  },
  { kind: "id-number", pattern: /\b\d{9}\b/g },
];

export function vocrehabRedactPii(text: string): VocrehabRedactionResult {
  const redactions_applied: string[] = [];
  let out = text;
  for (const rule of VOCREHAB_REDACT_RULES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(out)) {
      rule.pattern.lastIndex = 0;
      out = out.replace(rule.pattern, `[redacted-${rule.kind}]`);
      redactions_applied.push(rule.kind);
    }
  }
  return { text: out, redactions_applied };
}

// One-line human-readable audit copy for the review dashboard audit strip.
// Pure string builder — the caller decides whether/where to persist it.
export function vocrehabAuditCopy(action: string): string {
  const clean = action.trim().slice(0, 120) || "review";
  return (
    `Audit: counselor ${clean} — drafts only, no auto-file/send/decide. ` +
    `Every output stays a draft until a counselor explicitly approves it.`
  );
}
