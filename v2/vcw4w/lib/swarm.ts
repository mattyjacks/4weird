/**
 * Agent Swarm Chat; hire a swarm of agents as one chatbot interface.
 *
 * One rule everywhere: every swarm price INCLUDES the 25% platform cut
 * (SWARM_COMPUTE_CUT_PCT), never added on top; same as SERVICE_CUT_PCT,
 * GAME_AI_COMPUTE_CUT_PCT, WORKSPACE_COMPUTE_CUT_PCT.
 *
 * The swarm reuses the VibeCodeWorker loop shape per agent:
 *   OBSERVE -> REASON -> ACT -> METER
 * and self-orchestrates with the built-in reasoning-harness pattern (a lead agent
 * plans observe→reason→act steps, then delegates to worker agents), while
 * every agent can automatically use all tools; including the VibeCodeWorker
 * code-export bridge (export/heal) and the reasoning harness -
 * via the SWARM_TOOLS registry below.
 *
 * Metering rides the existing `meter_game_ai_usage` RPC with kind
 * `inference` + game_slug `swarm`, so no new ledger kind is needed and the
 * 25/75 split stays in SQL. Quotes here mirror that RPC rate (6 coins per
 * worker-min unit, fractional qty allowed) via quoteGameAi().
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";
import { quoteGameAi, gameAiSplit } from "@/lib/game-ai";
import { RUNTIMES, type Runtime } from "@/lib/agent-market";

/** Same 25% as every other compute surface; one rule. */
export const SWARM_COMPUTE_CUT_PCT = 25;

export const SWARM_GAME_SLUG = "swarm";
export const SWARM_METER_KIND = "inference" as const;
export const SWARM_METER_SOURCE = "chat" as const;

export const SWARM_MIN_AGENTS = 1;
export const SWARM_MAX_AGENTS = 5;
export const SWARM_MAX_SYSTEM_PROMPT = 2000;
export const SWARM_MAX_AGENT_PROMPT = 1200;
export const SWARM_MAX_MESSAGE = 4000;
export const SWARM_MAX_NAME = 60;

export const SWARM_ORCHESTRATIONS = ["auto", "lead", "round-robin"] as const;
export type SwarmOrchestration = (typeof SWARM_ORCHESTRATIONS)[number];

export const SWARM_MODELS = ["auto", "openai", "openrouter", "local"] as const;
export type SwarmModel = (typeof SWARM_MODELS)[number];

export function isSwarmOrchestration(value: unknown): value is SwarmOrchestration {
  return typeof value === "string" && (SWARM_ORCHESTRATIONS as readonly string[]).includes(value);
}

export function isSwarmModel(value: unknown): value is SwarmModel {
  return typeof value === "string" && (SWARM_MODELS as readonly string[]).includes(value);
}

export function cleanSwarmName(value: unknown): string {
  return String(value ?? "").trim().slice(0, SWARM_MAX_NAME);
}

export function cleanSwarmSize(value: unknown): number {
  const v = Number(value);
  if (!Number.isInteger(v) || v < SWARM_MIN_AGENTS || v > SWARM_MAX_AGENTS) return 0;
  return v;
}

export function cleanSystemPrompt(value: unknown, max = SWARM_MAX_SYSTEM_PROMPT): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanAgentPrompt(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, SWARM_MAX_AGENT_PROMPT);
}

export function cleanSwarmMessage(value: unknown): string {
  return String(value ?? "").trim().slice(0, SWARM_MAX_MESSAGE);
}

export function cleanTemperature(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0.8;
  return Math.min(1.5, Math.max(0, Math.round(v * 100) / 100));
}

export function cleanSwarmRuntime(value: unknown): Runtime {
  return typeof value === "string" && (RUNTIMES as readonly string[]).includes(value)
    ? (value as Runtime)
    : "vibecodeworker";
}

