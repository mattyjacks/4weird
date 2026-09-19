/**
 * Shared contract for per-lesson course overview content (SEO differentiation).
 *
 * Each /vocrehab/course/<module> page gets one CourseOverview: long-form
 * unique prose rendered SSR above the interactive lesson player.
 * HARD RULE: no em-dash character (U+2014) anywhere in this content.
 * Use commas, colons, or periods.
 */
export type CourseOverviewFaq = {
  q: string;
  a: string;
};

export type CourseOverview = {
  /** Module slug from vocrehab-course-catalog.ts (exact match). */
  slug: string;
  /** 3 paragraphs, each 60-100 words, unique to this lesson. 200+ words total. */
  overview: string[];
  /** 4-6 practical steps unique to this lesson. */
  steps: string[];
  /** 2 Q/A pairs, answers 40-70 words each, unique to this lesson. */
  faq: CourseOverviewFaq[];
};
