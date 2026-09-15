import { createHash, randomUUID } from "node:crypto";
import { dbFail, fail, ok } from "@/lib/api-respond";
import {
  ENRICH_MODEL_STUB,
  ENRICH_PROMPT_VERSION,
  stubEnrichFeedback,
} from "@/lib/feedback/enrich";
import { globalBucket, ipBucketKey, throttleHeaders } from "@/lib/abuse-limit";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { clientIp, isEmail } from "@/lib/validate";

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
//   visibility: "tracked" | "anonymous" | "guest" — identity model (plan §2).
//     Tracked links the report to the signed-in account (user_id resolved
//     server-side from the session; client-sent user_id/userId always
//     ignored; explicit tracked without a live session → 401). Anonymous
//     stores user_id NULL even when signed in. Guest needs no session.
//     Absent visibility defaults to guest (DS-FBOV-06 — humans and bots
//     alike land as guests unless they explicitly opt into tracked) so
//     legacy callers that never sent visibility keep working instead of
//     401ing; the DB default is 'tracked' per
//     20261212000000_feedback_identity.sql.
//   contact_name: optional 1..100 chars, contact_email: optional valid email
//     3..254 chars — guest follow-up only (validated when sent, stored only
//     for guest, stripped to NULL for tracked/anonymous; admins only, never
//     public).
//   source: "dialog" (default) | "page" | "bot-api" — where the report came
//     from. reporter_type human|bot stays orthogonal (who wrote it).
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
//   annotations: optional array (<=20) of { tool, x, y, w?, h?, comment? } —
//     accepts a raw JSON array OR a JSON-stringified array string in either
//     encoding. tool is one of arrow|rect|circle|line|text|highlight|blur;
//     x/y required percent numbers 0..100, w/h optional percents 0..100,
//     comment optional <=280 chars.
//   screenshot: optional image file, multipart only (JPEG/PNG/WebP detected
//     via magic bytes — FF D8 FF jpg, 89 50 4E 47 png, 52494646....WEBP
//     webp — <=8MB, polyglot guard still applies)
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
//     visibility, source, screenshotPath } with HTTP 201.
//   failure: { success: false, error } with HTTP 400 (validation), 401
//     (tracked requested without a login session), 405 (non-POST), 413
//     (screenshot >8MB), 429 (rate limit — guests share a tighter 10/min
//     per-IP bucket plus a 5/hour/IP backstop on top of the base 30/min
//     bucket), 500 (store write failure), or 503 ("feedback store not set
//     up." fail-open when the table/bucket/service-role config — or the
//     visibility/contact/source/annotations columns — is missing; never
//     faked).
//   Clients must read `success` + `error`/`id` (NOT bare `id`/`message`).
//
// Storage: row in `feedback_reports` + object in the `feedback-screenshots`
// bucket, both provisioned by DS-FEEDBACK-07
// (v2/vcw4w/supabase/migrations/20261120000000_feedback.sql — read-only
// reference; the migration is the column authority).
// Migration columns written here: reporter_type, rating, critique,
// text_body, labels (jsonb), bot_extras (jsonb, '{}' when absent),
// screenshot_path, screenshot_mime, screenshot_width, screenshot_height
// (dims sniffed dependency-free from PNG IHDR / JPEG SOF / WebP chunks;
// NULL when unparseable), page_url, user_agent, plus DS-FBOV-06: visibility,
// user_id (session-resolved, NULL unless tracked), contact_name,
// contact_email (both NULL unless guest), annotations (jsonb, [] when
// absent). (The migration has NO screenshot_bytes/sha256 columns —
// screenshot bytes are validated in-memory only via the magic-byte /
// polyglot guards, never inserted.) When the DS-FBOV-06 columns have not
// been migrated yet the insert fails with a missing-column error and the
// route returns 503 STORE_MISSING (fail-open, never faked) instead of
// silently dropping the new fields.

const MAX_TEXT_CHARS = 4000;
const MAX_URL_CHARS = 2048;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024; // 8MB authoritative post-buffer cap.
const MAX_LABELS = 20;
const MAX_LABEL_CHARS = 64;
const MAX_BOT_EXTRAS_CHARS = 8000;
const MAX_CONTACT_NAME_CHARS = 100;
const MAX_CONTACT_EMAIL_CHARS = 254;
const MAX_ANNOTATIONS = 20;
const MAX_ANNOTATION_COMMENT_CHARS = 280;
// Guest (default, unauthenticated) submitters share a tighter per-IP bucket
// on top of the base bucket below: 10/min vs 30/min. Tracked / anonymous /
// bot callers are checked against the base bucket only.
const GUEST_LIMIT = 10;

