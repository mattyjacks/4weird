/**
 * VibeCodeWorker cloud run lifecycle — shared validation + handoff builder.
 *
 * The v2 deploy is serverless, so the /api/vcw/* agent API persists the
 * v1 worker loop (launch -> observe -> reason -> act -> bugs -> handoff)
 * in Postgres (vcw_runs / vcw_run_steps / vcw_bugs) instead of local
 * JSON files. This module holds the pure, unit-testable half: input
 * validation and the portable handoff markdown. Routes own auth,
 * rate limits, and Supabase reads/writes.
 */

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
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

/**
 * fal.ai inside the VCW main loop (observe → reason → act).
 *
 * Agents call fal by logging an actions step whose text (or data object)
 * carries a `[tool: fal.generate — op=<op> prompt="..."]` tag with
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

const FAL_TAG_RE = /\[tool:\s*fal\.generate\s*[—-]\s*([^\]]+)\]/i;

export function parseFalToolCall(text: unknown, data: unknown): { op: string; prompt: string } | null {
  const fromData =
    typeof data === "object" && data !== null
      ? String((data as Record<string, unknown>).fal_op ?? (data as Record<string, unknown>).op ?? "")
      : "";
  const hay = `${String(text ?? "")} ${fromData}`;
  const m = hay.match(FAL_TAG_RE);
  const chunk = m ? m[1] : hay;
  const opMatch = chunk.match(/op\s*=\s*([a-z0-9-]+)/i) ?? fromData.match(/^([a-z0-9-]+)/i);
  if (!opMatch) {
    // Bare mention without an op is not callable — the route will hint instead.
    return /fal\.generate/i.test(hay) ? { op: "", prompt: "" } : null;
  }
  const promptMatch = chunk.match(/prompt\s*=\s*"([^"]{1,2000})"/i) ?? chunk.match(/prompt\s*=\s*'([^']{1,2000})'/i);
  return { op: opMatch[1].toLowerCase(), prompt: (promptMatch?.[1] ?? "").slice(0, 2000) };
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
}): string {
  const lines = [
    `# VCW run handoff — ${opts.gameSlug}`,
    ``,
    `Goal: ${opts.goal}`,
    `Status: ${opts.status}${opts.verdict ? ` (${opts.verdict})` : ""}`,
    `Reason: ${opts.reason}`,
  ];
  if (opts.summary) lines.push(`Summary: ${opts.summary}`);
  lines.push(``, `## Steps (${opts.steps.length})`);
  for (const step of opts.steps.slice(0, 50)) {
    lines.push(`- [${step.kind}] ${step.text.slice(0, 300)}`);
  }
  lines.push(``, `## Bugs (${opts.bugs.length})`);
  for (const bug of opts.bugs.slice(0, 50)) {
    lines.push(`- [${bug.severity}] ${bug.title.slice(0, 200)} (${bug.game_slug})`);
  }
  return lines.join("\n").slice(0, 20000);
}
