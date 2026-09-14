/**
 * VocRehab discovery + assessment helpers (CHEAP-mode lane, envelope DS-VOCREHAB-03).
 *
 * Pure module: zero I/O, zero imports, safe for client + server.
 * No browser globals at module top. All copy is strengths-first and
 * phrased as supports-not-scores per plan §4.4.
 *
 * Minimal Vocrehab-prefixed interfaces live here on purpose: sibling-owned
 * `@/types/vocrehab-*` files may not exist (or may change under another
 * lane), so this file is self-contained.
 */

export type VocrehabBarrierId =
  | "transport"
  | "schedule"
  | "disclosure"
  | "at"
  | "benefits"
  | "rest"
  | "childcare";

export interface VocrehabBarrierStrategy {
  barrier: VocrehabBarrierId;
  barrierLabel: string;
  title: string;
  steps: string[];
  handoff: string | null;
}

export type VocrehabReadinessBand = "exploring" | "supported" | "ready";

export interface VocrehabReadinessBandInfo {
  band: VocrehabReadinessBand;
  headline: string;
  whatItMeans: string;
  tryNext: string[];
}

export interface VocrehabAlignmentSignal {
  goalCategory: string;
  strengthTag: string;
  signal: "strong-fit" | "stretch" | "explore";
  reason: string;
}

export interface VocrehabRemoteReadinessInput {
  quietSpace: boolean;
  reliableInternet: boolean;
  device: boolean;
  backupPlan: boolean;
  fileSortCompleted: boolean;
  inboxCompleted: boolean;
  focusCompleted: boolean;
  keyboardOnly: boolean;
}

export interface VocrehabRemoteReadinessResult {
  band: VocrehabReadinessBand;
  supports: string[];
  accommodations: string[];
  summary: string;
}

export interface VocrehabProfileInput {
  strengths: string[];
  barriers: VocrehabBarrierId[];
  readinessBand: VocrehabReadinessBand;
  goalText: string;
  remoteBand: VocrehabReadinessBand | null;
}

export interface VocrehabSynthesizedProfile {
  strengths: string[];
  supports: string[];
  accommodations: string[];
  goals: string[];
  summary: string;
}

/** Barrier → 2–3 concrete strategies. Suggestions with exit ramps, never prescriptions. */
export const vocrehabBarrierStrategies: readonly VocrehabBarrierStrategy[] = [
  {
    barrier: "transport",
    barrierLabel: "Getting to work",
    title: "Backup ride plan",
    steps: [
      "Write down two ways to get to work (for example bus route + a backup ride).",
      "Save the backup number where you can find it fast on a work morning.",
      "Do one practice run before your first shift so the route feels familiar.",
    ],
    handoff: null,
  },
  {
    barrier: "transport",
    barrierLabel: "Getting to work",
    title: "Ask about schedule-shifted starts",
    steps: [
      "If the bus runs late, ask whether a 15-minute later start is possible.",
      "Offer the trade: stay 15 minutes later to cover the same hours.",
    ],
    handoff: null,
  },
  {
    barrier: "schedule",
    barrierLabel: "Schedule conflicts",
    title: "Shift-swap script",
    steps: [
      "Keep one short swap request ready: what shift, what day, what you offer back.",
      "Ask early in the week, not the morning of.",
      "Confirm the swap in writing so both people remember.",
    ],
    handoff: null,
  },
  {
    barrier: "schedule",
    barrierLabel: "Schedule conflicts",
    title: "Weekly planning habit",
    steps: [
      "Lay out work, transport, rest, and family needs on one 7-day view each Sunday.",
      "Flag clashes early and bring one suggested fix to your supervisor.",
    ],
    handoff: null,
  },
  {
    barrier: "disclosure",
    barrierLabel: "Whether to share disability information",
    title: "Disclosure timing options",
    steps: [
      "You can share before applying, at interview, after an offer, on the job — or not now.",
      "Try the disclosure helper to walk each path before you decide anything.",
      "Whatever you choose, keep a one-sentence version ready in your own words.",
    ],
    handoff: null,
  },
  {
    barrier: "disclosure",
    barrierLabel: "Whether to share disability information",
    title: "One-sentence accommodation ask",
    steps: [
      "Shape: what helps + what it lets you do well (for example: written instructions help me start tasks confidently).",
      "Practice it out loud once with the interview rehearsal partner.",
    ],
    handoff: null,
  },
  {
    barrier: "at",
    barrierLabel: "Tools and technology access",
    title: "Assistive technology trial",
    steps: [
      "List the one task that feels hardest with current tools.",
      "Ask your counselor about a trial of one tool for that task (screen reader, magnifier, speech input).",
      "Trial one tool at a time for two weeks, then keep what helps.",
    ],
    handoff: null,
  },
  {
    barrier: "at",
    barrierLabel: "Tools and technology access",
    title: "Keyboard-path check",
    steps: [
      "If you completed a game keyboard-only, ask that training materials keep keyboard paths.",
      "Request written steps alongside any video training.",
    ],
    handoff: null,
  },
  {
    barrier: "benefits",
    barrierLabel: "Worry about benefits and earnings",
    title: "Benefits-counseling referral note",
    steps: [
      "Bring your questions to a benefits counselor (WIPA, SOAR, or your VR counselor) before deciding.",
      "Try the SSI sketch first so you arrive with a rough picture of your hours and wage.",
    ],
    handoff: "Benefits counseling referral — a person, not an answer from this page.",
  },
  {
    barrier: "rest",
    barrierLabel: "Stamina and rest needs",
    title: "Rest-break request shape",
    steps: [
      "Name the break plainly: a short seated break every two hours keeps output steady.",
      "Tie it to the work: breaks help you finish the shift strong.",
      "Put the agreed pattern in writing with your supervisor.",
    ],
    handoff: null,
  },
  {
    barrier: "rest",
    barrierLabel: "Stamina and rest needs",
    title: "Energy-mapping week",
    steps: [
      "For one week, note which hours feel strongest.",
      "Ask for shifts or training blocks inside your strong hours when possible.",
    ],
    handoff: null,
  },
  {
    barrier: "childcare",
    barrierLabel: "Childcare and family care",
    title: "Care-coverage map",
    steps: [
      "List coverage for each work hour, plus one backup name per day.",
      "Share only the schedule outcome with your employer, not family details.",
    ],
    handoff: null,
  },
];