const STORE_MISSING = "feedback store not set up.";
const BUCKET = "feedback-screenshots";

const REPORTER_TYPES = new Set(["human", "bot"]);
const VISIBILITIES = new Set(["tracked", "anonymous", "guest"]);
const SOURCES = new Set(["dialog", "page", "bot-api"]);
const ANNOTATION_TOOLS = new Set(["arrow", "rect", "circle", "line", "text", "highlight", "blur"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

function isMissingColumn(error: { code?: unknown; message?: unknown }): boolean {
  const code = String(error?.code ?? "");
  if (code === "42703" || code === "PGRST204") return true;
  const m = String(error?.message ?? "").toLowerCase();
  return (
    (m.includes("column") || m.includes("schema cache")) &&
    (m.includes("visibility") ||
      m.includes("user_id") ||
      m.includes("contact_name") ||
      m.includes("contact_email") ||
      m.includes("source") ||
      m.includes("annotations") ||
      m.includes("screenshot_mime") ||
      m.includes("screenshot_width") ||
      m.includes("screenshot_height"))
  );
}

type ImageKind = "jpeg" | "png" | "webp";

const SCREENSHOT_META: Record<ImageKind, { ext: string; contentType: string }> = {
  jpeg: { ext: "jpg", contentType: "image/jpeg" },
  png: { ext: "png", contentType: "image/png" },
  webp: { ext: "webp", contentType: "image/webp" },
};

// Magic-byte sniffing (authoritative over any client-sent MIME/filename):
// FF D8 FF = JPEG, 89 50 4E 47 = PNG, RIFF....WEBP = WebP ("RIFF"
// 52 49 46 46 at 0..3, "WEBP" 57 45 42 50 at 8..11).
function detectImageKind(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// Dependency-free dimension sniffing (best-effort; null when unparseable —
// the upload still proceeds, dims just store NULL). Bounds-checked against
// truncated buffers throughout.
function readU16BE(bytes: Uint8Array, at: number): number | null {
  if (at < 0 || at + 2 > bytes.length) return null;
  return bytes[at]! * 256 + bytes[at + 1]!;
}

function readU32BE(bytes: Uint8Array, at: number): number | null {
  if (at < 0 || at + 4 > bytes.length) return null;
  return ((bytes[at]! * 256 + bytes[at + 1]!) * 256 + bytes[at + 2]!) * 256 + bytes[at + 3]!;
}

function readU16LE(bytes: Uint8Array, at: number): number | null {
  if (at < 0 || at + 2 > bytes.length) return null;
  return bytes[at]! + bytes[at + 1]! * 256;
}

function readU32LE(bytes: Uint8Array, at: number): number | null {
  if (at < 0 || at + 4 > bytes.length) return null;
  return bytes[at]! + bytes[at + 1]! * 256 + bytes[at + 2]! * 65536 + bytes[at + 3]! * 16777216;
}

function validDims(width: number | null, height: number | null): ImageDimensions | null {
  if (
    width === null ||
    height === null ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 32768 ||
    height > 32768
  ) {
    return null;
  }
  return { width, height };
}

function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  // Signature (8) + IHDR length/type (8); width/height BE u32 at 16/20.
  if (bytes.length < 24) return null;
  return validDims(readU32BE(bytes, 16), readU32BE(bytes, 20));
}

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  // Walk segments from SOI; SOF0/1/2/3/5/6/7/9-15 carry dims (BE u16 at +7/+5
  // past the marker).
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1]!;
    if (marker === 0xd8 || marker === 0xd9) {
      at += 2;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    const len = readU16BE(bytes, at + 2);
    if (len === null || len < 2 || at + 2 + len > bytes.length) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc);
    if (isSof) {
      if (len < 7) return null;
      return validDims(readU16BE(bytes, at + 7), readU16BE(bytes, at + 5));
    }
    at += 2 + len;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  // "RIFF" size "WEBP" then a chunk id at 12; chunk payload starts at 20.
  if (bytes.length < 21) return null;
  const fourcc = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);
  if (fourcc === "VP8X") {
    // 24-bit LE canvas size minus one at 24/27.
    const w = readU32LE(bytes, 24);
    const h = readU32LE(bytes, 27);
    if (w === null || h === null) return null;
    return validDims((w & 0xffffff) + 1, (h & 0xffffff) + 1);
  }
  if (fourcc === "VP8L") {
    // Signature byte at 20, then packed 14-bit (size-1) fields at 21.
    const packed = readU32LE(bytes, 21);
    if (packed === null) return null;
    return validDims((packed & 0x3fff) + 1, ((packed >> 14) & 0x3fff) + 1);
  }
  if (fourcc === "VP8 ") {
    // Frame tag (3) + start code 9D 01 2A (3) at 20..25, then LE w/h at 26/28.
    if (bytes.length < 30) return null;
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    const w = readU16LE(bytes, 26);
    const h = readU16LE(bytes, 28);
    if (w === null || h === null) return null;
    return validDims(w & 0x3fff, h & 0x3fff);
  }
  return null;
}

