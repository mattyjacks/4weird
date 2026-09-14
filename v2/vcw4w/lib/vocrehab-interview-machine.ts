/**
 * VocRehab interview session state machine (Wave 2) — PURE module.
 *
 * Zero I/O, zero imports, SSR-safe. States:
 * idle → asking → speaking → listening → asking … → wrapup.
 * `interrupted` is a flag on listening/asking turns, not a state that
 * blocks Send. 6-turn cap mirrors vocrehabRoleplayTurnCap.
 */

export type VocrehabInterviewState =
  | "idle" | "asking" | "speaking" | "listening" | "wrapup";

export type VocrehabInterviewDifficulty = "beginner" | "advanced" | "expert";
export type VocrehabInterviewSessionMode = "live" | "turn";

export const vocrehabInterviewTurnCap = 6;

export interface VocrehabInterviewTurn {
  turn: number;
  question: string;
  answer: string;
  interrupted: boolean;
}

export interface VocrehabInterviewMachine {
  state: VocrehabInterviewState;
  turn: number; // next user turn number, 1-based
  turns: VocrehabInterviewTurn[];
  done: boolean;
}

export function vocrehabInterviewInit(): VocrehabInterviewMachine {
  return { state: "idle", turn: 1, turns: [], done: false };
}

export function vocrehabInterviewStart(_m: VocrehabInterviewMachine): VocrehabInterviewMachine {
  void _m;
  return { state: "asking", turn: 1, turns: [], done: false };
}

/** Record a sent answer; advances turn or lands in wrapup at the cap. */
export function vocrehabInterviewAnswer(
  m: VocrehabInterviewMachine,
  question: string,
  answer: string,
  opts?: { interrupted?: boolean; nextQuestion?: string },
): VocrehabInterviewMachine {
  const turns: VocrehabInterviewTurn[] = [
    ...m.turns,
    { turn: m.turn, question, answer: answer.slice(0, 2000), interrupted: opts?.interrupted ?? false },
  ];
  const done = m.turn >= vocrehabInterviewTurnCap;
  void opts?.nextQuestion;
  return {
    state: done ? "wrapup" : "asking",
    turn: done ? m.turn : m.turn + 1,
    turns,
    done,
  };
}

export function vocrehabIsDifficulty(v: unknown): v is VocrehabInterviewDifficulty {
  return v === "beginner" || v === "advanced" || v === "expert";
}

export function vocrehabIsSessionMode(v: unknown): v is VocrehabInterviewSessionMode {
  return v === "live" || v === "turn";
}

/** Difficulty strictness multiplier for grading (beginner 0.8 / advanced 1.0 / expert 1.25). */
export function vocrehabDifficultyStrictness(d: VocrehabInterviewDifficulty): number {
  return d === "beginner" ? 0.8 : d === "expert" ? 1.25 : 1.0;
}
