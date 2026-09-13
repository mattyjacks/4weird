import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import {
  HOST_RENTAL_CUT_NOTE,
  isHostSubsidyMode,
  quoteHostRental,
} from "@/lib/host-rentals";
import { attributeHostLoad, resolveEffectiveSubsidyMode } from "@/lib/host-metering";

/**
 * POST /api/dev-charges/host-cover
 *
 * Host-cover QUOTE (DS-MMO-06 economy slice): how much of a hosted MMO
 * session the host funds under a subsidy mode (`off` / `host_full` /
 * `host_split_pct` / `host_cap_pool` with per-player + session caps),
 * plus metered load attribution (relay + bandwidth + worker CPU).
 *
 * Quote-only: zero INSERT/UPDATE/DELETE/RPC-write calls. Settlement
 * (ledger debits, host payouts, deposit holds) flows through the paired
 * `coin_ledger` entries via a guarded RPC owned by DS-MMO-10 — never a
 * parallel balance column, never here.
 *
 * Body: { tier? ("campfire"|"outpost"|"hall"|"coliseum"|"festival"),
 *   coinsPerHour?, seconds, mode, splitPct?, sessionCapCoins?,
 *   perPlayerCapCoins?, playerCount?, sessionHostSpentCoins?,
 *   relayMessages?, egressBytes?, cpuSeconds?, hostWalletCoins?,
 *   acceptedQuote? }. When `acceptedQuote` is present it must exactly match
 *   the server-computed consent line (same exact-quote rule as
 *   POST /api/dev-charges) — the host confirmed THIS cover, not a number
 *   the client invented.
 *
 * Invariants preserved:
 * - Gross INCLUDEs the 25% platform cut, never on top (host-rentals).
 * - No balance, key, or PII is ever logged on this path.
 * - `game_saves` is never touched, so the cheated-save invariant holds.
 */
export async function POST(req: Request) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`host-cover:${data.user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  const mode = isHostSubsidyMode(input.mode);
  if (!mode) {
    return fail("Invalid mode: expected off, host_full, host_split_pct, or host_cap_pool.", 400);
  }

  const quote = quoteHostRental({
    tier: input.tier,
    coinsPerHour: input.coinsPerHour,
    seconds: input.seconds,
    subsidy: {
      mode,
      splitPct: Number(input.splitPct ?? NaN),
      sessionCapCoins: Number(input.sessionCapCoins ?? 0),
      perPlayerCapCoins: Number(input.perPlayerCapCoins ?? 0),
      playerCount: Number(input.playerCount ?? 1),
      sessionHostSpentCoins: Number(input.sessionHostSpentCoins ?? 0),
    },
  });
  if (quote.seconds <= 0 || quote.gross <= 0) {
    return fail("Invalid rental: need a known tier (or coinsPerHour within 25-400) and seconds > 0.", 400);
  }

  const load = attributeHostLoad({
    relayMessages: input.relayMessages,
    egressBytes: input.egressBytes,
    cpuSeconds: input.cpuSeconds,
  });

  // Auto-revert: a host wallet that cannot cover its share above the floor
  // drops the cover to `off`. Best-effort revert context only — the quote
  // itself never depends on a wallet read.
  const revert = resolveEffectiveSubsidyMode({
    mode,
    hostWalletCoins: input.hostWalletCoins ?? NaN,
    projectedHostCoins: quote.hostPays,
  });
  const consentedLine =
    `Host cover ${quote.hostPays} coins of ${quote.gross} gross ` +
    `(${quote.effectiveMode}${revert.reverted ? " -> off low wallet" : ""})`;
  if (input.acceptedQuote !== undefined && input.acceptedQuote !== null && input.acceptedQuote !== "") {
    if (String(input.acceptedQuote) !== consentedLine) {
      return fail("Quote changed. Review the new cover line and confirm again.", 409);
    }
  }

  try {
    return ok({
      metered: null,
      pendingSettlement: true,
      tier: quote.tier,
      coinsPerHour: quote.coinsPerHour,
      seconds: quote.seconds,
      gross: quote.gross,
      platformCut: quote.platformCut,
      hostEarnings: quote.hostEarnings,
      hostPays: quote.hostPays,
      playerPays: quote.playerPays,
      perPlayerShare: quote.perPlayerShare,
      effectiveMode: revert.reverted ? "off" : quote.effectiveMode,
      configuredMode: mode,
      capped: quote.capped,
      reverted: revert.reverted,
      depositHold: quote.depositHold,
      load,
      consentLine: consentedLine,
      note: `${HOST_RENTAL_CUT_NOTE} No coins moved; settlement lands via the DS-MMO-10 ledger RPC.`,
    });
  } catch (error) {
    return dbFail("api/dev-charges/host-cover", error, "Unable to quote host cover.");
  }
}
