/**
 * VibeCodeWorker autoplay; a RunPod remote (CPU or GPU) that plays
 * 4weird games by controlling the browser.
 *
 * Enforcement (one rule, client + server share it):
 * - On-site mode: browser control is locked to 4weird games only. The
 *   remote may only drive first-party play URLs
 *   (/games/<slug>/play and /games/<slug>/index.html on the 4weird
 *   origins). Any other URL or any non-catalog slug is refused.
 * - Off-site mode: exists ONLY for Xonotic, ONLY in GPU boosted mode
 *   (RunPod GPUs do the rendering + vision), and ONLY when the
 *   desktop version of VibeCodeWorker is installed. Everything else is
 *   refused with a pointer to /vcw/desktop/.
 *
 * Prices are gross Vibe Coins per minute and INCLUDE the 25% game-AI
 * compute cut (GAME_AI_COMPUTE_CUT_PCT); never added on top.
 * RunPod itself bills the operator's card per second; the coin quote
 * here is the in-app autoplay metering display.
 */

import { gameAiSplit } from "@/lib/game-ai";

export const AUTOPLAY_COMPUTES = ["cpu", "gpu", "gpu-boosted"] as const;
export type AutoplayCompute = (typeof AUTOPLAY_COMPUTES)[number];

export const AUTOPLAY_SITE_MODES = ["on-site", "off-site"] as const;
export type AutoplaySiteMode = (typeof AUTOPLAY_SITE_MODES)[number];

/** Xonotic is the only off-site autoplay target (open-source, GPL-3.0+). */
export const XONOTIC_SLUG = "xonotic";
export const XONOTIC_WEB_URL = "https://dpgame.xonotic.workers.dev/";

/** Where the desktop build lives (native off-site driver for Xonotic). */
export const VCW_DESKTOP_PATH = "/vcw/desktop/";
export const VCW_DESKTOP_INSTALLER = "vibecodeworker-4weird_2.0.0_x64-setup.exe";

/** First-party origins the autoplay browser is allowed to touch. */
export const AUTOPLAY_ONSITE_ORIGINS = [
  "https://4weird.com",
  "https://www.4weird.com",
] as const;

/** Idle lifecycle: 60 min of no input → warning chime, +15 min → stop, 24h untended → terminate (see lib/pod-idle.ts). */
export const AUTOPLAY_MAX_MINUTES = 60;

export type AutoplayRate = {
  compute: AutoplayCompute;
  unit: string;
  coinsPerMinute: number;
  blurb: string;
};

/** Gross coins/min, 25% cut INCLUDED; anchored to live RunPod Secure prices.
 * Recomputed 2026-09-11 from the live catalog (100 coins = $1.00, gross =
 * providerUsd / 0.75, rounded UP to the centicentcoin so the provider share
 * always covers the card):
 * - cpu 0.14/min: cpu3c 2 vCPU at $0.06/hr → $0.08/hr gross.
 * - gpu 0.63/min: cheapest Secure GPUs with stock ($0.24-0.28/hr: RTX 2000
 *   Ada, RTX A4000/A4500, RTX A5000, RTX 4000 Ada) → $0.373/hr gross.
 * - gpu-boosted 2.2/min: pinned to GeForce RTX 4090 ($0.74/hr, RTX 5090 $0.99/hr
 *   fallback) → $1.32/hr gross ceiling. Boosted no longer chases the
 *   priciest card with stock; compute cards cost up to 9x more yet render
 *   games worse. The API still quotes the provisioned card exactly at start
 *   (quoteAutoplayForUsd). A 60-min run is ~9 / ~38 / ~132 coins. Idle pods
 *   stop after the warn + grace window instead of burning the full hour. */
export const AUTOPLAY_RATES: AutoplayRate[] = [
  { compute: "cpu", unit: "remote_min", coinsPerMinute: 0.14, blurb: "RunPod CPU remote drives the 4weird play page (cheapest autoplay, ~$0.08/hr gross)." },
  { compute: "gpu", unit: "remote_min", coinsPerMinute: 0.63, blurb: "RunPod GPU remote drives the 4weird play page with vision (~$0.37/hr gross)." },
  { compute: "gpu-boosted", unit: "remote_min", coinsPerMinute: 2.2, blurb: "Pinned RTX 4090 (5090 fallback): fastest game vision for 4weird games, required for Xonotic off-site (~$1.32/hr gross ceiling, quoted exactly at start)." },
];

export function isAutoplayCompute(value: unknown): value is AutoplayCompute {
  return typeof value === "string" && (AUTOPLAY_COMPUTES as readonly string[]).includes(value);
}

export function isAutoplaySiteMode(value: unknown): value is AutoplaySiteMode {
  return typeof value === "string" && (AUTOPLAY_SITE_MODES as readonly string[]).includes(value);
}

export function cleanAutoplaySlug(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 64);
}

export function isXonoticSlug(slug: string): boolean {
  return cleanAutoplaySlug(slug) === XONOTIC_SLUG;
}

export function rateForCompute(compute: AutoplayCompute): AutoplayRate {
  const found = AUTOPLAY_RATES.find((r) => r.compute === compute);
  if (!found) throw new Error(`Unknown autoplay compute: ${compute}`);
  return found;
}

/** Gross coins for N minutes at a compute tier (centicentcoin ceiling, min 0.01). */
export function quoteAutoplay(compute: AutoplayCompute, minutes: number): number {
  const rate = rateForCompute(compute);
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return Math.max(0.01, Math.ceil(rate.coinsPerMinute * mins * 100) / 100);
}

export function quoteAutoplaySplit(compute: AutoplayCompute, minutes: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  return gameAiSplit(quoteAutoplay(compute, minutes));
}

