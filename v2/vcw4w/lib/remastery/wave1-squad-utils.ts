// Wave 1 squad utils: Vibe Coin parity, revenue split, invoice math, trash window, time entries, spend guard.
// Pure functions only — no DB, no network, no window. See remastery README 1.2 axioms + 4.3/4.4.

export const VIBE_COINS_PER_USD = 100;
export const CREATOR_SHARE_BPS = 7500;
export const PLATFORM_SHARE_BPS = 2500;
export const INVOICE_TRASH_RETENTION_DAYS = 30;

const MS_PER_DAY = 86_400_000;

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
  if (value < 0) throw new Error(`${name} must not be negative`);
}

// Round dollars to whole cents.
function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// 100 coins = exactly $1.00 USD; floor so we never over-credit dollars.
export function coinsToUsd(coins: number): number {
  assertFiniteNonNegative(coins, "coins");
  return Math.floor(coins) / VIBE_COINS_PER_USD;
}

// Round to whole coins (smallest coin unit).
export function usdToCoins(usd: number): number {
  assertFiniteNonNegative(usd, "usd");
  return Math.round(usd * VIBE_COINS_PER_USD);
}

// 75/25 split in integer coins; remainder from flooring goes to the creator.
export function splitRevenue(totalCoins: number): { creatorCoins: number; platformCoins: number } {
  assertFiniteNonNegative(totalCoins, "totalCoins");
  const whole = Math.floor(totalCoins);
  const platformCoins = Math.floor((whole * PLATFORM_SHARE_BPS) / 10_000);
  return { creatorCoins: whole - platformCoins, platformCoins };
}

export interface InvoiceLineItem {
  quantity: number;
  unitRate: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

// Each line rounded to cents; taxRate clamped to 0..1.
export function computeInvoiceTotals(lineItems: InvoiceLineItem[], taxRate: number): InvoiceTotals {
  if (!Array.isArray(lineItems)) throw new Error("lineItems must be an array");
  if (!Number.isFinite(taxRate)) throw new Error("taxRate must be a finite number");
  const clampedRate = Math.min(1, Math.max(0, taxRate));
  let subtotal = 0;
  for (const item of lineItems) {
    assertFiniteNonNegative(item.quantity, "line item quantity");
    assertFiniteNonNegative(item.unitRate, "line item unitRate");
    subtotal += roundToCents(item.quantity * item.unitRate);
  }
  subtotal = roundToCents(subtotal);
  const taxAmount = roundToCents(subtotal * clampedRate);
  return { subtotal, taxAmount, total: roundToCents(subtotal + taxAmount) };
}

// Soft-delete trash flag: trashed iff deletedAt is set.
export function isInvoiceInTrash(invoice: { deletedAt: string | null }): boolean {
  return invoice.deletedAt !== null;
}

// True once the 30-day trash retention window has fully elapsed.
export function isTrashExpired(deletedAt: string, now: Date = new Date()): boolean {
  const deletedMs = Date.parse(deletedAt);
  if (Number.isNaN(deletedMs)) throw new Error("deletedAt must be a valid ISO date string");
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) throw new Error("now must be a valid Date");
  return nowMs - deletedMs >= INVOICE_TRASH_RETENTION_DAYS * MS_PER_DAY;
}

// Whole elapsed seconds; open entries measure to nowMs (default Date.now()); never negative.
export function timeEntrySeconds(startIso: string, endIso?: string, nowMs: number = Date.now()): number {
  const startMs = Date.parse(startIso);
  if (Number.isNaN(startMs)) throw new Error("startIso must be a valid ISO date string");
  let endMs: number;
  if (endIso === undefined) {
    if (!Number.isFinite(nowMs)) throw new Error("nowMs must be a finite number");
    endMs = nowMs;
  } else {
    endMs = Date.parse(endIso);
    if (Number.isNaN(endMs)) throw new Error("endIso must be a valid ISO date string");
  }
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

// Double-click/concurrency guard (300-fix rule): first trySpend locks, rest fail until release().
export interface SpendGuard {
  trySpend(): boolean;
  release(): void;
}

export function createSpendGuard(): SpendGuard {
  let locked = false;
  return {
    trySpend(): boolean {
      if (locked) return false;
      locked = true;
      return true;
    },
    release(): void {
      locked = false;
    },
  };
}
