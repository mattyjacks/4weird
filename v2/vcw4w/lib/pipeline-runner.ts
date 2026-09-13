/**
 * lib/pipeline-runner.ts — multi-stage pipeline engine, FAIL-OPEN (Remastery §5.2).
 *
 * USAGE (any tool team):
 *   import { registerStepExecutor, runPipeline } from "@/lib/pipeline-runner";
 *   registerStepExecutor("dictatepic", "upscale", async (input) => ({ imageUrl: "..." }));
 *   const result = await runPipeline("asset-ship", [
 *     { name: "upscale", tool: "dictatepic", action: "upscale", inputPayload: {} },
 *   ], { onProgress: (i, s) => console.log(i, s) });
 *   // result.ok === false with per-step errors instead of a throw — fail-open.
 *
 * CONTRACT (explicitly NOT the README fetch sketch):
 * - Zero network calls in this file. Steps run through LOCAL executors registered via
 *   registerStepExecutor(). An unregistered tool/action is a recorded step error, not a throw.
 * - Fail-open: one step failing records { status: "failed", error } and the run CONTINUES
 *   with the last good payload (or the step's `fallbackPayload` when provided). The run
 *   resolves { ok, steps, outputPayload } — it never rejects for step failures.
 * - Payloads are plain JSON-ish records; each step receives { ...step.inputPayload, ...current }.
 */

export type PipelineTool = "fal" | "dictatepic" | "mediamogul" | "vcw" | "squad" | string;

export interface PipelineStep {
  name: string;
  tool: PipelineTool;
  action: string;
  inputPayload: Record<string, unknown>;
  /** Used as the carry-forward payload when this step fails (defaults to last good). */
  fallbackPayload?: Record<string, unknown>;
  /** Max attempts for this step (default 1 — no retry storms). */
  maxAttempts?: number;
}

export type StepStatus = "ok" | "failed" | "skipped";

export interface StepResult {
  name: string;
  tool: PipelineTool;
  action: string;
  status: StepStatus;
  attempts: number;
  outputPayload: Record<string, unknown>;
  error?: string;
}

export interface PipelineResult {
  pipeline: string;
  ok: boolean;
  steps: StepResult[];
  outputPayload: Record<string, unknown>;
}

export interface RunPipelineOptions {
  onProgress?: (stepIdx: number, total: number, status: string) => void;
  signal?: AbortSignal;
}

export type StepExecutor = (
  input: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

const executors = new Map<string, StepExecutor>();

function executorKey(tool: PipelineTool, action: string): string {
  return `${tool}::${action}`;
}

/** Tool teams call this at module init to teach the runner a local step. Re-registering wins. */
export function registerStepExecutor(
  tool: PipelineTool,
  action: string,
  fn: StepExecutor,
): void {
  executors.set(executorKey(tool, action), fn);
}

/** True when a tool/action has a local executor (lets UIs disable unhandled steps). */
export function hasStepExecutor(tool: PipelineTool, action: string): boolean {
  return executors.has(executorKey(tool, action));
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Execute steps in order. Never rejects for step failures — see PipelineResult. */
export async function runPipeline(
  pipelineName: string,
  steps: PipelineStep[],
  options: RunPipelineOptions = {},
): Promise<PipelineResult> {
  const { onProgress, signal } = options;
  const results: StepResult[] = [];
  let current: Record<string, unknown> = {};
  let allOk = true;

  const progress = (idx: number, status: string): void => {
    try {
      onProgress?.(idx, steps.length, status);
    } catch {
      // Fail-open: progress UI must never break the run.
    }
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (signal?.aborted) {
      results.push({
        name: step.name,
        tool: step.tool,
        action: step.action,
        status: "skipped",
        attempts: 0,
        outputPayload: { ...current },
        error: "Pipeline aborted.",
      });
      allOk = false;
      break;
    }
    progress(i, `Executing ${step.name}...`);
    const executor = executors.get(executorKey(step.tool, step.action));
    const maxAttempts = Math.max(1, Math.min(3, Math.floor(step.maxAttempts ?? 1)));
    let attempts = 0;
    let failed: string | null = executor
      ? null
      : `No executor registered for ${step.tool}::${step.action}.`;
    let output: Record<string, unknown> = { ...current };

    while (executor && failed === null && attempts < maxAttempts) {
      attempts += 1;
      try {
        const input = { ...step.inputPayload, ...current };
        const produced = await executor(input, signal);
        output = { ...current, ...toRecord(produced) };
        break;
      } catch (err) {
        failed = err instanceof Error ? err.message : String(err);
        if (attempts >= maxAttempts) break;
      }
    }
    if (!executor) attempts = 0;

    if (failed !== null) {
      allOk = false;
      output = { ...(step.fallbackPayload ?? current) };
      results.push({
        name: step.name,
        tool: step.tool,
        action: step.action,
        status: "failed",
        attempts,
        outputPayload: output,
        error: failed,
      });
    } else {
      results.push({
        name: step.name,
        tool: step.tool,
        action: step.action,
        status: "ok",
        attempts: Math.max(attempts, 1),
        outputPayload: output,
      });
    }
    current = output;
    progress(i + 1, failed !== null ? `Step ${step.name} failed (continuing).` : `Step ${step.name} done.`);
  }

  progress(steps.length, allOk ? `Pipeline ${pipelineName} completed.` : `Pipeline ${pipelineName} completed with errors.`);
  return { pipeline: pipelineName, ok: allOk, steps: results, outputPayload: current };
}
