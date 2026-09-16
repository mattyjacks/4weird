/**
 * vocrehab-schedule-burdens — pure schedule-burden definitions + overlap checker.
 *
 * Pure module: no imports, no I/O, no Date.now(), no randomness.
 * Copy is strengths-first: every message names what is holding strong
 * before offering a gentle next step. Never "wrong" / "fail" language.
 */

export type BurdenId =
  | "fixed-appt"
  | "sleep-window"
  | "transit-gap"
  | "travel-buffer"
  | "rest-day"
  | "overtime-cap"
  | "family-floor"
  | "errand-quota"
  | "childcare-blackout"
  | "tz-meeting"
  | "weather"
  | "energy";

export interface BurdenDef {
  id: BurdenId;
  title: string;
  why: string;
  fixLabel: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export const BURDENS: BurdenDef[] = [
  {
    id: "fixed-appt",
    title: "Fixed appointment",
    why: "Your anchor commitments are holding strong — this block stays put while the rest flexes around it.",
    fixLabel: "Keep anchor, flex around it",
  },
  {
    id: "sleep-window",
    title: "Sleep window",
    why: "Your rest is protected — a well-guarded sleep window keeps every other win possible.",
    fixLabel: "Guard sleep window",
  },
  {
    id: "transit-gap",
    title: "Transit gap",
    why: "Your travel time counts as progress — give the trip its own breathing room.",
    fixLabel: "Add transit breathing room",
  },
  {
    id: "travel-buffer",
    title: "Travel buffer",
    why: "Your planning is already ahead — a small buffer keeps arrivals calm and on track.",
    fixLabel: "Add a calm-arrival buffer",
  },
  {
    id: "rest-day",
    title: "Rest day",
    why: "Your recovery time is a strength — a full rest day keeps the whole week sustainable.",
    fixLabel: "Protect a rest day",
  },
  {
    id: "overtime-cap",
    title: "Overtime cap",
    why: "Your focus time is valuable — a cap keeps extra hours a choice, not a drift.",
    fixLabel: "Cap extra hours",
  },
  {
    id: "family-floor",
    title: "Family floor",
    why: "Your people time is non-negotiable — a protected floor keeps connection steady.",
    fixLabel: "Protect family time",
  },
  {
    id: "errand-quota",
    title: "Errand quota",
    why: "Your errands are handled in batches — a quota keeps them tidy instead of scattered.",
    fixLabel: "Batch errands together",
  },
  {
    id: "childcare-blackout",
    title: "Childcare blackout",
    why: "Your coverage plan is solid — blackout windows keep pickups and dropoffs smooth.",
    fixLabel: "Hold coverage window",
  },
  {
    id: "tz-meeting",
    title: "Time-zone meeting",
    why: "Your cross-zone teamwork is a plus — a shared overlap hour keeps everyone fresh.",
    fixLabel: "Find a shared overlap hour",
  },
  {
    id: "weather",
    title: "Weather watch",
    why: "Your backup thinking is strong — a weather-aware plan B keeps outdoor plans safe.",
    fixLabel: "Line up a plan B",
  },
  {
    id: "energy",
    title: "Energy rhythm",
    why: "You know your peak hours — matching big tasks to high energy keeps wins coming.",
    fixLabel: "Match tasks to peak energy",
  },
];

const EASY_BURDENS: BurdenId[] = ["fixed-appt", "sleep-window", "rest-day"];

const MEDIUM_BURDENS: BurdenId[] = [
  ...EASY_BURDENS,
  "transit-gap",
  "travel-buffer",
  "family-floor",
  "errand-quota",
];

const HARD_BURDENS: BurdenId[] = BURDENS.map((b) => b.id);

/** Burden ids active at a given difficulty (cumulative: hard includes all). */
export function burdensForDifficulty(d: Difficulty): BurdenId[] {
  if (d === "easy") return [...EASY_BURDENS];
  if (d === "medium") return [...MEDIUM_BURDENS];
  return [...HARD_BURDENS];
}

/** Day-view event in minutes-since-midnight. */
export interface ScheduleEvent {
  id: string;
  startMin: number;
  endMin: number;
  title: string;
}

/** Plain-language overlap note + one-tap fix descriptor. */
export interface Conflict {
  burdenId: BurdenId;
  message: string;
  fixLabel: string;
}

function fixLabelFor(id: BurdenId): string {
  const def = BURDENS.find((b) => b.id === id);
  return def ? def.fixLabel : "Nudge one block";
}

function formatMin(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")}${suffix}`;
}

/**
 * Pure overlap checker for the day view. Returns one strengths-first
 * Conflict per overlapping event pair, ordered by earliest overlap start.
 * Degenerate or unscheduled blocks are simply skipped — never flagged.
 */
export function checkOverlaps(events: ScheduleEvent[]): Conflict[] {
  if (!Array.isArray(events)) return [];
  const usable = events.filter(
    (e) =>
      e &&
      typeof e.startMin === "number" &&
      typeof e.endMin === "number" &&
      Number.isFinite(e.startMin) &&
      Number.isFinite(e.endMin) &&
      e.endMin > e.startMin,
  );
  const sorted = [...usable].sort((a, b) => a.startMin - b.startMin);
  const conflicts: Conflict[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (b.startMin >= a.endMin) break;
      const overlapStart = Math.max(a.startMin, b.startMin);
      const overlapEnd = Math.min(a.endMin, b.endMin);
      if (overlapEnd <= overlapStart) continue;
      const aTitle = a.title || "one block";
      const bTitle = b.title || "another block";
      conflicts.push({
        burdenId: "fixed-appt",
        message:
          `Your day is shaping up well — “${aTitle}” and “${bTitle}” ` +
          `share ${formatMin(overlapStart)}–${formatMin(overlapEnd)}. ` +
          `A small nudge gives both room to shine.`,
        fixLabel: fixLabelFor("fixed-appt"),
      });
    }
  }
  return conflicts;
}
