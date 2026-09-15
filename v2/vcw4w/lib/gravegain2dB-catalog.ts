/**
 * GraveGain2dB catalog helpers + save-namespace separation spec.
 *
 * NEW file owned by worker gg2db-08 (wave scope: lib/gravegain2dB-catalog.ts only).
 * The integrator wires this into content/games.ts / game-manifests.ts / sitemap /
 * site-nav — this module MUST NOT import those files; it only exports the
 * canonical values and the validation checklist the integrator runs.
 *
 * Canonical slug is mixed-case `gravegain2dB` and MUST equal the bundle
 * directory name `public/games/gravegain2dB`. Lowercase `gravegain2db` is a
 * compat alias that redirects to canonical (never a second catalog row).
 */

export const GRAVEGAIN_2DB_CANONICAL_SLUG = "gravegain2dB" as const;
export const GRAVEGAIN_2DB_LOWERCASE_ALIAS = "gravegain2db" as const;
export const GRAVEGAIN_2DA_CANONICAL_SLUG = "gravegain2dA" as const;

export const GRAVEGAIN_2DB_BUNDLE_DIR = "public/games/gravegain2dB";
export const GRAVEGAIN_2DB_ROUTE = "/games/gravegain2dB/";
export const GRAVEGAIN_2DB_COMPAT_ROUTE = "/games/gravegain2db/";

/** Save namespaces — 2dB and 2DA MUST NEVER share a key. */
export const GRAVEGAIN_2DB_SAVE_NAMESPACE = "gravegain2dB" as const;
export const GRAVEGAIN_2DB_SAVE_KEY = "gravegain2dB.shell.v1" as const;
export const GRAVEGAIN_2DA_SAVE_PREFIX = "gravegain2dA" as const;

/** Redirect spec for the integrator (middleware / next.config / hosting). */
export const GRAVEGAIN_2DB_REDIRECT_SPEC = {
  from: GRAVEGAIN_2DB_COMPAT_ROUTE,
  to: GRAVEGAIN_2DB_ROUTE,
  status: 308 as const,
  reason:
    "Lowercase /games/gravegain2db/ is a compat alias only; canonical is mixed-case /games/gravegain2dB/. Permanent redirect preserves link equity and avoids a duplicate catalog row.",
} as const;

export type SlugNormalization =
  | { ok: true; canonical: typeof GRAVEGAIN_2DB_CANONICAL_SLUG; viaCompat: boolean }
  | { ok: false; canonical: null; viaCompat: false };

/** Normalize a user-typed slug. Exact canonical passes through; lowercase alias maps to canonical. */
export function normalizeGraveGain2dBSlug(input: unknown): SlugNormalization {
  if (typeof input !== "string") return { ok: false, canonical: null, viaCompat: false };
  const s = input.trim().replace(/^\/+|\/+$/g, "");
  if (s === GRAVEGAIN_2DB_CANONICAL_SLUG) return { ok: true, canonical: s, viaCompat: false };
  if (s.toLowerCase() === GRAVEGAIN_2DB_LOWERCASE_ALIAS)
    return { ok: true, canonical: GRAVEGAIN_2DB_CANONICAL_SLUG, viaCompat: s !== GRAVEGAIN_2DB_CANONICAL_SLUG };
  return { ok: false, canonical: null, viaCompat: false };
}

/** True when a storage key belongs to the 2dB namespace (and NOT to 2dA). */
export function isGraveGain2dBKey(key: unknown): boolean {
  if (typeof key !== "string") return false;
  if (!key.startsWith(GRAVEGAIN_2DB_SAVE_NAMESPACE + ".")) return false;
  // Belt-and-braces: a key can never be both namespaces; reject anything
  // that even mentions the 2dA prefix.
  if (key.includes(GRAVEGAIN_2DA_SAVE_PREFIX)) return false;
  return true;
}

/**
 * Guard the integrator (or tests) call before every save write:
 * no 2dB record may overwrite a 2dA record and vice versa.
 * Returns an error string on violation, null when the write is allowed.
 */
export function checkSaveSeparation(writeNamespace: string, key: string): string | null {
  if (writeNamespace === GRAVEGAIN_2DB_SAVE_NAMESPACE) {
    if (!key.startsWith(GRAVEGAIN_2DB_SAVE_NAMESPACE + "."))
      return `2dB write rejected: key "${key}" is outside namespace "${GRAVEGAIN_2DB_SAVE_NAMESPACE}."`;
    if (key.startsWith(GRAVEGAIN_2DA_SAVE_PREFIX + ".") || key.includes(GRAVEGAIN_2DA_SAVE_PREFIX))
      return `2dB write rejected: key "${key}" collides with 2dA namespace.`;
    return null;
  }
  if (writeNamespace === GRAVEGAIN_2DA_SAVE_PREFIX) {
    if (key.startsWith(GRAVEGAIN_2DB_SAVE_NAMESPACE + ".") || key.includes(GRAVEGAIN_2DB_SAVE_NAMESPACE))
      return `2dA write rejected: key "${key}" collides with 2dB namespace.`;
    return null;
  }
  return null;
}

/** Suggested catalog row for the integrator to paste (NOT applied by this worker). */
export const GRAVEGAIN_2DB_CATALOG_ROW_SPEC = {
  slug: GRAVEGAIN_2DB_CANONICAL_SLUG,
  title: "GraveGain2dB",
  fullTitle: "GraveGain2dB: Breach MoonRock",
  genre: "Side-Scroller",
  bundleDir: GRAVEGAIN_2DB_BUNDLE_DIR,
  route: GRAVEGAIN_2DB_ROUTE,
  ageBand: "REQUESTED-FROM-INTEGRATOR (suggest Teen: sci-fi blaster violence, no gore detail)",
} as const;

/**
 * Validation checklist the integrator runs before marking 2dB wired.
 * Each item is a [label, how-to-verify] pair so QUEUE/STATUS can quote it.
 */
export const GRAVEGAIN_2DB_VALIDATION_CHECKLIST: ReadonlyArray<readonly [string, string]> = [
  ["slug==dir", "game.json slug === 'gravegain2dB' === basename of public/games/gravegain2dB"],
  ["no lowercase duplicate", "catalog has exactly one row for slug gravegain2dB; gravegain2db resolves only via 308 redirect spec above"],
  ["shell boots offline", "open public/games/gravegain2dB/index.html with network off: menu renders, hub opens, mission board shows 3 placeholders, quick breach paints canvas"],
  ["sibling fail-open", "with sim/terrain/player/campaign absent, no uncaught exception; with each present, its window.GraveGain2dB* hook is called"],
  ["content-mode bridge", "with window.FourweirdContentMode stubbed, badge shows mode and ready() is called; without it, shell still boots"],
  ["save separation", "localStorage contains only gravegain2dB.* keys after play; checkSaveSeparation() returns null for 2dB writes and rejects cross-namespace keys; zero gravegain2dA.* reads/writes"],
  ["party/MMO safe", "party invites and MMO presence keyed by canonical slug; lowercase alias normalized before any party/MMO/save call"],
  ["2dA untouched", "git status shows no changes under public/games/gravegain2dA/**"],
] as const;
