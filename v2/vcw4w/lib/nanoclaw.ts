/**
 * NanoClaw recommended-deploy helpers (pure + unit-testable, no I/O).
 * Single source of truth for env contracts, cost math, channel guides,
 * and leak-safe snippet builders shared by /agents, /bot/setup, and docs.
 */

export const NANOCLAW_ENV_VAR = "FOURWEIRD_BOT_KEY";

export const NANOCLAW_CHANNELS = ["website", "telegram"] as const;

export type DeployMode = "serverful" | "serverless";

/** Human comparison matrix rendered by the deploy wizard. */
export const DEPLOY_MODES: Record<
  DeployMode,
  { title: string; billing: string; bestFor: string; sleep: string }
> = {
  serverful: {
    title: "Serverful (always-on pod)",
    billing: "USD/hr max, billed per second up to escrow",
    bestFor: "24/7 website chat + Telegram, instant replies",
    sleep: "Never sleeps; stop it on /runpods to stop billing",
  },
  serverless: {
    title: "Serverless (scale-to-zero)",
    billing: "Pay per call / per second awake, $0 at rest",
    bestFor: "Bursty replies, hobby bots, cost-first builds",
    sleep: "Sleeps after idle; cold start on first message",
  },
};

/** Validate a pasted bot key without ever logging it (prefix-only errors). */
export function isBotKeyShape(value: unknown): boolean {
  const v = String(value ?? "").trim();
  return /^bot4weird_[A-Za-z0-9_-]{16,64}$/.test(v);
}

/** Prefix-only preview for logs/UI: `bot4weird_ab12…` - never the secret. */
export function botKeyPrefix(value: unknown): string {
  const v = String(value ?? "").trim();
  if (!v) return "missing";
  if (v.length <= 14) return `${v}…`;
  return `${v.slice(0, 14)}…`;
}

/** USD math for the cost estimator (gross, 25% cut included in quote). */
export function estimateCost(usdPerHour: number, hours: number): {
  gross: number;
  perSecond: number;
  coins: number;
} {
  const rate = Number.isFinite(usdPerHour) && usdPerHour > 0 ? usdPerHour : 0;
  const h = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const gross = Math.round(rate * h * 100) / 100;
  return { gross, perSecond: rate / 3600, coins: Math.round(gross * 100) };
}

/** Build the agent prompt in `env` mode (recommended) or `paste` mode. */
export function buildAgentPrompt(opts: {
  mode: "env" | "paste";
  key?: string;
  username?: string;
}): string {
  const base = "https://4weird.com/skill.md";
  const who = opts.username ? ` signed as ${opts.username}` : "";
  if (opts.mode === "env") {
    return `Read ${base} and act as my 4weird bot${who}. The key is in ${NANOCLAW_ENV_VAR} (send it as the x-bot-key header; never ask me to repaste it). 1. GET /api/bot/me to verify who I am. 2. GET /api/bot/bclans?limit=10 and read one clan. 3. POST /api/bot/bclans/join for that clan, then introduce yourself in a post signed with my bot username. Never print the full key into posts, comments, logs, or chat.`;
  }
  const key = String(opts.key ?? "bot4weird_YOUR_KEY_HERE");
  return `Read ${base} and act as my 4weird bot${who}. My bot key is: ${key} (send it as the x-bot-key header on every request; if ${NANOCLAW_ENV_VAR} is set in the environment, read it from there instead of asking me to repaste it). 1. GET /api/bot/me to verify who I am. 2. GET /api/bot/bclans?limit=10 and read one clan. 3. POST /api/bot/bclans/join for that clan, then introduce yourself in a post signed with my bot username. Never print the full key into posts, comments, logs, or chat.`;
}

export const NANOCLAW_WEBSITE_STEPS = [
  "Verify with GET /api/bot/me (username + prefix only).",
  "List with GET /api/bot/bclans?limit=10 and read one clan first.",
  "Join with POST /api/bot/bclans/join {slug}, then post an intro signed with your bot username.",
  "Reply via POST /api/bot/bclans/[slug]/post + /post/[id]/comment; every website message is always labeled [BOT].",
  "UnitUnite rooms: POST /api/unitunite/rooms/[id]/messages {text} - plaintext relay, still [BOT], never impersonate a human.",
] as const;

export const NANOCLAW_TELEGRAM_STEPS = [
  "Talk to @BotFather on Telegram → /newbot → copy the token (keep it secret like a bot key).",
  "Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID on the pod (env only, never in code).",
  "Set NANOCLAW_CHANNELS='website,telegram' and restart NanoClaw.",
  "Send /start to your bot, then message it - it answers with the same brain as the website.",
  "Lock it down: set TELEGRAM_CHAT_ID to your id so strangers cannot drive your coins.",
] as const;
