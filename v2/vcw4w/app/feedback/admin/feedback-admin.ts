/**
 * Shared helpers for the admin feedback queue (/feedback/admin) and its
 * CSV export route (/api/feedback/admin/export). Pure functions only —
 * no Supabase imports, so both server components and route handlers can
 * share them without pulling client/server bindings across boundaries.
 *
 * Column authority is supabase/migrations/20261120000000_feedback.sql
 * (canonical `text_body`, `reporter_type`, `rating`, `critique`,
 * `screenshot_path`, `page_url`, `status`) plus
 * 20261212000000_feedback_admin.sql (`admin_note`, `feedback_events`).
 * Everything else (visibility, contact, annotations) is derived
 * defensively: a real column when a future migration adds one, otherwise
 * the matching key inside the `labels` / `bot_extras` jsonb payloads.
 */

export type FeedbackRow = Record<string, unknown>;

export interface FeedbackAnnotation {
  kind: "rect" | "point";
  /** Normalized 0..100 coordinates (SVG viewBox units). */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string | null;
}

export interface FeedbackFilters {
  rating: string;
  critique: string;
  visibility: string;
  source: string;
  hasScreenshot: string;
  hasAnnotations: string;
  q: string;
  from: string;
  to: string;
  status: string;
}

export const STATUSES = ["unaddressed", "addressing", "addressed"] as const;
export type FeedbackStatus = (typeof STATUSES)[number];

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return (
    typeof value === "string" &&
    (STATUSES as readonly string[]).includes(value)
  );
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function pick(row: FeedbackRow, keys: string[]): string | null {
  for (const key of keys) {
    const hit = str(row[key]);
    if (hit) return hit;
  }
  return null;
}

/** Parse a jsonb-ish field that may already be an object or a JSON string. */
export function objOf(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* not JSON — no payload */
    }
  }
  return {};
}

/** Canonical text: `text_body` first (post-repair), legacy keys as fallback. */
export function textOf(row: FeedbackRow): string | null {
  return pick(row, ["text_body", "text", "body", "message", "feedback"]);
}

export function thumbnailOf(row: FeedbackRow): string | null {
  const url = pick(row, [
    "thumbnail_url",
    "screenshot_url",
    "image_url",
    "screenshot",
    "thumbnail",
  ]);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

export function screenshotPathOf(row: FeedbackRow): string | null {
  return pick(row, ["screenshot_path"]);
}

export function hasScreenshot(row: FeedbackRow): boolean {
  return screenshotPathOf(row) !== null || thumbnailOf(row) !== null;
}

/** Visibility: real column when present, else labels/bot_extras payload key. */
export function visibilityOf(row: FeedbackRow): string | null {
  const direct = pick(row, ["visibility"]);
  if (direct) return direct;
  for (const key of ["labels", "bot_extras"]) {
    const hit = str(objOf(row[key])["visibility"]);
    if (hit) return hit;
  }
  return null;
}

/** Contact email: real column when present, else labels/bot_extras payload key. */
export function contactOf(row: FeedbackRow): string | null {
  const direct = pick(row, [
    "contact_email",
    "contact",
    "email",
    "reporter_email",
  ]);
  if (direct) return direct;
  for (const key of ["labels", "bot_extras"]) {
    const payload = objOf(row[key]);
    const hit = pick(payload, [
      "contact_email",
      "contactEmail",
      "contact",
      "email",
    ]);
    if (hit) return hit;
  }
  return null;
}

function num01(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return n * 100;
  if (n > 1 && n <= 100) return n;
  return null;
}

function annotationFrom(value: unknown): FeedbackAnnotation | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  const label = str(r["label"] ?? r["text"] ?? r["title"]);
  const x = num01(r["x"]);
  const y = num01(r["y"]);
  if (x === null || y === null) return null;
  const w = num01(r["w"] ?? r["width"]) ?? 0;
  const h = num01(r["h"] ?? r["height"]) ?? 0;
  if (w > 0 && h > 0) return { kind: "rect", x, y, w, h, label };
  return { kind: "point", x, y, w: 0, h: 0, label };
}

