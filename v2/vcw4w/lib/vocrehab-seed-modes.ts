// VocRehab seed modes — practice, not a test.
// Strengths-first: random mix for low-pressure reps; an explicit seed
// reproduces the same set when a learner wants to retry and build on wins.

export type VocrehabSeedMode = "random" | "seeded";

export type VocrehabSeedDifficulty = "beginner" | "standard" | "brisk";

export interface VocrehabSeedModeState {
  mode: VocrehabSeedMode;
  seed: string | null;
  difficulty: VocrehabSeedDifficulty;
}

export const VOCREHAB_SEED_DEFAULT_STATE: VocrehabSeedModeState = {
  mode: "random",
  seed: null,
  difficulty: "standard",
};

export function vocrehabResolveSeed(
  state: VocrehabSeedModeState,
  fallbackRandom: () => string,
): { mode: VocrehabSeedMode; seed: string } {
  const explicit = typeof state.seed === "string" ? state.seed.trim() : "";
  if (state.mode === "seeded" && explicit !== "") {
    return { mode: "seeded", seed: explicit };
  }
  return { mode: "random", seed: fallbackRandom() };
}

export function vocrehabCriteriaFor(
  difficulty: VocrehabSeedDifficulty,
): string[] {
  switch (difficulty) {
    case "beginner":
      return ["untimed-friendly", "hints allowed", "partial credit"];
    case "brisk":
      return ["tighter windows", "no hints", "curveball item included"];
    case "standard":
    default:
      return ["3-min", "no hints"];
  }
}

const VOCREHAB_BASE_COUNTS: Record<string, number> = {
  "file-sort": 12,
  inbox: 8,
  focus: 10,
  "tool-match": 8,
  resume: 8,
};

const VOCREHAB_BANK_CAPS: Record<string, number> = {
  "file-sort": 16,
  inbox: 12,
  focus: 14,
  "tool-match": 12,
  resume: 12,
};

const VOCREHAB_DEFAULT_COUNT = 6;
const VOCREHAB_DEFAULT_BANK_CAP = 8;
const VOCREHAB_BRISK_BONUS = 2;

function vocrehabGroupKey(gameId: string): string {
  const id = gameId.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (id.includes("file-sort") || id.includes("filesort")) return "file-sort";
  if (id.includes("tool-match") || id.includes("toolmatch")) return "tool-match";
  if (id.includes("inbox")) return "inbox";
  if (id.includes("focus")) return "focus";
  if (id.includes("resume")) return "resume";
  return id;
}

export function vocrehabCountFor(
  gameId: string,
  difficulty: VocrehabSeedDifficulty,
  bankSize?: number,
): number {
  const key = vocrehabGroupKey(gameId);
  const base = VOCREHAB_BASE_COUNTS[key] ?? VOCREHAB_DEFAULT_COUNT;
  const cap = typeof bankSize === "number" && bankSize >= 0
    ? Math.floor(bankSize)
    : (VOCREHAB_BANK_CAPS[key] ?? VOCREHAB_DEFAULT_BANK_CAP);
  const want = difficulty === "brisk" ? base + VOCREHAB_BRISK_BONUS : base;
  return Math.max(0, Math.min(want, cap));
}

export function vocrehabModeLabel(state: VocrehabSeedModeState): string {
  const explicit = typeof state.seed === "string" ? state.seed.trim() : "";
  if (state.mode === "seeded" && explicit !== "") {
    return `Seeded ${explicit}`;
  }
  return "Random mix";
}
