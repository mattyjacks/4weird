import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, isSlug } from "@/lib/validate";
import { rpcStatus } from "@/lib/agent-market";
import { GAME_LOAD_COINS_DEFAULT, GAME_HOURLY_COINS_DEFAULT, isGameRate } from "@/lib/game-rent";

export const dynamic = "force-dynamic";

/**
 * GET /api/games/rates; public price list for "renting games".
 * Returns per-game { coins_per_load, coins_per_hour } (defaults 1/1 when no
 * dev-set row exists) so badges and the pricing page render without auth.
 * Prices are quoted per hour; the ledger settles per second (1 coin/hr =
 * 100 centicentcoins over 3600 s). The load rate is the price for 1 MiB of
 * fresh bytes; smaller first loads pay the exact fraction.
 */
export async function GET(req: Request) {
  if (!hasServerSupabase()) {
    return ok({
      rates: [],
      defaults: { coins_per_load: GAME_LOAD_COINS_DEFAULT, coins_per_hour: GAME_HOURLY_COINS_DEFAULT },
    });
  }
  const rl = rateLimit(`game-rates:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_rates")
    .select("game_slug,coins_per_load,coins_per_hour");
  if (error) return dbFail("api/games/rates", error, "Unable to load rates.");
  return ok({
    rates: data ?? [],
    defaults: { coins_per_load: GAME_LOAD_COINS_DEFAULT, coins_per_hour: GAME_HOURLY_COINS_DEFAULT },
  });
}

/**
 * PUT /api/games/rates; game developers set their own rates (0-100 each,
 * 0 = free). Enforced in the set_game_rate RPC: mapped developers + admins
 * only, so nobody can grief another game's price.
 */
export async function PUT(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`game-rates:set:${data.user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const game = isSlug(input.game_slug ?? input.game);
  const load = isGameRate(input.coins_per_load ?? input.load);
  const hour = isGameRate(input.coins_per_hour ?? input.hour);
  if (!game) return fail("Invalid game_slug.", 400);
  if (load < 0 || hour < 0) return fail("Rates must be whole coins, 0..100 each (0 = free).", 400);
  const { data: rate, error } = await supabase.rpc("set_game_rate", {
    p_game: game,
    p_load: load,
    p_hour: hour,
  });
  if (error) return rpcFail("api/games/rates:set", error, rpcStatus, "Unable to set rate.");
  return ok({ rate });
}
