/**
 * VocRehab roleplay engine (Suite B interview rehearsal) — PURE module.
 *
 * Zero I/O, zero imports, SSR-safe: safe for client components, API routes,
 * and the verifier. The scripted fallback below is the v1 baseline so a
 * reviewer can rehearse end-to-end with zero API keys configured; any future
 * model call lives in `app/api/vocrehab/roleplay/route.ts` behind the same
 * contract and the same blocklist.
 *
 * Content bindings honored here:
 * - §5.3 pivot: accountability-forward, short, no graphic detail, no legal
 *   claims, never asks for case numbers / charges / court identifiers.
 * - §5.4 disclosure: the AI never pressures disclosure; not-disclosing is a
 *   valid ending (see disclosure follow-ups + system prompt).
 * - §5.6.2 feedback: praise quotes the user's own words; tweak offers one
 *   rewritten sentence (never a command); invitation invites a retry.
 *   Feedback targets phrasing choices, never accent, dialect, speech
 *   pattern, or disability.
 * - §5.6.4 safety: `vocrehabBlocklistCheck` screens legal conclusions,
 *   medical conclusions, benefits guarantees, and identifier requests
 *   before any reply renders.
 */

/** Rehearsal scenarios: `prep | pivot | disclosure` (§5.6.1). */
export type VocrehabRoleplayScenarioId = "prep" | "pivot" | "disclosure";

export interface VocrehabRoleplayScenario {
  id: VocrehabRoleplayScenarioId;
  /** Short label for pickers and headings. */
  title: string;
  /** Who the AI plays in this rehearsal. */
  persona: string;
  /** Hiring-manager opener shown when a rehearsal starts. */
  opener: string;
  /** One-line hint shown under the scenario picker. */
  hint: string;
  /** Exactly 3 rotating scripted follow-ups (fail-open manager, §5.6.1.3). */
  followUps: [string, string, string];
}

/** Per-rehearsal turn cap (§5.6.1.2). After this many user turns the panel wraps. */
export const vocrehabRoleplayTurnCap = 6;

/** Max user message length (mirrors `vocrehab_roleplay_turns.text` check). */
export const vocrehabRoleplayMaxMessageChars = 2000;

/** Counselor-reviewed scenario catalog. Model-generated scenario text is banned in v1. */
export const vocrehabRoleplayScenarios: VocrehabRoleplayScenario[] = [
  {
    id: "prep",
    title: "Interview practice",
    persona: "Neutral, encouraging hiring manager",
    opener:
      "Thanks for coming in. To start, tell me a little about yourself and why this role interests you.",
    hint: "Practice any interview question out loud — chat or voice.",
    followUps: [
      "Thanks — I heard a clear strength in there. Can you give me one short example of you using it at work, volunteering, or training?",
      "Good detail. Now the follow-up managers love: what was one challenge in that example, and what did you do next?",
      "Strong finish coming together. Last one: why does this particular role fit you right now — one or two sentences?",
    ],
  },
  {
    id: "pivot",
    title: "Background pivot",
    persona: "Neutral hiring manager asking the hard question once, kindly",
    opener:
      "I see a gap in your work history on your application. Can you tell me about that time in a few sentences?",
    hint: "Short, accountability-forward, ends on the present. No detail beyond one neutral line.",
    followUps: [
      "Thank you for sharing that. What changed for you since then — one concrete step, like training, steady work, or support you use?",
      "That helps me understand the growth. What is true about you now as a worker — reliability, skills, or supports — in two sentences?",
      "Good — short and forward-looking. Want to try the full 3-sentence shape once more: one neutral line, what changed, what is true now?",
    ],
  },
  {
    id: "disclosure",
    title: "Disclosure + accommodation ask",
    persona: "Neutral manager receiving a disclosure practice run",
    opener:
      "Thanks for sharing — what would help you do your best work here? Take your time; share only what you are comfortable sharing.",
    hint: "You own every word. Not disclosing now is always a valid ending.",
    followUps: [
      "Got it — so the accommodation that helps is clear. Can you add one sentence on how it helps you do the role well?",
      "That makes sense. If I looked confused as a manager, how would you rephrase the ask in one plain sentence?",
      "Well said. And remember: choosing not to disclose right now is completely valid too — want to practice that closing line once?",
    ],
  },
];

/** Look up a scenario; falls back to `prep` for unknown ids (fail-open, never throws). */
export function vocrehabRoleplayScenarioFor(
  scenario: string,
): VocrehabRoleplayScenario {
  const found = vocrehabRoleplayScenarios.find((s) => s.id === scenario);
  return found ?? vocrehabRoleplayScenarios[0];
}

/**
 * System prompt per scenario for the (stubbed) model call.
 * Persona + boundaries + turn cap; the route sends this only when a provider
 * is configured AND the Valley-Net stub + blocklist both pass.
 */
