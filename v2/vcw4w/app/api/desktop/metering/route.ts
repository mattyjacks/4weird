import { fail, ok } from "@/lib/api-respond";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/validate";
import {
  buildDesktopSpendLink,
  DESKTOP_CLASSES,
  formatDesktopQuote,
  isDesktopClass,
  quoteDesktopSeconds,
} from "@/lib/desktop-metering";

/**
 * GET /api/desktop/metering?seconds=<int>&class=<cpu|standard|gpu|pro>
 *
 * Read-only metering QUOTE for virtual-desktop compute: seconds x class
 * rate -> vibe coins at 100 coins = $1 with the 75/25 creator/platform
 * split (same math as formatCoinsQuote in app/terminal/page.tsx).
 *
 * Writes NOTHING — no coin/ledger tables, no debit, no auth required
 * (pure math). The guarded debit RPC is economy-lane owned; see the
 * DS-OCT-06 QUEUE.md request. Rate-limited per IP; invalid input is a 400.
 */
export async function GET(req: Request) {
  const rl = rateLimit(`desktop:metering:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);

  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return fail("Bad request URL.", 400);
  }

  const rawSeconds = url.searchParams.get("seconds");
  const rawClass = url.searchParams.get("class") ?? "standard";

  const seconds = rawSeconds === null || rawSeconds === "" ? NaN : Number(rawSeconds);
  if (!Number.isInteger(seconds) || seconds < 0) {
    return fail(
      "Query `seconds` must be a non-negative integer (e.g. ?seconds=3600). Quote only, no ledger writes.",
      400,
    );
  }
  if (!isDesktopClass(rawClass)) {
    return fail(
      `Query \`class\` must be one of: ${DESKTOP_CLASSES.join(", ")}.`,
      400,
    );
  }

  let quote;
  try {
    quote = quoteDesktopSeconds(seconds, rawClass);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Invalid quote input.", 400);
  }

  const spend = buildDesktopSpendLink(quote);
  return ok({
    seconds: quote.seconds,
    class: quote.class,
    rateCoinsPerMin: quote.rateCoinsPerMin,
    coins: quote.coins,
    usd: quote.usd,
    usdEquivalent: `$${quote.usd.toFixed(2)}`,
    coinsPerDollar: 100,
    split: quote.split,
    quote: formatDesktopQuote(quote),
    spendLink: spend.apiPath,
    mcpSpendPath: spend.mcpPath,
    debit: {
      status: "not_implemented",
      note:
        "Read-only quote — no coins moved. Guarded debit RPC queued to the economy lane; do not call spend paths until it ships.",
    },
  });
}
