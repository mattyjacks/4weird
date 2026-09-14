/**
 * lib/vocrehab-games2.ts — VocRehab arcade pack-2 (self-contained).
 *
 * Three new micro-games: phone-greeting (front-desk courtesy + recall),
 * time-punch (shift punctuality + recovery), tool-match (task knowledge +
 * safety awareness). Deliberately decoupled from lib/vocrehab-games.ts
 * (sibling-owned): own ids, own registry, own scorers, own validator mirror.
 * Save path is the assessments API (kind 'readiness'), which takes
 * free-form payloads — no games-API allowlist change needed.
 *
 * All exports are pure (zero I/O) except the payload builder, which only
 * shapes data. Browser access (fetch, BroadcastChannel) lives in the
 * components' handlers, never at module top level.
 */

export type VocrehabGame2Id = "phone-greeting" | "time-punch" | "tool-match";

export type VocrehabGame2EventKind =
  | "start"
  | "action"
  | "error"
  | "help"
  | "pause"
  | "resume"
  | "interrupt"
  | "complete";

export interface VocrehabGame2Event {
  t_ms: number;
  kind: VocrehabGame2EventKind;
  detail: Record<string, unknown>;
}

export interface VocrehabGame2RegistryEntry {
  id: VocrehabGame2Id;
  title: string;
  blurb: string;
  /** Seconds for the timed run, or null when untimed. */
  timeLimitSec: number | null;
  skills: string[];
}

export const vocrehabGame2Ids: readonly VocrehabGame2Id[] = [
  "phone-greeting",
  "time-punch",
  "tool-match",
];

export const vocrehabGame2Registry: readonly VocrehabGame2RegistryEntry[] = [
  {
    id: "phone-greeting",
    title: "Front-Desk Hello",
    blurb: "Greet 6 callers warmly and remember one detail from each call.",
    timeLimitSec: null,
    skills: ["phone courtesy", "listening", "recall"],
  },
  {
    id: "time-punch",
    title: "Shift Punch",
    blurb: "Punch 6 shift tasks inside their time windows — including one late-bus surprise.",
    timeLimitSec: 180,
    skills: ["punctuality", "time management", "recovery"],
  },
  {
    id: "tool-match",
    title: "Tool Crib",
    blurb: "Match 8 jobs to the right tool and flag when safety gear is needed.",
    timeLimitSec: null,
    skills: ["task knowledge", "safety awareness"],
  },
];

const VOCREHAB_GAME2_KINDS: readonly VocrehabGame2EventKind[] = [
  "start",
  "action",
  "error",
  "help",
  "pause",
  "resume",
  "interrupt",
  "complete",
];

export function vocrehabValidateGame2Event(e: unknown): { ok: boolean; error?: string } {
  if (typeof e !== "object" || e === null) return { ok: false, error: "event must be an object" };
  const evt = e as { t_ms?: unknown; kind?: unknown; detail?: unknown };
  if (typeof evt.t_ms !== "number" || !Number.isInteger(evt.t_ms) || evt.t_ms < 0 || evt.t_ms > 600000) {
    return { ok: false, error: "t_ms must be an integer 0..600000" };
  }
  if (typeof evt.kind !== "string" || !VOCREHAB_GAME2_KINDS.includes(evt.kind as VocrehabGame2EventKind)) {
    return { ok: false, error: "kind must be a known event kind" };
  }
  if (typeof evt.detail !== "object" || evt.detail === null) {
    return { ok: false, error: "detail must be an object" };
  }
  return { ok: true };
}

export type VocrehabGame2Band = "exploring" | "supported" | "steady";

export interface VocrehabGame2Score {
  accuracyPct: number;
  band: VocrehabGame2Band;
  headline: string;
  supports: string[];
}

function vocrehabBandFor(accuracyPct: number): VocrehabGame2Band {
  if (accuracyPct >= 80) return "steady";
  if (accuracyPct >= 50) return "supported";
  return "exploring";
}

export interface VocrehabPhoneGreetingPick {
  /** 2 = warm + professional, 1 = okay, 0 = off-putting. */
  courtesy: 0 | 1 | 2;
  recall: boolean;
}

