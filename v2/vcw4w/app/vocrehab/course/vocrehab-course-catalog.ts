import type { VocrehabCourseModule } from "@/types/vocrehab-course";

/**
 * The 14 bite-size modules (plan section 8.1). Single source of truth for
 * the course outline page and the per-module lesson player. Every try-it
 * href points at a real shipped route — guests can play the whole course
 * with zero DB writes; progress stays in localStorage until sign-in.
 */
export const vocrehabCourseCatalog: readonly VocrehabCourseModule[] = [
  {
    vocrehabSlug: "welcome",
    vocrehabChapter: 1,
    vocrehabChapterTitle: "Discover",
    vocrehabTitle: "Welcome + How This Course Works",
    vocrehabExplainer:
      "Nothing here is a test. You play short work scenarios, rehearse conversations out loud, and sketch decisions visually. Retry anything, take extra time whenever you want, and save only what you choose.",
    vocrehabTryIt: { vocrehabLabel: "Tour Discover", vocrehabHref: "/vocrehab/discover" },
    vocrehabReflect: [
      "What kind of work sounds good right now, in your own words?",
      "What usually gets in the way — and what help has worked before?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "Ready With Supports",
    vocrehabKind: "lesson",
  },
  {
    vocrehabSlug: "know-strengths",
    vocrehabChapter: 1,
    vocrehabChapterTitle: "Discover",
    vocrehabTitle: "Know Your Strengths",
    vocrehabExplainer:
      "Sorting files and triaging messages shows real strengths: speed, accuracy, recovery after mistakes, and asking for help. Your play becomes your profile — strengths first, never labels.",
    vocrehabTryIt: { vocrehabLabel: "Play File Sort", vocrehabHref: "/vocrehab/play/file-sort" },
    vocrehabReflect: [
      "What part of sorting felt easiest — speed, accuracy, or bouncing back?",
      "What support would make office tasks smoother for you?",
    ],
    vocrehabXp: 25,
    vocrehabBadge: "First Sort",
    vocrehabKind: "game",
  },
  {
    vocrehabSlug: "barriers-supports",
    vocrehabChapter: 1,
    vocrehabChapterTitle: "Discover",
    vocrehabTitle: "Name Barriers, Map Supports",
    vocrehabExplainer:
      "Late buses, shift swaps, tough tools — barriers show up inside real stories, not cold checklists. Walk a scenario run and each barrier maps to two or three concrete strategies with exit ramps.",
    vocrehabTryIt: { vocrehabLabel: "Play Barrier Run", vocrehabHref: "/vocrehab/play/barrier-run" },
    vocrehabReflect: [
      "Which barrier in the story felt most familiar?",
      "Which strategy would you actually try first?",
    ],
    vocrehabXp: 25,
    vocrehabBadge: "Path Finder",
    vocrehabKind: "game",
  },
  {
    vocrehabSlug: "pick-direction",
    vocrehabChapter: 1,
    vocrehabChapterTitle: "Discover",
    vocrehabTitle: "Pick a Direction",
    vocrehabExplainer:
      "A goal fits when it matches your observed strengths plus your own notes about local hiring. No labor-market predictions here — just an honest alignment map you build with your counselor.",
    vocrehabTryIt: { vocrehabLabel: "Check goal alignment", vocrehabHref: "/vocrehab/discover/goals" },
    vocrehabReflect: [
      "What goal are you leaning toward, and why that one?",
      "What is one thing you know about hiring near you?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "Schedule Solver",
    vocrehabKind: "lesson",
  },
  {
    vocrehabSlug: "interview-basics",
    vocrehabChapter: 2,
    vocrehabChapterTitle: "Tell Your Story",
    vocrehabTitle: "Interview Basics",
    vocrehabExplainer:
      "Pick a job goal, get five tailored practice questions, then rehearse each one with the AI hiring manager by text or voice. Feedback quotes your own words: one praise, one tweak, one invitation to retry.",
    vocrehabTryIt: { vocrehabLabel: "Generate my questions", vocrehabHref: "/vocrehab/interview/prep" },
    vocrehabReflect: [
      "Which question worries you most — and what is one true story that answers it?",
      "What does a good answer sound like in your own voice?",
    ],
    vocrehabXp: 25,
    vocrehabBadge: "Out-Loud",
    vocrehabKind: "roleplay",
  },
  {
    vocrehabSlug: "the-pivot",
    vocrehabChapter: 2,
    vocrehabChapterTitle: "Tell Your Story",
    vocrehabTitle: "The Pivot",
    vocrehabExplainer:
      "A background question gets a short, growth-framed answer: one neutral line about what happened, what changed, what is true now. Thirty to sixty seconds, ending on your skills and reliability.",
    vocrehabTryIt: { vocrehabLabel: "Build my pivot", vocrehabHref: "/vocrehab/interview/pivot" },
    vocrehabReflect: [
      "What changed since then — one concrete fact?",
      "What is true about your work ethic right now?",
    ],
    vocrehabXp: 25,
    vocrehabBadge: "Out-Loud",
    vocrehabKind: "roleplay",
  },
  {
    vocrehabSlug: "the-ask",
    vocrehabChapter: 2,
    vocrehabChapterTitle: "Tell Your Story",
    vocrehabTitle: "The Ask",
    vocrehabExplainer:
      "Disclosure is a decision first, wording second. Walk the timing map, then build a two-sentence disclosure plus a one-sentence accommodation request — and rehearse it, including the confused-manager branch.",
    vocrehabTryIt: { vocrehabLabel: "Build my script", vocrehabHref: "/vocrehab/interview/disclosure" },
    vocrehabReflect: [
      "When would sharing help you do the job well — now, later, or not at all?",
      "What one accommodation would make the biggest difference?",
    ],
    vocrehabXp: 25,
    vocrehabBadge: "Out-Loud",
    vocrehabKind: "roleplay",
  },
  {
    vocrehabSlug: "paper-trail",
    vocrehabChapter: 2,
    vocrehabChapterTitle: "Tell Your Story",
    vocrehabTitle: "Paper Trail",
    vocrehabExplainer:
      "Volunteer shifts, caregiving, gigs, training — it all counts. Build a structured resume from your goals plus the strengths your play already showed, then download or print it. Nothing submits itself anywhere.",
    vocrehabTryIt: { vocrehabLabel: "Build my resume", vocrehabHref: "/vocrehab/interview/resume" },
    vocrehabReflect: [
      "What experience are you proudest of, paid or unpaid?",
      "Which strength from your games belongs on page one?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "My Decision",
    vocrehabKind: "lesson",
  },
  {
    vocrehabSlug: "money-maps",
    vocrehabChapter: 3,
    vocrehabChapterTitle: "Decide With Confidence",
    vocrehabTitle: "Money Maps",
    vocrehabExplainer:
      "Move two sliders — hourly wage and hours per week — and watch an educational sketch of how earnings relate to SSI. Estimate only, 2026 parameters, never benefits advice. Confirm everything with a benefits counselor.",
    vocrehabTryIt: { vocrehabLabel: "Open the SSI slider", vocrehabHref: "/vocrehab/decide/ssi" },
    vocrehabReflect: [
      "What hours feel sustainable for you in a real week?",
      "Who could you review these numbers with before deciding?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "Money Mapper",
    vocrehabKind: "slider",
  },
  {
    vocrehabSlug: "when-to-share",
    vocrehabChapter: 3,
    vocrehabChapterTitle: "Decide With Confidence",
    vocrehabTitle: "When To Share",
    vocrehabExplainer:
      "Before applying, at the interview, after the offer, on the job, or not now — every timing has tradeoffs. Walk the choose-your-own-adventure map; every node ends with a script starter and an exit ramp.",
    vocrehabTryIt: { vocrehabLabel: "Walk the map", vocrehabHref: "/vocrehab/decide/disclosure-paths" },
    vocrehabReflect: [
      "Which timing node felt safest, and which felt hardest?",
      "What would you need to feel ready for the hard one?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "Path Finder",
    vocrehabKind: "adventure",
  },
  {
    vocrehabSlug: "decision-one-pager",
    vocrehabChapter: 3,
    vocrehabChapterTitle: "Decide With Confidence",
    vocrehabTitle: "My Decision One-Pager",
    vocrehabExplainer:
      "Pull it together: your goal, your supports, your disclosure timing, your money sketch. Export the combined page as clean JSON and bring it to your counselor — one page, your words.",
    vocrehabTryIt: { vocrehabLabel: "Export my data", vocrehabHref: "/vocrehab/export" },
    vocrehabReflect: [
      "What is your decision for now — in one sentence?",
      "What would make you revisit it?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "My Decision",
    vocrehabKind: "lesson",
  },
  {
    vocrehabSlug: "what-ipes-are",
    vocrehabChapter: 4,
    vocrehabChapterTitle: "Work With Your Counselor",
    vocrehabTitle: "What IPEs Are",
    vocrehabExplainer:
      "An Individualized Plan for Employment turns your strengths, interests, and support needs into three suggested employment goals. Your game-observed signals prefill the draft; you edit in plain language; your counselor approves.",
    vocrehabTryIt: { vocrehabLabel: "See the IPE builder", vocrehabHref: "/vocrehab/discover/ipe" },
    vocrehabReflect: [
      "Which of your strengths should your plan lead with?",
      "What support needs must be written down, not assumed?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "Ready With Supports",
    vocrehabKind: "lesson",
  },
  {
    vocrehabSlug: "how-sessions-help",
    vocrehabChapter: 4,
    vocrehabChapterTitle: "Work With Your Counselor",
    vocrehabTitle: "How Sessions Help",
    vocrehabExplainer:
      "With your consent, one session's notes become four reviewable drafts: a case note, a progress measure, a coaching rationale, and outreach when relevant. Your counselor approves, edits, or discards each box. Nothing files itself.",
    vocrehabTryIt: { vocrehabLabel: "See session help", vocrehabHref: "/vocrehab/pro/sessions" },
    vocrehabReflect: [
      "What would you want your counselor to get right about you?",
      "What should never be written down without asking you first?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "Ready With Supports",
    vocrehabKind: "lesson",
  },
  {
    vocrehabSlug: "next-3-steps",
    vocrehabChapter: 4,
    vocrehabChapterTitle: "Work With Your Counselor",
    vocrehabTitle: "My Next 3 Steps",
    vocrehabExplainer:
      "Finish with three concrete next steps and a measurable progress line each: what you will do, in what context, with what supports, measured by what evidence. Small, dated, reviewable.",
    vocrehabTryIt: { vocrehabLabel: "See progress measures", vocrehabHref: "/vocrehab/pro/measures" },
    vocrehabReflect: [
      "What are your next 3 steps — specific enough to calendar?",
      "How will you know each one worked?",
    ],
    vocrehabXp: 10,
    vocrehabBadge: "Ready With Supports",
    vocrehabKind: "lesson",
  },
];

export function vocrehabFindCatalogModule(
  vocrehabSlug: string,
): VocrehabCourseModule | null {
  return vocrehabCourseCatalog.find((m) => m.vocrehabSlug === vocrehabSlug) ?? null;
}

export function vocrehabCatalogSlugs(): string[] {
  return vocrehabCourseCatalog.map((m) => m.vocrehabSlug);
}
