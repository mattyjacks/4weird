/**
 * Buddy multi-agent orchestrator; one goal fans out to specialist agents
 * (each an OpenRouter play), then merges their outputs into a super-pack.
 *
 * Transport-agnostic by design: the caller injects a `PlayRunner`, so the
 * SAME orchestration runs on desktop (direct OpenRouter), web
 * (/api/openrouter-plays), a Runpod pod (same as desktop), and Runpod
 * Serverless (the runpod/buddy handler injects its own runner).
 * Every specialist degrades to its offline fallback independently; one
 * slow/broken agent never sinks the pack.
 *
 * Pure module besides the openrouter-plays catalog import: no Next.js,
 * no Supabase, no keys; safe for tsc + edge.
 */

import { fallbackOpenRouterPlay, getPlay } from "./openrouter-plays";

export type SpecialistId = "voice" | "hype" | "lore" | "sfx" | "coach" | "quest" | "herald";

/** Each specialist is one proven OpenRouter play. */
export const SPECIALIST_PLAYS: Record<SpecialistId, string> = {
  voice: "npc-barks",
  hype: "hype-caster",
  lore: "lorekeeper",
  sfx: "sfx-smith",
  coach: "tutorial-ghost",
  quest: "quest-crafter",
  herald: "clan-herald",
};

/** Runner injected by the host: desktop/pod call OpenRouter directly,
 *  web calls /api/openrouter-plays, serverless uses its handler runner.
 *  Must never throw for fallback text; but orchestrator guards anyway. */
export type PlayRunner = (playId: string, input: string) => Promise<{ text: string; fallback: boolean }>;

export type OrchestratorContext = {
  gameTitle?: string;
  screenText?: string;
  score?: number | null;
};

export type SpecialistResult = {
  specialist: SpecialistId;
  playId: string;
  text: string;
  fallback: boolean;
};

export type OrchestratorPack = {
  goal: string;
  reply: string;
  specialists: SpecialistResult[];
  fallbackCount: number;
  voiceLines: string;
  sfxPrompts: string;
  loreNote: string;
};

/**
 * Deterministic planner: always a coach (safe default tip), plus whichever
 * specialists the goal asks for by keyword. Capped at 4 so packs stay fast.
 */
export function planSpecialists(goalText: unknown): SpecialistId[] {
  const t = String(goalText ?? "").toLowerCase();
  const picked: SpecialistId[] = ["coach"];
  const want = (id: SpecialistId, re: RegExp): void => {
    if (picked.length < 4 && re.test(t) && !picked.includes(id)) picked.push(id);
  };
  want("voice", /(voice|say|speak|narrat|dub|announce|shout)/);
  want("hype", /(hype|victory|win|score|boss|goal|clutch|comeback)/);
  want("lore", /(lore|world|story|character|backstory|bible|faction)/);
  want("sfx", /(sfx|sound|boom|zap|explosion|ding|whoosh|audio cue)/);
  want("quest", /(quest|mission|objective|campaign|side-quest)/);
  want("herald", /(clan|lobby|team|guild|tournament)/);
  return picked;
}

function specialistInput(specialist: SpecialistId, goal: string, ctx: OrchestratorContext): string {
  const bits = [goal];
  const game = String(ctx.gameTitle ?? "").trim().slice(0, 80);
  const screen = String(ctx.screenText ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (game) bits.push(`game: ${game}`);
  if (screen) bits.push(`screen: ${screen}`);
  if (typeof ctx.score === "number" && Number.isFinite(ctx.score)) bits.push(`score: ${ctx.score}`);
  if (specialist === "voice") bits.push("Deliver 3 speakable lines.");
  return bits.join(" | ").slice(0, 900);
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Fan out to specialists with bounded concurrency + per-agent timeout,
 * then merge. Never throws: unknown plays are skipped, runner errors and
 * timeouts become labelled fallbacks.
 */
export async function runOrchestrator(
  goal: unknown,
  ctx: OrchestratorContext,
  runner: PlayRunner,
  opts?: { specialists?: SpecialistId[]; timeoutMs?: number; concurrency?: number },
): Promise<OrchestratorPack> {
  const cleanGoal = String(goal ?? "").replace(/\s+/g, " ").trim().slice(0, 500) || "(no goal provided)";
  const wanted = (opts?.specialists ?? planSpecialists(cleanGoal)).filter((s): s is SpecialistId =>
    typeof s === "string" && s in SPECIALIST_PLAYS,
  );
  const specialists = wanted.length ? wanted.slice(0, 4) : (["coach"] as SpecialistId[]);
  const timeoutMs = Math.min(60_000, Math.max(1_000, opts?.timeoutMs ?? 20_000));
  const concurrency = Math.min(4, Math.max(1, opts?.concurrency ?? 3));

  const results: SpecialistResult[] = new Array(specialists.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < specialists.length) {
      const index = cursor;
      cursor += 1;
      const specialist = specialists[index];
      const playId = SPECIALIST_PLAYS[specialist];
      const play = getPlay(playId);
      if (!play) continue;
      const input = specialistInput(specialist, cleanGoal, ctx);
      const fallback = (): SpecialistResult => ({
        specialist,
        playId,
        text: fallbackOpenRouterPlay(play, input),
        fallback: true,
      });
      try {
        const settled = await withTimeout(runner(playId, input), timeoutMs, () => ({ text: "", fallback: true as boolean }));
        const text = String(settled?.text ?? "").trim().slice(0, 2000);
        results[index] =
          text
            ? { specialist, playId, text, fallback: Boolean(settled?.fallback) }
            : fallback();
      } catch {
        results[index] = fallback();
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, specialists.length) }, () => worker()));

  const ordered = results.filter(Boolean);
  const live = ordered.filter((r) => !r.fallback);
  const pick = (id: SpecialistId): string => ordered.find((r) => r.specialist === id)?.text ?? "";
  const reply =
    live.find((r) => r.specialist === "coach")?.text ??
    live.find((r) => r.specialist === "voice")?.text ??
    live[0]?.text ??
    ordered[0]?.text ??
    `[offline orchestrator] No specialists answered for "${cleanGoal.slice(0, 120)}".`;
  return {
    goal: cleanGoal,
    reply,
    specialists: ordered,
    fallbackCount: ordered.filter((r) => r.fallback).length,
    voiceLines: pick("voice"),
    sfxPrompts: pick("sfx"),
    loreNote: pick("lore"),
  };
}
