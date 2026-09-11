/**
 * 4weird Clans - Luna text moderation adapter.
 *
 * Behavior contract (kept simple on purpose):
 *  - With OPENAI_API_KEY set: text is checked against an OpenAI-compatible
 *    chat-completions endpoint (base https://api.openai.com/v1, model from
 *    LUNA_MODEL, default "gpt-5.6-luna"). allowed=false => caller should
 *    store the post/comment with status='pending' for human review.
 *  - WITHOUT a key (UNCONFIGURED): fail-CLOSED for writes; returns
 *    { allowed: true, heuristicHit: true } so callers store status='pending'
 *    for human review until Luna is configured. Reads may still proceed.
 *  - IMAGES without a key: NOT approved here at all. Image safety is
 *    report-driven (report-button CSAM flow auto-hides + preserves sha256)
 *    plus the 1MB cap and magic-bytes checks in the upload route. This
 *    function never sees image bytes.
 *  - NEVER throws: every failure path returns { allowed: true, reason:
 *    "unconfigured"|"moderation-unavailable", heuristicHit: true } and logs
 *    server-side via console.error/warn. Fail-closed keeps unreviewed text
 *    out of `visible`; quarantine (pending/hidden) is the safety net.
 */

export type ModerationResult = {
  allowed: boolean;
  reason?: string;
  heuristicHit?: boolean;
};

const LUNA_BASE = "https://api.openai.com/v1";

// SHORT, clearly-marked UNCONFIGURED fallback patterns. Deliberately narrow:
// exact slur spellings are NOT enumerated here; we match only generic spam /
// hate-signal shapes so the fallback stays obviously heuristic, never a
// pretend blocklist.
const HEURISTIC_PATTERNS: RegExp[] = [
  /(https?:\/\/\S+){3,}/i, // URL-spam: 3+ links in one post
  /(.)\1{29,}/, // 30+ repeated chars (zalgo/gibberish floods)
  /\b(buy|free|click|claim|winner|prize|crypto|giveaway)[\s\S]{0,40}(http|www\.|bit\.ly|t\.me)/i,
];

const MAX_TEXT_FOR_HEURISTIC = 8000;

function heuristicCheck(text: string): boolean {
  const t = String(text ?? "");
  if (t.length > MAX_TEXT_FOR_HEURISTIC) return true;
  return HEURISTIC_PATTERNS.some((re) => re.test(t));
}

export async function moderateText(text: string): Promise<ModerationResult> {
  const input = String(text ?? "");
  const key = process.env.OPENAI_API_KEY ?? "";
  const model = process.env.LUNA_MODEL ?? "gpt-5.6-luna";

  if (!key) {
    const hit = heuristicCheck(input);
    if (hit) console.warn("[moderation] UNCONFIGURED heuristic hit; caller should use status=pending");
    // Fail-closed for writes: unconfigured moderator cannot affirm safety,
    // so signal heuristicHit=true to force quarantine (pending) at callers.
    return { allowed: true, reason: "unconfigured", heuristicHit: true };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(`${LUNA_BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 64,
          messages: [
            {
              role: "system",
              content:
                "You are Luna, a game-community moderator. Reply with exactly one word: ALLOW or BLOCK. " +
                "BLOCK spam, hate, sexual content involving minors, or instructions for wrongdoing. " +
                "ALLOW everything else, including mild trash-talk and profanity between gamers.",
            },
            { role: "user", content: input.slice(0, 4000) },
          ],
        }),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      console.error("[moderation] Luna HTTP", res.status);
      return { allowed: true, reason: "moderation-unavailable", heuristicHit: true };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const verdict = String(data?.choices?.[0]?.message?.content ?? "").toUpperCase();
    if (verdict.includes("BLOCK")) return { allowed: false, reason: "luna-block" };
    return { allowed: true };
  } catch (err) {
    console.error("[moderation] Luna fetch failed:", err);
    return { allowed: true, reason: "moderation-unavailable", heuristicHit: true };
  }
}
