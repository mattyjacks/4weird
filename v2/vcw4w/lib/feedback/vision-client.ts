/**
 * Feedback vision client (DS-FEEDBACK-05, web lane).
 *
 * Client-safe, dependency-free helpers for the feedback run goal:
 * vision recognition baked into feedback + smart text references
 * preserved alongside the JPG + auto-submit to the database.
 *
 * - `detectVisionHints()` is a DOM-only stub: it extracts visible label
 *   texts / aria context near the feedback trigger as "smart refs".
 *   A future vision model can merge its own detections into the same
 *   `VisionHint[]` shape — no call-site change needed.
 * - `buildFeedbackPayload()` assembles the canonical payload, embedding
 *   the smart refs into the JPG sidecar metadata (`jpgMeta`) so the
 *   text survives even if the JPG is viewed standalone.
 * - `autoSubmitFeedback()` POSTs the payload to `/api/feedback` as
 *   `FormData` (text fields + `screenshot.jpg` blob when present).
 *
 * SSR-safe: every DOM/touch point is guarded; server-side calls get
 * empty hints and a fetch that resolves `ok: false` instead of throwing.
 *
 * No secrets, no server code, no old-v1 paths.
 */

export type ReporterType = "guest" | "user" | "agent" | "moderator";

export type VisionHintKind = "label" | "heading" | "aria" | "context";

export type VisionHint = {
  kind: VisionHintKind;
  text: string;
  selector?: string;
};

export type FeedbackPayloadInput = {
  reporterType: ReporterType;
  rating: number;
  critique?: string;
  text?: string;
  labels?: string[];
  visionHints?: VisionHint[];
  /** Screenshot JPG bytes; sent as `screenshot.jpg` in the FormData. */
  jpgBlob?: Blob | null;
  /** URL the reporter was on when feedback started (captured at dialog open). */
  startedUrl?: string;
  /** URL the reporter was on at submit; defaults to window.location.href. */
  pageUrl?: string;
  /** DOM scope for auto-detect when `visionHints` is omitted. */
  root?: Element | Document | null;
};

export type JpgSmartRefMeta = {
  capturedAt: string;
  hasImage: boolean;
  byteSize: number | null;
  mimeType: string | null;
  /** Smart text refs preserved alongside the JPG bytes. */
  smartRefs: VisionHint[];
};

export type FeedbackPayload = {
  reporterType: ReporterType;
  rating: number;
  critique: string;
  text: string;
  labels: string[];
  visionHints: VisionHint[];
  jpgBlob: Blob | null;
  jpgMeta: JpgSmartRefMeta;
  /** URL at submit moment (falls back to startedUrl / current href). */
  pageUrl: string;
  /** URL at the moment feedback was started. */
  startedUrl: string;
};

export const FEEDBACK_ENDPOINT = "/api/feedback";
export const FEEDBACK_MAX_HINTS = 12;
export const FEEDBACK_MAX_TEXT_CHARS = 64;

function cleanText(value: unknown, cap = FEEDBACK_MAX_TEXT_CHARS): string {
  const s = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.slice(0, Math.max(1, cap));
}

function dedupeHints(hints: VisionHint[]): VisionHint[] {
  const seen = new Set<string>();
  const out: VisionHint[] = [];
  for (const h of hints) {
    const text = cleanText(h.text);
    if (!text) continue;
    const key = `${h.kind}:${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h.selector ? { kind: h.kind, text, selector: h.selector } : { kind: h.kind, text });
    if (out.length >= FEEDBACK_MAX_HINTS) break;
  }
  return out;
}

function selectorFor(el: Element): string | undefined {
  try {
    if (el.id) return `#${el.id}`;
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).filter(Boolean)[0] : "";
    const tag = el.tagName.toLowerCase();
    return cls ? `${tag}.${cls}` : tag;
  } catch {
    return undefined;
  }
}

/**
 * Client stub: harvest visible label texts + DOM context as smart refs.
 * SSR / no-DOM => []. Never throws; always bounded (12 refs, 64 chars).
 */
export function detectVisionHints(
  root?: Element | Document | null,
  max = FEEDBACK_MAX_HINTS,
): VisionHint[] {
  try {
    const scope: Element | Document | null | undefined =
      root ?? (typeof document !== "undefined" ? document : null);
    if (!scope || typeof scope.querySelectorAll !== "function") return [];
    const limit = Math.max(1, Math.min(FEEDBACK_MAX_HINTS, Math.floor(max) || FEEDBACK_MAX_HINTS));
    const found: VisionHint[] = [];
    const push = (kind: VisionHintKind, text: unknown, el?: Element | null) => {
      const t = cleanText(text);
      if (!t || found.length >= limit) return;
      found.push(
        el ? { kind, text: t, selector: selectorFor(el) } : { kind, text: t },
      );
    };
    // <label> texts first — highest signal for "what is this field".
    const labels = scope.querySelectorAll("label");
    for (const el of Array.from(labels).slice(0, limit)) {
      push("label", el.textContent, el);
    }
    // Headings give page/section context for the screenshot.
    if (found.length < limit) {
      const heads = scope.querySelectorAll("h1, h2, [data-feedback-context]");
      for (const el of Array.from(heads).slice(0, limit - found.length)) {
        push(/^H/i.test(el.tagName) ? "heading" : "context", el.textContent, el);
      }
    }
    // aria-labels / alt text catch icon-only controls the JPG shows but
    // innerText misses.
    if (found.length < limit) {
      const aria = scope.querySelectorAll("[aria-label], img[alt]");
      for (const el of Array.from(aria).slice(0, (limit - found.length) * 2)) {
        push(
          "aria",
          el.getAttribute("aria-label") ?? el.getAttribute("alt"),
          el,
        );
        if (found.length >= limit) break;
      }
    }
    return dedupeHints(found).slice(0, limit);
  } catch {
    return [];
  }
}

