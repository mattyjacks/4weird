/**
 * Ghost Cash (👻💵) core configuration, calculations, and legal disclaimer statements.
 *
 * Ghost Cash is a non-monetary unit of account used inside 4weird orgs and teams
 * to measure hours worked down to the second and track debt/expenses between members.
 * It has NO cash value, NO redemption rights, and CANNOT be cashed out.
 */

export const GHOST_CASH_SYMBOL = "👻💵";

export const GHOST_CASH_DISCLAIMER =
  "Ghost Cash (👻💵) is a centrally controlled, non-monetary debt/expense tracking tool with no cash value, no legal tender status, and no store of value. It is used exclusively to measure time worked and settle intra-org debts.";

export function formatGhostCashAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return `${GHOST_CASH_SYMBOL} 0.00`;
  return `${GHOST_CASH_SYMBOL} ${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculates exact Ghost Cash owed down to the second.
 * Formula: (seconds / 3600) * hourlyRate
 */
export function calculateGhostCashOwed(seconds: number, hourlyRate: number): number {
  if (!seconds || seconds <= 0 || !hourlyRate || hourlyRate <= 0) return 0;
  return Number(((seconds / 3600) * hourlyRate).toFixed(4));
}
