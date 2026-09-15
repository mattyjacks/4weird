/**
 * Feedback AI enrichment stub (FBOV-09, plan not overbuild).
 *
 * Deterministic, dependency-free, no network: maps a report's rating +
 * text to the AI-only columns (`ai_summary`, `ai_category`, `ai_severity`,
 * `ai_cluster`). The real model caller will swap `stubEnrichFeedback` only —
 * column names, the enrich route, and the log shape stay stable.
 *
 * Never touches human fields (reporter_type, rating, critique, text_body,
 * labels, bot_extras, screenshot_path, page_url, status).
 */

export const ENRICH_MODEL_STUB = "stub-v1" as const;
export const ENRICH_PROMPT_VERSION = "fbov-09-stub" as const;

export type AiCategory = "bug" | "ux" | "praise" | "performance" | "other";
export type AiSeverity = "low" | "medium" | "high";

export type AiEnrichment = {
  ai_summary: string;
  ai_category: AiCategory;
  ai_severity: AiSeverity;
  /** Cluster bucket id + human-readable reason joined as "<bucket>: <why>". */
  ai_cluster: string;
};

export type EnrichInput = {
  text: string;
  rating?: string | null;
};

const CATEGORY_KEYWORDS: { category: AiCategory; words: string[] }[] = [
  { category: "bug", words: ["crash", "error", "broken", "bug", "fail", "exception", "repeats", "wrong"] },
  { category: "performance", words: ["slow", "lag", "drag", "freeze", "timeout", "stuck", "jank"] },
  { category: "ux", words: ["confusing", "unclear", "button", "layout", "menu", "navigate", "friction", "misaligned"] },
  { category: "praise", words: ["love", "great", "awesome", "delight", "thanks", "good", "keep"] },
];

function pickCategory(lower: string, rating: string): AiCategory {
  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return category;
  }
  if (rating === "good") return "praise";
  return "other";
}

function pickSeverity(rating: string, lower: string): AiSeverity {
  if (rating === "bad") return /crash|data loss|security|leak|payment|cheat/i.test(lower) ? "high" : "medium";
  if (rating === "okay") return "medium";
  return "low";
}

/** Deterministic stub: first-sentence summary, keyword category, rating severity. */
export function stubEnrichFeedback(input: EnrichInput): AiEnrichment {
  const text = String(input?.text ?? "").trim().slice(0, 4000);
  const rating = String(input?.rating ?? "okay").trim().toLowerCase();
  const lower = text.toLowerCase();
  const firstSentence = (text.split(/(?<=[.!?])\s+/)[0] ?? text).trim().slice(0, 280) || "(empty report)";
  const ai_category = pickCategory(lower, rating);
  const ai_severity = pickSeverity(rating, lower);
  const bucket = `${ai_category}:${ai_severity}`;
  const why =
    ai_category === "other"
      ? "no keyword hit; fell back to rating default"
      : `keyword hit in category "${ai_category}" + rating "${rating || "okay"}"`;
  return {
    ai_summary: firstSentence,
    ai_category,
    ai_severity,
    ai_cluster: `${bucket}: ${why}`,
  };
}

// ---------------------------------------------------------------------------
// Fire-and-forget LLM enrichment contract (FBOV-09 enrich route).
//
// `buildEnrichmentPrompt` renders the deterministic prompt for a report;
// `parseEnrichmentResult` parses the model's raw JSON back into the bounded
// {summary, category, severity, cluster} shape. Both are pure +
// dependency-free (no network, no secrets) so the route and tests share
// them. Parsing is fail-open: anything malformed falls back to field
// defaults instead of throwing.
// ---------------------------------------------------------------------------

/** Prompt version stamped into feedback_ai_logs.prompt_version. */
export const ENRICH_PROMPT_VERSION_LLM = "fbov-09-enrich-v1" as const;

/** Minimal report shape the prompt builder reads (subset of a feedback_reports row). */
export type EnrichmentReport = {
  id?: string;
  text?: string | null;
  text_body?: string | null;
  rating?: string | null;
  critique?: string | null;
  labels?: string[] | null;
  page_url?: string | null;
};

