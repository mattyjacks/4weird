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
