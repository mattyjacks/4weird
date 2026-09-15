import { dbFail, fail, ok } from "@/lib/api-respond";
import { resolveBotKey } from "@/lib/bot-auth";
import {
  buildEnrichmentPrompt,
  ENRICH_MODEL_STUB,
  ENRICH_PROMPT_VERSION,
  ENRICH_PROMPT_VERSION_LLM,
  parseEnrichmentResult,
  stubEnrichFeedback,
  toParsedEnrichment,
  type ParsedEnrichment,
} from "@/lib/feedback/enrich";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { clientIp, isUuid } from "@/lib/validate";

// POST /api/feedback/[id]/enrich — fire-and-forget AI enrichment stub.
//
// Auth: admin session (app_metadata role admin, same as the screenshot
// route) OR a valid bot key (x-bot-key / Authorization Bearer, verified via
// resolveBotKey). Anything else: 401 anonymous, 403 signed-in non-admin.
//
// Reads the report row + mints a short-lived signed screenshot URL (same
// private-bucket pattern as [id]/screenshot). When OPENAI_API_KEY is
// present the report (+ screenshot image_url when attached) is sent to a
// vision chat-completions model; otherwise the deterministic stub runs and
// the route returns { processed: false, reason: "no-key" } fail-open.
//
// Writes ONLY the AI columns (ai_summary, ai_category, ai_severity,
// ai_cluster, ai_processed_at) plus one feedback_ai_logs row (model,
// prompt_version, raw, cost). Human fields are never touched. No secrets
// in code — the key is read from env server-side only, never logged.

const SIGNED_TTL_SECONDS = 300;
const LLM_TIMEOUT_MS = 25_000;
const LLM_DEFAULT_MODEL = "gpt-4o-mini";
// Approximate gpt-4o-mini list rates (USD per 1M tokens, input/output).
// Estimate only, flagged in raw; unknown models log cost NULL.
const LLM_PRICE_IN_PER_M = 0.15;
const LLM_PRICE_OUT_PER_M = 0.6;

type ReportRow = {
  id: string;
  rating: string | null;
  critique: string | null;
  text_body: string | null;
  labels: unknown;
  page_url: string | null;
  screenshot_path: string | null;
};

function asLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((l): l is string => typeof l === "string").slice(0, 20);
}

function stripFences(content: string): string {
  const t = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return t.trim();
}

