/**
 * VocRehab micro-games registry + scoring (C3 domain lib).
 *
 * Usage:
 *   import { vocrehabGameRegistry, vocrehabValidateGameEvent, vocrehabSummarizeRun } from "@/lib/vocrehab-games";
 *   if (vocrehabValidateGameEvent(raw)) pushEvent(raw);
 *   const text = vocrehabSummarizeRun("file-sort", events); // strengths-first, human language
 *
 * Pure module: zero I/O, zero imports, safe for client + server.
 * No browser globals at module top. Telemetry lives in callers.
 */

export type VocrehabGameId =
  | "file-sort"
  | "inbox-sprint"
  | "focus-shift"
  | "barrier-run"
  | "schedule-juggle"
  | "phone-greeting"
  | "time-punch"
  | "tool-match"
  | "paycheck-plan"
  | "energy-budget"
  | "resume-rescue";

export type VocrehabGameEventKind =
  | "start"
  | "action"
  | "error"
  | "help"
  | "pause"
  | "resume"
  | "interrupt"
  | "complete";

/** Structural event shape; siblings may own richer branded types — this file matches structurally. */
export interface VocrehabGameEvent {
  t_ms: number;
  kind: VocrehabGameEventKind;
  detail: Record<string, unknown>;
}

export interface VocrehabGameRegistryEntry {
  id: VocrehabGameId;
  title: string;
  instructions: string;
  timeLimitSec: number | null;
}

export interface VocrehabGameScore {
  accuracy: "developing" | "steady" | "strong";
  throughput: "unhurried" | "steady" | "brisk";
  recovery: "growing" | "steady" | "strong";
  notes: string[];
}

const GAME_EVENT_KINDS: readonly VocrehabGameEventKind[] = [
  "start",
  "action",
  "error",
  "help",
  "pause",
  "resume",
  "interrupt",
  "complete",
];

