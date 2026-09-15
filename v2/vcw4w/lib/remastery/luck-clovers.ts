/**
 * Luck Factory 🍀 Clovers — fake currency for the /luck page.
 *
 * Clovers are NOT Vibe Coins, NOT Crowns, NOT Ghosts. They have no USD
 * parity, no ledger, no persistence, no transfer, and no conversion path to
 * anything of value. The session balance lives in React state only: refresh
 * the page and it is gone. That is the point — there is nothing to steal,
 * forge, or cash out, so there is nothing to hack.
 *
 * HACKER-PROOFING (all enforced here, pure functions, covered by asserts):
 * 1. Allow-listed inputs: intention (1-500 chars), counter (integer
 *    0..MAX_COUNTER), streak (fail-open to 0, clamped 0..MAX_STREAK_DAYS).
 *    No URL params, no postMessage, no storage, no fetch are ever read.
 * 2. Deterministic grants: clovers derive ONLY from the visible boosted roll
 *    (plus a fixed perfect-100 bonus). Same inputs → same grant. There is no
 *    server RNG to rig and no hidden multiplier to tamper with.
 * 3. Safe-integer arithmetic: every add is Number.isSafeInteger-checked and
 *    the session balance hard-caps at MAX_SESSION_CLOVERS. Overflow,
 *    Infinity, and NaN can never render or accumulate.
 * 4. Zero exfil surface: clover amounts are never emitted on interopBus,
 *    never written to localStorage/cookies, never POSTed anywhere. Forging
 *    your own display via devtools only fools yourself — and a refresh wipes
 *    it, because no backend ever heard about it.
 */

export const CLOVER_EMOJI = "🍀";

/** Largest counter the page accepts (also the input's max attribute). */
export const MAX_COUNTER = 1_000_000;

/** Largest streak the page accepts (10 years of days; input max too). */
export const MAX_STREAK_DAYS = 3_650;

/** Longest intention the page accepts (input maxLength too). */
export const MAX_INTENTION_CHARS = 500;

/** Session balance ceiling: grants beyond this are dropped, never wrapped. */
export const MAX_SESSION_CLOVERS = 1_000_000_000;

/** Fixed bonus for a perfect 100 (deterministic, not chance-weighted). */
export const PERFECT_BONUS_CLOVERS = 100;

/** Minimum ms between Accepted draws (double-click / macro spam guard). */
export const DRAW_COOLDOWN_MS = 1_000;

export type IntentionCheck =
  | { ok: true; value: string }
  | { ok: false; error: string };

export type CounterCheck =
  | { ok: true; value: number }
  | { ok: false; error: string };

/** Trimmed non-empty string within length bounds. Fail-closed. */
export function sanitizeIntention(raw: unknown): IntentionCheck {
  if (typeof raw !== "string") return { ok: false, error: "Intention must be text." };
  const value = raw.trim().slice(0, MAX_INTENTION_CHARS + 1);
  if (value.length === 0) {
    return { ok: false, error: "Enter an intention first — the seed is derived from it." };
  }
  if (value.length > MAX_INTENTION_CHARS) {
    return { ok: false, error: `Intentions are capped at ${MAX_INTENTION_CHARS} characters.` };
  }
  return { ok: true, value };
}

/** Non-negative safe integer within bounds. Fail-closed. */
export function sanitizeCounter(raw: unknown): CounterCheck {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isInteger(n)) {
    return { ok: false, error: "Counter must be a non-negative integer." };
  }
  if (n < 0 || n > MAX_COUNTER) {
    return { ok: false, error: `Counter must be between 0 and ${MAX_COUNTER.toLocaleString()}.` };
  }
  return { ok: true, value: n };
}

/**
 * Streak days. Fail-OPEN to 0 (a bad streak never blocks a draw or mints
 * bonus), clamped to [0, MAX_STREAK_DAYS].
 */
export function sanitizeStreak(raw: unknown): number {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  const floored = Math.floor(n);
  if (floored <= 0) return 0;
  return Math.min(floored, MAX_STREAK_DAYS);
}

/**
 * Deterministic clover grant for one draw: the boosted roll (1-100) plus the
 * fixed perfect-100 bonus. Pure function of visible inputs — no randomness,
 * no hidden state, nothing to rig.
 */
export function cloversForDraw(boostedRoll: number, perfect: boolean): number {
  const base =
    typeof boostedRoll === "number" && Number.isFinite(boostedRoll)
      ? Math.min(100, Math.max(1, Math.floor(boostedRoll)))
      : 1;
  const grant = base + (perfect === true ? PERFECT_BONUS_CLOVERS : 0);
  return Number.isSafeInteger(grant) ? grant : 1;
}

/**
 * Add a grant to the session balance. Non-safe-integer inputs are ignored;
 * the total hard-caps (excess dropped, never wrapped, never negative).
 */
export function addClovers(balance: number, grant: number): number {
  const safeBalance =
    typeof balance === "number" && Number.isSafeInteger(balance) && balance > 0
      ? Math.min(balance, MAX_SESSION_CLOVERS)
      : 0;
  const safeGrant =
    typeof grant === "number" && Number.isSafeInteger(grant) && grant > 0
      ? Math.min(grant, MAX_SESSION_CLOVERS)
      : 0;
  return Math.min(safeBalance + safeGrant, MAX_SESSION_CLOVERS);
}