export function vocrehabRoleplaySystemPrompt(
  scenario: VocrehabRoleplayScenarioId,
): string {
  const base = [
    "You are a neutral, encouraging hiring manager helping someone rehearse for a job interview.",
    "Keep every reply under 60 words, plain language (grade 6-8), one question at a time.",
    `This rehearsal ends after ${vocrehabRoleplayTurnCap} user turns with a warm wrap-up and a retry offer.`,
    "Never give legal advice, medical conclusions, or benefits guarantees.",
    "Never ask for case numbers, charges in detail, court identifiers, SSNs, claim numbers, or dates of birth.",
    "Feedback targets phrasing choices only — never accent, dialect, speech pattern, or disability.",
  ];
  if (scenario === "pivot") {
    base.push(
      "PIVOT RULES (binding): keep answers accountability-forward, growth-framed, and short (30-60 seconds spoken).",
      "Accept one neutral line about the past, then steer to what changed and what is true now. Never probe for graphic detail or legal specifics.",
    );
  }
  if (scenario === "disclosure") {
    base.push(
      "DISCLOSURE RULES (binding): never pressure disclosure. If the user chooses not to disclose, affirm it as a valid ending and offer the line: “I will follow up if a need arises.”",
      "Practice the accommodation ask: 2-sentence disclosure + 1-sentence request + 1-sentence benefit.",
    );
  }
  return base.join(" ");
}

/**
 * Scripted fallback manager: rotating follow-up per scenario (§5.6.1.3).
 * `turn` is the zero-based user-turn index; rotation is `turn mod 3`.
 * Pure + total: any scenario/turn returns a seed line, rehearsal never bricks.
 */
export function vocrehabRoleplayFallback(
  scenario: VocrehabRoleplayScenarioId | string,
  turn: number,
): string {
  const index =
    Number.isFinite(turn) && turn >= 0 ? Math.floor(turn) % 3 : 0;
  return vocrehabRoleplayScenarioFor(scenario).followUps[index];
}

/** Encouraging feedback shape (§5.6.2): praise, tweak, invitation. */
export interface VocrehabRoleplayFeedback {
  praise: string;
  tweak: string;
  invitation: string;
}

const vocrehabFeedbackInvitations = [
  "Want to try that tweak out loud?",
  "Want to give that line one more run?",
  "Want to rehearse that version together?",
] as const;

/** Quote the user's own words back (first ~12 words) for the praise line. */
function vocrehabQuoteUserWords(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 12).join(" ");
  return words.length > 160 ? `${words.slice(0, 157)}…` : words;
}

const vocrehabFeedbackTweaks: Record<VocrehabRoleplayScenarioId, string> = {
  prep: "Try ending on one concrete example — for instance: “One time I … and the result was ….”",
  pivot:
    "Try the 3-sentence shape: one neutral line about the past, one on what changed, one on what is true now — for instance: “That period taught me …; since then I …; today I ….”",
  disclosure:
    "Try the ask shape: what helps, plus one benefit line — for instance: “It helps to have …; that helps me do … well.”",
};

/**
 * Counselor-reviewed feedback rubric (§5.6.2): one praise quoting the user's
 * own words, one tweak offering a rewritten sentence (never a command), one
 * invitation to retry. Never mentions accent, dialect, or speech patterns.
 */
export function vocrehabFeedbackRubric(
  text: string,
  scenario: VocrehabRoleplayScenarioId | string,
): VocrehabRoleplayFeedback {
  const trimmed = text.trim().slice(0, vocrehabRoleplayMaxMessageChars);
  const key: VocrehabRoleplayScenarioId =
    scenario === "pivot" || scenario === "disclosure" ? scenario : "prep";
  const invitation =
    vocrehabFeedbackInvitations[trimmed.length % vocrehabFeedbackInvitations.length];
  return {
    praise: `What landed: “${vocrehabQuoteUserWords(trimmed)}” — clear and in your own voice.`,
    tweak: `One tweak to try: ${vocrehabFeedbackTweaks[key]}`,
    invitation,
  };
}

/** Blocklist verdict (§5.6.4.2). */
export interface VocrehabBlocklistResult {
  blocked: boolean;
  /** Machine-stable reason category, or null when clean. */
  reason: string | null;
}

const vocrehabBlocklistPatterns: Array<{ reason: string; test: RegExp }> = [
  {
    reason: "legal-conclusion",
    test: /\b(you (will|would) win|legally entitled|you have a (case|lawsuit)|sue (them|your employer)|lawsuit (will|would)|expunge|legal advice)\b/i,
  },
  {
    reason: "medical-conclusion",
    test: /\b(you have|you suffer from|diagnos(e|is|ed|ing) (you|with)|your disability is|medical (advice|conclusion))\b/i,
  },
  {
    reason: "benefits-guarantee",
    test: /\b(you will receive \$|guaranteed benefits|your (ssi|ssdi) will be|promise(d)? (you|of) \$\d|benefit amount (will|is) \$)\b/i,
  },
  {
    reason: "identifier-request",
    test: /(\bcase number\b|\bclaim number\b|\bcharges?\b.*\b(detail|specific|list)\b|\bwhat were you charged\b|\bcourt (date|docket|case)\b|\bssn\b|\bsocial security number\b|\bdate of birth\b|\bd\.?o\.?b\.?\b|\d{3}-\d{2}-\d{4}|\b\d{9}\b)/i,
  },
];

/**
 * VocRehab-specific output/input screen (§5.6.4.2). Returns the first
 * matching category; clean text returns `{ blocked: false, reason: null }`.
 * Callers fall back to the scripted manager line on `blocked: true`.
 */
export function vocrehabBlocklistCheck(text: string): VocrehabBlocklistResult {
  const input = typeof text === "string" ? text : "";
  for (const { reason, test } of vocrehabBlocklistPatterns) {
    if (test.test(input)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false, reason: null };
}
