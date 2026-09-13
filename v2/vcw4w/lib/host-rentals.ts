/**
 * Host rentals — MMO player-host rental tiers, deposit holds, and subsidy modes.
 *
 * Pure module (no imports, no I/O, no logging — economy paths must never
 * log balances or PII). All money math runs in integer centicentcoins
 * (1 coin = 100 centicentcoins, the same unit as `lib/game-rent.ts` and
 * `lib/mmo-host-billing.ts`); results return in coins rounded to 2 decimals.
 *
 * Conventions converged with the prior crew:
 * - Gross INCLUDEs the 25% platform cut, never on top
 *   (`cut_cc = round(gross_cc * 25 / 100)`, `host_earnings = gross - cut`,
 *   so cut + earnings ALWAYS equals gross — same rule as `game-rent.ts`).
 * - Hourly rates settle pro-rata from the first second (per-second ledger,
 *   `gross_cc = round(rate_cc * seconds / 3600)` — identical to
 *   `rentalFeeForMinutes` at whole-minute boundaries).
 * - This module only QUOTES. Settlement (ledger debits, host payouts,
 *   deposit holds/releases) is economy-lane owned and must flow through the
 *   paired `coin_ledger` entries via a guarded RPC — never a parallel
 *   balance column. Tables belong to DS-MMO-10.
 */

/** Platform cut baked INSIDE every gross figure (same as SERVICE_CUT_PCT). */
export const HOST_RENTAL_CUT_PCT = 25;

/** Rental tiers: hourly gross coins/hr, cut INCLUDED. Campfire 25 → festival 400. */
export const HOST_RENTAL_TIERS = {
  campfire: 25,
  outpost: 50,
  hall: 100,
  coliseum: 200,
  festival: 400,
} as const;

export type HostRentalTier = keyof typeof HOST_RENTAL_TIERS;

/** Floor / ceiling of the tier ladder (gross coins/hr). */
export const HOST_TIER_MIN_COINS_PER_HOUR = HOST_RENTAL_TIERS.campfire;
export const HOST_TIER_MAX_COINS_PER_HOUR = HOST_RENTAL_TIERS.festival;

/** Deposit hold = this many hours of gross at the booked rate. */
export const HOST_DEPOSIT_HOURS = 1;
/** Upper bound for a single rental quote (24h of hosting). */
export const HOST_MAX_BILLABLE_SECONDS = 24 * 3600;
/** Upper bound for a deposit hold quote. */
export const HOST_MAX_DEPOSIT_COINS = 9600;

/**
 * Subsidy modes — who FUNDS the gross rental fee:
 * - `off`: joining players fund all of it.
 * - `host_full`: the host funds all of it.
 * - `host_split_pct`: the host funds `splitPct`% of gross, players the rest.
 * - `host_cap_pool`: the host funds up to a capped pool per session
 *   (and per player); players fund everything above the caps.
 */
export const HOST_SUBSIDY_MODES = ["off", "host_full", "host_split_pct", "host_cap_pool"] as const;

export type HostSubsidyMode = (typeof HOST_SUBSIDY_MODES)[number];

export type HostSubsidyOpts = {
  mode: HostSubsidyMode;
  /** 0-100, required for `host_split_pct` (host share of gross). */
  splitPct?: number;
  /** Host pool cap for the whole session (`host_cap_pool`). */
  sessionCapCoins?: number;
  /** Host cap per joining player (`host_cap_pool`). */
  perPlayerCapCoins?: number;
  /** Players sharing the session (splits the player-funded remainder). */
  playerCount?: number;
  /** Host coins already committed this session (counts against the session cap). */
  sessionHostSpentCoins?: number;
};

export type HostRentalSplit = {
  /** Gross rental fee being funded (cut included). */
  gross: number;
  /** Platform cut baked inside gross. */
  platformCut: number;
  /** Host earnings inside gross (gross - cut). */
  hostEarnings: number;
  /** Coins the host funds. */
  hostPays: number;
  /** Coins joining players fund (split evenly across `playerCount`). */
  playerPays: number;
  /** Per-player share of `playerPays` (0 when playerCount < 1). */
  perPlayerShare: number;
  /** Effective subsidy mode after caps (caps can only shrink the host share). */
  effectiveMode: HostSubsidyMode;
  /** True when a cap clamped the host share below the mode's target. */
  capped: boolean;
};

function toCoins(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v * 100) / 100;
}

function toSeconds(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(Math.floor(v), HOST_MAX_BILLABLE_SECONDS);
}

function toPct(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v)) return -1;
  if (!Number.isInteger(v) || v < 0 || v > 100) return -1;
  return v;
}

export function isHostRentalTier(value: unknown): HostRentalTier | null {
  const v = String(value ?? "").trim().toLowerCase();
  return (Object.keys(HOST_RENTAL_TIERS) as HostRentalTier[]).includes(v as HostRentalTier)
    ? (v as HostRentalTier)
    : null;
}

export function isHostSubsidyMode(value: unknown): HostSubsidyMode | null {
  const v = String(value ?? "").trim().toLowerCase();
  return (HOST_SUBSIDY_MODES as readonly string[]).includes(v) ? (v as HostSubsidyMode) : null;
}

/** Hourly gross rate for a tier (cut included). */
export function tierRateCoinsPerHour(tier: HostRentalTier): number {
  return HOST_RENTAL_TIERS[tier];
}

