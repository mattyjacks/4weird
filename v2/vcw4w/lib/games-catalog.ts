/**
 * Cached catalog readers for the GAMES pages.
 *
 * Game metadata lives in local static registries (`content/games.ts`,
 * `content/game-manifests.ts`); SEO helpers in `lib/seo.ts` are pure. This
 * module exposes them as `'use cache'` async functions with
 * `cacheLife("hours")` so list/detail/play shells prerender into the static
 * shell and stay fresh hourly. Entries are tagged `games` (whole catalog)
 * and `game-<slug>` (per-game) so mutations can invalidate on demand via
 * `updateTag("games")` / `updateTag(`game-${slug}`)` from a Server Action.
 *
 * Per the Cache Components docs, cached scopes must not read runtime APIs
 * (cookies/headers/params/searchParams): callers await `params` first and
 * pass the resolved `slug` string (serializable, part of the cache key).
 */

import { cacheLife, cacheTag } from "next/cache";
import { games, getGame, resolveGameSlug, type Game } from "@/content/games";
import {
  gameGuidePath,
  getGameManifest,
  type GameManifest,
} from "@/content/game-manifests";

/** Full closed-catalog list (34 games). Tag: `games`. */
export async function getCachedGames(): Promise<Game[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  return games;
}

/** Single game by slug (case-insensitive), or null for unknown slugs. Tags: `games`, `game-<slug>`. */
export async function getCachedGame(slug: string): Promise<Game | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  cacheTag(`game-${slug}`);
  const canonical = resolveGameSlug(slug);
  if (canonical) cacheTag(`game-${canonical}`);
  return getGame(slug) ?? null;
}

/** Runtime manifest for a catalog slug. Tags: `games`, `game-<slug>`. */
export async function getCachedGameManifest(
  slug: string,
): Promise<GameManifest> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  cacheTag(`game-${slug}`);
  const canonical = resolveGameSlug(slug);
  if (canonical) cacheTag(`game-${canonical}`);
  return getGameManifest(canonical ?? slug);
}

/** Static guide path (`/games/<slug>/guide.html`) or null. Tags: `games`, `game-<slug>`. */
export async function getCachedGameGuidePath(
  slug: string,
): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  cacheTag(`game-${slug}`);
  const canonical = resolveGameSlug(slug);
  if (canonical) cacheTag(`game-${canonical}`);
  return gameGuidePath(canonical ?? slug);
}

export type CachedGameDetail = {
  game: Game;
  manifest: GameManifest;
  guide: string | null;
};

/**
 * Game + manifest + guide in one cached entry for detail/play shells.
 * Returns null for unknown slugs so callers can `notFound()` OUTSIDE the
 * cached scope (control-flow throws must not be cached).
 */
export async function getCachedGameDetail(
  slug: string,
): Promise<CachedGameDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("games");
  cacheTag(`game-${slug}`);
  const canonical = resolveGameSlug(slug);
  if (canonical) cacheTag(`game-${canonical}`);
  const game = getGame(slug);
  if (!game) return null;
  return {
    game,
    manifest: getGameManifest(game.slug),
    guide: gameGuidePath(game.slug),
  };
}
