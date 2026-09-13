/**
 * Remastery region gates — NH/USA is the source of truth.
 *
 * Contract law = New Hampshire (see app/terms/page.tsx §17-18). Region gates
 * below do NOT change governing law; they only hide or disable features where
 * foreign law requires it (compute-for-rewards, biometric/privacy). Gambling
 * is not gated — it is removed Service-wide (see lib/monetization-policy.ts),
 * so no luck/paid-draw feature exists here. Unknown region fails closed to
 * EU-strict, matching lib/monetization-policy.ts.
 */

import {
  resolveRegion,
  type RegionInfo,
} from "./monetization-policy";

export type RemasteryFeature =
  | "dps-donate"
  | "voice"
  | "dm"
  | "ai-training";

export type GateVerdict =
  | { supported: true; rule: string }
  | { supported: false; reason: string; rule: string };

/**
 * Pure gate check. Free/preview surfaces stay global; only the risky
 * sub-feature (donating compute, AI-training upload) is gated.
 */
export function isFeatureSupportedInRegion(
  feature: RemasteryFeature,
  region: RegionInfo,
): GateVerdict {
  switch (feature) {
    case "dps-donate":
      // Donating compute for coin rewards = device-data + energy + tax risk.
      // US-only 18+ beta; every other region (incl. UNKNOWN) sees the notice.
      if (region.class === "US" || region.class === "US-NH") {
        return { supported: true, rule: `remastery/dps-donate/${region.class}` };
      }
      return {
        supported: false,
        reason:
          region.country === "XX"
            ? "We could not determine your region, so compute donation is disabled (fail-closed). US donors with verified region can enroll."
            : `Compute donation is currently US-only. Visitors from ${region.country} can browse but cannot enroll as donors yet.`,
        rule: "remastery/dps-donate/us-beta-only",
      };

    case "voice":
    case "dm":
    case "ai-training":
      // Consent-gated globally, not region-blocked. Page stays up; the
      // per-feature consent sheet handles IL BIPA / EU Art.9 / DSA / OSA.
      return { supported: true, rule: `remastery/${feature}/consent-gated` };

    default:
      return { supported: true, rule: "remastery/unknown-feature/allow" };
  }
}

export { resolveRegion };
export type { RegionInfo };

export const FEATURE_LABELS: Record<RemasteryFeature, string> = {
  "dps-donate": "Compute donation",
  voice: "Voice companion",
  dm: "Direct messages",
  "ai-training": "AI-training upload",
};
