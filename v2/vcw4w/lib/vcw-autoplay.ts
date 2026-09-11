/**
 * VibeCodeWorker autoplay — a RunPod remote (CPU or GPU) that plays
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
 * compute cut (GAME_AI_COMPUTE_CUT_PCT) — never added on top.
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
  "https://4weird.games",
  "https://www.4weird.games",
  "https://4weird.com",
  "https://www.4weird.com",
] as const;

/** Hard remote lifetime: 55 minutes, then the pod self-terminates. */
export const AUTOPLAY_MAX_MINUTES = 55;

export type AutoplayRate = {
  compute: AutoplayCompute;
  unit: string;
  coinsPerMinute: number;
  blurb: string;
};

/** Gross coins/min, 25% cut INCLUDED. */
export const AUTOPLAY_RATES: AutoplayRate[] = [
  { compute: "cpu", unit: "remote_min", coinsPerMinute: 4, blurb: "RunPod CPU remote drives the 4weird play page (cheapest autoplay)." },
  { compute: "gpu", unit: "remote_min", coinsPerMinute: 12, blurb: "RunPod GPU remote drives the 4weird play page with vision." },
  { compute: "gpu-boosted", unit: "remote_min", coinsPerMinute: 20, blurb: "Best RunPod GPU: fastest vision for 4weird games, required for Xonotic off-site." },
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

/** Gross coins for N minutes at a compute tier (min 1). */
export function quoteAutoplay(compute: AutoplayCompute, minutes: number): number {
  const rate = rateForCompute(compute);
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return Math.max(1, Math.ceil(rate.coinsPerMinute * mins));
}

export function quoteAutoplaySplit(compute: AutoplayCompute, minutes: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  return gameAiSplit(quoteAutoplay(compute, minutes));
}

export const AUTOPLAY_CUT_NOTE =
  "Includes 25% platform cut (same 25% as all game AI + compute) — never added on top.";

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
        error: "Xonotic autoplay needs GPU boosted mode — it renders on RunPod GPUs.",
        needsDesktop: false,
      };
    }
    if (siteMode !== "off-site") {
      return {
        ok: false,
        error: "Xonotic has no on-site runtime — use off-site mode (GPU boosted + desktop app).",
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
      error: "Autoplay browser control is on-site only — 4weird games only.",
      needsDesktop: false,
    };
  }
  if (siteMode !== "on-site") {
    return {
      ok: false,
      error: "Autoplay browser control is on-site only — 4weird games only. Off-site mode exists only for Xonotic (GPU boosted + desktop app).",
      needsDesktop: false,
    };
  }
  return { ok: true, gameSlug: slug, compute, siteMode, targetUrl: onSitePlayUrl(slug), needsDesktop: false };
}
