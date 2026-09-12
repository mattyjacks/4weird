/**
 * Long-render path for Blender jobs; pure routing + quoting helpers only.
 *
 * Rule: short renders stay on the RunPod RTX 4090 pod farm
 * (see lib/blender-render.ts). Anything long-term — estimated wall time
 * over 12h OR a span over 600 frames — routes to DigitalOcean, which is
 * cheaper to park for many hours/days than per-second GPU pod billing.
 *
 * No live provisioning here: callers decide the provider from
 * shouldUseLongTerm() and keep the existing RunPod start flow untouched.
 */

import { gameAiSplit } from "@/lib/game-ai";

/** Est. wall minutes above which a render counts as long-term. */
export const LONG_RENDER_MINUTES_THRESHOLD = 12 * 60;
/** Frame count above which a render counts as long-term. */
export const LONG_RENDER_FRAME_THRESHOLD = 600;

export type LongRenderQuote = {
  frames: number;
  hourlyUsd: number;
  /** Gross Vibe Coins per hour at this card (25% cut included). */
  hourlyGross: number;
  cut: number;
  provider: number;
  /** Long renders park here. */
  providerHint: "digitalocean";
  note: string;
};

/**
 * True when a render should leave the RunPod short-render farm for
 * DigitalOcean: est wall time > 12h (720 min) OR frame span > 600.
 * Non-finite / non-positive inputs never route long (return false).
 */
export function shouldUseLongTerm(frameCount: unknown, estMinutes: unknown): boolean {
  const frames = Number(frameCount);
  const mins = Number(estMinutes);
  if (Number.isFinite(frames) && frames > LONG_RENDER_FRAME_THRESHOLD) return true;
  if (Number.isFinite(mins) && mins > LONG_RENDER_MINUTES_THRESHOLD) return true;
  return false;
}

/**
 * Pure hourly quote for a long render at a given provider card price.
 * Gross coins/hr = provider USD/hr / 0.75 (25% cut included, 100 coins = $1).
 * Rounded UP to the centicentcoin so the provider share always covers the card.
 */
export function longRenderQuote(frames: unknown, usdPerHr: unknown): LongRenderQuote {
  const f = Number(frames);
  const usd = Number(usdPerHr);
  const safeFrames = Number.isFinite(f) && f > 0 ? Math.floor(f) : 0;
  const safeUsd = Number.isFinite(usd) && usd > 0 ? usd : 0;
  const hourlyGross =
    safeUsd > 0 ? Math.ceil(((safeUsd / 0.75) * 100) * 100) / 100 : 0;
  const split = gameAiSplit(hourlyGross);
  return {
    frames: safeFrames,
    hourlyUsd: safeUsd,
    hourlyGross: split.gross,
    cut: split.cut,
    provider: split.provider,
    providerHint: "digitalocean",
    note: "Long render (>12h est or >600 frames): runs on DigitalOcean, not the RunPod short-render farm.",
  };
}