/** Readiness bands: supports-first language. Numbers stay behind an explainer. */
export const vocrehabReadinessBands: readonly VocrehabReadinessBandInfo[] = [
  {
    band: "exploring",
    headline: "Exploring — learning what fits",
    whatItMeans:
      "You are still discovering which tasks feel good and which need supports. That is exactly what this stage is for.",
    tryNext: [
      "Play one more practice round of any game with no timer.",
      "Name one barrier above and try its first strategy step.",
    ],
  },
  {
    band: "supported",
    headline: "Supported — ready with the right setup",
    whatItMeans:
      "You show steady strengths and you know which supports help. Many people do their best work in this band — support is normal.",
    tryNext: [
      "Send a game run to your profile so you and your counselor can plan together.",
      "Pick one accommodation conversation to rehearse out loud.",
    ],
  },
  {
    band: "ready",
    headline: "Ready — steady across the board",
    whatItMeans:
      "You completed tasks steadily and bounced back from snags. Keep your supports listed anyway — everyone works better with them named.",
    tryNext: [
      "Check goal alignment to match strengths to a job direction.",
      "Start interview rehearsal for your top goal.",
    ],
  },
];

function vocrehabBandForScore(score: number): VocrehabReadinessBand {
  if (score >= 5) return "ready";
  if (score >= 3) return "supported";
  return "exploring";
}

export function vocrehabBandInfo(band: VocrehabReadinessBand): VocrehabReadinessBandInfo {
  const found = vocrehabReadinessBands.find((b) => b.band === band);
  if (!found) return vocrehabReadinessBands[0];
  return found;
}

/** Goal category → observed-strength tags. Compares goals to strengths + the
 *  user's own market notes; never automated hiring prediction. */
export const vocrehabAlignmentMap: readonly VocrehabAlignmentSignal[] = [
  {
    goalCategory: "office",
    strengthTag: "sorting",
    signal: "strong-fit",
    reason: "File Sort showed careful organizing — office tasks use that same muscle.",
  },
  {
    goalCategory: "office",
    strengthTag: "writing",
    signal: "strong-fit",
    reason: "Inbox Sprint showed clear written replies — office communication builds on that.",
  },
  {
    goalCategory: "retail",
    strengthTag: "refocus",
    signal: "strong-fit",
    reason: "Focus Shift showed steady refocus after interruptions — retail floors interrupt constantly.",
  },
  {
    goalCategory: "warehouse",
    strengthTag: "stamina",
    signal: "stretch",
    reason: "Warehouse work rewards stamina — pair it with the rest-break plan and an energy-mapping week.",
  },
  {
    goalCategory: "remote",
    strengthTag: "sorting",
    signal: "strong-fit",
    reason: "Remote file and message work leans on the same sorting and triage strengths the games observed.",
  },
  {
    goalCategory: "food-service",
    strengthTag: "refocus",
    signal: "stretch",
    reason: "Food service is interruption-heavy — your refocus practice is the right prep; ask about quiet-corner training.",
  },
  {
    goalCategory: "healthcare-support",
    strengthTag: "writing",
    signal: "stretch",
    reason: "Clear notes matter here — keep practicing short written updates and ask about training supports.",
  },
  {
    goalCategory: "other",
    strengthTag: "steady",
    signal: "explore",
    reason: "An unusual goal deserves a counselor conversation — bring your strengths list and market notes together.",
  },
];