/**
 * Exact quote for the card that was actually provisioned: gross coins for N
 * minutes from its hourly USD price (gross = provider / 0.75, 25% included),
 * centicentcoin ceiling. This is what the API reports after provisioning -
 * the static AUTOPLAY_RATES above are pre-provision estimates only.
 */
export function quoteAutoplayForUsd(hourlyUsd: number, minutes: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const usd = Number(hourlyUsd);
  const mins = Number(minutes);
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(mins) || mins <= 0) {
    return { gross: 0, cut: 0, provider: 0 };
  }
  const gross = Math.ceil(((usd / 0.75) * 100 * mins) / 60 * 100) / 100;
  return gameAiSplit(gross);
}

export const AUTOPLAY_CUT_NOTE =
  "Includes 25% platform cut (same 25% as all game AI + compute); never added on top.";

/**
 * True when a URL is an on-site autoplay target: first-party origin AND
 * the play shell or runtime bundle path for exactly this slug.
 * No caller-supplied URL ever passes unless it matches both.
 */
export function isOnSiteAutoplayUrl(url: string, slug: string): boolean {
  const clean = cleanAutoplaySlug(slug);
  if (!/^[a-z0-9-]{1,64}$/.test(clean) || isXonoticSlug(clean)) return false;
  let parsed: URL;
  try {
    parsed = new URL(String(url ?? ""));
  } catch {
    return false;
  }
  if (!(AUTOPLAY_ONSITE_ORIGINS as readonly string[]).includes(parsed.origin)) return false;
  return (
    parsed.pathname === `/games/${clean}/play` ||
    parsed.pathname.startsWith(`/games/${clean}/play/`) ||
    parsed.pathname === `/games/${clean}/index.html`
  );
}

/** Canonical on-site play URL for a catalog game (first origin). */
export function onSitePlayUrl(slug: string): string {
  return `${AUTOPLAY_ONSITE_ORIGINS[0]}/games/${cleanAutoplaySlug(slug)}/play`;
}

export type AutoplayPlanInput = {
  gameSlug: unknown;
  compute: unknown;
  siteMode: unknown;
  desktopInstalled?: unknown;
  /** Slugs from content/games (gameSlugs). Xonotic is never in this list. */
  catalogSlugs: string[];
};

export type AutoplayPlan =
  | {
      ok: true;
      gameSlug: string;
      compute: AutoplayCompute;
      siteMode: AutoplaySiteMode;
      targetUrl: string;
      needsDesktop: false;
    }
  | { ok: false; error: string; needsDesktop: boolean };

/**
 * Single enforcement point. Client disables buttons from it; the API
 * refuses anything it denies. Rules:
 * - catalog games: on-site only, any compute tier.
 * - xonotic: gpu-boosted only, off-site only, desktop install required.
 */
export function resolveAutoplayPlan(input: AutoplayPlanInput): AutoplayPlan {
  const slug = cleanAutoplaySlug(input.gameSlug);
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) {
    return { ok: false, error: "Pick a 4weird game to autoplay.", needsDesktop: false };
  }
  if (!isAutoplayCompute(input.compute)) {
    return { ok: false, error: "Pick a remote: cpu, gpu, or gpu-boosted.", needsDesktop: false };
  }
  const compute = input.compute;
  const siteMode: AutoplaySiteMode = input.siteMode === "off-site" ? "off-site" : "on-site";
  const desktopInstalled = input.desktopInstalled === true;
  const catalog = Array.isArray(input.catalogSlugs) ? input.catalogSlugs.map(cleanAutoplaySlug) : [];

  if (isXonoticSlug(slug)) {
    if (compute !== "gpu-boosted") {
      return {
        ok: false,
        error: "Xonotic autoplay needs GPU boosted mode; it renders on RunPod GPUs.",
        needsDesktop: false,
      };
    }
    if (siteMode !== "off-site") {
      return {
        ok: false,
        error: "Xonotic has no on-site runtime; use off-site mode (GPU boosted + desktop app).",
        needsDesktop: true,
      };
    }
    if (!desktopInstalled) {
      return {
        ok: false,
        error: `Off-site Xonotic needs the desktop VibeCodeWorker installed (${VCW_DESKTOP_INSTALLER} from ${VCW_DESKTOP_PATH}).`,
        needsDesktop: true,
      };
    }
    return { ok: true, gameSlug: slug, compute, siteMode, targetUrl: XONOTIC_WEB_URL, needsDesktop: false };
  }

  if (!catalog.includes(slug)) {
    return {
      ok: false,
      error: "Autoplay browser control is on-site only - 4weird games only.",
      needsDesktop: false,
    };
  }
  if (siteMode !== "on-site") {
    return {
      ok: false,
      error: "Autoplay browser control is on-site only - 4weird games only. Off-site mode exists only for Xonotic (GPU boosted + desktop app).",
      needsDesktop: false,
    };
  }
  return { ok: true, gameSlug: slug, compute, siteMode, targetUrl: onSitePlayUrl(slug), needsDesktop: false };
}

/**
 * Provider hint for autoplay remotes; pure display helper, no provisioning.
 * CPU/GPU short runs stay on RunPod (per-minute remotes, idle-stop capped).
 * Persistent test fleets (always-on / multi-day harnesses) belong on
 * DigitalOcean, which is cheaper to park than per-second pod billing.
 */
export function autoplayProviderHint(compute: AutoplayCompute): string {
  switch (compute) {
    case "cpu":
      return "RunPod CPU remote for short runs; persistent test fleets → DigitalOcean.";
    case "gpu":
      return "RunPod GPU remote for short runs; persistent test fleets → DigitalOcean.";
    case "gpu-boosted":
      return "RunPod RTX 4090 boosted remote for short runs; persistent test fleets → DigitalOcean.";
  }
}
