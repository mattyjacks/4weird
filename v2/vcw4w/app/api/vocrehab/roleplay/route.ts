import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  vocrehabBlocklistCheck,
  vocrehabFeedbackRubric,
  vocrehabIsDifficulty,
  vocrehabIsSessionMode,
  vocrehabRoleplayFallback,
  vocrehabRoleplayMaxMessageChars,
  vocrehabRoleplaySystemPrompt,
  vocrehabRoleplayTurnCap,
  type VocrehabRoleplayScenarioId,
} from "@/lib/vocrehab-roleplay";
import {
  vocrehabInterviewQuestionFor,
  vocrehabIsInterviewJobId,
} from "@/lib/vocrehab-interview-jobs";

const SCENARIOS: readonly VocrehabRoleplayScenarioId[] = ["prep", "pivot", "disclosure", "job-interview"];
const MODEL_TIMEOUT_MS = 15_000;
const MODEL_MAX_CHARS = 1200;

function isScenario(value: unknown): value is VocrehabRoleplayScenarioId {
  return typeof value === "string" && (SCENARIOS as readonly string[]).includes(value);
}

// Model call happens ONLY when an env key is configured. The key value is never
// hardcoded and never logged. Any failure returns null so the caller fails open
// to the scripted fallback + rubric feedback. No audio is accepted or stored.
async function modelReply(
  scenario: VocrehabRoleplayScenarioId,
  message: string,
  turn: number,
): Promise<string | null> {
  const key = process.env.VOCREHAB_MODEL_KEY;
  if (!key) return null;
  const url = process.env.VOCREHAB_MODEL_URL ?? "https://api.openai.com/v1/chat/completions";
  const model = process.env.VOCREHAB_MODEL_NAME ?? "gpt-4o-mini";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MODEL_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: 220,
        messages: [
          { role: "system", content: vocrehabRoleplaySystemPrompt(scenario) },
          {
            role: "user",
            content: `Scenario: ${scenario}. Turn ${turn} of ${vocrehabRoleplayTurnCap}. Practice answer: ${message}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    } | null;
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    const reply = content.trim().slice(0, MODEL_MAX_CHARS);
    // Screen model output through the same blocklist; fall back on any hit.
    return vocrehabBlocklistCheck(reply).blocked ? null : reply;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-roleplay:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited. Wait a bit and try again.", 429, rateLimitHeaders(rl));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { session_id, scenario, message, turn, jobId, difficulty, mode } = (body ?? {}) as {
    session_id?: unknown;
    scenario?: unknown;
    message?: unknown;
    turn?: unknown;
    jobId?: unknown;
    difficulty?: unknown;
    mode?: unknown;
  };

  if (!isScenario(scenario)) {
    return fail("scenario must be one of: prep, pivot, disclosure, job-interview.", 400);
  }
  // Wave 2 extras: optional jobId + difficulty + mode, accepted + echoed like session_id.
  const job = vocrehabIsInterviewJobId(jobId) ? jobId : undefined;
  const diff = vocrehabIsDifficulty(difficulty) ? difficulty : undefined;
  const sessMode = vocrehabIsSessionMode(mode) ? mode : undefined;
  if (
    typeof message !== "string" ||
    message.trim().length < 1 ||
    message.length > vocrehabRoleplayMaxMessageChars
  ) {
    return fail(`message must be 1..${vocrehabRoleplayMaxMessageChars} characters.`, 400);
  }
  const turnNumber =
    typeof turn === "number" &&
    Number.isInteger(turn) &&
    turn >= 1 &&
    turn <= vocrehabRoleplayTurnCap
      ? turn
      : 1;

  const blocked = vocrehabBlocklistCheck(message);
  if (blocked.blocked) {
    return fail(
      `That message can't be rehearsed here${blocked.reason ? ` (${blocked.reason})` : ""}. Rephrase and try again.`,
      400,
    );
  }

  const done = turnNumber >= vocrehabRoleplayTurnCap;
  const modelText = await modelReply(scenario, message, turnNumber);
  // Wave 2: job-interview falls back to the static 20-job catalog line when offline.
  const reply =
    modelText ??
    (scenario === "job-interview" && job
      ? vocrehabInterviewQuestionFor(job, turnNumber - 1)
      : vocrehabRoleplayFallback(scenario, turnNumber - 1));
  const feedback = vocrehabFeedbackRubric(message, scenario);
  const usedFallback = modelText === null;

  return ok({
    scenario,
    turn: turnNumber,
    reply,
    feedback,
    done,
    offline: usedFallback,
    fallback: usedFallback,
    ...(typeof session_id === "string" && session_id ? { session_id } : {}),
    ...(job ? { jobId: job } : {}),
    ...(diff ? { difficulty: diff } : {}),
    ...(sessMode ? { mode: sessMode } : {}),
  });
}
