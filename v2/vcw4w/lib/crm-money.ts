/**
 * CRM memorandum money helpers (web lane catch-all).
 *
 * Invoices and deals here are org memoranda for internal coin accounting
 * only (100 coins = $1.00). They NEVER touch coin tables: marking an
 * invoice paid moves no coins; settlement happens only in the guarded
 * checkout and ledger flows. Ghosts have no monetary value and can never
 * settle an invoice.
 *
 * Why a separate module from lib/economy: player-purchase cleaners
 * (cleanPurchaseAmount) cap at MAX_SINGLE_PURCHASE_COINS (10,000) and
 * custom-amount rules start at 500 — org memoranda are unbounded planning
 * numbers, so they need their own whole-coin cleaners. All math floors to
 * whole coins to match the integer coin columns.
 *
 * Pure module: no I/O, no imports.
 */

/** Whole non-negative coin count, or NaN when invalid. */
export function cleanCrmCoins(value: unknown): number {
  const n = Math.floor(Number(value ?? 0));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, Number.MAX_SAFE_INTEGER) : NaN;
}

/** Non-negative line-item quantity (cap 1M), or NaN when invalid. */
export function cleanCrmQty(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000) : NaN;
}

/** Win probability 0-100 (defaults to 10), or NaN when invalid. */
export function cleanCrmProbability(value: unknown): number {
  const n = Math.floor(Number(value ?? 10));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
}

/** One invoice line total: floored qty x whole-coin unit. */
export function crmLineCoins(qty: number, unitCoins: number): number {
  return Math.floor(qty * unitCoins);
}

/** Percentage tax on a taxable subtotal, floored to whole coins. */
export function crmTaxCoinsFromRate(taxableCoins: number, ratePct: number): number {
  return Math.floor((taxableCoins * ratePct) / 100);
}

/** Invoice totals: total = subtotal - discount + tax. */
export function crmInvoiceTotals(
  subtotalCoins: number,
  discountCoins: number,
  taxCoins: number,
): { subtotal: number; discount: number; taxable: number; tax: number; total: number } {
  const taxable = subtotalCoins - discountCoins;
  return { subtotal: subtotalCoins, discount: discountCoins, taxable, tax: taxCoins, total: taxable + taxCoins };
}
