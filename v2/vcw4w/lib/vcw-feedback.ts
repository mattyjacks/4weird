/**
 * VibeCodeWorker bot-reporter feedback: bot-only extras + programmatic API
 * submission.
 *
 * Human reporters file through the UI; bot reporters get extra structured
 * fields only a bot would use (run/worker/model provenance, prompt ref,
 * repro steps, log excerpt, confidence) and submit programmatically via
 * `POST /api/feedback` with `reporterType: "bot"` plus a bot API key
 * header (`x-bot-key`, same convention as lib/bot-auth / vcw-gateway-auth).
 *
 * Pure + dependency-free: validation never touches the network, submission
 * never logs the key, and the key is always an explicit caller argument
 * (never read from env here, never committed anywhere).
 */

export const BOT_FEEDBACK_ENDPOINT = "/api/feedback" as const;
export const BOT_FEEDBACK_REPORTER = "bot" as const;

/** Bot API key header (mirrors lib/bot-auth x-bot-key convention). */
export const BOT_API_KEY_HEADER = "x-bot-key" as const;

export const BOT_FEEDBACK_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type BotFeedbackSeverity = (typeof BOT_FEEDBACK_SEVERITIES)[number];

export function isBotFeedbackSeverity(value: unknown): value is BotFeedbackSeverity {
  return typeof value === "string" && (BOT_FEEDBACK_SEVERITIES as readonly string[]).includes(value);
}

/**
 * Schema descriptor for the bot-only extras. `required` lists fields that
 * must be present; `optional` lists bot-only fields a human form never
 * sends; `constraints` documents the bounds `validateBotExtras` enforces.
 */
export const BOT_EXTRAS_SCHEMA = {
  required: ["botId"] as const,
  optional: [
    "runId",
    "workerId",
    "model",
    "promptRef",
    "reproSteps",
    "logExcerpt",
    "confidence",
  ] as const,
  constraints: {
    botId: { type: "string", minLength: 1, maxLength: 128 },
    runId: { type: "string", maxLength: 128 },
    workerId: { type: "string", maxLength: 128 },
    model: { type: "string", maxLength: 128 },
    promptRef: { type: "string", maxLength: 256 },
    reproSteps: { type: "string[]", maxItems: 20, maxItemLength: 2000 },
    logExcerpt: { type: "string", maxLength: 8000 },
    confidence: { type: "number", min: 0, max: 1 },
  } as const,
} as const;

export type BotExtrasField =
  | (typeof BOT_EXTRAS_SCHEMA.required)[number]
  | (typeof BOT_EXTRAS_SCHEMA.optional)[number];

/** Bot-only extras: provenance + repro material only a bot would use. */
export interface BotExtras {
  botId: string;
  runId?: string;
  workerId?: string;
  model?: string;
  promptRef?: string;
  reproSteps?: string[];
  logExcerpt?: string;
  confidence?: number;
}

export interface ValidatedBotExtras extends BotExtras {
  botId: string;
}

export type ValidateBotExtrasResult =
  | { ok: true; value: ValidatedBotExtras }
  | { ok: false; errors: string[] };

function cleanStr(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().slice(0, max);
  return s.length > 0 ? s : null;
}

function cleanOptionalStr(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = cleanStr(value, max);
  return s ?? undefined;
}

/**
 * Validate untrusted bot extras. Pure: returns cleaned values or a list of
 * human-readable errors; never throws on malformed input.
 */
