import { createHash, randomUUID } from "node:crypto";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { clientIp } from "@/lib/validate";

// POST /api/feedback — accepts humans + bots (no login, no same-origin
// check so non-browser bot callers can submit).
//
// Accepts multipart/form-data (screenshot uploads) or application/json
// (top-bar button + programmatic bot callers without a screenshot).
//
// Fields (both encodings):
//   reporterType: "human" | "bot" (required)
//   rating: "good" | "okay" | "bad" (required)
//   critique: "positive" | "negative" (required)
//   text: 1..4000 chars (required)
//   pageUrl: optional URL at submit moment (falls back to startedUrl)
//   startedUrl: optional URL at the moment feedback was started
//   labels: optional JSON array of strings (<=20, each 1..64 chars)
//   botExtras: optional JSON object (serialized <=8000 chars)
//   screenshot: optional JPG file, multipart only (magic bytes FF D8 FF, <=8MB)
//
// Storage: row in `feedback_reports` + object in the `feedback-screenshots`
// bucket, both provisioned by DS-FEEDBACK-07
// (v2/vcw4w/supabase/migrations/20261120000000_feedback.sql).
// Expected table shape (migration lane: please match or rule otherwise):
//   feedback_reports(id uuid pk default gen_random_uuid(),
//     reporter_type text check in ('human','bot'),
//     rating text check in ('good','okay','bad'),
//     critique text check in ('positive','negative'),
//     text text check (char_length 1..4000),
//     labels jsonb default '[]', bot_extras jsonb null,
//     screenshot_path text null, screenshot_bytes int null,
//     screenshot_mime text null, screenshot_sha256 text null,
//     created_at timestamptz default now()).
// When the table/bucket (or service-role config) is missing this route
// fail-opens with 503 "feedback store not set up" — never a faked success.

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

  const reporterType = str("reporterType");
  if (!reporterType || !REPORTER_TYPES.has(reporterType)) {
    return fail("Invalid reporterType (human|bot).", 400);
  }
  const rating = str("rating");
  if (!rating || !RATINGS.has(rating)) {
    return fail("Invalid rating (good|okay|bad).", 400);
  }
  const critique = str("critique");
  if (!critique || !CRITIQUES.has(critique)) {
    return fail("Invalid critique (positive|negative).", 400);
  }
  const rawText: unknown = json ? json["text"] : (form as FormData).get("text");
  const text = typeof rawText === "string" ? rawText.trim() : "";
  if (text.length < 1 || text.length > MAX_TEXT_CHARS) {
    return fail("Invalid text (1..4000 chars).", 400);
  }

  let labels: string[] = [];
  const labelsRaw = str("labels");
  if (labelsRaw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(labelsRaw);
    } catch {
      return fail("Invalid labels JSON.", 400);
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

  let botExtras: Record<string, unknown> | null = null;
  const botExtrasRaw = str("botExtras");
  if (botExtrasRaw) {
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
  let screenshotSha256: string | null = null;
  if (screenshotBuf) {
    screenshotSha256 = createHash("sha256").update(screenshotBuf).digest("hex");
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

  const { data: row, error: rowErr } = await svc
    .from("feedback_reports")
    .insert({
      reporter_type: reporterType,
      rating,
      critique,
      text,
      labels,
      bot_extras: botExtras,
      page_url: pageUrl,
      user_agent: req.headers.get("user-agent")?.slice(0, 512) ?? null,
      screenshot_path: screenshotPath,
      screenshot_bytes: screenshotBuf ? screenshotBuf.length : null,
      screenshot_mime: screenshotBuf ? "image/jpeg" : null,
      screenshot_sha256: screenshotSha256,
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