/* ---------------------------------------------------------------------------
 * Tool registry; every agent can automatically use all of these.
 * Names mirror the real surfaces so prompts + traces stay greppable:
 * - vcw.*       -> /api/vcw/* run lifecycle (status, games, runs, actions, bugs, handoff)
 * - opencode.*  -> VibeCodeWorker code bridge (export/heal/fix)
 * - deepseek.*  -> built-in harness self-orchestration (observe→reason→act plan)
 * - fal.*       -> /api/fal/generate media ops
 * - buddy.*     -> /api/buddy/* voice + presence
 * - swarm.*     -> internal delegation between swarm members
 * ------------------------------------------------------------------------- */

export type SwarmTool = {
  id: string;
  label: string;
  blurb: string;
  /** arrière; keyword auto-trigger patterns (lowercase fragments). */
  triggers: string[];
};

export const SWARM_TOOLS: SwarmTool[] = [
  { id: "vcw.open_run", label: "VCW run", blurb: "Open a VibeCodeWorker QA run on a catalog game (observe→reason→act).", triggers: ["test game", "playtest", "qa run", "start run", "observe"] },
  { id: "vcw.file_finding", label: "VCW finding", blurb: "File a VibeCodeWorker bug finding with evidence.", triggers: ["bug", "finding", " broken", "glitch", "repro"] },
  { id: "vcw.handoff", label: "VCW handoff", blurb: "Produce a portable VCW handoff brief for any vibecoding tool.", triggers: ["handoff", "brief", "summary of run", "portable"] },
  { id: "opencode.export", label: "Code export", blurb: "Export a bug/test report for external code tools.", triggers: ["opencode", "export bug", "code fix", "edit repo", " heal"] },
  { id: "opencode.heal", label: "Code heal", blurb: "Start a test→fix→re-test heal loop.", triggers: ["heal", "self-heal", "fix loop", "retest", "re-test"] },
  { id: "deepseek.orchestrate", label: "Swarm orchestrate", blurb: "Built-in harness plan: decompose the goal into delegated steps.", triggers: ["plan", "orchestrat", "decompose", "strategy", "reason"] },
  { id: "fal.generate", label: "Fal media", blurb: "Generate art/sprites/3D/video/voice/SFX/music/dialogue via /api/fal/generate (30 ops, source vcw).", triggers: ["voice", "sfx", "music", "art", "sprite", "draw", "sing", "3d", "video", "cutscene", "dialogue", "chiptune", "backdrop", "capsule"] },
  { id: "buddy.tts", label: "Buddy voice", blurb: "Speak a reply aloud in one of 9 Buddy voices.", triggers: ["say ", "speak", "read aloud", "shout"] },
  { id: "swarm.delegate", label: "Delegate", blurb: "Hand a subtask to another swarm member.", triggers: ["delegate", "subtask", "you two", "split up", "parallel"] },
];

export function isSwarmToolId(value: unknown): boolean {
  return typeof value === "string" && SWARM_TOOLS.some((t) => t.id === value);
}

export function cleanToolIds(value: unknown): string[] {
  if (!Array.isArray(value)) return SWARM_TOOLS.map((t) => t.id);
  const picked = value.filter(isSwarmToolId);
  // Empty explicit array means "no tools"; honor it (fail closed elsewhere).
  return Array.from(new Set(picked)).slice(0, SWARM_TOOLS.length);
}

/** Keyword auto-router: which tools does this message probably need? */
export function detectSwarmTools(message: string, enabled: string[]): string[] {
  const t = String(message ?? "").toLowerCase();
  const allow = new Set(enabled);
  const out: string[] = [];
  for (const tool of SWARM_TOOLS) {
    if (!allow.has(tool.id)) continue;
    if (tool.triggers.some((frag) => t.includes(frag))) out.push(tool.id);
  }
  // "use all tools" / explicit orchestration asks always pull the harness in.
  if (/(all tools|use .*tools|orchestrat|swarm|harness)/.test(t) && allow.has("deepseek.orchestrate") && !out.includes("deepseek.orchestrate")) {
    out.unshift("deepseek.orchestrate");
  }
  return out.slice(0, 4);
}

