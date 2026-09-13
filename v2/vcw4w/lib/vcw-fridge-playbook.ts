/**
 * Fridge VCW autoplay playtest harness (fridgesimulator runs).
 *
 * Pure, unit-testable half of the observe -> reason -> act loop for the
 * fridge playtest target. This module performs NO network calls, reads NO
 * auth state, touches NO metering, and holds NO secrets: it only builds
 * and validates in-memory shapes.
 *
 * - observeFridgeState(): snapshot the fridge under test into a FridgeState.
 * - reasonNextFridgeAction(state): pick the next playbook action for a state.
 * - actFridgeAction(action): stub that queues (describes) the action without
 *   executing it — execution lives in the run's actions step, not here.
 * - fileFridgeFinding(input): validate + build a POST /api/vcw/bugs-ready
 *   body ({ title, description, severity, game_slug, run_id? }). The caller
 *   POSTs it; this module never fetches.
 *
 * FRIDGE_PLAYBOOK_STEPS names the loop order: observe -> reason -> act.
 */

import {
  cleanGameSlug,
  isRunUuid,
  isVcwSeverity,
  VCW_SEVERITIES,
  type VcwSeverity,
} from "@/lib/vcw-runs";

export const FRIDGE_GAME_SLUG = "fridgesimulator" as const;

export const FRIDGE_PLAYBOOK_STEPS = ["observe", "reason", "act"] as const;
export type FridgePlaybookStep = (typeof FRIDGE_PLAYBOOK_STEPS)[number];

export function isFridgePlaybookStep(value: unknown): value is FridgePlaybookStep {
  return (
    typeof value === "string" &&
    (FRIDGE_PLAYBOOK_STEPS as readonly string[]).includes(value)
  );
}

export interface FridgeState {
  doorOpen: boolean;
  lightOn: boolean;
  temperatureC: number;
  observedAt: string;
  note: string;
}

export interface FridgeStateInput {
  doorOpen?: unknown;
  lightOn?: unknown;
  temperatureC?: unknown;
  note?: unknown;
}

function toFiniteTemp(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 4;
  return Math.min(30, Math.max(-30, n));
}

/**
 * Snapshot the fridge under test. Inputs are typically reviewer-supplied
 * (form fields, debug-play viewport) — everything is coerced fail-open to
 * a well-formed FridgeState so the loop never throws on bad input.
 */
export function observeFridgeState(input?: FridgeStateInput): FridgeState {
  const raw = (input ?? {}) as FridgeStateInput;
  return {
    doorOpen: raw.doorOpen === true,
    lightOn: raw.lightOn === true,
    temperatureC: toFiniteTemp(raw.temperatureC),
    observedAt: new Date().toISOString(),
    note: String(raw.note ?? "").trim().slice(0, 500),
  };
}

export const FRIDGE_ACTIONS = [
  "close-door",
  "open-door",
  "toggle-light",
  "lower-thermostat",
  "raise-thermostat",
  "done",
] as const;
export type FridgeAction = (typeof FRIDGE_ACTIONS)[number];

export function isFridgeAction(value: unknown): value is FridgeAction {
  return (
    typeof value === "string" &&
    (FRIDGE_ACTIONS as readonly string[]).includes(value)
  );
}

/**
 * Deterministic next-action policy for a fridge snapshot:
 * shut an open door first, then fix out-of-range temperature (2-6 C band),
 * then verify the light, otherwise the playtest step is done.
 */
export function reasonNextFridgeAction(state: FridgeState): FridgeAction {
  if (state.doorOpen) return "close-door";
  if (state.temperatureC > 6) return "lower-thermostat";
  if (state.temperatureC < 2) return "raise-thermostat";
  if (!state.lightOn) return "toggle-light";
  return "done";
}

export interface FridgeQueuedAction {
  action: FridgeAction;
  queued: true;
  queuedAt: string;
  executed: false;
}

/**
 * Stub: describe (queue) an action without executing it. No side effects —
 * the run's actions step performs real execution and records the trail.
 */
export function actFridgeAction(action: FridgeAction): FridgeQueuedAction {
  if (!isFridgeAction(action)) {
    throw new Error(
      `Unknown fridge action. Use one of: ${FRIDGE_ACTIONS.join(", ")}.`
    );
  }
  return {
    action,
    queued: true,
    queuedAt: new Date().toISOString(),
    executed: false,
  };
}

export interface FridgeFindingInput {
  title?: unknown;
  severity?: unknown;
  /** Reproduction steps / what the reviewer saw — sent as `description`. */
  repro?: unknown;
  game_slug?: unknown;
  gameSlug?: unknown;
  run_id?: unknown;
  runId?: unknown;
}

export interface FridgeFindingBody {
  title: string;
  description: string;
  severity: VcwSeverity;
  game_slug: string;
  run_id?: string;
}

export type FridgeFindingResult =
  | { ok: true; body: FridgeFindingBody }
  | { ok: false; error: string };

/**
 * Validate reviewer input and build the JSON body for POST /api/vcw/bugs.
 * Mirrors the route's contract: title 1-200 chars, description required
 * (from `repro`), severity defaults to "medium", game_slug defaults to
 * fridgesimulator, run_id (when given) must be a UUID. Never POSTs.
 */
export function fileFridgeFinding(input: FridgeFindingInput): FridgeFindingResult {
  const raw = (input ?? {}) as FridgeFindingInput;
  const title = String(raw.title ?? "").trim().slice(0, 200);
  if (!title) return { ok: false, error: "A title is required (1-200 chars)." };
  const description = String(raw.repro ?? "").trim().slice(0, 10000);
  if (!description) return { ok: false, error: "Repro steps are required." };
  const severity: unknown = raw.severity === undefined ? "medium" : raw.severity;
  if (!isVcwSeverity(severity)) {
    return {
      ok: false,
      error: `Invalid severity. Use one of: ${VCW_SEVERITIES.join(", ")}.`,
    };
  }
  const slug = cleanGameSlug(raw.game_slug ?? raw.gameSlug) || FRIDGE_GAME_SLUG;
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) {
    return { ok: false, error: "Invalid game_slug." };
  }
  const runRaw = raw.run_id ?? raw.runId;
  let run_id: string | undefined;
  if (runRaw !== undefined && runRaw !== null && String(runRaw) !== "") {
    if (!isRunUuid(runRaw)) return { ok: false, error: "Invalid run_id." };
    run_id = String(runRaw);
  }
  const body: FridgeFindingBody = { title, description, severity, game_slug: slug };
  if (run_id) body.run_id = run_id;
  return { ok: true, body };
}
