import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import {
  HOST_RENTAL_CUT_NOTE,
  isHostSubsidyMode,
  quoteHostRental,
} from "@/lib/host-rentals";
import {
  cleanHostCeiling,
  needsHostApproval,
  resolveEffectiveSubsidyMode,
} from "@/lib/host-metering";

/**
 * GET /api/budgets/host?tier=<tier>&seconds=<n>&mode=<mode>&...
 *
 * Host budget QUOTE (DS-MMO-06 economy slice): the full rental quote for a
 * hosted MMO session — gross (25% cut INCLUDED), host/player funding split
 * under the subsidy mode with per-player + session caps, deposit hold, the
 * host spend-ceiling check, and the low-wallet auto-revert verdict — paired
 * with a read-only wallet read for the caller so the host sees both the
 * price and whether the wallet covers it.
 *
 * Query: tier ("campfire"|"outpost"|"hall"|"coliseum"|"festival",
 *   default campfire) or coinsPerHour (25-400), seconds, mode
 *   (default off), splitPct, sessionCapCoins, perPlayerCapCoins,
 *   playerCount, ceilingCoins.
 *
 * Invariants preserved:
 * - Read-only: zero INSERT/UPDATE/DELETE/RPC-write calls. The only ledger
 *   touch is the read-only `get_my_coin_balance` RPC (SUM(delta) for the
 *   caller, same source as /api/coins/balance). `game_saves` is never
 *   touched, so the cheated-save invariant holds trivially. There is NO
 *   parallel balance column anywhere on this path.
 * - Fail-open: the pure quote never depends on the database — anonymous or
 *   ledger-unavailable callers still get the quote with `hostWallet: null`
 *   and no revert verdict instead of bricking.
 * - No age-band bypass is introduced: kids-mode page gating
 *   (`lib/age-gate.ts`) stays authoritative for who may open host surfaces.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const mode = isHostSubsidyMode(params.get("mode") ?? "off");
  if (!mode) {
    return fail("Invalid mode: expected off, host_full, host_split_pct, or host_cap_pool.", 400);
  }

  const quote = quoteHostRental({
    tier: params.get("tier") ?? "campfire",
    coinsPerHour: params.get("coinsPerHour") ?? undefined,
    seconds: params.get("seconds") ?? "0",
    subsidy: {
      mode,
      splitPct: Number(params.get("splitPct") ?? NaN),
      sessionCapCoins: Number(params.get("sessionCapCoins") ?? 0),
      perPlayerCapCoins: Number(params.get("perPlayerCapCoins") ?? 0),
      playerCount: Number(params.get("playerCount") ?? 1),
      sessionHostSpentCoins: Number(params.get("sessionHostSpentCoins") ?? 0),
    },
  });
  if (quote.seconds <= 0 || quote.gross <= 0) {
    return fail("Invalid rental: need seconds > 0 and a tier (or coinsPerHour within 25-400).", 400);
  }

  const ceiling = cleanHostCeiling(params.get("ceilingCoins") ?? "");
  const approvalNeeded = needsHostApproval(quote.hostPays, ceiling ?? undefined);

  // Wallet half: best-effort read-only context, never a gate on the quote
  // itself (fail-open). Never logged: balances stay server-side.
  let hostWallet: number | null = null;
  let authenticated = false;
  if (hasServerSupabase()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        authenticated = true;
        const { data, error } = await supabase.rpc("get_my_coin_balance");
        if (error) return dbFail("GET /api/budgets/host", error, "Unable to read wallet balance.");
        const n = Number(data);
        hostWallet = Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
      }
    } catch (error) {
      return dbFail("GET /api/budgets/host", error, "Unable to read wallet balance.");
    }
  }

  const revert =
    hostWallet === null
      ? null
      : resolveEffectiveSubsidyMode({
          mode,
          hostWalletCoins: hostWallet,
          projectedHostCoins: quote.hostPays,
        });

  return ok({
    tier: quote.tier,
    coinsPerHour: quote.coinsPerHour,
    seconds: quote.seconds,
    gross: quote.gross,
    platformCut: quote.platformCut,
    hostEarnings: quote.hostEarnings,
    hostPays: quote.hostPays,
    playerPays: quote.playerPays,
    perPlayerShare: quote.perPlayerShare,
    configuredMode: mode,
    effectiveMode: revert?.effectiveMode ?? quote.effectiveMode,
    capped: quote.capped,
    reverted: revert?.reverted ?? false,
    walletAfter: revert?.walletAfter ?? null,
    depositHold: quote.depositHold,
    ceilingCoins: ceiling,
    approvalNeeded,
    hostWallet,
    authenticated,
    quotedFrom: "host-rentals+host-metering (pure quote) + get_my_coin_balance (read-only)",
    note: HOST_RENTAL_CUT_NOTE,
  });
}
