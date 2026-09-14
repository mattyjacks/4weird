// lib/vocrehab-session-assist.ts — VocRehab pro ambient-assist draft builders (DS-VOCREHAB-06).
// Deterministic extractive-template builders + redact wrapper. Pure, zero I/O.
// Every output is labeled DRAFT: nothing here files, sends, or decides anything.

import { vocrehabRedactPii } from "@/lib/vocrehab-privacy";
import type { VocrehabRedactionResult } from "@/types/vocrehab-sessions";

const VOCREHAB_DRAFT_BANNER =
  "DRAFT — Template starting point. Review, edit, and approve before any use. Nothing here has been filed, sent, or decided.";

const VOCREHAB_DRAFT_FOOTER =
  "Reminder: this is a draft only. A counselor must review and approve it before it is used anywhere.";

function vocrehabSentences(transcript: string, limit: number): string[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, limit);
}

function vocrehabKeywordLines(
  transcript: string,
  keywords: RegExp,
  limit: number,
): string[] {
  const out: string[] = [];
  for (const line of transcript.split(/\n+/)) {
    const clean = line.trim();
    if (clean.length > 1 && keywords.test(clean)) {
      out.push(clean.length > 220 ? `${clean.slice(0, 220)}…` : clean);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function vocrehabWrap(
  title: string,
  clientRef: string,
  sections: Array<{ heading: string; lines: string[] }>,
): string {
  const parts: string[] = [
    VOCREHAB_DRAFT_BANNER,
    "",
    `${title} (client_ref: ${clientRef})`,
    "",
  ];
  for (const section of sections) {
    parts.push(`${section.heading}:`);
    if (section.lines.length === 0) {
      parts.push("- (nothing captured — add by hand during review)");
    } else {
      for (const line of section.lines) parts.push(`- ${line}`);
    }
    parts.push("");
  }
  parts.push(VOCREHAB_DRAFT_FOOTER);
  return parts.join("\n");
}

export function vocrehabDraftCaseNote(
  transcript: string,
  clientRef: string,
): string {
  const clean = transcript.trim();
  return vocrehabWrap("Case note draft", clientRef, [
    { heading: "Session excerpt (template-selected)", lines: vocrehabSentences(clean, 5) },
    {
      heading: "Goals mentioned",
      lines: vocrehabKeywordLines(clean, /goal|plan|want|hope|apply|interview|training|school/i, 4),
    },
    {
      heading: "Barriers mentioned",
      lines: vocrehabKeywordLines(clean, /barrier|worried|afraid|stuck|hard|difficult|anxiet|fear|denied|gap/i, 4),
    },
    {
      heading: "Next steps mentioned",
      lines: vocrehabKeywordLines(clean, /next|will|follow.?up|appointment|referral|homework|deadline|call|email/i, 4),
    },
  ]);
}

export function vocrehabDraftMeasure(
  transcript: string,
  clientRef: string,
): string {
  const clean = transcript.trim();
  return vocrehabWrap("Progress measure draft", clientRef, [
    {
      heading: "Observable progress signals (template-selected)",
      lines: vocrehabKeywordLines(
        clean,
        /progress|better|improved|completed|finished|attended|showed|started|milestone|step/i,
        5,
      ),
    },
    { heading: "Session excerpt (template-selected)", lines: vocrehabSentences(clean, 3) },
  ]);
}

export function vocrehabDraftRationale(
  transcript: string,
  clientRef: string,
): string {
  const clean = transcript.trim();
  return vocrehabWrap("Rationalization draft (SE: supported employment)", clientRef, [
    {
      heading: "Why this support fits (template-selected)",
      lines: vocrehabKeywordLines(
        clean,
        /support|help|need|because|reason|benefit|choice|prefer|strength|skill/i,
        5,
      ),
    },
    { heading: "Session excerpt (template-selected)", lines: vocrehabSentences(clean, 3) },
  ]);
}

const VOCREHAB_OUTREACH_HINT =
  /employer|workplace|job|hire|hiring|interview|supervisor|manager|position|opening/i;

// Returns null when the transcript has no employment/outreach hook — the
// caller then stores/shows outreach_draft_or_null as null instead of a draft.
export function vocrehabDraftOutreach(
  transcript: string,
  clientRef: string,
): string | null {
  const clean = transcript.trim();
  if (!VOCREHAB_OUTREACH_HINT.test(clean)) return null;
  return vocrehabWrap("Employer outreach draft (COPY-ONLY — never sent from this tool)", clientRef, [
    {
      heading: "Employment context (template-selected)",
      lines: vocrehabKeywordLines(clean, VOCREHAB_OUTREACH_HINT, 4),
    },
    {
      heading: "Copy-ready starter (edit names, dates, and details by hand)",
      lines: [
        "Hello — I am writing in support of a job seeker I counsel. [Add employer name, role, and one sentence of context.]",
        "They bring [add 1-2 strengths discussed in session]. [Add any accommodation framing the client approved.]",
        "May we schedule a brief call next week? Thank you for your time.",
      ],
    },
  ]);
}

// Thin wrapper so routes/components redact through one entry point.
export function vocrehabRedactTranscript(
  transcript: string,
): VocrehabRedactionResult {
  return vocrehabRedactPii(transcript);
}
