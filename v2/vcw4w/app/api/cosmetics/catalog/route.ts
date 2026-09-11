import { ok } from "@/lib/api-respond";
import { COSMETIC_CATALOG, COSMETIC_SLOTS } from "@/lib/cosmetics";
import {
  COSMETIC_PRICE_COINS,
  DEV_PRICE_GUIDE_AUTOMATIC_COINS,
  DEV_PRICE_GUIDE_DELIBERATE_COINS,
  MAX_SINGLE_PURCHASE_COINS,
} from "@/lib/economy";
import { PROFILE_RULES } from "@/lib/monetization-policy";

export const dynamic = "force-dynamic";

/**
 * GET /api/cosmetics/catalog — the ONE public price list for looks.
 * Public by design: prices must be visible BEFORE any consent (EU Omnibus /
 * US ROSCA price transparency). Every item is 10 coins, looks-only, and
 * can never affect multiplayer outcomes.
 */
export async function GET() {
  return ok({
    priceCoins: COSMETIC_PRICE_COINS,
    maxSinglePurchaseCoins: MAX_SINGLE_PURCHASE_COINS,
    priceGuide: {
      deliberateCoins: DEV_PRICE_GUIDE_DELIBERATE_COINS,
      automaticCoins: DEV_PRICE_GUIDE_AUTOMATIC_COINS,
    },
    slots: COSMETIC_SLOTS,
    profiles: (Object.keys(PROFILE_RULES) as (keyof typeof PROFILE_RULES)[]).map((p) => ({
      id: p,
      ...PROFILE_RULES[p],
    })),
    items: COSMETIC_CATALOG,
    note: "Cosmetics are looks-only and never change gameplay. Multiplayer pay-to-win is banned platform-wide; singleplayer boosts go through guarded dev charges, never this shop.",
  });
}
