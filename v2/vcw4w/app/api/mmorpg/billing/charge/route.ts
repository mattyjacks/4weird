import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validate";
import {
  MMO_MAX_BILLABLE_MINUTES,
  quoteMmoSessionMinutes,
} from "@/lib/mmo-host-billing";

type MmorpgServerRow = {
  id: string;
  cost_per_min: number | null;
  load_per_min: number | null;
  rental_per_hour: number | null;
  host_free: boolean | null;
};

/**
 * POST /api/mmorpg/billing/charge — session billing QUOTE stub (no writes).
 *
 * Body: { serverId, minutes, acceptedQuote }.
 *
 * - Quotes `minutes` of play at the server's rates via
 *   `@/lib/mmo-host-billing` (per-minute legs + hourly rental pro-rated
 *   per minute, split by the host-free flags).
 * - Balance comes ONLY from the paired ledger: the canonical
 *   `get_my_coin_balance()` RPC (SUM(delta) over `coin_ledger` for the
 *   caller). No parallel balance column is read or invented anywhere on
 *   this path.
 * - Fail-closed: short balance → 402 and nothing is billed; any DB fault
 *   → 5xx via dbFail (never a silent free session).
 * - Express per-charge consent (monetization-policy lawfulness layer):
 *   `acceptedQuote` must equal the quoted player total exactly.
 *
 * TODO (infra lane, guarded RPC): add a SECURITY DEFINER
 * `charge_mmorpg_session(p_server uuid, p_minutes int, p_idem text)` RPC
 * that atomically (a) re-checks SUM(delta) balance, (b) inserts the
 * paired `coin_ledger` debit (player leg) + host-leg settlement rows, and
 * (c) bumps `mmorpg_sessions.minutes_billed`; then this route calls it
 * instead of returning `charged: false`. Until that RPC lands this route
 * quotes only and settles nothing.
 *
 * DEMO STUB (fail-open, zero writes): known demo server ids (the
 * `../servers` stub rows, including gravegain4d/gravegain5d) short-circuit
 * below with a consent-checked quote — no Supabase, no ledger reads, no
 * writes. Unknown non-UUID ids still 400; UUID ids take the DB path.
 */

// Demo mirror of `../servers` stub rows (id -> per-minute rate + host flag).
// gravegain4d sits above the 3d tier (7), gravegain5d is highest (9).
const DEMO_SERVER_RATES: Readonly<Record<string, { costPerMin: number; hostFree: boolean }>> = {
  "emberhold-kids-1": { costPerMin: 0, hostFree: true },
  "emberhold-teens-1": { costPerMin: 2, hostFree: false },
  "emberhold-adults-1": { costPerMin: 5, hostFree: false },
  "dreadhollow-teens-1": { costPerMin: 3, hostFree: false },
  "gravegain4d-teens-1": { costPerMin: 7, hostFree: false },
  "gravegain5d-adults-1": { costPerMin: 9, hostFree: false },
};
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (typeof input.serverId !== "string" || input.serverId.trim() === "") {
    return fail("Invalid server.", 400);
  }
  const minutes = Math.floor(Number(input.minutes));
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MMO_MAX_BILLABLE_MINUTES) {
    return fail(`Minutes must be 1-${MMO_MAX_BILLABLE_MINUTES}.`, 400);
  }

  // Fail-open demo stub: known demo ids quote with zero writes and no
  // Supabase/ledger contact. Consent-checked like the DB path.
  const demo = DEMO_SERVER_RATES[input.serverId];
  if (demo !== undefined) {
    const demoQuote = quoteMmoSessionMinutes({
      costPerMin: demo.costPerMin,
      loadPerMin: 0,
      rentalPerHour: 0,
      minutes,
      flags: { freeServer: demo.hostFree, freeLoad: demo.hostFree, freeRental: demo.hostFree },
    });
    const acceptedDemo = Math.round(Number(input.acceptedQuote) * 100) / 100;
    if (!Number.isFinite(acceptedDemo) || acceptedDemo !== demoQuote.playerTotal) {
      return fail("Quote mismatch: confirm the shown total and retry.", 400);
    }
    return ok({
      serverId: input.serverId,
      minutes: demoQuote.minutes,
      serverCost: demoQuote.serverCost,
      loadCost: demoQuote.loadCost,
      rentalFee: demoQuote.rentalFee,
      hostTotal: demoQuote.hostTotal,
      playerTotal: demoQuote.playerTotal,
      quotedFrom: "mmorpg-demo-rate-card",
      charged: false,
      demo: true,
    });
  }

  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Authentication required.", 401);
  const rl = rateLimit(`mmorpg-billing:${user.id}`, 30, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  if (!isUuid(input.serverId)) return fail("Invalid server.", 400);

  const { data: server, error: serverError } = await supabase
    .from("mmorpg_servers")
    .select("id,cost_per_min,load_per_min,rental_per_hour,host_free")
    .eq("id", String(input.serverId))
    .maybeSingle();
  if (serverError) return dbFail("POST /api/mmorpg/billing/charge", serverError, "Unable to load server.");
  if (!server) return fail("Server not found.", 404);
  const row = server as MmorpgServerRow;

  // Schema carries one host_free boolean (20261117000001_mmorpg_servers):
  // true = host subsidizes ALL three legs. Per-leg flags are a future
  // migration (infra-owned); the lib already supports them.
  const hostFree = row.host_free === true;
  const quote = quoteMmoSessionMinutes({
    costPerMin: Number(row.cost_per_min ?? 0),
    loadPerMin: Number(row.load_per_min ?? 0),
    rentalPerHour: Number(row.rental_per_hour ?? 0),
    minutes,
    flags: { freeServer: hostFree, freeLoad: hostFree, freeRental: hostFree },
  });

  const accepted = Math.round(Number(input.acceptedQuote) * 100) / 100;
  if (!Number.isFinite(accepted) || accepted !== quote.playerTotal) {
    return fail("Quote mismatch: confirm the shown total and retry.", 400);
  }

  // Paired-ledger balance read (read-only; SUM(delta) for the caller).
  const { data: balanceData, error: balanceError } = await supabase.rpc("get_my_coin_balance");
  if (balanceError) return dbFail("POST /api/mmorpg/billing/charge", balanceError, "Unable to check balance.");
  const balance = Math.round((Number(balanceData) || 0) * 100) / 100;
  if (quote.playerTotal > balance) {
    return fail("Insufficient coins for this session.", 402);
  }

  return ok({
    serverId: row.id,
    minutes: quote.minutes,
    serverCost: quote.serverCost,
    loadCost: quote.loadCost,
    rentalFee: quote.rentalFee,
    hostTotal: quote.hostTotal,
    playerTotal: quote.playerTotal,
    quotedFrom: "coin_ledger",
    charged: false,
  });
}
