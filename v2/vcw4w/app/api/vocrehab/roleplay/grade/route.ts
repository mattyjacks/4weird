import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  vocrehabReportCardFor,
  vocrehabRoleplayMaxMessageChars,
  vocrehabScriptedTurnGrade,
  type VocrehabRoleplayScenarioId,
} from "@/lib/vocrehab-roleplay";

const SCENARIOS: readonly VocrehabRoleplayScenarioId[] = ["prep", "pivot", "disclosure", "job-interview"];

// End-of-session report card (Wave 2): fail-open scripted grading over the
// posted answers. No model call, no network, no storage. Scores are a
// practice signal, not a hiring decision.
export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-grade:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited. Wait a bit and try again.", 429, rateLimitHeaders(rl));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { scenario, answers } = (body ?? {}) as { scenario?: unknown; answers?: unknown };

  if (typeof scenario !== "string" || !(SCENARIOS as readonly string[]).includes(scenario)) {
    return fail("scenario must be one of: prep, pivot, disclosure, job-interview.", 400);
  }
  if (!Array.isArray(answers) || answers.length < 1 || answers.length > 6) {
    return fail("answers must be an array of 1..6 answer strings.", 400);
  }
  for (const a of answers) {
    if (typeof a !== "string" || a.trim().length < 1 || a.length > vocrehabRoleplayMaxMessageChars) {
      return fail(`each answer must be 1..${vocrehabRoleplayMaxMessageChars} characters.`, 400);
    }
  }

  const grades = answers.map((a, i) => vocrehabScriptedTurnGrade(a, scenario, i + 1));
  const reportCard = vocrehabReportCardFor(grades);
  return ok({ scenario, grades, reportCard, offline: true });
}
