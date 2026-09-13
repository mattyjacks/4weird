/**
 * Shared content-mode infrastructure for the three gore/horror titles that
 * ship kid-safe variants: gravegain2d, gravegain3d, lastwordszombies.
 *
 * Three modes:
 * - kid: super-sanitized, no blood/gore, child-friendly words (min age 0).
 * - teen: full game, mild swears only, gore ON, no drugs/hard swears/dark
 *   lore (min age 13).
 * - all: everything, incl. growable/usable drugs, "fuck" + NPC swears,
 *   darkest lore (keeps the catalog rating, 18 for these three).
 *
 * Display is band-filtered: viewers only ever SEE the modes open to them
 * (kid-band/unknown/guest → kid only; teen → kid + teen; adult → all three),
 * and the shell auto-selects the best visible mode. Enforcement stays
 * server-side (/api/games/session re-checks canUseContentMode + the
 * effective age), so a forged ?content= or localStorage value can never
 * unlock a locked mode.
 *
 * The catalog rating (lib/age-gate.ts) is untouched; this layer only maps a
 * (slug, mode) pair to an *effective* minimum age that the play gate and the
 * session API enforce instead of the raw rating for these three games.
 */

import { getGameRating, requiredAgeFor } from "@/lib/age-gate";

export type ContentMode = "kid" | "teen" | "all";

export const CONTENT_MODE_GAMES = ["gravegain2d", "gravegain3d", "lastwordszombies"] as const;
export type ContentModeGameSlug = (typeof CONTENT_MODE_GAMES)[number];

export const CONTENT_MODE_QUERY_PARAM = "content" as const;

export const CONTENT_MODE_LABELS: Record<ContentMode, string> = {
  kid: "Kid",
  teen: "Teen",
  all: "Uncut (18+)",
};

export const CONTENT_MODE_DESCRIPTIONS: Record<ContentMode, string> = {
  kid: "Super-sanitized: no blood or gore, child-friendly words, no scary lore.",
  teen: "Full game with gore ON, mild swears only — no drugs, hard swears, or dark lore.",
  all: "Everything: growable/usable drugs, “fuck” + NPC swears, darkest lore.",
};

export const CONTENT_MODES: readonly ContentMode[] = ["kid", "teen", "all"] as const;

/** Viewer band as resolved by the play gate (full account or guest). */
export type ViewerBand = "unknown" | "kid" | "teen" | "adult" | null;

export function hasContentModes(slug: string): boolean {
  return (CONTENT_MODE_GAMES as readonly string[]).includes(slug);
}

/** Safe default when nothing is stored: teen (gore on, swears/drug-gated). */
export function defaultContentMode(): ContentMode {
  return "teen";
}

/** Validate an unknown value; returns null when it is not a content mode. */
export function parseContentMode(value: unknown): ContentMode | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "kid" || v === "teen" || v === "all") return v;
  return null;
}

export function contentModeStorageKey(slug: string): string {
  return `4weird-content-mode:${slug}`;
}

export function readStoredContentMode(slug: string, fallback?: ContentMode): ContentMode {
  const fb = fallback ?? defaultContentMode();
  try {
    if (typeof window === "undefined" || !window.localStorage) return fb;
    const raw = window.localStorage.getItem(contentModeStorageKey(slug));
    return parseContentMode(raw) ?? fb;
  } catch {
    return fb;
  }
}

export function writeStoredContentMode(slug: string, mode: ContentMode): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(contentModeStorageKey(slug), mode);
  } catch {
    /* private mode; the query param still carries the mode for this load */
  }
}

/** Read ?content=<mode> from a query string or URLSearchParams. */
export function getContentModeFromSearch(search: string | URLSearchParams | null | undefined): ContentMode | null {
  try {
    if (!search) return null;
    const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search : `?${search}`) : search;
    return parseContentMode(params.get(CONTENT_MODE_QUERY_PARAM));
  } catch {
    return null;
  }
}