export const vocrehabGameRegistry: readonly VocrehabGameRegistryEntry[] = [
  {
    id: "file-sort",
    title: "File Sort",
    instructions:
      "Sort 12 files into 3 folders (Invoices, Schedules, Client Notes). Click, tap, or use arrow keys + Enter. One practice round first, then a timed run. You can retry anytime.",
    timeLimitSec: 180,
  },
  {
    id: "inbox-sprint",
    title: "Inbox Sprint",
    instructions:
      "Triage 8 mock messages by priority: reply now, schedule, file, or flag. One message needs a 1–2 sentence reply from a sentence starter. Flag anything that looks like phishing — flagging is always safe.",
    timeLimitSec: 180,
  },
  {
    id: "focus-shift",
    title: "Focus Shift",
    instructions:
      "Match 10 symbol pairs. A scripted interruption will appear partway through — pause, notice it, then refocus. This shows what helps you refocus, not how fast you are.",
    timeLimitSec: 240,
  },
  {
    id: "barrier-run",
    title: "Barrier Run",
    instructions:
      "Play through a branching workday story: commute, shift swap, disclosure moment, tool failure. Every choice is valid. Replay to try other paths. No timer.",
    timeLimitSec: null,
  },
  {
    id: "schedule-juggle",
    title: "Schedule Juggle",
    instructions:
      "Place 3 shifts and 1 training block on a 7-day grid around transport, medication, childcare, rest, and class constraints. Conflicts highlight with plain-language fixes — never red errors. No timer.",
    timeLimitSec: null,
  },
  { id: "phone-greeting", title: "Front-Desk Hello", instructions: "Practice a warm greeting, note one useful detail, and confirm a next step across six calls.", timeLimitSec: null },
  { id: "time-punch", title: "Shift Punch", instructions: "Complete six shift tasks inside their time windows. A late-bus surprise has a grace option.", timeLimitSec: 180 },
  { id: "tool-match", title: "Tool Crib", instructions: "Match everyday tasks with tools and identify when safety gear helps.", timeLimitSec: null },
  { id: "paycheck-plan", title: "Paycheck Planner", instructions: "Explore a paycheck, everyday costs, and an unexpected expense at your own pace.", timeLimitSec: null },
  { id: "energy-budget", title: "Energy Budget", instructions: "Plan a week with work, appointments, and protected rest using a limited energy budget.", timeLimitSec: null },
  { id: "resume-rescue", title: "Resume Rescue", instructions: "Spot resume issues and practice clear, professional rewrites.", timeLimitSec: 180 },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate one raw telemetry event: kind enum, t_ms 0..600000, detail object. */
export function vocrehabValidateGameEvent(e: unknown): boolean {
  if (!isPlainObject(e)) return false;
  const { t_ms, kind, detail } = e as {
    t_ms: unknown;
    kind: unknown;
    detail: unknown;
  };
  if (typeof t_ms !== "number" || !Number.isFinite(t_ms)) return false;
  if (t_ms < 0 || t_ms > 600000) return false;
  if (typeof kind !== "string") return false;
  if ((GAME_EVENT_KINDS as readonly string[]).indexOf(kind) < 0) return false;
  if (!isPlainObject(detail)) return false;
  return true;
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function buildScore(
  actions: number,
  errors: number,
  helps: number,
  corrections: number,
  durationMin: number,
  gameLabel: string,
): VocrehabGameScore {
  const total = actions + errors;
  const acc = rate(actions, total);
  const accuracy = acc >= 0.85 ? "strong" : acc >= 0.6 ? "steady" : "developing";
  const perMin = durationMin > 0 ? rate(actions, durationMin) : 0;
  const throughput = perMin >= 8 ? "brisk" : perMin >= 3 ? "steady" : "unhurried";
  const recovery =
    errors === 0 ? "steady" : rate(corrections, errors) >= 0.5 ? "strong" : "growing";
  const notes: string[] = [];
  if (helps > 0) notes.push(`${gameLabel}: asked for help ${helps} time(s) — help-seeking is a work strength.`);
  if (errors > 0 && corrections > 0)
    notes.push(`${gameLabel}: corrected ${corrections} of ${errors} error(s) — kept going after a snag.`);
  if (errors === 0 && actions > 0)
    notes.push(`${gameLabel}: clean run with no errors recorded.`);
  if (actions === 0) notes.push(`${gameLabel}: no scored actions yet — try the practice round first.`);
  return { accuracy, throughput, recovery, notes };
}

function summarizeEvents(
  gameId: VocrehabGameId,
  events: VocrehabGameEvent[],
): { actions: number; errors: number; helps: number; corrections: number; durationMin: number } {
  let actions = 0;
  let errors = 0;
  let helps = 0;
  let corrections = 0;
  let first = Number.POSITIVE_INFINITY;
  let last = 0;
  for (const e of events) {
    if (!vocrehabValidateGameEvent(e)) continue;
    if (e.t_ms < first) first = e.t_ms;
    if (e.t_ms > last) last = e.t_ms;
    if (e.kind === "action") {
      actions += 1;
      if (e.detail["corrected"] === true || e.detail["retry"] === true) corrections += 1;
    } else if (e.kind === "error") {
      errors += 1;
    } else if (e.kind === "help") {
      helps += 1;
    }
  }
  void gameId;
  const durationMin = first === Number.POSITIVE_INFINITY ? 0 : (last - first) / 60000;
  return { actions, errors, helps, corrections, durationMin };
}

/** File Sort: accuracy = correct folder placements; correction = {"corrected": true} action. */
export function vocrehabScoreFileSort(events: VocrehabGameEvent[]): VocrehabGameScore {
  const s = summarizeEvents("file-sort", events);
  return buildScore(s.actions, s.errors, s.helps, s.corrections, s.durationMin, "File Sort");
}

/** Inbox Sprint: same shape; phishing flag counts as an action, careful-reply as detail. */
export function vocrehabScoreInboxSprint(events: VocrehabGameEvent[]): VocrehabGameScore {
  const s = summarizeEvents("inbox-sprint", events);
  return buildScore(s.actions, s.errors, s.helps, s.corrections, s.durationMin, "Inbox Sprint");
}

/** Focus Shift: interruption events contextualize pace; recovery weighs post-interrupt corrections. */
export function vocrehabScoreFocusShift(events: VocrehabGameEvent[]): VocrehabGameScore {
  const s = summarizeEvents("focus-shift", events);
  const interrupts = events.filter(
    (e) => vocrehabValidateGameEvent(e) && e.kind === "interrupt",
  ).length;
  const base = buildScore(s.actions, s.errors, s.helps, s.corrections, s.durationMin, "Focus Shift");
  if (interrupts > 0 && s.errors === 0) {
    return { ...base, notes: [...base.notes, "Focus Shift: stayed steady through an interruption."] };
  }
  return base;
}

/** Barrier Run: untimed; accuracy = consistent path choices, recovery = revisiting nodes. */
export function vocrehabScoreBarrierRun(events: VocrehabGameEvent[]): VocrehabGameScore {
  const s = summarizeEvents("barrier-run", events);
  const base = buildScore(s.actions, s.errors, s.helps, s.corrections, Math.max(s.durationMin, 1), "Barrier Run");
  return { ...base, throughput: "steady" };
}

/** Schedule Juggle: untimed puzzle; conflicts resolved = corrections. */
export function vocrehabScoreScheduleJuggle(events: VocrehabGameEvent[]): VocrehabGameScore {
  const s = summarizeEvents("schedule-juggle", events);
  const base = buildScore(s.actions, s.errors, s.helps, s.corrections, Math.max(s.durationMin, 1), "Schedule Juggle");
  return { ...base, throughput: "steady" };
}

/**
 * Strengths-first human summary. Never emits IQ-like numbers or percentiles;
 * raw counts stay in the notes for a counselor explainer one tap deeper.
 */
export function vocrehabSummarizeRun(gameId: VocrehabGameId, events: VocrehabGameEvent[]): string {
  const entry = vocrehabGameRegistry.find((g) => g.id === gameId);
  const label = entry ? entry.title : gameId;
  const scorer: Partial<Record<VocrehabGameId, (e: VocrehabGameEvent[]) => VocrehabGameScore>> = {
    "file-sort": vocrehabScoreFileSort,
    "inbox-sprint": vocrehabScoreInboxSprint,
    "focus-shift": vocrehabScoreFocusShift,
    "barrier-run": vocrehabScoreBarrierRun,
    "schedule-juggle": vocrehabScoreScheduleJuggle,
  };
  const score = scorer[gameId]?.(events) ?? buildScore(
    events.filter((e) => e.kind === "action").length,
    events.filter((e) => e.kind === "error").length,
    events.filter((e) => e.kind === "help").length,
    events.filter((e) => e.kind === "action" && (e.detail.corrected === true || e.detail.retry === true)).length,
    Math.max(0, ((events.at(-1)?.t_ms ?? 0) - (events[0]?.t_ms ?? 0)) / 60000),
    label,
  );
  const strengthBits: string[] = [];
  if (score.accuracy === "strong") strengthBits.push("sorted choices with care");
  else if (score.accuracy === "steady") strengthBits.push("kept choices mostly on track");
  else strengthBits.push("kept trying through a tricky run");
  if (score.recovery === "strong") strengthBits.push("bounced back after snags");
  if (score.throughput === "brisk") strengthBits.push("kept a brisk, steady pace");
  else if (score.throughput === "steady") strengthBits.push("kept a steady pace");
  else strengthBits.push("took time to think things through");
  const headline = `In ${label}, you ${strengthBits.join(", ")}.`;
  const support =
    score.accuracy === "developing"
      ? "A good next step is one more practice round with no timer, then retry — retries always count the same."
      : "A good next step is sending this run to your profile so you and your counselor can spot supports together.";
  const extra = score.notes.length > 0 ? ` ${score.notes.join(" ")}` : "";
  return `${headline} ${support}${extra}`;
}