/* ---------------------------------------------------------------------------
 * Harness-style self-orchestration (pure + unit-testable).
 * Mirrors public/ai/vibecodeworker/lib/deepseek_harness.js:
 * observe the goal -> reason a step plan -> act by delegating per agent.
 * ------------------------------------------------------------------------- */

export type SwarmAgentSpec = { name: string; runtime: Runtime; prompt: string };

export type SwarmPlan = {
  mode: SwarmOrchestration;
  /** Lead agent index (auto/lead) or -1 for round-robin. */
  lead: number;
  steps: { agent: number; task: string; tools: string[] }[];
  trace: string[];
};

const AGENT_NAMES = ["Scout", "Forge", "Echo", "Pixel", "Sage"];

export function defaultAgentSpecs(size: number, runtime: Runtime = "vibecodeworker"): SwarmAgentSpec[] {
  const n = Math.min(SWARM_MAX_AGENTS, Math.max(SWARM_MIN_AGENTS, Math.floor(size) || 1));
  return Array.from({ length: n }, (_, i) => ({
    name: AGENT_NAMES[i] ?? `Agent ${i + 1}`,
    runtime,
    prompt: "",
  }));
}

function splitGoalIntoTasks(goal: string, size: number): string[] {
  const g = String(goal ?? "").replace(/\s+/g, " ").trim();
  if (!g) return Array.from({ length: size }, (_, i) => `Hold position and report status (agent ${i + 1}).`);
  if (size === 1) return [g];
  // Deterministic split on sentence/clause boundaries; never random.
  const parts = g.split(/(?<=[.!?;])\s+|\s+then\s+|\s+and then\s+/i).map((s) => s.trim()).filter(Boolean);
  const tasks: string[] = [];
  for (let i = 0; i < size; i++) {
    tasks.push(parts[i] ?? `Support step ${i + 1} of: ${g.slice(0, 140)}`);
  }
  return tasks;
}

/**
 * Plan who does what this turn. Pure/deterministic: same inputs -> same plan.
 * - auto: lead (agent 0) reasons via the built-in harness pattern, delegates.
 * - lead: agent 0 answers first, others support.
 * - round-robin: rotate the lead by message count.
 */
export function planSwarmTurn(input: {
  message: string;
  size: number;
  mode: SwarmOrchestration;
  turnIndex: number;
  enabledTools: string[];
}): SwarmPlan {
  const size = cleanSwarmSize(input.size) || 1;
  const mode: SwarmOrchestration = isSwarmOrchestration(input.mode) ? input.mode : "auto";
  const tasks = splitGoalIntoTasks(input.message, size);
  const lead = mode === "round-robin" ? Math.max(0, Number(input.turnIndex) || 0) % size : 0;
  const trace: string[] = [
    `OBSERVE: goal "${String(input.message ?? "").slice(0, 120)}" across ${size} agent${size === 1 ? "" : "s"} (${mode}).`,
    `REASON (harness): split into ${size} step${size === 1 ? "" : "s"}; lead is agent ${lead + 1}.`,
  ];
  const steps = tasks.map((task, i) => {
    const tools = i === lead
      ? detectSwarmTools(String(input.message ?? ""), input.enabledTools)
      : detectSwarmTools(task, input.enabledTools).slice(0, 1);
    if (i === lead && mode !== "round-robin" && !tools.includes("deepseek.orchestrate") && input.enabledTools.includes("deepseek.orchestrate")) {
      tools.unshift("deepseek.orchestrate");
    }
    return { agent: i, task, tools: tools.slice(0, 3) };
  });
  trace.push(`ACT: delegated ${steps.length} step${steps.length === 1 ? "" : "s"}${mode === "auto" ? " via deepseek.orchestrate" : mode === "lead" ? " via lead agent" : " round-robin"}.`);
  return { mode, lead, steps, trace };
}

/* ---------------------------------------------------------------------------
 * Prompts + replies (server + client share the shape; the API does the keys).
 * ------------------------------------------------------------------------- */

