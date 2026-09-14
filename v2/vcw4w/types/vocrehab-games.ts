/**
 * VocRehab micro-game shared types.
 *
 * Bands-and-supports language only: nothing here ranks players against each
 * other and nothing is framed as ability/IQ. Scores describe practice reps
 * plus suggested supports.
 */

export type VocrehabGameId =
  | "file-sort"
  | "inbox-sprint"
  | "focus-shift"
  | "barrier-run"
  | "schedule-juggle";

export type VocrehabEventKind =
  | "start"
  | "action"
  | "error"
  | "help"
  | "pause"
  | "resume"
  | "interrupt"
  | "complete";

/** Practice band: where this run landed, in supports language. */
export type VocrehabBand = "building" | "steady" | "strong";

export interface VocrehabGameEvent {
  t_ms: number;
  kind: VocrehabEventKind;
  detail?: string;
}

export interface VocrehabRunStats {
  correct: number;
  total: number;
  errors: number;
  helps: number;
  durationMs: number;
  interruptsHandled?: number;
}

export interface VocrehabScoreResult {
  band: VocrehabBand;
  accuracy: number;
  supports: string[];
}

export interface VocrehabGameResult {
  correct: number;
  total: number;
  errors: number;
  helps: number;
  notes?: string;
}

export interface VocrehabRunPayload {
  gameId: VocrehabGameId;
  result: VocrehabGameResult;
  durationMs: number;
  events: VocrehabGameEvent[];
}

export interface VocrehabGameMeta {
  id: VocrehabGameId;
  title: string;
  description: string;
  timeLimitSec: number;
  noTimer?: boolean;
}

export type VocrehabAssessmentKind =
  | "barriers"
  | "readiness"
  | "goals"
  | "remote"
  | "ipe"
  | "profile";

export interface VocrehabAssessmentRow {
  id: string;
  kind: VocrehabAssessmentKind;
  payload: Record<string, unknown>;
  profile: string | null;
  created_at: string;
}
