/**
 * Site search ranker (DS-SEARCH-02) — instant zero-AI-cost results.
 *
 * Pure, SSR-safe, zero dependencies, no browser APIs. Works in Node
 * (build/SSR/API routes) and in the browser (search overlay).
 *
 * Consumes the DS-SEARCH-01 index shape:
 *   { id, href, title, quick, tags[], kind }
 * Entries are accepted as a function argument (never imported here), so
 * callers may pass data from `fetch("/search/index.json")`, a static
 * `import`, or an in-memory list — including lazily-loaded shards.
 *
 * Scoring per query token (summed across tokens and fields):
 *   title exact x5 · tags exact x3 · quick exact x2
 *   prefix match counts at 0.6 quality, 1-edit typo at 0.4 quality
 *   exact kind match adds a flat KIND_BONUS
 */

export type SiteSearchEntry = {
  id: string;
  href: string;
  title: string;
  quick: string;
  tags: string[];
  kind: string;
};

export type RankedEntry = {
  entry: SiteSearchEntry;
  score: number;
};

export const TITLE_WEIGHT = 5;
export const TAGS_WEIGHT = 3;
export const QUICK_WEIGHT = 2;
export const KIND_BONUS = 4;
const PREFIX_QUALITY = 0.6;
const TYPO_QUALITY = 0.4;

/**
 * Split a query (or field value) into lowercase alphanumeric tokens.
 * Non-string input yields [] (fail-open). Accented input is folded via NFKD
 * so "cafe" still matches "café" (the split drops combining marks).
 * No browser APIs — String.normalize is ES2015.
 */
export function tokenize(query: string): string[] {
  if (typeof query !== "string") return [];
  return query
    .toLowerCase()
    .normalize("NFKD")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** True when a and b differ by exactly one insert, delete, or substitute. */
function isOneEditAway(a: string, b: string): boolean {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diffs = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i]) {
        diffs++;
        if (diffs > 1) return false;
      }
    }
    return diffs === 1;
  }
  const short = la < lb ? a : b;
  const long = la < lb ? b : a;
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
    } else {
      if (skipped) return false;
      skipped = true;
      j++; // skip the extra char in the longer string
    }
  }
  return true; // trailing extra char counts as the one edit
}

/**
 * Match quality of one query token against one field token:
 * 1 = exact, 0.6 = prefix, 0.4 = 1-edit typo, 0 = no match.
 * Prefix needs 2+ chars; typo needs 3+ chars on both sides to cut noise.
 * Note: a transposition ("mairo" vs "mario") is 2 edits, not 1.
 */
function matchQuality(queryToken: string, fieldToken: string): number {
  if (queryToken === fieldToken) return 1;
  if (
    queryToken.length >= 2 &&
    fieldToken.length > queryToken.length &&
    fieldToken.startsWith(queryToken)
  ) {
    return PREFIX_QUALITY;
  }
  if (
    queryToken.length >= 3 &&
    fieldToken.length >= 3 &&
    isOneEditAway(queryToken, fieldToken)
  ) {
    return TYPO_QUALITY;
  }
  return 0;
}

function bestQuality(queryToken: string, fieldTokens: string[]): number {
  let best = 0;
  for (const ft of fieldTokens) {
    const q = matchQuality(queryToken, ft);
    if (q > best) {
      best = q;
      if (best === 1) break;
    }
  }
  return best;
}

/**
 * Rank entries against a query string. Returns at most `limit`
 * (default 10) hits as [{ entry, score }], best first. Ties keep
 * input order. Empty/bad query, non-array entries, or limit <= 0
 * yield []. Malformed entries are skipped (fail-open).
 */
export function rankEntries(
  entries: SiteSearchEntry[],
  query: string,
  limit: number = 10
): RankedEntry[] {
  if (!Array.isArray(entries)) return [];
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const n =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(0, Math.floor(limit))
      : 10;
  if (n === 0) return [];

  const scored: { entry: SiteSearchEntry; score: number; index: number }[] = [];
  for (let i = 0; i < entries.length; i++) {
    const raw = entries[i] as Partial<SiteSearchEntry> | null | undefined;
    if (!raw || typeof raw !== "object") continue;
    const titleTokens = tokenize(typeof raw.title === "string" ? raw.title : "");
    const quickTokens = tokenize(typeof raw.quick === "string" ? raw.quick : "");
    const tagTokens: string[] = Array.isArray(raw.tags)
      ? raw.tags.flatMap((t) => tokenize(typeof t === "string" ? t : ""))
      : [];
    const kind =
      typeof raw.kind === "string" ? raw.kind.trim().toLowerCase() : "";

    let score = 0;
    for (const t of tokens) {
      score += TITLE_WEIGHT * bestQuality(t, titleTokens);
      score += TAGS_WEIGHT * bestQuality(t, tagTokens);
      score += QUICK_WEIGHT * bestQuality(t, quickTokens);
      if (kind !== "" && t === kind) score += KIND_BONUS;
    }
    if (score > 0) {
      scored.push({
        entry: raw as SiteSearchEntry,
        score: Math.round(score * 100) / 100,
        index: i,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, n).map(({ entry, score }) => ({ entry, score }));
}

/*
 * SELF-TEST (comments only — not executed; paste into a scratch runner
 * with ts-node/tsx to verify, or call rankEntries from the overlay):
 *
 *   import { rankEntries } from "./site-search";
 *   const entries = [
 *     { id: "a", href: "/games/mario-run", title: "Super Mario Run",
 *       quick: "Run and jump", tags: ["platformer"], kind: "game" },
 *     { id: "b", href: "/games/mario-kart", title: "Mario Kart",
 *       quick: "Race your friends", tags: ["racing"], kind: "game" },
 *     { id: "c", href: "/docs/faq", title: "FAQ",
 *       quick: "Answers", tags: ["mario"], kind: "docs" },
 *   ];
 *
 *   rankEntries(entries, "mario").map((r) => r.entry.id);
 *   // => ["a", "b", "c"]  (a,b score 5 via title; c scores 3 via tags)
 *
 *   rankEntries(entries, "mar").map((r) => [r.entry.id, r.score]);
 *   // => [["a", 3], ["b", 3], ["c", 1.8]]  (prefix @ 0.6 quality)
 *
 *   rankEntries(entries, "maro").map((r) => [r.entry.id, r.score]);
 *   // => [["a", 2], ["b", 2], ["c", 1.2]]  (1-edit typo @ 0.4 quality)
 *
 *   rankEntries(entries, "mario game").map((r) => [r.entry.id, r.score]);
 *   // => [["a", 9], ["b", 9], ["c", 3]]  (+4 kind bonus on game entries)
 *
 *   rankEntries(entries, "").length;          // => 0 (empty query)
 *   rankEntries(entries, "mario", 1).length;  // => 1 (limit honored)
 *   rankEntries("nope" as never, "mario");    // => [] (fail-open)
 */