/** Append ?content=<mode> to a runtime src, preserving existing params. */
export function withContentModeParam(src: string, mode: ContentMode): string {
  try {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}${CONTENT_MODE_QUERY_PARAM}=${encodeURIComponent(mode)}`;
  } catch {
    return src;
  }
}

/**
 * Effective minimum age for (slug, mode): kid→0, teen→13, all→ the catalog
 * rating's minimum (18 for these three; falls back to the catalog for any
 * future slug so the rating stays authoritative).
 */
export function effectiveMinAge(slug: string, mode: ContentMode): number {
  if (mode === "kid") return 0;
  if (mode === "teen") return 13;
  return requiredAgeFor(getGameRating(slug));
}

/**
 * Whether a viewer may use a mode:
 * - kid band (full account) or kid-band child session: kid only.
 * - teen band (full account) or teen-band child session: kid + teen.
 * - adult: any.
 * - guests / unknown / null: kid + teen only ("all" needs adult sign-in).
 */
export function canUseContentMode(band: ViewerBand, kidBand: string | null | undefined, mode: ContentMode): boolean {
  const kb = String(kidBand ?? "").trim().toLowerCase();
  if (kb === "kid") return mode === "kid";
  if (kb === "teen") return mode === "kid" || mode === "teen";
  if (kb === "adult") return true;
  if (band === "kid") return mode === "kid";
  if (band === "teen") return mode === "kid" || mode === "teen";
  if (band === "adult") return true;
  return mode === "kid" || mode === "teen";
}

export type ContentModeOption = {
  mode: ContentMode;
  label: string;
  description: string;
  locked: boolean;
  lockReason: string | null;
};

/**
 * Modes the viewer may SEE in the picker (display filter). This is a subset
 * of what canUseContentMode allows: anyone who is not teen or adult (kid
 * band, unknown band, guests) sees kid mode ONLY; teens see kid + teen;
 * adults see all three. Locked modes are hidden, not shown disabled — a kid
 * viewer never sees an Uncut row at all.
 */
export function visibleContentModesForViewer(band: ViewerBand, kidBand?: string | null): ContentMode[] {
  const kb = String(kidBand ?? "").trim().toLowerCase();
  if (kb === "kid") return ["kid"];
  if (kb === "teen") return ["kid", "teen"];
  if (kb === "adult") return ["kid", "teen", "all"];
  if (band === "kid") return ["kid"];
  if (band === "teen") return ["kid", "teen"];
  if (band === "adult") return ["kid", "teen", "all"];
  return ["kid"];
}

/**
 * Best (highest) visible mode for auto-select: kid viewers land on kid,
 * teens on teen, adults keep their stored pick (or teen when nothing stored).
 */
export function bestVisibleContentMode(band: ViewerBand, kidBand?: string | null): ContentMode {
  const visible = visibleContentModesForViewer(band, kidBand);
  return visible[visible.length - 1] ?? "kid";
}

/**
 * Full three-mode list with lock metadata (kept for surfaces that describe
 * every mode, e.g. docs/detail copy). The play picker does NOT use this —
 * it renders visibleContentModesForViewer only.
 */
export function listContentModesForViewer(band: ViewerBand, kidBand?: string | null): ContentModeOption[] {
  return CONTENT_MODES.map((mode) => {
    const allowed = canUseContentMode(band, kidBand ?? null, mode);
    let lockReason: string | null = null;
    if (!allowed) {
      if (mode === "all") {
        lockReason = band === "teen" || String(kidBand ?? "").toLowerCase() === "teen"
          ? "🔒 Uncut needs an Adult (18+) age band."
          : "🔒 Uncut needs adult sign-in (18+).";
      } else if (mode === "teen") {
        lockReason = "🔒 Teen mode needs a Teen (13+) or Adult (18+) band.";
      } else {
        lockReason = "🔒 Locked for your band.";
      }
    }
    return {
      mode,
      label: CONTENT_MODE_LABELS[mode],
      description: CONTENT_MODE_DESCRIPTIONS[mode],
      locked: !allowed,
      lockReason,
    };
  });
}

// ---- Profanity ----

/** Hard swears: full game ("all") only; masked in teen, replaced in kid. */
export const HARD_SWEARS: readonly string[] = ["fuck", "fucking", "fucker", "fucked", "shit", "bitch", "bastard", "asshole"] as const;

/** Mild swears: allowed in teen, replaced with child-friendly words in kid. */
export const MILD_SWEARS: readonly string[] = ["damn", "hell", "crap", "piss", "sucks", "suck"] as const;

/** Drug words stripped outside "all" (kid replaces, teen neutralizes). */
export const DRUG_WORDS: readonly string[] = [
  "weed", "marijuana", "cannabis", "cocaine", "heroin", "meth", "lsd", "shrooms", "opium", "hash",
] as const;

const KID_WORD_SWAPS: Record<string, string> = {
  damn: "drats",
  hell: "heck",
  crap: "crud",
  piss: "pees",
  sucks: "stinks",
  suck: "stink",
};

function replaceWords(text: string, words: readonly string[], replacement: string | ((hit: string) => string)): string {
  let out = text;
  for (const word of words) {
    const pattern = new RegExp(`\\b${word}s?\\b`, "gi");
    out = out.replace(pattern, (hit) => (typeof replacement === "function" ? replacement(hit) : replacement));
  }
  return out;
}

/**
 * Sanitize dialogue for a mode:
 * - all: unchanged.
 * - teen: hard swears masked (#@$%!), mild swears kept.
 * - kid: all swears → child-friendly ("oh no!", "golly", "drats"), drug
 *   mentions stripped to neutral words.
 */
export function sanitizeDialogue(text: string, mode: ContentMode): string {
  if (mode === "all") return text;
  if (mode === "teen") {
    return replaceWords(text, HARD_SWEARS, "#@$%!");
  }
  let out = replaceWords(text, HARD_SWEARS, "oh no!");
  out = out.replace(/\bfuck\w*\b/gi, "golly");
  for (const [from, to] of Object.entries(KID_WORD_SWAPS)) {
    out = out.replace(new RegExp(`\\b${from}s?\\b`, "gi"), to);
  }
  out = replaceWords(out, DRUG_WORDS, "sparkleaf");
  out = out.replace(/\b(kill|murder|blood|gore|slaughter)\b/gi, (hit) => {
    const lower = hit.toLowerCase();
    if (lower === "blood") return "goo";
    if (lower === "gore") return "mess";
    if (lower === "kill") return "bonk";
    if (lower === "murder") return "capture";
    return "defeat";
  });
  return out;
}

/** NPC-line filter (same rules as dialogue); null-safe for game call sites. */
export function filterNpcLine(line: string | null | undefined, mode: ContentMode): string {
  if (line === null || line === undefined) return "";
  return sanitizeDialogue(String(line), mode);
}

// ---- Drugs ----

/** Growable/usable drug content exists only in "all". */
export function isDrugContentAllowed(mode: ContentMode): boolean {
  return mode === "all";
}

/** Display name for a drug item outside "all" (neutral stand-in). */
export function drugDisplayName(mode: ContentMode, rawName = "Moonleaf"): string {
  if (mode === "all") return rawName;
  if (mode === "teen") return "herb";
  return "sparkleaf";
}

/** Strip drug mentions from free text unless mode is "all". */
export function sanitizeDrugMention(text: string, mode: ContentMode): string {
  if (mode === "all") return text;
  return replaceWords(text, DRUG_WORDS, mode === "teen" ? "herb" : "sparkleaf");
}

// ---- Gore ----

export type GoreConfig = {
  /** Master switch: blood particles render only when true. */
  enabled: boolean;
  /** Blood color / particle budget for per-game tuning. */
  bloodColor: string;
  particleBudget: number;
  /** Kid mode renders sparkle puffs instead of blood. */
  kidSparkles: boolean;
};

const GENERIC_GORE: Record<ContentMode, GoreConfig> = {
  kid: { enabled: false, bloodColor: "#ff3b3b", particleBudget: 0, kidSparkles: true },
  teen: { enabled: true, bloodColor: "#c1121f", particleBudget: 160, kidSparkles: false },
  all: { enabled: true, bloodColor: "#7f1d1d", particleBudget: 320, kidSparkles: false },
};

/** Gore renders in every mode except kid. */
export function goreEnabledFor(mode: ContentMode): boolean {
  return mode !== "kid";
}

/**
 * Per-game gore config. Games may ship a `gore-<slug>.js` overlay with a
 * `window.FourweirdGoreConfig` table; the static default here keeps the shell
 * correct when no per-game module exists.
 */
export function getGoreConfig(slug: string, mode: ContentMode): GoreConfig {
  void slug;
  const base = GENERIC_GORE[mode];
  return { ...base };
}

/** Human-readable per-mode feature summary for the picker UI. */
export function contentModeSummary(mode: ContentMode): { gore: string; drugs: string; language: string } {
  if (mode === "kid") {
    return { gore: "No blood/gore (sparkles)", drugs: "No drugs", language: "Child-friendly words" };
  }
  if (mode === "teen") {
    return { gore: "Gore ON", drugs: "No drugs", language: "Mild swears only" };
  }
  return { gore: "Gore ON (max)", drugs: "Growable/usable drugs", language: "Uncut incl. “fuck”" };
}
