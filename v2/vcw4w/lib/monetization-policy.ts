/**
 * Monetization policy; one universal lawfulness layer for every player
 * purchase (cosmetics shop, dev charges, avatar/camera presence).
 *
 * Better than freeform upload tags: each game declares ONE enumerated
 * monetization profile + audience, and every rule below is MACHINE-ENFORCED
 * in the purchase routes; a tag you can violate is decoration; a profile
 * the server checks is compliance.
 *
 * Profiles (plain-language labels included for store display):
 * - no-monetization ..... nothing may be sold (default for unknown games)
 * - cosmetics-only ....... looks-only items; safe everywhere incl. multiplayer
 * - singleplayer-boosts .. + paid gameplay boosts, singleplayer games only
 * - battle-pass .......... cosmetics + singleplayer boosts bound to a season
 * - chance-based ......... + loot-box/gacha mechanics (odds + region gates)
 *
 * Lawfulness mapping (rules as code; counsel reviews the mapping, not a
 * substitute for it):
 * - USA / New Hampshire: no virtual-currency statute for closed-loop coins
 *   (no cash-out anywhere in this app, so no money-transmission); ROSCA +
 *   FTC dark-pattern rules = express per-charge consent (acceptedQuote match),
 *   no silent recurring billing (every dev charge is one-shot; avatar/camera
 *   tick visibly and stop on toggle-off), receipts for everything.
 * - COPPA (US) / UK Age-Appropriate Design Code / GDPR-K: kids mode or a
 *   kids-audience game disables ALL purchases.
 * - EU/EEA (GDPR, DSA Art.25 dark-pattern ban, Consumer Rights
 *   Directive/Omnibus price transparency, CPC virtual-currency action):
 *   prices shown in coins + USD before consent; no pre-ticked anything;
 *   immediate digital delivery is recorded as an express-consent waiver of
 *   the 14-day withdrawal right; unknown region is treated as EU (strictest).
 * - UK: same as EU plus the loot-box self-regulation stance (odds + no kids).
 * - Belgium/Netherlands: paid chance-based mechanics are barred outright.
 * - South Korea / China / Japan: chance-based mechanics require published
 *   odds (enforced globally, not just there).
 * - Brazil LGPD / global baseline: receipts carry no PII beyond user_id.
 *
 * Pure module (imports ./economy, ./dev-charges, ../content/games only).
 */

import { MAX_SINGLE_PURCHASE_COINS } from "./economy";
import { isMultiplayerGame } from "./dev-charges";
import { games } from "../content/games";
import type { DevChargeCategory } from "./dev-charges";

export const MONETIZATION_PROFILES = [
  "no-monetization",
  "cosmetics-only",
  "singleplayer-boosts",
  "battle-pass",
  "chance-based",
] as const;
export type MonetizationProfile = (typeof MONETIZATION_PROFILES)[number];

export const AUDIENCES = ["general", "kids", "adults"] as const;
export type GameAudience = (typeof AUDIENCES)[number];

export type ProfileRules = {
  /** Store-display label, e.g. "Singleplayer Pay-to-Win". */
  label: string;
  blurb: string;
  allowedCategories: DevChargeCategory[];
  allowsChance: boolean;
  requiresSeasonLabel: boolean;
};

export const PROFILE_RULES: Record<MonetizationProfile, ProfileRules> = {
  "no-monetization": {
    label: "No purchases",
    blurb: "Nothing is sold in this game.",
    allowedCategories: [],
    allowsChance: false,
    requiresSeasonLabel: false,
  },
  "cosmetics-only": {
    label: "Cosmetics Only",
    blurb: "Looks-only items. Nothing sold here changes gameplay; safe in multiplayer.",
    allowedCategories: ["cosmetic"],
    allowsChance: false,
    requiresSeasonLabel: false,
  },
  "singleplayer-boosts": {
    label: "Singleplayer Pay-to-Win",
    blurb: "Cosmetics plus paid gameplay boosts that work in singleplayer only. Boosts never function in multiplayer.",
    allowedCategories: ["cosmetic", "singleplayer-boost"],
    allowsChance: false,
    requiresSeasonLabel: false,
  },
  "battle-pass": {
    label: "Battle Pass (Cosmetics Only)",
    blurb: "Season-bound cosmetics (and singleplayer boosts where allowed). Pass rewards are looks-only in multiplayer.",
    allowedCategories: ["cosmetic", "singleplayer-boost"],
    allowsChance: false,
    requiresSeasonLabel: true,
  },
  "chance-based": {
    label: "Chance-Based (Odds Disclosed)",
    blurb: "May include loot-box style draws. Every draw publishes its odds; barred in BE/NL; never for kids.",
    allowedCategories: ["cosmetic", "singleplayer-boost"],
    allowsChance: true,
    requiresSeasonLabel: false,
  },
};

