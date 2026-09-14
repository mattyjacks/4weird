import { fail, ok } from "@/lib/api-respond";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  vocrehabBlocklistCheck,
  vocrehabFeedbackRubric,
  vocrehabRoleplayFallback,
  vocrehabRoleplayMaxMessageChars,
  type VocrehabRoleplayScenarioId,
} from "@/lib/vocrehab-roleplay";

const SCENARIOS: readonly VocrehabRoleplayScenarioId[] = ["prep", "pivot", "disclosure", "job-interview"];

function isScenario(value: unknown): value is VocrehabRoleplayScenarioId {
  return typeof value === "string" && (SCENARIOS as readonly string[]).includes(value);
}

// Pure rubric scoring: no model call, no network, no storage. The shared rubric
// shapes { praise, tweak, invitation }; praise quotes the user's own words.
// A blocklisted tweak is replaced with a scripted fallback line (fail-open).
export async function POST(req: Request) {
  const rl = rateLimit(`vocrehab-feedback:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) {
    return fail("Rate limited. Wait a bit and try again.", 429, rateLimitHeaders(rl));
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { text, scenario } = (body ?? {}) as { text?: unknown; scenario?: unknown };

  if (!isScenario(scenario)) {
    return fail("scenario must be one of: prep, pivot, disclosure, job-interview.", 400);
  }
  if (
    typeof text !== "string" ||
    text.trim().length < 1 ||
    text.length > vocrehabRoleplayMaxMessageChars
  ) {
    return fail(`text must be 1..${vocrehabRoleplayMaxMessageChars} characters.`, 400);
  }

  const feedback = vocrehabFeedbackRubric(text, scenario);
  const tweak = vocrehabBlocklistCheck(feedback.tweak).blocked
    ? vocrehabRoleplayFallback(scenario, 0)
    : feedback.tweak;

  return ok({ scenario, praise: feedback.praise, tweak, invitation: feedback.invitation });
}