/**
 * Annotations: real column when present, else an `annotations` (or
 * `annotation_shapes` / `marks`) array inside labels/bot_extras. Each entry
 * carries normalized x/y (0..1 or 0..100) plus optional w/h + label;
 * rendered as an SVG overlay over the screenshot in the detail drawer.
 */
export function annotationsOf(row: FeedbackRow): FeedbackAnnotation[] {
  const found: unknown[] = [];
  for (const key of ["annotations", "annotation_shapes", "marks"]) {
    const direct = row[key];
    if (Array.isArray(direct)) found.push(...direct);
  }
  for (const key of ["labels", "bot_extras"]) {
    const payload = objOf(row[key]);
    for (const nested of ["annotations", "annotation_shapes", "marks"]) {
      const arr = payload[nested];
      if (Array.isArray(arr)) found.push(...arr);
    }
  }
  const out: FeedbackAnnotation[] = [];
  for (const entry of found.slice(0, 50)) {
    const parsed = annotationFrom(entry);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): FeedbackFilters {
  const one = (key: string): string => {
    const v = params[key];
    if (Array.isArray(v)) return v[0] ?? "";
    return v ?? "";
  };
  return {
    rating: one("rating").trim().toLowerCase(),
    critique: one("critique").trim().toLowerCase(),
    visibility: one("visibility").trim().toLowerCase(),
    source: one("source").trim().toLowerCase(),
    hasScreenshot: one("has-screenshot").trim().toLowerCase(),
    hasAnnotations: one("has-annotations").trim().toLowerCase(),
    q: one("q").trim().slice(0, 200),
    from: one("from").trim(),
    to: one("to").trim(),
    status: one("status").trim().toLowerCase() || "unaddressed",
  };
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

/** In-memory pass for derived filters (visibility, screenshot, annotations). */
export function matchesDerived(row: FeedbackRow, f: FeedbackFilters): boolean {
  if (f.visibility && f.visibility !== "all") {
    const v = (visibilityOf(row) ?? "unset").toLowerCase();
    if (v !== f.visibility) return false;
  }
  if (f.hasScreenshot === "yes" && !hasScreenshot(row)) return false;
  if (f.hasScreenshot === "no" && hasScreenshot(row)) return false;
  const ann = annotationsOf(row).length > 0;
  if (f.hasAnnotations === "yes" && !ann) return false;
  if (f.hasAnnotations === "no" && ann) return false;
  return true;
}

/** Encode active filters as a query string (CSV export link, bulk-action hidden fields). */
export function filtersToQuery(f: FeedbackFilters): string {
  const p = new URLSearchParams();
  if (f.rating) p.set("rating", f.rating);
  if (f.critique) p.set("critique", f.critique);
  if (f.visibility) p.set("visibility", f.visibility);
  if (f.source) p.set("source", f.source);
  if (f.hasScreenshot) p.set("has-screenshot", f.hasScreenshot);
  if (f.hasAnnotations) p.set("has-annotations", f.hasAnnotations);
  if (f.q) p.set("q", f.q);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.status) p.set("status", f.status);
  return p.toString();
}

function csvCell(value: string | null): string {
  if (value === null) return "";
  return `"${value.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: FeedbackRow[]): string {
  const header = [
    "id",
    "created_at",
    "status",
    "rating",
    "critique",
    "reporter_type",
    "text_body",
    "page_url",
    "screenshot_path",
    "visibility",
    "contact",
    "has_annotations",
    "admin_note",
  ];
  const lines = [header.map((h) => csvCell(h)).join(",")];
  for (const row of rows) {
    lines.push(
      [
        pick(row, ["id"]),
        pick(row, ["created_at"]),
        pick(row, ["status"]),
        pick(row, ["rating"]),
        pick(row, ["critique"]),
        pick(row, ["reporter_type"]),
        textOf(row),
        pick(row, ["page_url"]),
        screenshotPathOf(row),
        visibilityOf(row),
        contactOf(row),
        annotationsOf(row).length > 0 ? "yes" : "no",
        str(row["admin_note"]),
      ]
        .map((v) => csvCell(v))
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
