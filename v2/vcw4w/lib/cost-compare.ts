/**
 * RunPod vs DigitalOcean cost comparison. Pure functions only (no fetch),
 * unit-testable. Mirrors lib/economy.ts + lib/cloud-catalog.ts pricing rule:
 *
 * Coin math: 100 Vibe Coins cost the buyer exactly $1.00 ($0.01 per coin).
 * Every quoted price INCLUDES the 25% platform service cut
 * (SERVICE_CUT_PCT); the cut is never added on top. Coin figures here are
 * the gross the wallet is debited, matching runpodUsdToCoins / doUsdToCoins.
 */

export const COINS_PER_USD = 100;
export const SERVICE_CUT_PCT_INCLUDED = 25;
/** Average hours per month (365 * 24 / 12). Used both directions. */
export const HOURS_PER_MONTH = 730;
/** Below this many hours, short-burst hourly billing wins over monthly. */
export const SHORT_BURST_HOURS = 24;

export type CostQuote = { usd: number; coins: number };

function cleanUsd(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v * 10000) / 10000;
}

function cleanAmount(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v;
}

/** Coin display equivalent of a USD amount (100 coins = $1.00), 2dp. */
export function usdToCoins(usd: unknown): number {
  const v = Number(usd);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v * COINS_PER_USD * 100) / 100;
}

/** Convert a RunPod hourly rate to an equivalent monthly figure. */
export function runpodHourlyToMonthly(usdPerHour: number): number {
  return cleanUsd(cleanAmount(usdPerHour) * HOURS_PER_MONTH);
}

/** Convert a DigitalOcean monthly rate to an equivalent hourly figure. */
export function doMonthlyToHourly(usdPerMonth: number): number {
  const v = cleanAmount(usdPerMonth);
  if (v <= 0) return 0;
  return cleanUsd(v / HOURS_PER_MONTH);
}

/** Quote a RunPod run: hours × $/hr → gross USD + coin equivalent. */
export function quoteRunpod(hours: number, usdPerHr: number): CostQuote {
  const h = cleanAmount(hours);
  const rate = cleanAmount(usdPerHr);
  if (h <= 0 || rate <= 0) return { usd: 0, coins: 0 };
  const usd = Math.round(h * rate * 10000) / 10000;
  return { usd, coins: usdToCoins(usd) };
}

/** Quote a DigitalOcean run: months × $/mo → gross USD + coin equivalent. */
export function quoteDO(months: number, usdPerMo: number): CostQuote {
  const m = cleanAmount(months);
  const rate = cleanAmount(usdPerMo);
  if (m <= 0 || rate <= 0) return { usd: 0, coins: 0 };
  const usd = Math.round(m * rate * 10000) / 10000;
  return { usd, coins: usdToCoins(usd) };
}

export type RecommendInput = {
  hoursNeeded: number;
  needsGpu: boolean;
  needsServerless: boolean;
};

export type RecommendResult = {
  provider: "runpod" | "digitalocean";
  reason: string;
};

/**
 * Pick the cheaper-fit provider. Rule: GPU work, serverless/autoscaled
 * work, or anything under 24h → RunPod (hourly GPU + serverless billing);
 * long-lived plain CPU servers → DigitalOcean (flat monthly droplets).
 */
export function recommendProvider(input: RecommendInput): RecommendResult {
  const hours = Number(input.hoursNeeded);
  const hoursNeeded = Number.isFinite(hours) && hours > 0 ? hours : 0;
  if (input.needsGpu) {
    return {
      provider: "runpod",
      reason: "GPU workload: RunPod hourly GPU pods beat DigitalOcean CPU-monthly pricing.",
    };
  }
  if (input.needsServerless) {
    return {
      provider: "runpod",
      reason: "Serverless/autoscaled workload: RunPod serverless workers scale to zero; DigitalOcean charges per always-on server.",
    };
  }
  if (hoursNeeded < SHORT_BURST_HOURS) {
    return {
      provider: "runpod",
      reason: `Short burst (${hoursNeeded}h < ${SHORT_BURST_HOURS}h): RunPod hourly billing beats a full DigitalOcean month.`,
    };
  }
  return {
    provider: "digitalocean",
    reason: `Long-lived CPU server (${hoursNeeded}h): DigitalOcean flat monthly billing beats RunPod hourly metering.`,
  };
}