export function validateBotExtras(input: unknown): ValidateBotExtrasResult {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["extras must be an object"] };
  }
  const raw = input as Record<string, unknown>;

  const botId = cleanStr(raw.botId, BOT_EXTRAS_SCHEMA.constraints.botId.maxLength);
  if (!botId) errors.push("botId is required (non-empty string)");

  const runId = cleanOptionalStr(raw.runId, BOT_EXTRAS_SCHEMA.constraints.runId.maxLength);
  if (raw.runId !== undefined && raw.runId !== null && runId === undefined) {
    errors.push("runId must be a non-empty string when provided");
  }
  const workerId = cleanOptionalStr(raw.workerId, BOT_EXTRAS_SCHEMA.constraints.workerId.maxLength);
  if (raw.workerId !== undefined && raw.workerId !== null && workerId === undefined) {
    errors.push("workerId must be a non-empty string when provided");
  }
  const model = cleanOptionalStr(raw.model, BOT_EXTRAS_SCHEMA.constraints.model.maxLength);
  if (raw.model !== undefined && raw.model !== null && model === undefined) {
    errors.push("model must be a non-empty string when provided");
  }
  const promptRef = cleanOptionalStr(raw.promptRef, BOT_EXTRAS_SCHEMA.constraints.promptRef.maxLength);
  if (raw.promptRef !== undefined && raw.promptRef !== null && promptRef === undefined) {
    errors.push("promptRef must be a non-empty string when provided");
  }

  let reproSteps: string[] | undefined;
  if (raw.reproSteps !== undefined && raw.reproSteps !== null) {
    if (!Array.isArray(raw.reproSteps)) {
      errors.push("reproSteps must be an array of strings when provided");
    } else {
      const maxItems = BOT_EXTRAS_SCHEMA.constraints.reproSteps.maxItems;
      const maxItem = BOT_EXTRAS_SCHEMA.constraints.reproSteps.maxItemLength;
      if (raw.reproSteps.length > maxItems) {
        errors.push(`reproSteps must have at most ${maxItems} steps`);
      }
      const cleaned: string[] = [];
      raw.reproSteps.slice(0, maxItems).forEach((step, i) => {
        const s = cleanStr(step, maxItem);
        if (s) cleaned.push(s);
        else errors.push(`reproSteps[${i}] must be a non-empty string`);
      });
      reproSteps = cleaned;
    }
  }

  const logExcerpt = cleanOptionalStr(raw.logExcerpt, BOT_EXTRAS_SCHEMA.constraints.logExcerpt.maxLength);
  if (raw.logExcerpt !== undefined && raw.logExcerpt !== null && logExcerpt === undefined) {
    errors.push("logExcerpt must be a non-empty string when provided");
  }

  let confidence: number | undefined;
  if (raw.confidence !== undefined && raw.confidence !== null) {
    const n = typeof raw.confidence === "string" ? Number(raw.confidence.trim()) : raw.confidence;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) {
      errors.push("confidence must be a number in 0..1 when provided");
    } else {
      confidence = Math.round(n * 10000) / 10000;
    }
  }

  if (errors.length > 0 || !botId) return { ok: false, errors };
  const value: ValidatedBotExtras = { botId };
  if (runId !== undefined) value.runId = runId;
  if (workerId !== undefined) value.workerId = workerId;
  if (model !== undefined) value.model = model;
  if (promptRef !== undefined) value.promptRef = promptRef;
  if (reproSteps !== undefined) value.reproSteps = reproSteps;
  if (logExcerpt !== undefined) value.logExcerpt = logExcerpt;
  if (confidence !== undefined) value.confidence = confidence;
  return { ok: true, value };
}

export interface SubmitBotFeedbackArgs {
  title: string;
  description: string;
  extras: unknown;
  /** Bot API key; sent only as the x-bot-key header, never logged/stored. */
  apiKey: string;
  severity?: BotFeedbackSeverity;
  gameSlug?: string;
  /** URL the bot was acting on at submit moment (stored as page_url). */
  pageUrl?: string;
  /** URL at the moment the bot started the feedback-worthy run. */
  startedUrl?: string;
  /** Override for tests/proxies; defaults to /api/feedback. */
  endpoint?: string;
}

export interface SubmitBotFeedbackResult {
  ok: boolean;
  status: number;
  id?: string;
  error?: string;
}

/**
 * Submit bot feedback programmatically: validates the bot extras, then
 * POSTs to /api/feedback with `reporterType: "bot"` and the bot API key
 * header. Returns a typed result; never throws on HTTP/API errors (only
 * on a missing fetch implementation, which is a caller bug).
 */
export async function submitBotFeedback(args: SubmitBotFeedbackArgs): Promise<SubmitBotFeedbackResult> {
  const title = String(args?.title ?? "").trim().slice(0, 200);
  const description = String(args?.description ?? "").trim().slice(0, 8000);
  if (!title) return { ok: false, status: 0, error: "title is required" };
  if (!description) return { ok: false, status: 0, error: "description is required" };
  const apiKey = String(args?.apiKey ?? "").trim();
  if (!apiKey) return { ok: false, status: 0, error: "apiKey is required" };

  const checked = validateBotExtras(args?.extras);
  if (!checked.ok) return { ok: false, status: 0, error: checked.errors.join("; ") };

  let severity: BotFeedbackSeverity | undefined;
  if (args?.severity !== undefined) {
    if (!isBotFeedbackSeverity(args.severity)) {
      return { ok: false, status: 0, error: "severity must be low|medium|high|critical" };
    }
    severity = args.severity;
  }
  const gameSlug = cleanOptionalStr(args?.gameSlug, 64);
  const pageUrl = cleanOptionalStr(args?.pageUrl, 2048);
  const startedUrl = cleanOptionalStr(args?.startedUrl, 2048);
  const endpoint =
    typeof args?.endpoint === "string" && args.endpoint.trim().length > 0
      ? args.endpoint.trim()
      : BOT_FEEDBACK_ENDPOINT;

  const body: Record<string, unknown> = {
    reporterType: BOT_FEEDBACK_REPORTER,
    title,
    description,
    ...checked.value,
  };
  if (severity !== undefined) body.severity = severity;
  if (gameSlug !== undefined) body.game_slug = gameSlug;
  if (pageUrl !== undefined) body.pageUrl = pageUrl;
  if (startedUrl !== undefined) body.startedUrl = startedUrl;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [BOT_API_KEY_HEADER]: apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, error: `request failed: ${String((err as Error)?.message ?? err)}`.slice(0, 300) };
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  if (!res.ok) {
    const msg =
      cleanStr(payload.error ?? payload.message, 300) ?? `feedback submit failed (HTTP ${res.status})`;
    return { ok: false, status: res.status, error: msg };
  }
  const id = cleanStr(payload.id, 128);
  return { ok: true, status: res.status, ...(id ? { id } : {}) };
}
