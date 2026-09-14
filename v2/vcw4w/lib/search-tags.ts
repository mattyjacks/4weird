// Smart scalable tagging: derive zero-human-work tags per entry kind.
//
// TAG RULES (rules auto-tag page 100001 with no manual curation):
// - games:        genre + catalog tags + rating + title keywords
// - docs:         section path segments + top keywords
// - music:        mood words + instrument names
// - servers:      dimension + age band
// - mmo / clans: names (full name + name keywords)
//
// Every tag is lowercased, deduped, and the list is capped at MAX_TAGS.
// Bump TAG_VERSION whenever the rules change so cached tag sets can be
// invalidated by version instead of by re-deriving everything.
//
// Pure module: zero imports, zero I/O, never throws (fail-open).

export const TAG_VERSION = 1;

export const MAX_TAGS = 12;

export type SearchTagKind =
  | "games"
  | "docs"
  | "music"
  | "servers"
  | "mmo"
  | "clans";

// Loose input shape: sibling catalog builders feed whatever fields they
// have. Unknown/missing fields are ignored (fail-open), never throw.
export interface TaggableEntry {
  kind: SearchTagKind | string;
  title?: unknown;
  genre?: unknown;
  tags?: unknown;
  rating?: unknown;
  sectionPath?: unknown;
  keywords?: unknown;
  mood?: unknown;
  instruments?: unknown;
  dimension?: unknown;
  ageBand?: unknown;
  name?: unknown;
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "your",
  "you",
  "our",
  "are",
  "was",
  "were",
  "been",
  "have",
  "has",
  "had",
  "will",
  "would",
  "could",
  "should",
  "about",
  "after",
  "before",
  "between",
  "under",
  "over",
  "again",
  "once",
  "here",
  "there",
  "their",
  "them",
  "they",
  "this",
  "that",
  "these",
  "those",
  "guide",
]);

function cleanToken(value: unknown): string | null {
  try {
    const text = String(value ?? "")
      .toLowerCase()
      .replace(/[_/\\|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || text.length > 48) return null;
    return text;
  } catch {
    return null;
  }
}

// A free-form value (or list) coerced to cleaned tags. Strings split on
// commas/semicolons so "chill, synth" and ["chill", "synth"] agree.
function asList(value: unknown): string[] {
  try {
    const raw: unknown[] = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/[,;]+/)
        : [];
    const out: string[] = [];
    for (const item of raw) {
      const tag = cleanToken(item);
      if (tag) out.push(tag);
    }
    return out;
  } catch {
    return [];
  }
}

// Title/name text broken into keyword tags: lowercase alphanumerics,
// drops short glue words and generic filler.
function splitKeywords(value: unknown): string[] {
  try {
    const text = String(value ?? "").toLowerCase();
    const out: string[] = [];
    for (const word of text.split(/[^a-z0-9]+/g)) {
      if (word.length <= 2) continue;
      if (STOPWORDS.has(word)) continue;
      if (/^\d+$/.test(word)) continue;
      out.push(word);
    }
    return out;
  } catch {
    return [];
  }
}

// Docs section paths like "docs/music/theory" contribute each segment
// (minus the bare "docs" root) as a tag.
function sectionSegments(value: unknown): string[] {
  try {
    const text = String(value ?? "").toLowerCase();
    const out: string[] = [];
    for (const part of text.split(/[/\\]+/g)) {
      const seg = part.trim().replace(/[^a-z0-9-]+/g, "");
      if (!seg || seg === "docs") continue;
      out.push(seg);
    }
    return out;
  } catch {
    return [];
  }
}

function pushUnique(into: string[], values: string[]): void {
  for (const value of values) {
    if (!value) continue;
    if (into.indexOf(value) === -1) into.push(value);
  }
}

// Derive tags for one catalog entry. Lowercased, deduped, <= MAX_TAGS,
// ordered by rule priority (kind first). Never throws: garbage in -> [].
export function deriveTags(entry: TaggableEntry): string[] {
  try {
    if (!entry || typeof entry !== "object") return [];
    const kind = cleanToken(entry.kind);
    if (!kind) return [];

    const tags: string[] = [kind];

    if (kind === "games") {
      const genre = cleanToken(entry.genre);
      if (genre) pushUnique(tags, [genre]);
      pushUnique(tags, asList(entry.tags));
      const rating = cleanToken(entry.rating);
      if (rating) pushUnique(tags, [`rating:${rating}`]);
      pushUnique(tags, splitKeywords(entry.title));
    } else if (kind === "docs") {
      pushUnique(tags, sectionSegments(entry.sectionPath));
      const keywords = asList(entry.keywords);
      pushUnique(
        tags,
        keywords.length > 0 ? keywords : splitKeywords(entry.title),
      );
    } else if (kind === "music") {
      pushUnique(tags, asList(entry.mood));
      pushUnique(tags, asList(entry.instruments));
      pushUnique(tags, splitKeywords(entry.title));
    } else if (kind === "servers") {
      const dimension = cleanToken(entry.dimension);
      if (dimension) pushUnique(tags, [dimension]);
      const band = cleanToken(entry.ageBand);
      if (band) pushUnique(tags, [band]);
      pushUnique(tags, asList(entry.name ?? entry.title));
    } else if (kind === "mmo" || kind === "clans") {
      const name = cleanToken(entry.name ?? entry.title);
      if (name) pushUnique(tags, [name]);
      pushUnique(tags, splitKeywords(entry.name ?? entry.title));
    } else {
      // Unknown future kinds: fall back to generic signals so page
      // 100001 of a kind we have not seen yet still gets tagged.
      pushUnique(tags, asList(entry.tags));
      pushUnique(tags, asList(entry.keywords));
      pushUnique(tags, splitKeywords(entry.title ?? entry.name));
    }

    return tags.slice(0, MAX_TAGS);
  } catch {
    return [];
  }
}

// Validate an incoming tag set (e.g. a per-page override registry value).
// Fail-open: non-arrays and garbage entries are dropped, never thrown.
export function validateTags(tags: unknown): string[] {
  try {
    if (!Array.isArray(tags)) return [];
    const out: string[] = [];
    for (const item of tags) {
      const tag = cleanToken(item);
      if (!tag) continue;
      if (out.indexOf(tag) === -1) out.push(tag);
    }
    return out.slice(0, MAX_TAGS);
  } catch {
    return [];
  }
}
