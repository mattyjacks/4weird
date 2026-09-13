/**
 * Community mod / plugin manifest loader + validator — game-side foundation.
 *
 * Remastery README Feature 12 (§3.12) + §2 `community_mods` / `community_themes`
 * table shapes. This module is the TYPED mirror of those rows:
 *
 *   community_mods    -> GameModManifest  (name, slug, description, version,
 *                        target_game, manifest_json, script_url, is_verified,
 *                        downloads_count)
 *   community_themes  -> ThemeTokens      (css_tokens JSONB)
 *
 * Rules carried over from the spec:
 * - `target_game` is a game slug (`gravegain3d`, `gravegain2d`, …) or the
 *   literal `"global"` (applies to every game).
 * - Mod code is UNTRUSTED: it runs in a sandboxed iframe with `allow-scripts`
 *   ONLY — never `allow-same-origin` — so it cannot touch 4weird session
 *   tokens (§3.12 blueprint). See MOD_IFRAME_SANDBOX below.
 * - Fail-open (§1.2 axiom 3): a bad manifest never bricks navigation — the
 *   validator returns errors, the mount component renders a fallback.
 *
 * Pure TypeScript: no React, no DOM, no secrets. Safe to import from server
 * components, route handlers, and content modules.
 */

/** Game slugs mods are known to target. Open-ended on purpose: any current or
 *  future slug from content/games.ts is valid, plus "global". */
export const KNOWN_MOD_TARGETS = [
  "gravegain3d",
  "gravegain2d",
  "gravegain1d",
  "battlesharks2",
  "global",
] as const;

export type KnownModTarget = (typeof KNOWN_MOD_TARGETS)[number];

/** A mod target is any game slug or "global". Kept as `string` (not a closed
 *  union) so new games never require an edit here. */
export type ModTargetGame = string;

export const GLOBAL_MOD_TARGET = "global" as const;

/** Permissions a mod may request. The mount component grants NONE of these
 *  automatically — they are declaration-only today, enforced allowlist-style
 *  so an unknown permission fails validation instead of being ignored. */
export const MOD_PERMISSIONS = [
  "storage:local",
  "audio:play",
  "interop:emit",
  "clipboard:read",
  "clipboard:write",
] as const;

export type ModPermission = (typeof MOD_PERMISSIONS)[number];

/** CSS custom-property tokens a community theme may define (mirrors the
 *  `css_tokens` JSONB column on `community_themes`). Keys must be `--*`. */
export type ThemeTokens = Record<string, string>;

/** A curated allowlist of theme token names the game shell understands.
 *  Themes may carry extra `--*` keys (forward-compat), but these are the
 *  ones the shell actually applies. */
export const KNOWN_THEME_TOKENS = [
  "--mod-bg",
  "--mod-fg",
  "--mod-accent",
  "--mod-panel",
  "--mod-border",
  "--mod-font",
] as const;

/**
 * Typed shape of a community mod manifest (mirrors `manifest_json` plus the
 * sibling columns of `community_mods` so one object round-trips a row).
 */
export interface GameModManifest {
  /** Display name, e.g. "Ember Arsenal Pack". */
  name: string;
  /** URL-safe id, `^[a-z0-9-]+$`, unique per catalog. */
  slug: string;
  /** Semver-ish `major.minor.patch` (prerelease suffix allowed). */
  version: string;
  /** Game slug this mod plugs into, or "global". */
  target_game: ModTargetGame;
  /** Short human description. */
  description?: string;
  /** https:// URL of the sandboxed mod bundle. Relative paths allowed for
   *  first-party dev (resolved against the site origin by the mount). */
  script_url: string;
  /** Declared permission requests (allowlist above). */
  permissions?: ModPermission[];
  /** Optional bundled theme tokens applied while the mod is mounted. */
  theme?: ThemeTokens;
  /** Author handle for display. */
  author?: string;
  /** Verified badge (mirrors `is_verified`). */
  is_verified?: boolean;
}

/** Result of validating an unknown value as a mod manifest. */
export interface ModValidationResult {
  ok: boolean;
  errors: string[];
  manifest: GameModManifest | null;
}

const SLUG_RE = /^[a-z0-9-]+$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const TOKEN_KEY_RE = /^--[a-z0-9-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value, "https://4weird.com");
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate an unknown value as a GameModManifest. Never throws — returns
 * `{ ok, errors, manifest }` so callers can fail open.
 */
