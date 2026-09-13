/**
 * Pexels royalty-free stock (images + video) - proxied through the server.
 *
 * Pexels photos and videos are free to use (royalty-free license) but the
 * license REQUIRES attribution: credit the photographer/videographer and
 * link back to Pexels. Every normalized item below carries `credit` +
 * `creditUrl` + `sourceUrl` so the UI can never render stock without it.
 *
 * Unlike fal.ai / Meshy / Outscraper there is NO coin metering here: the
 * provider is free, so searches cost 0 coins. The server key is still
 * protected: the API routes require sign-in + rate limits, the key never
 * leaves the server, and without PEXELS_API_KEY every route returns an
 * honest configured:false instead of faked results.
 *
 * Env (server-only, never NEXT_PUBLIC_):
 *   PEXELS_API_KEY - from https://www.pexels.com/api/ (Authorization header).
 *   PEXELS_API_BASE overrides the API base (default https://api.pexels.com,
 *   allowlisted to that origin only).
 *
 * Docs: https://www.pexels.com/api/documentation/
 * (images: GET /v1/search, /v1/curated, /v1/photos/:id;
 *  videos: GET /videos/search, /videos/popular, /videos/videos/:id;
 *  auth: `Authorization: <key>` header; max 80 per_page).
 *
 * Client-safe: constants + cleaners render in the browser; key helpers read
 * server env only (browser gets "" -> unconfigured UI).
 */

export const PEXELS_API_BASE_DEFAULT = "https://api.pexels.com";

/** Pexels serves at most 80 results per page. */
export const PEXELS_MAX_PER_PAGE = 80;
export const PEXELS_DEFAULT_PER_PAGE = 12;

// ---------------------------------------------------------------------------
// Abuse armor. The Pexels free tier is ~200 requests/hour PER API KEY, and
// our key is shared by the whole site - one spray-happy user could drain it
// for everyone. So every route layers TWO buckets (see lib/abuse-limit.ts):
// a fast per-instance memory bucket (20/min) plus a shared Postgres bucket
// (200/day per account, survives serverless scale-out). Deny if EITHER
// denies; fail open to the memory verdict only when the shared store is
// unreachable (free reads, never money moves).
// ---------------------------------------------------------------------------

/** Scope for acctBucketKey()/globalBucket() on the pexels routes. */
export const PEXELS_ABUSE_SCOPE = "pexels";
/** Fast per-instance memory bucket: requests per minute per account. */
export const PEXELS_MINUTE_LIMIT = 20;
/** Shared cross-instance bucket: requests per account per 24h. */
export const PEXELS_DAILY_LIMIT = 200;
export const PEXELS_DAILY_WINDOW_SECS = 86_400;

export type PexelsKind = "image" | "video";

export function isPexelsKind(value: unknown): value is PexelsKind {
  return value === "image" || value === "video";
}

export type PexelsOrientation = "landscape" | "portrait" | "square";

export function isPexelsOrientation(value: unknown): value is PexelsOrientation {
  return value === "landscape" || value === "portrait" || value === "square";
}

export type PexelsSize = "small" | "medium" | "large";

export function isPexelsSize(value: unknown): value is PexelsSize {
  return value === "small" || value === "medium" || value === "large";
}

/** Normalized stock item: always carries attribution. */
export type PexelsItem = {
  kind: PexelsKind;
  id: number;
  /** Direct file URL (image src / video file link). */
  url: string;
  /** Preview/thumbnail URL for grid rendering. */
  previewUrl: string;
  width: number;
  height: number;
  alt: string;
  /** "Photo by X" / "Video by X" display string. */
  credit: string;
  /** Photographer/videographer profile URL. */
  creditUrl: string;
  /** Canonical Pexels page URL for the asset. */
  sourceUrl: string;
};

export const PEXELS_CREDIT_NOTE =
  "Free royalty-free stock via Pexels; attribution required (photographer credit + link back to Pexels). Searches cost 0 coins.";

/** Search query: 2-100 chars of honest text with at least 2 letters/digits. */
export function cleanPexelsQuery(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
}

export function isValidPexelsQuery(q: string): boolean {
  if (q.length < 2 || q.length > 100) return false;
  // Punctuation-only "queries" (((!!!))) burn key quota for junk results.
  const alnum = q.match(/[a-z0-9]/gi) ?? [];
  return alnum.length >= 2;
}

export function cleanPexelsPage(value: unknown): number {
  const n = Math.floor(Number(value ?? 1));
  if (!Number.isFinite(n)) return 1;
  return Math.min(100, Math.max(1, n));
}

export function cleanPexelsPerPage(value: unknown): number {
  const n = Math.floor(Number(value ?? PEXELS_DEFAULT_PER_PAGE));
  if (!Number.isFinite(n)) return PEXELS_DEFAULT_PER_PAGE;
  return Math.min(PEXELS_MAX_PER_PAGE, Math.max(1, n));
}

/** Pexels color filter: named color or hex (e.g. "red", "#ff0000"). */
export function cleanPexelsColor(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^[a-z-]{3,20}$/.test(v)) return v;
  return "";
}

