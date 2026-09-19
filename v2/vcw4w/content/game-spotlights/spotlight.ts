/**
 * Shared contract for per-game spotlight content (SEO differentiation).
 *
 * Each catalog game gets one GameSpotlight: long-form unique prose rendered
 * SSR on its /games/<slug> detail page. HARD RULE: no em-dash character
 * (U+2014) anywhere in this content. Use commas, colons, or periods.
 */
export type GameSpotlightFaq = {
  q: string;
  a: string;
};

export type GameSpotlight = {
  /** Catalog slug from content/games.ts (exact match). */
  slug: string;
  /** 3+ paragraphs, each 60-100 words, unique to this game. 200+ words total. */
  about: string[];
  /** 3+ Q/A pairs, answers 40-70 words each, unique to this game. */
  faq: GameSpotlightFaq[];
};
