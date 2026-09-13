/**
 * Host metering — load attribution plus spend-permission ceilings for MMO hosts.
 *
 * Pure module (no imports, no I/O, no logging — economy paths must never
 * log balances or PII). All money math runs in integer centicentcoins
 * (1 coin = 100 centicentcoins, the same unit as `lib/game-rent.ts`,
 * `lib/mmo-host-billing.ts`, and `lib/host-rentals.ts`).
 *
 * Load attribution splits a session's metered cost into three legs that
 * converge with the `mmo-host-billing.ts` three-leg model:
 * - relay: signaling/relay messages forwarded for the session.
 * - bandwidth: egress bytes moved for the session.
 * - worker CPU: vCPU-seconds burned by the session's worker.
 *
 * This module only QUOTES. Settlement must flow through the paired
 * `coin_ledger` entries via a guarded RPC — never a parallel balance
 * column. Tables belong to DS-MMO-10.
 */

/** Coins per 1,000 relay messages forwarded. */
export const HOST_RELAY_COINS_PER_1K_MSG = 1;
/** Coins per 1 MiB of session egress bandwidth. */
export const HOST_BANDWIDTH_COINS_PER_MIB = 2;
/** Coins per vCPU-minute of session worker time. */
export const HOST_CPU_COINS_PER_VCPU_MIN = 1;

/** Reference sizes for the proportional legs. */
export const HOST_BANDWIDTH_REFERENCE_BYTES = 1024 * 1024; // 1 MiB
export const HOST_CPU_REFERENCE_SECONDS = 60; // 1 vCPU-minute

/** Default per-session host auto-spend ceiling (gross coins). */
export const HOST_SPEND_CEILING_DEFAULT_COINS = 100;
/** Smallest configurable host ceiling (1 coin). */
export const HOST_SPEND_CEILING_MIN_COINS = 1;
/** Largest configurable host ceiling (never above the festival-day worst case). */
export const HOST_SPEND_CEILING_MAX_COINS = 9600;

/**
 * Low-wallet floor: when `hostWallet - projectedHostCost` would drop below
 * this, the subsidy auto-reverts to `off` (see `resolveEffectiveSubsidyMode`).
 */
export const HOST_LOW_WALLET_FLOOR_COINS = 50;

export type HostLoadSample = {
  /** Relay messages forwarded for the session. */
  relayMessages?: unknown;
  /** Egress bytes moved for the session. */
  egressBytes?: unknown;
  /** vCPU-seconds burned by the session's worker. */
  cpuSeconds?: unknown;
};

export type HostLoadAttribution = {
  relayCost: number;
  bandwidthCost: number;
  cpuCost: number;
  totalCost: number;
};

function toCount(value: unknown, max: number): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(Math.floor(v), max);
}

function toCoins(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v * 100) / 100;
}

/**
 * Attribute metered load to coins. Each leg is proportional with a
 * 1-centicentcoin minimum when a priced leg actually moved units
 * (same minimum rule as `loadFeeForBytes` in `lib/game-rent.ts`):
 * - relay: `round(msgs * rate_cc / 1000)`
 * - bandwidth: `round(bytes * rate_cc / 1 MiB)`
 * - cpu: `round(cpu_seconds * rate_cc / 60)`
 */
export function attributeHostLoad(sample: HostLoadSample): HostLoadAttribution {
  const msgs = toCount(sample.relayMessages, 1_000_000_000);
  const bytes = toCount(sample.egressBytes, 1024 * 1024 * 1024 * 1024);
  const cpuSecs = toCount(sample.cpuSeconds, 86_400 * 64);

  const relayCc = msgs > 0 ? Math.max(1, Math.round((msgs * HOST_RELAY_COINS_PER_1K_MSG * 100) / 1000)) : 0;
  const bandwidthCc =
    bytes > 0
      ? Math.max(1, Math.round((bytes * HOST_BANDWIDTH_COINS_PER_MIB * 100) / HOST_BANDWIDTH_REFERENCE_BYTES))
      : 0;
  const cpuCc =
    cpuSecs > 0
      ? Math.max(1, Math.round((cpuSecs * HOST_CPU_COINS_PER_VCPU_MIN * 100) / HOST_CPU_REFERENCE_SECONDS))
      : 0;

  return {
    relayCost: relayCc / 100,
    bandwidthCost: bandwidthCc / 100,
    cpuCost: cpuCc / 100,
    totalCost: (relayCc + bandwidthCc + cpuCc) / 100,
  };
}

/**
 * Clean a host-supplied per-session auto-spend ceiling.
 * Returns the ceiling, the default when absent, or null when invalid.
 */
export function cleanHostCeiling(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return HOST_SPEND_CEILING_DEFAULT_COINS;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (n < HOST_SPEND_CEILING_MIN_COINS || n > HOST_SPEND_CEILING_MAX_COINS) return null;
  return n;
}

/**
 * Does this projected host spend need explicit approval?
 * Fail closed: non-finite spends always need approval.
 */
export function needsHostApproval(spendCoins: unknown, ceilingCoins: unknown = HOST_SPEND_CEILING_DEFAULT_COINS): boolean {
  const s = Number(spendCoins);
  if (!Number.isFinite(s)) return true;
  const max = cleanHostCeiling(ceilingCoins);
  const ceiling = max ?? HOST_SPEND_CEILING_DEFAULT_COINS;
  return s > ceiling;
}

export type SubsidyResolveInput = {
  /** Configured subsidy mode. */
  mode: "off" | "host_full" | "host_split_pct" | "host_cap_pool";
  /** Host wallet balance in coins (caller-supplied quote input — never logged). */
  hostWalletCoins: unknown;
  /** Projected host-funded cost for the session in coins. */
  projectedHostCoins: unknown;
  /** Floor below which the wallet must not fall (defaults to the low-wallet floor). */
  floorCoins?: unknown;
};

export type SubsidyResolveResult = {
  /** Mode to actually apply. */
  effectiveMode: "off" | "host_full" | "host_split_pct" | "host_cap_pool";
  /** True when a non-off mode reverted to `off`. */
  reverted: boolean;
  /** Host wallet remainder after the projected spend (never below 0 in the quote). */
  walletAfter: number;
};

/**
 * Auto-revert guard: when the host wallet cannot cover the projected
 * host-funded cost above the floor, the subsidy reverts to `off` so the
 * host is never quoted into a wallet it does not have. `off` never reverts.
 */
export function resolveEffectiveSubsidyMode(input: SubsidyResolveInput): SubsidyResolveResult {
  const walletCc = Math.round(toCoins(input.hostWalletCoins) * 100);
  const projectedCc = Math.round(toCoins(input.projectedHostCoins) * 100);
  const floorRaw = input.floorCoins === undefined ? HOST_LOW_WALLET_FLOOR_COINS : toCoins(input.floorCoins);
  const floorCc = Math.round(floorRaw * 100);
  const walletAfterCc = Math.max(0, walletCc - projectedCc);
  if (input.mode === "off") {
    return { effectiveMode: "off", reverted: false, walletAfter: walletAfterCc / 100 };
  }
  if (walletCc - projectedCc < floorCc) {
    return { effectiveMode: "off", reverted: true, walletAfter: walletCc / 100 };
  }
  return { effectiveMode: input.mode, reverted: false, walletAfter: walletAfterCc / 100 };
}

export const HOST_METERING_NOTE =
  "Load attribution quotes only; settlement flows through the paired coin ledger. Host subsidies auto-revert to off when the host wallet would fall below the floor.";
