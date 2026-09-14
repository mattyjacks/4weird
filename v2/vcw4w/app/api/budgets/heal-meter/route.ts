import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { dbFail, fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { CENTICENTCOINS_PER_COIN } from "@/lib/economy";
import {
  assertPricingInvariants,
  COINS_PER_USD,
  formatUsdCents,
  MAX_SQUAD_BUDGET_CAP_COINS,
  PLATFORM_SHARE_PCT,
} from "@/lib/remastery-pricing";

/**
 * Heal-loop compute price, in integer centicentcoins (1 coin = 100
 * centicentcoins). Mirrors GET /api/budgets/heal-quote exactly: one LLM
 * token prices at a single centicentcoin, each bug under repair adds a
 * fixed retest overhead. Quote previews, this route settles — the math
 * below is intentionally the same expression so a quoted session settles
 * for exactly its quote.
 */
const CENTICENTCOINS_PER_TOKEN = 1;
/** Retest overhead per bug, in centicentcoins (1000 = 10 coins). */
const BUG_OVERHEAD_CENTICENTCOINS = 1000;
/** Fail-closed input bounds (settle moves money: 400 outside, never clamp). */
const MAX_SETTLE_TOKENS = 10_000_000;
const MAX_SETTLE_BUGS = 10_000;
/** Session marker charset: safe inside the 120-char ledger reason column. */
const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function failClosedInt(value: unknown, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  if (value > max) {
    throw new Error(`${name} exceeds the ${max} single-settlement bound.`);
  }
  return value;
}

/**
 * POST /api/budgets/heal-meter { sessionId, tokens, bugs }
 *
 * Settles ONE completed desktop heal-loop session: debits the caller's own
 * coin_ledger balance for the exact heal-quote price (tokens x 1cc + bugs x
 * 1000cc, 100 coins = exactly $1.00, 25% platform cut INCLUDED in the gross)
 * and books the platform cut via record_platform_cut('compute-cut', …).
 * Reviewer gets { success, debitedCoins, usdEquivalent } with the paired
 * rows written.
 *
 * Money rules (mirrored from the hardened spend paths):
 * - Login session required (401 anonymous); bot-key callers carry no
 *   session and fail closed here, exactly like every other spend route.
 * - sameOrigin CSRF gate (403). The settle caller is the website user in a
 *   browser settling their own desktop session (spend-link deep-links point
 *   here); non-browser desktop agents cannot pass it, by the same
 *   construction as tip/subscribe/contribute. No requireHuman BotID gate:
 *   this spends the caller's own balance (not a free mint), so the mint-path
 *   automation shield does not apply; per-account throttling bounds storms.
 * - Server recomputes the price from tokens/bugs (client totals never
 *   trusted); out-of-bounds input is 400, never clamped.
 * - Balance check first: short balance is 402 with need/have figures.
 * - Debit leg first, then the platform-cut booking (canonical ordering).
 * - Idempotency is best-effort inside one file: the ledger reason embeds
 *   the session marker (`Heal-loop settle <sessionId>`), a pre-insert
 *   SELECT converges client retries to the original debit, and the marker
 *   makes any client-side double-settle auditable. True single-flight
 *   atomicity would need a UNIQUE constraint or settle RPC — both are
 *   migration-lane owned and explicitly out of this envelope's scope, so
 *   the desktop loop must settle each session id exactly once.
 * - Zero writes outside the ledgers: no usage/session/parallel-balance
 *   tables are touched or created. No org membership or age checks: this
 *   spends personal coins, not a gated feature (same posture as tip).
 */
export async function POST(req: Request) {
  assertPricingInvariants();
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user) return fail("Authentication required.", 401);

  const throttle = rateLimit(`heal-meter:${user.id}`, 10, 60_000);
  if (!throttle.allowed) {
    return fail("Too many settle attempts. Try again shortly.", 429, {
      "Retry-After": String(throttle.retryAfter),
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Request body must be JSON.", 400);
  }
  const input =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!input) return fail("Request body must be JSON.", 400);

  const rawSessionId = input.sessionId;
  if (typeof rawSessionId !== "string" || !SESSION_ID_RE.test(rawSessionId.trim())) {
    return fail("sessionId is required (1-64 chars, letters/digits/_/-).", 400);
  }
  const sessionId = rawSessionId.trim();

  let tokens: number;
  let bugs: number;
  try {
    tokens = failClosedInt(input.tokens, MAX_SETTLE_TOKENS, "tokens");
    bugs = failClosedInt(input.bugs, MAX_SETTLE_BUGS, "bugs");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid input.", 400);
  }

  // Exact heal-quote math, in integer centicentcoins (never floats).
  const grossCenticentcoins =
    tokens * CENTICENTCOINS_PER_TOKEN + bugs * BUG_OVERHEAD_CENTICENTCOINS;
  if (grossCenticentcoins <= 0) {
    return fail("Nothing to settle: tokens and bugs are both zero.", 400);
  }
  const maxGrossCenticentcoins =
    MAX_SQUAD_BUDGET_CAP_COINS * CENTICENTCOINS_PER_COIN;
  if (grossCenticentcoins > maxGrossCenticentcoins) {
    return fail("Session exceeds the maximum single settlement. Split it and settle each part.", 400);
  }

  // Integer-centicentcoin gross converts to exact 2dp coins (100cc = 1 coin).
  const grossCoins = grossCenticentcoins / CENTICENTCOINS_PER_COIN;
  // 25% platform cut INCLUDED in the gross: floor to the platform, the
  // creator keeps the remainder — identical to the heal-quote split.
  const platformCenticentcoins = Math.floor(
    (grossCenticentcoins * PLATFORM_SHARE_PCT) / 100,
  );
  const platformCoins = platformCenticentcoins / CENTICENTCOINS_PER_COIN;
  const creatorCoins = (grossCenticentcoins - platformCenticentcoins) / CENTICENTCOINS_PER_COIN;
  const usdCents = Math.round(grossCenticentcoins / CENTICENTCOINS_PER_COIN);

  const marker = `Heal-loop settle ${sessionId}`;
  const db = serviceClient();

  // Retry convergence: an already-settled session id returns its debit
  // instead of minting a second one. (Best-effort: concurrent duplicate
  // POSTs can both pass this read; the shared marker keeps them paired
  // for ops audit. Single-flight atomicity needs a migration-lane UNIQUE
  // guard — requested in QUEUE, out of this file's scope.)
  const { data: prior, error: priorErr } = await db
    .from("coin_ledger")
    .select("id,delta")
    .eq("user_id", user.id)
    .eq("reason", marker)
    .limit(1);
  if (priorErr) return dbFail("api/budgets/heal-meter", priorErr);
  if (prior && prior.length > 0) {
    const settled = -Number((prior[0] as { delta: unknown }).delta);
    return ok({
      sessionId,
      tokens,
      bugs,
      debitedCoins: Number.isFinite(settled) ? settled : grossCoins,
      usdEquivalent: formatUsdCents(usdCents),
      usdCents,
      creatorCoins,
      platformCoins,
      coinsPerUsd: COINS_PER_USD,
      quotedFrom: "heal-quote-estimate",
      settled: true,
      converged: true,
      settledLedgerId: (prior[0] as { id: unknown }).id,
    });
  }

  // Balance check via the canonical RPC (user client carries auth.uid()).
  const { data: balanceRaw, error: balanceErr } = await supabase.rpc(
    "get_my_coin_balance",
  );
  if (balanceErr) return dbFail("api/budgets/heal-meter", balanceErr);
  const balance = Number(balanceRaw);
  if (!Number.isFinite(balance)) {
    return dbFail("api/budgets/heal-meter", new Error("unparseable balance"));
  }
  if (balance < grossCoins) {
    return fail(
      `Insufficient balance: need ${grossCoins} coins, have ${balance}.`,
      402,
    );
  }

  // Debit leg first (canonical ordering), then the platform-cut booking.
  const { data: debit, error: debitErr } = await db
    .from("coin_ledger")
    .insert({ user_id: user.id, delta: -grossCoins, reason: marker })
    .select("id")
    .limit(1);
  if (debitErr) return dbFail("api/budgets/heal-meter", debitErr);
  const debitId = (debit as { id: string }[] | null)?.[0]?.id ?? null;

  const { error: cutErr } = await db.rpc("record_platform_cut", {
    p_kind: "compute-cut",
    p_gross: grossCoins,
    p_cut: platformCoins,
    p_ref_table: "coin_ledger",
    p_ref_id: debitId,
  });
  if (cutErr) {
    // Debit stands (visible in the ledger, ops-reconcilable via
    // ledger_pairing_check); the client sees a 500, never a silent pair.
    return dbFail("api/budgets/heal-meter", cutErr);
  }

  return ok({
    sessionId,
    tokens,
    bugs,
    debitedCoins: grossCoins,
    grossCenticentcoins,
    usdEquivalent: formatUsdCents(usdCents),
    usdCents,
    creatorCoins,
    platformCoins,
    coinsPerUsd: COINS_PER_USD,
    quotedFrom: "heal-quote-estimate",
    settled: true,
    converged: false,
    settledLedgerId: debitId,
  });
}
