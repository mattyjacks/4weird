import type { GameSpotlight } from "@/content/game-spotlights/spotlight";
import { GROUP_01_SPOTLIGHTS } from "@/content/game-spotlights/group-01";
import { GROUP_02_SPOTLIGHTS } from "@/content/game-spotlights/group-02";
import { GROUP_03_SPOTLIGHTS } from "@/content/game-spotlights/group-03";
import { GROUP_04_SPOTLIGHTS } from "@/content/game-spotlights/group-04";
import { GROUP_05_SPOTLIGHTS } from "@/content/game-spotlights/group-05";
import { GROUP_06_SPOTLIGHTS } from "@/content/game-spotlights/group-06";
import { GROUP_07_SPOTLIGHTS } from "@/content/game-spotlights/group-07";
import { GROUP_08_SPOTLIGHTS } from "@/content/game-spotlights/group-08";

/**
 * Merged per-game spotlight index (SEO differentiation layer).
 *
 * Static data only (no dynamic APIs), so it is safe to read inside
 * "use cache" scopes on /games/<slug> detail pages. Returns undefined
 * for slugs without a spotlight (e.g. static-only routes); callers
 * must render nothing in that case rather than fallback copy.
 */
const TABLE: Record<string, GameSpotlight> = {};

for (const entry of [
  ...GROUP_01_SPOTLIGHTS,
  ...GROUP_02_SPOTLIGHTS,
  ...GROUP_03_SPOTLIGHTS,
  ...GROUP_04_SPOTLIGHTS,
  ...GROUP_05_SPOTLIGHTS,
  ...GROUP_06_SPOTLIGHTS,
  ...GROUP_07_SPOTLIGHTS,
  ...GROUP_08_SPOTLIGHTS,
]) {
  TABLE[entry.slug] = entry;
}

export function getGameSpotlight(slug: string): GameSpotlight | undefined {
  return TABLE[slug];
}

export function gameSpotlightSlugs(): string[] {
  return Object.keys(TABLE);
}