/**
 * Profile for a game. Multiplayer or unknown games fail closed to
 * cosmetics-only; singleplayer first-party games allow singleplayer boosts.
 * Dev-uploaded games will declare this in their upload manifest (validated
 * by validateGameMonetization before the game goes live).
 */
export function profileForGame(slug: string): MonetizationProfile {
  const game = games.find((g) => g.slug === slug);
  if (!game) return "cosmetics-only";
  if (isMultiplayerGame(slug)) return "cosmetics-only";
  return "singleplayer-boosts";
}

/**
 * Audience for a game. Currently all first-party games are general-audience;
 * dev-uploaded games declare this (kids-audience games disable all charges).
 */
export function audienceForGame(slug: string): GameAudience {
  const game = games.find((g) => g.slug === slug);
  if (!game) return "general";
  return "general";
}

/** Validate a dev-uploaded game's monetization declaration before go-live. */
export function validateGameMonetization(input: {
  profile: unknown;
  audience?: unknown;
  multiplayer: unknown;
  chanceBased?: unknown;
  oddsDisclosed?: unknown;
  seasonLabel?: unknown;
}): { ok: true; profile: MonetizationProfile; audience: GameAudience } | { ok: false; error: string } {
  const profile = String(input.profile ?? "");
  if (!(MONETIZATION_PROFILES as readonly string[]).includes(profile)) {
    return { ok: false, error: "Upload must declare a monetization profile (no-monetization, cosmetics-only, singleplayer-boosts, battle-pass, chance-based)." };
  }
  const p = profile as MonetizationProfile;
  const audienceRaw = String(input.audience ?? "general");
  if (!(AUDIENCES as readonly string[]).includes(audienceRaw)) return { ok: false, error: "Audience must be general, kids, or adults." };
  const audience = audienceRaw as GameAudience;
  const multiplayer = input.multiplayer === true;
  const chance = input.chanceBased === true;
  if (multiplayer && (p === "singleplayer-boosts" || p === "battle-pass")) {
    return { ok: false, error: "Multiplayer games are cosmetics-only: boosts must never function against other players." };
  }
  if (chance && !PROFILE_RULES[p].allowsChance) {
    return { ok: false, error: "Chance-based mechanics need the chance-based profile with published odds." };
  }
  if (chance && input.oddsDisclosed !== true) {
    return { ok: false, error: "Chance-based mechanics must publish their odds before go-live." };
  }
  if (PROFILE_RULES[p].requiresSeasonLabel && !String(input.seasonLabel ?? "").trim()) {
    return { ok: false, error: "Battle-pass games must name their current season." };
  }
  if (audience === "kids" && (p === "chance-based" || p === "singleplayer-boosts" || p === "battle-pass")) {
    return { ok: false, error: "Kids-audience games are cosmetics-only." };
  }
  return { ok: true, profile: p, audience };
}

// ---------------------------------------------------------------------------
// Regions: resolved from CDN headers, unknown fails closed to EU-strict.
// ---------------------------------------------------------------------------

const EEA = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO",
]);

export type RegionClass = "EU" | "UK" | "US" | "US-NH" | "KR" | "CN" | "JP" | "BR" | "ROW" | "UNKNOWN";

export type RegionInfo = { country: string; region: string; class: RegionClass };

/** Paid chance mechanics are barred outright here (BE/NL gambling stance). */
export const CHANCE_BANNED_COUNTRIES = ["BE", "NL"];

