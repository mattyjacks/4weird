import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";

/**
 * GET /api/mmorpg/quote?serverId=<id>
 *
 * MMORPG per-player per-minute QUOTE (economy lane, NEW file only).
 * Pure rate-card math — zero writes: no INSERT/UPDATE/DELETE/RPC calls,
 * no direct `coin_ledger` touches. A real debit ships later as a guarded
 * economy migration + RPC; this route only answers "what would it cost".
 *
 * Fail-open demo numbers: no database is wired yet (the `mmorpg_servers`
 * table is still a TODO on the `../servers` foundation stub), so quotes
 * come from the in-memory demo card below, which mirrors the stub's
 * `costPerMin` values exactly. Known demo ids quote their own rate;
 * unknown ids fall back to the teens middle rate (2) with
 * `estimated: true` instead of bricking.
 *
 * Auth-optional: the quote needs no session. When Supabase is configured
 * and a session exists the response echoes `authenticated: true`; anonymous
 * or unconfigured backends still get the full quote (fail-open).
 * No balances, keys, or PII are ever logged on this path.
 */

/**
 * Demo per-player per-minute rates in whole coins, mirroring the
 * `../servers` foundation stub (`costPerMin`: kids 0 / teens 2-3 /
 * adults 5, gravegain4d 7 / gravegain5d 9 — 4d above the 3d tier, 5d
 * highest). Integer only — quotes never touch float money math until
 * the final display division.
 */
const DEMO_RATE_BY_SERVER_ID: Readonly<Record<string, number>> = {
  "emberhold-kids-1": 0,
  "emberhold-teens-1": 2,
  "emberhold-adults-1": 5,
  "dreadhollow-teens-1": 3,
  "gravegain4d-teens-1": 7,
  "gravegain5d-adults-1": 9,
};

/** Fail-open rate for unknown ids: the teens middle rate. */
const DEFAULT_PER_PLAYER_PER_MIN = 2;

/** 100 coins = exactly $1.00 USD (1 coin = 1 cent). */
const COINS_PER_USD = 100;

const MAX_SERVER_ID_LENGTH = 128;

function formatUsd(coins: number): string {
  return `$${(coins / COINS_PER_USD).toFixed(2)}`;
}

export async function GET(req: Request) {
  const serverId = new URL(req.url).searchParams.get("serverId") ?? "";
  const trimmed = serverId.trim();
  if (trimmed === "" || trimmed.length > MAX_SERVER_ID_LENGTH) {
    return fail(
      "serverId is required (1-128 characters), e.g. ?serverId=emberhold-teens-1.",
      400,
    );
  }

  const known = Object.hasOwn(DEMO_RATE_BY_SERVER_ID, trimmed);
  const perPlayerPerMin = known
    ? DEMO_RATE_BY_SERVER_ID[trimmed]
    : DEFAULT_PER_PLAYER_PER_MIN;

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
    serverId: trimmed,
    perPlayerPerMin,
    usdEquivalent: formatUsd(perPlayerPerMin),
    coinsPerUsd: COINS_PER_USD,
    knownServer: known,
    demo: true,
    estimated: !known,
    ledgerUnavailable: true,
    authenticated,
    quotedFrom: "mmorpg-quote-rate-card",
    writes: 0,
  });
}
