/**
 * 4weird Clans - Luna text moderation adapter.
 *
 * Behavior contract (medium-bar, lenient on purpose):
 *  - Only flag text that CLEARLY violates the Terms of Use (Section 2:
 *    illegal content, harassment/hate/threats, sexual content involving
 *    minors, fraud/scams/spam, IP abuse, monetization abuse). Heated
 *    debate, trash-talk, profanity, caps, and links are NOT violations.
 *  - With OPENAI_API_KEY set: text is checked against an OpenAI-compatible
 *    chat-completions endpoint (base https://api.openai.com/v1, model from
 *    LUNA_MODEL, default "gpt-5.6-luna"). allowed=false => caller should
 *    store the post/comment with status='pending' for human review.
 *  - WITHOUT a key (UNCONFIGURED): fail-OPEN for writes; returns
 *    { allowed: true, heuristicHit: <actual hit> } so only posts matching a
 *    narrow obvious-spam shape are treated as suspicious. Ordinary posts go
 *    straight to `visible`. Reads may still proceed.
 *  - IMAGES without a key: NOT approved here at all. Image safety is
 *    report-driven (report-button CSAM flow auto-hides + preserves sha256)
 *    plus the 1MB cap and magic-bytes checks in the upload route. This
 *    function never sees image bytes.
 *  - NEVER throws: every failure path returns { allowed: true, reason:
 *    "unconfigured"|"moderation-unavailable", heuristicHit: <actual hit> }
 *    and logs server-side via console.error/warn. Fail-open keeps ordinary
 *    posts flowing; quarantine (pending/hidden) is reserved for clearly bad
 *    text, and the report button remains the safety net.
 */

export type ModerationResult = {
  allowed: boolean;
  reason?: string;
  heuristicHit?: boolean;
};

const LUNA_BASE = "https://api.openai.com/v1";

// MEDIUM-BAR fallback patterns. Deliberately narrow: exact slur spellings
// are NOT enumerated here; we match only obvious spam/flood shapes that
// clearly look like Terms-of-Use abuse (scams, link floods, gibberish
// floods), never ordinary gamer chat. Single links, caps, profanity, and
// heated debate must NOT match.
const HEURISTIC_PATTERNS: RegExp[] = [
  /(https?:\/\/\S+){5,}/i, // URL-spam: 5+ links in one post
  /(.)\1{49,}/, // 50+ repeated chars (zalgo/gibberish floods)
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
    // Fail-open (medium-bar): an unconfigured moderator cannot affirm
    // safety, but it also cannot condemn ordinary posts. Only a real
    // heuristic hit marks the text suspicious; everything else flows to
    // `visible` with the report button as the safety net.
    return { allowed: true, reason: "unconfigured", heuristicHit: hit };
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
                "You are Luna, a game-community moderator enforcing the site Terms of Use (medium-bar, lenient). Reply with exactly one word: ALLOW or BLOCK. " +
                "BLOCK only when the text CLEARLY violates the terms: illegal content, harassment/hate/threats, sexual content involving minors, fraud/scams/spam floods, or instructions for wrongdoing. " +
                "When in doubt, ALLOW. ALLOW profanity, mild trash-talk, heated debate, caps, and ordinary links between gamers.",
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
      // Fail-open (medium-bar): Luna down is not a verdict. Only a real
      // fallback-pattern hit marks the text suspicious.
      return { allowed: true, reason: "moderation-unavailable", heuristicHit: heuristicCheck(input) };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const verdict = String(data?.choices?.[0]?.message?.content ?? "").toUpperCase();
    if (verdict.includes("BLOCK")) return { allowed: false, reason: "luna-block" };
    return { allowed: true };
  } catch (err) {
    console.error("[moderation] Luna fetch failed:", err);
    // Fail-open (medium-bar): see above.
    return { allowed: true, reason: "moderation-unavailable", heuristicHit: heuristicCheck(input) };
  }
}