export function resolveRegion(countryRaw: unknown, regionRaw: unknown): RegionInfo {
  const country = String(countryRaw ?? "").trim().toUpperCase();
  const region = String(regionRaw ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return { country: "XX", region: "", class: "UNKNOWN" };
  if (EEA.has(country)) return { country, region, class: "EU" };
  if (country === "GB") return { country, region, class: "UK" };
  if (country === "US") {
    const st = region.replace(/^US-/, "");
    if (st === "NH") return { country, region: st, class: "US-NH" };
    return { country, region: st, class: "US" };
  }
  if (country === "KR") return { country, region, class: "KR" };
  if (country === "CN") return { country, region, class: "CN" };
  if (country === "JP") return { country, region, class: "JP" };
  if (country === "BR") return { country, region, class: "BR" };
  return { country, region, class: "ROW" };
}

/** Read Vercel (then Cloudflare) geo headers from a request. */
export function resolveRegionFromHeaders(headers: Pick<Headers, "get"> | Record<string, string | undefined>): RegionInfo {
  const pick = (name: string): string => {
    try {
      const getter = (headers as Pick<Headers, "get">).get;
      if (typeof getter === "function") {
        const v = (getter as (n: string) => string | null).call(headers, name);
        if (v) return v;
      }
    } catch {
      /* header read is best-effort */
    }
    const v = (headers as Record<string, unknown>)[name] ?? (headers as Record<string, unknown>)[name.toLowerCase()];
    return typeof v === "string" ? v : "";
  };
  const country =
    pick("x-vercel-ip-country") || pick("cf-ipcountry") || pick("x-country");
  const region = pick("x-vercel-ip-country-region") || pick("x-region");
  return resolveRegion(country, region);
}

/** EU/UK immediate-delivery waiver line recorded on every receipt there. */
export const EU_WAIVER_LINE =
  "Digital delivery begins immediately with your express consent; the EU/UK 14-day withdrawal right is waived on delivery.";

export function isEuStrict(region: RegionInfo): boolean {
  return region.class === "EU" || region.class === "UK" || region.class === "UNKNOWN";
}

// ---------------------------------------------------------------------------
// Per-charge legality gate (runs AFTER price/consent validation).
// ---------------------------------------------------------------------------

export type ChargeLegalityContext = {
  profile: MonetizationProfile;
  audience: GameAudience;
  kidsMode: boolean;
  region: RegionInfo;
  category: DevChargeCategory | "cosmetic-shop";
  chanceBased: boolean;
  oddsDisclosed: boolean;
  seasonLabel?: unknown;
};

export type ChargeLegality =
  | { ok: true; receipt: { regionClass: RegionClass; country: string; euWaiver: string | null; rule: string } }
  | { ok: false; error: string; rule: string };

export function checkChargeLegality(ctx: ChargeLegalityContext): ChargeLegality {
  // Kids: COPPA / UK Age-Appropriate Design Code / GDPR-K; no charges, ever.
  if (ctx.kidsMode || ctx.audience === "kids") {
    return { ok: false, error: "Kids-safe mode: purchases are disabled on this account.", rule: "kids-block" };
  }
  const rules = PROFILE_RULES[ctx.profile];
  if (!rules) return { ok: false, error: "Unknown monetization profile.", rule: "profile-unknown" };
  const category: string = ctx.category === "cosmetic-shop" ? "cosmetic" : ctx.category;
  if (!(rules.allowedCategories as readonly string[]).includes(category)) {
    return {
      ok: false,
      error:
        ctx.profile === "no-monetization"
          ? "This game sells nothing."
          : `This game is ${rules.label}: ${category === "cosmetic" ? "even cosmetics" : "boosts"} cannot be sold here.`,
      rule: "profile-category",
    };
  }
  if (PROFILE_RULES[ctx.profile].requiresSeasonLabel && !String(ctx.seasonLabel ?? "").trim()) {
    return { ok: false, error: "Battle-pass purchases need a current season.", rule: "season-required" };
  }
  // Chance mechanics: odds everywhere, barred in BE/NL, profile must declare.
  if (ctx.chanceBased) {
    if (!ctx.oddsDisclosed) {
      return { ok: false, error: "Chance-based purchases must publish their odds first.", rule: "odds-required" };
    }
    if (CHANCE_BANNED_COUNTRIES.includes(ctx.region.country)) {
      return { ok: false, error: "Paid chance-based mechanics are not offered in your region.", rule: "chance-region-ban" };
    }
    if (!rules.allowsChance) {
      return { ok: false, error: "This game is not approved for chance-based mechanics.", rule: "chance-profile" };
    }
  }
  const eu = isEuStrict(ctx.region) || ctx.region.class === "KR" || ctx.region.class === "CN";
  return {
    ok: true,
    receipt: {
      regionClass: ctx.region.class,
      country: ctx.region.country,
      euWaiver: eu || ctx.region.class === "UK" ? EU_WAIVER_LINE : null,
      rule: `policy-v1/${ctx.profile}/${ctx.region.class}`,
    },
  };
}

/** Human price line: "8 coins ($0.08)"; shown before AND on every receipt. */
export function priceLine(coins: number): string {
  const c = Math.round(Number(coins) * 100) / 100;
  return `${c} coins ($${(c / 100).toFixed(2)})`;
}

export { MAX_SINGLE_PURCHASE_COINS };