export function vocrehabScorePhoneGreeting(picks: VocrehabPhoneGreetingPick[]): VocrehabGame2Score {
  const total = Math.max(1, picks.length * 3);
  const earned = picks.reduce((s, p) => s + p.courtesy + (p.recall ? 1 : 0), 0);
  const accuracyPct = Math.round((earned / total) * 100);
  const band = vocrehabBandFor(accuracyPct);
  const weakRecall = picks.filter((p) => !p.recall).length;
  const weakWarmth = picks.filter((p) => p.courtesy === 0).length;
  const supports: string[] = [];
  if (weakWarmth > 0) supports.push("Answer with your name and workplace first — it buys thinking time and sounds professional.");
  if (weakRecall > 0) supports.push("Jot the caller's name plus one word (e.g. 'Rosa — invoice') before you reply.");
  if (supports.length === 0) supports.push("Keep this rhythm: greet, note the detail, confirm next step.");
  return {
    accuracyPct,
    band,
    headline: `Greeted ${picks.length} callers with ${accuracyPct}% warmth-and-recall.`,
    supports,
  };
}

export interface VocrehabTimePunchResult {
  onTime: number;
  early: number;
  missed: number;
  total: number;
  usedGrace: boolean;
}

export function vocrehabScoreTimePunch(r: VocrehabTimePunchResult): VocrehabGame2Score {
  const total = Math.max(1, r.total);
  const accuracyPct = Math.round((r.onTime / total) * 100);
  const band = vocrehabBandFor(accuracyPct);
  const supports: string[] = [];
  if (r.missed > 0) supports.push("Set one alarm per task window — a phone buzz beats watching the clock.");
  if (r.early > 0) supports.push("Punching early is eagerness, not failure; wait for the window light, then punch once.");
  if (r.usedGrace && r.onTime === r.total) supports.push("You used the late-bus grace window exactly right — backup plans are a work skill.");
  if (supports.length === 0) supports.push("Steady punching. Supervisors notice reliability before speed.");
  return {
    accuracyPct,
    band,
    headline: `Punched ${r.onTime} of ${r.total} tasks on time${r.missed > 0 ? `, ${r.missed} missed` : ""}.`,
    supports,
  };
}

export interface VocrehabToolMatchPick {
  tool: boolean;
  safety: boolean;
}

export function vocrehabScoreToolMatch(picks: VocrehabToolMatchPick[]): VocrehabGame2Score {
  const total = Math.max(1, picks.length * 2);
  const earned = picks.reduce((s, p) => s + (p.tool ? 1 : 0) + (p.safety ? 1 : 0), 0);
  const accuracyPct = Math.round((earned / total) * 100);
  const band = vocrehabBandFor(accuracyPct);
  const toolMisses = picks.filter((p) => !p.tool).length;
  const safetyMisses = picks.filter((p) => !p.safety).length;
  const supports: string[] = [];
  if (toolMisses > 0) supports.push("Ask for the one-page tool map on day one — every shop has one, and asking is expected.");
  if (safetyMisses > 0) supports.push("When in doubt, flag safety gear: over-gearing is always forgiven, under-gearing never is.");
  if (supports.length === 0) supports.push("Tool-smart and safety-first — exactly what hiring managers screen for.");
  return {
    accuracyPct,
    band,
    headline: `Matched ${picks.length} jobs at ${accuracyPct}% tool-and-safety accuracy.`,
    supports,
  };
}

export function vocrehabSummarizeGame2Run(id: VocrehabGame2Id, score: VocrehabGame2Score): string {
  const entry = vocrehabGame2Registry.find((g) => g.id === id);
  const name = entry ? entry.title : id;
  return `${name}: ${score.headline} Band: ${score.band}. Suggested supports: ${score.supports.join(" ")}`;
}

/** Shapes a send-to-profile body for POST /api/vocrehab/assessments (kind 'readiness'). */
export function vocrehabGame2AssessmentPayload(
  id: VocrehabGame2Id,
  score: VocrehabGame2Score,
): {
  kind: "readiness";
  payload: Record<string, unknown>;
  profile: Record<string, unknown>;
} {
  return {
    kind: "readiness",
    payload: { game: id, pack: 2, accuracyPct: score.accuracyPct, band: score.band },
    profile: { headline: score.headline, supports: score.supports },
  };
}

/** Channel name shared with the rest of the module (emit-only interop). */
export const vocrehabGame2InteropChannel = "4weird_interop_bus";
