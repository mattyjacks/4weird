/**
 * Ledger-read helper (STUB).
 *
 * Canonical convention (read-only mirror of `v2/vcw4w/lib/bot-auth.ts`
 * `ownerCoinBalance` + `v2/vcw4w/lib/economy.ts`):
 *   - A user's Vibe Coin balance is SUM(delta) over the `coin_ledger` table
 *     filtered by user id. There is NO parallel balance column.
 *   - Parity: 100 Vibe Coins = exactly $1.00 USD (1 coin = $0.01).
 *
 * COIN HARD RULES for this bot (binding):
 *   - The bot NEVER invents balances. No hardcoded, random, or estimated
 *     coin amounts are ever presented as a balance.
 *   - All coin reads go through `lookupCoinBalance`, which either queries
 *     the configured ledger reader or returns an explicit NOT-WIRED stub
 *     notice. A stub notice is never a number.
 *
 * Wiring note: this package ships with NO database client. Provide a
 * `LedgerReader` (e.g. backed by `GET /api/budgets/squad-pools` or a
 * service-role Supabase query mirroring `ownerCoinBalance`) via
 * `setLedgerReader`, or set LEDGER_API_URL (see README). Until then every
 * balance lookup answers with a stub notice.
 */

/** Parity mirror of `COIN_PRICE_CENTS_EACH = 1` in `v2/vcw4w/lib/economy.ts`. */
export const COINS_PER_DOLLAR = 100;

/** Display equivalent: coins -> USD at 100-coins-=$1.00 parity. Informational only. */
export function coinsToUsd(coins: number): number {
  return Math.floor(coins) / COINS_PER_DOLLAR;
}

export interface LedgerBalance {
  userId: string;
  balanceCoins: number;
  usdEquivalent: number;
}

/** Function that performs a real ledger read. Injected by the host. */
export type LedgerReader = (userId: string) => Promise<LedgerBalance | null>;

let reader: LedgerReader | null = null;

/** Inject the real ledger reader. Without this, all lookups are stub notices. */
export function setLedgerReader(next: LedgerReader | null): void {
  reader = next;
}

export interface BalanceLookupResult {
  ok: boolean;
  /** Present only when ok === true (real ledger read). */
  balance?: LedgerBalance;
  /** Present only when ok === false. NEVER a number — states why, not a guess. */
  stubNotice?: string;
}

/**
 * Look up a user's coin balance via the existing ledger convention.
 * Returns `{ ok: false, stubNotice }` until a `LedgerReader` is injected —
 * callers must surface the notice verbatim and MUST NOT substitute a number.
 */
export async function lookupCoinBalance(userId: string): Promise<BalanceLookupResult> {
  if (!reader) {
    return {
      ok: false,
      stubNotice:
        "STUB: coin-balance lookup is not wired yet. Balances live in the `coin_ledger` table (SUM of `delta` per user, 100 coins = $1.00) and this bot never invents them — ask an admin to configure LEDGER_API_URL (see README).",
    };
  }
  const balance = await reader(userId);
  if (!balance) {
    return {
      ok: false,
      stubNotice:
        "STUB: ledger reader returned no row for this user. No balance to show (and none invented).",
    };
  }
  return { ok: true, balance };
}