export function validateGameModManifest(value: unknown): ModValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["manifest must be an object"], manifest: null };
  }

  const { name, slug, version, target_game, description, script_url, permissions, theme, author, is_verified } = value;

  if (typeof name !== "string" || !name.trim()) errors.push("name must be a non-empty string");
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) errors.push(`slug must match ${SLUG_RE} (got ${JSON.stringify(slug)})`);
  if (typeof version !== "string" || !VERSION_RE.test(version)) {
    errors.push(`version must be semver major.minor.patch (got ${JSON.stringify(version)})`);
  }
  if (typeof target_game !== "string" || !target_game.trim()) {
    errors.push("target_game must be a game slug or \"global\"");
  }
  if (typeof script_url !== "string" || !script_url.trim() || !isHttpUrl(script_url)) {
    errors.push(`script_url must be an http(s) URL (got ${JSON.stringify(script_url)})`);
  }
  if (description !== undefined && typeof description !== "string") errors.push("description must be a string");
  if (author !== undefined && typeof author !== "string") errors.push("author must be a string");
  if (is_verified !== undefined && typeof is_verified !== "boolean") errors.push("is_verified must be a boolean");

  let cleanPermissions: ModPermission[] | undefined;
  if (permissions !== undefined) {
    if (!Array.isArray(permissions)) {
      errors.push("permissions must be an array");
    } else {
      const bad = permissions.filter(
        (p): p is string => typeof p !== "string" || !(MOD_PERMISSIONS as readonly string[]).includes(p),
      );
      if (bad.length > 0) errors.push(`unknown permissions: ${bad.map((p) => JSON.stringify(p)).join(", ")}`);
      cleanPermissions = permissions.filter((p): p is ModPermission =>
        typeof p === "string" && (MOD_PERMISSIONS as readonly string[]).includes(p),
      );
    }
  }

  let cleanTheme: ThemeTokens | undefined;
  if (theme !== undefined) {
    if (!isRecord(theme)) {
      errors.push("theme must be an object of CSS token key/value pairs");
    } else {
      const badKeys = Object.keys(theme).filter((k) => !TOKEN_KEY_RE.test(k));
      const badValues = Object.entries(theme).filter(([, v]) => typeof v !== "string" || !String(v).trim());
      if (badKeys.length > 0) errors.push(`theme keys must be --custom-property names (bad: ${badKeys.join(", ")})`);
      if (badValues.length > 0) errors.push(`theme values must be non-empty strings (bad: ${badValues.map(([k]) => k).join(", ")})`);
      cleanTheme = Object.fromEntries(Object.entries(theme).filter(([, v]) => typeof v === "string")) as ThemeTokens;
    }
  }

  if (errors.length > 0) return { ok: false, errors, manifest: null };

  return {
    ok: true,
    errors: [],
    manifest: {
      name: (name as string).trim(),
      slug: slug as string,
      version: version as string,
      target_game: target_game as ModTargetGame,
      ...(description !== undefined ? { description: description as string } : {}),
      script_url: script_url as string,
      ...(cleanPermissions ? { permissions: cleanPermissions } : {}),
      ...(cleanTheme ? { theme: cleanTheme } : {}),
      ...(author !== undefined ? { author: author as string } : {}),
      ...(is_verified !== undefined ? { is_verified: is_verified as boolean } : {}),
    },
  };
}

/**
 * Parse + validate a manifest from a JSON string (e.g. a fetched
 * `.4weird-mod.json` file or a `manifest_json` column value).
 */
export function parseGameModManifest(json: string): ModValidationResult {
  try {
    return validateGameModManifest(JSON.parse(json) as unknown);
  } catch (err) {
    return { ok: false, errors: [`manifest is not valid JSON: ${err instanceof Error ? err.message : String(err)}`], manifest: null };
  }
}

/** True when the manifest applies to `gameSlug` (exact slug or "global"). */
export function isModCompatibleWithGame(manifest: GameModManifest, gameSlug: string): boolean {
  return manifest.target_game === GLOBAL_MOD_TARGET || manifest.target_game === gameSlug;
}

/** Filter a manifest list down to the mods that apply to `gameSlug`. */
export function modsForGameSlug<T extends Pick<GameModManifest, "target_game">>(mods: readonly T[], gameSlug: string): T[] {
  return mods.filter((m) => m.target_game === GLOBAL_MOD_TARGET || m.target_game === gameSlug);
}

/**
 * Sandbox attribute for the mod iframe. `allow-scripts` ONLY — deliberately
 * WITHOUT `allow-same-origin`, so mod code runs in an opaque origin and can
 * never reach 4weird session tokens or the parent DOM (§3.12). Do not widen.
 */