export function vocrehabSignalsFor(
  goalCategory: string,
  strengthTags: readonly string[],
): VocrehabAlignmentSignal[] {
  const norm = goalCategory.trim().toLowerCase();
  const hits = vocrehabAlignmentMap.filter(
    (s) => s.goalCategory === norm && strengthTags.indexOf(s.strengthTag) >= 0,
  );
  if (hits.length > 0) return [...hits];
  const fallback = vocrehabAlignmentMap.filter((s) => s.goalCategory === norm);
  if (fallback.length > 0) return [...fallback];
  return vocrehabAlignmentMap.filter((s) => s.goalCategory === "other");
}

/** Remote verdict from the telemetry triple + environment self-check. */
export function vocrehabRemoteReadiness(input: VocrehabRemoteReadinessInput): VocrehabRemoteReadinessResult {
  const envScore =
    (input.quietSpace ? 1 : 0) +
    (input.reliableInternet ? 1 : 0) +
    (input.device ? 1 : 0) +
    (input.backupPlan ? 1 : 0);
  const gameScore =
    (input.fileSortCompleted ? 1 : 0) + (input.inboxCompleted ? 1 : 0) + (input.focusCompleted ? 1 : 0);
  const band = vocrehabBandForScore(envScore + gameScore);
  const supports: string[] = [];
  if (!input.quietSpace) supports.push("A quieter corner or scheduled quiet hours for work blocks.");
  if (!input.reliableInternet) supports.push("A backup connection plan (phone hotspot, library hours).");
  if (!input.device) supports.push("A reliable device — ask your counselor about equipment options.");
  if (!input.backupPlan) supports.push("A written backup plan for outages (who to message, where to go).");
  if (gameScore < 3)
    supports.push("One more round of the remote-task games to show your remote strengths.");
  if (supports.length === 0)
    supports.push("Keep your current setup — review it again if anything changes at home.");
  const accommodations: string[] = [
    "Written instructions alongside any video training.",
    "A check-in buddy for the first two weeks of remote work.",
  ];
  if (input.keyboardOnly)
    accommodations.push("Keyboard-only paths in every work tool (you completed a run keyboard-only).");
  const info = vocrehabBandInfo(band);
  const summary =
    band === "ready"
      ? "Your setup and game runs point to remote-ready. Many people still thrive hybrid — that counts as a win."
      : band === "supported"
        ? `${info.headline}. ${info.whatItMeans} Start with the first support below.`
        : `${info.headline}. ${info.whatItMeans} Remote work stays on the table — build the setup one piece at a time.`;
  return { band, supports, accommodations, summary };
}

/** Strengths first, supports second, accommodations third. Never a score. */
export function vocrehabSynthesizeProfile(input: VocrehabProfileInput): VocrehabSynthesizedProfile {
  const strengths = input.strengths.length > 0 ? [...input.strengths] : ["Showed up and tried the tasks — that counts."];
  const supports: string[] = [];
  for (const barrier of input.barriers) {
    const strategies = vocrehabBarrierStrategies.filter((s) => s.barrier === barrier);
    if (strategies.length > 0) supports.push(`${strategies[0].barrierLabel}: ${strategies[0].title}.`);
  }
  const readiness = vocrehabBandInfo(input.readinessBand);
  supports.push(`Work readiness: ${readiness.headline}.`);
  const accommodations: string[] = [
    "Written steps for new tasks.",
    "A check-in buddy for the first weeks.",
  ];
  if (input.remoteBand === "supported" || input.remoteBand === "ready")
    accommodations.push("Remote or hybrid setup keeps the strengths shown in the remote-task games.");
  const goals =
    input.goalText.trim().length > 0
      ? [input.goalText.trim().slice(0, 200)]
      : ["Still exploring — pick one direction to try first."];
  const summary =
    `Strengths: ${strengths.join("; ")}. ` +
    `Supports that help: ${supports.join(" ")} ` +
    `Worth discussing: ${accommodations.join(" ")}`;
  return { strengths, supports, accommodations, goals, summary };
}