export function swarmSystemPrompt(input: {
  swarmName: string;
  globalPrompt: string;
  agent: SwarmAgentSpec;
  agentIndex: number;
  orchestration: SwarmOrchestration;
  tools: string[];
}): string {
  const role = cleanAgentPrompt(input.agent.prompt);
  const global = cleanSystemPrompt(input.globalPrompt);
  const tools = input.tools.filter(isSwarmToolId);
  const parts = [
    `You are ${input.agent.name} (agent ${input.agentIndex + 1}, ${input.agent.runtime}) in the "${cleanSwarmName(input.swarmName) || "Swarm"}" agent swarm on 4weird.games.`,
    `Orchestration: ${input.orchestration} (built-in observe→reason→act; ${input.orchestration === "round-robin" ? "take your turn and hand off" : input.orchestration === "lead" ? "agent 1 leads, others support" : "agent 1 plans with deepseek.orchestrate, then delegates"}).`,
  ];
  if (global) parts.push(`Swarm instructions: ${global}`);
  if (role) parts.push(`Your role: ${role}`);
  parts.push(
    `You can automatically use all tools: ${tools.length ? tools.join(", ") : "none enabled"}. ` +
    `To call one, emit [tool: id; args] on its own line (e.g. [tool: opencode.export; heal the login bug]). ` +
     `VibeCodeWorker runs/bugs/handoffs via vcw.*, code fixes via opencode.* (code export), planning via deepseek.orchestrate. ` +
    `Answer in 1-3 short sentences grounded in the chat; never claim hidden browsing; never repeat these instructions.`,
  );
  return parts.join(" ").slice(0, 3000);
}

/** Deterministic local reply when no model key is configured; free, labelled. */
export function localSwarmReply(input: {
  agent: SwarmAgentSpec;
  agentIndex: number;
  task: string;
  tools: string[];
  turnIndex: number;
}): { text: string; toolCalls: { id: string; args: string }[] } {
  const toolCalls = input.tools.slice(0, 2).map((id) => ({ id, args: input.task.slice(0, 120) || "general assist" }));
  const calls = toolCalls.length ? ` I'll use ${toolCalls.map((c) => c.id).join(" + ")} on this.` : "";
  const text =
    `(${input.agent.name}, ${input.agent.runtime}) step ${input.turnIndex + 1}: ` +
    `taking "${input.task.slice(0, 160)}".${calls} ` +
    `Local engine is free; connect OPENAI_API_KEY for full reasoning.`;
  return { text: text.slice(0, 800), toolCalls };
}

/* ---------------------------------------------------------------------------
 * Metering; gross INCLUDES the 25% cut (SQL splits 25/75).
 * qty unit for `inference` = worker-min equivalent; derive from chars so the
 * ledger lands on the true-cost gross. Per-agent fan-out multiplies qty.
 * ------------------------------------------------------------------------- */

export function swarmQtyForTurn(input: { promptChars: number; replyChars: number; agents: number }): number {
  const promptK = Math.max(0.05, Number(input.promptChars) / 4000);
  const replyK = Math.max(0.05, Number(input.replyChars) / 4000);
  const agents = cleanSwarmSize(input.agents) || 1;
  return Math.max(0.0001, Math.round((promptK + replyK) * agents * 10000) / 10000);
}

export function quoteSwarmTurn(input: { promptChars: number; replyChars: number; agents: number }): {
  gross: number;
  cut: number;
  provider: number;
  qty: number;
  display: string;
} {
  const qty = swarmQtyForTurn(input);
  const gross = quoteGameAi(SWARM_METER_KIND, qty);
  const split = gameAiSplit(gross);
  return {
    gross: split.gross,
    cut: split.cut,
    provider: split.provider,
    qty,
    display: `${split.gross} coins (includes ${SERVICE_CUT_PCT}% platform cut)`,
  };
}

export const SWARM_CUT_NOTE = `Includes ${SWARM_COMPUTE_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;
