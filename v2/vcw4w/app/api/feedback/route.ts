import { randomUUID } from "node:crypto";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { clientIp } from "@/lib/validate";

// POST /api/feedback — accepts humans + bots (no login, no same-origin
// check so non-browser bot callers can submit).
//
// Accepts multipart/form-data (screenshot uploads) or application/json
// (the top-bar button + programmatic bot callers without a screenshot).
//
// Canonical fields (both encodings):
//   reporterType: "human" | "bot" (required)
//   rating: "good" | "okay" | "bad" (required, except legacy bot submits
//     below which default to "okay")
//   critique: "positive" | "negative" (required, except legacy bot submits
//     below which default to "negative")
//   text: 1..4000 chars (required, except legacy bot submits may send
//     title + description instead — mapped to text server-side)
//   pageUrl: optional URL at submit moment (falls back to startedUrl)
//   startedUrl: optional URL at the moment feedback was started
//   labels: optional string array (<=20, each 1..64 chars) — accepts a raw
//     JSON array OR a JSON-stringified array string in either encoding
//     (multipart values are always strings; JSON callers may send either)
//   botExtras: optional object (serialized <=8000 chars) — accepts a raw
//     JSON object OR a JSON-stringified object string in either encoding.
//     When present it is validated against the bounds documented in
//     lib/vcw-feedback.ts BOT_EXTRAS_SCHEMA (botId required 1..128 chars,
//     optional runId/workerId/model <=128, promptRef <=256,
//     reproSteps <=20 strings each <=2000, logExcerpt <=8000,
//     confidence number 0..1).
//   screenshot: optional JPG file, multipart only (magic bytes FF D8 FF, <=8MB)
//
// Legacy bot-compat fields (JSON only, mapped server-side so older
// lib/vcw-feedback.ts callers that POST {title, description, ...} keep
// working instead of 400ing):
//   title + description: combined into `text` as "title\n\ndescription"
//     when `text` is absent (each trimmed, combined 1..4000 chars).
//   severity ("low"|"medium"|"high"|"critical"), game_slug/gameSlug,
//   botId/runId/workerId/model/promptRef/reproSteps/logExcerpt/confidence:
//     folded into `botExtras` when `botExtras` does not already carry them.
//   rating/critique absent on a reporterType:"bot" submit default to
//     "okay"/"negative" (humans must always send them explicitly).
//
// Response contract (shared lib/api-respond envelope — the UI contract):
//   success: { success: true, id, reporterType, rating, critique,
//     screenshotPath } with HTTP 201.
//   failure: { success: false, error } with HTTP 400 (validation), 405
//     (non-POST), 413 (screenshot >8MB), 429 (rate limit), 500 (store
//     write failure), or 503 ("feedback store not set up." fail-open when
//     the table/bucket/service-role config is missing — never faked).
//   Clients must read `success` + `error`/`id` (NOT bare `id`/`message`).
//
// Storage: row in `feedback_reports` + object in the `feedback-screenshots`
// bucket, both provisioned by DS-FEEDBACK-07
// (v2/vcw4w/supabase/migrations/20261120000000_feedback.sql — read-only
// reference; the migration is the column authority).
// Migration columns written here: reporter_type, rating, critique,
// text_body, labels (jsonb), bot_extras (jsonb, '{}' when absent),
// screenshot_path, page_url, user_agent. (The migration has NO
// screenshot_bytes/mime/sha256 columns — screenshot bytes are validated
// in-memory only via the JPEG/polyglot guards, never inserted.)

const MAX_TEXT_CHARS = 4000;
const MAX_URL_CHARS = 2048;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024; // 8MB authoritative post-buffer cap.
const MAX_LABELS = 20;
const MAX_LABEL_CHARS = 64;
const MAX_BOT_EXTRAS_CHARS = 8000;

const STORE_MISSING = "feedback store not set up.";
const BUCKET = "feedback-screenshots";

