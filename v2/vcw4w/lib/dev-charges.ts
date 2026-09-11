/**
 * Dev-charge protections — the rules that keep player wallets safe when games
 * (including future dev-uploaded games) take coins:
 *
 * 1. SELLABLE ONLY: "cosmetic" | "singleplayer-boost". "multiplayer-boost"
 *    is rejected everywhere, always — pay-to-win in multiplayer is banned.
 * 2. MULTIPLAYER DETECTION: a game is multiplayer iff its catalog tags
 *    include "Multiplayer" (same rule for first-party and dev-uploaded
 *    games). Unknown slugs fail CLOSED (treated as multiplayer).
 * 3. CAPS: every single charge ≤ MAX_SINGLE_PURCHASE_COINS (10,000);
 *    devs get ≤ DEV_GAME_DAILY_CAP_COINS (1,000)/day/player/game.
 * 4. CONSENT: every charge carries the exact price line the player accepted
 *    (acceptedQuote); mismatch = rejected, no silent or edited prices.
 * 5. TRACEABILITY: idempotency key per charge (no double-taps), human label
 *    ≤80 chars shown in the ledger + receipt.
 *
 * Pure module (imports ./economy + ../content/games only).
 */

import {
  DEV_GAME_DAILY_CAP_COINS,
  MAX_SINGLE_PURCHASE_COINS,
  cleanPurchaseAmount,
  isSellableCategory,
} from "./economy";
import { games } from "../content/games";

export type DevChargeCategory = "cosmetic" | "singleplayer-boost";

export function cleanGameSlug(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{1,64}$/.test(v) ? v : "";
}

/** Multiplayer iff catalog tags include "Multiplayer"; unknown = multiplayer. */
export function isMultiplayerGame(slug: string): boolean {
  const game = games.find((g) => g.slug === slug);
  if (!game) return true;
  return game.tags.some((t) => String(t).trim().toLowerCase() === "multiplayer");
}

export function cleanChargeLabel(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function cleanIdemKey(value: unknown): string {
  const v = String(value ?? "").trim();
  return /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : "";
}

export type DevChargeRequest = {
  gameSlug: unknown;
  category: unknown;
  amountCoins: unknown;
  label: unknown;
  idemKey: unknown;
  /** Exact price line the player accepted, e.g. "Revive ×3 — 90 coins". */
  acceptedQuote: unknown;
  /** Server-computed price line it must equal. */
  expectedQuote: unknown;
};

export type DevChargeCheck =
  | { ok: true; gameSlug: string; category: DevChargeCategory; amount: number; label: string; idemKey: string }
  | { ok: false; error: string };

/**
 * Validate a dev-initiated charge. Fail-closed: anything unknown, mismatched,
 * over-cap, or multiplayer-advantaged is rejected with a player-safe message.
 */
export function validateDevCharge(req: DevChargeRequest): DevChargeCheck {
  const slug = cleanGameSlug(req.gameSlug);
  if (!slug) return { ok: false, error: "Unknown game." };
  if (req.category === "multiplayer-boost") {
    return { ok: false, error: "Pay-to-win is banned: multiplayer boosts can never be sold." };
  }
  if (!isSellableCategory(req.category)) return { ok: false, error: "That cannot be sold." };
  const amount = cleanPurchaseAmount(req.amountCoins);
  if (!amount) return { ok: false, error: `Amount must be 1–${MAX_SINGLE_PURCHASE_COINS} coins.` };
  if (req.category === "singleplayer-boost" && isMultiplayerGame(slug)) {
    return { ok: false, error: "Boosts are singleplayer-only: this game is multiplayer, so only cosmetics may be sold here." };
  }
  const label = cleanChargeLabel(req.label);
  if (!label) return { ok: false, error: "A charge needs a human-readable label." };
  const idemKey = cleanIdemKey(req.idemKey);
  if (!idemKey) return { ok: false, error: "Charge needs an idempotency key." };
  const accepted = String(req.acceptedQuote ?? "").trim().slice(0, 160);
  const expected = String(req.expectedQuote ?? "").trim().slice(0, 160);
  if (!expected || accepted !== expected) {
    return { ok: false, error: "Price changed since you confirmed — please review and confirm again." };
  }
  return { ok: true, gameSlug: slug, category: req.category, amount, label, idemKey };
}

/** Remaining daily allowance for a game given today's already-charged sum. */
export function dailyAllowanceLeft(chargedToday: number): number {
  const used = Number(chargedToday);
  const left = DEV_GAME_DAILY_CAP_COINS - (Number.isFinite(used) && used > 0 ? used : 0);
  return Math.max(0, Math.round(left * 100) / 100);
}
