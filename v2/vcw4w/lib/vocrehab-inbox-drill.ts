/**
 * VocRehab inbox-sprint phishing drill data + scorer (CHEAP-mode lane, envelope DS-VOCREHAB-V4).
 *
 * Pure module: zero I/O, zero imports, safe for client + server.
 * No browser globals at module top. All copy is strengths-first and
 * phrased as supports-not-scores (practice, not a test).
 *
 * Additive only: sibling C4-owned inbox-sprint component, frame, games
 * registry, and assessments route are NEVER imported here — this file is
 * self-contained so no other lane has to change. Event shapes below mirror
 * `vocrehab-game-inbox-sprint.tsx` structurally (action/error/complete with
 * plain detail objects).
 */

export type VocrehabInboxDrillVerdict = "legit" | "phish";

export type VocrehabInboxDrillAction = "reply" | "schedule" | "file" | "flag";

export interface VocrehabInboxDrillScenario {
  id: string;
  sender: string;
  subject: string;
  bodySnippet: string;
  verdict: VocrehabInboxDrillVerdict;
  safeAction: VocrehabInboxDrillAction;
  /** Strengths-first: line 1 affirms what the learner did well, later lines teach. */
  debrief: readonly string[];
}

export interface VocrehabInboxDrillAnswer {
  scenarioId: string;
  verdict: VocrehabInboxDrillVerdict;
  action: VocrehabInboxDrillAction;
}

export type VocrehabInboxDrillBand = "exploring" | "supported" | "ready";

export interface VocrehabInboxDrillResult {
  total: number;
  verdictHits: number;
  actionHits: number;
  band: VocrehabInboxDrillBand;
  strengths: string[];
  supports: string[];
  summary: string;
}

/** 12 drill scenarios: 7 phishing, 5 legitimate. Order is fixed; callers may shuffle a copy. */
export const vocrehabInboxDrillScenarios: readonly VocrehabInboxDrillScenario[] = [
  {
    id: "d1",
    sender: "IT-Support!",
    subject: "URGENT verify your password now",
    bodySnippet: "Your account will be locked! Click now to verify your password immediately.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You spotted the pressure tactic — urgency plus a link plus a password ask is the classic combo.",
      "Safe move: flag it and never click. Real IT will never ask for your password by email.",
    ],
  },
  {
    id: "d2",
    sender: "Supervisor",
    subject: "Shift starts 30 min early today",
    bodySnippet: "Heads up — today's shift starts at 8:30, not 9. Reply so I know you saw this.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "Good call treating a plain request from a known sender as real — no threats, no links, no asks for secrets.",
      "Safe move: reply so they know you saw it. Short confirmations keep the day smooth.",
    ],
  },
  {
    id: "d3",
    sender: "Payroll Dept",
    subject: "Update your direct deposit details",
    bodySnippet: "Our payment system changed. Confirm your bank login here so your pay is not delayed.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You noticed pay + a login link in one message — that pairing is almost always a trap, and spotting it is a real skill.",
      "Safe move: flag it, then check pay questions through the official payroll channel you already use.",
    ],
  },
  {
    id: "d4",
    sender: "Coworker",
    subject: "Swap Friday?",
    bodySnippet: "Can you take my Friday evening? I can take your Sunday morning. Let me know what works.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "Friendly tone, a concrete trade, no rush or links — reading that as a real coworker ask shows good judgment.",
      "Safe move: schedule a time to answer or propose. Putting it on the calendar beats keeping it in your head.",
    ],
  },
  {
    id: "d5",
    sender: "CEO",
    subject: "Quick favor — gift cards needed",
    bodySnippet: "I am in a meeting and need gift cards for client gifts. Buy 5 and send me the codes ASAP. Keep this between us.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You caught the secrecy + gift-card combo — no real boss asks for gift-card codes over email, and secrecy is the giveaway.",
      "Safe move: flag it. If you are ever unsure, ask that person face to face instead of replying.",
    ],
  },
  {
    id: "d6",
    sender: "Office",
    subject: "Fridge cleanout Friday",
    bodySnippet: "Label anything you want to keep by Friday. Unlabeled items will be tossed after lunch.",
    verdict: "legit",
    safeAction: "file",
    debrief: [
      "Low-stakes notice, no action demanded right now, nothing secret asked — filing it away is exactly right.",
      "Safe move: file FYI notes so your inbox stays clear for the messages that need answers.",
    ],
  },
  {
    id: "d7",
    sender: "ParcelTrack",
    subject: "Missed parcel — pay $2.49 redelivery fee",
    bodySnippet: "We tried to deliver twice. Pay the redelivery fee within 24 hours or your parcel returns to sender.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "Small fee + countdown is designed to make you click first and think later — pausing to question it is the win.",
      "Safe move: flag it. Track parcels only through the shop or carrier site you already trust.",
    ],
  },
  {
    id: "d8",
    sender: "New teammate",
    subject: "A request about how I work best",
    bodySnippet: "Hi — written instructions help me start tasks confidently. Could my training steps come in writing too? Please reply.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "A personal, specific request with no links or urgency — recognizing a real teammate moment like this matters.",
      "Safe move: reply kindly in a sentence or two. Clear and kind beats perfect wording every time.",
    ],
  },
  {
    id: "d9",
    sender: "HR Benefits",
    subject: "Benefits enrollment ends TODAY — confirm SSN",
    bodySnippet: "Final notice: confirm your full Social Security number now or lose coverage for the year.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "You treated a Social Security ask over email as a red flag — that instinct protects you in real life too.",
      "Safe move: flag it. HR never collects SSNs by email link; use the official benefits portal instead.",
    ],
  },
  {
    id: "d10",
    sender: "Payroll",
    subject: "Timesheet due Thursday",
    bodySnippet: "Submit hours by Thursday noon so pay is on time. Use the usual timesheet link on the intranet.",
    verdict: "legit",
    safeAction: "schedule",
    debrief: [
      "A routine deadline from a known sender pointing at the usual system — no secrets, no panic — is safe to act on.",
      "Safe move: schedule it (block Thursday morning) so pay stays on time without a last-minute rush.",
    ],
  },
  {
    id: "d11",
    sender: "coworker-docs-share",
    subject: "Shared file: Q3 rota (final)(1)",
    bodySnippet: "Someone shared a document with you. Sign in with your email password to view it.",
    verdict: "phish",
    safeAction: "flag",
    debrief: [
      "A look-alike sender name plus a password gate on a shared file — catching that mismatch is sharp work.",
      "Safe move: flag it. Open shared files only from the drive or app you normally use, never through the email link.",
    ],
  },
  {
    id: "d12",
    sender: "Client",
    subject: "Running late, need to reschedule",
    bodySnippet: "Something came up — can we move our 2pm to tomorrow? This needs an answer today.",
    verdict: "legit",
    safeAction: "reply",
    debrief: [
      "Time-sensitive but still a normal human ask — no links, no threats, no secrets. You read the tone correctly.",
      "Safe move: reply today with a new time. Fast, short answers build trust with clients.",
    ],
  },
];