const REPORTER_TYPES = new Set(["human", "bot"]);
const RATINGS = new Set(["good", "okay", "bad"]);
const CRITIQUES = new Set(["positive", "negative"]);
const BOT_SEVERITIES = new Set(["low", "medium", "high", "critical"]);

// Bounds mirror lib/vcw-feedback.ts BOT_EXTRAS_SCHEMA so server-side
// validation accepts exactly what the typed bot client sends.
const BOT_EXTRAS_BOUNDS = {
  botId: 128,
  runId: 128,
  workerId: 128,
  model: 128,
  promptRef: 256,
  reproStepsMax: 20,
  reproStepChars: 2000,
  logExcerpt: 8000,
} as const;

function field(form: FormData, name: string): string | null {
  const v = form.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function isMissingTable(error: { code?: unknown; message?: unknown }): boolean {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code === "42P01" || // undefined_table
    code === "PGRST205" || // table not in schema cache
    message.includes("feedback_reports") ||
    message.includes("schema cache")
  );
}

function isMissingBucket(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("bucket not found") || m.includes("does not exist");
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function nonEmptyStr(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().slice(0, max);
  return s.length > 0 ? s : null;
}

// Validate a botExtras object against the BOT_EXTRAS_SCHEMA bounds from
// lib/vcw-feedback.ts. Returns an error message or null. Only objects that
// carry at least one bot key are validated (an empty {} from a caller
// without extras passes); a botId-carrying object must satisfy the full
// shape (botId required, optionals bounded when present).
function validateBotExtrasBounds(extras: Record<string, unknown>): string | null {
  const botId = nonEmptyStr(extras["botId"], BOT_EXTRAS_BOUNDS.botId);
  const carriesBotKeys =
    botId !== null ||
    ["runId", "workerId", "model", "promptRef", "reproSteps", "logExcerpt", "confidence", "severity", "gameSlug"].some(
      (k) => extras[k] !== undefined && extras[k] !== null && extras[k] !== "",
    );
  if (!carriesBotKeys) return null;
  if (!botId) return "Invalid botExtras.botId (non-empty string, <=128 chars).";
  for (const key of ["runId", "workerId", "model"] as const) {
    const v = extras[key];
    if (v !== undefined && v !== null && nonEmptyStr(v, BOT_EXTRAS_BOUNDS[key]) === null) {
      return `Invalid botExtras.${key} (non-empty string, <=${BOT_EXTRAS_BOUNDS[key]} chars).`;
    }
  }
  if (
    extras["promptRef"] !== undefined &&
    extras["promptRef"] !== null &&
    nonEmptyStr(extras["promptRef"], BOT_EXTRAS_BOUNDS.promptRef) === null
  ) {
    return "Invalid botExtras.promptRef (non-empty string, <=256 chars).";
  }
  if (extras["reproSteps"] !== undefined && extras["reproSteps"] !== null) {
    const steps = extras["reproSteps"];
    if (!Array.isArray(steps) || steps.length > BOT_EXTRAS_BOUNDS.reproStepsMax) {
      return "Invalid botExtras.reproSteps (string array, <=20).";
    }
    for (const s of steps) {
      if (nonEmptyStr(s, BOT_EXTRAS_BOUNDS.reproStepChars) === null) {
        return "Invalid botExtras.reproSteps (each a non-empty string, <=2000 chars).";
      }
    }
  }
  if (
    extras["logExcerpt"] !== undefined &&
    extras["logExcerpt"] !== null &&
    nonEmptyStr(extras["logExcerpt"], BOT_EXTRAS_BOUNDS.logExcerpt) === null
  ) {
    return "Invalid botExtras.logExcerpt (non-empty string, <=8000 chars).";
  }
  if (extras["confidence"] !== undefined && extras["confidence"] !== null) {
    const n = typeof extras["confidence"] === "string" ? Number(extras["confidence"].trim()) : extras["confidence"];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) {
      return "Invalid botExtras.confidence (number 0..1).";
    }
  }
  if (extras["severity"] !== undefined && extras["severity"] !== null) {
    if (typeof extras["severity"] !== "string" || !BOT_SEVERITIES.has(extras["severity"].trim().toLowerCase())) {
      return "Invalid botExtras.severity (low|medium|high|critical).";
    }
  }
  if (extras["gameSlug"] !== undefined && extras["gameSlug"] !== null) {
    if (nonEmptyStr(extras["gameSlug"], 64) === null) {
      return "Invalid botExtras.gameSlug (non-empty string, <=64 chars).";
    }
  }
  return null;
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().slice(0, MAX_URL_CHARS);
  if (!s) return null;
  // Only retain http(s) URLs or site-relative paths — never javascript:/data:.
  if (/^https?:\/\//i.test(s) || s.startsWith("/")) return s;
  return null;
}

export async function POST(req: Request) {
  const throttle = rateLimit(`feedback:${clientIp(req)}`, 30, 60_000);
  if (!throttle.allowed) return fail("Rate limited.", 429, rateLimitHeaders(throttle));
  if (!hasServerSupabase()) return fail(STORE_MISSING, 503);

  // Accept multipart/form-data (screenshot uploads) AND plain JSON
  // (the top-bar button + bot callers POST JSON without a screenshot).
  let form: FormData | null = null;
  let json: Record<string, unknown> | null = null;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const parsed: unknown = await req.json();
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return fail("Invalid JSON body.", 400);
      }
      json = parsed as Record<string, unknown>;
    } else {
      form = await req.formData();
    }
  } catch {
    return fail("Invalid request body.", 400);
  }

  const str = (name: string): string | null => {
    if (json) {
      const v: unknown = json[name];
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    }
    return field(form as FormData, name);
  };

  // Raw accessor: JSON callers may send labels as a real array and
  // botExtras as a real object (the top-bar button + old bot client send
  // plain JSON; multipart callers always send strings). Accept both.
  const raw = (name: string): unknown => {
    if (json) return json[name] ?? null;
    return (form as FormData).get(name);
  };

  const reporterType = str("reporterType");
  if (!reporterType || !REPORTER_TYPES.has(reporterType)) {
    return fail("Invalid reporterType (human|bot).", 400);
  }
  const isBot = reporterType === "bot";

  // rating/critique: required, except legacy bot submits (title/description
  // era callers that never sent them) default to okay/negative. An
  // explicitly-sent invalid value still 400s — defaults only fill absence.
  let rating = str("rating");
  if (!rating && isBot) rating = "okay";
  if (!rating || !RATINGS.has(rating)) {
    return fail("Invalid rating (good|okay|bad).", 400);
  }
  let critique = str("critique");
  if (!critique && isBot) critique = "negative";
  if (!critique || !CRITIQUES.has(critique)) {
    return fail("Invalid critique (positive|negative).", 400);
  }

  // text: canonical; legacy bot callers sent title + description instead.
  const rawText: unknown = json ? json["text"] : (form as FormData).get("text");
  let text = typeof rawText === "string" ? rawText.trim() : "";
  if (!text && json) {
    const title = typeof json["title"] === "string" ? json["title"].trim().slice(0, 200) : "";
    const description = typeof json["description"] === "string" ? json["description"].trim() : "";
    if (title || description) {
      text = (title && description ? `${title}\n\n${description}` : title || description).slice(0, MAX_TEXT_CHARS);
    }
  }
  if (text.length < 1 || text.length > MAX_TEXT_CHARS) {
    return fail("Invalid text (1..4000 chars).", 400);
  }

  // labels: raw array OR JSON-stringified array string, either encoding.
  let labels: string[] = [];
  const labelsRaw: unknown = raw("labels");
  if (labelsRaw !== null && labelsRaw !== undefined && labelsRaw !== "") {
    let parsed: unknown = labelsRaw;
    if (typeof labelsRaw === "string") {
      try {
        parsed = JSON.parse(labelsRaw);
      } catch {
        return fail("Invalid labels JSON.", 400);
      }
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length > MAX_LABELS ||
      !parsed.every((l) => typeof l === "string" && l.trim().length >= 1 && l.trim().length <= MAX_LABEL_CHARS)
    ) {
      return fail("Invalid labels (string array, <=20, each 1..64 chars).", 400);
    }
    labels = (parsed as string[]).map((l) => l.trim());
  }

  // botExtras: raw object OR JSON-stringified object string, either
  // encoding; serialized form still capped at 8000 chars.
  let botExtras: Record<string, unknown> = {};
  const botExtrasRaw: unknown = raw("botExtras");
  if (botExtrasRaw !== null && botExtrasRaw !== undefined && botExtrasRaw !== "") {
    if (typeof botExtrasRaw === "string") {
      if (botExtrasRaw.length > MAX_BOT_EXTRAS_CHARS) {
        return fail("Invalid botExtras (too large).", 400);
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(botExtrasRaw);
      } catch {
        return fail("Invalid botExtras JSON.", 400);
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return fail("Invalid botExtras (JSON object).", 400);
      }
      botExtras = parsed as Record<string, unknown>;
    } else if (typeof botExtrasRaw === "object" && !Array.isArray(botExtrasRaw)) {
      botExtras = { ...(botExtrasRaw as Record<string, unknown>) };
      if (JSON.stringify(botExtras).length > MAX_BOT_EXTRAS_CHARS) {
        return fail("Invalid botExtras (too large).", 400);
      }
    } else {
      return fail("Invalid botExtras (JSON object).", 400);
    }
  }

  // Legacy bot top-level fields (title/description-era submitBotFeedback sent
  // botId/severity/game_slug flat): fold into botExtras when botExtras does
  // not already carry them. severity/gameSlug have no migration columns —
  // bot_extras is their durable home.
  if (json && isBot) {
    const foldStr = (key: string, max: number) => {
      if (botExtras[key] === undefined) {
        const v = json[key];
        if (typeof v === "string" && v.trim()) botExtras[key] = v.trim().slice(0, max);
      }
    };
    foldStr("botId", BOT_EXTRAS_BOUNDS.botId);
    foldStr("runId", BOT_EXTRAS_BOUNDS.runId);
    foldStr("workerId", BOT_EXTRAS_BOUNDS.workerId);
    foldStr("model", BOT_EXTRAS_BOUNDS.model);
    foldStr("promptRef", BOT_EXTRAS_BOUNDS.promptRef);
    foldStr("logExcerpt", BOT_EXTRAS_BOUNDS.logExcerpt);
    if (botExtras["severity"] === undefined) {
      const sev = typeof json["severity"] === "string" ? json["severity"].trim().toLowerCase() : "";
      if (sev) {
        if (!BOT_SEVERITIES.has(sev)) return fail("Invalid severity (low|medium|high|critical).", 400);
        botExtras["severity"] = sev;
      }
    }
    if (botExtras["gameSlug"] === undefined) {
      const gs =
        typeof json["gameSlug"] === "string"
          ? json["gameSlug"]
          : typeof json["game_slug"] === "string"
            ? json["game_slug"]
            : "";
      if (gs.trim()) botExtras["gameSlug"] = gs.trim().slice(0, 64);
    }
    for (const key of ["reproSteps", "confidence"] as const) {
      if (botExtras[key] === undefined && json[key] !== undefined) {
        botExtras[key] = json[key];
      }
    }
  }

  // Validate botExtras bounds (mirrors BOT_EXTRAS_SCHEMA in
  // lib/vcw-feedback.ts). Empty object (human without extras) passes;
  // a botId-carrying object must satisfy the full shape.
  if (Object.keys(botExtras).length > 0) {
    const extrasErr = validateBotExtrasBounds(botExtras);
    if (extrasErr) return fail(extrasErr, 400);
  }

  // URL the reporter was on at submit (preferred) + at start (fallback).
  const startedUrl = cleanUrl(str("startedUrl"));
  const pageUrl = cleanUrl(str("pageUrl")) ?? startedUrl;

  let screenshotBuf: Buffer | null = null;
  const shot: unknown = form ? (form as FormData).get("screenshot") : null;
  if (shot !== null && shot !== undefined) {
    if (!(shot instanceof Blob)) return fail("Invalid screenshot.", 400);
    // Early reject on the client-reported size before buffering; the
    // authoritative byte-length check after arrayBuffer() still applies.
    if (shot.size === 0) return fail("Invalid screenshot (empty).", 400);
    if (shot.size > MAX_SCREENSHOT_BYTES) {
      return fail(`Screenshot too large (${shot.size} bytes). 8MB max.`, 413);
    }
    const buf = Buffer.from(await shot.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_SCREENSHOT_BYTES) {
      return fail(
        buf.length === 0
          ? "Invalid screenshot (empty)."
          : `Screenshot too large (${buf.length} bytes). 8MB max.`,
        buf.length === 0 ? 400 : 413,
      );
    }
    if (!isJpeg(new Uint8Array(buf))) {
      return fail("Invalid screenshot (JPG only).", 400);
    }
    // Polyglot guard: magic bytes alone don't prove "just a JPEG" — scan
    // head+tail for active markup that would be dangerous if ever served
    // inline from a trusted origin.
    const head = buf.subarray(0, Math.min(buf.length, 2048)).toString("latin1").toLowerCase();
    const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").toLowerCase();
    if (/<html|<\s*script|<\s*iframe|<\s*object|<\s*embed|<\s*svg|<\?php|javascript\s*:|on\w+\s*=/.test(`${head}\n${tail}`)) {
      return fail("Screenshot contains embedded active content.", 400);
    }
    screenshotBuf = buf;
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail(STORE_MISSING, 503);
  }

  let screenshotPath: string | null = null;
  if (screenshotBuf) {
    screenshotPath = `feedback/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.jpg`;
    const { error: upErr } = await svc.storage
      .from(BUCKET)
      .upload(screenshotPath, screenshotBuf, { contentType: "image/jpeg", upsert: false });
    if (upErr) {
      const msg = String((upErr as { message?: unknown }).message ?? upErr);
      if (isMissingBucket(msg)) return fail(STORE_MISSING, 503);
      console.error("[api] feedback screenshot upload error", { message: msg.slice(0, 200) });
      return fail("Unable to store screenshot.", 500);
    }
  }

  // Column authority is supabase/migrations/20261120000000_feedback.sql:
  // text_body (not text), no screenshot_bytes/mime/sha256 columns, and
  // labels/bot_extras are NOT NULL jsonb (send [] / {} rather than null).
  const { data: row, error: rowErr } = await svc
    .from("feedback_reports")
    .insert({
      reporter_type: reporterType,
      rating,
      critique,
      text_body: text,
      labels,
      bot_extras: botExtras,
      page_url: pageUrl,
      user_agent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
      screenshot_path: screenshotPath,
    })
    .select("id")
    .maybeSingle();
  if (rowErr) {
    if (isMissingTable(rowErr as { code?: unknown; message?: unknown })) {
      return fail(STORE_MISSING, 503);
    }
    return dbFail("api/feedback", rowErr, "Unable to save feedback.", 500);
  }
  const id = (row as { id?: unknown } | null)?.id ?? null;
  if (id === null || id === undefined) {
    // Insert reported success but returned no row — never fake success.
    return fail("Unable to save feedback.", 500);
  }

  return ok(
    {
      id,
      reporterType,
      rating,
      critique,
      screenshotPath,
    },
    201,
  );
}

export function GET() {
  return fail("Method not allowed.", 405);
}