function currentHref(): string {
  try {
    if (typeof window !== "undefined" && window.location?.href) {
      return window.location.href.slice(0, 2048);
    }
  } catch {
    /* SSR / blocked access */
  }
  return "";
}

function cleanUrl(value: unknown): string {
  const s = String(value ?? "").trim().slice(0, 2048);
  if (!s) return "";
  // Only retain http(s) URLs or site-relative paths — never javascript:/data:.
  if (/^https?:\/\//i.test(s) || s.startsWith("/")) return s;
  return "";
}

function clampRating(rating: unknown): number {
  const n = Math.round(Number(rating));
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, n));
}

/**
 * Assemble the canonical feedback payload. Smart refs are embedded into
 * `jpgMeta.smartRefs` alongside the JPG blob metadata so the text refs
 * are preserved with the image through submit + storage.
 */
export function buildFeedbackPayload(input: FeedbackPayloadInput): FeedbackPayload {
  const visionHints =
    input.visionHints !== undefined
      ? dedupeHints(input.visionHints ?? [])
      : detectVisionHints(input.root ?? null);
  const jpgBlob = input.jpgBlob ?? null;
  const startedUrl = cleanUrl(input.startedUrl);
  const pageUrl = cleanUrl(input.pageUrl) || startedUrl || currentHref();
  const jpgMeta: JpgSmartRefMeta = {
    capturedAt: new Date().toISOString(),
    hasImage: jpgBlob !== null,
    byteSize: typeof jpgBlob?.size === "number" ? jpgBlob.size : null,
    mimeType: typeof jpgBlob?.type === "string" && jpgBlob.type ? jpgBlob.type : null,
    smartRefs: visionHints,
  };
  return {
    reporterType: input.reporterType,
    rating: clampRating(input.rating),
    critique: cleanText(input.critique ?? "", 2000),
    text: cleanText(input.text ?? "", 2000),
    labels: Array.from(
      new Set((input.labels ?? []).map((l) => cleanText(l, 48)).filter(Boolean)),
    ).slice(0, 16),
    visionHints,
    jpgBlob,
    jpgMeta,
    pageUrl,
    startedUrl,
  };
}

export type FeedbackSubmitResult =
  | { ok: true; status: number; id?: string }
  | { ok: false; status: number; error: string };

function payloadToFormData(payload: FeedbackPayload): FormData {
  const form = new FormData();
  form.set("reporterType", payload.reporterType);
  form.set("rating", String(payload.rating));
  form.set("critique", payload.critique);
  form.set("text", payload.text);
  form.set("labels", JSON.stringify(payload.labels));
  form.set("visionHints", JSON.stringify(payload.visionHints));
  form.set("jpgMeta", JSON.stringify(payload.jpgMeta));
  form.set("pageUrl", payload.pageUrl);
  form.set("startedUrl", payload.startedUrl);
  if (payload.jpgBlob) {
    form.set("screenshot", payload.jpgBlob, "screenshot.jpg");
  }
  return form;
}

/**
 * Auto-submit a feedback payload to `/api/feedback` via FormData POST.
 * Never throws — transport/server failures resolve `ok: false`.
 */
export async function autoSubmitFeedback(
  payload: FeedbackPayload,
  opts?: { endpoint?: string; signal?: AbortSignal },
): Promise<FeedbackSubmitResult> {
  const endpoint = opts?.endpoint ?? FEEDBACK_ENDPOINT;
  try {
    if (typeof fetch !== "function") {
      return { ok: false, status: 0, error: "fetch-unavailable" };
    }
    const res = await fetch(endpoint, {
      method: "POST",
      body: payloadToFormData(payload),
      signal: opts?.signal,
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `http-${res.status}` };
    }
    let id: string | undefined;
    try {
      const body = (await res.json()) as { id?: unknown };
      if (typeof body?.id === "string" && body.id) id = body.id;
    } catch {
      /* id is best-effort; a 2xx without JSON is still success */
    }
    return { ok: true, status: res.status, ...(id ? { id } : {}) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "submit-failed";
    return { ok: false, status: 0, error: cleanText(message, 120) || "submit-failed" };
  }
}