async function callVisionLlm(
  apiKey: string,
  model: string,
  prompt: string,
  imageUrl: string | null,
): Promise<{ parsed: ParsedEnrichment; raw: Record<string, unknown>; cost: number | null }> {
  const userContent =
    imageUrl !== null
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ]
      : prompt;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You enrich feedback reports for triage. Reply with a single strict JSON object: {summary, category, severity, cluster}.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) throw new Error(`llm-http-${res.status}`);
    const payload = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
    };
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseEnrichmentResult(
      typeof content === "string" ? stripFences(content) : content,
    );
    const promptTokens = Number(payload?.usage?.prompt_tokens);
    const completionTokens = Number(payload?.usage?.completion_tokens);
    const knownModel = model.startsWith("gpt-4o-mini");
    const cost =
      knownModel && Number.isFinite(promptTokens) && Number.isFinite(completionTokens)
        ? Math.round((promptTokens * LLM_PRICE_IN_PER_M + completionTokens * LLM_PRICE_OUT_PER_M) / 1000) / 1000
        : null;
    return {
      parsed,
      raw: {
        response: { ...parsed },
        usage: payload?.usage ?? null,
        ...(cost !== null ? { cost_estimated: true } : {}),
      },
      cost,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const throttle = rateLimit(`feedback-enrich:${clientIp(req)}`, 30, 60_000);
  if (!throttle.allowed) return fail("Rate limited.", 429, rateLimitHeaders(throttle));

  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid feedback id.", 400);

  // Admin session OR verified bot key — nothing else.
  let authorized = false;
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    signedIn = Boolean(user);
    if ((user?.app_metadata as Record<string, unknown> | null)?.role === "admin") {
      authorized = true;
    }
  } catch {
    /* session check failed — fall through to bot-key check */
  }
  if (!authorized) {
    try {
      authorized = (await resolveBotKey(req)) !== null;
    } catch {
      authorized = false;
    }
  }
  if (!authorized) return fail(signedIn ? "Admin access required." : "Login required.", signedIn ? 403 : 401);

  // Training-signal stub (admin Approve/Fix thumbs in /feedback/admin):
  // { signal: "approve" | "fix" } writes one log row and returns — no column
  // writes, never touches human fields. The normal enrichment path below
  // never reads a body, so consuming it here is safe.
  let signal: string | null = null;
  try {
    const signalBody: unknown = await req.json();
    const rawSignal = (signalBody as Record<string, unknown> | null)?.["signal"];
    if (typeof rawSignal === "string") signal = rawSignal.trim().toLowerCase();
  } catch {
    signal = null;
  }
  if (signal !== null) {
    if (signal !== "approve" && signal !== "fix") return fail("Invalid signal (approve|fix).", 400);
    if (!hasServerSupabase()) return fail("feedback store not set up.", 503);
    let signalSvc;
    try {
      signalSvc = serviceClient();
    } catch {
      return fail("feedback store not set up.", 503);
    }
    const signalRow = {
      report_id: id,
      feedback_id: id,
      model: "human-signal",
      prompt_version: ENRICH_PROMPT_VERSION,
      raw: { signal },
      output: { signal },
      cost: null,
    };
    const { error: signalErr } = await signalSvc.from("feedback_ai_logs").insert(signalRow);
    if (signalErr) {
      // Pre-contract DBs lack feedback_id/prompt_version/raw/cost — retry
      // the shipped legacy shape instead of failing the thumbs click.
      const code = String((signalErr as { code?: unknown }).code ?? "");
      if (code !== "42703") {
        return dbFail("api/feedback/[id]/enrich", signalErr, "Unable to save training signal.", 500);
      }
      const { error: legacyErr } = await signalSvc.from("feedback_ai_logs").insert({
        report_id: id,
        model: "human-signal",
        output: { signal },
      });
      if (legacyErr) {
        return dbFail("api/feedback/[id]/enrich", legacyErr, "Unable to save training signal.", 500);
      }
    }
    return ok({ id, signal });
  }

  if (!hasServerSupabase()) return fail("feedback store not set up.", 503);
  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail("feedback store not set up.", 503);
  }

  const { data: row, error: rowErr } = await svc
    .from("feedback_reports")
    .select("id,rating,critique,text_body,labels,page_url,screenshot_path")
    .eq("id", id)
    .maybeSingle();
  if (rowErr) return dbFail("api/feedback/[id]/enrich", rowErr, "Unable to load feedback.", 500);
  const report = row as ReportRow | null;
  if (!report) return fail("Feedback not found.", 404);

  // Signed screenshot URL for the vision call (fail-open: text-only when absent).
  let screenshotUrl: string | null = null;
  if (typeof report.screenshot_path === "string" && report.screenshot_path.length > 0) {
    try {
      const { data: signed, error: signErr } = await svc.storage
        .from("feedback-screenshots")
        .createSignedUrl(report.screenshot_path, SIGNED_TTL_SECONDS);
      if (!signErr && signed?.signedUrl) screenshotUrl = signed.signedUrl;
    } catch {
      screenshotUrl = null;
    }
  }

  const prompt = buildEnrichmentPrompt({
    id: report.id,
    text_body: report.text_body,
    rating: report.rating,
    critique: report.critique,
    labels: asLabels(report.labels),
    page_url: report.page_url,
  });

  const apiKey = process.env.OPENAI_API_KEY ?? "";
  let parsed: ParsedEnrichment;
  let model: string;
  let promptVersion: string;
  let raw: Record<string, unknown>;
  let cost: number | null;
  let processed = true;
  let reason: string | null = null;

  if (!apiKey) {
    parsed = toParsedEnrichment(
      stubEnrichFeedback({ text: report.text_body ?? "", rating: report.rating ?? "okay" }),
    );
    model = ENRICH_MODEL_STUB;
    promptVersion = ENRICH_PROMPT_VERSION;
    raw = { stub: { ...parsed }, reason: "no-key" };
    cost = null;
    processed = false;
    reason = "no-key";
  } else {
    const llmModel = process.env.FEEDBACK_ENRICH_MODEL?.trim() || LLM_DEFAULT_MODEL;
    try {
      const result = await callVisionLlm(apiKey, llmModel, prompt, screenshotUrl);
      parsed = result.parsed;
      raw = { ...result.raw, prompt_version: ENRICH_PROMPT_VERSION_LLM, screenshot: screenshotUrl !== null };
      cost = result.cost;
      model = llmModel;
      promptVersion = ENRICH_PROMPT_VERSION_LLM;
    } catch {
      parsed = toParsedEnrichment(
        stubEnrichFeedback({ text: report.text_body ?? "", rating: report.rating ?? "okay" }),
      );
      model = ENRICH_MODEL_STUB;
      promptVersion = ENRICH_PROMPT_VERSION;
      raw = { stub: { ...parsed }, reason: "llm-failed" };
      cost = null;
      processed = false;
      reason = "llm-failed";
    }
  }

  // AI-only columns — human fields are never written here.
  const { error: upErr } = await svc
    .from("feedback_reports")
    .update({
      ai_summary: parsed.summary,
      ai_category: parsed.category,
      ai_severity: parsed.severity,
      ai_cluster: parsed.cluster,
      ai_processed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (upErr) return dbFail("api/feedback/[id]/enrich", upErr, "Unable to save enrichment.", 500);

  const { error: logErr } = await svc.from("feedback_ai_logs").insert({
    // report_id is the shipped NOT NULL key; feedback_id is the FBOV-09
    // contract key (converged by the AI-contract migration).
    report_id: id,
    feedback_id: id,
    model,
    prompt_version: promptVersion,
    raw,
    output: { ...raw },
    cost,
  });
  if (logErr) return dbFail("api/feedback/[id]/enrich", logErr, "Unable to log enrichment.", 500);

  return ok({
    id,
    processed,
    ...(reason !== null ? { reason } : {}),
    model,
    summary: parsed.summary,
    category: parsed.category,
    severity: parsed.severity,
    cluster: parsed.cluster,
    ...(screenshotUrl !== null ? { screenshotUrl } : {}),
  });
}

export function GET() {
  return fail("Method not allowed.", 405);
}