export const MOD_IFRAME_SANDBOX = "allow-scripts" as const;

/** First-party origins the shell (and mod iframes) may be served from. */
export const TRUSTED_MOD_ORIGINS = ["https://4weird.com", "https://www.4weird.com"] as const;

/** Human one-liner for catalog UIs. */
export function describeMod(manifest: GameModManifest): string {
  const verified = manifest.is_verified ? " ✓" : "";
  return `${manifest.name} v${manifest.version} → ${manifest.target_game}${verified}`;
}

/* ---------------------------------------------------------------------------
 * DB-row mirrors (community_mods / community_themes) + list validators.
 *
 * The /games/mods browser (app/games/mods/mods-browser.tsx, owned by a
 * sibling lane — do NOT edit it from here) consumes rows shaped like the
 * Supabase rows: the mod's nested `manifest_json` object travels alongside
 * the flat columns. This section mirrors those rows and validates LISTS of
 * them (live-fetch payloads), failing open per §1.2 axiom 3: bad rows are
 * dropped, never thrown.
 * ------------------------------------------------------------------------- */

/** Nested manifest payload (mirrors the `manifest_json` JSONB column). */
export interface CommunityModManifestJson {
  /** Bundle entry file inside the mod package, e.g. "mod.js". */
  entry: string;
  /** Declared capability requests (free-form strings at the DB layer). */
  permissions: string[];
  /** Named asset paths inside the package (skybox, sprites, …). */
  assets?: Record<string, string>;
  author?: string;
  description?: string;
}

/** One `community_mods` row (flat columns + nested manifest_json). */
export interface CommunityModRow {
  name: string;
  slug: string;
  description?: string;
  version: string;
  target_game: ModTargetGame;
  manifest_json: CommunityModManifestJson;
  script_url: string;
  is_verified?: boolean;
  downloads_count?: number;
}

/** One `community_themes` row (mirrors css_tokens JSONB + counters). */
export interface CommunityThemeRow {
  name: string;
  slug: string;
  description?: string;
  css_tokens: ThemeTokens;
  creator_user_id?: string;
  is_public?: boolean;
  likes_count?: number;
}

/** Per-row outcome: valid rows carry `value`, bad rows carry `errors`. */
export type ValidatedRow<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function validateCommunityModRow(value: unknown): ValidatedRow<CommunityModRow> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["mod row must be an object"] };
  const { name, slug, description, version, target_game, manifest_json, script_url, is_verified, downloads_count } = value;
  if (typeof name !== "string" || !name.trim()) errors.push("name must be a non-empty string");
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) errors.push(`slug must match ${SLUG_RE}`);
  if (typeof version !== "string" || !VERSION_RE.test(version)) errors.push("version must be semver major.minor.patch");
  if (typeof target_game !== "string" || !target_game.trim()) errors.push("target_game must be a game slug or \"global\"");
  if (typeof script_url !== "string" || !script_url.trim() || !isHttpUrl(script_url)) {
    errors.push("script_url must be an http(s) URL");
  }
  if (description !== undefined && typeof description !== "string") errors.push("description must be a string");
  if (is_verified !== undefined && typeof is_verified !== "boolean") errors.push("is_verified must be a boolean");
  if (downloads_count !== undefined && (!Number.isInteger(downloads_count) || (downloads_count as number) < 0)) {
    errors.push("downloads_count must be a non-negative integer");
  }
  let manifest: CommunityModManifestJson | null = null;
  if (!isRecord(manifest_json)) {
    errors.push("manifest_json must be an object");
  } else {
    const { entry, permissions, assets, author, description: mjDesc } = manifest_json;
    if (typeof entry !== "string" || !entry.trim()) errors.push("manifest_json.entry must be a non-empty string");
    if (!Array.isArray(permissions) || permissions.some((p) => typeof p !== "string")) {
      errors.push("manifest_json.permissions must be a string array");
    }
    if (assets !== undefined && (!isRecord(assets) || Object.values(assets).some((v) => typeof v !== "string"))) {
      errors.push("manifest_json.assets must be a string map");
    }
    if (author !== undefined && typeof author !== "string") errors.push("manifest_json.author must be a string");
    if (mjDesc !== undefined && typeof mjDesc !== "string") errors.push("manifest_json.description must be a string");
    if (errors.length === 0) {
      manifest = {
        entry: (entry as string).trim(),
        permissions: (permissions as string[]).slice(),
        ...(isRecord(assets) ? { assets: Object.fromEntries(Object.entries(assets).filter(([, v]) => typeof v === "string")) as Record<string, string> } : {}),
        ...(typeof author === "string" ? { author } : {}),
        ...(typeof mjDesc === "string" ? { description: mjDesc } : {}),
      };
    }
  }
  if (errors.length > 0 || !manifest) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: (name as string).trim(),
      slug: slug as string,
      ...(typeof description === "string" ? { description } : {}),
      version: version as string,
      target_game: target_game as ModTargetGame,
      manifest_json: manifest,
      script_url: script_url as string,
      ...(typeof is_verified === "boolean" ? { is_verified } : {}),
      ...(typeof downloads_count === "number" ? { downloads_count } : {}),
    },
  };
}