export function cleanPexelsLocale(value: unknown): string {
  const v = String(value ?? "").trim();
  return /^[a-z]{2}-[A-Z]{2}$/.test(v) ? v : "";
}

// ---------------------------------------------------------------------------
// Server key helpers. SERVER-ONLY in effect: the browser never sets these,
// so pexelsConfigured() is false there and the GUI renders the honest
// not-configured state instead of faking stock results.
// ---------------------------------------------------------------------------

export function pexelsKey(): string {
  const raw =
    typeof process !== "undefined" ? String(process.env.PEXELS_API_KEY ?? "").trim() : "";
  return raw;
}

export function pexelsApiBase(): string {
  if (typeof process === "undefined") return PEXELS_API_BASE_DEFAULT;
  const raw = String(process.env.PEXELS_API_BASE ?? "").trim().replace(/\/+$/, "");
  if (!raw) return PEXELS_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return PEXELS_API_BASE_DEFAULT;
    if (u.origin !== "https://api.pexels.com") return PEXELS_API_BASE_DEFAULT;
    return raw;
  } catch {
    return PEXELS_API_BASE_DEFAULT;
  }
}

export function pexelsConfigured(): boolean {
  return pexelsKey().length > 0;
}

// ---------------------------------------------------------------------------
// Upstream paths + response normalization (server-side; never synthesize).
// ---------------------------------------------------------------------------

export type PexelsSearchParams = {
  kind: PexelsKind;
  query: string;
  page: number;
  perPage: number;
  orientation?: PexelsOrientation;
  size?: PexelsSize;
  color?: string;
  locale?: string;
};

/** Upstream path + query string for a stock search (no key attached). */
export function pexelsSearchPath(p: PexelsSearchParams): string {
  const q = new URLSearchParams();
  q.set("query", p.query);
  q.set("page", String(p.page));
  q.set("per_page", String(p.perPage));
  if (p.orientation) q.set("orientation", p.orientation);
  if (p.size) q.set("size", p.size);
  if (p.color) q.set("color", p.color);
  if (p.locale) q.set("locale", p.locale);
  const base = p.kind === "video" ? "/videos/search" : "/v1/search";
  return `${base}?${q.toString()}`;
}

/** Upstream path for curated photos / popular videos (no query needed). */
export function pexelsCuratedPath(kind: PexelsKind, page: number, perPage: number): string {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("per_page", String(perPage));
  const base = kind === "video" ? "/videos/popular" : "/v1/curated";
  return `${base}?${q.toString()}`;
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown, max = 300): string {
  // Upstream text lands in our DOM: bound it + let React escape it.
  return typeof v === "string" ? v.slice(0, max) : "";
}

function httpsUrl(v: unknown): string {
  const s = str(v, 2048);
  return s.startsWith("https://") ? s : "";
}

/** Normalize one upstream photo into a PexelsItem (attribution preserved). */
export function normalizePexelsPhoto(photo: Record<string, unknown>): PexelsItem | null {
  const id = num(photo.id);
  if (!id) return null;
  const src = (photo.src ?? {}) as Record<string, unknown>;
  const url = httpsUrl(src.original) || httpsUrl(src.large2x) || httpsUrl(src.large);
  if (!url) return null;
  const photographer = str(photo.photographer, 120) || "Unknown photographer";
  const photographerUrl = httpsUrl(photo.photographer_url) || "https://www.pexels.com/";
  const pexelsUrl = httpsUrl(photo.url) || `https://www.pexels.com/photo/${id}/`;
  const preview = httpsUrl(src.medium) || httpsUrl(src.small) || url;
  return {
    kind: "image",
    id,
    url,
    previewUrl: preview,
    width: num(photo.width),
    height: num(photo.height),
    alt: str(photo.alt, 200) || `Pexels photo ${id}`,
    credit: `Photo by ${photographer}`,
    creditUrl: photographerUrl,
    sourceUrl: pexelsUrl,
  };
}

/**
 * Normalize one upstream video into a PexelsItem. Picks the widest
 * video_file with an https link as the playable URL (no transcoding here,
 * just the provider's own file).
 */
export function normalizePexelsVideo(video: Record<string, unknown>): PexelsItem | null {
  const id = num(video.id);
  if (!id) return null;
  const files = Array.isArray(video.video_files) ? (video.video_files as Record<string, unknown>[]) : [];
  let best: Record<string, unknown> | null = null;
  for (const f of files) {
    const link = httpsUrl(f.link);
    if (!link) continue;
    if (!best || num(f.width) > num(best.width)) best = { ...f, link };
  }
  if (!best) return null;
  const user = (video.user ?? {}) as Record<string, unknown>;
  const creator = str(user.name, 120) || "Unknown videographer";
  const creatorUrl = httpsUrl(user.url) || "https://www.pexels.com/";
  const pexelsUrl = httpsUrl(video.url) || `https://www.pexels.com/video/${id}/`;
  const pictures = (video.video_pictures ?? []) as Record<string, unknown>[];
  const picturePreview = pictures.length ? httpsUrl(pictures[0].picture) : "";
  const imagePreview = httpsUrl(video.image);
  return {
    kind: "video",
    id,
    url: str(best.link, 2048),
    previewUrl: picturePreview || imagePreview,
    width: num(video.width),
    height: num(video.height),
    alt: `Pexels video ${id}`,
    credit: `Video by ${creator}`,
    creditUrl: creatorUrl,
    sourceUrl: pexelsUrl,
  };
}

