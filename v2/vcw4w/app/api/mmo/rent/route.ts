import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

/**
 * POST /api/mmo/rent
 *
 * MMORPG host-rental + subsidy QUOTE (economy lane, NEW file only).
 * Pure rate-card math — zero writes: no INSERT/UPDATE/DELETE/RPC calls,
 * no direct `coin_ledger` touches. A real debit ships later as a guarded
 * economy migration + RPC; this route only answers "what would it cost".
 *
 * Rate card (mirrors the `../servers` foundation stub's demo numbers:
 * `costPerMin` kids 0 / teens 2 / adults 5, gravegain4d 7-8, gravegain5d
 * 8-9 — 4d above the 3d tier, 5d highest; kids rooms host-free):
 *   - `perPlayerPerMin`: whole coins per player per minute for the
 *     requested ageBand (kids sessions are fully subsidized: 0).
 *   - `hostTotalCoins`: `hostFree ? 0 : perPlayerPerMin * minutesBilled`.
 *   - `subsidizedCoins`: gross (`perPlayerPerMin * minutesBilled`) minus
 *     what the host owes — the platform/promo share, never added on top.
 *   - `usdEquivalent`: display string at 100 coins = exactly $1.00.
 *
 * Auth-optional: the quote needs no session. When Supabase is configured
 * and a session exists the response echoes `authenticated: true`; anonymous
 * or unconfigured backends still get the full quote (fail-open).
 * No balances, keys, or PII are ever logged on this path.
 */

type AgeBand = "kids" | "teens" | "adults";

/** Demo games known to the `../servers` foundation stub. */
const DEMO_GAMES = ["emberhold", "dreadhollow", "gravegain4d", "gravegain5d"] as const;

/** Minimum room band per demo game (mirrors `../servers` GAME_MIN_BAND). */
const GAME_MIN_BAND: Readonly<Record<string, AgeBand>> = {
  emberhold: "kids",
  dreadhollow: "teens",
  gravegain4d: "teens",
  gravegain5d: "adults",
};

const BAND_RANK: Readonly<Record<AgeBand, number>> = {
  kids: 0,
  teens: 1,
  adults: 2,
};

/**
 * Whole coins per player per minute (mirrors `../servers` stub create:
 * kids 0 / teens 2 / adults 5, with the premium dimensions layered on top:
 * gravegain4d teens 7 / adults 8 sits above the 3d tier and gravegain5d
 * teens 8 / adults 9 is the highest). Integer only — quotes never touch
 * float money math until the final display division.
 */
const RATE_COINS_PER_PLAYER_MIN: Readonly<Record<AgeBand, number>> = {
  kids: 0,
  teens: 2,
  adults: 5,
};

/** Per-minute rate for a (game, ageBand) pair; kids rooms stay subsidized at 0. */
function rateForGameBand(game: string, ageBand: AgeBand): number {
  if (ageBand === "kids") return 0;
  if (game === "gravegain5d") return ageBand === "teens" ? 8 : 9;
  if (game === "gravegain4d") return ageBand === "teens" ? 7 : 8;
  return RATE_COINS_PER_PLAYER_MIN[ageBand];
}

/** 100 coins = exactly $1.00 USD (1 coin = 1 cent). */
const COINS_PER_USD = 100;

/** Largest session quotable in one call (one week of hosting). */
const MAX_HOURS = 168;

function isAgeBand(value: unknown): value is AgeBand {
  return value === "kids" || value === "teens" || value === "adults";
}

function formatUsd(coins: number): string {
  return `$${(coins / COINS_PER_USD).toFixed(2)}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Request body must be valid JSON.", 400);
  }
  const { game, ageBand, hostFree, hours } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof game !== "string" ||
    !(DEMO_GAMES as readonly string[]).includes(game)
  ) {
    return fail(`Unknown game. Expected one of: ${DEMO_GAMES.join(", ")}.`, 400);
  }
  if (!isAgeBand(ageBand)) {
    return fail("ageBand must be one of: kids, teens, adults.", 400);
  }
  if (typeof hostFree !== "boolean") {
    return fail("hostFree must be a boolean.", 400);
  }
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
    return fail("hours must be a positive number.", 400);
  }
  if (hours > MAX_HOURS) {
    return fail(`hours must not exceed ${MAX_HOURS} (one week).`, 400);
  }

  // In-memory age check (mirrors `../servers` POST create): the requested
  // band must clear the game's floor (dreadhollow/gravegain4d are teens+,
  // gravegain5d is adults+). Denied bands get 403 like the sibling stub.
  const min = GAME_MIN_BAND[game] ?? "kids";
  if (BAND_RANK[ageBand] < BAND_RANK[min]) {
    return fail(
      `Game "${game}" requires a ${min}+ room; "${ageBand}" is below the minimum band.`,
      403,
    );
  }

  const perPlayerPerMin = rateForGameBand(game, ageBand);
  const minutesBilled = Math.max(1, Math.round(hours * 60));
  const grossCoins = perPlayerPerMin * minutesBilled;
  const hostTotalCoins = hostFree ? 0 : grossCoins;
  const subsidizedCoins = grossCoins - hostTotalCoins;

  // Auth-optional echo only: never gates the quote, never reads the ledger.
  let authenticated = false;
  if (hasServerSupabase()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authenticated = !!user;
    } catch {
      authenticated = false;
    }
  }

  return ok({
    game,
    ageBand,
    hostFree,
    hours,
    perPlayerPerMin,
    minutesBilled,
    hostTotalCoins,
    subsidizedCoins,
    usdEquivalent: formatUsd(hostTotalCoins),
    coinsPerUsd: COINS_PER_USD,
    authenticated,
    quotedFrom: "mmorpg-rent-rate-card",
    writes: 0,
  });
}