function imageDimensions(bytes: Uint8Array, kind: ImageKind): ImageDimensions | null {
  try {
    if (kind === "png") return pngDimensions(bytes);
    if (kind === "jpeg") return jpegDimensions(bytes);
    return webpDimensions(bytes);
  } catch {
    return null;
  }
}

type FeedbackAnnotation = {
  tool: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  comment?: string;
};

function isPct(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

// Validate an annotations array (<=20, each tool enum + percent numbers +
// comment <=280). Returns an error message or null.
function validateAnnotations(parsed: unknown): string | null {
  if (!Array.isArray(parsed) || parsed.length > MAX_ANNOTATIONS) {
    return "Invalid annotations (array, <=20).";
  }
  for (const item of parsed) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return "Invalid annotation (object with tool + x/y percents).";
    }
    const rec = item as Record<string, unknown>;
    if (typeof rec["tool"] !== "string" || !ANNOTATION_TOOLS.has(rec["tool"].trim().toLowerCase())) {
      return "Invalid annotation.tool (arrow|rect|circle|line|text|highlight|blur).";
    }
    if (!isPct(rec["x"]) || !isPct(rec["y"])) {
      return "Invalid annotation position (x/y numbers 0..100).";
    }
    for (const key of ["w", "h"] as const) {
      if (rec[key] !== undefined && rec[key] !== null && !isPct(rec[key])) {
        return `Invalid annotation.${key} (number 0..100).`;
      }
    }
    if (rec["comment"] !== undefined && rec["comment"] !== null) {
      if (typeof rec["comment"] !== "string" || rec["comment"].trim().length > MAX_ANNOTATION_COMMENT_CHARS) {
        return "Invalid annotation.comment (<=280 chars).";
      }
    }
  }
  return null;
}