function vocrehabDrillById(id: string): VocrehabInboxDrillScenario | null {
  for (const s of vocrehabInboxDrillScenarios) {
    if (s.id === id) return s;
  }
  return null;
}

/**
 * Score a completed drill. Pure + fail-open: unknown scenario ids are
 * ignored, missing answers count as missed, empty input yields the
 * exploring band with a gentle summary — never throws.
 */
export function vocrehabScoreInboxDrill(
  answers: readonly VocrehabInboxDrillAnswer[],
): VocrehabInboxDrillResult {
  const total = vocrehabInboxDrillScenarios.length;
  let verdictHits = 0;
  let actionHits = 0;
  let phishTotal = 0;
  let phishFlagged = 0;
  const seen = new Set<string>();

  for (const a of answers) {
    if (!a || seen.has(a.scenarioId)) continue;
    seen.add(a.scenarioId);
    const scenario = vocrehabDrillById(a.scenarioId);
    if (!scenario) continue;
    if (a.verdict === scenario.verdict) verdictHits += 1;
    if (a.action === scenario.safeAction) actionHits += 1;
    if (scenario.verdict === "phish") {
      phishTotal += 1;
      if (a.action === "flag") phishFlagged += 1;
    }
  }

  const correct = verdictHits + actionHits;
  const band: VocrehabInboxDrillBand =
    correct >= 20 ? "ready" : correct >= 14 ? "supported" : "exploring";

  const strengths: string[] = [];
  const supports: string[] = [];
  if (verdictHits > 0) {
    strengths.push(`Called ${verdictHits} of ${total} messages correctly as legit or phishing`);
  }
  if (phishFlagged > 0) {
    strengths.push(`Flagged ${phishFlagged} phishing message${phishFlagged === 1 ? "" : "s"} instead of engaging`);
  }
  if (actionHits === total && total > 0) {
    strengths.push("Picked the safe action on every message");
  }
  if (strengths.length === 0) {
    strengths.push("Showed up and practiced — every safe habit starts with one rep");
  }
  if (verdictHits < total) {
    supports.push("Slow down on urgency + links: threats with a countdown usually deserve a flag");
  }
  if (actionHits < total) {
    supports.push("When in doubt, flagging is always safe — nothing bad happens from a careful flag");
  }
  void phishTotal;

  const summary =
    `Phishing drill: ${verdictHits}/${total} calls right, ${actionHits}/${total} safe actions — ${band}. ` +
    (band === "ready"
      ? "Strong instincts: pressure, secrecy, and secret-asks are getting flagged."
      : band === "supported"
        ? "Solid progress: keep practicing the urgent-looking ones; flagging stays the safe default."
        : "Good first reps: retry anytime — flagging the pushy messages is the habit that protects you.");

  return { total, verdictHits, actionHits, band, strengths, supports, summary };
}