/**
 * Gross rental fee for `seconds` at `coinsPerHour`, pro-rata per second:
 * `gross_cc = round(rate_cc * seconds / 3600)`.
 */
export function rentalGrossForSeconds(coinsPerHour: number, seconds: number): number {
  const rateCc = Math.round(toCoins(coinsPerHour) * 100);
  const secs = toSeconds(seconds);
  if (rateCc <= 0 || secs <= 0) return 0;
  return Math.round((rateCc * secs) / 3600) / 100;
}

/** Gross rental fee for a tier booking of `seconds`. */
export function tierGrossForSeconds(tier: HostRentalTier, seconds: number): number {
  return rentalGrossForSeconds(tierRateCoinsPerHour(tier), seconds);
}

/**
 * Deposit hold for a booking at `coinsPerHour`: one hour of gross
 * (`HOST_DEPOSIT_HOURS`), quoted — the hold itself is placed by the
 * DS-MMO-10 settlement RPC, never here.
 */
export function depositHoldCoins(coinsPerHour: number): number {
  const rateCc = Math.round(toCoins(coinsPerHour) * 100);
  if (rateCc <= 0) return 0;
  const holdCc = rateCc * HOST_DEPOSIT_HOURS;
  return Math.min(holdCc, Math.round(HOST_MAX_DEPOSIT_COINS * 100)) / 100;
}

/** Deposit hold for a tier booking. */
export function tierDepositHoldCoins(tier: HostRentalTier): number {
  return depositHoldCoins(tierRateCoinsPerHour(tier));
}

function toPlayerCount(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 1) return 1;
  return Math.min(Math.floor(v), 1000);
}

/**
 * Split a gross rental fee between host and players under a subsidy mode.
 * `hostPays + playerPays` ALWAYS equals `gross`; `platformCut +
 * hostEarnings` ALWAYS equals `gross` (verified by invariant: every figure
 * derives from integer centicentcoins of the same gross).
 */
export function splitRentalGross(grossCoins: number, opts: HostSubsidyOpts): HostRentalSplit {
  const grossCc = Math.round(toCoins(grossCoins) * 100);
  const cutCc = Math.round((grossCc * HOST_RENTAL_CUT_PCT) / 100);
  const mode = opts.mode;
  const playerCount = toPlayerCount(opts.playerCount);
  let hostCc = 0;
  let effectiveMode: HostSubsidyMode = mode;
  let capped = false;

  if (mode === "host_full") {
    hostCc = grossCc;
  } else if (mode === "host_split_pct") {
    const pct = toPct(opts.splitPct);
    // Invalid pct fails closed: host funds nothing rather than everything.
    hostCc = pct < 0 ? 0 : Math.round((grossCc * pct) / 100);
  } else if (mode === "host_cap_pool") {
    const sessionCapCc = Math.round(toCoins(opts.sessionCapCoins) * 100);
    const perPlayerCapCc = Math.round(toCoins(opts.perPlayerCapCoins) * 100);
    const spentCc = Math.round(toCoins(opts.sessionHostSpentCoins) * 100);
    // Pool remaining this session; a missing/zero session cap means no pool.
    const poolLeftCc = sessionCapCc > 0 ? Math.max(0, sessionCapCc - spentCc) : 0;
    // Per-player cap scales by roster; a missing/zero per-player cap means no per-player limit.
    const rosterCapCc = perPlayerCapCc > 0 ? perPlayerCapCc * playerCount : grossCc;
    hostCc = Math.min(grossCc, poolLeftCc, rosterCapCc);
    capped = hostCc < grossCc;
    if (hostCc <= 0) effectiveMode = "off";
  }

  const playerCc = grossCc - hostCc;
  // Per-player share rounds DOWN so shares never inflate the player total;
  // sub-centicentcoin dust stays inside `playerPays`.
  return {
    gross: grossCc / 100,
    platformCut: cutCc / 100,
    hostEarnings: (grossCc - cutCc) / 100,
    hostPays: hostCc / 100,
    playerPays: playerCc / 100,
    perPlayerShare: playerCount > 0 ? Math.floor(playerCc / playerCount) / 100 : 0,
    effectiveMode,
    capped,
  };
}

/**
 * Full rental quote: gross for `seconds` at a tier (or custom hourly rate),
 * funded split, and deposit hold — one object for consent lines.
 */
export function quoteHostRental(input: {
  tier?: unknown;
  coinsPerHour?: unknown;
  seconds: unknown;
  subsidy?: HostSubsidyOpts;
}): HostRentalSplit & { tier: HostRentalTier | null; coinsPerHour: number; seconds: number; depositHold: number } {
  const tier = isHostRentalTier(input.tier);
  const custom = toCoins(input.coinsPerHour);
  const rate =
    tier !== null
      ? tierRateCoinsPerHour(tier)
      : custom > 0
        ? Math.min(custom, HOST_TIER_MAX_COINS_PER_HOUR)
        : HOST_TIER_MIN_COINS_PER_HOUR;
  const seconds = toSeconds(input.seconds);
  const gross = rentalGrossForSeconds(rate, seconds);
  const split = splitRentalGross(gross, input.subsidy ?? { mode: "off" });
  return {
    ...split,
    tier,
    coinsPerHour: rate,
    seconds,
    depositHold: depositHoldCoins(rate),
  };
}

export const HOST_RENTAL_CUT_NOTE =
  "Host rental rates are gross with the 25% platform cut INCLUDED, never on top. 100 coins = $1.00. Quoted here, settled by guarded ledger RPC (DS-MMO-10).";
