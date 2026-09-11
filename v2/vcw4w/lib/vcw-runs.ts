/**
 * VibeCodeWorker cloud run lifecycle; shared validation + handoff builder.
 *
 * The v2 deploy is serverless, so the /api/vcw/* agent API persists the
 * v1 worker loop (launch -> observe -> reason -> act -> bugs -> handoff)
 * in Postgres (vcw_runs / vcw_run_steps / vcw_bugs) instead of local
 * JSON files. This module holds the pure, unit-testable half: input
 * validation and the portable handoff markdown. Routes own auth,
 * rate limits, and Supabase reads/writes.
 */

import { falOpsForVcwPhase, isFalOp, opByKey, qtyForInput, quoteFalSplit } from "@/lib/fal";

export const VCW_RUN_KINDS = ["observation", "action", "finding"] as const;
export type VcwRunKind = (typeof VCW_RUN_KINDS)[number];

export const VCW_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type VcwSeverity = (typeof VCW_SEVERITIES)[number];

export const VCW_VERDICTS = ["pass", "fail", "inconclusive"] as const;
export type VcwVerdict = (typeof VCW_VERDICTS)[number];

export function isVcwRunKind(value: unknown): value is VcwRunKind {
  return typeof value === "string" && (VCW_RUN_KINDS as readonly string[]).includes(value);
}

export function isVcwSeverity(value: unknown): value is VcwSeverity {
  return typeof value === "string" && (VCW_SEVERITIES as readonly string[]).includes(value);
}

export function isVcwVerdict(value: unknown): value is VcwVerdict {
  return typeof value === "string" && (VCW_VERDICTS as readonly string[]).includes(value);
}

export function cleanGameSlug(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 64);
}

export function isRunUuid(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * fal.ai inside the VCW main loop (observe → reason → act).
 *
 * Agents call fal by logging an actions step whose text (or data object)
 * carries a `[tool: fal.generate; op=<op> prompt="..."]` tag with
 * source "vcw". The actions route detects the tag, validates the op
 * against the 30-op catalog, and returns the gross quote + next step
 * (POST /api/fal/generate) so the loop can chain observe → reason → act
 * without leaving the run trail. Video/3D ops are act-phase only (slow);
 * observe/reason prefer the fast text/image/audio ops.
 */
export const VCW_FAL_TOOL_ID = "fal.generate" as const;

export type VcwLoopPhase = "observe" | "reason" | "act";

export function vcwPhaseForKind(kind: string): VcwLoopPhase {
  if (kind === "observation") return "observe";
  if (kind === "finding") return "reason";
  return "act";
}

const FAL_TAG_RE = /\[tool:\s*fal\.generate\s*[;:,.\-]\s*([^\]]+)\]/i;

export function parseFalToolCall(text: unknown, data: unknown): { op: string; prompt: string } | null {
  const fromData =
    typeof data === "object" && data !== null
      ? String((data as Record<string, unknown>).fal_op ?? (data as Record<string, unknown>).op ?? "")
      : "";
  const hay = `${String(text ?? "")} ${fromData}`;
  if (!/fal\.generate/i.test(hay)) return null;
  const m = hay.match(FAL_TAG_RE);
  const chunk = m ? m[1] : hay;
  const opMatch =
    chunk.match(/op\s*[:=]\s*["']?([a-z0-9-]+)["']?/i) ?? fromData.match(/^["']?([a-z0-9-]+)/i);
  if (!opMatch) {
    // Bare mention without an op is not callable; the route will hint instead.
    return { op: "", prompt: "" };
  }
  const promptMatch =
    chunk.match(/prompt\s*[:=]\s*"([^"]{1,2000})"/i) ??
    chunk.match(/prompt\s*[:=]\s*'([^']{1,2000})'/i) ??
    chunk.match(/prompt\s*[:=]\s*([^;\]]{1,2000})/i);
  return { op: opMatch[1].toLowerCase(), prompt: (promptMatch?.[1] ?? "").trim().slice(0, 2000) };
}

export type VcwFalStepHint =
  | { detected: false }
  | {
      detected: true;
      ok: false;
      phase: VcwLoopPhase;
      hint: string;
      suggested: string[];
    }
  | {
      detected: true;
      ok: true;
      phase: VcwLoopPhase;
      op: string;
      model: string;
      quote: ReturnType<typeof quoteFalSplit>;
      next: string;
      prompt: string;
    };

/**
 * fal.ai meld for one recorded step (shared by the single- and batch-append
 * routes so both hand back the identical validated next hop). Pure: detects
 * a `[tool: fal.generate; op=<op> prompt="..."]` tag, validates the op
 * against the 30-op catalog, and returns the gross quote + next step.
 */
export function describeFalStep(kind: string, text: string, data: unknown): VcwFalStepHint {
  const phase = vcwPhaseForKind(kind);
  const falCall = parseFalToolCall(text, data);
  if (!falCall) return { detected: false };
  if (!falCall.op || !isFalOp(falCall.op)) {
    return {
      detected: true,
      ok: false,
      phase,
      hint: `Unknown fal op "${falCall.op || "missing"}". Pick one of the 30 ops from GET /api/fal/ops (observe/reason prefer: ${falOpsForVcwPhase("observe").join(", ")}; act can use any). Tag shape: [tool: fal.generate; op=<op> prompt="..."].`,
      suggested: falOpsForVcwPhase(phase),
    };
  }
  const def = opByKey(falCall.op);
  const qty = qtyForInput(falCall.op, { prompt: falCall.prompt });
  return {
    detected: true,
    ok: true,
    phase,
    op: def.op,
    model: def.model,
    quote: quoteFalSplit(def.op, qty),
    next: "POST /api/fal/generate { op, prompt, game_slug, source: \"vcw\" }; metered via meter_fal_usage, 25% cut included.",
    prompt: falCall.prompt.slice(0, 300),
  };
}

