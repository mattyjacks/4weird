/**
 * VocRehab schedule-juggle activity kinds (self-contained, decoupled pack).
 *
 * Pure module: zero imports (never imports sibling SJ files), zero I/O,
 * no browser globals — safe for client + server. Callers own rendering,
 * persistence, and telemetry.
 *
 * Tone rule: every blurb is strengths-first, plain-language encouragement.
 * Nothing here is an error state — unplaced or skipped time is simply
 * open time, never a failure.
 */

export type ActivityKindId =
  | "sleep"
  | "work"
  | "training"
  | "medical"
  | "family"
  | "meal"
  | "rest"
  | "travel"
  | "childcare"
  | "community"
  | "personal"
  | "buffer";

/** One schedulable activity kind with its defaults and difficulty flags. */
export interface ActivityKind {
  /** Stable machine id. */
  id: ActivityKindId;
  /** Short human label. */
  label: string;
  /** Friendly glanceable emoji shown before the label everywhere. */
  emoji: string;
  /** Default block length in minutes when the player adds this kind. */
  defaultDurMin: number;
  /** Design color token for chips / blocks of this kind. */
  color: string;
  /** Whether this kind is required on Easy schedules. */
  requiredEasy: boolean;
  /** Whether this kind is required on Medium schedules. */
  requiredMed: boolean;
  /** Whether this kind is required on Hard schedules. */
  requiredHard: boolean;
  /** Strengths-first, plain-language one-liner shown in pickers and hints. */
  blurb: string;
}

export const ACTIVITY_KINDS: readonly ActivityKind[] = [
  {
    id: "sleep",
    label: "Sleep",
    emoji: "😴",
    defaultDurMin: 480,
    color: "sj-sleep",
    requiredEasy: true,
    requiredMed: true,
    requiredHard: true,
    blurb: "You recharge well with a full night — protect it and the whole day gets easier.",
  },
  {
    id: "work",
    label: "Work",
    emoji: "💼",
    defaultDurMin: 240,
    color: "sj-work",
    requiredEasy: true,
    requiredMed: true,
    requiredHard: true,
    blurb: "You show up and get things done — anchor the day around your shift.",
  },
  {
    id: "training",
    label: "Training",
    emoji: "📚",
    defaultDurMin: 90,
    color: "sj-training",
    requiredEasy: false,
    requiredMed: true,
    requiredHard: true,
    blurb: "You are building real skills — a focused session moves you forward.",
  },
  {
    id: "medical",
    label: "Medical",
    emoji: "🏥",
    defaultDurMin: 60,
    color: "sj-medical",
    requiredEasy: true,
    requiredMed: true,
    requiredHard: true,
    blurb: "You take care of your health like a pro — keep this appointment front and center.",
  },
  {
    id: "family",
    label: "Family",
    emoji: "👪",
    defaultDurMin: 60,
    color: "sj-family",
    requiredEasy: false,
    requiredMed: true,
    requiredHard: true,
    blurb: "The people who count on you are a strength — make room for them.",
  },
  {
    id: "meal",
    label: "Meal",
    emoji: "🍽️",
    defaultDurMin: 45,
    color: "sj-meal",
    requiredEasy: true,
    requiredMed: true,
    requiredHard: true,
    blurb: "You fuel up smart — regular meals keep your energy steady all day.",
  },
  {
    id: "rest",
    label: "Rest",
    emoji: "☕",
    defaultDurMin: 30,
    color: "sj-rest",
    requiredEasy: true,
    requiredMed: true,
    requiredHard: true,
    blurb: "You recover fast when you pause — short breaks keep you sharp.",
  },
  {
    id: "travel",
    label: "Travel",
    emoji: "🚌",
    defaultDurMin: 30,
    color: "sj-travel",
    requiredEasy: false,
    requiredMed: true,
    requiredHard: true,
    blurb: "You plan ahead for the trip — getting there calmly is already a win.",
  },
  {
    id: "childcare",
    label: "Childcare",
    emoji: "🧒",
    defaultDurMin: 60,
    color: "sj-childcare",
    requiredEasy: false,
    requiredMed: true,
    requiredHard: true,
    blurb: "You keep your kids covered — steady care time holds the week together.",
  },
  {
    id: "community",
    label: "Community",
    emoji: "🤝",
    defaultDurMin: 60,
    color: "sj-community",
    requiredEasy: false,
    requiredMed: false,
    requiredHard: true,
    blurb: "You give back and belong — community time grows your support circle.",
  },
  {
    id: "personal",
    label: "Personal",
    emoji: "⭐",
    defaultDurMin: 30,
    color: "sj-personal",
    requiredEasy: false,
    requiredMed: false,
    requiredHard: false,
    blurb: "Your own time matters too — spend it on whatever lifts you up.",
  },
  {
    id: "buffer",
    label: "Buffer",
    emoji: "⏳",
    defaultDurMin: 15,
    color: "sj-buffer",
    requiredEasy: false,
    requiredMed: false,
    requiredHard: false,
    blurb: "You leave smart wiggle room — a little flex time handles surprises.",
  },
];

/** Fallback minutes used when an unknown id is requested. */
export const ACTIVITY_FALLBACK_DUR_MIN = 30;

/** Emoji for an activity kind id — "" when unknown, never an error. */
export function activityEmoji(id: string): string {
  const found = ACTIVITY_KINDS.find((kind) => kind.id === id);
  return found ? found.emoji : "";
}

/** Label with its glanceable emoji, e.g. "💼 Work". */
export function activityLabel(id: string): string {
  const found = ACTIVITY_KINDS.find((kind) => kind.id === id);
  return found ? `${found.emoji} ${found.label}` : id;
}

/**
 * Default block length in minutes for an activity kind id.
 * Unknown ids return the fallback — open time, never an error.
 */
export function defaultDuration(id: string): number {
  const found = ACTIVITY_KINDS.find((kind) => kind.id === id);
  return found ? found.defaultDurMin : ACTIVITY_FALLBACK_DUR_MIN;
}
