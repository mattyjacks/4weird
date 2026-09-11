/**
 * Ghost Cash (👻) — hypothetical IOU unit for orgs. NO legal value, NO
 * cash-out, NO store of value: a ruler for "you owe me for those hours",
 * tracked to the second by timer heartbeats. Fully separate from Vibe Coins
 * (different tables, no shared triggers) — the two can never mix.
 *
 * Emoji is the ghost ONLY (👻) — never paired with a cash emoji. Real money
 * always uses 💸, Vibe Coins use 🪙, clan Love Letters use 💌.
 */

export const GHOST_EMOJI = "👻";
export const GHOST_NAME = "Ghost Cash";

export type GhostContract = {
  id: string;
  org_id: string;
  title: string;
  worker_id: string;
  payer_id: string;
  rate_ghost: number;
  status: "open" | "closed";
  created_by: string | null;
  created_at: string;
};

export type GhostTimer = {
  id: string;
  contract_id: string;
  worker_id: string;
  clock_in: string;
  clock_out: string | null;
  active_seconds: number;
  beats: number;
  total_beats: number;
  note: string;
  created_at: string;
};

export type GhostDebt = {
  id: string;
  org_id: string;
  contract_id: string | null;
  timer_id: string | null;
  debtor_id: string;
  creditor_id: string;
  amount_ghost: number;
  reason: string;
  status: "owed" | "settled" | "void";
  created_by: string | null;
  created_at: string;
};

/** "3h 25m 07s" from tracked seconds. */
export function fmtGhostTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(rest).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(rest).padStart(2, "0")}s`;
  return `${rest}s`;
}

/** "1,234.56 👻" — always labeled hypothetical. */
export function fmtGhost(amount: number): string {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${GHOST_EMOJI}`;
}

export function activityPct(beats: number, total: number): number {
  if (!total) return 0;
  return Math.round((beats / total) * 100);
}