// Normalize validated annotations to the stored shape (lowercased tool,
// trimmed comment, w/h/comment omitted when absent/empty).
function normalizeAnnotations(parsed: unknown): FeedbackAnnotation[] {
  return (parsed as Record<string, unknown>[]).map((item) => {
    const ann: FeedbackAnnotation = {
      tool: String(item["tool"]).trim().toLowerCase(),
      x: item["x"] as number,
      y: item["y"] as number,
    };
    if (isPct(item["w"])) ann.w = item["w"];
    if (isPct(item["h"])) ann.h = item["h"];
    if (typeof item["comment"] === "string" && item["comment"].trim()) {
      ann.comment = item["comment"].trim().slice(0, MAX_ANNOTATION_COMMENT_CHARS);
    }
    return ann;
  });
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

  // Identity model (plan §2): visibility tracked|anonymous|guest + contact
  // + source. reporter_type human|bot stays orthogonal (who wrote it vs how
  // they identify). Never trust a client-sent user_id/userId — tracked
  // resolves user_id server-side from the Supabase session cookie (401 when
  // the session is missing/expired); anonymous/guest always store NULL.
  //
  // Default when visibility is absent: guest (DS-FBOV-06 — humans and bots
  // alike land as guests unless they explicitly opt into tracked; a
  // signed-in caller that wants linkage sends visibility:"tracked").
  const visibilityRaw = str("visibility");
  const visibility = visibilityRaw !== null ? visibilityRaw.toLowerCase() : "guest";
  if (!VISIBILITIES.has(visibility)) {
    return fail("Invalid visibility (tracked|anonymous|guest).", 400);
  }
  // Resolve the session server-side (never trust a client-supplied user id —
  // no such field is even read). Tracked requires a live session; anonymous
  // and guest store user_id NULL.
  let sessionUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    sessionUserId = data?.user?.id ?? null;
  } catch {
    sessionUserId = null;
  }
  if (visibility === "tracked" && !sessionUserId) {
    return fail("Authentication required.", 401);
  }
  const userId = visibility === "tracked" ? sessionUserId : null;

  const sourceRaw = str("source");
  const source = (sourceRaw ?? "dialog").toLowerCase();
  if (!SOURCES.has(source)) {
    return fail("Invalid source (dialog|page|bot-api).", 400);
  }

  // Contact is guest follow-up only: validated when sent, stored only for
  // guest (stripped to NULL for tracked/anonymous — tracked links the
  // account via user_id instead). Contact is admin-only, never public.
  const contactNameRaw = str("contact_name") ?? str("contactName");
  let contactName: string | null = null;
  if (contactNameRaw !== null) {
    const trimmed = contactNameRaw.trim().slice(0, MAX_CONTACT_NAME_CHARS + 1);
    if (trimmed.length < 1 || trimmed.length > MAX_CONTACT_NAME_CHARS) {
      return fail("Invalid contact_name (1..100 chars).", 400);
    }
    contactName = visibility === "guest" ? trimmed : null;
  }
  const contactEmailRaw = str("contact_email") ?? str("contactEmail");
  let contactEmail: string | null = null;
  if (contactEmailRaw !== null) {
    const normalized = isEmail(contactEmailRaw) || (EMAIL_RE.test(contactEmailRaw.trim()) ? contactEmailRaw.trim().toLowerCase().slice(0, MAX_CONTACT_EMAIL_CHARS) : "");
    if (!normalized) {
      return fail("Invalid contact_email (valid email, 3..254 chars).", 400);
    }
    contactEmail = visibility === "guest" ? normalized : null;
  }

  // Guest buckets (on top of the 30/min base bucket above): guests are
  // unauthenticated and cheapest to abuse. 10/min fast-reject per IP plus a
  // stricter 5/hour/IP backstop. The hourly bucket uses hashed IP only —
  // the memory key carries a sha256 digest (never the raw IP) and the
  // shared bucket uses the salted ipBucketKey helper. Tracked/anonymous
  // callers are checked against the base bucket only.
  if (visibility === "guest") {
    const guestThrottle = rateLimit(`feedback:guest:${clientIp(req)}`, GUEST_LIMIT, 60_000);
    if (!guestThrottle.allowed) return fail("Rate limited.", 429, rateLimitHeaders(guestThrottle));
    const ip = clientIp(req);
    const hashedIp = createHash("sha256").update(ip).digest("hex").slice(0, 32);
    const guestHour = rateLimit(`feedback-guest:${hashedIp}`, 5, 3_600_000);
    if (!guestHour.allowed) {
      return fail("Guest feedback limit reached. Sign in to keep reporting.", 429, rateLimitHeaders(guestHour));
    }
    const guestShared = await globalBucket(ipBucketKey(req, "feedback-guest"), 5, 3600);
    if (guestShared && !guestShared.allowed) {
      return fail("Guest feedback limit reached. Sign in to keep reporting.", 429, throttleHeaders(guestShared.retryAfter));
    }
  }

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

  // Annotations: raw array OR JSON-stringified array string, either
  // encoding (multipart values are always strings; JSON callers may send
  // either). Normalized entries persist to the annotations jsonb column.
  let annotations: FeedbackAnnotation[] = [];
  const annotationsRaw: unknown = raw("annotations");
  if (annotationsRaw !== null && annotationsRaw !== undefined && annotationsRaw !== "") {
    let parsed: unknown = annotationsRaw;
    if (typeof annotationsRaw === "string") {
      try {
        parsed = JSON.parse(annotationsRaw);
      } catch {
        return fail("Invalid annotations JSON.", 400);
      }
    }
    const annErr = validateAnnotations(parsed);
    if (annErr) return fail(annErr, 400);
    annotations = normalizeAnnotations(parsed);
  }

  // URL the reporter was on at submit (preferred) + at start (fallback).
  const startedUrl = cleanUrl(str("startedUrl"));
  const pageUrl = cleanUrl(str("pageUrl")) ?? startedUrl;

  let screenshotBuf: Buffer | null = null;
  let screenshotKind: ImageKind | null = null;
  let screenshotDims: ImageDimensions | null = null;
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
    const kind = detectImageKind(new Uint8Array(buf));
    if (!kind) {
      return fail("Invalid screenshot (JPEG/PNG/WebP only).", 400);
    }
    // Polyglot guard: magic bytes alone don't prove "just an image" — scan
    // head+tail for active markup that would be dangerous if ever served
    // inline from a trusted origin.
    const head = buf.subarray(0, Math.min(buf.length, 2048)).toString("latin1").toLowerCase();
    const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString("latin1").toLowerCase();
    if (/<html|<\s*script|<\s*iframe|<\s*object|<\s*embed|<\s*svg|<\?php|javascript\s*:|on\w+\s*=/.test(`${head}\n${tail}`)) {
      return fail("Screenshot contains embedded active content.", 400);
    }
    screenshotBuf = buf;
    screenshotKind = kind;
    screenshotDims = imageDimensions(new Uint8Array(buf), kind);
  }

  let svc;
  try {
    svc = serviceClient();
  } catch {
    return fail(STORE_MISSING, 503);
  }

  let screenshotPath: string | null = null;
  if (screenshotBuf && screenshotKind) {
    const meta = SCREENSHOT_META[screenshotKind];
    screenshotPath = `feedback/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${meta.ext}`;
    const { error: upErr } = await svc.storage
      .from(BUCKET)
      .upload(screenshotPath, screenshotBuf, { contentType: meta.contentType, upsert: false });
    if (upErr) {
      const msg = String((upErr as { message?: unknown }).message ?? upErr);
      if (isMissingBucket(msg)) return fail(STORE_MISSING, 503);
      console.error("[api] feedback screenshot upload error", { message: msg.slice(0, 200) });
      return fail("Unable to store screenshot.", 500);
    }
  }

  // Column authority is supabase/migrations/20261120000000_feedback.sql
  // plus 20261212000000_feedback_identity.sql (identity model) and the
  // DS-FBOV-06 annotations columns:
  // text_body (not text), no screenshot_bytes/mime/sha256 columns, and
  // labels/bot_extras/annotations are NOT NULL jsonb (send [] / {} / []
  // rather than null).
  // Identity columns: user_id (uuid, NULL for anonymous/guest), visibility,
  // contact_name, contact_email, source. reporter_type stays orthogonal.
  const { data: row, error: rowErr } = await svc
    .from("feedback_reports")
    .insert({
      reporter_type: reporterType,
      rating,
      critique,
      text_body: text,
      labels,
      bot_extras: botExtras,
      annotations,
      page_url: pageUrl,
      user_agent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
      screenshot_path: screenshotPath,
      screenshot_mime: screenshotKind ? SCREENSHOT_META[screenshotKind].contentType : null,
      screenshot_width: screenshotDims?.width ?? null,
      screenshot_height: screenshotDims?.height ?? null,
      user_id: userId,
      visibility,
      contact_name: contactName,
      contact_email: contactEmail,
      source,
    })
    .select("id")
    .maybeSingle();
  if (rowErr) {
    if (isMissingTable(rowErr as { code?: unknown; message?: unknown })) {
      return fail(STORE_MISSING, 503);
    }
    // Identity/source/annotations migrations not applied yet (unknown
    // user_id/visibility/contact/source/annotations column) — fail open
    // with the store-missing contract, never fake success.
    if (isMissingColumn(rowErr as { code?: unknown; message?: unknown })) {
      return fail(STORE_MISSING, 503);
    }
    return dbFail("api/feedback", rowErr, "Unable to save feedback.", 500);
  }
  const id = (row as { id?: unknown } | null)?.id ?? null;
  if (id === null || id === undefined) {
    // Insert reported success but returned no row — never fake success.
    return fail("Unable to save feedback.", 500);
  }

  // AI enrichment stub (FBOV-09): fire-and-forget, never blocks submit.
  // Best-effort stub write of the AI-only columns + one log row. Any failure
  // — including the AI columns / log table being absent when the AI
  // migration hasn't landed yet — is swallowed: the submit above already won.
  void (async () => {
    try {
      const ai = stubEnrichFeedback({ text, rating });
      const { error: aiUpdateError } = await svc
        .from("feedback_reports")
        .update({ ...ai, ai_processed_at: new Date().toISOString() })
        .eq("id", String(id));
      if (aiUpdateError) return;
      // Both id columns: report_id is the shipped NOT NULL key, feedback_id
      // is the FBOV-09 contract key (converged by the AI-contract migration).
      // raw/output likewise carry the same payload for both readers.
      await svc.from("feedback_ai_logs").insert({
        report_id: String(id),
        feedback_id: String(id),
        model: ENRICH_MODEL_STUB,
        prompt_version: ENRICH_PROMPT_VERSION,
        raw: { ...ai },
        output: { ...ai },
        cost: null,
      });
    } catch {
      /* enrichment is best-effort — never blocks submit */
    }
  })();

  return ok(
    {
      id,
      reporterType,
      rating,
      critique,
      visibility,
      source,
      screenshotPath,
    },
    201,
  );
}

export function GET() {
  return fail("Method not allowed.", 405);
}
