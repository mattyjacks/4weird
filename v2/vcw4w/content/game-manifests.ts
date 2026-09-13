import { games, type Game } from "./games";
export type GameManifest = { slug: string; legacyPath: string; sourcePath: string; runtimePath: string; schemaVersion: number; storage: string[]; workers: string[]; audio: boolean; cleanup: string[]; tests: string[] };
export const gameManifests: Record<string, GameManifest> = Object.fromEntries(games.map((game: Game) => [game.slug, { slug: game.slug, legacyPath: game.legacyPath, sourcePath: `/games/html/${game.legacyPath}/`, runtimePath: game.runtimePath, schemaVersion: 1, storage: ["localStorage (game-owned)"], workers: ["Preserved worker files when present"], audio: true, cleanup: ["iframe teardown", "event listener cleanup", "worker termination where applicable"], tests: ["raw static HTML smoke test", "Next.js iframe shell smoke test", "bundle parity verification"] }]));
export const getGameManifest = (slug: string) => gameManifests[slug];

// Closed-catalog invariant (fails fast at import, mirroring content/games.ts):
// nested games (kouzi/*, madi/*) and DiscoverAmerica keep a legacyPath that
// differs from the slug, while the runtime is ALWAYS /games/<slug>/index.html.
// A slug/legacyPath/runtimePath drift here 404s inside the play iframe, so
// throw instead of serving a broken frame.
for (const [slug, manifest] of Object.entries(gameManifests)) {
  if (manifest.slug !== slug) throw new Error(`Manifest key/slug mismatch: ${slug}`);
  if (manifest.runtimePath !== `/games/${slug}/index.html`) throw new Error(`Invalid manifest runtimePath: ${slug} -> ${manifest.runtimePath}`);
  if (manifest.sourcePath !== `/games/html/${manifest.legacyPath}/`) throw new Error(`Invalid manifest sourcePath: ${slug}`);
}

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
