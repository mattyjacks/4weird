// v2/vcw4w/lib/remastery/pipeline-runner.ts
// README §5.2 — Automated Multi-Step Pipeline Engine, hardened per §1.2 axioms
// (fail-open safety, SSR-safe, interop events).
//
// Pure TypeScript module: ZERO browser APIs (no window/document/localStorage/fetch,
// no BroadcastChannel). Safe to import from server components, route handlers,
// and client code alike. Fully self-contained: no imports from sibling
// lib/remastery/* modules; step events are fanned out via local onStepDone
// listeners instead of the interop bus.
//
// Contract:
// - runPipeline(steps, initialCtx) never throws (fail-open). A failing step is
//   recorded and either aborts the rest (marked "skipped") or continues, per
//   that step's `continueOnFailure` flag.
// - Per-step timeouts are enforced with Promise.race and recorded as "timed-out".
// - A `runToken` may be supplied to guard against double-run: a token already
//   executing cannot start a second concurrent run.

export type PipelineCtx = Record<string, unknown>;

export interface PipelineStep<T extends PipelineCtx = PipelineCtx> {
  name: string;
  run: (ctx: T) => unknown | Promise<unknown>;
  /** Per-step timeout in ms. Non-positive/non-finite means "no timeout". */
  timeoutMs?: number;
  /** When true, a failure/timeout of this step lets the pipeline continue. */
  continueOnFailure?: boolean;
}

export type StepStatus = "ok" | "failed" | "skipped" | "timed-out";

export interface StepRecord {
  name: string;
  status: StepStatus;
  /** Epoch-ms timestamp when the step started. */
  startedAt: number;
  /** Epoch-ms timestamp when the step settled (ok/failed/timed-out/skipped). */
  endedAtMs: number;
  error?: string;
}

export interface PipelineResult<T extends PipelineCtx = PipelineCtx> {
  records: StepRecord[];
  ctx: T;
  /** True when the run was refused because its runToken is already executing. */
  duplicateRun?: boolean;
}

export interface RunPipelineOptions {
  /**
   * Anti-double-run token. When supplied, a second concurrent runPipeline call
   * with the same token returns immediately with `{ records: [], duplicateRun: true }`
   * instead of executing. The token is released when the first run settles.
   */
  runToken?: string;
  /** Fallback timeout (ms) for steps that omit `timeoutMs`. Default 30s. */
  defaultTimeoutMs?: number;
}

export type StepDoneListener = (record: StepRecord, ctx: PipelineCtx) => void;
export type Unsubscribe = () => void;

export const DEFAULT_STEP_TIMEOUT_MS = 30_000;

const activeRunTokens = new Set<string>();
const stepDoneListeners = new Set<StepDoneListener>();

/** Subscribe to per-step completion events. Returns an unsubscribe function. */
export function onStepDone(listener: StepDoneListener): Unsubscribe {
  stepDoneListeners.add(listener);
  return () => {
    stepDoneListeners.delete(listener);
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown step failure";
  }
}

class StepTimeoutError extends Error {
  constructor(stepName: string, timeoutMs: number) {
    super(`Step "${stepName}" timed out after ${timeoutMs}ms`);
    this.name = "StepTimeoutError";
  }
}

/** Race step work against a timer; non-positive/non-finite ms means no timeout. */
function withTimeout<T>(work: Promise<T>, ms: number, stepName: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gate = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new StepTimeoutError(stepName, ms)), ms);
  });
  return Promise.race([work, gate]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

function emitStepDone(record: StepRecord, ctx: PipelineCtx): void {
  for (const listener of stepDoneListeners) {
    try {
      listener(record, ctx);
    } catch {
      // Listener failures must never break the pipeline (fail-open).
    }
  }
}

/**
 * Execute steps in order, threading a context object through them. A step whose
 * `run` resolves to a plain object has it shallow-merged into the context.
 * Never throws: failures are captured as step records.
 */
export async function runPipeline<T extends PipelineCtx>(
  steps: PipelineStep<T>[],
  initialCtx: T,
  options: RunPipelineOptions = {},
): Promise<PipelineResult<T>> {
  const token = options.runToken;
  if (token !== undefined) {
    if (activeRunTokens.has(token)) {
      return { records: [], ctx: initialCtx, duplicateRun: true };
    }
    activeRunTokens.add(token);
  }

  const fallbackTimeout = options.defaultTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
  let ctx: T = { ...initialCtx };
  const records: StepRecord[] = [];

  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const startedAt = Date.now();
      let record: StepRecord;

      try {
        const output = await withTimeout(
          Promise.resolve().then(() => step.run(ctx)),
          step.timeoutMs ?? fallbackTimeout,
          step.name,
        );
        if (isRecord(output)) {
          ctx = { ...ctx, ...output };
        }
        record = { name: step.name, status: "ok", startedAt, endedAtMs: Date.now() };
      } catch (err) {
        const status: StepStatus = err instanceof StepTimeoutError ? "timed-out" : "failed";
        record = {
          name: step.name,
          status,
          startedAt,
          endedAtMs: Date.now(),
          error: toErrorMessage(err),
        };
      }

      records.push(record);
      emitStepDone(record, ctx);

      if (record.status !== "ok" && step.continueOnFailure !== true) {
        for (let j = i + 1; j < steps.length; j++) {
          const now = Date.now();
          const skipped: StepRecord = {
            name: steps[j].name,
            status: "skipped",
            startedAt: now,
            endedAtMs: now,
          };
          records.push(skipped);
          emitStepDone(skipped, ctx);
        }
        break;
      }
    }
  } catch (err) {
    // Defensive: runPipeline itself must never throw (fail-open axiom).
    const now = Date.now();
    const record: StepRecord = {
      name: "(pipeline)",
      status: "failed",
      startedAt: now,
      endedAtMs: now,
      error: toErrorMessage(err),
    };
    records.push(record);
    emitStepDone(record, ctx);
  } finally {
    if (token !== undefined) activeRunTokens.delete(token);
  }

  return { records, ctx };
}
