import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import { DEV_GAME_DAILY_CAP_COINS } from "@/lib/economy";
import { dailyAllowanceLeft, validateDevCharge } from "@/lib/dev-charges";
import {
  audienceForGame,
  checkChargeLegality,
  priceLine,
  profileForGame,
  resolveRegionFromHeaders,
} from "@/lib/monetization-policy";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev-charges — a game takes coins for a declared, consented action.
 * Body: { game_slug, category ("cosmetic"|"singleplayer-boost"), amount,
 *   label, idem, acceptedQuote, season?, chance?, odds?, kidsMode? }.
 *
 * Every protection fires before money moves: category allowlist (multiplayer
 * boosts can never be recorded — the RPC rejects them too), multiplayer gate,
 * 10k single-charge cap, exact consent-quote match, per-game daily cap,
 * idempotency (retries return the original receipt), monetization-profile +
 * region legality (kids block, chance odds/region gates, EU waiver receipt),
 * balance check. Every charge lands an audit row the player can see.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`dev-charges:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const sessionRaw = input.session_id ?? input.sessionId ?? null;
  if (sessionRaw !== null && !isUuid(sessionRaw)) return fail("Invalid session_id.", 400);

  // Server-computed consent line: label + amount, so the player confirmed THIS.
  const amountRaw = Number(input.amount);
  const labelRaw = String(input.label ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const expectedQuote = labelRaw && Number.isFinite(amountRaw) && amountRaw > 0
    ? `${labelRaw} — ${priceLine(Math.round(amountRaw * 100) / 100)}`
    : "";
  const checked = validateDevCharge({
    gameSlug: input.game_slug ?? input.game,
    category: input.category,
    amountCoins: input.amount,
    label: input.label,
    idemKey: input.idem ?? input.idempotencyKey,
    acceptedQuote: input.acceptedQuote,
    expectedQuote,
  });
  if (!checked.ok) return fail(checked.error, 400);

  const region = resolveRegionFromHeaders(req.headers);
  const profile = profileForGame(checked.gameSlug);
  const chance = input.chance === true;
  const legal = checkChargeLegality({
    profile,
    audience: audienceForGame(checked.gameSlug),
    kidsMode: input.kidsMode === true,
    region,
    category: checked.category,
    chanceBased: chance,
    oddsDisclosed: input.odds === true || input.oddsDisclosed === true,
    seasonLabel: input.season ?? input.seasonLabel,
  });
  if (!legal.ok) return fail(legal.error, 403);

  try {
    // Daily per-game cap (skipped pre-migration — the RPC is missing too,
    // so nothing can be charged there anyway).
    let allowance = DEV_GAME_DAILY_CAP_COINS;
    try {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: rows, error: sumErr } = await supabase
        .from("dev_charges")
        .select("amount")
        .eq("user_id", data.user.id)
        .eq("game_slug", checked.gameSlug)
        .gte("created_at", dayAgo);
      if (sumErr) throw sumErr;
      const used = ((rows ?? []) as { amount: number }[]).reduce((s, r) => s + Number(r.amount || 0), 0);
      allowance = dailyAllowanceLeft(used);
    } catch (capErr) {
      const code = (capErr as { code?: string } | null)?.code ?? "";
      if (code !== "42P01") throw capErr;
    }
    if (checked.amount > allowance) {
      return fail(`Daily limit for this game is ${DEV_GAME_DAILY_CAP_COINS} coins — ${allowance} left today.`, 402);
    }

    const { data: row, error } = await supabase.rpc("charge_dev_action", {
      p_game: checked.gameSlug,
      p_category: checked.category,
      p_amount: checked.amount,
      p_label: checked.label,
      p_idem: checked.idemKey,
      p_region: region.country,
      p_profile: profile,
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (error.code === "42883" || msg.includes("does not exist")) {
        return ok({
          metered: null,
          pendingMigration: true,
          quote: expectedQuote,
          note: "Dev charges are quoted but not yet metered on this deploy — no coins moved.",
        });
      }
      if (msg.includes("insufficient balance")) return fail("Not enough coins for this charge.", 402);
      if (msg.includes("invalid category")) return fail("That cannot be sold.", 400);
      return dbFail("api/dev-charges:meter", error, "Unable to complete charge.");
    }
    const receipt = row as { id?: string; duplicate?: boolean; gross_coins?: number; gross_centicentcoins?: number };
    return ok({
      metered: row,
      duplicate: receipt.duplicate === true,
      pendingMigration: false,
      receipt: {
        id: receipt.id ?? null,
        game: checked.gameSlug,
        category: checked.category,
        label: checked.label,
        price: expectedQuote,
        regionClass: legal.receipt.regionClass,
        country: legal.receipt.country,
        euWaiver: legal.receipt.euWaiver,
        rule: legal.receipt.rule,
        dailyLeft: Math.max(0, Math.round((allowance - checked.amount) * 100) / 100),
      },
      note: receipt.duplicate === true ? "Already charged — returning the original receipt, no double charge." : undefined,
    });
  } catch (error) {
    return dbFail("api/dev-charges", error, "Unable to complete charge.");
  }
}
