import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { cosmeticById } from "@/lib/cosmetics";
import {
  audienceForGame,
  checkChargeLegality,
  priceLine,
  profileForGame,
  resolveRegionFromHeaders,
} from "@/lib/monetization-policy";

export const dynamic = "force-dynamic";

/**
 * POST /api/cosmetics/buy — buy one own-once cosmetic (10 coins).
 * Body: { item_id, game_slug?, session_id?, acceptedQuote, kidsMode? }.
 * Protections: catalog price enforced server-side, consent quote must match
 * exactly, kids mode blocks, monetization-profile gate, PK blocks double-buy,
 * atomic debit+grant RPC. Pre-migration: honest quote, no coins moved.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`cosmetics:buy:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const def = cosmeticById(input.item_id);
  if (!def) return fail("Unknown cosmetic.", 400);
  const game = /^[a-z0-9-]{1,64}$/.test(String(input.game_slug ?? input.game ?? "lobby"))
    ? String(input.game_slug ?? input.game ?? "lobby").toLowerCase()
    : "lobby";
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);

  const expectedQuote = `${def.name} — ${priceLine(def.price)}`;
  const acceptedQuote = String(input.acceptedQuote ?? "").trim().slice(0, 160);
  if (acceptedQuote !== expectedQuote) {
    return fail("Price changed since you confirmed — please review and confirm again.", 400);
  }

  const region = resolveRegionFromHeaders(req.headers);
  const profile = profileForGame(game);
  const legal = checkChargeLegality({
    profile,
    audience: audienceForGame(game),
    kidsMode: input.kidsMode === true,
    region,
    category: "cosmetic-shop",
    chanceBased: false,
    oddsDisclosed: false,
  });
  if (!legal.ok) return fail(legal.error, 403);

  try {
    const { data: row, error } = await supabase.rpc("purchase_cosmetic_item", {
      p_game: game,
      p_item: def.id,
      p_price: def.price,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (error.code === "42883" || msg.includes("does not exist")) {
        return ok({
          item: def.id,
          metered: null,
          pendingMigration: true,
          quote: expectedQuote,
          note: "Shop kinds are quoted but not yet metered on this deploy — no coins moved.",
        });
      }
      if (msg.includes("already owned")) return fail(`${def.name} is already yours — equip it from your wardrobe.`, 409);
      if (msg.includes("insufficient balance")) return fail("Not enough coins for this cosmetic.", 402);
      return dbFail("api/cosmetics/buy:meter", error, "Unable to complete purchase.");
    }
    return ok({
      item: def.id,
      metered: row,
      pendingMigration: false,
      receipt: {
        item: def.name,
        slot: def.slot,
        price: priceLine(def.price),
        regionClass: legal.receipt.regionClass,
        country: legal.receipt.country,
        euWaiver: legal.receipt.euWaiver,
        rule: legal.receipt.rule,
      },
    });
  } catch (error) {
    return dbFail("api/cosmetics/buy", error, "Unable to complete purchase.");
  }
}