/** Bounded enrichment result parsed from the model's raw JSON. */
export type ParsedEnrichment = {
  summary: string;
  category: AiCategory;
  severity: AiSeverity;
  cluster: string;
};

const ENRICH_CATEGORIES: readonly AiCategory[] = ["bug", "ux", "praise", "performance", "other"];
const ENRICH_SEVERITIES: readonly AiSeverity[] = ["low", "medium", "high"];

function cleanPromptField(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, Math.max(1, max));
}

/**
 * Render the deterministic enrichment prompt for a report. Pure: embeds
 * bounded report fields and demands a strict JSON object with exactly
 * {summary, category, severity, cluster} — no prose outside the JSON.
 */
export function buildEnrichmentPrompt(report: EnrichmentReport): string {
  const text = cleanPromptField(report?.text ?? report?.text_body ?? "", 4000) || "(empty report)";
  const rating = cleanPromptField(report?.rating ?? "okay", 16) || "okay";
  const critique = cleanPromptField(report?.critique ?? "", 16);
  const labels = Array.isArray(report?.labels)
    ? report.labels.map((l) => cleanPromptField(l, 64)).filter(Boolean).slice(0, 20)
    : [];
  const pageUrl = cleanPromptField(report?.page_url ?? "", 2048);
  const lines = [
    "You enrich a user/bot feedback report for triage. Reply with a single strict JSON object and nothing else.",
    'Required shape: {"summary": string (<=280 chars, one sentence), "category": "bug"|"ux"|"praise"|"performance"|"other", "severity": "low"|"medium"|"high", "cluster": string (<=160 chars, short bucket label)}.',
    "Rules: never invent facts beyond the report; severity high only for crashes, data loss, security, payment, or cheat; keep summary to the report's first concern.",
    `rating: ${rating}`,
    critique ? `critique: ${critique}` : "critique: (none)",
    labels.length > 0 ? `labels: ${labels.join(", ")}` : "labels: (none)",
    pageUrl ? `page_url: ${pageUrl}` : "page_url: (none)",
    `report: ${text}`,
  ];
  return lines.join("\n");
}

function cleanParsedStr(value: unknown, max: number, fallback: string): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, Math.max(1, max));
  return s || fallback;
}

/**
 * Parse a model's raw enrichment JSON into the bounded ParsedEnrichment
 * shape. Fail-open: accepts objects, JSON strings, or anything else;
 * unknown categories/severities fall back to "other"/"medium", empty
 * strings fall back to defaults. Never throws.
 */
export function parseEnrichmentResult(json: unknown): ParsedEnrichment {
  let raw: Record<string, unknown> = {};
  try {
    if (typeof json === "string") {
      const trimmed = json.trim();
      if (trimmed) raw = (JSON.parse(trimmed) ?? {}) as Record<string, unknown>;
    } else if (typeof json === "object" && json !== null && !Array.isArray(json)) {
      raw = json as Record<string, unknown>;
    }
  } catch {
    raw = {};
  }
  const categoryRaw = String(raw["category"] ?? "").trim().toLowerCase();
  const category: AiCategory = (ENRICH_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as AiCategory)
    : "other";
  const severityRaw = String(raw["severity"] ?? "").trim().toLowerCase();
  const severity: AiSeverity = (ENRICH_SEVERITIES as readonly string[]).includes(severityRaw)
    ? (severityRaw as AiSeverity)
    : "medium";
  return {
    summary: cleanParsedStr(raw["summary"], 280, "(no summary)"),
    category,
    severity,
    cluster: cleanParsedStr(raw["cluster"], 160, `${category}:${severity}`),
  };
}

/** Map the deterministic stub columns to the ParsedEnrichment shape (no-key path). */
export function toParsedEnrichment(ai: AiEnrichment): ParsedEnrichment {
  return {
    summary: cleanParsedStr(ai?.ai_summary, 280, "(no summary)"),
    category: (ENRICH_CATEGORIES as readonly string[]).includes(String(ai?.ai_category))
      ? ai.ai_category
      : "other",
    severity: (ENRICH_SEVERITIES as readonly string[]).includes(String(ai?.ai_severity))
      ? ai.ai_severity
      : "medium",
    cluster: cleanParsedStr(ai?.ai_cluster, 160, "other:medium"),
  };
}