function validateCommunityThemeRow(value: unknown): ValidatedRow<CommunityThemeRow> {
  const errors: string[] = [];
  if (!isRecord(value)) return { ok: false, errors: ["theme row must be an object"] };
  const { name, slug, description, css_tokens, creator_user_id, is_public, likes_count } = value;
  if (typeof name !== "string" || !name.trim()) errors.push("name must be a non-empty string");
  if (typeof slug !== "string" || !SLUG_RE.test(slug)) errors.push(`slug must match ${SLUG_RE}`);
  if (description !== undefined && typeof description !== "string") errors.push("description must be a string");
  if (creator_user_id !== undefined && typeof creator_user_id !== "string") errors.push("creator_user_id must be a string");
  if (is_public !== undefined && typeof is_public !== "boolean") errors.push("is_public must be a boolean");
  if (likes_count !== undefined && (!Number.isInteger(likes_count) || (likes_count as number) < 0)) {
    errors.push("likes_count must be a non-negative integer");
  }
  let tokens: ThemeTokens | null = null;
  if (!isRecord(css_tokens) || Object.keys(css_tokens).length === 0) {
    errors.push("css_tokens must be a non-empty object");
  } else {
    const badKeys = Object.keys(css_tokens).filter((k) => !TOKEN_KEY_RE.test(k));
    const badValues = Object.entries(css_tokens).filter(([, v]) => typeof v !== "string" || !String(v).trim());
    if (badKeys.length > 0) errors.push(`css_tokens keys must be --custom-property names (bad: ${badKeys.join(", ")})`);
    if (badValues.length > 0) errors.push("css_tokens values must be non-empty strings");
    tokens = Object.fromEntries(Object.entries(css_tokens).filter(([, v]) => typeof v === "string")) as ThemeTokens;
  }
  if (errors.length > 0 || !tokens) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: (name as string).trim(),
      slug: slug as string,
      ...(typeof description === "string" ? { description } : {}),
      css_tokens: tokens,
      ...(typeof creator_user_id === "string" ? { creator_user_id } : {}),
      ...(typeof is_public === "boolean" ? { is_public } : {}),
      ...(typeof likes_count === "number" ? { likes_count } : {}),
    },
  };
}

/**
 * Validate a live-fetch payload list of mod rows. Never throws — each row
 * maps to `{ ok, value? | errors? }` so callers keep valid rows and drop bad
 * ones (fail-open). Non-array input yields a single error row.
 */
export function validateModList(list: unknown): ValidatedRow<CommunityModRow>[] {
  if (!Array.isArray(list)) return [{ ok: false, errors: ["mods payload must be an array"] }];
  return list.map((row) => validateCommunityModRow(row));
}

/** Same fail-open list contract for theme rows. */
export function validateThemeList(list: unknown): ValidatedRow<CommunityThemeRow>[] {
  if (!Array.isArray(list)) return [{ ok: false, errors: ["themes payload must be an array"] }];
  return list.map((row) => validateCommunityThemeRow(row));
}

/**
 * Bridge a DB-shaped row into the flat GameModManifest the mount component
 * takes. Only allowlisted ModPermissions survive the crossing (DB-layer
 * permission strings like "storage"/"audio" are declaration-only there and
 * grant nothing here); author/description prefer the manifest_json copies.
 */
export function communityModRowToManifest(row: CommunityModRow): GameModManifest {
  return {
    name: row.name,
    slug: row.slug,
    version: row.version,
    target_game: row.target_game,
    description: row.manifest_json.description ?? row.description,
    script_url: row.script_url,
    permissions: row.manifest_json.permissions.filter((p): p is ModPermission =>
      (MOD_PERMISSIONS as readonly string[]).includes(p),
    ),
    ...(row.manifest_json.author ? { author: row.manifest_json.author } : {}),
    ...(typeof row.is_verified === "boolean" ? { is_verified: row.is_verified } : {}),
  };
}
