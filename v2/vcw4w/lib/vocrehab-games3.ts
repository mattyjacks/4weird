/**
 * lib/vocrehab-games3.ts — VocRehab arcade pack-3 (self-contained).
 *
 * One new micro-game: resume-rescue (spot-and-fix resume errors under a
 * timer, then recover gracefully after a miss). Deliberately decoupled from
 * lib/vocrehab-games.ts (sibling-owned, C3 live — never edit it) and from
 * lib/vocrehab-games2.ts: own id, own registry, own scorer, own validator
 * mirror. Save path is the assessments API (kind 'readiness'), which takes
 * free-form payloads — no games-API allowlist change needed.
 *
 * All exports are pure (zero I/O) except the payload builder, which only
 * shapes data. Browser access (fetch, BroadcastChannel) lives in the
 * components' handlers, never at module top level. Zero imports.
 */

export type VocrehabGame3Id = "resume-rescue";

export type VocrehabGame3EventKind =
  | "start"
  | "action"
  | "error"
  | "help"
  | "pause"
  | "resume"
  | "interrupt"
  | "complete";

export interface VocrehabGame3Event {
  t_ms: number;
  kind: VocrehabGame3EventKind;
  detail: Record<string, unknown>;
}

export interface VocrehabGame3RegistryEntry {
  id: VocrehabGame3Id;
  title: string;
  instructions: string;
  /** Seconds for the timed run, or null when untimed. */
  timeLimitSec: number | null;
  skills: string[];
}

export const vocrehabGame3Ids: readonly VocrehabGame3Id[] = ["resume-rescue"];

export const vocrehabGame3Registry: readonly VocrehabGame3RegistryEntry[] = [
  {
    id: "resume-rescue",
    title: "Resume Rescue",
    instructions:
      "Fix 8 resume lines before the timer ends — tap the error, pick the fix, and bounce back clean after any miss.",
    timeLimitSec: 180,
    skills: ["attention to detail", "proofreading", "recovery"],
  },
];

const VOCREHAB_GAME3_KINDS: readonly VocrehabGame3EventKind[] = [
  "start",
  "action",
  "error",
  "help",
  "pause",
  "resume",
  "interrupt",
  "complete",
];

export function vocrehabValidateGame3Event(e: unknown): { ok: boolean; error?: string } {
  if (typeof e !== "object" || e === null) return { ok: false, error: "event must be an object" };
  const evt = e as { t_ms?: unknown; kind?: unknown; detail?: unknown };
  if (typeof evt.t_ms !== "number" || !Number.isInteger(evt.t_ms) || evt.t_ms < 0 || evt.t_ms > 600000) {
    return { ok: false, error: "t_ms must be an integer 0..600000" };
  }
  if (typeof evt.kind !== "string" || !VOCREHAB_GAME3_KINDS.includes(evt.kind as VocrehabGame3EventKind)) {
    return { ok: false, error: "kind must be a known event kind" };
  }
  if (typeof evt.detail !== "object" || evt.detail === null) {
    return { ok: false, error: "detail must be an object" };
  }
  return { ok: true };
}

export type VocrehabGame3Band = "exploring" | "supported" | "steady";

export interface VocrehabGame3Score {
  accuracyPct: number;
  throughputPct: number;
  recoveryPct: number;
  band: VocrehabGame3Band;
  headline: string;
  supports: string[];
}

function vocrehabBandFor3(accuracyPct: number): VocrehabGame3Band {
  if (accuracyPct >= 80) return "steady";
  if (accuracyPct >= 50) return "supported";
  return "exploring";
}

export interface VocrehabResumeRescuePick {
  /** True when the line's error was fixed correctly. */
  fixed: boolean;
  /** True when the fix landed inside the per-line window. */
  onTime: boolean;
  /** True when the very next line after a miss was fixed (bounce-back). */
  bouncedBack: boolean;
}

export function vocrehabScoreResumeRescue(picks: VocrehabResumeRescuePick[]): VocrehabGame3Score {
  const total = Math.max(1, picks.length);
  const fixed = picks.filter((p) => p.fixed).length;
  const onTime = picks.filter((p) => p.fixed && p.onTime).length;
  const accuracyPct = Math.round((fixed / total) * 100);
  const throughputPct = Math.round((onTime / total) * 100);
  const misses = picks.length - fixed;
  const bounceBacks = picks.filter((p) => p.bouncedBack).length;
  const recoveryPct = misses === 0 ? 100 : Math.round((Math.min(bounceBacks, misses) / misses) * 100);
  const band = vocrehabBandFor3(accuracyPct);
  const supports: string[] = [];
  if (accuracyPct < 100) supports.push("Read each line backwards, last word first — errors pop out when the story can't distract you.");
  if (throughputPct < 80) supports.push("Fix the easy wins first (capitalization, dates), then loop back for the tricky lines before time runs out.");
  if (misses > 0 && recoveryPct < 100) supports.push("After a miss, breathe and nail the next line — supervisors grade the recovery, not the stumble.");
  if (supports.length === 0) supports.push("Clean sweep: accurate, on pace, and unshakable — that is hire-ready proofreading.");
  return {
    accuracyPct,
    throughputPct,
    recoveryPct,
    band,
    headline: `Rescued ${fixed} of ${picks.length} resume lines at ${accuracyPct}% accuracy and ${throughputPct}% on-time pace.`,
    supports,
  };
}

export function vocrehabSummarizeGame3Run(id: VocrehabGame3Id, score: VocrehabGame3Score): string {
  const entry = vocrehabGame3Registry.find((g) => g.id === id);
  const name = entry ? entry.title : id;
  return `${name}: ${score.headline} Accuracy ${score.accuracyPct}%, throughput ${score.throughputPct}%, recovery ${score.recoveryPct}%. Band: ${score.band}. Suggested supports: ${score.supports.join(" ")}`;
}

/** Shapes a send-to-profile body for POST /api/vocrehab/assessments (kind 'readiness'). */
export function vocrehabGame3AssessmentPayload(
  id: VocrehabGame3Id,
  score: VocrehabGame3Score,
): {
  kind: "readiness";
  payload: Record<string, unknown>;
  profile: Record<string, unknown>;
} {
  return {
    kind: "readiness",
    payload: {
      game: id,
      pack: 3,
      accuracyPct: score.accuracyPct,
      throughputPct: score.throughputPct,
      recoveryPct: score.recoveryPct,
      band: score.band,
    },
    profile: { headline: score.headline, supports: score.supports },
  };
}

/** Channel name shared with the rest of the module (emit-only interop). */
export const vocrehabGame3InteropChannel = "4weird_interop_bus";
