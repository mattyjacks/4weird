import { games, type Game } from "./games";
export type GameManifest = { slug: string; sourcePath: string; runtimePath: string; schemaVersion: number; storage: string[]; workers: string[]; audio: boolean; cleanup: string[]; tests: string[] };
export const gameManifests: Record<string, GameManifest> = Object.fromEntries(games.map((game: Game) => [game.slug, { slug: game.slug, sourcePath: `/games/html/${game.legacyPath}/`, runtimePath: game.runtimePath, schemaVersion: 1, storage: ["localStorage (game-owned)"], workers: ["Preserved worker files when present"], audio: true, cleanup: ["iframe teardown", "event listener cleanup", "worker termination where applicable"], tests: ["raw static HTML smoke test", "Next.js iframe shell smoke test", "bundle parity verification"] }]));
export const getGameManifest = (slug: string) => gameManifests[slug];

/**
 * Slugs with a hand-written static guide at /games/<slug>/guide.html.
 * Centralized here (verified against public/games/<slug>/guide.html on
 * disk) so the detail page and the play shell can never drift apart.
 */
const GAMES_WITH_GUIDES: ReadonlySet<string> = new Set([
  "demolichdom",
  "discoveramerica",
  "fridgesimulator",
  "serversavershield",
]);

export const hasGameGuide = (slug: string): boolean => GAMES_WITH_GUIDES.has(slug);

export const gameGuidePath = (slug: string): string | null =>
  hasGameGuide(slug) ? `/games/${slug}/guide.html` : null;
