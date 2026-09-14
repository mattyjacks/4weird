import { ok } from "@/lib/api-respond";
import { CENTICENTCOINS_PER_COIN } from "@/lib/economy";
import {
  assertPricingInvariants,
  COINS_PER_USD,
  coinsToUsdCents,
  formatUsdCents,
  MAX_SQUAD_BUDGET_CAP_COINS,
  PLATFORM_SHARE_PCT,
} from "@/lib/remastery-pricing";

/**
 * Heal-loop compute price, in integer centicentcoins (1 coin = 100
 * centicentcoins, 1 centicentcoin = $0.0001). One LLM token prices at a
 * single centicentcoin; each bug under repair adds a fixed retest
 * overhead. All math below stays in integers — no float accumulation.
 */
const CENTICENTCOINS_PER_TOKEN = 1;
/** Retest overhead per bug, in centicentcoins (1000 = 10 coins). */
const BUG_OVERHEAD_CENTICENTCOINS = 1000;
/** Fail-open input bounds: anything outside clamps, never 400s. */
const MAX_QUOTE_TOKENS = 10_000_000;
const MAX_QUOTE_BUGS = 10_000;

/**
 * Fail-open integer clamp: NaN / infinite / negative / fractional inputs
 * collapse to the nearest bound and report back via the `clamped` flag.
 */
function clampInt(raw: string | null, max: number): { value: number; clamped: boolean } {
  if (raw === null || raw.trim() === "") return { value: 0, clamped: false };
  const parsed = Math.floor(Number(raw));
  if (!Number.isFinite(parsed) || parsed < 0) return { value: 0, clamped: true };
  if (parsed > max) return { value: max, clamped: true };
  // A present-but-messy input ("12.9", " 7 ") still counts as clamped.
  return { value: parsed, clamped: String(parsed) !== raw.trim() };
}

/**
 * GET /api/budgets/heal-quote?tokens=<n>&bugs=<k>
 *
 * Heal-loop coin QUOTE (Remastery Wave 1 economy slice, README §1.2).
 * Pure price math for a bugtest→autofix→retest run: `tokens` LLM tokens
 * plus a per-bug retest overhead, priced at 100 coins = exactly $1.00
 * with the 75/25 creator/platform split INCLUDED in the gross (never on
 * top) — the same `@/lib/remastery-pricing` invariants the
 * squad-pools quote asserts.
 *
 * GET-quote pattern mirrored from
 * `app/api/budgets/squad-pools/route.ts`: `assertPricingInvariants()`
 * first, `ok()`/`fail()` response shape (`{ success: true, … }` with
 * private no-store headers), integer-coin pricing with a
 * `formatUsdCents` display string.
 *
 * Invariants preserved:
 * - Read-only: zero INSERT/UPDATE/DELETE/RPC calls and zero ledger
 *   reads — this route imports no Supabase client at all, so neither
 *   `org_wallet_ledger` nor `coin_ledger` is touched. Quote only;
 *   settlement stays a later economy-lane item.
 * - Fail-open: missing or malformed `tokens`/`bugs` clamp to bounds
 *   (flags surfaced as `clampedTokens`/`clampedBugs`) instead of 400.
 * - No auth gate by design: the quote is public arithmetic with no
 *   per-org data in it. The settlement lane owns login, membership,
 *   and age-gate enforcement.
 */
export async function GET(req: Request) {
  assertPricingInvariants();

  const params = new URL(req.url).searchParams;
  const tokens = clampInt(params.get("tokens"), MAX_QUOTE_TOKENS);
  const bugs = clampInt(params.get("bugs"), MAX_QUOTE_BUGS);

  // Integer-centicentcoin gross, capped to the squad-budget ceiling so a
  // quote can never price above what the budget RPCs accept.
  const maxGrossCenticentcoins = MAX_SQUAD_BUDGET_CAP_COINS * CENTICENTCOINS_PER_COIN;
  const rawGross =
    tokens.value * CENTICENTCOINS_PER_TOKEN + bugs.value * BUG_OVERHEAD_CENTICENTCOINS;
  const capped = rawGross > maxGrossCenticentcoins;
  const grossCenticentcoins = capped ? maxGrossCenticentcoins : rawGross;

  // Whole-coin fast path mirrors squad-pools: exact parity math when the
  // gross lands on a coin boundary, integer rounding otherwise.
  const wholeCoins = grossCenticentcoins % CENTICENTCOINS_PER_COIN === 0;
  const grossCoinsInt = Math.floor(grossCenticentcoins / CENTICENTCOINS_PER_COIN);
  const usdCents = wholeCoins
    ? coinsToUsdCents(grossCoinsInt)
    : Math.round(grossCenticentcoins / CENTICENTCOINS_PER_COIN);

  // 25% platform cut INCLUDED in the gross: floor to the platform, the
  // creator keeps the remainder so creator + platform === gross always.
  const platformCenticentcoins = Math.floor(
    (grossCenticentcoins * PLATFORM_SHARE_PCT) / 100,
  );
  const creatorCenticentcoins = grossCenticentcoins - platformCenticentcoins;

  return ok({
    tokens: tokens.value,
    bugs: bugs.value,
    clampedTokens: tokens.clamped,
    clampedBugs: bugs.clamped,
    grossCenticentcoins,
    grossCoins: Math.round(grossCenticentcoins) / CENTICENTCOINS_PER_COIN,
    usdEquivalent: formatUsdCents(usdCents),
    usdCents,
    creatorCenticentcoins,
    platformCenticentcoins,
    creatorCoins: Math.round(creatorCenticentcoins) / CENTICENTCOINS_PER_COIN,
    platformCoins: Math.round(platformCenticentcoins) / CENTICENTCOINS_PER_COIN,
    coinsPerUsd: COINS_PER_USD,
    quotedFrom: "heal-quote-estimate",
    settlement: "quote-only-no-settlement",
    capped,
  });
}
