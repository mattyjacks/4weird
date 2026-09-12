/**
 * Shared spend-permission policy for game-building agents.
 *
 * One rule: a single processing step may spend up to the caller's
 * auto-approve limit with no questions asked; anything above it needs an
 * explicit permission (confirmed:true) first. The system-wide
 * NewGamePlus budget cap (BUDGET_CONFIRM_THRESHOLD, 250) stays the
 * absolute ceiling and is never widened by this threshold.
 *
 * All coin figures here are gross Vibe Coins, 25% platform cut INCLUDED,
 * never on top — the same unit every metered RPC debits.
 */

/** Default per-processing auto-approve ceiling: 20 gross coins. */
export const SPEND_AUTO_APPROVE_DEFAULT_COINS = 20;
/** Smallest configurable ceiling (1 coin). */
export const SPEND_AUTO_APPROVE_MIN_COINS = 1;
/** Largest configurable ceiling: never above the system confirm line. */
export const SPEND_AUTO_APPROVE_MAX_COINS = 250;

/**
 * Clean a caller-supplied auto-approve ceiling.
 * Returns the ceiling, the default when absent, or null when invalid.
 * Absent (undefined/null/"") means "caller did not opt in" — callers that
 * need backward compatibility treat null as "no per-processing gate".
 */
export function cleanAutoApproveMax(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return SPEND_AUTO_APPROVE_DEFAULT_COINS;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (n < SPEND_AUTO_APPROVE_MIN_COINS || n > SPEND_AUTO_APPROVE_MAX_COINS) return null;
  return n;
}

/**
 * Does this processing spend need explicit permission?
 * Fail closed: non-finite spends always need permission.
 */
export function needsSpendPermission(spend: unknown, autoApproveMax: unknown = SPEND_AUTO_APPROVE_DEFAULT_COINS): boolean {
  const s = Number(spend);
  if (!Number.isFinite(s)) return true;
  const max = cleanAutoApproveMax(autoApproveMax);
  // Invalid threshold config fails closed (ask), absent config uses default.
  const ceiling = max ?? SPEND_AUTO_APPROVE_DEFAULT_COINS;
  return s > ceiling;
}

/** Permission-request message (mirrors the "Confirm the Amount" copy). */
export function spendPermissionMessage(spend: number, autoApproveMax: number): string {
  return (
    `Confirm the Amount: ${spend} coins is above your ${autoApproveMax}-coin auto-approve limit. ` +
    `Resend with confirmed:true to launch.`
  );
}