/** One batch-append item, validated exactly like a single actions step. */
export type VcwBatchItem = { kind: VcwRunKind; text: string; data: Record<string, unknown> };

const VCW_BATCH_MAX = 20;

/**
 * Validate a batch-append payload: 1-20 items, each with a legal kind,
 * 1-5000 chars of text, and a ≤10 KB JSON-object data. Returns the cleaned
 * items or the first human-readable rejection (routes map it to 400).
 */
export function cleanBatchSteps(value: unknown): { ok: true; items: VcwBatchItem[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: "steps must be an array of 1-20 { kind, text, data? } items." };
  if (value.length < 1 || value.length > VCW_BATCH_MAX) {
    return { ok: false, error: `steps must hold 1-${VCW_BATCH_MAX} items (got ${value.length}).` };
  }
  const items: VcwBatchItem[] = [];
  for (let i = 0; i < value.length; i++) {
    const raw = (value[i] ?? {}) as Record<string, unknown>;
    if (!isVcwRunKind(raw.kind)) return { ok: false, error: `steps[${i}].kind is invalid. Use observation, action, or finding.` };
    const text = String(raw.text ?? "").trim().slice(0, 5000);
    if (!text) return { ok: false, error: `steps[${i}].text is required (1-5000 chars).` };
    const extra = raw.data !== undefined ? raw.data : {};
    if (typeof extra !== "object" || extra === null || Array.isArray(extra)) {
      return { ok: false, error: `steps[${i}].data must be a JSON object when provided.` };
    }
    if (JSON.stringify(extra).length > 10000) return { ok: false, error: `steps[${i}].data must fit in 10 KB.` };
    items.push({ kind: raw.kind, text, data: extra as Record<string, unknown> });
  }
  return { ok: true, items };
}

export type VcwHandoffBug = {
  title: string;
  severity: string;
  game_slug: string;
  description: string;
};

export type VcwHandoffStep = {
  kind: string;
  text: string;
  created_at: string;
};

/** Portable AI handoff brief: paste into any vibecoding tool. */
export function buildRunHandoff(opts: {
  gameSlug: string;
  goal: string;
  status: string;
  verdict?: string | null;
  summary?: string | null;
  steps: VcwHandoffStep[];
  bugs: VcwHandoffBug[];
  reason: string;
  runId?: string;
  updatedAt?: string | null;
}): string {
  const steps = opts.steps ?? [];
  const bugs = opts.bugs ?? [];
  const kindCounts = new Map<string, number>();
  for (const s of steps) kindCounts.set(s.kind, (kindCounts.get(s.kind) ?? 0) + 1);
  const severityCounts = new Map<string, number>();
  for (const b of bugs) severityCounts.set(b.severity, (severityCounts.get(b.severity) ?? 0) + 1);
  const falMentions = steps.filter((s) => /fal\.generate/i.test(s.text)).length;
  const fmtCounts = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}×${v}`)
      .join(", ") || "none";
  const lines = [
    `# VCW run handoff - ${opts.gameSlug}`,
    ``,
    `Goal: ${opts.goal}`,
    `Status: ${opts.status}${opts.verdict ? ` (${opts.verdict})` : ""}`,
    `Reason: ${opts.reason}`,
  ];
  if (opts.runId) lines.push(`Run: ${opts.runId}`);
  if (opts.updatedAt) lines.push(`Updated: ${opts.updatedAt}`);
  if (opts.summary) lines.push(`Summary: ${opts.summary}`);
  lines.push(
    ``,
    `## Trail digest`,
    `- Steps: ${steps.length} (${fmtCounts(kindCounts)})`,
    `- Bugs: ${bugs.length} (${fmtCounts(severityCounts)})`,
    `- fal.generate mentions in trail: ${falMentions}`,
  );
  lines.push(``, `## Steps (${steps.length})`);
  for (const step of steps.slice(0, 50)) {
    const when = step.created_at ? ` @ ${step.created_at}` : "";
    lines.push(`- [${step.kind}]${when} ${step.text.slice(0, 300)}`);
  }
  if (steps.length > 50) lines.push(`- … ${steps.length - 50} earlier/older steps truncated (read GET /api/vcw/runs/[id] for the full trail)`);
  lines.push(``, `## Bugs (${bugs.length})`);
  for (const bug of bugs.slice(0, 50)) {
    lines.push(`- [${bug.severity}] ${bug.title.slice(0, 200)} (${bug.game_slug})`);
    if (bug.description) lines.push(`  ${bug.description.slice(0, 300)}`);
  }
  if (bugs.length > 50) lines.push(`- … ${bugs.length - 50} bugs truncated`);
  lines.push(
    ``,
    `## Next actions for the coding agent`,
    `- Reproduce: open GET /api/vcw/runs/[id] and replay the last observation → action pair.`,
    `- Fix order: critical → high → medium → low; file new findings via POST /api/vcw/runs/[id]/actions { kind: "finding" }.`,
    `- Media needs: emit \`[tool: fal.generate; op=<op> prompt="..."]\` in an actions step, then POST /api/fal/generate with source "vcw".`,
    `- Close out: POST /api/vcw/runs/[id]/complete { verdict, summary } when the goal is met or blocked.`,
  );
  return lines.join("\n").slice(0, 20000);
}
