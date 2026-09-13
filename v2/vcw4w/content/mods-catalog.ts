/**
 * Community mods + themes catalog — NEW file (game-side foundation).
 *
 * Remastery README Feature 12 (§3.12) + §2 `community_mods` / `community_themes`
 * shapes. This is a STATIC, client-safe seed catalog: it does NOT replace the
 * future Supabase tables, and it deliberately does NOT touch the shared
 * catalogs (`content/games.ts`, `content/game-manifests.ts`).
 *
 * HOW A target_game MOD REGISTERS (e.g. gravegain3d):
 *   1. Author writes a manifest matching `GameModManifest` in lib/game-mods.ts.
 *   2. A reviewer appends ONE entry to MODS_CATALOG below (or the future DB
 *      row lands in `community_mods` and this file becomes its static mirror).
 *   3. The game page filters with `modsForGame("gravegain3d")` and mounts each
 *      entry with `<ModMount manifest={...} />` — no shared-manifest edit.
 *
 * Closed-catalog invariant (mirrors content/games.ts house style): every entry
 * is validated with validateGameModManifest at import and the module throws on
 * drift, so a broken entry fails fast at build instead of serving a broken mod
 * frame. Slugs must be unique.
 */

import {
  validateGameModManifest,
  type GameModManifest,
  type ThemeTokens,
} from "@/lib/game-mods";

/** One row of the static mods seed (mirrors `community_mods` columns). */
export interface ModsCatalogEntry extends GameModManifest {
  /** Catalog display order weight (lower = first). */
  featured?: boolean;
  /** Mirror of `downloads_count` for display. */
  downloads_count?: number;
}

/** One row of the static themes seed (mirrors `community_themes` columns). */
export interface ThemesCatalogEntry {
  name: string;
  slug: string;
  description?: string;
  css_tokens: ThemeTokens;
  is_public?: boolean;
  likes_count?: number;
}

/**
 * Seed mods. `neon-ember-arms` is the worked example: a `target_game:
 * "gravegain3d"` mod registered ENTIRELY here — content/games.ts and
 * content/game-manifests.ts are untouched (verify-game-bundles parity holds).
 */
export const MODS_CATALOG: readonly ModsCatalogEntry[] = [
  {
    name: "Ember Arsenal Pack",
    slug: "ember-arsenal-pack",
    version: "1.0.0",
    target_game: "gravegain3d",
    description:
      "Community weapon-skin pack for GraveGain3D: ember-forged blade tints plus a hub-lantern glow theme. Sandboxed, no save access.",
    script_url: "https://4weird.com/mods/ember-arsenal-pack/mod.js",
    permissions: ["interop:emit"],
    theme: {
      "--mod-accent": "#f97316",
      "--mod-panel": "#1c0f08",
    },
    author: "@ember-cartographer",
    is_verified: false,
    featured: true,
    downloads_count: 0,
  },
  {
    name: "Global Lantern Theme",
    slug: "global-lantern-theme",
    version: "1.1.0",
    target_game: "global",
    description: "Warm lantern CSS tokens applied to any game shell that mounts it.",
    script_url: "https://4weird.com/mods/global-lantern-theme/mod.js",
    theme: {
      "--mod-bg": "#0f172a",
      "--mod-fg": "#f8fafc",
      "--mod-accent": "#fbbf24",
      "--mod-panel": "#1e293b",
      "--mod-border": "#334155",
    },
    author: "@president-angel-good",
    is_verified: false,
    downloads_count: 0,
  },
];

/** Seed themes (mirrors `community_themes`). */
export const THEMES_CATALOG: readonly ThemesCatalogEntry[] = [
  {
    name: "Lantern Light",
    slug: "lantern-light",
    description: "Warm hub-lantern tokens for night-owl dungeon runs.",
    css_tokens: {
      "--mod-bg": "#0f172a",
      "--mod-fg": "#f8fafc",
      "--mod-accent": "#fbbf24",
      "--mod-panel": "#1e293b",
      "--mod-border": "#334155",
    },
    is_public: true,
    likes_count: 0,
  },
];

// Closed-catalog invariant: validate every entry at import (fail fast).
for (const entry of MODS_CATALOG) {
  const result = validateGameModManifest(entry);
  if (!result.ok) throw new Error(`Invalid mods-catalog entry "${entry.slug}": ${result.errors.join("; ")}`);
}
{
  const seen = new Set<string>();
  for (const entry of MODS_CATALOG) {
    if (seen.has(entry.slug)) throw new Error(`Duplicate mods-catalog slug: ${entry.slug}`);
    seen.add(entry.slug);
    if (entry.downloads_count !== undefined && (!Number.isInteger(entry.downloads_count) || entry.downloads_count < 0)) {
      throw new Error(`Invalid downloads_count for mod "${entry.slug}"`);
    }
  }
}
for (const theme of THEMES_CATALOG) {
  if (!/^[a-z0-9-]+$/.test(theme.slug)) throw new Error(`Invalid theme slug: ${theme.slug}`);
  for (const key of Object.keys(theme.css_tokens)) {
    if (!/^--[a-z0-9-]+$/.test(key)) throw new Error(`Invalid theme token key "${key}" in theme "${theme.slug}"`);
  }
}

/** All mods that apply to `gameSlug` (exact target or "global"), featured first. */
export function modsForGame(gameSlug: string): ModsCatalogEntry[] {
  return MODS_CATALOG.filter((m) => m.target_game === "global" || m.target_game === gameSlug).slice().sort(
    (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false),
  );
}

/** One mod by slug, or undefined. */
export function getMod(slug: string): ModsCatalogEntry | undefined {
  return MODS_CATALOG.find((m) => m.slug === slug);
}

/** One theme by slug, or undefined. */
export function getTheme(slug: string): ThemesCatalogEntry | undefined {
  return THEMES_CATALOG.find((t) => t.slug === slug);
}

/** Public themes only (mirrors an `is_public` filter on `community_themes`). */
export function publicThemes(): ThemesCatalogEntry[] {
  return THEMES_CATALOG.filter((t) => t.is_public !== false);
}
