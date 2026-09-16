/**
 * lib/vocrehab-schedule-seed.ts — SJ seed-compat bridge (DS-SJ-15).
 *
 * Maps pool3 schedule-juggle setIds to Easy-style difficulties and builds an
 * extended strengths-first finish summary. Every seed replays the same fair
 * practice board, so a learner can retry calmly and build on what worked.
 * Blocked cells, travel minutes, and conflicts are planning information
 * only — never marks.
 *
 * Pure module: imports only from @/lib/vocrehab-seed, zero I/O, no browser
 * globals — safe for client + server. No SJ imports (pool files stay
 * untouched). Strengths-first tone throughout, never red-error language.
 */

import { mulberry32, xmur3 } from "@/lib/vocrehab-seed";

/** Geo preset ids shared with the schedule-juggle geo presets. */
export type VocrehabSchedulePresetId = "wa" | "nh" | "ak";

/** Easy-style difficulty ladder for schedule-juggle sets. */
export type VocrehabScheduleDifficulty = "easy" | "medium" | "hard";

const VOCREHAB_SCHEDULE_PRESET_IDS: readonly VocrehabSchedulePresetId[] = [
  "wa",
  "nh",
  "ak",
];

const VOCREHAB_SCHEDULE_REGION_LABEL: Record<VocrehabSchedulePresetId, string> = {
  wa: "Tacoma, WA",
  nh: "Manchester, NH",
  ak: "Anchorage, AK",
};

/**
 * Deterministically pick a geo preset from any seed string. Same seed always
 * returns the same preset; unknown or empty seeds still resolve to a preset
 * (planning info, never an error).
 */
export function presetIdForSeed(seed: string): VocrehabSchedulePresetId {
  const key: string = typeof seed === "string" ? seed : "";
  const rand: () => number = mulberry32(xmur3(key)());
  const idx: number = Math.floor(rand() * VOCREHAB_SCHEDULE_PRESET_IDS.length);
  return VOCREHAB_SCHEDULE_PRESET_IDS[idx] ?? "wa";
}

/**
 * Map a pool3 schedule-juggle setId to an Easy-style difficulty:
 * day-baseline → easy, night-shift → medium, weekend-training → medium.
 * Unknown setIds resolve to easy (lowest pressure first).
 */
export function difficultyForSetId(setId: string): VocrehabScheduleDifficulty {
  const key: string = typeof setId === "string" ? setId.trim() : "";
  switch (key) {
    case "day-baseline":
      return "easy";
    case "night-shift":
      return "medium";
    case "weekend-training":
      return "medium";
    default:
      return "easy";
  }
}

/** Inputs for the extended finish-summary builder. */
export interface VocrehabScheduleFinishInput {
  presetId: VocrehabSchedulePresetId | string;
  difficulty: VocrehabScheduleDifficulty | string;
  placements: number;
  travelMinTotal: number;
  conflictsResolved: number;
  seed: string;
}

function vocrehabScheduleClampCount(n: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function vocrehabScheduleRegionLabel(presetId: string): string {
  if (presetId === "wa" || presetId === "nh" || presetId === "ak") {
    return VOCREHAB_SCHEDULE_REGION_LABEL[presetId];
  }
  return "your home board";
}

/**
 * Build a strengths-first finish summary: placements celebrated, travel and
 * conflicts framed as planning wins, seed echoed for replay. Pure string
 * builder — no I/O, no throws on odd input.
 */
export function buildFinishSummary(input: VocrehabScheduleFinishInput): string {
  const region: string = vocrehabScheduleRegionLabel(
    typeof input.presetId === "string" ? input.presetId.trim() : "",
  );
  const difficulty: string =
    typeof input.difficulty === "string" && input.difficulty.trim() !== ""
      ? input.difficulty.trim()
      : "easy";
  const placements: number = vocrehabScheduleClampCount(input.placements);
  const travelMin: number = vocrehabScheduleClampCount(input.travelMinTotal);
  const conflicts: number = vocrehabScheduleClampCount(input.conflictsResolved);
  const seed: string = typeof input.seed === "string" ? input.seed.trim() : "";
  const blockWord: string = placements === 1 ? "block" : "blocks";
  const seedPart: string = seed !== "" ? ` (seed ${seed})` : "";
  return (
    `Nice planning${seedPart}! You placed ${placements} ${blockWord} on the ${region} board ` +
    `at an ${difficulty} pace — ${travelMin} min of travel planned and ${conflicts} ` +
    `schedule puzzle${conflicts === 1 ? "" : "s"} worked through calmly. ` +
    `Every placed block is progress; replay the seed to build on what worked.`
  );
}