/** Normalize an upstream search/curated payload into items + paging. */
export function normalizePexelsPayload(
  kind: PexelsKind,
  payload: Record<string, unknown>,
): { items: PexelsItem[]; total: number } {
  const total = num(payload.total_results ?? payload.total);
  if (kind === "video") {
    const list = Array.isArray(payload.videos) ? payload.videos : [];
    const items: PexelsItem[] = [];
    for (const v of list) {
      const item = normalizePexelsVideo((v ?? {}) as Record<string, unknown>);
      if (item) items.push(item);
    }
    return { items, total };
  }
  const list = Array.isArray(payload.photos) ? payload.photos : [];
  const items: PexelsItem[] = [];
  for (const p of list) {
    const item = normalizePexelsPhoto((p ?? {}) as Record<string, unknown>);
    if (item) items.push(item);
  }
  return { items, total };
}

// ---------------------------------------------------------------------------
// Fun layer (client-safe, deterministic data + one dice helper). One-click
// vibe presets so game devs go from "I need a dungeon backdrop" to stock in
// a single tap; the 🎲 die just picks a preset + a random page.
// ---------------------------------------------------------------------------

export type PexelsPreset = {
  emoji: string;
  label: string;
  query: string;
  kind: PexelsKind;
  blurb: string;
};

export const PEXELS_PRESETS: PexelsPreset[] = [
  { emoji: "🏰", label: "Dungeon Backdrop", query: "dark dungeon castle", kind: "image", blurb: "Loading screens + level parallax." },
  { emoji: "🌆", label: "Neon City", query: "neon city night", kind: "image", blurb: "Cyberpunk menus + clan banners." },
  { emoji: "🐉", label: "Boss Arena", query: "epic dragon fantasy", kind: "image", blurb: "Boss-fight splash art." },
  { emoji: "🌲", label: "Cozy Village", query: "cozy village landscape", kind: "image", blurb: "Quest hubs + dialogue backdrops." },
  { emoji: "🚀", label: "Space Battle", query: "galaxy spaceship stars", kind: "image", blurb: "Sci-fi skies + hangar walls." },
  { emoji: "⚔️", label: "Combat Stills", query: "warrior battle sword", kind: "image", blurb: "Ability icons + promo cards." },
  { emoji: "🎬", label: "Trailer B-Roll", query: "epic cinematic landscape", kind: "video", blurb: "Game-trailer filler that slaps." },
  { emoji: "👾", label: "Crowd Hype", query: "crowd cheering concert", kind: "video", blurb: "Tournament + launch-party loops." },
  { emoji: "🌊", label: "Chill Menu Loop", query: "ocean waves calm aerial", kind: "video", blurb: "Ambient menu backgrounds." },
  { emoji: "🔥", label: "Action Sizzle", query: "fire explosion slow motion", kind: "video", blurb: "Kill-cam + victory stingers." },
];

/** Pexels color filter values (subset with swatch hexes for the UI). */
export const PEXELS_COLORS: { name: string; hex: string }[] = [
  { name: "red", hex: "#e11d48" },
  { name: "orange", hex: "#f97316" },
  { name: "yellow", hex: "#eab308" },
  { name: "green", hex: "#22c55e" },
  { name: "turquoise", hex: "#14b8a6" },
  { name: "blue", hex: "#3b82f6" },
  { name: "violet", hex: "#8b5cf6" },
  { name: "pink", hex: "#ec4899" },
  { name: "brown", hex: "#92400e" },
  { name: "gray", hex: "#6b7280" },
  { name: "black", hex: "#111827" },
  { name: "white", hex: "#f8fafc" },
];

/** Dice roll: random preset + random page (1-5). Nondeterministic by design. */
export function rollPexelsDice(): { preset: PexelsPreset; page: number } {
  const preset = PEXELS_PRESETS[Math.floor(Math.random() * PEXELS_PRESETS.length)] ?? PEXELS_PRESETS[0];
  return { preset, page: 1 + Math.floor(Math.random() * 5) };
}

/**
 * Paste-ready credit line for a game's credits page / thumbnail description.
 * Plain-text variant for descriptions, HTML variant for web credits pages.
 */
export function pexelsCreditLine(item: Pick<PexelsItem, "credit" | "sourceUrl">): string {
  return `${item.credit} (${item.sourceUrl})`;
}

export function pexelsCreditHtml(item: Pick<PexelsItem, "credit" | "creditUrl" | "sourceUrl">): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<a href="${esc(item.creditUrl)}">${esc(item.credit)}</a> via <a href="${esc(item.sourceUrl)}">Pexels</a>`;
}
